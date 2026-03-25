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

// src/submodules/sso-oidc/index.ts
var index_exports = {};
__export(index_exports, {
  $Command: () => import_smithy_client6.Command,
  AccessDeniedException: () => AccessDeniedException,
  AuthorizationPendingException: () => AuthorizationPendingException,
  CreateTokenCommand: () => CreateTokenCommand,
  CreateTokenRequestFilterSensitiveLog: () => CreateTokenRequestFilterSensitiveLog,
  CreateTokenResponseFilterSensitiveLog: () => CreateTokenResponseFilterSensitiveLog,
  ExpiredTokenException: () => ExpiredTokenException,
  InternalServerException: () => InternalServerException,
  InvalidClientException: () => InvalidClientException,
  InvalidGrantException: () => InvalidGrantException,
  InvalidRequestException: () => InvalidRequestException,
  InvalidScopeException: () => InvalidScopeException,
  SSOOIDC: () => SSOOIDC,
  SSOOIDCClient: () => SSOOIDCClient,
  SSOOIDCServiceException: () => SSOOIDCServiceException,
  SlowDownException: () => SlowDownException,
  UnauthorizedClientException: () => UnauthorizedClientException,
  UnsupportedGrantTypeException: () => UnsupportedGrantTypeException,
  __Client: () => import_smithy_client2.Client
});
module.exports = __toCommonJS(index_exports);

// src/submodules/sso-oidc/SSOOIDCClient.ts
var import_middleware_host_header = require("@aws-sdk/middleware-host-header");
var import_middleware_logger = require("@aws-sdk/middleware-logger");
var import_middleware_recursion_detection = require("@aws-sdk/middleware-recursion-detection");
var import_middleware_user_agent = require("@aws-sdk/middleware-user-agent");
var import_config_resolver = require("@smithy/config-resolver");
var import_core = require("@smithy/core");
var import_middleware_content_length = require("@smithy/middleware-content-length");
var import_middleware_endpoint = require("@smithy/middleware-endpoint");
var import_middleware_retry = require("@smithy/middleware-retry");
var import_smithy_client2 = require("@smithy/smithy-client");
var import_httpAuthSchemeProvider = require("./auth/httpAuthSchemeProvider");

// src/submodules/sso-oidc/endpoint/EndpointParameters.ts
var resolveClientEndpointParameters = /* @__PURE__ */ __name((options) => {
  return Object.assign(options, {
    useDualstackEndpoint: options.useDualstackEndpoint ?? false,
    useFipsEndpoint: options.useFipsEndpoint ?? false,
    defaultSigningName: "sso-oauth"
  });
}, "resolveClientEndpointParameters");
var commonParams = {
  UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
  Endpoint: { type: "builtInParams", name: "endpoint" },
  Region: { type: "builtInParams", name: "region" },
  UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
};

// src/submodules/sso-oidc/SSOOIDCClient.ts
var import_runtimeConfig = require("./runtimeConfig");

// src/submodules/sso-oidc/runtimeExtensions.ts
var import_region_config_resolver = require("@aws-sdk/region-config-resolver");
var import_protocol_http = require("@smithy/protocol-http");
var import_smithy_client = require("@smithy/smithy-client");

// src/submodules/sso-oidc/auth/httpAuthExtensionConfiguration.ts
var getHttpAuthExtensionConfiguration = /* @__PURE__ */ __name((runtimeConfig) => {
  const _httpAuthSchemes = runtimeConfig.httpAuthSchemes;
  let _httpAuthSchemeProvider = runtimeConfig.httpAuthSchemeProvider;
  let _credentials = runtimeConfig.credentials;
  return {
    setHttpAuthScheme(httpAuthScheme) {
      const index = _httpAuthSchemes.findIndex((scheme) => scheme.schemeId === httpAuthScheme.schemeId);
      if (index === -1) {
        _httpAuthSchemes.push(httpAuthScheme);
      } else {
        _httpAuthSchemes.splice(index, 1, httpAuthScheme);
      }
    },
    httpAuthSchemes() {
      return _httpAuthSchemes;
    },
    setHttpAuthSchemeProvider(httpAuthSchemeProvider) {
      _httpAuthSchemeProvider = httpAuthSchemeProvider;
    },
    httpAuthSchemeProvider() {
      return _httpAuthSchemeProvider;
    },
    setCredentials(credentials) {
      _credentials = credentials;
    },
    credentials() {
      return _credentials;
    }
  };
}, "getHttpAuthExtensionConfiguration");
var resolveHttpAuthRuntimeConfig = /* @__PURE__ */ __name((config) => {
  return {
    httpAuthSchemes: config.httpAuthSchemes(),
    httpAuthSchemeProvider: config.httpAuthSchemeProvider(),
    credentials: config.credentials()
  };
}, "resolveHttpAuthRuntimeConfig");

