/**
 * `collectCandidateElements` performs a depth-first traversal (despite the BFS naming) of the given `candidateContainerRoot`
 * to find “candidate elements” or text nodes that meet certain criteria (e.g., visible, active,
 * interactive, or leaf). This function does not scroll the page; it only collects nodes from
 * the in-memory DOM structure starting at `candidateContainerRoot`.
 *
 * @param candidateContainerRoot - The HTMLElement to search within
 * @param indexOffset - A numeric offset used to label/number your candidate elements
 * @returns { outputString, selectorMap }
 */
export declare function collectCandidateElements(candidateContainerRoot: HTMLElement, indexOffset?: number): Promise<{
    outputString: string;
    selectorMap: Record<number, string[]>;
}>;
