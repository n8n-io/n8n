import { Context, HrTime, Attributes } from '@opentelemetry/api';
import { WritableMetricStorage } from './WritableMetricStorage';
/**
 * Internal interface.
 */
export declare class MultiMetricStorage implements WritableMetricStorage {
    private readonly _backingStorages;
    constructor(_backingStorages: WritableMetricStorage[]);
    record(value: number, attributes: Attributes, context: Context, recordTime: HrTime): void;
}
//# sourceMappingURL=MultiWritableMetricStorage.d.ts.map