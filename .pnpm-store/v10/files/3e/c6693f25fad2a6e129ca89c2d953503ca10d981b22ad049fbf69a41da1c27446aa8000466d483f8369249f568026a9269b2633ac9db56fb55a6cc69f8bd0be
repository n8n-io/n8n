import _m0 from "protobufjs/minimal.js";
export declare const protobufPackage = "weaviate.v1";
export declare enum ConsistencyLevel {
    CONSISTENCY_LEVEL_UNSPECIFIED = 0,
    CONSISTENCY_LEVEL_ONE = 1,
    CONSISTENCY_LEVEL_QUORUM = 2,
    CONSISTENCY_LEVEL_ALL = 3,
    UNRECOGNIZED = -1
}
export declare function consistencyLevelFromJSON(object: any): ConsistencyLevel;
export declare function consistencyLevelToJSON(object: ConsistencyLevel): string;
export interface NumberArrayProperties {
    /**
     * will be removed in the future, use vector_bytes
     * go client 5.4.1 depends on this field. Only remove after go client is deprecated
     *
     * @deprecated
     */
    values: number[];
    propName: string;
    valuesBytes: Uint8Array;
}
export interface IntArrayProperties {
    values: number[];
    propName: string;
}
export interface TextArrayProperties {
    values: string[];
    propName: string;
}
export interface BooleanArrayProperties {
    values: boolean[];
    propName: string;
}
export interface ObjectPropertiesValue {
    nonRefProperties: {
        [key: string]: any;
    } | undefined;
    numberArrayProperties: NumberArrayProperties[];
    intArrayProperties: IntArrayProperties[];
    textArrayProperties: TextArrayProperties[];
    booleanArrayProperties: BooleanArrayProperties[];
    objectProperties: ObjectProperties[];
    objectArrayProperties: ObjectArrayProperties[];
    emptyListProps: string[];
}
export interface ObjectArrayProperties {
    values: ObjectPropertiesValue[];
    propName: string;
}
export interface ObjectProperties {
    value: ObjectPropertiesValue | undefined;
    propName: string;
}
export interface TextArray {
    values: string[];
}
export interface IntArray {
    values: number[];
}
export interface NumberArray {
    values: number[];
}
export interface BooleanArray {
    values: boolean[];
}
export interface Filters {
    operator: Filters_Operator;
    /**
     * protolint:disable:next REPEATED_FIELD_NAMES_PLURALIZED
     *
     * @deprecated
     */
    on: string[];
    filters: Filters[];
    valueText?: string | undefined;
    valueInt?: number | undefined;
    valueBoolean?: boolean | undefined;
    valueNumber?: number | undefined;
    valueTextArray?: TextArray | undefined;
    valueIntArray?: IntArray | undefined;
    valueBooleanArray?: BooleanArray | undefined;
    valueNumberArray?: NumberArray | undefined;
    valueGeo?: GeoCoordinatesFilter | undefined;
    /** leave space for more filter values */
    target: FilterTarget | undefined;
}
export declare enum Filters_Operator {
    OPERATOR_UNSPECIFIED = 0,
    OPERATOR_EQUAL = 1,
    OPERATOR_NOT_EQUAL = 2,
    OPERATOR_GREATER_THAN = 3,
    OPERATOR_GREATER_THAN_EQUAL = 4,
    OPERATOR_LESS_THAN = 5,
    OPERATOR_LESS_THAN_EQUAL = 6,
    OPERATOR_AND = 7,
    OPERATOR_OR = 8,
    OPERATOR_WITHIN_GEO_RANGE = 9,
    OPERATOR_LIKE = 10,
    OPERATOR_IS_NULL = 11,
    OPERATOR_CONTAINS_ANY = 12,
    OPERATOR_CONTAINS_ALL = 13,
    OPERATOR_CONTAINS_NONE = 14,
    OPERATOR_NOT = 15,
    UNRECOGNIZED = -1
}
export declare function filters_OperatorFromJSON(object: any): Filters_Operator;
export declare function filters_OperatorToJSON(object: Filters_Operator): string;
export interface FilterReferenceSingleTarget {
    on: string;
    target: FilterTarget | undefined;
}
export interface FilterReferenceMultiTarget {
    on: string;
    target: FilterTarget | undefined;
    targetCollection: string;
}
export interface FilterReferenceCount {
    on: string;
}
export interface FilterTarget {
    property?: string | undefined;
    singleTarget?: FilterReferenceSingleTarget | undefined;
    multiTarget?: FilterReferenceMultiTarget | undefined;
    count?: FilterReferenceCount | undefined;
}
export interface GeoCoordinatesFilter {
    latitude: number;
    longitude: number;
    distance: number;
}
export interface Vectors {
    name: string;
    /**
     * for multi-vec
     *
     * @deprecated
     */
    index: number;
    vectorBytes: Uint8Array;
    type: Vectors_VectorType;
}
export declare enum Vectors_VectorType {
    VECTOR_TYPE_UNSPECIFIED = 0,
    VECTOR_TYPE_SINGLE_FP32 = 1,
    VECTOR_TYPE_MULTI_FP32 = 2,
    UNRECOGNIZED = -1
}
export declare function vectors_VectorTypeFromJSON(object: any): Vectors_VectorType;
export declare function vectors_VectorTypeToJSON(object: Vectors_VectorType): string;
export declare const NumberArrayProperties: {
    encode(message: NumberArrayProperties, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): NumberArrayProperties;
    fromJSON(object: any): NumberArrayProperties;
    toJSON(message: NumberArrayProperties): unknown;
    create(base?: DeepPartial<NumberArrayProperties>): NumberArrayProperties;
    fromPartial(object: DeepPartial<NumberArrayProperties>): NumberArrayProperties;
};
export declare const IntArrayProperties: {
    encode(message: IntArrayProperties, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): IntArrayProperties;
    fromJSON(object: any): IntArrayProperties;
    toJSON(message: IntArrayProperties): unknown;
    create(base?: DeepPartial<IntArrayProperties>): IntArrayProperties;
    fromPartial(object: DeepPartial<IntArrayProperties>): IntArrayProperties;
};
export declare const TextArrayProperties: {
    encode(message: TextArrayProperties, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): TextArrayProperties;
    fromJSON(object: any): TextArrayProperties;
    toJSON(message: TextArrayProperties): unknown;
    create(base?: DeepPartial<TextArrayProperties>): TextArrayProperties;
    fromPartial(object: DeepPartial<TextArrayProperties>): TextArrayProperties;
};
export declare const BooleanArrayProperties: {
    encode(message: BooleanArrayProperties, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BooleanArrayProperties;
    fromJSON(object: any): BooleanArrayProperties;
    toJSON(message: BooleanArrayProperties): unknown;
    create(base?: DeepPartial<BooleanArrayProperties>): BooleanArrayProperties;
    fromPartial(object: DeepPartial<BooleanArrayProperties>): BooleanArrayProperties;
};
export declare const ObjectPropertiesValue: {
    encode(message: ObjectPropertiesValue, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): ObjectPropertiesValue;
    fromJSON(object: any): ObjectPropertiesValue;
    toJSON(message: ObjectPropertiesValue): unknown;
    create(base?: DeepPartial<ObjectPropertiesValue>): ObjectPropertiesValue;
    fromPartial(object: DeepPartial<ObjectPropertiesValue>): ObjectPropertiesValue;
};
export declare const ObjectArrayProperties: {
    encode(message: ObjectArrayProperties, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): ObjectArrayProperties;
    fromJSON(object: any): ObjectArrayProperties;
    toJSON(message: ObjectArrayProperties): unknown;
    create(base?: DeepPartial<ObjectArrayProperties>): ObjectArrayProperties;
    fromPartial(object: DeepPartial<ObjectArrayProperties>): ObjectArrayProperties;
};
export declare const ObjectProperties: {
    encode(message: ObjectProperties, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): ObjectProperties;
    fromJSON(object: any): ObjectProperties;
    toJSON(message: ObjectProperties): unknown;
    create(base?: DeepPartial<ObjectProperties>): ObjectProperties;
    fromPartial(object: DeepPartial<ObjectProperties>): ObjectProperties;
};
export declare const TextArray: {
    encode(message: TextArray, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): TextArray;
    fromJSON(object: any): TextArray;
    toJSON(message: TextArray): unknown;
    create(base?: DeepPartial<TextArray>): TextArray;
    fromPartial(object: DeepPartial<TextArray>): TextArray;
};
export declare const IntArray: {
    encode(message: IntArray, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): IntArray;
    fromJSON(object: any): IntArray;
    toJSON(message: IntArray): unknown;
    create(base?: DeepPartial<IntArray>): IntArray;
    fromPartial(object: DeepPartial<IntArray>): IntArray;
};
export declare const NumberArray: {
    encode(message: NumberArray, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): NumberArray;
    fromJSON(object: any): NumberArray;
    toJSON(message: NumberArray): unknown;
    create(base?: DeepPartial<NumberArray>): NumberArray;
    fromPartial(object: DeepPartial<NumberArray>): NumberArray;
};
export declare const BooleanArray: {
    encode(message: BooleanArray, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BooleanArray;
    fromJSON(object: any): BooleanArray;
    toJSON(message: BooleanArray): unknown;
    create(base?: DeepPartial<BooleanArray>): BooleanArray;
    fromPartial(object: DeepPartial<BooleanArray>): BooleanArray;
};
export declare const Filters: {
    encode(message: Filters, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Filters;
    fromJSON(object: any): Filters;
    toJSON(message: Filters): unknown;
    create(base?: DeepPartial<Filters>): Filters;
    fromPartial(object: DeepPartial<Filters>): Filters;
};
export declare const FilterReferenceSingleTarget: {
    encode(message: FilterReferenceSingleTarget, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): FilterReferenceSingleTarget;
    fromJSON(object: any): FilterReferenceSingleTarget;
    toJSON(message: FilterReferenceSingleTarget): unknown;
    create(base?: DeepPartial<FilterReferenceSingleTarget>): FilterReferenceSingleTarget;
    fromPartial(object: DeepPartial<FilterReferenceSingleTarget>): FilterReferenceSingleTarget;
};
export declare const FilterReferenceMultiTarget: {
    encode(message: FilterReferenceMultiTarget, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): FilterReferenceMultiTarget;
    fromJSON(object: any): FilterReferenceMultiTarget;
    toJSON(message: FilterReferenceMultiTarget): unknown;
    create(base?: DeepPartial<FilterReferenceMultiTarget>): FilterReferenceMultiTarget;
    fromPartial(object: DeepPartial<FilterReferenceMultiTarget>): FilterReferenceMultiTarget;
};
export declare const FilterReferenceCount: {
    encode(message: FilterReferenceCount, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): FilterReferenceCount;
    fromJSON(object: any): FilterReferenceCount;
    toJSON(message: FilterReferenceCount): unknown;
    create(base?: DeepPartial<FilterReferenceCount>): FilterReferenceCount;
    fromPartial(object: DeepPartial<FilterReferenceCount>): FilterReferenceCount;
};
export declare const FilterTarget: {
    encode(message: FilterTarget, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): FilterTarget;
    fromJSON(object: any): FilterTarget;
    toJSON(message: FilterTarget): unknown;
    create(base?: DeepPartial<FilterTarget>): FilterTarget;
    fromPartial(object: DeepPartial<FilterTarget>): FilterTarget;
};
export declare const GeoCoordinatesFilter: {
    encode(message: GeoCoordinatesFilter, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): GeoCoordinatesFilter;
    fromJSON(object: any): GeoCoordinatesFilter;
    toJSON(message: GeoCoordinatesFilter): unknown;
    create(base?: DeepPartial<GeoCoordinatesFilter>): GeoCoordinatesFilter;
    fromPartial(object: DeepPartial<GeoCoordinatesFilter>): GeoCoordinatesFilter;
};
export declare const Vectors: {
    encode(message: Vectors, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Vectors;
    fromJSON(object: any): Vectors;
    toJSON(message: Vectors): unknown;
    create(base?: DeepPartial<Vectors>): Vectors;
    fromPartial(object: DeepPartial<Vectors>): Vectors;
};
type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;
export type DeepPartial<T> = T extends Builtin ? T : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>> : T extends {} ? {
    [K in keyof T]?: DeepPartial<T[K]>;
} : Partial<T>;
export {};
