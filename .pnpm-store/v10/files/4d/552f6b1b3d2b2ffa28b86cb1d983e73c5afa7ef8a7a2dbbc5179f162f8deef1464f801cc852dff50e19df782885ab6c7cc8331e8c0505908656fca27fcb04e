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
  EndpointInputConfig,
  EndpointResolvedConfig,
} from "@smithy/middleware-endpoint";
import {
  RetryInputConfig,
  RetryResolvedConfig,
} from "@smithy/middleware-retry";
import { HttpHandlerUserInput as __HttpHandlerUserInput } from "@smithy/protocol-http";
import {
  Client as __Client,
  DefaultsMode as __DefaultsMode,
  SmithyConfiguration as __SmithyConfiguration,
  SmithyResolvedConfiguration as __SmithyResolvedConfiguration,
} from "@smithy/smithy-client";
import {
  AwsCredentialIdentityProvider,
  BodyLengthCalculator as __BodyLengthCalculator,
  CheckOptionalClientConfig as __CheckOptionalClientConfig,
  ChecksumConstructor as __ChecksumConstructor,
  Decoder as __Decoder,
  Encoder as __Encoder,
  HashConstructor as __HashConstructor,
  HttpHandlerOptions as __HttpHandlerOptions,
  Logger as __Logger,
  Provider as __Provider,
  Provider,
  StreamCollector as __StreamCollector,
  UrlParser as __UrlParser,
  UserAgent as __UserAgent,
} from "@smithy/types";
import {
  HttpAuthSchemeInputConfig,
  HttpAuthSchemeResolvedConfig,
} from "./auth/httpAuthSchemeProvider";
import {
  BatchGetSecretValueCommandInput,
  BatchGetSecretValueCommandOutput,
} from "./commands/BatchGetSecretValueCommand";
import {
  CancelRotateSecretCommandInput,
  CancelRotateSecretCommandOutput,
} from "./commands/CancelRotateSecretCommand";
import {
  CreateSecretCommandInput,
  CreateSecretCommandOutput,
} from "./commands/CreateSecretCommand";
import {
  DeleteResourcePolicyCommandInput,
  DeleteResourcePolicyCommandOutput,
} from "./commands/DeleteResourcePolicyCommand";
import {
  DeleteSecretCommandInput,
  DeleteSecretCommandOutput,
} from "./commands/DeleteSecretCommand";
import {
  DescribeSecretCommandInput,
  DescribeSecretCommandOutput,
} from "./commands/DescribeSecretCommand";
import {
  GetRandomPasswordCommandInput,
  GetRandomPasswordCommandOutput,
} from "./commands/GetRandomPasswordCommand";
import {
  GetResourcePolicyCommandInput,
  GetResourcePolicyCommandOutput,
} from "./commands/GetResourcePolicyCommand";
import {
  GetSecretValueCommandInput,
  GetSecretValueCommandOutput,
} from "./commands/GetSecretValueCommand";
import {
  ListSecretsCommandInput,
  ListSecretsCommandOutput,
} from "./commands/ListSecretsCommand";
import {
  ListSecretVersionIdsCommandInput,
  ListSecretVersionIdsCommandOutput,
} from "./commands/ListSecretVersionIdsCommand";
import {
  PutResourcePolicyCommandInput,
  PutResourcePolicyCommandOutput,
} from "./commands/PutResourcePolicyCommand";
import {
  PutSecretValueCommandInput,
  PutSecretValueCommandOutput,
} from "./commands/PutSecretValueCommand";
import {
  RemoveRegionsFromReplicationCommandInput,
  RemoveRegionsFromReplicationCommandOutput,
} from "./commands/RemoveRegionsFromReplicationCommand";
import {
  ReplicateSecretToRegionsCommandInput,
  ReplicateSecretToRegionsCommandOutput,
} from "./commands/ReplicateSecretToRegionsCommand";
import {
  RestoreSecretCommandInput,
  RestoreSecretCommandOutput,
} from "./commands/RestoreSecretCommand";
import {
  RotateSecretCommandInput,
  RotateSecretCommandOutput,
} from "./commands/RotateSecretCommand";
import {
  StopReplicationToReplicaCommandInput,
  StopReplicationToReplicaCommandOutput,
} from "./commands/StopReplicationToReplicaCommand";
import {
  TagResourceCommandInput,
  TagResourceCommandOutput,
} from "./commands/TagResourceCommand";
import {
  UntagResourceCommandInput,
  UntagResourceCommandOutput,
} from "./commands/UntagResourceCommand";
import {
  UpdateSecretCommandInput,
  UpdateSecretCommandOutput,
} from "./commands/UpdateSecretCommand";
import {
  UpdateSecretVersionStageCommandInput,
  UpdateSecretVersionStageCommandOutput,
} from "./commands/UpdateSecretVersionStageCommand";
import {
  ValidateResourcePolicyCommandInput,
  ValidateResourcePolicyCommandOutput,
} from "./commands/ValidateResourcePolicyCommand";
import {
  ClientInputEndpointParameters,
  ClientResolvedEndpointParameters,
  EndpointParameters,
} from "./endpoint/EndpointParameters";
import { RuntimeExtension, RuntimeExtensionsConfig } from "./runtimeExtensions";
export { __Client };
export type ServiceInputTypes =
  | BatchGetSecretValueCommandInput
  | CancelRotateSecretCommandInput
  | CreateSecretCommandInput
  | DeleteResourcePolicyCommandInput
  | DeleteSecretCommandInput
  | DescribeSecretCommandInput
  | GetRandomPasswordCommandInput
  | GetResourcePolicyCommandInput
  | GetSecretValueCommandInput
  | ListSecretVersionIdsCommandInput
  | ListSecretsCommandInput
  | PutResourcePolicyCommandInput
  | PutSecretValueCommandInput
  | RemoveRegionsFromReplicationCommandInput
  | ReplicateSecretToRegionsCommandInput
  | RestoreSecretCommandInput
  | RotateSecretCommandInput
  | StopReplicationToReplicaCommandInput
  | TagResourceCommandInput
  | UntagResourceCommandInput
  | UpdateSecretCommandInput
  | UpdateSecretVersionStageCommandInput
  | ValidateResourcePolicyCommandInput;
