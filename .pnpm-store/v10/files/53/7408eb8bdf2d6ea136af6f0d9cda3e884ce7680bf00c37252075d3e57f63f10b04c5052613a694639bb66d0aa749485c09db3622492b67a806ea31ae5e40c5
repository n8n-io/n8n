import type { HrTime } from '@opentelemetry/api';
import type { InstrumentationScope } from '@opentelemetry/core';
import type { MetricCollectOptions } from '../export/MetricProducer';
import type { ScopeMetrics } from '../export/MetricData';
import type { InstrumentDescriptor } from '../InstrumentDescriptor';
import { Meter } from '../Meter';
import type { Maybe } from '../utils';
import { AsyncMetricStorage } from './AsyncMetricStorage';
import type { MeterProviderSharedState } from './MeterProviderSharedState';
import type { MetricCollectorHandle } from './MetricCollector';
import { MetricStorageRegistry } from './MetricStorageRegistry';
import { MultiMetricStorage } from './MultiWritableMetricStorage';
import { ObservableRegistry } from './ObservableRegistry';
import { SyncMetricStorage } from './SyncMetricStorage';
import type { Accumulation } from '../aggregator/types';
/**
 * An internal record for shared meter provider states.
 */
export declare class MeterSharedState {
    metricStorageRegistry: MetricStorageRegistry;
    observableRegistry: ObservableRegistry;
    meter: Meter;
    private _meterProviderSharedState;
    private _instrumentationScope;
    constructor(meterProviderSharedState: MeterProviderSharedState, instrumentationScope: InstrumentationScope);
    registerMetricStorage(descriptor: InstrumentDescriptor): MultiMetricStorage | SyncMetricStorage<Maybe<Accumulation>>;
    registerAsyncMetricStorage(descriptor: InstrumentDescriptor): AsyncMetricStorage<Maybe<Accumulation>>[];
    /**
     * @param collector opaque handle of {@link MetricCollector} which initiated the collection.
     * @param collectionTime the HrTime at which the collection was initiated.
     * @param options options for collection.
     * @returns the list of metric data collected.
     */
    collect(collector: MetricCollectorHandle, collectionTime: HrTime, options?: MetricCollectOptions): Promise<ScopeMetricsResult | null>;
    private _registerMetricStorage;
}
interface ScopeMetricsResult {
    scopeMetrics?: ScopeMetrics;
    errors: unknown[];
}
export {};
//# sourceMappingURL=MeterSharedState.d.ts.map