export type GetPageSizeInchesParameters = {
    view: number[];
    userUnit: number;
    rotate: number;
};
export type PageSize = {
    /**
     * - In inches.
     */
    width: number;
    /**
     * - In inches.
     */
    height: number;
};
export type GetVisibleElementsParameters = {
    /**
     * - A container that can possibly scroll.
     */
    scrollEl: HTMLElement;
    /**
     * - Objects with a `div` property that contains an
     * HTMLElement, which should all be descendants of `scrollEl` satisfying the
     * relevant layout assumptions.
     */
    views: any[];
    /**
     * - If `true`, the returned elements are
     * sorted in descending order of the percent of their padding box that is
     * visible. The default value is `false`.
     */
    sortByVisibility: boolean;
    /**
     * - If `true`, the elements are assumed to be
     * laid out horizontally instead of vertically. The default value is `false`.
     */
    horizontal: boolean;
    /**
     * - If `true`, the `scrollEl` container is assumed to
     * be in right-to-left mode. The default value is `false`.
     */
    rtl: boolean;
};
/**
 * Promise that is resolved when DOM window becomes visible.
 */
export const animationStarted: Promise<any>;
/**
 * Converts API PageLayout values to the format used by `BaseViewer`.
 * @param {string} layout - The API PageLayout value.
 * @returns {Object}
 */
export function apiPageLayoutToViewerModes(layout: string): Object;
/**
 * Converts API PageMode values to the format used by `PDFSidebar`.
 * NOTE: There's also a "FullScreen" parameter which is not possible to support,
 *       since the Fullscreen API used in browsers requires that entering
 *       fullscreen mode only occurs as a result of a user-initiated event.
 * @param {string} mode - The API PageMode value.
 * @returns {number} A value from {SidebarView}.
 */
export function apiPageModeToSidebarView(mode: string): number;
/**
 *  Approximates float number as a fraction using Farey sequence (max order
 *  of 8).
 *  @param {number} x - Positive float number.
 *  @returns {Array} Estimated fraction: the first array item is a numerator,
 *                   the second one is a denominator.
 *                   They are both natural numbers.
 */
export function approximateFraction(x: number): any[];
export const AutoPrintRegExp: RegExp;
/**
 * Helper function for getVisibleElements.
 *
 * @param {number} index - initial guess at the first visible element
 * @param {Array} views - array of pages, into which `index` is an index
 * @param {number} top - the top of the scroll pane
 * @returns {number} less than or equal to `index` that is definitely at or
 *   before the first visible element in `views`, but not by too much. (Usually,
 *   this will be the first element in the first partially visible row in
 *   `views`, although sometimes it goes back one row further.)
 */
export function backtrackBeforeAllVisibleElements(index: number, views: any[], top: number): number;
/**
 * Use binary search to find the index of the first item in a given array which
 * passes a given condition. The items are expected to be sorted in the sense
 * that if the condition is true for one item in the array, then it is also true
 * for all following items.
 *
 * @returns {number} Index of the first array element to pass the test,
 *                   or |items.length| if no such element exists.
 */
export function binarySearchFirstItem(items: any, condition: any, start?: number): number;
export const calcRound: ((x: number) => number) | ((x: any) => any);
export namespace CursorTool {
    let SELECT: number;
    let HAND: number;
    let ZOOM: number;
}
export const DEFAULT_SCALE: 1;
export const DEFAULT_SCALE_DELTA: 1.1;
export const DEFAULT_SCALE_VALUE: "auto";
export const docStyle: CSSStyleDeclaration | null;
/**
 * @param {number} x - A positive number to round to a multiple of `div`.
 * @param {number} div - A natural number.
 */
export function floorToDivide(x: number, div: number): number;
/**
 * Get the active or focused element in current DOM.
 *
 * Recursively search for the truly active or focused element in case there are
 * shadow DOMs.
 *
 * @returns {Element} the truly active or focused element.
 */
export function getActiveOrFocusedElement(): Element;
/**
 * @typedef {Object} GetPageSizeInchesParameters
 * @property {number[]} view
 * @property {number} userUnit
 * @property {number} rotate
 */
/**
 * @typedef {Object} PageSize
 * @property {number} width - In inches.
 * @property {number} height - In inches.
 */
/**
 * Gets the size of the specified page, converted from PDF units to inches.
 * @param {GetPageSizeInchesParameters} params
 * @returns {PageSize}
 */
export function getPageSizeInches({ view, userUnit, rotate }: GetPageSizeInchesParameters): PageSize;
/**
 * @typedef {Object} GetVisibleElementsParameters
 * @property {HTMLElement} scrollEl - A container that can possibly scroll.
 * @property {Array} views - Objects with a `div` property that contains an
 *   HTMLElement, which should all be descendants of `scrollEl` satisfying the
 *   relevant layout assumptions.
 * @property {boolean} sortByVisibility - If `true`, the returned elements are
 *   sorted in descending order of the percent of their padding box that is
 *   visible. The default value is `false`.
 * @property {boolean} horizontal - If `true`, the elements are assumed to be
 *   laid out horizontally instead of vertically. The default value is `false`.
 * @property {boolean} rtl - If `true`, the `scrollEl` container is assumed to
 *   be in right-to-left mode. The default value is `false`.
 */
