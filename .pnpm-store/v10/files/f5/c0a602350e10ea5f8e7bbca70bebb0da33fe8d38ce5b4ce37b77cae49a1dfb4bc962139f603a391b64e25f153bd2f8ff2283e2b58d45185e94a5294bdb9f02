import type { TextRange } from './TextRange';
/**
 * Distinguishes different types of Token objects.
 */
export declare enum TokenKind {
    /**
     * A token representing the end of the input.  The Token.range will be an empty range
     * at the end of the provided input.
     */
    EndOfInput = 2001,
    /**
     * A token representing a virtual newline.
     * The Token.range will be an empty range, because the actual newline character may
     * be noncontiguous due to the doc comment delimiter trimming.
     */
    Newline = 2002,
    /**
     * A token representing one or more spaces and tabs (but not newlines or end of input).
     */
    Spacing = 2003,
    /**
     * A token representing one or more ASCII letters, numbers, and underscores.
     */
    AsciiWord = 2004,
    /**
     * A single ASCII character that behaves like punctuation, e.g. doesn't need whitespace
     * around it when adjacent to a letter.  The Token.range will always be a string of length 1.
     */
    OtherPunctuation = 2005,
    /**
     * A token representing a sequence of non-ASCII printable characters that are not punctuation.
     */
    Other = 2006,
    /**
     * The backslash character `\`.
     * The Token.range will always be a string of length 1.
     */
    Backslash = 2007,
    /**
     * The less-than character `<`.
     * The Token.range will always be a string of length 1.
     */
    LessThan = 2008,
    /**
     * The greater-than character `>`.
     * The Token.range will always be a string of length 1.
     */
    GreaterThan = 2009,
    /**
     * The equals character `=`.
     * The Token.range will always be a string of length 1.
     */
    Equals = 2010,
    /**
     * The single-quote character `'`.
     * The Token.range will always be a string of length 1.
     */
    SingleQuote = 2011,
    /**
     * The double-quote character `"`.
     * The Token.range will always be a string of length 1.
     */
    DoubleQuote = 2012,
    /**
     * The slash character `/`.
     * The Token.range will always be a string of length 1.
     */
    Slash = 2013,
    /**
     * The hyphen character `-`.
     * The Token.range will always be a string of length 1.
     */
    Hyphen = 2014,
    /**
     * The at-sign character `@`.
     * The Token.range will always be a string of length 1.
     */
    AtSign = 2015,
    /**
     * The left curly bracket character `{`.
     * The Token.range will always be a string of length 1.
     */
    LeftCurlyBracket = 2016,
    /**
     * The right curly bracket character `}`.
     * The Token.range will always be a string of length 1.
     */
    RightCurlyBracket = 2017,
    /**
     * The backtick character.
     * The Token.range will always be a string of length 1.
     */
    Backtick = 2018,
    /**
     * The period character.
     * The Token.range will always be a string of length 1.
     */
    Period = 2019,
    /**
     * The colon character.
     * The Token.range will always be a string of length 1.
     */
    Colon = 2020,
    /**
     * The comma character.
     * The Token.range will always be a string of length 1.
     */
    Comma = 2021,
    /**
     * The left square bracket character.
     * The Token.range will always be a string of length 1.
     */
    LeftSquareBracket = 2022,
    /**
     * The right square bracket character.
     * The Token.range will always be a string of length 1.
     */
    RightSquareBracket = 2023,
    /**
     * The pipe character `|`.
     * The Token.range will always be a string of length 1.
     */
    Pipe = 2024,
    /**
     * The left parenthesis character.
     * The Token.range will always be a string of length 1.
     */
    LeftParenthesis = 2025,
    /**
     * The right parenthesis character.
     * The Token.range will always be a string of length 1.
     */
    RightParenthesis = 2026,
    /**
     * The pound character ("#").
     * The Token.range will always be a string of length 1.
     */
    PoundSymbol = 2027,
    /**
     * The plus character ("+").
     * The Token.range will always be a string of length 1.
     */
    Plus = 2028,
    /**
     * The dollar sign character ("$").
     * The Token.range will always be a string of length 1.
     */
    DollarSign = 2029
}
/**
 * Represents a contiguous range of characters extracted from one of the doc comment lines
 * being processed by the Tokenizer.  There is a token representing a newline, but otherwise
 * a single token cannot span multiple lines.
 */
export declare class Token {
    /**
     * The kind of token
     */
    readonly kind: TokenKind;
    /**
     * The contiguous input range corresponding to the token.  This range will never
     * contain a newline character.
     */
    readonly range: TextRange;
    /**
     * The doc comment "line" that this Token was extracted from.
     */
    readonly line: TextRange;
    constructor(kind: TokenKind, range: TextRange, line: TextRange);
    toString(): string;
}
//# sourceMappingURL=Token.d.ts.map