import { FlexibleChecksumsInputConfig, FlexibleChecksumsResolvedConfig } from "@aws-sdk/middleware-flexible-checksums";
import { HostHeaderInputConfig, HostHeaderResolvedConfig } from "@aws-sdk/middleware-host-header";
import { S3InputConfig, S3ResolvedConfig } from "@aws-sdk/middleware-sdk-s3";
import { UserAgentInputConfig, UserAgentResolvedConfig } from "@aws-sdk/middleware-user-agent";
import { GetAwsChunkedEncodingStream } from "@aws-sdk/types";
import { RegionInputConfig, RegionResolvedConfig } from "@smithy/config-resolver";
import { EventStreamSerdeInputConfig, EventStreamSerdeResolvedConfig } from "@smithy/eventstream-serde-config-resolver";
import { EndpointInputConfig, EndpointResolvedConfig } from "@smithy/middleware-endpoint";
import { RetryInputConfig, RetryResolvedConfig } from "@smithy/middleware-retry";
import { HttpHandlerUserInput as __HttpHandlerUserInput } from "@smithy/protocol-http";
import { Client as __Client, DefaultsMode as __DefaultsMode, SmithyConfiguration as __SmithyConfiguration, SmithyResolvedConfiguration as __SmithyResolvedConfiguration } from "@smithy/smithy-client";
import { AwsCredentialIdentityProvider, BodyLengthCalculator as __BodyLengthCalculator, CheckOptionalClientConfig as __CheckOptionalClientConfig, ChecksumConstructor as __ChecksumConstructor, Decoder as __Decoder, Encoder as __Encoder, EventStreamSerdeProvider as __EventStreamSerdeProvider, HashConstructor as __HashConstructor, HttpHandlerOptions as __HttpHandlerOptions, Logger as __Logger, Provider as __Provider, Provider, SdkStreamMixinInjector as __SdkStreamMixinInjector, StreamCollector as __StreamCollector, StreamHasher as __StreamHasher, UrlParser as __UrlParser, UserAgent as __UserAgent } from "@smithy/types";
import { Readable } from "stream";
import { HttpAuthSchemeInputConfig, HttpAuthSchemeResolvedConfig } from "./auth/httpAuthSchemeProvider";
import { AbortMultipartUploadCommandInput, AbortMultipartUploadCommandOutput } from "./commands/AbortMultipartUploadCommand";
import { CompleteMultipartUploadCommandInput, CompleteMultipartUploadCommandOutput } from "./commands/CompleteMultipartUploadCommand";
import { CopyObjectCommandInput, CopyObjectCommandOutput } from "./commands/CopyObjectCommand";
import { CreateBucketCommandInput, CreateBucketCommandOutput } from "./commands/CreateBucketCommand";
import { CreateBucketMetadataTableConfigurationCommandInput, CreateBucketMetadataTableConfigurationCommandOutput } from "./commands/CreateBucketMetadataTableConfigurationCommand";
import { CreateMultipartUploadCommandInput, CreateMultipartUploadCommandOutput } from "./commands/CreateMultipartUploadCommand";
import { CreateSessionCommandInput, CreateSessionCommandOutput } from "./commands/CreateSessionCommand";
import { DeleteBucketAnalyticsConfigurationCommandInput, DeleteBucketAnalyticsConfigurationCommandOutput } from "./commands/DeleteBucketAnalyticsConfigurationCommand";
import { DeleteBucketCommandInput, DeleteBucketCommandOutput } from "./commands/DeleteBucketCommand";
import { DeleteBucketCorsCommandInput, DeleteBucketCorsCommandOutput } from "./commands/DeleteBucketCorsCommand";
import { DeleteBucketEncryptionCommandInput, DeleteBucketEncryptionCommandOutput } from "./commands/DeleteBucketEncryptionCommand";
import { DeleteBucketIntelligentTieringConfigurationCommandInput, DeleteBucketIntelligentTieringConfigurationCommandOutput } from "./commands/DeleteBucketIntelligentTieringConfigurationCommand";
import { DeleteBucketInventoryConfigurationCommandInput, DeleteBucketInventoryConfigurationCommandOutput } from "./commands/DeleteBucketInventoryConfigurationCommand";
import { DeleteBucketLifecycleCommandInput, DeleteBucketLifecycleCommandOutput } from "./commands/DeleteBucketLifecycleCommand";
import { DeleteBucketMetadataTableConfigurationCommandInput, DeleteBucketMetadataTableConfigurationCommandOutput } from "./commands/DeleteBucketMetadataTableConfigurationCommand";
import { DeleteBucketMetricsConfigurationCommandInput, DeleteBucketMetricsConfigurationCommandOutput } from "./commands/DeleteBucketMetricsConfigurationCommand";
import { DeleteBucketOwnershipControlsCommandInput, DeleteBucketOwnershipControlsCommandOutput } from "./commands/DeleteBucketOwnershipControlsCommand";
import { DeleteBucketPolicyCommandInput, DeleteBucketPolicyCommandOutput } from "./commands/DeleteBucketPolicyCommand";
import { DeleteBucketReplicationCommandInput, DeleteBucketReplicationCommandOutput } from "./commands/DeleteBucketReplicationCommand";
import { DeleteBucketTaggingCommandInput, DeleteBucketTaggingCommandOutput } from "./commands/DeleteBucketTaggingCommand";
import { DeleteBucketWebsiteCommandInput, DeleteBucketWebsiteCommandOutput } from "./commands/DeleteBucketWebsiteCommand";
import { DeleteObjectCommandInput, DeleteObjectCommandOutput } from "./commands/DeleteObjectCommand";
import { DeleteObjectsCommandInput, DeleteObjectsCommandOutput } from "./commands/DeleteObjectsCommand";
import { DeleteObjectTaggingCommandInput, DeleteObjectTaggingCommandOutput } from "./commands/DeleteObjectTaggingCommand";
import { DeletePublicAccessBlockCommandInput, DeletePublicAccessBlockCommandOutput } from "./commands/DeletePublicAccessBlockCommand";
import { GetBucketAccelerateConfigurationCommandInput, GetBucketAccelerateConfigurationCommandOutput } from "./commands/GetBucketAccelerateConfigurationCommand";
import { GetBucketAclCommandInput, GetBucketAclCommandOutput } from "./commands/GetBucketAclCommand";
import { GetBucketAnalyticsConfigurationCommandInput, GetBucketAnalyticsConfigurationCommandOutput } from "./commands/GetBucketAnalyticsConfigurationCommand";
import { GetBucketCorsCommandInput, GetBucketCorsCommandOutput } from "./commands/GetBucketCorsCommand";
import { GetBucketEncryptionCommandInput, GetBucketEncryptionCommandOutput } from "./commands/GetBucketEncryptionCommand";
import { GetBucketIntelligentTieringConfigurationCommandInput, GetBucketIntelligentTieringConfigurationCommandOutput } from "./commands/GetBucketIntelligentTieringConfigurationCommand";
import { GetBucketInventoryConfigurationCommandInput, GetBucketInventoryConfigurationCommandOutput } from "./commands/GetBucketInventoryConfigurationCommand";
import { GetBucketLifecycleConfigurationCommandInput, GetBucketLifecycleConfigurationCommandOutput } from "./commands/GetBucketLifecycleConfigurationCommand";
import { GetBucketLocationCommandInput, GetBucketLocationCommandOutput } from "./commands/GetBucketLocationCommand";
import { GetBucketLoggingCommandInput, GetBucketLoggingCommandOutput } from "./commands/GetBucketLoggingCommand";
import { GetBucketMetadataTableConfigurationCommandInput, GetBucketMetadataTableConfigurationCommandOutput } from "./commands/GetBucketMetadataTableConfigurationCommand";
import { GetBucketMetricsConfigurationCommandInput, GetBucketMetricsConfigurationCommandOutput } from "./commands/GetBucketMetricsConfigurationCommand";
import { GetBucketNotificationConfigurationCommandInput, GetBucketNotificationConfigurationCommandOutput } from "./commands/GetBucketNotificationConfigurationCommand";
import { GetBucketOwnershipControlsCommandInput, GetBucketOwnershipControlsCommandOutput } from "./commands/GetBucketOwnershipControlsCommand";
import { GetBucketPolicyCommandInput, GetBucketPolicyCommandOutput } from "./commands/GetBucketPolicyCommand";
import { GetBucketPolicyStatusCommandInput, GetBucketPolicyStatusCommandOutput } from "./commands/GetBucketPolicyStatusCommand";
import { GetBucketReplicationCommandInput, GetBucketReplicationCommandOutput } from "./commands/GetBucketReplicationCommand";
import { GetBucketRequestPaymentCommandInput, GetBucketRequestPaymentCommandOutput } from "./commands/GetBucketRequestPaymentCommand";
import { GetBucketTaggingCommandInput, GetBucketTaggingCommandOutput } from "./commands/GetBucketTaggingCommand";
import { GetBucketVersioningCommandInput, GetBucketVersioningCommandOutput } from "./commands/GetBucketVersioningCommand";
import { GetBucketWebsiteCommandInput, GetBucketWebsiteCommandOutput } from "./commands/GetBucketWebsiteCommand";
import { GetObjectAclCommandInput, GetObjectAclCommandOutput } from "./commands/GetObjectAclCommand";
import { GetObjectAttributesCommandInput, GetObjectAttributesCommandOutput } from "./commands/GetObjectAttributesCommand";
import { GetObjectCommandInput, GetObjectCommandOutput } from "./commands/GetObjectCommand";
import { GetObjectLegalHoldCommandInput, GetObjectLegalHoldCommandOutput } from "./commands/GetObjectLegalHoldCommand";
import { GetObjectLockConfigurationCommandInput, GetObjectLockConfigurationCommandOutput } from "./commands/GetObjectLockConfigurationCommand";
import { GetObjectRetentionCommandInput, GetObjectRetentionCommandOutput } from "./commands/GetObjectRetentionCommand";
import { GetObjectTaggingCommandInput, GetObjectTaggingCommandOutput } from "./commands/GetObjectTaggingCommand";
import { GetObjectTorrentCommandInput, GetObjectTorrentCommandOutput } from "./commands/GetObjectTorrentCommand";
import { GetPublicAccessBlockCommandInput, GetPublicAccessBlockCommandOutput } from "./commands/GetPublicAccessBlockCommand";
import { HeadBucketCommandInput, HeadBucketCommandOutput } from "./commands/HeadBucketCommand";
import { HeadObjectCommandInput, HeadObjectCommandOutput } from "./commands/HeadObjectCommand";
import { ListBucketAnalyticsConfigurationsCommandInput, ListBucketAnalyticsConfigurationsCommandOutput } from "./commands/ListBucketAnalyticsConfigurationsCommand";
import { ListBucketIntelligentTieringConfigurationsCommandInput, ListBucketIntelligentTieringConfigurationsCommandOutput } from "./commands/ListBucketIntelligentTieringConfigurationsCommand";
import { ListBucketInventoryConfigurationsCommandInput, ListBucketInventoryConfigurationsCommandOutput } from "./commands/ListBucketInventoryConfigurationsCommand";
import { ListBucketMetricsConfigurationsCommandInput, ListBucketMetricsConfigurationsCommandOutput } from "./commands/ListBucketMetricsConfigurationsCommand";
import { ListBucketsCommandInput, ListBucketsCommandOutput } from "./commands/ListBucketsCommand";
import { ListDirectoryBucketsCommandInput, ListDirectoryBucketsCommandOutput } from "./commands/ListDirectoryBucketsCommand";
import { ListMultipartUploadsCommandInput, ListMultipartUploadsCommandOutput } from "./commands/ListMultipartUploadsCommand";
import { ListObjectsCommandInput, ListObjectsCommandOutput } from "./commands/ListObjectsCommand";
import { ListObjectsV2CommandInput, ListObjectsV2CommandOutput } from "./commands/ListObjectsV2Command";
import { ListObjectVersionsCommandInput, ListObjectVersionsCommandOutput } from "./commands/ListObjectVersionsCommand";
import { ListPartsCommandInput, ListPartsCommandOutput } from "./commands/ListPartsCommand";
import { PutBucketAccelerateConfigurationCommandInput, PutBucketAccelerateConfigurationCommandOutput } from "./commands/PutBucketAccelerateConfigurationCommand";
import { PutBucketAclCommandInput, PutBucketAclCommandOutput } from "./commands/PutBucketAclCommand";
import { PutBucketAnalyticsConfigurationCommandInput, PutBucketAnalyticsConfigurationCommandOutput } from "./commands/PutBucketAnalyticsConfigurationCommand";
import { PutBucketCorsCommandInput, PutBucketCorsCommandOutput } from "./commands/PutBucketCorsCommand";
import { PutBucketEncryptionCommandInput, PutBucketEncryptionCommandOutput } from "./commands/PutBucketEncryptionCommand";
import { PutBucketIntelligentTieringConfigurationCommandInput, PutBucketIntelligentTieringConfigurationCommandOutput } from "./commands/PutBucketIntelligentTieringConfigurationCommand";
import { PutBucketInventoryConfigurationCommandInput, PutBucketInventoryConfigurationCommandOutput } from "./commands/PutBucketInventoryConfigurationCommand";
import { PutBucketLifecycleConfigurationCommandInput, PutBucketLifecycleConfigurationCommandOutput } from "./commands/PutBucketLifecycleConfigurationCommand";
import { PutBucketLoggingCommandInput, PutBucketLoggingCommandOutput } from "./commands/PutBucketLoggingCommand";
import { PutBucketMetricsConfigurationCommandInput, PutBucketMetricsConfigurationCommandOutput } from "./commands/PutBucketMetricsConfigurationCommand";
import { PutBucketNotificationConfigurationCommandInput, PutBucketNotificationConfigurationCommandOutput } from "./commands/PutBucketNotificationConfigurationCommand";
import { PutBucketOwnershipControlsCommandInput, PutBucketOwnershipControlsCommandOutput } from "./commands/PutBucketOwnershipControlsCommand";
import { PutBucketPolicyCommandInput, PutBucketPolicyCommandOutput } from "./commands/PutBucketPolicyCommand";
import { PutBucketReplicationCommandInput, PutBucketReplicationCommandOutput } from "./commands/PutBucketReplicationCommand";
import { PutBucketRequestPaymentCommandInput, PutBucketRequestPaymentCommandOutput } from "./commands/PutBucketRequestPaymentCommand";
import { PutBucketTaggingCommandInput, PutBucketTaggingCommandOutput } from "./commands/PutBucketTaggingCommand";
import { PutBucketVersioningCommandInput, PutBucketVersioningCommandOutput } from "./commands/PutBucketVersioningCommand";
import { PutBucketWebsiteCommandInput, PutBucketWebsiteCommandOutput } from "./commands/PutBucketWebsiteCommand";
import { PutObjectAclCommandInput, PutObjectAclCommandOutput } from "./commands/PutObjectAclCommand";
import { PutObjectCommandInput, PutObjectCommandOutput } from "./commands/PutObjectCommand";
import { PutObjectLegalHoldCommandInput, PutObjectLegalHoldCommandOutput } from "./commands/PutObjectLegalHoldCommand";
import { PutObjectLockConfigurationCommandInput, PutObjectLockConfigurationCommandOutput } from "./commands/PutObjectLockConfigurationCommand";
import { PutObjectRetentionCommandInput, PutObjectRetentionCommandOutput } from "./commands/PutObjectRetentionCommand";
import { PutObjectTaggingCommandInput, PutObjectTaggingCommandOutput } from "./commands/PutObjectTaggingCommand";
import { PutPublicAccessBlockCommandInput, PutPublicAccessBlockCommandOutput } from "./commands/PutPublicAccessBlockCommand";
import { RestoreObjectCommandInput, RestoreObjectCommandOutput } from "./commands/RestoreObjectCommand";
import { SelectObjectContentCommandInput, SelectObjectContentCommandOutput } from "./commands/SelectObjectContentCommand";
import { UploadPartCommandInput, UploadPartCommandOutput } from "./commands/UploadPartCommand";
import { UploadPartCopyCommandInput, UploadPartCopyCommandOutput } from "./commands/UploadPartCopyCommand";
import { WriteGetObjectResponseCommandInput, WriteGetObjectResponseCommandOutput } from "./commands/WriteGetObjectResponseCommand";
import { ClientInputEndpointParameters, ClientResolvedEndpointParameters, EndpointParameters } from "./endpoint/EndpointParameters";
import { RuntimeExtension, RuntimeExtensionsConfig } from "./runtimeExtensions";
export { __Client };
/**
 * @public
 */
