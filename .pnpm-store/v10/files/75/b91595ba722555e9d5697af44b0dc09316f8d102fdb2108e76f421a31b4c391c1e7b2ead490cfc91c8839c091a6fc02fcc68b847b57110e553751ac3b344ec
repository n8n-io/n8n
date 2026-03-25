"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var expect_exports = {};
__export(expect_exports, {
  expect: () => expect,
  mergeExpects: () => mergeExpects
});
module.exports = __toCommonJS(expect_exports);
var import_utils = require("playwright-core/lib/utils");
var import_matcherHint = require("./matcherHint");
var import_matchers = require("./matchers");
var import_toMatchAriaSnapshot = require("./toMatchAriaSnapshot");
var import_toMatchSnapshot = require("./toMatchSnapshot");
var import_expectBundle = require("../common/expectBundle");
var import_globals = require("../common/globals");
var import_util = require("../util");
var import_testInfo = require("../worker/testInfo");
function createMatchers(actual, info, prefix) {
  return new Proxy((0, import_expectBundle.expect)(actual), new ExpectMetaInfoProxyHandler(actual, info, prefix));
}
const userMatchersSymbol = Symbol("userMatchers");
function qualifiedMatcherName(qualifier, matcherName) {
  return qualifier.join(":") + "$" + matcherName;
}
function createExpect(info, prefix, userMatchers) {
  const expectInstance = new Proxy(import_expectBundle.expect, {
    apply: function(target, thisArg, argumentsList) {
      const [actual, messageOrOptions] = argumentsList;
      const message = (0, import_utils.isString)(messageOrOptions) ? messageOrOptions : messageOrOptions?.message || info.message;
      const newInfo = { ...info, message };
      if (newInfo.poll) {
        if (typeof actual !== "function")
          throw new Error("`expect.poll()` accepts only function as a first argument");
        newInfo.poll.generator = actual;
      }
      return createMatchers(actual, newInfo, prefix);
    },
    get: function(target, property) {
      if (property === "configure")
        return configure;
      if (property === "extend") {
        return (matchers) => {
          const qualifier = [...prefix, (0, import_utils.createGuid)()];
          const wrappedMatchers = {};
          for (const [name, matcher] of Object.entries(matchers)) {
            wrappedMatchers[name] = wrapPlaywrightMatcherToPassNiceThis(matcher);
            const key = qualifiedMatcherName(qualifier, name);
            wrappedMatchers[key] = wrappedMatchers[name];
            Object.defineProperty(wrappedMatchers[key], "name", { value: name });
          }
          import_expectBundle.expect.extend(wrappedMatchers);
          return createExpect(info, qualifier, { ...userMatchers, ...matchers });
        };
      }
      if (property === "soft") {
        return (actual, messageOrOptions) => {
          return configure({ soft: true })(actual, messageOrOptions);
        };
      }
      if (property === userMatchersSymbol)
        return userMatchers;
      if (property === "poll") {
        return (actual, messageOrOptions) => {
          const poll = (0, import_utils.isString)(messageOrOptions) ? {} : messageOrOptions || {};
          return configure({ _poll: poll })(actual, messageOrOptions);
        };
      }
      return import_expectBundle.expect[property];
    }
  });
  const configure = (configuration) => {
    const newInfo = { ...info };
    if ("message" in configuration)
      newInfo.message = configuration.message;
    if ("timeout" in configuration)
      newInfo.timeout = configuration.timeout;
    if ("soft" in configuration)
      newInfo.isSoft = configuration.soft;
    if ("_poll" in configuration) {
      newInfo.poll = configuration._poll ? { ...info.poll, generator: () => {
      } } : void 0;
      if (typeof configuration._poll === "object") {
        newInfo.poll.timeout = configuration._poll.timeout ?? newInfo.poll.timeout;
        newInfo.poll.intervals = configuration._poll.intervals ?? newInfo.poll.intervals;
      }
    }
    return createExpect(newInfo, prefix, userMatchers);
  };
  return expectInstance;
}
let matcherCallContext;
function setMatcherCallContext(context) {
  matcherCallContext = context;
}
function takeMatcherCallContext() {
  try {
    return matcherCallContext;
  } finally {
    matcherCallContext = void 0;
  }
}
const defaultExpectTimeout = 5e3;
function wrapPlaywrightMatcherToPassNiceThis(matcher) {
  return function(...args) {
    const { isNot, promise, utils } = this;
    const context = takeMatcherCallContext();
    const timeout = context?.expectInfo.timeout ?? context?.testInfo?._projectInternal?.expect?.timeout ?? defaultExpectTimeout;
    const newThis = {
      isNot,
      promise,
      utils,
      timeout,
      _stepInfo: context?.step
    };
    newThis.equals = throwUnsupportedExpectMatcherError;
    return matcher.call(newThis, ...args);
  };
}
function throwUnsupportedExpectMatcherError() {
  throw new Error("It looks like you are using custom expect matchers that are not compatible with Playwright. See https://aka.ms/playwright/expect-compatibility");
}
import_expectBundle.expect.setState({ expand: false });
const customAsyncMatchers = {
  toBeAttached: import_matchers.toBeAttached,
  toBeChecked: import_matchers.toBeChecked,
  toBeDisabled: import_matchers.toBeDisabled,
  toBeEditable: import_matchers.toBeEditable,
  toBeEmpty: import_matchers.toBeEmpty,
  toBeEnabled: import_matchers.toBeEnabled,
  toBeFocused: import_matchers.toBeFocused,
  toBeHidden: import_matchers.toBeHidden,
  toBeInViewport: import_matchers.toBeInViewport,
  toBeOK: import_matchers.toBeOK,
  toBeVisible: import_matchers.toBeVisible,
  toContainText: import_matchers.toContainText,
  toContainClass: import_matchers.toContainClass,
  toHaveAccessibleDescription: import_matchers.toHaveAccessibleDescription,
  toHaveAccessibleName: import_matchers.toHaveAccessibleName,
  toHaveAccessibleErrorMessage: import_matchers.toHaveAccessibleErrorMessage,
  toHaveAttribute: import_matchers.toHaveAttribute,
  toHaveClass: import_matchers.toHaveClass,
  toHaveCount: import_matchers.toHaveCount,
  toHaveCSS: import_matchers.toHaveCSS,
  toHaveId: import_matchers.toHaveId,
  toHaveJSProperty: import_matchers.toHaveJSProperty,
  toHaveRole: import_matchers.toHaveRole,
  toHaveText: import_matchers.toHaveText,
  toHaveTitle: import_matchers.toHaveTitle,
  toHaveURL: import_matchers.toHaveURL,
  toHaveValue: import_matchers.toHaveValue,
  toHaveValues: import_matchers.toHaveValues,
  toHaveScreenshot: import_toMatchSnapshot.toHaveScreenshot,
  toMatchAriaSnapshot: import_toMatchAriaSnapshot.toMatchAriaSnapshot,
  toPass: import_matchers.toPass
};
const customMatchers = {
  ...customAsyncMatchers,
  toMatchSnapshot: import_toMatchSnapshot.toMatchSnapshot
};
class ExpectMetaInfoProxyHandler {
  constructor(actual, info, prefix) {
    this._actual = actual;
    this._info = { ...info };
    this._prefix = prefix;
  }
  get(target, matcherName, receiver) {
    if (matcherName === "toThrowError")
      matcherName = "toThrow";
    let matcher = Reflect.get(target, matcherName, receiver);
    if (typeof matcherName !== "string")
      return matcher;
    let resolvedMatcherName = matcherName;
    for (let i = this._prefix.length; i > 0; i--) {
      const qualifiedName = qualifiedMatcherName(this._prefix.slice(0, i), matcherName);
      if (Reflect.has(target, qualifiedName)) {
        matcher = Reflect.get(target, qualifiedName, receiver);
        resolvedMatcherName = qualifiedName;
        break;
      }
    }
    if (matcher === void 0)
      throw new Error(`expect: Property '${matcherName}' not found.`);
    if (typeof matcher !== "function") {
      if (matcherName === "not")
        this._info.isNot = !this._info.isNot;
      return new Proxy(matcher, this);
    }
    if (this._info.poll) {
      if (customAsyncMatchers[matcherName] || matcherName === "resolves" || matcherName === "rejects")
        throw new Error(`\`expect.poll()\` does not support "${matcherName}" matcher.`);
      matcher = (...args) => pollMatcher(resolvedMatcherName, this._info, this._prefix, ...args);
    }
    return (...args) => {
      const testInfo = (0, import_globals.currentTestInfo)();
      setMatcherCallContext({ expectInfo: this._info, testInfo });
      if (!testInfo)
        return matcher.call(target, ...args);
      const customMessage = this._info.message || "";
      const suffixes = (0, import_matchers.computeMatcherTitleSuffix)(matcherName, this._actual, args);
      const defaultTitle = `${this._info.poll ? "poll " : ""}${this._info.isSoft ? "soft " : ""}${this._info.isNot ? "not " : ""}${matcherName}${suffixes.short || ""}`;
      const shortTitle = customMessage || `Expect ${(0, import_utils.escapeWithQuotes)(defaultTitle, '"')}`;
      const longTitle = shortTitle + (suffixes.long || "");
      const apiName = `expect${this._info.poll ? ".poll " : ""}${this._info.isSoft ? ".soft " : ""}${this._info.isNot ? ".not" : ""}.${matcherName}${suffixes.short || ""}`;
      const stackFrames = (0, import_util.filteredStackTrace)((0, import_utils.captureRawStack)());
      const stepInfo = {
        category: "expect",
        apiName,
        title: longTitle,
        shortTitle,
        params: args[0] ? { expected: args[0] } : void 0,
        infectParentStepsWithError: this._info.isSoft
      };
      const step = testInfo._addStep(stepInfo);
      const reportStepError = (e) => {
        const jestError = (0, import_matcherHint.isJestError)(e) ? e : null;
        const expectError = jestError ? new import_matcherHint.ExpectError(jestError, customMessage, stackFrames) : void 0;
        if (jestError?.matcherResult.suggestedRebaseline) {
          step.complete({ suggestedRebaseline: jestError?.matcherResult.suggestedRebaseline });
          return;
        }
        const error = expectError ?? e;
        step.complete({ error });
        if (this._info.isSoft)
          testInfo._failWithError(error);
        else
          throw error;
      };
      const finalizer = () => {
        step.complete({});
      };
      try {
        setMatcherCallContext({ expectInfo: this._info, testInfo, step: step.info });
        const callback = () => matcher.call(target, ...args);
        const result = (0, import_utils.currentZone)().with("stepZone", step).run(callback);
        if (result instanceof Promise)
          return result.then(finalizer).catch(reportStepError);
        finalizer();
        return result;
      } catch (e) {
        void reportStepError(e);
      }
    };
  }
}
async function pollMatcher(qualifiedMatcherName2, info, prefix, ...args) {
  const testInfo = (0, import_globals.currentTestInfo)();
  const poll = info.poll;
  const timeout = poll.timeout ?? info.timeout ?? testInfo?._projectInternal?.expect?.timeout ?? defaultExpectTimeout;
  const { deadline, timeoutMessage } = testInfo ? testInfo._deadlineForMatcher(timeout) : import_testInfo.TestInfoImpl._defaultDeadlineForMatcher(timeout);
  const result = await (0, import_utils.pollAgainstDeadline)(async () => {
    if (testInfo && (0, import_globals.currentTestInfo)() !== testInfo)
      return { continuePolling: false, result: void 0 };
    const innerInfo = {
      ...info,
      isSoft: false,
      // soft is outside of poll, not inside
      poll: void 0
    };
    const value = await poll.generator();
    try {
      let matchers = createMatchers(value, innerInfo, prefix);
      if (info.isNot)
        matchers = matchers.not;
      matchers[qualifiedMatcherName2](...args);
      return { continuePolling: false, result: void 0 };
    } catch (error) {
      return { continuePolling: true, result: error };
    }
  }, deadline, poll.intervals ?? [100, 250, 500, 1e3]);
  if (result.timedOut) {
    const message = result.result ? [
      result.result.message,
      "",
      `Call Log:`,
      `- ${timeoutMessage}`
    ].join("\n") : timeoutMessage;
    throw new Error(message);
  }
}
const expect = createExpect({}, [], {}).extend(customMatchers);
function mergeExpects(...expects) {
  let merged = expect;
  for (const e of expects) {
    const internals = e[userMatchersSymbol];
    if (!internals)
      continue;
    merged = merged.extend(internals);
  }
  return merged;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  expect,
  mergeExpects
});
