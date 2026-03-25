import _m0 from "protobufjs/minimal.js";
import { NullValue } from "../google/protobuf/struct.js";
export declare const protobufPackage = "weaviate.v1";
export interface Properties {
    fields: {
        [key: string]: Value;
    };
}
export interface Properties_FieldsEntry {
    key: string;
    value: Value | undefined;
}
export interface Value {
    numberValue?: number | undefined;
    /** dont reuse 2, old field that has been removed; Was "string string_value = 2;" */
    boolValue?: boolean | undefined;
    objectValue?: Properties | undefined;
    listValue?: ListValue | undefined;
    dateValue?: string | undefined;
    uuidValue?: string | undefined;
    intValue?: number | undefined;
    geoValue?: GeoCoordinate | undefined;
    blobValue?: string | undefined;
    phoneValue?: PhoneNumber | undefined;
    nullValue?: NullValue | undefined;
    textValue?: string | undefined;
}
export interface ListValue {
    numberValues?: NumberValues | undefined;
    boolValues?: BoolValues | undefined;
    objectValues?: ObjectValues | undefined;
    dateValues?: DateValues | undefined;
    uuidValues?: UuidValues | undefined;
    intValues?: IntValues | undefined;
    textValues?: TextValues | undefined;
}
export interface NumberValues {
    /**
     * The values are stored as a byte array, where each 8 bytes represent a single float64 value.
     * The byte array is stored in little-endian order using uint64 encoding.
     */
    values: Uint8Array;
}
export interface TextValues {
    values: string[];
}
export interface BoolValues {
    values: boolean[];
}
export interface ObjectValues {
    values: Properties[];
}
export interface DateValues {
    values: string[];
}
export interface UuidValues {
    values: string[];
}
export interface IntValues {
    /**
     * The values are stored as a byte array, where each 8 bytes represent a single int64 value.
     * The byte array is stored in little-endian order using uint64 encoding.
     */
    values: Uint8Array;
}
export interface GeoCoordinate {
    longitude: number;
    latitude: number;
}
export interface PhoneNumber {
    countryCode: number;
    defaultCountry: string;
    input: string;
    internationalFormatted: string;
    national: number;
    nationalFormatted: string;
    valid: boolean;
}
export declare const Properties: {
    encode(message: Properties, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Properties;
    fromJSON(object: any): Properties;
    toJSON(message: Properties): unknown;
    create(base?: DeepPartial<Properties>): Properties;
    fromPartial(object: DeepPartial<Properties>): Properties;
};
export declare const Properties_FieldsEntry: {
    encode(message: Properties_FieldsEntry, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Properties_FieldsEntry;
    fromJSON(object: any): Properties_FieldsEntry;
    toJSON(message: Properties_FieldsEntry): unknown;
    create(base?: DeepPartial<Properties_FieldsEntry>): Properties_FieldsEntry;
    fromPartial(object: DeepPartial<Properties_FieldsEntry>): Properties_FieldsEntry;
};
export declare const Value: {
    encode(message: Value, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Value;
    fromJSON(object: any): Value;
    toJSON(message: Value): unknown;
    create(base?: DeepPartial<Value>): Value;
    fromPartial(object: DeepPartial<Value>): Value;
};
export declare const ListValue: {
    encode(message: ListValue, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): ListValue;
    fromJSON(object: any): ListValue;
    toJSON(message: ListValue): unknown;
    create(base?: DeepPartial<ListValue>): ListValue;
    fromPartial(object: DeepPartial<ListValue>): ListValue;
};
export declare const NumberValues: {
    encode(message: NumberValues, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): NumberValues;
    fromJSON(object: any): NumberValues;
    toJSON(message: NumberValues): unknown;
    create(base?: DeepPartial<NumberValues>): NumberValues;
    fromPartial(object: DeepPartial<NumberValues>): NumberValues;
};
export declare const TextValues: {
    encode(message: TextValues, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): TextValues;
    fromJSON(object: any): TextValues;
    toJSON(message: TextValues): unknown;
    create(base?: DeepPartial<TextValues>): TextValues;
    fromPartial(object: DeepPartial<TextValues>): TextValues;
};
export declare const BoolValues: {
    encode(message: BoolValues, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BoolValues;
    fromJSON(object: any): BoolValues;
    toJSON(message: BoolValues): unknown;
    create(base?: DeepPartial<BoolValues>): BoolValues;
    fromPartial(object: DeepPartial<BoolValues>): BoolValues;
};
export declare const ObjectValues: {
    encode(message: ObjectValues, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): ObjectValues;
    fromJSON(object: any): ObjectValues;
    toJSON(message: ObjectValues): unknown;
    create(base?: DeepPartial<ObjectValues>): ObjectValues;
    fromPartial(object: DeepPartial<ObjectValues>): ObjectValues;
};
export declare const DateValues: {
    encode(message: DateValues, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): DateValues;
    fromJSON(object: any): DateValues;
    toJSON(message: DateValues): unknown;
    create(base?: DeepPartial<DateValues>): DateValues;
    fromPartial(object: DeepPartial<DateValues>): DateValues;
};
export declare const UuidValues: {
    encode(message: UuidValues, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): UuidValues;
    fromJSON(object: any): UuidValues;
    toJSON(message: UuidValues): unknown;
    create(base?: DeepPartial<UuidValues>): UuidValues;
    fromPartial(object: DeepPartial<UuidValues>): UuidValues;
};
export declare const IntValues: {
    encode(message: IntValues, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): IntValues;
    fromJSON(object: any): IntValues;
    toJSON(message: IntValues): unknown;
    create(base?: DeepPartial<IntValues>): IntValues;
    fromPartial(object: DeepPartial<IntValues>): IntValues;
};
export declare const GeoCoordinate: {
    encode(message: GeoCoordinate, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): GeoCoordinate;
    fromJSON(object: any): GeoCoordinate;
    toJSON(message: GeoCoordinate): unknown;
    create(base?: DeepPartial<GeoCoordinate>): GeoCoordinate;
    fromPartial(object: DeepPartial<GeoCoordinate>): GeoCoordinate;
};
export declare const PhoneNumber: {
    encode(message: PhoneNumber, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): PhoneNumber;
    fromJSON(object: any): PhoneNumber;
    toJSON(message: PhoneNumber): unknown;
    create(base?: DeepPartial<PhoneNumber>): PhoneNumber;
    fromPartial(object: DeepPartial<PhoneNumber>): PhoneNumber;
};
type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;
export type DeepPartial<T> = T extends Builtin ? T : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>> : T extends {} ? {
    [K in keyof T]?: DeepPartial<T[K]>;
} : Partial<T>;
export {};
