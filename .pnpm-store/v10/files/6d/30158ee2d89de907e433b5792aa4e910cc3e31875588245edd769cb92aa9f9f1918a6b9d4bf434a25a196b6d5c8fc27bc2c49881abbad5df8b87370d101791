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

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AmbiguousRoleResolutionType: () => AmbiguousRoleResolutionType,
  CognitoIdentity: () => CognitoIdentity,
  CognitoIdentityClient: () => CognitoIdentityClient,
  CognitoIdentityServiceException: () => CognitoIdentityServiceException,
  ConcurrentModificationException: () => ConcurrentModificationException,
  CreateIdentityPoolCommand: () => CreateIdentityPoolCommand,
  CredentialsFilterSensitiveLog: () => CredentialsFilterSensitiveLog,
  DeleteIdentitiesCommand: () => DeleteIdentitiesCommand,
  DeleteIdentityPoolCommand: () => DeleteIdentityPoolCommand,
  DescribeIdentityCommand: () => DescribeIdentityCommand,
  DescribeIdentityPoolCommand: () => DescribeIdentityPoolCommand,
  DeveloperUserAlreadyRegisteredException: () => DeveloperUserAlreadyRegisteredException,
  ErrorCode: () => ErrorCode,
  ExternalServiceException: () => ExternalServiceException,
  GetCredentialsForIdentityCommand: () => GetCredentialsForIdentityCommand,
  GetCredentialsForIdentityInputFilterSensitiveLog: () => GetCredentialsForIdentityInputFilterSensitiveLog,
  GetCredentialsForIdentityResponseFilterSensitiveLog: () => GetCredentialsForIdentityResponseFilterSensitiveLog,
  GetIdCommand: () => GetIdCommand,
  GetIdInputFilterSensitiveLog: () => GetIdInputFilterSensitiveLog,
  GetIdentityPoolRolesCommand: () => GetIdentityPoolRolesCommand,
  GetOpenIdTokenCommand: () => GetOpenIdTokenCommand,
  GetOpenIdTokenForDeveloperIdentityCommand: () => GetOpenIdTokenForDeveloperIdentityCommand,
  GetOpenIdTokenForDeveloperIdentityInputFilterSensitiveLog: () => GetOpenIdTokenForDeveloperIdentityInputFilterSensitiveLog,
  GetOpenIdTokenForDeveloperIdentityResponseFilterSensitiveLog: () => GetOpenIdTokenForDeveloperIdentityResponseFilterSensitiveLog,
  GetOpenIdTokenInputFilterSensitiveLog: () => GetOpenIdTokenInputFilterSensitiveLog,
  GetOpenIdTokenResponseFilterSensitiveLog: () => GetOpenIdTokenResponseFilterSensitiveLog,
  GetPrincipalTagAttributeMapCommand: () => GetPrincipalTagAttributeMapCommand,
  InternalErrorException: () => InternalErrorException,
  InvalidIdentityPoolConfigurationException: () => InvalidIdentityPoolConfigurationException,
  InvalidParameterException: () => InvalidParameterException,
  LimitExceededException: () => LimitExceededException,
  ListIdentitiesCommand: () => ListIdentitiesCommand,
  ListIdentityPoolsCommand: () => ListIdentityPoolsCommand,
  ListTagsForResourceCommand: () => ListTagsForResourceCommand,
  LookupDeveloperIdentityCommand: () => LookupDeveloperIdentityCommand,
  MappingRuleMatchType: () => MappingRuleMatchType,
  MergeDeveloperIdentitiesCommand: () => MergeDeveloperIdentitiesCommand,
  NotAuthorizedException: () => NotAuthorizedException,
  ResourceConflictException: () => ResourceConflictException,
  ResourceNotFoundException: () => ResourceNotFoundException,
  RoleMappingType: () => RoleMappingType,
  SetIdentityPoolRolesCommand: () => SetIdentityPoolRolesCommand,
  SetPrincipalTagAttributeMapCommand: () => SetPrincipalTagAttributeMapCommand,
  TagResourceCommand: () => TagResourceCommand,
  TooManyRequestsException: () => TooManyRequestsException,
  UnlinkDeveloperIdentityCommand: () => UnlinkDeveloperIdentityCommand,
  UnlinkIdentityCommand: () => UnlinkIdentityCommand,
  UnlinkIdentityInputFilterSensitiveLog: () => UnlinkIdentityInputFilterSensitiveLog,
  UntagResourceCommand: () => UntagResourceCommand,
  UpdateIdentityPoolCommand: () => UpdateIdentityPoolCommand,
  __Client: () => import_smithy_client.Client,
  paginateListIdentityPools: () => paginateListIdentityPools
});
module.exports = __toCommonJS(index_exports);

// src/CognitoIdentityClient.ts
var import_middleware_host_header = require("@aws-sdk/middleware-host-header");
var import_middleware_logger = require("@aws-sdk/middleware-logger");
var import_middleware_recursion_detection = require("@aws-sdk/middleware-recursion-detection");
var import_middleware_user_agent = require("@aws-sdk/middleware-user-agent");
var import_config_resolver = require("@smithy/config-resolver");
var import_core = require("@smithy/core");
var import_middleware_content_length = require("@smithy/middleware-content-length");
var import_middleware_endpoint = require("@smithy/middleware-endpoint");
var import_middleware_retry = require("@smithy/middleware-retry");

var import_httpAuthSchemeProvider = require("./auth/httpAuthSchemeProvider");

// src/endpoint/EndpointParameters.ts
var resolveClientEndpointParameters = /* @__PURE__ */ __name((options) => {
  return Object.assign(options, {
    useDualstackEndpoint: options.useDualstackEndpoint ?? false,
    useFipsEndpoint: options.useFipsEndpoint ?? false,
    defaultSigningName: "cognito-identity"
  });
}, "resolveClientEndpointParameters");
var commonParams = {
  UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
  Endpoint: { type: "builtInParams", name: "endpoint" },
  Region: { type: "builtInParams", name: "region" },
  UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
};

// src/CognitoIdentityClient.ts
var import_runtimeConfig = require("././runtimeConfig");

