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
  BatchGetSecretValueCommand: () => BatchGetSecretValueCommand,
  BatchGetSecretValueResponseFilterSensitiveLog: () => BatchGetSecretValueResponseFilterSensitiveLog,
  CancelRotateSecretCommand: () => CancelRotateSecretCommand,
  CreateSecretCommand: () => CreateSecretCommand,
  CreateSecretRequestFilterSensitiveLog: () => CreateSecretRequestFilterSensitiveLog,
  DecryptionFailure: () => DecryptionFailure,
  DeleteResourcePolicyCommand: () => DeleteResourcePolicyCommand,
  DeleteSecretCommand: () => DeleteSecretCommand,
  DescribeSecretCommand: () => DescribeSecretCommand,
  EncryptionFailure: () => EncryptionFailure,
  FilterNameStringType: () => FilterNameStringType,
  GetRandomPasswordCommand: () => GetRandomPasswordCommand,
  GetRandomPasswordResponseFilterSensitiveLog: () => GetRandomPasswordResponseFilterSensitiveLog,
  GetResourcePolicyCommand: () => GetResourcePolicyCommand,
  GetSecretValueCommand: () => GetSecretValueCommand,
  GetSecretValueResponseFilterSensitiveLog: () => GetSecretValueResponseFilterSensitiveLog,
  InternalServiceError: () => InternalServiceError,
  InvalidNextTokenException: () => InvalidNextTokenException,
  InvalidParameterException: () => InvalidParameterException,
  InvalidRequestException: () => InvalidRequestException,
  LimitExceededException: () => LimitExceededException,
  ListSecretVersionIdsCommand: () => ListSecretVersionIdsCommand,
  ListSecretsCommand: () => ListSecretsCommand,
  MalformedPolicyDocumentException: () => MalformedPolicyDocumentException,
  PreconditionNotMetException: () => PreconditionNotMetException,
  PublicPolicyException: () => PublicPolicyException,
  PutResourcePolicyCommand: () => PutResourcePolicyCommand,
  PutSecretValueCommand: () => PutSecretValueCommand,
  PutSecretValueRequestFilterSensitiveLog: () => PutSecretValueRequestFilterSensitiveLog,
  RemoveRegionsFromReplicationCommand: () => RemoveRegionsFromReplicationCommand,
  ReplicateSecretToRegionsCommand: () => ReplicateSecretToRegionsCommand,
  ResourceExistsException: () => ResourceExistsException,
  ResourceNotFoundException: () => ResourceNotFoundException,
  RestoreSecretCommand: () => RestoreSecretCommand,
  RotateSecretCommand: () => RotateSecretCommand,
  SecretValueEntryFilterSensitiveLog: () => SecretValueEntryFilterSensitiveLog,
  SecretsManager: () => SecretsManager,
  SecretsManagerClient: () => SecretsManagerClient,
  SecretsManagerServiceException: () => SecretsManagerServiceException,
  SortOrderType: () => SortOrderType,
  StatusType: () => StatusType,
  StopReplicationToReplicaCommand: () => StopReplicationToReplicaCommand,
  TagResourceCommand: () => TagResourceCommand,
  UntagResourceCommand: () => UntagResourceCommand,
  UpdateSecretCommand: () => UpdateSecretCommand,
  UpdateSecretRequestFilterSensitiveLog: () => UpdateSecretRequestFilterSensitiveLog,
  UpdateSecretVersionStageCommand: () => UpdateSecretVersionStageCommand,
  ValidateResourcePolicyCommand: () => ValidateResourcePolicyCommand,
  __Client: () => import_smithy_client.Client,
  paginateBatchGetSecretValue: () => paginateBatchGetSecretValue,
  paginateListSecretVersionIds: () => paginateListSecretVersionIds,
  paginateListSecrets: () => paginateListSecrets
});
module.exports = __toCommonJS(index_exports);

// src/SecretsManagerClient.ts
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
    defaultSigningName: "secretsmanager"
  });
}, "resolveClientEndpointParameters");
var commonParams = {
  UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
  Endpoint: { type: "builtInParams", name: "endpoint" },
  Region: { type: "builtInParams", name: "region" },
  UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
};

// src/SecretsManagerClient.ts
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

// src/SecretsManagerClient.ts
var SecretsManagerClient = class extends import_smithy_client.Client {
  static {
    __name(this, "SecretsManagerClient");
  }
  /**
   * The resolved configuration of SecretsManagerClient class. This is resolved and normalized from the {@link SecretsManagerClientConfig | constructor configuration interface}.
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
        httpAuthSchemeParametersProvider: import_httpAuthSchemeProvider.defaultSecretsManagerHttpAuthSchemeParametersProvider,
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

// src/SecretsManager.ts


// src/commands/BatchGetSecretValueCommand.ts

var import_middleware_serde = require("@smithy/middleware-serde");


// src/models/models_0.ts


// src/models/SecretsManagerServiceException.ts

var SecretsManagerServiceException = class _SecretsManagerServiceException extends import_smithy_client.ServiceException {
  static {
    __name(this, "SecretsManagerServiceException");
  }
  /**
   * @internal
   */
  constructor(options) {
    super(options);
    Object.setPrototypeOf(this, _SecretsManagerServiceException.prototype);
  }
};

