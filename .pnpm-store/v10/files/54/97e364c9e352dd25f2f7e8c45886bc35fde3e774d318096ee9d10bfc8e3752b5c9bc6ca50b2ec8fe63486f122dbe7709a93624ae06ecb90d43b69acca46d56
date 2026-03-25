import { HostHeaderInputConfig, HostHeaderResolvedConfig } from "@aws-sdk/middleware-host-header";
import { UserAgentInputConfig, UserAgentResolvedConfig } from "@aws-sdk/middleware-user-agent";
import { RegionInputConfig, RegionResolvedConfig } from "@smithy/config-resolver";
import { EndpointInputConfig, EndpointResolvedConfig } from "@smithy/middleware-endpoint";
import { RetryInputConfig, RetryResolvedConfig } from "@smithy/middleware-retry";
import { HttpHandlerUserInput as __HttpHandlerUserInput } from "@smithy/protocol-http";
import { Client as __Client, DefaultsMode as __DefaultsMode, SmithyConfiguration as __SmithyConfiguration, SmithyResolvedConfiguration as __SmithyResolvedConfiguration } from "@smithy/smithy-client";
import { AwsCredentialIdentityProvider, BodyLengthCalculator as __BodyLengthCalculator, CheckOptionalClientConfig as __CheckOptionalClientConfig, ChecksumConstructor as __ChecksumConstructor, Decoder as __Decoder, Encoder as __Encoder, HashConstructor as __HashConstructor, HttpHandlerOptions as __HttpHandlerOptions, Logger as __Logger, Provider as __Provider, Provider, StreamCollector as __StreamCollector, UrlParser as __UrlParser, UserAgent as __UserAgent } from "@smithy/types";
import { HttpAuthSchemeInputConfig, HttpAuthSchemeResolvedConfig } from "./auth/httpAuthSchemeProvider";
import { BatchGetSecretValueCommandInput, BatchGetSecretValueCommandOutput } from "./commands/BatchGetSecretValueCommand";
import { CancelRotateSecretCommandInput, CancelRotateSecretCommandOutput } from "./commands/CancelRotateSecretCommand";
import { CreateSecretCommandInput, CreateSecretCommandOutput } from "./commands/CreateSecretCommand";
import { DeleteResourcePolicyCommandInput, DeleteResourcePolicyCommandOutput } from "./commands/DeleteResourcePolicyCommand";
import { DeleteSecretCommandInput, DeleteSecretCommandOutput } from "./commands/DeleteSecretCommand";
import { DescribeSecretCommandInput, DescribeSecretCommandOutput } from "./commands/DescribeSecretCommand";
import { GetRandomPasswordCommandInput, GetRandomPasswordCommandOutput } from "./commands/GetRandomPasswordCommand";
import { GetResourcePolicyCommandInput, GetResourcePolicyCommandOutput } from "./commands/GetResourcePolicyCommand";
import { GetSecretValueCommandInput, GetSecretValueCommandOutput } from "./commands/GetSecretValueCommand";
import { ListSecretsCommandInput, ListSecretsCommandOutput } from "./commands/ListSecretsCommand";
import { ListSecretVersionIdsCommandInput, ListSecretVersionIdsCommandOutput } from "./commands/ListSecretVersionIdsCommand";
import { PutResourcePolicyCommandInput, PutResourcePolicyCommandOutput } from "./commands/PutResourcePolicyCommand";
import { PutSecretValueCommandInput, PutSecretValueCommandOutput } from "./commands/PutSecretValueCommand";
import { RemoveRegionsFromReplicationCommandInput, RemoveRegionsFromReplicationCommandOutput } from "./commands/RemoveRegionsFromReplicationCommand";
import { ReplicateSecretToRegionsCommandInput, ReplicateSecretToRegionsCommandOutput } from "./commands/ReplicateSecretToRegionsCommand";
import { RestoreSecretCommandInput, RestoreSecretCommandOutput } from "./commands/RestoreSecretCommand";
import { RotateSecretCommandInput, RotateSecretCommandOutput } from "./commands/RotateSecretCommand";
import { StopReplicationToReplicaCommandInput, StopReplicationToReplicaCommandOutput } from "./commands/StopReplicationToReplicaCommand";
import { TagResourceCommandInput, TagResourceCommandOutput } from "./commands/TagResourceCommand";
import { UntagResourceCommandInput, UntagResourceCommandOutput } from "./commands/UntagResourceCommand";
import { UpdateSecretCommandInput, UpdateSecretCommandOutput } from "./commands/UpdateSecretCommand";
import { UpdateSecretVersionStageCommandInput, UpdateSecretVersionStageCommandOutput } from "./commands/UpdateSecretVersionStageCommand";
import { ValidateResourcePolicyCommandInput, ValidateResourcePolicyCommandOutput } from "./commands/ValidateResourcePolicyCommand";
import { ClientInputEndpointParameters, ClientResolvedEndpointParameters, EndpointParameters } from "./endpoint/EndpointParameters";
import { RuntimeExtension, RuntimeExtensionsConfig } from "./runtimeExtensions";
export { __Client };
/**
 * @public
 */
