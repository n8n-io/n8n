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
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/submodules/sts/index.ts
var index_exports = {};
__export(index_exports, {
  AssumeRoleCommand: () => AssumeRoleCommand,
  AssumeRoleResponseFilterSensitiveLog: () => AssumeRoleResponseFilterSensitiveLog,
  AssumeRoleWithWebIdentityCommand: () => AssumeRoleWithWebIdentityCommand,
  AssumeRoleWithWebIdentityRequestFilterSensitiveLog: () => AssumeRoleWithWebIdentityRequestFilterSensitiveLog,
  AssumeRoleWithWebIdentityResponseFilterSensitiveLog: () => AssumeRoleWithWebIdentityResponseFilterSensitiveLog,
  ClientInputEndpointParameters: () => import_EndpointParameters3.ClientInputEndpointParameters,
  CredentialsFilterSensitiveLog: () => CredentialsFilterSensitiveLog,
  ExpiredTokenException: () => ExpiredTokenException,
  IDPCommunicationErrorException: () => IDPCommunicationErrorException,
  IDPRejectedClaimException: () => IDPRejectedClaimException,
  InvalidIdentityTokenException: () => InvalidIdentityTokenException,
  MalformedPolicyDocumentException: () => MalformedPolicyDocumentException,
  PackedPolicyTooLargeException: () => PackedPolicyTooLargeException,
  RegionDisabledException: () => RegionDisabledException,
  STS: () => STS,
  STSServiceException: () => STSServiceException,
  decorateDefaultCredentialProvider: () => decorateDefaultCredentialProvider,
  getDefaultRoleAssumer: () => getDefaultRoleAssumer2,
  getDefaultRoleAssumerWithWebIdentity: () => getDefaultRoleAssumerWithWebIdentity2
});
module.exports = __toCommonJS(index_exports);
__reExport(index_exports, require("./STSClient"), module.exports);

// src/submodules/sts/STS.ts
var import_smithy_client6 = require("@smithy/smithy-client");

// src/submodules/sts/commands/AssumeRoleCommand.ts
var import_middleware_endpoint = require("@smithy/middleware-endpoint");
var import_middleware_serde = require("@smithy/middleware-serde");
var import_smithy_client4 = require("@smithy/smithy-client");
var import_EndpointParameters = require("./endpoint/EndpointParameters");

// src/submodules/sts/models/models_0.ts
var import_smithy_client2 = require("@smithy/smithy-client");

// src/submodules/sts/models/STSServiceException.ts
var import_smithy_client = require("@smithy/smithy-client");
var STSServiceException = class _STSServiceException extends import_smithy_client.ServiceException {
  static {
    __name(this, "STSServiceException");
  }
  /**
   * @internal
   */
  constructor(options) {
    super(options);
    Object.setPrototypeOf(this, _STSServiceException.prototype);
  }
};

