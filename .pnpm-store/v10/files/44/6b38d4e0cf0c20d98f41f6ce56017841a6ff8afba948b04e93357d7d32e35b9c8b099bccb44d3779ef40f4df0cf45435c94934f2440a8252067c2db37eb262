import { DocNodeKind, DocNode, type IDocNodeParameters, type IDocNodeParsedParameters } from './DocNode';
import type { TokenSequence } from '../parser/TokenSequence';
/**
 * Constructor parameters for {@link DocBlockTag}.
 */
export interface IDocBlockTagParameters extends IDocNodeParameters {
    tagName: string;
}
/**
 * Constructor parameters for {@link DocBlockTag}.
 */
export interface IDocBlockTagParsedParameters extends IDocNodeParsedParameters {
    tagName: string;
    tagNameExcerpt: TokenSequence;
}
/**
 * Represents a TSDoc block tag such as `@param` or `@public`.
 */
export declare class DocBlockTag extends DocNode {
    private readonly _tagName;
    private readonly _tagNameWithUpperCase;
    private readonly _tagNameExcerpt;
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters: IDocBlockTagParameters | IDocBlockTagParsedParameters);
    /** @override */
    get kind(): DocNodeKind | string;
    /**
     * The TSDoc tag name.  TSDoc tag names start with an at-sign (`@`) followed
     * by ASCII letters using "camelCase" capitalization.
     */
    get tagName(): string;
    /**
     * The TSDoc tag name in all capitals, which is used for performing
     * case-insensitive comparisons or lookups.
     */
    get tagNameWithUpperCase(): string;
    /** @override */
    protected onGetChildNodes(): ReadonlyArray<DocNode | undefined>;
    getTokenSequence(): TokenSequence;
}
//# sourceMappingURL=DocBlockTag.d.ts.map