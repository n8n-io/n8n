import { DeserializeMiddleware, Pluggable, RelativeMiddlewareOptions } from "@smithy/types";
/**
 * @internal
 */
interface PreviouslyResolved {
}
/**
 * @internal
 *
 * From the S3 Expires compatibility spec.
 * A model transform will ensure S3#Expires remains a timestamp shape, though
 * it is deprecated.
 * If a particular object has a non-date string set as the Expires value,
 * the SDK will have the raw string as "ExpiresString" on the response.
 *
 */
export declare const s3ExpiresMiddleware: (config: PreviouslyResolved) => DeserializeMiddleware<any, any>;
/**
 * @internal
 */
export declare const s3ExpiresMiddlewareOptions: RelativeMiddlewareOptions;
/**
 * @internal
 */
export declare const getS3ExpiresMiddlewarePlugin: (clientConfig: PreviouslyResolved) => Pluggable<any, any>;
export {};
