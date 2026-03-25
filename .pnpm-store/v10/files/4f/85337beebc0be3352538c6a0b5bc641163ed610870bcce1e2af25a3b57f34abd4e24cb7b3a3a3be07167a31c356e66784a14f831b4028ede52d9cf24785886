"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.StringBuilder = void 0;
/**
 * This class allows a large text string to be constructed incrementally by appending small chunks.  The final
 * string can be obtained by calling StringBuilder.toString().
 *
 * @remarks
 * A naive approach might use the `+=` operator to append strings:  This would have the downside of copying
 * the entire string each time a chunk is appended, resulting in `O(n^2)` bytes of memory being allocated
 * (and later freed by the garbage  collector), and many of the allocations could be very large objects.
 * StringBuilder avoids this overhead by accumulating the chunks in an array, and efficiently joining them
 * when `getText()` is finally called.
 *
 * @public
 */
class StringBuilder {
    constructor() {
        this._chunks = [];
    }
    /** {@inheritDoc IStringBuilder.append} */
    append(text) {
        this._chunks.push(text);
    }
    /** {@inheritDoc IStringBuilder.toString} */
    toString() {
        if (this._chunks.length === 0) {
            return '';
        }
        if (this._chunks.length > 1) {
            const joined = this._chunks.join('');
            this._chunks.length = 1;
            this._chunks[0] = joined;
        }
        return this._chunks[0];
    }
}
exports.StringBuilder = StringBuilder;
//# sourceMappingURL=StringBuilder.js.map