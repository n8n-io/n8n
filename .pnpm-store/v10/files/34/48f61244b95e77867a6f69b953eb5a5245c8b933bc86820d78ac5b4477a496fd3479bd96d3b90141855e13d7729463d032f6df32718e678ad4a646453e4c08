import {
  ActionSource,
  ActionStatus,
  ActivationState,
  AlgorithmSpecification,
  AlgorithmStatus,
  AlgorithmStatusDetails,
  AlgorithmValidationSpecification,
  AppNetworkAccessType,
  AppSecurityGroupManagement,
  AppSpecification,
  AppStatus,
  AppType,
  ArtifactSource,
  AsyncInferenceConfig,
  AthenaDatasetDefinition,
  AuthMode,
  AutoMLCandidate,
  AutoMLChannel,
  AutoMLComputeConfig,
  AutoMLDataSplitConfig,
  AutoMLJobArtifacts,
  AutoMLJobChannel,
  AutoMLJobCompletionCriteria,
  AutoMLJobConfig,
  AutoMLJobObjective,
  AutoMLJobSecondaryStatus,
  AutoMLJobStatus,
  AutoMLOutputDataConfig,
  AutoMLPartialFailureReason,
  AutoMLProblemTypeConfig,
  AutoMLProblemTypeConfigName,
  AutoMLResolvedAttributes,
  AutoMLSecurityConfig,
  BatchDataCaptureConfig,
  BatchStrategy,
  BatchTransformInput,
  CaptureStatus,
  Channel,
  CheckpointConfig,
  ClusterInstanceGroupDetails,
  ClusterNodeDetails,
  ClusterNodeRecovery,
  ClusterOrchestrator,
  ClusterStatus,
  CodeEditorAppImageConfig,
  CodeRepository,
  CognitoConfig,
  CognitoMemberDefinition,
  CollectionConfiguration,
  CompilationJobStatus,
  ComputeQuotaConfig,
  ComputeQuotaTarget,
  FeatureStatus,
  GitConfig,
  InferenceSpecification,
  JupyterLabAppImageConfig,
  KernelGatewayImageConfig,
  OutputDataConfig,
  ProblemType,
  ProcessingS3DataDistributionType,
  ProcessingS3InputMode,
  ProductionVariantInstanceType,
  ResourceConfig,
  ResourceSpec,
  SchedulerResourceStatus,
  StoppingCondition,
  Tag,
  TransformInput,
  TransformOutput,
  TransformResources,
  UserContext,
  VpcConfig,
} from "./models_0";
import {
  _InstanceType,
  ContextSource,
  DataCaptureConfig,
  DataQualityAppSpecification,
  DataQualityBaselineConfig,
  DataQualityJobInput,
  DefaultSpaceSettings,
  DeploymentConfig,
  DeviceSelectionConfig,
  DomainSettings,
  EdgeDeploymentConfig,
  EdgeDeploymentModelConfig,
  EdgeOutputConfig,
  EdgePresetDeploymentType,
  EndpointInput,
  ExplainerConfig,
  FeatureDefinition,
  FeatureType,
  FlowDefinitionOutputConfig,
  HumanLoopActivationConfig,
  HumanLoopConfig,
  HumanLoopRequestSource,
  InputConfig,
  JupyterServerAppSettings,
  KernelGatewayAppSettings,
  MetadataProperties,
  ModelDeployConfig,
  MonitoringAppSpecification,
  MonitoringBaselineConfig,
  MonitoringNetworkConfig,
  MonitoringOutputConfig,
  MonitoringResources,
  MonitoringStoppingCondition,
  NeoVpcConfig,
  OfflineStoreConfig,
  OnlineStoreConfig,
  OutputConfig,
  ProcessingInstanceType,
  ProcessingS3UploadMode,
  ProductionVariant,
  ProductionVariantAcceleratorType,
  ProductionVariantManagedInstanceScaling,
  ProductionVariantRoutingConfig,
  ProductionVariantServerlessConfig,
  RetryStrategy,
  SchedulerConfig,
  TagPropagation,
  ThroughputMode,
  TrainingSpecification,
  UserSettings,
} from "./models_1";
export interface MonitoringInput {
  EndpointInput?: EndpointInput | undefined;
  BatchTransformInput?: BatchTransformInput | undefined;
}
export interface NetworkConfig {
  EnableInterContainerTrafficEncryption?: boolean | undefined;
  EnableNetworkIsolation?: boolean | undefined;
  VpcConfig?: VpcConfig | undefined;
}
export interface MonitoringJobDefinition {
  BaselineConfig?: MonitoringBaselineConfig | undefined;
  MonitoringInputs: MonitoringInput[] | undefined;
  MonitoringOutputConfig: MonitoringOutputConfig | undefined;
  MonitoringResources: MonitoringResources | undefined;
  MonitoringAppSpecification: MonitoringAppSpecification | undefined;
  StoppingCondition?: MonitoringStoppingCondition | undefined;
  Environment?: Record<string, string> | undefined;
  NetworkConfig?: NetworkConfig | undefined;
  RoleArn: string | undefined;
}
export declare const MonitoringType: {
  readonly DATA_QUALITY: "DataQuality";
  readonly MODEL_BIAS: "ModelBias";
  readonly MODEL_EXPLAINABILITY: "ModelExplainability";
  readonly MODEL_QUALITY: "ModelQuality";
};
export type MonitoringType =
  (typeof MonitoringType)[keyof typeof MonitoringType];
