import type { ContextualKeyword } from "../tokenizer/keywords";
import { type TokenType } from "../tokenizer/types";
export declare function isContextual(contextualKeyword: ContextualKeyword): boolean;
export declare function isLookaheadContextual(contextualKeyword: ContextualKeyword): boolean;
export declare function eatContextual(contextualKeyword: ContextualKeyword): boolean;
export declare function expectContextual(contextualKeyword: ContextualKeyword): void;
export declare function canInsertSemicolon(): boolean;
export declare function hasPrecedingLineBreak(): boolean;
export declare function hasFollowingLineBreak(): boolean;
export declare function isLineTerminator(): boolean;
export declare function semicolon(): void;
export declare function expect(type: TokenType): void;
/**
 * Transition the parser to an error state. All code needs to be written to naturally unwind in this
 * state, which allows us to backtrack without exceptions and without error plumbing everywhere.
 */
export declare function unexpected(message?: string, pos?: number): void;
