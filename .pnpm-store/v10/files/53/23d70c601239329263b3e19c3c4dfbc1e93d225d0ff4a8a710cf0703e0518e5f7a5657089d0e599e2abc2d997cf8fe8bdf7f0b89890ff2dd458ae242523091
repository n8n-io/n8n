export type PDFDocumentProxy = import("../src/display/api").PDFDocumentProxy;
export type EventBus = import("./event_utils").EventBus;
export type IPDFLinkService = import("./interfaces").IPDFLinkService;
export type PDFFindControllerOptions = {
    /**
     * - The navigation/linking service.
     */
    linkService: IPDFLinkService;
    /**
     * - The application event bus.
     */
    eventBus: EventBus;
    /**
     * - True if the matches
     * count must be updated on progress or only when the last page is reached.
     * The default value is `true`.
     */
    updateMatchesCountOnProgress?: boolean | undefined;
};
export namespace FindState {
    let FOUND: number;
    let NOT_FOUND: number;
    let WRAPPED: number;
    let PENDING: number;
}
export function getOriginalIndex(diffs: any, pos: any, len: any): any[];
export function normalize(text: any): any[];
/**
 * @typedef {Object} PDFFindControllerOptions
 * @property {IPDFLinkService} linkService - The navigation/linking service.
 * @property {EventBus} eventBus - The application event bus.
 * @property {boolean} [updateMatchesCountOnProgress] - True if the matches
 *   count must be updated on progress or only when the last page is reached.
 *   The default value is `true`.
 */
/**
 * Provides search functionality to find a given string in a PDF document.
 */
export class PDFFindController {
    /**
     * @param {PDFFindControllerOptions} options
     */
    constructor({ linkService, eventBus, updateMatchesCountOnProgress }: PDFFindControllerOptions);
    _linkService: import("./interfaces").IPDFLinkService;
    _eventBus: import("./event_utils").EventBus;
    /**
     * Callback used to check if a `pageNumber` is currently visible.
     * @type {function}
     */
    onIsPageVisible: Function;
    get highlightMatches(): boolean | undefined;
    get pageMatches(): any[] | undefined;
    get pageMatchesLength(): any[] | undefined;
    get selected(): {
        pageIdx: number;
        matchIdx: number;
    } | undefined;
    get state(): null;
    /**
     * Set a reference to the PDF document in order to search it.
     * Note that searching is not possible if this method is not called.
     *
     * @param {PDFDocumentProxy} pdfDocument - The PDF document to search.
     */
    setDocument(pdfDocument: PDFDocumentProxy): void;
    _pdfDocument: import("../src/display/api").PDFDocumentProxy | null | undefined;
    _dirtyMatch: boolean | undefined;
    _findTimeout: any;
    _highlightMatches: boolean | undefined;
    /**
     * @typedef {Object} PDFFindControllerScrollMatchIntoViewParams
     * @property {HTMLElement} element
     * @property {number} selectedLeft
     * @property {number} pageIndex
     * @property {number} matchIndex
     */
    /**
     * Scroll the current match into view.
     * @param {PDFFindControllerScrollMatchIntoViewParams}
     */
    scrollMatchIntoView({ element, selectedLeft, pageIndex, matchIndex, }: {
        element: HTMLElement;
        selectedLeft: number;
        pageIndex: number;
        matchIndex: number;
    }): void;
    _scrollMatches: boolean | undefined;
    _pageMatches: any[] | undefined;
    _pageMatchesLength: any[] | undefined;
    _selected: {
        pageIdx: number;
        matchIdx: number;
    } | undefined;
    _offset: {
        pageIdx: null;
        matchIdx: null;
        wrapped: boolean;
    } | undefined;
    _extractTextPromises: any[] | undefined;
    _pageContents: any[] | undefined;
    _pageDiffs: any[] | undefined;
    _hasDiacritics: any[] | undefined;
    _matchesCountTotal: number | undefined;
    _pagesToSearch: number | null | undefined;
    _pendingFindMatches: Set<any> | undefined;
    _resumePageIdx: any;
    _firstPageCapability: any;
    _rawQuery: any;
    /**
     * @typedef {Object} FindMatch
     * @property {number} index - The start of the matched text in the page's
     *   string contents.
     * @property {number} length - The length of the matched text.
     */
    /**
     * @param {string | string[]} query - The search query.
     * @param {string} pageContent - The text content of the page to search in.
     * @param {number} pageIndex - The index of the page that is being processed.
     * @returns {FindMatch[] | undefined} An array of matches in the provided
     *   page.
     */
    match(query: string | string[], pageContent: string, pageIndex: number): {
        /**
         * - The start of the matched text in the page's
         * string contents.
         */
        index: number;
        /**
         * - The length of the matched text.
         */
        length: number;
    }[] | undefined;
    #private;
}