export interface ScheduleConfig {
  ScheduleExpression: string | undefined;
  DataAnalysisStartTime?: string | undefined;
  DataAnalysisEndTime?: string | undefined;
}
export interface MonitoringScheduleConfig {
  ScheduleConfig?: ScheduleConfig | undefined;
  MonitoringJobDefinition?: MonitoringJobDefinition | undefined;
  MonitoringJobDefinitionName?: string | undefined;
  MonitoringType?: MonitoringType | undefined;
}
export interface CreateMonitoringScheduleRequest {
  MonitoringScheduleName: string | undefined;
  MonitoringScheduleConfig: MonitoringScheduleConfig | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateMonitoringScheduleResponse {
  MonitoringScheduleArn: string | undefined;
}
export declare const NotebookInstanceAcceleratorType: {
  readonly ML_EIA1_LARGE: "ml.eia1.large";
  readonly ML_EIA1_MEDIUM: "ml.eia1.medium";
  readonly ML_EIA1_XLARGE: "ml.eia1.xlarge";
  readonly ML_EIA2_LARGE: "ml.eia2.large";
  readonly ML_EIA2_MEDIUM: "ml.eia2.medium";
  readonly ML_EIA2_XLARGE: "ml.eia2.xlarge";
};
export type NotebookInstanceAcceleratorType =
  (typeof NotebookInstanceAcceleratorType)[keyof typeof NotebookInstanceAcceleratorType];
export declare const DirectInternetAccess: {
  readonly DISABLED: "Disabled";
  readonly ENABLED: "Enabled";
};
export type DirectInternetAccess =
  (typeof DirectInternetAccess)[keyof typeof DirectInternetAccess];
export interface InstanceMetadataServiceConfiguration {
  MinimumInstanceMetadataServiceVersion: string | undefined;
}
export declare const RootAccess: {
  readonly DISABLED: "Disabled";
  readonly ENABLED: "Enabled";
};
export type RootAccess = (typeof RootAccess)[keyof typeof RootAccess];
export interface CreateNotebookInstanceInput {
  NotebookInstanceName: string | undefined;
  InstanceType: _InstanceType | undefined;
  SubnetId?: string | undefined;
  SecurityGroupIds?: string[] | undefined;
  RoleArn: string | undefined;
  KmsKeyId?: string | undefined;
  Tags?: Tag[] | undefined;
  LifecycleConfigName?: string | undefined;
  DirectInternetAccess?: DirectInternetAccess | undefined;
  VolumeSizeInGB?: number | undefined;
  AcceleratorTypes?: NotebookInstanceAcceleratorType[] | undefined;
  DefaultCodeRepository?: string | undefined;
  AdditionalCodeRepositories?: string[] | undefined;
  RootAccess?: RootAccess | undefined;
  PlatformIdentifier?: string | undefined;
  InstanceMetadataServiceConfiguration?:
    | InstanceMetadataServiceConfiguration
    | undefined;
}
export interface CreateNotebookInstanceOutput {
  NotebookInstanceArn?: string | undefined;
}
export interface NotebookInstanceLifecycleHook {
  Content?: string | undefined;
}
export interface CreateNotebookInstanceLifecycleConfigInput {
  NotebookInstanceLifecycleConfigName: string | undefined;
  OnCreate?: NotebookInstanceLifecycleHook[] | undefined;
  OnStart?: NotebookInstanceLifecycleHook[] | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateNotebookInstanceLifecycleConfigOutput {
  NotebookInstanceLifecycleConfigArn?: string | undefined;
}
export declare const OptimizationJobDeploymentInstanceType: {
  readonly ML_G5_12XLARGE: "ml.g5.12xlarge";
  readonly ML_G5_16XLARGE: "ml.g5.16xlarge";
  readonly ML_G5_24XLARGE: "ml.g5.24xlarge";
  readonly ML_G5_2XLARGE: "ml.g5.2xlarge";
  readonly ML_G5_48XLARGE: "ml.g5.48xlarge";
  readonly ML_G5_4XLARGE: "ml.g5.4xlarge";
  readonly ML_G5_8XLARGE: "ml.g5.8xlarge";
  readonly ML_G5_XLARGE: "ml.g5.xlarge";
  readonly ML_G6E_12XLARGE: "ml.g6e.12xlarge";
  readonly ML_G6E_16XLARGE: "ml.g6e.16xlarge";
  readonly ML_G6E_24XLARGE: "ml.g6e.24xlarge";
  readonly ML_G6E_2XLARGE: "ml.g6e.2xlarge";
  readonly ML_G6E_48XLARGE: "ml.g6e.48xlarge";
  readonly ML_G6E_4XLARGE: "ml.g6e.4xlarge";
  readonly ML_G6E_8XLARGE: "ml.g6e.8xlarge";
  readonly ML_G6E_XLARGE: "ml.g6e.xlarge";
  readonly ML_G6_12XLARGE: "ml.g6.12xlarge";
  readonly ML_G6_16XLARGE: "ml.g6.16xlarge";
  readonly ML_G6_24XLARGE: "ml.g6.24xlarge";
  readonly ML_G6_2XLARGE: "ml.g6.2xlarge";
  readonly ML_G6_48XLARGE: "ml.g6.48xlarge";
  readonly ML_G6_4XLARGE: "ml.g6.4xlarge";
  readonly ML_G6_8XLARGE: "ml.g6.8xlarge";
  readonly ML_G6_XLARGE: "ml.g6.xlarge";
  readonly ML_INF2_24XLARGE: "ml.inf2.24xlarge";
  readonly ML_INF2_48XLARGE: "ml.inf2.48xlarge";
  readonly ML_INF2_8XLARGE: "ml.inf2.8xlarge";
  readonly ML_INF2_XLARGE: "ml.inf2.xlarge";
  readonly ML_P4DE_24XLARGE: "ml.p4de.24xlarge";
  readonly ML_P4D_24XLARGE: "ml.p4d.24xlarge";
  readonly ML_P5_48XLARGE: "ml.p5.48xlarge";
  readonly ML_TRN1N_32XLARGE: "ml.trn1n.32xlarge";
  readonly ML_TRN1_2XLARGE: "ml.trn1.2xlarge";
  readonly ML_TRN1_32XLARGE: "ml.trn1.32xlarge";
};
export type OptimizationJobDeploymentInstanceType =
  (typeof OptimizationJobDeploymentInstanceType)[keyof typeof OptimizationJobDeploymentInstanceType];
export interface OptimizationModelAccessConfig {
  AcceptEula: boolean | undefined;
}
export interface OptimizationJobModelSourceS3 {
  S3Uri?: string | undefined;
  ModelAccessConfig?: OptimizationModelAccessConfig | undefined;
}
export interface OptimizationJobModelSource {
  S3?: OptimizationJobModelSourceS3 | undefined;
}
export interface ModelCompilationConfig {
  Image?: string | undefined;
  OverrideEnvironment?: Record<string, string> | undefined;
}
export interface ModelQuantizationConfig {
  Image?: string | undefined;
  OverrideEnvironment?: Record<string, string> | undefined;
}
export interface ModelShardingConfig {
  Image?: string | undefined;
  OverrideEnvironment?: Record<string, string> | undefined;
}
export type OptimizationConfig =
  | OptimizationConfig.ModelCompilationConfigMember
  | OptimizationConfig.ModelQuantizationConfigMember
  | OptimizationConfig.ModelShardingConfigMember
  | OptimizationConfig.$UnknownMember;
export declare namespace OptimizationConfig {
  interface ModelQuantizationConfigMember {
    ModelQuantizationConfig: ModelQuantizationConfig;
    ModelCompilationConfig?: never;
    ModelShardingConfig?: never;
    $unknown?: never;
  }
  interface ModelCompilationConfigMember {
    ModelQuantizationConfig?: never;
    ModelCompilationConfig: ModelCompilationConfig;
    ModelShardingConfig?: never;
    $unknown?: never;
  }
  interface ModelShardingConfigMember {
    ModelQuantizationConfig?: never;
    ModelCompilationConfig?: never;
    ModelShardingConfig: ModelShardingConfig;
    $unknown?: never;
  }
  interface $UnknownMember {
    ModelQuantizationConfig?: never;
    ModelCompilationConfig?: never;
    ModelShardingConfig?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    ModelQuantizationConfig: (value: ModelQuantizationConfig) => T;
    ModelCompilationConfig: (value: ModelCompilationConfig) => T;
    ModelShardingConfig: (value: ModelShardingConfig) => T;
    _: (name: string, value: any) => T;
  }
  const visit: <T>(value: OptimizationConfig, visitor: Visitor<T>) => T;
}
export interface OptimizationJobOutputConfig {
  KmsKeyId?: string | undefined;
  S3OutputLocation: string | undefined;
}
export interface OptimizationVpcConfig {
  SecurityGroupIds: string[] | undefined;
  Subnets: string[] | undefined;
}
export interface CreateOptimizationJobRequest {
  OptimizationJobName: string | undefined;
  RoleArn: string | undefined;
  ModelSource: OptimizationJobModelSource | undefined;
  DeploymentInstanceType: OptimizationJobDeploymentInstanceType | undefined;
  OptimizationEnvironment?: Record<string, string> | undefined;
  OptimizationConfigs: OptimizationConfig[] | undefined;
  OutputConfig: OptimizationJobOutputConfig | undefined;
  StoppingCondition: StoppingCondition | undefined;
  Tags?: Tag[] | undefined;
  VpcConfig?: OptimizationVpcConfig | undefined;
}
export interface CreateOptimizationJobResponse {
  OptimizationJobArn: string | undefined;
}
export interface PartnerAppConfig {
  AdminUsers?: string[] | undefined;
  Arguments?: Record<string, string> | undefined;
}
export declare const PartnerAppAuthType: {
  readonly IAM: "IAM";
};
export type PartnerAppAuthType =
  (typeof PartnerAppAuthType)[keyof typeof PartnerAppAuthType];
export interface PartnerAppMaintenanceConfig {
  MaintenanceWindowStart?: string | undefined;
}
export declare const PartnerAppType: {
  readonly COMET: "comet";
  readonly DEEPCHECKS_LLM_EVALUATION: "deepchecks-llm-evaluation";
  readonly FIDDLER: "fiddler";
  readonly LAKERA_GUARD: "lakera-guard";
};
export type PartnerAppType =
  (typeof PartnerAppType)[keyof typeof PartnerAppType];
export interface CreatePartnerAppRequest {
  Name: string | undefined;
  Type: PartnerAppType | undefined;
  ExecutionRoleArn: string | undefined;
  KmsKeyId?: string | undefined;
  MaintenanceConfig?: PartnerAppMaintenanceConfig | undefined;
  Tier: string | undefined;
  ApplicationConfig?: PartnerAppConfig | undefined;
  AuthType: PartnerAppAuthType | undefined;
  EnableIamSessionBasedIdentity?: boolean | undefined;
  ClientToken?: string | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreatePartnerAppResponse {
  Arn?: string | undefined;
}
export interface CreatePartnerAppPresignedUrlRequest {
  Arn: string | undefined;
  ExpiresInSeconds?: number | undefined;
  SessionExpirationDurationInSeconds?: number | undefined;
}
export interface CreatePartnerAppPresignedUrlResponse {
  Url?: string | undefined;
}
export interface ParallelismConfiguration {
  MaxParallelExecutionSteps: number | undefined;
}
export interface PipelineDefinitionS3Location {
  Bucket: string | undefined;
  ObjectKey: string | undefined;
  VersionId?: string | undefined;
}
export interface CreatePipelineRequest {
  PipelineName: string | undefined;
  PipelineDisplayName?: string | undefined;
  PipelineDefinition?: string | undefined;
  PipelineDefinitionS3Location?: PipelineDefinitionS3Location | undefined;
  PipelineDescription?: string | undefined;
  ClientRequestToken?: string | undefined;
  RoleArn: string | undefined;
  Tags?: Tag[] | undefined;
  ParallelismConfiguration?: ParallelismConfiguration | undefined;
}
export interface CreatePipelineResponse {
  PipelineArn?: string | undefined;
}
export interface CreatePresignedDomainUrlRequest {
  DomainId: string | undefined;
  UserProfileName: string | undefined;
  SessionExpirationDurationInSeconds?: number | undefined;
  ExpiresInSeconds?: number | undefined;
  SpaceName?: string | undefined;
  LandingUri?: string | undefined;
}
export interface CreatePresignedDomainUrlResponse {
  AuthorizedUrl?: string | undefined;
}
export interface CreatePresignedMlflowTrackingServerUrlRequest {
  TrackingServerName: string | undefined;
  ExpiresInSeconds?: number | undefined;
  SessionExpirationDurationInSeconds?: number | undefined;
}
export interface CreatePresignedMlflowTrackingServerUrlResponse {
  AuthorizedUrl?: string | undefined;
}
export interface CreatePresignedNotebookInstanceUrlInput {
  NotebookInstanceName: string | undefined;
  SessionExpirationDurationInSeconds?: number | undefined;
}
export interface CreatePresignedNotebookInstanceUrlOutput {
  AuthorizedUrl?: string | undefined;
}
export interface ExperimentConfig {
  ExperimentName?: string | undefined;
  TrialName?: string | undefined;
  TrialComponentDisplayName?: string | undefined;
  RunName?: string | undefined;
}
export declare const DataDistributionType: {
  readonly FULLYREPLICATED: "FullyReplicated";
  readonly SHARDEDBYS3KEY: "ShardedByS3Key";
};
export type DataDistributionType =
  (typeof DataDistributionType)[keyof typeof DataDistributionType];
export declare const InputMode: {
  readonly FILE: "File";
  readonly PIPE: "Pipe";
};
export type InputMode = (typeof InputMode)[keyof typeof InputMode];
export declare const RedshiftResultCompressionType: {
  readonly BZIP2: "BZIP2";
  readonly GZIP: "GZIP";
  readonly NONE: "None";
  readonly SNAPPY: "SNAPPY";
  readonly ZSTD: "ZSTD";
};
export type RedshiftResultCompressionType =
  (typeof RedshiftResultCompressionType)[keyof typeof RedshiftResultCompressionType];
export declare const RedshiftResultFormat: {
  readonly CSV: "CSV";
  readonly PARQUET: "PARQUET";
};
export type RedshiftResultFormat =
  (typeof RedshiftResultFormat)[keyof typeof RedshiftResultFormat];
export interface RedshiftDatasetDefinition {
  ClusterId: string | undefined;
  Database: string | undefined;
  DbUser: string | undefined;
  QueryString: string | undefined;
  ClusterRoleArn: string | undefined;
  OutputS3Uri: string | undefined;
  KmsKeyId?: string | undefined;
  OutputFormat: RedshiftResultFormat | undefined;
  OutputCompression?: RedshiftResultCompressionType | undefined;
}
export interface DatasetDefinition {
  AthenaDatasetDefinition?: AthenaDatasetDefinition | undefined;
  RedshiftDatasetDefinition?: RedshiftDatasetDefinition | undefined;
  LocalPath?: string | undefined;
  DataDistributionType?: DataDistributionType | undefined;
  InputMode?: InputMode | undefined;
}
export declare const ProcessingS3CompressionType: {
  readonly GZIP: "Gzip";
  readonly NONE: "None";
};
export type ProcessingS3CompressionType =
  (typeof ProcessingS3CompressionType)[keyof typeof ProcessingS3CompressionType];
export declare const ProcessingS3DataType: {
  readonly MANIFEST_FILE: "ManifestFile";
  readonly S3_PREFIX: "S3Prefix";
};
export type ProcessingS3DataType =
  (typeof ProcessingS3DataType)[keyof typeof ProcessingS3DataType];
export interface ProcessingS3Input {
  S3Uri: string | undefined;
  LocalPath?: string | undefined;
  S3DataType: ProcessingS3DataType | undefined;
  S3InputMode?: ProcessingS3InputMode | undefined;
  S3DataDistributionType?: ProcessingS3DataDistributionType | undefined;
  S3CompressionType?: ProcessingS3CompressionType | undefined;
}
export interface ProcessingInput {
  InputName: string | undefined;
  AppManaged?: boolean | undefined;
  S3Input?: ProcessingS3Input | undefined;
  DatasetDefinition?: DatasetDefinition | undefined;
}
export interface ProcessingFeatureStoreOutput {
  FeatureGroupName: string | undefined;
}
export interface ProcessingS3Output {
  S3Uri: string | undefined;
  LocalPath?: string | undefined;
  S3UploadMode: ProcessingS3UploadMode | undefined;
}
export interface ProcessingOutput {
  OutputName: string | undefined;
  S3Output?: ProcessingS3Output | undefined;
  FeatureStoreOutput?: ProcessingFeatureStoreOutput | undefined;
  AppManaged?: boolean | undefined;
}
export interface ProcessingOutputConfig {
  Outputs: ProcessingOutput[] | undefined;
  KmsKeyId?: string | undefined;
}
export interface ProcessingClusterConfig {
  InstanceCount: number | undefined;
  InstanceType: ProcessingInstanceType | undefined;
  VolumeSizeInGB: number | undefined;
  VolumeKmsKeyId?: string | undefined;
}
export interface ProcessingResources {
  ClusterConfig: ProcessingClusterConfig | undefined;
}
export interface ProcessingStoppingCondition {
  MaxRuntimeInSeconds: number | undefined;
}
export interface CreateProcessingJobRequest {
  ProcessingInputs?: ProcessingInput[] | undefined;
  ProcessingOutputConfig?: ProcessingOutputConfig | undefined;
  ProcessingJobName: string | undefined;
  ProcessingResources: ProcessingResources | undefined;
  StoppingCondition?: ProcessingStoppingCondition | undefined;
  AppSpecification: AppSpecification | undefined;
  Environment?: Record<string, string> | undefined;
  NetworkConfig?: NetworkConfig | undefined;
  RoleArn: string | undefined;
  Tags?: Tag[] | undefined;
  ExperimentConfig?: ExperimentConfig | undefined;
}
export interface CreateProcessingJobResponse {
  ProcessingJobArn: string | undefined;
}
export interface ProvisioningParameter {
  Key?: string | undefined;
  Value?: string | undefined;
}
export interface ServiceCatalogProvisioningDetails {
  ProductId: string | undefined;
  ProvisioningArtifactId?: string | undefined;
  PathId?: string | undefined;
  ProvisioningParameters?: ProvisioningParameter[] | undefined;
}
export interface CreateProjectInput {
  ProjectName: string | undefined;
  ProjectDescription?: string | undefined;
  ServiceCatalogProvisioningDetails?:
    | ServiceCatalogProvisioningDetails
    | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateProjectOutput {
  ProjectArn: string | undefined;
  ProjectId: string | undefined;
}
export interface OwnershipSettings {
  OwnerUserProfileName: string | undefined;
}
export interface SpaceIdleSettings {
  IdleTimeoutInMinutes?: number | undefined;
}
export interface SpaceAppLifecycleManagement {
  IdleSettings?: SpaceIdleSettings | undefined;
}
export interface SpaceCodeEditorAppSettings {
  DefaultResourceSpec?: ResourceSpec | undefined;
  AppLifecycleManagement?: SpaceAppLifecycleManagement | undefined;
}
export interface EFSFileSystem {
  FileSystemId: string | undefined;
}
export interface FSxLustreFileSystem {
  FileSystemId: string | undefined;
}
export type CustomFileSystem =
  | CustomFileSystem.EFSFileSystemMember
  | CustomFileSystem.FSxLustreFileSystemMember
  | CustomFileSystem.$UnknownMember;
export declare namespace CustomFileSystem {
  interface EFSFileSystemMember {
    EFSFileSystem: EFSFileSystem;
    FSxLustreFileSystem?: never;
    $unknown?: never;
  }
  interface FSxLustreFileSystemMember {
    EFSFileSystem?: never;
    FSxLustreFileSystem: FSxLustreFileSystem;
    $unknown?: never;
  }
  interface $UnknownMember {
    EFSFileSystem?: never;
    FSxLustreFileSystem?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    EFSFileSystem: (value: EFSFileSystem) => T;
    FSxLustreFileSystem: (value: FSxLustreFileSystem) => T;
    _: (name: string, value: any) => T;
  }
  const visit: <T>(value: CustomFileSystem, visitor: Visitor<T>) => T;
}
export interface SpaceJupyterLabAppSettings {
  DefaultResourceSpec?: ResourceSpec | undefined;
  CodeRepositories?: CodeRepository[] | undefined;
  AppLifecycleManagement?: SpaceAppLifecycleManagement | undefined;
}
export interface EbsStorageSettings {
  EbsVolumeSizeInGb: number | undefined;
}
export interface SpaceStorageSettings {
  EbsStorageSettings?: EbsStorageSettings | undefined;
}
export interface SpaceSettings {
  JupyterServerAppSettings?: JupyterServerAppSettings | undefined;
  KernelGatewayAppSettings?: KernelGatewayAppSettings | undefined;
  CodeEditorAppSettings?: SpaceCodeEditorAppSettings | undefined;
  JupyterLabAppSettings?: SpaceJupyterLabAppSettings | undefined;
  AppType?: AppType | undefined;
  SpaceStorageSettings?: SpaceStorageSettings | undefined;
  SpaceManagedResources?: FeatureStatus | undefined;
  CustomFileSystems?: CustomFileSystem[] | undefined;
}
export declare const SharingType: {
  readonly Private: "Private";
  readonly Shared: "Shared";
};
export type SharingType = (typeof SharingType)[keyof typeof SharingType];
export interface SpaceSharingSettings {
  SharingType: SharingType | undefined;
}
export interface CreateSpaceRequest {
  DomainId: string | undefined;
  SpaceName: string | undefined;
  Tags?: Tag[] | undefined;
  SpaceSettings?: SpaceSettings | undefined;
  OwnershipSettings?: OwnershipSettings | undefined;
  SpaceSharingSettings?: SpaceSharingSettings | undefined;
  SpaceDisplayName?: string | undefined;
}
export interface CreateSpaceResponse {
  SpaceArn?: string | undefined;
}
export declare const StudioLifecycleConfigAppType: {
  readonly CodeEditor: "CodeEditor";
  readonly JupyterLab: "JupyterLab";
  readonly JupyterServer: "JupyterServer";
  readonly KernelGateway: "KernelGateway";
};
export type StudioLifecycleConfigAppType =
  (typeof StudioLifecycleConfigAppType)[keyof typeof StudioLifecycleConfigAppType];
export interface CreateStudioLifecycleConfigRequest {
  StudioLifecycleConfigName: string | undefined;
  StudioLifecycleConfigContent: string | undefined;
  StudioLifecycleConfigAppType: StudioLifecycleConfigAppType | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateStudioLifecycleConfigResponse {
  StudioLifecycleConfigArn?: string | undefined;
}
export interface DebugHookConfig {
  LocalPath?: string | undefined;
  S3OutputPath: string | undefined;
  HookParameters?: Record<string, string> | undefined;
  CollectionConfigurations?: CollectionConfiguration[] | undefined;
}
export interface DebugRuleConfiguration {
  RuleConfigurationName: string | undefined;
  LocalPath?: string | undefined;
  S3OutputPath?: string | undefined;
  RuleEvaluatorImage: string | undefined;
  InstanceType?: ProcessingInstanceType | undefined;
  VolumeSizeInGB?: number | undefined;
  RuleParameters?: Record<string, string> | undefined;
}
export interface InfraCheckConfig {
  EnableInfraCheck?: boolean | undefined;
}
export interface ProfilerConfig {
  S3OutputPath?: string | undefined;
  ProfilingIntervalInMilliseconds?: number | undefined;
  ProfilingParameters?: Record<string, string> | undefined;
  DisableProfiler?: boolean | undefined;
}
export interface ProfilerRuleConfiguration {
  RuleConfigurationName: string | undefined;
  LocalPath?: string | undefined;
  S3OutputPath?: string | undefined;
  RuleEvaluatorImage: string | undefined;
  InstanceType?: ProcessingInstanceType | undefined;
  VolumeSizeInGB?: number | undefined;
  RuleParameters?: Record<string, string> | undefined;
}
export interface RemoteDebugConfig {
  EnableRemoteDebug?: boolean | undefined;
}
export interface SessionChainingConfig {
  EnableSessionTagChaining?: boolean | undefined;
}
export interface TensorBoardOutputConfig {
  LocalPath?: string | undefined;
  S3OutputPath: string | undefined;
}
export interface CreateTrainingJobRequest {
  TrainingJobName: string | undefined;
  HyperParameters?: Record<string, string> | undefined;
  AlgorithmSpecification: AlgorithmSpecification | undefined;
  RoleArn: string | undefined;
  InputDataConfig?: Channel[] | undefined;
  OutputDataConfig: OutputDataConfig | undefined;
  ResourceConfig: ResourceConfig | undefined;
  VpcConfig?: VpcConfig | undefined;
  StoppingCondition: StoppingCondition | undefined;
  Tags?: Tag[] | undefined;
  EnableNetworkIsolation?: boolean | undefined;
  EnableInterContainerTrafficEncryption?: boolean | undefined;
  EnableManagedSpotTraining?: boolean | undefined;
  CheckpointConfig?: CheckpointConfig | undefined;
  DebugHookConfig?: DebugHookConfig | undefined;
  DebugRuleConfigurations?: DebugRuleConfiguration[] | undefined;
  TensorBoardOutputConfig?: TensorBoardOutputConfig | undefined;
  ExperimentConfig?: ExperimentConfig | undefined;
  ProfilerConfig?: ProfilerConfig | undefined;
  ProfilerRuleConfigurations?: ProfilerRuleConfiguration[] | undefined;
  Environment?: Record<string, string> | undefined;
  RetryStrategy?: RetryStrategy | undefined;
  RemoteDebugConfig?: RemoteDebugConfig | undefined;
  InfraCheckConfig?: InfraCheckConfig | undefined;
  SessionChainingConfig?: SessionChainingConfig | undefined;
}
export interface CreateTrainingJobResponse {
  TrainingJobArn: string | undefined;
}
export interface CreateTrainingPlanRequest {
  TrainingPlanName: string | undefined;
  TrainingPlanOfferingId: string | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateTrainingPlanResponse {
  TrainingPlanArn: string | undefined;
}
export declare const JoinSource: {
  readonly INPUT: "Input";
  readonly NONE: "None";
};
export type JoinSource = (typeof JoinSource)[keyof typeof JoinSource];
export interface DataProcessing {
  InputFilter?: string | undefined;
  OutputFilter?: string | undefined;
  JoinSource?: JoinSource | undefined;
}
export interface ModelClientConfig {
  InvocationsTimeoutInSeconds?: number | undefined;
  InvocationsMaxRetries?: number | undefined;
}
export interface CreateTransformJobRequest {
  TransformJobName: string | undefined;
  ModelName: string | undefined;
  MaxConcurrentTransforms?: number | undefined;
  ModelClientConfig?: ModelClientConfig | undefined;
  MaxPayloadInMB?: number | undefined;
  BatchStrategy?: BatchStrategy | undefined;
  Environment?: Record<string, string> | undefined;
  TransformInput: TransformInput | undefined;
  TransformOutput: TransformOutput | undefined;
  DataCaptureConfig?: BatchDataCaptureConfig | undefined;
  TransformResources: TransformResources | undefined;
  DataProcessing?: DataProcessing | undefined;
  Tags?: Tag[] | undefined;
  ExperimentConfig?: ExperimentConfig | undefined;
}
export interface CreateTransformJobResponse {
  TransformJobArn: string | undefined;
}
export interface CreateTrialRequest {
  TrialName: string | undefined;
  DisplayName?: string | undefined;
  ExperimentName: string | undefined;
  MetadataProperties?: MetadataProperties | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateTrialResponse {
  TrialArn?: string | undefined;
}
export interface TrialComponentArtifact {
  MediaType?: string | undefined;
  Value: string | undefined;
}
export type TrialComponentParameterValue =
  | TrialComponentParameterValue.NumberValueMember
  | TrialComponentParameterValue.StringValueMember
  | TrialComponentParameterValue.$UnknownMember;
export declare namespace TrialComponentParameterValue {
  interface StringValueMember {
    StringValue: string;
    NumberValue?: never;
    $unknown?: never;
  }
  interface NumberValueMember {
    StringValue?: never;
    NumberValue: number;
    $unknown?: never;
  }
  interface $UnknownMember {
    StringValue?: never;
    NumberValue?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    StringValue: (value: string) => T;
    NumberValue: (value: number) => T;
    _: (name: string, value: any) => T;
  }
  const visit: <T>(
    value: TrialComponentParameterValue,
    visitor: Visitor<T>
  ) => T;
}
export declare const TrialComponentPrimaryStatus: {
  readonly COMPLETED: "Completed";
  readonly FAILED: "Failed";
  readonly IN_PROGRESS: "InProgress";
  readonly STOPPED: "Stopped";
  readonly STOPPING: "Stopping";
};
export type TrialComponentPrimaryStatus =
  (typeof TrialComponentPrimaryStatus)[keyof typeof TrialComponentPrimaryStatus];
export interface TrialComponentStatus {
  PrimaryStatus?: TrialComponentPrimaryStatus | undefined;
  Message?: string | undefined;
}
export interface CreateTrialComponentRequest {
  TrialComponentName: string | undefined;
  DisplayName?: string | undefined;
  Status?: TrialComponentStatus | undefined;
  StartTime?: Date | undefined;
  EndTime?: Date | undefined;
  Parameters?: Record<string, TrialComponentParameterValue> | undefined;
  InputArtifacts?: Record<string, TrialComponentArtifact> | undefined;
  OutputArtifacts?: Record<string, TrialComponentArtifact> | undefined;
  MetadataProperties?: MetadataProperties | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateTrialComponentResponse {
  TrialComponentArn?: string | undefined;
}
export interface CreateUserProfileRequest {
  DomainId: string | undefined;
  UserProfileName: string | undefined;
  SingleSignOnUserIdentifier?: string | undefined;
  SingleSignOnUserValue?: string | undefined;
  Tags?: Tag[] | undefined;
  UserSettings?: UserSettings | undefined;
}
export interface CreateUserProfileResponse {
  UserProfileArn?: string | undefined;
}
export interface OidcConfig {
  ClientId: string | undefined;
  ClientSecret: string | undefined;
  Issuer: string | undefined;
  AuthorizationEndpoint: string | undefined;
  TokenEndpoint: string | undefined;
  UserInfoEndpoint: string | undefined;
  LogoutEndpoint: string | undefined;
  JwksUri: string | undefined;
  Scope?: string | undefined;
  AuthenticationRequestExtraParams?: Record<string, string> | undefined;
}
export interface SourceIpConfig {
  Cidrs: string[] | undefined;
}
export interface WorkforceVpcConfigRequest {
  VpcId?: string | undefined;
  SecurityGroupIds?: string[] | undefined;
  Subnets?: string[] | undefined;
}
export interface CreateWorkforceRequest {
  CognitoConfig?: CognitoConfig | undefined;
  OidcConfig?: OidcConfig | undefined;
  SourceIpConfig?: SourceIpConfig | undefined;
  WorkforceName: string | undefined;
  Tags?: Tag[] | undefined;
  WorkforceVpcConfig?: WorkforceVpcConfigRequest | undefined;
}
export interface CreateWorkforceResponse {
  WorkforceArn: string | undefined;
}
export interface OidcMemberDefinition {
  Groups?: string[] | undefined;
}
export interface MemberDefinition {
  CognitoMemberDefinition?: CognitoMemberDefinition | undefined;
  OidcMemberDefinition?: OidcMemberDefinition | undefined;
}
export interface NotificationConfiguration {
  NotificationTopicArn?: string | undefined;
}
export declare const EnabledOrDisabled: {
  readonly Disabled: "Disabled";
  readonly Enabled: "Enabled";
};
export type EnabledOrDisabled =
  (typeof EnabledOrDisabled)[keyof typeof EnabledOrDisabled];
export interface IamPolicyConstraints {
  SourceIp?: EnabledOrDisabled | undefined;
  VpcSourceIp?: EnabledOrDisabled | undefined;
}
export interface S3Presign {
  IamPolicyConstraints?: IamPolicyConstraints | undefined;
}
export interface WorkerAccessConfiguration {
  S3Presign?: S3Presign | undefined;
}
export interface CreateWorkteamRequest {
  WorkteamName: string | undefined;
  WorkforceName?: string | undefined;
  MemberDefinitions: MemberDefinition[] | undefined;
  Description: string | undefined;
  NotificationConfiguration?: NotificationConfiguration | undefined;
  WorkerAccessConfiguration?: WorkerAccessConfiguration | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateWorkteamResponse {
  WorkteamArn?: string | undefined;
}
export declare const CrossAccountFilterOption: {
  readonly CROSS_ACCOUNT: "CrossAccount";
  readonly SAME_ACCOUNT: "SameAccount";
};
export type CrossAccountFilterOption =
  (typeof CrossAccountFilterOption)[keyof typeof CrossAccountFilterOption];
export declare const Statistic: {
  readonly AVERAGE: "Average";
  readonly MAXIMUM: "Maximum";
  readonly MINIMUM: "Minimum";
  readonly SAMPLE_COUNT: "SampleCount";
  readonly SUM: "Sum";
};
export type Statistic = (typeof Statistic)[keyof typeof Statistic];
export interface CustomizedMetricSpecification {
  MetricName?: string | undefined;
  Namespace?: string | undefined;
  Statistic?: Statistic | undefined;
}
export interface DataCaptureConfigSummary {
  EnableCapture: boolean | undefined;
  CaptureStatus: CaptureStatus | undefined;
  CurrentSamplingPercentage: number | undefined;
  DestinationS3Uri: string | undefined;
  KmsKeyId: string | undefined;
}
export declare const RuleEvaluationStatus: {
  readonly ERROR: "Error";
  readonly IN_PROGRESS: "InProgress";
  readonly ISSUES_FOUND: "IssuesFound";
  readonly NO_ISSUES_FOUND: "NoIssuesFound";
  readonly STOPPED: "Stopped";
  readonly STOPPING: "Stopping";
};
export type RuleEvaluationStatus =
  (typeof RuleEvaluationStatus)[keyof typeof RuleEvaluationStatus];
export interface DebugRuleEvaluationStatus {
  RuleConfigurationName?: string | undefined;
  RuleEvaluationJobArn?: string | undefined;
  RuleEvaluationStatus?: RuleEvaluationStatus | undefined;
  StatusDetails?: string | undefined;
  LastModifiedTime?: Date | undefined;
}
export interface DeleteActionRequest {
  ActionName: string | undefined;
}
export interface DeleteActionResponse {
  ActionArn?: string | undefined;
}
export interface DeleteAlgorithmInput {
  AlgorithmName: string | undefined;
}
export interface DeleteAppRequest {
  DomainId: string | undefined;
  UserProfileName?: string | undefined;
  SpaceName?: string | undefined;
  AppType: AppType | undefined;
  AppName: string | undefined;
}
export interface DeleteAppImageConfigRequest {
  AppImageConfigName: string | undefined;
}
export interface DeleteArtifactRequest {
  ArtifactArn?: string | undefined;
  Source?: ArtifactSource | undefined;
}
export interface DeleteArtifactResponse {
  ArtifactArn?: string | undefined;
}
export interface DeleteAssociationRequest {
  SourceArn: string | undefined;
  DestinationArn: string | undefined;
}
export interface DeleteAssociationResponse {
  SourceArn?: string | undefined;
  DestinationArn?: string | undefined;
}
export interface DeleteClusterRequest {
  ClusterName: string | undefined;
}
export interface DeleteClusterResponse {
  ClusterArn: string | undefined;
}
export interface DeleteClusterSchedulerConfigRequest {
  ClusterSchedulerConfigId: string | undefined;
}
export interface DeleteCodeRepositoryInput {
  CodeRepositoryName: string | undefined;
}
export interface DeleteCompilationJobRequest {
  CompilationJobName: string | undefined;
}
export interface DeleteComputeQuotaRequest {
  ComputeQuotaId: string | undefined;
}
export interface DeleteContextRequest {
  ContextName: string | undefined;
}
export interface DeleteContextResponse {
  ContextArn?: string | undefined;
}
export interface DeleteDataQualityJobDefinitionRequest {
  JobDefinitionName: string | undefined;
}
export interface DeleteDeviceFleetRequest {
  DeviceFleetName: string | undefined;
}
export declare const RetentionType: {
  readonly Delete: "Delete";
  readonly Retain: "Retain";
};
export type RetentionType = (typeof RetentionType)[keyof typeof RetentionType];
export interface RetentionPolicy {
  HomeEfsFileSystem?: RetentionType | undefined;
}
export interface DeleteDomainRequest {
  DomainId: string | undefined;
  RetentionPolicy?: RetentionPolicy | undefined;
}
export interface DeleteEdgeDeploymentPlanRequest {
  EdgeDeploymentPlanName: string | undefined;
}
export interface DeleteEdgeDeploymentStageRequest {
  EdgeDeploymentPlanName: string | undefined;
  StageName: string | undefined;
}
export interface DeleteEndpointInput {
  EndpointName: string | undefined;
}
export interface DeleteEndpointConfigInput {
  EndpointConfigName: string | undefined;
}
export interface DeleteExperimentRequest {
  ExperimentName: string | undefined;
}
export interface DeleteExperimentResponse {
  ExperimentArn?: string | undefined;
}
export interface DeleteFeatureGroupRequest {
  FeatureGroupName: string | undefined;
}
export interface DeleteFlowDefinitionRequest {
  FlowDefinitionName: string | undefined;
}
export interface DeleteFlowDefinitionResponse {}
export interface DeleteHubRequest {
  HubName: string | undefined;
}
export declare const HubContentType: {
  readonly MODEL: "Model";
  readonly MODEL_REFERENCE: "ModelReference";
  readonly NOTEBOOK: "Notebook";
};
export type HubContentType =
  (typeof HubContentType)[keyof typeof HubContentType];
export interface DeleteHubContentRequest {
  HubName: string | undefined;
  HubContentType: HubContentType | undefined;
  HubContentName: string | undefined;
  HubContentVersion: string | undefined;
}
export interface DeleteHubContentReferenceRequest {
  HubName: string | undefined;
  HubContentType: HubContentType | undefined;
  HubContentName: string | undefined;
}
export interface DeleteHumanTaskUiRequest {
  HumanTaskUiName: string | undefined;
}
export interface DeleteHumanTaskUiResponse {}
export interface DeleteHyperParameterTuningJobRequest {
  HyperParameterTuningJobName: string | undefined;
}
export interface DeleteImageRequest {
  ImageName: string | undefined;
}
export interface DeleteImageResponse {}
export interface DeleteImageVersionRequest {
  ImageName: string | undefined;
  Version?: number | undefined;
  Alias?: string | undefined;
}
export interface DeleteImageVersionResponse {}
export interface DeleteInferenceComponentInput {
  InferenceComponentName: string | undefined;
}
export interface DeleteInferenceExperimentRequest {
  Name: string | undefined;
}
export interface DeleteInferenceExperimentResponse {
  InferenceExperimentArn: string | undefined;
}
export interface DeleteMlflowTrackingServerRequest {
  TrackingServerName: string | undefined;
}
export interface DeleteMlflowTrackingServerResponse {
  TrackingServerArn?: string | undefined;
}
export interface DeleteModelInput {
  ModelName: string | undefined;
}
export interface DeleteModelBiasJobDefinitionRequest {
  JobDefinitionName: string | undefined;
}
export interface DeleteModelCardRequest {
  ModelCardName: string | undefined;
}
export interface DeleteModelExplainabilityJobDefinitionRequest {
  JobDefinitionName: string | undefined;
}
export interface DeleteModelPackageInput {
  ModelPackageName: string | undefined;
}
export interface DeleteModelPackageGroupInput {
  ModelPackageGroupName: string | undefined;
}
export interface DeleteModelPackageGroupPolicyInput {
  ModelPackageGroupName: string | undefined;
}
export interface DeleteModelQualityJobDefinitionRequest {
  JobDefinitionName: string | undefined;
}
export interface DeleteMonitoringScheduleRequest {
  MonitoringScheduleName: string | undefined;
}
export interface DeleteNotebookInstanceInput {
  NotebookInstanceName: string | undefined;
}
export interface DeleteNotebookInstanceLifecycleConfigInput {
  NotebookInstanceLifecycleConfigName: string | undefined;
}
export interface DeleteOptimizationJobRequest {
  OptimizationJobName: string | undefined;
}
export interface DeletePartnerAppRequest {
  Arn: string | undefined;
  ClientToken?: string | undefined;
}
export interface DeletePartnerAppResponse {
  Arn?: string | undefined;
}
export interface DeletePipelineRequest {
  PipelineName: string | undefined;
  ClientRequestToken?: string | undefined;
}
export interface DeletePipelineResponse {
  PipelineArn?: string | undefined;
}
export interface DeleteProjectInput {
  ProjectName: string | undefined;
}
export interface DeleteSpaceRequest {
  DomainId: string | undefined;
  SpaceName: string | undefined;
}
export interface DeleteStudioLifecycleConfigRequest {
  StudioLifecycleConfigName: string | undefined;
}
export interface DeleteTagsInput {
  ResourceArn: string | undefined;
  TagKeys: string[] | undefined;
}
export interface DeleteTagsOutput {}
export interface DeleteTrialRequest {
  TrialName: string | undefined;
}
export interface DeleteTrialResponse {
  TrialArn?: string | undefined;
}
export interface DeleteTrialComponentRequest {
  TrialComponentName: string | undefined;
}
export interface DeleteTrialComponentResponse {
  TrialComponentArn?: string | undefined;
}
export interface DeleteUserProfileRequest {
  DomainId: string | undefined;
  UserProfileName: string | undefined;
}
export interface DeleteWorkforceRequest {
  WorkforceName: string | undefined;
}
export interface DeleteWorkforceResponse {}
export interface DeleteWorkteamRequest {
  WorkteamName: string | undefined;
}
export interface DeleteWorkteamResponse {
  Success: boolean | undefined;
}
export interface DeployedImage {
  SpecifiedImage?: string | undefined;
  ResolvedImage?: string | undefined;
  ResolutionTime?: Date | undefined;
}
export interface RealTimeInferenceRecommendation {
  RecommendationId: string | undefined;
  InstanceType: ProductionVariantInstanceType | undefined;
  Environment?: Record<string, string> | undefined;
}
export declare const RecommendationStatus: {
  readonly COMPLETED: "COMPLETED";
  readonly FAILED: "FAILED";
  readonly IN_PROGRESS: "IN_PROGRESS";
  readonly NOT_APPLICABLE: "NOT_APPLICABLE";
};
export type RecommendationStatus =
  (typeof RecommendationStatus)[keyof typeof RecommendationStatus];
export interface DeploymentRecommendation {
  RecommendationStatus: RecommendationStatus | undefined;
  RealTimeInferenceRecommendations?:
    | RealTimeInferenceRecommendation[]
    | undefined;
}
export declare const StageStatus: {
  readonly Creating: "CREATING";
  readonly Deployed: "DEPLOYED";
  readonly Failed: "FAILED";
  readonly InProgress: "INPROGRESS";
  readonly ReadyToDeploy: "READYTODEPLOY";
  readonly Starting: "STARTING";
  readonly Stopped: "STOPPED";
  readonly Stopping: "STOPPING";
};
export type StageStatus = (typeof StageStatus)[keyof typeof StageStatus];
export interface EdgeDeploymentStatus {
  StageStatus: StageStatus | undefined;
  EdgeDeploymentSuccessInStage: number | undefined;
  EdgeDeploymentPendingInStage: number | undefined;
  EdgeDeploymentFailedInStage: number | undefined;
  EdgeDeploymentStatusMessage?: string | undefined;
  EdgeDeploymentStageStartTime?: Date | undefined;
}
export interface DeploymentStageStatusSummary {
  StageName: string | undefined;
  DeviceSelectionConfig: DeviceSelectionConfig | undefined;
  DeploymentConfig: EdgeDeploymentConfig | undefined;
  DeploymentStatus: EdgeDeploymentStatus | undefined;
}
export interface DeregisterDevicesRequest {
  DeviceFleetName: string | undefined;
  DeviceNames: string[] | undefined;
}
export interface DerivedInformation {
  DerivedDataInputConfig?: string | undefined;
}
export interface DescribeActionRequest {
  ActionName: string | undefined;
}
export interface DescribeActionResponse {
  ActionName?: string | undefined;
  ActionArn?: string | undefined;
  Source?: ActionSource | undefined;
  ActionType?: string | undefined;
  Description?: string | undefined;
  Status?: ActionStatus | undefined;
  Properties?: Record<string, string> | undefined;
  CreationTime?: Date | undefined;
  CreatedBy?: UserContext | undefined;
  LastModifiedTime?: Date | undefined;
  LastModifiedBy?: UserContext | undefined;
  MetadataProperties?: MetadataProperties | undefined;
  LineageGroupArn?: string | undefined;
}
export interface DescribeAlgorithmInput {
  AlgorithmName: string | undefined;
}
export interface DescribeAlgorithmOutput {
  AlgorithmName: string | undefined;
  AlgorithmArn: string | undefined;
  AlgorithmDescription?: string | undefined;
  CreationTime: Date | undefined;
  TrainingSpecification: TrainingSpecification | undefined;
  InferenceSpecification?: InferenceSpecification | undefined;
  ValidationSpecification?: AlgorithmValidationSpecification | undefined;
  AlgorithmStatus: AlgorithmStatus | undefined;
  AlgorithmStatusDetails: AlgorithmStatusDetails | undefined;
  ProductId?: string | undefined;
  CertifyForMarketplace?: boolean | undefined;
}
export interface DescribeAppRequest {
  DomainId: string | undefined;
  UserProfileName?: string | undefined;
  SpaceName?: string | undefined;
  AppType: AppType | undefined;
  AppName: string | undefined;
}
export interface DescribeAppResponse {
  AppArn?: string | undefined;
  AppType?: AppType | undefined;
  AppName?: string | undefined;
  DomainId?: string | undefined;
  UserProfileName?: string | undefined;
  SpaceName?: string | undefined;
  Status?: AppStatus | undefined;
  RecoveryMode?: boolean | undefined;
  LastHealthCheckTimestamp?: Date | undefined;
  LastUserActivityTimestamp?: Date | undefined;
  CreationTime?: Date | undefined;
  FailureReason?: string | undefined;
  ResourceSpec?: ResourceSpec | undefined;
  BuiltInLifecycleConfigArn?: string | undefined;
}
export interface DescribeAppImageConfigRequest {
  AppImageConfigName: string | undefined;
}
export interface DescribeAppImageConfigResponse {
  AppImageConfigArn?: string | undefined;
  AppImageConfigName?: string | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  KernelGatewayImageConfig?: KernelGatewayImageConfig | undefined;
  JupyterLabAppImageConfig?: JupyterLabAppImageConfig | undefined;
  CodeEditorAppImageConfig?: CodeEditorAppImageConfig | undefined;
}
export interface DescribeArtifactRequest {
  ArtifactArn: string | undefined;
}
export interface DescribeArtifactResponse {
  ArtifactName?: string | undefined;
  ArtifactArn?: string | undefined;
  Source?: ArtifactSource | undefined;
  ArtifactType?: string | undefined;
  Properties?: Record<string, string> | undefined;
  CreationTime?: Date | undefined;
  CreatedBy?: UserContext | undefined;
  LastModifiedTime?: Date | undefined;
  LastModifiedBy?: UserContext | undefined;
  MetadataProperties?: MetadataProperties | undefined;
  LineageGroupArn?: string | undefined;
}
export interface DescribeAutoMLJobRequest {
  AutoMLJobName: string | undefined;
}
export interface ModelDeployResult {
  EndpointName?: string | undefined;
}
export interface ResolvedAttributes {
  AutoMLJobObjective?: AutoMLJobObjective | undefined;
  ProblemType?: ProblemType | undefined;
  CompletionCriteria?: AutoMLJobCompletionCriteria | undefined;
}
export interface DescribeAutoMLJobResponse {
  AutoMLJobName: string | undefined;
  AutoMLJobArn: string | undefined;
  InputDataConfig: AutoMLChannel[] | undefined;
  OutputDataConfig: AutoMLOutputDataConfig | undefined;
  RoleArn: string | undefined;
  AutoMLJobObjective?: AutoMLJobObjective | undefined;
  ProblemType?: ProblemType | undefined;
  AutoMLJobConfig?: AutoMLJobConfig | undefined;
  CreationTime: Date | undefined;
  EndTime?: Date | undefined;
  LastModifiedTime: Date | undefined;
  FailureReason?: string | undefined;
  PartialFailureReasons?: AutoMLPartialFailureReason[] | undefined;
  BestCandidate?: AutoMLCandidate | undefined;
  AutoMLJobStatus: AutoMLJobStatus | undefined;
  AutoMLJobSecondaryStatus: AutoMLJobSecondaryStatus | undefined;
  GenerateCandidateDefinitionsOnly?: boolean | undefined;
  AutoMLJobArtifacts?: AutoMLJobArtifacts | undefined;
  ResolvedAttributes?: ResolvedAttributes | undefined;
  ModelDeployConfig?: ModelDeployConfig | undefined;
  ModelDeployResult?: ModelDeployResult | undefined;
}
export interface DescribeAutoMLJobV2Request {
  AutoMLJobName: string | undefined;
}
export interface DescribeAutoMLJobV2Response {
  AutoMLJobName: string | undefined;
  AutoMLJobArn: string | undefined;
  AutoMLJobInputDataConfig: AutoMLJobChannel[] | undefined;
  OutputDataConfig: AutoMLOutputDataConfig | undefined;
  RoleArn: string | undefined;
  AutoMLJobObjective?: AutoMLJobObjective | undefined;
  AutoMLProblemTypeConfig?: AutoMLProblemTypeConfig | undefined;
  AutoMLProblemTypeConfigName?: AutoMLProblemTypeConfigName | undefined;
  CreationTime: Date | undefined;
  EndTime?: Date | undefined;
  LastModifiedTime: Date | undefined;
  FailureReason?: string | undefined;
  PartialFailureReasons?: AutoMLPartialFailureReason[] | undefined;
  BestCandidate?: AutoMLCandidate | undefined;
  AutoMLJobStatus: AutoMLJobStatus | undefined;
  AutoMLJobSecondaryStatus: AutoMLJobSecondaryStatus | undefined;
  AutoMLJobArtifacts?: AutoMLJobArtifacts | undefined;
  ResolvedAttributes?: AutoMLResolvedAttributes | undefined;
  ModelDeployConfig?: ModelDeployConfig | undefined;
  ModelDeployResult?: ModelDeployResult | undefined;
  DataSplitConfig?: AutoMLDataSplitConfig | undefined;
  SecurityConfig?: AutoMLSecurityConfig | undefined;
  AutoMLComputeConfig?: AutoMLComputeConfig | undefined;
}
export interface DescribeClusterRequest {
  ClusterName: string | undefined;
}
export interface DescribeClusterResponse {
  ClusterArn: string | undefined;
  ClusterName?: string | undefined;
  ClusterStatus: ClusterStatus | undefined;
  CreationTime?: Date | undefined;
  FailureMessage?: string | undefined;
  InstanceGroups: ClusterInstanceGroupDetails[] | undefined;
  VpcConfig?: VpcConfig | undefined;
  Orchestrator?: ClusterOrchestrator | undefined;
  NodeRecovery?: ClusterNodeRecovery | undefined;
}
export interface DescribeClusterNodeRequest {
  ClusterName: string | undefined;
  NodeId: string | undefined;
}
export interface DescribeClusterNodeResponse {
  NodeDetails: ClusterNodeDetails | undefined;
}
export interface DescribeClusterSchedulerConfigRequest {
  ClusterSchedulerConfigId: string | undefined;
  ClusterSchedulerConfigVersion?: number | undefined;
}
export interface DescribeClusterSchedulerConfigResponse {
  ClusterSchedulerConfigArn: string | undefined;
  ClusterSchedulerConfigId: string | undefined;
  Name: string | undefined;
  ClusterSchedulerConfigVersion: number | undefined;
  Status: SchedulerResourceStatus | undefined;
  FailureReason?: string | undefined;
  ClusterArn?: string | undefined;
  SchedulerConfig?: SchedulerConfig | undefined;
  Description?: string | undefined;
  CreationTime: Date | undefined;
  CreatedBy?: UserContext | undefined;
  LastModifiedTime?: Date | undefined;
  LastModifiedBy?: UserContext | undefined;
}
export interface DescribeCodeRepositoryInput {
  CodeRepositoryName: string | undefined;
}
export interface DescribeCodeRepositoryOutput {
  CodeRepositoryName: string | undefined;
  CodeRepositoryArn: string | undefined;
  CreationTime: Date | undefined;
  LastModifiedTime: Date | undefined;
  GitConfig?: GitConfig | undefined;
}
export interface DescribeCompilationJobRequest {
  CompilationJobName: string | undefined;
}
export interface ModelArtifacts {
  S3ModelArtifacts: string | undefined;
}
export interface ModelDigests {
  ArtifactDigest?: string | undefined;
}
export interface DescribeCompilationJobResponse {
  CompilationJobName: string | undefined;
  CompilationJobArn: string | undefined;
  CompilationJobStatus: CompilationJobStatus | undefined;
  CompilationStartTime?: Date | undefined;
  CompilationEndTime?: Date | undefined;
  StoppingCondition: StoppingCondition | undefined;
  InferenceImage?: string | undefined;
  ModelPackageVersionArn?: string | undefined;
  CreationTime: Date | undefined;
  LastModifiedTime: Date | undefined;
  FailureReason: string | undefined;
  ModelArtifacts: ModelArtifacts | undefined;
  ModelDigests?: ModelDigests | undefined;
  RoleArn: string | undefined;
  InputConfig: InputConfig | undefined;
  OutputConfig: OutputConfig | undefined;
  VpcConfig?: NeoVpcConfig | undefined;
  DerivedInformation?: DerivedInformation | undefined;
}
export interface DescribeComputeQuotaRequest {
  ComputeQuotaId: string | undefined;
  ComputeQuotaVersion?: number | undefined;
}
export interface DescribeComputeQuotaResponse {
  ComputeQuotaArn: string | undefined;
  ComputeQuotaId: string | undefined;
  Name: string | undefined;
  Description?: string | undefined;
  ComputeQuotaVersion: number | undefined;
  Status: SchedulerResourceStatus | undefined;
  FailureReason?: string | undefined;
  ClusterArn?: string | undefined;
  ComputeQuotaConfig?: ComputeQuotaConfig | undefined;
  ComputeQuotaTarget: ComputeQuotaTarget | undefined;
  ActivationState?: ActivationState | undefined;
  CreationTime: Date | undefined;
  CreatedBy?: UserContext | undefined;
  LastModifiedTime?: Date | undefined;
  LastModifiedBy?: UserContext | undefined;
}
export interface DescribeContextRequest {
  ContextName: string | undefined;
}
export interface DescribeContextResponse {
  ContextName?: string | undefined;
  ContextArn?: string | undefined;
  Source?: ContextSource | undefined;
  ContextType?: string | undefined;
  Description?: string | undefined;
  Properties?: Record<string, string> | undefined;
  CreationTime?: Date | undefined;
  CreatedBy?: UserContext | undefined;
  LastModifiedTime?: Date | undefined;
  LastModifiedBy?: UserContext | undefined;
  LineageGroupArn?: string | undefined;
}
export interface DescribeDataQualityJobDefinitionRequest {
  JobDefinitionName: string | undefined;
}
export interface DescribeDataQualityJobDefinitionResponse {
  JobDefinitionArn: string | undefined;
  JobDefinitionName: string | undefined;
  CreationTime: Date | undefined;
  DataQualityBaselineConfig?: DataQualityBaselineConfig | undefined;
  DataQualityAppSpecification: DataQualityAppSpecification | undefined;
  DataQualityJobInput: DataQualityJobInput | undefined;
  DataQualityJobOutputConfig: MonitoringOutputConfig | undefined;
  JobResources: MonitoringResources | undefined;
  NetworkConfig?: MonitoringNetworkConfig | undefined;
  RoleArn: string | undefined;
  StoppingCondition?: MonitoringStoppingCondition | undefined;
}
export interface DescribeDeviceRequest {
  NextToken?: string | undefined;
  DeviceName: string | undefined;
  DeviceFleetName: string | undefined;
}
export interface EdgeModel {
  ModelName: string | undefined;
  ModelVersion: string | undefined;
  LatestSampleTime?: Date | undefined;
  LatestInference?: Date | undefined;
}
export interface DescribeDeviceResponse {
  DeviceArn?: string | undefined;
  DeviceName: string | undefined;
  Description?: string | undefined;
  DeviceFleetName: string | undefined;
  IotThingName?: string | undefined;
  RegistrationTime: Date | undefined;
  LatestHeartbeat?: Date | undefined;
  Models?: EdgeModel[] | undefined;
  MaxModels?: number | undefined;
  NextToken?: string | undefined;
  AgentVersion?: string | undefined;
}
export interface DescribeDeviceFleetRequest {
  DeviceFleetName: string | undefined;
}
export interface DescribeDeviceFleetResponse {
  DeviceFleetName: string | undefined;
  DeviceFleetArn: string | undefined;
  OutputConfig: EdgeOutputConfig | undefined;
  Description?: string | undefined;
  CreationTime: Date | undefined;
  LastModifiedTime: Date | undefined;
  RoleArn?: string | undefined;
  IotRoleAlias?: string | undefined;
}
export interface DescribeDomainRequest {
  DomainId: string | undefined;
}
export declare const DomainStatus: {
  readonly Delete_Failed: "Delete_Failed";
  readonly Deleting: "Deleting";
  readonly Failed: "Failed";
  readonly InService: "InService";
  readonly Pending: "Pending";
  readonly Update_Failed: "Update_Failed";
  readonly Updating: "Updating";
};
export type DomainStatus = (typeof DomainStatus)[keyof typeof DomainStatus];
export interface DescribeDomainResponse {
  DomainArn?: string | undefined;
  DomainId?: string | undefined;
  DomainName?: string | undefined;
  HomeEfsFileSystemId?: string | undefined;
  SingleSignOnManagedApplicationInstanceId?: string | undefined;
  SingleSignOnApplicationArn?: string | undefined;
  Status?: DomainStatus | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  FailureReason?: string | undefined;
  SecurityGroupIdForDomainBoundary?: string | undefined;
  AuthMode?: AuthMode | undefined;
  DefaultUserSettings?: UserSettings | undefined;
  DomainSettings?: DomainSettings | undefined;
  AppNetworkAccessType?: AppNetworkAccessType | undefined;
  HomeEfsFileSystemKmsKeyId?: string | undefined;
  SubnetIds?: string[] | undefined;
  Url?: string | undefined;
  VpcId?: string | undefined;
  KmsKeyId?: string | undefined;
  AppSecurityGroupManagement?: AppSecurityGroupManagement | undefined;
  TagPropagation?: TagPropagation | undefined;
  DefaultSpaceSettings?: DefaultSpaceSettings | undefined;
}
export interface DescribeEdgeDeploymentPlanRequest {
  EdgeDeploymentPlanName: string | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface DescribeEdgeDeploymentPlanResponse {
  EdgeDeploymentPlanArn: string | undefined;
  EdgeDeploymentPlanName: string | undefined;
  ModelConfigs: EdgeDeploymentModelConfig[] | undefined;
  DeviceFleetName: string | undefined;
  EdgeDeploymentSuccess?: number | undefined;
  EdgeDeploymentPending?: number | undefined;
  EdgeDeploymentFailed?: number | undefined;
  Stages: DeploymentStageStatusSummary[] | undefined;
  NextToken?: string | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
}
export interface DescribeEdgePackagingJobRequest {
  EdgePackagingJobName: string | undefined;
}
export declare const EdgePackagingJobStatus: {
  readonly Completed: "COMPLETED";
  readonly Failed: "FAILED";
  readonly InProgress: "INPROGRESS";
  readonly Starting: "STARTING";
  readonly Stopped: "STOPPED";
  readonly Stopping: "STOPPING";
};
export type EdgePackagingJobStatus =
  (typeof EdgePackagingJobStatus)[keyof typeof EdgePackagingJobStatus];
export declare const EdgePresetDeploymentStatus: {
  readonly Completed: "COMPLETED";
  readonly Failed: "FAILED";
};
export type EdgePresetDeploymentStatus =
  (typeof EdgePresetDeploymentStatus)[keyof typeof EdgePresetDeploymentStatus];
export interface EdgePresetDeploymentOutput {
  Type: EdgePresetDeploymentType | undefined;
  Artifact?: string | undefined;
  Status?: EdgePresetDeploymentStatus | undefined;
  StatusMessage?: string | undefined;
}
export interface DescribeEdgePackagingJobResponse {
  EdgePackagingJobArn: string | undefined;
  EdgePackagingJobName: string | undefined;
  CompilationJobName?: string | undefined;
  ModelName?: string | undefined;
  ModelVersion?: string | undefined;
  RoleArn?: string | undefined;
  OutputConfig?: EdgeOutputConfig | undefined;
  ResourceKey?: string | undefined;
  EdgePackagingJobStatus: EdgePackagingJobStatus | undefined;
  EdgePackagingJobStatusMessage?: string | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  ModelArtifact?: string | undefined;
  ModelSignature?: string | undefined;
  PresetDeploymentOutput?: EdgePresetDeploymentOutput | undefined;
}
export interface DescribeEndpointInput {
  EndpointName: string | undefined;
}
export declare const EndpointStatus: {
  readonly CREATING: "Creating";
  readonly DELETING: "Deleting";
  readonly FAILED: "Failed";
  readonly IN_SERVICE: "InService";
  readonly OUT_OF_SERVICE: "OutOfService";
  readonly ROLLING_BACK: "RollingBack";
  readonly SYSTEM_UPDATING: "SystemUpdating";
  readonly UPDATE_ROLLBACK_FAILED: "UpdateRollbackFailed";
  readonly UPDATING: "Updating";
};
export type EndpointStatus =
  (typeof EndpointStatus)[keyof typeof EndpointStatus];
export declare const VariantStatus: {
  readonly ACTIVATING_TRAFFIC: "ActivatingTraffic";
  readonly BAKING: "Baking";
  readonly CREATING: "Creating";
  readonly DELETING: "Deleting";
  readonly UPDATING: "Updating";
};
export type VariantStatus = (typeof VariantStatus)[keyof typeof VariantStatus];
export interface ProductionVariantStatus {
  Status: VariantStatus | undefined;
  StatusMessage?: string | undefined;
  StartTime?: Date | undefined;
}
export interface PendingProductionVariantSummary {
  VariantName: string | undefined;
  DeployedImages?: DeployedImage[] | undefined;
  CurrentWeight?: number | undefined;
  DesiredWeight?: number | undefined;
  CurrentInstanceCount?: number | undefined;
  DesiredInstanceCount?: number | undefined;
  InstanceType?: ProductionVariantInstanceType | undefined;
  AcceleratorType?: ProductionVariantAcceleratorType | undefined;
  VariantStatus?: ProductionVariantStatus[] | undefined;
  CurrentServerlessConfig?: ProductionVariantServerlessConfig | undefined;
  DesiredServerlessConfig?: ProductionVariantServerlessConfig | undefined;
  ManagedInstanceScaling?: ProductionVariantManagedInstanceScaling | undefined;
  RoutingConfig?: ProductionVariantRoutingConfig | undefined;
}
export interface PendingDeploymentSummary {
  EndpointConfigName: string | undefined;
  ProductionVariants?: PendingProductionVariantSummary[] | undefined;
  StartTime?: Date | undefined;
  ShadowProductionVariants?: PendingProductionVariantSummary[] | undefined;
}
export interface ProductionVariantSummary {
  VariantName: string | undefined;
  DeployedImages?: DeployedImage[] | undefined;
  CurrentWeight?: number | undefined;
  DesiredWeight?: number | undefined;
  CurrentInstanceCount?: number | undefined;
  DesiredInstanceCount?: number | undefined;
  VariantStatus?: ProductionVariantStatus[] | undefined;
  CurrentServerlessConfig?: ProductionVariantServerlessConfig | undefined;
  DesiredServerlessConfig?: ProductionVariantServerlessConfig | undefined;
  ManagedInstanceScaling?: ProductionVariantManagedInstanceScaling | undefined;
  RoutingConfig?: ProductionVariantRoutingConfig | undefined;
}
export interface DescribeEndpointOutput {
  EndpointName: string | undefined;
  EndpointArn: string | undefined;
  EndpointConfigName?: string | undefined;
  ProductionVariants?: ProductionVariantSummary[] | undefined;
  DataCaptureConfig?: DataCaptureConfigSummary | undefined;
  EndpointStatus: EndpointStatus | undefined;
  FailureReason?: string | undefined;
  CreationTime: Date | undefined;
  LastModifiedTime: Date | undefined;
  LastDeploymentConfig?: DeploymentConfig | undefined;
  AsyncInferenceConfig?: AsyncInferenceConfig | undefined;
  PendingDeploymentSummary?: PendingDeploymentSummary | undefined;
  ExplainerConfig?: ExplainerConfig | undefined;
  ShadowProductionVariants?: ProductionVariantSummary[] | undefined;
}
export interface DescribeEndpointConfigInput {
  EndpointConfigName: string | undefined;
}
export interface DescribeEndpointConfigOutput {
  EndpointConfigName: string | undefined;
  EndpointConfigArn: string | undefined;
  ProductionVariants: ProductionVariant[] | undefined;
  DataCaptureConfig?: DataCaptureConfig | undefined;
  KmsKeyId?: string | undefined;
  CreationTime: Date | undefined;
  AsyncInferenceConfig?: AsyncInferenceConfig | undefined;
  ExplainerConfig?: ExplainerConfig | undefined;
  ShadowProductionVariants?: ProductionVariant[] | undefined;
  ExecutionRoleArn?: string | undefined;
  VpcConfig?: VpcConfig | undefined;
  EnableNetworkIsolation?: boolean | undefined;
}
export interface DescribeExperimentRequest {
  ExperimentName: string | undefined;
}
export interface ExperimentSource {
  SourceArn: string | undefined;
  SourceType?: string | undefined;
}
export interface DescribeExperimentResponse {
  ExperimentName?: string | undefined;
  ExperimentArn?: string | undefined;
  DisplayName?: string | undefined;
  Source?: ExperimentSource | undefined;
  Description?: string | undefined;
  CreationTime?: Date | undefined;
  CreatedBy?: UserContext | undefined;
  LastModifiedTime?: Date | undefined;
  LastModifiedBy?: UserContext | undefined;
}
export interface DescribeFeatureGroupRequest {
  FeatureGroupName: string | undefined;
  NextToken?: string | undefined;
}
export declare const FeatureGroupStatus: {
  readonly CREATED: "Created";
  readonly CREATE_FAILED: "CreateFailed";
  readonly CREATING: "Creating";
  readonly DELETE_FAILED: "DeleteFailed";
  readonly DELETING: "Deleting";
};
export type FeatureGroupStatus =
  (typeof FeatureGroupStatus)[keyof typeof FeatureGroupStatus];
export declare const LastUpdateStatusValue: {
  readonly FAILED: "Failed";
  readonly IN_PROGRESS: "InProgress";
  readonly SUCCESSFUL: "Successful";
};
export type LastUpdateStatusValue =
  (typeof LastUpdateStatusValue)[keyof typeof LastUpdateStatusValue];
export interface LastUpdateStatus {
  Status: LastUpdateStatusValue | undefined;
  FailureReason?: string | undefined;
}
export declare const OfflineStoreStatusValue: {
  readonly ACTIVE: "Active";
  readonly BLOCKED: "Blocked";
  readonly DISABLED: "Disabled";
};
export type OfflineStoreStatusValue =
  (typeof OfflineStoreStatusValue)[keyof typeof OfflineStoreStatusValue];
export interface OfflineStoreStatus {
  Status: OfflineStoreStatusValue | undefined;
  BlockedReason?: string | undefined;
}
export interface ThroughputConfigDescription {
  ThroughputMode: ThroughputMode | undefined;
  ProvisionedReadCapacityUnits?: number | undefined;
  ProvisionedWriteCapacityUnits?: number | undefined;
}
export interface DescribeFeatureGroupResponse {
  FeatureGroupArn: string | undefined;
  FeatureGroupName: string | undefined;
  RecordIdentifierFeatureName: string | undefined;
  EventTimeFeatureName: string | undefined;
  FeatureDefinitions: FeatureDefinition[] | undefined;
  CreationTime: Date | undefined;
  LastModifiedTime?: Date | undefined;
  OnlineStoreConfig?: OnlineStoreConfig | undefined;
  OfflineStoreConfig?: OfflineStoreConfig | undefined;
  ThroughputConfig?: ThroughputConfigDescription | undefined;
  RoleArn?: string | undefined;
  FeatureGroupStatus?: FeatureGroupStatus | undefined;
  OfflineStoreStatus?: OfflineStoreStatus | undefined;
  LastUpdateStatus?: LastUpdateStatus | undefined;
  FailureReason?: string | undefined;
  Description?: string | undefined;
  NextToken: string | undefined;
  OnlineStoreTotalSizeBytes?: number | undefined;
}
export interface DescribeFeatureMetadataRequest {
  FeatureGroupName: string | undefined;
  FeatureName: string | undefined;
}
export interface FeatureParameter {
  Key?: string | undefined;
  Value?: string | undefined;
}
export interface DescribeFeatureMetadataResponse {
  FeatureGroupArn: string | undefined;
  FeatureGroupName: string | undefined;
  FeatureName: string | undefined;
  FeatureType: FeatureType | undefined;
  CreationTime: Date | undefined;
  LastModifiedTime: Date | undefined;
  Description?: string | undefined;
  Parameters?: FeatureParameter[] | undefined;
}
export interface DescribeFlowDefinitionRequest {
  FlowDefinitionName: string | undefined;
}
export declare const FlowDefinitionStatus: {
  readonly ACTIVE: "Active";
  readonly DELETING: "Deleting";
  readonly FAILED: "Failed";
  readonly INITIALIZING: "Initializing";
};
export type FlowDefinitionStatus =
  (typeof FlowDefinitionStatus)[keyof typeof FlowDefinitionStatus];
export interface DescribeFlowDefinitionResponse {
  FlowDefinitionArn: string | undefined;
  FlowDefinitionName: string | undefined;
  FlowDefinitionStatus: FlowDefinitionStatus | undefined;
  CreationTime: Date | undefined;
  HumanLoopRequestSource?: HumanLoopRequestSource | undefined;
  HumanLoopActivationConfig?: HumanLoopActivationConfig | undefined;
  HumanLoopConfig?: HumanLoopConfig | undefined;
  OutputConfig: FlowDefinitionOutputConfig | undefined;
  RoleArn: string | undefined;
  FailureReason?: string | undefined;
}
export interface DescribeHubRequest {
  HubName: string | undefined;
}
export declare const HubStatus: {
  readonly CREATE_FAILED: "CreateFailed";
  readonly CREATING: "Creating";
  readonly DELETE_FAILED: "DeleteFailed";
  readonly DELETING: "Deleting";
  readonly IN_SERVICE: "InService";
  readonly UPDATE_FAILED: "UpdateFailed";
  readonly UPDATING: "Updating";
};
export type HubStatus = (typeof HubStatus)[keyof typeof HubStatus];
export declare const OidcConfigFilterSensitiveLog: (obj: OidcConfig) => any;
export declare const CreateWorkforceRequestFilterSensitiveLog: (
  obj: CreateWorkforceRequest
) => any;
