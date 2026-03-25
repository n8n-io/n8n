import { WorkerRequest } from '../types';
/**
 * Event buffer that uses a web worker to compress events.
 * Exported only for testing.
 */
export declare class WorkerHandler {
    private _worker;
    private _id;
    private _ensureReadyPromise?;
    constructor(worker: Worker);
    /**
     * Ensure the worker is ready (or not).
     * This will either resolve when the worker is ready, or reject if an error occurred.
     */
    ensureReady(): Promise<void>;
    /**
     * Destroy the worker.
     */
    destroy(): void;
    /**
     * Post message to worker and wait for response before resolving promise.
     */
    postMessage<T>(method: WorkerRequest['method'], arg?: WorkerRequest['arg']): Promise<T>;
    /** Get the current ID and increment it for the next call. */
    private _getAndIncrementId;
}
//# sourceMappingURL=WorkerHandler.d.ts.map
