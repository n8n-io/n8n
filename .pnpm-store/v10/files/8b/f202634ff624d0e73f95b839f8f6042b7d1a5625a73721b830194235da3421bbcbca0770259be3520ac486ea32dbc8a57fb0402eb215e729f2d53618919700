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
var language_exports = {};
__export(language_exports, {
  fromKeyboardModifiers: () => fromKeyboardModifiers,
  generateCode: () => generateCode,
  sanitizeDeviceOptions: () => sanitizeDeviceOptions,
  toClickOptionsForSourceCode: () => toClickOptionsForSourceCode,
  toKeyboardModifiers: () => toKeyboardModifiers,
  toSignalMap: () => toSignalMap
});
module.exports = __toCommonJS(language_exports);
function generateCode(actions, languageGenerator, options) {
  const header = languageGenerator.generateHeader(options);
  const footer = languageGenerator.generateFooter(options.saveStorage);
  const actionTexts = actions.map((a) => generateActionText(languageGenerator, a, !!options.generateAutoExpect)).filter(Boolean);
  const text = [header, ...actionTexts, footer].join("\n");
  return { header, footer, actionTexts, text };
}
function generateActionText(generator, action, generateAutoExpect) {
  let text = generator.generateAction(action);
  if (!text)
    return;
  if (generateAutoExpect && action.action.preconditionSelector) {
    const expectAction = {
      frame: action.frame,
      startTime: action.startTime,
      endTime: action.startTime,
      action: {
        name: "assertVisible",
        selector: action.action.preconditionSelector,
        signals: []
      }
    };
    const expectText = generator.generateAction(expectAction);
    if (expectText)
      text = expectText + "\n\n" + text;
  }
  return text;
}
function sanitizeDeviceOptions(device, options) {
  const cleanedOptions = {};
  for (const property in options) {
    if (JSON.stringify(device[property]) !== JSON.stringify(options[property]))
      cleanedOptions[property] = options[property];
  }
  return cleanedOptions;
}
function toSignalMap(action) {
  let popup;
  let download;
  let dialog;
  for (const signal of action.signals) {
    if (signal.name === "popup")
      popup = signal;
    else if (signal.name === "download")
      download = signal;
    else if (signal.name === "dialog")
      dialog = signal;
  }
  return {
    popup,
    download,
    dialog
  };
}
function toKeyboardModifiers(modifiers) {
  const result = [];
  if (modifiers & 1)
    result.push("Alt");
  if (modifiers & 2)
    result.push("ControlOrMeta");
  if (modifiers & 4)
    result.push("ControlOrMeta");
  if (modifiers & 8)
    result.push("Shift");
  return result;
}
function fromKeyboardModifiers(modifiers) {
  let result = 0;
  if (!modifiers)
    return result;
  if (modifiers.includes("Alt"))
    result |= 1;
  if (modifiers.includes("Control"))
    result |= 2;
  if (modifiers.includes("ControlOrMeta"))
    result |= 2;
  if (modifiers.includes("Meta"))
    result |= 4;
  if (modifiers.includes("Shift"))
    result |= 8;
  return result;
}
function toClickOptionsForSourceCode(action) {
  const modifiers = toKeyboardModifiers(action.modifiers);
  const options = {};
  if (action.button !== "left")
    options.button = action.button;
  if (modifiers.length)
    options.modifiers = modifiers;
  if (action.clickCount > 2)
    options.clickCount = action.clickCount;
  if (action.position)
    options.position = action.position;
  return options;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  fromKeyboardModifiers,
  generateCode,
  sanitizeDeviceOptions,
  toClickOptionsForSourceCode,
  toKeyboardModifiers,
  toSignalMap
});
