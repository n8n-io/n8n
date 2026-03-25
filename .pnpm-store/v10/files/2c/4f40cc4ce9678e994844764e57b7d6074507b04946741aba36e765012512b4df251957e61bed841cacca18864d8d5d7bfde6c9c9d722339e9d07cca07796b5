export type PDFPageProxy = import("../src/display/api").PDFPageProxy;
export type AnnotationStorage = import("../src/display/annotation_storage").AnnotationStorage;
export type PageViewport = import("../src/display/display_utils").PageViewport;
export type IPDFLinkService = import("./interfaces").IPDFLinkService;
export type XfaLayerBuilderOptions = {
    pdfPage: PDFPageProxy;
    annotationStorage?: import("../src/display/annotation_storage").AnnotationStorage | undefined;
    linkService: IPDFLinkService;
    xfaHtml?: Object | undefined;
};
export type XfaLayerBuilderRenderOptions = {
    viewport: PageViewport;
    /**
     * - The default value is "display".
     */
    intent?: string | undefined;
};
/**
 * @typedef {Object} XfaLayerBuilderOptions
 * @property {PDFPageProxy} pdfPage
 * @property {AnnotationStorage} [annotationStorage]
 * @property {IPDFLinkService} linkService
 * @property {Object} [xfaHtml]
 */
/**
 * @typedef {Object} XfaLayerBuilderRenderOptions
 * @property {PageViewport} viewport
 * @property {string} [intent] - The default value is "display".
 */
export class XfaLayerBuilder {
    /**
     * @param {XfaLayerBuilderOptions} options
     */
    constructor({ pdfPage, annotationStorage, linkService, xfaHtml, }: XfaLayerBuilderOptions);
    pdfPage: import("../src/display/api").PDFPageProxy;
    annotationStorage: import("../src/display/annotation_storage").AnnotationStorage;
    linkService: import("./interfaces").IPDFLinkService;
    xfaHtml: Object;
    div: HTMLDivElement | null;
    _cancelled: boolean;
    /**
     * @param {XfaLayerBuilderRenderOptions} viewport
     * @returns {Promise<Object | void>} A promise that is resolved when rendering
     *   of the XFA layer is complete. The first rendering will return an object
     *   with a `textDivs` property that can be used with the TextHighlighter.
     */
    render({ viewport, intent }: XfaLayerBuilderRenderOptions): Promise<Object | void>;
    cancel(): void;
    hide(): void;
}
