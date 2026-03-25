"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
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

// src/index.ts
var index_exports = {};
__export(index_exports, {
  credentialsTreatedAsExpired: () => credentialsTreatedAsExpired,
  credentialsWillNeedRefresh: () => credentialsWillNeedRefresh,
  defaultProvider: () => defaultProvider
});
module.exports = __toCommonJS(index_exports);

// src/defaultProvider.ts
var import_credential_provider_env = require("@aws-sdk/credential-provider-env");

var import_shared_ini_file_loader = require("@smithy/shared-ini-file-loader");

// src/remoteProvider.ts
var import_property_provider = require("@smithy/property-provider");
var ENV_IMDS_DISABLED = "AWS_EC2_METADATA_DISABLED";
var remoteProvider = /* @__PURE__ */ __name(async (init) => {
  const { ENV_CMDS_FULL_URI, ENV_CMDS_RELATIVE_URI, fromContainerMetadata, fromInstanceMetadata } = await Promise.resolve().then(() => __toESM(require("@smithy/credential-provider-imds")));
  if (process.env[ENV_CMDS_RELATIVE_URI] || process.env[ENV_CMDS_FULL_URI]) {
    init.logger?.debug("@aws-sdk/credential-provider-node - remoteProvider::fromHttp/fromContainerMetadata");
    const { fromHttp } = await Promise.resolve().then(() => __toESM(require("@aws-sdk/credential-provider-http")));
    return (0, import_property_provider.chain)(fromHttp(init), fromContainerMetadata(init));
  }
  if (process.env[ENV_IMDS_DISABLED] && process.env[ENV_IMDS_DISABLED] !== "false") {
    return async () => {
      throw new import_property_provider.CredentialsProviderError("EC2 Instance Metadata Service access disabled", { logger: init.logger });
    };
  }
  init.logger?.debug("@aws-sdk/credential-provider-node - remoteProvider::fromInstanceMetadata");
  return fromInstanceMetadata(init);
}, "remoteProvider");

// src/defaultProvider.ts
var multipleCredentialSourceWarningEmitted = false;
var defaultProvider = /* @__PURE__ */ __name((init = {}) => (0, import_property_provider.memoize)(
  (0, import_property_provider.chain)(
    async () => {
      const profile = init.profile ?? process.env[import_shared_ini_file_loader.ENV_PROFILE];
      if (profile) {
        const envStaticCredentialsAreSet = process.env[import_credential_provider_env.ENV_KEY] && process.env[import_credential_provider_env.ENV_SECRET];
        if (envStaticCredentialsAreSet) {
          if (!multipleCredentialSourceWarningEmitted) {
            const warnFn = init.logger?.warn && init.logger?.constructor?.name !== "NoOpLogger" ? init.logger.warn : console.warn;
            warnFn(
              `@aws-sdk/credential-provider-node - defaultProvider::fromEnv WARNING:
    Multiple credential sources detected: 
    Both AWS_PROFILE and the pair AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY static credentials are set.
    This SDK will proceed with the AWS_PROFILE value.
    
    However, a future version may change this behavior to prefer the ENV static credentials.
    Please ensure that your environment only sets either the AWS_PROFILE or the
    AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY pair.
`
            );
            multipleCredentialSourceWarningEmitted = true;
          }
        }
        throw new import_property_provider.CredentialsProviderError("AWS_PROFILE is set, skipping fromEnv provider.", {
          logger: init.logger,
          tryNextLink: true
        });
      }
      init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromEnv");
      return (0, import_credential_provider_env.fromEnv)(init)();
    },
    async () => {
      init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromSSO");
      const { ssoStartUrl, ssoAccountId, ssoRegion, ssoRoleName, ssoSession } = init;
      if (!ssoStartUrl && !ssoAccountId && !ssoRegion && !ssoRoleName && !ssoSession) {
        throw new import_property_provider.CredentialsProviderError(
          "Skipping SSO provider in default chain (inputs do not include SSO fields).",
          { logger: init.logger }
        );
      }
      const { fromSSO } = await Promise.resolve().then(() => __toESM(require("@aws-sdk/credential-provider-sso")));
      return fromSSO(init)();
    },
    async () => {
      init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromIni");
      const { fromIni } = await Promise.resolve().then(() => __toESM(require("@aws-sdk/credential-provider-ini")));
      return fromIni(init)();
    },
    async () => {
      init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromProcess");
      const { fromProcess } = await Promise.resolve().then(() => __toESM(require("@aws-sdk/credential-provider-process")));
      return fromProcess(init)();
    },
    async () => {
      init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromTokenFile");
      const { fromTokenFile } = await Promise.resolve().then(() => __toESM(require("@aws-sdk/credential-provider-web-identity")));
      return fromTokenFile(init)();
    },
    async () => {
      init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::remoteProvider");
      return (await remoteProvider(init))();
    },
    async () => {
      throw new import_property_provider.CredentialsProviderError("Could not load credentials from any providers", {
        tryNextLink: false,
        logger: init.logger
      });
    }
  ),
  credentialsTreatedAsExpired,
  credentialsWillNeedRefresh
), "defaultProvider");
var credentialsWillNeedRefresh = /* @__PURE__ */ __name((credentials) => credentials?.expiration !== void 0, "credentialsWillNeedRefresh");
var credentialsTreatedAsExpired = /* @__PURE__ */ __name((credentials) => credentials?.expiration !== void 0 && credentials.expiration.getTime() - Date.now() < 3e5, "credentialsTreatedAsExpired");
// Annotate the CommonJS export names for ESM import in node:

0 && (module.exports = {
  defaultProvider,
  credentialsWillNeedRefresh,
  credentialsTreatedAsExpired
});

