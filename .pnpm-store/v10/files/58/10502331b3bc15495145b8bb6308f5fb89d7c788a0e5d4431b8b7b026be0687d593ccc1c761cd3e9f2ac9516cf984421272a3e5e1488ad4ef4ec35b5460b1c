import { EventStreamInputConfig, EventStreamResolvedConfig } from "@aws-sdk/middleware-eventstream";
import { HostHeaderInputConfig, HostHeaderResolvedConfig } from "@aws-sdk/middleware-host-header";
import { UserAgentInputConfig, UserAgentResolvedConfig } from "@aws-sdk/middleware-user-agent";
import { WebSocketInputConfig, WebSocketResolvedConfig } from "@aws-sdk/middleware-websocket";
import { EventStreamPayloadHandlerProvider as __EventStreamPayloadHandlerProvider } from "@aws-sdk/types";
import { RegionInputConfig, RegionResolvedConfig } from "@smithy/config-resolver";
import { EventStreamSerdeInputConfig, EventStreamSerdeResolvedConfig } from "@smithy/eventstream-serde-config-resolver";
import { EndpointInputConfig, EndpointResolvedConfig } from "@smithy/middleware-endpoint";
import { RetryInputConfig, RetryResolvedConfig } from "@smithy/middleware-retry";
import { HttpHandlerUserInput as __HttpHandlerUserInput } from "@smithy/protocol-http";
import { Client as __Client, DefaultsMode as __DefaultsMode, SmithyConfiguration as __SmithyConfiguration, SmithyResolvedConfiguration as __SmithyResolvedConfiguration } from "@smithy/smithy-client";
import { AwsCredentialIdentityProvider, BodyLengthCalculator as __BodyLengthCalculator, CheckOptionalClientConfig as __CheckOptionalClientConfig, ChecksumConstructor as __ChecksumConstructor, ClientProtocol, Decoder as __Decoder, Encoder as __Encoder, EventStreamSerdeProvider as __EventStreamSerdeProvider, HashConstructor as __HashConstructor, HttpHandlerOptions as __HttpHandlerOptions, HttpRequest, HttpResponse, Logger as __Logger, Provider as __Provider, Provider, StreamCollector as __StreamCollector, UrlParser as __UrlParser, UserAgent as __UserAgent } from "@smithy/types";
import { HttpAuthSchemeInputConfig, HttpAuthSchemeResolvedConfig } from "./auth/httpAuthSchemeProvider";
import { ApplyGuardrailCommandInput, ApplyGuardrailCommandOutput } from "./commands/ApplyGuardrailCommand";
import { ConverseCommandInput, ConverseCommandOutput } from "./commands/ConverseCommand";
import { ConverseStreamCommandInput, ConverseStreamCommandOutput } from "./commands/ConverseStreamCommand";
import { CountTokensCommandInput, CountTokensCommandOutput } from "./commands/CountTokensCommand";
import { GetAsyncInvokeCommandInput, GetAsyncInvokeCommandOutput } from "./commands/GetAsyncInvokeCommand";
import { InvokeModelCommandInput, InvokeModelCommandOutput } from "./commands/InvokeModelCommand";
import { InvokeModelWithBidirectionalStreamCommandInput, InvokeModelWithBidirectionalStreamCommandOutput } from "./commands/InvokeModelWithBidirectionalStreamCommand";
import { InvokeModelWithResponseStreamCommandInput, InvokeModelWithResponseStreamCommandOutput } from "./commands/InvokeModelWithResponseStreamCommand";
import { ListAsyncInvokesCommandInput, ListAsyncInvokesCommandOutput } from "./commands/ListAsyncInvokesCommand";
import { StartAsyncInvokeCommandInput, StartAsyncInvokeCommandOutput } from "./commands/StartAsyncInvokeCommand";
import { ClientInputEndpointParameters, ClientResolvedEndpointParameters, EndpointParameters } from "./endpoint/EndpointParameters";
import { RuntimeExtension, RuntimeExtensionsConfig } from "./runtimeExtensions";
export { __Client };
/**
 * @public
 */