// src/submodules/sts/models/models_0.ts
var CredentialsFilterSensitiveLog = /* @__PURE__ */ __name((obj) => ({
  ...obj,
  ...obj.SecretAccessKey && { SecretAccessKey: import_smithy_client2.SENSITIVE_STRING }
}), "CredentialsFilterSensitiveLog");
var AssumeRoleResponseFilterSensitiveLog = /* @__PURE__ */ __name((obj) => ({
  ...obj,
  ...obj.Credentials && { Credentials: CredentialsFilterSensitiveLog(obj.Credentials) }
}), "AssumeRoleResponseFilterSensitiveLog");
var ExpiredTokenException = class _ExpiredTokenException extends STSServiceException {
  static {
    __name(this, "ExpiredTokenException");
  }
  name = "ExpiredTokenException";
  $fault = "client";
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
  }
};
var MalformedPolicyDocumentException = class _MalformedPolicyDocumentException extends STSServiceException {
  static {
    __name(this, "MalformedPolicyDocumentException");
  }
  name = "MalformedPolicyDocumentException";
  $fault = "client";
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
  }
};
var PackedPolicyTooLargeException = class _PackedPolicyTooLargeException extends STSServiceException {
  static {
    __name(this, "PackedPolicyTooLargeException");
  }
  name = "PackedPolicyTooLargeException";
  $fault = "client";
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "PackedPolicyTooLargeException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _PackedPolicyTooLargeException.prototype);
  }
};
var RegionDisabledException = class _RegionDisabledException extends STSServiceException {
  static {
    __name(this, "RegionDisabledException");
  }
  name = "RegionDisabledException";
  $fault = "client";
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "RegionDisabledException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _RegionDisabledException.prototype);
  }
};
var IDPRejectedClaimException = class _IDPRejectedClaimException extends STSServiceException {
  static {
    __name(this, "IDPRejectedClaimException");
  }
  name = "IDPRejectedClaimException";
  $fault = "client";
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "IDPRejectedClaimException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _IDPRejectedClaimException.prototype);
  }
};
var InvalidIdentityTokenException = class _InvalidIdentityTokenException extends STSServiceException {
  static {
    __name(this, "InvalidIdentityTokenException");
  }
  name = "InvalidIdentityTokenException";
  $fault = "client";
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "InvalidIdentityTokenException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _InvalidIdentityTokenException.prototype);
  }
};
var AssumeRoleWithWebIdentityRequestFilterSensitiveLog = /* @__PURE__ */ __name((obj) => ({
  ...obj,
  ...obj.WebIdentityToken && { WebIdentityToken: import_smithy_client2.SENSITIVE_STRING }
}), "AssumeRoleWithWebIdentityRequestFilterSensitiveLog");
var AssumeRoleWithWebIdentityResponseFilterSensitiveLog = /* @__PURE__ */ __name((obj) => ({
  ...obj,
  ...obj.Credentials && { Credentials: CredentialsFilterSensitiveLog(obj.Credentials) }
}), "AssumeRoleWithWebIdentityResponseFilterSensitiveLog");
var IDPCommunicationErrorException = class _IDPCommunicationErrorException extends STSServiceException {
  static {
    __name(this, "IDPCommunicationErrorException");
  }
  name = "IDPCommunicationErrorException";
  $fault = "client";
  /**
   * @internal
   */
  constructor(opts) {
    super({
      name: "IDPCommunicationErrorException",
      $fault: "client",
      ...opts
    });
    Object.setPrototypeOf(this, _IDPCommunicationErrorException.prototype);
  }
};

