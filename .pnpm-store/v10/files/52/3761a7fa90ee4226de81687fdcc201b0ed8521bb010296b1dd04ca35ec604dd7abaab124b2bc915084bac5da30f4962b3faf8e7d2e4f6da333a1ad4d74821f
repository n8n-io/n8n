export type PDFPageProxy = import("../src/display/api").PDFPageProxy;
export type PageViewport = import("../src/display/display_utils").PageViewport;
export type AnnotationStorage = import("../src/display/annotation_storage").AnnotationStorage;
export type IDownloadManager = import("./interfaces").IDownloadManager;
export type IPDFLinkService = import("./interfaces").IPDFLinkService;
export type StructTreeLayerBuilder = import("./struct_tree_layer_builder.js").StructTreeLayerBuilder;
export type TextAccessibilityManager = import("./text_accessibility.js").TextAccessibilityManager;
export type AnnotationEditorUIManager = import("../src/display/editor/tools.js").AnnotationEditorUIManager;
export type AnnotationLayerBuilderOptions = {
    pdfPage: PDFPageProxy;
    annotationStorage?: import("../src/display/annotation_storage").AnnotationStorage | undefined;
    /**
     * - Path for image resources, mainly
     * for annotation icons. Include trailing slash.
     */
    imageResourcesPath?: string | undefined;
    renderForms: boolean;
    linkService: IPDFLinkService;
    downloadManager?: import("./interfaces").IDownloadManager | undefined;
    enableScripting?: boolean | undefined;
    hasJSActionsPromise?: Promise<boolean> | undefined;
    fieldObjectsPromise?: Promise<{
        [x: string]: Object[];
    } | null> | undefined;
    annotationCanvasMap?: Map<string, HTMLCanvasElement> | undefined;
    accessibilityManager?: import("./text_accessibility.js").TextAccessibilityManager | undefined;
    annotationEditorUIManager?: import("../src/pdf").AnnotationEditorUIManager | undefined;
    onAppend?: Function | undefined;
};
export type AnnotationLayerBuilderRenderOptions = {
    viewport: PageViewport;
    /**
     * - The default value is "display".
     */
    intent?: string | undefined;
    structTreeLayer?: import("./struct_tree_layer_builder.js").StructTreeLayerBuilder | undefined;
};
export type InjectLinkAnnotationsOptions = {
    inferredLinks: Array<Object>;
    viewport: PageViewport;
    structTreeLayer?: import("./struct_tree_layer_builder.js").StructTreeLayerBuilder | undefined;
};
/**
 * @typedef {Object} AnnotationLayerBuilderOptions
 * @property {PDFPageProxy} pdfPage
 * @property {AnnotationStorage} [annotationStorage]
 * @property {string} [imageResourcesPath] - Path for image resources, mainly
 *   for annotation icons. Include trailing slash.
 * @property {boolean} renderForms
 * @property {IPDFLinkService} linkService
 * @property {IDownloadManager} [downloadManager]
 * @property {boolean} [enableScripting]
 * @property {Promise<boolean>} [hasJSActionsPromise]
 * @property {Promise<Object<string, Array<Object>> | null>}
 *   [fieldObjectsPromise]
 * @property {Map<string, HTMLCanvasElement>} [annotationCanvasMap]
 * @property {TextAccessibilityManager} [accessibilityManager]
 * @property {AnnotationEditorUIManager} [annotationEditorUIManager]
 * @property {function} [onAppend]
 */
/**
 * @typedef {Object} AnnotationLayerBuilderRenderOptions
 * @property {PageViewport} viewport
 * @property {string} [intent] - The default value is "display".
 * @property {StructTreeLayerBuilder} [structTreeLayer]
 */
/**
 * @typedef {Object} InjectLinkAnnotationsOptions
 * @property {Array<Object>} inferredLinks
 * @property {PageViewport} viewport
 * @property {StructTreeLayerBuilder} [structTreeLayer]
 */
export class AnnotationLayerBuilder {
    /**
     * @param {AnnotationLayerBuilderOptions} options
     */
    constructor({ pdfPage, linkService, downloadManager, annotationStorage, imageResourcesPath, renderForms, enableScripting, hasJSActionsPromise, fieldObjectsPromise, annotationCanvasMap, accessibilityManager, annotationEditorUIManager, onAppend, }: AnnotationLayerBuilderOptions);
    pdfPage: import("../src/display/api").PDFPageProxy;
    linkService: import("./interfaces").IPDFLinkService;
    downloadManager: import("./interfaces").IDownloadManager | undefined;
    imageResourcesPath: string;
    renderForms: boolean;
    annotationStorage: import("../src/display/annotation_storage").AnnotationStorage;
    enableScripting: boolean;
    _hasJSActionsPromise: Promise<boolean>;
    _fieldObjectsPromise: Promise<{
        [x: string]: Object[];
    } | null>;
    _annotationCanvasMap: Map<string, HTMLCanvasElement>;
    _accessibilityManager: import("./text_accessibility.js").TextAccessibilityManager;
    _annotationEditorUIManager: import("../src/pdf").AnnotationEditorUIManager;
    annotationLayer: AnnotationLayer | null;
    div: HTMLDivElement | null;
    _cancelled: boolean;
    _eventBus: any;
    /**
     * @param {AnnotationLayerBuilderRenderOptions} options
     * @returns {Promise<void>} A promise that is resolved when rendering of the
     *   annotations is complete.
     */
    render({ viewport, intent, structTreeLayer }: AnnotationLayerBuilderRenderOptions): Promise<void>;
    cancel(): void;
    hide(internal?: boolean): void;
    hasEditableAnnotations(): boolean;
    /**
     * @param {InjectLinkAnnotationsOptions} options
     * @returns {Promise<void>} A promise that is resolved when the inferred links
     *   are added to the annotation layer.
     */
    injectLinkAnnotations({ inferredLinks, viewport, structTreeLayer, }: InjectLinkAnnotationsOptions): Promise<void>;
    #private;
}
import { AnnotationLayer } from "../src/pdf";
