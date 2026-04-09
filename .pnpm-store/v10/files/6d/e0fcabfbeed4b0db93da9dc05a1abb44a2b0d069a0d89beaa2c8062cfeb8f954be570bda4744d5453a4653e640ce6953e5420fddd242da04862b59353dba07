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
var token_exports = {};
__export(token_exports, {
  refreshToken: () => refreshToken
});
module.exports = __toCommonJS(token_exports);
var import_token_error = require("./token-error");
var import_token_util = require("./token-util");
async function refreshToken() {
  const { projectId, teamId } = (0, import_token_util.findProjectInfo)();
  let maybeToken = (0, import_token_util.loadToken)(projectId);
  if (!maybeToken || (0, import_token_util.isExpired)((0, import_token_util.getTokenPayload)(maybeToken.token))) {
    const authToken = await (0, import_token_util.getVercelCliToken)();
    if (!authToken) {
      throw new import_token_error.VercelOidcTokenError(
        "Failed to refresh OIDC token: Log in to Vercel CLI and link your project with `vc link`"
      );
    }
    if (!projectId) {
      throw new import_token_error.VercelOidcTokenError(
        "Failed to refresh OIDC token: Try re-linking your project with `vc link`"
      );
    }
    maybeToken = await (0, import_token_util.getVercelOidcToken)(authToken, projectId, teamId);
    if (!maybeToken) {
      throw new import_token_error.VercelOidcTokenError("Failed to refresh OIDC token");
    }
    (0, import_token_util.saveToken)(maybeToken, projectId);
  }
  process.env.VERCEL_OIDC_TOKEN = maybeToken.token;
  return;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  refreshToken
});
