export type PDFPageProxy = import("../src/display/api").PDFPageProxy;
export type StructTreeLayerBuilderOptions = {
    pdfPage: PDFPageProxy;
    rawDims: Object;
};
/**
 * @typedef {Object} StructTreeLayerBuilderOptions
 * @property {PDFPageProxy} pdfPage
 * @property {Object} rawDims
 */
export class StructTreeLayerBuilder {
    /**
     * @param {StructTreeLayerBuilderOptions} options
     */
    constructor(pdfPage: any, rawDims: any);
    /**
     * @returns {Promise<void>}
     */
    render(): Promise<void>;
    getAriaAttributes(annotationId: any): Promise<any>;
    hide(): void;
    show(): void;
    addElementsToTextLayer(): void;
    #private;
}
