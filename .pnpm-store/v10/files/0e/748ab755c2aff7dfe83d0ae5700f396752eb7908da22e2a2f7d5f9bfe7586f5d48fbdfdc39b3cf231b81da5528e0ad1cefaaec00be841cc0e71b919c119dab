import { Meter as IMeter, MetricOptions, Gauge, Histogram, Counter, UpDownCounter, ObservableGauge, ObservableCounter, ObservableUpDownCounter, BatchObservableCallback, Observable } from '@opentelemetry/api';
import { MeterSharedState } from './state/MeterSharedState';
/**
 * This class implements the {@link IMeter} interface.
 */
export declare class Meter implements IMeter {
    private _meterSharedState;
    constructor(_meterSharedState: MeterSharedState);
    /**
     * Create a {@link Gauge} instrument.
     */
    createGauge(name: string, options?: MetricOptions): Gauge;
    /**
     * Create a {@link Histogram} instrument.
     */
    createHistogram(name: string, options?: MetricOptions): Histogram;
    /**
     * Create a {@link Counter} instrument.
     */
    createCounter(name: string, options?: MetricOptions): Counter;
    /**
     * Create a {@link UpDownCounter} instrument.
     */
    createUpDownCounter(name: string, options?: MetricOptions): UpDownCounter;
    /**
     * Create a {@link ObservableGauge} instrument.
     */
    createObservableGauge(name: string, options?: MetricOptions): ObservableGauge;
    /**
     * Create a {@link ObservableCounter} instrument.
     */
    createObservableCounter(name: string, options?: MetricOptions): ObservableCounter;
    /**
     * Create a {@link ObservableUpDownCounter} instrument.
     */
    createObservableUpDownCounter(name: string, options?: MetricOptions): ObservableUpDownCounter;
    /**
     * @see {@link Meter.addBatchObservableCallback}
     */
    addBatchObservableCallback(callback: BatchObservableCallback, observables: Observable[]): void;
    /**
     * @see {@link Meter.removeBatchObservableCallback}
     */
    removeBatchObservableCallback(callback: BatchObservableCallback, observables: Observable[]): void;
}
//# sourceMappingURL=Meter.d.ts.map