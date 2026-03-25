import type { DeclarationReference } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
/** @public */
export declare enum ExcerptTokenKind {
    /**
     * Generic text without any special properties
     */
    Content = "Content",
    /**
     * A reference to an API declaration
     */
    Reference = "Reference"
}
/**
 * Used by {@link Excerpt} to indicate a range of indexes within an array of `ExcerptToken` objects.
 *
 * @public
 */
export interface IExcerptTokenRange {
    /**
     * The starting index of the span.
     */
    startIndex: number;
    /**
     * The index of the last member of the span, plus one.
     *
     * @remarks
     *
     * If `startIndex` and `endIndex` are the same number, then the span is empty.
     */
    endIndex: number;
}
/** @public */
export interface IExcerptToken {
    readonly kind: ExcerptTokenKind;
    text: string;
    canonicalReference?: string;
}
/**
 * Represents a fragment of text belonging to an {@link Excerpt} object.
 *
 * @public
 */
export declare class ExcerptToken {
    private readonly _kind;
    private readonly _text;
    private readonly _canonicalReference;
    constructor(kind: ExcerptTokenKind, text: string, canonicalReference?: DeclarationReference);
    /**
     * Indicates the kind of token.
     */
    get kind(): ExcerptTokenKind;
    /**
     * The text fragment.
     */
    get text(): string;
    /**
     * The hyperlink target for a token whose type is `ExcerptTokenKind.Reference`.  For other token types,
     * this property will be `undefined`.
     */
    get canonicalReference(): DeclarationReference | undefined;
}
/**
 * The `Excerpt` class is used by {@link ApiDeclaredItem} to represent a TypeScript code fragment that may be
 * annotated with hyperlinks to declared types (and in the future, source code locations).
 *
 * @remarks
 * API Extractor's .api.json file format stores excerpts compactly as a start/end indexes into an array of tokens.
 * Every `ApiDeclaredItem` has a "main excerpt" corresponding to the full list of tokens.  The declaration may
 * also have have "captured" excerpts that correspond to subranges of tokens.
 *
 * For example, if the main excerpt is:
 *
 * ```
 * function parse(s: string): Vector | undefined;
 * ```
 *
 * ...then this entire signature is the "main excerpt", whereas the function's return type `Vector | undefined` is a
 * captured excerpt.  The `Vector` token might be a hyperlink to that API item.
 *
 * An excerpt may be empty (i.e. a token range containing zero tokens).  For example, if a function's return value
 * is not explicitly declared, then the returnTypeExcerpt will be empty.  By contrast, a class constructor cannot
 * have a return value, so ApiConstructor has no returnTypeExcerpt property at all.
 *
 * @public
 */
export declare class Excerpt {
    /**
     * The complete list of tokens for the source code fragment that this excerpt is based upon.
     * If this object is the main excerpt, then it will span all of the tokens; otherwise, it will correspond to
     * a range within the array.
     */
    readonly tokens: ReadonlyArray<ExcerptToken>;
    /**
     * Specifies the excerpt's range within the `tokens` array.
     */
    readonly tokenRange: Readonly<IExcerptTokenRange>;
    /**
     * The tokens spanned by this excerpt.  It is the range of the `tokens` array as specified by the `tokenRange`
     * property.
     */
    readonly spannedTokens: ReadonlyArray<ExcerptToken>;
    private _text;
    constructor(tokens: ReadonlyArray<ExcerptToken>, tokenRange: IExcerptTokenRange);
    /**
     * The excerpted text, formed by concatenating the text of the `spannedTokens` strings.
     */
    get text(): string;
    /**
     * Returns true if the excerpt is an empty range.
     */
    get isEmpty(): boolean;
}
//# sourceMappingURL=Excerpt.d.ts.map