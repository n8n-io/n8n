"use strict";
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT = exports.DEFAULT_ATTRIBUTE_COUNT_LIMIT = exports.TraceState = exports.unsuppressTracing = exports.suppressTracing = exports.isTracingSuppressed = exports.TraceIdRatioBasedSampler = exports.ParentBasedSampler = exports.AlwaysOnSampler = exports.AlwaysOffSampler = exports.setRPCMetadata = exports.getRPCMetadata = exports.deleteRPCMetadata = exports.RPCType = exports.parseTraceParent = exports.W3CTraceContextPropagator = exports.TRACE_STATE_HEADER = exports.TRACE_PARENT_HEADER = exports.CompositePropagator = exports.unrefTimer = exports.otperformance = exports.hexToBase64 = exports.getEnvWithoutDefaults = exports.getEnv = exports._globalThis = exports.SDK_INFO = exports.RandomIdGenerator = exports.baggageUtils = exports.ExportResultCode = exports.hexToBinary = exports.timeInputToHrTime = exports.millisToHrTime = exports.isTimeInputHrTime = exports.isTimeInput = exports.hrTimeToTimeStamp = exports.hrTimeToNanoseconds = exports.hrTimeToMilliseconds = exports.hrTimeToMicroseconds = exports.hrTimeDuration = exports.hrTime = exports.getTimeOrigin = exports.addHrTimes = exports.loggingErrorHandler = exports.setGlobalErrorHandler = exports.globalErrorHandler = exports.sanitizeAttributes = exports.isAttributeValue = exports.isAttributeKey = exports.AnchoredClock = exports.W3CBaggagePropagator = void 0;
exports.internal = exports.VERSION = exports.BindOnceFuture = exports.isWrapped = exports.urlMatches = exports.isUrlIgnored = exports.callWithTimeout = exports.TimeoutError = exports.TracesSamplerValues = exports.merge = exports.parseEnvironment = exports.DEFAULT_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT = exports.DEFAULT_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT = exports.DEFAULT_ENVIRONMENT = void 0;
var W3CBaggagePropagator_1 = require("./baggage/propagation/W3CBaggagePropagator");
Object.defineProperty(exports, "W3CBaggagePropagator", { enumerable: true, get: function () { return W3CBaggagePropagator_1.W3CBaggagePropagator; } });
var anchored_clock_1 = require("./common/anchored-clock");
Object.defineProperty(exports, "AnchoredClock", { enumerable: true, get: function () { return anchored_clock_1.AnchoredClock; } });
var attributes_1 = require("./common/attributes");
Object.defineProperty(exports, "isAttributeKey", { enumerable: true, get: function () { return attributes_1.isAttributeKey; } });
Object.defineProperty(exports, "isAttributeValue", { enumerable: true, get: function () { return attributes_1.isAttributeValue; } });
Object.defineProperty(exports, "sanitizeAttributes", { enumerable: true, get: function () { return attributes_1.sanitizeAttributes; } });
var global_error_handler_1 = require("./common/global-error-handler");
Object.defineProperty(exports, "globalErrorHandler", { enumerable: true, get: function () { return global_error_handler_1.globalErrorHandler; } });
Object.defineProperty(exports, "setGlobalErrorHandler", { enumerable: true, get: function () { return global_error_handler_1.setGlobalErrorHandler; } });
var logging_error_handler_1 = require("./common/logging-error-handler");
Object.defineProperty(exports, "loggingErrorHandler", { enumerable: true, get: function () { return logging_error_handler_1.loggingErrorHandler; } });
var time_1 = require("./common/time");
Object.defineProperty(exports, "addHrTimes", { enumerable: true, get: function () { return time_1.addHrTimes; } });
Object.defineProperty(exports, "getTimeOrigin", { enumerable: true, get: function () { return time_1.getTimeOrigin; } });
Object.defineProperty(exports, "hrTime", { enumerable: true, get: function () { return time_1.hrTime; } });
Object.defineProperty(exports, "hrTimeDuration", { enumerable: true, get: function () { return time_1.hrTimeDuration; } });
Object.defineProperty(exports, "hrTimeToMicroseconds", { enumerable: true, get: function () { return time_1.hrTimeToMicroseconds; } });
Object.defineProperty(exports, "hrTimeToMilliseconds", { enumerable: true, get: function () { return time_1.hrTimeToMilliseconds; } });
Object.defineProperty(exports, "hrTimeToNanoseconds", { enumerable: true, get: function () { return time_1.hrTimeToNanoseconds; } });
Object.defineProperty(exports, "hrTimeToTimeStamp", { enumerable: true, get: function () { return time_1.hrTimeToTimeStamp; } });
Object.defineProperty(exports, "isTimeInput", { enumerable: true, get: function () { return time_1.isTimeInput; } });
Object.defineProperty(exports, "isTimeInputHrTime", { enumerable: true, get: function () { return time_1.isTimeInputHrTime; } });
Object.defineProperty(exports, "millisToHrTime", { enumerable: true, get: function () { return time_1.millisToHrTime; } });
Object.defineProperty(exports, "timeInputToHrTime", { enumerable: true, get: function () { return time_1.timeInputToHrTime; } });
var hex_to_binary_1 = require("./common/hex-to-binary");
Object.defineProperty(exports, "hexToBinary", { enumerable: true, get: function () { return hex_to_binary_1.hexToBinary; } });
var ExportResult_1 = require("./ExportResult");
Object.defineProperty(exports, "ExportResultCode", { enumerable: true, get: function () { return ExportResult_1.ExportResultCode; } });
const utils_1 = require("./baggage/utils");
exports.baggageUtils = {
    getKeyPairs: utils_1.getKeyPairs,
    serializeKeyPairs: utils_1.serializeKeyPairs,
    parseKeyPairsIntoRecord: utils_1.parseKeyPairsIntoRecord,
    parsePairKeyValue: utils_1.parsePairKeyValue,
};
var platform_1 = require("./platform");
Object.defineProperty(exports, "RandomIdGenerator", { enumerable: true, get: function () { return platform_1.RandomIdGenerator; } });
Object.defineProperty(exports, "SDK_INFO", { enumerable: true, get: function () { return platform_1.SDK_INFO; } });
Object.defineProperty(exports, "_globalThis", { enumerable: true, get: function () { return platform_1._globalThis; } });
Object.defineProperty(exports, "getEnv", { enumerable: true, get: function () { return platform_1.getEnv; } });
Object.defineProperty(exports, "getEnvWithoutDefaults", { enumerable: true, get: function () { return platform_1.getEnvWithoutDefaults; } });
Object.defineProperty(exports, "hexToBase64", { enumerable: true, get: function () { return platform_1.hexToBase64; } });
Object.defineProperty(exports, "otperformance", { enumerable: true, get: function () { return platform_1.otperformance; } });
Object.defineProperty(exports, "unrefTimer", { enumerable: true, get: function () { return platform_1.unrefTimer; } });
var composite_1 = require("./propagation/composite");
Object.defineProperty(exports, "CompositePropagator", { enumerable: true, get: function () { return composite_1.CompositePropagator; } });
var W3CTraceContextPropagator_1 = require("./trace/W3CTraceContextPropagator");
Object.defineProperty(exports, "TRACE_PARENT_HEADER", { enumerable: true, get: function () { return W3CTraceContextPropagator_1.TRACE_PARENT_HEADER; } });
Object.defineProperty(exports, "TRACE_STATE_HEADER", { enumerable: true, get: function () { return W3CTraceContextPropagator_1.TRACE_STATE_HEADER; } });
Object.defineProperty(exports, "W3CTraceContextPropagator", { enumerable: true, get: function () { return W3CTraceContextPropagator_1.W3CTraceContextPropagator; } });
Object.defineProperty(exports, "parseTraceParent", { enumerable: true, get: function () { return W3CTraceContextPropagator_1.parseTraceParent; } });
var rpc_metadata_1 = require("./trace/rpc-metadata");
Object.defineProperty(exports, "RPCType", { enumerable: true, get: function () { return rpc_metadata_1.RPCType; } });
Object.defineProperty(exports, "deleteRPCMetadata", { enumerable: true, get: function () { return rpc_metadata_1.deleteRPCMetadata; } });
Object.defineProperty(exports, "getRPCMetadata", { enumerable: true, get: function () { return rpc_metadata_1.getRPCMetadata; } });
Object.defineProperty(exports, "setRPCMetadata", { enumerable: true, get: function () { return rpc_metadata_1.setRPCMetadata; } });
var AlwaysOffSampler_1 = require("./trace/sampler/AlwaysOffSampler");
Object.defineProperty(exports, "AlwaysOffSampler", { enumerable: true, get: function () { return AlwaysOffSampler_1.AlwaysOffSampler; } });
var AlwaysOnSampler_1 = require("./trace/sampler/AlwaysOnSampler");
Object.defineProperty(exports, "AlwaysOnSampler", { enumerable: true, get: function () { return AlwaysOnSampler_1.AlwaysOnSampler; } });
var ParentBasedSampler_1 = require("./trace/sampler/ParentBasedSampler");
Object.defineProperty(exports, "ParentBasedSampler", { enumerable: true, get: function () { return ParentBasedSampler_1.ParentBasedSampler; } });
var TraceIdRatioBasedSampler_1 = require("./trace/sampler/TraceIdRatioBasedSampler");
Object.defineProperty(exports, "TraceIdRatioBasedSampler", { enumerable: true, get: function () { return TraceIdRatioBasedSampler_1.TraceIdRatioBasedSampler; } });
var suppress_tracing_1 = require("./trace/suppress-tracing");
Object.defineProperty(exports, "isTracingSuppressed", { enumerable: true, get: function () { return suppress_tracing_1.isTracingSuppressed; } });
Object.defineProperty(exports, "suppressTracing", { enumerable: true, get: function () { return suppress_tracing_1.suppressTracing; } });
Object.defineProperty(exports, "unsuppressTracing", { enumerable: true, get: function () { return suppress_tracing_1.unsuppressTracing; } });
var TraceState_1 = require("./trace/TraceState");
Object.defineProperty(exports, "TraceState", { enumerable: true, get: function () { return TraceState_1.TraceState; } });
var environment_1 = require("./utils/environment");
Object.defineProperty(exports, "DEFAULT_ATTRIBUTE_COUNT_LIMIT", { enumerable: true, get: function () { return environment_1.DEFAULT_ATTRIBUTE_COUNT_LIMIT; } });
Object.defineProperty(exports, "DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT", { enumerable: true, get: function () { return environment_1.DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT; } });
Object.defineProperty(exports, "DEFAULT_ENVIRONMENT", { enumerable: true, get: function () { return environment_1.DEFAULT_ENVIRONMENT; } });
Object.defineProperty(exports, "DEFAULT_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT", { enumerable: true, get: function () { return environment_1.DEFAULT_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT; } });
Object.defineProperty(exports, "DEFAULT_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT", { enumerable: true, get: function () { return environment_1.DEFAULT_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT; } });
Object.defineProperty(exports, "parseEnvironment", { enumerable: true, get: function () { return environment_1.parseEnvironment; } });
var merge_1 = require("./utils/merge");
Object.defineProperty(exports, "merge", { enumerable: true, get: function () { return merge_1.merge; } });
var sampling_1 = require("./utils/sampling");
Object.defineProperty(exports, "TracesSamplerValues", { enumerable: true, get: function () { return sampling_1.TracesSamplerValues; } });
var timeout_1 = require("./utils/timeout");
Object.defineProperty(exports, "TimeoutError", { enumerable: true, get: function () { return timeout_1.TimeoutError; } });
Object.defineProperty(exports, "callWithTimeout", { enumerable: true, get: function () { return timeout_1.callWithTimeout; } });
var url_1 = require("./utils/url");
Object.defineProperty(exports, "isUrlIgnored", { enumerable: true, get: function () { return url_1.isUrlIgnored; } });
Object.defineProperty(exports, "urlMatches", { enumerable: true, get: function () { return url_1.urlMatches; } });
var wrap_1 = require("./utils/wrap");
Object.defineProperty(exports, "isWrapped", { enumerable: true, get: function () { return wrap_1.isWrapped; } });
var callback_1 = require("./utils/callback");
Object.defineProperty(exports, "BindOnceFuture", { enumerable: true, get: function () { return callback_1.BindOnceFuture; } });
var version_1 = require("./version");
Object.defineProperty(exports, "VERSION", { enumerable: true, get: function () { return version_1.VERSION; } });
const exporter_1 = require("./internal/exporter");
exports.internal = {
    _export: exporter_1._export,
};
//# sourceMappingURL=index.js.map