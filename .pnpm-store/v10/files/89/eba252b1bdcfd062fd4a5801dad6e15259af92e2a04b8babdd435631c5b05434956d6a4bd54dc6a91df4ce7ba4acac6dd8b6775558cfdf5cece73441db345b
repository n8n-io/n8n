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
  CONFIG_REQUEST_CHECKSUM_CALCULATION: () => CONFIG_REQUEST_CHECKSUM_CALCULATION,
  CONFIG_RESPONSE_CHECKSUM_VALIDATION: () => CONFIG_RESPONSE_CHECKSUM_VALIDATION,
  ChecksumAlgorithm: () => ChecksumAlgorithm,
  ChecksumLocation: () => ChecksumLocation,
  DEFAULT_CHECKSUM_ALGORITHM: () => DEFAULT_CHECKSUM_ALGORITHM,
  DEFAULT_REQUEST_CHECKSUM_CALCULATION: () => DEFAULT_REQUEST_CHECKSUM_CALCULATION,
  DEFAULT_RESPONSE_CHECKSUM_VALIDATION: () => DEFAULT_RESPONSE_CHECKSUM_VALIDATION,
  ENV_REQUEST_CHECKSUM_CALCULATION: () => ENV_REQUEST_CHECKSUM_CALCULATION,
  ENV_RESPONSE_CHECKSUM_VALIDATION: () => ENV_RESPONSE_CHECKSUM_VALIDATION,
  NODE_REQUEST_CHECKSUM_CALCULATION_CONFIG_OPTIONS: () => NODE_REQUEST_CHECKSUM_CALCULATION_CONFIG_OPTIONS,
  NODE_RESPONSE_CHECKSUM_VALIDATION_CONFIG_OPTIONS: () => NODE_RESPONSE_CHECKSUM_VALIDATION_CONFIG_OPTIONS,
  RequestChecksumCalculation: () => RequestChecksumCalculation,
  ResponseChecksumValidation: () => ResponseChecksumValidation,
  crc64NvmeCrtContainer: () => crc64NvmeCrtContainer,
  flexibleChecksumsMiddleware: () => flexibleChecksumsMiddleware,
  flexibleChecksumsMiddlewareOptions: () => flexibleChecksumsMiddlewareOptions,
  getFlexibleChecksumsPlugin: () => getFlexibleChecksumsPlugin,
  resolveFlexibleChecksumsConfig: () => resolveFlexibleChecksumsConfig
});
module.exports = __toCommonJS(index_exports);

