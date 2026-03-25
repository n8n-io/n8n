import { ObservableResult, Attributes, ValueType, BatchObservableResult, Observable } from '@opentelemetry/api';
import { AttributeHashMap } from './state/HashMap';
import { ObservableInstrument } from './Instruments';
/**
 * The class implements {@link ObservableResult} interface.
 */
export declare class ObservableResultImpl implements ObservableResult {
    /**
     * @internal
     */
    _buffer: AttributeHashMap<number>;
    private _instrumentName;
    private _valueType;
    constructor(instrumentName: string, valueType: ValueType);
    /**
     * Observe a measurement of the value associated with the given attributes.
     */
    observe(value: number, attributes?: Attributes): void;
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
    observe(metric: Observable, value: number, attributes?: Attributes): void;
}
//# sourceMappingURL=ObservableResult.d.ts.map