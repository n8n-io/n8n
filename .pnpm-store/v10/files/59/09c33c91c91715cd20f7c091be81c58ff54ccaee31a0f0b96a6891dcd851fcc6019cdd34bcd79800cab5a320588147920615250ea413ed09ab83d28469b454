export type ValueType = null | undefined | Function | symbol | bigint | number | boolean | string;
export type ObjectType = Record<string | number | symbol, unknown>;
export type TypedArrayType = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | BigInt64Array | BigUint64Array;
export type ArrayType = unknown[];
export declare namespace Is {
    function Object(value: unknown): value is ObjectType;
    function Date(value: unknown): value is Date;
    function Array(value: unknown): value is ArrayType;
    function Value(value: unknown): value is ValueType;
    function TypedArray(value: unknown): value is TypedArrayType;
}
