"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/submodules/httpAuthSchemes/index.ts
var index_exports = {};
__export(index_exports, {
  AWSSDKSigV4Signer: () => AWSSDKSigV4Signer,
  AwsSdkSigV4ASigner: () => AwsSdkSigV4ASigner,
  AwsSdkSigV4Signer: () => AwsSdkSigV4Signer,
  NODE_AUTH_SCHEME_PREFERENCE_OPTIONS: () => NODE_AUTH_SCHEME_PREFERENCE_OPTIONS,
  NODE_SIGV4A_CONFIG_OPTIONS: () => NODE_SIGV4A_CONFIG_OPTIONS,
  resolveAWSSDKSigV4Config: () => resolveAWSSDKSigV4Config,
  resolveAwsSdkSigV4AConfig: () => resolveAwsSdkSigV4AConfig,
  resolveAwsSdkSigV4Config: () => resolveAwsSdkSigV4Config,
  validateSigningProperties: () => validateSigningProperties
});
module.exports = __toCommonJS(index_exports);

// src/submodules/httpAuthSchemes/aws_sdk/AwsSdkSigV4Signer.ts
var import_protocol_http2 = require("@smithy/protocol-http");

// src/submodules/httpAuthSchemes/utils/getDateHeader.ts
var import_protocol_http = require("@smithy/protocol-http");
var getDateHeader = /* @__PURE__ */ __name((response) => import_protocol_http.HttpResponse.isInstance(response) ? response.headers?.date ?? response.headers?.Date : void 0, "getDateHeader");

// src/submodules/httpAuthSchemes/utils/getSkewCorrectedDate.ts
var getSkewCorrectedDate = /* @__PURE__ */ __name((systemClockOffset) => new Date(Date.now() + systemClockOffset), "getSkewCorrectedDate");

// src/submodules/httpAuthSchemes/utils/isClockSkewed.ts
var isClockSkewed = /* @__PURE__ */ __name((clockTime, systemClockOffset) => Math.abs(getSkewCorrectedDate(systemClockOffset).getTime() - clockTime) >= 3e5, "isClockSkewed");

// src/submodules/httpAuthSchemes/utils/getUpdatedSystemClockOffset.ts
var getUpdatedSystemClockOffset = /* @__PURE__ */ __name((clockTime, currentSystemClockOffset) => {
  const clockTimeInMs = Date.parse(clockTime);
  if (isClockSkewed(clockTimeInMs, currentSystemClockOffset)) {
    return clockTimeInMs - Date.now();
  }
  return currentSystemClockOffset;
}, "getUpdatedSystemClockOffset");

