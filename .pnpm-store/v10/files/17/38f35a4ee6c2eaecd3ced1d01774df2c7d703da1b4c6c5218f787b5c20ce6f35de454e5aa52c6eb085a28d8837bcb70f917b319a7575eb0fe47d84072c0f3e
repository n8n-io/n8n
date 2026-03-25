import {
  ActionSummary,
  AdditionalInferenceSpecificationDefinition,
  AgentVersion,
  AlgorithmSortBy,
  AlgorithmSpecification,
  AlgorithmSummary,
  AmazonQSettings,
  AppDetails,
  AppImageConfigDetails,
  AppImageConfigSortKey,
  AppSortKey,
  AppSpecification,
  ArtifactSummary,
  AssociationEdgeType,
  AssociationSummary,
  AutoMLCandidate,
  AutoMLJobStatus,
  AutoMLJobSummary,
  AutoMLSortBy,
  AutoMLSortOrder,
  AutoRollbackConfig,
  Autotune,
  BatchDataCaptureConfig,
  BatchStrategy,
  CandidateSortBy,
  CandidateStatus,
  Channel,
  CheckpointConfig,
  ClusterNodeSummary,
  ClusterSchedulerConfigSummary,
  ClusterSortBy,
  ClusterSummary,
  CodeRepositorySortBy,
  CodeRepositorySortOrder,
  CodeRepositorySummary,
  CognitoConfig,
  CompilationJobStatus,
  CompilationJobSummary,
  InferenceSpecification,
  ModelApprovalStatus,
  ModelPackageStatus,
  ObjectiveStatus,
  OutputDataConfig,
  OutputParameter,
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
  ContainerDefinition,
  DockerSettings,
  DriftCheckBaselines,
  EdgeOutputConfig,
  EndpointInfo,
  ExecutionRoleIdentityConfig,
  FeatureDefinition,
  FeatureType,
  HubS3StorageConfig,
  HumanTaskConfig,
  HyperParameterTrainingJobDefinition,
  HyperParameterTuningJobConfig,
  HyperParameterTuningJobObjectiveType,
  HyperParameterTuningJobStrategyType,
  HyperParameterTuningJobWarmStartConfig,
  InferenceComponentComputeResourceRequirements,
  InferenceComponentStartupParameters,
  InferenceExecutionConfig,
  InferenceExperimentDataStorageConfig,
  InferenceExperimentSchedule,
  InferenceExperimentType,
  JobType,
  LabelingJobAlgorithmsConfig,
  LabelingJobInputConfig,
  LabelingJobOutputConfig,
  LabelingJobStoppingConditions,
  MetadataProperties,
  ModelBiasAppSpecification,
  ModelBiasBaselineConfig,
  ModelBiasJobInput,
  ModelCardExportOutputConfig,
  ModelCardSecurityConfig,
  ModelCardStatus,
  ModelExplainabilityAppSpecification,
  ModelExplainabilityBaselineConfig,
  ModelExplainabilityJobInput,
  ModelInfrastructureConfig,
  ModelLifeCycle,
  ModelMetrics,
  ModelPackageModelCard,
  ModelPackageSecurityConfig,
  ModelPackageValidationSpecification,
  ModelQualityAppSpecification,
  ModelQualityBaselineConfig,
  ModelQualityJobInput,
  MonitoringNetworkConfig,
  MonitoringOutputConfig,
  MonitoringResources,
  MonitoringStoppingCondition,
  OfflineStoreConfig,
  OnlineStoreConfig,
  Processor,
  ProductionVariantServerlessConfig,
  RecommendationJobInputConfig,
  RecommendationJobStoppingConditions,
  RecommendationJobType,
  ResourceLimits,
  RetryStrategy,
  ShadowModeConfig,
  SkipModelValidation,
  SourceAlgorithmSpecification,
  TrackingServerSize,
  UnifiedStudioSettings,
  UserSettings,
  VendorGuidance,
} from "./models_1";
import {
  CustomizedMetricSpecification,
  DataCaptureConfigSummary,
  DataProcessing,
  DebugHookConfig,
  DebugRuleConfiguration,
  DebugRuleEvaluationStatus,
  DeployedImage,
  DeploymentRecommendation,
  DirectInternetAccess,
  DomainStatus,
  EdgePackagingJobStatus,
  EndpointStatus,
  ExperimentConfig,
  ExperimentSource,
  FeatureGroupStatus,
  FeatureParameter,
  FlowDefinitionStatus,
  HubContentType,
  HubStatus,
  InfraCheckConfig,
  InstanceMetadataServiceConfiguration,
  LastUpdateStatus,
  MemberDefinition,
  ModelArtifacts,
  ModelClientConfig,
  MonitoringScheduleConfig,
  MonitoringType,
  NetworkConfig,
  NotebookInstanceAcceleratorType,
  NotebookInstanceLifecycleHook,
  NotificationConfiguration,
  OfflineStoreStatus,
  OptimizationConfig,
  OptimizationJobDeploymentInstanceType,
  OptimizationJobModelSource,
  OptimizationJobOutputConfig,
  OptimizationVpcConfig,
  OwnershipSettings,
  ParallelismConfiguration,
  PartnerAppAuthType,
  PartnerAppConfig,
  PartnerAppMaintenanceConfig,
  PartnerAppType,
  ProcessingInput,
  ProcessingOutputConfig,
  ProcessingResources,
  ProcessingStoppingCondition,
  ProductionVariantSummary,
  ProfilerConfig,
  ProfilerRuleConfiguration,
  RemoteDebugConfig,
  RootAccess,
  RuleEvaluationStatus,
  ServiceCatalogProvisioningDetails,
  SourceIpConfig,
  SpaceSettings,
  SpaceSharingSettings,
  StudioLifecycleConfigAppType,
  TensorBoardOutputConfig,
  TrialComponentArtifact,
  TrialComponentParameterValue,
  TrialComponentStatus,
  WorkerAccessConfiguration,
} from "./models_2";
export interface DescribeHubResponse {
  HubName: string | undefined;
  HubArn: string | undefined;
  HubDisplayName?: string | undefined;
  HubDescription?: string | undefined;
  HubSearchKeywords?: string[] | undefined;
  S3StorageConfig?: HubS3StorageConfig | undefined;
  HubStatus: HubStatus | undefined;
  FailureReason?: string | undefined;
  CreationTime: Date | undefined;
  LastModifiedTime: Date | undefined;
}
export interface DescribeHubContentRequest {
  HubName: string | undefined;
  HubContentType: HubContentType | undefined;
  HubContentName: string | undefined;
  HubContentVersion?: string | undefined;
}
export interface HubContentDependency {
  DependencyOriginPath?: string | undefined;
  DependencyCopyPath?: string | undefined;
}
export declare const HubContentStatus: {
  readonly AVAILABLE: "Available";
  readonly DELETE_FAILED: "DeleteFailed";
  readonly DELETING: "Deleting";
  readonly IMPORTING: "Importing";
  readonly IMPORT_FAILED: "ImportFailed";
};
export type HubContentStatus =
  (typeof HubContentStatus)[keyof typeof HubContentStatus];
export declare const HubContentSupportStatus: {
  readonly DEPRECATED: "Deprecated";
  readonly RESTRICTED: "Restricted";
  readonly SUPPORTED: "Supported";
};
export type HubContentSupportStatus =
  (typeof HubContentSupportStatus)[keyof typeof HubContentSupportStatus];
export interface DescribeHubContentResponse {
  HubContentName: string | undefined;
  HubContentArn: string | undefined;
  HubContentVersion: string | undefined;
  HubContentType: HubContentType | undefined;
  DocumentSchemaVersion: string | undefined;
  HubName: string | undefined;
  HubArn: string | undefined;
  HubContentDisplayName?: string | undefined;
  HubContentDescription?: string | undefined;
  HubContentMarkdown?: string | undefined;
  HubContentDocument: string | undefined;
  SageMakerPublicHubContentArn?: string | undefined;
  ReferenceMinVersion?: string | undefined;
  SupportStatus?: HubContentSupportStatus | undefined;
  HubContentSearchKeywords?: string[] | undefined;
  HubContentDependencies?: HubContentDependency[] | undefined;
  HubContentStatus: HubContentStatus | undefined;
  FailureReason?: string | undefined;
  CreationTime: Date | undefined;
  LastModifiedTime?: Date | undefined;
}
export interface DescribeHumanTaskUiRequest {
  HumanTaskUiName: string | undefined;
}
export declare const HumanTaskUiStatus: {
  readonly ACTIVE: "Active";
  readonly DELETING: "Deleting";
};
export type HumanTaskUiStatus =
  (typeof HumanTaskUiStatus)[keyof typeof HumanTaskUiStatus];
export interface UiTemplateInfo {
  Url?: string | undefined;
  ContentSha256?: string | undefined;
}
export interface DescribeHumanTaskUiResponse {
  HumanTaskUiArn: string | undefined;
  HumanTaskUiName: string | undefined;
  HumanTaskUiStatus?: HumanTaskUiStatus | undefined;
  CreationTime: Date | undefined;
  UiTemplate: UiTemplateInfo | undefined;
}
export interface DescribeHyperParameterTuningJobRequest {
  HyperParameterTuningJobName: string | undefined;
}
export interface FinalHyperParameterTuningJobObjectiveMetric {
  Type?: HyperParameterTuningJobObjectiveType | undefined;
  MetricName: string | undefined;
  Value: number | undefined;
}
export declare const TrainingJobStatus: {
  readonly COMPLETED: "Completed";
  readonly FAILED: "Failed";
  readonly IN_PROGRESS: "InProgress";
  readonly STOPPED: "Stopped";
  readonly STOPPING: "Stopping";
};
export type TrainingJobStatus =
  (typeof TrainingJobStatus)[keyof typeof TrainingJobStatus];
export interface HyperParameterTrainingJobSummary {
  TrainingJobDefinitionName?: string | undefined;
  TrainingJobName: string | undefined;
  TrainingJobArn: string | undefined;
  TuningJobName?: string | undefined;
  CreationTime: Date | undefined;
  TrainingStartTime?: Date | undefined;
  TrainingEndTime?: Date | undefined;
  TrainingJobStatus: TrainingJobStatus | undefined;
  TunedHyperParameters: Record<string, string> | undefined;
  FailureReason?: string | undefined;
  FinalHyperParameterTuningJobObjectiveMetric?:
    | FinalHyperParameterTuningJobObjectiveMetric
    | undefined;
  ObjectiveStatus?: ObjectiveStatus | undefined;
}
export interface HyperParameterTuningJobConsumedResources {
  RuntimeInSeconds?: number | undefined;
}
export declare const HyperParameterTuningJobStatus: {
  readonly COMPLETED: "Completed";
  readonly DELETE_FAILED: "DeleteFailed";
  readonly DELETING: "Deleting";
  readonly FAILED: "Failed";
  readonly IN_PROGRESS: "InProgress";
  readonly STOPPED: "Stopped";
  readonly STOPPING: "Stopping";
};
export type HyperParameterTuningJobStatus =
  (typeof HyperParameterTuningJobStatus)[keyof typeof HyperParameterTuningJobStatus];
export interface ObjectiveStatusCounters {
  Succeeded?: number | undefined;
  Pending?: number | undefined;
  Failed?: number | undefined;
}
export interface TrainingJobStatusCounters {
  Completed?: number | undefined;
  InProgress?: number | undefined;
  RetryableError?: number | undefined;
  NonRetryableError?: number | undefined;
  Stopped?: number | undefined;
}
export interface HyperParameterTuningJobCompletionDetails {
  NumberOfTrainingJobsObjectiveNotImproving?: number | undefined;
  ConvergenceDetectedTime?: Date | undefined;
}
export interface DescribeHyperParameterTuningJobResponse {
  HyperParameterTuningJobName: string | undefined;
  HyperParameterTuningJobArn: string | undefined;
  HyperParameterTuningJobConfig: HyperParameterTuningJobConfig | undefined;
  TrainingJobDefinition?: HyperParameterTrainingJobDefinition | undefined;
  TrainingJobDefinitions?: HyperParameterTrainingJobDefinition[] | undefined;
  HyperParameterTuningJobStatus: HyperParameterTuningJobStatus | undefined;
  CreationTime: Date | undefined;
  HyperParameterTuningEndTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  TrainingJobStatusCounters: TrainingJobStatusCounters | undefined;
  ObjectiveStatusCounters: ObjectiveStatusCounters | undefined;
  BestTrainingJob?: HyperParameterTrainingJobSummary | undefined;
  OverallBestTrainingJob?: HyperParameterTrainingJobSummary | undefined;
  WarmStartConfig?: HyperParameterTuningJobWarmStartConfig | undefined;
  Autotune?: Autotune | undefined;
  FailureReason?: string | undefined;
  TuningJobCompletionDetails?:
    | HyperParameterTuningJobCompletionDetails
    | undefined;
  ConsumedResources?: HyperParameterTuningJobConsumedResources | undefined;
}
export interface DescribeImageRequest {
  ImageName: string | undefined;
}
export declare const ImageStatus: {
  readonly CREATED: "CREATED";
  readonly CREATE_FAILED: "CREATE_FAILED";
  readonly CREATING: "CREATING";
  readonly DELETE_FAILED: "DELETE_FAILED";
  readonly DELETING: "DELETING";
  readonly UPDATE_FAILED: "UPDATE_FAILED";
  readonly UPDATING: "UPDATING";
};
export type ImageStatus = (typeof ImageStatus)[keyof typeof ImageStatus];
export interface DescribeImageResponse {
  CreationTime?: Date | undefined;
  Description?: string | undefined;
  DisplayName?: string | undefined;
  FailureReason?: string | undefined;
  ImageArn?: string | undefined;
  ImageName?: string | undefined;
  ImageStatus?: ImageStatus | undefined;
  LastModifiedTime?: Date | undefined;
  RoleArn?: string | undefined;
}
export interface DescribeImageVersionRequest {
  ImageName: string | undefined;
  Version?: number | undefined;
  Alias?: string | undefined;
}
export declare const ImageVersionStatus: {
  readonly CREATED: "CREATED";
  readonly CREATE_FAILED: "CREATE_FAILED";
  readonly CREATING: "CREATING";
  readonly DELETE_FAILED: "DELETE_FAILED";
  readonly DELETING: "DELETING";
};
export type ImageVersionStatus =
  (typeof ImageVersionStatus)[keyof typeof ImageVersionStatus];