export type ServiceInputTypes = AbortMultipartUploadCommandInput | CompleteMultipartUploadCommandInput | CopyObjectCommandInput | CreateBucketCommandInput | CreateBucketMetadataTableConfigurationCommandInput | CreateMultipartUploadCommandInput | CreateSessionCommandInput | DeleteBucketAnalyticsConfigurationCommandInput | DeleteBucketCommandInput | DeleteBucketCorsCommandInput | DeleteBucketEncryptionCommandInput | DeleteBucketIntelligentTieringConfigurationCommandInput | DeleteBucketInventoryConfigurationCommandInput | DeleteBucketLifecycleCommandInput | DeleteBucketMetadataTableConfigurationCommandInput | DeleteBucketMetricsConfigurationCommandInput | DeleteBucketOwnershipControlsCommandInput | DeleteBucketPolicyCommandInput | DeleteBucketReplicationCommandInput | DeleteBucketTaggingCommandInput | DeleteBucketWebsiteCommandInput | DeleteObjectCommandInput | DeleteObjectTaggingCommandInput | DeleteObjectsCommandInput | DeletePublicAccessBlockCommandInput | GetBucketAccelerateConfigurationCommandInput | GetBucketAclCommandInput | GetBucketAnalyticsConfigurationCommandInput | GetBucketCorsCommandInput | GetBucketEncryptionCommandInput | GetBucketIntelligentTieringConfigurationCommandInput | GetBucketInventoryConfigurationCommandInput | GetBucketLifecycleConfigurationCommandInput | GetBucketLocationCommandInput | GetBucketLoggingCommandInput | GetBucketMetadataTableConfigurationCommandInput | GetBucketMetricsConfigurationCommandInput | GetBucketNotificationConfigurationCommandInput | GetBucketOwnershipControlsCommandInput | GetBucketPolicyCommandInput | GetBucketPolicyStatusCommandInput | GetBucketReplicationCommandInput | GetBucketRequestPaymentCommandInput | GetBucketTaggingCommandInput | GetBucketVersioningCommandInput | GetBucketWebsiteCommandInput | GetObjectAclCommandInput | GetObjectAttributesCommandInput | GetObjectCommandInput | GetObjectLegalHoldCommandInput | GetObjectLockConfigurationCommandInput | GetObjectRetentionCommandInput | GetObjectTaggingCommandInput | GetObjectTorrentCommandInput | GetPublicAccessBlockCommandInput | HeadBucketCommandInput | HeadObjectCommandInput | ListBucketAnalyticsConfigurationsCommandInput | ListBucketIntelligentTieringConfigurationsCommandInput | ListBucketInventoryConfigurationsCommandInput | ListBucketMetricsConfigurationsCommandInput | ListBucketsCommandInput | ListDirectoryBucketsCommandInput | ListMultipartUploadsCommandInput | ListObjectVersionsCommandInput | ListObjectsCommandInput | ListObjectsV2CommandInput | ListPartsCommandInput | PutBucketAccelerateConfigurationCommandInput | PutBucketAclCommandInput | PutBucketAnalyticsConfigurationCommandInput | PutBucketCorsCommandInput | PutBucketEncryptionCommandInput | PutBucketIntelligentTieringConfigurationCommandInput | PutBucketInventoryConfigurationCommandInput | PutBucketLifecycleConfigurationCommandInput | PutBucketLoggingCommandInput | PutBucketMetricsConfigurationCommandInput | PutBucketNotificationConfigurationCommandInput | PutBucketOwnershipControlsCommandInput | PutBucketPolicyCommandInput | PutBucketReplicationCommandInput | PutBucketRequestPaymentCommandInput | PutBucketTaggingCommandInput | PutBucketVersioningCommandInput | PutBucketWebsiteCommandInput | PutObjectAclCommandInput | PutObjectCommandInput | PutObjectLegalHoldCommandInput | PutObjectLockConfigurationCommandInput | PutObjectRetentionCommandInput | PutObjectTaggingCommandInput | PutPublicAccessBlockCommandInput | RestoreObjectCommandInput | SelectObjectContentCommandInput | UploadPartCommandInput | UploadPartCopyCommandInput | WriteGetObjectResponseCommandInput;
/**
 * @public
 */
