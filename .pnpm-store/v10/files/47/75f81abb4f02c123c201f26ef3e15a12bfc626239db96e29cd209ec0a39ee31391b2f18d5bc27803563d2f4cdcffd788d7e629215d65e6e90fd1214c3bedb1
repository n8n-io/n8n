export type EventBus = import("./event_utils").EventBus;
export type IPDFLinkService = import("./interfaces").IPDFLinkService;
export type PDFLinkServiceOptions = {
    /**
     * - The application event bus.
     */
    eventBus: EventBus;
    /**
     * - Specifies the `target` attribute
     * for external links. Must use one of the values from {LinkTarget}.
     * Defaults to using no target.
     */
    externalLinkTarget?: number | undefined;
    /**
     * - Specifies the `rel` attribute for
     * external links. Defaults to stripping the referrer.
     */
    externalLinkRel?: string | undefined;
    /**
     * - Ignores the zoom argument,
     * thus preserving the current zoom level in the viewer, when navigating
     * to internal destinations. The default value is `false`.
     */
    ignoreDestinationZoom?: boolean | undefined;
};
export namespace LinkTarget {
    let NONE: number;
    let SELF: number;
    let BLANK: number;
    let PARENT: number;
    let TOP: number;
}
/**
 * @typedef {Object} PDFLinkServiceOptions
 * @property {EventBus} eventBus - The application event bus.
 * @property {number} [externalLinkTarget] - Specifies the `target` attribute
 *   for external links. Must use one of the values from {LinkTarget}.
 *   Defaults to using no target.
 * @property {string} [externalLinkRel] - Specifies the `rel` attribute for
 *   external links. Defaults to stripping the referrer.
 * @property {boolean} [ignoreDestinationZoom] - Ignores the zoom argument,
 *   thus preserving the current zoom level in the viewer, when navigating
 *   to internal destinations. The default value is `false`.
 */
/**
 * Performs navigation functions inside PDF, such as opening specified page,
 * or destination.
 * @implements {IPDFLinkService}
 */
export class PDFLinkService implements IPDFLinkService {
    /**
     * @param {PDFLinkServiceOptions} options
     */
    constructor({ eventBus, externalLinkTarget, externalLinkRel, ignoreDestinationZoom, }?: PDFLinkServiceOptions);
    externalLinkEnabled: boolean;
    eventBus: import("./event_utils").EventBus;
    externalLinkTarget: number;
    externalLinkRel: string;
    _ignoreDestinationZoom: boolean;
    baseUrl: any;
    pdfDocument: any;
    pdfViewer: any;
    pdfHistory: any;
    setDocument(pdfDocument: any, baseUrl?: null): void;
    setViewer(pdfViewer: any): void;
    setHistory(pdfHistory: any): void;
    /**
     * @type {number}
     */
    get pagesCount(): number;
    /**
     * @param {number} value
     */
    set page(value: number);
    /**
     * @type {number}
     */
    get page(): number;
    /**
     * @param {number} value
     */
    set rotation(value: number);
    /**
     * @type {number}
     */
    get rotation(): number;
    /**
     * @type {boolean}
     */
    get isInPresentationMode(): boolean;
    /**
     * This method will, when available, also update the browser history.
     *
     * @param {string|Array} dest - The named, or explicit, PDF destination.
     */
    goToDestination(dest: string | any[]): Promise<void>;
    /**
     * This method will, when available, also update the browser history.
     *
     * @param {number|string} val - The page number, or page label.
     */
    goToPage(val: number | string): void;
    /**
     * Adds various attributes (href, title, target, rel) to hyperlinks.
     * @param {HTMLAnchorElement} link
     * @param {string} url
     * @param {boolean} [newWindow]
     */
    addLinkAttributes(link: HTMLAnchorElement, url: string, newWindow?: boolean): void;
    /**
     * @param {string|Array} dest - The PDF destination object.
     * @returns {string} The hyperlink to the PDF object.
     */
    getDestinationHash(dest: string | any[]): string;
    /**
     * Prefix the full url on anchor links to make sure that links are resolved
     * relative to the current URL instead of the one defined in <base href>.
     * @param {string} anchor - The anchor hash, including the #.
     * @returns {string} The hyperlink to the PDF object.
     */
    getAnchorUrl(anchor: string): string;
    /**
     * @param {string} hash
     */
    setHash(hash: string): void;
    /**
     * @param {string} action
     */
    executeNamedAction(action: string): void;
    /**
     * @param {Object} action
     */
    executeSetOCGState(action: Object): Promise<void>;
}
/**
 * @implements {IPDFLinkService}
 */
export class SimpleLinkService extends PDFLinkService implements IPDFLinkService {
}