export interface DescribeImageVersionResponse {
  BaseImage?: string | undefined;
  ContainerImage?: string | undefined;
  CreationTime?: Date | undefined;
  FailureReason?: string | undefined;
  ImageArn?: string | undefined;
  ImageVersionArn?: string | undefined;
  ImageVersionStatus?: ImageVersionStatus | undefined;
  LastModifiedTime?: Date | undefined;
  Version?: number | undefined;
  VendorGuidance?: VendorGuidance | undefined;
  JobType?: JobType | undefined;
  MLFramework?: string | undefined;
  ProgrammingLang?: string | undefined;
  Processor?: Processor | undefined;
  Horovod?: boolean | undefined;
  ReleaseNotes?: string | undefined;
}
export interface DescribeInferenceComponentInput {
  InferenceComponentName: string | undefined;
}
export declare const InferenceComponentStatus: {
  readonly CREATING: "Creating";
  readonly DELETING: "Deleting";
  readonly FAILED: "Failed";
  readonly IN_SERVICE: "InService";
  readonly UPDATING: "Updating";
};
export type InferenceComponentStatus =
  (typeof InferenceComponentStatus)[keyof typeof InferenceComponentStatus];
export declare const InferenceComponentCapacitySizeType: {
  readonly CAPACITY_PERCENT: "CAPACITY_PERCENT";
  readonly COPY_COUNT: "COPY_COUNT";
};
export type InferenceComponentCapacitySizeType =
  (typeof InferenceComponentCapacitySizeType)[keyof typeof InferenceComponentCapacitySizeType];
export interface InferenceComponentCapacitySize {
  Type: InferenceComponentCapacitySizeType | undefined;
  Value: number | undefined;
}
export interface InferenceComponentRollingUpdatePolicy {
  MaximumBatchSize: InferenceComponentCapacitySize | undefined;
  WaitIntervalInSeconds: number | undefined;
  MaximumExecutionTimeoutInSeconds?: number | undefined;
  RollbackMaximumBatchSize?: InferenceComponentCapacitySize | undefined;
}
export interface InferenceComponentDeploymentConfig {
  RollingUpdatePolicy: InferenceComponentRollingUpdatePolicy | undefined;
  AutoRollbackConfiguration?: AutoRollbackConfig | undefined;
}
export interface InferenceComponentRuntimeConfigSummary {
  DesiredCopyCount?: number | undefined;
  CurrentCopyCount?: number | undefined;
}
export interface InferenceComponentContainerSpecificationSummary {
  DeployedImage?: DeployedImage | undefined;
  ArtifactUrl?: string | undefined;
  Environment?: Record<string, string> | undefined;
}
export interface InferenceComponentSpecificationSummary {
  ModelName?: string | undefined;
  Container?: InferenceComponentContainerSpecificationSummary | undefined;
  StartupParameters?: InferenceComponentStartupParameters | undefined;
  ComputeResourceRequirements?:
    | InferenceComponentComputeResourceRequirements
    | undefined;
  BaseInferenceComponentName?: string | undefined;
}
export interface DescribeInferenceComponentOutput {
  InferenceComponentName: string | undefined;
  InferenceComponentArn: string | undefined;
  EndpointName: string | undefined;
  EndpointArn: string | undefined;
  VariantName?: string | undefined;
  FailureReason?: string | undefined;
  Specification?: InferenceComponentSpecificationSummary | undefined;
  RuntimeConfig?: InferenceComponentRuntimeConfigSummary | undefined;
  CreationTime: Date | undefined;
  LastModifiedTime: Date | undefined;
  InferenceComponentStatus?: InferenceComponentStatus | undefined;
  LastDeploymentConfig?: InferenceComponentDeploymentConfig | undefined;
}
export interface DescribeInferenceExperimentRequest {
  Name: string | undefined;
}
export interface EndpointMetadata {
  EndpointName: string | undefined;
  EndpointConfigName?: string | undefined;
  EndpointStatus?: EndpointStatus | undefined;
  FailureReason?: string | undefined;
}
export declare const ModelVariantStatus: {
  readonly CREATING: "Creating";
  readonly DELETED: "Deleted";
  readonly DELETING: "Deleting";
  readonly IN_SERVICE: "InService";
  readonly UPDATING: "Updating";
};
export type ModelVariantStatus =
  (typeof ModelVariantStatus)[keyof typeof ModelVariantStatus];
export interface ModelVariantConfigSummary {
  ModelName: string | undefined;
  VariantName: string | undefined;
  InfrastructureConfig: ModelInfrastructureConfig | undefined;
  Status: ModelVariantStatus | undefined;
}
export declare const InferenceExperimentStatus: {
  readonly CANCELLED: "Cancelled";
  readonly COMPLETED: "Completed";
  readonly CREATED: "Created";
  readonly CREATING: "Creating";
  readonly RUNNING: "Running";
  readonly STARTING: "Starting";
  readonly STOPPING: "Stopping";
  readonly UPDATING: "Updating";
};
export type InferenceExperimentStatus =
  (typeof InferenceExperimentStatus)[keyof typeof InferenceExperimentStatus];
export interface DescribeInferenceExperimentResponse {
  Arn: string | undefined;
  Name: string | undefined;
  Type: InferenceExperimentType | undefined;
  Schedule?: InferenceExperimentSchedule | undefined;
  Status: InferenceExperimentStatus | undefined;
  StatusReason?: string | undefined;
  Description?: string | undefined;
  CreationTime?: Date | undefined;
  CompletionTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  RoleArn?: string | undefined;
  EndpointMetadata: EndpointMetadata | undefined;
  ModelVariants: ModelVariantConfigSummary[] | undefined;
  DataStorageConfig?: InferenceExperimentDataStorageConfig | undefined;
  ShadowModeConfig?: ShadowModeConfig | undefined;
  KmsKey?: string | undefined;
}
export interface DescribeInferenceRecommendationsJobRequest {
  JobName: string | undefined;
}
export interface InferenceMetrics {
  MaxInvocations: number | undefined;
  ModelLatency: number | undefined;
}
export interface EndpointPerformance {
  Metrics: InferenceMetrics | undefined;
  EndpointInfo: EndpointInfo | undefined;
}
export interface EndpointOutputConfiguration {
  EndpointName: string | undefined;
  VariantName: string | undefined;
  InstanceType?: ProductionVariantInstanceType | undefined;
  InitialInstanceCount?: number | undefined;
  ServerlessConfig?: ProductionVariantServerlessConfig | undefined;
}
export interface RecommendationMetrics {
  CostPerHour?: number | undefined;
  CostPerInference?: number | undefined;
  MaxInvocations?: number | undefined;
  ModelLatency?: number | undefined;
  CpuUtilization?: number | undefined;
  MemoryUtilization?: number | undefined;
  ModelSetupTime?: number | undefined;
}
export interface EnvironmentParameter {
  Key: string | undefined;
  ValueType: string | undefined;
  Value: string | undefined;
}
export interface ModelConfiguration {
  InferenceSpecificationName?: string | undefined;
  EnvironmentParameters?: EnvironmentParameter[] | undefined;
  CompilationJobName?: string | undefined;
}
export interface InferenceRecommendation {
  RecommendationId?: string | undefined;
  Metrics?: RecommendationMetrics | undefined;
  EndpointConfiguration: EndpointOutputConfiguration | undefined;
  ModelConfiguration: ModelConfiguration | undefined;
  InvocationEndTime?: Date | undefined;
  InvocationStartTime?: Date | undefined;
}
export declare const RecommendationJobStatus: {
  readonly COMPLETED: "COMPLETED";
  readonly DELETED: "DELETED";
  readonly DELETING: "DELETING";
  readonly FAILED: "FAILED";
  readonly IN_PROGRESS: "IN_PROGRESS";
  readonly PENDING: "PENDING";
  readonly STOPPED: "STOPPED";
  readonly STOPPING: "STOPPING";
};
export type RecommendationJobStatus =
  (typeof RecommendationJobStatus)[keyof typeof RecommendationJobStatus];
export interface DescribeInferenceRecommendationsJobResponse {
  JobName: string | undefined;
  JobDescription?: string | undefined;
  JobType: RecommendationJobType | undefined;
  JobArn: string | undefined;
  RoleArn: string | undefined;
  Status: RecommendationJobStatus | undefined;
  CreationTime: Date | undefined;
  CompletionTime?: Date | undefined;
  LastModifiedTime: Date | undefined;
  FailureReason?: string | undefined;
  InputConfig: RecommendationJobInputConfig | undefined;
  StoppingConditions?: RecommendationJobStoppingConditions | undefined;
  InferenceRecommendations?: InferenceRecommendation[] | undefined;
  EndpointPerformances?: EndpointPerformance[] | undefined;
}
export interface DescribeLabelingJobRequest {
  LabelingJobName: string | undefined;
}
export interface LabelCounters {
  TotalLabeled?: number | undefined;
  HumanLabeled?: number | undefined;
  MachineLabeled?: number | undefined;
  FailedNonRetryableError?: number | undefined;
  Unlabeled?: number | undefined;
}
export interface LabelingJobOutput {
  OutputDatasetS3Uri: string | undefined;
  FinalActiveLearningModelArn?: string | undefined;
}
export declare const LabelingJobStatus: {
  readonly COMPLETED: "Completed";
  readonly FAILED: "Failed";
  readonly INITIALIZING: "Initializing";
  readonly IN_PROGRESS: "InProgress";
  readonly STOPPED: "Stopped";
  readonly STOPPING: "Stopping";
};
export type LabelingJobStatus =
  (typeof LabelingJobStatus)[keyof typeof LabelingJobStatus];
export interface DescribeLabelingJobResponse {
  LabelingJobStatus: LabelingJobStatus | undefined;
  LabelCounters: LabelCounters | undefined;
  FailureReason?: string | undefined;
  CreationTime: Date | undefined;
  LastModifiedTime: Date | undefined;
  JobReferenceCode: string | undefined;
  LabelingJobName: string | undefined;
  LabelingJobArn: string | undefined;
  LabelAttributeName?: string | undefined;
  InputConfig: LabelingJobInputConfig | undefined;
  OutputConfig: LabelingJobOutputConfig | undefined;
  RoleArn: string | undefined;
  LabelCategoryConfigS3Uri?: string | undefined;
  StoppingConditions?: LabelingJobStoppingConditions | undefined;
  LabelingJobAlgorithmsConfig?: LabelingJobAlgorithmsConfig | undefined;
  HumanTaskConfig: HumanTaskConfig | undefined;
  Tags?: Tag[] | undefined;
  LabelingJobOutput?: LabelingJobOutput | undefined;
}
export interface DescribeLineageGroupRequest {
  LineageGroupName: string | undefined;
}
export interface DescribeLineageGroupResponse {
  LineageGroupName?: string | undefined;
  LineageGroupArn?: string | undefined;
  DisplayName?: string | undefined;
  Description?: string | undefined;
  CreationTime?: Date | undefined;
  CreatedBy?: UserContext | undefined;
  LastModifiedTime?: Date | undefined;
  LastModifiedBy?: UserContext | undefined;
}
export interface DescribeMlflowTrackingServerRequest {
  TrackingServerName: string | undefined;
}
export declare const IsTrackingServerActive: {
  readonly ACTIVE: "Active";
  readonly INACTIVE: "Inactive";
};
export type IsTrackingServerActive =
  (typeof IsTrackingServerActive)[keyof typeof IsTrackingServerActive];
