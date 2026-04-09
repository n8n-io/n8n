"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlignedHistogramBucketExemplarReservoir = void 0;
const ExemplarReservoir_1 = require("./ExemplarReservoir");
/**
 * AlignedHistogramBucketExemplarReservoir takes the same boundaries
 * configuration of a Histogram. This algorithm keeps the last seen measurement
 * that falls within a histogram bucket.
 */
class AlignedHistogramBucketExemplarReservoir extends ExemplarReservoir_1.FixedSizeExemplarReservoirBase {
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
exports.AlignedHistogramBucketExemplarReservoir = AlignedHistogramBucketExemplarReservoir;
//# sourceMappingURL=AlignedHistogramBucketExemplarReservoir.js.map