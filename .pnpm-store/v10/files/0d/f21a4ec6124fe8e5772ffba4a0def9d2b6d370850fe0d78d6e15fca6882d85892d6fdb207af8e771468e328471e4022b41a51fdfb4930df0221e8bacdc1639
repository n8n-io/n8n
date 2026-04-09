"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithTraceExemplarFilter = void 0;
const api_1 = require("@opentelemetry/api");
class WithTraceExemplarFilter {
    shouldSample(value, timestamp, attributes, ctx) {
        const spanContext = api_1.trace.getSpanContext(ctx);
        if (!spanContext || !(0, api_1.isSpanContextValid)(spanContext))
            return false;
        return spanContext.traceFlags & api_1.TraceFlags.SAMPLED ? true : false;
    }
}
exports.WithTraceExemplarFilter = WithTraceExemplarFilter;
//# sourceMappingURL=WithTraceExemplarFilter.js.map