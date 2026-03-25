import { StagehandContainer } from "./StagehandContainer";
/**
 * The `GlobalPageContainer` class is a container implementation for the entire
 * webpage or global document.
 *
 * This container manages the global `window` scroll position and provides
 * measurements using `document.documentElement`. It extends `StagehandContainer`
 * to unify scrolling/height logic with other container types, such as element
 * based containers from the `ElementContainer` class.
 */
export declare class GlobalPageContainer extends StagehandContainer {
    getRootElement(): HTMLElement;
    /**
     * Calculates the viewport height for the entire page, using a helper.
     * The helper returns 75% of the window height, to ensure that we don't
     * miss any content that may be behind sticky elements like nav bars.
     *
     * @returns The current height of the global viewport, in pixels.
     */
    getViewportHeight(): number;
    getScrollHeight(): number;
    getScrollPosition(): number;
    /**
     * Smoothly scrolls the page to the specified vertical offset, and then
     * waits until scrolling has stopped. There is a delay built in to allow
     * for lazy loading and other asynchronous content to load.
     *
     * @param offset - The desired scroll offset from the top of the page.
     * @returns A promise that resolves once scrolling is complete.
     */
    scrollTo(offset: number): Promise<void>;
    /**
     * Scrolls the page so that a given element is visible, or scrolls to the top
     * if no element is specified. Uses smooth scrolling and waits for it to complete.
     *
     * @param element - The DOM element to bring into view. If omitted, scrolls to top.
     * @returns A promise that resolves once scrolling is complete.
     */
    scrollIntoView(element?: HTMLElement): Promise<void>;
    /**
     * Internal helper that waits until the global scroll activity has stopped.
     * It listens for scroll events, resetting a short timer every time a scroll
     * occurs, and resolves once there's no scroll for ~100ms.
     *
     * @returns A promise that resolves when scrolling has finished.
     */
    private waitForScrollEnd;
}
