/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { FixedSizeExemplarReservoirBase } from './ExemplarReservoir';
/**
 * AlignedHistogramBucketExemplarReservoir takes the same boundaries
 * configuration of a Histogram. This algorithm keeps the last seen measurement
 * that falls within a histogram bucket.
 */
export class AlignedHistogramBucketExemplarReservoir extends FixedSizeExemplarReservoirBase {
    _boundaries;
    constructor(boundaries) {
        super(boundaries.length + 1);
        this._boundaries = boundaries;
    }
    _findBucketIndex(value, _timestamp, _attributes, _ctx) {
        for (let i = 0; i < this._boundaries.length; i++) {
            if (value <= this._boundaries[i]) {
                return i;
            }
        }
        return this._boundaries.length;
    }
    offer(value, timestamp, attributes, ctx) {
        const index = this._findBucketIndex(value, timestamp, attributes, ctx);
        this._reservoirStorage[index].offer(value, timestamp, attributes, ctx);
    }
}
//# sourceMappingURL=AlignedHistogramBucketExemplarReservoir.js.map