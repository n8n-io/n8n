export type PDFPageProxy = import("../src/display/api").PDFPageProxy;
export type PageViewport = import("../src/display/display_utils").PageViewport;
export type RenderingStates = any;
/**
 * @interface
 */
export class IDownloadManager {
    /**
     * @param {Uint8Array} data
     * @param {string} filename
     * @param {string} [contentType]
     */
    downloadData(data: Uint8Array, filename: string, contentType?: string): void;
    /**
     * @param {Uint8Array} data
     * @param {string} filename
     * @param {string | null} [dest]
     * @returns {boolean} Indicating if the data was opened.
     */
    openOrDownloadData(data: Uint8Array, filename: string, dest?: string | null): boolean;
    /**
     * @param {Uint8Array} data
     * @param {string} url
     * @param {string} filename
     */
    download(data: Uint8Array, url: string, filename: string): void;
}
/**
 * @interface
 */
export class IL10n {
    /**
     * @returns {string} - The current locale.
     */
    getLanguage(): string;
    /**
     * @returns {string} - 'rtl' or 'ltr'.
     */
    getDirection(): string;
    /**
     * Translates text identified by the key and adds/formats data using the args
     * property bag. If the key was not found, translation falls back to the
     * fallback text.
     * @param {Array | string} ids
     * @param {Object | null} [args]
     * @param {string} [fallback]
     * @returns {Promise<string>}
     */
    get(ids: any[] | string, args?: Object | null, fallback?: string): Promise<string>;
    /**
     * Translates HTML element.
     * @param {HTMLElement} element
     * @returns {Promise<void>}
     */
    translate(element: HTMLElement): Promise<void>;
    /**
     * Pause the localization.
     */
    pause(): void;
    /**
     * Resume the localization.
     */
    resume(): void;
}
/** @typedef {import("../src/display/api").PDFPageProxy} PDFPageProxy */
/** @typedef {import("../src/display/display_utils").PageViewport} PageViewport */
/** @typedef {import("./ui_utils").RenderingStates} RenderingStates */
/**
 * @interface
 */
export class IPDFLinkService {
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
     * @param {boolean} value
     */
    set externalLinkEnabled(value: boolean);
    /**
     * @type {boolean}
     */
    get externalLinkEnabled(): boolean;
    /**
     * @param {string|Array} dest - The named, or explicit, PDF destination.
     */
    goToDestination(dest: string | any[]): Promise<void>;
    /**
     * @param {number|string} val - The page number, or page label.
     */
    goToPage(val: number | string): void;
    /**
     * @param {HTMLAnchorElement} link
     * @param {string} url
     * @param {boolean} [newWindow]
     */
    addLinkAttributes(link: HTMLAnchorElement, url: string, newWindow?: boolean): void;
    /**
     * @param dest - The PDF destination object.
     * @returns {string} The hyperlink to the PDF object.
     */
    getDestinationHash(dest: any): string;
    /**
     * @param hash - The PDF parameters/hash.
     * @returns {string} The hyperlink to the PDF object.
     */
    getAnchorUrl(hash: any): string;
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
    executeSetOCGState(action: Object): void;
}
/**
 * @interface
 */
export class IPDFPrintServiceFactory {
    static initGlobals(): void;
    static get supportsPrinting(): boolean;
    static createPrintService(): void;
}
/**
 * @interface
 */
export class IRenderableView {
    /** @type {function | null} */
    resume: Function | null;
    /**
     * @type {string} - Unique ID for rendering queue.
     */
    get renderingId(): string;
    /**
     * @type {RenderingStates}
     */
    get renderingState(): RenderingStates;
    /**
     * @returns {Promise} Resolved on draw completion.
     */
    draw(): Promise<any>;
}