// src/constants.ts
var RequestChecksumCalculation = {
  /**
   * When set, a checksum will be calculated for all request payloads of operations
   * modeled with the {@link httpChecksum} trait where `requestChecksumRequired` is `true`
   * AND/OR a `requestAlgorithmMember` is modeled.
   * {@link https://smithy.io/2.0/aws/aws-core.html#aws-protocols-httpchecksum-trait httpChecksum}
   */
  WHEN_SUPPORTED: "WHEN_SUPPORTED",
  /**
   * When set, a checksum will only be calculated for request payloads of operations
   * modeled with the {@link httpChecksum} trait where `requestChecksumRequired` is `true`
   * OR where a `requestAlgorithmMember` is modeled and the user sets it.
   * {@link https://smithy.io/2.0/aws/aws-core.html#aws-protocols-httpchecksum-trait httpChecksum}
   */
  WHEN_REQUIRED: "WHEN_REQUIRED"
};
var DEFAULT_REQUEST_CHECKSUM_CALCULATION = RequestChecksumCalculation.WHEN_SUPPORTED;
var ResponseChecksumValidation = {
  /**
   * When set, checksum validation MUST be performed on all response payloads of operations
   * modeled with the {@link httpChecksum} trait where `responseAlgorithms` is modeled,
   * except when no modeled checksum algorithms are supported by an SDK.
   * {@link https://smithy.io/2.0/aws/aws-core.html#aws-protocols-httpchecksum-trait httpChecksum}
   */
  WHEN_SUPPORTED: "WHEN_SUPPORTED",
  /**
   * When set, checksum validation MUST NOT be performed on response payloads of operations UNLESS
   * the SDK supports the modeled checksum algorithms AND the user has set the `requestValidationModeMember` to `ENABLED`.
   * It is currently impossible to model an operation as requiring a response checksum,
   * but this setting leaves the door open for future updates.
   */
  WHEN_REQUIRED: "WHEN_REQUIRED"
};
var DEFAULT_RESPONSE_CHECKSUM_VALIDATION = RequestChecksumCalculation.WHEN_SUPPORTED;
var ChecksumAlgorithm = /* @__PURE__ */ ((ChecksumAlgorithm3) => {
  ChecksumAlgorithm3["MD5"] = "MD5";
  ChecksumAlgorithm3["CRC32"] = "CRC32";
  ChecksumAlgorithm3["CRC32C"] = "CRC32C";
  ChecksumAlgorithm3["CRC64NVME"] = "CRC64NVME";
  ChecksumAlgorithm3["SHA1"] = "SHA1";
  ChecksumAlgorithm3["SHA256"] = "SHA256";
  return ChecksumAlgorithm3;
})(ChecksumAlgorithm || {});
var ChecksumLocation = /* @__PURE__ */ ((ChecksumLocation2) => {
  ChecksumLocation2["HEADER"] = "header";
  ChecksumLocation2["TRAILER"] = "trailer";
  return ChecksumLocation2;
})(ChecksumLocation || {});
var DEFAULT_CHECKSUM_ALGORITHM = "CRC32" /* CRC32 */;

// src/stringUnionSelector.ts
var stringUnionSelector = /* @__PURE__ */ __name((obj, key, union, type) => {
  if (!(key in obj)) return void 0;
  const value = obj[key].toUpperCase();
  if (!Object.values(union).includes(value)) {
    throw new TypeError(`Cannot load ${type} '${key}'. Expected one of ${Object.values(union)}, got '${obj[key]}'.`);
  }
  return value;
}, "stringUnionSelector");

// src/NODE_REQUEST_CHECKSUM_CALCULATION_CONFIG_OPTIONS.ts
var ENV_REQUEST_CHECKSUM_CALCULATION = "AWS_REQUEST_CHECKSUM_CALCULATION";
var CONFIG_REQUEST_CHECKSUM_CALCULATION = "request_checksum_calculation";
var NODE_REQUEST_CHECKSUM_CALCULATION_CONFIG_OPTIONS = {
  environmentVariableSelector: /* @__PURE__ */ __name((env) => stringUnionSelector(env, ENV_REQUEST_CHECKSUM_CALCULATION, RequestChecksumCalculation, "env" /* ENV */), "environmentVariableSelector"),
  configFileSelector: /* @__PURE__ */ __name((profile) => stringUnionSelector(profile, CONFIG_REQUEST_CHECKSUM_CALCULATION, RequestChecksumCalculation, "shared config entry" /* CONFIG */), "configFileSelector"),
  default: DEFAULT_REQUEST_CHECKSUM_CALCULATION
};

// src/NODE_RESPONSE_CHECKSUM_VALIDATION_CONFIG_OPTIONS.ts
var ENV_RESPONSE_CHECKSUM_VALIDATION = "AWS_RESPONSE_CHECKSUM_VALIDATION";
var CONFIG_RESPONSE_CHECKSUM_VALIDATION = "response_checksum_validation";
var NODE_RESPONSE_CHECKSUM_VALIDATION_CONFIG_OPTIONS = {
  environmentVariableSelector: /* @__PURE__ */ __name((env) => stringUnionSelector(env, ENV_RESPONSE_CHECKSUM_VALIDATION, ResponseChecksumValidation, "env" /* ENV */), "environmentVariableSelector"),
  configFileSelector: /* @__PURE__ */ __name((profile) => stringUnionSelector(profile, CONFIG_RESPONSE_CHECKSUM_VALIDATION, ResponseChecksumValidation, "shared config entry" /* CONFIG */), "configFileSelector"),
  default: DEFAULT_RESPONSE_CHECKSUM_VALIDATION
};