// src/runtimeExtensions.ts
var import_region_config_resolver = require("@aws-sdk/region-config-resolver");
var import_protocol_http = require("@smithy/protocol-http");
var import_smithy_client = require("@smithy/smithy-client");

// src/auth/httpAuthExtensionConfiguration.ts
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

// src/runtimeExtensions.ts
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

// src/CognitoIdentityClient.ts
var CognitoIdentityClient = class extends import_smithy_client.Client {
  static {
    __name(this, "CognitoIdentityClient");
  }
  /**
   * The resolved configuration of CognitoIdentityClient class. This is resolved and normalized from the {@link CognitoIdentityClientConfig | constructor configuration interface}.
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
        httpAuthSchemeParametersProvider: import_httpAuthSchemeProvider.defaultCognitoIdentityHttpAuthSchemeParametersProvider,
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

// src/CognitoIdentity.ts


// src/commands/CreateIdentityPoolCommand.ts

var import_middleware_serde = require("@smithy/middleware-serde");


// src/protocols/Aws_json1_1.ts
var import_core2 = require("@aws-sdk/core");



// src/models/CognitoIdentityServiceException.ts

var CognitoIdentityServiceException = class _CognitoIdentityServiceException extends import_smithy_client.ServiceException {
  static {
    __name(this, "CognitoIdentityServiceException");
  }
  /**
   * @internal
   */
  constructor(options) {
    super(options);
    Object.setPrototypeOf(this, _CognitoIdentityServiceException.prototype);
  }
};

// src/models/models_0.ts

var AmbiguousRoleResolutionType = {
  AUTHENTICATED_ROLE: "AuthenticatedRole",
  DENY: "Deny"
};
var InternalErrorException = class _InternalErrorException extends CognitoIdentityServiceException {
  static {
    __name(this, "InternalErrorException");
  }
  name = "InternalErrorException";
  $fault = "server";
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "InternalErrorException",
      $fault: "server",
      ...opts
    });
    Object.setPrototypeOf(this, _InternalErrorException.prototype);
  }
};
var InvalidParameterException = class _InvalidParameterException extends CognitoIdentityServiceException {
  static {
    __name(this, "InvalidParameterException");
  }
  name = "InvalidParameterException";
  $fault = "client";
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "InvalidParameterException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _InvalidParameterException.prototype);
  }
};
var LimitExceededException = class _LimitExceededException extends CognitoIdentityServiceException {
  static {
    __name(this, "LimitExceededException");
  }
  name = "LimitExceededException";
  $fault = "client";
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "LimitExceededException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _LimitExceededException.prototype);
  }
};
var NotAuthorizedException = class _NotAuthorizedException extends CognitoIdentityServiceException {
  static {
    __name(this, "NotAuthorizedException");
  }
  name = "NotAuthorizedException";
  $fault = "client";
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "NotAuthorizedException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _NotAuthorizedException.prototype);
  }
};
var ResourceConflictException = class _ResourceConflictException extends CognitoIdentityServiceException {
  static {
    __name(this, "ResourceConflictException");
  }
  name = "ResourceConflictException";
  $fault = "client";
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "ResourceConflictException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _ResourceConflictException.prototype);
  }
};
var TooManyRequestsException = class _TooManyRequestsException extends CognitoIdentityServiceException {
  static {
    __name(this, "TooManyRequestsException");
  }
  name = "TooManyRequestsException";
  $fault = "client";
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "TooManyRequestsException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _TooManyRequestsException.prototype);
  }
};
var ErrorCode = {
  ACCESS_DENIED: "AccessDenied",
  INTERNAL_SERVER_ERROR: "InternalServerError"
};
var ResourceNotFoundException = class _ResourceNotFoundException extends CognitoIdentityServiceException {
  static {
    __name(this, "ResourceNotFoundException");
  }
  name = "ResourceNotFoundException";
  $fault = "client";
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "ResourceNotFoundException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _ResourceNotFoundException.prototype);
  }
};
var ExternalServiceException = class _ExternalServiceException extends CognitoIdentityServiceException {
  static {
    __name(this, "ExternalServiceException");
  }
  name = "ExternalServiceException";
  $fault = "client";
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "ExternalServiceException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _ExternalServiceException.prototype);
  }
};
var InvalidIdentityPoolConfigurationException = class _InvalidIdentityPoolConfigurationException extends CognitoIdentityServiceException {
  static {
    __name(this, "InvalidIdentityPoolConfigurationException");
  }
  name = "InvalidIdentityPoolConfigurationException";
  $fault = "client";
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "InvalidIdentityPoolConfigurationException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _InvalidIdentityPoolConfigurationException.prototype);
  }
};
var MappingRuleMatchType = {
  CONTAINS: "Contains",
  EQUALS: "Equals",
  NOT_EQUAL: "NotEqual",
  STARTS_WITH: "StartsWith"
};
var RoleMappingType = {
  RULES: "Rules",
  TOKEN: "Token"
};
var DeveloperUserAlreadyRegisteredException = class _DeveloperUserAlreadyRegisteredException extends CognitoIdentityServiceException {
  static {
    __name(this, "DeveloperUserAlreadyRegisteredException");
  }
  name = "DeveloperUserAlreadyRegisteredException";
  $fault = "client";
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "DeveloperUserAlreadyRegisteredException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _DeveloperUserAlreadyRegisteredException.prototype);
  }
};
var ConcurrentModificationException = class _ConcurrentModificationException extends CognitoIdentityServiceException {
  static {
    __name(this, "ConcurrentModificationException");
  }
  name = "ConcurrentModificationException";
  $fault = "client";
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "ConcurrentModificationException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _ConcurrentModificationException.prototype);
  }
};
var GetCredentialsForIdentityInputFilterSensitiveLog = /* @__PURE__ */ __name((obj) => ({
  ...obj,
  ...obj.Logins && { Logins: import_smithy_client.SENSITIVE_STRING }
}), "GetCredentialsForIdentityInputFilterSensitiveLog");
var CredentialsFilterSensitiveLog = /* @__PURE__ */ __name((obj) => ({
  ...obj,
  ...obj.SecretKey && { SecretKey: import_smithy_client.SENSITIVE_STRING }
}), "CredentialsFilterSensitiveLog");
var GetCredentialsForIdentityResponseFilterSensitiveLog = /* @__PURE__ */ __name((obj) => ({
  ...obj,
  ...obj.Credentials && { Credentials: CredentialsFilterSensitiveLog(obj.Credentials) }
}), "GetCredentialsForIdentityResponseFilterSensitiveLog");
var GetIdInputFilterSensitiveLog = /* @__PURE__ */ __name((obj) => ({
  ...obj,
  ...obj.Logins && { Logins: import_smithy_client.SENSITIVE_STRING }
}), "GetIdInputFilterSensitiveLog");
var GetOpenIdTokenInputFilterSensitiveLog = /* @__PURE__ */ __name((obj) => ({
  ...obj,
  ...obj.Logins && { Logins: import_smithy_client.SENSITIVE_STRING }
}), "GetOpenIdTokenInputFilterSensitiveLog");
var GetOpenIdTokenResponseFilterSensitiveLog = /* @__PURE__ */ __name((obj) => ({
  ...obj,
  ...obj.Token && { Token: import_smithy_client.SENSITIVE_STRING }
}), "GetOpenIdTokenResponseFilterSensitiveLog");
var GetOpenIdTokenForDeveloperIdentityInputFilterSensitiveLog = /* @__PURE__ */ __name((obj) => ({
  ...obj,
  ...obj.Logins && { Logins: import_smithy_client.SENSITIVE_STRING }
}), "GetOpenIdTokenForDeveloperIdentityInputFilterSensitiveLog");
var GetOpenIdTokenForDeveloperIdentityResponseFilterSensitiveLog = /* @__PURE__ */ __name((obj) => ({
  ...obj,
  ...obj.Token && { Token: import_smithy_client.SENSITIVE_STRING }
}), "GetOpenIdTokenForDeveloperIdentityResponseFilterSensitiveLog");
var UnlinkIdentityInputFilterSensitiveLog = /* @__PURE__ */ __name((obj) => ({
  ...obj,
  ...obj.Logins && { Logins: import_smithy_client.SENSITIVE_STRING }
}), "UnlinkIdentityInputFilterSensitiveLog");

