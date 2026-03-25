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
export { isAttributeValue, sanitizeAttributes } from './common/attributes';
export { globalErrorHandler, setGlobalErrorHandler, } from './common/global-error-handler';
export { loggingErrorHandler } from './common/logging-error-handler';
export { addHrTimes, getTimeOrigin, hrTime, hrTimeDuration, hrTimeToMicroseconds, hrTimeToMilliseconds, hrTimeToNanoseconds, hrTimeToTimeStamp, isTimeInput, isTimeInputHrTime, millisToHrTime, timeInputToHrTime, } from './common/time';
export { ExportResultCode } from './ExportResult';
export { parseKeyPairsIntoRecord } from './baggage/utils';
export { SDK_INFO, _globalThis, getStringFromEnv, getBooleanFromEnv, getNumberFromEnv, getStringListFromEnv, otperformance, unrefTimer, } from './platform';
export { CompositePropagator, } from './propagation/composite';
export { TRACE_PARENT_HEADER, TRACE_STATE_HEADER, W3CTraceContextPropagator, parseTraceParent, } from './trace/W3CTraceContextPropagator';
export { RPCType, deleteRPCMetadata, getRPCMetadata, setRPCMetadata, } from './trace/rpc-metadata';
export { isTracingSuppressed, suppressTracing, unsuppressTracing, } from './trace/suppress-tracing';
export { TraceState } from './trace/TraceState';
export { merge } from './utils/merge';
export { TimeoutError, callWithTimeout } from './utils/timeout';
export { isUrlIgnored, urlMatches } from './utils/url';
export { BindOnceFuture } from './utils/callback';
export { diagLogLevelFromString } from './utils/configuration';
import { _export } from './internal/exporter';
export const internal = {
    _export,
};
//# sourceMappingURL=index.js.map