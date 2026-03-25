export interface IExportPromiseHandler {
    pushPromise(promise: Promise<void>): void;
    hasReachedLimit(): boolean;
    awaitAll(): Promise<void>;
}
/**
 * Promise queue for keeping track of export promises. Finished promises will be auto-dequeued.
 * Allows for awaiting all promises in the queue.
 */
export declare function createBoundedQueueExportPromiseHandler(options: {
    concurrencyLimit: number;
}): IExportPromiseHandler;
//# sourceMappingURL=bounded-queue-export-promise-handler.d.ts.map