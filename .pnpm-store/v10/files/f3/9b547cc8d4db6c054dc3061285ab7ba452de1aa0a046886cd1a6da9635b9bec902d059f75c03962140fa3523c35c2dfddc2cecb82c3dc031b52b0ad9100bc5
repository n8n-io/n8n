/**
 * Represents tokens that our language understands in parsing.
 */
export declare const TOKEN_TYPES: Readonly<{
    Text: "Text";
    NumericLiteral: "NumericLiteral";
    StringLiteral: "StringLiteral";
    Identifier: "Identifier";
    Equals: "Equals";
    OpenParen: "OpenParen";
    CloseParen: "CloseParen";
    OpenStatement: "OpenStatement";
    CloseStatement: "CloseStatement";
    OpenExpression: "OpenExpression";
    CloseExpression: "CloseExpression";
    OpenSquareBracket: "OpenSquareBracket";
    CloseSquareBracket: "CloseSquareBracket";
    OpenCurlyBracket: "OpenCurlyBracket";
    CloseCurlyBracket: "CloseCurlyBracket";
    Comma: "Comma";
    Dot: "Dot";
    Colon: "Colon";
    Pipe: "Pipe";
    CallOperator: "CallOperator";
    AdditiveBinaryOperator: "AdditiveBinaryOperator";
    MultiplicativeBinaryOperator: "MultiplicativeBinaryOperator";
    ComparisonBinaryOperator: "ComparisonBinaryOperator";
    UnaryOperator: "UnaryOperator";
    Comment: "Comment";
}>;
export type TokenType = keyof typeof TOKEN_TYPES;
/**
 * Represents a single token in the template.
 */
export declare class Token {
    value: string;
    type: TokenType;
    /**
     * Constructs a new Token.
     * @param {string} value The raw value as seen inside the source code.
     * @param {TokenType} type The type of token.
     */
    constructor(value: string, type: TokenType);
}
export interface PreprocessOptions {
    trim_blocks?: boolean;
    lstrip_blocks?: boolean;
}
/**
 * Generate a list of tokens from a source string.
 */
export declare function tokenize(source: string, options?: PreprocessOptions): Token[];
//# sourceMappingURL=lexer.d.ts.map