import { DeserializeMiddleware, Encoder, Pluggable, RelativeMiddlewareOptions } from "@smithy/types";
type PreviouslyResolved = {
    utf8Encoder: Encoder;
};
/**
 * In case of an internal error/terminated connection, S3 operations may return 200 errors. CopyObject, UploadPartCopy,
 * CompleteMultipartUpload may return empty payload or payload with only xml Preamble.
 * @internal
 */
export declare const throw200ExceptionsMiddleware: (config: PreviouslyResolved) => DeserializeMiddleware<any, any>;
/**
 * @internal
 */
export declare const throw200ExceptionsMiddlewareOptions: RelativeMiddlewareOptions;
/**
 *
 * @internal
 */
export declare const getThrow200ExceptionsPlugin: (config: PreviouslyResolved) => Pluggable<any, any>;
export {};
