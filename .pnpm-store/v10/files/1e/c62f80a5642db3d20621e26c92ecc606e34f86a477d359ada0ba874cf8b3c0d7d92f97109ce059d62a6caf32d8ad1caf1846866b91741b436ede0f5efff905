import { HrTime } from '@opentelemetry/api';
import { Accumulation, Aggregator } from '../aggregator/types';
import { MetricData } from '../export/MetricData';
import { InstrumentDescriptor } from '../InstrumentDescriptor';
import { Maybe } from '../utils';
import { MetricCollectorHandle } from './MetricCollector';
import { AttributeHashMap } from './HashMap';
/**
 * Internal interface.
 *
 * Provides unique reporting for each collector. Allows synchronous collection
 * of metrics and reports given temporality values.
 */
export declare class TemporalMetricProcessor<T extends Maybe<Accumulation>> {
    private _aggregator;
    private _unreportedAccumulations;
    private _reportHistory;
    constructor(_aggregator: Aggregator<T>, collectorHandles: MetricCollectorHandle[]);
    /**
     * Builds the {@link MetricData} streams to report against a specific MetricCollector.
     * @param collector The information of the MetricCollector.
     * @param collectors The registered collectors.
     * @param instrumentDescriptor The instrumentation descriptor that these metrics generated with.
     * @param currentAccumulations The current accumulation of metric data from instruments.
     * @param collectionTime The current collection timestamp.
     * @returns The {@link MetricData} points or `null`.
     */
    buildMetrics(collector: MetricCollectorHandle, instrumentDescriptor: InstrumentDescriptor, currentAccumulations: AttributeHashMap<T>, collectionTime: HrTime): Maybe<MetricData>;
    private _stashAccumulations;
    private _getMergedUnreportedAccumulations;
    static merge<T extends Maybe<Accumulation>>(last: AttributeHashMap<T>, current: AttributeHashMap<T>, aggregator: Aggregator<T>): AttributeHashMap<T>;
    /**
     * Calibrate the reported metric streams' startTime to lastCollectionTime. Leaves
     * the new stream to be the initial observation time unchanged.
     */
    static calibrateStartTime<T extends Maybe<Accumulation>>(last: AttributeHashMap<T>, current: AttributeHashMap<T>, lastCollectionTime: HrTime): AttributeHashMap<T>;
}
//# sourceMappingURL=TemporalMetricProcessor.d.ts.map