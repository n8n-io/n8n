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
var helpers_exports = {};
__export(helpers_exports, {
  delay: () => delay,
  parseHeaderValueAsNumber: () => parseHeaderValueAsNumber
});
module.exports = __toCommonJS(helpers_exports);
var import_AbortError = require("../abort-controller/AbortError.js");
const StandardAbortMessage = "The operation was aborted.";
function delay(delayInMs, value, options) {
  return new Promise((resolve, reject) => {
    let timer = void 0;
    let onAborted = void 0;
    const rejectOnAbort = () => {
      return reject(
        new import_AbortError.AbortError(options?.abortErrorMsg ? options?.abortErrorMsg : StandardAbortMessage)
      );
    };
    const removeListeners = () => {
      if (options?.abortSignal && onAborted) {
        options.abortSignal.removeEventListener("abort", onAborted);
      }
    };
    onAborted = () => {
      if (timer) {
        clearTimeout(timer);
      }
      removeListeners();
      return rejectOnAbort();
    };
    if (options?.abortSignal && options.abortSignal.aborted) {
      return rejectOnAbort();
    }
    timer = setTimeout(() => {
      removeListeners();
      resolve(value);
    }, delayInMs);
    if (options?.abortSignal) {
      options.abortSignal.addEventListener("abort", onAborted);
    }
  });
}
function parseHeaderValueAsNumber(response, headerName) {
  const value = response.headers.get(headerName);
  if (!value) return;
  const valueAsNum = Number(value);
  if (Number.isNaN(valueAsNum)) return;
  return valueAsNum;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  delay,
  parseHeaderValueAsNumber
});
