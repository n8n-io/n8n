import type { HrTime } from '@opentelemetry/api';
import type { MetricData } from '../export/MetricData';
import type { Maybe } from '../utils';
import type { MetricCollectorHandle } from './MetricCollector';
import type { InstrumentDescriptor } from '../InstrumentDescriptor';
/**
 * Internal interface.
 *
 * Represents a storage from which we can collect metrics.
 */
export declare abstract class MetricStorage {
    protected _instrumentDescriptor: InstrumentDescriptor;
    constructor(instrumentDescriptor: InstrumentDescriptor);
    /**
     * Collects the metrics from this storage.
     *
     * Note: This is a stateful operation and may reset any interval-related
     * state for the MetricCollector.
     */
    abstract collect(collector: MetricCollectorHandle, collectionTime: HrTime): Maybe<MetricData>;
    getInstrumentDescriptor(): Readonly<InstrumentDescriptor>;
    updateDescription(description: string): void;
}
//# sourceMappingURL=MetricStorage.d.ts.map