// src/submodules/sts/protocols/Aws_query.ts
var import_core = require("@aws-sdk/core");
var import_protocol_http = require("@smithy/protocol-http");
var import_smithy_client3 = require("@smithy/smithy-client");
var se_AssumeRoleCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = SHARED_HEADERS;
  let body;
  body = buildFormUrlencodedString({
    ...se_AssumeRoleRequest(input, context),
    [_A]: _AR,
    [_V]: _
  });
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_AssumeRoleCommand");
var se_AssumeRoleWithWebIdentityCommand = /* @__PURE__ */ __name(async (input, context) => {
  const headers = SHARED_HEADERS;
  let body;
  body = buildFormUrlencodedString({
    ...se_AssumeRoleWithWebIdentityRequest(input, context),
    [_A]: _ARWWI,
    [_V]: _
  });
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
}, "se_AssumeRoleWithWebIdentityCommand");
var de_AssumeRoleCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const data = await (0, import_core.parseXmlBody)(output.body, context);
  let contents = {};
  contents = de_AssumeRoleResponse(data.AssumeRoleResult, context);
  const response = {
    $metadata: deserializeMetadata(output),
    ...contents
  };
  return response;
}, "de_AssumeRoleCommand");
var de_AssumeRoleWithWebIdentityCommand = /* @__PURE__ */ __name(async (output, context) => {
  if (output.statusCode >= 300) {
    return de_CommandError(output, context);
  }
  const data = await (0, import_core.parseXmlBody)(output.body, context);
  let contents = {};
  contents = de_AssumeRoleWithWebIdentityResponse(data.AssumeRoleWithWebIdentityResult, context);
  const response = {
    $metadata: deserializeMetadata(output),
    ...contents
  };
  return response;
}, "de_AssumeRoleWithWebIdentityCommand");
var de_CommandError = /* @__PURE__ */ __name(async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await (0, import_core.parseXmlErrorBody)(output.body, context)
  };
  const errorCode = loadQueryErrorCode(output, parsedOutput.body);
  switch (errorCode) {
    case "ExpiredTokenException":
    case "com.amazonaws.sts#ExpiredTokenException":
      throw await de_ExpiredTokenExceptionRes(parsedOutput, context);
    case "MalformedPolicyDocument":
    case "com.amazonaws.sts#MalformedPolicyDocumentException":
      throw await de_MalformedPolicyDocumentExceptionRes(parsedOutput, context);
    case "PackedPolicyTooLarge":
    case "com.amazonaws.sts#PackedPolicyTooLargeException":
      throw await de_PackedPolicyTooLargeExceptionRes(parsedOutput, context);
    case "RegionDisabledException":
    case "com.amazonaws.sts#RegionDisabledException":
      throw await de_RegionDisabledExceptionRes(parsedOutput, context);
    case "IDPCommunicationError":
    case "com.amazonaws.sts#IDPCommunicationErrorException":
      throw await de_IDPCommunicationErrorExceptionRes(parsedOutput, context);
    case "IDPRejectedClaim":
    case "com.amazonaws.sts#IDPRejectedClaimException":
      throw await de_IDPRejectedClaimExceptionRes(parsedOutput, context);
    case "InvalidIdentityToken":
    case "com.amazonaws.sts#InvalidIdentityTokenException":
      throw await de_InvalidIdentityTokenExceptionRes(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      return throwDefaultError({
        output,
        parsedBody: parsedBody.Error,
        errorCode
      });
  }
}, "de_CommandError");
var de_ExpiredTokenExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = de_ExpiredTokenException(body.Error, context);
  const exception = new ExpiredTokenException({
    $metadata: deserializeMetadata(parsedOutput),
    ...deserialized
  });
  return (0, import_smithy_client3.decorateServiceException)(exception, body);
}, "de_ExpiredTokenExceptionRes");
var de_IDPCommunicationErrorExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = de_IDPCommunicationErrorException(body.Error, context);
  const exception = new IDPCommunicationErrorException({
    $metadata: deserializeMetadata(parsedOutput),
    ...deserialized
  });
  return (0, import_smithy_client3.decorateServiceException)(exception, body);
}, "de_IDPCommunicationErrorExceptionRes");
var de_IDPRejectedClaimExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = de_IDPRejectedClaimException(body.Error, context);
  const exception = new IDPRejectedClaimException({
    $metadata: deserializeMetadata(parsedOutput),
    ...deserialized
  });
  return (0, import_smithy_client3.decorateServiceException)(exception, body);
}, "de_IDPRejectedClaimExceptionRes");
var de_InvalidIdentityTokenExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = de_InvalidIdentityTokenException(body.Error, context);
  const exception = new InvalidIdentityTokenException({
    $metadata: deserializeMetadata(parsedOutput),
    ...deserialized
  });
  return (0, import_smithy_client3.decorateServiceException)(exception, body);
}, "de_InvalidIdentityTokenExceptionRes");
var de_MalformedPolicyDocumentExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = de_MalformedPolicyDocumentException(body.Error, context);
  const exception = new MalformedPolicyDocumentException({
    $metadata: deserializeMetadata(parsedOutput),
    ...deserialized
  });
  return (0, import_smithy_client3.decorateServiceException)(exception, body);
}, "de_MalformedPolicyDocumentExceptionRes");
var de_PackedPolicyTooLargeExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = de_PackedPolicyTooLargeException(body.Error, context);
  const exception = new PackedPolicyTooLargeException({
    $metadata: deserializeMetadata(parsedOutput),
    ...deserialized
  });
  return (0, import_smithy_client3.decorateServiceException)(exception, body);
}, "de_PackedPolicyTooLargeExceptionRes");
var de_RegionDisabledExceptionRes = /* @__PURE__ */ __name(async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = de_RegionDisabledException(body.Error, context);
  const exception = new RegionDisabledException({
    $metadata: deserializeMetadata(parsedOutput),
    ...deserialized
  });
  return (0, import_smithy_client3.decorateServiceException)(exception, body);
}, "de_RegionDisabledExceptionRes");
var se_AssumeRoleRequest = /* @__PURE__ */ __name((input, context) => {
  const entries = {};
  if (input[_RA] != null) {
    entries[_RA] = input[_RA];
  }
  if (input[_RSN] != null) {
    entries[_RSN] = input[_RSN];
  }
  if (input[_PA] != null) {
    const memberEntries = se_policyDescriptorListType(input[_PA], context);
    if (input[_PA]?.length === 0) {
      entries.PolicyArns = [];
    }
    Object.entries(memberEntries).forEach(([key, value]) => {
      const loc = `PolicyArns.${key}`;
      entries[loc] = value;
    });
  }
  if (input[_P] != null) {
    entries[_P] = input[_P];
  }
  if (input[_DS] != null) {
    entries[_DS] = input[_DS];
  }
  if (input[_T] != null) {
    const memberEntries = se_tagListType(input[_T], context);
    if (input[_T]?.length === 0) {
      entries.Tags = [];
    }
    Object.entries(memberEntries).forEach(([key, value]) => {
      const loc = `Tags.${key}`;
      entries[loc] = value;
    });
  }
  if (input[_TTK] != null) {
    const memberEntries = se_tagKeyListType(input[_TTK], context);
    if (input[_TTK]?.length === 0) {
      entries.TransitiveTagKeys = [];
    }
    Object.entries(memberEntries).forEach(([key, value]) => {
      const loc = `TransitiveTagKeys.${key}`;
      entries[loc] = value;
    });
  }
  if (input[_EI] != null) {
    entries[_EI] = input[_EI];
  }
  if (input[_SN] != null) {
    entries[_SN] = input[_SN];
  }
  if (input[_TC] != null) {
    entries[_TC] = input[_TC];
  }
  if (input[_SI] != null) {
    entries[_SI] = input[_SI];
  }
  if (input[_PC] != null) {
    const memberEntries = se_ProvidedContextsListType(input[_PC], context);
    if (input[_PC]?.length === 0) {
      entries.ProvidedContexts = [];
    }
    Object.entries(memberEntries).forEach(([key, value]) => {
      const loc = `ProvidedContexts.${key}`;
      entries[loc] = value;
    });
  }
  return entries;
}, "se_AssumeRoleRequest");
var se_AssumeRoleWithWebIdentityRequest = /* @__PURE__ */ __name((input, context) => {
  const entries = {};
  if (input[_RA] != null) {
    entries[_RA] = input[_RA];
  }
  if (input[_RSN] != null) {
    entries[_RSN] = input[_RSN];
  }
  if (input[_WIT] != null) {
    entries[_WIT] = input[_WIT];
  }
  if (input[_PI] != null) {
    entries[_PI] = input[_PI];
  }
  if (input[_PA] != null) {
    const memberEntries = se_policyDescriptorListType(input[_PA], context);
    if (input[_PA]?.length === 0) {
      entries.PolicyArns = [];
    }
    Object.entries(memberEntries).forEach(([key, value]) => {
      const loc = `PolicyArns.${key}`;
      entries[loc] = value;
    });
  }
  if (input[_P] != null) {
    entries[_P] = input[_P];
  }
  if (input[_DS] != null) {
    entries[_DS] = input[_DS];
  }
  return entries;
}, "se_AssumeRoleWithWebIdentityRequest");
var se_policyDescriptorListType = /* @__PURE__ */ __name((input, context) => {
  const entries = {};
  let counter = 1;
  for (const entry of input) {
    if (entry === null) {
      continue;
    }
    const memberEntries = se_PolicyDescriptorType(entry, context);
    Object.entries(memberEntries).forEach(([key, value]) => {
      entries[`member.${counter}.${key}`] = value;
    });
    counter++;
  }
  return entries;
}, "se_policyDescriptorListType");
var se_PolicyDescriptorType = /* @__PURE__ */ __name((input, context) => {
  const entries = {};
  if (input[_a] != null) {
    entries[_a] = input[_a];
  }
  return entries;
}, "se_PolicyDescriptorType");
var se_ProvidedContext = /* @__PURE__ */ __name((input, context) => {
  const entries = {};
  if (input[_PAr] != null) {
    entries[_PAr] = input[_PAr];
  }
  if (input[_CA] != null) {
    entries[_CA] = input[_CA];
  }
  return entries;
}, "se_ProvidedContext");
var se_ProvidedContextsListType = /* @__PURE__ */ __name((input, context) => {
  const entries = {};
  let counter = 1;
  for (const entry of input) {
    if (entry === null) {
      continue;
    }
    const memberEntries = se_ProvidedContext(entry, context);
    Object.entries(memberEntries).forEach(([key, value]) => {
      entries[`member.${counter}.${key}`] = value;
    });
    counter++;
  }
  return entries;
}, "se_ProvidedContextsListType");
var se_Tag = /* @__PURE__ */ __name((input, context) => {
  const entries = {};
  if (input[_K] != null) {
    entries[_K] = input[_K];
  }
  if (input[_Va] != null) {
    entries[_Va] = input[_Va];
  }
  return entries;
}, "se_Tag");
var se_tagKeyListType = /* @__PURE__ */ __name((input, context) => {
  const entries = {};
  let counter = 1;
  for (const entry of input) {
    if (entry === null) {
      continue;
    }
    entries[`member.${counter}`] = entry;
    counter++;
  }
  return entries;
}, "se_tagKeyListType");
var se_tagListType = /* @__PURE__ */ __name((input, context) => {
  const entries = {};
  let counter = 1;
  for (const entry of input) {
    if (entry === null) {
      continue;
    }
    const memberEntries = se_Tag(entry, context);
    Object.entries(memberEntries).forEach(([key, value]) => {
      entries[`member.${counter}.${key}`] = value;
    });
    counter++;
  }
  return entries;
}, "se_tagListType");
var de_AssumedRoleUser = /* @__PURE__ */ __name((output, context) => {
  const contents = {};
  if (output[_ARI] != null) {
    contents[_ARI] = (0, import_smithy_client3.expectString)(output[_ARI]);
  }
  if (output[_Ar] != null) {
    contents[_Ar] = (0, import_smithy_client3.expectString)(output[_Ar]);
  }
  return contents;
}, "de_AssumedRoleUser");
var de_AssumeRoleResponse = /* @__PURE__ */ __name((output, context) => {
  const contents = {};
  if (output[_C] != null) {
    contents[_C] = de_Credentials(output[_C], context);
  }
  if (output[_ARU] != null) {
    contents[_ARU] = de_AssumedRoleUser(output[_ARU], context);
  }
  if (output[_PPS] != null) {
    contents[_PPS] = (0, import_smithy_client3.strictParseInt32)(output[_PPS]);
  }
  if (output[_SI] != null) {
    contents[_SI] = (0, import_smithy_client3.expectString)(output[_SI]);
  }
  return contents;
}, "de_AssumeRoleResponse");
var de_AssumeRoleWithWebIdentityResponse = /* @__PURE__ */ __name((output, context) => {
  const contents = {};
  if (output[_C] != null) {
    contents[_C] = de_Credentials(output[_C], context);
  }
  if (output[_SFWIT] != null) {
    contents[_SFWIT] = (0, import_smithy_client3.expectString)(output[_SFWIT]);
  }
  if (output[_ARU] != null) {
    contents[_ARU] = de_AssumedRoleUser(output[_ARU], context);
  }
  if (output[_PPS] != null) {
    contents[_PPS] = (0, import_smithy_client3.strictParseInt32)(output[_PPS]);
  }
  if (output[_Pr] != null) {
    contents[_Pr] = (0, import_smithy_client3.expectString)(output[_Pr]);
  }
  if (output[_Au] != null) {
    contents[_Au] = (0, import_smithy_client3.expectString)(output[_Au]);
  }
  if (output[_SI] != null) {
    contents[_SI] = (0, import_smithy_client3.expectString)(output[_SI]);
  }
  return contents;
}, "de_AssumeRoleWithWebIdentityResponse");
var de_Credentials = /* @__PURE__ */ __name((output, context) => {
  const contents = {};
  if (output[_AKI] != null) {
    contents[_AKI] = (0, import_smithy_client3.expectString)(output[_AKI]);
  }
  if (output[_SAK] != null) {
    contents[_SAK] = (0, import_smithy_client3.expectString)(output[_SAK]);
  }
  if (output[_ST] != null) {
    contents[_ST] = (0, import_smithy_client3.expectString)(output[_ST]);
  }
  if (output[_E] != null) {
    contents[_E] = (0, import_smithy_client3.expectNonNull)((0, import_smithy_client3.parseRfc3339DateTimeWithOffset)(output[_E]));
  }
  return contents;
}, "de_Credentials");
var de_ExpiredTokenException = /* @__PURE__ */ __name((output, context) => {
  const contents = {};
  if (output[_m] != null) {
    contents[_m] = (0, import_smithy_client3.expectString)(output[_m]);
  }
  return contents;
}, "de_ExpiredTokenException");
var de_IDPCommunicationErrorException = /* @__PURE__ */ __name((output, context) => {
  const contents = {};
  if (output[_m] != null) {
    contents[_m] = (0, import_smithy_client3.expectString)(output[_m]);
  }
  return contents;
}, "de_IDPCommunicationErrorException");
var de_IDPRejectedClaimException = /* @__PURE__ */ __name((output, context) => {
  const contents = {};
  if (output[_m] != null) {
    contents[_m] = (0, import_smithy_client3.expectString)(output[_m]);
  }
  return contents;
}, "de_IDPRejectedClaimException");
var de_InvalidIdentityTokenException = /* @__PURE__ */ __name((output, context) => {
  const contents = {};
  if (output[_m] != null) {
    contents[_m] = (0, import_smithy_client3.expectString)(output[_m]);
  }
  return contents;
}, "de_InvalidIdentityTokenException");
var de_MalformedPolicyDocumentException = /* @__PURE__ */ __name((output, context) => {
  const contents = {};
  if (output[_m] != null) {
    contents[_m] = (0, import_smithy_client3.expectString)(output[_m]);
  }
  return contents;
}, "de_MalformedPolicyDocumentException");
var de_PackedPolicyTooLargeException = /* @__PURE__ */ __name((output, context) => {
  const contents = {};
  if (output[_m] != null) {
    contents[_m] = (0, import_smithy_client3.expectString)(output[_m]);
  }
  return contents;
}, "de_PackedPolicyTooLargeException");
var de_RegionDisabledException = /* @__PURE__ */ __name((output, context) => {
  const contents = {};
  if (output[_m] != null) {
    contents[_m] = (0, import_smithy_client3.expectString)(output[_m]);
  }
  return contents;
}, "de_RegionDisabledException");
var deserializeMetadata = /* @__PURE__ */ __name((output) => ({
  httpStatusCode: output.statusCode,
  requestId: output.headers["x-amzn-requestid"] ?? output.headers["x-amzn-request-id"] ?? output.headers["x-amz-request-id"],
  extendedRequestId: output.headers["x-amz-id-2"],
  cfId: output.headers["x-amz-cf-id"]
}), "deserializeMetadata");
var throwDefaultError = (0, import_smithy_client3.withBaseException)(STSServiceException);
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
var SHARED_HEADERS = {
  "content-type": "application/x-www-form-urlencoded"
};
var _ = "2011-06-15";
var _A = "Action";
var _AKI = "AccessKeyId";
var _AR = "AssumeRole";
var _ARI = "AssumedRoleId";
var _ARU = "AssumedRoleUser";
var _ARWWI = "AssumeRoleWithWebIdentity";
var _Ar = "Arn";
var _Au = "Audience";
var _C = "Credentials";
var _CA = "ContextAssertion";
var _DS = "DurationSeconds";
var _E = "Expiration";
var _EI = "ExternalId";
var _K = "Key";
var _P = "Policy";
var _PA = "PolicyArns";
var _PAr = "ProviderArn";
var _PC = "ProvidedContexts";
var _PI = "ProviderId";
var _PPS = "PackedPolicySize";
var _Pr = "Provider";
var _RA = "RoleArn";
var _RSN = "RoleSessionName";
var _SAK = "SecretAccessKey";
var _SFWIT = "SubjectFromWebIdentityToken";
var _SI = "SourceIdentity";
var _SN = "SerialNumber";
var _ST = "SessionToken";
var _T = "Tags";
var _TC = "TokenCode";
var _TTK = "TransitiveTagKeys";
var _V = "Version";
var _Va = "Value";
var _WIT = "WebIdentityToken";
var _a = "arn";
var _m = "message";
var buildFormUrlencodedString = /* @__PURE__ */ __name((formEntries) => Object.entries(formEntries).map(([key, value]) => (0, import_smithy_client3.extendedEncodeURIComponent)(key) + "=" + (0, import_smithy_client3.extendedEncodeURIComponent)(value)).join("&"), "buildFormUrlencodedString");
var loadQueryErrorCode = /* @__PURE__ */ __name((output, data) => {
  if (data.Error?.Code !== void 0) {
    return data.Error.Code;
  }
  if (output.statusCode == 404) {
    return "NotFound";
  }
}, "loadQueryErrorCode");

