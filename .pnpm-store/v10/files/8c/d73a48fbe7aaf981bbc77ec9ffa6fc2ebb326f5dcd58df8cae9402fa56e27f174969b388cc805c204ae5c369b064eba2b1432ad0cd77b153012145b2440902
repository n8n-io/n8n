export {}; // Make this a module

declare global {
    namespace NodeJS {
        type TypedArray =
            | Uint8Array
            | Uint8ClampedArray
            | Uint16Array
            | Uint32Array
            | Int8Array
            | Int16Array
            | Int32Array
            | BigUint64Array
            | BigInt64Array
            | Float32Array
            | Float64Array;
        type ArrayBufferView = TypedArray | DataView;
    }
}
