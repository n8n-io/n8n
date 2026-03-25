export type CborItemType = undefined | boolean | number | bigint | [CborUnstructuredByteStringType, Uint64] | string | CborTagType;
export type CborTagType = {
    tag: Uint64 | number;
    value: CborValueType;
    [tagSymbol]: true;
};
export type CborUnstructuredByteStringType = Uint8Array;
export type CborListType<T = any> = Array<T>;
export type CborMapType<T = any> = Record<string, T>;
export type CborCollectionType<T = any> = CborMapType<T> | CborListType<T>;
export type CborValueType = CborItemType | CborCollectionType | any;
export type CborArgumentLength = 1 | 2 | 4 | 8;
export type CborArgumentLengthOffset = 1 | 2 | 3 | 5 | 9;
export type CborOffset = number;
export type Uint8 = number;
export type Uint32 = number;
export type Uint64 = bigint;
export type Float32 = number;
export type Int64 = bigint;
export type Float16Binary = number;
export type Float32Binary = number;
export type CborMajorType = typeof majorUint64 | typeof majorNegativeInt64 | typeof majorUnstructuredByteString | typeof majorUtf8String | typeof majorList | typeof majorMap | typeof majorTag | typeof majorSpecial;
export declare const majorUint64 = 0;
export declare const majorNegativeInt64 = 1;
export declare const majorUnstructuredByteString = 2;
export declare const majorUtf8String = 3;
export declare const majorList = 4;
export declare const majorMap = 5;
export declare const majorTag = 6;
export declare const majorSpecial = 7;
export declare const specialFalse = 20;
export declare const specialTrue = 21;
export declare const specialNull = 22;
export declare const specialUndefined = 23;
export declare const extendedOneByte = 24;
export declare const extendedFloat16 = 25;
export declare const extendedFloat32 = 26;
export declare const extendedFloat64 = 27;
export declare const minorIndefinite = 31;
export declare function alloc(size: number): Uint8Array;
/**
 * @public
 *
 * The presence of this symbol as an object key indicates it should be considered a tag
 * for CBOR serialization purposes.
 *
 * The object must also have the properties "tag" and "value".
 */
export declare const tagSymbol: unique symbol;
/**
 * @public
 * Applies the tag symbol to the object.
 */
export declare function tag(data: {
    tag: number | bigint;
    value: any;
    [tagSymbol]?: true;
}): {
    tag: number | bigint;
    value: any;
    [tagSymbol]: true;
};