/**
 * Generic helper to find out what elements are visible within a scroll pane.
 *
 * Well, pretty generic. There are some assumptions placed on the elements
 * referenced by `views`:
 *   - If `horizontal`, no left of any earlier element is to the right of the
 *     left of any later element.
 *   - Otherwise, `views` can be split into contiguous rows where, within a row,
 *     no top of any element is below the bottom of any other element, and
 *     between rows, no bottom of any element in an earlier row is below the
 *     top of any element in a later row.
 *
 * (Here, top, left, etc. all refer to the padding edge of the element in
 * question. For pages, that ends up being equivalent to the bounding box of the
 * rendering canvas. Earlier and later refer to index in `views`, not page
 * layout.)
 *
 * @param {GetVisibleElementsParameters} params
 * @returns {Object} `{ first, last, views: [{ id, x, y, view, percent }] }`
 */
export function getVisibleElements({ scrollEl, views, sortByVisibility, horizontal, rtl, }: GetVisibleElementsParameters): Object;
export function isPortraitOrientation(size: any): boolean;
export function isValidRotation(angle: any): boolean;
export function isValidScrollMode(mode: any): boolean;
export function isValidSpreadMode(mode: any): boolean;
export const MAX_AUTO_SCALE: 1.25;
export const MAX_SCALE: 10;
export const MIN_SCALE: 0.1;
export function normalizeWheelEventDelta(evt: any): number;
export function normalizeWheelEventDirection(evt: any): number;
/**
 * Helper function to parse query string (e.g. ?param1=value&param2=...).
 * @param {string} query
 * @returns {Map}
 */
export function parseQueryString(query: string): Map<any, any>;
export namespace PresentationModeState {
    let UNKNOWN: number;
    let NORMAL: number;
    let CHANGING: number;
    let FULLSCREEN: number;
}
export class ProgressBar {
    constructor(bar: any);
    set percent(val: number);
    get percent(): number;
    setWidth(viewer: any): void;
    setDisableAutoFetch(delay?: number): void;
    hide(): void;
    show(): void;
    #private;
}
/**
 * @param {string} str
 * @param {boolean} [replaceInvisible]
 */
export function removeNullCharacters(str: string, replaceInvisible?: boolean): string;
export namespace RenderingStates {
    let INITIAL: number;
    let RUNNING: number;
    let PAUSED: number;
    let FINISHED: number;
}
export const SCROLLBAR_PADDING: 40;
/**
 * Scrolls specified element into view of its parent.
 * @param {HTMLElement} element - The element to be visible.
 * @param {Object} [spot] - An object with optional top and left properties,
 *   specifying the offset from the top left edge.
 * @param {number} [spot.left]
 * @param {number} [spot.top]
 * @param {boolean} [scrollMatches] - When scrolling search results into view,
 *   ignore elements that either: Contains marked content identifiers,
 *   or have the CSS-rule `overflow: hidden;` set. The default value is `false`.
 */
export function scrollIntoView(element: HTMLElement, spot?: {
    left?: number | undefined;
    top?: number | undefined;
}, scrollMatches?: boolean): void;
export namespace ScrollMode {
    let UNKNOWN_1: number;
    export { UNKNOWN_1 as UNKNOWN };
    export let VERTICAL: number;
    export let HORIZONTAL: number;
    export let WRAPPED: number;
    export let PAGE: number;
}
export namespace SidebarView {
    let UNKNOWN_2: number;
    export { UNKNOWN_2 as UNKNOWN };
    export let NONE: number;
    export let THUMBS: number;
    export let OUTLINE: number;
    export let ATTACHMENTS: number;
    export let LAYERS: number;
}
export namespace SpreadMode {
    let UNKNOWN_3: number;
    export { UNKNOWN_3 as UNKNOWN };
    let NONE_1: number;
    export { NONE_1 as NONE };
    export let ODD: number;
    export let EVEN: number;
}
export namespace TextLayerMode {
    let DISABLE: number;
    let ENABLE: number;
    let ENABLE_PERMISSIONS: number;
}
export function toggleCheckedBtn(button: any, toggle: any, view?: null): void;
export function toggleExpandedBtn(button: any, toggle: any, view?: null): void;
export const UNKNOWN_SCALE: 0;
export const VERTICAL_PADDING: 5;
/**
 * Helper function to start monitoring the scroll event and converting them into
 * PDF.js friendly one: with scroll debounce and scroll direction.
 */
export function watchScroll(viewAreaElement: any, callback: any, abortSignal?: undefined): {
    right: boolean;
    down: boolean;
    lastX: any;
    lastY: any;
    _eventHandler: (evt: any) => void;
};
