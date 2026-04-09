import { RestError } from "@azure/core-rest-pipeline";
import { IndexDocumentsResult } from "./generated/data/models/index.js";
import { IndexDocumentsBatch } from "./indexDocumentsBatch.js";
import { IndexDocumentsAction, IndexDocumentsOptions, SearchIndexingBufferedSenderDeleteDocumentsOptions, SearchIndexingBufferedSenderFlushDocumentsOptions, SearchIndexingBufferedSenderMergeDocumentsOptions, SearchIndexingBufferedSenderMergeOrUploadDocumentsOptions, SearchIndexingBufferedSenderOptions, SearchIndexingBufferedSenderUploadDocumentsOptions } from "./indexModels.js";
/**
 * Index Documents Client
 */
export interface IndexDocumentsClient<TModel extends object> {
    /**
     * Perform a set of index modifications (upload, merge, mergeOrUpload, delete)
     * for the given set of documents.
     *
     * @param batch - An array of actions to perform on the index.
     * @param options - Additional options.
     */
    indexDocuments(batch: IndexDocumentsBatch<TModel>, options: IndexDocumentsOptions): Promise<IndexDocumentsResult>;
}
/**
 * Default Batch Size
 */
export declare const DEFAULT_BATCH_SIZE: number;
/**
 * Default window flush interval
 */
export declare const DEFAULT_FLUSH_WINDOW: number;
/**
 * Default number of times to retry.
 */
export declare const DEFAULT_RETRY_COUNT: number;
/**
 * Class used to perform buffered operations against a search index,
 * including adding, updating, and removing them.
 */
export declare class SearchIndexingBufferedSender<TModel extends object> {
    /**
     * Search Client used to call the underlying IndexBatch operations.
     */
    private client;
    /**
     * Indicates if autoFlush is enabled.
     */
    private autoFlush;
    /**
     * Interval between flushes (in milliseconds).
     */
    private flushWindowInMs;
    /**
     * Delay between retries
     */
    private throttlingDelayInMs;
    /**
     * Maximum number of Retries
     */
    private maxRetriesPerAction;
    /**
     * Max Delay between retries
     */
    private maxThrottlingDelayInMs;
    /**
     * Size of the batch.
     */
    private initialBatchActionCount;
    /**
     * Batch object used to complete the service call.
     */
    private batchObject;
    /**
     * Clean up for the timer
     */
    private cleanupTimer?;
    /**
     * Event emitter/publisher used in the Buffered Sender
     */
    private readonly emitter;
    /**
     * Method to retrieve the document key
     */
    private documentKeyRetriever;
    /**
     * Creates a new instance of SearchIndexingBufferedSender.
     *
     * @param client - Search Client used to call the underlying IndexBatch operations.
     * @param options - Options to modify auto flush.
     *
     */
    constructor(client: IndexDocumentsClient<TModel>, documentKeyRetriever: (document: TModel) => string, options?: SearchIndexingBufferedSenderOptions);
    /**
     * Uploads the documents/Adds the documents to the upload queue.
     *
     * @param documents - Documents to be uploaded.
     * @param options - Upload options.
     */
    uploadDocuments(documents: TModel[], options?: SearchIndexingBufferedSenderUploadDocumentsOptions): Promise<void>;
    /**
     * Merges the documents/Adds the documents to the merge queue.
     *
     * @param documents - Documents to be merged.
     * @param options - Upload options.
     */
    mergeDocuments(documents: TModel[], options?: SearchIndexingBufferedSenderMergeDocumentsOptions): Promise<void>;
    /**
     * Merges/Uploads the documents/Adds the documents to the merge/upload queue.
     *
     * @param documents - Documents to be merged/uploaded.
     * @param options - Upload options.
     */
    mergeOrUploadDocuments(documents: TModel[], options?: SearchIndexingBufferedSenderMergeOrUploadDocumentsOptions): Promise<void>;
    /**
     * Deletes the documents/Adds the documents to the delete queue.
     *
     * @param documents - Documents to be deleted.
     * @param options - Upload options.
     */
    deleteDocuments(documents: TModel[], options?: SearchIndexingBufferedSenderDeleteDocumentsOptions): Promise<void>;
    /**
     * Flushes the queue manually.
     *
     * @param options - Flush options.
     */
    flush(options?: SearchIndexingBufferedSenderFlushDocumentsOptions): Promise<void>;
    /**
     * If using autoFlush: true, call this to cleanup the autoflush timer.
     */
    dispose(): Promise<void>;
    /**
     * Attach Batch Added Event
     *
     * @param event - Event to be emitted
     * @param listener - Event Listener
     */
    on(event: "batchAdded", listener: (e: {
        action: string;
        documents: TModel[];
    }) => void): void;
    /**
     * Attach Batch Sent Event
     *
     * @param event - Event to be emitted
     * @param listener - Event Listener
     */
    on(event: "beforeDocumentSent", listener: (e: IndexDocumentsAction<TModel>) => void): void;
    /**
     * Attach Batch Succeeded Event
     *
     * @param event - Event to be emitted
     * @param listener - Event Listener
     */
    on(event: "batchSucceeded", listener: (e: IndexDocumentsResult) => void): void;
    /**
     * Attach Batch Failed Event
     *
     * @param event - Event to be emitted
     * @param listener - Event Listener
     */
    on(event: "batchFailed", listener: (e: RestError) => void): void;
    /**
     * Detach Batch Added Event
     *
     * @param event - Event to be emitted
     * @param listener - Event Listener
     */
    off(event: "batchAdded", listener: (e: {
        action: string;
        documents: TModel[];
    }) => void): void;
    /**
     * Detach Batch Sent Event
     *
     * @param event - Event to be emitted
     * @param listener - Event Listener
     */
    off(event: "beforeDocumentSent", listener: (e: IndexDocumentsAction<TModel>) => void): void;
    /**
     * Detach Batch Succeeded Event
     *
     * @param event - Event to be emitted
     * @param listener - Event Listener
     */
    off(event: "batchSucceeded", listener: (e: IndexDocumentsResult) => void): void;
    /**
     * Detach Batch Failed Event
     *
     * @param event - Event to be emitted
     * @param listener - Event Listener
     */
    off(event: "batchFailed", listener: (e: RestError) => void): void;
    private isBatchReady;
    private internalFlush;
    private pruneActions;
    private submitDocuments;
    private isRetryAbleError;
}
//# sourceMappingURL=searchIndexingBufferedSender.d.ts.map