// src/protocols/Aws_json1_1.ts
var se_CreateIdentityPoolCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("CreateIdentityPool");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_CreateIdentityPoolCommand");
var se_DeleteIdentitiesCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("DeleteIdentities");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_DeleteIdentitiesCommand");
var se_DeleteIdentityPoolCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("DeleteIdentityPool");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_DeleteIdentityPoolCommand");
var se_DescribeIdentityCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("DescribeIdentity");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_DescribeIdentityCommand");
var se_DescribeIdentityPoolCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("DescribeIdentityPool");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_DescribeIdentityPoolCommand");
var se_GetCredentialsForIdentityCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("GetCredentialsForIdentity");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_GetCredentialsForIdentityCommand");
var se_GetIdCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("GetId");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_GetIdCommand");
var se_GetIdentityPoolRolesCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("GetIdentityPoolRoles");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_GetIdentityPoolRolesCommand");
var se_GetOpenIdTokenCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("GetOpenIdToken");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_GetOpenIdTokenCommand");
var se_GetOpenIdTokenForDeveloperIdentityCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("GetOpenIdTokenForDeveloperIdentity");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_GetOpenIdTokenForDeveloperIdentityCommand");
var se_GetPrincipalTagAttributeMapCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("GetPrincipalTagAttributeMap");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_GetPrincipalTagAttributeMapCommand");
var se_ListIdentitiesCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("ListIdentities");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_ListIdentitiesCommand");
var se_ListIdentityPoolsCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("ListIdentityPools");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_ListIdentityPoolsCommand");
var se_ListTagsForResourceCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("ListTagsForResource");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_ListTagsForResourceCommand");
var se_LookupDeveloperIdentityCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("LookupDeveloperIdentity");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_LookupDeveloperIdentityCommand");
var se_MergeDeveloperIdentitiesCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("MergeDeveloperIdentities");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_MergeDeveloperIdentitiesCommand");
var se_SetIdentityPoolRolesCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("SetIdentityPoolRoles");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_SetIdentityPoolRolesCommand");
var se_SetPrincipalTagAttributeMapCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("SetPrincipalTagAttributeMap");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_SetPrincipalTagAttributeMapCommand");
var se_TagResourceCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("TagResource");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_TagResourceCommand");
var se_UnlinkDeveloperIdentityCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("UnlinkDeveloperIdentity");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_UnlinkDeveloperIdentityCommand");
var se_UnlinkIdentityCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("UnlinkIdentity");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_UnlinkIdentityCommand");
var se_UntagResourceCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("UntagResource");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_UntagResourceCommand");
var se_UpdateIdentityPoolCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("UpdateIdentityPool");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_UpdateIdentityPoolCommand");
var de_CreateIdentityPoolCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const data = await (0, import_core2.parseJsonBody)(output.body, context);
  let contents = {};
  contents = (0, import_smithy_client._json)(data);
  const response = {
    $metadata: deserializeMetadata(output),
    ...contents
  };
  return response;
}, "de_CreateIdentityPoolCommand");
var de_DeleteIdentitiesCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const data = await (0, import_core2.parseJsonBody)(output.body, context);
  let contents = {};
  contents = (0, import_smithy_client._json)(data);
  const response = {
    $metadata: deserializeMetadata(output),
    ...contents
  };
  return response;
}, "de_DeleteIdentitiesCommand");
var de_DeleteIdentityPoolCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  await (0, import_smithy_client.collectBody)(output.body, context);
  const response = {
    $metadata: deserializeMetadata(output)
  };
  return response;
}, "de_DeleteIdentityPoolCommand");
var de_DescribeIdentityCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const data = await (0, import_core2.parseJsonBody)(output.body, context);
  let contents = {};
  contents = de_IdentityDescription(data, context);
  const response = {
    $metadata: deserializeMetadata(output),
    ...contents
  };
  return response;
}, "de_DescribeIdentityCommand");
var de_DescribeIdentityPoolCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const data = await (0, import_core2.parseJsonBody)(output.body, context);
  let contents = {};
  contents = (0, import_smithy_client._json)(data);
  const response = {
    $metadata: deserializeMetadata(output),
    ...contents
  };
  return response;
}, "de_DescribeIdentityPoolCommand");
var de_GetCredentialsForIdentityCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const data = await (0, import_core2.parseJsonBody)(output.body, context);
  let contents = {};
  contents = de_GetCredentialsForIdentityResponse(data, context);
  const response = {
    $metadata: deserializeMetadata(output),
    ...contents
  };
  return response;
}, "de_GetCredentialsForIdentityCommand");
var de_GetIdCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const data = await (0, import_core2.parseJsonBody)(output.body, context);
  let contents = {};
  contents = (0, import_smithy_client._json)(data);
  const response = {
    $metadata: deserializeMetadata(output),
    ...contents
  };
  return response;
}, "de_GetIdCommand");
var de_GetIdentityPoolRolesCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const data = await (0, import_core2.parseJsonBody)(output.body, context);
  let contents = {};
  contents = (0, import_smithy_client._json)(data);
  const response = {
    $metadata: deserializeMetadata(output),
    ...contents
  };
  return response;
}, "de_GetIdentityPoolRolesCommand");
var de_GetOpenIdTokenCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const data = await (0, import_core2.parseJsonBody)(output.body, context);
  let contents = {};
  contents = (0, import_smithy_client._json)(data);
  const response = {
    $metadata: deserializeMetadata(output),
    ...contents
  };
  return response;
}, "de_GetOpenIdTokenCommand");
var de_GetOpenIdTokenForDeveloperIdentityCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const data = await (0, import_core2.parseJsonBody)(output.body, context);
  let contents = {};
  contents = (0, import_smithy_client._json)(data);
  const response = {
    $metadata: deserializeMetadata(output),
    ...contents
  };
  return response;
}, "de_GetOpenIdTokenForDeveloperIdentityCommand");
var de_GetPrincipalTagAttributeMapCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const data = await (0, import_core2.parseJsonBody)(output.body, context);
  let contents = {};
  contents = (0, import_smithy_client._json)(data);
  const response = {
    $metadata: deserializeMetadata(output),
    ...contents
  };
  return response;
}, "de_GetPrincipalTagAttributeMapCommand");
var de_ListIdentitiesCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const data = await (0, import_core2.parseJsonBody)(output.body, context);
  let contents = {};
  contents = de_ListIdentitiesResponse(data, context);
  const response = {
    $metadata: deserializeMetadata(output),
    ...contents
  };
  return response;
}, "de_ListIdentitiesCommand");
var de_ListIdentityPoolsCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const data = await (0, import_core2.parseJsonBody)(output.body, context);
  let contents = {};
  contents = (0, import_smithy_client._json)(data);
  const response = {
    $metadata: deserializeMetadata(output),
    ...contents
  };
  return response;
}, "de_ListIdentityPoolsCommand");
var de_ListTagsForResourceCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const data = await (0, import_core2.parseJsonBody)(output.body, context);
  let contents = {};
  contents = (0, import_smithy_client._json)(data);
  const response = {
    $metadata: deserializeMetadata(output),
    ...contents
  };
  return response;
}, "de_ListTagsForResourceCommand");
var de_LookupDeveloperIdentityCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const data = await (0, import_core2.parseJsonBody)(output.body, context);
  let contents = {};
  contents = (0, import_smithy_client._json)(data);
  const response = {
    $metadata: deserializeMetadata(output),
    ...contents
  };
  return response;
}, "de_LookupDeveloperIdentityCommand");
var de_MergeDeveloperIdentitiesCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const data = await (0, import_core2.parseJsonBody)(output.body, context);
  let contents = {};
  contents = (0, import_smithy_client._json)(data);
  const response = {
    $metadata: deserializeMetadata(output),
    ...contents
  };
  return response;
}, "de_MergeDeveloperIdentitiesCommand");
var de_SetIdentityPoolRolesCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  await (0, import_smithy_client.collectBody)(output.body, context);
  const response = {
    $metadata: deserializeMetadata(output)
  };
  return response;
}, "de_SetIdentityPoolRolesCommand");
var de_SetPrincipalTagAttributeMapCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const data = await (0, import_core2.parseJsonBody)(output.body, context);
  let contents = {};
  contents = (0, import_smithy_client._json)(data);
  const response = {
    $metadata: deserializeMetadata(output),
    ...contents
  };
  return response;
}, "de_SetPrincipalTagAttributeMapCommand");
var de_TagResourceCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const data = await (0, import_core2.parseJsonBody)(output.body, context);
  let contents = {};
  contents = (0, import_smithy_client._json)(data);
  const response = {
    $metadata: deserializeMetadata(output),
    ...contents
  };
  return response;
}, "de_TagResourceCommand");
var de_UnlinkDeveloperIdentityCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  await (0, import_smithy_client.collectBody)(output.body, context);
  const response = {
    $metadata: deserializeMetadata(output)
  };
  return response;
}, "de_UnlinkDeveloperIdentityCommand");
var de_UnlinkIdentityCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  await (0, import_smithy_client.collectBody)(output.body, context);
  const response = {
    $metadata: deserializeMetadata(output)
  };
  return response;
}, "de_UnlinkIdentityCommand");
var de_UntagResourceCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const data = await (0, import_core2.parseJsonBody)(output.body, context);
  let contents = {};
  contents = (0, import_smithy_client._json)(data);
  const response = {
    $metadata: deserializeMetadata(output),
    ...contents
  };
  return response;
}, "de_UntagResourceCommand");
var de_UpdateIdentityPoolCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const data = await (0, import_core2.parseJsonBody)(output.body, context);
  let contents = {};
  contents = (0, import_smithy_client._json)(data);
  const response = {
    $metadata: deserializeMetadata(output),
    ...contents
  };
  return response;
}, "de_UpdateIdentityPoolCommand");
var de_CommandError = /* @__PURE__ */ __name(async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await (0, import_core2.parseJsonErrorBody)(output.body, context)
  };
  const errorCode = (0, import_core2.loadRestJsonErrorCode)(output, parsedOutput.body);
  switch (errorCode) {
    case "InternalErrorException":
    case "com.amazonaws.cognitoidentity#InternalErrorException":
      throw await de_InternalErrorExceptionRes(parsedOutput, context);
    case "InvalidParameterException":
    case "com.amazonaws.cognitoidentity#InvalidParameterException":
      throw await de_InvalidParameterExceptionRes(parsedOutput, context);
    case "LimitExceededException":
    case "com.amazonaws.cognitoidentity#LimitExceededException":
      throw await de_LimitExceededExceptionRes(parsedOutput, context);
    case "NotAuthorizedException":
    case "com.amazonaws.cognitoidentity#NotAuthorizedException":
      throw await de_NotAuthorizedExceptionRes(parsedOutput, context);
    case "ResourceConflictException":
    case "com.amazonaws.cognitoidentity#ResourceConflictException":
      throw await de_ResourceConflictExceptionRes(parsedOutput, context);
    case "TooManyRequestsException":
    case "com.amazonaws.cognitoidentity#TooManyRequestsException":
      throw await de_TooManyRequestsExceptionRes(parsedOutput, context);
    case "ResourceNotFoundException":
    case "com.amazonaws.cognitoidentity#ResourceNotFoundException":
      throw await de_ResourceNotFoundExceptionRes(parsedOutput, context);
    case "ExternalServiceException":
    case "com.amazonaws.cognitoidentity#ExternalServiceException":
      throw await de_ExternalServiceExceptionRes(parsedOutput, context);
    case "InvalidIdentityPoolConfigurationException":
    case "com.amazonaws.cognitoidentity#InvalidIdentityPoolConfigurationException":
      throw await de_InvalidIdentityPoolConfigurationExceptionRes(parsedOutput, context);
    case "DeveloperUserAlreadyRegisteredException":
    case "com.amazonaws.cognitoidentity#DeveloperUserAlreadyRegisteredException":
      throw await de_DeveloperUserAlreadyRegisteredExceptionRes(parsedOutput, context);
    case "ConcurrentModificationException":
    case "com.amazonaws.cognitoidentity#ConcurrentModificationException":
      throw await de_ConcurrentModificationExceptionRes(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      return throwDefaultError({
        output,
        parsedBody,
        errorCode
      });
  }
}, "de_CommandError");
var de_ConcurrentModificationExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = (0, import_smithy_client._json)(body);
  const exception = new ConcurrentModificationException({
    $metadata: deserializeMetadata(parsedOutput),
    ...deserialized
  });
  return (0, import_smithy_client.decorateServiceException)(exception, body);
}, "de_ConcurrentModificationExceptionRes");
var de_DeveloperUserAlreadyRegisteredExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = (0, import_smithy_client._json)(body);
  const exception = new DeveloperUserAlreadyRegisteredException({
    $metadata: deserializeMetadata(parsedOutput),
    ...deserialized
  });
  return (0, import_smithy_client.decorateServiceException)(exception, body);
}, "de_DeveloperUserAlreadyRegisteredExceptionRes");
var de_ExternalServiceExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = (0, import_smithy_client._json)(body);
  const exception = new ExternalServiceException({
    $metadata: deserializeMetadata(parsedOutput),
    ...deserialized
  });
  return (0, import_smithy_client.decorateServiceException)(exception, body);
}, "de_ExternalServiceExceptionRes");
var de_InternalErrorExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = (0, import_smithy_client._json)(body);
  const exception = new InternalErrorException({
    $metadata: deserializeMetadata(parsedOutput),
    ...deserialized
  });
  return (0, import_smithy_client.decorateServiceException)(exception, body);
}, "de_InternalErrorExceptionRes");
var de_InvalidIdentityPoolConfigurationExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = (0, import_smithy_client._json)(body);
  const exception = new InvalidIdentityPoolConfigurationException({
    $metadata: deserializeMetadata(parsedOutput),
    ...deserialized
  });
  return (0, import_smithy_client.decorateServiceException)(exception, body);
}, "de_InvalidIdentityPoolConfigurationExceptionRes");
var de_InvalidParameterExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = (0, import_smithy_client._json)(body);
  const exception = new InvalidParameterException({
    $metadata: deserializeMetadata(parsedOutput),
    ...deserialized
  });
  return (0, import_smithy_client.decorateServiceException)(exception, body);
}, "de_InvalidParameterExceptionRes");
var de_LimitExceededExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = (0, import_smithy_client._json)(body);
  const exception = new LimitExceededException({
    $metadata: deserializeMetadata(parsedOutput),
    ...deserialized
  });
  return (0, import_smithy_client.decorateServiceException)(exception, body);
}, "de_LimitExceededExceptionRes");
var de_NotAuthorizedExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = (0, import_smithy_client._json)(body);
  const exception = new NotAuthorizedException({
    $metadata: deserializeMetadata(parsedOutput),
    ...deserialized
  });
  return (0, import_smithy_client.decorateServiceException)(exception, body);
}, "de_NotAuthorizedExceptionRes");
var de_ResourceConflictExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = (0, import_smithy_client._json)(body);
  const exception = new ResourceConflictException({
    $metadata: deserializeMetadata(parsedOutput),
    ...deserialized
  });
  return (0, import_smithy_client.decorateServiceException)(exception, body);
}, "de_ResourceConflictExceptionRes");
var de_ResourceNotFoundExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = (0, import_smithy_client._json)(body);
  const exception = new ResourceNotFoundException({
    $metadata: deserializeMetadata(parsedOutput),
    ...deserialized
  });
  return (0, import_smithy_client.decorateServiceException)(exception, body);
}, "de_ResourceNotFoundExceptionRes");
var de_TooManyRequestsExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = (0, import_smithy_client._json)(body);
  const exception = new TooManyRequestsException({
    $metadata: deserializeMetadata(parsedOutput),
    ...deserialized
  });
  return (0, import_smithy_client.decorateServiceException)(exception, body);
}, "de_TooManyRequestsExceptionRes");
var de_Credentials = /* @__PURE__ */ __name((output, context) => {
  return (0, import_smithy_client.take)(output, {
    AccessKeyId: import_smithy_client.expectString,
    Expiration: /* @__PURE__ */ __name((_) => (0, import_smithy_client.expectNonNull)((0, import_smithy_client.parseEpochTimestamp)((0, import_smithy_client.expectNumber)(_))), "Expiration"),
    SecretKey: import_smithy_client.expectString,
    SessionToken: import_smithy_client.expectString
  });
}, "de_Credentials");
var de_GetCredentialsForIdentityResponse = /* @__PURE__ */ __name((output, context) => {
  return (0, import_smithy_client.take)(output, {
    Credentials: /* @__PURE__ */ __name((_) => de_Credentials(_, context), "Credentials"),
    IdentityId: import_smithy_client.expectString
  });
}, "de_GetCredentialsForIdentityResponse");
var de_IdentitiesList = /* @__PURE__ */ __name((output, context) => {
  const retVal = (output || []).filter((e) => e != null).map((entry) => {
    return de_IdentityDescription(entry, context);
  });
  return retVal;
}, "de_IdentitiesList");
var de_IdentityDescription = /* @__PURE__ */ __name((output, context) => {
  return (0, import_smithy_client.take)(output, {
    CreationDate: /* @__PURE__ */ __name((_) => (0, import_smithy_client.expectNonNull)((0, import_smithy_client.parseEpochTimestamp)((0, import_smithy_client.expectNumber)(_))), "CreationDate"),
    IdentityId: import_smithy_client.expectString,
    LastModifiedDate: /* @__PURE__ */ __name((_) => (0, import_smithy_client.expectNonNull)((0, import_smithy_client.parseEpochTimestamp)((0, import_smithy_client.expectNumber)(_))), "LastModifiedDate"),
    Logins: import_smithy_client._json
  });
}, "de_IdentityDescription");
var de_ListIdentitiesResponse = /* @__PURE__ */ __name((output, context) => {
  return (0, import_smithy_client.take)(output, {
    Identities: /* @__PURE__ */ __name((_) => de_IdentitiesList(_, context), "Identities"),
    IdentityPoolId: import_smithy_client.expectString,
    NextToken: import_smithy_client.expectString
  });
}, "de_ListIdentitiesResponse");
var deserializeMetadata = /* @__PURE__ */ __name((output) => ({
  httpStatusCode: output.statusCode,
  requestId: output.headers["x-amzn-requestid"] ?? output.headers["x-amzn-request-id"] ?? output.headers["x-amz-request-id"],
  extendedRequestId: output.headers["x-amz-id-2"],
  cfId: output.headers["x-amz-cf-id"]
}), "deserializeMetadata");
var throwDefaultError = (0, import_smithy_client.withBaseException)(CognitoIdentityServiceException);
var buildHttpRpcRequest = /* @__PURE__ */ __name(async (context, headers, path, resolvedHostname, body) => {
  const { hostname, protocol = "https", port, path: basePath } = await context.endpoint();
  const contents = {
    protocol,
    hostname,
    port,
    method: "POST",
    path: basePath.endsWith("/") ? basePath.slice(0, -1) + path : basePath + path,
    headers
  };
  if (resolvedHostname !== void 0) {
    contents.hostname = resolvedHostname;
  }
  if (body !== void 0) {
    contents.body = body;
  }
  return new import_protocol_http.HttpRequest(contents);
}, "buildHttpRpcRequest");
function sharedHeaders(operation) {
  return {
    "content-type": "application/x-amz-json-1.1",
    "x-amz-target": `AWSCognitoIdentityService.${operation}`
  };
}
__name(sharedHeaders, "sharedHeaders");