// src/submodules/sso-oidc/runtimeExtensions.ts
var resolveRuntimeExtensions = /* @__PURE__ */ __name((runtimeConfig, extensions) => {
  const extensionConfiguration = Object.assign(
    (0, import_region_config_resolver.getAwsRegionExtensionConfiguration)(runtimeConfig),
    (0, import_smithy_client.getDefaultExtensionConfiguration)(runtimeConfig),
    (0, import_protocol_http.getHttpHandlerExtensionConfiguration)(runtimeConfig),
    getHttpAuthExtensionConfiguration(runtimeConfig)
  );
  extensions.forEach((extension) => extension.configure(extensionConfiguration));
  return Object.assign(
    runtimeConfig,
    (0, import_region_config_resolver.resolveAwsRegionExtensionConfiguration)(extensionConfiguration),
    (0, import_smithy_client.resolveDefaultRuntimeConfig)(extensionConfiguration),
    (0, import_protocol_http.resolveHttpHandlerRuntimeConfig)(extensionConfiguration),
    resolveHttpAuthRuntimeConfig(extensionConfiguration)
  );
}, "resolveRuntimeExtensions");

// src/submodules/sso-oidc/SSOOIDCClient.ts
var SSOOIDCClient = class extends import_smithy_client2.Client {
  static {
    __name(this, "SSOOIDCClient");
  }
  /**
   * The resolved configuration of SSOOIDCClient class. This is resolved and normalized from the {@link SSOOIDCClientConfig | constructor configuration interface}.
   */
  config;
  constructor(...[configuration]) {
    const _config_0 = (0, import_runtimeConfig.getRuntimeConfig)(configuration || {});
    super(_config_0);
    this.initConfig = _config_0;
    const _config_1 = resolveClientEndpointParameters(_config_0);
    const _config_2 = (0, import_middleware_user_agent.resolveUserAgentConfig)(_config_1);
    const _config_3 = (0, import_middleware_retry.resolveRetryConfig)(_config_2);
    const _config_4 = (0, import_config_resolver.resolveRegionConfig)(_config_3);
    const _config_5 = (0, import_middleware_host_header.resolveHostHeaderConfig)(_config_4);
    const _config_6 = (0, import_middleware_endpoint.resolveEndpointConfig)(_config_5);
    const _config_7 = (0, import_httpAuthSchemeProvider.resolveHttpAuthSchemeConfig)(_config_6);
    const _config_8 = resolveRuntimeExtensions(_config_7, configuration?.extensions || []);
    this.config = _config_8;
    this.middlewareStack.use((0, import_middleware_user_agent.getUserAgentPlugin)(this.config));
    this.middlewareStack.use((0, import_middleware_retry.getRetryPlugin)(this.config));
    this.middlewareStack.use((0, import_middleware_content_length.getContentLengthPlugin)(this.config));
    this.middlewareStack.use((0, import_middleware_host_header.getHostHeaderPlugin)(this.config));
    this.middlewareStack.use((0, import_middleware_logger.getLoggerPlugin)(this.config));
    this.middlewareStack.use((0, import_middleware_recursion_detection.getRecursionDetectionPlugin)(this.config));
    this.middlewareStack.use(
      (0, import_core.getHttpAuthSchemeEndpointRuleSetPlugin)(this.config, {
        httpAuthSchemeParametersProvider: import_httpAuthSchemeProvider.defaultSSOOIDCHttpAuthSchemeParametersProvider,
        identityProviderConfigProvider: /* @__PURE__ */ __name(async (config) => new import_core.DefaultIdentityProviderConfig({
          "aws.auth#sigv4": config.credentials
        }), "identityProviderConfigProvider")
      })
    );
    this.middlewareStack.use((0, import_core.getHttpSigningPlugin)(this.config));
  }
  /**
   * Destroy underlying resources, like sockets. It's usually not necessary to do this.
   * However in Node.js, it's best to explicitly shut down the client's agent when it is no longer needed.
   * Otherwise, sockets might stay open for quite a long time before the server terminates them.
   */
  destroy() {
    super.destroy();
  }
};

