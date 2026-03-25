import type { CanonicalizationOrTransformationAlgorithm, CanonicalizationOrTransformationAlgorithmProcessOptions, NamespacePrefix, RenderedNamespace } from "./types";
export declare class C14nCanonicalization implements CanonicalizationOrTransformationAlgorithm {
    protected includeComments: boolean;
    constructor();
    attrCompare(a: any, b: any): 1 | 0 | -1;
    nsCompare(a: any, b: any): any;
    renderAttrs(node: any): string;
    /**
     * Create the string of all namespace declarations that should appear on this element
     *
     * @param node The node we now render
     * @param prefixesInScope The prefixes defined on this node parents which are a part of the output set
     * @param defaultNs The current default namespace
     * @param defaultNsForPrefix
     * @param ancestorNamespaces Import ancestor namespaces if it is specified
     * @api private
     */
    renderNs(node: Element, prefixesInScope: string[], defaultNs: string, defaultNsForPrefix: string, ancestorNamespaces: NamespacePrefix[]): RenderedNamespace;
    /**
     * @param node Node
     */
    processInner(node: any, prefixesInScope: any, defaultNs: any, defaultNsForPrefix: any, ancestorNamespaces: any): string;
    renderComment(node: Comment): string;
    /**
     * Perform canonicalization of the given node
     *
     * @param node
     * @api public
     */
    process(node: Node, options: CanonicalizationOrTransformationAlgorithmProcessOptions): string;
    getAlgorithmName(): string;
}
/**
 * Add c14n#WithComments here (very simple subclass)
 */
export declare class C14nCanonicalizationWithComments extends C14nCanonicalization {
    constructor();
    getAlgorithmName(): string;
}
