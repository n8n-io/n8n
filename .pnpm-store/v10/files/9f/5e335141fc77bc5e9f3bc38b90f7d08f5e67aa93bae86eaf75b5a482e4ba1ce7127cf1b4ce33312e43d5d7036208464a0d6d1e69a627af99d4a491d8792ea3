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
 * LogarithmMapping implements exponential mapping functions for scale > 0.
 * For scales <= 0 the exponent mapping should be used.
 */
export class LogarithmMapping {
    constructor(scale) {
        this._scale = scale;
        this._scaleFactor = util.ldexp(Math.LOG2E, scale);
        this._inverseFactor = util.ldexp(Math.LN2, -scale);
    }
    /**
     * Maps positive floating point values to indexes corresponding to scale
     * @param value
     * @returns {number} index for provided value at the current scale
     */
    mapToIndex(value) {
        if (value <= ieee754.MIN_VALUE) {
            return this._minNormalLowerBoundaryIndex() - 1;
        }
        // exact power of two special case
        if (ieee754.getSignificand(value) === 0) {
            const exp = ieee754.getNormalBase2(value);
            return (exp << this._scale) - 1;
        }
        // non-power of two cases. use Math.floor to round the scaled logarithm
        const index = Math.floor(Math.log(value) * this._scaleFactor);
        const maxIndex = this._maxNormalLowerBoundaryIndex();
        if (index >= maxIndex) {
            return maxIndex;
        }
        return index;
    }
    /**
     * Returns the lower bucket boundary for the given index for scale
     *
     * @param index
     * @returns {number}
     */
    lowerBoundary(index) {
        const maxIndex = this._maxNormalLowerBoundaryIndex();
        if (index >= maxIndex) {
            if (index === maxIndex) {
                return 2 * Math.exp((index - (1 << this._scale)) / this._scaleFactor);
            }
            throw new MappingError(`overflow: ${index} is > maximum lower boundary: ${maxIndex}`);
        }
        const minIndex = this._minNormalLowerBoundaryIndex();
        if (index <= minIndex) {
            if (index === minIndex) {
                return ieee754.MIN_VALUE;
            }
            else if (index === minIndex - 1) {
                return Math.exp((index + (1 << this._scale)) / this._scaleFactor) / 2;
            }
            throw new MappingError(`overflow: ${index} is < minimum lower boundary: ${minIndex}`);
        }
        return Math.exp(index * this._inverseFactor);
    }
    /**
     * The scale used by this mapping
     * @returns {number}
     */
    get scale() {
        return this._scale;
    }
    _minNormalLowerBoundaryIndex() {
        return ieee754.MIN_NORMAL_EXPONENT << this._scale;
    }
    _maxNormalLowerBoundaryIndex() {
        return ((ieee754.MAX_NORMAL_EXPONENT + 1) << this._scale) - 1;
    }
}
//# sourceMappingURL=LogarithmMapping.js.map