// src/submodules/sso-oidc/SSOOIDC.ts
var import_smithy_client7 = require("@smithy/smithy-client");

// src/submodules/sso-oidc/commands/CreateTokenCommand.ts
var import_middleware_endpoint2 = require("@smithy/middleware-endpoint");
var import_middleware_serde = require("@smithy/middleware-serde");
var import_smithy_client6 = require("@smithy/smithy-client");

// src/submodules/sso-oidc/models/models_0.ts
var import_smithy_client4 = require("@smithy/smithy-client");

// src/submodules/sso-oidc/models/SSOOIDCServiceException.ts
var import_smithy_client3 = require("@smithy/smithy-client");
var SSOOIDCServiceException = class _SSOOIDCServiceException extends import_smithy_client3.ServiceException {
  static {
    __name(this, "SSOOIDCServiceException");
  }
  /**
   * @internal
   */
  constructor(options) {
    super(options);
    Object.setPrototypeOf(this, _SSOOIDCServiceException.prototype);
  }
};

// src/submodules/sso-oidc/models/models_0.ts
var AccessDeniedException = class _AccessDeniedException extends SSOOIDCServiceException {
  static {
    __name(this, "AccessDeniedException");
  }
  name = "AccessDeniedException";
  $fault = "client";
  /**
   * <p>Single error code. For this exception the value will be <code>access_denied</code>.</p>
   * @public
   */
  error;
  /**
   * <p>Human-readable text providing additional information, used to assist the client developer
   *       in understanding the error that occurred.</p>
   * @public
   */
  error_description;
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "AccessDeniedException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _AccessDeniedException.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};
var AuthorizationPendingException = class _AuthorizationPendingException extends SSOOIDCServiceException {
  static {
    __name(this, "AuthorizationPendingException");
  }
  name = "AuthorizationPendingException";
  $fault = "client";
  /**
   * <p>Single error code. For this exception the value will be
   *       <code>authorization_pending</code>.</p>
   * @public
   */
  error;
  /**
   * <p>Human-readable text providing additional information, used to assist the client developer
   *       in understanding the error that occurred.</p>
   * @public
   */
  error_description;
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "AuthorizationPendingException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _AuthorizationPendingException.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};
var CreateTokenRequestFilterSensitiveLog = /* @__PURE__ */ __name((obj) => ({
  ...obj,
  ...obj.clientSecret && { clientSecret: import_smithy_client4.SENSITIVE_STRING },
  ...obj.refreshToken && { refreshToken: import_smithy_client4.SENSITIVE_STRING },
  ...obj.codeVerifier && { codeVerifier: import_smithy_client4.SENSITIVE_STRING }
}), "CreateTokenRequestFilterSensitiveLog");
var CreateTokenResponseFilterSensitiveLog = /* @__PURE__ */ __name((obj) => ({
  ...obj,
  ...obj.accessToken && { accessToken: import_smithy_client4.SENSITIVE_STRING },
  ...obj.refreshToken && { refreshToken: import_smithy_client4.SENSITIVE_STRING },
  ...obj.idToken && { idToken: import_smithy_client4.SENSITIVE_STRING }
}), "CreateTokenResponseFilterSensitiveLog");
var ExpiredTokenException = class _ExpiredTokenException extends SSOOIDCServiceException {
  static {
    __name(this, "ExpiredTokenException");
  }
  name = "ExpiredTokenException";
  $fault = "client";
  /**
   * <p>Single error code. For this exception the value will be <code>expired_token</code>.</p>
   * @public
   */
  error;
  /**
   * <p>Human-readable text providing additional information, used to assist the client developer
   *       in understanding the error that occurred.</p>
   * @public
   */
  error_description;
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "ExpiredTokenException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _ExpiredTokenException.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};
var InternalServerException = class _InternalServerException extends SSOOIDCServiceException {
  static {
    __name(this, "InternalServerException");
  }
  name = "InternalServerException";
  $fault = "server";
  /**
   * <p>Single error code. For this exception the value will be <code>server_error</code>.</p>
   * @public
   */
  error;
  /**
   * <p>Human-readable text providing additional information, used to assist the client developer
   *       in understanding the error that occurred.</p>
   * @public
   */
  error_description;
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "InternalServerException",
      $fault: "server",
      ...opts
    });
    Object.setPrototypeOf(this, _InternalServerException.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};
var InvalidClientException = class _InvalidClientException extends SSOOIDCServiceException {
  static {
    __name(this, "InvalidClientException");
  }
  name = "InvalidClientException";
  $fault = "client";
  /**
   * <p>Single error code. For this exception the value will be
   *       <code>invalid_client</code>.</p>
   * @public
   */
  error;
  /**
   * <p>Human-readable text providing additional information, used to assist the client developer
   *       in understanding the error that occurred.</p>
   * @public
   */
  error_description;
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "InvalidClientException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _InvalidClientException.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};
var InvalidGrantException = class _InvalidGrantException extends SSOOIDCServiceException {
  static {
    __name(this, "InvalidGrantException");
  }
  name = "InvalidGrantException";
  $fault = "client";
  /**
   * <p>Single error code. For this exception the value will be <code>invalid_grant</code>.</p>
   * @public
   */
  error;
  /**
   * <p>Human-readable text providing additional information, used to assist the client developer
   *       in understanding the error that occurred.</p>
   * @public
   */
  error_description;
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "InvalidGrantException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _InvalidGrantException.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};
var InvalidRequestException = class _InvalidRequestException extends SSOOIDCServiceException {
  static {
    __name(this, "InvalidRequestException");
  }
  name = "InvalidRequestException";
  $fault = "client";
  /**
   * <p>Single error code. For this exception the value will be
   *       <code>invalid_request</code>.</p>
   * @public
   */
  error;
  /**
   * <p>Human-readable text providing additional information, used to assist the client developer
   *       in understanding the error that occurred.</p>
   * @public
   */
  error_description;
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "InvalidRequestException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _InvalidRequestException.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};
var InvalidScopeException = class _InvalidScopeException extends SSOOIDCServiceException {
  static {
    __name(this, "InvalidScopeException");
  }
  name = "InvalidScopeException";
  $fault = "client";
  /**
   * <p>Single error code. For this exception the value will be <code>invalid_scope</code>.</p>
   * @public
   */
  error;
  /**
   * <p>Human-readable text providing additional information, used to assist the client developer
   *       in understanding the error that occurred.</p>
   * @public
   */
  error_description;
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "InvalidScopeException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _InvalidScopeException.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};
var SlowDownException = class _SlowDownException extends SSOOIDCServiceException {
  static {
    __name(this, "SlowDownException");
  }
  name = "SlowDownException";
  $fault = "client";
  /**
   * <p>Single error code. For this exception the value will be <code>slow_down</code>.</p>
   * @public
   */
  error;
  /**
   * <p>Human-readable text providing additional information, used to assist the client developer
   *       in understanding the error that occurred.</p>
   * @public
   */
  error_description;
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "SlowDownException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _SlowDownException.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};
var UnauthorizedClientException = class _UnauthorizedClientException extends SSOOIDCServiceException {
  static {
    __name(this, "UnauthorizedClientException");
  }
  name = "UnauthorizedClientException";
  $fault = "client";
  /**
   * <p>Single error code. For this exception the value will be
   *       <code>unauthorized_client</code>.</p>
   * @public
   */
  error;
  /**
   * <p>Human-readable text providing additional information, used to assist the client developer
   *       in understanding the error that occurred.</p>
   * @public
   */
  error_description;
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "UnauthorizedClientException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _UnauthorizedClientException.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};
var UnsupportedGrantTypeException = class _UnsupportedGrantTypeException extends SSOOIDCServiceException {
  static {
    __name(this, "UnsupportedGrantTypeException");
  }
  name = "UnsupportedGrantTypeException";
  $fault = "client";
  /**
   * <p>Single error code. For this exception the value will be
   *         <code>unsupported_grant_type</code>.</p>
   * @public
   */
  error;
  /**
   * <p>Human-readable text providing additional information, used to assist the client developer
   *       in understanding the error that occurred.</p>
   * @public
   */
  error_description;
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "UnsupportedGrantTypeException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _UnsupportedGrantTypeException.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};

// src/submodules/sso-oidc/protocols/Aws_restJson1.ts
var import_core2 = require("@aws-sdk/core");
var import_core3 = require("@smithy/core");
var import_smithy_client5 = require("@smithy/smithy-client");
var se_CreateTokenCommand = /* @__PURE__ */ __name(async (input, context) => {
  const b = (0, import_core3.requestBuilder)(input, context);
  const headers = {
    "content-type": "application/json"
  };
  b.bp("/token");
  let body;
  body = JSON.stringify(
    (0, import_smithy_client5.take)(input, {
      clientId: [],
      clientSecret: [],
      code: [],
      codeVerifier: [],
      deviceCode: [],
      grantType: [],
      redirectUri: [],
      refreshToken: [],
      scope: /* @__PURE__ */ __name((_) => (0, import_smithy_client5._json)(_), "scope")
    })
  );
  b.m("POST").h(headers).b(body);
  return b.build();
}, "se_CreateTokenCommand");
var de_CreateTokenCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode !== 200 && output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const contents = (0, import_smithy_client5.map)({
    $metadata: deserializeMetadata(output)
  });
  const data = (0, import_smithy_client5.expectNonNull)((0, import_smithy_client5.expectObject)(await (0, import_core2.parseJsonBody)(output.body, context)), "body");
  const doc = (0, import_smithy_client5.take)(data, {
    accessToken: import_smithy_client5.expectString,
    expiresIn: import_smithy_client5.expectInt32,
    idToken: import_smithy_client5.expectString,
    refreshToken: import_smithy_client5.expectString,
    tokenType: import_smithy_client5.expectString
  });
  Object.assign(contents, doc);
  return contents;
}, "de_CreateTokenCommand");
var de_CommandError = /* @__PURE__ */ __name(async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await (0, import_core2.parseJsonErrorBody)(output.body, context)
  };
  const errorCode = (0, import_core2.loadRestJsonErrorCode)(output, parsedOutput.body);
  switch (errorCode) {
    case "AccessDeniedException":
    case "com.amazonaws.ssooidc#AccessDeniedException":
      throw await de_AccessDeniedExceptionRes(parsedOutput, context);
    case "AuthorizationPendingException":
    case "com.amazonaws.ssooidc#AuthorizationPendingException":
      throw await de_AuthorizationPendingExceptionRes(parsedOutput, context);
    case "ExpiredTokenException":
    case "com.amazonaws.ssooidc#ExpiredTokenException":
      throw await de_ExpiredTokenExceptionRes(parsedOutput, context);
    case "InternalServerException":
    case "com.amazonaws.ssooidc#InternalServerException":
      throw await de_InternalServerExceptionRes(parsedOutput, context);
    case "InvalidClientException":
    case "com.amazonaws.ssooidc#InvalidClientException":
      throw await de_InvalidClientExceptionRes(parsedOutput, context);
    case "InvalidGrantException":
    case "com.amazonaws.ssooidc#InvalidGrantException":
      throw await de_InvalidGrantExceptionRes(parsedOutput, context);
    case "InvalidRequestException":
    case "com.amazonaws.ssooidc#InvalidRequestException":
      throw await de_InvalidRequestExceptionRes(parsedOutput, context);
    case "InvalidScopeException":
    case "com.amazonaws.ssooidc#InvalidScopeException":
      throw await de_InvalidScopeExceptionRes(parsedOutput, context);
    case "SlowDownException":
    case "com.amazonaws.ssooidc#SlowDownException":
      throw await de_SlowDownExceptionRes(parsedOutput, context);
    case "UnauthorizedClientException":
    case "com.amazonaws.ssooidc#UnauthorizedClientException":
      throw await de_UnauthorizedClientExceptionRes(parsedOutput, context);
    case "UnsupportedGrantTypeException":
    case "com.amazonaws.ssooidc#UnsupportedGrantTypeException":
      throw await de_UnsupportedGrantTypeExceptionRes(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      return throwDefaultError({
        output,
        parsedBody,
        errorCode
      });
  }
}, "de_CommandError");
var throwDefaultError = (0, import_smithy_client5.withBaseException)(SSOOIDCServiceException);
var de_AccessDeniedExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const contents = (0, import_smithy_client5.map)({});
  const data = parsedOutput.body;
  const doc = (0, import_smithy_client5.take)(data, {
    error: import_smithy_client5.expectString,
    error_description: import_smithy_client5.expectString
  });
  Object.assign(contents, doc);
  const exception = new AccessDeniedException({
    $metadata: deserializeMetadata(parsedOutput),
    ...contents
  });
  return (0, import_smithy_client5.decorateServiceException)(exception, parsedOutput.body);
}, "de_AccessDeniedExceptionRes");
var de_AuthorizationPendingExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const contents = (0, import_smithy_client5.map)({});
  const data = parsedOutput.body;
  const doc = (0, import_smithy_client5.take)(data, {
    error: import_smithy_client5.expectString,
    error_description: import_smithy_client5.expectString
  });
  Object.assign(contents, doc);
  const exception = new AuthorizationPendingException({
    $metadata: deserializeMetadata(parsedOutput),
    ...contents
  });
  return (0, import_smithy_client5.decorateServiceException)(exception, parsedOutput.body);
}, "de_AuthorizationPendingExceptionRes");
var de_ExpiredTokenExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const contents = (0, import_smithy_client5.map)({});
  const data = parsedOutput.body;
  const doc = (0, import_smithy_client5.take)(data, {
    error: import_smithy_client5.expectString,
    error_description: import_smithy_client5.expectString
  });
  Object.assign(contents, doc);
  const exception = new ExpiredTokenException({
    $metadata: deserializeMetadata(parsedOutput),
    ...contents
  });
  return (0, import_smithy_client5.decorateServiceException)(exception, parsedOutput.body);
}, "de_ExpiredTokenExceptionRes");
var de_InternalServerExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const contents = (0, import_smithy_client5.map)({});
  const data = parsedOutput.body;
  const doc = (0, import_smithy_client5.take)(data, {
    error: import_smithy_client5.expectString,
    error_description: import_smithy_client5.expectString
  });
  Object.assign(contents, doc);
  const exception = new InternalServerException({
    $metadata: deserializeMetadata(parsedOutput),
    ...contents
  });
  return (0, import_smithy_client5.decorateServiceException)(exception, parsedOutput.body);
}, "de_InternalServerExceptionRes");
var de_InvalidClientExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const contents = (0, import_smithy_client5.map)({});
  const data = parsedOutput.body;
  const doc = (0, import_smithy_client5.take)(data, {
    error: import_smithy_client5.expectString,
    error_description: import_smithy_client5.expectString
  });
  Object.assign(contents, doc);
  const exception = new InvalidClientException({
    $metadata: deserializeMetadata(parsedOutput),
    ...contents
  });
  return (0, import_smithy_client5.decorateServiceException)(exception, parsedOutput.body);
}, "de_InvalidClientExceptionRes");
var de_InvalidGrantExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const contents = (0, import_smithy_client5.map)({});
  const data = parsedOutput.body;
  const doc = (0, import_smithy_client5.take)(data, {
    error: import_smithy_client5.expectString,
    error_description: import_smithy_client5.expectString
  });
  Object.assign(contents, doc);
  const exception = new InvalidGrantException({
    $metadata: deserializeMetadata(parsedOutput),
    ...contents
  });
  return (0, import_smithy_client5.decorateServiceException)(exception, parsedOutput.body);
}, "de_InvalidGrantExceptionRes");
var de_InvalidRequestExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const contents = (0, import_smithy_client5.map)({});
  const data = parsedOutput.body;
  const doc = (0, import_smithy_client5.take)(data, {
    error: import_smithy_client5.expectString,
    error_description: import_smithy_client5.expectString
  });
  Object.assign(contents, doc);
  const exception = new InvalidRequestException({
    $metadata: deserializeMetadata(parsedOutput),
    ...contents
  });
  return (0, import_smithy_client5.decorateServiceException)(exception, parsedOutput.body);
}, "de_InvalidRequestExceptionRes");
var de_InvalidScopeExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const contents = (0, import_smithy_client5.map)({});
  const data = parsedOutput.body;
  const doc = (0, import_smithy_client5.take)(data, {
    error: import_smithy_client5.expectString,
    error_description: import_smithy_client5.expectString
  });
  Object.assign(contents, doc);
  const exception = new InvalidScopeException({
    $metadata: deserializeMetadata(parsedOutput),
    ...contents
  });
  return (0, import_smithy_client5.decorateServiceException)(exception, parsedOutput.body);
}, "de_InvalidScopeExceptionRes");
var de_SlowDownExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const contents = (0, import_smithy_client5.map)({});
  const data = parsedOutput.body;
  const doc = (0, import_smithy_client5.take)(data, {
    error: import_smithy_client5.expectString,
    error_description: import_smithy_client5.expectString
  });
  Object.assign(contents, doc);
  const exception = new SlowDownException({
    $metadata: deserializeMetadata(parsedOutput),
    ...contents
  });
  return (0, import_smithy_client5.decorateServiceException)(exception, parsedOutput.body);
}, "de_SlowDownExceptionRes");
var de_UnauthorizedClientExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const contents = (0, import_smithy_client5.map)({});
  const data = parsedOutput.body;
  const doc = (0, import_smithy_client5.take)(data, {
    error: import_smithy_client5.expectString,
    error_description: import_smithy_client5.expectString
  });
  Object.assign(contents, doc);
  const exception = new UnauthorizedClientException({
    $metadata: deserializeMetadata(parsedOutput),
    ...contents
  });
  return (0, import_smithy_client5.decorateServiceException)(exception, parsedOutput.body);
}, "de_UnauthorizedClientExceptionRes");
var de_UnsupportedGrantTypeExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const contents = (0, import_smithy_client5.map)({});
  const data = parsedOutput.body;
  const doc = (0, import_smithy_client5.take)(data, {
    error: import_smithy_client5.expectString,
    error_description: import_smithy_client5.expectString
  });
  Object.assign(contents, doc);
  const exception = new UnsupportedGrantTypeException({
    $metadata: deserializeMetadata(parsedOutput),
    ...contents
  });
  return (0, import_smithy_client5.decorateServiceException)(exception, parsedOutput.body);
}, "de_UnsupportedGrantTypeExceptionRes");
var deserializeMetadata = /* @__PURE__ */ __name((output) => ({
  httpStatusCode: output.statusCode,
  requestId: output.headers["x-amzn-requestid"] ?? output.headers["x-amzn-request-id"] ?? output.headers["x-amz-request-id"],
  extendedRequestId: output.headers["x-amz-id-2"],
  cfId: output.headers["x-amz-cf-id"]
}), "deserializeMetadata");