export declare const TrackingServerStatus: {
  readonly CREATED: "Created";
  readonly CREATE_FAILED: "CreateFailed";
  readonly CREATING: "Creating";
  readonly DELETE_FAILED: "DeleteFailed";
  readonly DELETING: "Deleting";
  readonly MAINTENANCE_COMPLETE: "MaintenanceComplete";
  readonly MAINTENANCE_FAILED: "MaintenanceFailed";
  readonly MAINTENANCE_IN_PROGRESS: "MaintenanceInProgress";
  readonly STARTED: "Started";
  readonly STARTING: "Starting";
  readonly START_FAILED: "StartFailed";
  readonly STOPPED: "Stopped";
  readonly STOPPING: "Stopping";
  readonly STOP_FAILED: "StopFailed";
  readonly UPDATED: "Updated";
  readonly UPDATE_FAILED: "UpdateFailed";
  readonly UPDATING: "Updating";
};
export type TrackingServerStatus =
  (typeof TrackingServerStatus)[keyof typeof TrackingServerStatus];
export interface DescribeMlflowTrackingServerResponse {
  TrackingServerArn?: string | undefined;
  TrackingServerName?: string | undefined;
  ArtifactStoreUri?: string | undefined;
  TrackingServerSize?: TrackingServerSize | undefined;
  MlflowVersion?: string | undefined;
  RoleArn?: string | undefined;
  TrackingServerStatus?: TrackingServerStatus | undefined;
  IsActive?: IsTrackingServerActive | undefined;
  TrackingServerUrl?: string | undefined;
  WeeklyMaintenanceWindowStart?: string | undefined;
  AutomaticModelRegistration?: boolean | undefined;
  CreationTime?: Date | undefined;
  CreatedBy?: UserContext | undefined;
  LastModifiedTime?: Date | undefined;
  LastModifiedBy?: UserContext | undefined;
}
export interface DescribeModelInput {
  ModelName: string | undefined;
}
export interface DescribeModelOutput {
  ModelName: string | undefined;
  PrimaryContainer?: ContainerDefinition | undefined;
  Containers?: ContainerDefinition[] | undefined;
  InferenceExecutionConfig?: InferenceExecutionConfig | undefined;
  ExecutionRoleArn?: string | undefined;
  VpcConfig?: VpcConfig | undefined;
  CreationTime: Date | undefined;
  ModelArn: string | undefined;
  EnableNetworkIsolation?: boolean | undefined;
  DeploymentRecommendation?: DeploymentRecommendation | undefined;
}
export interface DescribeModelBiasJobDefinitionRequest {
  JobDefinitionName: string | undefined;
}
export interface DescribeModelBiasJobDefinitionResponse {
  JobDefinitionArn: string | undefined;
  JobDefinitionName: string | undefined;
  CreationTime: Date | undefined;
  ModelBiasBaselineConfig?: ModelBiasBaselineConfig | undefined;
  ModelBiasAppSpecification: ModelBiasAppSpecification | undefined;
  ModelBiasJobInput: ModelBiasJobInput | undefined;
  ModelBiasJobOutputConfig: MonitoringOutputConfig | undefined;
  JobResources: MonitoringResources | undefined;
  NetworkConfig?: MonitoringNetworkConfig | undefined;
  RoleArn: string | undefined;
  StoppingCondition?: MonitoringStoppingCondition | undefined;
}
export interface DescribeModelCardRequest {
  ModelCardName: string | undefined;
  ModelCardVersion?: number | undefined;
}
export declare const ModelCardProcessingStatus: {
  readonly CONTENT_DELETED: "ContentDeleted";
  readonly DELETE_COMPLETED: "DeleteCompleted";
  readonly DELETE_FAILED: "DeleteFailed";
  readonly DELETE_INPROGRESS: "DeleteInProgress";
  readonly DELETE_PENDING: "DeletePending";
  readonly EXPORTJOBS_DELETED: "ExportJobsDeleted";
};
export type ModelCardProcessingStatus =
  (typeof ModelCardProcessingStatus)[keyof typeof ModelCardProcessingStatus];
export interface DescribeModelCardResponse {
  ModelCardArn: string | undefined;
  ModelCardName: string | undefined;
  ModelCardVersion: number | undefined;
  Content: string | undefined;
  ModelCardStatus: ModelCardStatus | undefined;
  SecurityConfig?: ModelCardSecurityConfig | undefined;
  CreationTime: Date | undefined;
  CreatedBy: UserContext | undefined;
  LastModifiedTime?: Date | undefined;
  LastModifiedBy?: UserContext | undefined;
  ModelCardProcessingStatus?: ModelCardProcessingStatus | undefined;
}
export interface DescribeModelCardExportJobRequest {
  ModelCardExportJobArn: string | undefined;
}
export interface ModelCardExportArtifacts {
  S3ExportArtifacts: string | undefined;
}
export declare const ModelCardExportJobStatus: {
  readonly COMPLETED: "Completed";
  readonly FAILED: "Failed";
  readonly IN_PROGRESS: "InProgress";
};
export type ModelCardExportJobStatus =
  (typeof ModelCardExportJobStatus)[keyof typeof ModelCardExportJobStatus];
export interface DescribeModelCardExportJobResponse {
  ModelCardExportJobName: string | undefined;
  ModelCardExportJobArn: string | undefined;
  Status: ModelCardExportJobStatus | undefined;
  ModelCardName: string | undefined;
  ModelCardVersion: number | undefined;
  OutputConfig: ModelCardExportOutputConfig | undefined;
  CreatedAt: Date | undefined;
  LastModifiedAt: Date | undefined;
  FailureReason?: string | undefined;
  ExportArtifacts?: ModelCardExportArtifacts | undefined;
}
export interface DescribeModelExplainabilityJobDefinitionRequest {
  JobDefinitionName: string | undefined;
}
export interface DescribeModelExplainabilityJobDefinitionResponse {
  JobDefinitionArn: string | undefined;
  JobDefinitionName: string | undefined;
  CreationTime: Date | undefined;
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
}
export interface DescribeModelPackageInput {
  ModelPackageName: string | undefined;
}
export declare const DetailedModelPackageStatus: {
  readonly COMPLETED: "Completed";
  readonly FAILED: "Failed";
  readonly IN_PROGRESS: "InProgress";
  readonly NOT_STARTED: "NotStarted";
};
export type DetailedModelPackageStatus =
  (typeof DetailedModelPackageStatus)[keyof typeof DetailedModelPackageStatus];
