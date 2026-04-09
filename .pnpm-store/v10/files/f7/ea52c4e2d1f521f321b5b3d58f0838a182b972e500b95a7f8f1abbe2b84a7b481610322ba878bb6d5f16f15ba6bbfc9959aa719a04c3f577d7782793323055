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
var redirectPolicy_exports = {};
__export(redirectPolicy_exports, {
  redirectPolicy: () => redirectPolicy,
  redirectPolicyName: () => redirectPolicyName
});
module.exports = __toCommonJS(redirectPolicy_exports);
var import_log = require("../log.js");
const redirectPolicyName = "redirectPolicy";
const allowedRedirect = ["GET", "HEAD"];
function redirectPolicy(options = {}) {
  const { maxRetries = 20, allowCrossOriginRedirects = false } = options;
  return {
    name: redirectPolicyName,
    async sendRequest(request, next) {
      const response = await next(request);
      return handleRedirect(next, response, maxRetries, allowCrossOriginRedirects);
    }
  };
}
async function handleRedirect(next, response, maxRetries, allowCrossOriginRedirects, currentRetries = 0) {
  const { request, status, headers } = response;
  const locationHeader = headers.get("location");
  if (locationHeader && (status === 300 || status === 301 && allowedRedirect.includes(request.method) || status === 302 && allowedRedirect.includes(request.method) || status === 303 && request.method === "POST" || status === 307) && currentRetries < maxRetries) {
    const url = new URL(locationHeader, request.url);
    if (!allowCrossOriginRedirects) {
      const originalUrl = new URL(request.url);
      if (url.origin !== originalUrl.origin) {
        import_log.logger.verbose(
          `Skipping cross-origin redirect from ${originalUrl.origin} to ${url.origin}.`
        );
        return response;
      }
    }
    request.url = url.toString();
    if (status === 303) {
      request.method = "GET";
      request.headers.delete("Content-Length");
      delete request.body;
    }
    request.headers.delete("Authorization");
    const res = await next(request);
    return handleRedirect(next, res, maxRetries, allowCrossOriginRedirects, currentRetries + 1);
  }
  return response;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  redirectPolicy,
  redirectPolicyName
});
