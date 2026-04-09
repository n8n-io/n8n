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
var credentials_exports = {};
__export(credentials_exports, {
  isApiKeyCredential: () => isApiKeyCredential,
  isBasicCredential: () => isBasicCredential,
  isBearerTokenCredential: () => isBearerTokenCredential,
  isOAuth2TokenCredential: () => isOAuth2TokenCredential
});
module.exports = __toCommonJS(credentials_exports);
function isOAuth2TokenCredential(credential) {
  return "getOAuth2Token" in credential;
}
function isBearerTokenCredential(credential) {
  return "getBearerToken" in credential;
}
function isBasicCredential(credential) {
  return "username" in credential && "password" in credential;
}
function isApiKeyCredential(credential) {
  return "key" in credential;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  isApiKeyCredential,
  isBasicCredential,
  isBearerTokenCredential,
  isOAuth2TokenCredential
});