// src/commands/CreateIdentityPoolCommand.ts
var CreateIdentityPoolCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("AWSCognitoIdentityService", "CreateIdentityPool", {}).n("CognitoIdentityClient", "CreateIdentityPoolCommand").f(void 0, void 0).ser(se_CreateIdentityPoolCommand).de(de_CreateIdentityPoolCommand).build() {
  static {
    __name(this, "CreateIdentityPoolCommand");
  }
};

// src/commands/DeleteIdentitiesCommand.ts



var DeleteIdentitiesCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("AWSCognitoIdentityService", "DeleteIdentities", {}).n("CognitoIdentityClient", "DeleteIdentitiesCommand").f(void 0, void 0).ser(se_DeleteIdentitiesCommand).de(de_DeleteIdentitiesCommand).build() {
  static {
    __name(this, "DeleteIdentitiesCommand");
  }
};

// src/commands/DeleteIdentityPoolCommand.ts



var DeleteIdentityPoolCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("AWSCognitoIdentityService", "DeleteIdentityPool", {}).n("CognitoIdentityClient", "DeleteIdentityPoolCommand").f(void 0, void 0).ser(se_DeleteIdentityPoolCommand).de(de_DeleteIdentityPoolCommand).build() {
  static {
    __name(this, "DeleteIdentityPoolCommand");
  }
};

