/**
 * A generic ArrayBufferView (typed array) constructor
 */
export interface ArrayBufferViewConstructor {
    readonly prototype: ArrayBufferView<ArrayBufferLike>;
    new (length: number): ArrayBufferView<ArrayBuffer>;
    new (array: ArrayLike<number>): ArrayBufferView<ArrayBuffer>;
    new <TArrayBuffer extends ArrayBufferLike = ArrayBuffer>(buffer: TArrayBuffer, byteOffset?: number, length?: number): ArrayBufferView<TArrayBuffer>;
    new (array: ArrayLike<number> | ArrayBuffer): ArrayBufferView<ArrayBuffer>;
}
/**
 * Grows a buffer if it isn't large enough
 * @returns The original buffer if resized successfully, or a newly created buffer
 */
export declare function extendBuffer<T extends ArrayBufferLike | ArrayBufferView>(buffer: T, newByteLength: number): T;
export declare function toUint8Array(buffer: ArrayBufferLike | ArrayBufferView): Uint8Array;
