"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenReader = void 0;
var Token_1 = require("./Token");
var TokenSequence_1 = require("./TokenSequence");
/**
 * Manages a stream of tokens that are read by the parser.
 *
 * @remarks
 * Use TokenReader.readToken() to read a token and advance the stream pointer.
 * Use TokenReader.peekToken() to preview the next token.
 * Use TokenReader.createMarker() and backtrackToMarker() to rewind to an earlier point.
 * Whenever readToken() is called, the token is added to an accumulated TokenSequence
 * that can be extracted by calling extractAccumulatedSequence().
 */
var TokenReader = /** @class */ (function () {
    function TokenReader(parserContext, embeddedTokenSequence) {
        this._parserContext = parserContext;
        this.tokens = parserContext.tokens;
        if (embeddedTokenSequence) {
            if (embeddedTokenSequence.parserContext !== this._parserContext) {
                throw new Error('The embeddedTokenSequence must use the same parser context');
            }
            this._readerStartIndex = embeddedTokenSequence.startIndex;
            this._readerEndIndex = embeddedTokenSequence.endIndex;
        }
        else {
            this._readerStartIndex = 0;
            this._readerEndIndex = this.tokens.length;
        }
        this._currentIndex = this._readerStartIndex;
        this._accumulatedStartIndex = this._readerStartIndex;
    }
    /**
     * Extracts and returns the TokenSequence that was accumulated so far by calls to readToken().
     * The next call to readToken() will start a new accumulated sequence.
     */
    TokenReader.prototype.extractAccumulatedSequence = function () {
        if (this._accumulatedStartIndex === this._currentIndex) {
            // If this happens, it indicates a parser bug:
            throw new Error('Parser assertion failed: The queue should not be empty when' +
                ' extractAccumulatedSequence() is called');
        }
        var sequence = new TokenSequence_1.TokenSequence({
            parserContext: this._parserContext,
            startIndex: this._accumulatedStartIndex,
            endIndex: this._currentIndex
        });
        this._accumulatedStartIndex = this._currentIndex;
        return sequence;
    };
    /**
     * Returns true if the accumulated sequence has any tokens yet.  This will be false
     * when the TokenReader starts, and it will be false immediately after a call
     * to extractAccumulatedSequence().  Otherwise, it will become true whenever readToken()
     * is called.
     */
    TokenReader.prototype.isAccumulatedSequenceEmpty = function () {
        return this._accumulatedStartIndex === this._currentIndex;
    };
    /**
     * Like extractAccumulatedSequence(), but returns undefined if nothing has been
     * accumulated yet.
     */
    TokenReader.prototype.tryExtractAccumulatedSequence = function () {
        if (this.isAccumulatedSequenceEmpty()) {
            return undefined;
        }
        return this.extractAccumulatedSequence();
    };
    /**
     * Asserts that isAccumulatedSequenceEmpty() should return false.  If not, an exception
     * is throw indicating a parser bug.
     */
    TokenReader.prototype.assertAccumulatedSequenceIsEmpty = function () {
        if (!this.isAccumulatedSequenceEmpty()) {
            // If this happens, it indicates a parser bug:
            var sequence = new TokenSequence_1.TokenSequence({
                parserContext: this._parserContext,
                startIndex: this._accumulatedStartIndex,
                endIndex: this._currentIndex
            });
            var tokenStrings = sequence.tokens.map(function (x) { return x.toString(); });
            throw new Error('Parser assertion failed: The queue should be empty, but it contains:\n' +
                JSON.stringify(tokenStrings));
        }
    };
    /**
     * Returns the next token that would be returned by _readToken(), without
     * consuming anything.
     */
    TokenReader.prototype.peekToken = function () {
        return this.tokens[this._currentIndex];
    };
    /**
     * Returns the TokenKind for the next token that would be returned by _readToken(), without
     * consuming anything.
     */
    TokenReader.prototype.peekTokenKind = function () {
        if (this._currentIndex >= this._readerEndIndex) {
            return Token_1.TokenKind.EndOfInput;
        }
        return this.tokens[this._currentIndex].kind;
    };
    /**
     * Like peekTokenKind(), but looks ahead two tokens.
     */
    TokenReader.prototype.peekTokenAfterKind = function () {
        if (this._currentIndex + 1 >= this._readerEndIndex) {
            return Token_1.TokenKind.EndOfInput;
        }
        return this.tokens[this._currentIndex + 1].kind;
    };
    /**
     * Like peekTokenKind(), but looks ahead three tokens.
     */
    TokenReader.prototype.peekTokenAfterAfterKind = function () {
        if (this._currentIndex + 2 >= this._readerEndIndex) {
            return Token_1.TokenKind.EndOfInput;
        }
        return this.tokens[this._currentIndex + 2].kind;
    };
    /**
     * Extract the next token from the input stream and return it.
     * The token will also be appended to the accumulated sequence, which can
     * later be accessed via extractAccumulatedSequence().
     */
    TokenReader.prototype.readToken = function () {
        if (this._currentIndex >= this._readerEndIndex) {
            // If this happens, it's a parser bug
            throw new Error('Cannot read past end of stream');
        }
        var token = this.tokens[this._currentIndex];
        if (token.kind === Token_1.TokenKind.EndOfInput) {
            // We don't allow reading the EndOfInput token, because we want _peekToken()
            // to be always guaranteed to return a valid result.
            // If this happens, it's a parser bug
            throw new Error('The EndOfInput token cannot be read');
        }
        this._currentIndex++;
        return token;
    };
    /**
     * Returns the kind of the token immediately before the current token.
     */
    TokenReader.prototype.peekPreviousTokenKind = function () {
        if (this._currentIndex === 0) {
            return Token_1.TokenKind.EndOfInput;
        }
        return this.tokens[this._currentIndex - 1].kind;
    };
    /**
     * Remembers the current position in the stream.
     */
    TokenReader.prototype.createMarker = function () {
        return this._currentIndex;
    };
    /**
     * Rewinds the stream pointer to a previous position in the stream.
     */
    TokenReader.prototype.backtrackToMarker = function (marker) {
        if (marker > this._currentIndex) {
            // If this happens, it's a parser bug
            throw new Error('The marker has expired');
        }
        this._currentIndex = marker;
        if (marker < this._accumulatedStartIndex) {
            this._accumulatedStartIndex = marker;
        }
    };
    return TokenReader;
}());
exports.TokenReader = TokenReader;
//# sourceMappingURL=TokenReader.js.map