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
export { baggageEntryMetadataFromString } from './baggage/utils';
// Context APIs
export { createContextKey, ROOT_CONTEXT } from './context/context';
// Diag APIs
export { DiagConsoleLogger } from './diag/consoleLogger';
export { DiagLogLevel, } from './diag/types';
// Metrics APIs
export { createNoopMeter } from './metrics/NoopMeter';
export { ValueType, } from './metrics/Metric';
// Propagation APIs
export { defaultTextMapGetter, defaultTextMapSetter, } from './propagation/TextMapPropagator';
export { ProxyTracer } from './trace/ProxyTracer';
export { ProxyTracerProvider } from './trace/ProxyTracerProvider';
export { SamplingDecision } from './trace/SamplingResult';
export { SpanKind } from './trace/span_kind';
export { SpanStatusCode } from './trace/status';
export { TraceFlags } from './trace/trace_flags';
export { createTraceState } from './trace/internal/utils';
export { isSpanContextValid, isValidTraceId, isValidSpanId, } from './trace/spancontext-utils';
export { INVALID_SPANID, INVALID_TRACEID, INVALID_SPAN_CONTEXT, } from './trace/invalid-span-constants';
// Split module-level variable definition into separate files to allow
// tree-shaking on each api instance.
import { context } from './context-api';
import { diag } from './diag-api';
import { metrics } from './metrics-api';
import { propagation } from './propagation-api';
import { trace } from './trace-api';
// Named export.
export { context, diag, metrics, propagation, trace };
// Default export.
export default {
    context,
    diag,
    metrics,
    propagation,
    trace,
};
//# sourceMappingURL=index.js.map