// src/crc64-nvme-crt-container.ts
var crc64NvmeCrtContainer = {
  CrtCrc64Nvme: null
};

// src/flexibleChecksumsMiddleware.ts
var import_core = require("@aws-sdk/core");
var import_protocol_http = require("@smithy/protocol-http");
var import_util_stream = require("@smithy/util-stream");

// src/types.ts
var CLIENT_SUPPORTED_ALGORITHMS = [
  "CRC32" /* CRC32 */,
  "CRC32C" /* CRC32C */,
  "CRC64NVME" /* CRC64NVME */,
  "SHA1" /* SHA1 */,
  "SHA256" /* SHA256 */
];
var PRIORITY_ORDER_ALGORITHMS = [
  "SHA256" /* SHA256 */,
  "SHA1" /* SHA1 */,
  "CRC32" /* CRC32 */,
  "CRC32C" /* CRC32C */,
  "CRC64NVME" /* CRC64NVME */
];

// src/getChecksumAlgorithmForRequest.ts
var getChecksumAlgorithmForRequest = /* @__PURE__ */ __name((input, { requestChecksumRequired, requestAlgorithmMember, requestChecksumCalculation }) => {
  if (!requestAlgorithmMember) {
    return requestChecksumCalculation === RequestChecksumCalculation.WHEN_SUPPORTED || requestChecksumRequired ? DEFAULT_CHECKSUM_ALGORITHM : void 0;
  }
  if (!input[requestAlgorithmMember]) {
    return void 0;
  }
  const checksumAlgorithm = input[requestAlgorithmMember];
  if (!CLIENT_SUPPORTED_ALGORITHMS.includes(checksumAlgorithm)) {
    throw new Error(
      `The checksum algorithm "${checksumAlgorithm}" is not supported by the client. Select one of ${CLIENT_SUPPORTED_ALGORITHMS}.`
    );
  }
  return checksumAlgorithm;
}, "getChecksumAlgorithmForRequest");

// src/getChecksumLocationName.ts
var getChecksumLocationName = /* @__PURE__ */ __name((algorithm) => algorithm === "MD5" /* MD5 */ ? "content-md5" : `x-amz-checksum-${algorithm.toLowerCase()}`, "getChecksumLocationName");

// src/hasHeader.ts
var hasHeader = /* @__PURE__ */ __name((header, headers) => {
  const soughtHeader = header.toLowerCase();
  for (const headerName of Object.keys(headers)) {
    if (soughtHeader === headerName.toLowerCase()) {
      return true;
    }
  }
  return false;
}, "hasHeader");

// src/hasHeaderWithPrefix.ts
var hasHeaderWithPrefix = /* @__PURE__ */ __name((headerPrefix, headers) => {
  const soughtHeaderPrefix = headerPrefix.toLowerCase();
  for (const headerName of Object.keys(headers)) {
    if (headerName.toLowerCase().startsWith(soughtHeaderPrefix)) {
      return true;
    }
  }
  return false;
}, "hasHeaderWithPrefix");

// src/isStreaming.ts
var import_is_array_buffer = require("@smithy/is-array-buffer");
var isStreaming = /* @__PURE__ */ __name((body) => body !== void 0 && typeof body !== "string" && !ArrayBuffer.isView(body) && !(0, import_is_array_buffer.isArrayBuffer)(body), "isStreaming");

