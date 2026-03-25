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
function declareCommand(command) {
  return command;
}
function parseCommand(command, args) {
  const shape = command.args ? command.args.shape : {};
  const argv = args["_"];
  const options = command.options?.parse({ ...args, _: void 0 }) ?? {};
  const argsObject = {};
  let i = 0;
  for (const name of Object.keys(shape))
    argsObject[name] = argv[++i];
  let parsedArgsObject = {};
  try {
    parsedArgsObject = command.args?.parse(argsObject) ?? {};
  } catch (e) {
    throw new Error(formatZodError(e));
  }
  const toolName = typeof command.toolName === "function" ? command.toolName(parsedArgsObject, options) : command.toolName;
  const toolParams = command.toolParams(parsedArgsObject, options);
  return { toolName, toolParams };
}
function formatZodError(error) {
  const issue = error.issues[0];
  if (issue.code === "invalid_type")
    return `${issue.message} in <${issue.path.join(".")}>`;
  return error.issues.map((i) => i.message).join("\n");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  declareCommand,
  parseCommand
});
