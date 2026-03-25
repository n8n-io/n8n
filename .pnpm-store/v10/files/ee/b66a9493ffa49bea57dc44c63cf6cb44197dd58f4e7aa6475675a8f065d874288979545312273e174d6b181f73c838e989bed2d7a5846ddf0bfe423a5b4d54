import { type IDocNodeParameters, DocNode, type IDocNodeParsedParameters } from './DocNode';
import type { TokenSequence } from '../parser/TokenSequence';
/**
 * Constructor parameters for {@link DocInlineTagBase}.
 */
export interface IDocInlineTagBaseParameters extends IDocNodeParameters {
    tagName: string;
}
/**
 * Constructor parameters for {@link DocInlineTagBase}.
 */
export interface IDocInlineTagBaseParsedParameters extends IDocNodeParsedParameters {
    openingDelimiterExcerpt: TokenSequence;
    tagNameExcerpt: TokenSequence;
    tagName: string;
    spacingAfterTagNameExcerpt?: TokenSequence;
    closingDelimiterExcerpt: TokenSequence;
}
/**
 * The abstract base class for {@link DocInlineTag}, {@link DocLinkTag}, and {@link DocInheritDocTag}.
 */
export declare abstract class DocInlineTagBase extends DocNode {
    private readonly _openingDelimiterExcerpt;
    private readonly _tagName;
    private readonly _tagNameWithUpperCase;
    private readonly _tagNameExcerpt;
    private readonly _spacingAfterTagNameExcerpt;
    private readonly _closingDelimiterExcerpt;
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters: IDocInlineTagBaseParameters | IDocInlineTagBaseParsedParameters);
    /**
     * The TSDoc tag name.  TSDoc tag names start with an at-sign (`@`) followed
     * by ASCII letters using "camelCase" capitalization.
     *
     * @remarks
     * For example, if the inline tag is `{@link Guid.toString | the toString() method}`
     * then the tag name would be `@link`.
     */
    get tagName(): string;
    /**
     * The TSDoc tag name in all capitals, which is used for performing
     * case-insensitive comparisons or lookups.
     */
    get tagNameWithUpperCase(): string;
    /** @override @sealed */
    protected onGetChildNodes(): ReadonlyArray<DocNode | undefined>;
    /**
     * Allows child classes to replace the tagContentParticle with a more detailed
     * set of nodes.
     * @virtual
     */
    protected abstract getChildNodesForContent(): ReadonlyArray<DocNode | undefined>;
}
//# sourceMappingURL=DocInlineTagBase.d.ts.map