export interface ModelPackageStatusItem {
  Name: string | undefined;
  Status: DetailedModelPackageStatus | undefined;
  FailureReason?: string | undefined;
}
export interface ModelPackageStatusDetails {
  ValidationStatuses: ModelPackageStatusItem[] | undefined;
  ImageScanStatuses?: ModelPackageStatusItem[] | undefined;
}
export interface DescribeModelPackageOutput {
  ModelPackageName: string | undefined;
  ModelPackageGroupName?: string | undefined;
  ModelPackageVersion?: number | undefined;
  ModelPackageArn: string | undefined;
  ModelPackageDescription?: string | undefined;
  CreationTime: Date | undefined;
  InferenceSpecification?: InferenceSpecification | undefined;
  SourceAlgorithmSpecification?: SourceAlgorithmSpecification | undefined;
  ValidationSpecification?: ModelPackageValidationSpecification | undefined;
  ModelPackageStatus: ModelPackageStatus | undefined;
  ModelPackageStatusDetails: ModelPackageStatusDetails | undefined;
  CertifyForMarketplace?: boolean | undefined;
  ModelApprovalStatus?: ModelApprovalStatus | undefined;
  CreatedBy?: UserContext | undefined;
  MetadataProperties?: MetadataProperties | undefined;
  ModelMetrics?: ModelMetrics | undefined;
  LastModifiedTime?: Date | undefined;
  LastModifiedBy?: UserContext | undefined;
  ApprovalDescription?: string | undefined;
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
export interface DescribeModelPackageGroupInput {
  ModelPackageGroupName: string | undefined;
}
export declare const ModelPackageGroupStatus: {
  readonly COMPLETED: "Completed";
  readonly DELETE_FAILED: "DeleteFailed";
  readonly DELETING: "Deleting";
  readonly FAILED: "Failed";
  readonly IN_PROGRESS: "InProgress";
  readonly PENDING: "Pending";
};
export type ModelPackageGroupStatus =
  (typeof ModelPackageGroupStatus)[keyof typeof ModelPackageGroupStatus];
export interface DescribeModelPackageGroupOutput {
  ModelPackageGroupName: string | undefined;
  ModelPackageGroupArn: string | undefined;
  ModelPackageGroupDescription?: string | undefined;
  CreationTime: Date | undefined;
  CreatedBy: UserContext | undefined;
  ModelPackageGroupStatus: ModelPackageGroupStatus | undefined;
}
export interface DescribeModelQualityJobDefinitionRequest {
  JobDefinitionName: string | undefined;
}
export interface DescribeModelQualityJobDefinitionResponse {
  JobDefinitionArn: string | undefined;
  JobDefinitionName: string | undefined;
  CreationTime: Date | undefined;
  ModelQualityBaselineConfig?: ModelQualityBaselineConfig | undefined;
  ModelQualityAppSpecification: ModelQualityAppSpecification | undefined;
  ModelQualityJobInput: ModelQualityJobInput | undefined;
  ModelQualityJobOutputConfig: MonitoringOutputConfig | undefined;
  JobResources: MonitoringResources | undefined;
  NetworkConfig?: MonitoringNetworkConfig | undefined;
  RoleArn: string | undefined;
  StoppingCondition?: MonitoringStoppingCondition | undefined;
}
export interface DescribeMonitoringScheduleRequest {
  MonitoringScheduleName: string | undefined;
}
export declare const ExecutionStatus: {
  readonly COMPLETED: "Completed";
  readonly COMPLETED_WITH_VIOLATIONS: "CompletedWithViolations";
  readonly FAILED: "Failed";
  readonly IN_PROGRESS: "InProgress";
  readonly PENDING: "Pending";
  readonly STOPPED: "Stopped";
  readonly STOPPING: "Stopping";
};
export type ExecutionStatus =
  (typeof ExecutionStatus)[keyof typeof ExecutionStatus];
export interface MonitoringExecutionSummary {
  MonitoringScheduleName: string | undefined;
  ScheduledTime: Date | undefined;
  CreationTime: Date | undefined;
  LastModifiedTime: Date | undefined;
  MonitoringExecutionStatus: ExecutionStatus | undefined;
  ProcessingJobArn?: string | undefined;
  EndpointName?: string | undefined;
  FailureReason?: string | undefined;
  MonitoringJobDefinitionName?: string | undefined;
  MonitoringType?: MonitoringType | undefined;
}
export declare const ScheduleStatus: {
  readonly FAILED: "Failed";
  readonly PENDING: "Pending";
  readonly SCHEDULED: "Scheduled";
  readonly STOPPED: "Stopped";
};
export type ScheduleStatus =
  (typeof ScheduleStatus)[keyof typeof ScheduleStatus];
export interface DescribeMonitoringScheduleResponse {
  MonitoringScheduleArn: string | undefined;
  MonitoringScheduleName: string | undefined;
  MonitoringScheduleStatus: ScheduleStatus | undefined;
  MonitoringType?: MonitoringType | undefined;
  FailureReason?: string | undefined;
  CreationTime: Date | undefined;
  LastModifiedTime: Date | undefined;
  MonitoringScheduleConfig: MonitoringScheduleConfig | undefined;
  EndpointName?: string | undefined;
  LastMonitoringExecutionSummary?: MonitoringExecutionSummary | undefined;
}
export interface DescribeNotebookInstanceInput {
  NotebookInstanceName: string | undefined;
}
export declare const NotebookInstanceStatus: {
  readonly Deleting: "Deleting";
  readonly Failed: "Failed";
  readonly InService: "InService";
  readonly Pending: "Pending";
  readonly Stopped: "Stopped";
  readonly Stopping: "Stopping";
  readonly Updating: "Updating";
};
export type NotebookInstanceStatus =
  (typeof NotebookInstanceStatus)[keyof typeof NotebookInstanceStatus];
export interface DescribeNotebookInstanceOutput {
  NotebookInstanceArn?: string | undefined;
  NotebookInstanceName?: string | undefined;
  NotebookInstanceStatus?: NotebookInstanceStatus | undefined;
  FailureReason?: string | undefined;
  Url?: string | undefined;
  InstanceType?: _InstanceType | undefined;
  SubnetId?: string | undefined;
  SecurityGroups?: string[] | undefined;
  RoleArn?: string | undefined;
  KmsKeyId?: string | undefined;
  NetworkInterfaceId?: string | undefined;
  LastModifiedTime?: Date | undefined;
  CreationTime?: Date | undefined;
  NotebookInstanceLifecycleConfigName?: string | undefined;
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
export interface DescribeNotebookInstanceLifecycleConfigInput {
  NotebookInstanceLifecycleConfigName: string | undefined;
}
export interface DescribeNotebookInstanceLifecycleConfigOutput {
  NotebookInstanceLifecycleConfigArn?: string | undefined;
  NotebookInstanceLifecycleConfigName?: string | undefined;
  OnCreate?: NotebookInstanceLifecycleHook[] | undefined;
  OnStart?: NotebookInstanceLifecycleHook[] | undefined;
  LastModifiedTime?: Date | undefined;
  CreationTime?: Date | undefined;
}
export interface DescribeOptimizationJobRequest {
  OptimizationJobName: string | undefined;
}
export declare const OptimizationJobStatus: {
  readonly COMPLETED: "COMPLETED";
  readonly FAILED: "FAILED";
  readonly INPROGRESS: "INPROGRESS";
  readonly STARTING: "STARTING";
  readonly STOPPED: "STOPPED";
  readonly STOPPING: "STOPPING";
};
export type OptimizationJobStatus =
  (typeof OptimizationJobStatus)[keyof typeof OptimizationJobStatus];
export interface OptimizationOutput {
  RecommendedInferenceImage?: string | undefined;
}
export interface DescribeOptimizationJobResponse {
  OptimizationJobArn: string | undefined;
  OptimizationJobStatus: OptimizationJobStatus | undefined;
  OptimizationStartTime?: Date | undefined;
  OptimizationEndTime?: Date | undefined;
  CreationTime: Date | undefined;
  LastModifiedTime: Date | undefined;
  FailureReason?: string | undefined;
  OptimizationJobName: string | undefined;
  ModelSource: OptimizationJobModelSource | undefined;
  OptimizationEnvironment?: Record<string, string> | undefined;
  DeploymentInstanceType: OptimizationJobDeploymentInstanceType | undefined;
  OptimizationConfigs: OptimizationConfig[] | undefined;
  OutputConfig: OptimizationJobOutputConfig | undefined;
  OptimizationOutput?: OptimizationOutput | undefined;
  RoleArn: string | undefined;
  StoppingCondition: StoppingCondition | undefined;
  VpcConfig?: OptimizationVpcConfig | undefined;
}
export interface DescribePartnerAppRequest {
  Arn: string | undefined;
}
export interface ErrorInfo {
  Code?: string | undefined;
  Reason?: string | undefined;
}
export declare const PartnerAppStatus: {
  readonly AVAILABLE: "Available";
  readonly CREATING: "Creating";
  readonly DELETED: "Deleted";
  readonly DELETING: "Deleting";
  readonly FAILED: "Failed";
  readonly UPDATE_FAILED: "UpdateFailed";
  readonly UPDATING: "Updating";
};
export type PartnerAppStatus =
  (typeof PartnerAppStatus)[keyof typeof PartnerAppStatus];
export interface DescribePartnerAppResponse {
  Arn?: string | undefined;
  Name?: string | undefined;
  Type?: PartnerAppType | undefined;
  Status?: PartnerAppStatus | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  ExecutionRoleArn?: string | undefined;
  KmsKeyId?: string | undefined;
  BaseUrl?: string | undefined;
  MaintenanceConfig?: PartnerAppMaintenanceConfig | undefined;
  Tier?: string | undefined;
  Version?: string | undefined;
  ApplicationConfig?: PartnerAppConfig | undefined;
  AuthType?: PartnerAppAuthType | undefined;
  EnableIamSessionBasedIdentity?: boolean | undefined;
  Error?: ErrorInfo | undefined;
}
export interface DescribePipelineRequest {
  PipelineName: string | undefined;
}
export declare const PipelineStatus: {
  readonly ACTIVE: "Active";
  readonly DELETING: "Deleting";
};
export type PipelineStatus =
  (typeof PipelineStatus)[keyof typeof PipelineStatus];
export interface DescribePipelineResponse {
  PipelineArn?: string | undefined;
  PipelineName?: string | undefined;
  PipelineDisplayName?: string | undefined;
  PipelineDefinition?: string | undefined;
  PipelineDescription?: string | undefined;
  RoleArn?: string | undefined;
  PipelineStatus?: PipelineStatus | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  LastRunTime?: Date | undefined;
  CreatedBy?: UserContext | undefined;
  LastModifiedBy?: UserContext | undefined;
  ParallelismConfiguration?: ParallelismConfiguration | undefined;
}
export interface DescribePipelineDefinitionForExecutionRequest {
  PipelineExecutionArn: string | undefined;
}
export interface DescribePipelineDefinitionForExecutionResponse {
  PipelineDefinition?: string | undefined;
  CreationTime?: Date | undefined;
}
export interface DescribePipelineExecutionRequest {
  PipelineExecutionArn: string | undefined;
}
export declare const PipelineExecutionStatus: {
  readonly EXECUTING: "Executing";
  readonly FAILED: "Failed";
  readonly STOPPED: "Stopped";
  readonly STOPPING: "Stopping";
  readonly SUCCEEDED: "Succeeded";
};
export type PipelineExecutionStatus =
  (typeof PipelineExecutionStatus)[keyof typeof PipelineExecutionStatus];
export interface PipelineExperimentConfig {
  ExperimentName?: string | undefined;
  TrialName?: string | undefined;
}
export interface SelectedStep {
  StepName: string | undefined;
}
export interface SelectiveExecutionConfig {
  SourcePipelineExecutionArn?: string | undefined;
  SelectedSteps: SelectedStep[] | undefined;
}
export interface DescribePipelineExecutionResponse {
  PipelineArn?: string | undefined;
  PipelineExecutionArn?: string | undefined;
  PipelineExecutionDisplayName?: string | undefined;
  PipelineExecutionStatus?: PipelineExecutionStatus | undefined;
  PipelineExecutionDescription?: string | undefined;
  PipelineExperimentConfig?: PipelineExperimentConfig | undefined;
  FailureReason?: string | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  CreatedBy?: UserContext | undefined;
  LastModifiedBy?: UserContext | undefined;
  ParallelismConfiguration?: ParallelismConfiguration | undefined;
  SelectiveExecutionConfig?: SelectiveExecutionConfig | undefined;
}
export interface DescribeProcessingJobRequest {
  ProcessingJobName: string | undefined;
}
export declare const ProcessingJobStatus: {
  readonly COMPLETED: "Completed";
  readonly FAILED: "Failed";
  readonly IN_PROGRESS: "InProgress";
  readonly STOPPED: "Stopped";
  readonly STOPPING: "Stopping";
};
export type ProcessingJobStatus =
  (typeof ProcessingJobStatus)[keyof typeof ProcessingJobStatus];
export interface DescribeProcessingJobResponse {
  ProcessingInputs?: ProcessingInput[] | undefined;
  ProcessingOutputConfig?: ProcessingOutputConfig | undefined;
  ProcessingJobName: string | undefined;
  ProcessingResources: ProcessingResources | undefined;
  StoppingCondition?: ProcessingStoppingCondition | undefined;
  AppSpecification: AppSpecification | undefined;
  Environment?: Record<string, string> | undefined;
  NetworkConfig?: NetworkConfig | undefined;
  RoleArn?: string | undefined;
  ExperimentConfig?: ExperimentConfig | undefined;
  ProcessingJobArn: string | undefined;
  ProcessingJobStatus: ProcessingJobStatus | undefined;
  ExitMessage?: string | undefined;
  FailureReason?: string | undefined;
  ProcessingEndTime?: Date | undefined;
  ProcessingStartTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  CreationTime: Date | undefined;
  MonitoringScheduleArn?: string | undefined;
  AutoMLJobArn?: string | undefined;
  TrainingJobArn?: string | undefined;
}
export interface DescribeProjectInput {
  ProjectName: string | undefined;
}
export declare const ProjectStatus: {
  readonly CREATE_COMPLETED: "CreateCompleted";
  readonly CREATE_FAILED: "CreateFailed";
  readonly CREATE_IN_PROGRESS: "CreateInProgress";
  readonly DELETE_COMPLETED: "DeleteCompleted";
  readonly DELETE_FAILED: "DeleteFailed";
  readonly DELETE_IN_PROGRESS: "DeleteInProgress";
  readonly PENDING: "Pending";
  readonly UPDATE_COMPLETED: "UpdateCompleted";
  readonly UPDATE_FAILED: "UpdateFailed";
  readonly UPDATE_IN_PROGRESS: "UpdateInProgress";
};
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];
export interface ServiceCatalogProvisionedProductDetails {
  ProvisionedProductId?: string | undefined;
  ProvisionedProductStatusMessage?: string | undefined;
}
export interface DescribeProjectOutput {
  ProjectArn: string | undefined;
  ProjectName: string | undefined;
  ProjectId: string | undefined;
  ProjectDescription?: string | undefined;
  ServiceCatalogProvisioningDetails?:
    | ServiceCatalogProvisioningDetails
    | undefined;
  ServiceCatalogProvisionedProductDetails?:
    | ServiceCatalogProvisionedProductDetails
    | undefined;
  ProjectStatus: ProjectStatus | undefined;
  CreatedBy?: UserContext | undefined;
  CreationTime: Date | undefined;
  LastModifiedTime?: Date | undefined;
  LastModifiedBy?: UserContext | undefined;
}
export interface DescribeSpaceRequest {
  DomainId: string | undefined;
  SpaceName: string | undefined;
}
export declare const SpaceStatus: {
  readonly Delete_Failed: "Delete_Failed";
  readonly Deleting: "Deleting";
  readonly Failed: "Failed";
  readonly InService: "InService";
  readonly Pending: "Pending";
  readonly Update_Failed: "Update_Failed";
  readonly Updating: "Updating";
};
export type SpaceStatus = (typeof SpaceStatus)[keyof typeof SpaceStatus];
export interface DescribeSpaceResponse {
  DomainId?: string | undefined;
  SpaceArn?: string | undefined;
  SpaceName?: string | undefined;
  HomeEfsFileSystemUid?: string | undefined;
  Status?: SpaceStatus | undefined;
  LastModifiedTime?: Date | undefined;
  CreationTime?: Date | undefined;
  FailureReason?: string | undefined;
  SpaceSettings?: SpaceSettings | undefined;
  OwnershipSettings?: OwnershipSettings | undefined;
  SpaceSharingSettings?: SpaceSharingSettings | undefined;
  SpaceDisplayName?: string | undefined;
  Url?: string | undefined;
}
export interface DescribeStudioLifecycleConfigRequest {
  StudioLifecycleConfigName: string | undefined;
}
export interface DescribeStudioLifecycleConfigResponse {
  StudioLifecycleConfigArn?: string | undefined;
  StudioLifecycleConfigName?: string | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  StudioLifecycleConfigContent?: string | undefined;
  StudioLifecycleConfigAppType?: StudioLifecycleConfigAppType | undefined;
}
export interface DescribeSubscribedWorkteamRequest {
  WorkteamArn: string | undefined;
}
export interface SubscribedWorkteam {
  WorkteamArn: string | undefined;
  MarketplaceTitle?: string | undefined;
  SellerName?: string | undefined;
  MarketplaceDescription?: string | undefined;
  ListingId?: string | undefined;
}
export interface DescribeSubscribedWorkteamResponse {
  SubscribedWorkteam: SubscribedWorkteam | undefined;
}
export interface DescribeTrainingJobRequest {
  TrainingJobName: string | undefined;
}
export interface MetricData {
  MetricName?: string | undefined;
  Value?: number | undefined;
  Timestamp?: Date | undefined;
}
export interface ProfilerRuleEvaluationStatus {
  RuleConfigurationName?: string | undefined;
  RuleEvaluationJobArn?: string | undefined;
  RuleEvaluationStatus?: RuleEvaluationStatus | undefined;
  StatusDetails?: string | undefined;
  LastModifiedTime?: Date | undefined;
}
export declare const ProfilingStatus: {
  readonly DISABLED: "Disabled";
  readonly ENABLED: "Enabled";
};
export type ProfilingStatus =
  (typeof ProfilingStatus)[keyof typeof ProfilingStatus];
export declare const SecondaryStatus: {
  readonly COMPLETED: "Completed";
  readonly DOWNLOADING: "Downloading";
  readonly DOWNLOADING_TRAINING_IMAGE: "DownloadingTrainingImage";
  readonly FAILED: "Failed";
  readonly INTERRUPTED: "Interrupted";
  readonly LAUNCHING_ML_INSTANCES: "LaunchingMLInstances";
  readonly MAX_RUNTIME_EXCEEDED: "MaxRuntimeExceeded";
  readonly MAX_WAIT_TIME_EXCEEDED: "MaxWaitTimeExceeded";
  readonly PENDING: "Pending";
  readonly PREPARING_TRAINING_STACK: "PreparingTrainingStack";
  readonly RESTARTING: "Restarting";
  readonly STARTING: "Starting";
  readonly STOPPED: "Stopped";
  readonly STOPPING: "Stopping";
  readonly TRAINING: "Training";
  readonly UPDATING: "Updating";
  readonly UPLOADING: "Uploading";
};
export type SecondaryStatus =
  (typeof SecondaryStatus)[keyof typeof SecondaryStatus];
export interface SecondaryStatusTransition {
  Status: SecondaryStatus | undefined;
  StartTime: Date | undefined;
  EndTime?: Date | undefined;
  StatusMessage?: string | undefined;
}
export declare const WarmPoolResourceStatus: {
  readonly AVAILABLE: "Available";
  readonly INUSE: "InUse";
  readonly REUSED: "Reused";
  readonly TERMINATED: "Terminated";
};
export type WarmPoolResourceStatus =
  (typeof WarmPoolResourceStatus)[keyof typeof WarmPoolResourceStatus];
export interface WarmPoolStatus {
  Status: WarmPoolResourceStatus | undefined;
  ResourceRetainedBillableTimeInSeconds?: number | undefined;
  ReusedByJob?: string | undefined;
}
export interface DescribeTrainingJobResponse {
  TrainingJobName: string | undefined;
  TrainingJobArn: string | undefined;
  TuningJobArn?: string | undefined;
  LabelingJobArn?: string | undefined;
  AutoMLJobArn?: string | undefined;
  ModelArtifacts: ModelArtifacts | undefined;
  TrainingJobStatus: TrainingJobStatus | undefined;
  SecondaryStatus: SecondaryStatus | undefined;
  FailureReason?: string | undefined;
  HyperParameters?: Record<string, string> | undefined;
  AlgorithmSpecification: AlgorithmSpecification | undefined;
  RoleArn?: string | undefined;
  InputDataConfig?: Channel[] | undefined;
  OutputDataConfig?: OutputDataConfig | undefined;
  ResourceConfig: ResourceConfig | undefined;
  WarmPoolStatus?: WarmPoolStatus | undefined;
  VpcConfig?: VpcConfig | undefined;
  StoppingCondition: StoppingCondition | undefined;
  CreationTime: Date | undefined;
  TrainingStartTime?: Date | undefined;
  TrainingEndTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  SecondaryStatusTransitions?: SecondaryStatusTransition[] | undefined;
  FinalMetricDataList?: MetricData[] | undefined;
  EnableNetworkIsolation?: boolean | undefined;
  EnableInterContainerTrafficEncryption?: boolean | undefined;
  EnableManagedSpotTraining?: boolean | undefined;
  CheckpointConfig?: CheckpointConfig | undefined;
  TrainingTimeInSeconds?: number | undefined;
  BillableTimeInSeconds?: number | undefined;
  DebugHookConfig?: DebugHookConfig | undefined;
  ExperimentConfig?: ExperimentConfig | undefined;
  DebugRuleConfigurations?: DebugRuleConfiguration[] | undefined;
  TensorBoardOutputConfig?: TensorBoardOutputConfig | undefined;
  DebugRuleEvaluationStatuses?: DebugRuleEvaluationStatus[] | undefined;
  ProfilerConfig?: ProfilerConfig | undefined;
  ProfilerRuleConfigurations?: ProfilerRuleConfiguration[] | undefined;
  ProfilerRuleEvaluationStatuses?: ProfilerRuleEvaluationStatus[] | undefined;
  ProfilingStatus?: ProfilingStatus | undefined;
  Environment?: Record<string, string> | undefined;
  RetryStrategy?: RetryStrategy | undefined;
  RemoteDebugConfig?: RemoteDebugConfig | undefined;
  InfraCheckConfig?: InfraCheckConfig | undefined;
}
export interface DescribeTrainingPlanRequest {
  TrainingPlanName: string | undefined;
}
export declare const ReservedCapacityInstanceType: {
  readonly ML_P4D_24XLARGE: "ml.p4d.24xlarge";
  readonly ML_P5EN_48XLARGE: "ml.p5en.48xlarge";
  readonly ML_P5E_48XLARGE: "ml.p5e.48xlarge";
  readonly ML_P5_48XLARGE: "ml.p5.48xlarge";
  readonly ML_TRN1_32XLARGE: "ml.trn1.32xlarge";
  readonly ML_TRN2_48XLARGE: "ml.trn2.48xlarge";
};
export type ReservedCapacityInstanceType =
  (typeof ReservedCapacityInstanceType)[keyof typeof ReservedCapacityInstanceType];
export declare const ReservedCapacityStatus: {
  readonly ACTIVE: "Active";
  readonly EXPIRED: "Expired";
  readonly FAILED: "Failed";
  readonly PENDING: "Pending";
  readonly SCHEDULED: "Scheduled";
};
export type ReservedCapacityStatus =
  (typeof ReservedCapacityStatus)[keyof typeof ReservedCapacityStatus];
export interface ReservedCapacitySummary {
  ReservedCapacityArn: string | undefined;
  InstanceType: ReservedCapacityInstanceType | undefined;
  TotalInstanceCount: number | undefined;
  Status: ReservedCapacityStatus | undefined;
  AvailabilityZone?: string | undefined;
  DurationHours?: number | undefined;
  DurationMinutes?: number | undefined;
  StartTime?: Date | undefined;
  EndTime?: Date | undefined;
}
export declare const TrainingPlanStatus: {
  readonly ACTIVE: "Active";
  readonly EXPIRED: "Expired";
  readonly FAILED: "Failed";
  readonly PENDING: "Pending";
  readonly SCHEDULED: "Scheduled";
};
export type TrainingPlanStatus =
  (typeof TrainingPlanStatus)[keyof typeof TrainingPlanStatus];
export declare const SageMakerResourceName: {
  readonly HYPERPOD_CLUSTER: "hyperpod-cluster";
  readonly TRAINING_JOB: "training-job";
};
export type SageMakerResourceName =
  (typeof SageMakerResourceName)[keyof typeof SageMakerResourceName];
export interface DescribeTrainingPlanResponse {
  TrainingPlanArn: string | undefined;
  TrainingPlanName: string | undefined;
  Status: TrainingPlanStatus | undefined;
  StatusMessage?: string | undefined;
  DurationHours?: number | undefined;
  DurationMinutes?: number | undefined;
  StartTime?: Date | undefined;
  EndTime?: Date | undefined;
  UpfrontFee?: string | undefined;
  CurrencyCode?: string | undefined;
  TotalInstanceCount?: number | undefined;
  AvailableInstanceCount?: number | undefined;
  InUseInstanceCount?: number | undefined;
  TargetResources?: SageMakerResourceName[] | undefined;
  ReservedCapacitySummaries?: ReservedCapacitySummary[] | undefined;
}
export interface DescribeTransformJobRequest {
  TransformJobName: string | undefined;
}
export declare const TransformJobStatus: {
  readonly COMPLETED: "Completed";
  readonly FAILED: "Failed";
  readonly IN_PROGRESS: "InProgress";
  readonly STOPPED: "Stopped";
  readonly STOPPING: "Stopping";
};
export type TransformJobStatus =
  (typeof TransformJobStatus)[keyof typeof TransformJobStatus];
export interface DescribeTransformJobResponse {
  TransformJobName: string | undefined;
  TransformJobArn: string | undefined;
  TransformJobStatus: TransformJobStatus | undefined;
  FailureReason?: string | undefined;
  ModelName: string | undefined;
  MaxConcurrentTransforms?: number | undefined;
  ModelClientConfig?: ModelClientConfig | undefined;
  MaxPayloadInMB?: number | undefined;
  BatchStrategy?: BatchStrategy | undefined;
  Environment?: Record<string, string> | undefined;
  TransformInput: TransformInput | undefined;
  TransformOutput?: TransformOutput | undefined;
  DataCaptureConfig?: BatchDataCaptureConfig | undefined;
  TransformResources: TransformResources | undefined;
  CreationTime: Date | undefined;
  TransformStartTime?: Date | undefined;
  TransformEndTime?: Date | undefined;
  LabelingJobArn?: string | undefined;
  AutoMLJobArn?: string | undefined;
  DataProcessing?: DataProcessing | undefined;
  ExperimentConfig?: ExperimentConfig | undefined;
}
export interface DescribeTrialRequest {
  TrialName: string | undefined;
}
export interface TrialSource {
  SourceArn: string | undefined;
  SourceType?: string | undefined;
}
export interface DescribeTrialResponse {
  TrialName?: string | undefined;
  TrialArn?: string | undefined;
  DisplayName?: string | undefined;
  ExperimentName?: string | undefined;
  Source?: TrialSource | undefined;
  CreationTime?: Date | undefined;
  CreatedBy?: UserContext | undefined;
  LastModifiedTime?: Date | undefined;
  LastModifiedBy?: UserContext | undefined;
  MetadataProperties?: MetadataProperties | undefined;
}
export interface DescribeTrialComponentRequest {
  TrialComponentName: string | undefined;
}
export interface TrialComponentMetricSummary {
  MetricName?: string | undefined;
  SourceArn?: string | undefined;
  TimeStamp?: Date | undefined;
  Max?: number | undefined;
  Min?: number | undefined;
  Last?: number | undefined;
  Count?: number | undefined;
  Avg?: number | undefined;
  StdDev?: number | undefined;
}
export interface TrialComponentSource {
  SourceArn: string | undefined;
  SourceType?: string | undefined;
}
export interface DescribeTrialComponentResponse {
  TrialComponentName?: string | undefined;
  TrialComponentArn?: string | undefined;
  DisplayName?: string | undefined;
  Source?: TrialComponentSource | undefined;
  Status?: TrialComponentStatus | undefined;
  StartTime?: Date | undefined;
  EndTime?: Date | undefined;
  CreationTime?: Date | undefined;
  CreatedBy?: UserContext | undefined;
  LastModifiedTime?: Date | undefined;
  LastModifiedBy?: UserContext | undefined;
  Parameters?: Record<string, TrialComponentParameterValue> | undefined;
  InputArtifacts?: Record<string, TrialComponentArtifact> | undefined;
  OutputArtifacts?: Record<string, TrialComponentArtifact> | undefined;
  MetadataProperties?: MetadataProperties | undefined;
  Metrics?: TrialComponentMetricSummary[] | undefined;
  LineageGroupArn?: string | undefined;
  Sources?: TrialComponentSource[] | undefined;
}
export interface DescribeUserProfileRequest {
  DomainId: string | undefined;
  UserProfileName: string | undefined;
}
export declare const UserProfileStatus: {
  readonly Delete_Failed: "Delete_Failed";
  readonly Deleting: "Deleting";
  readonly Failed: "Failed";
  readonly InService: "InService";
  readonly Pending: "Pending";
  readonly Update_Failed: "Update_Failed";
  readonly Updating: "Updating";
};
export type UserProfileStatus =
  (typeof UserProfileStatus)[keyof typeof UserProfileStatus];
export interface DescribeUserProfileResponse {
  DomainId?: string | undefined;
  UserProfileArn?: string | undefined;
  UserProfileName?: string | undefined;
  HomeEfsFileSystemUid?: string | undefined;
  Status?: UserProfileStatus | undefined;
  LastModifiedTime?: Date | undefined;
  CreationTime?: Date | undefined;
  FailureReason?: string | undefined;
  SingleSignOnUserIdentifier?: string | undefined;
  SingleSignOnUserValue?: string | undefined;
  UserSettings?: UserSettings | undefined;
}
export interface DescribeWorkforceRequest {
  WorkforceName: string | undefined;
}
export interface OidcConfigForResponse {
  ClientId?: string | undefined;
  Issuer?: string | undefined;
  AuthorizationEndpoint?: string | undefined;
  TokenEndpoint?: string | undefined;
  UserInfoEndpoint?: string | undefined;
  LogoutEndpoint?: string | undefined;
  JwksUri?: string | undefined;
  Scope?: string | undefined;
  AuthenticationRequestExtraParams?: Record<string, string> | undefined;
}
export declare const WorkforceStatus: {
  readonly ACTIVE: "Active";
  readonly DELETING: "Deleting";
  readonly FAILED: "Failed";
  readonly INITIALIZING: "Initializing";
  readonly UPDATING: "Updating";
};
export type WorkforceStatus =
  (typeof WorkforceStatus)[keyof typeof WorkforceStatus];
export interface WorkforceVpcConfigResponse {
  VpcId: string | undefined;
  SecurityGroupIds: string[] | undefined;
  Subnets: string[] | undefined;
  VpcEndpointId?: string | undefined;
}
export interface Workforce {
  WorkforceName: string | undefined;
  WorkforceArn: string | undefined;
  LastUpdatedDate?: Date | undefined;
  SourceIpConfig?: SourceIpConfig | undefined;
  SubDomain?: string | undefined;
  CognitoConfig?: CognitoConfig | undefined;
  OidcConfig?: OidcConfigForResponse | undefined;
  CreateDate?: Date | undefined;
  WorkforceVpcConfig?: WorkforceVpcConfigResponse | undefined;
  Status?: WorkforceStatus | undefined;
  FailureReason?: string | undefined;
}
export interface DescribeWorkforceResponse {
  Workforce: Workforce | undefined;
}
export interface DescribeWorkteamRequest {
  WorkteamName: string | undefined;
}
export interface Workteam {
  WorkteamName: string | undefined;
  MemberDefinitions: MemberDefinition[] | undefined;
  WorkteamArn: string | undefined;
  WorkforceArn?: string | undefined;
  ProductListingIds?: string[] | undefined;
  Description: string | undefined;
  SubDomain?: string | undefined;
  CreateDate?: Date | undefined;
  LastUpdatedDate?: Date | undefined;
  NotificationConfiguration?: NotificationConfiguration | undefined;
  WorkerAccessConfiguration?: WorkerAccessConfiguration | undefined;
}
export interface DescribeWorkteamResponse {
  Workteam: Workteam | undefined;
}
export interface ProductionVariantServerlessUpdateConfig {
  MaxConcurrency?: number | undefined;
  ProvisionedConcurrency?: number | undefined;
}
export interface DesiredWeightAndCapacity {
  VariantName: string | undefined;
  DesiredWeight?: number | undefined;
  DesiredInstanceCount?: number | undefined;
  ServerlessUpdateConfig?: ProductionVariantServerlessUpdateConfig | undefined;
}
export interface Device {
  DeviceName: string | undefined;
  Description?: string | undefined;
  IotThingName?: string | undefined;
}
export declare const DeviceDeploymentStatus: {
  readonly Deployed: "DEPLOYED";
  readonly Failed: "FAILED";
  readonly InProgress: "INPROGRESS";
  readonly ReadyToDeploy: "READYTODEPLOY";
  readonly Stopped: "STOPPED";
  readonly Stopping: "STOPPING";
};
export type DeviceDeploymentStatus =
  (typeof DeviceDeploymentStatus)[keyof typeof DeviceDeploymentStatus];
export interface DeviceDeploymentSummary {
  EdgeDeploymentPlanArn: string | undefined;
  EdgeDeploymentPlanName: string | undefined;
  StageName: string | undefined;
  DeployedStageName?: string | undefined;
  DeviceFleetName?: string | undefined;
  DeviceName: string | undefined;
  DeviceArn: string | undefined;
  DeviceDeploymentStatus?: DeviceDeploymentStatus | undefined;
  DeviceDeploymentStatusMessage?: string | undefined;
  Description?: string | undefined;
  DeploymentStartTime?: Date | undefined;
}
export interface DeviceFleetSummary {
  DeviceFleetArn: string | undefined;
  DeviceFleetName: string | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
}
export interface DeviceStats {
  ConnectedDeviceCount: number | undefined;
  RegisteredDeviceCount: number | undefined;
}
export interface EdgeModelSummary {
  ModelName: string | undefined;
  ModelVersion: string | undefined;
}
export interface DeviceSummary {
  DeviceName: string | undefined;
  DeviceArn: string | undefined;
  Description?: string | undefined;
  DeviceFleetName?: string | undefined;
  IotThingName?: string | undefined;
  RegistrationTime?: Date | undefined;
  LatestHeartbeat?: Date | undefined;
  Models?: EdgeModelSummary[] | undefined;
  AgentVersion?: string | undefined;
}
export declare const Direction: {
  readonly ASCENDANTS: "Ascendants";
  readonly BOTH: "Both";
  readonly DESCENDANTS: "Descendants";
};
export type Direction = (typeof Direction)[keyof typeof Direction];
export interface DisableSagemakerServicecatalogPortfolioInput {}
export interface DisableSagemakerServicecatalogPortfolioOutput {}
export interface DisassociateTrialComponentRequest {
  TrialComponentName: string | undefined;
  TrialName: string | undefined;
}
export interface DisassociateTrialComponentResponse {
  TrialComponentArn?: string | undefined;
  TrialArn?: string | undefined;
}
export interface DomainDetails {
  DomainArn?: string | undefined;
  DomainId?: string | undefined;
  DomainName?: string | undefined;
  Status?: DomainStatus | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  Url?: string | undefined;
}
export interface RStudioServerProDomainSettingsForUpdate {
  DomainExecutionRoleArn: string | undefined;
  DefaultResourceSpec?: ResourceSpec | undefined;
  RStudioConnectUrl?: string | undefined;
  RStudioPackageManagerUrl?: string | undefined;
}
export interface DomainSettingsForUpdate {
  RStudioServerProDomainSettingsForUpdate?:
    | RStudioServerProDomainSettingsForUpdate
    | undefined;
  ExecutionRoleIdentityConfig?: ExecutionRoleIdentityConfig | undefined;
  SecurityGroupIds?: string[] | undefined;
  DockerSettings?: DockerSettings | undefined;
  AmazonQSettings?: AmazonQSettings | undefined;
  UnifiedStudioSettings?: UnifiedStudioSettings | undefined;
}
export interface PredefinedMetricSpecification {
  PredefinedMetricType?: string | undefined;
}
export type MetricSpecification =
  | MetricSpecification.CustomizedMember
  | MetricSpecification.PredefinedMember
  | MetricSpecification.$UnknownMember;
export declare namespace MetricSpecification {
  interface PredefinedMember {
    Predefined: PredefinedMetricSpecification;
    Customized?: never;
    $unknown?: never;
  }
  interface CustomizedMember {
    Predefined?: never;
    Customized: CustomizedMetricSpecification;
    $unknown?: never;
  }
  interface $UnknownMember {
    Predefined?: never;
    Customized?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    Predefined: (value: PredefinedMetricSpecification) => T;
    Customized: (value: CustomizedMetricSpecification) => T;
    _: (name: string, value: any) => T;
  }
  const visit: <T>(value: MetricSpecification, visitor: Visitor<T>) => T;
}
export interface TargetTrackingScalingPolicyConfiguration {
  MetricSpecification?: MetricSpecification | undefined;
  TargetValue?: number | undefined;
}
export type ScalingPolicy =
  | ScalingPolicy.TargetTrackingMember
  | ScalingPolicy.$UnknownMember;
export declare namespace ScalingPolicy {
  interface TargetTrackingMember {
    TargetTracking: TargetTrackingScalingPolicyConfiguration;
    $unknown?: never;
  }
  interface $UnknownMember {
    TargetTracking?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    TargetTracking: (value: TargetTrackingScalingPolicyConfiguration) => T;
    _: (name: string, value: any) => T;
  }
  const visit: <T>(value: ScalingPolicy, visitor: Visitor<T>) => T;
}
export interface DynamicScalingConfiguration {
  MinCapacity?: number | undefined;
  MaxCapacity?: number | undefined;
  ScaleInCooldown?: number | undefined;
  ScaleOutCooldown?: number | undefined;
  ScalingPolicies?: ScalingPolicy[] | undefined;
}
export interface Edge {
  SourceArn?: string | undefined;
  DestinationArn?: string | undefined;
  AssociationType?: AssociationEdgeType | undefined;
}
export interface EdgeDeploymentPlanSummary {
  EdgeDeploymentPlanArn: string | undefined;
  EdgeDeploymentPlanName: string | undefined;
  DeviceFleetName: string | undefined;
  EdgeDeploymentSuccess: number | undefined;
  EdgeDeploymentPending: number | undefined;
  EdgeDeploymentFailed: number | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
}
export interface EdgeModelStat {
  ModelName: string | undefined;
  ModelVersion: string | undefined;
  OfflineDeviceCount: number | undefined;
  ConnectedDeviceCount: number | undefined;
  ActiveDeviceCount: number | undefined;
  SamplingDeviceCount: number | undefined;
}
export interface EdgePackagingJobSummary {
  EdgePackagingJobArn: string | undefined;
  EdgePackagingJobName: string | undefined;
  EdgePackagingJobStatus: EdgePackagingJobStatus | undefined;
  CompilationJobName?: string | undefined;
  ModelName?: string | undefined;
  ModelVersion?: string | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
}
export interface EMRStepMetadata {
  ClusterId?: string | undefined;
  StepId?: string | undefined;
  StepName?: string | undefined;
  LogFilePath?: string | undefined;
}
export interface EnableSagemakerServicecatalogPortfolioInput {}
export interface EnableSagemakerServicecatalogPortfolioOutput {}
export interface MonitoringSchedule {
  MonitoringScheduleArn?: string | undefined;
  MonitoringScheduleName?: string | undefined;
  MonitoringScheduleStatus?: ScheduleStatus | undefined;
  MonitoringType?: MonitoringType | undefined;
  FailureReason?: string | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  MonitoringScheduleConfig?: MonitoringScheduleConfig | undefined;
  EndpointName?: string | undefined;
  LastMonitoringExecutionSummary?: MonitoringExecutionSummary | undefined;
  Tags?: Tag[] | undefined;
}
export interface Endpoint {
  EndpointName: string | undefined;
  EndpointArn: string | undefined;
  EndpointConfigName: string | undefined;
  ProductionVariants?: ProductionVariantSummary[] | undefined;
  DataCaptureConfig?: DataCaptureConfigSummary | undefined;
  EndpointStatus: EndpointStatus | undefined;
  FailureReason?: string | undefined;
  CreationTime: Date | undefined;
  LastModifiedTime: Date | undefined;
  MonitoringSchedules?: MonitoringSchedule[] | undefined;
  Tags?: Tag[] | undefined;
  ShadowProductionVariants?: ProductionVariantSummary[] | undefined;
}
export declare const EndpointConfigSortKey: {
  readonly CreationTime: "CreationTime";
  readonly Name: "Name";
};
export type EndpointConfigSortKey =
  (typeof EndpointConfigSortKey)[keyof typeof EndpointConfigSortKey];
export interface EndpointConfigStepMetadata {
  Arn?: string | undefined;
}
export interface EndpointConfigSummary {
  EndpointConfigName: string | undefined;
  EndpointConfigArn: string | undefined;
  CreationTime: Date | undefined;
}
export declare const EndpointSortKey: {
  readonly CreationTime: "CreationTime";
  readonly Name: "Name";
  readonly Status: "Status";
};
export type EndpointSortKey =
  (typeof EndpointSortKey)[keyof typeof EndpointSortKey];
export interface EndpointStepMetadata {
  Arn?: string | undefined;
}
export interface EndpointSummary {
  EndpointName: string | undefined;
  EndpointArn: string | undefined;
  CreationTime: Date | undefined;
  LastModifiedTime: Date | undefined;
  EndpointStatus: EndpointStatus | undefined;
}
export interface Experiment {
  ExperimentName?: string | undefined;
  ExperimentArn?: string | undefined;
  DisplayName?: string | undefined;
  Source?: ExperimentSource | undefined;
  Description?: string | undefined;
  CreationTime?: Date | undefined;
  CreatedBy?: UserContext | undefined;
  LastModifiedTime?: Date | undefined;
  LastModifiedBy?: UserContext | undefined;
  Tags?: Tag[] | undefined;
}
export interface ExperimentSummary {
  ExperimentArn?: string | undefined;
  ExperimentName?: string | undefined;
  DisplayName?: string | undefined;
  ExperimentSource?: ExperimentSource | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
}
export interface FailStepMetadata {
  ErrorMessage?: string | undefined;
}
export interface FeatureGroup {
  FeatureGroupArn?: string | undefined;
  FeatureGroupName?: string | undefined;
  RecordIdentifierFeatureName?: string | undefined;
  EventTimeFeatureName?: string | undefined;
  FeatureDefinitions?: FeatureDefinition[] | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  OnlineStoreConfig?: OnlineStoreConfig | undefined;
  OfflineStoreConfig?: OfflineStoreConfig | undefined;
  RoleArn?: string | undefined;
  FeatureGroupStatus?: FeatureGroupStatus | undefined;
  OfflineStoreStatus?: OfflineStoreStatus | undefined;
  LastUpdateStatus?: LastUpdateStatus | undefined;
  FailureReason?: string | undefined;
  Description?: string | undefined;
  Tags?: Tag[] | undefined;
}
export declare const FeatureGroupSortBy: {
  readonly CREATION_TIME: "CreationTime";
  readonly FEATURE_GROUP_STATUS: "FeatureGroupStatus";
  readonly NAME: "Name";
  readonly OFFLINE_STORE_STATUS: "OfflineStoreStatus";
};
export type FeatureGroupSortBy =
  (typeof FeatureGroupSortBy)[keyof typeof FeatureGroupSortBy];
export declare const FeatureGroupSortOrder: {
  readonly ASCENDING: "Ascending";
  readonly DESCENDING: "Descending";
};
export type FeatureGroupSortOrder =
  (typeof FeatureGroupSortOrder)[keyof typeof FeatureGroupSortOrder];
export interface FeatureGroupSummary {
  FeatureGroupName: string | undefined;
  FeatureGroupArn: string | undefined;
  CreationTime: Date | undefined;
  FeatureGroupStatus?: FeatureGroupStatus | undefined;
  OfflineStoreStatus?: OfflineStoreStatus | undefined;
}
export interface FeatureMetadata {
  FeatureGroupArn?: string | undefined;
  FeatureGroupName?: string | undefined;
  FeatureName?: string | undefined;
  FeatureType?: FeatureType | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  Description?: string | undefined;
  Parameters?: FeatureParameter[] | undefined;
}
export declare const Operator: {
  readonly CONTAINS: "Contains";
  readonly EQUALS: "Equals";
  readonly EXISTS: "Exists";
  readonly GREATER_THAN: "GreaterThan";
  readonly GREATER_THAN_OR_EQUAL_TO: "GreaterThanOrEqualTo";
  readonly IN: "In";
  readonly LESS_THAN: "LessThan";
  readonly LESS_THAN_OR_EQUAL_TO: "LessThanOrEqualTo";
  readonly NOT_EQUALS: "NotEquals";
  readonly NOT_EXISTS: "NotExists";
};
export type Operator = (typeof Operator)[keyof typeof Operator];
export interface Filter {
  Name: string | undefined;
  Operator?: Operator | undefined;
  Value?: string | undefined;
}
export interface FlowDefinitionSummary {
  FlowDefinitionName: string | undefined;
  FlowDefinitionArn: string | undefined;
  FlowDefinitionStatus: FlowDefinitionStatus | undefined;
  CreationTime: Date | undefined;
  FailureReason?: string | undefined;
}
export interface GetDeviceFleetReportRequest {
  DeviceFleetName: string | undefined;
}
export interface GetDeviceFleetReportResponse {
  DeviceFleetArn: string | undefined;
  DeviceFleetName: string | undefined;
  OutputConfig?: EdgeOutputConfig | undefined;
  Description?: string | undefined;
  ReportGenerated?: Date | undefined;
  DeviceStats?: DeviceStats | undefined;
  AgentVersions?: AgentVersion[] | undefined;
  ModelStats?: EdgeModelStat[] | undefined;
}
export interface GetLineageGroupPolicyRequest {
  LineageGroupName: string | undefined;
}
export interface GetLineageGroupPolicyResponse {
  LineageGroupArn?: string | undefined;
  ResourcePolicy?: string | undefined;
}
export interface GetModelPackageGroupPolicyInput {
  ModelPackageGroupName: string | undefined;
}
export interface GetModelPackageGroupPolicyOutput {
  ResourcePolicy: string | undefined;
}
export interface GetSagemakerServicecatalogPortfolioStatusInput {}
export declare const SagemakerServicecatalogStatus: {
  readonly DISABLED: "Disabled";
  readonly ENABLED: "Enabled";
};
export type SagemakerServicecatalogStatus =
  (typeof SagemakerServicecatalogStatus)[keyof typeof SagemakerServicecatalogStatus];
export interface GetSagemakerServicecatalogPortfolioStatusOutput {
  Status?: SagemakerServicecatalogStatus | undefined;
}
export interface ScalingPolicyObjective {
  MinInvocationsPerMinute?: number | undefined;
  MaxInvocationsPerMinute?: number | undefined;
}
export interface GetScalingConfigurationRecommendationRequest {
  InferenceRecommendationsJobName: string | undefined;
  RecommendationId?: string | undefined;
  EndpointName?: string | undefined;
  TargetCpuUtilizationPerCore?: number | undefined;
  ScalingPolicyObjective?: ScalingPolicyObjective | undefined;
}
export interface ScalingPolicyMetric {
  InvocationsPerInstance?: number | undefined;
  ModelLatency?: number | undefined;
}
export interface GetScalingConfigurationRecommendationResponse {
  InferenceRecommendationsJobName?: string | undefined;
  RecommendationId?: string | undefined;
  EndpointName?: string | undefined;
  TargetCpuUtilizationPerCore?: number | undefined;
  ScalingPolicyObjective?: ScalingPolicyObjective | undefined;
  Metric?: ScalingPolicyMetric | undefined;
  DynamicScalingConfiguration?: DynamicScalingConfiguration | undefined;
}
export declare const ResourceType: {
  readonly ENDPOINT: "Endpoint";
  readonly EXPERIMENT: "Experiment";
  readonly EXPERIMENT_TRIAL: "ExperimentTrial";
  readonly EXPERIMENT_TRIAL_COMPONENT: "ExperimentTrialComponent";
  readonly FEATURE_GROUP: "FeatureGroup";
  readonly FEATURE_METADATA: "FeatureMetadata";
  readonly HYPER_PARAMETER_TUNING_JOB: "HyperParameterTuningJob";
  readonly IMAGE: "Image";
  readonly IMAGE_VERSION: "ImageVersion";
  readonly MODEL: "Model";
  readonly MODEL_CARD: "ModelCard";
  readonly MODEL_PACKAGE: "ModelPackage";
  readonly MODEL_PACKAGE_GROUP: "ModelPackageGroup";
  readonly PIPELINE: "Pipeline";
  readonly PIPELINE_EXECUTION: "PipelineExecution";
  readonly PROJECT: "Project";
  readonly TRAINING_JOB: "TrainingJob";
};
export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType];
export interface PropertyNameQuery {
  PropertyNameHint: string | undefined;
}
export interface SuggestionQuery {
  PropertyNameQuery?: PropertyNameQuery | undefined;
}
export interface GetSearchSuggestionsRequest {
  Resource: ResourceType | undefined;
  SuggestionQuery?: SuggestionQuery | undefined;
}
export interface PropertyNameSuggestion {
  PropertyName?: string | undefined;
}
export interface GetSearchSuggestionsResponse {
  PropertyNameSuggestions?: PropertyNameSuggestion[] | undefined;
}
export interface GitConfigForUpdate {
  SecretArn?: string | undefined;
}
export interface HubContentInfo {
  HubContentName: string | undefined;
  HubContentArn: string | undefined;
  SageMakerPublicHubContentArn?: string | undefined;
  HubContentVersion: string | undefined;
  HubContentType: HubContentType | undefined;
  DocumentSchemaVersion: string | undefined;
  HubContentDisplayName?: string | undefined;
  HubContentDescription?: string | undefined;
  SupportStatus?: HubContentSupportStatus | undefined;
  HubContentSearchKeywords?: string[] | undefined;
  HubContentStatus: HubContentStatus | undefined;
  CreationTime: Date | undefined;
  OriginalCreationTime?: Date | undefined;
}
export declare const HubContentSortBy: {
  readonly CREATION_TIME: "CreationTime";
  readonly HUB_CONTENT_NAME: "HubContentName";
  readonly HUB_CONTENT_STATUS: "HubContentStatus";
};
export type HubContentSortBy =
  (typeof HubContentSortBy)[keyof typeof HubContentSortBy];