// src/submodules/sts/commands/AssumeRoleCommand.ts
var AssumeRoleCommand = class extends import_smithy_client4.Command.classBuilder().ep(import_EndpointParameters.commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("AWSSecurityTokenServiceV20110615", "AssumeRole", {}).n("STSClient", "AssumeRoleCommand").f(void 0, AssumeRoleResponseFilterSensitiveLog).ser(se_AssumeRoleCommand).de(de_AssumeRoleCommand).build() {
  static {
    __name(this, "AssumeRoleCommand");
  }
};

// src/submodules/sts/commands/AssumeRoleWithWebIdentityCommand.ts
var import_middleware_endpoint2 = require("@smithy/middleware-endpoint");
var import_middleware_serde2 = require("@smithy/middleware-serde");
var import_smithy_client5 = require("@smithy/smithy-client");
var import_EndpointParameters2 = require("./endpoint/EndpointParameters");
var AssumeRoleWithWebIdentityCommand = class extends import_smithy_client5.Command.classBuilder().ep(import_EndpointParameters2.commonParams).m(function(Command, cs, config, o) {
  return [
    (0, import_middleware_serde2.getSerdePlugin)(config, this.serialize, this.deserialize),
    (0, import_middleware_endpoint2.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())
  ];
}).s("AWSSecurityTokenServiceV20110615", "AssumeRoleWithWebIdentity", {}).n("STSClient", "AssumeRoleWithWebIdentityCommand").f(AssumeRoleWithWebIdentityRequestFilterSensitiveLog, AssumeRoleWithWebIdentityResponseFilterSensitiveLog).ser(se_AssumeRoleWithWebIdentityCommand).de(de_AssumeRoleWithWebIdentityCommand).build() {
  static {
    __name(this, "AssumeRoleWithWebIdentityCommand");
  }
};

// src/submodules/sts/STS.ts
var import_STSClient = require("./STSClient");
var commands = {
  AssumeRoleCommand,
  AssumeRoleWithWebIdentityCommand
};
var STS = class extends import_STSClient.STSClient {
  static {
    __name(this, "STS");
  }
};
(0, import_smithy_client6.createAggregatedClient)(commands, STS);

// src/submodules/sts/index.ts
var import_EndpointParameters3 = require("./endpoint/EndpointParameters");

// src/submodules/sts/defaultStsRoleAssumers.ts
var import_client = require("@aws-sdk/core/client");
var ASSUME_ROLE_DEFAULT_REGION = "us-east-1";
var getAccountIdFromAssumedRoleUser = /* @__PURE__ */ __name((assumedRoleUser) => {
  if (typeof assumedRoleUser?.Arn === "string") {
    const arnComponents = assumedRoleUser.Arn.split(":");
    if (arnComponents.length > 4 && arnComponents[4] !== "") {
      return arnComponents[4];
    }
  }
  return void 0;
}, "getAccountIdFromAssumedRoleUser");
var resolveRegion = /* @__PURE__ */ __name(async (_region, _parentRegion, credentialProviderLogger) => {
  const region = typeof _region === "function" ? await _region() : _region;
  const parentRegion = typeof _parentRegion === "function" ? await _parentRegion() : _parentRegion;
  credentialProviderLogger?.debug?.(
    "@aws-sdk/client-sts::resolveRegion",
    "accepting first of:",
    `${region} (provider)`,
    `${parentRegion} (parent client)`,
    `${ASSUME_ROLE_DEFAULT_REGION} (STS default)`
  );
  return region ?? parentRegion ?? ASSUME_ROLE_DEFAULT_REGION;
}, "resolveRegion");
var getDefaultRoleAssumer = /* @__PURE__ */ __name((stsOptions, STSClient3) => {
  let stsClient;
  let closureSourceCreds;
  return async (sourceCreds, params) => {
    closureSourceCreds = sourceCreds;
    if (!stsClient) {
      const {
        logger = stsOptions?.parentClientConfig?.logger,
        region,
        requestHandler = stsOptions?.parentClientConfig?.requestHandler,
        credentialProviderLogger
      } = stsOptions;
      const resolvedRegion = await resolveRegion(
        region,
        stsOptions?.parentClientConfig?.region,
        credentialProviderLogger
      );
      const isCompatibleRequestHandler = !isH2(requestHandler);
      stsClient = new STSClient3({
        profile: stsOptions?.parentClientConfig?.profile,
        // A hack to make sts client uses the credential in current closure.
        credentialDefaultProvider: /* @__PURE__ */ __name(() => async () => closureSourceCreds, "credentialDefaultProvider"),
        region: resolvedRegion,
        requestHandler: isCompatibleRequestHandler ? requestHandler : void 0,
        logger
      });
    }
    const { Credentials: Credentials2, AssumedRoleUser: AssumedRoleUser2 } = await stsClient.send(new AssumeRoleCommand(params));
    if (!Credentials2 || !Credentials2.AccessKeyId || !Credentials2.SecretAccessKey) {
      throw new Error(`Invalid response from STS.assumeRole call with role ${params.RoleArn}`);
    }
    const accountId = getAccountIdFromAssumedRoleUser(AssumedRoleUser2);
    const credentials = {
      accessKeyId: Credentials2.AccessKeyId,
      secretAccessKey: Credentials2.SecretAccessKey,
      sessionToken: Credentials2.SessionToken,
      expiration: Credentials2.Expiration,
      // TODO(credentialScope): access normally when shape is updated.
      ...Credentials2.CredentialScope && { credentialScope: Credentials2.CredentialScope },
      ...accountId && { accountId }
    };
    (0, import_client.setCredentialFeature)(credentials, "CREDENTIALS_STS_ASSUME_ROLE", "i");
    return credentials;
  };
}, "getDefaultRoleAssumer");
var getDefaultRoleAssumerWithWebIdentity = /* @__PURE__ */ __name((stsOptions, STSClient3) => {
  let stsClient;
  return async (params) => {
    if (!stsClient) {
      const {
        logger = stsOptions?.parentClientConfig?.logger,
        region,
        requestHandler = stsOptions?.parentClientConfig?.requestHandler,
        credentialProviderLogger
      } = stsOptions;
      const resolvedRegion = await resolveRegion(
        region,
        stsOptions?.parentClientConfig?.region,
        credentialProviderLogger
      );
      const isCompatibleRequestHandler = !isH2(requestHandler);
      stsClient = new STSClient3({
        profile: stsOptions?.parentClientConfig?.profile,
        region: resolvedRegion,
        requestHandler: isCompatibleRequestHandler ? requestHandler : void 0,
        logger
      });
    }
    const { Credentials: Credentials2, AssumedRoleUser: AssumedRoleUser2 } = await stsClient.send(new AssumeRoleWithWebIdentityCommand(params));
    if (!Credentials2 || !Credentials2.AccessKeyId || !Credentials2.SecretAccessKey) {
      throw new Error(`Invalid response from STS.assumeRoleWithWebIdentity call with role ${params.RoleArn}`);
    }
    const accountId = getAccountIdFromAssumedRoleUser(AssumedRoleUser2);
    const credentials = {
      accessKeyId: Credentials2.AccessKeyId,
      secretAccessKey: Credentials2.SecretAccessKey,
      sessionToken: Credentials2.SessionToken,
      expiration: Credentials2.Expiration,
      // TODO(credentialScope): access normally when shape is updated.
      ...Credentials2.CredentialScope && { credentialScope: Credentials2.CredentialScope },
      ...accountId && { accountId }
    };
    if (accountId) {
      (0, import_client.setCredentialFeature)(credentials, "RESOLVED_ACCOUNT_ID", "T");
    }
    (0, import_client.setCredentialFeature)(credentials, "CREDENTIALS_STS_ASSUME_ROLE_WEB_ID", "k");
    return credentials;
  };
}, "getDefaultRoleAssumerWithWebIdentity");
var isH2 = /* @__PURE__ */ __name((requestHandler) => {
  return requestHandler?.metadata?.handlerProtocol === "h2";
}, "isH2");

// src/submodules/sts/defaultRoleAssumers.ts
var import_STSClient2 = require("./STSClient");
var getCustomizableStsClientCtor = /* @__PURE__ */ __name((baseCtor, customizations) => {
  if (!customizations) return baseCtor;
  else
    return class CustomizableSTSClient extends baseCtor {
      static {
        __name(this, "CustomizableSTSClient");
      }
      constructor(config) {
        super(config);
        for (const customization of customizations) {
          this.middlewareStack.use(customization);
        }
      }
    };
}, "getCustomizableStsClientCtor");
var getDefaultRoleAssumer2 = /* @__PURE__ */ __name((stsOptions = {}, stsPlugins) => getDefaultRoleAssumer(stsOptions, getCustomizableStsClientCtor(import_STSClient2.STSClient, stsPlugins)), "getDefaultRoleAssumer");
var getDefaultRoleAssumerWithWebIdentity2 = /* @__PURE__ */ __name((stsOptions = {}, stsPlugins) => getDefaultRoleAssumerWithWebIdentity(stsOptions, getCustomizableStsClientCtor(import_STSClient2.STSClient, stsPlugins)), "getDefaultRoleAssumerWithWebIdentity");
var decorateDefaultCredentialProvider = /* @__PURE__ */ __name((provider) => (input) => provider({
  roleAssumer: getDefaultRoleAssumer2(input),
  roleAssumerWithWebIdentity: getDefaultRoleAssumerWithWebIdentity2(input),
  ...input
}), "decorateDefaultCredentialProvider");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AssumeRoleCommand,
  AssumeRoleResponseFilterSensitiveLog,
  AssumeRoleWithWebIdentityCommand,
  AssumeRoleWithWebIdentityRequestFilterSensitiveLog,
  AssumeRoleWithWebIdentityResponseFilterSensitiveLog,
  ClientInputEndpointParameters,
  CredentialsFilterSensitiveLog,
  ExpiredTokenException,
  IDPCommunicationErrorException,
  IDPRejectedClaimException,
  InvalidIdentityTokenException,
  MalformedPolicyDocumentException,
  PackedPolicyTooLargeException,
  RegionDisabledException,
  STS,
  STSServiceException,
  decorateDefaultCredentialProvider,
  getDefaultRoleAssumer,
  getDefaultRoleAssumerWithWebIdentity,
  ...require("./STSClient")
});
