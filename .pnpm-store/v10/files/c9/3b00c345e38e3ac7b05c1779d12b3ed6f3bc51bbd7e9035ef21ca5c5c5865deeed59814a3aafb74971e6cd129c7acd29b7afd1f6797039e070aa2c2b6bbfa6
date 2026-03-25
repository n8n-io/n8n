import { DocNodeKind, DocNode } from './DocNode';
import type { TokenSequence } from '../parser/TokenSequence';
import { type IDocInlineTagBaseParameters, type IDocInlineTagBaseParsedParameters, DocInlineTagBase } from './DocInlineTagBase';
/**
 * Constructor parameters for {@link DocInlineTag}.
 */
export interface IDocInlineTagParameters extends IDocInlineTagBaseParameters {
    tagContent: string;
}
/**
 * Constructor parameters for {@link DocInlineTag}.
 */
export interface IDocInlineTagParsedParameters extends IDocInlineTagBaseParsedParameters {
    tagContentExcerpt?: TokenSequence;
}
/**
 * Represents a generic TSDoc inline tag, including custom tags.
 *
 * @remarks
 * NOTE: Certain tags such as `{@link}` and `{@inheritDoc}` have specialized structures and parser rules,
 * and thus are represented using {@link DocLinkTag} or {@link DocInheritDocTag} instead.  However, if the
 * specialized parser rule encounters a syntax error, but the outer framing is correct, then the parser constructs
 * a generic `DocInlineTag` instead of `DocErrorText`.  This means, for example, that it is possible sometimes for
 * `DocInlineTag.tagName` to be `"@link"`.
 */
export declare class DocInlineTag extends DocInlineTagBase {
    private _tagContent;
    private readonly _tagContentExcerpt;
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters: IDocInlineTagParameters | IDocInlineTagParsedParameters);
    /** @override */
    get kind(): DocNodeKind | string;
    /**
     * The tag content.
     * @remarks
     * For example, if the tag is `{@myTag x=12.34 y=56.78 }` then the tag content
     * would be `x=12.34 y=56.78 `, including the trailing space but not the leading space.
     */
    get tagContent(): string;
    /** @override */
    protected getChildNodesForContent(): ReadonlyArray<DocNode | undefined>;
}
//# sourceMappingURL=DocInlineTag.d.ts.map