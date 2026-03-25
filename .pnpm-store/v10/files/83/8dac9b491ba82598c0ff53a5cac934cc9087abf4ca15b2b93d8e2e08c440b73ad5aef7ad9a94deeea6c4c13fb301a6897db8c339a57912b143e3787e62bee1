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