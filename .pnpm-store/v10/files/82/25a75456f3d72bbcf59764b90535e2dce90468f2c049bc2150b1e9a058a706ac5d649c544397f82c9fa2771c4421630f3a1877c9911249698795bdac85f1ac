export type PDFPageProxy = import("../src/display/api").PDFPageProxy;
export type PageViewport = import("../src/display/display_utils").PageViewport;
export type TextHighlighter = import("./text_highlighter").TextHighlighter;
export type TextAccessibilityManager = import("./text_accessibility.js").TextAccessibilityManager;
export type TextLayerBuilderOptions = {
    pdfPage: PDFPageProxy;
    /**
     * - Optional object that will handle
     * highlighting text from the find controller.
     */
    highlighter?: import("./text_highlighter").TextHighlighter | undefined;
    accessibilityManager?: import("./text_accessibility.js").TextAccessibilityManager | undefined;
    enablePermissions?: boolean | undefined;
    onAppend?: Function | undefined;
};
export type TextLayerBuilderRenderOptions = {
    viewport: PageViewport;
    textContentParams?: Object | undefined;
};
/**
 * @typedef {Object} TextLayerBuilderOptions
 * @property {PDFPageProxy} pdfPage
 * @property {TextHighlighter} [highlighter] - Optional object that will handle
 *   highlighting text from the find controller.
 * @property {TextAccessibilityManager} [accessibilityManager]
 * @property {boolean} [enablePermissions]
 * @property {function} [onAppend]
 */
/**
 * @typedef {Object} TextLayerBuilderRenderOptions
 * @property {PageViewport} viewport
 * @property {Object} [textContentParams]
 */
/**
 * The text layer builder provides text selection functionality for the PDF.
 * It does this by creating overlay divs over the PDF's text. These divs
 * contain text that matches the PDF text they are overlaying.
 */
export class TextLayerBuilder {
    static "__#79@#textLayers": Map<any, any>;
    static "__#79@#selectionChangeAbortController": null;
    static "__#79@#removeGlobalSelectionListener"(textLayerDiv: any): void;
    static "__#79@#enableGlobalSelectionListener"(): void;
    /**
     * @param {TextLayerBuilderOptions} options
     */
    constructor({ pdfPage, highlighter, accessibilityManager, enablePermissions, onAppend, }: TextLayerBuilderOptions);
    pdfPage: import("../src/display/api").PDFPageProxy;
    highlighter: import("./text_highlighter").TextHighlighter;
    accessibilityManager: import("./text_accessibility.js").TextAccessibilityManager;
    div: HTMLDivElement;
    /**
     * Renders the text layer.
     * @param {TextLayerBuilderRenderOptions} options
     * @returns {Promise<void>}
     */
    render({ viewport, textContentParams }: TextLayerBuilderRenderOptions): Promise<void>;
    hide(): void;
    show(): void;
    /**
     * Cancel rendering of the text layer.
     */
    cancel(): void;
    #private;
}
