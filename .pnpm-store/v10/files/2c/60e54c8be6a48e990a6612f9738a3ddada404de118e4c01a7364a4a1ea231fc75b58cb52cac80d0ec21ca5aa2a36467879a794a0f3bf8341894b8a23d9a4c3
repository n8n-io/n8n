"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tokenizer = void 0;
const TextRange_1 = require("./TextRange");
const Token_1 = require("./Token");
class Tokenizer {
    /**
     * Given a list of input lines, this returns an array of extracted tokens.
     * The last token will always be TokenKind.EndOfInput.
     */
    static readTokens(lines) {
        Tokenizer._ensureInitialized();
        const tokens = [];
        let lastLine = undefined;
        for (const line of lines) {
            Tokenizer._pushTokensForLine(tokens, line);
            lastLine = line;
        }
        if (lastLine) {
            tokens.push(new Token_1.Token(Token_1.TokenKind.EndOfInput, lastLine.getNewRange(lastLine.end, lastLine.end), lastLine));
        }
        else {
            tokens.push(new Token_1.Token(Token_1.TokenKind.EndOfInput, TextRange_1.TextRange.empty, TextRange_1.TextRange.empty));
        }
        return tokens;
    }
    /**
     * Returns true if the token is a CommonMark punctuation character.
     * These are basically all the ASCII punctuation characters.
     */
    static isPunctuation(tokenKind) {
        Tokenizer._ensureInitialized();
        return Tokenizer._punctuationTokens[tokenKind] || false;
    }
    static _pushTokensForLine(tokens, line) {
        const buffer = line.buffer;
        const end = line.end;
        let bufferIndex = line.pos;
        let tokenKind = undefined;
        let tokenPos = bufferIndex;
        while (bufferIndex < end) {
            // Read a character and determine its kind
            const charCode = buffer.charCodeAt(bufferIndex);
            let characterKind = Tokenizer._charCodeMap[charCode];
            if (characterKind === undefined) {
                characterKind = Token_1.TokenKind.Other;
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
                    tokens.push(new Token_1.Token(tokenKind, line.getNewRange(tokenPos, bufferIndex), line));
                }
                tokenPos = bufferIndex;
                tokenKind = characterKind;
            }
            ++bufferIndex;
        }
        // Is there a previous completed token to push?
        if (tokenKind !== undefined) {
            tokens.push(new Token_1.Token(tokenKind, line.getNewRange(tokenPos, bufferIndex), line));
        }
        tokens.push(new Token_1.Token(Token_1.TokenKind.Newline, line.getNewRange(line.end, line.end), line));
    }
    /**
     * Returns true if the token can be comprised of multiple characters
     */
    static _isMultiCharacterToken(kind) {
        switch (kind) {
            case Token_1.TokenKind.Spacing:
            case Token_1.TokenKind.AsciiWord:
            case Token_1.TokenKind.Other:
                return true;
        }
        return false;
    }
    static _ensureInitialized() {
        if (Tokenizer._charCodeMap) {
            return;
        }
        Tokenizer._charCodeMap = {};
        Tokenizer._punctuationTokens = {};
        // All Markdown punctuation characters
        const punctuation = Tokenizer._commonMarkPunctuationCharacters;
        for (let i = 0; i < punctuation.length; ++i) {
            const charCode = punctuation.charCodeAt(i);
            Tokenizer._charCodeMap[charCode] = Token_1.TokenKind.OtherPunctuation;
        }
        // Special symbols
        // !"#$%&\'()*+,\-.\/:;<=>?@[\\]^_`{|}~
        const specialMap = {
            '\\': Token_1.TokenKind.Backslash,
            '<': Token_1.TokenKind.LessThan,
            '>': Token_1.TokenKind.GreaterThan,
            '=': Token_1.TokenKind.Equals,
            "'": Token_1.TokenKind.SingleQuote,
            '"': Token_1.TokenKind.DoubleQuote,
            '/': Token_1.TokenKind.Slash,
            '-': Token_1.TokenKind.Hyphen,
            '@': Token_1.TokenKind.AtSign,
            '{': Token_1.TokenKind.LeftCurlyBracket,
            '}': Token_1.TokenKind.RightCurlyBracket,
            '`': Token_1.TokenKind.Backtick,
            '.': Token_1.TokenKind.Period,
            ':': Token_1.TokenKind.Colon,
            ',': Token_1.TokenKind.Comma,
            '[': Token_1.TokenKind.LeftSquareBracket,
            ']': Token_1.TokenKind.RightSquareBracket,
            '|': Token_1.TokenKind.Pipe,
            '(': Token_1.TokenKind.LeftParenthesis,
            ')': Token_1.TokenKind.RightParenthesis,
            '#': Token_1.TokenKind.PoundSymbol,
            '+': Token_1.TokenKind.Plus,
            $: Token_1.TokenKind.DollarSign
        };
        for (const key of Object.getOwnPropertyNames(specialMap)) {
            Tokenizer._charCodeMap[key.charCodeAt(0)] = specialMap[key];
            Tokenizer._punctuationTokens[specialMap[key]] = true;
        }
        Tokenizer._punctuationTokens[Token_1.TokenKind.OtherPunctuation] = true;
        const word = Tokenizer._wordCharacters;
        for (let i = 0; i < word.length; ++i) {
            const charCode = word.charCodeAt(i);
            Tokenizer._charCodeMap[charCode] = Token_1.TokenKind.AsciiWord;
        }
        Tokenizer._charCodeMap[' '.charCodeAt(0)] = Token_1.TokenKind.Spacing;
        Tokenizer._charCodeMap['\t'.charCodeAt(0)] = Token_1.TokenKind.Spacing;
    }
}
exports.Tokenizer = Tokenizer;
Tokenizer._commonMarkPunctuationCharacters = '!"#$%&\'()*+,-./:;<=>?@[\\]^`{|}~';
Tokenizer._wordCharacters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_';
//# sourceMappingURL=Tokenizer.js.map