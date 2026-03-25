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

// src/index.ts
var src_exports = {};
__export(src_exports, {
  DefaultIdentityProviderConfig: () => DefaultIdentityProviderConfig,
  EXPIRATION_MS: () => EXPIRATION_MS,
  HttpApiKeyAuthSigner: () => HttpApiKeyAuthSigner,
  HttpBearerAuthSigner: () => HttpBearerAuthSigner,
  NoAuthSigner: () => NoAuthSigner,
  createIsIdentityExpiredFunction: () => createIsIdentityExpiredFunction,
  createPaginator: () => createPaginator,
  doesIdentityRequireRefresh: () => doesIdentityRequireRefresh,
  getHttpAuthSchemeEndpointRuleSetPlugin: () => getHttpAuthSchemeEndpointRuleSetPlugin,
  getHttpAuthSchemePlugin: () => getHttpAuthSchemePlugin,
  getHttpSigningPlugin: () => getHttpSigningPlugin,
  getSmithyContext: () => getSmithyContext,
  httpAuthSchemeEndpointRuleSetMiddlewareOptions: () => httpAuthSchemeEndpointRuleSetMiddlewareOptions,
  httpAuthSchemeMiddleware: () => httpAuthSchemeMiddleware,
  httpAuthSchemeMiddlewareOptions: () => httpAuthSchemeMiddlewareOptions,
  httpSigningMiddleware: () => httpSigningMiddleware,
  httpSigningMiddlewareOptions: () => httpSigningMiddlewareOptions,
  isIdentityExpired: () => isIdentityExpired,
  memoizeIdentityProvider: () => memoizeIdentityProvider,
  normalizeProvider: () => normalizeProvider,
  requestBuilder: () => import_protocols.requestBuilder,
  setFeature: () => setFeature
});
module.exports = __toCommonJS(src_exports);

// src/getSmithyContext.ts
var import_types = require("@smithy/types");
var getSmithyContext = /* @__PURE__ */ __name((context) => context[import_types.SMITHY_CONTEXT_KEY] || (context[import_types.SMITHY_CONTEXT_KEY] = {}), "getSmithyContext");

// src/middleware-http-auth-scheme/httpAuthSchemeMiddleware.ts
var import_util_middleware = require("@smithy/util-middleware");

// src/middleware-http-auth-scheme/resolveAuthOptions.ts
var resolveAuthOptions = /* @__PURE__ */ __name((candidateAuthOptions, authSchemePreference) => {
  if (!authSchemePreference || authSchemePreference.length === 0) {
    return candidateAuthOptions;
  }
  const preferredAuthOptions = [];
  for (const preferredSchemeName of authSchemePreference) {
    for (const candidateAuthOption of candidateAuthOptions) {
      const candidateAuthSchemeName = candidateAuthOption.schemeId.split("#")[1];
      if (candidateAuthSchemeName === preferredSchemeName) {
        preferredAuthOptions.push(candidateAuthOption);
      }
    }
  }
  for (const candidateAuthOption of candidateAuthOptions) {
    if (!preferredAuthOptions.find(({ schemeId }) => schemeId === candidateAuthOption.schemeId)) {
      preferredAuthOptions.push(candidateAuthOption);
    }
  }
  return preferredAuthOptions;
}, "resolveAuthOptions");

// src/middleware-http-auth-scheme/httpAuthSchemeMiddleware.ts
function convertHttpAuthSchemesToMap(httpAuthSchemes) {
  const map = /* @__PURE__ */ new Map();
  for (const scheme of httpAuthSchemes) {
    map.set(scheme.schemeId, scheme);
  }
  return map;
}
__name(convertHttpAuthSchemesToMap, "convertHttpAuthSchemesToMap");
var httpAuthSchemeMiddleware = /* @__PURE__ */ __name((config, mwOptions) => (next, context) => async (args) => {
  const options = config.httpAuthSchemeProvider(
    await mwOptions.httpAuthSchemeParametersProvider(config, context, args.input)
  );
  const authSchemePreference = config.authSchemePreference ? await config.authSchemePreference() : [];
  const resolvedOptions = resolveAuthOptions(options, authSchemePreference);
  const authSchemes = convertHttpAuthSchemesToMap(config.httpAuthSchemes);
  const smithyContext = (0, import_util_middleware.getSmithyContext)(context);
  const failureReasons = [];
  for (const option of resolvedOptions) {
    const scheme = authSchemes.get(option.schemeId);
    if (!scheme) {
      failureReasons.push(`HttpAuthScheme \`${option.schemeId}\` was not enabled for this service.`);
      continue;
    }
    const identityProvider = scheme.identityProvider(await mwOptions.identityProviderConfigProvider(config));
    if (!identityProvider) {
      failureReasons.push(`HttpAuthScheme \`${option.schemeId}\` did not have an IdentityProvider configured.`);
      continue;
    }
    const { identityProperties = {}, signingProperties = {} } = option.propertiesExtractor?.(config, context) || {};
    option.identityProperties = Object.assign(option.identityProperties || {}, identityProperties);
    option.signingProperties = Object.assign(option.signingProperties || {}, signingProperties);
    smithyContext.selectedHttpAuthScheme = {
      httpAuthOption: option,
      identity: await identityProvider(option.identityProperties),
      signer: scheme.signer
    };
    break;
  }
  if (!smithyContext.selectedHttpAuthScheme) {
    throw new Error(failureReasons.join("\n"));
  }
  return next(args);
}, "httpAuthSchemeMiddleware");

