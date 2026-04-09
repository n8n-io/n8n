import { type HostHeaderInputConfig, type HostHeaderResolvedConfig } from "@aws-sdk/middleware-host-header";
import { type UserAgentInputConfig, type UserAgentResolvedConfig } from "@aws-sdk/middleware-user-agent";
import { type RegionInputConfig, type RegionResolvedConfig } from "@smithy/config-resolver";
import { type EndpointInputConfig, type EndpointResolvedConfig } from "@smithy/middleware-endpoint";
import { type RetryInputConfig, type RetryResolvedConfig } from "@smithy/middleware-retry";
import type { HttpHandlerUserInput as __HttpHandlerUserInput } from "@smithy/protocol-http";
import { type DefaultsMode as __DefaultsMode, type SmithyConfiguration as __SmithyConfiguration, type SmithyResolvedConfiguration as __SmithyResolvedConfiguration, Client as __Client } from "@smithy/smithy-client";
import type { Provider, UserAgent as __UserAgent } from "@smithy/types";
import { type BodyLengthCalculator as __BodyLengthCalculator, type CheckOptionalClientConfig as __CheckOptionalClientConfig, type ChecksumConstructor as __ChecksumConstructor, type Decoder as __Decoder, type Encoder as __Encoder, type HashConstructor as __HashConstructor, type HttpHandlerOptions as __HttpHandlerOptions, type Logger as __Logger, type Provider as __Provider, type StreamCollector as __StreamCollector, type UrlParser as __UrlParser } from "@smithy/types";
import { type HttpAuthSchemeInputConfig, type HttpAuthSchemeResolvedConfig } from "./auth/httpAuthSchemeProvider";
import type { GetCredentialsForIdentityCommandInput, GetCredentialsForIdentityCommandOutput } from "./commands/GetCredentialsForIdentityCommand";
import type { GetIdCommandInput, GetIdCommandOutput } from "./commands/GetIdCommand";
import type { ClientInputEndpointParameters, ClientResolvedEndpointParameters, EndpointParameters } from "./endpoint/EndpointParameters";
import { type RuntimeExtension, type RuntimeExtensionsConfig } from "./runtimeExtensions";
export { __Client };
/**
 * @public
 */
export type ServiceInputTypes = GetCredentialsForIdentityCommandInput | GetIdCommandInput;
/**
 * @public
 */
export type ServiceOutputTypes = GetCredentialsForIdentityCommandOutput | GetIdCommandOutput;
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
export type CognitoIdentityClientConfigType = Partial<__SmithyConfiguration<__HttpHandlerOptions>> & ClientDefaults & UserAgentInputConfig & RetryInputConfig & RegionInputConfig & HostHeaderInputConfig & EndpointInputConfig<EndpointParameters> & HttpAuthSchemeInputConfig & ClientInputEndpointParameters;
/**
 * @public
 *
 *  The configuration interface of CognitoIdentityClient class constructor that set the region, credentials and other options.
 */
export interface CognitoIdentityClientConfig extends CognitoIdentityClientConfigType {
}
/**
 * @public
 */
export type CognitoIdentityClientResolvedConfigType = __SmithyResolvedConfiguration<__HttpHandlerOptions> & Required<ClientDefaults> & RuntimeExtensionsConfig & UserAgentResolvedConfig & RetryResolvedConfig & RegionResolvedConfig & HostHeaderResolvedConfig & EndpointResolvedConfig<EndpointParameters> & HttpAuthSchemeResolvedConfig & ClientResolvedEndpointParameters;
/**
 * @public
 *
 *  The resolved configuration interface of CognitoIdentityClient class. This is resolved and normalized from the {@link CognitoIdentityClientConfig | constructor configuration interface}.
 */
export interface CognitoIdentityClientResolvedConfig extends CognitoIdentityClientResolvedConfigType {
}
/**
 * <fullname>Amazon Cognito Federated Identities</fullname>
 *          <p>Amazon Cognito Federated Identities is a web service that delivers scoped temporary
 *          credentials to mobile devices and other untrusted environments. It uniquely identifies a
 *          device and supplies the user with a consistent identity over the lifetime of an
 *          application.</p>
 *          <p>Using Amazon Cognito Federated Identities, you can enable authentication with one or
 *          more third-party identity providers (Facebook, Google, or Login with Amazon) or an Amazon
 *          Cognito user pool, and you can also choose to support unauthenticated access from your app.
 *          Cognito delivers a unique identifier for each user and acts as an OpenID token provider
 *          trusted by Security Token Service (STS) to access temporary, limited-privilege Amazon Web Services credentials.</p>
 *          <p>For a description of the authentication flow from the Amazon Cognito Developer Guide
 *          see <a href="https://docs.aws.amazon.com/cognito/latest/developerguide/authentication-flow.html">Authentication
 *          Flow</a>.</p>
 *          <p>For more information see <a href="https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-identity.html">Amazon Cognito Federated
 *             Identities</a>.</p>
 * @public
 */
export declare class CognitoIdentityClient extends __Client<__HttpHandlerOptions, ServiceInputTypes, ServiceOutputTypes, CognitoIdentityClientResolvedConfig> {
    /**
     * The resolved configuration of CognitoIdentityClient class. This is resolved and normalized from the {@link CognitoIdentityClientConfig | constructor configuration interface}.
     */
    readonly config: CognitoIdentityClientResolvedConfig;
    constructor(...[configuration]: __CheckOptionalClientConfig<CognitoIdentityClientConfig>);
    /**
     * Destroy underlying resources, like sockets. It's usually not necessary to do this.
     * However in Node.js, it's best to explicitly shut down the client's agent when it is no longer needed.
     * Otherwise, sockets might stay open for quite a long time before the server terminates them.
     */
    destroy(): void;
}