// src/models/models_0.ts
var FilterNameStringType = {
  all: "all",
  description: "description",
  name: "name",
  owning_service: "owning-service",
  primary_region: "primary-region",
  tag_key: "tag-key",
  tag_value: "tag-value"
};
var DecryptionFailure = class _DecryptionFailure extends SecretsManagerServiceException {
  static {
    __name(this, "DecryptionFailure");
  }
  name = "DecryptionFailure";
  $fault = "client";
  Message;
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "DecryptionFailure",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _DecryptionFailure.prototype);
    this.Message = opts.Message;
  }
};
var InternalServiceError = class _InternalServiceError extends SecretsManagerServiceException {
  static {
    __name(this, "InternalServiceError");
  }
  name = "InternalServiceError";
  $fault = "server";
  Message;
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "InternalServiceError",
      $fault: "server",
      ...opts
    });
    Object.setPrototypeOf(this, _InternalServiceError.prototype);
    this.Message = opts.Message;
  }
};
var InvalidNextTokenException = class _InvalidNextTokenException extends SecretsManagerServiceException {
  static {
    __name(this, "InvalidNextTokenException");
  }
  name = "InvalidNextTokenException";
  $fault = "client";
  Message;
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "InvalidNextTokenException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _InvalidNextTokenException.prototype);
    this.Message = opts.Message;
  }
};
var InvalidParameterException = class _InvalidParameterException extends SecretsManagerServiceException {
  static {
    __name(this, "InvalidParameterException");
  }
  name = "InvalidParameterException";
  $fault = "client";
  Message;
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
    this.Message = opts.Message;
  }
};
var InvalidRequestException = class _InvalidRequestException extends SecretsManagerServiceException {
  static {
    __name(this, "InvalidRequestException");
  }
  name = "InvalidRequestException";
  $fault = "client";
  Message;
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
    this.Message = opts.Message;
  }
};
var ResourceNotFoundException = class _ResourceNotFoundException extends SecretsManagerServiceException {
  static {
    __name(this, "ResourceNotFoundException");
  }
  name = "ResourceNotFoundException";
  $fault = "client";
  Message;
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
    this.Message = opts.Message;
  }
};
var StatusType = {
  Failed: "Failed",
  InProgress: "InProgress",
  InSync: "InSync"
};
var EncryptionFailure = class _EncryptionFailure extends SecretsManagerServiceException {
  static {
    __name(this, "EncryptionFailure");
  }
  name = "EncryptionFailure";
  $fault = "client";
  Message;
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "EncryptionFailure",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _EncryptionFailure.prototype);
    this.Message = opts.Message;
  }
};
var LimitExceededException = class _LimitExceededException extends SecretsManagerServiceException {
  static {
    __name(this, "LimitExceededException");
  }
  name = "LimitExceededException";
  $fault = "client";
  Message;
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
    this.Message = opts.Message;
  }
};
var MalformedPolicyDocumentException = class _MalformedPolicyDocumentException extends SecretsManagerServiceException {
  static {
    __name(this, "MalformedPolicyDocumentException");
  }
  name = "MalformedPolicyDocumentException";
  $fault = "client";
  Message;
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "MalformedPolicyDocumentException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _MalformedPolicyDocumentException.prototype);
    this.Message = opts.Message;
  }
};
var PreconditionNotMetException = class _PreconditionNotMetException extends SecretsManagerServiceException {
  static {
    __name(this, "PreconditionNotMetException");
  }
  name = "PreconditionNotMetException";
  $fault = "client";
  Message;
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "PreconditionNotMetException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _PreconditionNotMetException.prototype);
    this.Message = opts.Message;
  }
};
var ResourceExistsException = class _ResourceExistsException extends SecretsManagerServiceException {
  static {
    __name(this, "ResourceExistsException");
  }
  name = "ResourceExistsException";
  $fault = "client";
  Message;
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "ResourceExistsException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _ResourceExistsException.prototype);
    this.Message = opts.Message;
  }
};
var SortOrderType = {
  asc: "asc",
  desc: "desc"
};
var PublicPolicyException = class _PublicPolicyException extends SecretsManagerServiceException {
  static {
    __name(this, "PublicPolicyException");
  }
  name = "PublicPolicyException";
  $fault = "client";
  Message;
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "PublicPolicyException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _PublicPolicyException.prototype);
    this.Message = opts.Message;
  }
};
var SecretValueEntryFilterSensitiveLog = /* @__PURE__ */ __name((obj) => ({
  ...obj,
  ...obj.SecretBinary && { SecretBinary: import_smithy_client.SENSITIVE_STRING },
  ...obj.SecretString && { SecretString: import_smithy_client.SENSITIVE_STRING }
}), "SecretValueEntryFilterSensitiveLog");
var BatchGetSecretValueResponseFilterSensitiveLog = /* @__PURE__ */ __name((obj) => ({
  ...obj,
  ...obj.SecretValues && { SecretValues: obj.SecretValues.map((item) => SecretValueEntryFilterSensitiveLog(item)) }
}), "BatchGetSecretValueResponseFilterSensitiveLog");
var CreateSecretRequestFilterSensitiveLog = /* @__PURE__ */ __name((obj) => ({
  ...obj,
  ...obj.SecretBinary && { SecretBinary: import_smithy_client.SENSITIVE_STRING },
  ...obj.SecretString && { SecretString: import_smithy_client.SENSITIVE_STRING }
}), "CreateSecretRequestFilterSensitiveLog");
var GetRandomPasswordResponseFilterSensitiveLog = /* @__PURE__ */ __name((obj) => ({
  ...obj,
  ...obj.RandomPassword && { RandomPassword: import_smithy_client.SENSITIVE_STRING }
}), "GetRandomPasswordResponseFilterSensitiveLog");
var GetSecretValueResponseFilterSensitiveLog = /* @__PURE__ */ __name((obj) => ({
  ...obj,
  ...obj.SecretBinary && { SecretBinary: import_smithy_client.SENSITIVE_STRING },
  ...obj.SecretString && { SecretString: import_smithy_client.SENSITIVE_STRING }
}), "GetSecretValueResponseFilterSensitiveLog");
var PutSecretValueRequestFilterSensitiveLog = /* @__PURE__ */ __name((obj) => ({
  ...obj,
  ...obj.SecretBinary && { SecretBinary: import_smithy_client.SENSITIVE_STRING },
  ...obj.SecretString && { SecretString: import_smithy_client.SENSITIVE_STRING },
  ...obj.RotationToken && { RotationToken: import_smithy_client.SENSITIVE_STRING }
}), "PutSecretValueRequestFilterSensitiveLog");
var UpdateSecretRequestFilterSensitiveLog = /* @__PURE__ */ __name((obj) => ({
  ...obj,
  ...obj.SecretBinary && { SecretBinary: import_smithy_client.SENSITIVE_STRING },
  ...obj.SecretString && { SecretString: import_smithy_client.SENSITIVE_STRING }
}), "UpdateSecretRequestFilterSensitiveLog");

// src/protocols/Aws_json1_1.ts
var import_core2 = require("@aws-sdk/core");


var import_uuid = require("uuid");
var se_BatchGetSecretValueCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("BatchGetSecretValue");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_BatchGetSecretValueCommand");
var se_CancelRotateSecretCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("CancelRotateSecret");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_CancelRotateSecretCommand");
var se_CreateSecretCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("CreateSecret");
  let body;
  body = JSON.stringify(se_CreateSecretRequest(input, context));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_CreateSecretCommand");
var se_DeleteResourcePolicyCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("DeleteResourcePolicy");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_DeleteResourcePolicyCommand");
var se_DeleteSecretCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("DeleteSecret");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_DeleteSecretCommand");
var se_DescribeSecretCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("DescribeSecret");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_DescribeSecretCommand");
var se_GetRandomPasswordCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("GetRandomPassword");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_GetRandomPasswordCommand");
var se_GetResourcePolicyCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("GetResourcePolicy");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_GetResourcePolicyCommand");
var se_GetSecretValueCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("GetSecretValue");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_GetSecretValueCommand");
var se_ListSecretsCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("ListSecrets");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_ListSecretsCommand");
var se_ListSecretVersionIdsCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("ListSecretVersionIds");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_ListSecretVersionIdsCommand");
var se_PutResourcePolicyCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("PutResourcePolicy");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_PutResourcePolicyCommand");
var se_PutSecretValueCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("PutSecretValue");
  let body;
  body = JSON.stringify(se_PutSecretValueRequest(input, context));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_PutSecretValueCommand");
var se_RemoveRegionsFromReplicationCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("RemoveRegionsFromReplication");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_RemoveRegionsFromReplicationCommand");
var se_ReplicateSecretToRegionsCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("ReplicateSecretToRegions");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_ReplicateSecretToRegionsCommand");
var se_RestoreSecretCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("RestoreSecret");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_RestoreSecretCommand");
var se_RotateSecretCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("RotateSecret");
  let body;
  body = JSON.stringify(se_RotateSecretRequest(input, context));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_RotateSecretCommand");
var se_StopReplicationToReplicaCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("StopReplicationToReplica");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_StopReplicationToReplicaCommand");
var se_TagResourceCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("TagResource");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_TagResourceCommand");
var se_UntagResourceCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("UntagResource");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_UntagResourceCommand");
var se_UpdateSecretCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("UpdateSecret");
  let body;
  body = JSON.stringify(se_UpdateSecretRequest(input, context));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_UpdateSecretCommand");
var se_UpdateSecretVersionStageCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("UpdateSecretVersionStage");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_UpdateSecretVersionStageCommand");
var se_ValidateResourcePolicyCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = sharedHeaders("ValidateResourcePolicy");
  let body;
  body = JSON.stringify((0, import_smithy_client._json)(input));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_ValidateResourcePolicyCommand");
