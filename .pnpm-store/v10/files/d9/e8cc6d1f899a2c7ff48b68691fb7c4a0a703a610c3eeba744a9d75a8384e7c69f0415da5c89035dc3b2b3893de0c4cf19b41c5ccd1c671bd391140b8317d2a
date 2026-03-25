"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Token = exports.TokenKind = void 0;
/**
 * Distinguishes different types of Token objects.
 */
var TokenKind;
(function (TokenKind) {
    /**
     * A token representing the end of the input.  The Token.range will be an empty range
     * at the end of the provided input.
     */
    TokenKind[TokenKind["EndOfInput"] = 2001] = "EndOfInput";
    /**
     * A token representing a virtual newline.
     * The Token.range will be an empty range, because the actual newline character may
     * be noncontiguous due to the doc comment delimiter trimming.
     */
    TokenKind[TokenKind["Newline"] = 2002] = "Newline";
    /**
     * A token representing one or more spaces and tabs (but not newlines or end of input).
     */
    TokenKind[TokenKind["Spacing"] = 2003] = "Spacing";
    /**
     * A token representing one or more ASCII letters, numbers, and underscores.
     */
    TokenKind[TokenKind["AsciiWord"] = 2004] = "AsciiWord";
    /**
     * A single ASCII character that behaves like punctuation, e.g. doesn't need whitespace
     * around it when adjacent to a letter.  The Token.range will always be a string of length 1.
     */
    TokenKind[TokenKind["OtherPunctuation"] = 2005] = "OtherPunctuation";
    /**
     * A token representing a sequence of non-ASCII printable characters that are not punctuation.
     */
    TokenKind[TokenKind["Other"] = 2006] = "Other";
    /**
     * The backslash character `\`.
     * The Token.range will always be a string of length 1.
     */
    TokenKind[TokenKind["Backslash"] = 2007] = "Backslash";
    /**
     * The less-than character `<`.
     * The Token.range will always be a string of length 1.
     */
    TokenKind[TokenKind["LessThan"] = 2008] = "LessThan";
    /**
     * The greater-than character `>`.
     * The Token.range will always be a string of length 1.
     */
    TokenKind[TokenKind["GreaterThan"] = 2009] = "GreaterThan";
    /**
     * The equals character `=`.
     * The Token.range will always be a string of length 1.
     */
    TokenKind[TokenKind["Equals"] = 2010] = "Equals";
    /**
     * The single-quote character `'`.
     * The Token.range will always be a string of length 1.
     */
    TokenKind[TokenKind["SingleQuote"] = 2011] = "SingleQuote";
    /**
     * The double-quote character `"`.
     * The Token.range will always be a string of length 1.
     */
    TokenKind[TokenKind["DoubleQuote"] = 2012] = "DoubleQuote";
    /**
     * The slash character `/`.
     * The Token.range will always be a string of length 1.
     */
    TokenKind[TokenKind["Slash"] = 2013] = "Slash";
    /**
     * The hyphen character `-`.
     * The Token.range will always be a string of length 1.
     */
    TokenKind[TokenKind["Hyphen"] = 2014] = "Hyphen";
    /**
     * The at-sign character `@`.
     * The Token.range will always be a string of length 1.
     */
    TokenKind[TokenKind["AtSign"] = 2015] = "AtSign";
    /**
     * The left curly bracket character `{`.
     * The Token.range will always be a string of length 1.
     */
    TokenKind[TokenKind["LeftCurlyBracket"] = 2016] = "LeftCurlyBracket";
    /**
     * The right curly bracket character `}`.
     * The Token.range will always be a string of length 1.
     */
    TokenKind[TokenKind["RightCurlyBracket"] = 2017] = "RightCurlyBracket";
    /**
     * The backtick character.
     * The Token.range will always be a string of length 1.
     */
    TokenKind[TokenKind["Backtick"] = 2018] = "Backtick";
    /**
     * The period character.
     * The Token.range will always be a string of length 1.
     */
    TokenKind[TokenKind["Period"] = 2019] = "Period";
    /**
     * The colon character.
     * The Token.range will always be a string of length 1.
     */
    TokenKind[TokenKind["Colon"] = 2020] = "Colon";
    /**
     * The comma character.
     * The Token.range will always be a string of length 1.
     */
    TokenKind[TokenKind["Comma"] = 2021] = "Comma";
    /**
     * The left square bracket character.
     * The Token.range will always be a string of length 1.
     */
    TokenKind[TokenKind["LeftSquareBracket"] = 2022] = "LeftSquareBracket";
    /**
     * The right square bracket character.
     * The Token.range will always be a string of length 1.
     */
    TokenKind[TokenKind["RightSquareBracket"] = 2023] = "RightSquareBracket";
    /**
     * The pipe character `|`.
     * The Token.range will always be a string of length 1.
     */
    TokenKind[TokenKind["Pipe"] = 2024] = "Pipe";
    /**
     * The left parenthesis character.
     * The Token.range will always be a string of length 1.
     */
    TokenKind[TokenKind["LeftParenthesis"] = 2025] = "LeftParenthesis";
    /**
     * The right parenthesis character.
     * The Token.range will always be a string of length 1.
     */
    TokenKind[TokenKind["RightParenthesis"] = 2026] = "RightParenthesis";
    /**
     * The pound character ("#").
     * The Token.range will always be a string of length 1.
     */
    TokenKind[TokenKind["PoundSymbol"] = 2027] = "PoundSymbol";
    /**
     * The plus character ("+").
     * The Token.range will always be a string of length 1.
     */
    TokenKind[TokenKind["Plus"] = 2028] = "Plus";
    /**
     * The dollar sign character ("$").
     * The Token.range will always be a string of length 1.
     */
    TokenKind[TokenKind["DollarSign"] = 2029] = "DollarSign";
})(TokenKind || (exports.TokenKind = TokenKind = {}));
/**
 * Represents a contiguous range of characters extracted from one of the doc comment lines
 * being processed by the Tokenizer.  There is a token representing a newline, but otherwise
 * a single token cannot span multiple lines.
 */
var Token = /** @class */ (function () {
    function Token(kind, range, line) {
        this.kind = kind;
        this.range = range;
        this.line = line;
    }
    Token.prototype.toString = function () {
        if (this.kind === TokenKind.Newline) {
            return '\n';
        }
        return this.range.toString();
    };
    return Token;
}());
exports.Token = Token;
//# sourceMappingURL=Token.js.map