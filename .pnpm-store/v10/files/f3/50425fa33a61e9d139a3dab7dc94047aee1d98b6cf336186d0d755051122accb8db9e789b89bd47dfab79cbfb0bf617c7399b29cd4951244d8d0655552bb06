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
export { W3CBaggagePropagator } from './baggage/propagation/W3CBaggagePropagator';
export { AnchoredClock } from './common/anchored-clock';
export { isAttributeKey, isAttributeValue, sanitizeAttributes, } from './common/attributes';
export { globalErrorHandler, setGlobalErrorHandler, } from './common/global-error-handler';
export { loggingErrorHandler } from './common/logging-error-handler';
export { addHrTimes, getTimeOrigin, hrTime, hrTimeDuration, hrTimeToMicroseconds, hrTimeToMilliseconds, hrTimeToNanoseconds, hrTimeToTimeStamp, isTimeInput, isTimeInputHrTime, millisToHrTime, timeInputToHrTime, } from './common/time';
export { hexToBinary } from './common/hex-to-binary';
export { ExportResultCode } from './ExportResult';
import { getKeyPairs, serializeKeyPairs, parseKeyPairsIntoRecord, parsePairKeyValue, } from './baggage/utils';
export var baggageUtils = {
    getKeyPairs: getKeyPairs,
    serializeKeyPairs: serializeKeyPairs,
    parseKeyPairsIntoRecord: parseKeyPairsIntoRecord,
    parsePairKeyValue: parsePairKeyValue,
};
export { RandomIdGenerator, SDK_INFO, _globalThis, getEnv, getEnvWithoutDefaults, hexToBase64, otperformance, unrefTimer, } from './platform';
export { CompositePropagator, } from './propagation/composite';
export { TRACE_PARENT_HEADER, TRACE_STATE_HEADER, W3CTraceContextPropagator, parseTraceParent, } from './trace/W3CTraceContextPropagator';
export { RPCType, deleteRPCMetadata, getRPCMetadata, setRPCMetadata, } from './trace/rpc-metadata';
export { AlwaysOffSampler } from './trace/sampler/AlwaysOffSampler';
export { AlwaysOnSampler } from './trace/sampler/AlwaysOnSampler';
export { ParentBasedSampler } from './trace/sampler/ParentBasedSampler';
export { TraceIdRatioBasedSampler } from './trace/sampler/TraceIdRatioBasedSampler';
export { isTracingSuppressed, suppressTracing, unsuppressTracing, } from './trace/suppress-tracing';
export { TraceState } from './trace/TraceState';
export { DEFAULT_ATTRIBUTE_COUNT_LIMIT, DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT, DEFAULT_ENVIRONMENT, DEFAULT_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT, DEFAULT_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT, parseEnvironment, } from './utils/environment';
export { merge } from './utils/merge';
export { TracesSamplerValues } from './utils/sampling';
export { TimeoutError, callWithTimeout } from './utils/timeout';
export { isUrlIgnored, urlMatches } from './utils/url';
export { isWrapped } from './utils/wrap';
export { BindOnceFuture } from './utils/callback';
export { VERSION } from './version';
import { _export } from './internal/exporter';
export var internal = {
    _export: _export,
};
//# sourceMappingURL=index.js.map