import { DocNode } from '../nodes';
/**
 * Renders a DocNode tree as plain text, without any rich text formatting or markup.
 */
export declare class PlainTextEmitter {
    /**
     * Returns true if the specified node contains any text content.
     *
     * @remarks
     * A documentation tool can use this test to report warnings when a developer neglected to write a code comment
     * for a declaration.
     *
     * @param node - this node and all its children will be considered
     * @param requiredCharacters - The test returns true if at least this many non-spacing characters are found.
     * The default value is 1.
     */
    static hasAnyTextContent(node: DocNode, requiredCharacters?: number): boolean;
    /**
     * Returns true if the specified collection of nodes contains any text content.
     *
     * @remarks
     * A documentation tool can use this test to report warnings when a developer neglected to write a code comment
     * for a declaration.
     *
     * @param nodes - the collection of nodes to be tested
     * @param requiredCharacters - The test returns true if at least this many non-spacing characters are found.
     * The default value is 1.
     */
    static hasAnyTextContent(nodes: ReadonlyArray<DocNode>, requiredCharacters?: number): boolean;
    private static _scanTextContent;
    private static _countNonSpaceCharacters;
}
//# sourceMappingURL=PlainTextEmitter.d.ts.map