/**
 * Aggregates byteArrays on demand.
 * @internal
 */
export declare class ByteArrayCollector {
    readonly allocByteArray: (size: number) => Uint8Array;
    byteLength: number;
    private byteArrays;
    constructor(allocByteArray: (size: number) => Uint8Array);
    push(byteArray: Uint8Array): void;
    flush(): Uint8Array;
    private reset;
}
