import {
  ActionStatus,
  ActivationState,
  ActiveClusterOperationName,
  AdditionalS3DataSourceDataType,
  AggregationTransformationValue,
  AlgorithmStatus,
  AppInstanceType,
  AppStatus,
  AppType,
  ArtifactSourceIdType,
  AssemblyType,
  AssociationEdgeType,
  AsyncNotificationTopicTypes,
  AthenaResultCompressionType,
  AthenaResultFormat,
  AutoMLAlgorithm,
  AutoMLChannelType,
  AutoMLJobObjectiveType,
  AutoMLJobSecondaryStatus,
  AutoMLJobStatus,
  AutoMLMetricEnum,
  AutoMLMetricExtendedEnum,
  AutoMLMode,
  AutoMLProcessingUnit,
  AutoMLS3DataType,
  AutotuneMode,
  BatchAddClusterNodesErrorCode,
  BatchDeleteClusterNodesErrorCode,
  BatchRebootClusterNodesErrorCode,
  BatchReplaceClusterNodesErrorCode,
  BatchStrategy,
  CandidateStatus,
  CandidateStepType,
  CapacityReservationType,
  CapacitySizeType,
  CaptureMode,
  ClarifyFeatureType,
  ClarifyTextGranularity,
  ClarifyTextLanguage,
  ClusterAutoScalerType,
  ClusterAutoScalingMode,
  ClusterAutoScalingStatus,
  ClusterCapacityType,
  ClusterConfigMode,
  ClusterEventResourceType,
  ClusterInstanceStatus,
  ClusterInstanceType,
  ClusterKubernetesTaintEffect,
  ClusterNodeProvisioningMode,
  ClusterNodeRecovery,
  ClusterSlurmConfigStrategy,
  ClusterSlurmNodeType,
  ClusterStatus,
  CompilationJobStatus,
  CompleteOnConvergence,
  CompressionType,
  ConditionOutcome,
  ContainerMode,
  DataSourceName,
  DeepHealthCheckType,
  DetailedAlgorithmStatus,
  FairShare,
  FeatureStatus,
  FileSystemAccessMode,
  FileSystemType,
  FillingType,
  Framework,
  HyperParameterScalingType,
  HyperParameterTuningJobObjectiveType,
  IdleResourceSharing,
  InstanceGroupStatus,
  LifecycleManagement,
  MetricSetSource,
  MIGProfileType,
  ModelApprovalStatus,
  ModelCacheSetting,
  ModelCompressionType,
  ModelPackageRegistrationType,
  ModelPackageStatus,
  NodeUnavailabilityType,
  ObjectiveStatus,
  OutputCompressionType,
  ParameterType,
  PreemptTeamTasks,
  ProblemType,
  ProcessingS3DataDistributionType,
  ProcessingS3InputMode,
  ProductionVariantInstanceType,
  RecordWrapper,
  RepositoryAccessMode,
  ResourceSharingStrategy,
  S3DataDistribution,
  S3DataType,
  S3ModelDataType,
  SchedulerResourceStatus,
  SoftwareUpdateStatus,
  SplitType,
  TargetDevice,
  TargetPlatformAccelerator,
  TargetPlatformArch,
  TargetPlatformOs,
  TrafficRoutingConfigType,
  TrainingInputMode,
  TrainingInstanceType,
  TrainingRepositoryAccessMode,
  TransformInstanceType,
  VolumeAttachmentStatus,
} from "./enums";
export interface AcceleratorPartitionConfig {
  Type: MIGProfileType | undefined;
  Count: number | undefined;
}
export interface ComputeQuotaResourceConfig {
  InstanceType: ClusterInstanceType | undefined;
  Count?: number | undefined;
  Accelerators?: number | undefined;
  VCpu?: number | undefined;
  MemoryInGiB?: number | undefined;
  AcceleratorPartition?: AcceleratorPartitionConfig | undefined;
}
export interface ActionSource {
  SourceUri: string | undefined;
  SourceType?: string | undefined;
  SourceId?: string | undefined;
}
export interface ActionSummary {
  ActionArn?: string | undefined;
  ActionName?: string | undefined;
  Source?: ActionSource | undefined;
  ActionType?: string | undefined;
  Status?: ActionStatus | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
}
export interface AddAssociationRequest {
  SourceArn: string | undefined;
  DestinationArn: string | undefined;
  AssociationType?: AssociationEdgeType | undefined;
}
export interface AddAssociationResponse {
  SourceArn?: string | undefined;
  DestinationArn?: string | undefined;
}
export interface AddClusterNodeSpecification {
  InstanceGroupName: string | undefined;
  IncrementTargetCountBy: number | undefined;
}
export interface AdditionalEnis {
  EfaEnis?: string[] | undefined;
}
export interface AdditionalS3DataSource {
  S3DataType: AdditionalS3DataSourceDataType | undefined;
  S3Uri: string | undefined;
  CompressionType?: CompressionType | undefined;
  ETag?: string | undefined;
}
export interface BaseModel {
  HubContentName?: string | undefined;
  HubContentVersion?: string | undefined;
  RecipeName?: string | undefined;
}
export interface InferenceHubAccessConfig {
  HubContentArn: string | undefined;
}
export interface ModelAccessConfig {
  AcceptEula: boolean | undefined;
}
export interface S3ModelDataSource {
  S3Uri: string | undefined;
  S3DataType: S3ModelDataType | undefined;
  CompressionType: ModelCompressionType | undefined;
  ModelAccessConfig?: ModelAccessConfig | undefined;
  HubAccessConfig?: InferenceHubAccessConfig | undefined;
  ManifestS3Uri?: string | undefined;
  ETag?: string | undefined;
  ManifestEtag?: string | undefined;
}
export interface ModelDataSource {
  S3DataSource?: S3ModelDataSource | undefined;
}
export interface ModelInput {
  DataInputConfig: string | undefined;
}
export interface ModelPackageContainerDefinition {
  ContainerHostname?: string | undefined;
  Image?: string | undefined;
  ImageDigest?: string | undefined;
  ModelDataUrl?: string | undefined;
  ModelDataSource?: ModelDataSource | undefined;
  ProductId?: string | undefined;
  Environment?: Record<string, string> | undefined;
  ModelInput?: ModelInput | undefined;
  Framework?: string | undefined;
  FrameworkVersion?: string | undefined;
  NearestModelName?: string | undefined;
  AdditionalS3DataSource?: AdditionalS3DataSource | undefined;
  ModelDataETag?: string | undefined;
  IsCheckpoint?: boolean | undefined;
  BaseModel?: BaseModel | undefined;
}
export interface AdditionalInferenceSpecificationDefinition {
  Name: string | undefined;
  Description?: string | undefined;
  Containers: ModelPackageContainerDefinition[] | undefined;
  SupportedTransformInstanceTypes?: TransformInstanceType[] | undefined;
  SupportedRealtimeInferenceInstanceTypes?:
    | ProductionVariantInstanceType[]
    | undefined;
  SupportedContentTypes?: string[] | undefined;
  SupportedResponseMIMETypes?: string[] | undefined;
}
export interface AdditionalModelDataSource {
  ChannelName: string | undefined;
  S3DataSource: S3ModelDataSource | undefined;
}
export interface Tag {
  Key: string | undefined;
  Value: string | undefined;
}
export interface AddTagsInput {
  ResourceArn: string | undefined;
  Tags: Tag[] | undefined;
}
export interface AddTagsOutput {
  Tags?: Tag[] | undefined;
}
export interface AgentVersion {
  Version: string | undefined;
  AgentCount: number | undefined;
}
export interface Alarm {
  AlarmName?: string | undefined;
}
export interface AlarmDetails {
  AlarmName: string | undefined;
}
export interface MetricDefinition {
  Name: string | undefined;
  Regex: string | undefined;
}
export interface TrainingRepositoryAuthConfig {
  TrainingRepositoryCredentialsProviderArn: string | undefined;
}
export interface TrainingImageConfig {
  TrainingRepositoryAccessMode: TrainingRepositoryAccessMode | undefined;
  TrainingRepositoryAuthConfig?: TrainingRepositoryAuthConfig | undefined;
}
export interface AlgorithmSpecification {
  TrainingImage?: string | undefined;
  AlgorithmName?: string | undefined;
  TrainingInputMode: TrainingInputMode | undefined;
  MetricDefinitions?: MetricDefinition[] | undefined;
  EnableSageMakerMetricsTimeSeries?: boolean | undefined;
  ContainerEntrypoint?: string[] | undefined;
  ContainerArguments?: string[] | undefined;
  TrainingImageConfig?: TrainingImageConfig | undefined;
}
export interface AlgorithmStatusItem {
  Name: string | undefined;
  Status: DetailedAlgorithmStatus | undefined;
  FailureReason?: string | undefined;
}
export interface AlgorithmStatusDetails {
  ValidationStatuses?: AlgorithmStatusItem[] | undefined;
  ImageScanStatuses?: AlgorithmStatusItem[] | undefined;
}
export interface AlgorithmSummary {
  AlgorithmName: string | undefined;
  AlgorithmArn: string | undefined;
  AlgorithmDescription?: string | undefined;
  CreationTime: Date | undefined;
  AlgorithmStatus: AlgorithmStatus | undefined;
}
export interface DatasetSource {
  DatasetArn: string | undefined;
}
export interface FileSystemDataSource {
  FileSystemId: string | undefined;
  FileSystemAccessMode: FileSystemAccessMode | undefined;
  FileSystemType: FileSystemType | undefined;
  DirectoryPath: string | undefined;
}
export interface HubAccessConfig {
  HubContentArn: string | undefined;
}
export interface S3DataSource {
  S3DataType: S3DataType | undefined;
  S3Uri: string | undefined;
  S3DataDistributionType?: S3DataDistribution | undefined;
  AttributeNames?: string[] | undefined;
  InstanceGroupNames?: string[] | undefined;
  ModelAccessConfig?: ModelAccessConfig | undefined;
  HubAccessConfig?: HubAccessConfig | undefined;
}
export interface DataSource {
  S3DataSource?: S3DataSource | undefined;
  FileSystemDataSource?: FileSystemDataSource | undefined;
  DatasetSource?: DatasetSource | undefined;
}
export interface ShuffleConfig {
  Seed: number | undefined;
}
export interface Channel {
  ChannelName: string | undefined;
  DataSource: DataSource | undefined;
  ContentType?: string | undefined;
  CompressionType?: CompressionType | undefined;
  RecordWrapperType?: RecordWrapper | undefined;
  InputMode?: TrainingInputMode | undefined;
  ShuffleConfig?: ShuffleConfig | undefined;
}
export interface OutputDataConfig {
  KmsKeyId?: string | undefined;
  S3OutputPath: string | undefined;
  CompressionType?: OutputCompressionType | undefined;
}
export interface InstanceGroup {
  InstanceType: TrainingInstanceType | undefined;
  InstanceCount: number | undefined;
  InstanceGroupName: string | undefined;
}
export interface PlacementSpecification {
  UltraServerId?: string | undefined;
  InstanceCount: number | undefined;
}
export interface InstancePlacementConfig {
  EnableMultipleJobs?: boolean | undefined;
  PlacementSpecifications?: PlacementSpecification[] | undefined;
}
export interface ResourceConfig {
  InstanceType?: TrainingInstanceType | undefined;
  InstanceCount?: number | undefined;
  VolumeSizeInGB?: number | undefined;
  VolumeKmsKeyId?: string | undefined;
  KeepAlivePeriodInSeconds?: number | undefined;
  InstanceGroups?: InstanceGroup[] | undefined;
  TrainingPlanArn?: string | undefined;
  InstancePlacementConfig?: InstancePlacementConfig | undefined;
}
export interface StoppingCondition {
  MaxRuntimeInSeconds?: number | undefined;
  MaxWaitTimeInSeconds?: number | undefined;
  MaxPendingTimeInSeconds?: number | undefined;
}
export interface TrainingJobDefinition {
  TrainingInputMode: TrainingInputMode | undefined;
  HyperParameters?: Record<string, string> | undefined;
  InputDataConfig: Channel[] | undefined;
  OutputDataConfig: OutputDataConfig | undefined;
  ResourceConfig: ResourceConfig | undefined;
  StoppingCondition: StoppingCondition | undefined;
}
export interface TransformS3DataSource {
  S3DataType: S3DataType | undefined;
  S3Uri: string | undefined;
}
export interface TransformDataSource {
  S3DataSource: TransformS3DataSource | undefined;
}
export interface TransformInput {
  DataSource: TransformDataSource | undefined;
  ContentType?: string | undefined;
  CompressionType?: CompressionType | undefined;
  SplitType?: SplitType | undefined;
}
export interface TransformOutput {
  S3OutputPath: string | undefined;
  Accept?: string | undefined;
  AssembleWith?: AssemblyType | undefined;
  KmsKeyId?: string | undefined;
}
export interface TransformResources {
  InstanceType: TransformInstanceType | undefined;
  InstanceCount: number | undefined;
  VolumeKmsKeyId?: string | undefined;
  TransformAmiVersion?: string | undefined;
}
export interface TransformJobDefinition {
  MaxConcurrentTransforms?: number | undefined;
  MaxPayloadInMB?: number | undefined;
  BatchStrategy?: BatchStrategy | undefined;
  Environment?: Record<string, string> | undefined;
  TransformInput: TransformInput | undefined;
  TransformOutput: TransformOutput | undefined;
  TransformResources: TransformResources | undefined;
}
export interface AlgorithmValidationProfile {
  ProfileName: string | undefined;
  TrainingJobDefinition: TrainingJobDefinition | undefined;
  TransformJobDefinition?: TransformJobDefinition | undefined;
}
export interface AlgorithmValidationSpecification {
  ValidationRole: string | undefined;
  ValidationProfiles: AlgorithmValidationProfile[] | undefined;
}
export interface AmazonQSettings {
  Status?: FeatureStatus | undefined;
  QProfileArn?: string | undefined;
}
export interface AnnotationConsolidationConfig {
  AnnotationConsolidationLambdaArn: string | undefined;
}
export interface ResourceSpec {
  SageMakerImageArn?: string | undefined;
  SageMakerImageVersionArn?: string | undefined;
  SageMakerImageVersionAlias?: string | undefined;
  InstanceType?: AppInstanceType | undefined;
  LifecycleConfigArn?: string | undefined;
}
export interface AppDetails {
  DomainId?: string | undefined;
  UserProfileName?: string | undefined;
  SpaceName?: string | undefined;
  AppType?: AppType | undefined;
  AppName?: string | undefined;
  Status?: AppStatus | undefined;
  CreationTime?: Date | undefined;
  ResourceSpec?: ResourceSpec | undefined;
}
export interface ContainerConfig {
  ContainerArguments?: string[] | undefined;
  ContainerEntrypoint?: string[] | undefined;
  ContainerEnvironmentVariables?: Record<string, string> | undefined;
}
export interface FileSystemConfig {
  MountPath?: string | undefined;
  DefaultUid?: number | undefined;
  DefaultGid?: number | undefined;
}
export interface CodeEditorAppImageConfig {
  FileSystemConfig?: FileSystemConfig | undefined;
  ContainerConfig?: ContainerConfig | undefined;
}
export interface JupyterLabAppImageConfig {
  FileSystemConfig?: FileSystemConfig | undefined;
  ContainerConfig?: ContainerConfig | undefined;
}
export interface KernelSpec {
  Name: string | undefined;
  DisplayName?: string | undefined;
}
export interface KernelGatewayImageConfig {
  KernelSpecs: KernelSpec[] | undefined;
  FileSystemConfig?: FileSystemConfig | undefined;
}
export interface AppImageConfigDetails {
  AppImageConfigArn?: string | undefined;
  AppImageConfigName?: string | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  KernelGatewayImageConfig?: KernelGatewayImageConfig | undefined;
  JupyterLabAppImageConfig?: JupyterLabAppImageConfig | undefined;
  CodeEditorAppImageConfig?: CodeEditorAppImageConfig | undefined;
}
export interface IdleSettings {
  LifecycleManagement?: LifecycleManagement | undefined;
  IdleTimeoutInMinutes?: number | undefined;
  MinIdleTimeoutInMinutes?: number | undefined;
  MaxIdleTimeoutInMinutes?: number | undefined;
}
export interface AppLifecycleManagement {
  IdleSettings?: IdleSettings | undefined;
}
export interface AppSpecification {
  ImageUri: string | undefined;
  ContainerEntrypoint?: string[] | undefined;
  ContainerArguments?: string[] | undefined;
}
export interface ArtifactSourceType {
  SourceIdType: ArtifactSourceIdType | undefined;
  Value: string | undefined;
}
export interface ArtifactSource {
  SourceUri: string | undefined;
  SourceTypes?: ArtifactSourceType[] | undefined;
}
export interface ArtifactSummary {
  ArtifactArn?: string | undefined;
  ArtifactName?: string | undefined;
  Source?: ArtifactSource | undefined;
  ArtifactType?: string | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
}
export interface AssociateTrialComponentRequest {
  TrialComponentName: string | undefined;
  TrialName: string | undefined;
}
export interface AssociateTrialComponentResponse {
  TrialComponentArn?: string | undefined;
  TrialArn?: string | undefined;
}
export interface AssociationInfo {
  SourceArn: string | undefined;
  DestinationArn: string | undefined;
}
export interface IamIdentity {
  Arn?: string | undefined;
  PrincipalId?: string | undefined;
  SourceIdentity?: string | undefined;
}
export interface UserContext {
  UserProfileArn?: string | undefined;
  UserProfileName?: string | undefined;
  DomainId?: string | undefined;
  IamIdentity?: IamIdentity | undefined;
}
export interface AssociationSummary {
  SourceArn?: string | undefined;
  DestinationArn?: string | undefined;
  SourceType?: string | undefined;
  DestinationType?: string | undefined;
  AssociationType?: AssociationEdgeType | undefined;
  SourceName?: string | undefined;
  DestinationName?: string | undefined;
  CreationTime?: Date | undefined;
  CreatedBy?: UserContext | undefined;
}
export interface AsyncInferenceClientConfig {
  MaxConcurrentInvocationsPerInstance?: number | undefined;
}
export interface AsyncInferenceNotificationConfig {
  SuccessTopic?: string | undefined;
  ErrorTopic?: string | undefined;
  IncludeInferenceResponseIn?: AsyncNotificationTopicTypes[] | undefined;
}
export interface AsyncInferenceOutputConfig {
  KmsKeyId?: string | undefined;
  S3OutputPath?: string | undefined;
  NotificationConfig?: AsyncInferenceNotificationConfig | undefined;
  S3FailurePath?: string | undefined;
}
export interface AsyncInferenceConfig {
  ClientConfig?: AsyncInferenceClientConfig | undefined;
  OutputConfig: AsyncInferenceOutputConfig | undefined;
}
export interface AthenaDatasetDefinition {
  Catalog: string | undefined;
  Database: string | undefined;
  QueryString: string | undefined;
  WorkGroup?: string | undefined;
  OutputS3Uri: string | undefined;
  KmsKeyId?: string | undefined;
  OutputFormat: AthenaResultFormat | undefined;
  OutputCompression?: AthenaResultCompressionType | undefined;
}
export interface AttachClusterNodeVolumeRequest {
  ClusterArn: string | undefined;
  NodeId: string | undefined;
  VolumeId: string | undefined;
}
export interface AttachClusterNodeVolumeResponse {
  ClusterArn: string | undefined;
  NodeId: string | undefined;
  VolumeId: string | undefined;
  AttachTime: Date | undefined;
  Status: VolumeAttachmentStatus | undefined;
  DeviceName: string | undefined;
}
export interface AuthorizedUrl {
  Url?: string | undefined;
  LocalPath?: string | undefined;
}
export interface AutoMLAlgorithmConfig {
  AutoMLAlgorithms: AutoMLAlgorithm[] | undefined;
}
export interface CandidateArtifactLocations {
  Explainability: string | undefined;
  ModelInsights?: string | undefined;
  BacktestResults?: string | undefined;
}
export interface MetricDatum {
  MetricName?: AutoMLMetricEnum | undefined;
  StandardMetricName?: AutoMLMetricExtendedEnum | undefined;
  Value?: number | undefined;
  Set?: MetricSetSource | undefined;
}
export interface CandidateProperties {
  CandidateArtifactLocations?: CandidateArtifactLocations | undefined;
  CandidateMetrics?: MetricDatum[] | undefined;
}
export interface AutoMLCandidateStep {
  CandidateStepType: CandidateStepType | undefined;
  CandidateStepArn: string | undefined;
  CandidateStepName: string | undefined;
}
export interface FinalAutoMLJobObjectiveMetric {
  Type?: AutoMLJobObjectiveType | undefined;
  MetricName: AutoMLMetricEnum | undefined;
  Value: number | undefined;
  StandardMetricName?: AutoMLMetricEnum | undefined;
}
export interface AutoMLContainerDefinition {
  Image: string | undefined;
  ModelDataUrl: string | undefined;
  Environment?: Record<string, string> | undefined;
}
export interface AutoMLCandidate {
  CandidateName: string | undefined;
  FinalAutoMLJobObjectiveMetric?: FinalAutoMLJobObjectiveMetric | undefined;
  ObjectiveStatus: ObjectiveStatus | undefined;
  CandidateSteps: AutoMLCandidateStep[] | undefined;
  CandidateStatus: CandidateStatus | undefined;
  InferenceContainers?: AutoMLContainerDefinition[] | undefined;
  CreationTime: Date | undefined;
  EndTime?: Date | undefined;
  LastModifiedTime: Date | undefined;
  FailureReason?: string | undefined;
  CandidateProperties?: CandidateProperties | undefined;
  InferenceContainerDefinitions?:
    | Partial<Record<AutoMLProcessingUnit, AutoMLContainerDefinition[]>>
    | undefined;
}
export interface AutoMLCandidateGenerationConfig {
  FeatureSpecificationS3Uri?: string | undefined;
  AlgorithmsConfig?: AutoMLAlgorithmConfig[] | undefined;
}
export interface AutoMLS3DataSource {
  S3DataType: AutoMLS3DataType | undefined;
  S3Uri: string | undefined;
}
export interface AutoMLDataSource {
  S3DataSource: AutoMLS3DataSource | undefined;
}
export interface AutoMLChannel {
  DataSource?: AutoMLDataSource | undefined;
  CompressionType?: CompressionType | undefined;
  TargetAttributeName: string | undefined;
  ContentType?: string | undefined;
  ChannelType?: AutoMLChannelType | undefined;
  SampleWeightAttributeName?: string | undefined;
}
export interface EmrServerlessComputeConfig {
  ExecutionRoleARN: string | undefined;
}
export interface AutoMLComputeConfig {
  EmrServerlessComputeConfig?: EmrServerlessComputeConfig | undefined;
}
export interface AutoMLDataSplitConfig {
  ValidationFraction?: number | undefined;
}
export interface AutoMLJobArtifacts {
  CandidateDefinitionNotebookLocation?: string | undefined;
  DataExplorationNotebookLocation?: string | undefined;
}
export interface AutoMLJobChannel {
  ChannelType?: AutoMLChannelType | undefined;
  ContentType?: string | undefined;
  CompressionType?: CompressionType | undefined;
  DataSource?: AutoMLDataSource | undefined;
}
export interface AutoMLJobCompletionCriteria {
  MaxCandidates?: number | undefined;
  MaxRuntimePerTrainingJobInSeconds?: number | undefined;
  MaxAutoMLJobRuntimeInSeconds?: number | undefined;
}
export interface VpcConfig {
  SecurityGroupIds: string[] | undefined;
  Subnets: string[] | undefined;
}
export interface AutoMLSecurityConfig {
  VolumeKmsKeyId?: string | undefined;
  EnableInterContainerTrafficEncryption?: boolean | undefined;
  VpcConfig?: VpcConfig | undefined;
}
export interface AutoMLJobConfig {
  CompletionCriteria?: AutoMLJobCompletionCriteria | undefined;
  SecurityConfig?: AutoMLSecurityConfig | undefined;
  CandidateGenerationConfig?: AutoMLCandidateGenerationConfig | undefined;
  DataSplitConfig?: AutoMLDataSplitConfig | undefined;
  Mode?: AutoMLMode | undefined;
}
export interface AutoMLJobObjective {
  MetricName: AutoMLMetricEnum | undefined;
}
export interface AutoMLJobStepMetadata {
  Arn?: string | undefined;
}
export interface AutoMLPartialFailureReason {
  PartialFailureMessage?: string | undefined;
}
export interface AutoMLJobSummary {
  AutoMLJobName: string | undefined;
  AutoMLJobArn: string | undefined;
  AutoMLJobStatus: AutoMLJobStatus | undefined;
  AutoMLJobSecondaryStatus: AutoMLJobSecondaryStatus | undefined;
  CreationTime: Date | undefined;
  EndTime?: Date | undefined;
  LastModifiedTime: Date | undefined;
  FailureReason?: string | undefined;
  PartialFailureReasons?: AutoMLPartialFailureReason[] | undefined;
}
export interface AutoMLOutputDataConfig {
  KmsKeyId?: string | undefined;
  S3OutputPath: string | undefined;
}
export interface ImageClassificationJobConfig {
  CompletionCriteria?: AutoMLJobCompletionCriteria | undefined;
}
export interface CandidateGenerationConfig {
  AlgorithmsConfig?: AutoMLAlgorithmConfig[] | undefined;
}
export interface TabularJobConfig {
  CandidateGenerationConfig?: CandidateGenerationConfig | undefined;
  CompletionCriteria?: AutoMLJobCompletionCriteria | undefined;
  FeatureSpecificationS3Uri?: string | undefined;
  Mode?: AutoMLMode | undefined;
  GenerateCandidateDefinitionsOnly?: boolean | undefined;
  ProblemType?: ProblemType | undefined;
  TargetAttributeName: string | undefined;
  SampleWeightAttributeName?: string | undefined;
}
export interface TextClassificationJobConfig {
  CompletionCriteria?: AutoMLJobCompletionCriteria | undefined;
  ContentColumn: string | undefined;
  TargetLabelColumn: string | undefined;
}
export interface TextGenerationJobConfig {
  CompletionCriteria?: AutoMLJobCompletionCriteria | undefined;
  BaseModelName?: string | undefined;
  TextGenerationHyperParameters?: Record<string, string> | undefined;
  ModelAccessConfig?: ModelAccessConfig | undefined;
}
export interface HolidayConfigAttributes {
  CountryCode?: string | undefined;
}
export interface TimeSeriesConfig {
  TargetAttributeName: string | undefined;
  TimestampAttributeName: string | undefined;
  ItemIdentifierAttributeName: string | undefined;
  GroupingAttributeNames?: string[] | undefined;
}
export interface TimeSeriesTransformations {
  Filling?: Record<string, Partial<Record<FillingType, string>>> | undefined;
  Aggregation?: Record<string, AggregationTransformationValue> | undefined;
}
export interface TimeSeriesForecastingJobConfig {
  FeatureSpecificationS3Uri?: string | undefined;
  CompletionCriteria?: AutoMLJobCompletionCriteria | undefined;
  ForecastFrequency: string | undefined;
  ForecastHorizon: number | undefined;
  ForecastQuantiles?: string[] | undefined;
  Transformations?: TimeSeriesTransformations | undefined;
  TimeSeriesConfig: TimeSeriesConfig | undefined;
  HolidayConfig?: HolidayConfigAttributes[] | undefined;
  CandidateGenerationConfig?: CandidateGenerationConfig | undefined;
}
export type AutoMLProblemTypeConfig =
  | AutoMLProblemTypeConfig.ImageClassificationJobConfigMember
  | AutoMLProblemTypeConfig.TabularJobConfigMember
  | AutoMLProblemTypeConfig.TextClassificationJobConfigMember
  | AutoMLProblemTypeConfig.TextGenerationJobConfigMember
  | AutoMLProblemTypeConfig.TimeSeriesForecastingJobConfigMember
  | AutoMLProblemTypeConfig.$UnknownMember;