// src/selectChecksumAlgorithmFunction.ts
var import_crc32c = require("@aws-crypto/crc32c");
var import_getCrc32ChecksumAlgorithmFunction = require("././getCrc32ChecksumAlgorithmFunction");
var selectChecksumAlgorithmFunction = /* @__PURE__ */ __name((checksumAlgorithm, config) => {
  switch (checksumAlgorithm) {
    case "MD5" /* MD5 */:
      return config.md5;
    case "CRC32" /* CRC32 */:
      return (0, import_getCrc32ChecksumAlgorithmFunction.getCrc32ChecksumAlgorithmFunction)();
    case "CRC32C" /* CRC32C */:
      return import_crc32c.AwsCrc32c;
    case "CRC64NVME" /* CRC64NVME */:
      if (typeof crc64NvmeCrtContainer.CrtCrc64Nvme !== "function") {
        throw new Error(
          `Please check whether you have installed the "@aws-sdk/crc64-nvme-crt" package explicitly. 
You must also register the package by calling [require("@aws-sdk/crc64-nvme-crt");] or an ESM equivalent such as [import "@aws-sdk/crc64-nvme-crt";]. 
For more information please go to https://github.com/aws/aws-sdk-js-v3#functionality-requiring-aws-common-runtime-crt`
        );
      }
      return crc64NvmeCrtContainer.CrtCrc64Nvme;
    case "SHA1" /* SHA1 */:
      return config.sha1;
    case "SHA256" /* SHA256 */:
      return config.sha256;
    default:
      throw new Error(`Unsupported checksum algorithm: ${checksumAlgorithm}`);
  }
}, "selectChecksumAlgorithmFunction");

// src/stringHasher.ts
var import_util_utf8 = require("@smithy/util-utf8");
var stringHasher = /* @__PURE__ */ __name((checksumAlgorithmFn, body) => {
  const hash = new checksumAlgorithmFn();
  hash.update((0, import_util_utf8.toUint8Array)(body || ""));
  return hash.digest();
}, "stringHasher");

