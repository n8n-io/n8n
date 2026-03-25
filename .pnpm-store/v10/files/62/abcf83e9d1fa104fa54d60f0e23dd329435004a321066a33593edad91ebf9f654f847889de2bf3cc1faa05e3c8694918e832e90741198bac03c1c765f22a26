import { HrTime } from '@opentelemetry/api';
import { InstrumentationScope } from '@opentelemetry/core';
import { MetricCollectOptions } from '../export/MetricProducer';
import { ScopeMetrics } from '../export/MetricData';
import { InstrumentDescriptor } from '../InstrumentDescriptor';
import { Meter } from '../Meter';
import { Maybe } from '../utils';
import { AsyncMetricStorage } from './AsyncMetricStorage';
import { MeterProviderSharedState } from './MeterProviderSharedState';
import { MetricCollectorHandle } from './MetricCollector';
import { MetricStorageRegistry } from './MetricStorageRegistry';
import { MultiMetricStorage } from './MultiWritableMetricStorage';
import { ObservableRegistry } from './ObservableRegistry';
import { SyncMetricStorage } from './SyncMetricStorage';
import { Accumulation } from '../aggregator/types';
/**
 * An internal record for shared meter provider states.
 */
export declare class MeterSharedState {
    private _meterProviderSharedState;
    private _instrumentationScope;
    metricStorageRegistry: MetricStorageRegistry;
    observableRegistry: ObservableRegistry;
    meter: Meter;
    constructor(_meterProviderSharedState: MeterProviderSharedState, _instrumentationScope: InstrumentationScope);
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