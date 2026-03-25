import { Provider, RegionInfoProvider } from "@smithy/types";
export interface BucketEndpointInputConfig {
    /**
     * Whether to use the bucket name as the endpoint for this request. The bucket
     * name must be a domain name with a CNAME record alias to an appropriate virtual
     * hosted-style S3 hostname, e.g. a bucket of `images.johnsmith.net` and a DNS
     * record of:
     *
     * ```
     * images.johnsmith.net CNAME 			images.johnsmith.net.s3.amazonaws.com.
     * ```
     *
     * @see https://docs.aws.amazon.com/AmazonS3/latest/userguide/VirtualHosting.html#VirtualHostingCustomURLs
     */
    bucketEndpoint?: boolean;
    /**
     * Whether to force path style URLs for S3 objects (e.g., https://s3.amazonaws.com/<bucketName>/<key> instead of https://<bucketName>.s3.amazonaws.com/<key>
     */
    forcePathStyle?: boolean;
    /**
     * Whether to use the S3 Transfer Acceleration endpoint by default
     */
    useAccelerateEndpoint?: boolean;
    /**
     * Whether to override the request region with the region inferred from requested resource's ARN. Defaults to false
     */
    useArnRegion?: boolean | Provider<boolean>;
    /**
     * Whether to prevent SDK from making cross-region request when supplied bucket is a multi-region access point ARN.
     * Defaults to false
     */
    disableMultiregionAccessPoints?: boolean | Provider<boolean>;
}
interface PreviouslyResolved {
    isCustomEndpoint?: boolean;
    region: Provider<string>;
    regionInfoProvider: RegionInfoProvider;
    useFipsEndpoint: Provider<boolean>;
    useDualstackEndpoint: Provider<boolean>;
}
export interface BucketEndpointResolvedConfig {
    /**
     * Whether the endpoint is specified by caller.
     * @internal
     */
    isCustomEndpoint?: boolean;
    /**
     * Resolved value for input config {@link BucketEndpointInputConfig.bucketEndpoint}
     */
    bucketEndpoint: boolean;
    /**
     * Resolved value for input config {@link BucketEndpointInputConfig.forcePathStyle}
     */
    forcePathStyle: boolean;
    /**
     * Resolved value for input config {@link BucketEndpointInputConfig.useAccelerateEndpoint}
     */
    useAccelerateEndpoint: boolean;
    /**
     * Enables FIPS compatible endpoints.
     */
    useFipsEndpoint: Provider<boolean>;
    /**
     * Enables IPv6/IPv4 dualstack endpoint.
     */
    useDualstackEndpoint: Provider<boolean>;
    /**
     * Resolved value for input config {@link BucketEndpointInputConfig.useArnRegion}
     */
    useArnRegion: Provider<boolean>;
    /**
     * Resolved value for input config {@link RegionInputConfig.region}
     */
    region: Provider<string>;
    /**
     * Fetch related hostname, signing name or signing region with given region.
     * @internal
     */
    regionInfoProvider: RegionInfoProvider;
    disableMultiregionAccessPoints: Provider<boolean>;
}
export declare function resolveBucketEndpointConfig<T>(input: T & PreviouslyResolved & BucketEndpointInputConfig): T & BucketEndpointResolvedConfig;
export {};
