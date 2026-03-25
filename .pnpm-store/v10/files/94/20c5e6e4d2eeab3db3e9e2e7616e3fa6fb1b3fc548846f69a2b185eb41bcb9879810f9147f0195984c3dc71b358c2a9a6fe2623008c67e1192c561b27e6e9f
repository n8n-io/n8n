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
var server_exports = {};
__export(server_exports, {
  default: () => server_default,
  renderToReadableStream: () => renderToReadableStream,
  renderToString: () => renderToString,
  version: () => import__.default
});
module.exports = __toCommonJS(server_exports);
var import_streaming = require("../streaming");
var import__ = __toESM(require("./"), 1);
const renderToString = (element, options = {}) => {
  if (Object.keys(options).length > 0) {
    console.warn("options are not supported yet");
  }
  const res = element?.toString() ?? "";
  if (typeof res !== "string") {
    throw new Error("Async component is not supported in renderToString");
  }
  return res;
};
const renderToReadableStream = async (element, options = {}) => {
  if (Object.keys(options).some((key) => key !== "onError")) {
    console.warn("options are not supported yet, except onError");
  }
  if (!element || typeof element !== "object") {
    element = element?.toString() ?? "";
  }
  return (0, import_streaming.renderToReadableStream)(element, options.onError);
};
var server_default = {
  renderToString,
  renderToReadableStream,
  version: import__.default
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  renderToReadableStream,
  renderToString,
  version
});
