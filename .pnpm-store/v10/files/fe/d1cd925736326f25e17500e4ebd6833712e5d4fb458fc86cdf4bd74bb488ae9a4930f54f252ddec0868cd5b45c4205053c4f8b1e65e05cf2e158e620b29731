export type PDFHistoryOptions = {
    /**
     * - The navigation/linking service.
     */
    linkService: IPDFLinkService;
    /**
     * - The application event bus.
     */
    eventBus: EventBus;
};
export type InitializeParameters = {
    /**
     * - The PDF document's unique fingerprint.
     */
    fingerprint: string;
    /**
     * - Reset the browsing history.
     */
    resetHistory?: boolean | undefined;
    /**
     * - Attempt to update the document URL, with
     * the current hash, when pushing/replacing browser history entries.
     */
    updateUrl?: boolean | undefined;
};
export type PushParameters = {
    /**
     * - The named destination. If absent, a
     * stringified version of `explicitDest` is used.
     */
    namedDest?: string | undefined;
    /**
     * - The explicit destination array.
     */
    explicitDest: any[];
    /**
     * - The page to which the destination points.
     */
    pageNumber: number;
};
export type EventBus = import("./event_utils").EventBus;
export type IPDFLinkService = import("./interfaces").IPDFLinkService;
export function isDestArraysEqual(firstDest: any, secondDest: any): boolean;
export function isDestHashesEqual(destHash: any, pushHash: any): boolean;
export class PDFHistory {
    /**
     * @param {PDFHistoryOptions} options
     */
    constructor({ linkService, eventBus }: PDFHistoryOptions);
    linkService: import("./interfaces").IPDFLinkService;
    eventBus: import("./event_utils.js").EventBus;
    _initialized: boolean;
    _fingerprint: string;
    _isPagesLoaded: boolean;
    /**
     * Initialize the history for the PDF document, using either the current
     * browser history entry or the document hash, whichever is present.
     * @param {InitializeParameters} params
     */
    initialize({ fingerprint, resetHistory, updateUrl }: InitializeParameters): void;
    _updateUrl: boolean | undefined;
    _popStateInProgress: boolean | undefined;
    _blockHashChange: number | undefined;
    _currentHash: string | undefined;
    _numPositionUpdates: number | undefined;
    _uid: any;
    _maxUid: any;
    _destination: any;
    _position: {
        hash: any;
        page: number;
        first: any;
        rotation: any;
    } | null | undefined;
    _initialRotation: any;
    _initialBookmark: any;
    /**
     * Reset the current `PDFHistory` instance, and consequently prevent any
     * further updates and/or navigation of the browser history.
     */
    reset(): void;
    _updateViewareaTimeout: any;
    /**
     * Push an internal destination to the browser history.
     * @param {PushParameters}
     */
    push({ namedDest, explicitDest, pageNumber }: PushParameters): void;
    /**
     * Push a page to the browser history; generally the `push` method should be
     * used instead.
     * @param {number} pageNumber
     */
    pushPage(pageNumber: number): void;
    /**
     * Push the current position to the browser history.
     */
    pushCurrentPosition(): void;
    /**
     * Go back one step in the browser history.
     * NOTE: Avoids navigating away from the document, useful for "named actions".
     */
    back(): void;
    /**
     * Go forward one step in the browser history.
     * NOTE: Avoids navigating away from the document, useful for "named actions".
     */
    forward(): void;
    /**
     * @type {boolean} Indicating if the user is currently moving through the
     *   browser history, useful e.g. for skipping the next 'hashchange' event.
     */
    get popStateInProgress(): boolean;
    get initialBookmark(): any;
    get initialRotation(): any;
    #private;
}
