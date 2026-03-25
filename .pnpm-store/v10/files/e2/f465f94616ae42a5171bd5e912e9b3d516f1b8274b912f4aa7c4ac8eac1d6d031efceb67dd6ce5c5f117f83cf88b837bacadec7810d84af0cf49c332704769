import { InstrumentationScope } from '@opentelemetry/core';
import { Resource } from '@opentelemetry/resources';
import { ViewRegistry } from '../view/ViewRegistry';
import { MeterSharedState } from './MeterSharedState';
import { MetricCollector, MetricCollectorHandle } from './MetricCollector';
import { Aggregation } from '../view/Aggregation';
import { InstrumentType } from '../export/MetricData';
/**
 * An internal record for shared meter provider states.
 */
export declare class MeterProviderSharedState {
    resource: Resource;
    viewRegistry: ViewRegistry;
    metricCollectors: MetricCollector[];
    meterSharedStates: Map<string, MeterSharedState>;
    constructor(resource: Resource);
    getMeterSharedState(instrumentationScope: InstrumentationScope): MeterSharedState;
    selectAggregations(instrumentType: InstrumentType): [MetricCollectorHandle, Aggregation][];
}
//# sourceMappingURL=MeterProviderSharedState.d.ts.map