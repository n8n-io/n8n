import {
  HostHeaderInputConfig,
  HostHeaderResolvedConfig,
} from "@aws-sdk/middleware-host-header";
import {
  UserAgentInputConfig,
  UserAgentResolvedConfig,
} from "@aws-sdk/middleware-user-agent";
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
  CreateInvocationCommandInput,
  CreateInvocationCommandOutput,
} from "./commands/CreateInvocationCommand";
import {
  CreateSessionCommandInput,
  CreateSessionCommandOutput,
} from "./commands/CreateSessionCommand";
import {
  DeleteAgentMemoryCommandInput,
  DeleteAgentMemoryCommandOutput,
} from "./commands/DeleteAgentMemoryCommand";
import {
  DeleteSessionCommandInput,
  DeleteSessionCommandOutput,
} from "./commands/DeleteSessionCommand";
import {
  EndSessionCommandInput,
  EndSessionCommandOutput,
} from "./commands/EndSessionCommand";
import {
  GenerateQueryCommandInput,
  GenerateQueryCommandOutput,
} from "./commands/GenerateQueryCommand";
import {
  GetAgentMemoryCommandInput,
  GetAgentMemoryCommandOutput,
} from "./commands/GetAgentMemoryCommand";
import {
  GetExecutionFlowSnapshotCommandInput,
  GetExecutionFlowSnapshotCommandOutput,
} from "./commands/GetExecutionFlowSnapshotCommand";
import {
  GetFlowExecutionCommandInput,
  GetFlowExecutionCommandOutput,
} from "./commands/GetFlowExecutionCommand";
import {
  GetInvocationStepCommandInput,
  GetInvocationStepCommandOutput,
} from "./commands/GetInvocationStepCommand";
import {
  GetSessionCommandInput,
  GetSessionCommandOutput,
} from "./commands/GetSessionCommand";
import {
  InvokeAgentCommandInput,
  InvokeAgentCommandOutput,
} from "./commands/InvokeAgentCommand";
import {
  InvokeFlowCommandInput,
  InvokeFlowCommandOutput,
} from "./commands/InvokeFlowCommand";
import {
  InvokeInlineAgentCommandInput,
  InvokeInlineAgentCommandOutput,
} from "./commands/InvokeInlineAgentCommand";
import {
  ListFlowExecutionEventsCommandInput,
  ListFlowExecutionEventsCommandOutput,
} from "./commands/ListFlowExecutionEventsCommand";
import {
  ListFlowExecutionsCommandInput,
  ListFlowExecutionsCommandOutput,
} from "./commands/ListFlowExecutionsCommand";
import {
  ListInvocationsCommandInput,
  ListInvocationsCommandOutput,
} from "./commands/ListInvocationsCommand";
import {
  ListInvocationStepsCommandInput,
  ListInvocationStepsCommandOutput,
} from "./commands/ListInvocationStepsCommand";
import {
  ListSessionsCommandInput,
  ListSessionsCommandOutput,
} from "./commands/ListSessionsCommand";
import {
  ListTagsForResourceCommandInput,
  ListTagsForResourceCommandOutput,
} from "./commands/ListTagsForResourceCommand";
import {
  OptimizePromptCommandInput,
  OptimizePromptCommandOutput,
} from "./commands/OptimizePromptCommand";
import {
  PutInvocationStepCommandInput,
  PutInvocationStepCommandOutput,
} from "./commands/PutInvocationStepCommand";
import {
  RerankCommandInput,
  RerankCommandOutput,
} from "./commands/RerankCommand";
import {
  RetrieveAndGenerateCommandInput,
  RetrieveAndGenerateCommandOutput,
} from "./commands/RetrieveAndGenerateCommand";
import {
  RetrieveAndGenerateStreamCommandInput,
  RetrieveAndGenerateStreamCommandOutput,
} from "./commands/RetrieveAndGenerateStreamCommand";
import {
  RetrieveCommandInput,
  RetrieveCommandOutput,
} from "./commands/RetrieveCommand";
import {
  StartFlowExecutionCommandInput,
  StartFlowExecutionCommandOutput,
} from "./commands/StartFlowExecutionCommand";
import {
  StopFlowExecutionCommandInput,
  StopFlowExecutionCommandOutput,
} from "./commands/StopFlowExecutionCommand";
import {
  TagResourceCommandInput,
  TagResourceCommandOutput,
} from "./commands/TagResourceCommand";
import {
  UntagResourceCommandInput,
  UntagResourceCommandOutput,
} from "./commands/UntagResourceCommand";
import {
  UpdateSessionCommandInput,
  UpdateSessionCommandOutput,
} from "./commands/UpdateSessionCommand";
import {
  ClientInputEndpointParameters,
  ClientResolvedEndpointParameters,
  EndpointParameters,
} from "./endpoint/EndpointParameters";
import { RuntimeExtension, RuntimeExtensionsConfig } from "./runtimeExtensions";
export { __Client };
export type ServiceInputTypes =
  | CreateInvocationCommandInput
  | CreateSessionCommandInput
  | DeleteAgentMemoryCommandInput
  | DeleteSessionCommandInput
  | EndSessionCommandInput
  | GenerateQueryCommandInput
  | GetAgentMemoryCommandInput
  | GetExecutionFlowSnapshotCommandInput
  | GetFlowExecutionCommandInput
  | GetInvocationStepCommandInput
  | GetSessionCommandInput
  | InvokeAgentCommandInput
  | InvokeFlowCommandInput
  | InvokeInlineAgentCommandInput
  | ListFlowExecutionEventsCommandInput
  | ListFlowExecutionsCommandInput
  | ListInvocationStepsCommandInput
  | ListInvocationsCommandInput
  | ListSessionsCommandInput
  | ListTagsForResourceCommandInput
  | OptimizePromptCommandInput
  | PutInvocationStepCommandInput
  | RerankCommandInput
  | RetrieveAndGenerateCommandInput
  | RetrieveAndGenerateStreamCommandInput
  | RetrieveCommandInput
  | StartFlowExecutionCommandInput
  | StopFlowExecutionCommandInput
  | TagResourceCommandInput
  | UntagResourceCommandInput
  | UpdateSessionCommandInput;
