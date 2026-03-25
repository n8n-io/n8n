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
var codegen_exports = {};
__export(codegen_exports, {
  generateCode: () => generateCode
});
module.exports = __toCommonJS(codegen_exports);
var import_locatorGenerators = require("../../utils/isomorphic/locatorGenerators");
var import_stringUtils = require("../../utils/isomorphic/stringUtils");
async function generateCode(sdkLanguage, action) {
  switch (action.method) {
    case "navigate": {
      return `await page.goto(${(0, import_stringUtils.escapeWithQuotes)(action.url)});`;
    }
    case "click": {
      const locator = (0, import_locatorGenerators.asLocator)(sdkLanguage, action.selector);
      return `await page.${locator}.click(${(0, import_stringUtils.formatObjectOrVoid)({
        button: action.button,
        clickCount: action.clickCount,
        modifiers: action.modifiers
      })});`;
    }
    case "drag": {
      const sourceLocator = (0, import_locatorGenerators.asLocator)(sdkLanguage, action.sourceSelector);
      const targetLocator = (0, import_locatorGenerators.asLocator)(sdkLanguage, action.targetSelector);
      return `await page.${sourceLocator}.dragAndDrop(${targetLocator});`;
    }
    case "hover": {
      const locator = (0, import_locatorGenerators.asLocator)(sdkLanguage, action.selector);
      return `await page.${locator}.hover(${(0, import_stringUtils.formatObjectOrVoid)({
        modifiers: action.modifiers
      })});`;
    }
    case "pressKey": {
      return `await page.keyboard.press(${(0, import_stringUtils.escapeWithQuotes)(action.key, "'")});`;
    }
    case "selectOption": {
      const locator = (0, import_locatorGenerators.asLocator)(sdkLanguage, action.selector);
      return `await page.${locator}.selectOption(${action.labels.length === 1 ? (0, import_stringUtils.escapeWithQuotes)(action.labels[0]) : "[" + action.labels.map((label) => (0, import_stringUtils.escapeWithQuotes)(label)).join(", ") + "]"});`;
    }
    case "pressSequentially": {
      const locator = (0, import_locatorGenerators.asLocator)(sdkLanguage, action.selector);
      const code = [`await page.${locator}.pressSequentially(${(0, import_stringUtils.escapeWithQuotes)(action.text)});`];
      if (action.submit)
        code.push(`await page.keyboard.press('Enter');`);
      return code.join("\n");
    }
    case "fill": {
      const locator = (0, import_locatorGenerators.asLocator)(sdkLanguage, action.selector);
      const code = [`await page.${locator}.fill(${(0, import_stringUtils.escapeWithQuotes)(action.text)});`];
      if (action.submit)
        code.push(`await page.keyboard.press('Enter');`);
      return code.join("\n");
    }
    case "setChecked": {
      const locator = (0, import_locatorGenerators.asLocator)(sdkLanguage, action.selector);
      if (action.checked)
        return `await page.${locator}.check();`;
      else
        return `await page.${locator}.uncheck();`;
    }
    case "expectVisible": {
      const locator = (0, import_locatorGenerators.asLocator)(sdkLanguage, action.selector);
      const notInfix = action.isNot ? "not." : "";
      return `await expect(page.${locator}).${notInfix}toBeVisible();`;
    }
    case "expectValue": {
      const notInfix = action.isNot ? "not." : "";
      const locator = (0, import_locatorGenerators.asLocator)(sdkLanguage, action.selector);
      if (action.type === "checkbox" || action.type === "radio")
        return `await expect(page.${locator}).${notInfix}toBeChecked({ checked: ${action.value === "true"} });`;
      return `await expect(page.${locator}).${notInfix}toHaveValue(${(0, import_stringUtils.escapeWithQuotes)(action.value)});`;
    }
    case "expectAria": {
      const notInfix = action.isNot ? "not." : "";
      return `await expect(page.locator('body')).${notInfix}toMatchAria(\`
${(0, import_stringUtils.escapeTemplateString)(action.template)}
\`);`;
    }
    case "expectURL": {
      const arg = action.regex ? (0, import_stringUtils.parseRegex)(action.regex).toString() : (0, import_stringUtils.escapeWithQuotes)(action.value);
      const notInfix = action.isNot ? "not." : "";
      return `await expect(page).${notInfix}toHaveURL(${arg});`;
    }
    case "expectTitle": {
      const notInfix = action.isNot ? "not." : "";
      return `await expect(page).${notInfix}toHaveTitle(${(0, import_stringUtils.escapeWithQuotes)(action.value)});`;
    }
  }
  throw new Error("Unknown action " + action.method);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  generateCode
});
