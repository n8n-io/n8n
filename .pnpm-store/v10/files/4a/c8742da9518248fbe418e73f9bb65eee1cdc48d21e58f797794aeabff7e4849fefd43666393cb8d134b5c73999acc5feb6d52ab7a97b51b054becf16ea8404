/**
 * This class aims to provide some methods:
 *  - to reorder elements in the DOM with respect to the visual order;
 *  - to create a link, using aria-owns, between spans in the textLayer and
 *    annotations in the annotationLayer. The goal is to help to know
 *    where the annotations are in the text flow.
 */
export class TextAccessibilityManager {
    /**
     * Compare the positions of two elements, it must correspond to
     * the visual ordering.
     *
     * @param {HTMLElement} e1
     * @param {HTMLElement} e2
     * @returns {number}
     */
    static "__#6@#compareElementPositions"(e1: HTMLElement, e2: HTMLElement): number;
    setTextMapping(textDivs: any): void;
    /**
     * Function called when the text layer has finished rendering.
     */
    enable(): void;
    disable(): void;
    /**
     * Remove an aria-owns id from a node in the text layer.
     * @param {HTMLElement} element
     */
    removePointerInTextLayer(element: HTMLElement): void;
    /**
     * Find the text node which is the nearest and add an aria-owns attribute
     * in order to correctly position this editor in the text flow.
     * @param {HTMLElement} element
     * @param {boolean} isRemovable
     * @returns {string|null} The id in the struct tree if any.
     */
    addPointerInTextLayer(element: HTMLElement, isRemovable: boolean): string | null;
    /**
     * Move a div in the DOM in order to respect the visual order.
     * @param {HTMLDivElement} element
     * @returns {string|null} The id in the struct tree if any.
     */
    moveElementInDOM(container: any, element: HTMLDivElement, contentElement: any, isRemovable: any): string | null;
    #private;
}
