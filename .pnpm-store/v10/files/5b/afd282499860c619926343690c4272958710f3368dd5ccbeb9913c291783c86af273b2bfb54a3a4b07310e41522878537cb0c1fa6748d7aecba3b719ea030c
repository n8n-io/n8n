import { HrTime } from '@opentelemetry/api';
import { MetricData } from '../export/MetricData';
import { Maybe } from '../utils';
import { MetricCollectorHandle } from './MetricCollector';
import { InstrumentDescriptor } from '../InstrumentDescriptor';
/**
 * Internal interface.
 *
 * Represents a storage from which we can collect metrics.
 */
export declare abstract class MetricStorage {
    protected _instrumentDescriptor: InstrumentDescriptor;
    constructor(_instrumentDescriptor: InstrumentDescriptor);
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