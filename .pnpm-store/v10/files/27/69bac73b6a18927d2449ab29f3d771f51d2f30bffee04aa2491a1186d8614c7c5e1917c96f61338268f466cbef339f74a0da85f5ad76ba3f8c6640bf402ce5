export type AnnotationStorage = import("./annotation_storage").AnnotationStorage;
export type PageViewport = import("./display_utils").PageViewport;
export type IPDFLinkService = import("../../web/interfaces").IPDFLinkService;
export type XfaLayerParameters = {
    viewport: PageViewport;
    div: HTMLDivElement;
    xfaHtml: Object;
    annotationStorage?: import("./annotation_storage").AnnotationStorage | undefined;
    linkService: IPDFLinkService;
    /**
     * - (default value is 'display').
     */
    intent?: string | undefined;
};
/**
 * @typedef {Object} XfaLayerParameters
 * @property {PageViewport} viewport
 * @property {HTMLDivElement} div
 * @property {Object} xfaHtml
 * @property {AnnotationStorage} [annotationStorage]
 * @property {IPDFLinkService} linkService
 * @property {string} [intent] - (default value is 'display').
 */
export class XfaLayer {
    static setupStorage(html: any, id: any, element: any, storage: any, intent: any): void;
    static setAttributes({ html, element, storage, intent, linkService }: {
        html: any;
        element: any;
        storage?: null | undefined;
        intent: any;
        linkService: any;
    }): void;
    /**
     * Render the XFA layer.
     *
     * @param {XfaLayerParameters} parameters
     */
    static render(parameters: XfaLayerParameters): {
        textDivs: Text[];
    };
    /**
     * Update the XFA layer.
     *
     * @param {XfaLayerParameters} parameters
     */
    static update(parameters: XfaLayerParameters): void;
}