export interface HubInfo {
  HubName: string | undefined;
  HubArn: string | undefined;
  HubDisplayName?: string | undefined;
  HubDescription?: string | undefined;
  HubSearchKeywords?: string[] | undefined;
  HubStatus: HubStatus | undefined;
  CreationTime: Date | undefined;
  LastModifiedTime: Date | undefined;
}
export declare const HubSortBy: {
  readonly ACCOUNT_ID_OWNER: "AccountIdOwner";
  readonly CREATION_TIME: "CreationTime";
  readonly HUB_NAME: "HubName";
  readonly HUB_STATUS: "HubStatus";
};
export type HubSortBy = (typeof HubSortBy)[keyof typeof HubSortBy];
export interface HumanTaskUiSummary {
  HumanTaskUiName: string | undefined;
  HumanTaskUiArn: string | undefined;
  CreationTime: Date | undefined;
}
export interface HyperParameterTuningJobSearchEntity {
  HyperParameterTuningJobName?: string | undefined;
  HyperParameterTuningJobArn?: string | undefined;
  HyperParameterTuningJobConfig?: HyperParameterTuningJobConfig | undefined;
  TrainingJobDefinition?: HyperParameterTrainingJobDefinition | undefined;
  TrainingJobDefinitions?: HyperParameterTrainingJobDefinition[] | undefined;
  HyperParameterTuningJobStatus?: HyperParameterTuningJobStatus | undefined;
  CreationTime?: Date | undefined;
  HyperParameterTuningEndTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  TrainingJobStatusCounters?: TrainingJobStatusCounters | undefined;
  ObjectiveStatusCounters?: ObjectiveStatusCounters | undefined;
  BestTrainingJob?: HyperParameterTrainingJobSummary | undefined;
  OverallBestTrainingJob?: HyperParameterTrainingJobSummary | undefined;
  WarmStartConfig?: HyperParameterTuningJobWarmStartConfig | undefined;
  FailureReason?: string | undefined;
  TuningJobCompletionDetails?:
    | HyperParameterTuningJobCompletionDetails
    | undefined;
  ConsumedResources?: HyperParameterTuningJobConsumedResources | undefined;
  Tags?: Tag[] | undefined;
}
export declare const HyperParameterTuningJobSortByOptions: {
  readonly CreationTime: "CreationTime";
  readonly Name: "Name";
  readonly Status: "Status";
};
export type HyperParameterTuningJobSortByOptions =
  (typeof HyperParameterTuningJobSortByOptions)[keyof typeof HyperParameterTuningJobSortByOptions];
