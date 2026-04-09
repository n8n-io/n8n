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
var get_vercel_oidc_token_exports = {};
__export(get_vercel_oidc_token_exports, {
  getVercelOidcToken: () => getVercelOidcToken,
  getVercelOidcTokenSync: () => getVercelOidcTokenSync
});
module.exports = __toCommonJS(get_vercel_oidc_token_exports);
var import_get_context = require("./get-context");
var import_token_error = require("./token-error");
async function getVercelOidcToken() {
  let token = "";
  let err;
  try {
    token = getVercelOidcTokenSync();
  } catch (error) {
    err = error;
  }
  try {
    const [{ getTokenPayload, isExpired }, { refreshToken }] = await Promise.all([
      await import("./token-util.js"),
      await import("./token.js")
    ]);
    if (!token || isExpired(getTokenPayload(token))) {
      await refreshToken();
      token = getVercelOidcTokenSync();
    }
  } catch (error) {
    let message = err instanceof Error ? err.message : "";
    if (error instanceof Error) {
      message = `${message}
${error.message}`;
    }
    if (message) {
      throw new import_token_error.VercelOidcTokenError(message);
    }
    throw error;
  }
  return token;
}
function getVercelOidcTokenSync() {
  const token = (0, import_get_context.getContext)().headers?.["x-vercel-oidc-token"] ?? process.env.VERCEL_OIDC_TOKEN;
  if (!token) {
    throw new Error(
      `The 'x-vercel-oidc-token' header is missing from the request. Do you have the OIDC option enabled in the Vercel project settings?`
    );
  }
  return token;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getVercelOidcToken,
  getVercelOidcTokenSync
});
