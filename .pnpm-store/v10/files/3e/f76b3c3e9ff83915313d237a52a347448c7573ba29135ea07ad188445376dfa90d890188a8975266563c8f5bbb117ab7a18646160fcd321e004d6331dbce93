import Histogram from "./Histogram";
export declare function decompress(data: Uint8Array): Uint8Array;
export declare const decodeFromCompressedBase64: (base64String: string, bitBucketSize?: 8 | 16 | 32 | 64 | "packed", useWebAssembly?: boolean, minBarForHighestTrackableValue?: number) => Histogram;
declare function encodeWasmIntoCompressedBase64(compressionLevel?: number): string;
declare module "./wasm" {
    interface WasmHistogram {
        encodeIntoCompressedBase64: typeof encodeWasmIntoCompressedBase64;
    }
}
export declare const encodeIntoCompressedBase64: (histogram: Histogram, compressionLevel?: number) => string;
export {};
