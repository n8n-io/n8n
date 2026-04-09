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
var checkInsecureConnection_exports = {};
__export(checkInsecureConnection_exports, {
  ensureSecureConnection: () => ensureSecureConnection
});
module.exports = __toCommonJS(checkInsecureConnection_exports);
var import_log = require("../../log.js");
let insecureConnectionWarningEmmitted = false;
function allowInsecureConnection(request, options) {
  if (options.allowInsecureConnection && request.allowInsecureConnection) {
    const url = new URL(request.url);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return true;
    }
  }
  return false;
}
function emitInsecureConnectionWarning() {
  const warning = "Sending token over insecure transport. Assume any token issued is compromised.";
  import_log.logger.warning(warning);
  if (typeof process?.emitWarning === "function" && !insecureConnectionWarningEmmitted) {
    insecureConnectionWarningEmmitted = true;
    process.emitWarning(warning);
  }
}
function ensureSecureConnection(request, options) {
  if (!request.url.toLowerCase().startsWith("https://")) {
    if (allowInsecureConnection(request, options)) {
      emitInsecureConnectionWarning();
    } else {
      throw new Error(
        "Authentication is not permitted for non-TLS protected (non-https) URLs when allowInsecureConnection is false."
      );
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ensureSecureConnection
});
