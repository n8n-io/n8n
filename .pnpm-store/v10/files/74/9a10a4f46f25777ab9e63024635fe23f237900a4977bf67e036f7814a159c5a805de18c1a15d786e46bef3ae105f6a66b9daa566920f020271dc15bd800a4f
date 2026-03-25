import { StagehandContainer } from "./StagehandContainer";
/**
 * The ElementContainer class is a container implementation for a specific
 * HTML element.
 *
 * Unlike `GlobalPageContainer`, which manages the entire page,
 * this class focuses on one particular `HTMLElement`. Operations
 * such as `scrollTo` and `scrollIntoView` apply to that element
 * rather than `window`.
 */
export declare class ElementContainer extends StagehandContainer {
    private el;
    /**
     * Creates an instance of `ElementContainer` tied to a specific element.
     * @param el - The scrollable `HTMLElement` that this container controls.
     */
    constructor(el: HTMLElement);
    getRootElement(): HTMLElement;
    /**
     * Retrieves the height of the visible viewport within this element
     * (`el.clientHeight`).
     *
     * @returns The visible (client) height of the element, in pixels.
     */
    getViewportHeight(): number;
    getScrollHeight(): number;
    /**
     * Returns the element's current vertical scroll offset.
     */
    getScrollPosition(): number;
    /**
     * Smoothly scrolls this element to the specified vertical offset, and
     * waits for the scrolling to complete.
     *
     * @param offset - The scroll offset (in pixels) from the top of the element.
     * @returns A promise that resolves once scrolling is finished.
     */
    scrollTo(offset: number): Promise<void>;
    /**
     * Scrolls this element so that the given `element` is visible, or
     * scrolls to the top if none is provided. Smoothly animates the scroll
     * and waits until it finishes.
     *
     * @param element - The child element to bring into view. If omitted, scrolls to top.
     * @returns A promise that resolves once scrolling completes.
     */
    scrollIntoView(element?: HTMLElement): Promise<void>;
    /**
     * Internal helper that waits until scrolling in this element has
     * fully stopped. It listens for scroll events on the element,
     * resetting a short timer every time a scroll occurs, and resolves
     * once there's no scroll for ~100ms.
     *
     * @returns A promise that resolves when scrolling has finished.
     */
    private waitForScrollEnd;
}
