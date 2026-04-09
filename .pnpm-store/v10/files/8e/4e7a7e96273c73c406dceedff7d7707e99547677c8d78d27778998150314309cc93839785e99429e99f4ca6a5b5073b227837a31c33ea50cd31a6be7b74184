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
var auxiliaryAuthenticationHeaderPolicy_exports = {};
__export(auxiliaryAuthenticationHeaderPolicy_exports, {
  auxiliaryAuthenticationHeaderPolicy: () => auxiliaryAuthenticationHeaderPolicy,
  auxiliaryAuthenticationHeaderPolicyName: () => auxiliaryAuthenticationHeaderPolicyName
});
module.exports = __toCommonJS(auxiliaryAuthenticationHeaderPolicy_exports);
var import_tokenCycler = require("../util/tokenCycler.js");
var import_log = require("../log.js");
const auxiliaryAuthenticationHeaderPolicyName = "auxiliaryAuthenticationHeaderPolicy";
const AUTHORIZATION_AUXILIARY_HEADER = "x-ms-authorization-auxiliary";
async function sendAuthorizeRequest(options) {
  const { scopes, getAccessToken, request } = options;
  const getTokenOptions = {
    abortSignal: request.abortSignal,
    tracingOptions: request.tracingOptions
  };
  return (await getAccessToken(scopes, getTokenOptions))?.token ?? "";
}
function auxiliaryAuthenticationHeaderPolicy(options) {
  const { credentials, scopes } = options;
  const logger = options.logger || import_log.logger;
  const tokenCyclerMap = /* @__PURE__ */ new WeakMap();
  return {
    name: auxiliaryAuthenticationHeaderPolicyName,
    async sendRequest(request, next) {
      if (!request.url.toLowerCase().startsWith("https://")) {
        throw new Error(
          "Bearer token authentication for auxiliary header is not permitted for non-TLS protected (non-https) URLs."
        );
      }
      if (!credentials || credentials.length === 0) {
        logger.info(
          `${auxiliaryAuthenticationHeaderPolicyName} header will not be set due to empty credentials.`
        );
        return next(request);
      }
      const tokenPromises = [];
      for (const credential of credentials) {
        let getAccessToken = tokenCyclerMap.get(credential);
        if (!getAccessToken) {
          getAccessToken = (0, import_tokenCycler.createTokenCycler)(credential);
          tokenCyclerMap.set(credential, getAccessToken);
        }
        tokenPromises.push(
          sendAuthorizeRequest({
            scopes: Array.isArray(scopes) ? scopes : [scopes],
            request,
            getAccessToken,
            logger
          })
        );
      }
      const auxiliaryTokens = (await Promise.all(tokenPromises)).filter((token) => Boolean(token));
      if (auxiliaryTokens.length === 0) {
        logger.warning(
          `None of the auxiliary tokens are valid. ${AUTHORIZATION_AUXILIARY_HEADER} header will not be set.`
        );
        return next(request);
      }
      request.headers.set(
        AUTHORIZATION_AUXILIARY_HEADER,
        auxiliaryTokens.map((token) => `Bearer ${token}`).join(", ")
      );
      return next(request);
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  auxiliaryAuthenticationHeaderPolicy,
  auxiliaryAuthenticationHeaderPolicyName
});
