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
import * as ieee754 from './ieee754';
import * as util from '../util';
import { MappingError } from './types';
/**
 * ExponentMapping implements exponential mapping functions for
 * scales <=0. For scales > 0 LogarithmMapping should be used.
 */
export class ExponentMapping {
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
            throw new MappingError(`underflow: ${index} is < minimum lower boundary: ${minIndex}`);
        }
        const maxIndex = this._maxNormalLowerBoundaryIndex();
        if (index > maxIndex) {
            throw new MappingError(`overflow: ${index} is > maximum lower boundary: ${maxIndex}`);
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
//# sourceMappingURL=ExponentMapping.js.map