import type { InstrumentationScope } from '@opentelemetry/core';
import type { Resource } from '@opentelemetry/resources';
import { ViewRegistry } from '../view/ViewRegistry';
import { MeterSharedState } from './MeterSharedState';
import type { MetricCollector, MetricCollectorHandle } from './MetricCollector';
import type { Aggregation } from '../view/Aggregation';
import type { InstrumentType } from '../export/MetricData';
/**
 * An internal record for shared meter provider states.
 */
export declare class MeterProviderSharedState {
    viewRegistry: ViewRegistry;
    metricCollectors: MetricCollector[];
    meterSharedStates: Map<string, MeterSharedState>;
    resource: Resource;
    constructor(resource: Resource);
    getMeterSharedState(instrumentationScope: InstrumentationScope): MeterSharedState;
    selectAggregations(instrumentType: InstrumentType): [MetricCollectorHandle, Aggregation][];
}
//# sourceMappingURL=MeterProviderSharedState.d.ts.map