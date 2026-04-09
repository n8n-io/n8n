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
var token_util_exports = {};
__export(token_util_exports, {
  assertVercelOidcTokenResponse: () => assertVercelOidcTokenResponse,
  findProjectInfo: () => findProjectInfo,
  getTokenPayload: () => getTokenPayload,
  getVercelCliToken: () => getVercelCliToken,
  getVercelDataDir: () => getVercelDataDir,
  getVercelOidcToken: () => getVercelOidcToken,
  isExpired: () => isExpired,
  loadToken: () => loadToken,
  saveToken: () => saveToken
});
module.exports = __toCommonJS(token_util_exports);
var path = __toESM(require("path"));
var fs = __toESM(require("fs"));
var import_token_error = require("./token-error");
var import_token_io = require("./token-io");
var import_auth_config = require("./auth-config");
var import_oauth = require("./oauth");
function getVercelDataDir() {
  const vercelFolder = "com.vercel.cli";
  const dataDir = (0, import_token_io.getUserDataDir)();
  if (!dataDir) {
    return null;
  }
  return path.join(dataDir, vercelFolder);
}
async function getVercelCliToken() {
  const authConfig = (0, import_auth_config.readAuthConfig)();
  if (!authConfig) {
    return null;
  }
  if ((0, import_auth_config.isValidAccessToken)(authConfig)) {
    return authConfig.token || null;
  }
  if (!authConfig.refreshToken) {
    (0, import_auth_config.writeAuthConfig)({});
    return null;
  }
  try {
    const tokenResponse = await (0, import_oauth.refreshTokenRequest)({
      refresh_token: authConfig.refreshToken
    });
    const [tokensError, tokens] = await (0, import_oauth.processTokenResponse)(tokenResponse);
    if (tokensError || !tokens) {
      (0, import_auth_config.writeAuthConfig)({});
      return null;
    }
    const updatedConfig = {
      token: tokens.access_token,
      expiresAt: Math.floor(Date.now() / 1e3) + tokens.expires_in
    };
    if (tokens.refresh_token) {
      updatedConfig.refreshToken = tokens.refresh_token;
    }
    (0, import_auth_config.writeAuthConfig)(updatedConfig);
    return updatedConfig.token ?? null;
  } catch (error) {
    (0, import_auth_config.writeAuthConfig)({});
    return null;
  }
}
async function getVercelOidcToken(authToken, projectId, teamId) {
  const url = `https://api.vercel.com/v1/projects/${projectId}/token?source=vercel-oidc-refresh${teamId ? `&teamId=${teamId}` : ""}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`
    }
  });
  if (!res.ok) {
    throw new import_token_error.VercelOidcTokenError(
      `Failed to refresh OIDC token: ${res.statusText}`
    );
  }
  const tokenRes = await res.json();
  assertVercelOidcTokenResponse(tokenRes);
  return tokenRes;
}
function assertVercelOidcTokenResponse(res) {
  if (!res || typeof res !== "object") {
    throw new TypeError(
      "Vercel OIDC token is malformed. Expected an object. Please run `vc env pull` and try again"
    );
  }
  if (!("token" in res) || typeof res.token !== "string") {
    throw new TypeError(
      "Vercel OIDC token is malformed. Expected a string-valued token property. Please run `vc env pull` and try again"
    );
  }
}
function findProjectInfo() {
  const dir = (0, import_token_io.findRootDir)();
  if (!dir) {
    throw new import_token_error.VercelOidcTokenError(
      "Unable to find project root directory. Have you linked your project with `vc link?`"
    );
  }
  const prjPath = path.join(dir, ".vercel", "project.json");
  if (!fs.existsSync(prjPath)) {
    throw new import_token_error.VercelOidcTokenError(
      "project.json not found, have you linked your project with `vc link?`"
    );
  }
  const prj = JSON.parse(fs.readFileSync(prjPath, "utf8"));
  if (typeof prj.projectId !== "string" && typeof prj.orgId !== "string") {
    throw new TypeError(
      "Expected a string-valued projectId property. Try running `vc link` to re-link your project."
    );
  }
  return { projectId: prj.projectId, teamId: prj.orgId };
}
function saveToken(token, projectId) {
  const dir = (0, import_token_io.getUserDataDir)();
  if (!dir) {
    throw new import_token_error.VercelOidcTokenError(
      "Unable to find user data directory. Please reach out to Vercel support."
    );
  }
  const tokenPath = path.join(dir, "com.vercel.token", `${projectId}.json`);
  const tokenJson = JSON.stringify(token);
  fs.mkdirSync(path.dirname(tokenPath), { mode: 504, recursive: true });
  fs.writeFileSync(tokenPath, tokenJson);
  fs.chmodSync(tokenPath, 432);
  return;
}
function loadToken(projectId) {
  const dir = (0, import_token_io.getUserDataDir)();
  if (!dir) {
    throw new import_token_error.VercelOidcTokenError(
      "Unable to find user data directory. Please reach out to Vercel support."
    );
  }
  const tokenPath = path.join(dir, "com.vercel.token", `${projectId}.json`);
  if (!fs.existsSync(tokenPath)) {
    return null;
  }
  const token = JSON.parse(fs.readFileSync(tokenPath, "utf8"));
  assertVercelOidcTokenResponse(token);
  return token;
}
function getTokenPayload(token) {
  const tokenParts = token.split(".");
  if (tokenParts.length !== 3) {
    throw new import_token_error.VercelOidcTokenError(
      "Invalid token. Please run `vc env pull` and try again"
    );
  }
  const base64 = tokenParts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + (4 - base64.length % 4) % 4,
    "="
  );
  return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
}
function isExpired(token) {
  return token.exp * 1e3 < Date.now();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  assertVercelOidcTokenResponse,
  findProjectInfo,
  getTokenPayload,
  getVercelCliToken,
  getVercelDataDir,
  getVercelOidcToken,
  isExpired,
  loadToken,
  saveToken
});
