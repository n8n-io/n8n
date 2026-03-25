/**
 * Mimic Java's ByteBufffer with big endian order
 */
declare class ByteBuffer {
    position: number;
    data: Uint8Array;
    int32ArrayForConvert: Uint32Array;
    int8ArrayForConvert: Uint8Array;
    static allocate(size?: number): ByteBuffer;
    constructor(data: Uint8Array);
    put(value: number): void;
    putInt32(value: number): void;
    putInt64(value: number): void;
    putArray(array: Uint8Array): void;
    get(): number;
    getInt32(): number;
    getInt64(): number;
    resetPosition(): void;
}
export default ByteBuffer;
