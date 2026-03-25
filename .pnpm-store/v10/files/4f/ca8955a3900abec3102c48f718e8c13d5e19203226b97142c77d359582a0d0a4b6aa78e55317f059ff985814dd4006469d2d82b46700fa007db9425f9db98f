export declare class StopState {
    stop: boolean;
    constructor(stop: boolean);
}
export declare function parseExpression(noIn?: boolean): void;
/**
 * noIn is used when parsing a for loop so that we don't interpret a following "in" as the binary
 * operatior.
 * isWithinParens is used to indicate that we're parsing something that might be a comma expression
 * or might be an arrow function or might be a Flow type assertion (which requires explicit parens).
 * In these cases, we should allow : and ?: after the initial "left" part.
 */
export declare function parseMaybeAssign(noIn?: boolean, isWithinParens?: boolean): boolean;
export declare function baseParseMaybeAssign(noIn: boolean, isWithinParens: boolean): boolean;
export declare function baseParseConditional(noIn: boolean): void;
export declare function parseMaybeUnary(): boolean;
export declare function parseExprSubscripts(): boolean;
export declare function baseParseSubscripts(startTokenIndex: number, noCalls?: boolean): void;
/** Set 'state.stop = true' to indicate that we should stop parsing subscripts. */
export declare function baseParseSubscript(startTokenIndex: number, noCalls: boolean, stopState: StopState): void;
export declare function atPossibleAsync(): boolean;
export declare function parseCallExpressionArguments(): void;
export declare function parseExprAtom(): boolean;
export declare function parseLiteral(): void;
export declare function parseParenExpression(): void;
export declare function parseArrow(): boolean;
export declare function parseTemplate(): void;
export declare function parseObj(isPattern: boolean, isBlockScope: boolean): void;
export declare function parsePropertyName(objectContextId: number): void;
export declare function parseMethod(functionStart: number, isConstructor: boolean): void;
export declare function parseArrowExpression(startTokenIndex: number): void;
export declare function parseFunctionBodyAndFinish(functionStart: number, funcContextId?: number): void;
export declare function parseFunctionBody(allowExpression: boolean, funcContextId?: number): void;
export declare function parseIdentifier(): void;
