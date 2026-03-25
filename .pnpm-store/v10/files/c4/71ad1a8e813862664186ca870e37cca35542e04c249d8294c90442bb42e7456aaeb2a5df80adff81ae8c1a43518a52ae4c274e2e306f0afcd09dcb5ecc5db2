export type EventBus = import("./event_utils").EventBus;
export type PDFScriptingManagerOptions = {
    /**
     * - The application event bus.
     */
    eventBus: EventBus;
    /**
     * - The path and filename of the
     * scripting bundle.
     */
    sandboxBundleSrc?: string | undefined;
    /**
     * - The factory that is used when
     * initializing scripting; must contain a `createScripting` method.
     * PLEASE NOTE: Primarily intended for the default viewer use-case.
     */
    externalServices?: Object | undefined;
    /**
     * - The function that is used to lookup
     * the necessary document properties.
     */
    docProperties?: Function | undefined;
};
/**
 * @typedef {Object} PDFScriptingManagerOptions
 * @property {EventBus} eventBus - The application event bus.
 * @property {string} [sandboxBundleSrc] - The path and filename of the
 *   scripting bundle.
 * @property {Object} [externalServices] - The factory that is used when
 *   initializing scripting; must contain a `createScripting` method.
 *   PLEASE NOTE: Primarily intended for the default viewer use-case.
 * @property {function} [docProperties] - The function that is used to lookup
 *   the necessary document properties.
 */
export class PDFScriptingManager {
    /**
     * @param {PDFScriptingManagerOptions} options
     */
    constructor({ eventBus, externalServices, docProperties }: PDFScriptingManagerOptions);
    setViewer(pdfViewer: any): void;
    setDocument(pdfDocument: any): Promise<void>;
    dispatchWillSave(): Promise<any>;
    dispatchDidSave(): Promise<any>;
    dispatchWillPrint(): Promise<void>;
    dispatchDidPrint(): Promise<any>;
    get destroyPromise(): any;
    get ready(): boolean;
    /**
     * @private
     */
    private get _pageOpenPending();
    /**
     * @private
     */
    private get _visitedPages();
    #private;
}
