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
var clientHelpers_exports = {};
__export(clientHelpers_exports, {
  createDefaultPipeline: () => createDefaultPipeline,
  getCachedDefaultHttpsClient: () => getCachedDefaultHttpsClient
});
module.exports = __toCommonJS(clientHelpers_exports);
var import_defaultHttpClient = require("../defaultHttpClient.js");
var import_createPipelineFromOptions = require("../createPipelineFromOptions.js");
var import_apiVersionPolicy = require("./apiVersionPolicy.js");
var import_credentials = require("../auth/credentials.js");
var import_apiKeyAuthenticationPolicy = require("../policies/auth/apiKeyAuthenticationPolicy.js");
var import_basicAuthenticationPolicy = require("../policies/auth/basicAuthenticationPolicy.js");
var import_bearerAuthenticationPolicy = require("../policies/auth/bearerAuthenticationPolicy.js");
var import_oauth2AuthenticationPolicy = require("../policies/auth/oauth2AuthenticationPolicy.js");
let cachedHttpClient;
function createDefaultPipeline(options = {}) {
  const pipeline = (0, import_createPipelineFromOptions.createPipelineFromOptions)(options);
  pipeline.addPolicy((0, import_apiVersionPolicy.apiVersionPolicy)(options));
  const { credential, authSchemes, allowInsecureConnection } = options;
  if (credential) {
    if ((0, import_credentials.isApiKeyCredential)(credential)) {
      pipeline.addPolicy(
        (0, import_apiKeyAuthenticationPolicy.apiKeyAuthenticationPolicy)({ authSchemes, credential, allowInsecureConnection })
      );
    } else if ((0, import_credentials.isBasicCredential)(credential)) {
      pipeline.addPolicy(
        (0, import_basicAuthenticationPolicy.basicAuthenticationPolicy)({ authSchemes, credential, allowInsecureConnection })
      );
    } else if ((0, import_credentials.isBearerTokenCredential)(credential)) {
      pipeline.addPolicy(
        (0, import_bearerAuthenticationPolicy.bearerAuthenticationPolicy)({ authSchemes, credential, allowInsecureConnection })
      );
    } else if ((0, import_credentials.isOAuth2TokenCredential)(credential)) {
      pipeline.addPolicy(
        (0, import_oauth2AuthenticationPolicy.oauth2AuthenticationPolicy)({ authSchemes, credential, allowInsecureConnection })
      );
    }
  }
  return pipeline;
}
function getCachedDefaultHttpsClient() {
  if (!cachedHttpClient) {
    cachedHttpClient = (0, import_defaultHttpClient.createDefaultHttpClient)();
  }
  return cachedHttpClient;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createDefaultPipeline,
  getCachedDefaultHttpsClient
});