// src/middleware-http-auth-scheme/getHttpAuthSchemeEndpointRuleSetPlugin.ts
var httpAuthSchemeEndpointRuleSetMiddlewareOptions = {
  step: "serialize",
  tags: ["HTTP_AUTH_SCHEME"],
  name: "httpAuthSchemeMiddleware",
  override: true,
  relation: "before",
  toMiddleware: "endpointV2Middleware"
};
var getHttpAuthSchemeEndpointRuleSetPlugin = /* @__PURE__ */ __name((config, {
  httpAuthSchemeParametersProvider,
  identityProviderConfigProvider
}) => ({
  applyToStack: (clientStack) => {
    clientStack.addRelativeTo(
      httpAuthSchemeMiddleware(config, {
        httpAuthSchemeParametersProvider,
        identityProviderConfigProvider
      }),
      httpAuthSchemeEndpointRuleSetMiddlewareOptions
    );
  }
}), "getHttpAuthSchemeEndpointRuleSetPlugin");

// src/middleware-http-auth-scheme/getHttpAuthSchemePlugin.ts
var import_middleware_serde = require("@smithy/middleware-serde");
var httpAuthSchemeMiddlewareOptions = {
  step: "serialize",
  tags: ["HTTP_AUTH_SCHEME"],
  name: "httpAuthSchemeMiddleware",
  override: true,
  relation: "before",
  toMiddleware: import_middleware_serde.serializerMiddlewareOption.name
};
var getHttpAuthSchemePlugin = /* @__PURE__ */ __name((config, {
  httpAuthSchemeParametersProvider,
  identityProviderConfigProvider
}) => ({
  applyToStack: (clientStack) => {
    clientStack.addRelativeTo(
      httpAuthSchemeMiddleware(config, {
        httpAuthSchemeParametersProvider,
        identityProviderConfigProvider
      }),
      httpAuthSchemeMiddlewareOptions
    );
  }
}), "getHttpAuthSchemePlugin");

// src/middleware-http-signing/httpSigningMiddleware.ts
var import_protocol_http = require("@smithy/protocol-http");

var defaultErrorHandler = /* @__PURE__ */ __name((signingProperties) => (error) => {
  throw error;
}, "defaultErrorHandler");
var defaultSuccessHandler = /* @__PURE__ */ __name((httpResponse, signingProperties) => {
}, "defaultSuccessHandler");
var httpSigningMiddleware = /* @__PURE__ */ __name((config) => (next, context) => async (args) => {
  if (!import_protocol_http.HttpRequest.isInstance(args.request)) {
    return next(args);
  }
  const smithyContext = (0, import_util_middleware.getSmithyContext)(context);
  const scheme = smithyContext.selectedHttpAuthScheme;
  if (!scheme) {
    throw new Error(`No HttpAuthScheme was selected: unable to sign request`);
  }
  const {
    httpAuthOption: { signingProperties = {} },
    identity,
    signer
  } = scheme;
  const output = await next({
    ...args,
    request: await signer.sign(args.request, identity, signingProperties)
  }).catch((signer.errorHandler || defaultErrorHandler)(signingProperties));
  (signer.successHandler || defaultSuccessHandler)(output.response, signingProperties);
  return output;
}, "httpSigningMiddleware");

