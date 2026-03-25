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
exports.TraceIdRatioBasedSampler = void 0;
const api_1 = require("@opentelemetry/api");
const Sampler_1 = require("../Sampler");
/** Sampler that samples a given fraction of traces based of trace id deterministically. */
class TraceIdRatioBasedSampler {
    _ratio;
    _upperBound;
    constructor(_ratio = 0) {
        this._ratio = _ratio;
        this._ratio = this._normalize(_ratio);
        this._upperBound = Math.floor(this._ratio * 0xffffffff);
    }
    shouldSample(context, traceId) {
        return {
            decision: (0, api_1.isValidTraceId)(traceId) && this._accumulate(traceId) < this._upperBound
                ? Sampler_1.SamplingDecision.RECORD_AND_SAMPLED
                : Sampler_1.SamplingDecision.NOT_RECORD,
        };
    }
    toString() {
        return `TraceIdRatioBased{${this._ratio}}`;
    }
    _normalize(ratio) {
        if (typeof ratio !== 'number' || isNaN(ratio))
            return 0;
        return ratio >= 1 ? 1 : ratio <= 0 ? 0 : ratio;
    }
    _accumulate(traceId) {
        let accumulation = 0;
        for (let i = 0; i < traceId.length / 8; i++) {
            const pos = i * 8;
            const part = parseInt(traceId.slice(pos, pos + 8), 16);
            accumulation = (accumulation ^ part) >>> 0;
        }
        return accumulation;
    }
}
exports.TraceIdRatioBasedSampler = TraceIdRatioBasedSampler;
//# sourceMappingURL=TraceIdRatioBasedSampler.js.map