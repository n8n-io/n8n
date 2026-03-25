import type { CanonicalizationOrTransformationAlgorithm, CanonicalizationOrTransformationAlgorithmProcessOptions } from "./types";
export declare class ExclusiveCanonicalization implements CanonicalizationOrTransformationAlgorithm {
    protected includeComments: boolean;
    constructor();
    attrCompare(a: any, b: any): 1 | 0 | -1;
    nsCompare(a: any, b: any): any;
    renderAttrs(node: any): string;
    /**
     * Create the string of all namespace declarations that should appear on this element
     *
     * @param {Node} node. The node we now render
     * @param {Array} prefixesInScope. The prefixes defined on this node
     *                parents which are a part of the output set
     * @param {String} defaultNs. The current default namespace
     * @return {String}
     * @api private
     */
    renderNs(node: any, prefixesInScope: any, defaultNs: any, defaultNsForPrefix: any, inclusiveNamespacesPrefixList: string[]): {
        rendered: string;
        newDefaultNs: any;
    };
    /**
     * @param node Node
     */
    processInner(node: any, prefixesInScope: any, defaultNs: any, defaultNsForPrefix: any, inclusiveNamespacesPrefixList: string[]): string;
    renderComment(node: Comment): string;
    /**
     * Perform canonicalization of the given element node
     *
     * @api public
     */
    process(elem: Element, options: CanonicalizationOrTransformationAlgorithmProcessOptions): string;
    getAlgorithmName(): string;
}
export declare class ExclusiveCanonicalizationWithComments extends ExclusiveCanonicalization {
    constructor();
    getAlgorithmName(): string;
}
