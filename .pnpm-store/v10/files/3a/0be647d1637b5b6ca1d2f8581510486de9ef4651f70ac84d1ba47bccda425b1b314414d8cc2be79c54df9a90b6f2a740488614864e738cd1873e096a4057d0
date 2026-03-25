export const majorUint64 = 0;
export const majorNegativeInt64 = 1;
export const majorUnstructuredByteString = 2;
export const majorUtf8String = 3;
export const majorList = 4;
export const majorMap = 5;
export const majorTag = 6;
export const majorSpecial = 7;
export const specialFalse = 20;
export const specialTrue = 21;
export const specialNull = 22;
export const specialUndefined = 23;
export const extendedOneByte = 24;
export const extendedFloat16 = 25;
export const extendedFloat32 = 26;
export const extendedFloat64 = 27;
export const minorIndefinite = 31;
export function alloc(size) {
    return typeof Buffer !== "undefined" ? Buffer.alloc(size) : new Uint8Array(size);
}
export const tagSymbol = Symbol("@smithy/core/cbor::tagSymbol");
export function tag(data) {
    data[tagSymbol] = true;
    return data;
}