export interface HyperParameterTuningJobSummary {
  HyperParameterTuningJobName: string | undefined;
  HyperParameterTuningJobArn: string | undefined;
  HyperParameterTuningJobStatus: HyperParameterTuningJobStatus | undefined;
  Strategy: HyperParameterTuningJobStrategyType | undefined;
  CreationTime: Date | undefined;
  HyperParameterTuningEndTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  TrainingJobStatusCounters: TrainingJobStatusCounters | undefined;
  ObjectiveStatusCounters: ObjectiveStatusCounters | undefined;
  ResourceLimits?: ResourceLimits | undefined;
}
export interface Image {
  CreationTime: Date | undefined;
  Description?: string | undefined;
  DisplayName?: string | undefined;
  FailureReason?: string | undefined;
  ImageArn: string | undefined;
  ImageName: string | undefined;
  ImageStatus: ImageStatus | undefined;
  LastModifiedTime: Date | undefined;
}
export declare const ImageSortBy: {
  readonly CREATION_TIME: "CREATION_TIME";
  readonly IMAGE_NAME: "IMAGE_NAME";
  readonly LAST_MODIFIED_TIME: "LAST_MODIFIED_TIME";
};
export type ImageSortBy = (typeof ImageSortBy)[keyof typeof ImageSortBy];
export declare const ImageSortOrder: {
  readonly ASCENDING: "ASCENDING";
  readonly DESCENDING: "DESCENDING";
};
export type ImageSortOrder =
  (typeof ImageSortOrder)[keyof typeof ImageSortOrder];
