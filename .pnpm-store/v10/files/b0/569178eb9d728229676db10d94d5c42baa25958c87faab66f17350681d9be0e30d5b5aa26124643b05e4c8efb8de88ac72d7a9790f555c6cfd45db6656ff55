import { StagehandContainer } from "./StagehandContainer";
import { calculateViewportHeight } from "./utils";

/**
 * The `GlobalPageContainer` class is a container implementation for the entire
 * webpage or global document.
 *
 * This container manages the global `window` scroll position and provides
 * measurements using `document.documentElement`. It extends `StagehandContainer`
 * to unify scrolling/height logic with other container types, such as element
 * based containers from the `ElementContainer` class.
 */
export class GlobalPageContainer extends StagehandContainer {
  public getRootElement(): HTMLElement {
    return document.body;
  }

  /**
   * Calculates the viewport height for the entire page, using a helper.
   * The helper returns 75% of the window height, to ensure that we don't
   * miss any content that may be behind sticky elements like nav bars.
   *
   * @returns The current height of the global viewport, in pixels.
   */
  public getViewportHeight(): number {
    return calculateViewportHeight();
  }

  public getScrollHeight(): number {
    return document.documentElement.scrollHeight;
  }

  public getScrollPosition(): number {
    return window.scrollY;
  }

  /**
   * Smoothly scrolls the page to the specified vertical offset, and then
   * waits until scrolling has stopped. There is a delay built in to allow
   * for lazy loading and other asynchronous content to load.
   *
   * @param offset - The desired scroll offset from the top of the page.
   * @returns A promise that resolves once scrolling is complete.
   */
  public async scrollTo(offset: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    window.scrollTo({ top: offset, behavior: "smooth" });
    await this.waitForScrollEnd();
  }

  /**
   * Scrolls the page so that a given element is visible, or scrolls to the top
   * if no element is specified. Uses smooth scrolling and waits for it to complete.
   *
   * @param element - The DOM element to bring into view. If omitted, scrolls to top.
   * @returns A promise that resolves once scrolling is complete.
   */
  public async scrollIntoView(element?: HTMLElement): Promise<void> {
    if (!element) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const rect = element.getBoundingClientRect();
      const currentY = window.scrollY || document.documentElement.scrollTop;
      const elementY = currentY + rect.top - window.innerHeight * 0.25;
      window.scrollTo({ top: elementY, behavior: "smooth" });
    }
    await this.waitForScrollEnd();
  }

  /**
   * Internal helper that waits until the global scroll activity has stopped.
   * It listens for scroll events, resetting a short timer every time a scroll
   * occurs, and resolves once there's no scroll for ~100ms.
   *
   * @returns A promise that resolves when scrolling has finished.
   */
  private async waitForScrollEnd(): Promise<void> {
    return new Promise<void>((resolve) => {
      let scrollEndTimer: number;
      const handleScroll = () => {
        clearTimeout(scrollEndTimer);
        scrollEndTimer = window.setTimeout(() => {
          window.removeEventListener("scroll", handleScroll);
          resolve();
        }, 100);
      };
      window.addEventListener("scroll", handleScroll, { passive: true });
      handleScroll();
    });
  }
}