// src/middleware-http-signing/getHttpSigningMiddleware.ts
var httpSigningMiddlewareOptions = {
  step: "finalizeRequest",
  tags: ["HTTP_SIGNING"],
  name: "httpSigningMiddleware",
  aliases: ["apiKeyMiddleware", "tokenMiddleware", "awsAuthMiddleware"],
  override: true,
  relation: "after",
  toMiddleware: "retryMiddleware"
};
var getHttpSigningPlugin = /* @__PURE__ */ __name((config) => ({
  applyToStack: (clientStack) => {
    clientStack.addRelativeTo(httpSigningMiddleware(config), httpSigningMiddlewareOptions);
  }
}), "getHttpSigningPlugin");

// src/normalizeProvider.ts
var normalizeProvider = /* @__PURE__ */ __name((input) => {
  if (typeof input === "function")
    return input;
  const promisified = Promise.resolve(input);
  return () => promisified;
}, "normalizeProvider");

// src/pagination/createPaginator.ts
var makePagedClientRequest = /* @__PURE__ */ __name(async (CommandCtor, client, input, withCommand = (_) => _, ...args) => {
  let command = new CommandCtor(input);
  command = withCommand(command) ?? command;
  return await client.send(command, ...args);
}, "makePagedClientRequest");
function createPaginator(ClientCtor, CommandCtor, inputTokenName, outputTokenName, pageSizeTokenName) {
  return /* @__PURE__ */ __name(async function* paginateOperation(config, input, ...additionalArguments) {
    const _input = input;
    let token = config.startingToken ?? _input[inputTokenName];
    let hasNext = true;
    let page;
    while (hasNext) {
      _input[inputTokenName] = token;
      if (pageSizeTokenName) {
        _input[pageSizeTokenName] = _input[pageSizeTokenName] ?? config.pageSize;
      }
      if (config.client instanceof ClientCtor) {
        page = await makePagedClientRequest(
          CommandCtor,
          config.client,
          input,
          config.withCommand,
          ...additionalArguments
        );
      } else {
        throw new Error(`Invalid client, expected instance of ${ClientCtor.name}`);
      }
      yield page;
      const prevToken = token;
      token = get(page, outputTokenName);
      hasNext = !!(token && (!config.stopOnSameToken || token !== prevToken));
    }
    return void 0;
  }, "paginateOperation");
}
__name(createPaginator, "createPaginator");
var get = /* @__PURE__ */ __name((fromObject, path) => {
  let cursor = fromObject;
  const pathComponents = path.split(".");
  for (const step of pathComponents) {
    if (!cursor || typeof cursor !== "object") {
      return void 0;
    }
    cursor = cursor[step];
  }
  return cursor;
}, "get");

// src/protocols/requestBuilder.ts
var import_protocols = require("@smithy/core/protocols");

// src/setFeature.ts
function setFeature(context, feature, value) {
  if (!context.__smithy_context) {
    context.__smithy_context = {
      features: {}
    };
  } else if (!context.__smithy_context.features) {
    context.__smithy_context.features = {};
  }
  context.__smithy_context.features[feature] = value;
}
__name(setFeature, "setFeature");

// src/util-identity-and-auth/DefaultIdentityProviderConfig.ts
var DefaultIdentityProviderConfig = class {
  /**
   * Creates an IdentityProviderConfig with a record of scheme IDs to identity providers.
   *
   * @param config scheme IDs and identity providers to configure
   */
  constructor(config) {
    this.authSchemes = /* @__PURE__ */ new Map();
    for (const [key, value] of Object.entries(config)) {
      if (value !== void 0) {
        this.authSchemes.set(key, value);
      }
    }
  }
  static {
    __name(this, "DefaultIdentityProviderConfig");
  }
  getIdentityProvider(schemeId) {
    return this.authSchemes.get(schemeId);
  }
};

// src/util-identity-and-auth/httpAuthSchemes/httpApiKeyAuth.ts