// src/submodules/httpAuthSchemes/aws_sdk/AwsSdkSigV4Signer.ts
var throwSigningPropertyError = /* @__PURE__ */ __name((name, property) => {
  if (!property) {
    throw new Error(`Property \`${name}\` is not resolved for AWS SDK SigV4Auth`);
  }
  return property;
}, "throwSigningPropertyError");
var validateSigningProperties = /* @__PURE__ */ __name(async (signingProperties) => {
  const context = throwSigningPropertyError(
    "context",
    signingProperties.context
  );
  const config = throwSigningPropertyError("config", signingProperties.config);
  const authScheme = context.endpointV2?.properties?.authSchemes?.[0];
  const signerFunction = throwSigningPropertyError(
    "signer",
    config.signer
  );
  const signer = await signerFunction(authScheme);
  const signingRegion = signingProperties?.signingRegion;
  const signingRegionSet = signingProperties?.signingRegionSet;
  const signingName = signingProperties?.signingName;
  return {
    config,
    signer,
    signingRegion,
    signingRegionSet,
    signingName
  };
}, "validateSigningProperties");
var AwsSdkSigV4Signer = class {
  static {
    __name(this, "AwsSdkSigV4Signer");
  }
  async sign(httpRequest, identity, signingProperties) {
    if (!import_protocol_http2.HttpRequest.isInstance(httpRequest)) {
      throw new Error("The request is not an instance of `HttpRequest` and cannot be signed");
    }
    const validatedProps = await validateSigningProperties(signingProperties);
    const { config, signer } = validatedProps;
    let { signingRegion, signingName } = validatedProps;
    const handlerExecutionContext = signingProperties.context;
    if (handlerExecutionContext?.authSchemes?.length ?? 0 > 1) {
      const [first, second] = handlerExecutionContext.authSchemes;
      if (first?.name === "sigv4a" && second?.name === "sigv4") {
        signingRegion = second?.signingRegion ?? signingRegion;
        signingName = second?.signingName ?? signingName;
      }
    }
    const signedRequest = await signer.sign(httpRequest, {
      signingDate: getSkewCorrectedDate(config.systemClockOffset),
      signingRegion,
      signingService: signingName
    });
    return signedRequest;
  }
  errorHandler(signingProperties) {
    return (error) => {
      const serverTime = error.ServerTime ?? getDateHeader(error.$response);
      if (serverTime) {
        const config = throwSigningPropertyError("config", signingProperties.config);
        const initialSystemClockOffset = config.systemClockOffset;
        config.systemClockOffset = getUpdatedSystemClockOffset(serverTime, config.systemClockOffset);
        const clockSkewCorrected = config.systemClockOffset !== initialSystemClockOffset;
        if (clockSkewCorrected && error.$metadata) {
          error.$metadata.clockSkewCorrected = true;
        }
      }
      throw error;
    };
  }
  successHandler(httpResponse, signingProperties) {
    const dateHeader = getDateHeader(httpResponse);
    if (dateHeader) {
      const config = throwSigningPropertyError("config", signingProperties.config);
      config.systemClockOffset = getUpdatedSystemClockOffset(dateHeader, config.systemClockOffset);
    }
  }
};
var AWSSDKSigV4Signer = AwsSdkSigV4Signer;

// src/submodules/httpAuthSchemes/aws_sdk/AwsSdkSigV4ASigner.ts
var import_protocol_http3 = require("@smithy/protocol-http");
var AwsSdkSigV4ASigner = class extends AwsSdkSigV4Signer {
  static {
    __name(this, "AwsSdkSigV4ASigner");
  }
  async sign(httpRequest, identity, signingProperties) {
    if (!import_protocol_http3.HttpRequest.isInstance(httpRequest)) {
      throw new Error("The request is not an instance of `HttpRequest` and cannot be signed");
    }
    const { config, signer, signingRegion, signingRegionSet, signingName } = await validateSigningProperties(
      signingProperties
    );
    const configResolvedSigningRegionSet = await config.sigv4aSigningRegionSet?.();
    const multiRegionOverride = (configResolvedSigningRegionSet ?? signingRegionSet ?? [signingRegion]).join(",");
    const signedRequest = await signer.sign(httpRequest, {
      signingDate: getSkewCorrectedDate(config.systemClockOffset),
      signingRegion: multiRegionOverride,
      signingService: signingName
    });
    return signedRequest;
  }
};

// src/submodules/httpAuthSchemes/utils/getArrayForCommaSeparatedString.ts
var getArrayForCommaSeparatedString = /* @__PURE__ */ __name((str) => typeof str === "string" && str.length > 0 ? str.split(",").map((item) => item.trim()) : [], "getArrayForCommaSeparatedString");

// src/submodules/httpAuthSchemes/utils/getBearerTokenEnvKey.ts
var getBearerTokenEnvKey = /* @__PURE__ */ __name((signingName) => `AWS_BEARER_TOKEN_${signingName.replace(/[\s-]/g, "_").toUpperCase()}`, "getBearerTokenEnvKey");

