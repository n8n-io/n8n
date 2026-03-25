import { ClientSDK, RequestOptions } from "../lib/sdks.js";
import * as components from "../models/components/index.js";
import * as operations from "../models/operations/index.js";
export declare class Documents extends ClientSDK {
    /**
     * List document in a given library.
     *
     * @remarks
     * Given a library, lists the document that have been uploaded to that library.
     */
    list(request: operations.LibrariesDocumentsListV1Request, options?: RequestOptions): Promise<components.ListDocumentOut>;
    /**
     * Upload a new document.
     *
     * @remarks
     * Given a library, upload a new document to that library. It is queued for processing, it status will change it has been processed. The processing has to be completed in order be discoverable for the library search
     */
    upload(request: operations.LibrariesDocumentsUploadV1Request, options?: RequestOptions): Promise<components.DocumentOut>;
    /**
     * Retrieve the metadata of a specific document.
     *
     * @remarks
     * Given a library and a document in this library, you can retrieve the metadata of that document.
     */
    get(request: operations.LibrariesDocumentsGetV1Request, options?: RequestOptions): Promise<components.DocumentOut>;
    /**
     * Update the metadata of a specific document.
     *
     * @remarks
     * Given a library and a document in that library, update the name of that document.
     */
    update(request: operations.LibrariesDocumentsUpdateV1Request, options?: RequestOptions): Promise<components.DocumentOut>;
    /**
     * Delete a document.
     *
     * @remarks
     * Given a library and a document in that library, delete that document. The document will be deleted from the library and the search index.
     */
    delete(request: operations.LibrariesDocumentsDeleteV1Request, options?: RequestOptions): Promise<void>;
    /**
     * Retrieve the text content of a specific document.
     *
     * @remarks
     * Given a library and a document in that library, you can retrieve the text content of that document if it exists. For documents like pdf, docx and pptx the text content results from our processing using Mistral OCR.
     */
    textContent(request: operations.LibrariesDocumentsGetTextContentV1Request, options?: RequestOptions): Promise<components.DocumentTextContent>;
    /**
     * Retrieve the processing status of a specific document.
     *
     * @remarks
     * Given a library and a document in that library, retrieve the processing status of that document.
     */
    status(request: operations.LibrariesDocumentsGetStatusV1Request, options?: RequestOptions): Promise<components.ProcessingStatusOut>;
    /**
     * Retrieve the signed URL of a specific document.
     *
     * @remarks
     * Given a library and a document in that library, retrieve the signed URL of a specific document.The url will expire after 30 minutes and can be accessed by anyone with the link.
     */
    getSignedUrl(request: operations.LibrariesDocumentsGetSignedUrlV1Request, options?: RequestOptions): Promise<string>;
    /**
     * Retrieve the signed URL of text extracted from a given document.
     *
     * @remarks
     * Given a library and a document in that library, retrieve the signed URL of text extracted. For documents that are sent to the OCR this returns the result of the OCR queries.
     */
    extractedTextSignedUrl(request: operations.LibrariesDocumentsGetExtractedTextSignedUrlV1Request, options?: RequestOptions): Promise<string>;
    /**
     * Reprocess a document.
     *
     * @remarks
     * Given a library and a document in that library, reprocess that document, it will be billed again.
     */
    reprocess(request: operations.LibrariesDocumentsReprocessV1Request, options?: RequestOptions): Promise<void>;
}
//# sourceMappingURL=documents.d.ts.map