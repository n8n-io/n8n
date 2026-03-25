import type { Statement, Program } from "./ast";
export type AnyRuntimeValue = IntegerValue | FloatValue | StringValue | BooleanValue | ObjectValue | ArrayValue | FunctionValue | NullValue | UndefinedValue;
/**
 * Abstract base class for all Runtime values.
 * Should not be instantiated directly.
 */
declare abstract class RuntimeValue<T> {
    type: string;
    value: T;
    /**
     * A collection of built-in functions for this type.
     */
    builtins: Map<string, AnyRuntimeValue>;
    /**
     * Creates a new RuntimeValue.
     */
    constructor(value?: T);
    /**
     * Determines truthiness or falsiness of the runtime value.
     * This function should be overridden by subclasses if it has custom truthiness criteria.
     * @returns {BooleanValue} BooleanValue(true) if the value is truthy, BooleanValue(false) otherwise.
     */
    __bool__(): BooleanValue;
    toString(): string;
}
/**
 * Represents an integer value at runtime.
 */
export declare class IntegerValue extends RuntimeValue<number> {
    type: string;
}
/**
 * Represents a float value at runtime.
 */
export declare class FloatValue extends RuntimeValue<number> {
    type: string;
    toString(): string;
}
/**
 * Represents a string value at runtime.
 */
export declare class StringValue extends RuntimeValue<string> {
    type: string;
    builtins: Map<string, AnyRuntimeValue>;
}
/**
 * Represents a boolean value at runtime.
 */
export declare class BooleanValue extends RuntimeValue<boolean> {
    type: string;
}
/**
 * Represents an Object value at runtime.
 */
export declare class ObjectValue extends RuntimeValue<Map<string, AnyRuntimeValue>> {
    type: string;
    /**
     * NOTE: necessary to override since all JavaScript arrays are considered truthy,
     * while only non-empty Python arrays are consider truthy.
     *
     * e.g.,
     *  - JavaScript:  {} && 5 -> 5
     *  - Python:      {} and 5 -> {}
     */
    __bool__(): BooleanValue;
    builtins: Map<string, AnyRuntimeValue>;
    items(): ArrayValue;
    keys(): ArrayValue;
    values(): ArrayValue;
}
/**
 * Represents a KeywordArguments value at runtime.
 */
export declare class KeywordArgumentsValue extends ObjectValue {
    type: string;
}
/**
 * Represents an Array value at runtime.
 */
export declare class ArrayValue extends RuntimeValue<AnyRuntimeValue[]> {
    type: string;
    builtins: Map<string, AnyRuntimeValue>;
    /**
     * NOTE: necessary to override since all JavaScript arrays are considered truthy,
     * while only non-empty Python arrays are consider truthy.
     *
     * e.g.,
     *  - JavaScript:  [] && 5 -> 5
     *  - Python:      [] and 5 -> []
     */
    __bool__(): BooleanValue;
}
/**
 * Represents a Tuple value at runtime.
 * NOTE: We extend ArrayValue since JavaScript does not have a built-in Tuple type.
 */
export declare class TupleValue extends ArrayValue {
    type: string;
}
/**
 * Represents a Function value at runtime.
 */
export declare class FunctionValue extends RuntimeValue<(args: AnyRuntimeValue[], scope: Environment) => AnyRuntimeValue> {
    type: string;
}
/**
 * Represents a Null value at runtime.
 */
export declare class NullValue extends RuntimeValue<null> {
    type: string;
}
/**
 * Represents an Undefined value at runtime.
 */
export declare class UndefinedValue extends RuntimeValue<undefined> {
    type: string;
}
/**
 * Represents the current environment (scope) at runtime.
 */
export declare class Environment {
    parent?: Environment | undefined;
    /**
     * The variables declared in this environment.
     */
    variables: Map<string, AnyRuntimeValue>;
    /**
     * The tests available in this environment.
     */
    tests: Map<string, (...value: AnyRuntimeValue[]) => boolean>;
    constructor(parent?: Environment | undefined);
    /**
     * Set the value of a variable in the current environment.
     */
    set(name: string, value: unknown): AnyRuntimeValue;
    private declareVariable;
    /**
     * Set variable in the current scope.
     * See https://jinja.palletsprojects.com/en/3.0.x/templates/#assignments for more information.
     */
    setVariable(name: string, value: AnyRuntimeValue): AnyRuntimeValue;
    /**
     * Resolve the environment in which the variable is declared.
     * @param {string} name The name of the variable.
     * @returns {Environment} The environment in which the variable is declared.
     */
    private resolve;
    lookupVariable(name: string): AnyRuntimeValue;
}
export declare function setupGlobals(env: Environment): void;
export declare class Interpreter {
    global: Environment;
    constructor(env?: Environment);
    /**
     * Run the program.
     */
    run(program: Program): AnyRuntimeValue;
    /**
     * Evaluates expressions following the binary operation type.
     */
    private evaluateBinaryExpression;
    private evaluateArguments;
    private applyFilter;
    /**
     * Evaluates expressions following the filter operation type.
     */
    private evaluateFilterExpression;
    /**
     * Evaluates expressions following the test operation type.
     */
    private evaluateTestExpression;
    /**
     * Evaluates expressions following the select operation type.
     */
    private evaluateSelectExpression;
    /**
     * Evaluates expressions following the unary operation type.
     */
    private evaluateUnaryExpression;
    private evaluateTernaryExpression;
    private evalProgram;
    private evaluateBlock;
    private evaluateIdentifier;
    private evaluateCallExpression;
    private evaluateSliceExpression;
    private evaluateMemberExpression;
    private evaluateSet;
    private evaluateIf;
    private evaluateFor;
    /**
     * See https://jinja.palletsprojects.com/en/3.1.x/templates/#macros for more information.
     */
    private evaluateMacro;
    private evaluateCallStatement;
    private evaluateFilterStatement;
    evaluate(statement: Statement | undefined, environment: Environment): AnyRuntimeValue;
}
export {};
//# sourceMappingURL=runtime.d.ts.map