import { DocNodeKind, DocNode, type IDocNodeParameters, type IDocNodeParsedParameters } from './DocNode';
import { DocSection } from './DocSection';
import type { DocBlockTag } from './DocBlockTag';
/**
 * Constructor parameters for {@link DocBlock}.
 */
export interface IDocBlockParameters extends IDocNodeParameters {
    blockTag: DocBlockTag;
}
/**
 * Constructor parameters for {@link DocBlock}.
 */
export interface IDocBlockParsedParameters extends IDocNodeParsedParameters {
    blockTag: DocBlockTag;
}
/**
 * Represents a section that is introduced by a TSDoc block tag.
 * For example, an `@example` block.
 */
export declare class DocBlock extends DocNode {
    private readonly _blockTag;
    private readonly _content;
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters: IDocBlockParameters | IDocBlockParsedParameters);
    /** @override */
    get kind(): DocNodeKind | string;
    /**
     * The TSDoc tag that introduces this section.
     */
    get blockTag(): DocBlockTag;
    /**
     * The TSDoc tag that introduces this section.
     */
    get content(): DocSection;
    /** @override */
    protected onGetChildNodes(): ReadonlyArray<DocNode | undefined>;
}
//# sourceMappingURL=DocBlock.d.ts.map