export type ServiceOutputTypes =
  | CreateInvocationCommandOutput
  | CreateSessionCommandOutput
  | DeleteAgentMemoryCommandOutput
  | DeleteSessionCommandOutput
  | EndSessionCommandOutput
  | GenerateQueryCommandOutput
  | GetAgentMemoryCommandOutput
  | GetExecutionFlowSnapshotCommandOutput
  | GetFlowExecutionCommandOutput
  | GetInvocationStepCommandOutput
  | GetSessionCommandOutput
  | InvokeAgentCommandOutput
  | InvokeFlowCommandOutput
  | InvokeInlineAgentCommandOutput
  | ListFlowExecutionEventsCommandOutput
  | ListFlowExecutionsCommandOutput
  | ListInvocationStepsCommandOutput
  | ListInvocationsCommandOutput
  | ListSessionsCommandOutput
  | ListTagsForResourceCommandOutput
  | OptimizePromptCommandOutput
  | PutInvocationStepCommandOutput
  | RerankCommandOutput
  | RetrieveAndGenerateCommandOutput
  | RetrieveAndGenerateStreamCommandOutput
  | RetrieveCommandOutput
  | StartFlowExecutionCommandOutput
  | StopFlowExecutionCommandOutput
  | TagResourceCommandOutput
  | UntagResourceCommandOutput
  | UpdateSessionCommandOutput;
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
}
export type BedrockAgentRuntimeClientConfigType = Partial<
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
  ClientInputEndpointParameters;
export interface BedrockAgentRuntimeClientConfig
  extends BedrockAgentRuntimeClientConfigType {}
export type BedrockAgentRuntimeClientResolvedConfigType =
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
    ClientResolvedEndpointParameters;
export interface BedrockAgentRuntimeClientResolvedConfig
  extends BedrockAgentRuntimeClientResolvedConfigType {}
export declare class BedrockAgentRuntimeClient extends __Client<
  __HttpHandlerOptions,
  ServiceInputTypes,
  ServiceOutputTypes,
  BedrockAgentRuntimeClientResolvedConfig
> {
  readonly config: BedrockAgentRuntimeClientResolvedConfig;
  constructor(
    ...[
      configuration,
    ]: __CheckOptionalClientConfig<BedrockAgentRuntimeClientConfig>
  );
  destroy(): void;
}
