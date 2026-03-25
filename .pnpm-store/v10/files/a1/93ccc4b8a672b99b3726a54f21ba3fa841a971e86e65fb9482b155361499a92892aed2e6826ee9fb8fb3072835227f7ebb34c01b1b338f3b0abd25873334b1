import { InitializeHandlerOptions, InitializeMiddleware, Pluggable } from "@smithy/types";
import { LocationConstraintResolvedConfig } from "./configuration";
/**
 * This middleware modifies the input on S3 CreateBucket requests.  If the LocationConstraint has not been set, this
 * middleware will set a LocationConstraint to match the configured region.  The CreateBucketConfiguration will be
 * removed entirely on requests to the us-east-1 region.
 */
export declare function locationConstraintMiddleware(options: LocationConstraintResolvedConfig): InitializeMiddleware<any, any>;
export declare const locationConstraintMiddlewareOptions: InitializeHandlerOptions;
export declare const getLocationConstraintPlugin: (config: LocationConstraintResolvedConfig) => Pluggable<any, any>;
