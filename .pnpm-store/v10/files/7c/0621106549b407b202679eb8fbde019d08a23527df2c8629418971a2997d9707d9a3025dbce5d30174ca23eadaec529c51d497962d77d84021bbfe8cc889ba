import { DocNode, DocNodeKind, type IDocNodeParameters, type IDocNodeParsedParameters } from './DocNode';
import type { TokenSequence } from '../parser/TokenSequence';
/**
 * Constructor parameters for {@link DocHtmlEndTag}.
 */
export interface IDocHtmlEndTagParameters extends IDocNodeParameters {
    name: string;
}
/**
 * Constructor parameters for {@link DocHtmlEndTag}.
 */
export interface IDocHtmlEndTagParsedParameters extends IDocNodeParsedParameters {
    openingDelimiterExcerpt: TokenSequence;
    nameExcerpt: TokenSequence;
    spacingAfterNameExcerpt?: TokenSequence;
    closingDelimiterExcerpt: TokenSequence;
}
/**
 * Represents an HTML end tag.  Example: `</a>`
 */
export declare class DocHtmlEndTag extends DocNode {
    private readonly _openingDelimiterExcerpt;
    private _name;
    private readonly _nameExcerpt;
    private readonly _spacingAfterNameExcerpt;
    private readonly _closingDelimiterExcerpt;
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters: IDocHtmlEndTagParameters | IDocHtmlEndTagParsedParameters);
    /** @override */
    get kind(): DocNodeKind | string;
    /**
     * The HTML element name.
     */
    get name(): string;
    /**
     * Generates the HTML for this tag.
     */
    emitAsHtml(): string;
    /** @override */
    protected onGetChildNodes(): ReadonlyArray<DocNode | undefined>;
}
//# sourceMappingURL=DocHtmlEndTag.d.ts.map