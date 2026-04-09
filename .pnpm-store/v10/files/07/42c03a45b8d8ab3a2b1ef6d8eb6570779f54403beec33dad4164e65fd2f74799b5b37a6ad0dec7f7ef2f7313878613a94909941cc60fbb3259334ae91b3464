import { Context, HrTime, MetricAttributes } from '@opentelemetry/api';
import { AttributeHashMap } from './HashMap';
/**
 * Internal interface. Stores measurements and allows synchronous writes of
 * measurements.
 *
 * An interface representing SyncMetricStorage with type parameters removed.
 */
export interface WritableMetricStorage {
    /** Records a measurement. */
    record(value: number, attributes: MetricAttributes, context: Context, recordTime: HrTime): void;
}
/**
 * Internal interface. Stores measurements and allows asynchronous writes of
 * measurements.
 *
 * An interface representing AsyncMetricStorage with type parameters removed.
 */
export interface AsyncWritableMetricStorage {
    /** Records a batch of measurements. */
    record(measurements: AttributeHashMap<number>, observationTime: HrTime): void;
}
//# sourceMappingURL=WritableMetricStorage.d.ts.map