export type ServiceInputTypes = BatchGetSecretValueCommandInput | CancelRotateSecretCommandInput | CreateSecretCommandInput | DeleteResourcePolicyCommandInput | DeleteSecretCommandInput | DescribeSecretCommandInput | GetRandomPasswordCommandInput | GetResourcePolicyCommandInput | GetSecretValueCommandInput | ListSecretVersionIdsCommandInput | ListSecretsCommandInput | PutResourcePolicyCommandInput | PutSecretValueCommandInput | RemoveRegionsFromReplicationCommandInput | ReplicateSecretToRegionsCommandInput | RestoreSecretCommandInput | RotateSecretCommandInput | StopReplicationToReplicaCommandInput | TagResourceCommandInput | UntagResourceCommandInput | UpdateSecretCommandInput | UpdateSecretVersionStageCommandInput | ValidateResourcePolicyCommandInput;
/**
 * @public
 */
export type ServiceOutputTypes = BatchGetSecretValueCommandOutput | CancelRotateSecretCommandOutput | CreateSecretCommandOutput | DeleteResourcePolicyCommandOutput | DeleteSecretCommandOutput | DescribeSecretCommandOutput | GetRandomPasswordCommandOutput | GetResourcePolicyCommandOutput | GetSecretValueCommandOutput | ListSecretVersionIdsCommandOutput | ListSecretsCommandOutput | PutResourcePolicyCommandOutput | PutSecretValueCommandOutput | RemoveRegionsFromReplicationCommandOutput | ReplicateSecretToRegionsCommandOutput | RestoreSecretCommandOutput | RotateSecretCommandOutput | StopReplicationToReplicaCommandOutput | TagResourceCommandOutput | UntagResourceCommandOutput | UpdateSecretCommandOutput | UpdateSecretVersionStageCommandOutput | ValidateResourcePolicyCommandOutput;
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
     * The {@link @smithy/smithy-client#DefaultsMode} that will be used to determine how certain default configuration options are resolved in the SDK.
     */
    defaultsMode?: __DefaultsMode | __Provider<__DefaultsMode>;
}
/**
 * @public
 */
export type SecretsManagerClientConfigType = Partial<__SmithyConfiguration<__HttpHandlerOptions>> & ClientDefaults & UserAgentInputConfig & RetryInputConfig & RegionInputConfig & HostHeaderInputConfig & EndpointInputConfig<EndpointParameters> & HttpAuthSchemeInputConfig & ClientInputEndpointParameters;
/**
 * @public
 *
 *  The configuration interface of SecretsManagerClient class constructor that set the region, credentials and other options.
 */
export interface SecretsManagerClientConfig extends SecretsManagerClientConfigType {
}
/**
 * @public
 */
