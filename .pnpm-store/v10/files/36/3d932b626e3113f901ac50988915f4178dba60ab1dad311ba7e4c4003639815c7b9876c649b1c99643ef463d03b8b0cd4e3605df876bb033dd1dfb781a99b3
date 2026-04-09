var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
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
var Buckets = /** @class */ (function () {
    /**
     * The term index refers to the number of the exponential histogram bucket
     * used to determine its boundaries. The lower boundary of a bucket is
     * determined by base ** index and the upper boundary of a bucket is
     * determined by base ** (index + 1). index values are signed to account
     * for values less than or equal to 1.
     *
     * indexBase is the index of the 0th position in the
     * backing array, i.e., backing[0] is the count
     * in the bucket with index `indexBase`.
     *
     * indexStart is the smallest index value represented
     * in the backing array.
     *
     * indexEnd is the largest index value represented in
     * the backing array.
     */
    function Buckets(backing, indexBase, indexStart, indexEnd) {
        if (backing === void 0) { backing = new BucketsBacking(); }
        if (indexBase === void 0) { indexBase = 0; }
        if (indexStart === void 0) { indexStart = 0; }
        if (indexEnd === void 0) { indexEnd = 0; }
        this.backing = backing;
        this.indexBase = indexBase;
        this.indexStart = indexStart;
        this.indexEnd = indexEnd;
    }
    Object.defineProperty(Buckets.prototype, "offset", {
        /**
         * Offset is the bucket index of the smallest entry in the counts array
         * @returns {number}
         */
        get: function () {
            return this.indexStart;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Buckets.prototype, "length", {
        /**
         * Buckets is a view into the backing array.
         * @returns {number}
         */
        get: function () {
            if (this.backing.length === 0) {
                return 0;
            }
            if (this.indexEnd === this.indexStart && this.at(0) === 0) {
                return 0;
            }
            return this.indexEnd - this.indexStart + 1;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * An array of counts, where count[i] carries the count
     * of the bucket at index (offset+i).  count[i] is the count of
     * values greater than base^(offset+i) and less than or equal to
     * base^(offset+i+1).
     * @returns {number} The logical counts based on the backing array
     */
    Buckets.prototype.counts = function () {
        var _this = this;
        return Array.from({ length: this.length }, function (_, i) { return _this.at(i); });
    };
    /**
     * At returns the count of the bucket at a position in the logical
     * array of counts.
     * @param position
     * @returns {number}
     */
    Buckets.prototype.at = function (position) {
        var bias = this.indexBase - this.indexStart;
        if (position < bias) {
            position += this.backing.length;
        }
        position -= bias;
        return this.backing.countAt(position);
    };
    /**
     * incrementBucket increments the backing array index by `increment`
     * @param bucketIndex
     * @param increment
     */
    Buckets.prototype.incrementBucket = function (bucketIndex, increment) {
        this.backing.increment(bucketIndex, increment);
    };
    /**
     * decrementBucket decrements the backing array index by `decrement`
     * if decrement is greater than the current value, it's set to 0.
     * @param bucketIndex
     * @param decrement
     */
    Buckets.prototype.decrementBucket = function (bucketIndex, decrement) {
        this.backing.decrement(bucketIndex, decrement);
    };
    /**
     * trim removes leading and / or trailing zero buckets (which can occur
     * after diffing two histos) and rotates the backing array so that the
     * smallest non-zero index is in the 0th position of the backing array
     */
    Buckets.prototype.trim = function () {
        for (var i = 0; i < this.length; i++) {
            if (this.at(i) !== 0) {
                this.indexStart += i;
                break;
            }
            else if (i === this.length - 1) {
                //the entire array is zeroed out
                this.indexStart = this.indexEnd = this.indexBase = 0;
                return;
            }
        }
        for (var i = this.length - 1; i >= 0; i--) {
            if (this.at(i) !== 0) {
                this.indexEnd -= this.length - i - 1;
                break;
            }
        }
        this._rotate();
    };
    /**
     * downscale first rotates, then collapses 2**`by`-to-1 buckets.
     * @param by
     */
    Buckets.prototype.downscale = function (by) {
        this._rotate();
        var size = 1 + this.indexEnd - this.indexStart;
        var each = 1 << by;
        var inpos = 0;
        var outpos = 0;
        for (var pos = this.indexStart; pos <= this.indexEnd;) {
            var mod = pos % each;
            if (mod < 0) {
                mod += each;
            }
            for (var i = mod; i < each && inpos < size; i++) {
                this._relocateBucket(outpos, inpos);
                inpos++;
                pos++;
            }
            outpos++;
        }
        this.indexStart >>= by;
        this.indexEnd >>= by;
        this.indexBase = this.indexStart;
    };
    /**
     * Clone returns a deep copy of Buckets
     * @returns {Buckets}
     */
    Buckets.prototype.clone = function () {
        return new Buckets(this.backing.clone(), this.indexBase, this.indexStart, this.indexEnd);
    };
    /**
     * _rotate shifts the backing array contents so that indexStart ==
     * indexBase to simplify the downscale logic.
     */
    Buckets.prototype._rotate = function () {
        var bias = this.indexBase - this.indexStart;
        if (bias === 0) {
            return;
        }
        else if (bias > 0) {
            this.backing.reverse(0, this.backing.length);
            this.backing.reverse(0, bias);
            this.backing.reverse(bias, this.backing.length);
        }
        else {
            // negative bias, this can happen when diffing two histograms
            this.backing.reverse(0, this.backing.length);
            this.backing.reverse(0, this.backing.length + bias);
        }
        this.indexBase = this.indexStart;
    };
    /**
     * _relocateBucket adds the count in counts[src] to counts[dest] and
     * resets count[src] to zero.
     */
    Buckets.prototype._relocateBucket = function (dest, src) {
        if (dest === src) {
            return;
        }
        this.incrementBucket(dest, this.backing.emptyBucket(src));
    };
    return Buckets;
}());
export { Buckets };
/**
 * BucketsBacking holds the raw buckets and some utility methods to
 * manage them.
 */
var BucketsBacking = /** @class */ (function () {
    function BucketsBacking(_counts) {
        if (_counts === void 0) { _counts = [0]; }
        this._counts = _counts;
    }
    Object.defineProperty(BucketsBacking.prototype, "length", {
        /**
         * length returns the physical size of the backing array, which
         * is >= buckets.length()
         */
        get: function () {
            return this._counts.length;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * countAt returns the count in a specific bucket
     */
    BucketsBacking.prototype.countAt = function (pos) {
        return this._counts[pos];
    };
    /**
     * growTo grows a backing array and copies old entries
     * into their correct new positions.
     */
    BucketsBacking.prototype.growTo = function (newSize, oldPositiveLimit, newPositiveLimit) {
        var tmp = new Array(newSize).fill(0);
        tmp.splice.apply(tmp, __spreadArray([newPositiveLimit,
            this._counts.length - oldPositiveLimit], __read(this._counts.slice(oldPositiveLimit)), false));
        tmp.splice.apply(tmp, __spreadArray([0, oldPositiveLimit], __read(this._counts.slice(0, oldPositiveLimit)), false));
        this._counts = tmp;
    };
    /**
     * reverse the items in the backing array in the range [from, limit).
     */
    BucketsBacking.prototype.reverse = function (from, limit) {
        var num = Math.floor((from + limit) / 2) - from;
        for (var i = 0; i < num; i++) {
            var tmp = this._counts[from + i];
            this._counts[from + i] = this._counts[limit - i - 1];
            this._counts[limit - i - 1] = tmp;
        }
    };
    /**
     * emptyBucket empties the count from a bucket, for
     * moving into another.
     */
    BucketsBacking.prototype.emptyBucket = function (src) {
        var tmp = this._counts[src];
        this._counts[src] = 0;
        return tmp;
    };
    /**
     * increments a bucket by `increment`
     */
    BucketsBacking.prototype.increment = function (bucketIndex, increment) {
        this._counts[bucketIndex] += increment;
    };
    /**
     * decrements a bucket by `decrement`
     */
    BucketsBacking.prototype.decrement = function (bucketIndex, decrement) {
        if (this._counts[bucketIndex] >= decrement) {
            this._counts[bucketIndex] -= decrement;
        }
        else {
            // this should not happen, but we're being defensive against
            // negative counts.
            this._counts[bucketIndex] = 0;
        }
    };
    /**
     * clone returns a deep copy of BucketsBacking
     */
    BucketsBacking.prototype.clone = function () {
        return new BucketsBacking(__spreadArray([], __read(this._counts), false));
    };
    return BucketsBacking;
}());
//# sourceMappingURL=Buckets.js.map