export {}; // Make this a module

declare global {
    namespace NodeJS {
        type TypedArray<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike> =
            | Uint8Array<TArrayBuffer>
            | Uint8ClampedArray<TArrayBuffer>
            | Uint16Array<TArrayBuffer>
            | Uint32Array<TArrayBuffer>
            | Int8Array<TArrayBuffer>
            | Int16Array<TArrayBuffer>
            | Int32Array<TArrayBuffer>
            | BigUint64Array<TArrayBuffer>
            | BigInt64Array<TArrayBuffer>
            | Float32Array<TArrayBuffer>
            | Float64Array<TArrayBuffer>;
        type ArrayBufferView<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike> =
            | TypedArray<TArrayBuffer>
            | DataView<TArrayBuffer>;
    }
}
