/** Properties of an InstrumentationScope. */
export interface IInstrumentationScope {
    /** InstrumentationScope name */
    name: string;
    /** InstrumentationScope version */
    version?: string;
    /** InstrumentationScope attributes */
    attributes?: IKeyValue[];
    /** InstrumentationScope droppedAttributesCount */
    droppedAttributesCount?: number;
}
/** Properties of a KeyValue. */
export interface IKeyValue {
    /** KeyValue key */
    key: string;
    /** KeyValue value */
    value: IAnyValue;
}
/** Properties of an AnyValue. */
export interface IAnyValue {
    /** AnyValue stringValue */
    stringValue?: string | null;
    /** AnyValue boolValue */
    boolValue?: boolean | null;
    /** AnyValue intValue */
    intValue?: number | null;
    /** AnyValue doubleValue */
    doubleValue?: number | null;
    /** AnyValue arrayValue */
    arrayValue?: IArrayValue;
    /** AnyValue kvlistValue */
    kvlistValue?: IKeyValueList;
    /** AnyValue bytesValue */
    bytesValue?: Uint8Array;
}
/** Properties of an ArrayValue. */
export interface IArrayValue {
    /** ArrayValue values */
    values: IAnyValue[];
}
/** Properties of a KeyValueList. */
export interface IKeyValueList {
    /** KeyValueList values */
    values: IKeyValue[];
}
export interface LongBits {
    low: number;
    high: number;
}
export declare type Fixed64 = LongBits | string | number;
export interface OtlpEncodingOptions {
    /** Convert trace and span IDs to hex strings. */
    useHex?: boolean;
    /** Convert HrTime to 2 part 64 bit values. */
    useLongBits?: boolean;
}
//# sourceMappingURL=types.d.ts.map