var HttpApiKeyAuthSigner = class {
  static {
    __name(this, "HttpApiKeyAuthSigner");
  }
  async sign(httpRequest, identity, signingProperties) {
    if (!signingProperties) {
      throw new Error(
        "request could not be signed with `apiKey` since the `name` and `in` signer properties are missing"
      );
    }
    if (!signingProperties.name) {
      throw new Error("request could not be signed with `apiKey` since the `name` signer property is missing");
    }
    if (!signingProperties.in) {
      throw new Error("request could not be signed with `apiKey` since the `in` signer property is missing");
    }
    if (!identity.apiKey) {
      throw new Error("request could not be signed with `apiKey` since the `apiKey` is not defined");
    }
    const clonedRequest = import_protocol_http.HttpRequest.clone(httpRequest);
    if (signingProperties.in === import_types.HttpApiKeyAuthLocation.QUERY) {
      clonedRequest.query[signingProperties.name] = identity.apiKey;
    } else if (signingProperties.in === import_types.HttpApiKeyAuthLocation.HEADER) {
      clonedRequest.headers[signingProperties.name] = signingProperties.scheme ? `${signingProperties.scheme} ${identity.apiKey}` : identity.apiKey;
    } else {
      throw new Error(
        "request can only be signed with `apiKey` locations `query` or `header`, but found: `" + signingProperties.in + "`"
      );
    }
    return clonedRequest;
  }
};

// src/util-identity-and-auth/httpAuthSchemes/httpBearerAuth.ts

var HttpBearerAuthSigner = class {
  static {
    __name(this, "HttpBearerAuthSigner");
  }
  async sign(httpRequest, identity, signingProperties) {
    const clonedRequest = import_protocol_http.HttpRequest.clone(httpRequest);
    if (!identity.token) {
      throw new Error("request could not be signed with `token` since the `token` is not defined");
    }
    clonedRequest.headers["Authorization"] = `Bearer ${identity.token}`;
    return clonedRequest;
  }
};

// src/util-identity-and-auth/httpAuthSchemes/noAuth.ts
var NoAuthSigner = class {
  static {
    __name(this, "NoAuthSigner");
  }
  async sign(httpRequest, identity, signingProperties) {
    return httpRequest;
  }
};

// src/util-identity-and-auth/memoizeIdentityProvider.ts
var createIsIdentityExpiredFunction = /* @__PURE__ */ __name((expirationMs) => (identity) => doesIdentityRequireRefresh(identity) && identity.expiration.getTime() - Date.now() < expirationMs, "createIsIdentityExpiredFunction");
var EXPIRATION_MS = 3e5;
var isIdentityExpired = createIsIdentityExpiredFunction(EXPIRATION_MS);
var doesIdentityRequireRefresh = /* @__PURE__ */ __name((identity) => identity.expiration !== void 0, "doesIdentityRequireRefresh");
var memoizeIdentityProvider = /* @__PURE__ */ __name((provider, isExpired, requiresRefresh) => {
  if (provider === void 0) {
    return void 0;
  }
  const normalizedProvider = typeof provider !== "function" ? async () => Promise.resolve(provider) : provider;
  let resolved;
  let pending;
  let hasResult;
  let isConstant = false;
  const coalesceProvider = /* @__PURE__ */ __name(async (options) => {
    if (!pending) {
      pending = normalizedProvider(options);
    }
    try {
      resolved = await pending;
      hasResult = true;
      isConstant = false;
    } finally {
      pending = void 0;
    }
    return resolved;
  }, "coalesceProvider");
  if (isExpired === void 0) {
    return async (options) => {
      if (!hasResult || options?.forceRefresh) {
        resolved = await coalesceProvider(options);
      }
      return resolved;
    };
  }
  return async (options) => {
    if (!hasResult || options?.forceRefresh) {
      resolved = await coalesceProvider(options);
    }
    if (isConstant) {
      return resolved;
    }
    if (!requiresRefresh(resolved)) {
      isConstant = true;
      return resolved;
    }
    if (isExpired(resolved)) {
      await coalesceProvider(options);
      return resolved;
    }
    return resolved;
  };
}, "memoizeIdentityProvider");
// Annotate the CommonJS export names for ESM import in node:

0 && (module.exports = {
  createPaginator,
  getSmithyContext,
  httpAuthSchemeMiddleware,
  httpAuthSchemeEndpointRuleSetMiddlewareOptions,
  getHttpAuthSchemeEndpointRuleSetPlugin,
  httpAuthSchemeMiddlewareOptions,
  getHttpAuthSchemePlugin,
  httpSigningMiddleware,
  httpSigningMiddlewareOptions,
  getHttpSigningPlugin,
  normalizeProvider,
  requestBuilder,
  setFeature,
  DefaultIdentityProviderConfig,
  HttpApiKeyAuthSigner,
  HttpBearerAuthSigner,
  NoAuthSigner,
  createIsIdentityExpiredFunction,
  EXPIRATION_MS,
  isIdentityExpired,
  doesIdentityRequireRefresh,
  memoizeIdentityProvider
});