var de_BatchGetSecretValueCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const data = await (0, import_core2.parseJsonBody)(output.body, context);
  let contents = {};
  contents = de_BatchGetSecretValueResponse(data, context);
  const response = {
    $metadata: deserializeMetadata(output),
    ...contents
  };
  return response;
}, "de_BatchGetSecretValueCommand");
var de_CancelRotateSecretCommand = /* @__PURE__ */ __name(async (output, context) => {
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
}, "de_CancelRotateSecretCommand");
var de_CreateSecretCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const data = await (0, import_core2.parseJsonBody)(output.body, context);
  let contents = {};
  contents = de_CreateSecretResponse(data, context);
  const response = {
    $metadata: deserializeMetadata(output),
    ...contents
  };
  return response;
}, "de_CreateSecretCommand");
var de_DeleteResourcePolicyCommand = /* @__PURE__ */ __name(async (output, context) => {
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
}, "de_DeleteResourcePolicyCommand");
var de_DeleteSecretCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const data = await (0, import_core2.parseJsonBody)(output.body, context);
  let contents = {};
  contents = de_DeleteSecretResponse(data, context);
  const response = {
    $metadata: deserializeMetadata(output),
    ...contents
  };
  return response;
}, "de_DeleteSecretCommand");
var de_DescribeSecretCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const data = await (0, import_core2.parseJsonBody)(output.body, context);
  let contents = {};
  contents = de_DescribeSecretResponse(data, context);
  const response = {
    $metadata: deserializeMetadata(output),
    ...contents
  };
  return response;
}, "de_DescribeSecretCommand");
var de_GetRandomPasswordCommand = /* @__PURE__ */ __name(async (output, context) => {
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
}, "de_GetRandomPasswordCommand");
var de_GetResourcePolicyCommand = /* @__PURE__ */ __name(async (output, context) => {
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
}, "de_GetResourcePolicyCommand");
var de_GetSecretValueCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const data = await (0, import_core2.parseJsonBody)(output.body, context);
  let contents = {};
  contents = de_GetSecretValueResponse(data, context);
  const response = {
    $metadata: deserializeMetadata(output),
    ...contents
  };
  return response;
}, "de_GetSecretValueCommand");
var de_ListSecretsCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const data = await (0, import_core2.parseJsonBody)(output.body, context);
  let contents = {};
  contents = de_ListSecretsResponse(data, context);
  const response = {
    $metadata: deserializeMetadata(output),
    ...contents
  };
  return response;
}, "de_ListSecretsCommand");
var de_ListSecretVersionIdsCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const data = await (0, import_core2.parseJsonBody)(output.body, context);
  let contents = {};
  contents = de_ListSecretVersionIdsResponse(data, context);
  const response = {
    $metadata: deserializeMetadata(output),
    ...contents
  };
  return response;
}, "de_ListSecretVersionIdsCommand");
var de_PutResourcePolicyCommand = /* @__PURE__ */ __name(async (output, context) => {
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
}, "de_PutResourcePolicyCommand");
var de_PutSecretValueCommand = /* @__PURE__ */ __name(async (output, context) => {
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
}, "de_PutSecretValueCommand");
var de_RemoveRegionsFromReplicationCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const data = await (0, import_core2.parseJsonBody)(output.body, context);
  let contents = {};
  contents = de_RemoveRegionsFromReplicationResponse(data, context);
  const response = {
    $metadata: deserializeMetadata(output),
    ...contents
  };
  return response;
}, "de_RemoveRegionsFromReplicationCommand");
var de_ReplicateSecretToRegionsCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const data = await (0, import_core2.parseJsonBody)(output.body, context);
  let contents = {};
  contents = de_ReplicateSecretToRegionsResponse(data, context);
  const response = {
    $metadata: deserializeMetadata(output),
    ...contents
  };
  return response;
}, "de_ReplicateSecretToRegionsCommand");
var de_RestoreSecretCommand = /* @__PURE__ */ __name(async (output, context) => {
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
}, "de_RestoreSecretCommand");
var de_RotateSecretCommand = /* @__PURE__ */ __name(async (output, context) => {
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
}, "de_RotateSecretCommand");
var de_StopReplicationToReplicaCommand = /* @__PURE__ */ __name(async (output, context) => {
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
}, "de_StopReplicationToReplicaCommand");
var de_TagResourceCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  await (0, import_smithy_client.collectBody)(output.body, context);
  const response = {
    $metadata: deserializeMetadata(output)
  };
  return response;
}, "de_TagResourceCommand");
var de_UntagResourceCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  await (0, import_smithy_client.collectBody)(output.body, context);
  const response = {
    $metadata: deserializeMetadata(output)
  };
  return response;
}, "de_UntagResourceCommand");
var de_UpdateSecretCommand = /* @__PURE__ */ __name(async (output, context) => {
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
}, "de_UpdateSecretCommand");
var de_UpdateSecretVersionStageCommand = /* @__PURE__ */ __name(async (output, context) => {
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
}, "de_UpdateSecretVersionStageCommand");
var de_ValidateResourcePolicyCommand = /* @__PURE__ */ __name(async (output, context) => {
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
}, "de_ValidateResourcePolicyCommand");
var de_CommandError = /* @__PURE__ */ __name(async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await (0, import_core2.parseJsonErrorBody)(output.body, context)
  };
  const errorCode = (0, import_core2.loadRestJsonErrorCode)(output, parsedOutput.body);
  switch (errorCode) {
    case "DecryptionFailure":
    case "com.amazonaws.secretsmanager#DecryptionFailure":
      throw await de_DecryptionFailureRes(parsedOutput, context);
    case "InternalServiceError":
    case "com.amazonaws.secretsmanager#InternalServiceError":
      throw await de_InternalServiceErrorRes(parsedOutput, context);
    case "InvalidNextTokenException":
    case "com.amazonaws.secretsmanager#InvalidNextTokenException":
      throw await de_InvalidNextTokenExceptionRes(parsedOutput, context);
    case "InvalidParameterException":
    case "com.amazonaws.secretsmanager#InvalidParameterException":
      throw await de_InvalidParameterExceptionRes(parsedOutput, context);
    case "InvalidRequestException":
    case "com.amazonaws.secretsmanager#InvalidRequestException":
      throw await de_InvalidRequestExceptionRes(parsedOutput, context);
    case "ResourceNotFoundException":
    case "com.amazonaws.secretsmanager#ResourceNotFoundException":
      throw await de_ResourceNotFoundExceptionRes(parsedOutput, context);
    case "EncryptionFailure":
    case "com.amazonaws.secretsmanager#EncryptionFailure":
      throw await de_EncryptionFailureRes(parsedOutput, context);
    case "LimitExceededException":
    case "com.amazonaws.secretsmanager#LimitExceededException":
      throw await de_LimitExceededExceptionRes(parsedOutput, context);
    case "MalformedPolicyDocumentException":
    case "com.amazonaws.secretsmanager#MalformedPolicyDocumentException":
      throw await de_MalformedPolicyDocumentExceptionRes(parsedOutput, context);
    case "PreconditionNotMetException":
    case "com.amazonaws.secretsmanager#PreconditionNotMetException":
      throw await de_PreconditionNotMetExceptionRes(parsedOutput, context);
    case "ResourceExistsException":
    case "com.amazonaws.secretsmanager#ResourceExistsException":
      throw await de_ResourceExistsExceptionRes(parsedOutput, context);
    case "PublicPolicyException":
    case "com.amazonaws.secretsmanager#PublicPolicyException":
      throw await de_PublicPolicyExceptionRes(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      return throwDefaultError({
        output,
        parsedBody,
        errorCode
      });
  }
}, "de_CommandError");
var de_DecryptionFailureRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = (0, import_smithy_client._json)(body);
  const exception = new DecryptionFailure({
    $metadata: deserializeMetadata(parsedOutput),
    ...deserialized
  });
  return (0, import_smithy_client.decorateServiceException)(exception, body);
}, "de_DecryptionFailureRes");
var de_EncryptionFailureRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = (0, import_smithy_client._json)(body);
  const exception = new EncryptionFailure({
    $metadata: deserializeMetadata(parsedOutput),
    ...deserialized
  });
  return (0, import_smithy_client.decorateServiceException)(exception, body);
}, "de_EncryptionFailureRes");
var de_InternalServiceErrorRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = (0, import_smithy_client._json)(body);
  const exception = new InternalServiceError({
    $metadata: deserializeMetadata(parsedOutput),
    ...deserialized
  });
  return (0, import_smithy_client.decorateServiceException)(exception, body);
}, "de_InternalServiceErrorRes");
var de_InvalidNextTokenExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = (0, import_smithy_client._json)(body);
  const exception = new InvalidNextTokenException({
    $metadata: deserializeMetadata(parsedOutput),
    ...deserialized
  });
  return (0, import_smithy_client.decorateServiceException)(exception, body);
}, "de_InvalidNextTokenExceptionRes");
var de_InvalidParameterExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = (0, import_smithy_client._json)(body);
  const exception = new InvalidParameterException({
    $metadata: deserializeMetadata(parsedOutput),
    ...deserialized
  });
  return (0, import_smithy_client.decorateServiceException)(exception, body);
}, "de_InvalidParameterExceptionRes");
var de_InvalidRequestExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = (0, import_smithy_client._json)(body);
  const exception = new InvalidRequestException({
    $metadata: deserializeMetadata(parsedOutput),
    ...deserialized
  });
  return (0, import_smithy_client.decorateServiceException)(exception, body);
}, "de_InvalidRequestExceptionRes");
var de_LimitExceededExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = (0, import_smithy_client._json)(body);
  const exception = new LimitExceededException({
    $metadata: deserializeMetadata(parsedOutput),
    ...deserialized
  });
  return (0, import_smithy_client.decorateServiceException)(exception, body);
}, "de_LimitExceededExceptionRes");
var de_MalformedPolicyDocumentExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = (0, import_smithy_client._json)(body);
  const exception = new MalformedPolicyDocumentException({
    $metadata: deserializeMetadata(parsedOutput),
    ...deserialized
  });
  return (0, import_smithy_client.decorateServiceException)(exception, body);
}, "de_MalformedPolicyDocumentExceptionRes");
var de_PreconditionNotMetExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = (0, import_smithy_client._json)(body);
  const exception = new PreconditionNotMetException({
    $metadata: deserializeMetadata(parsedOutput),
    ...deserialized
  });
  return (0, import_smithy_client.decorateServiceException)(exception, body);
}, "de_PreconditionNotMetExceptionRes");
var de_PublicPolicyExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = (0, import_smithy_client._json)(body);
  const exception = new PublicPolicyException({
    $metadata: deserializeMetadata(parsedOutput),
    ...deserialized
  });
  return (0, import_smithy_client.decorateServiceException)(exception, body);
}, "de_PublicPolicyExceptionRes");
var de_ResourceExistsExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = (0, import_smithy_client._json)(body);
  const exception = new ResourceExistsException({
    $metadata: deserializeMetadata(parsedOutput),
    ...deserialized
  });
  return (0, import_smithy_client.decorateServiceException)(exception, body);
}, "de_ResourceExistsExceptionRes");
var de_ResourceNotFoundExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = (0, import_smithy_client._json)(body);
  const exception = new ResourceNotFoundException({
    $metadata: deserializeMetadata(parsedOutput),
    ...deserialized
  });
  return (0, import_smithy_client.decorateServiceException)(exception, body);
}, "de_ResourceNotFoundExceptionRes");
var se_CreateSecretRequest = /* @__PURE__ */ __name((input, context) => {
  return (0, import_smithy_client.take)(input, {
    AddReplicaRegions: import_smithy_client._json,
    ClientRequestToken: [true, (_) => _ ?? (0, import_uuid.v4)()],
    Description: [],
    ForceOverwriteReplicaSecret: [],
    KmsKeyId: [],
    Name: [],
    SecretBinary: context.base64Encoder,
    SecretString: [],
    Tags: import_smithy_client._json
  });
}, "se_CreateSecretRequest");
var se_PutSecretValueRequest = /* @__PURE__ */ __name((input, context) => {
  return (0, import_smithy_client.take)(input, {
    ClientRequestToken: [true, (_) => _ ?? (0, import_uuid.v4)()],
    RotationToken: [],
    SecretBinary: context.base64Encoder,
    SecretId: [],
    SecretString: [],
    VersionStages: import_smithy_client._json
  });
}, "se_PutSecretValueRequest");
var se_RotateSecretRequest = /* @__PURE__ */ __name((input, context) => {
  return (0, import_smithy_client.take)(input, {
    ClientRequestToken: [true, (_) => _ ?? (0, import_uuid.v4)()],
    RotateImmediately: [],
    RotationLambdaARN: [],
    RotationRules: import_smithy_client._json,
    SecretId: []
  });
}, "se_RotateSecretRequest");
var se_UpdateSecretRequest = /* @__PURE__ */ __name((input, context) => {
  return (0, import_smithy_client.take)(input, {
    ClientRequestToken: [true, (_) => _ ?? (0, import_uuid.v4)()],
    Description: [],
    KmsKeyId: [],
    SecretBinary: context.base64Encoder,
    SecretId: [],
    SecretString: []
  });
}, "se_UpdateSecretRequest");
var de_BatchGetSecretValueResponse = /* @__PURE__ */ __name((output, context) => {
  return (0, import_smithy_client.take)(output, {
    Errors: import_smithy_client._json,
    NextToken: import_smithy_client.expectString,
    SecretValues: /* @__PURE__ */ __name((_) => de_SecretValuesType(_, context), "SecretValues")
  });
}, "de_BatchGetSecretValueResponse");
var de_CreateSecretResponse = /* @__PURE__ */ __name((output, context) => {
  return (0, import_smithy_client.take)(output, {
    ARN: import_smithy_client.expectString,
    Name: import_smithy_client.expectString,
    ReplicationStatus: /* @__PURE__ */ __name((_) => de_ReplicationStatusListType(_, context), "ReplicationStatus"),
    VersionId: import_smithy_client.expectString
  });
}, "de_CreateSecretResponse");
var de_DeleteSecretResponse = /* @__PURE__ */ __name((output, context) => {
  return (0, import_smithy_client.take)(output, {
    ARN: import_smithy_client.expectString,
    DeletionDate: /* @__PURE__ */ __name((_) => (0, import_smithy_client.expectNonNull)((0, import_smithy_client.parseEpochTimestamp)((0, import_smithy_client.expectNumber)(_))), "DeletionDate"),
    Name: import_smithy_client.expectString
  });
}, "de_DeleteSecretResponse");
var de_DescribeSecretResponse = /* @__PURE__ */ __name((output, context) => {
  return (0, import_smithy_client.take)(output, {
    ARN: import_smithy_client.expectString,
    CreatedDate: /* @__PURE__ */ __name((_) => (0, import_smithy_client.expectNonNull)((0, import_smithy_client.parseEpochTimestamp)((0, import_smithy_client.expectNumber)(_))), "CreatedDate"),
    DeletedDate: /* @__PURE__ */ __name((_) => (0, import_smithy_client.expectNonNull)((0, import_smithy_client.parseEpochTimestamp)((0, import_smithy_client.expectNumber)(_))), "DeletedDate"),
    Description: import_smithy_client.expectString,
    KmsKeyId: import_smithy_client.expectString,
    LastAccessedDate: /* @__PURE__ */ __name((_) => (0, import_smithy_client.expectNonNull)((0, import_smithy_client.parseEpochTimestamp)((0, import_smithy_client.expectNumber)(_))), "LastAccessedDate"),
    LastChangedDate: /* @__PURE__ */ __name((_) => (0, import_smithy_client.expectNonNull)((0, import_smithy_client.parseEpochTimestamp)((0, import_smithy_client.expectNumber)(_))), "LastChangedDate"),
    LastRotatedDate: /* @__PURE__ */ __name((_) => (0, import_smithy_client.expectNonNull)((0, import_smithy_client.parseEpochTimestamp)((0, import_smithy_client.expectNumber)(_))), "LastRotatedDate"),
    Name: import_smithy_client.expectString,
    NextRotationDate: /* @__PURE__ */ __name((_) => (0, import_smithy_client.expectNonNull)((0, import_smithy_client.parseEpochTimestamp)((0, import_smithy_client.expectNumber)(_))), "NextRotationDate"),
    OwningService: import_smithy_client.expectString,
    PrimaryRegion: import_smithy_client.expectString,
    ReplicationStatus: /* @__PURE__ */ __name((_) => de_ReplicationStatusListType(_, context), "ReplicationStatus"),
    RotationEnabled: import_smithy_client.expectBoolean,
    RotationLambdaARN: import_smithy_client.expectString,
    RotationRules: import_smithy_client._json,
    Tags: import_smithy_client._json,
    VersionIdsToStages: import_smithy_client._json
  });
}, "de_DescribeSecretResponse");
var de_GetSecretValueResponse = /* @__PURE__ */ __name((output, context) => {
  return (0, import_smithy_client.take)(output, {
    ARN: import_smithy_client.expectString,
    CreatedDate: /* @__PURE__ */ __name((_) => (0, import_smithy_client.expectNonNull)((0, import_smithy_client.parseEpochTimestamp)((0, import_smithy_client.expectNumber)(_))), "CreatedDate"),
    Name: import_smithy_client.expectString,
    SecretBinary: context.base64Decoder,
    SecretString: import_smithy_client.expectString,
    VersionId: import_smithy_client.expectString,
    VersionStages: import_smithy_client._json
  });
}, "de_GetSecretValueResponse");
var de_ListSecretsResponse = /* @__PURE__ */ __name((output, context) => {
  return (0, import_smithy_client.take)(output, {
    NextToken: import_smithy_client.expectString,
    SecretList: /* @__PURE__ */ __name((_) => de_SecretListType(_, context), "SecretList")
  });
}, "de_ListSecretsResponse");
var de_ListSecretVersionIdsResponse = /* @__PURE__ */ __name((output, context) => {
  return (0, import_smithy_client.take)(output, {
    ARN: import_smithy_client.expectString,
    Name: import_smithy_client.expectString,
    NextToken: import_smithy_client.expectString,
    Versions: /* @__PURE__ */ __name((_) => de_SecretVersionsListType(_, context), "Versions")
  });
}, "de_ListSecretVersionIdsResponse");
var de_RemoveRegionsFromReplicationResponse = /* @__PURE__ */ __name((output, context) => {
  return (0, import_smithy_client.take)(output, {
    ARN: import_smithy_client.expectString,
    ReplicationStatus: /* @__PURE__ */ __name((_) => de_ReplicationStatusListType(_, context), "ReplicationStatus")
  });
}, "de_RemoveRegionsFromReplicationResponse");
var de_ReplicateSecretToRegionsResponse = /* @__PURE__ */ __name((output, context) => {
  return (0, import_smithy_client.take)(output, {
    ARN: import_smithy_client.expectString,
    ReplicationStatus: /* @__PURE__ */ __name((_) => de_ReplicationStatusListType(_, context), "ReplicationStatus")
  });
}, "de_ReplicateSecretToRegionsResponse");
var de_ReplicationStatusListType = /* @__PURE__ */ __name((output, context) => {
  const retVal = (output || []).filter((e) => e != null).map((entry) => {
    return de_ReplicationStatusType(entry, context);
  });
  return retVal;
}, "de_ReplicationStatusListType");
var de_ReplicationStatusType = /* @__PURE__ */ __name((output, context) => {
  return (0, import_smithy_client.take)(output, {
    KmsKeyId: import_smithy_client.expectString,
    LastAccessedDate: /* @__PURE__ */ __name((_) => (0, import_smithy_client.expectNonNull)((0, import_smithy_client.parseEpochTimestamp)((0, import_smithy_client.expectNumber)(_))), "LastAccessedDate"),
    Region: import_smithy_client.expectString,
    Status: import_smithy_client.expectString,
    StatusMessage: import_smithy_client.expectString
  });
}, "de_ReplicationStatusType");
var de_SecretListEntry = /* @__PURE__ */ __name((output, context) => {
  return (0, import_smithy_client.take)(output, {
    ARN: import_smithy_client.expectString,
    CreatedDate: /* @__PURE__ */ __name((_) => (0, import_smithy_client.expectNonNull)((0, import_smithy_client.parseEpochTimestamp)((0, import_smithy_client.expectNumber)(_))), "CreatedDate"),
    DeletedDate: /* @__PURE__ */ __name((_) => (0, import_smithy_client.expectNonNull)((0, import_smithy_client.parseEpochTimestamp)((0, import_smithy_client.expectNumber)(_))), "DeletedDate"),
    Description: import_smithy_client.expectString,
    KmsKeyId: import_smithy_client.expectString,
    LastAccessedDate: /* @__PURE__ */ __name((_) => (0, import_smithy_client.expectNonNull)((0, import_smithy_client.parseEpochTimestamp)((0, import_smithy_client.expectNumber)(_))), "LastAccessedDate"),
    LastChangedDate: /* @__PURE__ */ __name((_) => (0, import_smithy_client.expectNonNull)((0, import_smithy_client.parseEpochTimestamp)((0, import_smithy_client.expectNumber)(_))), "LastChangedDate"),
    LastRotatedDate: /* @__PURE__ */ __name((_) => (0, import_smithy_client.expectNonNull)((0, import_smithy_client.parseEpochTimestamp)((0, import_smithy_client.expectNumber)(_))), "LastRotatedDate"),
    Name: import_smithy_client.expectString,
    NextRotationDate: /* @__PURE__ */ __name((_) => (0, import_smithy_client.expectNonNull)((0, import_smithy_client.parseEpochTimestamp)((0, import_smithy_client.expectNumber)(_))), "NextRotationDate"),
    OwningService: import_smithy_client.expectString,
    PrimaryRegion: import_smithy_client.expectString,
    RotationEnabled: import_smithy_client.expectBoolean,
    RotationLambdaARN: import_smithy_client.expectString,
    RotationRules: import_smithy_client._json,
    SecretVersionsToStages: import_smithy_client._json,
    Tags: import_smithy_client._json
  });
}, "de_SecretListEntry");
var de_SecretListType = /* @__PURE__ */ __name((output, context) => {
  const retVal = (output || []).filter((e) => e != null).map((entry) => {
    return de_SecretListEntry(entry, context);
  });
  return retVal;
}, "de_SecretListType");
var de_SecretValueEntry = /* @__PURE__ */ __name((output, context) => {
  return (0, import_smithy_client.take)(output, {
    ARN: import_smithy_client.expectString,
    CreatedDate: /* @__PURE__ */ __name((_) => (0, import_smithy_client.expectNonNull)((0, import_smithy_client.parseEpochTimestamp)((0, import_smithy_client.expectNumber)(_))), "CreatedDate"),
    Name: import_smithy_client.expectString,
    SecretBinary: context.base64Decoder,
    SecretString: import_smithy_client.expectString,
    VersionId: import_smithy_client.expectString,
    VersionStages: import_smithy_client._json
  });
}, "de_SecretValueEntry");
var de_SecretValuesType = /* @__PURE__ */ __name((output, context) => {
  const retVal = (output || []).filter((e) => e != null).map((entry) => {
    return de_SecretValueEntry(entry, context);
  });
  return retVal;
}, "de_SecretValuesType");
var de_SecretVersionsListEntry = /* @__PURE__ */ __name((output, context) => {
  return (0, import_smithy_client.take)(output, {
    CreatedDate: /* @__PURE__ */ __name((_) => (0, import_smithy_client.expectNonNull)((0, import_smithy_client.parseEpochTimestamp)((0, import_smithy_client.expectNumber)(_))), "CreatedDate"),
    KmsKeyIds: import_smithy_client._json,
    LastAccessedDate: /* @__PURE__ */ __name((_) => (0, import_smithy_client.expectNonNull)((0, import_smithy_client.parseEpochTimestamp)((0, import_smithy_client.expectNumber)(_))), "LastAccessedDate"),
    VersionId: import_smithy_client.expectString,
    VersionStages: import_smithy_client._json
  });
}, "de_SecretVersionsListEntry");
var de_SecretVersionsListType = /* @__PURE__ */ __name((output, context) => {
  const retVal = (output || []).filter((e) => e != null).map((entry) => {
    return de_SecretVersionsListEntry(entry, context);
  });
  return retVal;
}, "de_SecretVersionsListType");
var deserializeMetadata = /* @__PURE__ */ __name((output) => ({
  httpStatusCode: output.statusCode,
  requestId: output.headers["x-amzn-requestid"] ?? output.headers["x-amzn-request-id"] ?? output.headers["x-amz-request-id"],
  extendedRequestId: output.headers["x-amz-id-2"],
  cfId: output.headers["x-amz-cf-id"]
}), "deserializeMetadata");
var throwDefaultError = (0, import_smithy_client.withBaseException)(SecretsManagerServiceException);
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
    "x-amz-target": `secretsmanager.${operation}`
  };
}
__name(sharedHeaders, "sharedHeaders");