export declare namespace AutoMLProblemTypeConfig {
  interface ImageClassificationJobConfigMember {
    ImageClassificationJobConfig: ImageClassificationJobConfig;
    TextClassificationJobConfig?: never;
    TimeSeriesForecastingJobConfig?: never;
    TabularJobConfig?: never;
    TextGenerationJobConfig?: never;
    $unknown?: never;
  }
  interface TextClassificationJobConfigMember {
    ImageClassificationJobConfig?: never;
    TextClassificationJobConfig: TextClassificationJobConfig;
    TimeSeriesForecastingJobConfig?: never;
    TabularJobConfig?: never;
    TextGenerationJobConfig?: never;
    $unknown?: never;
  }
  interface TimeSeriesForecastingJobConfigMember {
    ImageClassificationJobConfig?: never;
    TextClassificationJobConfig?: never;
    TimeSeriesForecastingJobConfig: TimeSeriesForecastingJobConfig;
    TabularJobConfig?: never;
    TextGenerationJobConfig?: never;
    $unknown?: never;
  }
  interface TabularJobConfigMember {
    ImageClassificationJobConfig?: never;
    TextClassificationJobConfig?: never;
    TimeSeriesForecastingJobConfig?: never;
    TabularJobConfig: TabularJobConfig;
    TextGenerationJobConfig?: never;
    $unknown?: never;
  }
  interface TextGenerationJobConfigMember {
    ImageClassificationJobConfig?: never;
    TextClassificationJobConfig?: never;
    TimeSeriesForecastingJobConfig?: never;
    TabularJobConfig?: never;
    TextGenerationJobConfig: TextGenerationJobConfig;
    $unknown?: never;
  }
  interface $UnknownMember {
    ImageClassificationJobConfig?: never;
    TextClassificationJobConfig?: never;
    TimeSeriesForecastingJobConfig?: never;
    TabularJobConfig?: never;
    TextGenerationJobConfig?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    ImageClassificationJobConfig: (value: ImageClassificationJobConfig) => T;
    TextClassificationJobConfig: (value: TextClassificationJobConfig) => T;
    TimeSeriesForecastingJobConfig: (
      value: TimeSeriesForecastingJobConfig
    ) => T;
    TabularJobConfig: (value: TabularJobConfig) => T;
    TextGenerationJobConfig: (value: TextGenerationJobConfig) => T;
    _: (name: string, value: any) => T;
  }
}
export interface TabularResolvedAttributes {
  ProblemType?: ProblemType | undefined;
}
export interface TextGenerationResolvedAttributes {
  BaseModelName?: string | undefined;
}
export type AutoMLProblemTypeResolvedAttributes =
  | AutoMLProblemTypeResolvedAttributes.TabularResolvedAttributesMember
  | AutoMLProblemTypeResolvedAttributes.TextGenerationResolvedAttributesMember
  | AutoMLProblemTypeResolvedAttributes.$UnknownMember;
