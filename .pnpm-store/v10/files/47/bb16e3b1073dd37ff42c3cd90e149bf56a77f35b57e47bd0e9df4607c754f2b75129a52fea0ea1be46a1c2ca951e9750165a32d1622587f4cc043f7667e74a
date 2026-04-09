import { AutomaticJsonStringConversion as __AutomaticJsonStringConversion } from "@smithy/smithy-client";
import {
  _InstanceType,
  AccountDefaultStatus,
  ActivationState,
  AppInstanceType,
  AppNetworkAccessType,
  AppSecurityGroupManagement,
  AppType,
  AuthMode,
  AutoMountHomeEFS,
  AwsManagedHumanLoopRequestSource,
  CapacityReservationPreference,
  CollectionType,
  ContentClassifier,
  DataDistributionType,
  DeviceSubsetType,
  DirectInternetAccess,
  EdgePresetDeploymentType,
  ExecutionRoleIdentityConfig,
  FailureHandlingPolicy,
  FeatureStatus,
  FeatureType,
  FlatInvocations,
  HubContentType,
  HyperParameterScalingType,
  HyperParameterTuningAllocationStrategy,
  HyperParameterTuningJobStrategyType,
  HyperParameterTuningJobWarmStartType,
  InferenceExecutionMode,
  InferenceExperimentType,
  InputMode,
  IPAddressType,
  JobType,
  ManagedInstanceScalingStatus,
  MetricPublishFrequencyInSeconds,
  MlTools,
  ModelApprovalStatus,
  ModelCardStatus,
  ModelInfrastructureType,
  ModelPackageRegistrationType,
  ModelRegistrationMode,
  ModelSpeculativeDecodingS3DataType,
  ModelSpeculativeDecodingTechnique,
  MonitoringProblemType,
  MonitoringType,
  NotebookInstanceAcceleratorType,
  NotebookOutputOption,
  OptimizationJobDeploymentInstanceType,
  PartnerAppAuthType,
  PartnerAppType,
  ProcessingInstanceType,
  ProcessingS3CompressionType,
  ProcessingS3DataDistributionType,
  ProcessingS3DataType,
  ProcessingS3InputMode,
  ProcessingS3UploadMode,
  Processor,
  ProductionVariantAcceleratorType,
  ProductionVariantInferenceAmiVersion,
  ProductionVariantInstanceType,
  RecommendationJobSupportedEndpointType,
  RecommendationJobType,
  RedshiftResultCompressionType,
  RedshiftResultFormat,
  RootAccess,
  RoutingStrategy,
  RStudioServerProAccessStatus,
  RStudioServerProUserGroup,
  SageMakerImageName,
  SkipModelValidation,
  StorageType,
  StudioWebPortal,
  TableFormat,
  TagPropagation,
  TargetDevice,
  ThroughputMode,
  TrackingServerSize,
  TrafficType,
  TrainingInputMode,
  TrainingInstanceType,
  TrainingJobEarlyStoppingType,
  TtlDurationUnit,
  VendorGuidance,
} from "./enums";
import {
  AmazonQSettings,
  AnnotationConsolidationConfig,
  AppLifecycleManagement,
  AppSpecification,
  AsyncInferenceConfig,
  AthenaDatasetDefinition,
  AutoRollbackConfig,
  Autotune,
  BatchTransformInput,
  BestObjectiveNotImproving,
  Bias,
  BlueGreenUpdatePolicy,
  CanvasAppSettings,
  CapacitySize,
  CaptureContentTypeHeader,
  CfnCreateTemplateProvider,
  CheckpointConfig,
  ClarifyExplainerConfig,
  CodeEditorAppSettings,
  CollectionConfig,
  ComputeQuotaConfig,
  ComputeQuotaTarget,
  ContextSource,
  ConvergenceDetected,
  HyperParameterTuningJobObjective,
  InferenceSpecification,
  InputConfig,
  MetadataProperties,
  MetricsSource,
  ModelDataSource,
  OutputDataConfig,
  ResourceConfig,
  ResourceSpec,
  StoppingCondition,
  TargetPlatform,
  TransformJobDefinition,
  VpcConfig,
  AdditionalInferenceSpecificationDefinition,
  AuthorizedUrl,
  AutoParameter,
  CaptureOption,
  CategoricalParameter,
  CategoricalParameterRange,
  Channel,
  CodeRepository,
  ContainerDefinition,
  ContinuousParameterRange,
  CustomImage,
  MetricDefinition,
  Tag,
} from "./models_0";
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
export interface S3FileSystemConfig {
  MountPath?: string | undefined;
  S3Uri: string | undefined;
}
export type CustomFileSystemConfig =
  | CustomFileSystemConfig.EFSFileSystemConfigMember
  | CustomFileSystemConfig.FSxLustreFileSystemConfigMember
  | CustomFileSystemConfig.S3FileSystemConfigMember
  | CustomFileSystemConfig.$UnknownMember;
