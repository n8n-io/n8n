import { ContextualKeyword } from "../tokenizer/keywords";
import { type StopState } from "../traverser/expression";
export declare function tsParseModifiers(allowedModifiers: Array<ContextualKeyword>): void;
/** Parses a modifier matching one the given modifier names. */
export declare function tsParseModifier(allowedModifiers: Array<ContextualKeyword>): ContextualKeyword | null;
export declare function tsTryParseTypeParameters(): void;
export declare function tsTryParseTypeAnnotation(): void;
export declare function tsParseTypeAnnotation(): void;
export declare function tsParseType(): void;
export declare function tsParseNonConditionalType(): void;
export declare function tsParseTypeAssertion(): void;
export declare function tsTryParseJSXTypeArgument(): void;
export declare function tsParseImportEqualsDeclaration(): void;
export declare function tsIsDeclarationStart(): boolean;
export declare function tsParseFunctionBodyAndFinish(functionStart: number, funcContextId: number): void;
export declare function tsParseSubscript(startTokenIndex: number, noCalls: boolean, stopState: StopState): void;
export declare function tsTryParseExport(): boolean;
/**
 * Parse a TS import specifier, which may be prefixed with "type" and may be of
 * the form `foo as bar`.
 *
 * The number of identifier-like tokens we see happens to be enough to uniquely
 * identify the form, so simply count the number of identifiers rather than
 * matching the words `type` or `as`. This is particularly important because
 * `type` and `as` could each actually be plain identifiers rather than
 * keywords.
 */
export declare function tsParseImportSpecifier(): void;
/**
 * Just like named import specifiers, export specifiers can have from 1 to 4
 * tokens, inclusive, and the number of tokens determines the role of each token.
 */
export declare function tsParseExportSpecifier(): void;
export declare function tsTryParseExportDefaultExpression(): boolean;
export declare function tsTryParseStatementContent(): boolean;
export declare function tsTryParseClassMemberWithIsStatic(isStatic: boolean): boolean;
export declare function tsParseIdentifierStatement(contextualKeyword: ContextualKeyword): void;
export declare function tsParseExportDeclaration(): void;
export declare function tsAfterParseClassSuper(hasSuper: boolean): void;
export declare function tsStartParseObjPropValue(): void;
export declare function tsStartParseFunctionParams(): void;
export declare function tsAfterParseVarHead(): void;
export declare function tsStartParseAsyncArrowFromCallExpression(): void;
export declare function tsParseMaybeAssign(noIn: boolean, isWithinParens: boolean): boolean;
export declare function tsParseMaybeAssignWithJSX(noIn: boolean, isWithinParens: boolean): boolean;
export declare function tsParseMaybeAssignWithoutJSX(noIn: boolean, isWithinParens: boolean): boolean;
export declare function tsParseArrow(): boolean;
export declare function tsParseAssignableListItemTypes(): void;
export declare function tsParseMaybeDecoratorArguments(): void;
