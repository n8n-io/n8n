"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * This is a TypeScript port of the original Java version, which was written by
 * Gil Tene as described in
 * https://github.com/HdrHistogram/HdrHistogram
 * and released to the public domain, as explained at
 * http://creativecommons.org/publicdomain/zero/1.0/
 */
const JsHistogram_1 = require("./JsHistogram");
class TypedArrayHistogram extends JsHistogram_1.default {
    constructor(arrayCtr, lowestDiscernibleValue, highestTrackableValue, numberOfSignificantValueDigits) {
        super(lowestDiscernibleValue, highestTrackableValue, numberOfSignificantValueDigits);
        this.arrayCtr = arrayCtr;
        this._totalCount = 0;
        this._counts = new arrayCtr(this.countsArrayLength);
    }
    clearCounts() {
        this._counts.fill(0);
    }
    incrementCountAtIndex(index) {
        const currentCount = this._counts[index];
        const newCount = currentCount + 1;
        if (newCount < 0) {
            throw newCount + " would overflow short integer count";
        }
        this._counts[index] = newCount;
    }
    addToCountAtIndex(index, value) {
        const currentCount = this._counts[index];
        const newCount = currentCount + value;
        if (newCount < Number.MIN_SAFE_INTEGER ||
            newCount > Number.MAX_SAFE_INTEGER) {
            throw newCount + " would overflow integer count";
        }
        this._counts[index] = newCount;
    }
    setCountAtIndex(index, value) {
        if (value < Number.MIN_SAFE_INTEGER || value > Number.MAX_SAFE_INTEGER) {
            throw value + " would overflow integer count";
        }
        this._counts[index] = value;
    }
    resize(newHighestTrackableValue) {
        this.establishSize(newHighestTrackableValue);
        const newCounts = new this.arrayCtr(this.countsArrayLength);
        newCounts.set(this._counts);
        this._counts = newCounts;
    }
    getCountAtIndex(index) {
        return this._counts[index];
    }
    _getEstimatedFootprintInBytes() {
        return 1024 + this._counts.BYTES_PER_ELEMENT * this._counts.length;
    }
    copyCorrectedForCoordinatedOmission(expectedIntervalBetweenValueSamples) {
        const copy = new TypedArrayHistogram(this.arrayCtr, this.lowestDiscernibleValue, this.highestTrackableValue, this.numberOfSignificantValueDigits);
        copy.addWhileCorrectingForCoordinatedOmission(this, expectedIntervalBetweenValueSamples);
        return copy;
    }
    toString() {
        return `Histogram ${this._counts.BYTES_PER_ELEMENT * 8}b ${JSON.stringify(this, null, 2)}`;
    }
}
exports.default = TypedArrayHistogram;
//# sourceMappingURL=TypedArrayHistogram.js.map