export declare namespace CustomFileSystemConfig {
  interface EFSFileSystemConfigMember {
    EFSFileSystemConfig: EFSFileSystemConfig;
    FSxLustreFileSystemConfig?: never;
    S3FileSystemConfig?: never;
    $unknown?: never;
  }
  interface FSxLustreFileSystemConfigMember {
    EFSFileSystemConfig?: never;
    FSxLustreFileSystemConfig: FSxLustreFileSystemConfig;
    S3FileSystemConfig?: never;
    $unknown?: never;
  }
  interface S3FileSystemConfigMember {
    EFSFileSystemConfig?: never;
    FSxLustreFileSystemConfig?: never;
    S3FileSystemConfig: S3FileSystemConfig;
    $unknown?: never;
  }
  interface $UnknownMember {
    EFSFileSystemConfig?: never;
    FSxLustreFileSystemConfig?: never;
    S3FileSystemConfig?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    EFSFileSystemConfig: (value: EFSFileSystemConfig) => T;
    FSxLustreFileSystemConfig: (value: FSxLustreFileSystemConfig) => T;
    S3FileSystemConfig: (value: S3FileSystemConfig) => T;
    _: (name: string, value: any) => T;
  }
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
export interface RStudioServerProAppSettings {
  AccessStatus?: RStudioServerProAccessStatus | undefined;
  UserGroup?: RStudioServerProUserGroup | undefined;
}
export interface SharingSettings {
  NotebookOutputOption?: NotebookOutputOption | undefined;
  S3OutputPath?: string | undefined;
  S3KmsKeyId?: string | undefined;
}
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
  RootlessDocker?: FeatureStatus | undefined;
}
export interface RStudioServerProDomainSettings {
  DomainExecutionRoleArn: string | undefined;
  RStudioConnectUrl?: string | undefined;
  RStudioPackageManagerUrl?: string | undefined;
  DefaultResourceSpec?: ResourceSpec | undefined;
}
export interface TrustedIdentityPropagationSettings {
  Status: FeatureStatus | undefined;
}
export interface UnifiedStudioSettings {
  StudioWebPortalAccess?: FeatureStatus | undefined;
  DomainAccountId?: string | undefined;
  DomainRegion?: string | undefined;
  DomainId?: string | undefined;
  ProjectId?: string | undefined;
  EnvironmentId?: string | undefined;
  ProjectS3Path?: string | undefined;
  SingleSignOnApplicationArn?: string | undefined;
}
export interface DomainSettings {
  SecurityGroupIds?: string[] | undefined;
  RStudioServerProDomainSettings?: RStudioServerProDomainSettings | undefined;
  ExecutionRoleIdentityConfig?: ExecutionRoleIdentityConfig | undefined;
  TrustedIdentityPropagationSettings?:
    | TrustedIdentityPropagationSettings
    | undefined;
  DockerSettings?: DockerSettings | undefined;
  AmazonQSettings?: AmazonQSettings | undefined;
  UnifiedStudioSettings?: UnifiedStudioSettings | undefined;
  IpAddressType?: IPAddressType | undefined;
}
export interface CreateDomainRequest {
  DomainName: string | undefined;
  AuthMode: AuthMode | undefined;
  DefaultUserSettings: UserSettings | undefined;
  DomainSettings?: DomainSettings | undefined;
  SubnetIds?: string[] | undefined;
  VpcId?: string | undefined;
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
export interface EdgeDeploymentConfig {
  FailureHandlingPolicy: FailureHandlingPolicy | undefined;
}
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
export interface MetricsConfig {
  EnableEnhancedMetrics?: boolean | undefined;
  MetricPublishFrequencyInSeconds?: MetricPublishFrequencyInSeconds | undefined;
}
export interface ProductionVariantCapacityReservationConfig {
  CapacityReservationPreference?: CapacityReservationPreference | undefined;
  MlReservationArn?: string | undefined;
}
export interface ProductionVariantCoreDumpConfig {
  DestinationS3Uri: string | undefined;
  KmsKeyId?: string | undefined;
}
export interface ProductionVariantManagedInstanceScaling {
  Status?: ManagedInstanceScalingStatus | undefined;
  MinInstanceCount?: number | undefined;
  MaxInstanceCount?: number | undefined;
}
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
  CapacityReservationConfig?:
    | ProductionVariantCapacityReservationConfig
    | undefined;
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
  MetricsConfig?: MetricsConfig | undefined;
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
export interface OfflineStoreConfig {
  S3StorageConfig: S3StorageConfig | undefined;
  DisableGlueTableCreation?: boolean | undefined;
  DataCatalogConfig?: DataCatalogConfig | undefined;
  TableFormat?: TableFormat | undefined;
}
export interface OnlineStoreSecurityConfig {
  KmsKeyId?: string | undefined;
}
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
export interface PresignedUrlAccessConfig {
  AcceptEula?: boolean | undefined;
  ExpectedS3Url?: string | undefined;
}
export interface CreateHubContentPresignedUrlsRequest {
  HubName: string | undefined;
  HubContentType: HubContentType | undefined;
  HubContentName: string | undefined;
  HubContentVersion?: string | undefined;
  AccessConfig?: PresignedUrlAccessConfig | undefined;
  MaxResults?: number | undefined;
  NextToken?: string | undefined;
}
export interface CreateHubContentPresignedUrlsResponse {
  AuthorizedUrlConfigs: AuthorizedUrl[] | undefined;
  NextToken?: string | undefined;
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
export interface HyperbandStrategyConfig {
  MinResource?: number | undefined;
  MaxResource?: number | undefined;
}
export interface HyperParameterTuningJobStrategyConfig {
  HyperbandStrategyConfig?: HyperbandStrategyConfig | undefined;
}
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
export interface InferenceComponentDataCacheConfig {
  EnableCaching: boolean | undefined;
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
  DataCacheConfig?: InferenceComponentDataCacheConfig | undefined;
}
export interface CreateInferenceComponentInput {
  InferenceComponentName: string | undefined;
  EndpointName: string | undefined;
  VariantName?: string | undefined;
  Specification?: InferenceComponentSpecification | undefined;
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
export interface RecommendationJobCompiledOutputConfig {
  S3OutputUri?: string | undefined;
}
export interface RecommendationJobOutputConfig {
  KmsKeyId?: string | undefined;
  CompiledOutputConfig?: RecommendationJobCompiledOutputConfig | undefined;
}
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
export interface CreateMlflowAppRequest {
  Name: string | undefined;
  ArtifactStoreUri: string | undefined;
  RoleArn: string | undefined;
  ModelRegistrationMode?: ModelRegistrationMode | undefined;
  WeeklyMaintenanceWindowStart?: string | undefined;
  AccountDefaultStatus?: AccountDefaultStatus | undefined;
  DefaultDomainIdList?: string[] | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateMlflowAppResponse {
  Arn?: string | undefined;
}
export interface CreateMlflowTrackingServerRequest {
  TrackingServerName: string | undefined;
  ArtifactStoreUri: string | undefined;
  TrackingServerSize?: TrackingServerSize | undefined;
  MlflowVersion?: string | undefined;
  RoleArn: string | undefined;
  AutomaticModelRegistration?: boolean | undefined;
  WeeklyMaintenanceWindowStart?: string | undefined;
  Tags?: Tag[] | undefined;
  S3BucketOwnerAccountId?: string | undefined;
  S3BucketOwnerVerification?: boolean | undefined;
}
export interface CreateMlflowTrackingServerResponse {
  TrackingServerArn?: string | undefined;
}
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
  ModelPackageRegistrationType?: ModelPackageRegistrationType | undefined;
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
export interface InstanceMetadataServiceConfiguration {
  MinimumInstanceMetadataServiceVersion: string | undefined;
}
export interface CreateNotebookInstanceInput {
  NotebookInstanceName: string | undefined;
  InstanceType: _InstanceType | undefined;
  SubnetId?: string | undefined;
  SecurityGroupIds?: string[] | undefined;
  IpAddressType?: IPAddressType | undefined;
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
export interface OptimizationModelAccessConfig {
  AcceptEula: boolean | undefined;
}
export interface OptimizationJobModelSourceS3 {
  S3Uri?: string | undefined;
  ModelAccessConfig?: OptimizationModelAccessConfig | undefined;
}
export interface OptimizationSageMakerModel {
  ModelName?: string | undefined;
}
export interface OptimizationJobModelSource {
  S3?: OptimizationJobModelSourceS3 | undefined;
  SageMakerModel?: OptimizationSageMakerModel | undefined;
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
export interface ModelSpeculativeDecodingTrainingDataSource {
  S3Uri: string | undefined;
  S3DataType: ModelSpeculativeDecodingS3DataType | undefined;
}
export interface ModelSpeculativeDecodingConfig {
  Technique: ModelSpeculativeDecodingTechnique | undefined;
  TrainingDataSource?: ModelSpeculativeDecodingTrainingDataSource | undefined;
}
export type OptimizationConfig =
  | OptimizationConfig.ModelCompilationConfigMember
  | OptimizationConfig.ModelQuantizationConfigMember
  | OptimizationConfig.ModelShardingConfigMember
  | OptimizationConfig.ModelSpeculativeDecodingConfigMember
  | OptimizationConfig.$UnknownMember;
export declare namespace OptimizationConfig {
  interface ModelQuantizationConfigMember {
    ModelQuantizationConfig: ModelQuantizationConfig;
    ModelCompilationConfig?: never;
    ModelShardingConfig?: never;
    ModelSpeculativeDecodingConfig?: never;
    $unknown?: never;
  }
  interface ModelCompilationConfigMember {
    ModelQuantizationConfig?: never;
    ModelCompilationConfig: ModelCompilationConfig;
    ModelShardingConfig?: never;
    ModelSpeculativeDecodingConfig?: never;
    $unknown?: never;
  }
  interface ModelShardingConfigMember {
    ModelQuantizationConfig?: never;
    ModelCompilationConfig?: never;
    ModelShardingConfig: ModelShardingConfig;
    ModelSpeculativeDecodingConfig?: never;
    $unknown?: never;
  }
  interface ModelSpeculativeDecodingConfigMember {
    ModelQuantizationConfig?: never;
    ModelCompilationConfig?: never;
    ModelShardingConfig?: never;
    ModelSpeculativeDecodingConfig: ModelSpeculativeDecodingConfig;
    $unknown?: never;
  }
  interface $UnknownMember {
    ModelQuantizationConfig?: never;
    ModelCompilationConfig?: never;
    ModelShardingConfig?: never;
    ModelSpeculativeDecodingConfig?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    ModelQuantizationConfig: (value: ModelQuantizationConfig) => T;
    ModelCompilationConfig: (value: ModelCompilationConfig) => T;
    ModelShardingConfig: (value: ModelShardingConfig) => T;
    ModelSpeculativeDecodingConfig: (
      value: ModelSpeculativeDecodingConfig
    ) => T;
    _: (name: string, value: any) => T;
  }
}
export interface OptimizationJobOutputConfig {
  KmsKeyId?: string | undefined;
  S3OutputLocation: string | undefined;
  SageMakerModel?: OptimizationSageMakerModel | undefined;
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
  MaxInstanceCount?: number | undefined;
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
export interface RoleGroupAssignment {
  RoleName: string | undefined;
  GroupPatterns: string[] | undefined;
}
export interface PartnerAppConfig {
  AdminUsers?: string[] | undefined;
  Arguments?: Record<string, string> | undefined;
  AssignedGroupPatterns?: string[] | undefined;
  RoleGroupAssignments?: RoleGroupAssignment[] | undefined;
}
export interface PartnerAppMaintenanceConfig {
  MaintenanceWindowStart?: string | undefined;
}
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
  EnableAutoMinorVersionUpgrade?: boolean | undefined;
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
export interface CreatePresignedMlflowAppUrlRequest {
  Arn: string | undefined;
  ExpiresInSeconds?: number | undefined;
  SessionExpirationDurationInSeconds?: number | undefined;
}
export interface CreatePresignedMlflowAppUrlResponse {
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
export interface CreateTemplateProvider {
  CfnTemplateProvider?: CfnCreateTemplateProvider | undefined;
}
export interface CreateProjectInput {
  ProjectName: string | undefined;
  ProjectDescription?: string | undefined;
  ServiceCatalogProvisioningDetails?:
    | ServiceCatalogProvisioningDetails
    | undefined;
  Tags?: Tag[] | undefined;
  TemplateProviders?: CreateTemplateProvider[] | undefined;
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
export interface S3FileSystem {
  S3Uri: string | undefined;
}
export type CustomFileSystem =
  | CustomFileSystem.EFSFileSystemMember
  | CustomFileSystem.FSxLustreFileSystemMember
  | CustomFileSystem.S3FileSystemMember
  | CustomFileSystem.$UnknownMember;
export declare namespace CustomFileSystem {
  interface EFSFileSystemMember {
    EFSFileSystem: EFSFileSystem;
    FSxLustreFileSystem?: never;
    S3FileSystem?: never;
    $unknown?: never;
  }
  interface FSxLustreFileSystemMember {
    EFSFileSystem?: never;
    FSxLustreFileSystem: FSxLustreFileSystem;
    S3FileSystem?: never;
    $unknown?: never;
  }
  interface S3FileSystemMember {
    EFSFileSystem?: never;
    FSxLustreFileSystem?: never;
    S3FileSystem: S3FileSystem;
    $unknown?: never;
  }
  interface $UnknownMember {
    EFSFileSystem?: never;
    FSxLustreFileSystem?: never;
    S3FileSystem?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    EFSFileSystem: (value: EFSFileSystem) => T;
    FSxLustreFileSystem: (value: FSxLustreFileSystem) => T;
    S3FileSystem: (value: S3FileSystem) => T;
    _: (name: string, value: any) => T;
  }
}
export interface SpaceJupyterLabAppSettings {
  DefaultResourceSpec?: ResourceSpec | undefined;
  CodeRepositories?: CodeRepository[] | undefined;
  AppLifecycleManagement?: SpaceAppLifecycleManagement | undefined;
}
export interface EbsStorageSettings {
  EbsVolumeSizeInGb: number | undefined;
}
