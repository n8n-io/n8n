import type { HrTime } from '@opentelemetry/api';
import type { AggregationTemporality } from '../export/AggregationTemporality';
import type { MetricData, MetricDescriptor } from '../export/MetricData';
import type { Maybe } from '../utils';
import type { Aggregator, AccumulationRecord } from './types';
import { AggregatorKind } from './types';
/** Basic aggregator for None which keeps no recorded value. */
export declare class DropAggregator implements Aggregator<undefined> {
    kind: AggregatorKind.DROP;
    createAccumulation(): undefined;
    merge(_previous: undefined, _delta: undefined): undefined;
    diff(_previous: undefined, _current: undefined): undefined;
    toMetricData(_descriptor: MetricDescriptor, _aggregationTemporality: AggregationTemporality, _accumulationByAttributes: AccumulationRecord<undefined>[], _endTime: HrTime): Maybe<MetricData>;
}
//# sourceMappingURL=Drop.d.ts.map