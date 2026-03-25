import { HrTime, BatchObservableCallback, Observable, ObservableCallback } from '@opentelemetry/api';
import { ObservableInstrument } from '../Instruments';
/**
 * An internal interface for managing ObservableCallbacks.
 *
 * Every registered callback associated with a set of instruments are be evaluated
 * exactly once during collection prior to reading data for that instrument.
 */
export declare class ObservableRegistry {
    private _callbacks;
    private _batchCallbacks;
    addCallback(callback: ObservableCallback, instrument: ObservableInstrument): void;
    removeCallback(callback: ObservableCallback, instrument: ObservableInstrument): void;
    addBatchCallback(callback: BatchObservableCallback, instruments: Observable[]): void;
    removeBatchCallback(callback: BatchObservableCallback, instruments: Observable[]): void;
    /**
     * @returns a promise of rejected reasons for invoking callbacks.
     */
    observe(collectionTime: HrTime, timeoutMillis?: number): Promise<unknown[]>;
    private _observeCallbacks;
    private _observeBatchCallbacks;
    private _findCallback;
    private _findBatchCallback;
}
//# sourceMappingURL=ObservableRegistry.d.ts.map