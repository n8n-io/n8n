"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExponentMapping = void 0;
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
const ieee754 = require("./ieee754");
const util = require("../util");
const types_1 = require("./types");
/**
 * ExponentMapping implements exponential mapping functions for
 * scales <=0. For scales > 0 LogarithmMapping should be used.
 */
class ExponentMapping {
    _shift;
    constructor(scale) {
        this._shift = -scale;
    }
    /**
     * Maps positive floating point values to indexes corresponding to scale
     * @param value
     * @returns {number} index for provided value at the current scale
     */
    mapToIndex(value) {
        if (value < ieee754.MIN_VALUE) {
            return this._minNormalLowerBoundaryIndex();
        }
        const exp = ieee754.getNormalBase2(value);
        // In case the value is an exact power of two, compute a
        // correction of -1. Note, we are using a custom _rightShift
        // to accommodate a 52-bit argument, which the native bitwise
        // operators do not support
        const correction = this._rightShift(ieee754.getSignificand(value) - 1, ieee754.SIGNIFICAND_WIDTH);
        return (exp + correction) >> this._shift;
    }
    /**
     * Returns the lower bucket boundary for the given index for scale
     *
     * @param index
     * @returns {number}
     */
    lowerBoundary(index) {
        const minIndex = this._minNormalLowerBoundaryIndex();
        if (index < minIndex) {
            throw new types_1.MappingError(`underflow: ${index} is < minimum lower boundary: ${minIndex}`);
        }
        const maxIndex = this._maxNormalLowerBoundaryIndex();
        if (index > maxIndex) {
            throw new types_1.MappingError(`overflow: ${index} is > maximum lower boundary: ${maxIndex}`);
        }
        return util.ldexp(1, index << this._shift);
    }
    /**
     * The scale used by this mapping
     * @returns {number}
     */
    get scale() {
        if (this._shift === 0) {
            return 0;
        }
        return -this._shift;
    }
    _minNormalLowerBoundaryIndex() {
        let index = ieee754.MIN_NORMAL_EXPONENT >> this._shift;
        if (this._shift < 2) {
            index--;
        }
        return index;
    }
    _maxNormalLowerBoundaryIndex() {
        return ieee754.MAX_NORMAL_EXPONENT >> this._shift;
    }
    _rightShift(value, shift) {
        return Math.floor(value * Math.pow(2, -shift));
    }
}
exports.ExponentMapping = ExponentMapping;
//# sourceMappingURL=ExponentMapping.js.map