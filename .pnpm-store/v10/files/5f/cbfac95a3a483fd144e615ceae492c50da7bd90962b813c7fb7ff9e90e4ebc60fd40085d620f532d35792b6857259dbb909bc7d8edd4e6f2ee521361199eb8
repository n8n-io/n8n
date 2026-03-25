import { ReplayRecordingData } from '@sentry/core';
import { AddEventResult, EventBuffer, EventBufferType, RecordingEvent } from '../types';
/**
 * This proxy will try to use the compression worker, and fall back to use the simple buffer if an error occurs there.
 * This can happen e.g. if the worker cannot be loaded.
 * Exported only for testing.
 */
export declare class EventBufferProxy implements EventBuffer {
    private _fallback;
    private _compression;
    private _used;
    private _ensureWorkerIsLoadedPromise;
    constructor(worker: Worker);
    /*@inheritdoc
    @inheritdoc */
    waitForCheckout: boolean;
    /*@inheritdoc */
    readonly type: EventBufferType;
    /*@inheritDoc */
    readonly hasEvents: boolean;
    /*@inheritdoc
    @inheritdoc */
    hasCheckout: boolean;
    /** @inheritDoc */
    destroy(): void;
    /** @inheritdoc */
    clear(): void;
    /** @inheritdoc */
    getEarliestTimestamp(): number | null;
    /**
     * Add an event to the event buffer.
     *
     * Returns true if event was successfully added.
     */
    addEvent(event: RecordingEvent): Promise<AddEventResult>;
    /** @inheritDoc */
    finish(): Promise<ReplayRecordingData>;
    /** Ensure the worker has loaded. */
    ensureWorkerIsLoaded(): Promise<void>;
    /** Actually check if the worker has been loaded. */
    private _ensureWorkerIsLoaded;
    /** Switch the used buffer to the compression worker. */
    private _switchToCompressionWorker;
}
//# sourceMappingURL=EventBufferProxy.d.ts.map
