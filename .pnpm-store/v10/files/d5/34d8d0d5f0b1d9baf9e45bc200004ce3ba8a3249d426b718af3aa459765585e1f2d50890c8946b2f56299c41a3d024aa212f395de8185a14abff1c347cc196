export type PDFDocumentProxy = import("../src/display/api").PDFDocumentProxy;
export type PDFPageProxy = import("../src/display/api").PDFPageProxy;
export type PageViewport = import("../src/display/display_utils").PageViewport;
export type OptionalContentConfig = import("../src/display/optional_content_config").OptionalContentConfig;
export type EventBus = import("./event_utils").EventBus;
export type IDownloadManager = import("./interfaces").IDownloadManager;
export type IL10n = import("./interfaces").IL10n;
export type IPDFLinkService = import("./interfaces").IPDFLinkService;
export type PDFFindController = import("./pdf_find_controller").PDFFindController;
export type PDFScriptingManager = import("./pdf_scripting_manager").PDFScriptingManager;
export type PDFViewerOptions = {
    /**
     * - The container for the viewer element.
     */
    container: HTMLDivElement;
    /**
     * - The viewer element.
     */
    viewer?: HTMLDivElement | undefined;
    /**
     * - The application event bus.
     */
    eventBus: EventBus;
    /**
     * - The navigation/linking service.
     */
    linkService?: import("./interfaces").IPDFLinkService | undefined;
    /**
     * - The download manager
     * component.
     */
    downloadManager?: import("./interfaces").IDownloadManager | undefined;
    /**
     * - The find controller
     * component.
     */
    findController?: import("./pdf_find_controller").PDFFindController | undefined;
    /**
     * - The scripting manager
     * component.
     */
    scriptingManager?: import("./pdf_scripting_manager").PDFScriptingManager | undefined;
    /**
     * - The rendering queue object.
     */
    renderingQueue?: PDFRenderingQueue | undefined;
    /**
     * - Removes the border shadow around
     * the pages. The default value is `false`.
     */
    removePageBorders?: boolean | undefined;
    /**
     * - Controls if the text layer used for
     * selection and searching is created. The constants from {TextLayerMode}
     * should be used. The default value is `TextLayerMode.ENABLE`.
     */
    textLayerMode?: number | undefined;
    /**
     * - Controls if the annotation layer is
     * created, and if interactive form elements or `AnnotationStorage`-data are
     * being rendered. The constants from {@link AnnotationMode} should be used;
     * see also {@link RenderParameters} and {@link GetOperatorListParameters}.
     * The default value is `AnnotationMode.ENABLE_FORMS`.
     */
    annotationMode?: number | undefined;
    /**
     * - Enables the creation and editing
     * of new Annotations. The constants from {@link AnnotationEditorType} should
     * be used. The default value is `AnnotationEditorType.NONE`.
     */
    annotationEditorMode?: number | undefined;
    /**
     * - A comma separated list
     * of colors to propose to highlight some text in the pdf.
     */
    annotationEditorHighlightColors?: string | undefined;
    /**
     * - Path for image resources, mainly
     * mainly for annotation icons. Include trailing slash.
     */
    imageResourcesPath?: string | undefined;
    /**
     * - Enables automatic rotation of
     * landscape pages upon printing. The default is `false`.
     */
    enablePrintAutoRotate?: boolean | undefined;
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
     * - Cap the canvas area to the
     * viewport increased by the value in percent. Use `-1` for no limit.
     * The default value is 200%.
     */
    capCanvasAreaFactor?: number | undefined;
    /**
     * - When enabled, if the rendered
     * pages would need a canvas that is larger than `maxCanvasPixels` or
     * `maxCanvasDim`, it will draw a second canvas on top of the CSS-zoomed one,
     * that only renders the part of the page that is close to the viewport.
     * The default value is `true`.
     */
    enableDetailCanvas?: boolean | undefined;
    /**
     * - Localization service.
     */
    l10n?: import("./interfaces").IL10n | undefined;
    /**
     * - Enables PDF document permissions,
     * when they exist. The default value is `false`.
     */
    enablePermissions?: boolean | undefined;
    /**
     * - Overwrites background and foreground colors
     * with user defined ones in order to improve readability in high contrast
     * mode.
     */
    pageColors?: Object | undefined;
    /**
     * - Enables hardware acceleration for
     * rendering. The default value is `false`.
     */
    enableHWA?: boolean | undefined;
    /**
     * - Enable zooming on pinch gesture.
     * The default value is `true`.
     */
    supportsPinchToZoom?: boolean | undefined;
    /**
     * - Enable creation of hyperlinks from
     * text that look like URLs. The default value is `true`.
     */
    enableAutoLinking?: boolean | undefined;
    /**
     * - Minimum duration to wait
     * before updating the canvas. The default value is `500`.
     */
    minDurationToUpdateCanvas?: number | undefined;
};
export namespace PagesCountLimit {
    let FORCE_SCROLL_MODE_PAGE: number;
    let FORCE_LAZY_PAGE_INIT: number;
    let PAUSE_EAGER_PAGE_INIT: number;
}
/**
 * @typedef {Object} PDFViewerOptions
 * @property {HTMLDivElement} container - The container for the viewer element.
 * @property {HTMLDivElement} [viewer] - The viewer element.
 * @property {EventBus} eventBus - The application event bus.
 * @property {IPDFLinkService} [linkService] - The navigation/linking service.
 * @property {IDownloadManager} [downloadManager] - The download manager
 *   component.
 * @property {PDFFindController} [findController] - The find controller
 *   component.
 * @property {PDFScriptingManager} [scriptingManager] - The scripting manager
 *   component.
 * @property {PDFRenderingQueue} [renderingQueue] - The rendering queue object.
 * @property {boolean} [removePageBorders] - Removes the border shadow around
 *   the pages. The default value is `false`.
 * @property {number} [textLayerMode] - Controls if the text layer used for
 *   selection and searching is created. The constants from {TextLayerMode}
 *   should be used. The default value is `TextLayerMode.ENABLE`.
 * @property {number} [annotationMode] - Controls if the annotation layer is
 *   created, and if interactive form elements or `AnnotationStorage`-data are
 *   being rendered. The constants from {@link AnnotationMode} should be used;
 *   see also {@link RenderParameters} and {@link GetOperatorListParameters}.
 *   The default value is `AnnotationMode.ENABLE_FORMS`.
 * @property {number} [annotationEditorMode] - Enables the creation and editing
 *   of new Annotations. The constants from {@link AnnotationEditorType} should
 *   be used. The default value is `AnnotationEditorType.NONE`.
 * @property {string} [annotationEditorHighlightColors] - A comma separated list
 *   of colors to propose to highlight some text in the pdf.
 * @property {string} [imageResourcesPath] - Path for image resources, mainly
 *   mainly for annotation icons. Include trailing slash.
 * @property {boolean} [enablePrintAutoRotate] - Enables automatic rotation of
 *   landscape pages upon printing. The default is `false`.
 * @property {number} [maxCanvasPixels] - The maximum supported canvas size in
 *   total pixels, i.e. width * height. Use `-1` for no limit, or `0` for
 *   CSS-only zooming. The default value is 4096 * 8192 (32 mega-pixels).
 * @property {number} [maxCanvasDim] - The maximum supported canvas dimension,
 *   in either width or height. Use `-1` for no limit.
 *   The default value is 32767.
 * @property {number} [capCanvasAreaFactor] - Cap the canvas area to the
 *   viewport increased by the value in percent. Use `-1` for no limit.
 *   The default value is 200%.
 * @property {boolean} [enableDetailCanvas] - When enabled, if the rendered
 *   pages would need a canvas that is larger than `maxCanvasPixels` or
 *   `maxCanvasDim`, it will draw a second canvas on top of the CSS-zoomed one,
 *   that only renders the part of the page that is close to the viewport.
 *   The default value is `true`.
 * @property {IL10n} [l10n] - Localization service.
 * @property {boolean} [enablePermissions] - Enables PDF document permissions,
 *   when they exist. The default value is `false`.
 * @property {Object} [pageColors] - Overwrites background and foreground colors
 *   with user defined ones in order to improve readability in high contrast
 *   mode.
 * @property {boolean} [enableHWA] - Enables hardware acceleration for
 *   rendering. The default value is `false`.
 * @property {boolean} [supportsPinchToZoom] - Enable zooming on pinch gesture.
 *   The default value is `true`.
 * @property {boolean} [enableAutoLinking] - Enable creation of hyperlinks from
 *   text that look like URLs. The default value is `true`.
 * @property {number} [minDurationToUpdateCanvas] - Minimum duration to wait
 *   before updating the canvas. The default value is `500`.
 */