// src/flexibleChecksumsMiddleware.ts
var flexibleChecksumsMiddlewareOptions = {
  name: "flexibleChecksumsMiddleware",
  step: "build",
  tags: ["BODY_CHECKSUM"],
  override: true
};
var flexibleChecksumsMiddleware = /* @__PURE__ */ __name((config, middlewareConfig) => (next, context) => async (args) => {
  if (!import_protocol_http.HttpRequest.isInstance(args.request)) {
    return next(args);
  }
  if (hasHeaderWithPrefix("x-amz-checksum-", args.request.headers)) {
    return next(args);
  }
  const { request, input } = args;
  const { body: requestBody, headers } = request;
  const { base64Encoder, streamHasher } = config;
  const { requestChecksumRequired, requestAlgorithmMember } = middlewareConfig;
  const requestChecksumCalculation = await config.requestChecksumCalculation();
  const requestAlgorithmMemberName = requestAlgorithmMember?.name;
  const requestAlgorithmMemberHttpHeader = requestAlgorithmMember?.httpHeader;
  if (requestAlgorithmMemberName && !input[requestAlgorithmMemberName]) {
    if (requestChecksumCalculation === RequestChecksumCalculation.WHEN_SUPPORTED || requestChecksumRequired) {
      input[requestAlgorithmMemberName] = DEFAULT_CHECKSUM_ALGORITHM;
      if (requestAlgorithmMemberHttpHeader) {
        headers[requestAlgorithmMemberHttpHeader] = DEFAULT_CHECKSUM_ALGORITHM;
      }
    }
  }
  const checksumAlgorithm = getChecksumAlgorithmForRequest(input, {
    requestChecksumRequired,
    requestAlgorithmMember: requestAlgorithmMember?.name,
    requestChecksumCalculation
  });
  let updatedBody = requestBody;
  let updatedHeaders = headers;
  if (checksumAlgorithm) {
    switch (checksumAlgorithm) {
      case "CRC32" /* CRC32 */:
        (0, import_core.setFeature)(context, "FLEXIBLE_CHECKSUMS_REQ_CRC32", "U");
        break;
      case "CRC32C" /* CRC32C */:
        (0, import_core.setFeature)(context, "FLEXIBLE_CHECKSUMS_REQ_CRC32C", "V");
        break;
      case "CRC64NVME" /* CRC64NVME */:
        (0, import_core.setFeature)(context, "FLEXIBLE_CHECKSUMS_REQ_CRC64", "W");
        break;
      case "SHA1" /* SHA1 */:
        (0, import_core.setFeature)(context, "FLEXIBLE_CHECKSUMS_REQ_SHA1", "X");
        break;
      case "SHA256" /* SHA256 */:
        (0, import_core.setFeature)(context, "FLEXIBLE_CHECKSUMS_REQ_SHA256", "Y");
        break;
    }
    const checksumLocationName = getChecksumLocationName(checksumAlgorithm);
    const checksumAlgorithmFn = selectChecksumAlgorithmFunction(checksumAlgorithm, config);
    if (isStreaming(requestBody)) {
      const { getAwsChunkedEncodingStream, bodyLengthChecker } = config;
      updatedBody = getAwsChunkedEncodingStream(
        typeof config.requestStreamBufferSize === "number" && config.requestStreamBufferSize >= 8 * 1024 ? (0, import_util_stream.createBufferedReadable)(requestBody, config.requestStreamBufferSize, context.logger) : requestBody,
        {
          base64Encoder,
          bodyLengthChecker,
          checksumLocationName,
          checksumAlgorithmFn,
          streamHasher
        }
      );
      updatedHeaders = {
        ...headers,
        "content-encoding": headers["content-encoding"] ? `${headers["content-encoding"]},aws-chunked` : "aws-chunked",
        "transfer-encoding": "chunked",
        "x-amz-decoded-content-length": headers["content-length"],
        "x-amz-content-sha256": "STREAMING-UNSIGNED-PAYLOAD-TRAILER",
        "x-amz-trailer": checksumLocationName
      };
      delete updatedHeaders["content-length"];
    } else if (!hasHeader(checksumLocationName, headers)) {
      const rawChecksum = await stringHasher(checksumAlgorithmFn, requestBody);
      updatedHeaders = {
        ...headers,
        [checksumLocationName]: base64Encoder(rawChecksum)
      };
    }
  }
  const result = await next({
    ...args,
    request: {
      ...request,
      headers: updatedHeaders,
      body: updatedBody
    }
  });
  return result;
}, "flexibleChecksumsMiddleware");

// src/flexibleChecksumsInputMiddleware.ts

var flexibleChecksumsInputMiddlewareOptions = {
  name: "flexibleChecksumsInputMiddleware",
  toMiddleware: "serializerMiddleware",
  relation: "before",
  tags: ["BODY_CHECKSUM"],
  override: true
};
var flexibleChecksumsInputMiddleware = /* @__PURE__ */ __name((config, middlewareConfig) => (next, context) => async (args) => {
  const input = args.input;
  const { requestValidationModeMember } = middlewareConfig;
  const requestChecksumCalculation = await config.requestChecksumCalculation();
  const responseChecksumValidation = await config.responseChecksumValidation();
  switch (requestChecksumCalculation) {
    case RequestChecksumCalculation.WHEN_REQUIRED:
      (0, import_core.setFeature)(context, "FLEXIBLE_CHECKSUMS_REQ_WHEN_REQUIRED", "a");
      break;
    case RequestChecksumCalculation.WHEN_SUPPORTED:
      (0, import_core.setFeature)(context, "FLEXIBLE_CHECKSUMS_REQ_WHEN_SUPPORTED", "Z");
      break;
  }
  switch (responseChecksumValidation) {
    case ResponseChecksumValidation.WHEN_REQUIRED:
      (0, import_core.setFeature)(context, "FLEXIBLE_CHECKSUMS_RES_WHEN_REQUIRED", "c");
      break;
    case ResponseChecksumValidation.WHEN_SUPPORTED:
      (0, import_core.setFeature)(context, "FLEXIBLE_CHECKSUMS_RES_WHEN_SUPPORTED", "b");
      break;
  }
  if (requestValidationModeMember && !input[requestValidationModeMember]) {
    if (responseChecksumValidation === ResponseChecksumValidation.WHEN_SUPPORTED) {
      input[requestValidationModeMember] = "ENABLED";
    }
  }
  return next(args);
}, "flexibleChecksumsInputMiddleware");