export interface ImageVersion {
  CreationTime: Date | undefined;
  FailureReason?: string | undefined;
  ImageArn: string | undefined;
  ImageVersionArn: string | undefined;
  ImageVersionStatus: ImageVersionStatus | undefined;
  LastModifiedTime: Date | undefined;
  Version: number | undefined;
}
export declare const ImageVersionSortBy: {
  readonly CREATION_TIME: "CREATION_TIME";
  readonly LAST_MODIFIED_TIME: "LAST_MODIFIED_TIME";
  readonly VERSION: "VERSION";
};
export type ImageVersionSortBy =
  (typeof ImageVersionSortBy)[keyof typeof ImageVersionSortBy];
export declare const ImageVersionSortOrder: {
  readonly ASCENDING: "ASCENDING";
  readonly DESCENDING: "DESCENDING";
};
export type ImageVersionSortOrder =
  (typeof ImageVersionSortOrder)[keyof typeof ImageVersionSortOrder];
export interface ImportHubContentRequest {
  HubContentName: string | undefined;
  HubContentVersion?: string | undefined;
  HubContentType: HubContentType | undefined;
  DocumentSchemaVersion: string | undefined;
  HubName: string | undefined;
  HubContentDisplayName?: string | undefined;
  HubContentDescription?: string | undefined;
  HubContentMarkdown?: string | undefined;
  HubContentDocument: string | undefined;
  SupportStatus?: HubContentSupportStatus | undefined;
  HubContentSearchKeywords?: string[] | undefined;
  Tags?: Tag[] | undefined;
}
export interface ImportHubContentResponse {
  HubArn: string | undefined;
  HubContentArn: string | undefined;
}
export declare const InferenceComponentSortKey: {
  readonly CreationTime: "CreationTime";
  readonly Name: "Name";
  readonly Status: "Status";
};
export type InferenceComponentSortKey =
  (typeof InferenceComponentSortKey)[keyof typeof InferenceComponentSortKey];
