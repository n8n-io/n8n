import {
  AutomaticJsonStringConversion as __AutomaticJsonStringConversion,
  ExceptionOptionType as __ExceptionOptionType,
} from "@smithy/smithy-client";
import {
  ActionSource,
  ActionStatus,
  ActivationState,
  AdditionalInferenceSpecificationDefinition,
  AdditionalModelDataSource,
  AdditionalS3DataSource,
  AlgorithmValidationSpecification,
  AmazonQSettings,
  AnnotationConsolidationConfig,
  AppInstanceType,
  AppLifecycleManagement,
  AppNetworkAccessType,
  AppSecurityGroupManagement,
  AppType,
  ArtifactSource,
  AsyncInferenceConfig,
  AuthMode,
  AutoMLChannel,
  AutoMLComputeConfig,
  AutoMLDataSplitConfig,
  AutoMLJobChannel,
  AutoMLJobConfig,
  AutoMLJobObjective,
  AutoMLOutputDataConfig,
  AutoMLProblemTypeConfig,
  AutoMLSecurityConfig,
  AutoMountHomeEFS,
  AutoParameter,
  AutoRollbackConfig,
  Autotune,
  AwsManagedHumanLoopRequestSource,
  BatchTransformInput,
  BestObjectiveNotImproving,
  Bias,
  BlueGreenUpdatePolicy,
  CanvasAppSettings,
  CapacitySize,
  CaptureContentTypeHeader,
  CaptureOption,
  CategoricalParameter,
  CategoricalParameterRange,
  CategoricalParameterRangeSpecification,
  Channel,
  ChannelSpecification,
  CheckpointConfig,
  ClarifyExplainerConfig,
  ClusterInstanceGroupSpecification,
  ClusterNodeRecovery,
  ClusterOrchestrator,
  CodeEditorAppImageConfig,
  CodeEditorAppSettings,
  CodeRepository,
  CollectionConfig,
  CollectionType,
  CompleteOnConvergence,
  ComputeQuotaConfig,
  ComputeQuotaTarget,
  ContainerMode,
  CustomImage,
  FeatureStatus,
  GitConfig,
  ImageConfig,
  InferenceSpecification,
  JupyterLabAppImageConfig,
  KernelGatewayImageConfig,
  MetricDefinition,
  MetricsSource,
  ModelApprovalStatus,
  ModelDataSource,
  MultiModelConfig,
  OutputDataConfig,
  ProblemType,
  ProcessingS3DataDistributionType,
  ProcessingS3InputMode,
  ProductionVariantInstanceType,
  ResourceConfig,
  ResourceSpec,
  StoppingCondition,
  Tag,
  TargetDevice,
  TargetPlatformAccelerator,
  TargetPlatformArch,
  TargetPlatformOs,
  TrainingInputMode,
  TrainingInstanceType,
  TransformJobDefinition,
  VpcConfig,
} from "./models_0";
import { SageMakerServiceException as __BaseException } from "./SageMakerServiceException";
export interface ContainerDefinition {
  ContainerHostname?: string | undefined;
  Image?: string | undefined;
  ImageConfig?: ImageConfig | undefined;
  Mode?: ContainerMode | undefined;
  ModelDataUrl?: string | undefined;
  ModelDataSource?: ModelDataSource | undefined;
  AdditionalModelDataSources?: AdditionalModelDataSource[] | undefined;
  Environment?: Record<string, string> | undefined;
  ModelPackageName?: string | undefined;
  InferenceSpecificationName?: string | undefined;
  MultiModelConfig?: MultiModelConfig | undefined;
}
export declare const ContentClassifier: {
  readonly FREE_OF_ADULT_CONTENT: "FreeOfAdultContent";
  readonly FREE_OF_PERSONALLY_IDENTIFIABLE_INFORMATION: "FreeOfPersonallyIdentifiableInformation";
};
export type ContentClassifier =
  (typeof ContentClassifier)[keyof typeof ContentClassifier];
export interface ContextSource {
  SourceUri: string | undefined;
  SourceType?: string | undefined;
  SourceId?: string | undefined;
}
export interface ContextSummary {
  ContextArn?: string | undefined;
  ContextName?: string | undefined;
  Source?: ContextSource | undefined;
  ContextType?: string | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
}
export declare const HyperParameterScalingType: {
  readonly AUTO: "Auto";
  readonly LINEAR: "Linear";
  readonly LOGARITHMIC: "Logarithmic";
  readonly REVERSE_LOGARITHMIC: "ReverseLogarithmic";
};
export type HyperParameterScalingType =
  (typeof HyperParameterScalingType)[keyof typeof HyperParameterScalingType];
