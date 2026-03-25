import { ChecksumConstructor, Decoder, Encoder, HashConstructor, InitializeHandlerOptions, InitializeMiddleware, Pluggable } from "@smithy/types";
interface PreviouslyResolved {
    base64Encoder: Encoder;
    md5: ChecksumConstructor | HashConstructor;
    utf8Decoder: Decoder;
    base64Decoder: Decoder;
}
export declare function ssecMiddleware(options: PreviouslyResolved): InitializeMiddleware<any, any>;
export declare const ssecMiddlewareOptions: InitializeHandlerOptions;
export declare const getSsecPlugin: (config: PreviouslyResolved) => Pluggable<any, any>;
export declare function isValidBase64EncodedSSECustomerKey(str: string, options: PreviouslyResolved): boolean;
export {};
