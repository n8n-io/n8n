import {
  EventStreamInputConfig,
  EventStreamResolvedConfig,
} from "@aws-sdk/middleware-eventstream";
import {
  HostHeaderInputConfig,
  HostHeaderResolvedConfig,
} from "@aws-sdk/middleware-host-header";
import {
  UserAgentInputConfig,
  UserAgentResolvedConfig,
} from "@aws-sdk/middleware-user-agent";
import {
  WebSocketInputConfig,
  WebSocketResolvedConfig,
} from "@aws-sdk/middleware-websocket";
import { EventStreamPayloadHandlerProvider as __EventStreamPayloadHandlerProvider } from "@aws-sdk/types";
import {
  RegionInputConfig,
  RegionResolvedConfig,
} from "@smithy/config-resolver";
import {
  EventStreamSerdeInputConfig,
  EventStreamSerdeResolvedConfig,
} from "@smithy/eventstream-serde-config-resolver";
import {
  EndpointInputConfig,
  EndpointResolvedConfig,
} from "@smithy/middleware-endpoint";
import {
  RetryInputConfig,
  RetryResolvedConfig,
} from "@smithy/middleware-retry";
import { HttpHandlerUserInput as __HttpHandlerUserInput } from "@smithy/protocol-http";
import {
  DefaultsMode as __DefaultsMode,
  SmithyConfiguration as __SmithyConfiguration,
  SmithyResolvedConfiguration as __SmithyResolvedConfiguration,
  Client as __Client,
} from "@smithy/smithy-client";
import {
  BodyLengthCalculator as __BodyLengthCalculator,
  CheckOptionalClientConfig as __CheckOptionalClientConfig,
  ChecksumConstructor as __ChecksumConstructor,
  Decoder as __Decoder,
  Encoder as __Encoder,
  EventStreamSerdeProvider as __EventStreamSerdeProvider,
  HashConstructor as __HashConstructor,
  HttpHandlerOptions as __HttpHandlerOptions,
  Logger as __Logger,
  Provider as __Provider,
  StreamCollector as __StreamCollector,
  UrlParser as __UrlParser,
  AwsCredentialIdentityProvider,
  Provider,
  UserAgent as __UserAgent,
} from "@smithy/types";
import {
  HttpAuthSchemeInputConfig,
  HttpAuthSchemeResolvedConfig,
} from "./auth/httpAuthSchemeProvider";
import {
  ApplyGuardrailCommandInput,
  ApplyGuardrailCommandOutput,
} from "./commands/ApplyGuardrailCommand";
import {
  ConverseCommandInput,
  ConverseCommandOutput,
} from "./commands/ConverseCommand";
import {
  ConverseStreamCommandInput,
  ConverseStreamCommandOutput,
} from "./commands/ConverseStreamCommand";
import {
  CountTokensCommandInput,
  CountTokensCommandOutput,
} from "./commands/CountTokensCommand";
import {
  GetAsyncInvokeCommandInput,
  GetAsyncInvokeCommandOutput,
} from "./commands/GetAsyncInvokeCommand";
import {
  InvokeModelCommandInput,
  InvokeModelCommandOutput,
} from "./commands/InvokeModelCommand";
import {
  InvokeModelWithBidirectionalStreamCommandInput,
  InvokeModelWithBidirectionalStreamCommandOutput,
} from "./commands/InvokeModelWithBidirectionalStreamCommand";
import {
  InvokeModelWithResponseStreamCommandInput,
  InvokeModelWithResponseStreamCommandOutput,
} from "./commands/InvokeModelWithResponseStreamCommand";
import {
  ListAsyncInvokesCommandInput,
  ListAsyncInvokesCommandOutput,
} from "./commands/ListAsyncInvokesCommand";
import {
  StartAsyncInvokeCommandInput,
  StartAsyncInvokeCommandOutput,
} from "./commands/StartAsyncInvokeCommand";
import {
  ClientInputEndpointParameters,
  ClientResolvedEndpointParameters,
  EndpointParameters,
} from "./endpoint/EndpointParameters";
import { RuntimeExtension, RuntimeExtensionsConfig } from "./runtimeExtensions";
export { __Client };
export type ServiceInputTypes =
  | ApplyGuardrailCommandInput
  | ConverseCommandInput
  | ConverseStreamCommandInput
  | CountTokensCommandInput
  | GetAsyncInvokeCommandInput
  | InvokeModelCommandInput
  | InvokeModelWithBidirectionalStreamCommandInput
  | InvokeModelWithResponseStreamCommandInput
  | ListAsyncInvokesCommandInput
  | StartAsyncInvokeCommandInput;
