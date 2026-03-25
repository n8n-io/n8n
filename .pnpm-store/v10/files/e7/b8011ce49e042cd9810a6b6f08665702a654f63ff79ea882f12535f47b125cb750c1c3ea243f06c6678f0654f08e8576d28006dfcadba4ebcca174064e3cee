import type { HelperManager } from "./HelperManager";
import type { Token } from "./parser/tokenizer";
import type { ContextualKeyword } from "./parser/tokenizer/keywords";
import { type TokenType } from "./parser/tokenizer/types";
export interface TokenProcessorSnapshot {
    resultCode: string;
    tokenIndex: number;
}
export interface TokenProcessorResult {
    code: string;
    mappings: Array<number | undefined>;
}
export default class TokenProcessor {
    readonly code: string;
    readonly tokens: Array<Token>;
    readonly isFlowEnabled: boolean;
    readonly disableESTransforms: boolean;
    readonly helperManager: HelperManager;
    private resultCode;
    private resultMappings;
    private tokenIndex;
    constructor(code: string, tokens: Array<Token>, isFlowEnabled: boolean, disableESTransforms: boolean, helperManager: HelperManager);
    /**
     * Snapshot the token state in a way that can be restored later, useful for
     * things like lookahead.
     *
     * resultMappings do not need to be copied since in all use cases, they will
     * be overwritten anyway after restore.
     */
    snapshot(): TokenProcessorSnapshot;
    restoreToSnapshot(snapshot: TokenProcessorSnapshot): void;
    /**
     * Remove and return the code generated since the snapshot, leaving the
     * current token position in-place. Unlike most TokenProcessor operations,
     * this operation can result in input/output line number mismatches because
     * the removed code may contain newlines, so this operation should be used
     * sparingly.
     */
    dangerouslyGetAndRemoveCodeSinceSnapshot(snapshot: TokenProcessorSnapshot): string;
    reset(): void;
    matchesContextualAtIndex(index: number, contextualKeyword: ContextualKeyword): boolean;
    identifierNameAtIndex(index: number): string;
    identifierNameAtRelativeIndex(relativeIndex: number): string;
    identifierName(): string;
    identifierNameForToken(token: Token): string;
    rawCodeForToken(token: Token): string;
    stringValueAtIndex(index: number): string;
    stringValue(): string;
    stringValueForToken(token: Token): string;
    matches1AtIndex(index: number, t1: TokenType): boolean;
    matches2AtIndex(index: number, t1: TokenType, t2: TokenType): boolean;
    matches3AtIndex(index: number, t1: TokenType, t2: TokenType, t3: TokenType): boolean;
    matches1(t1: TokenType): boolean;
    matches2(t1: TokenType, t2: TokenType): boolean;
    matches3(t1: TokenType, t2: TokenType, t3: TokenType): boolean;
    matches4(t1: TokenType, t2: TokenType, t3: TokenType, t4: TokenType): boolean;
    matches5(t1: TokenType, t2: TokenType, t3: TokenType, t4: TokenType, t5: TokenType): boolean;
    matchesContextual(contextualKeyword: ContextualKeyword): boolean;
    matchesContextIdAndLabel(type: TokenType, contextId: number): boolean;
    previousWhitespaceAndComments(): string;
    replaceToken(newCode: string): void;
    replaceTokenTrimmingLeftWhitespace(newCode: string): void;
    removeInitialToken(): void;
    removeToken(): void;
    /**
     * Remove all code until the next }, accounting for balanced braces.
     */
    removeBalancedCode(): void;
    copyExpectedToken(tokenType: TokenType): void;
    copyToken(): void;
    copyTokenWithPrefix(prefix: string): void;
    private appendTokenPrefix;
    private appendTokenSuffix;
    appendCode(code: string): void;
    currentToken(): Token;
    currentTokenCode(): string;
    tokenAtRelativeIndex(relativeIndex: number): Token;
    currentIndex(): number;
    /**
     * Move to the next token. Only suitable in preprocessing steps. When
     * generating new code, you should use copyToken or removeToken.
     */
    nextToken(): void;
    previousToken(): void;
    finish(): TokenProcessorResult;
    isAtEnd(): boolean;
}