// src/flexibleChecksumsResponseMiddleware.ts


// src/getChecksumAlgorithmListForResponse.ts
var getChecksumAlgorithmListForResponse = /* @__PURE__ */ __name((responseAlgorithms = []) => {
  const validChecksumAlgorithms = [];
  for (const algorithm of PRIORITY_ORDER_ALGORITHMS) {
    if (!responseAlgorithms.includes(algorithm) || !CLIENT_SUPPORTED_ALGORITHMS.includes(algorithm)) {
      continue;
    }
    validChecksumAlgorithms.push(algorithm);
  }
  return validChecksumAlgorithms;
}, "getChecksumAlgorithmListForResponse");

// src/isChecksumWithPartNumber.ts
var isChecksumWithPartNumber = /* @__PURE__ */ __name((checksum) => {
  const lastHyphenIndex = checksum.lastIndexOf("-");
  if (lastHyphenIndex !== -1) {
    const numberPart = checksum.slice(lastHyphenIndex + 1);
    if (!numberPart.startsWith("0")) {
      const number = parseInt(numberPart, 10);
      if (!isNaN(number) && number >= 1 && number <= 1e4) {
        return true;
      }
    }
  }
  return false;
}, "isChecksumWithPartNumber");

// src/validateChecksumFromResponse.ts


// src/getChecksum.ts
var getChecksum = /* @__PURE__ */ __name(async (body, { checksumAlgorithmFn, base64Encoder }) => base64Encoder(await stringHasher(checksumAlgorithmFn, body)), "getChecksum");

// src/validateChecksumFromResponse.ts
var validateChecksumFromResponse = /* @__PURE__ */ __name(async (response, { config, responseAlgorithms, logger }) => {
  const checksumAlgorithms = getChecksumAlgorithmListForResponse(responseAlgorithms);
  const { body: responseBody, headers: responseHeaders } = response;
  for (const algorithm of checksumAlgorithms) {
    const responseHeader = getChecksumLocationName(algorithm);
    const checksumFromResponse = responseHeaders[responseHeader];
    if (checksumFromResponse) {
      let checksumAlgorithmFn;
      try {
        checksumAlgorithmFn = selectChecksumAlgorithmFunction(algorithm, config);
      } catch (error) {
        if (algorithm === "CRC64NVME" /* CRC64NVME */) {
          logger?.warn(`Skipping ${"CRC64NVME" /* CRC64NVME */} checksum validation: ${error.message}`);
          continue;
        }
        throw error;
      }
      const { base64Encoder } = config;
      if (isStreaming(responseBody)) {
        response.body = (0, import_util_stream.createChecksumStream)({
          expectedChecksum: checksumFromResponse,
          checksumSourceLocation: responseHeader,
          checksum: new checksumAlgorithmFn(),
          source: responseBody,
          base64Encoder
        });
        return;
      }
      const checksum = await getChecksum(responseBody, { checksumAlgorithmFn, base64Encoder });
      if (checksum === checksumFromResponse) {
        break;
      }
      throw new Error(
        `Checksum mismatch: expected "${checksum}" but received "${checksumFromResponse}" in response header "${responseHeader}".`
      );
    }
  }
}, "validateChecksumFromResponse");