// src/commands/DescribeIdentityCommand.ts



var DescribeIdentityCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("AWSCognitoIdentityService", "DescribeIdentity", {}).n("CognitoIdentityClient", "DescribeIdentityCommand").f(void 0, void 0).ser(se_DescribeIdentityCommand).de(de_DescribeIdentityCommand).build() {
  static {
    __name(this, "DescribeIdentityCommand");
  }
};

// src/commands/DescribeIdentityPoolCommand.ts



var DescribeIdentityPoolCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("AWSCognitoIdentityService", "DescribeIdentityPool", {}).n("CognitoIdentityClient", "DescribeIdentityPoolCommand").f(void 0, void 0).ser(se_DescribeIdentityPoolCommand).de(de_DescribeIdentityPoolCommand).build() {
  static {
    __name(this, "DescribeIdentityPoolCommand");
  }
};

// src/commands/GetCredentialsForIdentityCommand.ts



var GetCredentialsForIdentityCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("AWSCognitoIdentityService", "GetCredentialsForIdentity", {}).n("CognitoIdentityClient", "GetCredentialsForIdentityCommand").f(GetCredentialsForIdentityInputFilterSensitiveLog, GetCredentialsForIdentityResponseFilterSensitiveLog).ser(se_GetCredentialsForIdentityCommand).de(de_GetCredentialsForIdentityCommand).build() {
  static {
    __name(this, "GetCredentialsForIdentityCommand");
  }
};

