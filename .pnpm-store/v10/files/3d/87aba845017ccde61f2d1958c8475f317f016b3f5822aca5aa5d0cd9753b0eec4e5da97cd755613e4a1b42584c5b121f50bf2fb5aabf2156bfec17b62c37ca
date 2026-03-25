import { JsHistogram } from "./JsHistogram";
import { BitBucketSize } from "./Histogram";
export declare const deflate: any;
export declare const inflate: any;
export declare function decompress(data: Uint8Array): Uint8Array;
export declare function doDecode(data: Uint8Array, bitBucketSize?: BitBucketSize, minBarForHighestTrackableValue?: number): JsHistogram;
declare function doEncodeIntoCompressedBase64(compressionLevel?: number): string;
declare module "./JsHistogram" {
    namespace JsHistogram {
        let decode: typeof doDecode;
    }
}
declare module "./JsHistogram" {
    interface JsHistogram {
        encodeIntoCompressedBase64: typeof doEncodeIntoCompressedBase64;
    }
}
export {};
