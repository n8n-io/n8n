export type PDFDocumentProxy = import("../src/display/api").PDFDocumentProxy;
export type PDFPageProxy = import("../src/display/api").PDFPageProxy;
export type EventBus = import("./event_utils").EventBus;
export type IPDFLinkService = import("./interfaces").IPDFLinkService;
export type PDFRenderingQueue = import("./pdf_rendering_queue").PDFRenderingQueue;
export type PDFThumbnailViewerOptions = {
    /**
     * - The container for the thumbnail
     * elements.
     */
    container: HTMLDivElement;
    /**
     * - The application event bus.
     */
    eventBus: EventBus;
    /**
     * - The navigation/linking service.
     */
    linkService: IPDFLinkService;
    /**
     * - The rendering queue object.
     */
    renderingQueue: PDFRenderingQueue;
    /**
     * - The maximum supported canvas size in
     * total pixels, i.e. width * height. Use `-1` for no limit, or `0` for
     * CSS-only zooming. The default value is 4096 * 8192 (32 mega-pixels).
     */
    maxCanvasPixels?: number | undefined;
    /**
     * - The maximum supported canvas dimension,
     * in either width or height. Use `-1` for no limit.
     * The default value is 32767.
     */
    maxCanvasDim?: number | undefined;
    /**
     * - Overwrites background and foreground colors
     * with user defined ones in order to improve readability in high contrast
     * mode.
     */
    pageColors?: Object | undefined;
    /**
     * - The AbortSignal for the window
     * events.
     */
    abortSignal?: AbortSignal | undefined;
    /**
     * - Enables hardware acceleration for
     * rendering. The default value is `false`.
     */
    enableHWA?: boolean | undefined;
};
/**
 * @typedef {Object} PDFThumbnailViewerOptions
 * @property {HTMLDivElement} container - The container for the thumbnail
 *   elements.
 * @property {EventBus} eventBus - The application event bus.
 * @property {IPDFLinkService} linkService - The navigation/linking service.
 * @property {PDFRenderingQueue} renderingQueue - The rendering queue object.
 * @property {number} [maxCanvasPixels] - The maximum supported canvas size in
 *   total pixels, i.e. width * height. Use `-1` for no limit, or `0` for
 *   CSS-only zooming. The default value is 4096 * 8192 (32 mega-pixels).
 * @property {number} [maxCanvasDim] - The maximum supported canvas dimension,
 *   in either width or height. Use `-1` for no limit.
 *   The default value is 32767.
 * @property {Object} [pageColors] - Overwrites background and foreground colors
 *   with user defined ones in order to improve readability in high contrast
 *   mode.
 * @property {AbortSignal} [abortSignal] - The AbortSignal for the window
 *   events.
 * @property {boolean} [enableHWA] - Enables hardware acceleration for
 *   rendering. The default value is `false`.
 */
/**
 * Viewer control to display thumbnails for pages in a PDF document.
 */
export class PDFThumbnailViewer {
    /**
     * @param {PDFThumbnailViewerOptions} options
     */
    constructor({ container, eventBus, linkService, renderingQueue, maxCanvasPixels, maxCanvasDim, pageColors, abortSignal, enableHWA, }: PDFThumbnailViewerOptions);
    container: HTMLDivElement;
    eventBus: import("./event_utils").EventBus;
    linkService: import("./interfaces").IPDFLinkService;
    renderingQueue: import("./pdf_rendering_queue").PDFRenderingQueue;
    maxCanvasPixels: number | undefined;
    maxCanvasDim: number | undefined;
    pageColors: Object | null;
    enableHWA: boolean;
    scroll: {
        right: boolean;
        down: boolean;
        lastX: any;
        lastY: any;
        _eventHandler: (evt: any) => void;
    };
    getThumbnail(index: any): any;
    scrollThumbnailIntoView(pageNumber: any): void;
    _currentPageNumber: any;
    set pagesRotation(rotation: any);
    get pagesRotation(): any;
    _pagesRotation: any;
    cleanup(): void;
    _thumbnails: any[] | undefined;
    _pageLabels: any[] | null | undefined;
    /**
     * @param {PDFDocumentProxy} pdfDocument
     */
    setDocument(pdfDocument: PDFDocumentProxy): void;
    pdfDocument: import("../src/display/api").PDFDocumentProxy | undefined;
    /**
     * @param {Array|null} labels
     */
    setPageLabels(labels: any[] | null): void;
    forceRendering(): boolean;
    #private;
}
