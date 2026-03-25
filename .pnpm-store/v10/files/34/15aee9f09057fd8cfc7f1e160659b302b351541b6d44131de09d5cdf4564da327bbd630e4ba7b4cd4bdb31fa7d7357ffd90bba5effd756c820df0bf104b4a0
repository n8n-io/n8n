export type PDFPageProxy = import("../src/display/api").PDFPageProxy;
export type PageViewport = import("../src/display/display_utils").PageViewport;
export type AnnotationEditorUIManager = import("../src/display/editor/tools.js").AnnotationEditorUIManager;
export type TextAccessibilityManager = import("./text_accessibility.js").TextAccessibilityManager;
export type IL10n = import("./interfaces").IL10n;
export type AnnotationLayer = import("../src/display/annotation_layer.js").AnnotationLayer;
export type StructTreeLayerBuilder = any;
export type AnnotationEditorLayerBuilderOptions = {
    uiManager?: import("../src/pdf").AnnotationEditorUIManager | undefined;
    pdfPage: PDFPageProxy;
    l10n?: import("./interfaces").IL10n | undefined;
    structTreeLayer?: StructTreeLayerBuilder;
    accessibilityManager?: import("./text_accessibility.js").TextAccessibilityManager | undefined;
    annotationLayer?: import("../src/pdf").AnnotationLayer | undefined;
    textLayer?: TextLayer;
    drawLayer?: DrawLayer;
    onAppend?: Function | undefined;
};
export type AnnotationEditorLayerBuilderRenderOptions = {
    viewport: PageViewport;
    /**
     * - The default value is "display".
     */
    intent?: string | undefined;
};
/**
 * @typedef {Object} AnnotationEditorLayerBuilderOptions
 * @property {AnnotationEditorUIManager} [uiManager]
 * @property {PDFPageProxy} pdfPage
 * @property {IL10n} [l10n]
 * @property {StructTreeLayerBuilder} [structTreeLayer]
 * @property {TextAccessibilityManager} [accessibilityManager]
 * @property {AnnotationLayer} [annotationLayer]
 * @property {TextLayer} [textLayer]
 * @property {DrawLayer} [drawLayer]
 * @property {function} [onAppend]
 */
/**
 * @typedef {Object} AnnotationEditorLayerBuilderRenderOptions
 * @property {PageViewport} viewport
 * @property {string} [intent] - The default value is "display".
 */
export class AnnotationEditorLayerBuilder {
    /**
     * @param {AnnotationEditorLayerBuilderOptions} options
     */
    constructor(options: AnnotationEditorLayerBuilderOptions);
    pdfPage: import("../src/display/api").PDFPageProxy;
    accessibilityManager: import("./text_accessibility.js").TextAccessibilityManager | undefined;
    l10n: import("./interfaces").IL10n | GenericL10n | undefined;
    annotationEditorLayer: AnnotationEditorLayer | null;
    div: HTMLDivElement | null;
    _cancelled: boolean;
    /**
     * @param {AnnotationEditorLayerBuilderRenderOptions} options
     * @returns {Promise<void>}
     */
    render({ viewport, intent }: AnnotationEditorLayerBuilderRenderOptions): Promise<void>;
    cancel(): void;
    hide(): void;
    show(): void;
    #private;
}
import { GenericL10n } from "./genericl10n";
import { AnnotationEditorLayer } from "../src/pdf";
