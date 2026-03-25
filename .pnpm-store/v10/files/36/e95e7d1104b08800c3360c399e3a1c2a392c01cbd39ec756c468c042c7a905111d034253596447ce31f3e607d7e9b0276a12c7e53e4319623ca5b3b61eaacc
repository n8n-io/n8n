"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapVitest = void 0;
const index_js_1 = require("../../utils/jestlike/index.cjs");
const index_js_2 = require("../../utils/jestlike/index.cjs");
const evaluatedBy_js_1 = require("../../utils/jestlike/vendor/evaluatedBy.cjs");
/**
 * Dynamically wrap original Vitest imports.
 *
 * This may be necessary to ensure you are wrapping the correct
 * Vitest version if you are using a monorepo whose workspaces
 * use multiple versions of Vitest.
 *
 * @param originalVitestMethods - The original Vitest imports to wrap.
 * @returns The wrapped Vitest imports.
 * See https://docs.smith.langchain.com/evaluation/how_to_guides/vitest_jest
 * for more details.
 */
const wrapVitest = (originalVitestMethods) => {
    if (typeof originalVitestMethods !== "object" ||
        originalVitestMethods == null) {
        throw new Error("originalVitestMethods must be an non-null object.");
    }
    if (!("expect" in originalVitestMethods) ||
        typeof originalVitestMethods.expect !== "function") {
        throw new Error("Your passed object must contain a `expect` method.");
    }
    if (!("it" in originalVitestMethods) ||
        typeof originalVitestMethods.it !== "function") {
        throw new Error("Your passed object must contain a `it` method.");
    }
    if (!("test" in originalVitestMethods) ||
        typeof originalVitestMethods.test !== "function") {
        throw new Error("Your passed object must contain a `test` method.");
    }
    if (!("describe" in originalVitestMethods) ||
        typeof originalVitestMethods.describe !== "function") {
        throw new Error("Your passed object must contain a `describe` method.");
    }
    if (!("beforeAll" in originalVitestMethods) ||
        typeof originalVitestMethods.beforeAll !== "function") {
        throw new Error("Your passed object must contain a `beforeAll` method.");
    }
    if (!("afterAll" in originalVitestMethods) ||
        typeof originalVitestMethods.afterAll !== "function") {
        throw new Error("Your passed object must contain a `afterAll` method.");
    }
    const wrappedMethods = (0, index_js_1.generateWrapperFromJestlikeMethods)({
        expect: originalVitestMethods.expect,
        it: originalVitestMethods.it,
        test: originalVitestMethods.test,
        describe: originalVitestMethods.describe,
        beforeAll: originalVitestMethods.beforeAll,
        afterAll: originalVitestMethods.afterAll,
    }, "vitest");
    return {
        ...wrappedMethods,
        logFeedback: index_js_2.logFeedback,
        logOutputs: index_js_2.logOutputs,
        wrapEvaluator: evaluatedBy_js_1.wrapEvaluator,
    };
};
exports.wrapVitest = wrapVitest;
