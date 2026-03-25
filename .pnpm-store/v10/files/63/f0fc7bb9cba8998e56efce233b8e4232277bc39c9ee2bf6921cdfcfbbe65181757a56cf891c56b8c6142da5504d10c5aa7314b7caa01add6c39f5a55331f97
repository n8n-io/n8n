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
export class ElementContainer extends StagehandContainer {
  /**
   * Creates an instance of `ElementContainer` tied to a specific element.
   * @param el - The scrollable `HTMLElement` that this container controls.
   */
  constructor(private el: HTMLElement) {
    super();
  }

  public getRootElement(): HTMLElement {
    return this.el;
  }

  /**
   * Retrieves the height of the visible viewport within this element
   * (`el.clientHeight`).
   *
   * @returns The visible (client) height of the element, in pixels.
   */
  public getViewportHeight(): number {
    return this.el.clientHeight;
  }

  public getScrollHeight(): number {
    return this.el.scrollHeight;
  }

  /**
   * Returns the element's current vertical scroll offset.
   */
  public getScrollPosition(): number {
    return this.el.scrollTop;
  }

  /**
   * Smoothly scrolls this element to the specified vertical offset, and
   * waits for the scrolling to complete.
   *
   * @param offset - The scroll offset (in pixels) from the top of the element.
   * @returns A promise that resolves once scrolling is finished.
   */
  public async scrollTo(offset: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    this.el.scrollTo({ top: offset, behavior: "smooth" });
    await this.waitForScrollEnd();
  }

  /**
   * Scrolls this element so that the given `element` is visible, or
   * scrolls to the top if none is provided. Smoothly animates the scroll
   * and waits until it finishes.
   *
   * @param element - The child element to bring into view. If omitted, scrolls to top.
   * @returns A promise that resolves once scrolling completes.
   */
  public async scrollIntoView(element?: HTMLElement): Promise<void> {
    if (!element) {
      this.el.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      element.scrollIntoView();
    }
    await this.waitForScrollEnd();
  }

  /**
   * Internal helper that waits until scrolling in this element has
   * fully stopped. It listens for scroll events on the element,
   * resetting a short timer every time a scroll occurs, and resolves
   * once there's no scroll for ~100ms.
   *
   * @returns A promise that resolves when scrolling has finished.
   */
  private async waitForScrollEnd(): Promise<void> {
    return new Promise<void>((resolve) => {
      let scrollEndTimer: number;
      const handleScroll = () => {
        clearTimeout(scrollEndTimer);
        scrollEndTimer = window.setTimeout(() => {
          this.el.removeEventListener("scroll", handleScroll);
          resolve();
        }, 100);
      };
      this.el.addEventListener("scroll", handleScroll, { passive: true });
      handleScroll();
    });
  }
}
