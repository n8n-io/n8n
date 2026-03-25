import { AwsCredentialIdentity } from "@aws-sdk/types";
import { BuildHandlerOptions, BuildMiddleware, Logger, MemoizedProvider, Pluggable } from "@smithy/types";
import { S3ExpressIdentity } from "../interfaces/S3ExpressIdentity";
import { S3ExpressIdentityProvider } from "../interfaces/S3ExpressIdentityProvider";
declare module "@smithy/types" {
    interface HandlerExecutionContext {
        /**
         * Reserved key, only when using S3.
         */
        s3ExpressIdentity?: S3ExpressIdentity;
    }
}
/**
 * @internal
 */
export interface S3ExpressResolvedConfig {
    logger?: Logger;
    s3ExpressIdentityProvider: S3ExpressIdentityProvider;
    credentials: MemoizedProvider<AwsCredentialIdentity>;
}
/**
 * @internal
 */
export declare const s3ExpressMiddleware: (options: S3ExpressResolvedConfig) => BuildMiddleware<any, any>;
/**
 * @internal
 */
export declare const s3ExpressMiddlewareOptions: BuildHandlerOptions;
/**
 * @internal
 */
export declare const getS3ExpressPlugin: (options: S3ExpressResolvedConfig) => Pluggable<any, any>;