// src/commands/BatchGetSecretValueCommand.ts
var BatchGetSecretValueCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("secretsmanager", "BatchGetSecretValue", {}).n("SecretsManagerClient", "BatchGetSecretValueCommand").f(void 0, BatchGetSecretValueResponseFilterSensitiveLog).ser(se_BatchGetSecretValueCommand).de(de_BatchGetSecretValueCommand).build() {
  static {
    __name(this, "BatchGetSecretValueCommand");
  }
};

// src/commands/CancelRotateSecretCommand.ts



var CancelRotateSecretCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("secretsmanager", "CancelRotateSecret", {}).n("SecretsManagerClient", "CancelRotateSecretCommand").f(void 0, void 0).ser(se_CancelRotateSecretCommand).de(de_CancelRotateSecretCommand).build() {
  static {
    __name(this, "CancelRotateSecretCommand");
  }
};

// src/commands/CreateSecretCommand.ts



var CreateSecretCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("secretsmanager", "CreateSecret", {}).n("SecretsManagerClient", "CreateSecretCommand").f(CreateSecretRequestFilterSensitiveLog, void 0).ser(se_CreateSecretCommand).de(de_CreateSecretCommand).build() {
  static {
    __name(this, "CreateSecretCommand");
  }
};

// src/commands/DeleteResourcePolicyCommand.ts



var DeleteResourcePolicyCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("secretsmanager", "DeleteResourcePolicy", {}).n("SecretsManagerClient", "DeleteResourcePolicyCommand").f(void 0, void 0).ser(se_DeleteResourcePolicyCommand).de(de_DeleteResourcePolicyCommand).build() {
  static {
    __name(this, "DeleteResourcePolicyCommand");
  }
};

// src/commands/DeleteSecretCommand.ts



var DeleteSecretCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("secretsmanager", "DeleteSecret", {}).n("SecretsManagerClient", "DeleteSecretCommand").f(void 0, void 0).ser(se_DeleteSecretCommand).de(de_DeleteSecretCommand).build() {
  static {
    __name(this, "DeleteSecretCommand");
  }
};

// src/commands/DescribeSecretCommand.ts



var DescribeSecretCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("secretsmanager", "DescribeSecret", {}).n("SecretsManagerClient", "DescribeSecretCommand").f(void 0, void 0).ser(se_DescribeSecretCommand).de(de_DescribeSecretCommand).build() {
  static {
    __name(this, "DescribeSecretCommand");
  }
};

// src/commands/GetRandomPasswordCommand.ts



var GetRandomPasswordCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("secretsmanager", "GetRandomPassword", {}).n("SecretsManagerClient", "GetRandomPasswordCommand").f(void 0, GetRandomPasswordResponseFilterSensitiveLog).ser(se_GetRandomPasswordCommand).de(de_GetRandomPasswordCommand).build() {
  static {
    __name(this, "GetRandomPasswordCommand");
  }
};

