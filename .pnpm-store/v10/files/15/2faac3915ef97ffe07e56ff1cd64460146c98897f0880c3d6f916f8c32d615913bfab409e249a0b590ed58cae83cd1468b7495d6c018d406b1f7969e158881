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
var command_exports = {};
__export(command_exports, {
  declareCommand: () => declareCommand,
  parseCommand: () => parseCommand
});
module.exports = __toCommonJS(command_exports);
var import_mcpBundle = require("playwright-core/lib/mcpBundle");
function declareCommand(command) {
  return command;
}
const kEmptyOptions = import_mcpBundle.z.object({});
const kEmptyArgs = import_mcpBundle.z.object({});
function parseCommand(command, args) {
  const optionsObject = { ...args };
  delete optionsObject["_"];
  const optionsSchema = (command.options ?? kEmptyOptions).strict();
  const options = zodParse(optionsSchema, optionsObject, "option");
  const argsSchema = (command.args ?? kEmptyArgs).strict();
  const argNames = [...Object.keys(argsSchema.shape)];
  const argv = args["_"].slice(1);
  if (argv.length > argNames.length)
    throw new Error(`error: too many arguments: expected ${argNames.length}, received ${argv.length}`);
  const argsObject = {};
  argNames.forEach((name, index) => argsObject[name] = argv[index]);
  const parsedArgsObject = zodParse(argsSchema, argsObject, "argument");
  const toolName = typeof command.toolName === "function" ? command.toolName({ ...parsedArgsObject, ...options }) : command.toolName;
  const toolParams = command.toolParams({ ...parsedArgsObject, ...options });
  return { toolName, toolParams };
}
function zodParse(schema, data, type) {
  try {
    return schema.parse(data);
  } catch (e) {
    throw new Error(e.issues.map((issue) => {
      const keys = issue.keys || [""];
      const props = keys.map((key) => [...issue.path, key].filter(Boolean).join("."));
      return props.map((prop) => {
        const label = type === "option" ? `'--${prop}' option` : `'${prop}' argument`;
        switch (issue.code) {
          case "invalid_type":
            return "error: " + label + ": " + issue.message.replace(/Invalid input:/, "").trim();
          case "unrecognized_keys":
            return "error: unknown " + label;
          default:
            return "error: " + label + ": " + issue.message;
        }
      });
    }).flat().join("\n"));
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  declareCommand,
  parseCommand
});
