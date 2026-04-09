"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Buckets = void 0;
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
class Buckets {
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
    constructor(backing = new BucketsBacking(), indexBase = 0, indexStart = 0, indexEnd = 0) {
        this.backing = backing;
        this.indexBase = indexBase;
        this.indexStart = indexStart;
        this.indexEnd = indexEnd;
    }
    /**
     * Offset is the bucket index of the smallest entry in the counts array
     * @returns {number}
     */
    get offset() {
        return this.indexStart;
    }
    /**
     * Buckets is a view into the backing array.
     * @returns {number}
     */
    get length() {
        if (this.backing.length === 0) {
            return 0;
        }
        if (this.indexEnd === this.indexStart && this.at(0) === 0) {
            return 0;
        }
        return this.indexEnd - this.indexStart + 1;
    }
    /**
     * An array of counts, where count[i] carries the count
     * of the bucket at index (offset+i).  count[i] is the count of
     * values greater than base^(offset+i) and less than or equal to
     * base^(offset+i+1).
     * @returns {number} The logical counts based on the backing array
     */
    counts() {
        return Array.from({ length: this.length }, (_, i) => this.at(i));
    }
    /**
     * At returns the count of the bucket at a position in the logical
     * array of counts.
     * @param position
     * @returns {number}
     */
    at(position) {
        const bias = this.indexBase - this.indexStart;
        if (position < bias) {
            position += this.backing.length;
        }
        position -= bias;
        return this.backing.countAt(position);
    }
    /**
     * incrementBucket increments the backing array index by `increment`
     * @param bucketIndex
     * @param increment
     */
    incrementBucket(bucketIndex, increment) {
        this.backing.increment(bucketIndex, increment);
    }
    /**
     * decrementBucket decrements the backing array index by `decrement`
     * if decrement is greater than the current value, it's set to 0.
     * @param bucketIndex
     * @param decrement
     */
    decrementBucket(bucketIndex, decrement) {
        this.backing.decrement(bucketIndex, decrement);
    }
    /**
     * trim removes leading and / or trailing zero buckets (which can occur
     * after diffing two histos) and rotates the backing array so that the
     * smallest non-zero index is in the 0th position of the backing array
     */
    trim() {
        for (let i = 0; i < this.length; i++) {
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
        for (let i = this.length - 1; i >= 0; i--) {
            if (this.at(i) !== 0) {
                this.indexEnd -= this.length - i - 1;
                break;
            }
        }
        this._rotate();
    }
    /**
     * downscale first rotates, then collapses 2**`by`-to-1 buckets.
     * @param by
     */
    downscale(by) {
        this._rotate();
        const size = 1 + this.indexEnd - this.indexStart;
        const each = 1 << by;
        let inpos = 0;
        let outpos = 0;
        for (let pos = this.indexStart; pos <= this.indexEnd;) {
            let mod = pos % each;
            if (mod < 0) {
                mod += each;
            }
            for (let i = mod; i < each && inpos < size; i++) {
                this._relocateBucket(outpos, inpos);
                inpos++;
                pos++;
            }
            outpos++;
        }
        this.indexStart >>= by;
        this.indexEnd >>= by;
        this.indexBase = this.indexStart;
    }
    /**
     * Clone returns a deep copy of Buckets
     * @returns {Buckets}
     */
    clone() {
        return new Buckets(this.backing.clone(), this.indexBase, this.indexStart, this.indexEnd);
    }
    /**
     * _rotate shifts the backing array contents so that indexStart ==
     * indexBase to simplify the downscale logic.
     */
    _rotate() {
        const bias = this.indexBase - this.indexStart;
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
    }
    /**
     * _relocateBucket adds the count in counts[src] to counts[dest] and
     * resets count[src] to zero.
     */
    _relocateBucket(dest, src) {
        if (dest === src) {
            return;
        }
        this.incrementBucket(dest, this.backing.emptyBucket(src));
    }
}
exports.Buckets = Buckets;
/**
 * BucketsBacking holds the raw buckets and some utility methods to
 * manage them.
 */
class BucketsBacking {
    constructor(_counts = [0]) {
        this._counts = _counts;
    }
    /**
     * length returns the physical size of the backing array, which
     * is >= buckets.length()
     */
    get length() {
        return this._counts.length;
    }
    /**
     * countAt returns the count in a specific bucket
     */
    countAt(pos) {
        return this._counts[pos];
    }
    /**
     * growTo grows a backing array and copies old entries
     * into their correct new positions.
     */
    growTo(newSize, oldPositiveLimit, newPositiveLimit) {
        const tmp = new Array(newSize).fill(0);
        tmp.splice(newPositiveLimit, this._counts.length - oldPositiveLimit, ...this._counts.slice(oldPositiveLimit));
        tmp.splice(0, oldPositiveLimit, ...this._counts.slice(0, oldPositiveLimit));
        this._counts = tmp;
    }
    /**
     * reverse the items in the backing array in the range [from, limit).
     */
    reverse(from, limit) {
        const num = Math.floor((from + limit) / 2) - from;
        for (let i = 0; i < num; i++) {
            const tmp = this._counts[from + i];
            this._counts[from + i] = this._counts[limit - i - 1];
            this._counts[limit - i - 1] = tmp;
        }
    }
    /**
     * emptyBucket empties the count from a bucket, for
     * moving into another.
     */
    emptyBucket(src) {
        const tmp = this._counts[src];
        this._counts[src] = 0;
        return tmp;
    }
    /**
     * increments a bucket by `increment`
     */
    increment(bucketIndex, increment) {
        this._counts[bucketIndex] += increment;
    }
    /**
     * decrements a bucket by `decrement`
     */
    decrement(bucketIndex, decrement) {
        if (this._counts[bucketIndex] >= decrement) {
            this._counts[bucketIndex] -= decrement;
        }
        else {
            // this should not happen, but we're being defensive against
            // negative counts.
            this._counts[bucketIndex] = 0;
        }
    }
    /**
     * clone returns a deep copy of BucketsBacking
     */
    clone() {
        return new BucketsBacking([...this._counts]);
    }
}
//# sourceMappingURL=Buckets.js.map