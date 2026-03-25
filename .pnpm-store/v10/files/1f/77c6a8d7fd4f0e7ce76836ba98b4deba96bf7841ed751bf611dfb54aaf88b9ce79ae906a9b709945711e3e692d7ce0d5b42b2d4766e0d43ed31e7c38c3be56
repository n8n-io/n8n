import { DocNodeKind, DocNode } from './DocNode';
import type { DocDeclarationReference } from './DocDeclarationReference';
import { DocInlineTagBase, type IDocInlineTagBaseParsedParameters, type IDocInlineTagBaseParameters } from './DocInlineTagBase';
import type { TokenSequence } from '../parser/TokenSequence';
/**
 * Constructor parameters for {@link DocLinkTag}.
 */
export interface IDocLinkTagParameters extends IDocInlineTagBaseParameters {
    codeDestination?: DocDeclarationReference;
    urlDestination?: string;
    linkText?: string;
}
/**
 * Constructor parameters for {@link DocLinkTag}.
 */
export interface IDocLinkTagParsedParameters extends IDocInlineTagBaseParsedParameters {
    codeDestination?: DocDeclarationReference;
    urlDestinationExcerpt?: TokenSequence;
    spacingAfterDestinationExcerpt?: TokenSequence;
    pipeExcerpt?: TokenSequence;
    spacingAfterPipeExcerpt?: TokenSequence;
    linkTextExcerpt?: TokenSequence;
    spacingAfterLinkTextExcerpt?: TokenSequence;
}
/**
 * Represents an `{@link}` tag.
 */
export declare class DocLinkTag extends DocInlineTagBase {
    private readonly _codeDestination;
    private _urlDestination;
    private readonly _urlDestinationExcerpt;
    private readonly _spacingAfterDestinationExcerpt;
    private readonly _pipeExcerpt;
    private readonly _spacingAfterPipeExcerpt;
    private _linkText;
    private readonly _spacingAfterLinkTextExcerpt;
    private readonly _linkTextExcerpt;
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters: IDocLinkTagParameters | IDocLinkTagParsedParameters);
    /** @override */
    get kind(): DocNodeKind | string;
    /**
     * If the link tag refers to a declaration, this returns the declaration reference object;
     * otherwise this property is undefined.
     * @remarks
     * Either the `codeDestination` or the `urlDestination` property will be defined, but never both.
     */
    get codeDestination(): DocDeclarationReference | undefined;
    /**
     * If the link tag was an ordinary URI, this returns the URL string;
     * otherwise this property is undefined.
     * @remarks
     * Either the `codeDestination` or the `urlDestination` property will be defined, but never both.
     */
    get urlDestination(): string | undefined;
    /**
     * An optional text string that is the hyperlink text.  If omitted, the documentation
     * renderer will use a default string based on the link itself (e.g. the URL text
     * or the declaration identifier).
     *
     * @remarks
     *
     * In HTML, the hyperlink can include leading/trailing space characters around the link text.
     * For example, this HTML will cause a web browser to `y` and also the space character before
     * and after it:
     *
     * ```html
     * x<a href="#Button"> y </a> z
     * ```
     *
     * Unlike HTML, TSDoc trims leading/trailing spaces.  For example, this TSDoc will be
     * displayed `xy z` and underline only the `y` character:
     *
     * ```
     * x{@link Button | y } z
     * ```
     */
    get linkText(): string | undefined;
    /** @override */
    protected getChildNodesForContent(): ReadonlyArray<DocNode | undefined>;
}
//# sourceMappingURL=DocLinkTag.d.ts.map