export type ServiceOutputTypes =
  | BatchGetSecretValueCommandOutput
  | CancelRotateSecretCommandOutput
  | CreateSecretCommandOutput
  | DeleteResourcePolicyCommandOutput
  | DeleteSecretCommandOutput
  | DescribeSecretCommandOutput
  | GetRandomPasswordCommandOutput
  | GetResourcePolicyCommandOutput
  | GetSecretValueCommandOutput
  | ListSecretVersionIdsCommandOutput
  | ListSecretsCommandOutput
  | PutResourcePolicyCommandOutput
  | PutSecretValueCommandOutput
  | RemoveRegionsFromReplicationCommandOutput
  | ReplicateSecretToRegionsCommandOutput
  | RestoreSecretCommandOutput
  | RotateSecretCommandOutput
  | StopReplicationToReplicaCommandOutput
  | TagResourceCommandOutput
  | UntagResourceCommandOutput
  | UpdateSecretCommandOutput
  | UpdateSecretVersionStageCommandOutput
  | ValidateResourcePolicyCommandOutput;
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
  defaultsMode?: __DefaultsMode | __Provider<__DefaultsMode>;
}
export type SecretsManagerClientConfigType = Partial<
  __SmithyConfiguration<__HttpHandlerOptions>
> &
  ClientDefaults &
  UserAgentInputConfig &
  RetryInputConfig &
  RegionInputConfig &
  HostHeaderInputConfig &
  EndpointInputConfig<EndpointParameters> &
  HttpAuthSchemeInputConfig &
  ClientInputEndpointParameters;
export interface SecretsManagerClientConfig
  extends SecretsManagerClientConfigType {}
export type SecretsManagerClientResolvedConfigType =
  __SmithyResolvedConfiguration<__HttpHandlerOptions> &
    Required<ClientDefaults> &
    RuntimeExtensionsConfig &
    UserAgentResolvedConfig &
    RetryResolvedConfig &
    RegionResolvedConfig &
    HostHeaderResolvedConfig &
    EndpointResolvedConfig<EndpointParameters> &
    HttpAuthSchemeResolvedConfig &
    ClientResolvedEndpointParameters;
export interface SecretsManagerClientResolvedConfig
  extends SecretsManagerClientResolvedConfigType {}
export declare class SecretsManagerClient extends __Client<
  __HttpHandlerOptions,
  ServiceInputTypes,
  ServiceOutputTypes,
  SecretsManagerClientResolvedConfig
> {
  readonly config: SecretsManagerClientResolvedConfig;
  constructor(
    ...[configuration]: __CheckOptionalClientConfig<SecretsManagerClientConfig>
  );
  destroy(): void;
}
