import { DocNode, DocNodeKind, type IDocNodeParameters, type IDocNodeParsedParameters } from './DocNode';
import type { DocHtmlAttribute } from './DocHtmlAttribute';
import type { TokenSequence } from '../parser/TokenSequence';
/**
 * Constructor parameters for {@link DocHtmlStartTag}.
 */
export interface IDocHtmlStartTagParameters extends IDocNodeParameters {
    name: string;
    spacingAfterName?: string;
    htmlAttributes?: DocHtmlAttribute[];
    selfClosingTag?: boolean;
}
/**
 * Constructor parameters for {@link DocHtmlStartTag}.
 */
export interface IDocHtmlStartTagParsedParameters extends IDocNodeParsedParameters {
    openingDelimiterExcerpt: TokenSequence;
    nameExcerpt: TokenSequence;
    spacingAfterNameExcerpt?: TokenSequence;
    htmlAttributes: DocHtmlAttribute[];
    selfClosingTag: boolean;
    closingDelimiterExcerpt: TokenSequence;
}
/**
 * Represents an HTML start tag, which may or may not be self-closing.
 *
 * Example: `<a href="#" />`
 */
export declare class DocHtmlStartTag extends DocNode {
    private readonly _openingDelimiterExcerpt;
    private _name;
    private readonly _nameExcerpt;
    private _spacingAfterName;
    private readonly _spacingAfterNameExcerpt;
    private readonly _htmlAttributes;
    private readonly _selfClosingTag;
    private readonly _closingDelimiterExcerpt;
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters: IDocHtmlStartTagParameters | IDocHtmlStartTagParsedParameters);
    /** @override */
    get kind(): DocNodeKind | string;
    /**
     * The HTML element name.
     */
    get name(): string;
    /**
     * The HTML attributes belonging to this HTML element.
     */
    get htmlAttributes(): ReadonlyArray<DocHtmlAttribute>;
    /**
     * If true, then the HTML tag ends with `/>` instead of `>`.
     */
    get selfClosingTag(): boolean;
    /**
     * Explicit whitespace that a renderer should insert after the HTML element name.
     * If undefined, then the renderer can use a formatting rule to generate appropriate spacing.
     */
    get spacingAfterName(): string | undefined;
    /**
     * Generates the HTML for this tag.
     */
    emitAsHtml(): string;
    /** @override */
    protected onGetChildNodes(): ReadonlyArray<DocNode | undefined>;
}
//# sourceMappingURL=DocHtmlStartTag.d.ts.map