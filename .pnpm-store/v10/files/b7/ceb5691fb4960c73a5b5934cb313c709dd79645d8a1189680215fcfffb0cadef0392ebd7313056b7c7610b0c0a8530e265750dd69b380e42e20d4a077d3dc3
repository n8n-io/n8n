export type IRenderableView = import("./interfaces").IRenderableView;
export type PDFViewer = import("./pdf_viewer").PDFViewer;
export type PDFThumbnailViewer = import("./pdf_thumbnail_viewer").PDFThumbnailViewer;
/**
 * Controls rendering of the views for pages and thumbnails.
 */
export class PDFRenderingQueue {
    pdfViewer: import("./pdf_viewer").PDFViewer | null;
    pdfThumbnailViewer: import("./pdf_thumbnail_viewer").PDFThumbnailViewer | null;
    onIdle: any;
    highestPriorityPage: string | null;
    /** @type {number} */
    idleTimeout: number;
    printing: boolean;
    isThumbnailViewEnabled: boolean;
    /**
     * @param {PDFViewer} pdfViewer
     */
    setViewer(pdfViewer: PDFViewer): void;
    /**
     * @param {PDFThumbnailViewer} pdfThumbnailViewer
     */
    setThumbnailViewer(pdfThumbnailViewer: PDFThumbnailViewer): void;
    /**
     * @param {IRenderableView} view
     * @returns {boolean}
     */
    isHighestPriority(view: IRenderableView): boolean;
    /**
     * @param {Object} currentlyVisiblePages
     */
    renderHighestPriority(currentlyVisiblePages: Object): void;
    /**
     * @param {Object} visible
     * @param {Array} views
     * @param {boolean} scrolledDown
     * @param {boolean} [preRenderExtra]
     * @param {boolean} [ignoreDetailViews]
     */
    getHighestPriority(visible: Object, views: any[], scrolledDown: boolean, preRenderExtra?: boolean, ignoreDetailViews?: boolean): any;
    /**
     * @param {IRenderableView} view
     * @returns {boolean}
     */
    isViewFinished(view: IRenderableView): boolean;
    /**
     * Render a page or thumbnail view. This calls the appropriate function
     * based on the views state. If the view is already rendered it will return
     * `false`.
     *
     * @param {IRenderableView} view
     */
    renderView(view: IRenderableView): boolean;
}
