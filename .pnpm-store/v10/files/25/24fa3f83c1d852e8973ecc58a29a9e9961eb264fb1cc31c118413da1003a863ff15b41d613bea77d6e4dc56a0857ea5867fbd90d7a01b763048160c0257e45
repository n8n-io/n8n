export type Undo = () => void;
/**
 * Marks everything except given node(or nodes) as aria-hidden
 * @param {Element | Element[]} originalTarget - elements to keep on the page
 * @param [parentNode] - top element, defaults to document.body
 * @param {String} [markerName] - a special attribute to mark every node
 * @return {Undo} undo command
 */
export declare const hideOthers: (originalTarget: Element | Element[], parentNode?: HTMLElement, markerName?: string) => Undo;
/**
 * Marks everything except given node(or nodes) as inert
 * @param {Element | Element[]} originalTarget - elements to keep on the page
 * @param [parentNode] - top element, defaults to document.body
 * @param {String} [markerName] - a special attribute to mark every node
 * @return {Undo} undo command
 */
export declare const inertOthers: (originalTarget: Element | Element[], parentNode?: HTMLElement, markerName?: string) => Undo;
/**
 * @returns if current browser supports inert
 */
export declare const supportsInert: () => boolean;
/**
 * Automatic function to "suppress" DOM elements - _hide_ or _inert_ in the best possible way
 * @param {Element | Element[]} originalTarget - elements to keep on the page
 * @param [parentNode] - top element, defaults to document.body
 * @param {String} [markerName] - a special attribute to mark every node
 * @return {Undo} undo command
 */
export declare const suppressOthers: (originalTarget: Element | Element[], parentNode?: HTMLElement, markerName?: string) => Undo;
