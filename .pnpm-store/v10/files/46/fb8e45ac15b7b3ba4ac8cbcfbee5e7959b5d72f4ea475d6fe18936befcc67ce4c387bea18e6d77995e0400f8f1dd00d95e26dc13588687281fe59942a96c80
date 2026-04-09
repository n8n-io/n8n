/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { SeverityNumber } from '@opentelemetry/api-logs';
import { context, trace, TraceFlags, isSpanContextValid, } from '@opentelemetry/api';
import { LogRecordImpl } from './LogRecordImpl';
export class Logger {
    instrumentationScope;
    _sharedState;
    _loggerConfig;
    constructor(instrumentationScope, sharedState) {
        this.instrumentationScope = instrumentationScope;
        this._sharedState = sharedState;
        // Cache the logger configuration at construction time
        // Since we don't support re-configuration, this avoids map lookups
        // and string allocations on each emit() call
        this._loggerConfig = this._sharedState.getLoggerConfig(this.instrumentationScope);
    }
    emit(logRecord) {
        const loggerConfig = this._loggerConfig;
        const currentContext = logRecord.context || context.active();
        // Apply minimum severity filtering
        const recordSeverity = logRecord.severityNumber ?? SeverityNumber.UNSPECIFIED;
        // 1. Minimum severity: If the log record's SeverityNumber is specified
        //    (i.e. not 0) and is less than the configured minimum_severity,
        //    the log record MUST be dropped.
        if (recordSeverity !== SeverityNumber.UNSPECIFIED &&
            recordSeverity < loggerConfig.minimumSeverity) {
            // Log record is dropped due to minimum severity filter
            return;
        }
        // 2. Trace-based: If trace_based is true, and if the log record has a
        //    SpanId and the TraceFlags SAMPLED flag is unset, the log record MUST be dropped.
        if (loggerConfig.traceBased) {
            const spanContext = trace.getSpanContext(currentContext);
            if (spanContext && isSpanContextValid(spanContext)) {
                // Check if the trace is unsampled (SAMPLED flag is unset)
                const isSampled = (spanContext.traceFlags & TraceFlags.SAMPLED) === TraceFlags.SAMPLED;
                if (!isSampled) {
                    // Log record is dropped due to trace-based filter
                    return;
                }
            }
            // If there's no valid span context, the log record is not associated with a trace
            // and therefore bypasses trace-based filtering (as per spec)
        }
        /**
         * If a Logger was obtained with include_trace_context=true,
         * the LogRecords it emits MUST automatically include the Trace Context from the active Context,
         * if Context has not been explicitly set.
         */
        const logRecordInstance = new LogRecordImpl(this._sharedState, this.instrumentationScope, {
            context: currentContext,
            ...logRecord,
        });
        /**
         * the explicitly passed Context,
         * the current Context, or an empty Context if the Logger was obtained with include_trace_context=false
         */
        this._sharedState.activeProcessor.onEmit(logRecordInstance, currentContext);
        /**
         * A LogRecordProcessor may freely modify logRecord for the duration of the OnEmit call.
         * If logRecord is needed after OnEmit returns (i.e. for asynchronous processing) only reads are permitted.
         */
        logRecordInstance._makeReadonly();
    }
}
//# sourceMappingURL=Logger.js.map