// src/submodules/sso-oidc/commands/CreateTokenCommand.ts
var CreateTokenCommand = class extends import_smithy_client6.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint2.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("AWSSSOOIDCService", "CreateToken", {}).n("SSOOIDCClient", "CreateTokenCommand").f(CreateTokenRequestFilterSensitiveLog, CreateTokenResponseFilterSensitiveLog).ser(se_CreateTokenCommand).de(de_CreateTokenCommand).build() {
  static {
    __name(this, "CreateTokenCommand");
  }
};

// src/submodules/sso-oidc/SSOOIDC.ts
var commands = {
  CreateTokenCommand
};
var SSOOIDC = class extends SSOOIDCClient {
  static {
    __name(this, "SSOOIDC");
  }
};
(0, import_smithy_client7.createAggregatedClient)(commands, SSOOIDC);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  $Command,
  AccessDeniedException,
  AuthorizationPendingException,
  CreateTokenCommand,
  CreateTokenRequestFilterSensitiveLog,
  CreateTokenResponseFilterSensitiveLog,
  ExpiredTokenException,
  InternalServerException,
  InvalidClientException,
  InvalidGrantException,
  InvalidRequestException,
  InvalidScopeException,
  SSOOIDC,
  SSOOIDCClient,
  SSOOIDCServiceException,
  SlowDownException,
  UnauthorizedClientException,
  UnsupportedGrantTypeException,
  __Client
});
