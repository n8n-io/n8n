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
var oauth_exports = {};
__export(oauth_exports, {
  processTokenResponse: () => processTokenResponse,
  refreshTokenRequest: () => refreshTokenRequest
});
module.exports = __toCommonJS(oauth_exports);
var import_os = require("os");
const VERCEL_ISSUER = "https://vercel.com";
const VERCEL_CLI_CLIENT_ID = "cl_HYyOPBNtFMfHhaUn9L4QPfTZz6TP47bp";
const userAgent = `@vercel/oidc node-${process.version} ${(0, import_os.platform)()} (${(0, import_os.arch)()}) ${(0, import_os.hostname)()}`;
let _tokenEndpoint = null;
async function getTokenEndpoint() {
  if (_tokenEndpoint) {
    return _tokenEndpoint;
  }
  const discoveryUrl = `${VERCEL_ISSUER}/.well-known/openid-configuration`;
  const response = await fetch(discoveryUrl, {
    headers: { "user-agent": userAgent }
  });
  if (!response.ok) {
    throw new Error("Failed to discover OAuth endpoints");
  }
  const metadata = await response.json();
  if (!metadata || typeof metadata.token_endpoint !== "string") {
    throw new Error("Invalid OAuth discovery response");
  }
  const endpoint = metadata.token_endpoint;
  _tokenEndpoint = endpoint;
  return endpoint;
}
async function refreshTokenRequest(options) {
  const tokenEndpoint = await getTokenEndpoint();
  return await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "user-agent": userAgent
    },
    body: new URLSearchParams({
      client_id: VERCEL_CLI_CLIENT_ID,
      grant_type: "refresh_token",
      ...options
    })
  });
}
async function processTokenResponse(response) {
  const json = await response.json();
  if (!response.ok) {
    const errorMsg = typeof json === "object" && json && "error" in json ? String(json.error) : "Token refresh failed";
    return [new Error(errorMsg)];
  }
  if (typeof json !== "object" || json === null) {
    return [new Error("Invalid token response")];
  }
  if (typeof json.access_token !== "string") {
    return [new Error("Missing access_token in response")];
  }
  if (json.token_type !== "Bearer") {
    return [new Error("Invalid token_type in response")];
  }
  if (typeof json.expires_in !== "number") {
    return [new Error("Missing expires_in in response")];
  }
  return [null, json];
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  processTokenResponse,
  refreshTokenRequest
});