// src/commands/GetIdCommand.ts



var GetIdCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("AWSCognitoIdentityService", "GetId", {}).n("CognitoIdentityClient", "GetIdCommand").f(GetIdInputFilterSensitiveLog, void 0).ser(se_GetIdCommand).de(de_GetIdCommand).build() {
  static {
    __name(this, "GetIdCommand");
  }
};

// src/commands/GetIdentityPoolRolesCommand.ts



var GetIdentityPoolRolesCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("AWSCognitoIdentityService", "GetIdentityPoolRoles", {}).n("CognitoIdentityClient", "GetIdentityPoolRolesCommand").f(void 0, void 0).ser(se_GetIdentityPoolRolesCommand).de(de_GetIdentityPoolRolesCommand).build() {
  static {
    __name(this, "GetIdentityPoolRolesCommand");
  }
};

// src/commands/GetOpenIdTokenCommand.ts



var GetOpenIdTokenCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("AWSCognitoIdentityService", "GetOpenIdToken", {}).n("CognitoIdentityClient", "GetOpenIdTokenCommand").f(GetOpenIdTokenInputFilterSensitiveLog, GetOpenIdTokenResponseFilterSensitiveLog).ser(se_GetOpenIdTokenCommand).de(de_GetOpenIdTokenCommand).build() {
  static {
    __name(this, "GetOpenIdTokenCommand");
  }
};