export type SecretsManagerClientResolvedConfigType = __SmithyResolvedConfiguration<__HttpHandlerOptions> & Required<ClientDefaults> & RuntimeExtensionsConfig & UserAgentResolvedConfig & RetryResolvedConfig & RegionResolvedConfig & HostHeaderResolvedConfig & EndpointResolvedConfig<EndpointParameters> & HttpAuthSchemeResolvedConfig & ClientResolvedEndpointParameters;
/**
 * @public
 *
 *  The resolved configuration interface of SecretsManagerClient class. This is resolved and normalized from the {@link SecretsManagerClientConfig | constructor configuration interface}.
 */
export interface SecretsManagerClientResolvedConfig extends SecretsManagerClientResolvedConfigType {
}
/**
 * <fullname>Amazon Web Services Secrets Manager</fullname>
 *          <p>Amazon Web Services Secrets Manager provides a service to enable you to store, manage, and retrieve, secrets.</p>
 *          <p>This guide provides descriptions of the Secrets Manager API. For more information about using this
 *       service, see the <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/introduction.html">Amazon Web Services Secrets Manager User Guide</a>.</p>
 *          <p>
 *             <b>API Version</b>
 *          </p>
 *          <p>This version of the Secrets Manager API Reference documents the Secrets Manager API version 2017-10-17.</p>
 *          <p>For a list of endpoints, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/asm_access.html#endpoints">Amazon Web Services Secrets Manager
 *       endpoints</a>.</p>
 *          <p>
 *             <b>Support and Feedback for Amazon Web Services Secrets Manager</b>
 *          </p>
 *          <p>We welcome your feedback. Send your comments to <a href="mailto:awssecretsmanager-feedback@amazon.com">awssecretsmanager-feedback@amazon.com</a>, or post your feedback and questions in the <a href="http://forums.aws.amazon.com/forum.jspa?forumID=296">Amazon Web Services Secrets Manager Discussion Forum</a>. For more
 *       information about the Amazon Web Services Discussion Forums, see <a href="http://forums.aws.amazon.com/help.jspa">Forums
 *         Help</a>.</p>
 *          <p>
 *             <b>Logging API Requests</b>
 *          </p>
 *          <p>Amazon Web Services Secrets Manager supports Amazon Web Services CloudTrail, a service that records Amazon Web Services API calls for your Amazon Web Services
 *       account and delivers log files to an Amazon S3 bucket. By using information that's collected
 *       by Amazon Web Services CloudTrail, you can determine the requests successfully made to Secrets Manager, who made the
 *       request, when it was made, and so on. For more about Amazon Web Services Secrets Manager and support for Amazon Web Services
 *       CloudTrail, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/monitoring.html#monitoring_cloudtrail">Logging
 *         Amazon Web Services Secrets Manager Events with Amazon Web Services CloudTrail</a> in the <i>Amazon Web Services Secrets Manager User Guide</i>.
 *       To learn more about CloudTrail, including enabling it and find your log files, see the <a href="https://docs.aws.amazon.com/awscloudtrail/latest/userguide/what_is_cloud_trail_top_level.html">Amazon Web Services CloudTrail User Guide</a>.</p>
 * @public
 */
export declare class SecretsManagerClient extends __Client<__HttpHandlerOptions, ServiceInputTypes, ServiceOutputTypes, SecretsManagerClientResolvedConfig> {
    /**
     * The resolved configuration of SecretsManagerClient class. This is resolved and normalized from the {@link SecretsManagerClientConfig | constructor configuration interface}.
     */
    readonly config: SecretsManagerClientResolvedConfig;
    constructor(...[configuration]: __CheckOptionalClientConfig<SecretsManagerClientConfig>);
    /**
     * Destroy underlying resources, like sockets. It's usually not necessary to do this.
     * However in Node.js, it's best to explicitly shut down the client's agent when it is no longer needed.
     * Otherwise, sockets might stay open for quite a long time before the server terminates them.
     */
    destroy(): void;
}
