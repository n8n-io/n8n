import type { Client, Command } from "@smithy/types";
import { S3ExpressIdentityProvider } from "./s3-express";
/**
 * All endpoint parameters with built-in bindings of AWS::S3::*
 * @public
 */
export interface S3InputConfig {
    /**
     * Whether to force path style URLs for S3 objects
     * (e.g., https://s3.amazonaws.com/<bucketName>/<key> instead of https://<bucketName>.s3.amazonaws.com/<key>
     */
    forcePathStyle?: boolean;
    /**
     * Whether to use the S3 Transfer Acceleration endpoint by default
     */
    useAccelerateEndpoint?: boolean;
    /**
     * Whether multi-region access points (MRAP) should be disabled.
     */
    disableMultiregionAccessPoints?: boolean;
    /**
     * This feature was previously called the S3 Global Client.
     * This can result in additional latency as failed requests are retried
     * with a corrected region when receiving a permanent redirect error with status 301.
     * This feature should only be used as a last resort if you do not know the region of your bucket(s) ahead of time.
     */
    followRegionRedirects?: boolean;
    /**
     * Identity provider for an S3 feature.
     */
    s3ExpressIdentityProvider?: S3ExpressIdentityProvider;
    /**
     * Whether to use the bucket name as the endpoint for this client.
     */
    bucketEndpoint?: boolean;
}
/**
 * This is a placeholder for the actual
 * S3Client type from \@aws-sdk/client-s3. It is not explicitly
 * imported to avoid a circular dependency.
 * @internal
 */
type PlaceholderS3Client = Client<any, any, any> & any;
/**
 * Placeholder for the constructor for CreateSessionCommand.
 * @internal
 */
type PlaceholderCreateSessionCommandCtor = {
    new (args: any): Command<any, any, any, any, any>;
};
export interface S3ResolvedConfig {
    forcePathStyle: boolean;
    useAccelerateEndpoint: boolean;
    disableMultiregionAccessPoints: boolean;
    followRegionRedirects: boolean;
    s3ExpressIdentityProvider: S3ExpressIdentityProvider;
    bucketEndpoint: boolean;
}
export declare const resolveS3Config: <T>(input: T & S3InputConfig, { session, }: {
    session: [() => PlaceholderS3Client, PlaceholderCreateSessionCommandCtor];
}) => T & S3ResolvedConfig;
export {};