// src/submodules/httpAuthSchemes/aws_sdk/NODE_AUTH_SCHEME_PREFERENCE_OPTIONS.ts
var NODE_AUTH_SCHEME_PREFERENCE_ENV_KEY = "AWS_AUTH_SCHEME_PREFERENCE";
var NODE_AUTH_SCHEME_PREFERENCE_CONFIG_KEY = "auth_scheme_preference";
var NODE_AUTH_SCHEME_PREFERENCE_OPTIONS = {
  /**
   * Retrieves auth scheme preference from environment variables
   * @param env - Node process environment object
   * @returns Array of auth scheme strings if preference is set, undefined otherwise
   */
  environmentVariableSelector: /* @__PURE__ */ __name((env, options) => {
    if (options?.signingName) {
      const bearerTokenKey = getBearerTokenEnvKey(options.signingName);
      if (bearerTokenKey in env) return ["httpBearerAuth"];
    }
    if (!(NODE_AUTH_SCHEME_PREFERENCE_ENV_KEY in env)) return void 0;
    return getArrayForCommaSeparatedString(env[NODE_AUTH_SCHEME_PREFERENCE_ENV_KEY]);
  }, "environmentVariableSelector"),
  /**
   * Retrieves auth scheme preference from config file
   * @param profile - Config profile object
   * @returns Array of auth scheme strings if preference is set, undefined otherwise
   */
  configFileSelector: /* @__PURE__ */ __name((profile) => {
    if (!(NODE_AUTH_SCHEME_PREFERENCE_CONFIG_KEY in profile)) return void 0;
    return getArrayForCommaSeparatedString(profile[NODE_AUTH_SCHEME_PREFERENCE_CONFIG_KEY]);
  }, "configFileSelector"),
  /**
   * Default auth scheme preference if not specified in environment or config
   */
  default: []
};

// src/submodules/httpAuthSchemes/aws_sdk/resolveAwsSdkSigV4AConfig.ts
var import_core = require("@smithy/core");
var import_property_provider = require("@smithy/property-provider");
var resolveAwsSdkSigV4AConfig = /* @__PURE__ */ __name((config) => {
  config.sigv4aSigningRegionSet = (0, import_core.normalizeProvider)(config.sigv4aSigningRegionSet);
  return config;
}, "resolveAwsSdkSigV4AConfig");
var NODE_SIGV4A_CONFIG_OPTIONS = {
  environmentVariableSelector(env) {
    if (env.AWS_SIGV4A_SIGNING_REGION_SET) {
      return env.AWS_SIGV4A_SIGNING_REGION_SET.split(",").map((_) => _.trim());
    }
    throw new import_property_provider.ProviderError("AWS_SIGV4A_SIGNING_REGION_SET not set in env.", {
      tryNextLink: true
    });
  },
  configFileSelector(profile) {
    if (profile.sigv4a_signing_region_set) {
      return (profile.sigv4a_signing_region_set ?? "").split(",").map((_) => _.trim());
    }
    throw new import_property_provider.ProviderError("sigv4a_signing_region_set not set in profile.", {
      tryNextLink: true
    });
  },
  default: void 0
};

