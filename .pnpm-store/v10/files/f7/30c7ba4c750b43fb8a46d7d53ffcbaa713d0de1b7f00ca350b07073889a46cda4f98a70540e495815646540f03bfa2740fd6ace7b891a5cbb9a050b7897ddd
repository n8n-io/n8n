export type PageViewport = import("../src/display/display_utils").PageViewport;
export type OptionalContentConfig = import("../src/display/optional_content_config").OptionalContentConfig;
export type EventBus = import("./event_utils").EventBus;
export type IL10n = import("./interfaces").IL10n;
export type IRenderableView = import("./interfaces").IRenderableView;
export type PDFRenderingQueue = import("./pdf_rendering_queue").PDFRenderingQueue;
export type PDFPageViewOptions = {
    /**
     * - The viewer element.
     */
    container?: HTMLDivElement | undefined;
    /**
     * - The application event bus.
     */
    eventBus: EventBus;
    /**
     * - The page unique ID (normally its number).
     */
    id: number;
    /**
     * - The page scale display.
     */
    scale?: number | undefined;
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
     * - The rendering queue object.
     */
    renderingQueue?: import("./pdf_rendering_queue").PDFRenderingQueue | undefined;
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
     * - Path for image resources, mainly
     * for annotation icons. Include trailing slash.
     */
    imageResourcesPath?: string | undefined;
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
     * - Overwrites background and foreground colors
     * with user defined ones in order to improve readability in high contrast
     * mode.
     */
    pageColors?: Object | undefined;
    /**
     * - Localization service.
     */
    l10n?: import("./interfaces").IL10n | undefined;
    /**
     * - The object that is used to lookup
     * the necessary layer-properties.
     */
    layerProperties?: Object | undefined;
    /**
     * - Enables hardware acceleration for
     * rendering. The default value is `false`.
     */
    enableHWA?: boolean | undefined;
    /**
     * - Enable creation of hyperlinks from
     * text that look like URLs. The default value is `true`.
     */
    enableAutoLinking?: boolean | undefined;
};
/**
 * @implements {IRenderableView}
 */
export class PDFPageView extends BasePDFPageView implements IRenderableView {
    /**
     * @param {PDFPageViewOptions} options
     */
    constructor(options: PDFPageViewOptions);
    renderingId: string;
    pdfPage: any;
    pageLabel: string | null;
    rotation: number;
    scale: number;
    viewport: import("../src/display/display_utils").PageViewport;
    pdfPageRotate: number;
    _optionalContentConfigPromise: Promise<import("../src/display/optional_content_config").OptionalContentConfig> | null;
    imageResourcesPath: string;
    enableDetailCanvas: boolean;
    maxCanvasPixels: any;
    maxCanvasDim: any;
    capCanvasAreaFactor: any;
    l10n: import("./interfaces").IL10n | GenericL10n | undefined;
    _isStandalone: boolean | undefined;
    _container: HTMLDivElement | undefined;
    _annotationCanvasMap: any;
    annotationLayer: AnnotationLayerBuilder | null;
    annotationEditorLayer: any;
    textLayer: TextLayerBuilder | null;
    xfaLayer: XfaLayerBuilder | null;
    structTreeLayer: any;
    drawLayer: any;
    detailView: any;
    div: HTMLDivElement;
    setPdfPage(pdfPage: any): void;
    destroy(): void;
    hasEditableAnnotations(): boolean;
    get _textHighlighter(): any;
    reset({ keepAnnotationLayer, keepAnnotationEditorLayer, keepXfaLayer, keepTextLayer, keepCanvasWrapper, preserveDetailViewState, }?: {
        keepAnnotationLayer?: boolean | undefined;
        keepAnnotationEditorLayer?: boolean | undefined;
        keepXfaLayer?: boolean | undefined;
        keepTextLayer?: boolean | undefined;
        keepCanvasWrapper?: boolean | undefined;
        preserveDetailViewState?: boolean | undefined;
    }): void;
    toggleEditingMode(isEditing: any): void;
    updateVisibleArea(visibleArea: any): void;
    /**
     * @typedef {Object} PDFPageViewUpdateParameters
     * @property {number} [scale] The new scale, if specified.
     * @property {number} [rotation] The new rotation, if specified.
     * @property {Promise<OptionalContentConfig>} [optionalContentConfigPromise]
     *   A promise that is resolved with an {@link OptionalContentConfig}
     *   instance. The default value is `null`.
     * @property {number} [drawingDelay]
     */
    /**
     * Update e.g. the scale and/or rotation of the page.
     * @param {PDFPageViewUpdateParameters} params
     */
    update({ scale, rotation, optionalContentConfigPromise, drawingDelay, }: {
        /**
         * The new scale, if specified.
         */
        scale?: number | undefined;
        /**
         * The new rotation, if specified.
         */
        rotation?: number | undefined;
        /**
         * A promise that is resolved with an {@link OptionalContentConfig}instance. The default value is `null`.
         */
        optionalContentConfigPromise?: Promise<import("../src/display/optional_content_config").OptionalContentConfig> | undefined;
        drawingDelay?: number | undefined;
    }): void;
    outputScale: OutputScale | undefined;
    /**
     * PLEASE NOTE: Most likely you want to use the `this.reset()` method,
     *              rather than calling this one directly.
     */
    cancelRendering({ keepAnnotationLayer, keepAnnotationEditorLayer, keepXfaLayer, keepTextLayer, cancelExtraDelay, }?: {
        keepAnnotationLayer?: boolean | undefined;
        keepAnnotationEditorLayer?: boolean | undefined;
        keepXfaLayer?: boolean | undefined;
        keepTextLayer?: boolean | undefined;
        cancelExtraDelay?: number | undefined;
    }): void;
    cssTransform({ redrawAnnotationLayer, redrawAnnotationEditorLayer, redrawXfaLayer, redrawTextLayer, hideTextLayer, }: {
        redrawAnnotationLayer?: boolean | undefined;
        redrawAnnotationEditorLayer?: boolean | undefined;
        redrawXfaLayer?: boolean | undefined;
        redrawTextLayer?: boolean | undefined;
        hideTextLayer?: boolean | undefined;
    }): void;
    get width(): number;
    get height(): number;
    getPagePoint(x: any, y: any): any[];
    _ensureCanvasWrapper(): null;
    _getRenderingContext(canvasContext: any, transform: any): {
        canvasContext: any;
        transform: any;
        viewport: import("../src/display/display_utils").PageViewport;
        annotationMode: number;
        optionalContentConfigPromise: Promise<import("../src/display/optional_content_config").OptionalContentConfig> | null;
        annotationCanvasMap: any;
        pageColors: null;
        isEditing: boolean;
    };
    draw(): Promise<void>;
    /**
     * @param {string|null} label
     */
    setPageLabel(label: string | null): void;
    /**
     * For use by the `PDFThumbnailView.setImage`-method.
     * @ignore
     */
    get thumbnailCanvas(): null;
    #private;
}
import { BasePDFPageView } from "./base_pdf_page_view.js";
import { GenericL10n } from "./genericl10n";
import { AnnotationLayerBuilder } from "./annotation_layer_builder.js";
import { TextLayerBuilder } from "./text_layer_builder.js";
import { XfaLayerBuilder } from "./xfa_layer_builder.js";
import { OutputScale } from "../src/pdf";
