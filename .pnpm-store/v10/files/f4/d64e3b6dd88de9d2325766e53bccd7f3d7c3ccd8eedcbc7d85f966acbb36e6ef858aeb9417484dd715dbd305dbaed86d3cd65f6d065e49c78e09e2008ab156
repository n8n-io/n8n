// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { TextRange } from './TextRange';
import { Token, TokenKind } from './Token';
export class Tokenizer {
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
            tokens.push(new Token(TokenKind.EndOfInput, lastLine.getNewRange(lastLine.end, lastLine.end), lastLine));
        }
        else {
            tokens.push(new Token(TokenKind.EndOfInput, TextRange.empty, TextRange.empty));
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
    }
    /**
     * Returns true if the token can be comprised of multiple characters
     */
    static _isMultiCharacterToken(kind) {
        switch (kind) {
            case TokenKind.Spacing:
            case TokenKind.AsciiWord:
            case TokenKind.Other:
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
            Tokenizer._charCodeMap[charCode] = TokenKind.OtherPunctuation;
        }
        // Special symbols
        // !"#$%&\'()*+,\-.\/:;<=>?@[\\]^_`{|}~
        const specialMap = {
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
        for (const key of Object.getOwnPropertyNames(specialMap)) {
            Tokenizer._charCodeMap[key.charCodeAt(0)] = specialMap[key];
            Tokenizer._punctuationTokens[specialMap[key]] = true;
        }
        Tokenizer._punctuationTokens[TokenKind.OtherPunctuation] = true;
        const word = Tokenizer._wordCharacters;
        for (let i = 0; i < word.length; ++i) {
            const charCode = word.charCodeAt(i);
            Tokenizer._charCodeMap[charCode] = TokenKind.AsciiWord;
        }
        Tokenizer._charCodeMap[' '.charCodeAt(0)] = TokenKind.Spacing;
        Tokenizer._charCodeMap['\t'.charCodeAt(0)] = TokenKind.Spacing;
    }
}
Tokenizer._commonMarkPunctuationCharacters = '!"#$%&\'()*+,-./:;<=>?@[\\]^`{|}~';
Tokenizer._wordCharacters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_';
//# sourceMappingURL=Tokenizer.js.map