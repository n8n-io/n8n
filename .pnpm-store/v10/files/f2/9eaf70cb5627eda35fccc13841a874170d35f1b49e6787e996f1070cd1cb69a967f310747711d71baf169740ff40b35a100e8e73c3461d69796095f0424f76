import { DomChunk } from "@/lib/dom/DomChunk";
/**
 * The `StagehandContainer` class defines an abstract interface for
 * scrolling and DOM inspection across various container types e.g.,
 * the entire page (GlobalPageContainer), a specific sub element of the DOM,
 * (ElementContainer).
 */
export declare abstract class StagehandContainer {
    abstract getViewportHeight(): number;
    abstract getScrollHeight(): number;
    abstract scrollTo(offset: number): Promise<void>;
    abstract getRootElement(): HTMLElement | Document;
    abstract scrollIntoView(element?: HTMLElement): Promise<void>;
    abstract getScrollPosition(): number;
    /**
     * Collects multiple "DOM chunks" by scrolling through the container
     * in increments from `startOffset` to `endOffset`. At each scroll
     * position, the function extracts a snapshot of "candidate elements"
     * using `collectCandidateElements`.
     *
     * Each chunk represents a subset of the DOM at a particular
     * vertical scroll offset, including:
     *
     * - `startOffset` & `endOffset`: The vertical scroll bounds for this chunk.
     * - `outputString`: A serialized representation of extracted DOM text.
     * - `selectorMap`: A mapping of temporary indices to the actual element(s)
     *   that were collected in this chunk, useful for further processing.
     *
     * @param startOffset - The initial scroll offset from which to begin collecting.
     * @param endOffset - The maximum scroll offset to collect up to.
     * @param chunkSize - The vertical increment to move between each chunk.
     * @param scrollTo - Whether we should scroll to the chunk
     * @param scrollBackToTop - Whether to scroll the container back to the top once finished.
     * @param candidateContainer - Optionally, a specific container element within
     * the root for which to collect data. If omitted, uses `this.getRootElement()`.
     *
     * @returns A promise that resolves with an array of `DomChunk` objects.
     *
     * ### How It Works
     *
     * 1. **Scroll Range Calculation**:
     *    - Computes `maxOffset` as the maximum offset that can be scrolled
     *      (`scrollHeight - viewportHeight`).
     *    - Restricts `endOffset` to not exceed `maxOffset`.
     *
     * 2. **Chunk Iteration**:
     *    - Loops from `startOffset` to `endOffset` in steps of `chunkSize`.
     *    - For each offset `current`, we call `this.scrollTo(current)`
     *      to position the container.
     *
     * 3. **Element Collection**:
     *    - Invokes `collectCandidateElements` on either `candidateContainer`
     *      (if provided) or the result of `this.getRootElement()`.
     *    - This returns both an `outputString` (serialized text)
     *      and a `selectorMap` of found elements for that section of the DOM.
     *
     * 4. **Chunk Assembly**:
     *    - Creates a `DomChunk` object for the current offset range,
     *      storing `outputString`, `selectorMap`, and scroll offsets.
     *    - Pushes it onto the `chunks` array.
     *
     * 5. **Scroll Reset**:
     *    - Once iteration completes, if `scrollBackToTop` is `true`,
     *      we scroll back to offset `0`.
     */
    collectDomChunks(startOffset: number, endOffset: number, chunkSize: number, scrollTo?: boolean, scrollBackToTop?: boolean, candidateContainer?: HTMLElement): Promise<DomChunk[]>;
}