// src/commands/GetResourcePolicyCommand.ts



var GetResourcePolicyCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("secretsmanager", "GetResourcePolicy", {}).n("SecretsManagerClient", "GetResourcePolicyCommand").f(void 0, void 0).ser(se_GetResourcePolicyCommand).de(de_GetResourcePolicyCommand).build() {
  static {
    __name(this, "GetResourcePolicyCommand");
  }
};

// src/commands/GetSecretValueCommand.ts



var GetSecretValueCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("secretsmanager", "GetSecretValue", {}).n("SecretsManagerClient", "GetSecretValueCommand").f(void 0, GetSecretValueResponseFilterSensitiveLog).ser(se_GetSecretValueCommand).de(de_GetSecretValueCommand).build() {
  static {
    __name(this, "GetSecretValueCommand");
  }
};

// src/commands/ListSecretsCommand.ts



var ListSecretsCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("secretsmanager", "ListSecrets", {}).n("SecretsManagerClient", "ListSecretsCommand").f(void 0, void 0).ser(se_ListSecretsCommand).de(de_ListSecretsCommand).build() {
  static {
    __name(this, "ListSecretsCommand");
  }
};

// src/commands/ListSecretVersionIdsCommand.ts



var ListSecretVersionIdsCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("secretsmanager", "ListSecretVersionIds", {}).n("SecretsManagerClient", "ListSecretVersionIdsCommand").f(void 0, void 0).ser(se_ListSecretVersionIdsCommand).de(de_ListSecretVersionIdsCommand).build() {
  static {
    __name(this, "ListSecretVersionIdsCommand");
  }
};

// src/commands/PutResourcePolicyCommand.ts



var PutResourcePolicyCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("secretsmanager", "PutResourcePolicy", {}).n("SecretsManagerClient", "PutResourcePolicyCommand").f(void 0, void 0).ser(se_PutResourcePolicyCommand).de(de_PutResourcePolicyCommand).build() {
  static {
    __name(this, "PutResourcePolicyCommand");
  }
};

// src/commands/PutSecretValueCommand.ts



var PutSecretValueCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("secretsmanager", "PutSecretValue", {}).n("SecretsManagerClient", "PutSecretValueCommand").f(PutSecretValueRequestFilterSensitiveLog, void 0).ser(se_PutSecretValueCommand).de(de_PutSecretValueCommand).build() {
  static {
    __name(this, "PutSecretValueCommand");
  }
};

// src/commands/RemoveRegionsFromReplicationCommand.ts



var RemoveRegionsFromReplicationCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("secretsmanager", "RemoveRegionsFromReplication", {}).n("SecretsManagerClient", "RemoveRegionsFromReplicationCommand").f(void 0, void 0).ser(se_RemoveRegionsFromReplicationCommand).de(de_RemoveRegionsFromReplicationCommand).build() {
  static {
    __name(this, "RemoveRegionsFromReplicationCommand");
  }
};

// src/commands/ReplicateSecretToRegionsCommand.ts



var ReplicateSecretToRegionsCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("secretsmanager", "ReplicateSecretToRegions", {}).n("SecretsManagerClient", "ReplicateSecretToRegionsCommand").f(void 0, void 0).ser(se_ReplicateSecretToRegionsCommand).de(de_ReplicateSecretToRegionsCommand).build() {
  static {
    __name(this, "ReplicateSecretToRegionsCommand");
  }
};

// src/commands/RestoreSecretCommand.ts



var RestoreSecretCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("secretsmanager", "RestoreSecret", {}).n("SecretsManagerClient", "RestoreSecretCommand").f(void 0, void 0).ser(se_RestoreSecretCommand).de(de_RestoreSecretCommand).build() {
  static {
    __name(this, "RestoreSecretCommand");
  }
};

