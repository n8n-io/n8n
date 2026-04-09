import { Context, MetricAttributes, UpDownCounter, Counter, Histogram, Observable, ObservableCallback, ObservableCounter, ObservableGauge, ObservableUpDownCounter } from '@opentelemetry/api';
import { InstrumentDescriptor } from './InstrumentDescriptor';
import { ObservableRegistry } from './state/ObservableRegistry';
import { AsyncWritableMetricStorage, WritableMetricStorage } from './state/WritableMetricStorage';
import { Gauge } from './types';
export declare class SyncInstrument {
    private _writableMetricStorage;
    protected _descriptor: InstrumentDescriptor;
    constructor(_writableMetricStorage: WritableMetricStorage, _descriptor: InstrumentDescriptor);
    protected _record(value: number, attributes?: MetricAttributes, context?: Context): void;
}
/**
 * The class implements {@link UpDownCounter} interface.
 */
export declare class UpDownCounterInstrument extends SyncInstrument implements UpDownCounter {
    /**
     * Increment value of counter by the input. Inputs may be negative.
     */
    add(value: number, attributes?: MetricAttributes, ctx?: Context): void;
}
/**
 * The class implements {@link Counter} interface.
 */
export declare class CounterInstrument extends SyncInstrument implements Counter {
    /**
     * Increment value of counter by the input. Inputs may not be negative.
     */
    add(value: number, attributes?: MetricAttributes, ctx?: Context): void;
}
/**
 * The class implements {@link Gauge} interface.
 */
export declare class GaugeInstrument extends SyncInstrument implements Gauge {
    /**
     * Records a measurement.
     */
    record(value: number, attributes?: MetricAttributes, ctx?: Context): void;
}
/**
 * The class implements {@link Histogram} interface.
 */
export declare class HistogramInstrument extends SyncInstrument implements Histogram {
    /**
     * Records a measurement. Value of the measurement must not be negative.
     */
    record(value: number, attributes?: MetricAttributes, ctx?: Context): void;
}
export declare class ObservableInstrument implements Observable {
    private _observableRegistry;
    /** @internal */
    _metricStorages: AsyncWritableMetricStorage[];
    /** @internal */
    _descriptor: InstrumentDescriptor;
    constructor(descriptor: InstrumentDescriptor, metricStorages: AsyncWritableMetricStorage[], _observableRegistry: ObservableRegistry);
    /**
     * @see {Observable.addCallback}
     */
    addCallback(callback: ObservableCallback): void;
    /**
     * @see {Observable.removeCallback}
     */
    removeCallback(callback: ObservableCallback): void;
}
export declare class ObservableCounterInstrument extends ObservableInstrument implements ObservableCounter {
}
export declare class ObservableGaugeInstrument extends ObservableInstrument implements ObservableGauge {
}
export declare class ObservableUpDownCounterInstrument extends ObservableInstrument implements ObservableUpDownCounter {
}
export declare function isObservableInstrument(it: unknown): it is ObservableInstrument;
//# sourceMappingURL=Instruments.d.ts.map