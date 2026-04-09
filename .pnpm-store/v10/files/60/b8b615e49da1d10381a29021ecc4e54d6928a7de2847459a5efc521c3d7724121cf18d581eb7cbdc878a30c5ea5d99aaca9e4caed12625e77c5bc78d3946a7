"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenSequence = void 0;
const TextRange_1 = require("./TextRange");
/**
 * Represents a sequence of tokens extracted from `ParserContext.tokens`.
 * This sequence is defined by a starting index and ending index into that array.
 */
class TokenSequence {
    constructor(parameters) {
        this.parserContext = parameters.parserContext;
        this._startIndex = parameters.startIndex;
        this._endIndex = parameters.endIndex;
        this._validateBounds();
    }
    /**
     * Constructs a TokenSequence object with no tokens.
     */
    static createEmpty(parserContext) {
        return new TokenSequence({ parserContext, startIndex: 0, endIndex: 0 });
    }
    /**
     * The starting index into the associated `ParserContext.tokens` list.
     */
    get startIndex() {
        return this._startIndex;
    }
    /**
     * The (non-inclusive) ending index into the associated `ParserContext.tokens` list.
     */
    get endIndex() {
        return this._endIndex;
    }
    get tokens() {
        return this.parserContext.tokens.slice(this._startIndex, this._endIndex);
    }
    /**
     * Constructs a TokenSequence that corresponds to a different range of tokens,
     * e.g. a subrange.
     */
    getNewSequence(startIndex, endIndex) {
        return new TokenSequence({
            parserContext: this.parserContext,
            startIndex: startIndex,
            endIndex: endIndex
        });
    }
    /**
     * Returns a TextRange that includes all tokens in the sequence (including any additional
     * characters between doc comment lines).
     */
    getContainingTextRange() {
        if (this.isEmpty()) {
            return TextRange_1.TextRange.empty;
        }
        return this.parserContext.sourceRange.getNewRange(this.parserContext.tokens[this._startIndex].range.pos, this.parserContext.tokens[this._endIndex - 1].range.end);
    }
    isEmpty() {
        return this._startIndex === this._endIndex;
    }
    /**
     * Returns the concatenated text of all the tokens.
     */
    toString() {
        return this.tokens.map((x) => x.toString()).join('');
    }
    _validateBounds() {
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
    }
}
exports.TokenSequence = TokenSequence;
//# sourceMappingURL=TokenSequence.js.map