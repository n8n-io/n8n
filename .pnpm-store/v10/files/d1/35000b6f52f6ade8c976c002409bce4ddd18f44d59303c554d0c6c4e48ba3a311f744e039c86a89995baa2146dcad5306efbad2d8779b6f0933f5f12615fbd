/**
 * Finds and returns a list of scrollable elements on the page,
 * ordered from the element with the largest scrollHeight to the smallest.
 *
 * @param topN Optional maximum number of scrollable elements to return.
 *             If not provided, all found scrollable elements are returned.
 * @returns An array of HTMLElements sorted by descending scrollHeight.
 */
export declare function getScrollableElements(topN?: number): HTMLElement[];
/**
 * Calls getScrollableElements, then for each element calls generateXPaths,
 * and returns the first XPath for each.
 *
 * @param topN (optional) integer limit on how many scrollable elements to process
 * @returns string[] list of XPaths (1 for each scrollable element)
 */
export declare function getScrollableElementXpaths(topN?: number): Promise<string[]>;
export declare function getNearestScrollableParent(el: HTMLElement): HTMLElement;
/**
 * processDom
 * ----------
 * This function now just picks a single chunk index,
 * creates a container, and calls collectDomChunk to get a single DomChunk.
 *
 * @param chunksSeen - The chunks we've seen so far
 */
export declare function processDom(chunksSeen: number[]): Promise<{
    outputString: string;
    selectorMap: Record<number, string[]>;
    chunk: number;
    chunks: number[];
}>;
/**
 * processAllOfDom
 * ---------------
 * If an xpath is provided, we find that element and build an appropriate container
 * (global or element) based on the nearest scrollable parent. Then we chunk from
 * startOffset..endOffset. We BFS within the element's subtree (candidateContainer).
 */
export declare function processAllOfDom(xpath?: string): Promise<{
    outputString: string;
    selectorMap: Record<number, string[]>;
}>;
/**
 * Stores either the entire DOM (if no `xpath` is given),
 * or the specific element that `xpath` points to.
 * Returns the outer HTML of what is stored.
 */
export declare function storeDOM(xpath?: string): string;
/**
 * Restores either the entire DOM (if no `xpath` is given),
 * or the specific element that `xpath` points to, based on `storedDOM`.
 */
export declare function restoreDOM(storedDOM: string, xpath?: string): void;
export declare function createTextBoundingBoxes(xpath?: string): void;
export declare function getElementBoundingBoxes(xpath: string): Array<{
    text: string;
    top: number;
    left: number;
    width: number;
    height: number;
}>;