// src/commands/RotateSecretCommand.ts



var RotateSecretCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("secretsmanager", "RotateSecret", {}).n("SecretsManagerClient", "RotateSecretCommand").f(void 0, void 0).ser(se_RotateSecretCommand).de(de_RotateSecretCommand).build() {
  static {
    __name(this, "RotateSecretCommand");
  }
};

// src/commands/StopReplicationToReplicaCommand.ts



var StopReplicationToReplicaCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("secretsmanager", "StopReplicationToReplica", {}).n("SecretsManagerClient", "StopReplicationToReplicaCommand").f(void 0, void 0).ser(se_StopReplicationToReplicaCommand).de(de_StopReplicationToReplicaCommand).build() {
  static {
    __name(this, "StopReplicationToReplicaCommand");
  }
};

// src/commands/TagResourceCommand.ts



var TagResourceCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("secretsmanager", "TagResource", {}).n("SecretsManagerClient", "TagResourceCommand").f(void 0, void 0).ser(se_TagResourceCommand).de(de_TagResourceCommand).build() {
  static {
    __name(this, "TagResourceCommand");
  }
};

// src/commands/UntagResourceCommand.ts



var UntagResourceCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("secretsmanager", "UntagResource", {}).n("SecretsManagerClient", "UntagResourceCommand").f(void 0, void 0).ser(se_UntagResourceCommand).de(de_UntagResourceCommand).build() {
  static {
    __name(this, "UntagResourceCommand");
  }
};

// src/commands/UpdateSecretCommand.ts



var UpdateSecretCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("secretsmanager", "UpdateSecret", {}).n("SecretsManagerClient", "UpdateSecretCommand").f(UpdateSecretRequestFilterSensitiveLog, void 0).ser(se_UpdateSecretCommand).de(de_UpdateSecretCommand).build() {
  static {
    __name(this, "UpdateSecretCommand");
  }
};

// src/commands/UpdateSecretVersionStageCommand.ts



var UpdateSecretVersionStageCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("secretsmanager", "UpdateSecretVersionStage", {}).n("SecretsManagerClient", "UpdateSecretVersionStageCommand").f(void 0, void 0).ser(se_UpdateSecretVersionStageCommand).de(de_UpdateSecretVersionStageCommand).build() {
  static {
    __name(this, "UpdateSecretVersionStageCommand");
  }
};

// src/commands/ValidateResourcePolicyCommand.ts



var ValidateResourcePolicyCommand = class extends import_smithy_client.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("secretsmanager", "ValidateResourcePolicy", {}).n("SecretsManagerClient", "ValidateResourcePolicyCommand").f(void 0, void 0).ser(se_ValidateResourcePolicyCommand).de(de_ValidateResourcePolicyCommand).build() {
  static {
    __name(this, "ValidateResourcePolicyCommand");
  }
};

// src/SecretsManager.ts
var commands = {
  BatchGetSecretValueCommand,
  CancelRotateSecretCommand,
  CreateSecretCommand,
  DeleteResourcePolicyCommand,
  DeleteSecretCommand,
  DescribeSecretCommand,
  GetRandomPasswordCommand,
  GetResourcePolicyCommand,
  GetSecretValueCommand,
  ListSecretsCommand,
  ListSecretVersionIdsCommand,
  PutResourcePolicyCommand,
  PutSecretValueCommand,
  RemoveRegionsFromReplicationCommand,
  ReplicateSecretToRegionsCommand,
  RestoreSecretCommand,
  RotateSecretCommand,
  StopReplicationToReplicaCommand,
  TagResourceCommand,
  UntagResourceCommand,
  UpdateSecretCommand,
  UpdateSecretVersionStageCommand,
  ValidateResourcePolicyCommand
};
var SecretsManager = class extends SecretsManagerClient {
  static {
    __name(this, "SecretsManager");
  }
};
(0, import_smithy_client.createAggregatedClient)(commands, SecretsManager);

// src/pagination/BatchGetSecretValuePaginator.ts

var paginateBatchGetSecretValue = (0, import_core.createPaginator)(SecretsManagerClient, BatchGetSecretValueCommand, "NextToken", "NextToken", "MaxResults");

// src/pagination/ListSecretVersionIdsPaginator.ts

var paginateListSecretVersionIds = (0, import_core.createPaginator)(SecretsManagerClient, ListSecretVersionIdsCommand, "NextToken", "NextToken", "MaxResults");

// src/pagination/ListSecretsPaginator.ts

var paginateListSecrets = (0, import_core.createPaginator)(SecretsManagerClient, ListSecretsCommand, "NextToken", "NextToken", "MaxResults");
// Annotate the CommonJS export names for ESM import in node:

0 && (module.exports = {
  SecretsManagerServiceException,
  __Client,
  SecretsManagerClient,
  SecretsManager,
  $Command,
  BatchGetSecretValueCommand,
  CancelRotateSecretCommand,
  CreateSecretCommand,
  DeleteResourcePolicyCommand,
  DeleteSecretCommand,
  DescribeSecretCommand,
  GetRandomPasswordCommand,
  GetResourcePolicyCommand,
  GetSecretValueCommand,
  ListSecretVersionIdsCommand,
  ListSecretsCommand,
  PutResourcePolicyCommand,
  PutSecretValueCommand,
  RemoveRegionsFromReplicationCommand,
  ReplicateSecretToRegionsCommand,
  RestoreSecretCommand,
  RotateSecretCommand,
  StopReplicationToReplicaCommand,
  TagResourceCommand,
  UntagResourceCommand,
  UpdateSecretCommand,
  UpdateSecretVersionStageCommand,
  ValidateResourcePolicyCommand,
  paginateBatchGetSecretValue,
  paginateListSecretVersionIds,
  paginateListSecrets,
  FilterNameStringType,
  DecryptionFailure,
  InternalServiceError,
  InvalidNextTokenException,
  InvalidParameterException,
  InvalidRequestException,
  ResourceNotFoundException,
  StatusType,
  EncryptionFailure,
  LimitExceededException,
  MalformedPolicyDocumentException,
  PreconditionNotMetException,
  ResourceExistsException,
  SortOrderType,
  PublicPolicyException,
  SecretValueEntryFilterSensitiveLog,
  BatchGetSecretValueResponseFilterSensitiveLog,
  CreateSecretRequestFilterSensitiveLog,
  GetRandomPasswordResponseFilterSensitiveLog,
  GetSecretValueResponseFilterSensitiveLog,
  PutSecretValueRequestFilterSensitiveLog,
  UpdateSecretRequestFilterSensitiveLog
});

