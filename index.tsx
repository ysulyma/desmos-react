import {createContext, forwardRef, useContext, useEffect, useRef, useState, memo} from "react";

const DesmosContext = createContext<Desmos.Calculator>(null);

/* elt() */
declare global {
  namespace Desmos {
    interface BasicCalculator {
      domChangeDetector: {
        elt: HTMLDivElement;
      };
    }

    interface Calculator {
      domChangeDetector: {
        elt: HTMLDivElement;
      };
    }
  }
}

/**
Get the container element of a calculator.
*/
export function elt(calc: Desmos.Calculator | Desmos.BasicCalculator) {
  return calc.domChangeDetector.elt;
}

/* GraphingCalculator */
export const GraphingCalculator = forwardRef<
Desmos.Calculator,
React.PropsWithChildren<Parameters<typeof Desmos.GraphingCalculator>[1] & { attributes?: React.HTMLAttributes<HTMLDivElement>; }>
>(function GraphingCalculator(props, ref) {
  const [calculator, setCalculator] = useState<Desmos.Calculator>();
  const div = useRef<HTMLDivElement>();

  useEffect(() => {
    // create calculator
    const {attributes, children, ...options} = props;
    const calculator = Desmos.GraphingCalculator(div.current, options);

    applyRef(ref, calculator);
    setCalculator(calculator);

    return () => {
      calculator.destroy();
    };
  }, []);

  useEffect(() => {
    const {attributes, children, ...settings} = props;

    if (calculator)
      calculator.updateSettings(settings);
  });

  return (
    <DesmosContext.Provider value={calculator}>
      <div ref={div} {...(props.attributes ?? {})}>
        {calculator ? props.children : null}
      </div>
    </DesmosContext.Provider>
  );
});

/**
A Desmos expression.
*/
export const Expression = memo(function Expression(props: Desmos.ExpressionState): null {
  const calculator = useContext(DesmosContext);
  const old = useRef<Desmos.ExpressionState>({});

  const update: Desmos.ExpressionState = {id: props.id};
  for (const k in props) {
    if (props[k] !== old.current[k]) {
      update[k] = props[k];
    }
  }
  old.current = props;
  calculator.setExpression(update);

  useEffect(() => {
    return () => {
      // @ts-expect-error _destroyed is not exposed
      if (!calculator._destroyed)
        calculator.removeExpression({id: props.id});
    };
  }, [props.id]);

  return null;
});

function applyRef<T>(ref: React.ForwardedRef<T>, val: T) {
  if (ref === null)
    return;
  if (typeof ref === "function") {
    ref(val);
  } else {
    ref.current = val;
  }
}

/* Basic calculators */

// you just couldn't help yourself could you?
// you doofus
function makeBasicCalculator
<T extends typeof Desmos.FourFunctionCalculator | typeof Desmos.ScientificCalculator>
(constructor: T, name: string)
{
  const component = (
    props: React.PropsWithChildren<Parameters<T>[1] & { attributes?: React.HTMLAttributes<HTMLDivElement>; }>,
    ref: React.ForwardedRef<Desmos.BasicCalculator>
  ) => {
    const [calculator, setCalculator] = useState<Desmos.BasicCalculator>();
    const div = useRef<HTMLDivElement>();

    // create calculator
    useEffect(() => {
      const {attributes, children, ...options} = props;
      const calculator = constructor(div.current, options);

      applyRef(ref, calculator);
      setCalculator(calculator);

      return () => {
        calculator.destroy();
      };
    }, []);

    // update settings
    useEffect(() => {
      const {attributes, children, ...settings} = props;

      if (calculator)
        calculator.updateSettings(settings);
    });

    // render
    return (
      <div ref={div} {...(props.attributes ?? {})}/>
    );
  };
  // function components need to have a name
  Object.defineProperty(component, "name", {value: name});

  return forwardRef(component);
}

export const FourFunctionCalculator = makeBasicCalculator(Desmos.FourFunctionCalculator, "FourFunctionCalculator");
export const ScientificCalculator = makeBasicCalculator(Desmos.ScientificCalculator, "ScientificCalculator");

// hooks
export function useHelperExpression(opts: Desmos.ExpressionState) {
  const calculator = useContext(DesmosContext);

  const helper = useRef<ReturnType<Desmos.Calculator["HelperExpression"]>>();
  if (helper.current === undefined) {
    helper.current = calculator.HelperExpression(opts);
  }
  const [value, setValue] = useState(helper.current.numericValue);
  useEffect(() => {
    helper.current.observe("numericValue", () => setValue(helper.current.numericValue));
  }, []);

  return value;
}