export type ServiceOutputTypes = AbortMultipartUploadCommandOutput | CompleteMultipartUploadCommandOutput | CopyObjectCommandOutput | CreateBucketCommandOutput | CreateBucketMetadataTableConfigurationCommandOutput | CreateMultipartUploadCommandOutput | CreateSessionCommandOutput | DeleteBucketAnalyticsConfigurationCommandOutput | DeleteBucketCommandOutput | DeleteBucketCorsCommandOutput | DeleteBucketEncryptionCommandOutput | DeleteBucketIntelligentTieringConfigurationCommandOutput | DeleteBucketInventoryConfigurationCommandOutput | DeleteBucketLifecycleCommandOutput | DeleteBucketMetadataTableConfigurationCommandOutput | DeleteBucketMetricsConfigurationCommandOutput | DeleteBucketOwnershipControlsCommandOutput | DeleteBucketPolicyCommandOutput | DeleteBucketReplicationCommandOutput | DeleteBucketTaggingCommandOutput | DeleteBucketWebsiteCommandOutput | DeleteObjectCommandOutput | DeleteObjectTaggingCommandOutput | DeleteObjectsCommandOutput | DeletePublicAccessBlockCommandOutput | GetBucketAccelerateConfigurationCommandOutput | GetBucketAclCommandOutput | GetBucketAnalyticsConfigurationCommandOutput | GetBucketCorsCommandOutput | GetBucketEncryptionCommandOutput | GetBucketIntelligentTieringConfigurationCommandOutput | GetBucketInventoryConfigurationCommandOutput | GetBucketLifecycleConfigurationCommandOutput | GetBucketLocationCommandOutput | GetBucketLoggingCommandOutput | GetBucketMetadataTableConfigurationCommandOutput | GetBucketMetricsConfigurationCommandOutput | GetBucketNotificationConfigurationCommandOutput | GetBucketOwnershipControlsCommandOutput | GetBucketPolicyCommandOutput | GetBucketPolicyStatusCommandOutput | GetBucketReplicationCommandOutput | GetBucketRequestPaymentCommandOutput | GetBucketTaggingCommandOutput | GetBucketVersioningCommandOutput | GetBucketWebsiteCommandOutput | GetObjectAclCommandOutput | GetObjectAttributesCommandOutput | GetObjectCommandOutput | GetObjectLegalHoldCommandOutput | GetObjectLockConfigurationCommandOutput | GetObjectRetentionCommandOutput | GetObjectTaggingCommandOutput | GetObjectTorrentCommandOutput | GetPublicAccessBlockCommandOutput | HeadBucketCommandOutput | HeadObjectCommandOutput | ListBucketAnalyticsConfigurationsCommandOutput | ListBucketIntelligentTieringConfigurationsCommandOutput | ListBucketInventoryConfigurationsCommandOutput | ListBucketMetricsConfigurationsCommandOutput | ListBucketsCommandOutput | ListDirectoryBucketsCommandOutput | ListMultipartUploadsCommandOutput | ListObjectVersionsCommandOutput | ListObjectsCommandOutput | ListObjectsV2CommandOutput | ListPartsCommandOutput | PutBucketAccelerateConfigurationCommandOutput | PutBucketAclCommandOutput | PutBucketAnalyticsConfigurationCommandOutput | PutBucketCorsCommandOutput | PutBucketEncryptionCommandOutput | PutBucketIntelligentTieringConfigurationCommandOutput | PutBucketInventoryConfigurationCommandOutput | PutBucketLifecycleConfigurationCommandOutput | PutBucketLoggingCommandOutput | PutBucketMetricsConfigurationCommandOutput | PutBucketNotificationConfigurationCommandOutput | PutBucketOwnershipControlsCommandOutput | PutBucketPolicyCommandOutput | PutBucketReplicationCommandOutput | PutBucketRequestPaymentCommandOutput | PutBucketTaggingCommandOutput | PutBucketVersioningCommandOutput | PutBucketWebsiteCommandOutput | PutObjectAclCommandOutput | PutObjectCommandOutput | PutObjectLegalHoldCommandOutput | PutObjectLockConfigurationCommandOutput | PutObjectRetentionCommandOutput | PutObjectTaggingCommandOutput | PutPublicAccessBlockCommandOutput | RestoreObjectCommandOutput | SelectObjectContentCommandOutput | UploadPartCommandOutput | UploadPartCopyCommandOutput | WriteGetObjectResponseCommandOutput;
/**
 * @public
 */