export interface InferenceComponentSummary {
  CreationTime: Date | undefined;
  InferenceComponentArn: string | undefined;
  InferenceComponentName: string | undefined;
  EndpointArn: string | undefined;
  EndpointName: string | undefined;
  VariantName: string | undefined;
  InferenceComponentStatus?: InferenceComponentStatus | undefined;
  LastModifiedTime: Date | undefined;
}
export interface InferenceExperimentSummary {
  Name: string | undefined;
  Type: InferenceExperimentType | undefined;
  Schedule?: InferenceExperimentSchedule | undefined;
  Status: InferenceExperimentStatus | undefined;
  StatusReason?: string | undefined;
  Description?: string | undefined;
  CreationTime: Date | undefined;
  CompletionTime?: Date | undefined;
  LastModifiedTime: Date | undefined;
  RoleArn?: string | undefined;
}
export declare const InferenceExperimentStopDesiredState: {
  readonly CANCELLED: "Cancelled";
  readonly COMPLETED: "Completed";
};
export type InferenceExperimentStopDesiredState =
  (typeof InferenceExperimentStopDesiredState)[keyof typeof InferenceExperimentStopDesiredState];
export interface InferenceRecommendationsJob {
  JobName: string | undefined;
  JobDescription: string | undefined;
  JobType: RecommendationJobType | undefined;
  JobArn: string | undefined;
  Status: RecommendationJobStatus | undefined;
  CreationTime: Date | undefined;
  CompletionTime?: Date | undefined;
  RoleArn: string | undefined;
  LastModifiedTime: Date | undefined;
  FailureReason?: string | undefined;
  ModelName?: string | undefined;
  SamplePayloadUrl?: string | undefined;
  ModelPackageVersionArn?: string | undefined;
}
export interface RecommendationJobInferenceBenchmark {
  Metrics?: RecommendationMetrics | undefined;
  EndpointMetrics?: InferenceMetrics | undefined;
  EndpointConfiguration?: EndpointOutputConfiguration | undefined;
  ModelConfiguration: ModelConfiguration | undefined;
  FailureReason?: string | undefined;
  InvocationEndTime?: Date | undefined;
  InvocationStartTime?: Date | undefined;
}
export declare const RecommendationStepType: {
  readonly BENCHMARK: "BENCHMARK";
};
export type RecommendationStepType =
  (typeof RecommendationStepType)[keyof typeof RecommendationStepType];
export interface InferenceRecommendationsJobStep {
  StepType: RecommendationStepType | undefined;
  JobName: string | undefined;
  Status: RecommendationJobStatus | undefined;
  InferenceBenchmark?: RecommendationJobInferenceBenchmark | undefined;
}
export interface LabelCountersForWorkteam {
  HumanLabeled?: number | undefined;
  PendingHuman?: number | undefined;
  Total?: number | undefined;
}
export interface LabelingJobForWorkteamSummary {
  LabelingJobName?: string | undefined;
  JobReferenceCode: string | undefined;
  WorkRequesterAccountId: string | undefined;
  CreationTime: Date | undefined;
  LabelCounters?: LabelCountersForWorkteam | undefined;
  NumberOfHumanWorkersPerDataObject?: number | undefined;
}
export interface LabelingJobSummary {
  LabelingJobName: string | undefined;
  LabelingJobArn: string | undefined;
  CreationTime: Date | undefined;
  LastModifiedTime: Date | undefined;
  LabelingJobStatus: LabelingJobStatus | undefined;
  LabelCounters: LabelCounters | undefined;
  WorkteamArn: string | undefined;
  PreHumanTaskLambdaArn?: string | undefined;
  AnnotationConsolidationLambdaArn?: string | undefined;
  FailureReason?: string | undefined;
  LabelingJobOutput?: LabelingJobOutput | undefined;
  InputConfig?: LabelingJobInputConfig | undefined;
}
export interface LambdaStepMetadata {
  Arn?: string | undefined;
  OutputParameters?: OutputParameter[] | undefined;
}
export interface LineageGroupSummary {
  LineageGroupArn?: string | undefined;
  LineageGroupName?: string | undefined;
  DisplayName?: string | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
}
export declare const LineageType: {
  readonly ACTION: "Action";
  readonly ARTIFACT: "Artifact";
  readonly CONTEXT: "Context";
  readonly TRIAL_COMPONENT: "TrialComponent";
};
export type LineageType = (typeof LineageType)[keyof typeof LineageType];
export declare const SortActionsBy: {
  readonly CREATION_TIME: "CreationTime";
  readonly NAME: "Name";
};
export type SortActionsBy = (typeof SortActionsBy)[keyof typeof SortActionsBy];
export declare const SortOrder: {
  readonly ASCENDING: "Ascending";
  readonly DESCENDING: "Descending";
};
export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];
export interface ListActionsRequest {
  SourceUri?: string | undefined;
  ActionType?: string | undefined;
  CreatedAfter?: Date | undefined;
  CreatedBefore?: Date | undefined;
  SortBy?: SortActionsBy | undefined;
  SortOrder?: SortOrder | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface ListActionsResponse {
  ActionSummaries?: ActionSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListAlgorithmsInput {
  CreationTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  MaxResults?: number | undefined;
  NameContains?: string | undefined;
  NextToken?: string | undefined;
  SortBy?: AlgorithmSortBy | undefined;
  SortOrder?: SortOrder | undefined;
}
export interface ListAlgorithmsOutput {
  AlgorithmSummaryList: AlgorithmSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListAliasesRequest {
  ImageName: string | undefined;
  Alias?: string | undefined;
  Version?: number | undefined;
  MaxResults?: number | undefined;
  NextToken?: string | undefined;
}
export interface ListAliasesResponse {
  SageMakerImageVersionAliases?: string[] | undefined;
  NextToken?: string | undefined;
}
export interface ListAppImageConfigsRequest {
  MaxResults?: number | undefined;
  NextToken?: string | undefined;
  NameContains?: string | undefined;
  CreationTimeBefore?: Date | undefined;
  CreationTimeAfter?: Date | undefined;
  ModifiedTimeBefore?: Date | undefined;
  ModifiedTimeAfter?: Date | undefined;
  SortBy?: AppImageConfigSortKey | undefined;
  SortOrder?: SortOrder | undefined;
}
export interface ListAppImageConfigsResponse {
  NextToken?: string | undefined;
  AppImageConfigs?: AppImageConfigDetails[] | undefined;
}
export interface ListAppsRequest {
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  SortOrder?: SortOrder | undefined;
  SortBy?: AppSortKey | undefined;
  DomainIdEquals?: string | undefined;
  UserProfileNameEquals?: string | undefined;
  SpaceNameEquals?: string | undefined;
}
export interface ListAppsResponse {
  Apps?: AppDetails[] | undefined;
  NextToken?: string | undefined;
}
export declare const SortArtifactsBy: {
  readonly CREATION_TIME: "CreationTime";
};
export type SortArtifactsBy =
  (typeof SortArtifactsBy)[keyof typeof SortArtifactsBy];
export interface ListArtifactsRequest {
  SourceUri?: string | undefined;
  ArtifactType?: string | undefined;
  CreatedAfter?: Date | undefined;
  CreatedBefore?: Date | undefined;
  SortBy?: SortArtifactsBy | undefined;
  SortOrder?: SortOrder | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface ListArtifactsResponse {
  ArtifactSummaries?: ArtifactSummary[] | undefined;
  NextToken?: string | undefined;
}
export declare const SortAssociationsBy: {
  readonly CREATION_TIME: "CreationTime";
  readonly DESTINATION_ARN: "DestinationArn";
  readonly DESTINATION_TYPE: "DestinationType";
  readonly SOURCE_ARN: "SourceArn";
  readonly SOURCE_TYPE: "SourceType";
};
export type SortAssociationsBy =
  (typeof SortAssociationsBy)[keyof typeof SortAssociationsBy];
export interface ListAssociationsRequest {
  SourceArn?: string | undefined;
  DestinationArn?: string | undefined;
  SourceType?: string | undefined;
  DestinationType?: string | undefined;
  AssociationType?: AssociationEdgeType | undefined;
  CreatedAfter?: Date | undefined;
  CreatedBefore?: Date | undefined;
  SortBy?: SortAssociationsBy | undefined;
  SortOrder?: SortOrder | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface ListAssociationsResponse {
  AssociationSummaries?: AssociationSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListAutoMLJobsRequest {
  CreationTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  LastModifiedTimeAfter?: Date | undefined;
  LastModifiedTimeBefore?: Date | undefined;
  NameContains?: string | undefined;
  StatusEquals?: AutoMLJobStatus | undefined;
  SortOrder?: AutoMLSortOrder | undefined;
  SortBy?: AutoMLSortBy | undefined;
  MaxResults?: number | undefined;
  NextToken?: string | undefined;
}
export interface ListAutoMLJobsResponse {
  AutoMLJobSummaries: AutoMLJobSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListCandidatesForAutoMLJobRequest {
  AutoMLJobName: string | undefined;
  StatusEquals?: CandidateStatus | undefined;
  CandidateNameEquals?: string | undefined;
  SortOrder?: AutoMLSortOrder | undefined;
  SortBy?: CandidateSortBy | undefined;
  MaxResults?: number | undefined;
  NextToken?: string | undefined;
}
export interface ListCandidatesForAutoMLJobResponse {
  Candidates: AutoMLCandidate[] | undefined;
  NextToken?: string | undefined;
}
export interface ListClusterNodesRequest {
  ClusterName: string | undefined;
  CreationTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  InstanceGroupNameContains?: string | undefined;
  MaxResults?: number | undefined;
  NextToken?: string | undefined;
  SortBy?: ClusterSortBy | undefined;
  SortOrder?: SortOrder | undefined;
}
export interface ListClusterNodesResponse {
  NextToken?: string | undefined;
  ClusterNodeSummaries: ClusterNodeSummary[] | undefined;
}
export interface ListClustersRequest {
  CreationTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  MaxResults?: number | undefined;
  NameContains?: string | undefined;
  NextToken?: string | undefined;
  SortBy?: ClusterSortBy | undefined;
  SortOrder?: SortOrder | undefined;
  TrainingPlanArn?: string | undefined;
}
export interface ListClustersResponse {
  NextToken?: string | undefined;
  ClusterSummaries: ClusterSummary[] | undefined;
}
export declare const SortClusterSchedulerConfigBy: {
  readonly CREATION_TIME: "CreationTime";
  readonly NAME: "Name";
  readonly STATUS: "Status";
};
export type SortClusterSchedulerConfigBy =
  (typeof SortClusterSchedulerConfigBy)[keyof typeof SortClusterSchedulerConfigBy];
export interface ListClusterSchedulerConfigsRequest {
  CreatedAfter?: Date | undefined;
  CreatedBefore?: Date | undefined;
  NameContains?: string | undefined;
  ClusterArn?: string | undefined;
  Status?: SchedulerResourceStatus | undefined;
  SortBy?: SortClusterSchedulerConfigBy | undefined;
  SortOrder?: SortOrder | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface ListClusterSchedulerConfigsResponse {
  ClusterSchedulerConfigSummaries?: ClusterSchedulerConfigSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListCodeRepositoriesInput {
  CreationTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  LastModifiedTimeAfter?: Date | undefined;
  LastModifiedTimeBefore?: Date | undefined;
  MaxResults?: number | undefined;
  NameContains?: string | undefined;
  NextToken?: string | undefined;
  SortBy?: CodeRepositorySortBy | undefined;
  SortOrder?: CodeRepositorySortOrder | undefined;
}
export interface ListCodeRepositoriesOutput {
  CodeRepositorySummaryList: CodeRepositorySummary[] | undefined;
  NextToken?: string | undefined;
}
export declare const ListCompilationJobsSortBy: {
  readonly CREATION_TIME: "CreationTime";
  readonly NAME: "Name";
  readonly STATUS: "Status";
};
export type ListCompilationJobsSortBy =
  (typeof ListCompilationJobsSortBy)[keyof typeof ListCompilationJobsSortBy];
export interface ListCompilationJobsRequest {
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  CreationTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  LastModifiedTimeAfter?: Date | undefined;
  LastModifiedTimeBefore?: Date | undefined;
  NameContains?: string | undefined;
  StatusEquals?: CompilationJobStatus | undefined;
  SortBy?: ListCompilationJobsSortBy | undefined;
  SortOrder?: SortOrder | undefined;
}
export interface ListCompilationJobsResponse {
  CompilationJobSummaries: CompilationJobSummary[] | undefined;
  NextToken?: string | undefined;
}
export declare const DescribeModelCardResponseFilterSensitiveLog: (
  obj: DescribeModelCardResponse
) => any;
export declare const DescribeModelPackageOutputFilterSensitiveLog: (
  obj: DescribeModelPackageOutput
) => any;
