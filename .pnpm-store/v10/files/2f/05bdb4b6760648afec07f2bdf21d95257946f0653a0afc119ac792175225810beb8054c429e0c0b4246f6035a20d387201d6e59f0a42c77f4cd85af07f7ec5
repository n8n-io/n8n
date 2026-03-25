import { MetricStorage } from './MetricStorage';
import { InstrumentDescriptor } from '../InstrumentDescriptor';
import { MetricCollectorHandle } from './MetricCollector';
/**
 * Internal class for storing {@link MetricStorage}
 */
export declare class MetricStorageRegistry {
    private readonly _sharedRegistry;
    private readonly _perCollectorRegistry;
    static create(): MetricStorageRegistry;
    getStorages(collector: MetricCollectorHandle): MetricStorage[];
    register(storage: MetricStorage): void;
    registerForCollector(collector: MetricCollectorHandle, storage: MetricStorage): void;
    findOrUpdateCompatibleStorage<T extends MetricStorage>(expectedDescriptor: InstrumentDescriptor): T | null;
    findOrUpdateCompatibleCollectorStorage<T extends MetricStorage>(collector: MetricCollectorHandle, expectedDescriptor: InstrumentDescriptor): T | null;
    private _registerStorage;
    private _findOrUpdateCompatibleStorage;
}
//# sourceMappingURL=MetricStorageRegistry.d.ts.map