export interface ContinuousParameterRange {
  Name: string | undefined;
  MinValue: string | undefined;
  MaxValue: string | undefined;
  ScalingType?: HyperParameterScalingType | undefined;
}
export interface ContinuousParameterRangeSpecification {
  MinValue: string | undefined;
  MaxValue: string | undefined;
}
export interface ConvergenceDetected {
  CompleteOnConvergence?: CompleteOnConvergence | undefined;
}
export interface MetadataProperties {
  CommitId?: string | undefined;
  Repository?: string | undefined;
  GeneratedBy?: string | undefined;
  ProjectId?: string | undefined;
}
export interface CreateActionRequest {
  ActionName: string | undefined;
  Source: ActionSource | undefined;
  ActionType: string | undefined;
  Description?: string | undefined;
  Status?: ActionStatus | undefined;
  Properties?: Record<string, string> | undefined;
  MetadataProperties?: MetadataProperties | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateActionResponse {
  ActionArn?: string | undefined;
}
export interface IntegerParameterRangeSpecification {
  MinValue: string | undefined;
  MaxValue: string | undefined;
}
export interface ParameterRange {
  IntegerParameterRangeSpecification?:
    | IntegerParameterRangeSpecification
    | undefined;
  ContinuousParameterRangeSpecification?:
    | ContinuousParameterRangeSpecification
    | undefined;
  CategoricalParameterRangeSpecification?:
    | CategoricalParameterRangeSpecification
    | undefined;
}
export declare const ParameterType: {
  readonly CATEGORICAL: "Categorical";
  readonly CONTINUOUS: "Continuous";
  readonly FREE_TEXT: "FreeText";
  readonly INTEGER: "Integer";
};
export type ParameterType = (typeof ParameterType)[keyof typeof ParameterType];
export interface HyperParameterSpecification {
  Name: string | undefined;
  Description?: string | undefined;
  Type: ParameterType | undefined;
  Range?: ParameterRange | undefined;
  IsTunable?: boolean | undefined;
  IsRequired?: boolean | undefined;
  DefaultValue?: string | undefined;
}
export declare const HyperParameterTuningJobObjectiveType: {
  readonly MAXIMIZE: "Maximize";
  readonly MINIMIZE: "Minimize";
};
export type HyperParameterTuningJobObjectiveType =
  (typeof HyperParameterTuningJobObjectiveType)[keyof typeof HyperParameterTuningJobObjectiveType];
export interface HyperParameterTuningJobObjective {
  Type: HyperParameterTuningJobObjectiveType | undefined;
  MetricName: string | undefined;
}
export interface TrainingSpecification {
  TrainingImage: string | undefined;
  TrainingImageDigest?: string | undefined;
  SupportedHyperParameters?: HyperParameterSpecification[] | undefined;
  SupportedTrainingInstanceTypes: TrainingInstanceType[] | undefined;
  SupportsDistributedTraining?: boolean | undefined;
  MetricDefinitions?: MetricDefinition[] | undefined;
  TrainingChannels: ChannelSpecification[] | undefined;
  SupportedTuningJobObjectiveMetrics?:
    | HyperParameterTuningJobObjective[]
    | undefined;
  AdditionalS3DataSource?: AdditionalS3DataSource | undefined;
}
export interface CreateAlgorithmInput {
  AlgorithmName: string | undefined;
  AlgorithmDescription?: string | undefined;
  TrainingSpecification: TrainingSpecification | undefined;
  InferenceSpecification?: InferenceSpecification | undefined;
  ValidationSpecification?: AlgorithmValidationSpecification | undefined;
  CertifyForMarketplace?: boolean | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateAlgorithmOutput {
  AlgorithmArn: string | undefined;
}
export interface CreateAppRequest {
  DomainId: string | undefined;
  UserProfileName?: string | undefined;
  SpaceName?: string | undefined;
  AppType: AppType | undefined;
  AppName: string | undefined;
  Tags?: Tag[] | undefined;
  ResourceSpec?: ResourceSpec | undefined;
  RecoveryMode?: boolean | undefined;
}
export interface CreateAppResponse {
  AppArn?: string | undefined;
}
export declare class ResourceInUse extends __BaseException {
  readonly name: "ResourceInUse";
  readonly $fault: "client";
  Message?: string | undefined;
  constructor(opts: __ExceptionOptionType<ResourceInUse, __BaseException>);
}
export interface CreateAppImageConfigRequest {
  AppImageConfigName: string | undefined;
  Tags?: Tag[] | undefined;
  KernelGatewayImageConfig?: KernelGatewayImageConfig | undefined;
  JupyterLabAppImageConfig?: JupyterLabAppImageConfig | undefined;
  CodeEditorAppImageConfig?: CodeEditorAppImageConfig | undefined;
}
export interface CreateAppImageConfigResponse {
  AppImageConfigArn?: string | undefined;
}
export interface CreateArtifactRequest {
  ArtifactName?: string | undefined;
  Source: ArtifactSource | undefined;
  ArtifactType: string | undefined;
  Properties?: Record<string, string> | undefined;
  MetadataProperties?: MetadataProperties | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateArtifactResponse {
  ArtifactArn?: string | undefined;
}
export interface ModelDeployConfig {
  AutoGenerateEndpointName?: boolean | undefined;
  EndpointName?: string | undefined;
}
export interface CreateAutoMLJobRequest {
  AutoMLJobName: string | undefined;
  InputDataConfig: AutoMLChannel[] | undefined;
  OutputDataConfig: AutoMLOutputDataConfig | undefined;
  ProblemType?: ProblemType | undefined;
  AutoMLJobObjective?: AutoMLJobObjective | undefined;
  AutoMLJobConfig?: AutoMLJobConfig | undefined;
  RoleArn: string | undefined;
  GenerateCandidateDefinitionsOnly?: boolean | undefined;
  Tags?: Tag[] | undefined;
  ModelDeployConfig?: ModelDeployConfig | undefined;
}
export interface CreateAutoMLJobResponse {
  AutoMLJobArn: string | undefined;
}
export interface CreateAutoMLJobV2Request {
  AutoMLJobName: string | undefined;
  AutoMLJobInputDataConfig: AutoMLJobChannel[] | undefined;
  OutputDataConfig: AutoMLOutputDataConfig | undefined;
  AutoMLProblemTypeConfig: AutoMLProblemTypeConfig | undefined;
  RoleArn: string | undefined;
  Tags?: Tag[] | undefined;
  SecurityConfig?: AutoMLSecurityConfig | undefined;
  AutoMLJobObjective?: AutoMLJobObjective | undefined;
  ModelDeployConfig?: ModelDeployConfig | undefined;
  DataSplitConfig?: AutoMLDataSplitConfig | undefined;
  AutoMLComputeConfig?: AutoMLComputeConfig | undefined;
}
export interface CreateAutoMLJobV2Response {
  AutoMLJobArn: string | undefined;
}
export interface CreateClusterRequest {
  ClusterName: string | undefined;
  InstanceGroups: ClusterInstanceGroupSpecification[] | undefined;
  VpcConfig?: VpcConfig | undefined;
  Tags?: Tag[] | undefined;
  Orchestrator?: ClusterOrchestrator | undefined;
  NodeRecovery?: ClusterNodeRecovery | undefined;
}
export interface CreateClusterResponse {
  ClusterArn: string | undefined;
}
export declare const FairShare: {
  readonly DISABLED: "Disabled";
  readonly ENABLED: "Enabled";
};
export type FairShare = (typeof FairShare)[keyof typeof FairShare];
export interface PriorityClass {
  Name: string | undefined;
  Weight: number | undefined;
}
export interface SchedulerConfig {
  PriorityClasses?: PriorityClass[] | undefined;
  FairShare?: FairShare | undefined;
}
export interface CreateClusterSchedulerConfigRequest {
  Name: string | undefined;
  ClusterArn: string | undefined;
  SchedulerConfig: SchedulerConfig | undefined;
  Description?: string | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateClusterSchedulerConfigResponse {
  ClusterSchedulerConfigArn: string | undefined;
  ClusterSchedulerConfigId: string | undefined;
}
export interface CreateCodeRepositoryInput {
  CodeRepositoryName: string | undefined;
  GitConfig: GitConfig | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateCodeRepositoryOutput {
  CodeRepositoryArn: string | undefined;
}
export declare const Framework: {
  readonly DARKNET: "DARKNET";
  readonly KERAS: "KERAS";
  readonly MXNET: "MXNET";
  readonly ONNX: "ONNX";
  readonly PYTORCH: "PYTORCH";
  readonly SKLEARN: "SKLEARN";
  readonly TENSORFLOW: "TENSORFLOW";
  readonly TFLITE: "TFLITE";
  readonly XGBOOST: "XGBOOST";
};
export type Framework = (typeof Framework)[keyof typeof Framework];
export interface InputConfig {
  S3Uri: string | undefined;
  DataInputConfig?: string | undefined;
  Framework: Framework | undefined;
  FrameworkVersion?: string | undefined;
}
export interface TargetPlatform {
  Os: TargetPlatformOs | undefined;
  Arch: TargetPlatformArch | undefined;
  Accelerator?: TargetPlatformAccelerator | undefined;
}
export interface OutputConfig {
  S3OutputLocation: string | undefined;
  TargetDevice?: TargetDevice | undefined;
  TargetPlatform?: TargetPlatform | undefined;
  CompilerOptions?: string | undefined;
  KmsKeyId?: string | undefined;
}
export interface NeoVpcConfig {
  SecurityGroupIds: string[] | undefined;
  Subnets: string[] | undefined;
}
export interface CreateCompilationJobRequest {
  CompilationJobName: string | undefined;
  RoleArn: string | undefined;
  ModelPackageVersionArn?: string | undefined;
  InputConfig?: InputConfig | undefined;
  OutputConfig: OutputConfig | undefined;
  VpcConfig?: NeoVpcConfig | undefined;
  StoppingCondition: StoppingCondition | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateCompilationJobResponse {
  CompilationJobArn: string | undefined;
}
export interface CreateComputeQuotaRequest {
  Name: string | undefined;
  Description?: string | undefined;
  ClusterArn: string | undefined;
  ComputeQuotaConfig: ComputeQuotaConfig | undefined;
  ComputeQuotaTarget: ComputeQuotaTarget | undefined;
  ActivationState?: ActivationState | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateComputeQuotaResponse {
  ComputeQuotaArn: string | undefined;
  ComputeQuotaId: string | undefined;
}
export interface CreateContextRequest {
  ContextName: string | undefined;
  Source: ContextSource | undefined;
  ContextType: string | undefined;
  Description?: string | undefined;
  Properties?: Record<string, string> | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateContextResponse {
  ContextArn?: string | undefined;
}
export interface DataQualityAppSpecification {
  ImageUri: string | undefined;
  ContainerEntrypoint?: string[] | undefined;
  ContainerArguments?: string[] | undefined;
  RecordPreprocessorSourceUri?: string | undefined;
  PostAnalyticsProcessorSourceUri?: string | undefined;
  Environment?: Record<string, string> | undefined;
}
export interface MonitoringConstraintsResource {
  S3Uri?: string | undefined;
}
export interface MonitoringStatisticsResource {
  S3Uri?: string | undefined;
}
export interface DataQualityBaselineConfig {
  BaseliningJobName?: string | undefined;
  ConstraintsResource?: MonitoringConstraintsResource | undefined;
  StatisticsResource?: MonitoringStatisticsResource | undefined;
}
export interface EndpointInput {
  EndpointName: string | undefined;
  LocalPath: string | undefined;
  S3InputMode?: ProcessingS3InputMode | undefined;
  S3DataDistributionType?: ProcessingS3DataDistributionType | undefined;
  FeaturesAttribute?: string | undefined;
  InferenceAttribute?: string | undefined;
  ProbabilityAttribute?: string | undefined;
  ProbabilityThresholdAttribute?: number | undefined;
  StartTimeOffset?: string | undefined;
  EndTimeOffset?: string | undefined;
  ExcludeFeaturesAttribute?: string | undefined;
}
export interface DataQualityJobInput {
  EndpointInput?: EndpointInput | undefined;
  BatchTransformInput?: BatchTransformInput | undefined;
}
export declare const ProcessingS3UploadMode: {
  readonly CONTINUOUS: "Continuous";
  readonly END_OF_JOB: "EndOfJob";
};
export type ProcessingS3UploadMode =
  (typeof ProcessingS3UploadMode)[keyof typeof ProcessingS3UploadMode];
export interface MonitoringS3Output {
  S3Uri: string | undefined;
  LocalPath: string | undefined;
  S3UploadMode?: ProcessingS3UploadMode | undefined;
}
export interface MonitoringOutput {
  S3Output: MonitoringS3Output | undefined;
}
export interface MonitoringOutputConfig {
  MonitoringOutputs: MonitoringOutput[] | undefined;
  KmsKeyId?: string | undefined;
}
export declare const ProcessingInstanceType: {
  readonly ML_C4_2XLARGE: "ml.c4.2xlarge";
  readonly ML_C4_4XLARGE: "ml.c4.4xlarge";
  readonly ML_C4_8XLARGE: "ml.c4.8xlarge";
  readonly ML_C4_XLARGE: "ml.c4.xlarge";
  readonly ML_C5_18XLARGE: "ml.c5.18xlarge";
  readonly ML_C5_2XLARGE: "ml.c5.2xlarge";
  readonly ML_C5_4XLARGE: "ml.c5.4xlarge";
  readonly ML_C5_9XLARGE: "ml.c5.9xlarge";
  readonly ML_C5_XLARGE: "ml.c5.xlarge";
  readonly ML_C6I_12XLARGE: "ml.c6i.12xlarge";
  readonly ML_C6I_16XLARGE: "ml.c6i.16xlarge";
  readonly ML_C6I_24XLARGE: "ml.c6i.24xlarge";
  readonly ML_C6I_2XLARGE: "ml.c6i.2xlarge";
  readonly ML_C6I_32XLARGE: "ml.c6i.32xlarge";
  readonly ML_C6I_4XLARGE: "ml.c6i.4xlarge";
  readonly ML_C6I_8XLARGE: "ml.c6i.8xlarge";
  readonly ML_C6I_XLARGE: "ml.c6i.xlarge";
  readonly ML_G4DN_12XLARGE: "ml.g4dn.12xlarge";
  readonly ML_G4DN_16XLARGE: "ml.g4dn.16xlarge";
  readonly ML_G4DN_2XLARGE: "ml.g4dn.2xlarge";
  readonly ML_G4DN_4XLARGE: "ml.g4dn.4xlarge";
  readonly ML_G4DN_8XLARGE: "ml.g4dn.8xlarge";
  readonly ML_G4DN_XLARGE: "ml.g4dn.xlarge";
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
  readonly ML_M4_10XLARGE: "ml.m4.10xlarge";
  readonly ML_M4_16XLARGE: "ml.m4.16xlarge";
  readonly ML_M4_2XLARGE: "ml.m4.2xlarge";
  readonly ML_M4_4XLARGE: "ml.m4.4xlarge";
  readonly ML_M4_XLARGE: "ml.m4.xlarge";
  readonly ML_M5_12XLARGE: "ml.m5.12xlarge";
  readonly ML_M5_24XLARGE: "ml.m5.24xlarge";
  readonly ML_M5_2XLARGE: "ml.m5.2xlarge";
  readonly ML_M5_4XLARGE: "ml.m5.4xlarge";
  readonly ML_M5_LARGE: "ml.m5.large";
  readonly ML_M5_XLARGE: "ml.m5.xlarge";
  readonly ML_M6I_12XLARGE: "ml.m6i.12xlarge";
  readonly ML_M6I_16XLARGE: "ml.m6i.16xlarge";
  readonly ML_M6I_24XLARGE: "ml.m6i.24xlarge";
  readonly ML_M6I_2XLARGE: "ml.m6i.2xlarge";
  readonly ML_M6I_32XLARGE: "ml.m6i.32xlarge";
  readonly ML_M6I_4XLARGE: "ml.m6i.4xlarge";
  readonly ML_M6I_8XLARGE: "ml.m6i.8xlarge";
  readonly ML_M6I_LARGE: "ml.m6i.large";
  readonly ML_M6I_XLARGE: "ml.m6i.xlarge";
  readonly ML_P2_16XLARGE: "ml.p2.16xlarge";
  readonly ML_P2_8XLARGE: "ml.p2.8xlarge";
  readonly ML_P2_XLARGE: "ml.p2.xlarge";
  readonly ML_P3_16XLARGE: "ml.p3.16xlarge";
  readonly ML_P3_2XLARGE: "ml.p3.2xlarge";
  readonly ML_P3_8XLARGE: "ml.p3.8xlarge";
  readonly ML_R5D_12XLARGE: "ml.r5d.12xlarge";
  readonly ML_R5D_16XLARGE: "ml.r5d.16xlarge";
  readonly ML_R5D_24XLARGE: "ml.r5d.24xlarge";
  readonly ML_R5D_2XLARGE: "ml.r5d.2xlarge";
  readonly ML_R5D_4XLARGE: "ml.r5d.4xlarge";
  readonly ML_R5D_8XLARGE: "ml.r5d.8xlarge";
  readonly ML_R5D_LARGE: "ml.r5d.large";
  readonly ML_R5D_XLARGE: "ml.r5d.xlarge";
  readonly ML_R5_12XLARGE: "ml.r5.12xlarge";
  readonly ML_R5_16XLARGE: "ml.r5.16xlarge";
  readonly ML_R5_24XLARGE: "ml.r5.24xlarge";
  readonly ML_R5_2XLARGE: "ml.r5.2xlarge";
  readonly ML_R5_4XLARGE: "ml.r5.4xlarge";
  readonly ML_R5_8XLARGE: "ml.r5.8xlarge";
  readonly ML_R5_LARGE: "ml.r5.large";
  readonly ML_R5_XLARGE: "ml.r5.xlarge";
  readonly ML_T3_2XLARGE: "ml.t3.2xlarge";
  readonly ML_T3_LARGE: "ml.t3.large";
  readonly ML_T3_MEDIUM: "ml.t3.medium";
  readonly ML_T3_XLARGE: "ml.t3.xlarge";
};
export type ProcessingInstanceType =
  (typeof ProcessingInstanceType)[keyof typeof ProcessingInstanceType];
export interface MonitoringClusterConfig {
  InstanceCount: number | undefined;
  InstanceType: ProcessingInstanceType | undefined;
  VolumeSizeInGB: number | undefined;
  VolumeKmsKeyId?: string | undefined;
}
export interface MonitoringResources {
  ClusterConfig: MonitoringClusterConfig | undefined;
}
export interface MonitoringNetworkConfig {
  EnableInterContainerTrafficEncryption?: boolean | undefined;
  EnableNetworkIsolation?: boolean | undefined;
  VpcConfig?: VpcConfig | undefined;
}
export interface MonitoringStoppingCondition {
  MaxRuntimeInSeconds: number | undefined;
}
export interface CreateDataQualityJobDefinitionRequest {
  JobDefinitionName: string | undefined;
  DataQualityBaselineConfig?: DataQualityBaselineConfig | undefined;
  DataQualityAppSpecification: DataQualityAppSpecification | undefined;
  DataQualityJobInput: DataQualityJobInput | undefined;
  DataQualityJobOutputConfig: MonitoringOutputConfig | undefined;
  JobResources: MonitoringResources | undefined;
  NetworkConfig?: MonitoringNetworkConfig | undefined;
  RoleArn: string | undefined;
  StoppingCondition?: MonitoringStoppingCondition | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateDataQualityJobDefinitionResponse {
  JobDefinitionArn: string | undefined;
}
export declare const EdgePresetDeploymentType: {
  readonly GreengrassV2Component: "GreengrassV2Component";
};
export type EdgePresetDeploymentType =
  (typeof EdgePresetDeploymentType)[keyof typeof EdgePresetDeploymentType];
export interface EdgeOutputConfig {
  S3OutputLocation: string | undefined;
  KmsKeyId?: string | undefined;
  PresetDeploymentType?: EdgePresetDeploymentType | undefined;
  PresetDeploymentConfig?: string | undefined;
}
export interface CreateDeviceFleetRequest {
  DeviceFleetName: string | undefined;
  RoleArn?: string | undefined;
  Description?: string | undefined;
  OutputConfig: EdgeOutputConfig | undefined;
  Tags?: Tag[] | undefined;
  EnableIotRoleAlias?: boolean | undefined;
}
export interface EFSFileSystemConfig {
  FileSystemId: string | undefined;
  FileSystemPath?: string | undefined;
}
export interface FSxLustreFileSystemConfig {
  FileSystemId: string | undefined;
  FileSystemPath?: string | undefined;
}
export type CustomFileSystemConfig =
  | CustomFileSystemConfig.EFSFileSystemConfigMember
  | CustomFileSystemConfig.FSxLustreFileSystemConfigMember
  | CustomFileSystemConfig.$UnknownMember;
export declare namespace CustomFileSystemConfig {
  interface EFSFileSystemConfigMember {
    EFSFileSystemConfig: EFSFileSystemConfig;
    FSxLustreFileSystemConfig?: never;
    $unknown?: never;
  }
  interface FSxLustreFileSystemConfigMember {
    EFSFileSystemConfig?: never;
    FSxLustreFileSystemConfig: FSxLustreFileSystemConfig;
    $unknown?: never;
  }
  interface $UnknownMember {
    EFSFileSystemConfig?: never;
    FSxLustreFileSystemConfig?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    EFSFileSystemConfig: (value: EFSFileSystemConfig) => T;
    FSxLustreFileSystemConfig: (value: FSxLustreFileSystemConfig) => T;
    _: (name: string, value: any) => T;
  }
  const visit: <T>(value: CustomFileSystemConfig, visitor: Visitor<T>) => T;
}
export interface CustomPosixUserConfig {
  Uid: number | undefined;
  Gid: number | undefined;
}
export interface EmrSettings {
  AssumableRoleArns?: string[] | undefined;
  ExecutionRoleArns?: string[] | undefined;
}
export interface JupyterLabAppSettings {
  DefaultResourceSpec?: ResourceSpec | undefined;
  CustomImages?: CustomImage[] | undefined;
  LifecycleConfigArns?: string[] | undefined;
  CodeRepositories?: CodeRepository[] | undefined;
  AppLifecycleManagement?: AppLifecycleManagement | undefined;
  EmrSettings?: EmrSettings | undefined;
  BuiltInLifecycleConfigArn?: string | undefined;
}
export interface JupyterServerAppSettings {
  DefaultResourceSpec?: ResourceSpec | undefined;
  LifecycleConfigArns?: string[] | undefined;
  CodeRepositories?: CodeRepository[] | undefined;
}
export interface KernelGatewayAppSettings {
  DefaultResourceSpec?: ResourceSpec | undefined;
  CustomImages?: CustomImage[] | undefined;
  LifecycleConfigArns?: string[] | undefined;
}
export interface DefaultEbsStorageSettings {
  DefaultEbsVolumeSizeInGb: number | undefined;
  MaximumEbsVolumeSizeInGb: number | undefined;
}
export interface DefaultSpaceStorageSettings {
  DefaultEbsStorageSettings?: DefaultEbsStorageSettings | undefined;
}
export interface DefaultSpaceSettings {
  ExecutionRole?: string | undefined;
  SecurityGroups?: string[] | undefined;
  JupyterServerAppSettings?: JupyterServerAppSettings | undefined;
  KernelGatewayAppSettings?: KernelGatewayAppSettings | undefined;
  JupyterLabAppSettings?: JupyterLabAppSettings | undefined;
  SpaceStorageSettings?: DefaultSpaceStorageSettings | undefined;
  CustomPosixUserConfig?: CustomPosixUserConfig | undefined;
  CustomFileSystemConfigs?: CustomFileSystemConfig[] | undefined;
}
export interface RSessionAppSettings {
  DefaultResourceSpec?: ResourceSpec | undefined;
  CustomImages?: CustomImage[] | undefined;
}
export declare const RStudioServerProAccessStatus: {
  readonly Disabled: "DISABLED";
  readonly Enabled: "ENABLED";
};
export type RStudioServerProAccessStatus =
  (typeof RStudioServerProAccessStatus)[keyof typeof RStudioServerProAccessStatus];
export declare const RStudioServerProUserGroup: {
  readonly Admin: "R_STUDIO_ADMIN";
  readonly User: "R_STUDIO_USER";
};
export type RStudioServerProUserGroup =
  (typeof RStudioServerProUserGroup)[keyof typeof RStudioServerProUserGroup];
export interface RStudioServerProAppSettings {
  AccessStatus?: RStudioServerProAccessStatus | undefined;
  UserGroup?: RStudioServerProUserGroup | undefined;
}
export declare const NotebookOutputOption: {
  readonly Allowed: "Allowed";
  readonly Disabled: "Disabled";
};
export type NotebookOutputOption =
  (typeof NotebookOutputOption)[keyof typeof NotebookOutputOption];
export interface SharingSettings {
  NotebookOutputOption?: NotebookOutputOption | undefined;
  S3OutputPath?: string | undefined;
  S3KmsKeyId?: string | undefined;
}
export declare const StudioWebPortal: {
  readonly Disabled: "DISABLED";
  readonly Enabled: "ENABLED";
};
export type StudioWebPortal =
  (typeof StudioWebPortal)[keyof typeof StudioWebPortal];
export declare const MlTools: {
  readonly AUTO_ML: "AutoMl";
  readonly COMET: "Comet";
  readonly DATA_WRANGLER: "DataWrangler";
  readonly DEEPCHECKS_LLM_EVALUATION: "DeepchecksLLMEvaluation";
  readonly EMR_CLUSTERS: "EmrClusters";
  readonly ENDPOINTS: "Endpoints";
  readonly EXPERIMENTS: "Experiments";
  readonly FEATURE_STORE: "FeatureStore";
  readonly FIDDLER: "Fiddler";
  readonly HYPER_POD_CLUSTERS: "HyperPodClusters";
  readonly INFERENCE_OPTIMIZATION: "InferenceOptimization";
  readonly INFERENCE_RECOMMENDER: "InferenceRecommender";
  readonly JUMP_START: "JumpStart";
  readonly LAKERA_GUARD: "LakeraGuard";
  readonly MODELS: "Models";
  readonly MODEL_EVALUATION: "ModelEvaluation";
  readonly PERFORMANCE_EVALUATION: "PerformanceEvaluation";
  readonly PIPELINES: "Pipelines";
  readonly PROJECTS: "Projects";
  readonly TRAINING: "Training";
};
export type MlTools = (typeof MlTools)[keyof typeof MlTools];
export declare const SageMakerImageName: {
  readonly sagemaker_distribution: "sagemaker_distribution";
};
export type SageMakerImageName =
  (typeof SageMakerImageName)[keyof typeof SageMakerImageName];
export interface HiddenSageMakerImage {
  SageMakerImageName?: SageMakerImageName | undefined;
  VersionAliases?: string[] | undefined;
}
export interface StudioWebPortalSettings {
  HiddenMlTools?: MlTools[] | undefined;
  HiddenAppTypes?: AppType[] | undefined;
  HiddenInstanceTypes?: AppInstanceType[] | undefined;
  HiddenSageMakerImageVersionAliases?: HiddenSageMakerImage[] | undefined;
}
export interface TensorBoardAppSettings {
  DefaultResourceSpec?: ResourceSpec | undefined;
}
export interface UserSettings {
  ExecutionRole?: string | undefined;
  SecurityGroups?: string[] | undefined;
  SharingSettings?: SharingSettings | undefined;
  JupyterServerAppSettings?: JupyterServerAppSettings | undefined;
  KernelGatewayAppSettings?: KernelGatewayAppSettings | undefined;
  TensorBoardAppSettings?: TensorBoardAppSettings | undefined;
  RStudioServerProAppSettings?: RStudioServerProAppSettings | undefined;
  RSessionAppSettings?: RSessionAppSettings | undefined;
  CanvasAppSettings?: CanvasAppSettings | undefined;
  CodeEditorAppSettings?: CodeEditorAppSettings | undefined;
  JupyterLabAppSettings?: JupyterLabAppSettings | undefined;
  SpaceStorageSettings?: DefaultSpaceStorageSettings | undefined;
  DefaultLandingUri?: string | undefined;
  StudioWebPortal?: StudioWebPortal | undefined;
  CustomPosixUserConfig?: CustomPosixUserConfig | undefined;
  CustomFileSystemConfigs?: CustomFileSystemConfig[] | undefined;
  StudioWebPortalSettings?: StudioWebPortalSettings | undefined;
  AutoMountHomeEFS?: AutoMountHomeEFS | undefined;
}
export interface DockerSettings {
  EnableDockerAccess?: FeatureStatus | undefined;
  VpcOnlyTrustedAccounts?: string[] | undefined;
}
export declare const ExecutionRoleIdentityConfig: {
  readonly DISABLED: "DISABLED";
  readonly USER_PROFILE_NAME: "USER_PROFILE_NAME";
};
export type ExecutionRoleIdentityConfig =
  (typeof ExecutionRoleIdentityConfig)[keyof typeof ExecutionRoleIdentityConfig];
export interface RStudioServerProDomainSettings {
  DomainExecutionRoleArn: string | undefined;
  RStudioConnectUrl?: string | undefined;
  RStudioPackageManagerUrl?: string | undefined;
  DefaultResourceSpec?: ResourceSpec | undefined;
}
export interface UnifiedStudioSettings {
  StudioWebPortalAccess?: FeatureStatus | undefined;
  DomainAccountId?: string | undefined;
  DomainRegion?: string | undefined;
  DomainId?: string | undefined;
  ProjectId?: string | undefined;
  EnvironmentId?: string | undefined;
  ProjectS3Path?: string | undefined;
}
export interface DomainSettings {
  SecurityGroupIds?: string[] | undefined;
  RStudioServerProDomainSettings?: RStudioServerProDomainSettings | undefined;
  ExecutionRoleIdentityConfig?: ExecutionRoleIdentityConfig | undefined;
  DockerSettings?: DockerSettings | undefined;
  AmazonQSettings?: AmazonQSettings | undefined;
  UnifiedStudioSettings?: UnifiedStudioSettings | undefined;
}
export declare const TagPropagation: {
  readonly DISABLED: "DISABLED";
  readonly ENABLED: "ENABLED";
};
export type TagPropagation =
  (typeof TagPropagation)[keyof typeof TagPropagation];
export interface CreateDomainRequest {
  DomainName: string | undefined;
  AuthMode: AuthMode | undefined;
  DefaultUserSettings: UserSettings | undefined;
  DomainSettings?: DomainSettings | undefined;
  SubnetIds: string[] | undefined;
  VpcId: string | undefined;
  Tags?: Tag[] | undefined;
  AppNetworkAccessType?: AppNetworkAccessType | undefined;
  HomeEfsFileSystemKmsKeyId?: string | undefined;
  KmsKeyId?: string | undefined;
  AppSecurityGroupManagement?: AppSecurityGroupManagement | undefined;
  TagPropagation?: TagPropagation | undefined;
  DefaultSpaceSettings?: DefaultSpaceSettings | undefined;
}
export interface CreateDomainResponse {
  DomainArn?: string | undefined;
  DomainId?: string | undefined;
  Url?: string | undefined;
}
export interface EdgeDeploymentModelConfig {
  ModelHandle: string | undefined;
  EdgePackagingJobName: string | undefined;
}
export declare const FailureHandlingPolicy: {
  readonly DoNothing: "DO_NOTHING";
  readonly RollbackOnFailure: "ROLLBACK_ON_FAILURE";
};
export type FailureHandlingPolicy =
  (typeof FailureHandlingPolicy)[keyof typeof FailureHandlingPolicy];
export interface EdgeDeploymentConfig {
  FailureHandlingPolicy: FailureHandlingPolicy | undefined;
}
export declare const DeviceSubsetType: {
  readonly NameContains: "NAMECONTAINS";
  readonly Percentage: "PERCENTAGE";
  readonly Selection: "SELECTION";
};
export type DeviceSubsetType =
  (typeof DeviceSubsetType)[keyof typeof DeviceSubsetType];
export interface DeviceSelectionConfig {
  DeviceSubsetType: DeviceSubsetType | undefined;
  Percentage?: number | undefined;
  DeviceNames?: string[] | undefined;
  DeviceNameContains?: string | undefined;
}
export interface DeploymentStage {
  StageName: string | undefined;
  DeviceSelectionConfig: DeviceSelectionConfig | undefined;
  DeploymentConfig?: EdgeDeploymentConfig | undefined;
}
export interface CreateEdgeDeploymentPlanRequest {
  EdgeDeploymentPlanName: string | undefined;
  ModelConfigs: EdgeDeploymentModelConfig[] | undefined;
  DeviceFleetName: string | undefined;
  Stages?: DeploymentStage[] | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateEdgeDeploymentPlanResponse {
  EdgeDeploymentPlanArn: string | undefined;
}
export interface CreateEdgeDeploymentStageRequest {
  EdgeDeploymentPlanName: string | undefined;
  Stages: DeploymentStage[] | undefined;
}
export interface CreateEdgePackagingJobRequest {
  EdgePackagingJobName: string | undefined;
  CompilationJobName: string | undefined;
  ModelName: string | undefined;
  ModelVersion: string | undefined;
  RoleArn: string | undefined;
  OutputConfig: EdgeOutputConfig | undefined;
  ResourceKey?: string | undefined;
  Tags?: Tag[] | undefined;
}
export interface RollingUpdatePolicy {
  MaximumBatchSize: CapacitySize | undefined;
  WaitIntervalInSeconds: number | undefined;
  MaximumExecutionTimeoutInSeconds?: number | undefined;
  RollbackMaximumBatchSize?: CapacitySize | undefined;
}
export interface DeploymentConfig {
  BlueGreenUpdatePolicy?: BlueGreenUpdatePolicy | undefined;
  RollingUpdatePolicy?: RollingUpdatePolicy | undefined;
  AutoRollbackConfiguration?: AutoRollbackConfig | undefined;
}
export interface CreateEndpointInput {
  EndpointName: string | undefined;
  EndpointConfigName: string | undefined;
  DeploymentConfig?: DeploymentConfig | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateEndpointOutput {
  EndpointArn: string | undefined;
}
export interface DataCaptureConfig {
  EnableCapture?: boolean | undefined;
  InitialSamplingPercentage: number | undefined;
  DestinationS3Uri: string | undefined;
  KmsKeyId?: string | undefined;
  CaptureOptions: CaptureOption[] | undefined;
  CaptureContentTypeHeader?: CaptureContentTypeHeader | undefined;
}
export interface ExplainerConfig {
  ClarifyExplainerConfig?: ClarifyExplainerConfig | undefined;
}
export declare const ProductionVariantAcceleratorType: {
  readonly ML_EIA1_LARGE: "ml.eia1.large";
  readonly ML_EIA1_MEDIUM: "ml.eia1.medium";
  readonly ML_EIA1_XLARGE: "ml.eia1.xlarge";
  readonly ML_EIA2_LARGE: "ml.eia2.large";
  readonly ML_EIA2_MEDIUM: "ml.eia2.medium";
  readonly ML_EIA2_XLARGE: "ml.eia2.xlarge";
};
export type ProductionVariantAcceleratorType =
  (typeof ProductionVariantAcceleratorType)[keyof typeof ProductionVariantAcceleratorType];
export interface ProductionVariantCoreDumpConfig {
  DestinationS3Uri: string | undefined;
  KmsKeyId?: string | undefined;
}
export declare const ProductionVariantInferenceAmiVersion: {
  readonly AL2_GPU_2: "al2-ami-sagemaker-inference-gpu-2";
  readonly AL2_GPU_2_1: "al2-ami-sagemaker-inference-gpu-2-1";
  readonly AL2_GPU_3_1: "al2-ami-sagemaker-inference-gpu-3-1";
  readonly AL2_NEURON_2: "al2-ami-sagemaker-inference-neuron-2";
};
export type ProductionVariantInferenceAmiVersion =
  (typeof ProductionVariantInferenceAmiVersion)[keyof typeof ProductionVariantInferenceAmiVersion];
export declare const ManagedInstanceScalingStatus: {
  readonly DISABLED: "DISABLED";
  readonly ENABLED: "ENABLED";
};
export type ManagedInstanceScalingStatus =
  (typeof ManagedInstanceScalingStatus)[keyof typeof ManagedInstanceScalingStatus];
export interface ProductionVariantManagedInstanceScaling {
  Status?: ManagedInstanceScalingStatus | undefined;
  MinInstanceCount?: number | undefined;
  MaxInstanceCount?: number | undefined;
}
export declare const RoutingStrategy: {
  readonly LEAST_OUTSTANDING_REQUESTS: "LEAST_OUTSTANDING_REQUESTS";
  readonly RANDOM: "RANDOM";
};
export type RoutingStrategy =
  (typeof RoutingStrategy)[keyof typeof RoutingStrategy];
export interface ProductionVariantRoutingConfig {
  RoutingStrategy: RoutingStrategy | undefined;
}
export interface ProductionVariantServerlessConfig {
  MemorySizeInMB: number | undefined;
  MaxConcurrency: number | undefined;
  ProvisionedConcurrency?: number | undefined;
}
export interface ProductionVariant {
  VariantName: string | undefined;
  ModelName?: string | undefined;
  InitialInstanceCount?: number | undefined;
  InstanceType?: ProductionVariantInstanceType | undefined;
  InitialVariantWeight?: number | undefined;
  AcceleratorType?: ProductionVariantAcceleratorType | undefined;
  CoreDumpConfig?: ProductionVariantCoreDumpConfig | undefined;
  ServerlessConfig?: ProductionVariantServerlessConfig | undefined;
  VolumeSizeInGB?: number | undefined;
  ModelDataDownloadTimeoutInSeconds?: number | undefined;
  ContainerStartupHealthCheckTimeoutInSeconds?: number | undefined;
  EnableSSMAccess?: boolean | undefined;
  ManagedInstanceScaling?: ProductionVariantManagedInstanceScaling | undefined;
  RoutingConfig?: ProductionVariantRoutingConfig | undefined;
  InferenceAmiVersion?: ProductionVariantInferenceAmiVersion | undefined;
}
export interface CreateEndpointConfigInput {
  EndpointConfigName: string | undefined;
  ProductionVariants: ProductionVariant[] | undefined;
  DataCaptureConfig?: DataCaptureConfig | undefined;
  Tags?: Tag[] | undefined;
  KmsKeyId?: string | undefined;
  AsyncInferenceConfig?: AsyncInferenceConfig | undefined;
  ExplainerConfig?: ExplainerConfig | undefined;
  ShadowProductionVariants?: ProductionVariant[] | undefined;
  ExecutionRoleArn?: string | undefined;
  VpcConfig?: VpcConfig | undefined;
  EnableNetworkIsolation?: boolean | undefined;
}
export interface CreateEndpointConfigOutput {
  EndpointConfigArn: string | undefined;
}
export interface CreateExperimentRequest {
  ExperimentName: string | undefined;
  DisplayName?: string | undefined;
  Description?: string | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateExperimentResponse {
  ExperimentArn?: string | undefined;
}
export declare const FeatureType: {
  readonly FRACTIONAL: "Fractional";
  readonly INTEGRAL: "Integral";
  readonly STRING: "String";
};
export type FeatureType = (typeof FeatureType)[keyof typeof FeatureType];
export interface FeatureDefinition {
  FeatureName: string | undefined;
  FeatureType: FeatureType | undefined;
  CollectionType?: CollectionType | undefined;
  CollectionConfig?: CollectionConfig | undefined;
}
export interface DataCatalogConfig {
  TableName: string | undefined;
  Catalog: string | undefined;
  Database: string | undefined;
}
export interface S3StorageConfig {
  S3Uri: string | undefined;
  KmsKeyId?: string | undefined;
  ResolvedOutputS3Uri?: string | undefined;
}
export declare const TableFormat: {
  readonly DEFAULT: "Default";
  readonly GLUE: "Glue";
  readonly ICEBERG: "Iceberg";
};
export type TableFormat = (typeof TableFormat)[keyof typeof TableFormat];
export interface OfflineStoreConfig {
  S3StorageConfig: S3StorageConfig | undefined;
  DisableGlueTableCreation?: boolean | undefined;
  DataCatalogConfig?: DataCatalogConfig | undefined;
  TableFormat?: TableFormat | undefined;
}
export interface OnlineStoreSecurityConfig {
  KmsKeyId?: string | undefined;
}
export declare const StorageType: {
  readonly IN_MEMORY: "InMemory";
  readonly STANDARD: "Standard";
};
export type StorageType = (typeof StorageType)[keyof typeof StorageType];
export declare const TtlDurationUnit: {
  readonly DAYS: "Days";
  readonly HOURS: "Hours";
  readonly MINUTES: "Minutes";
  readonly SECONDS: "Seconds";
  readonly WEEKS: "Weeks";
};
export type TtlDurationUnit =
  (typeof TtlDurationUnit)[keyof typeof TtlDurationUnit];
export interface TtlDuration {
  Unit?: TtlDurationUnit | undefined;
  Value?: number | undefined;
}
export interface OnlineStoreConfig {
  SecurityConfig?: OnlineStoreSecurityConfig | undefined;
  EnableOnlineStore?: boolean | undefined;
  TtlDuration?: TtlDuration | undefined;
  StorageType?: StorageType | undefined;
}
export declare const ThroughputMode: {
  readonly ON_DEMAND: "OnDemand";
  readonly PROVISIONED: "Provisioned";
};
export type ThroughputMode =
  (typeof ThroughputMode)[keyof typeof ThroughputMode];
export interface ThroughputConfig {
  ThroughputMode: ThroughputMode | undefined;
  ProvisionedReadCapacityUnits?: number | undefined;
  ProvisionedWriteCapacityUnits?: number | undefined;
}
export interface CreateFeatureGroupRequest {
  FeatureGroupName: string | undefined;
  RecordIdentifierFeatureName: string | undefined;
  EventTimeFeatureName: string | undefined;
  FeatureDefinitions: FeatureDefinition[] | undefined;
  OnlineStoreConfig?: OnlineStoreConfig | undefined;
  OfflineStoreConfig?: OfflineStoreConfig | undefined;
  ThroughputConfig?: ThroughputConfig | undefined;
  RoleArn?: string | undefined;
  Description?: string | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateFeatureGroupResponse {
  FeatureGroupArn: string | undefined;
}
export interface HumanLoopActivationConditionsConfig {
  HumanLoopActivationConditions:
    | __AutomaticJsonStringConversion
    | string
    | undefined;
}
export interface HumanLoopActivationConfig {
  HumanLoopActivationConditionsConfig:
    | HumanLoopActivationConditionsConfig
    | undefined;
}
export interface USD {
  Dollars?: number | undefined;
  Cents?: number | undefined;
  TenthFractionsOfACent?: number | undefined;
}
export interface PublicWorkforceTaskPrice {
  AmountInUsd?: USD | undefined;
}
export interface HumanLoopConfig {
  WorkteamArn: string | undefined;
  HumanTaskUiArn: string | undefined;
  TaskTitle: string | undefined;
  TaskDescription: string | undefined;
  TaskCount: number | undefined;
  TaskAvailabilityLifetimeInSeconds?: number | undefined;
  TaskTimeLimitInSeconds?: number | undefined;
  TaskKeywords?: string[] | undefined;
  PublicWorkforceTaskPrice?: PublicWorkforceTaskPrice | undefined;
}
export interface HumanLoopRequestSource {
  AwsManagedHumanLoopRequestSource:
    | AwsManagedHumanLoopRequestSource
    | undefined;
}
export interface FlowDefinitionOutputConfig {
  S3OutputPath: string | undefined;
  KmsKeyId?: string | undefined;
}
export interface CreateFlowDefinitionRequest {
  FlowDefinitionName: string | undefined;
  HumanLoopRequestSource?: HumanLoopRequestSource | undefined;
  HumanLoopActivationConfig?: HumanLoopActivationConfig | undefined;
  HumanLoopConfig?: HumanLoopConfig | undefined;
  OutputConfig: FlowDefinitionOutputConfig | undefined;
  RoleArn: string | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateFlowDefinitionResponse {
  FlowDefinitionArn: string | undefined;
}
export interface HubS3StorageConfig {
  S3OutputPath?: string | undefined;
}
export interface CreateHubRequest {
  HubName: string | undefined;
  HubDescription: string | undefined;
  HubDisplayName?: string | undefined;
  HubSearchKeywords?: string[] | undefined;
  S3StorageConfig?: HubS3StorageConfig | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateHubResponse {
  HubArn: string | undefined;
}
export interface CreateHubContentReferenceRequest {
  HubName: string | undefined;
  SageMakerPublicHubContentArn: string | undefined;
  HubContentName?: string | undefined;
  MinVersion?: string | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateHubContentReferenceResponse {
  HubArn: string | undefined;
  HubContentArn: string | undefined;
}
export interface UiTemplate {
  Content: string | undefined;
}
export interface CreateHumanTaskUiRequest {
  HumanTaskUiName: string | undefined;
  UiTemplate: UiTemplate | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateHumanTaskUiResponse {
  HumanTaskUiArn: string | undefined;
}
export interface IntegerParameterRange {
  Name: string | undefined;
  MinValue: string | undefined;
  MaxValue: string | undefined;
  ScalingType?: HyperParameterScalingType | undefined;
}
export interface ParameterRanges {
  IntegerParameterRanges?: IntegerParameterRange[] | undefined;
  ContinuousParameterRanges?: ContinuousParameterRange[] | undefined;
  CategoricalParameterRanges?: CategoricalParameterRange[] | undefined;
  AutoParameters?: AutoParameter[] | undefined;
}
export interface ResourceLimits {
  MaxNumberOfTrainingJobs?: number | undefined;
  MaxParallelTrainingJobs: number | undefined;
  MaxRuntimeInSeconds?: number | undefined;
}
export declare const HyperParameterTuningJobStrategyType: {
  readonly BAYESIAN: "Bayesian";
  readonly GRID: "Grid";
  readonly HYPERBAND: "Hyperband";
  readonly RANDOM: "Random";
};
export type HyperParameterTuningJobStrategyType =
  (typeof HyperParameterTuningJobStrategyType)[keyof typeof HyperParameterTuningJobStrategyType];
export interface HyperbandStrategyConfig {
  MinResource?: number | undefined;
  MaxResource?: number | undefined;
}
export interface HyperParameterTuningJobStrategyConfig {
  HyperbandStrategyConfig?: HyperbandStrategyConfig | undefined;
}
export declare const TrainingJobEarlyStoppingType: {
  readonly AUTO: "Auto";
  readonly OFF: "Off";
};
export type TrainingJobEarlyStoppingType =
  (typeof TrainingJobEarlyStoppingType)[keyof typeof TrainingJobEarlyStoppingType];
export interface TuningJobCompletionCriteria {
  TargetObjectiveMetricValue?: number | undefined;
  BestObjectiveNotImproving?: BestObjectiveNotImproving | undefined;
  ConvergenceDetected?: ConvergenceDetected | undefined;
}
export interface HyperParameterTuningJobConfig {
  Strategy: HyperParameterTuningJobStrategyType | undefined;
  StrategyConfig?: HyperParameterTuningJobStrategyConfig | undefined;
  HyperParameterTuningJobObjective?:
    | HyperParameterTuningJobObjective
    | undefined;
  ResourceLimits: ResourceLimits | undefined;
  ParameterRanges?: ParameterRanges | undefined;
  TrainingJobEarlyStoppingType?: TrainingJobEarlyStoppingType | undefined;
  TuningJobCompletionCriteria?: TuningJobCompletionCriteria | undefined;
  RandomSeed?: number | undefined;
}
export interface HyperParameterAlgorithmSpecification {
  TrainingImage?: string | undefined;
  TrainingInputMode: TrainingInputMode | undefined;
  AlgorithmName?: string | undefined;
  MetricDefinitions?: MetricDefinition[] | undefined;
}
export declare const HyperParameterTuningAllocationStrategy: {
  readonly PRIORITIZED: "Prioritized";
};
export type HyperParameterTuningAllocationStrategy =
  (typeof HyperParameterTuningAllocationStrategy)[keyof typeof HyperParameterTuningAllocationStrategy];
export interface HyperParameterTuningInstanceConfig {
  InstanceType: TrainingInstanceType | undefined;
  InstanceCount: number | undefined;
  VolumeSizeInGB: number | undefined;
}
export interface HyperParameterTuningResourceConfig {
  InstanceType?: TrainingInstanceType | undefined;
  InstanceCount?: number | undefined;
  VolumeSizeInGB?: number | undefined;
  VolumeKmsKeyId?: string | undefined;
  AllocationStrategy?: HyperParameterTuningAllocationStrategy | undefined;
  InstanceConfigs?: HyperParameterTuningInstanceConfig[] | undefined;
}
export interface RetryStrategy {
  MaximumRetryAttempts: number | undefined;
}
export interface HyperParameterTrainingJobDefinition {
  DefinitionName?: string | undefined;
  TuningObjective?: HyperParameterTuningJobObjective | undefined;
  HyperParameterRanges?: ParameterRanges | undefined;
  StaticHyperParameters?: Record<string, string> | undefined;
  AlgorithmSpecification: HyperParameterAlgorithmSpecification | undefined;
  RoleArn: string | undefined;
  InputDataConfig?: Channel[] | undefined;
  VpcConfig?: VpcConfig | undefined;
  OutputDataConfig: OutputDataConfig | undefined;
  ResourceConfig?: ResourceConfig | undefined;
  HyperParameterTuningResourceConfig?:
    | HyperParameterTuningResourceConfig
    | undefined;
  StoppingCondition: StoppingCondition | undefined;
  EnableNetworkIsolation?: boolean | undefined;
  EnableInterContainerTrafficEncryption?: boolean | undefined;
  EnableManagedSpotTraining?: boolean | undefined;
  CheckpointConfig?: CheckpointConfig | undefined;
  RetryStrategy?: RetryStrategy | undefined;
  Environment?: Record<string, string> | undefined;
}
export interface ParentHyperParameterTuningJob {
  HyperParameterTuningJobName?: string | undefined;
}
export declare const HyperParameterTuningJobWarmStartType: {
  readonly IDENTICAL_DATA_AND_ALGORITHM: "IdenticalDataAndAlgorithm";
  readonly TRANSFER_LEARNING: "TransferLearning";
};
export type HyperParameterTuningJobWarmStartType =
  (typeof HyperParameterTuningJobWarmStartType)[keyof typeof HyperParameterTuningJobWarmStartType];
export interface HyperParameterTuningJobWarmStartConfig {
  ParentHyperParameterTuningJobs: ParentHyperParameterTuningJob[] | undefined;
  WarmStartType: HyperParameterTuningJobWarmStartType | undefined;
}
export interface CreateHyperParameterTuningJobRequest {
  HyperParameterTuningJobName: string | undefined;
  HyperParameterTuningJobConfig: HyperParameterTuningJobConfig | undefined;
  TrainingJobDefinition?: HyperParameterTrainingJobDefinition | undefined;
  TrainingJobDefinitions?: HyperParameterTrainingJobDefinition[] | undefined;
  WarmStartConfig?: HyperParameterTuningJobWarmStartConfig | undefined;
  Tags?: Tag[] | undefined;
  Autotune?: Autotune | undefined;
}
export interface CreateHyperParameterTuningJobResponse {
  HyperParameterTuningJobArn: string | undefined;
}
export interface CreateImageRequest {
  Description?: string | undefined;
  DisplayName?: string | undefined;
  ImageName: string | undefined;
  RoleArn: string | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateImageResponse {
  ImageArn?: string | undefined;
}
export declare const JobType: {
  readonly INFERENCE: "INFERENCE";
  readonly NOTEBOOK_KERNEL: "NOTEBOOK_KERNEL";
  readonly TRAINING: "TRAINING";
};
export type JobType = (typeof JobType)[keyof typeof JobType];
export declare const Processor: {
  readonly CPU: "CPU";
  readonly GPU: "GPU";
};
export type Processor = (typeof Processor)[keyof typeof Processor];
export declare const VendorGuidance: {
  readonly ARCHIVED: "ARCHIVED";
  readonly NOT_PROVIDED: "NOT_PROVIDED";
  readonly STABLE: "STABLE";
  readonly TO_BE_ARCHIVED: "TO_BE_ARCHIVED";
};
export type VendorGuidance =
  (typeof VendorGuidance)[keyof typeof VendorGuidance];
export interface CreateImageVersionRequest {
  BaseImage: string | undefined;
  ClientToken?: string | undefined;
  ImageName: string | undefined;
  Aliases?: string[] | undefined;
  VendorGuidance?: VendorGuidance | undefined;
  JobType?: JobType | undefined;
  MLFramework?: string | undefined;
  ProgrammingLang?: string | undefined;
  Processor?: Processor | undefined;
  Horovod?: boolean | undefined;
  ReleaseNotes?: string | undefined;
}
export interface CreateImageVersionResponse {
  ImageVersionArn?: string | undefined;
}
export interface InferenceComponentRuntimeConfig {
  CopyCount: number | undefined;
}
export interface InferenceComponentComputeResourceRequirements {
  NumberOfCpuCoresRequired?: number | undefined;
  NumberOfAcceleratorDevicesRequired?: number | undefined;
  MinMemoryRequiredInMb: number | undefined;
  MaxMemoryRequiredInMb?: number | undefined;
}
export interface InferenceComponentContainerSpecification {
  Image?: string | undefined;
  ArtifactUrl?: string | undefined;
  Environment?: Record<string, string> | undefined;
}
export interface InferenceComponentStartupParameters {
  ModelDataDownloadTimeoutInSeconds?: number | undefined;
  ContainerStartupHealthCheckTimeoutInSeconds?: number | undefined;
}
export interface InferenceComponentSpecification {
  ModelName?: string | undefined;
  Container?: InferenceComponentContainerSpecification | undefined;
  StartupParameters?: InferenceComponentStartupParameters | undefined;
  ComputeResourceRequirements?:
    | InferenceComponentComputeResourceRequirements
    | undefined;
  BaseInferenceComponentName?: string | undefined;
}
export interface CreateInferenceComponentInput {
  InferenceComponentName: string | undefined;
  EndpointName: string | undefined;
  VariantName?: string | undefined;
  Specification: InferenceComponentSpecification | undefined;
  RuntimeConfig?: InferenceComponentRuntimeConfig | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateInferenceComponentOutput {
  InferenceComponentArn: string | undefined;
}
export interface InferenceExperimentDataStorageConfig {
  Destination: string | undefined;
  KmsKey?: string | undefined;
  ContentType?: CaptureContentTypeHeader | undefined;
}
export declare const ModelInfrastructureType: {
  readonly REAL_TIME_INFERENCE: "RealTimeInference";
};
export type ModelInfrastructureType =
  (typeof ModelInfrastructureType)[keyof typeof ModelInfrastructureType];
export declare const _InstanceType: {
  readonly ML_C4_2XLARGE: "ml.c4.2xlarge";
  readonly ML_C4_4XLARGE: "ml.c4.4xlarge";
  readonly ML_C4_8XLARGE: "ml.c4.8xlarge";
  readonly ML_C4_XLARGE: "ml.c4.xlarge";
  readonly ML_C5D_18XLARGE: "ml.c5d.18xlarge";
  readonly ML_C5D_2XLARGE: "ml.c5d.2xlarge";
  readonly ML_C5D_4XLARGE: "ml.c5d.4xlarge";
  readonly ML_C5D_9XLARGE: "ml.c5d.9xlarge";
  readonly ML_C5D_XLARGE: "ml.c5d.xlarge";
  readonly ML_C5_18XLARGE: "ml.c5.18xlarge";
  readonly ML_C5_2XLARGE: "ml.c5.2xlarge";
  readonly ML_C5_4XLARGE: "ml.c5.4xlarge";
  readonly ML_C5_9XLARGE: "ml.c5.9xlarge";
  readonly ML_C5_XLARGE: "ml.c5.xlarge";
  readonly ML_C6ID_12XLARGE: "ml.c6id.12xlarge";
  readonly ML_C6ID_16XLARGE: "ml.c6id.16xlarge";
  readonly ML_C6ID_24XLARGE: "ml.c6id.24xlarge";
  readonly ML_C6ID_2XLARGE: "ml.c6id.2xlarge";
  readonly ML_C6ID_32XLARGE: "ml.c6id.32xlarge";
  readonly ML_C6ID_4XLARGE: "ml.c6id.4xlarge";
  readonly ML_C6ID_8XLARGE: "ml.c6id.8xlarge";
  readonly ML_C6ID_LARGE: "ml.c6id.large";
  readonly ML_C6ID_XLARGE: "ml.c6id.xlarge";
  readonly ML_C6I_12XLARGE: "ml.c6i.12xlarge";
  readonly ML_C6I_16XLARGE: "ml.c6i.16xlarge";
  readonly ML_C6I_24XLARGE: "ml.c6i.24xlarge";
  readonly ML_C6I_2XLARGE: "ml.c6i.2xlarge";
  readonly ML_C6I_32XLARGE: "ml.c6i.32xlarge";
  readonly ML_C6I_4XLARGE: "ml.c6i.4xlarge";
  readonly ML_C6I_8XLARGE: "ml.c6i.8xlarge";
  readonly ML_C6I_LARGE: "ml.c6i.large";
  readonly ML_C6I_XLARGE: "ml.c6i.xlarge";
  readonly ML_C7I_12XLARGE: "ml.c7i.12xlarge";
  readonly ML_C7I_16XLARGE: "ml.c7i.16xlarge";
  readonly ML_C7I_24XLARGE: "ml.c7i.24xlarge";
  readonly ML_C7I_2XLARGE: "ml.c7i.2xlarge";
  readonly ML_C7I_48XLARGE: "ml.c7i.48xlarge";
  readonly ML_C7I_4XLARGE: "ml.c7i.4xlarge";
  readonly ML_C7I_8XLARGE: "ml.c7i.8xlarge";
  readonly ML_C7I_LARGE: "ml.c7i.large";
  readonly ML_C7I_XLARGE: "ml.c7i.xlarge";
  readonly ML_G4DN_12XLARGE: "ml.g4dn.12xlarge";
  readonly ML_G4DN_16XLARGE: "ml.g4dn.16xlarge";
  readonly ML_G4DN_2XLARGE: "ml.g4dn.2xlarge";
  readonly ML_G4DN_4XLARGE: "ml.g4dn.4xlarge";
  readonly ML_G4DN_8XLARGE: "ml.g4dn.8xlarge";
  readonly ML_G4DN_XLARGE: "ml.g4dn.xlarge";
  readonly ML_G5_12XLARGE: "ml.g5.12xlarge";
  readonly ML_G5_16XLARGE: "ml.g5.16xlarge";
  readonly ML_G5_24XLARGE: "ml.g5.24xlarge";
  readonly ML_G5_2XLARGE: "ml.g5.2xlarge";
  readonly ML_G5_48XLARGE: "ml.g5.48xlarge";
  readonly ML_G5_4XLARGE: "ml.g5.4xlarge";
  readonly ML_G5_8XLARGE: "ml.g5.8xlarge";
  readonly ML_G5_XLARGE: "ml.g5.xlarge";
  readonly ML_G6_12XLARGE: "ml.g6.12xlarge";
  readonly ML_G6_16XLARGE: "ml.g6.16xlarge";
  readonly ML_G6_24XLARGE: "ml.g6.24xlarge";
  readonly ML_G6_2XLARGE: "ml.g6.2xlarge";
  readonly ML_G6_48XLARGE: "ml.g6.48xlarge";
  readonly ML_G6_4XLARGE: "ml.g6.4xlarge";
  readonly ML_G6_8XLARGE: "ml.g6.8xlarge";
  readonly ML_G6_XLARGE: "ml.g6.xlarge";
  readonly ML_INF1_24XLARGE: "ml.inf1.24xlarge";
  readonly ML_INF1_2XLARGE: "ml.inf1.2xlarge";
  readonly ML_INF1_6XLARGE: "ml.inf1.6xlarge";
  readonly ML_INF1_XLARGE: "ml.inf1.xlarge";
  readonly ML_INF2_24XLARGE: "ml.inf2.24xlarge";
  readonly ML_INF2_48XLARGE: "ml.inf2.48xlarge";
  readonly ML_INF2_8XLARGE: "ml.inf2.8xlarge";
  readonly ML_INF2_XLARGE: "ml.inf2.xlarge";
  readonly ML_M4_10XLARGE: "ml.m4.10xlarge";
  readonly ML_M4_16XLARGE: "ml.m4.16xlarge";
  readonly ML_M4_2XLARGE: "ml.m4.2xlarge";
  readonly ML_M4_4XLARGE: "ml.m4.4xlarge";
  readonly ML_M4_XLARGE: "ml.m4.xlarge";
  readonly ML_M5D_12XLARGE: "ml.m5d.12xlarge";
  readonly ML_M5D_16XLARGE: "ml.m5d.16xlarge";
  readonly ML_M5D_24XLARGE: "ml.m5d.24xlarge";
  readonly ML_M5D_2XLARGE: "ml.m5d.2xlarge";
  readonly ML_M5D_4XLARGE: "ml.m5d.4xlarge";
  readonly ML_M5D_8XLARGE: "ml.m5d.8xlarge";
  readonly ML_M5D_LARGE: "ml.m5d.large";
  readonly ML_M5D_XLARGE: "ml.m5d.xlarge";
  readonly ML_M5_12XLARGE: "ml.m5.12xlarge";
  readonly ML_M5_24XLARGE: "ml.m5.24xlarge";
  readonly ML_M5_2XLARGE: "ml.m5.2xlarge";
  readonly ML_M5_4XLARGE: "ml.m5.4xlarge";
  readonly ML_M5_XLARGE: "ml.m5.xlarge";
  readonly ML_M6ID_12XLARGE: "ml.m6id.12xlarge";
  readonly ML_M6ID_16XLARGE: "ml.m6id.16xlarge";
  readonly ML_M6ID_24XLARGE: "ml.m6id.24xlarge";
  readonly ML_M6ID_2XLARGE: "ml.m6id.2xlarge";
  readonly ML_M6ID_32XLARGE: "ml.m6id.32xlarge";
  readonly ML_M6ID_4XLARGE: "ml.m6id.4xlarge";
  readonly ML_M6ID_8XLARGE: "ml.m6id.8xlarge";
  readonly ML_M6ID_LARGE: "ml.m6id.large";
  readonly ML_M6ID_XLARGE: "ml.m6id.xlarge";
  readonly ML_M6I_12XLARGE: "ml.m6i.12xlarge";
  readonly ML_M6I_16XLARGE: "ml.m6i.16xlarge";
  readonly ML_M6I_24XLARGE: "ml.m6i.24xlarge";
  readonly ML_M6I_2XLARGE: "ml.m6i.2xlarge";
  readonly ML_M6I_32XLARGE: "ml.m6i.32xlarge";
  readonly ML_M6I_4XLARGE: "ml.m6i.4xlarge";
  readonly ML_M6I_8XLARGE: "ml.m6i.8xlarge";
  readonly ML_M6I_LARGE: "ml.m6i.large";
  readonly ML_M6I_XLARGE: "ml.m6i.xlarge";
  readonly ML_M7I_12XLARGE: "ml.m7i.12xlarge";
  readonly ML_M7I_16XLARGE: "ml.m7i.16xlarge";
  readonly ML_M7I_24XLARGE: "ml.m7i.24xlarge";
  readonly ML_M7I_2XLARGE: "ml.m7i.2xlarge";
  readonly ML_M7I_48XLARGE: "ml.m7i.48xlarge";
  readonly ML_M7I_4XLARGE: "ml.m7i.4xlarge";
  readonly ML_M7I_8XLARGE: "ml.m7i.8xlarge";
  readonly ML_M7I_LARGE: "ml.m7i.large";
  readonly ML_M7I_XLARGE: "ml.m7i.xlarge";
  readonly ML_P2_16XLARGE: "ml.p2.16xlarge";
  readonly ML_P2_8XLARGE: "ml.p2.8xlarge";
  readonly ML_P2_XLARGE: "ml.p2.xlarge";
  readonly ML_P3DN_24XLARGE: "ml.p3dn.24xlarge";
  readonly ML_P3_16XLARGE: "ml.p3.16xlarge";
  readonly ML_P3_2XLARGE: "ml.p3.2xlarge";
  readonly ML_P3_8XLARGE: "ml.p3.8xlarge";
  readonly ML_P4DE_24XLARGE: "ml.p4de.24xlarge";
  readonly ML_P4D_24XLARGE: "ml.p4d.24xlarge";
  readonly ML_P5_48XLARGE: "ml.p5.48xlarge";
  readonly ML_R5_12XLARGE: "ml.r5.12xlarge";
  readonly ML_R5_16XLARGE: "ml.r5.16xlarge";
  readonly ML_R5_24XLARGE: "ml.r5.24xlarge";
  readonly ML_R5_2XLARGE: "ml.r5.2xlarge";
  readonly ML_R5_4XLARGE: "ml.r5.4xlarge";
  readonly ML_R5_8XLARGE: "ml.r5.8xlarge";
  readonly ML_R5_LARGE: "ml.r5.large";
  readonly ML_R5_XLARGE: "ml.r5.xlarge";
  readonly ML_R6ID_12XLARGE: "ml.r6id.12xlarge";
  readonly ML_R6ID_16XLARGE: "ml.r6id.16xlarge";
  readonly ML_R6ID_24XLARGE: "ml.r6id.24xlarge";
  readonly ML_R6ID_2XLARGE: "ml.r6id.2xlarge";
  readonly ML_R6ID_32XLARGE: "ml.r6id.32xlarge";
  readonly ML_R6ID_4XLARGE: "ml.r6id.4xlarge";
  readonly ML_R6ID_8XLARGE: "ml.r6id.8xlarge";
  readonly ML_R6ID_LARGE: "ml.r6id.large";
  readonly ML_R6ID_XLARGE: "ml.r6id.xlarge";
  readonly ML_R6I_12XLARGE: "ml.r6i.12xlarge";
  readonly ML_R6I_16XLARGE: "ml.r6i.16xlarge";
  readonly ML_R6I_24XLARGE: "ml.r6i.24xlarge";
  readonly ML_R6I_2XLARGE: "ml.r6i.2xlarge";
  readonly ML_R6I_32XLARGE: "ml.r6i.32xlarge";
  readonly ML_R6I_4XLARGE: "ml.r6i.4xlarge";
  readonly ML_R6I_8XLARGE: "ml.r6i.8xlarge";
  readonly ML_R6I_LARGE: "ml.r6i.large";
  readonly ML_R6I_XLARGE: "ml.r6i.xlarge";
  readonly ML_R7I_12XLARGE: "ml.r7i.12xlarge";
  readonly ML_R7I_16XLARGE: "ml.r7i.16xlarge";
  readonly ML_R7I_24XLARGE: "ml.r7i.24xlarge";
  readonly ML_R7I_2XLARGE: "ml.r7i.2xlarge";
  readonly ML_R7I_48XLARGE: "ml.r7i.48xlarge";
  readonly ML_R7I_4XLARGE: "ml.r7i.4xlarge";
  readonly ML_R7I_8XLARGE: "ml.r7i.8xlarge";
  readonly ML_R7I_LARGE: "ml.r7i.large";
  readonly ML_R7I_XLARGE: "ml.r7i.xlarge";
  readonly ML_T2_2XLARGE: "ml.t2.2xlarge";
  readonly ML_T2_LARGE: "ml.t2.large";
  readonly ML_T2_MEDIUM: "ml.t2.medium";
  readonly ML_T2_XLARGE: "ml.t2.xlarge";
  readonly ML_T3_2XLARGE: "ml.t3.2xlarge";
  readonly ML_T3_LARGE: "ml.t3.large";
  readonly ML_T3_MEDIUM: "ml.t3.medium";
  readonly ML_T3_XLARGE: "ml.t3.xlarge";
  readonly ML_TRN1N_32XLARGE: "ml.trn1n.32xlarge";
  readonly ML_TRN1_2XLARGE: "ml.trn1.2xlarge";
  readonly ML_TRN1_32XLARGE: "ml.trn1.32xlarge";
};
export type _InstanceType = (typeof _InstanceType)[keyof typeof _InstanceType];
export interface RealTimeInferenceConfig {
  InstanceType: _InstanceType | undefined;
  InstanceCount: number | undefined;
}
export interface ModelInfrastructureConfig {
  InfrastructureType: ModelInfrastructureType | undefined;
  RealTimeInferenceConfig: RealTimeInferenceConfig | undefined;
}
export interface ModelVariantConfig {
  ModelName: string | undefined;
  VariantName: string | undefined;
  InfrastructureConfig: ModelInfrastructureConfig | undefined;
}
export interface InferenceExperimentSchedule {
  StartTime?: Date | undefined;
  EndTime?: Date | undefined;
}
export interface ShadowModelVariantConfig {
  ShadowModelVariantName: string | undefined;
  SamplingPercentage: number | undefined;
}
export interface ShadowModeConfig {
  SourceModelVariantName: string | undefined;
  ShadowModelVariants: ShadowModelVariantConfig[] | undefined;
}
export declare const InferenceExperimentType: {
  readonly SHADOW_MODE: "ShadowMode";
};
export type InferenceExperimentType =
  (typeof InferenceExperimentType)[keyof typeof InferenceExperimentType];
export interface CreateInferenceExperimentRequest {
  Name: string | undefined;
  Type: InferenceExperimentType | undefined;
  Schedule?: InferenceExperimentSchedule | undefined;
  Description?: string | undefined;
  RoleArn: string | undefined;
  EndpointName: string | undefined;
  ModelVariants: ModelVariantConfig[] | undefined;
  DataStorageConfig?: InferenceExperimentDataStorageConfig | undefined;
  ShadowModeConfig: ShadowModeConfig | undefined;
  KmsKey?: string | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateInferenceExperimentResponse {
  InferenceExperimentArn: string | undefined;
}
export interface RecommendationJobPayloadConfig {
  SamplePayloadUrl?: string | undefined;
  SupportedContentTypes?: string[] | undefined;
}
export declare const RecommendationJobSupportedEndpointType: {
  readonly REALTIME: "RealTime";
  readonly SERVERLESS: "Serverless";
};
export type RecommendationJobSupportedEndpointType =
  (typeof RecommendationJobSupportedEndpointType)[keyof typeof RecommendationJobSupportedEndpointType];
export interface RecommendationJobContainerConfig {
  Domain?: string | undefined;
  Task?: string | undefined;
  Framework?: string | undefined;
  FrameworkVersion?: string | undefined;
  PayloadConfig?: RecommendationJobPayloadConfig | undefined;
  NearestModelName?: string | undefined;
  SupportedInstanceTypes?: string[] | undefined;
  SupportedEndpointType?: RecommendationJobSupportedEndpointType | undefined;
  DataInputConfig?: string | undefined;
  SupportedResponseMIMETypes?: string[] | undefined;
}
export interface EnvironmentParameterRanges {
  CategoricalParameterRanges?: CategoricalParameter[] | undefined;
}
export interface EndpointInputConfiguration {
  InstanceType?: ProductionVariantInstanceType | undefined;
  ServerlessConfig?: ProductionVariantServerlessConfig | undefined;
  InferenceSpecificationName?: string | undefined;
  EnvironmentParameterRanges?: EnvironmentParameterRanges | undefined;
}
export interface EndpointInfo {
  EndpointName?: string | undefined;
}
export interface RecommendationJobResourceLimit {
  MaxNumberOfTests?: number | undefined;
  MaxParallelOfTests?: number | undefined;
}
export interface Phase {
  InitialNumberOfUsers?: number | undefined;
  SpawnRate?: number | undefined;
  DurationInSeconds?: number | undefined;
}
export interface Stairs {
  DurationInSeconds?: number | undefined;
  NumberOfSteps?: number | undefined;
  UsersPerStep?: number | undefined;
}
export declare const TrafficType: {
  readonly PHASES: "PHASES";
  readonly STAIRS: "STAIRS";
};
export type TrafficType = (typeof TrafficType)[keyof typeof TrafficType];
export interface TrafficPattern {
  TrafficType?: TrafficType | undefined;
  Phases?: Phase[] | undefined;
  Stairs?: Stairs | undefined;
}
export interface RecommendationJobVpcConfig {
  SecurityGroupIds: string[] | undefined;
  Subnets: string[] | undefined;
}
export interface RecommendationJobInputConfig {
  ModelPackageVersionArn?: string | undefined;
  ModelName?: string | undefined;
  JobDurationInSeconds?: number | undefined;
  TrafficPattern?: TrafficPattern | undefined;
  ResourceLimit?: RecommendationJobResourceLimit | undefined;
  EndpointConfigurations?: EndpointInputConfiguration[] | undefined;
  VolumeKmsKeyId?: string | undefined;
  ContainerConfig?: RecommendationJobContainerConfig | undefined;
  Endpoints?: EndpointInfo[] | undefined;
  VpcConfig?: RecommendationJobVpcConfig | undefined;
}
export declare const RecommendationJobType: {
  readonly ADVANCED: "Advanced";
  readonly DEFAULT: "Default";
};
export type RecommendationJobType =
  (typeof RecommendationJobType)[keyof typeof RecommendationJobType];
export interface RecommendationJobCompiledOutputConfig {
  S3OutputUri?: string | undefined;
}
export interface RecommendationJobOutputConfig {
  KmsKeyId?: string | undefined;
  CompiledOutputConfig?: RecommendationJobCompiledOutputConfig | undefined;
}
export declare const FlatInvocations: {
  readonly CONTINUE: "Continue";
  readonly STOP: "Stop";
};
export type FlatInvocations =
  (typeof FlatInvocations)[keyof typeof FlatInvocations];
export interface ModelLatencyThreshold {
  Percentile?: string | undefined;
  ValueInMilliseconds?: number | undefined;
}
export interface RecommendationJobStoppingConditions {
  MaxInvocations?: number | undefined;
  ModelLatencyThresholds?: ModelLatencyThreshold[] | undefined;
  FlatInvocations?: FlatInvocations | undefined;
}
export interface CreateInferenceRecommendationsJobRequest {
  JobName: string | undefined;
  JobType: RecommendationJobType | undefined;
  RoleArn: string | undefined;
  InputConfig: RecommendationJobInputConfig | undefined;
  JobDescription?: string | undefined;
  StoppingConditions?: RecommendationJobStoppingConditions | undefined;
  OutputConfig?: RecommendationJobOutputConfig | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateInferenceRecommendationsJobResponse {
  JobArn: string | undefined;
}
export interface UiConfig {
  UiTemplateS3Uri?: string | undefined;
  HumanTaskUiArn?: string | undefined;
}
export interface HumanTaskConfig {
  WorkteamArn: string | undefined;
  UiConfig: UiConfig | undefined;
  PreHumanTaskLambdaArn?: string | undefined;
  TaskKeywords?: string[] | undefined;
  TaskTitle: string | undefined;
  TaskDescription: string | undefined;
  NumberOfHumanWorkersPerDataObject: number | undefined;
  TaskTimeLimitInSeconds: number | undefined;
  TaskAvailabilityLifetimeInSeconds?: number | undefined;
  MaxConcurrentTaskCount?: number | undefined;
  AnnotationConsolidationConfig?: AnnotationConsolidationConfig | undefined;
  PublicWorkforceTaskPrice?: PublicWorkforceTaskPrice | undefined;
}
export interface LabelingJobDataAttributes {
  ContentClassifiers?: ContentClassifier[] | undefined;
}
export interface LabelingJobS3DataSource {
  ManifestS3Uri: string | undefined;
}
export interface LabelingJobSnsDataSource {
  SnsTopicArn: string | undefined;
}
export interface LabelingJobDataSource {
  S3DataSource?: LabelingJobS3DataSource | undefined;
  SnsDataSource?: LabelingJobSnsDataSource | undefined;
}
export interface LabelingJobInputConfig {
  DataSource: LabelingJobDataSource | undefined;
  DataAttributes?: LabelingJobDataAttributes | undefined;
}
export interface LabelingJobResourceConfig {
  VolumeKmsKeyId?: string | undefined;
  VpcConfig?: VpcConfig | undefined;
}
export interface LabelingJobAlgorithmsConfig {
  LabelingJobAlgorithmSpecificationArn: string | undefined;
  InitialActiveLearningModelArn?: string | undefined;
  LabelingJobResourceConfig?: LabelingJobResourceConfig | undefined;
}
export interface LabelingJobOutputConfig {
  S3OutputPath: string | undefined;
  KmsKeyId?: string | undefined;
  SnsTopicArn?: string | undefined;
}
export interface LabelingJobStoppingConditions {
  MaxHumanLabeledObjectCount?: number | undefined;
  MaxPercentageOfInputDatasetLabeled?: number | undefined;
}
export interface CreateLabelingJobRequest {
  LabelingJobName: string | undefined;
  LabelAttributeName: string | undefined;
  InputConfig: LabelingJobInputConfig | undefined;
  OutputConfig: LabelingJobOutputConfig | undefined;
  RoleArn: string | undefined;
  LabelCategoryConfigS3Uri?: string | undefined;
  StoppingConditions?: LabelingJobStoppingConditions | undefined;
  LabelingJobAlgorithmsConfig?: LabelingJobAlgorithmsConfig | undefined;
  HumanTaskConfig: HumanTaskConfig | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateLabelingJobResponse {
  LabelingJobArn: string | undefined;
}
export declare const TrackingServerSize: {
  readonly L: "Large";
  readonly M: "Medium";
  readonly S: "Small";
};
export type TrackingServerSize =
  (typeof TrackingServerSize)[keyof typeof TrackingServerSize];
export interface CreateMlflowTrackingServerRequest {
  TrackingServerName: string | undefined;
  ArtifactStoreUri: string | undefined;
  TrackingServerSize?: TrackingServerSize | undefined;
  MlflowVersion?: string | undefined;
  RoleArn: string | undefined;
  AutomaticModelRegistration?: boolean | undefined;
  WeeklyMaintenanceWindowStart?: string | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateMlflowTrackingServerResponse {
  TrackingServerArn?: string | undefined;
}
export declare const InferenceExecutionMode: {
  readonly DIRECT: "Direct";
  readonly SERIAL: "Serial";
};
export type InferenceExecutionMode =
  (typeof InferenceExecutionMode)[keyof typeof InferenceExecutionMode];
export interface InferenceExecutionConfig {
  Mode: InferenceExecutionMode | undefined;
}
export interface CreateModelInput {
  ModelName: string | undefined;
  PrimaryContainer?: ContainerDefinition | undefined;
  Containers?: ContainerDefinition[] | undefined;
  InferenceExecutionConfig?: InferenceExecutionConfig | undefined;
  ExecutionRoleArn?: string | undefined;
  Tags?: Tag[] | undefined;
  VpcConfig?: VpcConfig | undefined;
  EnableNetworkIsolation?: boolean | undefined;
}
export interface CreateModelOutput {
  ModelArn: string | undefined;
}
export interface ModelBiasAppSpecification {
  ImageUri: string | undefined;
  ConfigUri: string | undefined;
  Environment?: Record<string, string> | undefined;
}
export interface ModelBiasBaselineConfig {
  BaseliningJobName?: string | undefined;
  ConstraintsResource?: MonitoringConstraintsResource | undefined;
}
export interface MonitoringGroundTruthS3Input {
  S3Uri?: string | undefined;
}
export interface ModelBiasJobInput {
  EndpointInput?: EndpointInput | undefined;
  BatchTransformInput?: BatchTransformInput | undefined;
  GroundTruthS3Input: MonitoringGroundTruthS3Input | undefined;
}
export interface CreateModelBiasJobDefinitionRequest {
  JobDefinitionName: string | undefined;
  ModelBiasBaselineConfig?: ModelBiasBaselineConfig | undefined;
  ModelBiasAppSpecification: ModelBiasAppSpecification | undefined;
  ModelBiasJobInput: ModelBiasJobInput | undefined;
  ModelBiasJobOutputConfig: MonitoringOutputConfig | undefined;
  JobResources: MonitoringResources | undefined;
  NetworkConfig?: MonitoringNetworkConfig | undefined;
  RoleArn: string | undefined;
  StoppingCondition?: MonitoringStoppingCondition | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateModelBiasJobDefinitionResponse {
  JobDefinitionArn: string | undefined;
}
export declare const ModelCardStatus: {
  readonly APPROVED: "Approved";
  readonly ARCHIVED: "Archived";
  readonly DRAFT: "Draft";
  readonly PENDINGREVIEW: "PendingReview";
};
export type ModelCardStatus =
  (typeof ModelCardStatus)[keyof typeof ModelCardStatus];
export interface ModelCardSecurityConfig {
  KmsKeyId?: string | undefined;
}
export interface CreateModelCardRequest {
  ModelCardName: string | undefined;
  SecurityConfig?: ModelCardSecurityConfig | undefined;
  Content: string | undefined;
  ModelCardStatus: ModelCardStatus | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateModelCardResponse {
  ModelCardArn: string | undefined;
}
export interface ModelCardExportOutputConfig {
  S3OutputPath: string | undefined;
}
export interface CreateModelCardExportJobRequest {
  ModelCardName: string | undefined;
  ModelCardVersion?: number | undefined;
  ModelCardExportJobName: string | undefined;
  OutputConfig: ModelCardExportOutputConfig | undefined;
}
export interface CreateModelCardExportJobResponse {
  ModelCardExportJobArn: string | undefined;
}
export interface ModelExplainabilityAppSpecification {
  ImageUri: string | undefined;
  ConfigUri: string | undefined;
  Environment?: Record<string, string> | undefined;
}
export interface ModelExplainabilityBaselineConfig {
  BaseliningJobName?: string | undefined;
  ConstraintsResource?: MonitoringConstraintsResource | undefined;
}
export interface ModelExplainabilityJobInput {
  EndpointInput?: EndpointInput | undefined;
  BatchTransformInput?: BatchTransformInput | undefined;
}
export interface CreateModelExplainabilityJobDefinitionRequest {
  JobDefinitionName: string | undefined;
  ModelExplainabilityBaselineConfig?:
    | ModelExplainabilityBaselineConfig
    | undefined;
  ModelExplainabilityAppSpecification:
    | ModelExplainabilityAppSpecification
    | undefined;
  ModelExplainabilityJobInput: ModelExplainabilityJobInput | undefined;
  ModelExplainabilityJobOutputConfig: MonitoringOutputConfig | undefined;
  JobResources: MonitoringResources | undefined;
  NetworkConfig?: MonitoringNetworkConfig | undefined;
  RoleArn: string | undefined;
  StoppingCondition?: MonitoringStoppingCondition | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateModelExplainabilityJobDefinitionResponse {
  JobDefinitionArn: string | undefined;
}
export interface FileSource {
  ContentType?: string | undefined;
  ContentDigest?: string | undefined;
  S3Uri: string | undefined;
}
export interface DriftCheckBias {
  ConfigFile?: FileSource | undefined;
  PreTrainingConstraints?: MetricsSource | undefined;
  PostTrainingConstraints?: MetricsSource | undefined;
}
export interface DriftCheckExplainability {
  Constraints?: MetricsSource | undefined;
  ConfigFile?: FileSource | undefined;
}
export interface DriftCheckModelDataQuality {
  Statistics?: MetricsSource | undefined;
  Constraints?: MetricsSource | undefined;
}
export interface DriftCheckModelQuality {
  Statistics?: MetricsSource | undefined;
  Constraints?: MetricsSource | undefined;
}
export interface DriftCheckBaselines {
  Bias?: DriftCheckBias | undefined;
  Explainability?: DriftCheckExplainability | undefined;
  ModelQuality?: DriftCheckModelQuality | undefined;
  ModelDataQuality?: DriftCheckModelDataQuality | undefined;
}
export interface ModelPackageModelCard {
  ModelCardContent?: string | undefined;
  ModelCardStatus?: ModelCardStatus | undefined;
}
export interface ModelLifeCycle {
  Stage: string | undefined;
  StageStatus: string | undefined;
  StageDescription?: string | undefined;
}
export interface Explainability {
  Report?: MetricsSource | undefined;
}
export interface ModelDataQuality {
  Statistics?: MetricsSource | undefined;
  Constraints?: MetricsSource | undefined;
}
export interface ModelQuality {
  Statistics?: MetricsSource | undefined;
  Constraints?: MetricsSource | undefined;
}
export interface ModelMetrics {
  ModelQuality?: ModelQuality | undefined;
  ModelDataQuality?: ModelDataQuality | undefined;
  Bias?: Bias | undefined;
  Explainability?: Explainability | undefined;
}
export interface ModelPackageSecurityConfig {
  KmsKeyId: string | undefined;
}
export declare const SkipModelValidation: {
  readonly ALL: "All";
  readonly NONE: "None";
};
export type SkipModelValidation =
  (typeof SkipModelValidation)[keyof typeof SkipModelValidation];
export interface SourceAlgorithm {
  ModelDataUrl?: string | undefined;
  ModelDataSource?: ModelDataSource | undefined;
  ModelDataETag?: string | undefined;
  AlgorithmName: string | undefined;
}
export interface SourceAlgorithmSpecification {
  SourceAlgorithms: SourceAlgorithm[] | undefined;
}
export interface ModelPackageValidationProfile {
  ProfileName: string | undefined;
  TransformJobDefinition: TransformJobDefinition | undefined;
}
export interface ModelPackageValidationSpecification {
  ValidationRole: string | undefined;
  ValidationProfiles: ModelPackageValidationProfile[] | undefined;
}
export interface CreateModelPackageInput {
  ModelPackageName?: string | undefined;
  ModelPackageGroupName?: string | undefined;
  ModelPackageDescription?: string | undefined;
  InferenceSpecification?: InferenceSpecification | undefined;
  ValidationSpecification?: ModelPackageValidationSpecification | undefined;
  SourceAlgorithmSpecification?: SourceAlgorithmSpecification | undefined;
  CertifyForMarketplace?: boolean | undefined;
  Tags?: Tag[] | undefined;
  ModelApprovalStatus?: ModelApprovalStatus | undefined;
  MetadataProperties?: MetadataProperties | undefined;
  ModelMetrics?: ModelMetrics | undefined;
  ClientToken?: string | undefined;
  Domain?: string | undefined;
  Task?: string | undefined;
  SamplePayloadUrl?: string | undefined;
  CustomerMetadataProperties?: Record<string, string> | undefined;
  DriftCheckBaselines?: DriftCheckBaselines | undefined;
  AdditionalInferenceSpecifications?:
    | AdditionalInferenceSpecificationDefinition[]
    | undefined;
  SkipModelValidation?: SkipModelValidation | undefined;
  SourceUri?: string | undefined;
  SecurityConfig?: ModelPackageSecurityConfig | undefined;
  ModelCard?: ModelPackageModelCard | undefined;
  ModelLifeCycle?: ModelLifeCycle | undefined;
}
export interface CreateModelPackageOutput {
  ModelPackageArn: string | undefined;
}
export interface CreateModelPackageGroupInput {
  ModelPackageGroupName: string | undefined;
  ModelPackageGroupDescription?: string | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateModelPackageGroupOutput {
  ModelPackageGroupArn: string | undefined;
}
export declare const MonitoringProblemType: {
  readonly BINARY_CLASSIFICATION: "BinaryClassification";
  readonly MULTICLASS_CLASSIFICATION: "MulticlassClassification";
  readonly REGRESSION: "Regression";
};
export type MonitoringProblemType =
  (typeof MonitoringProblemType)[keyof typeof MonitoringProblemType];
export interface ModelQualityAppSpecification {
  ImageUri: string | undefined;
  ContainerEntrypoint?: string[] | undefined;
  ContainerArguments?: string[] | undefined;
  RecordPreprocessorSourceUri?: string | undefined;
  PostAnalyticsProcessorSourceUri?: string | undefined;
  ProblemType?: MonitoringProblemType | undefined;
  Environment?: Record<string, string> | undefined;
}
export interface ModelQualityBaselineConfig {
  BaseliningJobName?: string | undefined;
  ConstraintsResource?: MonitoringConstraintsResource | undefined;
}
export interface ModelQualityJobInput {
  EndpointInput?: EndpointInput | undefined;
  BatchTransformInput?: BatchTransformInput | undefined;
  GroundTruthS3Input: MonitoringGroundTruthS3Input | undefined;
}
export interface CreateModelQualityJobDefinitionRequest {
  JobDefinitionName: string | undefined;
  ModelQualityBaselineConfig?: ModelQualityBaselineConfig | undefined;
  ModelQualityAppSpecification: ModelQualityAppSpecification | undefined;
  ModelQualityJobInput: ModelQualityJobInput | undefined;
  ModelQualityJobOutputConfig: MonitoringOutputConfig | undefined;
  JobResources: MonitoringResources | undefined;
  NetworkConfig?: MonitoringNetworkConfig | undefined;
  RoleArn: string | undefined;
  StoppingCondition?: MonitoringStoppingCondition | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateModelQualityJobDefinitionResponse {
  JobDefinitionArn: string | undefined;
}
export interface MonitoringBaselineConfig {
  BaseliningJobName?: string | undefined;
  ConstraintsResource?: MonitoringConstraintsResource | undefined;
  StatisticsResource?: MonitoringStatisticsResource | undefined;
}
export interface MonitoringAppSpecification {
  ImageUri: string | undefined;
  ContainerEntrypoint?: string[] | undefined;
  ContainerArguments?: string[] | undefined;
  RecordPreprocessorSourceUri?: string | undefined;
  PostAnalyticsProcessorSourceUri?: string | undefined;
}
export declare const CreateModelCardRequestFilterSensitiveLog: (
  obj: CreateModelCardRequest
) => any;
export declare const ModelPackageModelCardFilterSensitiveLog: (
  obj: ModelPackageModelCard
) => any;
export declare const CreateModelPackageInputFilterSensitiveLog: (
  obj: CreateModelPackageInput
) => any;
