import { DomChunk } from "@/lib/dom/DomChunk";
import { collectCandidateElements } from "@/lib/dom/candidateCollector";

/**
 * The `StagehandContainer` class defines an abstract interface for
 * scrolling and DOM inspection across various container types e.g.,
 * the entire page (GlobalPageContainer), a specific sub element of the DOM,
 * (ElementContainer).
 */
export abstract class StagehandContainer {
  public abstract getViewportHeight(): number;
  public abstract getScrollHeight(): number;
  public abstract scrollTo(offset: number): Promise<void>;
  public abstract getRootElement(): HTMLElement | Document;
  public abstract scrollIntoView(element?: HTMLElement): Promise<void>;
  public abstract getScrollPosition(): number;

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
  public async collectDomChunks(
    startOffset: number,
    endOffset: number,
    chunkSize: number,
    scrollTo: boolean = true,
    scrollBackToTop: boolean = true,
    candidateContainer?: HTMLElement,
  ): Promise<DomChunk[]> {
    const chunks: DomChunk[] = [];
    let maxOffset = this.getScrollHeight();
    let current = startOffset;
    let finalEnd = endOffset;

    let index = 0;

    while (current <= finalEnd) {
      // Move the container's scroll position
      if (scrollTo) {
        await this.scrollTo(current);
      }

      // Collect the candidate elements at this offset
      const rootCandidate =
        candidateContainer || (this.getRootElement() as HTMLElement);
      const { outputString, selectorMap } = await collectCandidateElements(
        rootCandidate,
        index,
      );

      chunks.push({
        startOffset: current,
        endOffset: current + chunkSize,
        outputString,
        selectorMap,
      });

      index += Object.keys(selectorMap).length;
      current += chunkSize;

      // Only extend finalEnd if there is no candidateContainer
      // (meaning we're looking at the entire scrollable area)
      if (!candidateContainer && current > endOffset) {
        // Check if new content extended the scroll height
        const newScrollHeight = this.getScrollHeight();
        if (newScrollHeight > maxOffset) {
          maxOffset = newScrollHeight;
        }
        if (newScrollHeight > finalEnd) {
          finalEnd = newScrollHeight;
        }
      }
    }

    if (scrollBackToTop) {
      await this.scrollTo(0);
    }

    return chunks;
  }
}