export declare namespace AutoMLProblemTypeResolvedAttributes {
  interface TabularResolvedAttributesMember {
    TabularResolvedAttributes: TabularResolvedAttributes;
    TextGenerationResolvedAttributes?: never;
    $unknown?: never;
  }
  interface TextGenerationResolvedAttributesMember {
    TabularResolvedAttributes?: never;
    TextGenerationResolvedAttributes: TextGenerationResolvedAttributes;
    $unknown?: never;
  }
  interface $UnknownMember {
    TabularResolvedAttributes?: never;
    TextGenerationResolvedAttributes?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    TabularResolvedAttributes: (value: TabularResolvedAttributes) => T;
    TextGenerationResolvedAttributes: (
      value: TextGenerationResolvedAttributes
    ) => T;
    _: (name: string, value: any) => T;
  }
}
export interface AutoMLResolvedAttributes {
  AutoMLJobObjective?: AutoMLJobObjective | undefined;
  CompletionCriteria?: AutoMLJobCompletionCriteria | undefined;
  AutoMLProblemTypeResolvedAttributes?:
    | AutoMLProblemTypeResolvedAttributes
    | undefined;
}
export interface AutoParameter {
  Name: string | undefined;
  ValueHint: string | undefined;
}
export interface AutoRollbackConfig {
  Alarms?: Alarm[] | undefined;
}
export interface Autotune {
  Mode: AutotuneMode | undefined;
}
export interface AvailableUpgrade {
  Version?: string | undefined;
  ReleaseNotes?: string[] | undefined;
}
export interface BatchAddClusterNodesRequest {
  ClusterName: string | undefined;
  ClientToken?: string | undefined;
  NodesToAdd: AddClusterNodeSpecification[] | undefined;
}
export interface BatchAddClusterNodesError {
  InstanceGroupName: string | undefined;
  ErrorCode: BatchAddClusterNodesErrorCode | undefined;
  FailedCount: number | undefined;
  Message?: string | undefined;
}
export interface NodeAdditionResult {
  NodeLogicalId: string | undefined;
  InstanceGroupName: string | undefined;
  Status: ClusterInstanceStatus | undefined;
}
export interface BatchAddClusterNodesResponse {
  Successful: NodeAdditionResult[] | undefined;
  Failed: BatchAddClusterNodesError[] | undefined;
}
export interface BatchDataCaptureConfig {
  DestinationS3Uri: string | undefined;
  KmsKeyId?: string | undefined;
  GenerateInferenceId?: boolean | undefined;
}
export interface BatchDeleteClusterNodeLogicalIdsError {
  Code: BatchDeleteClusterNodesErrorCode | undefined;
  Message: string | undefined;
  NodeLogicalId: string | undefined;
}
export interface BatchDeleteClusterNodesRequest {
  ClusterName: string | undefined;
  NodeIds?: string[] | undefined;
  NodeLogicalIds?: string[] | undefined;
}
export interface BatchDeleteClusterNodesError {
  Code: BatchDeleteClusterNodesErrorCode | undefined;
  Message: string | undefined;
  NodeId: string | undefined;
}
export interface BatchDeleteClusterNodesResponse {
  Failed?: BatchDeleteClusterNodesError[] | undefined;
  Successful?: string[] | undefined;
  FailedNodeLogicalIds?: BatchDeleteClusterNodeLogicalIdsError[] | undefined;
  SuccessfulNodeLogicalIds?: string[] | undefined;
}
export interface BatchDescribeModelPackageInput {
  ModelPackageArnList: string[] | undefined;
}
export interface BatchDescribeModelPackageError {
  ErrorCode: string | undefined;
  ErrorResponse: string | undefined;
}
export interface InferenceSpecification {
  Containers: ModelPackageContainerDefinition[] | undefined;
  SupportedTransformInstanceTypes?: TransformInstanceType[] | undefined;
  SupportedRealtimeInferenceInstanceTypes?:
    | ProductionVariantInstanceType[]
    | undefined;
  SupportedContentTypes?: string[] | undefined;
  SupportedResponseMIMETypes?: string[] | undefined;
}
export interface BatchDescribeModelPackageSummary {
  ModelPackageGroupName: string | undefined;
  ModelPackageVersion?: number | undefined;
  ModelPackageArn: string | undefined;
  ModelPackageDescription?: string | undefined;
  CreationTime: Date | undefined;
  InferenceSpecification: InferenceSpecification | undefined;
  ModelPackageStatus: ModelPackageStatus | undefined;
  ModelApprovalStatus?: ModelApprovalStatus | undefined;
  ModelPackageRegistrationType?: ModelPackageRegistrationType | undefined;
}
export interface BatchDescribeModelPackageOutput {
  ModelPackageSummaries?:
    | Record<string, BatchDescribeModelPackageSummary>
    | undefined;
  BatchDescribeModelPackageErrorMap?:
    | Record<string, BatchDescribeModelPackageError>
    | undefined;
}
export interface BatchRebootClusterNodeLogicalIdsError {
  NodeLogicalId: string | undefined;
  ErrorCode: BatchRebootClusterNodesErrorCode | undefined;
  Message: string | undefined;
}
export interface BatchRebootClusterNodesRequest {
  ClusterName: string | undefined;
  NodeIds?: string[] | undefined;
  NodeLogicalIds?: string[] | undefined;
}
export interface BatchRebootClusterNodesError {
  NodeId: string | undefined;
  ErrorCode: BatchRebootClusterNodesErrorCode | undefined;
  Message: string | undefined;
}
export interface BatchRebootClusterNodesResponse {
  Successful?: string[] | undefined;
  Failed?: BatchRebootClusterNodesError[] | undefined;
  FailedNodeLogicalIds?: BatchRebootClusterNodeLogicalIdsError[] | undefined;
  SuccessfulNodeLogicalIds?: string[] | undefined;
}
export interface BatchReplaceClusterNodeLogicalIdsError {
  NodeLogicalId: string | undefined;
  ErrorCode: BatchReplaceClusterNodesErrorCode | undefined;
  Message: string | undefined;
}
export interface BatchReplaceClusterNodesRequest {
  ClusterName: string | undefined;
  NodeIds?: string[] | undefined;
  NodeLogicalIds?: string[] | undefined;
}
export interface BatchReplaceClusterNodesError {
  NodeId: string | undefined;
  ErrorCode: BatchReplaceClusterNodesErrorCode | undefined;
  Message: string | undefined;
}
export interface BatchReplaceClusterNodesResponse {
  Successful?: string[] | undefined;
  Failed?: BatchReplaceClusterNodesError[] | undefined;
  FailedNodeLogicalIds?: BatchReplaceClusterNodeLogicalIdsError[] | undefined;
  SuccessfulNodeLogicalIds?: string[] | undefined;
}
export interface MonitoringCsvDatasetFormat {
  Header?: boolean | undefined;
}
export interface MonitoringJsonDatasetFormat {
  Line?: boolean | undefined;
}
export interface MonitoringParquetDatasetFormat {}
export interface MonitoringDatasetFormat {
  Csv?: MonitoringCsvDatasetFormat | undefined;
  Json?: MonitoringJsonDatasetFormat | undefined;
  Parquet?: MonitoringParquetDatasetFormat | undefined;
}
export interface BatchTransformInput {
  DataCapturedDestinationS3Uri: string | undefined;
  DatasetFormat: MonitoringDatasetFormat | undefined;
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
export interface BedrockCustomModelDeploymentMetadata {
  Arn?: string | undefined;
}
export interface BedrockCustomModelMetadata {
  Arn?: string | undefined;
}
export interface BedrockModelImportMetadata {
  Arn?: string | undefined;
}
export interface BedrockProvisionedModelThroughputMetadata {
  Arn?: string | undefined;
}
export interface BestObjectiveNotImproving {
  MaxNumberOfTrainingJobsNotImproving?: number | undefined;
}
export interface MetricsSource {
  ContentType: string | undefined;
  ContentDigest?: string | undefined;
  S3Uri: string | undefined;
}
export interface Bias {
  Report?: MetricsSource | undefined;
  PreTrainingReport?: MetricsSource | undefined;
  PostTrainingReport?: MetricsSource | undefined;
}
export interface CapacitySize {
  Type: CapacitySizeType | undefined;
  Value: number | undefined;
}
export interface TrafficRoutingConfig {
  Type: TrafficRoutingConfigType | undefined;
  WaitIntervalInSeconds: number | undefined;
  CanarySize?: CapacitySize | undefined;
  LinearStepSize?: CapacitySize | undefined;
}
export interface BlueGreenUpdatePolicy {
  TrafficRoutingConfiguration: TrafficRoutingConfig | undefined;
  TerminationWaitInSeconds?: number | undefined;
  MaximumExecutionTimeoutInSeconds?: number | undefined;
}
export interface CacheHitResult {
  SourcePipelineExecutionArn?: string | undefined;
}
export interface OutputParameter {
  Name: string | undefined;
  Value: string | undefined;
}
export interface CallbackStepMetadata {
  CallbackToken?: string | undefined;
  SqsQueueUrl?: string | undefined;
  OutputParameters?: OutputParameter[] | undefined;
}
export interface DirectDeploySettings {
  Status?: FeatureStatus | undefined;
}
export interface EmrServerlessSettings {
  ExecutionRoleArn?: string | undefined;
  Status?: FeatureStatus | undefined;
}
export interface GenerativeAiSettings {
  AmazonBedrockRoleArn?: string | undefined;
}
export interface IdentityProviderOAuthSetting {
  DataSourceName?: DataSourceName | undefined;
  Status?: FeatureStatus | undefined;
  SecretArn?: string | undefined;
}
export interface KendraSettings {
  Status?: FeatureStatus | undefined;
}
export interface ModelRegisterSettings {
  Status?: FeatureStatus | undefined;
  CrossAccountModelRegisterRoleArn?: string | undefined;
}
export interface TimeSeriesForecastingSettings {
  Status?: FeatureStatus | undefined;
  AmazonForecastRoleArn?: string | undefined;
}
export interface WorkspaceSettings {
  S3ArtifactPath?: string | undefined;
  S3KmsKeyId?: string | undefined;
}
export interface CanvasAppSettings {
  TimeSeriesForecastingSettings?: TimeSeriesForecastingSettings | undefined;
  ModelRegisterSettings?: ModelRegisterSettings | undefined;
  WorkspaceSettings?: WorkspaceSettings | undefined;
  IdentityProviderOAuthSettings?: IdentityProviderOAuthSetting[] | undefined;
  DirectDeploySettings?: DirectDeploySettings | undefined;
  KendraSettings?: KendraSettings | undefined;
  GenerativeAiSettings?: GenerativeAiSettings | undefined;
  EmrServerlessSettings?: EmrServerlessSettings | undefined;
}
export interface CapacityReservation {
  Arn?: string | undefined;
  Type?: CapacityReservationType | undefined;
}
export interface CapacitySizeConfig {
  Type: NodeUnavailabilityType | undefined;
  Value: number | undefined;
}
export interface CaptureContentTypeHeader {
  CsvContentTypes?: string[] | undefined;
  JsonContentTypes?: string[] | undefined;
}
export interface CaptureOption {
  CaptureMode: CaptureMode | undefined;
}
export interface CategoricalParameter {
  Name: string | undefined;
  Value: string[] | undefined;
}
export interface CategoricalParameterRange {
  Name: string | undefined;
  Values: string[] | undefined;
}
export interface CategoricalParameterRangeSpecification {
  Values: string[] | undefined;
}
export interface CfnStackCreateParameter {
  Key: string | undefined;
  Value?: string | undefined;
}
export interface CfnCreateTemplateProvider {
  TemplateName: string | undefined;
  TemplateURL: string | undefined;
  RoleARN?: string | undefined;
  Parameters?: CfnStackCreateParameter[] | undefined;
}
export interface CfnStackDetail {
  Name?: string | undefined;
  Id?: string | undefined;
  StatusMessage: string | undefined;
}
export interface CfnStackParameter {
  Key: string | undefined;
  Value?: string | undefined;
}
export interface CfnStackUpdateParameter {
  Key: string | undefined;
  Value?: string | undefined;
}
export interface CfnTemplateProviderDetail {
  TemplateName: string | undefined;
  TemplateURL: string | undefined;
  RoleARN?: string | undefined;
  Parameters?: CfnStackParameter[] | undefined;
  StackDetail?: CfnStackDetail | undefined;
}
export interface CfnUpdateTemplateProvider {
  TemplateName: string | undefined;
  TemplateURL: string | undefined;
  Parameters?: CfnStackUpdateParameter[] | undefined;
}
export interface ChannelSpecification {
  Name: string | undefined;
  Description?: string | undefined;
  IsRequired?: boolean | undefined;
  SupportedContentTypes: string[] | undefined;
  SupportedCompressionTypes?: CompressionType[] | undefined;
  SupportedInputModes: TrainingInputMode[] | undefined;
}
export interface CheckpointConfig {
  S3Uri: string | undefined;
  LocalPath?: string | undefined;
}
export interface ClarifyCheckStepMetadata {
  CheckType?: string | undefined;
  BaselineUsedForDriftCheckConstraints?: string | undefined;
  CalculatedBaselineConstraints?: string | undefined;
  ModelPackageGroupName?: string | undefined;
  ViolationReport?: string | undefined;
  CheckJobArn?: string | undefined;
  SkipCheck?: boolean | undefined;
  RegisterNewBaseline?: boolean | undefined;
}
export interface ClarifyInferenceConfig {
  FeaturesAttribute?: string | undefined;
  ContentTemplate?: string | undefined;
  MaxRecordCount?: number | undefined;
  MaxPayloadInMB?: number | undefined;
  ProbabilityIndex?: number | undefined;
  LabelIndex?: number | undefined;
  ProbabilityAttribute?: string | undefined;
  LabelAttribute?: string | undefined;
  LabelHeaders?: string[] | undefined;
  FeatureHeaders?: string[] | undefined;
  FeatureTypes?: ClarifyFeatureType[] | undefined;
}
export interface ClarifyShapBaselineConfig {
  MimeType?: string | undefined;
  ShapBaseline?: string | undefined;
  ShapBaselineUri?: string | undefined;
}
export interface ClarifyTextConfig {
  Language: ClarifyTextLanguage | undefined;
  Granularity: ClarifyTextGranularity | undefined;
}
export interface ClarifyShapConfig {
  ShapBaselineConfig: ClarifyShapBaselineConfig | undefined;
  NumberOfSamples?: number | undefined;
  UseLogit?: boolean | undefined;
  Seed?: number | undefined;
  TextConfig?: ClarifyTextConfig | undefined;
}
export interface ClarifyExplainerConfig {
  EnableExplanations?: string | undefined;
  InferenceConfig?: ClarifyInferenceConfig | undefined;
  ShapConfig: ClarifyShapConfig | undefined;
}
export interface ClusterAutoScalingConfig {
  Mode: ClusterAutoScalingMode | undefined;
  AutoScalerType?: ClusterAutoScalerType | undefined;
}
export interface ClusterAutoScalingConfigOutput {
  Mode: ClusterAutoScalingMode | undefined;
  AutoScalerType?: ClusterAutoScalerType | undefined;
  Status: ClusterAutoScalingStatus | undefined;
  FailureMessage?: string | undefined;
}
export interface ClusterOnDemandOptions {}
export interface ClusterSpotOptions {}
export interface ClusterCapacityRequirements {
  Spot?: ClusterSpotOptions | undefined;
  OnDemand?: ClusterOnDemandOptions | undefined;
}
export interface ClusterEbsVolumeConfig {
  VolumeSizeInGB?: number | undefined;
  VolumeKmsKeyId?: string | undefined;
  RootVolume?: boolean | undefined;
}
export interface ClusterMetadata {
  FailureMessage?: string | undefined;
  EksRoleAccessEntries?: string[] | undefined;
  SlrAccessEntry?: string | undefined;
}
export interface InstanceMetadata {
  CustomerEni?: string | undefined;
  AdditionalEnis?: AdditionalEnis | undefined;
  CapacityReservation?: CapacityReservation | undefined;
  FailureMessage?: string | undefined;
  LcsExecutionState?: string | undefined;
  NodeLogicalId?: string | undefined;
}
export interface InstanceGroupMetadata {
  FailureMessage?: string | undefined;
  AvailabilityZoneId?: string | undefined;
  CapacityReservation?: CapacityReservation | undefined;
  SubnetId?: string | undefined;
  SecurityGroupIds?: string[] | undefined;
  AmiOverride?: string | undefined;
}
export interface InstanceGroupScalingMetadata {
  InstanceCount?: number | undefined;
  TargetCount?: number | undefined;
  MinCount?: number | undefined;
  FailureMessage?: string | undefined;
}
export type EventMetadata =
  | EventMetadata.ClusterMember
  | EventMetadata.InstanceMember
  | EventMetadata.InstanceGroupMember
  | EventMetadata.InstanceGroupScalingMember
  | EventMetadata.$UnknownMember;
export declare namespace EventMetadata {
  interface ClusterMember {
    Cluster: ClusterMetadata;
    InstanceGroup?: never;
    InstanceGroupScaling?: never;
    Instance?: never;
    $unknown?: never;
  }
  interface InstanceGroupMember {
    Cluster?: never;
    InstanceGroup: InstanceGroupMetadata;
    InstanceGroupScaling?: never;
    Instance?: never;
    $unknown?: never;
  }
  interface InstanceGroupScalingMember {
    Cluster?: never;
    InstanceGroup?: never;
    InstanceGroupScaling: InstanceGroupScalingMetadata;
    Instance?: never;
    $unknown?: never;
  }
  interface InstanceMember {
    Cluster?: never;
    InstanceGroup?: never;
    InstanceGroupScaling?: never;
    Instance: InstanceMetadata;
    $unknown?: never;
  }
  interface $UnknownMember {
    Cluster?: never;
    InstanceGroup?: never;
    InstanceGroupScaling?: never;
    Instance?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    Cluster: (value: ClusterMetadata) => T;
    InstanceGroup: (value: InstanceGroupMetadata) => T;
    InstanceGroupScaling: (value: InstanceGroupScalingMetadata) => T;
    Instance: (value: InstanceMetadata) => T;
    _: (name: string, value: any) => T;
  }
}
export interface EventDetails {
  EventMetadata?: EventMetadata | undefined;
}
export interface ClusterEventDetail {
  EventId: string | undefined;
  ClusterArn: string | undefined;
  ClusterName: string | undefined;
  InstanceGroupName?: string | undefined;
  InstanceId?: string | undefined;
  ResourceType: ClusterEventResourceType | undefined;
  EventTime: Date | undefined;
  EventDetails?: EventDetails | undefined;
  Description?: string | undefined;
}
export interface ClusterEventSummary {
  EventId: string | undefined;
  ClusterArn: string | undefined;
  ClusterName: string | undefined;
  InstanceGroupName?: string | undefined;
  InstanceId?: string | undefined;
  ResourceType: ClusterEventResourceType | undefined;
  EventTime: Date | undefined;
  Description?: string | undefined;
}
export interface ClusterFsxLustreConfig {
  DnsName: string | undefined;
  MountName: string | undefined;
  MountPath?: string | undefined;
}
export interface ClusterFsxOpenZfsConfig {
  DnsName: string | undefined;
  MountPath?: string | undefined;
}
export interface RollingDeploymentPolicy {
  MaximumBatchSize: CapacitySizeConfig | undefined;
  RollbackMaximumBatchSize?: CapacitySizeConfig | undefined;
}
export interface DeploymentConfiguration {
  RollingUpdatePolicy?: RollingDeploymentPolicy | undefined;
  WaitIntervalInSeconds?: number | undefined;
  AutoRollbackConfiguration?: AlarmDetails[] | undefined;
}
export type ClusterInstanceStorageConfig =
  | ClusterInstanceStorageConfig.EbsVolumeConfigMember
  | ClusterInstanceStorageConfig.FsxLustreConfigMember
  | ClusterInstanceStorageConfig.FsxOpenZfsConfigMember
  | ClusterInstanceStorageConfig.$UnknownMember;
export declare namespace ClusterInstanceStorageConfig {
  interface EbsVolumeConfigMember {
    EbsVolumeConfig: ClusterEbsVolumeConfig;
    FsxLustreConfig?: never;
    FsxOpenZfsConfig?: never;
    $unknown?: never;
  }
  interface FsxLustreConfigMember {
    EbsVolumeConfig?: never;
    FsxLustreConfig: ClusterFsxLustreConfig;
    FsxOpenZfsConfig?: never;
    $unknown?: never;
  }
  interface FsxOpenZfsConfigMember {
    EbsVolumeConfig?: never;
    FsxLustreConfig?: never;
    FsxOpenZfsConfig: ClusterFsxOpenZfsConfig;
    $unknown?: never;
  }
  interface $UnknownMember {
    EbsVolumeConfig?: never;
    FsxLustreConfig?: never;
    FsxOpenZfsConfig?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    EbsVolumeConfig: (value: ClusterEbsVolumeConfig) => T;
    FsxLustreConfig: (value: ClusterFsxLustreConfig) => T;
    FsxOpenZfsConfig: (value: ClusterFsxOpenZfsConfig) => T;
    _: (name: string, value: any) => T;
  }
}
export interface ClusterKubernetesTaint {
  Key: string | undefined;
  Value?: string | undefined;
  Effect: ClusterKubernetesTaintEffect | undefined;
}
export interface ClusterKubernetesConfigDetails {
  CurrentLabels?: Record<string, string> | undefined;
  DesiredLabels?: Record<string, string> | undefined;
  CurrentTaints?: ClusterKubernetesTaint[] | undefined;
  DesiredTaints?: ClusterKubernetesTaint[] | undefined;
}
export interface ClusterLifeCycleConfig {
  SourceS3Uri: string | undefined;
  OnCreate: string | undefined;
}
export interface ScheduledUpdateConfig {
  ScheduleExpression: string | undefined;
  DeploymentConfig?: DeploymentConfiguration | undefined;
}
export interface ClusterSlurmConfigDetails {
  NodeType: ClusterSlurmNodeType | undefined;
  PartitionNames?: string[] | undefined;
}
export interface ClusterInstanceGroupDetails {
  CurrentCount?: number | undefined;
  TargetCount?: number | undefined;
  MinCount?: number | undefined;
  InstanceGroupName?: string | undefined;
  InstanceType?: ClusterInstanceType | undefined;
  LifeCycleConfig?: ClusterLifeCycleConfig | undefined;
  ExecutionRole?: string | undefined;
  ThreadsPerCore?: number | undefined;
  InstanceStorageConfigs?: ClusterInstanceStorageConfig[] | undefined;
  OnStartDeepHealthChecks?: DeepHealthCheckType[] | undefined;
  Status?: InstanceGroupStatus | undefined;
  TrainingPlanArn?: string | undefined;
  TrainingPlanStatus?: string | undefined;
  OverrideVpcConfig?: VpcConfig | undefined;
  ScheduledUpdateConfig?: ScheduledUpdateConfig | undefined;
  CurrentImageId?: string | undefined;
  DesiredImageId?: string | undefined;
  ActiveOperations?:
    | Partial<Record<ActiveClusterOperationName, number>>
    | undefined;
  KubernetesConfig?: ClusterKubernetesConfigDetails | undefined;
  CapacityRequirements?: ClusterCapacityRequirements | undefined;
  TargetStateCount?: number | undefined;
  SoftwareUpdateStatus?: SoftwareUpdateStatus | undefined;
  ActiveSoftwareUpdateConfig?: DeploymentConfiguration | undefined;
  SlurmConfig?: ClusterSlurmConfigDetails | undefined;
}
export interface ClusterKubernetesConfig {
  Labels?: Record<string, string> | undefined;
  Taints?: ClusterKubernetesTaint[] | undefined;
}
export interface ClusterSlurmConfig {
  NodeType: ClusterSlurmNodeType | undefined;
  PartitionNames?: string[] | undefined;
}
export interface ClusterInstanceGroupSpecification {
  InstanceCount: number | undefined;
  MinInstanceCount?: number | undefined;
  InstanceGroupName: string | undefined;
  InstanceType: ClusterInstanceType | undefined;
  LifeCycleConfig: ClusterLifeCycleConfig | undefined;
  ExecutionRole: string | undefined;
  ThreadsPerCore?: number | undefined;
  InstanceStorageConfigs?: ClusterInstanceStorageConfig[] | undefined;
  OnStartDeepHealthChecks?: DeepHealthCheckType[] | undefined;
  TrainingPlanArn?: string | undefined;
  OverrideVpcConfig?: VpcConfig | undefined;
  ScheduledUpdateConfig?: ScheduledUpdateConfig | undefined;
  ImageId?: string | undefined;
  KubernetesConfig?: ClusterKubernetesConfig | undefined;
  SlurmConfig?: ClusterSlurmConfig | undefined;
  CapacityRequirements?: ClusterCapacityRequirements | undefined;
}
export interface ClusterInstancePlacement {
  AvailabilityZone?: string | undefined;
  AvailabilityZoneId?: string | undefined;
}
export interface ClusterInstanceStatusDetails {
  Status: ClusterInstanceStatus | undefined;
  Message?: string | undefined;
}
export interface ClusterKubernetesConfigNodeDetails {
  CurrentLabels?: Record<string, string> | undefined;
  DesiredLabels?: Record<string, string> | undefined;
  CurrentTaints?: ClusterKubernetesTaint[] | undefined;
  DesiredTaints?: ClusterKubernetesTaint[] | undefined;
}
export interface UltraServerInfo {
  Id?: string | undefined;
  Type?: string | undefined;
}
export interface ClusterNodeDetails {
  InstanceGroupName?: string | undefined;
  InstanceId?: string | undefined;
  NodeLogicalId?: string | undefined;
  InstanceStatus?: ClusterInstanceStatusDetails | undefined;
  InstanceType?: ClusterInstanceType | undefined;
  LaunchTime?: Date | undefined;
  LastSoftwareUpdateTime?: Date | undefined;
  LifeCycleConfig?: ClusterLifeCycleConfig | undefined;
  OverrideVpcConfig?: VpcConfig | undefined;
  ThreadsPerCore?: number | undefined;
  InstanceStorageConfigs?: ClusterInstanceStorageConfig[] | undefined;
  PrivatePrimaryIp?: string | undefined;
  PrivatePrimaryIpv6?: string | undefined;
  PrivateDnsHostname?: string | undefined;
  Placement?: ClusterInstancePlacement | undefined;
  CurrentImageId?: string | undefined;
  DesiredImageId?: string | undefined;
  UltraServerInfo?: UltraServerInfo | undefined;
  KubernetesConfig?: ClusterKubernetesConfigNodeDetails | undefined;
  CapacityType?: ClusterCapacityType | undefined;
}
export interface ClusterNodeSummary {
  InstanceGroupName: string | undefined;
  InstanceId: string | undefined;
  NodeLogicalId?: string | undefined;
  InstanceType: ClusterInstanceType | undefined;
  LaunchTime: Date | undefined;
  LastSoftwareUpdateTime?: Date | undefined;
  InstanceStatus: ClusterInstanceStatusDetails | undefined;
  UltraServerInfo?: UltraServerInfo | undefined;
  PrivateDnsHostname?: string | undefined;
}
export interface ClusterOrchestratorEksConfig {
  ClusterArn: string | undefined;
}
export interface ClusterOrchestratorSlurmConfig {
  SlurmConfigStrategy?: ClusterSlurmConfigStrategy | undefined;
}
export interface ClusterOrchestrator {
  Eks?: ClusterOrchestratorEksConfig | undefined;
  Slurm?: ClusterOrchestratorSlurmConfig | undefined;
}
export interface FSxLustreConfig {
  SizeInGiB: number | undefined;
  PerUnitStorageThroughput: number | undefined;
}
export interface EnvironmentConfigDetails {
  FSxLustreConfig?: FSxLustreConfig | undefined;
  S3OutputPath?: string | undefined;
}
export interface ClusterRestrictedInstanceGroupDetails {
  CurrentCount?: number | undefined;
  TargetCount?: number | undefined;
  InstanceGroupName?: string | undefined;
  InstanceType?: ClusterInstanceType | undefined;
  ExecutionRole?: string | undefined;
  ThreadsPerCore?: number | undefined;
  InstanceStorageConfigs?: ClusterInstanceStorageConfig[] | undefined;
  OnStartDeepHealthChecks?: DeepHealthCheckType[] | undefined;
  Status?: InstanceGroupStatus | undefined;
  TrainingPlanArn?: string | undefined;
  TrainingPlanStatus?: string | undefined;
  OverrideVpcConfig?: VpcConfig | undefined;
  ScheduledUpdateConfig?: ScheduledUpdateConfig | undefined;
  EnvironmentConfig?: EnvironmentConfigDetails | undefined;
}
export interface EnvironmentConfig {
  FSxLustreConfig?: FSxLustreConfig | undefined;
}
export interface ClusterRestrictedInstanceGroupSpecification {
  InstanceCount: number | undefined;
  InstanceGroupName: string | undefined;
  InstanceType: ClusterInstanceType | undefined;
  ExecutionRole: string | undefined;
  ThreadsPerCore?: number | undefined;
  InstanceStorageConfigs?: ClusterInstanceStorageConfig[] | undefined;
  OnStartDeepHealthChecks?: DeepHealthCheckType[] | undefined;
  TrainingPlanArn?: string | undefined;
  OverrideVpcConfig?: VpcConfig | undefined;
  ScheduledUpdateConfig?: ScheduledUpdateConfig | undefined;
  EnvironmentConfig: EnvironmentConfig | undefined;
}
export interface ClusterSchedulerConfigSummary {
  ClusterSchedulerConfigArn: string | undefined;
  ClusterSchedulerConfigId: string | undefined;
  ClusterSchedulerConfigVersion?: number | undefined;
  Name: string | undefined;
  CreationTime: Date | undefined;
  LastModifiedTime?: Date | undefined;
  Status: SchedulerResourceStatus | undefined;
  ClusterArn?: string | undefined;
}
export interface ClusterSummary {
  ClusterArn: string | undefined;
  ClusterName: string | undefined;
  CreationTime: Date | undefined;
  ClusterStatus: ClusterStatus | undefined;
  TrainingPlanArns?: string[] | undefined;
}
export interface ClusterTieredStorageConfig {
  Mode: ClusterConfigMode | undefined;
  InstanceMemoryAllocationPercentage?: number | undefined;
}
export interface CustomImage {
  ImageName: string | undefined;
  ImageVersionNumber?: number | undefined;
  AppImageConfigName: string | undefined;
}
export interface CodeEditorAppSettings {
  DefaultResourceSpec?: ResourceSpec | undefined;
  CustomImages?: CustomImage[] | undefined;
  LifecycleConfigArns?: string[] | undefined;
  AppLifecycleManagement?: AppLifecycleManagement | undefined;
  BuiltInLifecycleConfigArn?: string | undefined;
}
export interface CodeRepository {
  RepositoryUrl: string | undefined;
}
export interface GitConfig {
  RepositoryUrl: string | undefined;
  Branch?: string | undefined;
  SecretArn?: string | undefined;
}
export interface CodeRepositorySummary {
  CodeRepositoryName: string | undefined;
  CodeRepositoryArn: string | undefined;
  CreationTime: Date | undefined;
  LastModifiedTime: Date | undefined;
  GitConfig?: GitConfig | undefined;
}
export interface CognitoConfig {
  UserPool: string | undefined;
  ClientId: string | undefined;
}
export interface CognitoMemberDefinition {
  UserPool: string | undefined;
  UserGroup: string | undefined;
  ClientId: string | undefined;
}
export interface VectorConfig {
  Dimension: number | undefined;
}
export type CollectionConfig =
  | CollectionConfig.VectorConfigMember
  | CollectionConfig.$UnknownMember;
export declare namespace CollectionConfig {
  interface VectorConfigMember {
    VectorConfig: VectorConfig;
    $unknown?: never;
  }
  interface $UnknownMember {
    VectorConfig?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    VectorConfig: (value: VectorConfig) => T;
    _: (name: string, value: any) => T;
  }
}
export interface CollectionConfiguration {
  CollectionName?: string | undefined;
  CollectionParameters?: Record<string, string> | undefined;
}
export interface CompilationJobSummary {
  CompilationJobName: string | undefined;
  CompilationJobArn: string | undefined;
  CreationTime: Date | undefined;
  CompilationStartTime?: Date | undefined;
  CompilationEndTime?: Date | undefined;
  CompilationTargetDevice?: TargetDevice | undefined;
  CompilationTargetPlatformOs?: TargetPlatformOs | undefined;
  CompilationTargetPlatformArch?: TargetPlatformArch | undefined;
  CompilationTargetPlatformAccelerator?: TargetPlatformAccelerator | undefined;
  LastModifiedTime?: Date | undefined;
  CompilationJobStatus: CompilationJobStatus | undefined;
}
export interface ResourceSharingConfig {
  Strategy: ResourceSharingStrategy | undefined;
  BorrowLimit?: number | undefined;
  AbsoluteBorrowLimits?: ComputeQuotaResourceConfig[] | undefined;
}
export interface ComputeQuotaConfig {
  ComputeQuotaResources?: ComputeQuotaResourceConfig[] | undefined;
  ResourceSharingConfig?: ResourceSharingConfig | undefined;
  PreemptTeamTasks?: PreemptTeamTasks | undefined;
}
export interface ComputeQuotaTarget {
  TeamName: string | undefined;
  FairShareWeight?: number | undefined;
}
export interface ComputeQuotaSummary {
  ComputeQuotaArn: string | undefined;
  ComputeQuotaId: string | undefined;
  Name: string | undefined;
  ComputeQuotaVersion?: number | undefined;
  Status: SchedulerResourceStatus | undefined;
  ClusterArn?: string | undefined;
  ComputeQuotaConfig?: ComputeQuotaConfig | undefined;
  ComputeQuotaTarget: ComputeQuotaTarget | undefined;
  ActivationState?: ActivationState | undefined;
  CreationTime: Date | undefined;
  LastModifiedTime?: Date | undefined;
}
export interface ConditionStepMetadata {
  Outcome?: ConditionOutcome | undefined;
}
export interface RepositoryAuthConfig {
  RepositoryCredentialsProviderArn: string | undefined;
}
export interface ImageConfig {
  RepositoryAccessMode: RepositoryAccessMode | undefined;
  RepositoryAuthConfig?: RepositoryAuthConfig | undefined;
}
export interface MultiModelConfig {
  ModelCacheSetting?: ModelCacheSetting | undefined;
}
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
export interface HyperParameterSpecification {
  Name: string | undefined;
  Description?: string | undefined;
  Type: ParameterType | undefined;
  Range?: ParameterRange | undefined;
  IsTunable?: boolean | undefined;
  IsRequired?: boolean | undefined;
  DefaultValue?: string | undefined;
}
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
  InstanceGroups?: ClusterInstanceGroupSpecification[] | undefined;
  RestrictedInstanceGroups?:
    | ClusterRestrictedInstanceGroupSpecification[]
    | undefined;
  VpcConfig?: VpcConfig | undefined;
  Tags?: Tag[] | undefined;
  Orchestrator?: ClusterOrchestrator | undefined;
  NodeRecovery?: ClusterNodeRecovery | undefined;
  TieredStorageConfig?: ClusterTieredStorageConfig | undefined;
  NodeProvisioningMode?: ClusterNodeProvisioningMode | undefined;
  ClusterRole?: string | undefined;
  AutoScaling?: ClusterAutoScalingConfig | undefined;
}
export interface CreateClusterResponse {
  ClusterArn: string | undefined;
}
export interface PriorityClass {
  Name: string | undefined;
  Weight: number | undefined;
}
export interface SchedulerConfig {
  PriorityClasses?: PriorityClass[] | undefined;
  FairShare?: FairShare | undefined;
  IdleResourceSharing?: IdleResourceSharing | undefined;
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
