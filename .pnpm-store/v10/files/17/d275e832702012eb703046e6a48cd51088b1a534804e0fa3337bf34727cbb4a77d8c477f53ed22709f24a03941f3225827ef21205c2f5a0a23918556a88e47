/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { isSpanContextValid, trace, TraceFlags, } from '@opentelemetry/api';
export class WithTraceExemplarFilter {
    shouldSample(value, timestamp, attributes, ctx) {
        const spanContext = trace.getSpanContext(ctx);
        if (!spanContext || !isSpanContextValid(spanContext))
            return false;
        return spanContext.traceFlags & TraceFlags.SAMPLED ? true : false;
    }
}
//# sourceMappingURL=WithTraceExemplarFilter.js.map