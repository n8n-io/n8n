import { type DocNode, DocNodeKind } from './DocNode';
import { DocNodeContainer, type IDocNodeContainerParameters, type IDocNodeContainerParsedParameters } from './DocNodeContainer';
/**
 * Constructor parameters for {@link DocSection}.
 */
export interface IDocSectionParameters extends IDocNodeContainerParameters {
}
/**
 * Constructor parameters for {@link DocSection}.
 */
export interface IDocSectionParsedParameters extends IDocNodeContainerParsedParameters {
}
/**
 * Represents a general block of rich text.
 */
export declare class DocSection extends DocNodeContainer {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters: IDocSectionParameters | IDocSectionParsedParameters, childNodes?: ReadonlyArray<DocNode>);
    /** @override */
    get kind(): DocNodeKind | string;
    /**
     * If the last item in DocSection.nodes is not a DocParagraph, a new paragraph
     * is started.  Either way, the provided docNode will be appended to the paragraph.
     */
    appendNodeInParagraph(docNode: DocNode): void;
    appendNodesInParagraph(docNodes: ReadonlyArray<DocNode>): void;
}
//# sourceMappingURL=DocSection.d.ts.map