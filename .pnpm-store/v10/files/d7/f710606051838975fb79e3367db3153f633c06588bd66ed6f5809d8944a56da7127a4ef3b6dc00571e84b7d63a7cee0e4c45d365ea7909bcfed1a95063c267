"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleFixedSizeExemplarReservoir = void 0;
const ExemplarReservoir_1 = require("./ExemplarReservoir");
/**
 * Fixed size reservoir that uses equivalent of naive reservoir sampling
 * algorithm to accept measurements.
 *
 */
class SimpleFixedSizeExemplarReservoir extends ExemplarReservoir_1.FixedSizeExemplarReservoirBase {
    _numMeasurementsSeen;
    constructor(size) {
        super(size);
        this._numMeasurementsSeen = 0;
    }
    getRandomInt(min, max) {
        //[min, max)
        return Math.floor(Math.random() * (max - min) + min);
    }
    _findBucketIndex(_value, _timestamp, _attributes, _ctx) {
        if (this._numMeasurementsSeen < this._size)
            return this._numMeasurementsSeen++;
        const index = this.getRandomInt(0, ++this._numMeasurementsSeen);
        return index < this._size ? index : -1;
    }
    offer(value, timestamp, attributes, ctx) {
        const index = this._findBucketIndex(value, timestamp, attributes, ctx);
        if (index !== -1) {
            this._reservoirStorage[index].offer(value, timestamp, attributes, ctx);
        }
    }
    reset() {
        this._numMeasurementsSeen = 0;
    }
}
exports.SimpleFixedSizeExemplarReservoir = SimpleFixedSizeExemplarReservoir;
//# sourceMappingURL=SimpleFixedSizeExemplarReservoir.js.map