export type ServiceInputTypes = ApplyGuardrailCommandInput | ConverseCommandInput | ConverseStreamCommandInput | CountTokensCommandInput | GetAsyncInvokeCommandInput | InvokeModelCommandInput | InvokeModelWithBidirectionalStreamCommandInput | InvokeModelWithResponseStreamCommandInput | ListAsyncInvokesCommandInput | StartAsyncInvokeCommandInput;
/**
 * @public
 */
export type ServiceOutputTypes = ApplyGuardrailCommandOutput | ConverseCommandOutput | ConverseStreamCommandOutput | CountTokensCommandOutput | GetAsyncInvokeCommandOutput | InvokeModelCommandOutput | InvokeModelWithBidirectionalStreamCommandOutput | InvokeModelWithResponseStreamCommandOutput | ListAsyncInvokesCommandOutput | StartAsyncInvokeCommandOutput;
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
     * The protocol controlling the message type (e.g. HTTP) and format (e.g. JSON)
     * may be overridden. A default will always be set by the client.
     * Available options depend on the service's supported protocols and will not be validated by
     * the client.
     * @alpha
     *
     */
    protocol?: ClientProtocol<HttpRequest, HttpResponse>;
    /**
     * The function that provides necessary utilities for generating and parsing event stream
     */
    eventStreamSerdeProvider?: __EventStreamSerdeProvider;
    /**
     * The {@link @smithy/smithy-client#DefaultsMode} that will be used to determine how certain default configuration options are resolved in the SDK.
     */
    defaultsMode?: __DefaultsMode | __Provider<__DefaultsMode>;
    /**
     * The function that provides necessary utilities for handling request event stream.
     * @internal
     */
    eventStreamPayloadHandlerProvider?: __EventStreamPayloadHandlerProvider;
}
/**
 * @public
 */
export type BedrockRuntimeClientConfigType = Partial<__SmithyConfiguration<__HttpHandlerOptions>> & ClientDefaults & UserAgentInputConfig & RetryInputConfig & RegionInputConfig & HostHeaderInputConfig & EndpointInputConfig<EndpointParameters> & EventStreamSerdeInputConfig & HttpAuthSchemeInputConfig & EventStreamInputConfig & WebSocketInputConfig & ClientInputEndpointParameters;
/**
 * @public
 *
 *  The configuration interface of BedrockRuntimeClient class constructor that set the region, credentials and other options.
 */
export interface BedrockRuntimeClientConfig extends BedrockRuntimeClientConfigType {
}
/**
 * @public
 */
export type BedrockRuntimeClientResolvedConfigType = __SmithyResolvedConfiguration<__HttpHandlerOptions> & Required<ClientDefaults> & RuntimeExtensionsConfig & UserAgentResolvedConfig & RetryResolvedConfig & RegionResolvedConfig & HostHeaderResolvedConfig & EndpointResolvedConfig<EndpointParameters> & EventStreamSerdeResolvedConfig & HttpAuthSchemeResolvedConfig & EventStreamResolvedConfig & WebSocketResolvedConfig & ClientResolvedEndpointParameters;
/**
 * @public
 *
 *  The resolved configuration interface of BedrockRuntimeClient class. This is resolved and normalized from the {@link BedrockRuntimeClientConfig | constructor configuration interface}.
 */
export interface BedrockRuntimeClientResolvedConfig extends BedrockRuntimeClientResolvedConfigType {
}
/**
 * <p>Describes the API operations for running inference using Amazon Bedrock models.</p>
 * @public
 */
export declare class BedrockRuntimeClient extends __Client<__HttpHandlerOptions, ServiceInputTypes, ServiceOutputTypes, BedrockRuntimeClientResolvedConfig> {
    /**
     * The resolved configuration of BedrockRuntimeClient class. This is resolved and normalized from the {@link BedrockRuntimeClientConfig | constructor configuration interface}.
     */
    readonly config: BedrockRuntimeClientResolvedConfig;
    constructor(...[configuration]: __CheckOptionalClientConfig<BedrockRuntimeClientConfig>);
    /**
     * Destroy underlying resources, like sockets. It's usually not necessary to do this.
     * However in Node.js, it's best to explicitly shut down the client's agent when it is no longer needed.
     * Otherwise, sockets might stay open for quite a long time before the server terminates them.
     */
    destroy(): void;
}
