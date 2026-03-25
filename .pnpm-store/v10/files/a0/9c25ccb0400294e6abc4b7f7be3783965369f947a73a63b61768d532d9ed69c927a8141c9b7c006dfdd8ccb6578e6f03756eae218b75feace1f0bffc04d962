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
var actionRunner_exports = {};
__export(actionRunner_exports, {
  runAction: () => runAction,
  traceParamsForAction: () => traceParamsForAction
});
module.exports = __toCommonJS(actionRunner_exports);
var import_expectUtils = require("../utils/expectUtils");
var import_urlMatch = require("../../utils/isomorphic/urlMatch");
var import_stringUtils = require("../../utils/isomorphic/stringUtils");
var import_time = require("../../utils/isomorphic/time");
var import_crypto = require("../utils/crypto");
var import_ariaSnapshot = require("../../utils/isomorphic/ariaSnapshot");
var import_locatorGenerators = require("../../utils/isomorphic/locatorGenerators");
var import_utilsBundle = require("../../utilsBundle");
var import_errors = require("../errors");
async function runAction(progress, mode, page, action, secrets) {
  const parentMetadata = progress.metadata;
  const frame = page.mainFrame();
  const callMetadata = callMetadataForAction(progress, frame, action, mode);
  callMetadata.log = parentMetadata.log;
  progress.metadata = callMetadata;
  await frame.instrumentation.onBeforeCall(frame, callMetadata, parentMetadata.id);
  let error;
  const result = await innerRunAction(progress, mode, page, action, secrets).catch((e) => error = e);
  callMetadata.endTime = (0, import_time.monotonicTime)();
  callMetadata.error = error ? (0, import_errors.serializeError)(error) : void 0;
  callMetadata.result = error ? void 0 : result;
  await frame.instrumentation.onAfterCall(frame, callMetadata);
  if (error)
    throw error;
  return result;
}
async function innerRunAction(progress, mode, page, action, secrets) {
  const frame = page.mainFrame();
  const commonOptions = { strict: true, noAutoWaiting: mode === "generate" };
  switch (action.method) {
    case "navigate":
      await frame.goto(progress, action.url);
      break;
    case "click":
      await frame.click(progress, action.selector, {
        button: action.button,
        clickCount: action.clickCount,
        modifiers: action.modifiers,
        ...commonOptions
      });
      break;
    case "drag":
      await frame.dragAndDrop(progress, action.sourceSelector, action.targetSelector, { ...commonOptions });
      break;
    case "hover":
      await frame.hover(progress, action.selector, {
        modifiers: action.modifiers,
        ...commonOptions
      });
      break;
    case "selectOption":
      await frame.selectOption(progress, action.selector, [], action.labels.map((a) => ({ label: a })), { ...commonOptions });
      break;
    case "pressKey":
      await page.keyboard.press(progress, action.key);
      break;
    case "pressSequentially": {
      const secret = secrets?.find((s) => s.name === action.text)?.value ?? action.text;
      await frame.type(progress, action.selector, secret, { ...commonOptions });
      if (action.submit)
        await page.keyboard.press(progress, "Enter");
      break;
    }
    case "fill": {
      const secret = secrets?.find((s) => s.name === action.text)?.value ?? action.text;
      await frame.fill(progress, action.selector, secret, { ...commonOptions });
      if (action.submit)
        await page.keyboard.press(progress, "Enter");
      break;
    }
    case "setChecked":
      if (action.checked)
        await frame.check(progress, action.selector, { ...commonOptions });
      else
        await frame.uncheck(progress, action.selector, { ...commonOptions });
      break;
    case "expectVisible": {
      await runExpect(frame, progress, mode, action.selector, { expression: "to.be.visible", isNot: !!action.isNot }, "visible", "toBeVisible", "");
      break;
    }
    case "expectValue": {
      if (action.type === "textbox" || action.type === "combobox" || action.type === "slider") {
        const expectedText = (0, import_expectUtils.serializeExpectedTextValues)([action.value]);
        await runExpect(frame, progress, mode, action.selector, { expression: "to.have.value", expectedText, isNot: !!action.isNot }, action.value, "toHaveValue", "expected");
      } else if (action.type === "checkbox" || action.type === "radio") {
        const expectedValue = { checked: action.value === "true" };
        await runExpect(frame, progress, mode, action.selector, { selector: action.selector, expression: "to.be.checked", expectedValue, isNot: !!action.isNot }, action.value ? "checked" : "unchecked", "toBeChecked", "");
      } else {
        throw new Error(`Unsupported element type: ${action.type}`);
      }
      break;
    }
    case "expectAria": {
      const expectedValue = (0, import_ariaSnapshot.parseAriaSnapshotUnsafe)(import_utilsBundle.yaml, action.template);
      await runExpect(frame, progress, mode, "body", { expression: "to.match.aria", expectedValue, isNot: !!action.isNot }, "\n" + action.template, "toMatchAriaSnapshot", "expected");
      break;
    }
    case "expectURL": {
      if (!action.regex && !action.value)
        throw new Error("Either url or regex must be provided");
      if (action.regex && action.value)
        throw new Error("Only one of url or regex can be provided");
      const expected = action.regex ? (0, import_stringUtils.parseRegex)(action.regex) : (0, import_urlMatch.constructURLBasedOnBaseURL)(page.browserContext._options.baseURL, action.value);
      const expectedText = (0, import_expectUtils.serializeExpectedTextValues)([expected]);
      await runExpect(frame, progress, mode, void 0, { expression: "to.have.url", expectedText, isNot: !!action.isNot }, expected, "toHaveURL", "expected");
      break;
    }
    case "expectTitle": {
      const expectedText = (0, import_expectUtils.serializeExpectedTextValues)([action.value], { normalizeWhiteSpace: true });
      await runExpect(frame, progress, mode, void 0, { expression: "to.have.title", expectedText, isNot: !!action.isNot }, action.value, "toHaveTitle", "expected");
      break;
    }
  }
}
async function runExpect(frame, progress, mode, selector, options, expected, matcherName, expectation) {
  const result = await frame.expect(progress, selector, {
    ...options,
    // When generating, we want the expect to pass or fail immediately and give feedback to the model.
    noAutoWaiting: mode === "generate",
    timeoutForLogs: mode === "generate" ? void 0 : progress.timeout
  });
  if (!result.matches === !options.isNot) {
    const received = matcherName === "toMatchAriaSnapshot" ? "\n" + result.received.raw : result.received;
    const expectedSuffix = typeof expected === "string" ? "" : " pattern";
    const expectedDisplay = typeof expected === "string" ? expected : expected.toString();
    throw new Error((0, import_expectUtils.formatMatcherMessage)(import_expectUtils.simpleMatcherUtils, {
      isNot: options.isNot,
      matcherName,
      expectation,
      locator: selector ? (0, import_locatorGenerators.asLocatorDescription)("javascript", selector) : void 0,
      timedOut: result.timedOut,
      timeout: mode === "generate" ? void 0 : progress.timeout,
      printedExpected: options.isNot ? `Expected${expectedSuffix}: not ${expectedDisplay}` : `Expected${expectedSuffix}: ${expectedDisplay}`,
      printedReceived: result.errorMessage ? "" : `Received: ${received}`,
      errorMessage: result.errorMessage
      // Note: we are not passing call log, because it will be automatically appended on the client side,
      // as a part of the agent.{perform,expect} call.
    }));
  }
}
function traceParamsForAction(progress, action, mode) {
  const timeout = progress.timeout;
  switch (action.method) {
    case "navigate": {
      const params = {
        url: action.url,
        timeout
      };
      return { type: "Frame", method: "goto", params };
    }
    case "click": {
      const params = {
        selector: action.selector,
        strict: true,
        modifiers: action.modifiers,
        button: action.button,
        clickCount: action.clickCount,
        timeout
      };
      return { type: "Frame", method: "click", params };
    }
    case "drag": {
      const params = {
        source: action.sourceSelector,
        target: action.targetSelector,
        timeout
      };
      return { type: "Frame", method: "dragAndDrop", params };
    }
    case "hover": {
      const params = {
        selector: action.selector,
        modifiers: action.modifiers,
        timeout
      };
      return { type: "Frame", method: "hover", params };
    }
    case "pressKey": {
      const params = {
        key: action.key
      };
      return { type: "Page", method: "keyboardPress", params };
    }
    case "pressSequentially": {
      const params = {
        selector: action.selector,
        text: action.text,
        timeout
      };
      return { type: "Frame", method: "type", params };
    }
    case "fill": {
      const params = {
        selector: action.selector,
        strict: true,
        value: action.text,
        timeout
      };
      return { type: "Frame", method: "fill", params };
    }
    case "setChecked": {
      if (action.checked) {
        const params = {
          selector: action.selector,
          strict: true,
          timeout
        };
        return { type: "Frame", method: "check", params };
      } else {
        const params = {
          selector: action.selector,
          strict: true,
          timeout
        };
        return { type: "Frame", method: "uncheck", params };
      }
    }
    case "selectOption": {
      const params = {
        selector: action.selector,
        strict: true,
        options: action.labels.map((label) => ({ label })),
        timeout
      };
      return { type: "Frame", method: "selectOption", params };
    }
    case "expectValue": {
      if (action.type === "textbox" || action.type === "combobox" || action.type === "slider") {
        const expectedText = (0, import_expectUtils.serializeExpectedTextValues)([action.value]);
        const params = {
          selector: action.selector,
          expression: "to.have.value",
          expectedText,
          isNot: !!action.isNot,
          timeout
        };
        return { type: "Frame", method: "expect", title: "Expect Value", params };
      } else if (action.type === "checkbox" || action.type === "radio") {
        const params = {
          selector: action.selector,
          expression: "to.be.checked",
          isNot: !!action.isNot,
          timeout
        };
        return { type: "Frame", method: "expect", title: "Expect Checked", params };
      } else {
        throw new Error(`Unsupported element type: ${action.type}`);
      }
    }
    case "expectVisible": {
      const params = {
        selector: action.selector,
        expression: "to.be.visible",
        isNot: !!action.isNot,
        timeout
      };
      return { type: "Frame", method: "expect", title: "Expect Visible", params };
    }
    case "expectAria": {
      const params = {
        selector: "body",
        expression: "to.match.snapshot",
        expectedText: [],
        isNot: !!action.isNot,
        timeout
      };
      return { type: "Frame", method: "expect", title: "Expect Aria Snapshot", params };
    }
    case "expectURL": {
      const expected = action.regex ? (0, import_stringUtils.parseRegex)(action.regex) : action.value;
      const expectedText = (0, import_expectUtils.serializeExpectedTextValues)([expected]);
      const params = {
        selector: void 0,
        expression: "to.have.url",
        expectedText,
        isNot: !!action.isNot,
        timeout
      };
      return { type: "Frame", method: "expect", title: "Expect URL", params };
    }
    case "expectTitle": {
      const expectedText = (0, import_expectUtils.serializeExpectedTextValues)([action.value], { normalizeWhiteSpace: true });
      const params = {
        selector: void 0,
        expression: "to.have.title",
        expectedText,
        isNot: !!action.isNot,
        timeout
      };
      return { type: "Frame", method: "expect", title: "Expect Title", params };
    }
  }
}
function callMetadataForAction(progress, frame, action, mode) {
  const callMetadata = {
    id: `call@${(0, import_crypto.createGuid)()}`,
    objectId: frame.guid,
    pageId: frame._page.guid,
    frameId: frame.guid,
    startTime: (0, import_time.monotonicTime)(),
    endTime: 0,
    log: [],
    ...traceParamsForAction(progress, action, mode)
  };
  return callMetadata;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  runAction,
  traceParamsForAction
});
