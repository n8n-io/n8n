// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { TextRange } from './TextRange';
import { Token, TokenKind } from './Token';
var Tokenizer = /** @class */ (function () {
    function Tokenizer() {
    }
    /**
     * Given a list of input lines, this returns an array of extracted tokens.
     * The last token will always be TokenKind.EndOfInput.
     */
    Tokenizer.readTokens = function (lines) {
        Tokenizer._ensureInitialized();
        var tokens = [];
        var lastLine = undefined;
        for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
            var line = lines_1[_i];
            Tokenizer._pushTokensForLine(tokens, line);
            lastLine = line;
        }
        if (lastLine) {
            tokens.push(new Token(TokenKind.EndOfInput, lastLine.getNewRange(lastLine.end, lastLine.end), lastLine));
        }
        else {
            tokens.push(new Token(TokenKind.EndOfInput, TextRange.empty, TextRange.empty));
        }
        return tokens;
    };
    /**
     * Returns true if the token is a CommonMark punctuation character.
     * These are basically all the ASCII punctuation characters.
     */
    Tokenizer.isPunctuation = function (tokenKind) {
        Tokenizer._ensureInitialized();
        return Tokenizer._punctuationTokens[tokenKind] || false;
    };
    Tokenizer._pushTokensForLine = function (tokens, line) {
        var buffer = line.buffer;
        var end = line.end;
        var bufferIndex = line.pos;
        var tokenKind = undefined;
        var tokenPos = bufferIndex;
        while (bufferIndex < end) {
            // Read a character and determine its kind
            var charCode = buffer.charCodeAt(bufferIndex);
            var characterKind = Tokenizer._charCodeMap[charCode];
            if (characterKind === undefined) {
                characterKind = TokenKind.Other;
            }
            // Can we append to an existing token?  Yes if:
            // 1. There is an existing token, AND
            // 2. It is the same kind of token, AND
            // 3. It's not punctuation (which is always one character)
            if (tokenKind !== undefined &&
                characterKind === tokenKind &&
                Tokenizer._isMultiCharacterToken(tokenKind)) {
                // yes, append
            }
            else {
                // Is there a previous completed token to push?
                if (tokenKind !== undefined) {
                    tokens.push(new Token(tokenKind, line.getNewRange(tokenPos, bufferIndex), line));
                }
                tokenPos = bufferIndex;
                tokenKind = characterKind;
            }
            ++bufferIndex;
        }
        // Is there a previous completed token to push?
        if (tokenKind !== undefined) {
            tokens.push(new Token(tokenKind, line.getNewRange(tokenPos, bufferIndex), line));
        }
        tokens.push(new Token(TokenKind.Newline, line.getNewRange(line.end, line.end), line));
    };
    /**
     * Returns true if the token can be comprised of multiple characters
     */
    Tokenizer._isMultiCharacterToken = function (kind) {
        switch (kind) {
            case TokenKind.Spacing:
            case TokenKind.AsciiWord:
            case TokenKind.Other:
                return true;
        }
        return false;
    };
    Tokenizer._ensureInitialized = function () {
        if (Tokenizer._charCodeMap) {
            return;
        }
        Tokenizer._charCodeMap = {};
        Tokenizer._punctuationTokens = {};
        // All Markdown punctuation characters
        var punctuation = Tokenizer._commonMarkPunctuationCharacters;
        for (var i = 0; i < punctuation.length; ++i) {
            var charCode = punctuation.charCodeAt(i);
            Tokenizer._charCodeMap[charCode] = TokenKind.OtherPunctuation;
        }
        // Special symbols
        // !"#$%&\'()*+,\-.\/:;<=>?@[\\]^_`{|}~
        var specialMap = {
            '\\': TokenKind.Backslash,
            '<': TokenKind.LessThan,
            '>': TokenKind.GreaterThan,
            '=': TokenKind.Equals,
            "'": TokenKind.SingleQuote,
            '"': TokenKind.DoubleQuote,
            '/': TokenKind.Slash,
            '-': TokenKind.Hyphen,
            '@': TokenKind.AtSign,
            '{': TokenKind.LeftCurlyBracket,
            '}': TokenKind.RightCurlyBracket,
            '`': TokenKind.Backtick,
            '.': TokenKind.Period,
            ':': TokenKind.Colon,
            ',': TokenKind.Comma,
            '[': TokenKind.LeftSquareBracket,
            ']': TokenKind.RightSquareBracket,
            '|': TokenKind.Pipe,
            '(': TokenKind.LeftParenthesis,
            ')': TokenKind.RightParenthesis,
            '#': TokenKind.PoundSymbol,
            '+': TokenKind.Plus,
            $: TokenKind.DollarSign
        };
        for (var _i = 0, _a = Object.getOwnPropertyNames(specialMap); _i < _a.length; _i++) {
            var key = _a[_i];
            Tokenizer._charCodeMap[key.charCodeAt(0)] = specialMap[key];
            Tokenizer._punctuationTokens[specialMap[key]] = true;
        }
        Tokenizer._punctuationTokens[TokenKind.OtherPunctuation] = true;
        var word = Tokenizer._wordCharacters;
        for (var i = 0; i < word.length; ++i) {
            var charCode = word.charCodeAt(i);
            Tokenizer._charCodeMap[charCode] = TokenKind.AsciiWord;
        }
        Tokenizer._charCodeMap[' '.charCodeAt(0)] = TokenKind.Spacing;
        Tokenizer._charCodeMap['\t'.charCodeAt(0)] = TokenKind.Spacing;
    };
    Tokenizer._commonMarkPunctuationCharacters = '!"#$%&\'()*+,-./:;<=>?@[\\]^`{|}~';
    Tokenizer._wordCharacters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_';
    return Tokenizer;
}());
export { Tokenizer };
//# sourceMappingURL=Tokenizer.js.map