export interface ClientDefaults extends Partial<__SmithyConfiguration<__HttpHandlerOptions>> {
    /**
     * The HTTP handler to use or its constructor options. Fetch in browser and Https in Nodejs.
     */
    requestHandler?: __HttpHandlerUserInput;
    /**
     * A constructor for a class implementing the {@link @smithy/types#ChecksumConstructor} interface
     * that computes the SHA-256 HMAC or checksum of a string or binary buffer.
     * @internal
     */
    sha256?: __ChecksumConstructor | __HashConstructor;
    /**
     * The function that will be used to convert strings into HTTP endpoints.
     * @internal
     */
    urlParser?: __UrlParser;
    /**
     * A function that can calculate the length of a request body.
     * @internal
     */
    bodyLengthChecker?: __BodyLengthCalculator;
    /**
     * A function that converts a stream into an array of bytes.
     * @internal
     */
    streamCollector?: __StreamCollector;
    /**
     * The function that will be used to convert a base64-encoded string to a byte array.
     * @internal
     */
    base64Decoder?: __Decoder;
    /**
     * The function that will be used to convert binary data to a base64-encoded string.
     * @internal
     */
    base64Encoder?: __Encoder;
    /**
     * The function that will be used to convert a UTF8-encoded string to a byte array.
     * @internal
     */
    utf8Decoder?: __Decoder;
    /**
     * The function that will be used to convert binary data to a UTF-8 encoded string.
     * @internal
     */
    utf8Encoder?: __Encoder;
    /**
     * The runtime environment.
     * @internal
     */
    runtime?: string;
    /**
     * Disable dynamically changing the endpoint of the client based on the hostPrefix
     * trait of an operation.
     */
    disableHostPrefix?: boolean;
    /**
     * Unique service identifier.
     * @internal
     */
    serviceId?: string;
    /**
     * Enables IPv6/IPv4 dualstack endpoint.
     */
    useDualstackEndpoint?: boolean | __Provider<boolean>;
    /**
     * Enables FIPS compatible endpoints.
     */
    useFipsEndpoint?: boolean | __Provider<boolean>;
    /**
     * The AWS region to which this client will send requests
     */
    region?: string | __Provider<string>;
    /**
     * Setting a client profile is similar to setting a value for the
     * AWS_PROFILE environment variable. Setting a profile on a client
     * in code only affects the single client instance, unlike AWS_PROFILE.
     *
     * When set, and only for environments where an AWS configuration
     * file exists, fields configurable by this file will be retrieved
     * from the specified profile within that file.
     * Conflicting code configuration and environment variables will
     * still have higher priority.
     *
     * For client credential resolution that involves checking the AWS
     * configuration file, the client's profile (this value) will be
     * used unless a different profile is set in the credential
     * provider options.
     *
     */
    profile?: string;
    /**
     * The provider populating default tracking information to be sent with `user-agent`, `x-amz-user-agent` header
     * @internal
     */
    defaultUserAgentProvider?: Provider<__UserAgent>;
    /**
     * A function that, given a hash constructor and a stream, calculates the
     * hash of the streamed value.
     * @internal
     */
    streamHasher?: __StreamHasher<Readable> | __StreamHasher<Blob>;
    /**
     * A constructor for a class implementing the {@link __Checksum} interface
     * that computes MD5 hashes.
     * @internal
     */
    md5?: __ChecksumConstructor | __HashConstructor;
    /**
     * A constructor for a class implementing the {@link __Checksum} interface
     * that computes SHA1 hashes.
     * @internal
     */
    sha1?: __ChecksumConstructor | __HashConstructor;
    /**
     * A function that returns Readable Stream which follows aws-chunked encoding stream.
     * @internal
     */
    getAwsChunkedEncodingStream?: GetAwsChunkedEncodingStream;
    /**
     * Default credentials provider; Not available in browser runtime.
     * @deprecated
     * @internal
     */
    credentialDefaultProvider?: (input: any) => AwsCredentialIdentityProvider;
    /**
     * Value for how many times a request will be made at most in case of retry.
     */
    maxAttempts?: number | __Provider<number>;
    /**
     * Specifies which retry algorithm to use.
     * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-smithy-util-retry/Enum/RETRY_MODES/
     *
     */
    retryMode?: string | __Provider<string>;
    /**
     * Optional logger for logging debug/info/warn/error.
     */
    logger?: __Logger;
    /**
     * Optional extensions
     */
    extensions?: RuntimeExtension[];
    /**
     * The function that provides necessary utilities for generating and parsing event stream
     */
    eventStreamSerdeProvider?: __EventStreamSerdeProvider;
    /**
     * The {@link @smithy/smithy-client#DefaultsMode} that will be used to determine how certain default configuration options are resolved in the SDK.
     */
    defaultsMode?: __DefaultsMode | __Provider<__DefaultsMode>;
    /**
     * Whether to escape request path when signing the request.
     */
    signingEscapePath?: boolean;
    /**
     * Whether to override the request region with the region inferred from requested resource's ARN. Defaults to false.
     */
    useArnRegion?: boolean | Provider<boolean>;
    /**
     * The internal function that inject utilities to runtime-specific stream to help users consume the data
     * @internal
     */
    sdkStreamMixin?: __SdkStreamMixinInjector;
}
/**
 * @public
 */