export class PDFPageViewBuffer {
    constructor(size: any);
    push(view: any): void;
    /**
     * After calling resize, the size of the buffer will be `newSize`.
     * The optional parameter `idsToKeep` is, if present, a Set of page-ids to
     * push to the back of the buffer, delaying their destruction. The size of
     * `idsToKeep` has no impact on the final size of the buffer; if `idsToKeep`
     * is larger than `newSize`, some of those pages will be destroyed anyway.
     */
    resize(newSize: any, idsToKeep?: null): void;
    has(view: any): boolean;
    [Symbol.iterator](): SetIterator<any>;
    #private;
}
/**
 * Simple viewer control to display PDF content/pages.
 */
export class PDFViewer {
    /**
     * @param {PDFViewerOptions} options
     */
    constructor(options: PDFViewerOptions);
    container: HTMLDivElement;
    viewer: Element | null;
    eventBus: import("./event_utils").EventBus;
    linkService: import("./interfaces").IPDFLinkService | SimpleLinkService;
    downloadManager: import("./interfaces").IDownloadManager | null;
    findController: import("./pdf_find_controller").PDFFindController | null;
    _scriptingManager: import("./pdf_scripting_manager").PDFScriptingManager | null;
    imageResourcesPath: string;
    enablePrintAutoRotate: boolean;
    removePageBorders: boolean | undefined;
    maxCanvasPixels: number | undefined;
    maxCanvasDim: number | undefined;
    capCanvasAreaFactor: number | undefined;
    enableDetailCanvas: boolean;
    l10n: import("./interfaces").IL10n | GenericL10n | undefined;
    pageColors: Object | null;
    defaultRenderingQueue: boolean;
    renderingQueue: PDFRenderingQueue | undefined;
    scroll: {
        right: boolean;
        down: boolean;
        lastX: any;
        lastY: any;
        _eventHandler: (evt: any) => void;
    };
    presentationModeState: number;
    get pagesCount(): number;
    getPageView(index: any): any;
    getCachedPageViews(): Set<any>;
    /**
     * @type {boolean} - True if all {PDFPageView} objects are initialized.
     */
    get pageViewsReady(): boolean;
    /**
     * @type {boolean}
     */
    get renderForms(): boolean;
    /**
     * @type {boolean}
     */
    get enableScripting(): boolean;
    /**
     * @param {number} val - The page number.
     */
    set currentPageNumber(val: number);
    /**
     * @type {number}
     */
    get currentPageNumber(): number;
    /**
     * @returns {boolean} Whether the pageNumber is valid (within bounds).
     * @private
     */
    private _setCurrentPageNumber;
    _currentPageNumber: any;
    /**
     * @param {string} val - The page label.
     */
    set currentPageLabel(val: string);
    /**
     * @type {string|null} Returns the current page label, or `null` if no page
     *   labels exist.
     */
    get currentPageLabel(): string | null;
    /**
     * @param {number} val - Scale of the pages in percents.
     */
    set currentScale(val: number);
    /**
     * @type {number}
     */
    get currentScale(): number;
    /**
     * @param val - The scale of the pages (in percent or predefined value).
     */
    set currentScaleValue(val: string);
    /**
     * @type {string}
     */
    get currentScaleValue(): string;
    /**
     * @param {number} rotation - The rotation of the pages (0, 90, 180, 270).
     */
    set pagesRotation(rotation: number);
    /**
     * @type {number}
     */
    get pagesRotation(): number;
    _pagesRotation: any;
    get firstPagePromise(): any;
    get onePageRendered(): any;
    get pagesPromise(): any;
    get _layerProperties(): any;
    getAllText(): Promise<string | null>;
    /**
     * @param {PDFDocumentProxy} pdfDocument
     */
    setDocument(pdfDocument: PDFDocumentProxy): void;
    pdfDocument: import("../src/display/api").PDFDocumentProxy | undefined;
    _scrollMode: any;
    _optionalContentConfigPromise: Promise<import("../src/display/optional_content_config").OptionalContentConfig> | null | undefined;
    /**
     * @param {Array|null} labels
     */
    setPageLabels(labels: any[] | null): void;
    _pageLabels: any[] | null | undefined;
    _resetView(): void;
    _pages: any[] | undefined;
    _currentScale: any;
    _currentScaleValue: any;
    _location: {
        pageNumber: any;
        scale: any;
        top: number;
        left: number;
        rotation: any;
        pdfOpenParams: string;
    } | null | undefined;
    _firstPageCapability: any;
    _onePageRenderedCapability: any;
    _pagesCapability: any;
    _previousScrollMode: any;
    _spreadMode: any;
    _scrollUpdate(): void;
    /**
     * @param {string} label - The page label.
     * @returns {number|null} The page number corresponding to the page label,
     *   or `null` when no page labels exist and/or the input is invalid.
     */
    pageLabelToPageNumber(label: string): number | null;
    /**
     * @typedef {Object} ScrollPageIntoViewParameters
     * @property {number} pageNumber - The page number.
     * @property {Array} [destArray] - The original PDF destination array, in the
     *   format: <page-ref> </XYZ|/FitXXX> <args..>
     * @property {boolean} [allowNegativeOffset] - Allow negative page offsets.
     *   The default value is `false`.
     * @property {boolean} [ignoreDestinationZoom] - Ignore the zoom argument in
     *   the destination array. The default value is `false`.
     */
    /**
     * Scrolls page into view.
     * @param {ScrollPageIntoViewParameters} params
     */
    scrollPageIntoView({ pageNumber, destArray, allowNegativeOffset, ignoreDestinationZoom, }: {
        /**
         * - The page number.
         */
        pageNumber: number;
        /**
         * - The original PDF destination array, in the
         * format: <page-ref> </XYZ|/FitXXX> <args..>
         */
        destArray?: any[] | undefined;
        /**
         * - Allow negative page offsets.
         * The default value is `false`.
         */
        allowNegativeOffset?: boolean | undefined;
        /**
         * - Ignore the zoom argument in
         * the destination array. The default value is `false`.
         */
        ignoreDestinationZoom?: boolean | undefined;
    }): void;
    _updateLocation(firstPage: any): void;
    update(): void;
    containsElement(element: any): boolean;
    focus(): void;
    get _isContainerRtl(): boolean;
    get isInPresentationMode(): boolean;
    get isChangingPresentationMode(): boolean;
    get isHorizontalScrollbarEnabled(): boolean;
    get isVerticalScrollbarEnabled(): boolean;
    _getVisiblePages(): Object;
    cleanup(): void;
    /**
     * @private
     */
    private _cancelRendering;
    forceRendering(currentlyVisiblePages: any): boolean;
    /**
     * @type {boolean} Whether all pages of the PDF document have identical
     *   widths and heights.
     */
    get hasEqualPageSizes(): boolean;
    /**
     * Returns sizes of the pages.
     * @returns {Array} Array of objects with width/height/rotation fields.
     */
    getPagesOverview(): any[];
    /**
     * @param {Promise<OptionalContentConfig>} promise - A promise that is
     *   resolved with an {@link OptionalContentConfig} instance.
     */
    set optionalContentConfigPromise(promise: Promise<OptionalContentConfig>);
    /**
     * @type {Promise<OptionalContentConfig | null>}
     */
    get optionalContentConfigPromise(): Promise<OptionalContentConfig | null>;
    /**
     * @param {number} mode - The direction in which the document pages should be
     *   laid out within the scrolling container.
     *   The constants from {ScrollMode} should be used.
     */
    set scrollMode(mode: number);
    /**
     * @type {number} One of the values in {ScrollMode}.
     */
    get scrollMode(): number;
    _updateScrollMode(pageNumber?: null): void;
    /**
     * @param {number} mode - Group the pages in spreads, starting with odd- or
     *   even-number pages (unless `SpreadMode.NONE` is used).
     *   The constants from {SpreadMode} should be used.
     */
    set spreadMode(mode: number);
    /**
     * @type {number} One of the values in {SpreadMode}.
     */
    get spreadMode(): number;
    _updateSpreadMode(pageNumber?: null): void;
    /**
     * @private
     */
    private _getPageAdvance;
    /**
     * Go to the next page, taking scroll/spread-modes into account.
     * @returns {boolean} Whether navigation occurred.
     */
    nextPage(): boolean;
    /**
     * Go to the previous page, taking scroll/spread-modes into account.
     * @returns {boolean} Whether navigation occurred.
     */
    previousPage(): boolean;
    /**
     * @typedef {Object} ChangeScaleOptions
     * @property {number} [drawingDelay]
     * @property {number} [scaleFactor]
     * @property {number} [steps]
     * @property {Array} [origin] x and y coordinates of the scale
     *                            transformation origin.
     */
    /**
     * Changes the current zoom level by the specified amount.
     * @param {ChangeScaleOptions} [options]
     */
    updateScale({ drawingDelay, scaleFactor, steps, origin }?: {
        drawingDelay?: number | undefined;
        scaleFactor?: number | undefined;
        steps?: number | undefined;
        /**
         * x and y coordinates of the scale
         *  transformation origin.
         */
        origin?: any[] | undefined;
    }): void;
    /**
     * Increase the current zoom level one, or more, times.
     * @param {ChangeScaleOptions} [options]
     */
    increaseScale(options?: {
        drawingDelay?: number | undefined;
        scaleFactor?: number | undefined;
        steps?: number | undefined;
        /**
         * x and y coordinates of the scale
         *  transformation origin.
         */
        origin?: any[] | undefined;
    }): void;
    /**
     * Decrease the current zoom level one, or more, times.
     * @param {ChangeScaleOptions} [options]
     */
    decreaseScale(options?: {
        drawingDelay?: number | undefined;
        scaleFactor?: number | undefined;
        steps?: number | undefined;
        /**
         * x and y coordinates of the scale
         *  transformation origin.
         */
        origin?: any[] | undefined;
    }): void;
    get containerTopLeft(): number[];
    /**
     * @typedef {Object} AnnotationEditorModeOptions
     * @property {number} mode - The editor mode (none, FreeText, ink, ...).
     * @property {string|null} [editId] - ID of the existing annotation to edit.
     * @property {boolean} [isFromKeyboard] - True if the mode change is due to a
     *   keyboard action.
     */
    /**
     * @param {AnnotationEditorModeOptions} options
     */
    set annotationEditorMode({ mode, editId, isFromKeyboard }: {
        /**
         * - The editor mode (none, FreeText, ink, ...).
         */
        mode: number;
        /**
         * - ID of the existing annotation to edit.
         */
        editId?: string | null | undefined;
        /**
         * - True if the mode change is due to a
         * keyboard action.
         */
        isFromKeyboard?: boolean | undefined;
    });
    get annotationEditorMode(): {
        /**
         * - The editor mode (none, FreeText, ink, ...).
         */
        mode: number;
        /**
         * - ID of the existing annotation to edit.
         */
        editId?: string | null | undefined;
        /**
         * - True if the mode change is due to a
         * keyboard action.
         */
        isFromKeyboard?: boolean | undefined;
    };
    refresh(noUpdate?: boolean, updateArgs?: any): void;
    #private;
}
import { PDFRenderingQueue } from "./pdf_rendering_queue.js";
import { SimpleLinkService } from "./pdf_link_service.js";
import { GenericL10n } from "./genericl10n";
