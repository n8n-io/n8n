import type { Token } from "./index";
import { ContextualKeyword } from "./keywords";
import { type TokenType } from "./types";
export declare class Scope {
    startTokenIndex: number;
    endTokenIndex: number;
    isFunctionScope: boolean;
    constructor(startTokenIndex: number, endTokenIndex: number, isFunctionScope: boolean);
}
export declare class StateSnapshot {
    readonly potentialArrowAt: number;
    readonly noAnonFunctionType: boolean;
    readonly inDisallowConditionalTypesContext: boolean;
    readonly tokensLength: number;
    readonly scopesLength: number;
    readonly pos: number;
    readonly type: TokenType;
    readonly contextualKeyword: ContextualKeyword;
    readonly start: number;
    readonly end: number;
    readonly isType: boolean;
    readonly scopeDepth: number;
    readonly error: Error | null;
    constructor(potentialArrowAt: number, noAnonFunctionType: boolean, inDisallowConditionalTypesContext: boolean, tokensLength: number, scopesLength: number, pos: number, type: TokenType, contextualKeyword: ContextualKeyword, start: number, end: number, isType: boolean, scopeDepth: number, error: Error | null);
}
export default class State {
    potentialArrowAt: number;
    noAnonFunctionType: boolean;
    inDisallowConditionalTypesContext: boolean;
    tokens: Array<Token>;
    scopes: Array<Scope>;
    pos: number;
    type: TokenType;
    contextualKeyword: ContextualKeyword;
    start: number;
    end: number;
    isType: boolean;
    scopeDepth: number;
    /**
     * If the parser is in an error state, then the token is always tt.eof and all functions can
     * keep executing but should be written so they don't get into an infinite loop in this situation.
     *
     * This approach, combined with the ability to snapshot and restore state, allows us to implement
     * backtracking without exceptions and without needing to explicitly propagate error states
     * everywhere.
     */
    error: Error | null;
    snapshot(): StateSnapshot;
    restoreFromSnapshot(snapshot: StateSnapshot): void;
}