export type S3ClientConfigType = Partial<__SmithyConfiguration<__HttpHandlerOptions>> & ClientDefaults & UserAgentInputConfig & FlexibleChecksumsInputConfig & RetryInputConfig & RegionInputConfig & HostHeaderInputConfig & EndpointInputConfig<EndpointParameters> & EventStreamSerdeInputConfig & HttpAuthSchemeInputConfig & S3InputConfig & ClientInputEndpointParameters;
/**
 * @public
 *
 *  The configuration interface of S3Client class constructor that set the region, credentials and other options.
 */
export interface S3ClientConfig extends S3ClientConfigType {
}
/**
 * @public
 */
export type S3ClientResolvedConfigType = __SmithyResolvedConfiguration<__HttpHandlerOptions> & Required<ClientDefaults> & RuntimeExtensionsConfig & UserAgentResolvedConfig & FlexibleChecksumsResolvedConfig & RetryResolvedConfig & RegionResolvedConfig & HostHeaderResolvedConfig & EndpointResolvedConfig<EndpointParameters> & EventStreamSerdeResolvedConfig & HttpAuthSchemeResolvedConfig & S3ResolvedConfig & ClientResolvedEndpointParameters;
/**
 * @public
 *
 *  The resolved configuration interface of S3Client class. This is resolved and normalized from the {@link S3ClientConfig | constructor configuration interface}.
 */
export interface S3ClientResolvedConfig extends S3ClientResolvedConfigType {
}
/**
 * <p></p>
 * @public
 */
export declare class S3Client extends __Client<__HttpHandlerOptions, ServiceInputTypes, ServiceOutputTypes, S3ClientResolvedConfig> {
    /**
     * The resolved configuration of S3Client class. This is resolved and normalized from the {@link S3ClientConfig | constructor configuration interface}.
     */
    readonly config: S3ClientResolvedConfig;
    constructor(...[configuration]: __CheckOptionalClientConfig<S3ClientConfig>);
    /**
     * Destroy underlying resources, like sockets. It's usually not necessary to do this.
     * However in Node.js, it's best to explicitly shut down the client's agent when it is no longer needed.
     * Otherwise, sockets might stay open for quite a long time before the server terminates them.
     */
    destroy(): void;
}
