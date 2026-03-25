export type OptionalContentConfig = import("../src/display/optional_content_config").OptionalContentConfig;
export type PageViewport = import("../src/display/display_utils").PageViewport;
export type EventBus = import("./event_utils").EventBus;
export type IPDFLinkService = import("./interfaces").IPDFLinkService;
export type IRenderableView = import("./interfaces").IRenderableView;
export type PDFRenderingQueue = import("./pdf_rendering_queue").PDFRenderingQueue;
export type PDFThumbnailViewOptions = {
    /**
     * - The viewer element.
     */
    container: HTMLDivElement;
    /**
     * - The application event bus.
     */
    eventBus: EventBus;
    /**
     * - The thumbnail's unique ID (normally its number).
     */
    id: number;
    /**
     * - The page viewport.
     */
    defaultViewport: PageViewport;
    /**
     * -
     * A promise that is resolved with an {@link OptionalContentConfig} instance.
     * The default value is `null`.
     */
    optionalContentConfigPromise?: Promise<import("../src/display/optional_content_config").OptionalContentConfig> | undefined;
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
     * - Enables hardware acceleration for
     * rendering. The default value is `false`.
     */
    enableHWA?: boolean | undefined;
};
/**
 * @implements {IRenderableView}
 */
export class PDFThumbnailView implements IRenderableView {
    /**
     * @param {PDFThumbnailViewOptions} options
     */
    constructor({ container, eventBus, id, defaultViewport, optionalContentConfigPromise, linkService, renderingQueue, maxCanvasPixels, maxCanvasDim, pageColors, enableHWA, }: PDFThumbnailViewOptions);
    id: number;
    renderingId: string;
    pageLabel: string | null;
    pdfPage: any;
    rotation: number;
    viewport: import("../src/display/display_utils").PageViewport;
    pdfPageRotate: number;
    _optionalContentConfigPromise: Promise<import("../src/display/optional_content_config").OptionalContentConfig> | null;
    maxCanvasPixels: any;
    maxCanvasDim: any;
    pageColors: Object | null;
    enableHWA: boolean;
    eventBus: import("./event_utils").EventBus;
    linkService: import("./interfaces").IPDFLinkService;
    renderingQueue: import("./pdf_rendering_queue").PDFRenderingQueue;
    renderTask: any;
    renderingState: number;
    resume: (() => void) | null;
    anchor: HTMLAnchorElement;
    div: HTMLDivElement;
    _placeholderImg: HTMLDivElement;
    canvasWidth: number | undefined;
    canvasHeight: number | undefined;
    scale: number | undefined;
    setPdfPage(pdfPage: any): void;
    reset(): void;
    update({ rotation }: {
        rotation?: null | undefined;
    }): void;
    /**
     * PLEASE NOTE: Most likely you want to use the `this.reset()` method,
     *              rather than calling this one directly.
     */
    cancelRendering(): void;
    image: HTMLImageElement | undefined;
    draw(): Promise<void>;
    setImage(pageView: any): void;
    /**
     * @param {string|null} label
     */
    setPageLabel(label: string | null): void;
    #private;
}
/**
 * @typedef {Object} PDFThumbnailViewOptions
 * @property {HTMLDivElement} container - The viewer element.
 * @property {EventBus} eventBus - The application event bus.
 * @property {number} id - The thumbnail's unique ID (normally its number).
 * @property {PageViewport} defaultViewport - The page viewport.
 * @property {Promise<OptionalContentConfig>} [optionalContentConfigPromise] -
 *   A promise that is resolved with an {@link OptionalContentConfig} instance.
 *   The default value is `null`.
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
 * @property {boolean} [enableHWA] - Enables hardware acceleration for
 *   rendering. The default value is `false`.
 */
export class TempImageFactory {
    static "__#83@#tempCanvas": null;
    static getCanvas(width: any, height: any): (HTMLCanvasElement | CanvasRenderingContext2D | null)[];
    static destroyCanvas(): void;
}
