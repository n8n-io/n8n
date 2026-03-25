// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
/**
 * Efficiently references a range of text from a string buffer.
 */
var TextRange = /** @class */ (function () {
    function TextRange(buffer, pos, end) {
        this.buffer = buffer;
        this.pos = pos;
        this.end = end;
        this._validateBounds();
    }
    /**
     * Constructs a TextRange that corresponds to an entire string object.
     */
    TextRange.fromString = function (buffer) {
        return new TextRange(buffer, 0, buffer.length);
    };
    /**
     * Constructs a TextRange that corresponds to an entire string object.
     */
    TextRange.fromStringRange = function (buffer, pos, end) {
        return new TextRange(buffer, pos, end);
    };
    Object.defineProperty(TextRange.prototype, "length", {
        /**
         * Returns the length of the text range.
         * @remarks
         * This value is calculated as the `end` property minus the `pos` property.
         */
        get: function () {
            return this.end - this.pos;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Constructs a TextRange that corresponds to a different range of an existing buffer.
     */
    TextRange.prototype.getNewRange = function (pos, end) {
        return new TextRange(this.buffer, pos, end);
    };
    /**
     * Returns true if the length of the range is zero.  Note that the object reference may not
     * be equal to `TextRange.empty`, and the buffer may be different.
     */
    TextRange.prototype.isEmpty = function () {
        return this.pos === this.end;
    };
    /**
     * Returns the range from the associated string buffer.
     */
    TextRange.prototype.toString = function () {
        return this.buffer.substring(this.pos, this.end);
    };
    /**
     * Returns a debugging dump of the range, indicated via custom delimiters.
     * @remarks
     * For example if the delimiters are "[" and "]", and the range is 3..5 inside "1234567",
     * then the output would be "12[345]67".
     */
    TextRange.prototype.getDebugDump = function (posDelimiter, endDelimiter) {
        return (this.buffer.substring(0, this.pos) +
            posDelimiter +
            this.buffer.substring(this.pos, this.end) +
            endDelimiter +
            this.buffer.substring(this.end));
    };
    /**
     * Calculates the line and column number for the specified offset into the buffer.
     *
     * @remarks
     * This is a potentially expensive operation.
     *
     * @param index - an integer offset
     * @param buffer - the buffer
     */
    TextRange.prototype.getLocation = function (index) {
        if (index < 0 || index > this.buffer.length) {
            // No match
            return { line: 0, column: 0 };
        }
        // TODO: Consider caching or optimizing this somehow
        var line = 1;
        var column = 1;
        var currentIndex = 0;
        while (currentIndex < index) {
            var current = this.buffer[currentIndex];
            ++currentIndex;
            if (current === '\r') {
                // CR
                // Ignore '\r' and assume it will always have an accompanying '\n'
                continue;
            }
            if (current === '\n') {
                // LF
                ++line;
                column = 1;
            }
            else {
                // NOTE: For consistency with the TypeScript compiler, a tab character is assumed
                // to advance by one column
                ++column;
            }
        }
        return { line: line, column: column };
    };
    TextRange.prototype._validateBounds = function () {
        if (this.pos < 0) {
            throw new Error('TextRange.pos cannot be negative');
        }
        if (this.end < 0) {
            throw new Error('TextRange.end cannot be negative');
        }
        if (this.end < this.pos) {
            throw new Error('TextRange.end cannot be smaller than TextRange.pos');
        }
        if (this.pos > this.buffer.length) {
            throw new Error('TextRange.pos cannot exceed the associated text buffer length');
        }
        if (this.end > this.buffer.length) {
            throw new Error('TextRange.end cannot exceed the associated text buffer length');
        }
    };
    /**
     * Used to represent an empty or unknown range.
     */
    TextRange.empty = new TextRange('', 0, 0);
    return TextRange;
}());
export { TextRange };
//# sourceMappingURL=TextRange.js.map