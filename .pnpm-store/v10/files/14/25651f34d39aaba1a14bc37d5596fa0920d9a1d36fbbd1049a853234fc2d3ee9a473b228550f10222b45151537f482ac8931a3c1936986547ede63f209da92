"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var crProtocolHelper_exports = {};
__export(crProtocolHelper_exports, {
  exceptionToError: () => exceptionToError,
  getExceptionMessage: () => getExceptionMessage,
  readProtocolStream: () => readProtocolStream,
  releaseObject: () => releaseObject,
  saveProtocolStream: () => saveProtocolStream,
  toButtonsMask: () => toButtonsMask,
  toConsoleMessageLocation: () => toConsoleMessageLocation,
  toModifiersMask: () => toModifiersMask
});
module.exports = __toCommonJS(crProtocolHelper_exports);
var import_fs = __toESM(require("fs"));
var import_stackTrace = require("../../utils/isomorphic/stackTrace");
var import_fileUtils = require("../utils/fileUtils");
function getExceptionMessage(exceptionDetails) {
  if (exceptionDetails.exception)
    return exceptionDetails.exception.description || String(exceptionDetails.exception.value);
  let message = exceptionDetails.text;
  if (exceptionDetails.stackTrace) {
    for (const callframe of exceptionDetails.stackTrace.callFrames) {
      const location = callframe.url + ":" + callframe.lineNumber + ":" + callframe.columnNumber;
      const functionName = callframe.functionName || "<anonymous>";
      message += `
    at ${functionName} (${location})`;
    }
  }
  return message;
}
async function releaseObject(client, objectId) {
  await client.send("Runtime.releaseObject", { objectId }).catch((error) => {
  });
}
async function saveProtocolStream(client, handle, path) {
  let eof = false;
  await (0, import_fileUtils.mkdirIfNeeded)(path);
  const fd = await import_fs.default.promises.open(path, "w");
  while (!eof) {
    const response = await client.send("IO.read", { handle });
    eof = response.eof;
    const buf = Buffer.from(response.data, response.base64Encoded ? "base64" : void 0);
    await fd.write(buf);
  }
  await fd.close();
  await client.send("IO.close", { handle });
}
async function readProtocolStream(client, handle) {
  let eof = false;
  const chunks = [];
  while (!eof) {
    const response = await client.send("IO.read", { handle });
    eof = response.eof;
    const buf = Buffer.from(response.data, response.base64Encoded ? "base64" : void 0);
    chunks.push(buf);
  }
  await client.send("IO.close", { handle });
  return Buffer.concat(chunks);
}
function toConsoleMessageLocation(stackTrace) {
  return stackTrace && stackTrace.callFrames.length ? {
    url: stackTrace.callFrames[0].url,
    lineNumber: stackTrace.callFrames[0].lineNumber,
    columnNumber: stackTrace.callFrames[0].columnNumber
  } : { url: "", lineNumber: 0, columnNumber: 0 };
}
function exceptionToError(exceptionDetails) {
  const messageWithStack = getExceptionMessage(exceptionDetails);
  const lines = messageWithStack.split("\n");
  const firstStackTraceLine = lines.findIndex((line) => line.startsWith("    at"));
  let messageWithName = "";
  let stack = "";
  if (firstStackTraceLine === -1) {
    messageWithName = messageWithStack;
  } else {
    messageWithName = lines.slice(0, firstStackTraceLine).join("\n");
    stack = messageWithStack;
  }
  const { name, message } = (0, import_stackTrace.splitErrorMessage)(messageWithName);
  const err = new Error(message);
  err.stack = stack;
  const nameOverride = exceptionDetails.exception?.preview?.properties.find((o) => o.name === "name");
  err.name = nameOverride ? nameOverride.value ?? "Error" : name;
  return err;
}
function toModifiersMask(modifiers) {
  let mask = 0;
  if (modifiers.has("Alt"))
    mask |= 1;
  if (modifiers.has("Control"))
    mask |= 2;
  if (modifiers.has("Meta"))
    mask |= 4;
  if (modifiers.has("Shift"))
    mask |= 8;
  return mask;
}
function toButtonsMask(buttons) {
  let mask = 0;
  if (buttons.has("left"))
    mask |= 1;
  if (buttons.has("right"))
    mask |= 2;
  if (buttons.has("middle"))
    mask |= 4;
  return mask;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  exceptionToError,
  getExceptionMessage,
  readProtocolStream,
  releaseObject,
  saveProtocolStream,
  toButtonsMask,
  toConsoleMessageLocation,
  toModifiersMask
});
