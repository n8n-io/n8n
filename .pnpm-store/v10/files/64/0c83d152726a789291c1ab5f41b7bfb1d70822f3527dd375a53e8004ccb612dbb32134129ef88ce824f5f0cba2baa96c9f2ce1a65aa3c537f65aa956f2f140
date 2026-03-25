import { ContextualKeyword } from "./keywords";
import { type TokenType } from "./types";
export declare enum IdentifierRole {
    Access = 0,
    ExportAccess = 1,
    TopLevelDeclaration = 2,
    FunctionScopedDeclaration = 3,
    BlockScopedDeclaration = 4,
    ObjectShorthandTopLevelDeclaration = 5,
    ObjectShorthandFunctionScopedDeclaration = 6,
    ObjectShorthandBlockScopedDeclaration = 7,
    ObjectShorthand = 8,
    ImportDeclaration = 9,
    ObjectKey = 10,
    ImportAccess = 11
}
/**
 * Extra information on jsxTagStart tokens, used to determine which of the three
 * jsx functions are called in the automatic transform.
 */
export declare enum JSXRole {
    NoChildren = 0,
    OneChild = 1,
    StaticChildren = 2,
    KeyAfterPropSpread = 3
}
export declare function isDeclaration(token: Token): boolean;
export declare function isNonTopLevelDeclaration(token: Token): boolean;
export declare function isTopLevelDeclaration(token: Token): boolean;
export declare function isBlockScopedDeclaration(token: Token): boolean;
export declare function isFunctionScopedDeclaration(token: Token): boolean;
export declare function isObjectShorthandDeclaration(token: Token): boolean;
export declare class Token {
    constructor();
    type: TokenType;
    contextualKeyword: ContextualKeyword;
    start: number;
    end: number;
    scopeDepth: number;
    isType: boolean;
    identifierRole: IdentifierRole | null;
    jsxRole: JSXRole | null;
    shadowsGlobal: boolean;
    isAsyncOperation: boolean;
    contextId: number | null;
    rhsEndIndex: number | null;
    isExpression: boolean;
    numNullishCoalesceStarts: number;
    numNullishCoalesceEnds: number;
    isOptionalChainStart: boolean;
    isOptionalChainEnd: boolean;
    subscriptStartIndex: number | null;
    nullishStartIndex: number | null;
}
export declare function next(): void;
export declare function nextTemplateToken(): void;
export declare function retokenizeSlashAsRegex(): void;
export declare function pushTypeContext(existingTokensInType: number): boolean;
export declare function popTypeContext(oldIsType: boolean): void;
export declare function eat(type: TokenType): boolean;
export declare function eatTypeToken(tokenType: TokenType): void;
export declare function match(type: TokenType): boolean;
export declare function lookaheadType(): TokenType;
export declare class TypeAndKeyword {
    type: TokenType;
    contextualKeyword: ContextualKeyword;
    constructor(type: TokenType, contextualKeyword: ContextualKeyword);
}
export declare function lookaheadTypeAndKeyword(): TypeAndKeyword;
export declare function nextTokenStart(): number;
export declare function nextTokenStartSince(pos: number): number;
export declare function lookaheadCharCode(): number;
export declare function nextToken(): void;
export declare function skipLineComment(startSkip: number): void;
export declare function skipSpace(): void;
export declare function finishToken(type: TokenType, contextualKeyword?: ContextualKeyword): void;
/**
 * Reinterpret a possible > token when transitioning from a type to a non-type
 * context.
 *
 * This comes up in two situations where >= needs to be treated as one token:
 * - After an `as` expression, like in the code `a as T >= 1`.
 * - In a type argument in an expression context, e.g. `f(a < b, c >= d)`, we
 *   need to see the token as >= so that we get an error and backtrack to
 *   normal expression parsing.
 *
 * Other situations require >= to be seen as two tokens, e.g.
 * `const x: Array<T>=[];`, so it's important to treat > as its own token in
 * typical type parsing situations.
 */
export declare function rescan_gt(): void;
export declare function getTokenFromCode(code: number): void;
export declare function skipWord(): void;
