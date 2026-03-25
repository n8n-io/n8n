import { DocNode, type IDocNodeParameters, type IDocNodeParsedParameters } from './DocNode';
/**
 * Constructor parameters for {@link DocNodeContainer}.
 */
export interface IDocNodeContainerParameters extends IDocNodeParameters {
}
/**
 * Constructor parameters for {@link DocNodeContainer}.
 */
export interface IDocNodeContainerParsedParameters extends IDocNodeParsedParameters {
}
/**
 * DocNodeContainer is the base class for DocNode classes that allow arbitrary child nodes to be added by the consumer.
 * The child classes are {@link DocParagraph} and {@link DocSection}.
 */
export declare abstract class DocNodeContainer extends DocNode {
    private readonly _nodes;
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters: IDocNodeContainerParameters | IDocNodeContainerParsedParameters, childNodes?: ReadonlyArray<DocNode>);
    /**
     * The nodes that were added to this container.
     */
    get nodes(): ReadonlyArray<DocNode>;
    /**
     * Append a node to the container.
     */
    appendNode(docNode: DocNode): void;
    /**
     * Append nodes to the container.
     */
    appendNodes(docNodes: ReadonlyArray<DocNode>): void;
    /**
     * Remove all nodes from the container.
     */
    clearNodes(): void;
    /** @override */
    protected onGetChildNodes(): ReadonlyArray<DocNode | undefined>;
}
//# sourceMappingURL=DocNodeContainer.d.ts.map