/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { isValidTraceId } from '@opentelemetry/api';
import { SamplingDecision } from '../Sampler';
/** Sampler that samples a given fraction of traces based of trace id deterministically. */
export class TraceIdRatioBasedSampler {
    _ratio;
    _upperBound;
    constructor(ratio = 0) {
        this._ratio = this._normalize(ratio);
        this._upperBound = Math.floor(this._ratio * 0xffffffff);
    }
    shouldSample(context, traceId) {
        return {
            decision: isValidTraceId(traceId) && this._accumulate(traceId) < this._upperBound
                ? SamplingDecision.RECORD_AND_SAMPLED
                : SamplingDecision.NOT_RECORD,
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
//# sourceMappingURL=TraceIdRatioBasedSampler.js.map