// src/commands/GetOpenIdTokenForDeveloperIdentityCommand.ts



var GetOpenIdTokenForDeveloperIdentityCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("AWSCognitoIdentityService", "GetOpenIdTokenForDeveloperIdentity", {}).n("CognitoIdentityClient", "GetOpenIdTokenForDeveloperIdentityCommand").f(
  GetOpenIdTokenForDeveloperIdentityInputFilterSensitiveLog,
  GetOpenIdTokenForDeveloperIdentityResponseFilterSensitiveLog
).ser(se_GetOpenIdTokenForDeveloperIdentityCommand).de(de_GetOpenIdTokenForDeveloperIdentityCommand).build() {
  static {
    __name(this, "GetOpenIdTokenForDeveloperIdentityCommand");
  }
};

// src/commands/GetPrincipalTagAttributeMapCommand.ts



var GetPrincipalTagAttributeMapCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("AWSCognitoIdentityService", "GetPrincipalTagAttributeMap", {}).n("CognitoIdentityClient", "GetPrincipalTagAttributeMapCommand").f(void 0, void 0).ser(se_GetPrincipalTagAttributeMapCommand).de(de_GetPrincipalTagAttributeMapCommand).build() {
  static {
    __name(this, "GetPrincipalTagAttributeMapCommand");
  }
};

// src/commands/ListIdentitiesCommand.ts



var ListIdentitiesCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("AWSCognitoIdentityService", "ListIdentities", {}).n("CognitoIdentityClient", "ListIdentitiesCommand").f(void 0, void 0).ser(se_ListIdentitiesCommand).de(de_ListIdentitiesCommand).build() {
  static {
    __name(this, "ListIdentitiesCommand");
  }
};

// src/commands/ListIdentityPoolsCommand.ts



var ListIdentityPoolsCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("AWSCognitoIdentityService", "ListIdentityPools", {}).n("CognitoIdentityClient", "ListIdentityPoolsCommand").f(void 0, void 0).ser(se_ListIdentityPoolsCommand).de(de_ListIdentityPoolsCommand).build() {
  static {
    __name(this, "ListIdentityPoolsCommand");
  }
};

// src/commands/ListTagsForResourceCommand.ts



var ListTagsForResourceCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("AWSCognitoIdentityService", "ListTagsForResource", {}).n("CognitoIdentityClient", "ListTagsForResourceCommand").f(void 0, void 0).ser(se_ListTagsForResourceCommand).de(de_ListTagsForResourceCommand).build() {
  static {
    __name(this, "ListTagsForResourceCommand");
  }
};

// src/commands/LookupDeveloperIdentityCommand.ts



var LookupDeveloperIdentityCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("AWSCognitoIdentityService", "LookupDeveloperIdentity", {}).n("CognitoIdentityClient", "LookupDeveloperIdentityCommand").f(void 0, void 0).ser(se_LookupDeveloperIdentityCommand).de(de_LookupDeveloperIdentityCommand).build() {
  static {
    __name(this, "LookupDeveloperIdentityCommand");
  }
};

// src/commands/MergeDeveloperIdentitiesCommand.ts



var MergeDeveloperIdentitiesCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("AWSCognitoIdentityService", "MergeDeveloperIdentities", {}).n("CognitoIdentityClient", "MergeDeveloperIdentitiesCommand").f(void 0, void 0).ser(se_MergeDeveloperIdentitiesCommand).de(de_MergeDeveloperIdentitiesCommand).build() {
  static {
    __name(this, "MergeDeveloperIdentitiesCommand");
  }
};

// src/commands/SetIdentityPoolRolesCommand.ts



var SetIdentityPoolRolesCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("AWSCognitoIdentityService", "SetIdentityPoolRoles", {}).n("CognitoIdentityClient", "SetIdentityPoolRolesCommand").f(void 0, void 0).ser(se_SetIdentityPoolRolesCommand).de(de_SetIdentityPoolRolesCommand).build() {
  static {
    __name(this, "SetIdentityPoolRolesCommand");
  }
};

// src/commands/SetPrincipalTagAttributeMapCommand.ts



var SetPrincipalTagAttributeMapCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("AWSCognitoIdentityService", "SetPrincipalTagAttributeMap", {}).n("CognitoIdentityClient", "SetPrincipalTagAttributeMapCommand").f(void 0, void 0).ser(se_SetPrincipalTagAttributeMapCommand).de(de_SetPrincipalTagAttributeMapCommand).build() {
  static {
    __name(this, "SetPrincipalTagAttributeMapCommand");
  }
};