// src/flexibleChecksumsResponseMiddleware.ts
var flexibleChecksumsResponseMiddlewareOptions = {
  name: "flexibleChecksumsResponseMiddleware",
  toMiddleware: "deserializerMiddleware",
  relation: "after",
  tags: ["BODY_CHECKSUM"],
  override: true
};
var flexibleChecksumsResponseMiddleware = /* @__PURE__ */ __name((config, middlewareConfig) => (next, context) => async (args) => {
  if (!import_protocol_http.HttpRequest.isInstance(args.request)) {
    return next(args);
  }
  const input = args.input;
  const result = await next(args);
  const response = result.response;
  const { requestValidationModeMember, responseAlgorithms } = middlewareConfig;
  if (requestValidationModeMember && input[requestValidationModeMember] === "ENABLED") {
    const { clientName, commandName } = context;
    const isS3WholeObjectMultipartGetResponseChecksum = clientName === "S3Client" && commandName === "GetObjectCommand" && getChecksumAlgorithmListForResponse(responseAlgorithms).every((algorithm) => {
      const responseHeader = getChecksumLocationName(algorithm);
      const checksumFromResponse = response.headers[responseHeader];
      return !checksumFromResponse || isChecksumWithPartNumber(checksumFromResponse);
    });
    if (isS3WholeObjectMultipartGetResponseChecksum) {
      return result;
    }
    await validateChecksumFromResponse(response, {
      config,
      responseAlgorithms,
      logger: context.logger
    });
  }
  return result;
}, "flexibleChecksumsResponseMiddleware");

// src/getFlexibleChecksumsPlugin.ts
var getFlexibleChecksumsPlugin = /* @__PURE__ */ __name((config, middlewareConfig) => ({
  applyToStack: /* @__PURE__ */ __name((clientStack) => {
    clientStack.add(flexibleChecksumsMiddleware(config, middlewareConfig), flexibleChecksumsMiddlewareOptions);
    clientStack.addRelativeTo(
      flexibleChecksumsInputMiddleware(config, middlewareConfig),
      flexibleChecksumsInputMiddlewareOptions
    );
    clientStack.addRelativeTo(
      flexibleChecksumsResponseMiddleware(config, middlewareConfig),
      flexibleChecksumsResponseMiddlewareOptions
    );
  }, "applyToStack")
}), "getFlexibleChecksumsPlugin");

// src/resolveFlexibleChecksumsConfig.ts
var import_util_middleware = require("@smithy/util-middleware");
var resolveFlexibleChecksumsConfig = /* @__PURE__ */ __name((input) => {
  const { requestChecksumCalculation, responseChecksumValidation, requestStreamBufferSize } = input;
  return Object.assign(input, {
    requestChecksumCalculation: (0, import_util_middleware.normalizeProvider)(requestChecksumCalculation ?? DEFAULT_REQUEST_CHECKSUM_CALCULATION),
    responseChecksumValidation: (0, import_util_middleware.normalizeProvider)(responseChecksumValidation ?? DEFAULT_RESPONSE_CHECKSUM_VALIDATION),
    requestStreamBufferSize: Number(requestStreamBufferSize ?? 0)
  });
}, "resolveFlexibleChecksumsConfig");
// Annotate the CommonJS export names for ESM import in node:

0 && (module.exports = {
  ENV_REQUEST_CHECKSUM_CALCULATION,
  CONFIG_REQUEST_CHECKSUM_CALCULATION,
  NODE_REQUEST_CHECKSUM_CALCULATION_CONFIG_OPTIONS,
  ENV_RESPONSE_CHECKSUM_VALIDATION,
  CONFIG_RESPONSE_CHECKSUM_VALIDATION,
  NODE_RESPONSE_CHECKSUM_VALIDATION_CONFIG_OPTIONS,
  RequestChecksumCalculation,
  DEFAULT_REQUEST_CHECKSUM_CALCULATION,
  ResponseChecksumValidation,
  DEFAULT_RESPONSE_CHECKSUM_VALIDATION,
  ChecksumAlgorithm,
  ChecksumLocation,
  DEFAULT_CHECKSUM_ALGORITHM,
  crc64NvmeCrtContainer,
  flexibleChecksumsMiddlewareOptions,
  flexibleChecksumsMiddleware,
  getFlexibleChecksumsPlugin,
  resolveFlexibleChecksumsConfig
});

