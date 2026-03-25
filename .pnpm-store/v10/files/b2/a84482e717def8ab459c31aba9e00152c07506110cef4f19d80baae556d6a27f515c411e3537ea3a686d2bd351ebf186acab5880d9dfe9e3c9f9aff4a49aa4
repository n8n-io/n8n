"use strict";
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-namespace */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapJest = exports.wrapEvaluator = exports.logOutputs = exports.logFeedback = exports.expect = exports.describe = exports.it = exports.test = void 0;
const globals_1 = require("@jest/globals");
const matchers_js_1 = require("../utils/jestlike/matchers.cjs");
const evaluatedBy_js_1 = require("../utils/jestlike/vendor/evaluatedBy.cjs");
Object.defineProperty(exports, "wrapEvaluator", { enumerable: true, get: function () { return evaluatedBy_js_1.wrapEvaluator; } });
const index_js_1 = require("../utils/jestlike/index.cjs");
Object.defineProperty(exports, "logFeedback", { enumerable: true, get: function () { return index_js_1.logFeedback; } });
Object.defineProperty(exports, "logOutputs", { enumerable: true, get: function () { return index_js_1.logOutputs; } });
const index_js_2 = require("../utils/jestlike/index.cjs");
globals_1.expect.extend({
    toBeRelativeCloseTo: matchers_js_1.toBeRelativeCloseTo,
    toBeAbsoluteCloseTo: matchers_js_1.toBeAbsoluteCloseTo,
    toBeSemanticCloseTo: matchers_js_1.toBeSemanticCloseTo,
});
/**
 * Dynamically wrap original Jest imports.
 *
 * This may be necessary to ensure you are wrapping the correct
 * Jest version if you are using a monorepo whose workspaces
 * use multiple versions of Jest.
 *
 * @param originalJestMethods - The original Jest imports to wrap.
 * @returns The wrapped Jest imports.
 * See https://docs.smith.langchain.com/evaluation/how_to_guides/vitest_jest
 * for more details.
 */
const wrapJest = (originalJestMethods) => {
    if (typeof originalJestMethods !== "object" || originalJestMethods == null) {
        throw new Error("originalJestMethods must be an non-null object.");
    }
    if (!("expect" in originalJestMethods) ||
        typeof originalJestMethods.expect !== "function") {
        throw new Error("Your passed object must contain a `expect` method.");
    }
    if (!("it" in originalJestMethods) ||
        typeof originalJestMethods.it !== "function") {
        throw new Error("Your passed object must contain a `it` method.");
    }
    if (!("test" in originalJestMethods) ||
        typeof originalJestMethods.test !== "function") {
        throw new Error("Your passed object must contain a `test` method.");
    }
    if (!("describe" in originalJestMethods) ||
        typeof originalJestMethods.describe !== "function") {
        throw new Error("Your passed object must contain a `describe` method.");
    }
    if (!("beforeAll" in originalJestMethods) ||
        typeof originalJestMethods.beforeAll !== "function") {
        throw new Error("Your passed object must contain a `beforeAll` method.");
    }
    if (!("afterAll" in originalJestMethods) ||
        typeof originalJestMethods.afterAll !== "function") {
        throw new Error("Your passed object must contain a `afterAll` method.");
    }
    const wrappedMethods = (0, index_js_2.generateWrapperFromJestlikeMethods)({
        expect: originalJestMethods.expect,
        it: originalJestMethods.it,
        test: originalJestMethods.test,
        describe: originalJestMethods.describe,
        beforeAll: originalJestMethods.beforeAll,
        afterAll: originalJestMethods.afterAll,
        logFeedback: index_js_1.logFeedback,
        logOutputs: index_js_1.logOutputs,
        wrapEvaluator: evaluatedBy_js_1.wrapEvaluator,
    }, process?.versions?.bun !== undefined ? "bun" : "jest");
    // Return the normal used LS methods for convenience
    // so that you can do:
    //
    // const ls = wrapJest(jest);
    // ls.logFeedback({ key: "quality", score: 0.7 });
    return {
        ...wrappedMethods,
        logFeedback: index_js_1.logFeedback,
        logOutputs: index_js_1.logOutputs,
        wrapEvaluator: evaluatedBy_js_1.wrapEvaluator,
    };
};
exports.wrapJest = wrapJest;
const { test, it, describe, expect } = wrapJest({
    expect: globals_1.expect,
    it: globals_1.it,
    test: globals_1.test,
    describe: globals_1.describe,
    beforeAll: globals_1.beforeAll,
    afterAll: globals_1.afterAll,
    beforeEach: globals_1.beforeEach,
    afterEach: globals_1.afterEach,
});
exports.test = test;
exports.it = it;
exports.describe = describe;
exports.expect = expect;
__exportStar(require("../utils/jestlike/types.cjs"), exports);
