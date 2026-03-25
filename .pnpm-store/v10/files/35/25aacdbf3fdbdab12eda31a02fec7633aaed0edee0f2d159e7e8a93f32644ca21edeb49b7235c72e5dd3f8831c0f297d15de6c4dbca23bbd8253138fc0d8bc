export type IRenderableView = import("./interfaces").IRenderableView;
/** @typedef {import("./interfaces").IRenderableView} IRenderableView */
/**
 * @implements {IRenderableView}
 */
export class PDFPageDetailView extends BasePDFPageView implements IRenderableView {
    constructor({ pageView }: {
        pageView: any;
    });
    /**
     * @type {boolean} True when the last rendering attempt of the view was
     *                 cancelled due to a `.reset()` call. This will happen when
     *                 the visible area changes so much during the rendering that
     *                 we need to cancel the rendering and start over.
     */
    renderingCancelled: boolean;
    pageView: any;
    renderingId: string;
    div: any;
    setPdfPage(pdfPage: any): void;
    get pdfPage(): any;
    reset({ keepCanvas }?: {
        keepCanvas?: boolean | undefined;
    }): void;
    update({ visibleArea, underlyingViewUpdated }?: {
        visibleArea?: null | undefined;
        underlyingViewUpdated?: boolean | undefined;
    }): void;
    draw(): Promise<void>;
    #private;
}
import { BasePDFPageView } from "./base_pdf_page_view.js";