export type ServiceOutputTypes =
  | ApplyGuardrailCommandOutput
  | ConverseCommandOutput
  | ConverseStreamCommandOutput
  | CountTokensCommandOutput
  | GetAsyncInvokeCommandOutput
  | InvokeModelCommandOutput
  | InvokeModelWithBidirectionalStreamCommandOutput
  | InvokeModelWithResponseStreamCommandOutput
  | ListAsyncInvokesCommandOutput
  | StartAsyncInvokeCommandOutput;
export interface ClientDefaults
  extends Partial<__SmithyConfiguration<__HttpHandlerOptions>> {
  requestHandler?: __HttpHandlerUserInput;
  sha256?: __ChecksumConstructor | __HashConstructor;
  urlParser?: __UrlParser;
  bodyLengthChecker?: __BodyLengthCalculator;
  streamCollector?: __StreamCollector;
  base64Decoder?: __Decoder;
  base64Encoder?: __Encoder;
  utf8Decoder?: __Decoder;
  utf8Encoder?: __Encoder;
  runtime?: string;
  disableHostPrefix?: boolean;
  serviceId?: string;
  useDualstackEndpoint?: boolean | __Provider<boolean>;
  useFipsEndpoint?: boolean | __Provider<boolean>;
  region?: string | __Provider<string>;
  profile?: string;
  defaultUserAgentProvider?: Provider<__UserAgent>;
  credentialDefaultProvider?: (input: any) => AwsCredentialIdentityProvider;
  maxAttempts?: number | __Provider<number>;
  retryMode?: string | __Provider<string>;
  logger?: __Logger;
  extensions?: RuntimeExtension[];
  eventStreamSerdeProvider?: __EventStreamSerdeProvider;
  defaultsMode?: __DefaultsMode | __Provider<__DefaultsMode>;
  eventStreamPayloadHandlerProvider?: __EventStreamPayloadHandlerProvider;
}
export type BedrockRuntimeClientConfigType = Partial<
  __SmithyConfiguration<__HttpHandlerOptions>
> &
  ClientDefaults &
  UserAgentInputConfig &
  RetryInputConfig &
  RegionInputConfig &
  HostHeaderInputConfig &
  EndpointInputConfig<EndpointParameters> &
  EventStreamSerdeInputConfig &
  HttpAuthSchemeInputConfig &
  EventStreamInputConfig &
  WebSocketInputConfig &
  ClientInputEndpointParameters;
export interface BedrockRuntimeClientConfig
  extends BedrockRuntimeClientConfigType {}
export type BedrockRuntimeClientResolvedConfigType =
  __SmithyResolvedConfiguration<__HttpHandlerOptions> &
    Required<ClientDefaults> &
    RuntimeExtensionsConfig &
    UserAgentResolvedConfig &
    RetryResolvedConfig &
    RegionResolvedConfig &
    HostHeaderResolvedConfig &
    EndpointResolvedConfig<EndpointParameters> &
    EventStreamSerdeResolvedConfig &
    HttpAuthSchemeResolvedConfig &
    EventStreamResolvedConfig &
    WebSocketResolvedConfig &
    ClientResolvedEndpointParameters;
export interface BedrockRuntimeClientResolvedConfig
  extends BedrockRuntimeClientResolvedConfigType {}
export declare class BedrockRuntimeClient extends __Client<
  __HttpHandlerOptions,
  ServiceInputTypes,
  ServiceOutputTypes,
  BedrockRuntimeClientResolvedConfig
> {
  readonly config: BedrockRuntimeClientResolvedConfig;
  constructor(
    ...[configuration]: __CheckOptionalClientConfig<BedrockRuntimeClientConfig>
  );
  destroy(): void;
}
