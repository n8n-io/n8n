// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { delay } from "@azure/core-util";
import EventEmitter from "events";
import { IndexDocumentsBatch } from "./indexDocumentsBatch.js";
import { getRandomIntegerInclusive } from "./serviceUtils.js";
import { createSpan } from "./tracing.js";
/**
 * Default Batch Size
 */
export const DEFAULT_BATCH_SIZE = 512;
/**
 * Default window flush interval
 */
export const DEFAULT_FLUSH_WINDOW = 60000;
/**
 * Default number of times to retry.
 */
export const DEFAULT_RETRY_COUNT = 3;
/**
 * Default Max Delay between retries.
 */
const DEFAULT_MAX_RETRY_DELAY = 60000;
/**
 * Class used to perform buffered operations against a search index,
 * including adding, updating, and removing them.
 */
export class SearchIndexingBufferedSender {
    /**
     * Search Client used to call the underlying IndexBatch operations.
     */
    client;
    /**
     * Indicates if autoFlush is enabled.
     */
    autoFlush;
    /**
     * Interval between flushes (in milliseconds).
     */
    flushWindowInMs;
    /**
     * Delay between retries
     */
    throttlingDelayInMs;
    /**
     * Maximum number of Retries
     */
    maxRetriesPerAction;
    /**
     * Max Delay between retries
     */
    maxThrottlingDelayInMs;
    /**
     * Size of the batch.
     */
    initialBatchActionCount;
    /**
     * Batch object used to complete the service call.
     */
    batchObject;
    /**
     * Clean up for the timer
     */
    cleanupTimer;
    /**
     * Event emitter/publisher used in the Buffered Sender
     */
    emitter = new EventEmitter();
    /**
     * Method to retrieve the document key
     */
    documentKeyRetriever;
    /**
     * Creates a new instance of SearchIndexingBufferedSender.
     *
     * @param client - Search Client used to call the underlying IndexBatch operations.
     * @param options - Options to modify auto flush.
     *
     */
    constructor(client, documentKeyRetriever, options = {}) {
        this.client = client;
        this.documentKeyRetriever = documentKeyRetriever;
        // General Configuration properties
        this.autoFlush = options.autoFlush ?? true;
        this.initialBatchActionCount = options.initialBatchActionCount ?? DEFAULT_BATCH_SIZE;
        this.flushWindowInMs = options.flushWindowInMs ?? DEFAULT_FLUSH_WINDOW;
        // Retry specific configuration properties
        this.throttlingDelayInMs = options.throttlingDelayInMs ?? DEFAULT_FLUSH_WINDOW;
        this.maxRetriesPerAction = options.maxRetriesPerAction ?? DEFAULT_RETRY_COUNT;
        this.maxThrottlingDelayInMs = options.maxThrottlingDelayInMs ?? DEFAULT_MAX_RETRY_DELAY;
        this.batchObject = new IndexDocumentsBatch();
        if (this.autoFlush) {
            const interval = setInterval(() => this.flush(), this.flushWindowInMs);
            interval?.unref();
            this.cleanupTimer = () => {
                clearInterval(interval);
            };
        }
    }
    /**
     * Uploads the documents/Adds the documents to the upload queue.
     *
     * @param documents - Documents to be uploaded.
     * @param options - Upload options.
     */
    async uploadDocuments(documents, options = {}) {
        const { span, updatedOptions } = createSpan("SearchIndexingBufferedSender-uploadDocuments", options);
        try {
            this.batchObject.upload(documents);
            this.emitter.emit("batchAdded", {
                action: "upload",
                documents,
            });
            return this.internalFlush(false, updatedOptions);
        }
        catch (e) {
            span.setStatus({
                status: "error",
                error: e.message,
            });
            throw e;
        }
        finally {
            span.end();
        }
    }
    /**
     * Merges the documents/Adds the documents to the merge queue.
     *
     * @param documents - Documents to be merged.
     * @param options - Upload options.
     */
    async mergeDocuments(documents, options = {}) {
        const { span, updatedOptions } = createSpan("SearchIndexingBufferedSender-mergeDocuments", options);
        try {
            this.batchObject.merge(documents);
            this.emitter.emit("batchAdded", {
                action: "merge",
                documents,
            });
            return this.internalFlush(false, updatedOptions);
        }
        catch (e) {
            span.setStatus({
                status: "error",
                error: e.message,
            });
            throw e;
        }
        finally {
            span.end();
        }
    }
    /**
     * Merges/Uploads the documents/Adds the documents to the merge/upload queue.
     *
     * @param documents - Documents to be merged/uploaded.
     * @param options - Upload options.
     */
    async mergeOrUploadDocuments(documents, options = {}) {
        const { span, updatedOptions } = createSpan("SearchIndexingBufferedSender-mergeOrUploadDocuments", options);
        try {
            this.batchObject.mergeOrUpload(documents);
            this.emitter.emit("batchAdded", {
                action: "mergeOrUpload",
                documents,
            });
            return this.internalFlush(false, updatedOptions);
        }
        catch (e) {
            span.setStatus({
                status: "error",
                error: e.message,
            });
            throw e;
        }
        finally {
            span.end();
        }
    }
    /**
     * Deletes the documents/Adds the documents to the delete queue.
     *
     * @param documents - Documents to be deleted.
     * @param options - Upload options.
     */
    async deleteDocuments(documents, options = {}) {
        const { span, updatedOptions } = createSpan("SearchIndexingBufferedSender-deleteDocuments", options);
        try {
            this.batchObject.delete(documents);
            this.emitter.emit("batchAdded", {
                action: "delete",
                documents,
            });
            return this.internalFlush(false, updatedOptions);
        }
        catch (e) {
            span.setStatus({
                status: "error",
                error: e.message,
            });
            throw e;
        }
        finally {
            span.end();
        }
    }
    /**
     * Flushes the queue manually.
     *
     * @param options - Flush options.
     */
    async flush(options = {}) {
        const { span, updatedOptions } = createSpan("SearchIndexingBufferedSender-flush", options);
        try {
            if (this.batchObject.actions.length > 0) {
                return this.internalFlush(true, updatedOptions);
            }
        }
        catch (e) {
            span.setStatus({
                status: "error",
                error: e.message,
            });
            throw e;
        }
        finally {
            span.end();
        }
    }
    /**
     * If using autoFlush: true, call this to cleanup the autoflush timer.
     */
    async dispose() {
        if (this.batchObject.actions.length > 0) {
            await this.internalFlush(true);
        }
        if (this.cleanupTimer) {
            this.cleanupTimer();
        }
    }
    on(event, listener) {
        this.emitter.on(event, listener);
    }
    off(event, listener) {
        this.emitter.removeListener(event, listener);
    }
    isBatchReady() {
        return this.batchObject.actions.length >= this.initialBatchActionCount;
    }
    async internalFlush(force, options = {}) {
        if (force || (this.autoFlush && this.isBatchReady())) {
            // Split it
            const actions = this.batchObject.actions;
            this.batchObject = new IndexDocumentsBatch();
            while (actions.length > 0) {
                const actionsToSend = actions.splice(0, this.initialBatchActionCount);
                const { batchToSubmit, submitLater } = this.pruneActions(actionsToSend);
                actions.unshift(...submitLater);
                await this.submitDocuments(batchToSubmit, options);
            }
        }
    }
    pruneActions(batch) {
        const hashSet = new Set();
        const resultBatch = [];
        const pruned = [];
        for (const document of batch) {
            const key = this.documentKeyRetriever(document);
            if (hashSet.has(key)) {
                pruned.push(document);
            }
            else {
                hashSet.add(key);
                resultBatch.push(document);
            }
        }
        return { batchToSubmit: resultBatch, submitLater: pruned };
    }
    async submitDocuments(actionsToSend, options, retryAttempt = 1) {
        try {
            for (const action of actionsToSend) {
                this.emitter.emit("beforeDocumentSent", action);
            }
            const result = await this.client.indexDocuments(new IndexDocumentsBatch(actionsToSend), options);
            // raise success event
            this.emitter.emit("batchSucceeded", result);
        }
        catch (e) {
            if (e.statusCode && e.statusCode === 413 && actionsToSend.length > 1) {
                // Cut the payload size to half
                const splitActionsArray = [
                    actionsToSend.slice(0, actionsToSend.length / 2),
                    actionsToSend.slice(actionsToSend.length / 2, actionsToSend.length),
                ];
                this.initialBatchActionCount = splitActionsArray[0].length; // So, we do not want 413 happening again and again
                for (const actions of splitActionsArray) {
                    await this.submitDocuments(actions, options);
                }
            }
            else if (this.isRetryAbleError(e) && retryAttempt <= this.maxRetriesPerAction) {
                // Exponentially increase the delay each time
                const exponentialDelay = this.throttlingDelayInMs * Math.pow(2, retryAttempt);
                // Don't let the delay exceed the maximum
                const clampedExponentialDelay = Math.min(this.maxThrottlingDelayInMs, exponentialDelay);
                // Allow the final value to have some "jitter" (within 50% of the delay size) so
                // that retries across multiple clients don't occur simultaneously.
                const delayWithJitter = clampedExponentialDelay / 2 + getRandomIntegerInclusive(0, clampedExponentialDelay / 2);
                await delay(delayWithJitter);
                await this.submitDocuments(actionsToSend, options, retryAttempt + 1);
            }
            else {
                this.emitter.emit("batchFailed", e);
                throw e;
            }
        }
    }
    isRetryAbleError(e) {
        return e.statusCode && (e.statusCode === 422 || e.statusCode === 409 || e.statusCode === 503);
    }
}
//# sourceMappingURL=searchIndexingBufferedSender.js.map