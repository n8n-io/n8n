import { InstrumentationScope } from '@opentelemetry/core';
import { IResource } from '@opentelemetry/resources';
import { Aggregation, InstrumentType } from '..';
import { ViewRegistry } from '../view/ViewRegistry';
import { MeterSharedState } from './MeterSharedState';
import { MetricCollector, MetricCollectorHandle } from './MetricCollector';
/**
 * An internal record for shared meter provider states.
 */
export declare class MeterProviderSharedState {
    resource: IResource;
    viewRegistry: ViewRegistry;
    metricCollectors: MetricCollector[];
    meterSharedStates: Map<string, MeterSharedState>;
    constructor(resource: IResource);
    getMeterSharedState(instrumentationScope: InstrumentationScope): MeterSharedState;
    selectAggregations(instrumentType: InstrumentType): [MetricCollectorHandle, Aggregation][];
}
//# sourceMappingURL=MeterProviderSharedState.d.ts.map