/**
 * @param text a string describing the rule
 */
export type RuleTesterTestFrameworkFunctionBase = (text: string, callback: () => void) => void;
export type RuleTesterTestFrameworkFunction = {
    /**
     * Skips running the tests inside this `describe` for the current file
     */
    skip?: RuleTesterTestFrameworkFunctionBase;
} & RuleTesterTestFrameworkFunctionBase;
export type RuleTesterTestFrameworkItFunction = {
    /**
     * Only runs this test in the current file.
     */
    only?: RuleTesterTestFrameworkFunctionBase;
    /**
     * Skips running this test in the current file.
     */
    skip?: RuleTesterTestFrameworkFunctionBase;
} & RuleTesterTestFrameworkFunctionBase;
type Maybe<T> = T | null | undefined;
/**
 * @param fn a callback called after all the tests are done
 */
type AfterAll = (fn: () => void) => void;
/**
 * Defines a test framework used by the rule tester
 * This class defaults to using functions defined on the global scope, but also
 * allows the user to manually supply functions in case they want to roll their
 * own tooling
 */
export declare abstract class TestFramework {
    /**
     * Runs a function after all the tests in this file have completed.
     */
    static get afterAll(): AfterAll;
    static set afterAll(value: Maybe<AfterAll>);
    /**
     * Creates a test grouping
     */
    static get describe(): RuleTesterTestFrameworkFunction;
    static set describe(value: Maybe<RuleTesterTestFrameworkFunction>);
    /**
     * Skips running the tests inside this `describe` for the current file
     */
    static get describeSkip(): RuleTesterTestFrameworkFunctionBase;
    static set describeSkip(value: Maybe<RuleTesterTestFrameworkFunctionBase>);
    /**
     * Creates a test closure
     */
    static get it(): RuleTesterTestFrameworkItFunction;
    static set it(value: Maybe<RuleTesterTestFrameworkItFunction>);
    /**
     * Only runs this test in the current file.
     */
    static get itOnly(): RuleTesterTestFrameworkFunctionBase;
    static set itOnly(value: Maybe<RuleTesterTestFrameworkFunctionBase>);
    /**
     * Skips running this test in the current file.
     */
    static get itSkip(): RuleTesterTestFrameworkFunctionBase;
    static set itSkip(value: Maybe<RuleTesterTestFrameworkFunctionBase>);
}
export {};