// src/commands/TagResourceCommand.ts



var TagResourceCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("AWSCognitoIdentityService", "TagResource", {}).n("CognitoIdentityClient", "TagResourceCommand").f(void 0, void 0).ser(se_TagResourceCommand).de(de_TagResourceCommand).build() {
  static {
    __name(this, "TagResourceCommand");
  }
};

// src/commands/UnlinkDeveloperIdentityCommand.ts



var UnlinkDeveloperIdentityCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("AWSCognitoIdentityService", "UnlinkDeveloperIdentity", {}).n("CognitoIdentityClient", "UnlinkDeveloperIdentityCommand").f(void 0, void 0).ser(se_UnlinkDeveloperIdentityCommand).de(de_UnlinkDeveloperIdentityCommand).build() {
  static {
    __name(this, "UnlinkDeveloperIdentityCommand");
  }
};

// src/commands/UnlinkIdentityCommand.ts



var UnlinkIdentityCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("AWSCognitoIdentityService", "UnlinkIdentity", {}).n("CognitoIdentityClient", "UnlinkIdentityCommand").f(UnlinkIdentityInputFilterSensitiveLog, void 0).ser(se_UnlinkIdentityCommand).de(de_UnlinkIdentityCommand).build() {
  static {
    __name(this, "UnlinkIdentityCommand");
  }
};

// src/commands/UntagResourceCommand.ts



var UntagResourceCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("AWSCognitoIdentityService", "UntagResource", {}).n("CognitoIdentityClient", "UntagResourceCommand").f(void 0, void 0).ser(se_UntagResourceCommand).de(de_UntagResourceCommand).build() {
  static {
    __name(this, "UntagResourceCommand");
  }
};

// src/commands/UpdateIdentityPoolCommand.ts



var UpdateIdentityPoolCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("AWSCognitoIdentityService", "UpdateIdentityPool", {}).n("CognitoIdentityClient", "UpdateIdentityPoolCommand").f(void 0, void 0).ser(se_UpdateIdentityPoolCommand).de(de_UpdateIdentityPoolCommand).build() {
  static {
    __name(this, "UpdateIdentityPoolCommand");
  }
};

// src/CognitoIdentity.ts
var commands = {
  CreateIdentityPoolCommand,
  DeleteIdentitiesCommand,
  DeleteIdentityPoolCommand,
  DescribeIdentityCommand,
  DescribeIdentityPoolCommand,
  GetCredentialsForIdentityCommand,
  GetIdCommand,
  GetIdentityPoolRolesCommand,
  GetOpenIdTokenCommand,
  GetOpenIdTokenForDeveloperIdentityCommand,
  GetPrincipalTagAttributeMapCommand,
  ListIdentitiesCommand,
  ListIdentityPoolsCommand,
  ListTagsForResourceCommand,
  LookupDeveloperIdentityCommand,
  MergeDeveloperIdentitiesCommand,
  SetIdentityPoolRolesCommand,
  SetPrincipalTagAttributeMapCommand,
  TagResourceCommand,
  UnlinkDeveloperIdentityCommand,
  UnlinkIdentityCommand,
  UntagResourceCommand,
  UpdateIdentityPoolCommand
};
var CognitoIdentity = class extends CognitoIdentityClient {
  static {
    __name(this, "CognitoIdentity");
  }
};
(0, import_smithy_client.createAggregatedClient)(commands, CognitoIdentity);

// src/pagination/ListIdentityPoolsPaginator.ts

var paginateListIdentityPools = (0, import_core.createPaginator)(CognitoIdentityClient, ListIdentityPoolsCommand, "NextToken", "NextToken", "MaxResults");
// Annotate the CommonJS export names for ESM import in node:

0 && (module.exports = {
  CognitoIdentityServiceException,
  __Client,
  CognitoIdentityClient,
  CognitoIdentity,
  $Command,
  CreateIdentityPoolCommand,
  DeleteIdentitiesCommand,
  DeleteIdentityPoolCommand,
  DescribeIdentityCommand,
  DescribeIdentityPoolCommand,
  GetCredentialsForIdentityCommand,
  GetIdCommand,
  GetIdentityPoolRolesCommand,
  GetOpenIdTokenCommand,
  GetOpenIdTokenForDeveloperIdentityCommand,
  GetPrincipalTagAttributeMapCommand,
  ListIdentitiesCommand,
  ListIdentityPoolsCommand,
  ListTagsForResourceCommand,
  LookupDeveloperIdentityCommand,
  MergeDeveloperIdentitiesCommand,
  SetIdentityPoolRolesCommand,
  SetPrincipalTagAttributeMapCommand,
  TagResourceCommand,
  UnlinkDeveloperIdentityCommand,
  UnlinkIdentityCommand,
  UntagResourceCommand,
  UpdateIdentityPoolCommand,
  paginateListIdentityPools,
  AmbiguousRoleResolutionType,
  InternalErrorException,
  InvalidParameterException,
  LimitExceededException,
  NotAuthorizedException,
  ResourceConflictException,
  TooManyRequestsException,
  ErrorCode,
  ResourceNotFoundException,
  ExternalServiceException,
  InvalidIdentityPoolConfigurationException,
  MappingRuleMatchType,
  RoleMappingType,
  DeveloperUserAlreadyRegisteredException,
  ConcurrentModificationException,
  GetCredentialsForIdentityInputFilterSensitiveLog,
  CredentialsFilterSensitiveLog,
  GetCredentialsForIdentityResponseFilterSensitiveLog,
  GetIdInputFilterSensitiveLog,
  GetOpenIdTokenInputFilterSensitiveLog,
  GetOpenIdTokenResponseFilterSensitiveLog,
  GetOpenIdTokenForDeveloperIdentityInputFilterSensitiveLog,
  GetOpenIdTokenForDeveloperIdentityResponseFilterSensitiveLog,
  UnlinkIdentityInputFilterSensitiveLog
});

