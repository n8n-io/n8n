"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestFramework = void 0;
let OVERRIDE_AFTER_ALL = null;
let OVERRIDE_DESCRIBE = null;
let OVERRIDE_DESCRIBE_SKIP = null;
let OVERRIDE_IT = null;
let OVERRIDE_IT_ONLY = null;
let OVERRIDE_IT_SKIP = null;
/*
 * NOTE - If people use `mocha test.js --watch` command, the test function
 * instances are different for each execution.
 * This is why the getters get fresh instance always.
 */
/**
 * Defines a test framework used by the rule tester
 * This class defaults to using functions defined on the global scope, but also
 * allows the user to manually supply functions in case they want to roll their
 * own tooling
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class TestFramework {
    /**
     * Runs a function after all the tests in this file have completed.
     */
    static get afterAll() {
        if (OVERRIDE_AFTER_ALL != null) {
            return OVERRIDE_AFTER_ALL;
        }
        if (typeof afterAll === 'function') {
            return afterAll;
        }
        throw new Error('Missing definition for `afterAll` - you must set one using `RuleTester.afterAll` or there must be one defined globally as `afterAll`.');
    }
    static set afterAll(value) {
        OVERRIDE_AFTER_ALL = value;
    }
    /**
     * Creates a test grouping
     */
    static get describe() {
        if (OVERRIDE_DESCRIBE != null) {
            return OVERRIDE_DESCRIBE;
        }
        if (typeof describe === 'function') {
            return describe;
        }
        throw new Error('Missing definition for `describe` - you must set one using `RuleTester.describe` or there must be one defined globally as `describe`.');
    }
    static set describe(value) {
        OVERRIDE_DESCRIBE = value;
    }
    /**
     * Skips running the tests inside this `describe` for the current file
     */
    static get describeSkip() {
        if (OVERRIDE_DESCRIBE_SKIP != null) {
            return OVERRIDE_DESCRIBE_SKIP;
        }
        if (typeof OVERRIDE_DESCRIBE === 'function' &&
            typeof OVERRIDE_DESCRIBE.skip === 'function') {
            return OVERRIDE_DESCRIBE.skip.bind(OVERRIDE_DESCRIBE);
        }
        if (typeof describe === 'function' && typeof describe.skip === 'function') {
            return describe.skip.bind(describe);
        }
        if (typeof OVERRIDE_DESCRIBE === 'function' ||
            typeof OVERRIDE_IT === 'function') {
            throw new Error('Set `RuleTester.describeSkip` to use `dependencyConstraints` with a custom test framework.');
        }
        if (typeof describe === 'function') {
            throw new Error('The current test framework does not support skipping tests tests with `dependencyConstraints`.');
        }
        throw new Error('Missing definition for `describeSkip` - you must set one using `RuleTester.describeSkip` or there must be one defined globally as `describe.skip`.');
    }
    static set describeSkip(value) {
        OVERRIDE_DESCRIBE_SKIP = value;
    }
    /**
     * Creates a test closure
     */
    static get it() {
        if (OVERRIDE_IT != null) {
            return OVERRIDE_IT;
        }
        if (typeof it === 'function') {
            return it;
        }
        throw new Error('Missing definition for `it` - you must set one using `RuleTester.it` or there must be one defined globally as `it`.');
    }
    static set it(value) {
        OVERRIDE_IT = value;
    }
    /**
     * Only runs this test in the current file.
     */
    static get itOnly() {
        if (OVERRIDE_IT_ONLY != null) {
            return OVERRIDE_IT_ONLY;
        }
        if (typeof OVERRIDE_IT === 'function' &&
            typeof OVERRIDE_IT.only === 'function') {
            return OVERRIDE_IT.only.bind(OVERRIDE_IT);
        }
        if (typeof it === 'function' && typeof it.only === 'function') {
            return it.only.bind(it);
        }
        if (typeof OVERRIDE_DESCRIBE === 'function' ||
            typeof OVERRIDE_IT === 'function') {
            throw new Error('Set `RuleTester.itOnly` to use `only` with a custom test framework.\n' +
                'See https://eslint.org/docs/latest/integrate/nodejs-api#customizing-ruletester for more.');
        }
        if (typeof it === 'function') {
            throw new Error('The current test framework does not support exclusive tests with `only`.');
        }
        throw new Error('Missing definition for `itOnly` - you must set one using `RuleTester.itOnly` or there must be one defined globally as `it.only`.');
    }
    static set itOnly(value) {
        OVERRIDE_IT_ONLY = value;
    }
    /**
     * Skips running this test in the current file.
     */
    static get itSkip() {
        if (OVERRIDE_IT_SKIP != null) {
            return OVERRIDE_IT_SKIP;
        }
        if (typeof OVERRIDE_IT === 'function' &&
            typeof OVERRIDE_IT.skip === 'function') {
            return OVERRIDE_IT.skip.bind(OVERRIDE_IT);
        }
        if (typeof it === 'function' && typeof it.skip === 'function') {
            return it.skip.bind(it);
        }
        if (typeof OVERRIDE_DESCRIBE === 'function' ||
            typeof OVERRIDE_IT === 'function') {
            throw new Error('Set `RuleTester.itSkip` to use `only` with a custom test framework.');
        }
        if (typeof it === 'function') {
            throw new Error('The current test framework does not support exclusive tests with `only`.');
        }
        throw new Error('Missing definition for `itSkip` - you must set one using `RuleTester.itSkip` or there must be one defined globally as `it.only`.');
    }
    static set itSkip(value) {
        OVERRIDE_IT_SKIP = value;
    }
}
exports.TestFramework = TestFramework;
