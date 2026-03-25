"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenSequence = void 0;
var TextRange_1 = require("./TextRange");
/**
 * Represents a sequence of tokens extracted from `ParserContext.tokens`.
 * This sequence is defined by a starting index and ending index into that array.
 */
var TokenSequence = /** @class */ (function () {
    function TokenSequence(parameters) {
        this.parserContext = parameters.parserContext;
        this._startIndex = parameters.startIndex;
        this._endIndex = parameters.endIndex;
        this._validateBounds();
    }
    /**
     * Constructs a TokenSequence object with no tokens.
     */
    TokenSequence.createEmpty = function (parserContext) {
        return new TokenSequence({ parserContext: parserContext, startIndex: 0, endIndex: 0 });
    };
    Object.defineProperty(TokenSequence.prototype, "startIndex", {
        /**
         * The starting index into the associated `ParserContext.tokens` list.
         */
        get: function () {
            return this._startIndex;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(TokenSequence.prototype, "endIndex", {
        /**
         * The (non-inclusive) ending index into the associated `ParserContext.tokens` list.
         */
        get: function () {
            return this._endIndex;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(TokenSequence.prototype, "tokens", {
        get: function () {
            return this.parserContext.tokens.slice(this._startIndex, this._endIndex);
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Constructs a TokenSequence that corresponds to a different range of tokens,
     * e.g. a subrange.
     */
    TokenSequence.prototype.getNewSequence = function (startIndex, endIndex) {
        return new TokenSequence({
            parserContext: this.parserContext,
            startIndex: startIndex,
            endIndex: endIndex
        });
    };
    /**
     * Returns a TextRange that includes all tokens in the sequence (including any additional
     * characters between doc comment lines).
     */
    TokenSequence.prototype.getContainingTextRange = function () {
        if (this.isEmpty()) {
            return TextRange_1.TextRange.empty;
        }
        return this.parserContext.sourceRange.getNewRange(this.parserContext.tokens[this._startIndex].range.pos, this.parserContext.tokens[this._endIndex - 1].range.end);
    };
    TokenSequence.prototype.isEmpty = function () {
        return this._startIndex === this._endIndex;
    };
    /**
     * Returns the concatenated text of all the tokens.
     */
    TokenSequence.prototype.toString = function () {
        return this.tokens.map(function (x) { return x.toString(); }).join('');
    };
    TokenSequence.prototype._validateBounds = function () {
        if (this.startIndex < 0) {
            throw new Error('TokenSequence.startIndex cannot be negative');
        }
        if (this.endIndex < 0) {
            throw new Error('TokenSequence.endIndex cannot be negative');
        }
        if (this.endIndex < this.startIndex) {
            throw new Error('TokenSequence.endIndex cannot be smaller than TokenSequence.startIndex');
        }
        if (this.startIndex > this.parserContext.tokens.length) {
            throw new Error('TokenSequence.startIndex cannot exceed the associated token array');
        }
        if (this.endIndex > this.parserContext.tokens.length) {
            throw new Error('TokenSequence.endIndex cannot exceed the associated token array');
        }
    };
    return TokenSequence;
}());
exports.TokenSequence = TokenSequence;
//# sourceMappingURL=TokenSequence.js.map