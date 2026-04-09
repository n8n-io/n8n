import { ObservableResult, MetricAttributes, ValueType, BatchObservableResult, Observable } from '@opentelemetry/api';
import { AttributeHashMap } from './state/HashMap';
import { ObservableInstrument } from './Instruments';
/**
 * The class implements {@link ObservableResult} interface.
 */
export declare class ObservableResultImpl implements ObservableResult {
    private _instrumentName;
    private _valueType;
    /**
     * @internal
     */
    _buffer: AttributeHashMap<number>;
    constructor(_instrumentName: string, _valueType: ValueType);
    /**
     * Observe a measurement of the value associated with the given attributes.
     */
    observe(value: number, attributes?: MetricAttributes): void;
}
/**
 * The class implements {@link BatchObservableCallback} interface.
 */
export declare class BatchObservableResultImpl implements BatchObservableResult {
    /**
     * @internal
     */
    _buffer: Map<ObservableInstrument, AttributeHashMap<number>>;
    /**
     * Observe a measurement of the value associated with the given attributes.
     */
    observe(metric: Observable, value: number, attributes?: MetricAttributes): void;
}
//# sourceMappingURL=ObservableResult.d.ts.map