// src/submodules/httpAuthSchemes/aws_sdk/resolveAwsSdkSigV4Config.ts
var import_client = require("@aws-sdk/core/client");
var import_core2 = require("@smithy/core");
var import_signature_v4 = require("@smithy/signature-v4");
var resolveAwsSdkSigV4Config = /* @__PURE__ */ __name((config) => {
  let inputCredentials = config.credentials;
  let isUserSupplied = !!config.credentials;
  let resolvedCredentials = void 0;
  Object.defineProperty(config, "credentials", {
    set(credentials) {
      if (credentials && credentials !== inputCredentials && credentials !== resolvedCredentials) {
        isUserSupplied = true;
      }
      inputCredentials = credentials;
      const memoizedProvider = normalizeCredentialProvider(config, {
        credentials: inputCredentials,
        credentialDefaultProvider: config.credentialDefaultProvider
      });
      const boundProvider = bindCallerConfig(config, memoizedProvider);
      if (isUserSupplied && !boundProvider.attributed) {
        resolvedCredentials = /* @__PURE__ */ __name(async (options) => boundProvider(options).then(
          (creds) => (0, import_client.setCredentialFeature)(creds, "CREDENTIALS_CODE", "e")
        ), "resolvedCredentials");
        resolvedCredentials.memoized = boundProvider.memoized;
        resolvedCredentials.configBound = boundProvider.configBound;
        resolvedCredentials.attributed = true;
      } else {
        resolvedCredentials = boundProvider;
      }
    },
    get() {
      return resolvedCredentials;
    },
    enumerable: true,
    configurable: true
  });
  config.credentials = inputCredentials;
  const {
    // Default for signingEscapePath
    signingEscapePath = true,
    // Default for systemClockOffset
    systemClockOffset = config.systemClockOffset || 0,
    // No default for sha256 since it is platform dependent
    sha256
  } = config;
  let signer;
  if (config.signer) {
    signer = (0, import_core2.normalizeProvider)(config.signer);
  } else if (config.regionInfoProvider) {
    signer = /* @__PURE__ */ __name(() => (0, import_core2.normalizeProvider)(config.region)().then(
      async (region) => [
        await config.regionInfoProvider(region, {
          useFipsEndpoint: await config.useFipsEndpoint(),
          useDualstackEndpoint: await config.useDualstackEndpoint()
        }) || {},
        region
      ]
    ).then(([regionInfo, region]) => {
      const { signingRegion, signingService } = regionInfo;
      config.signingRegion = config.signingRegion || signingRegion || region;
      config.signingName = config.signingName || signingService || config.serviceId;
      const params = {
        ...config,
        credentials: config.credentials,
        region: config.signingRegion,
        service: config.signingName,
        sha256,
        uriEscapePath: signingEscapePath
      };
      const SignerCtor = config.signerConstructor || import_signature_v4.SignatureV4;
      return new SignerCtor(params);
    }), "signer");
  } else {
    signer = /* @__PURE__ */ __name(async (authScheme) => {
      authScheme = Object.assign(
        {},
        {
          name: "sigv4",
          signingName: config.signingName || config.defaultSigningName,
          signingRegion: await (0, import_core2.normalizeProvider)(config.region)(),
          properties: {}
        },
        authScheme
      );
      const signingRegion = authScheme.signingRegion;
      const signingService = authScheme.signingName;
      config.signingRegion = config.signingRegion || signingRegion;
      config.signingName = config.signingName || signingService || config.serviceId;
      const params = {
        ...config,
        credentials: config.credentials,
        region: config.signingRegion,
        service: config.signingName,
        sha256,
        uriEscapePath: signingEscapePath
      };
      const SignerCtor = config.signerConstructor || import_signature_v4.SignatureV4;
      return new SignerCtor(params);
    }, "signer");
  }
  const resolvedConfig = Object.assign(config, {
    systemClockOffset,
    signingEscapePath,
    signer
  });
  return resolvedConfig;
}, "resolveAwsSdkSigV4Config");
var resolveAWSSDKSigV4Config = resolveAwsSdkSigV4Config;
function normalizeCredentialProvider(config, {
  credentials,
  credentialDefaultProvider
}) {
  let credentialsProvider;
  if (credentials) {
    if (!credentials?.memoized) {
      credentialsProvider = (0, import_core2.memoizeIdentityProvider)(credentials, import_core2.isIdentityExpired, import_core2.doesIdentityRequireRefresh);
    } else {
      credentialsProvider = credentials;
    }
  } else {
    if (credentialDefaultProvider) {
      credentialsProvider = (0, import_core2.normalizeProvider)(
        credentialDefaultProvider(
          Object.assign({}, config, {
            parentClientConfig: config
          })
        )
      );
    } else {
      credentialsProvider = /* @__PURE__ */ __name(async () => {
        throw new Error(
          "@aws-sdk/core::resolveAwsSdkSigV4Config - `credentials` not provided and no credentialDefaultProvider was configured."
        );
      }, "credentialsProvider");
    }
  }
  credentialsProvider.memoized = true;
  return credentialsProvider;
}
__name(normalizeCredentialProvider, "normalizeCredentialProvider");
function bindCallerConfig(config, credentialsProvider) {
  if (credentialsProvider.configBound) {
    return credentialsProvider;
  }
  const fn = /* @__PURE__ */ __name(async (options) => credentialsProvider({ ...options, callerClientConfig: config }), "fn");
  fn.memoized = credentialsProvider.memoized;
  fn.configBound = true;
  return fn;
}
__name(bindCallerConfig, "bindCallerConfig");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AWSSDKSigV4Signer,
  AwsSdkSigV4ASigner,
  AwsSdkSigV4Signer,
  NODE_AUTH_SCHEME_PREFERENCE_OPTIONS,
  NODE_SIGV4A_CONFIG_OPTIONS,
  resolveAWSSDKSigV4Config,
  resolveAwsSdkSigV4AConfig,
  resolveAwsSdkSigV4Config,
  validateSigningProperties
});
