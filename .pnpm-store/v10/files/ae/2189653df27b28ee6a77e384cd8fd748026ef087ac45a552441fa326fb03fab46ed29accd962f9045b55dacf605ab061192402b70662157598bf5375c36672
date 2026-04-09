import {
  _InstanceType,
  AccountDefaultStatus,
  ActionStatus,
  ActivationState,
  AppNetworkAccessType,
  AppSecurityGroupManagement,
  AppType,
  BatchStrategy,
  BooleanOperator,
  ClusterNodeProvisioningMode,
  ClusterNodeRecovery,
  CrossAccountFilterOption,
  Direction,
  EndpointStatus,
  FeatureStatus,
  HubContentSupportStatus,
  HubContentType,
  InferenceExperimentStopDesiredState,
  IPAddressType,
  JobType,
  LineageType,
  ListWorkforcesSortByOptions,
  ListWorkteamsSortByOptions,
  ModelApprovalStatus,
  ModelCardStatus,
  ModelPackageGroupStatus,
  ModelPackageRegistrationType,
  ModelPackageStatus,
  ModelRegistrationMode,
  ModelVariantAction,
  MonitoringType,
  NotebookInstanceAcceleratorType,
  PipelineExecutionStatus,
  PipelineStatus,
  ProcessingJobStatus,
  Processor,
  ProjectSortBy,
  ProjectSortOrder,
  ProjectStatus,
  Relation,
  ReservedCapacityInstanceType,
  ReservedCapacityType,
  ResourceCatalogSortBy,
  ResourceCatalogSortOrder,
  ResourceType,
  RootAccess,
  SageMakerResourceName,
  ScheduleStatus,
  SearchSortOrder,
  SecondaryStatus,
  SharingType,
  SkipModelValidation,
  SortBy,
  SortOrder,
  SortTrialComponentsBy,
  SortTrialsBy,
  SpaceSortKey,
  SpaceStatus,
  StudioLifecycleConfigAppType,
  StudioLifecycleConfigSortKey,
  TagPropagation,
  ThroughputMode,
  TrackingServerSize,
  TrainingJobSortByOptions,
  TrainingJobStatus,
  TrainingPlanFilterName,
  TrainingPlanSortBy,
  TrainingPlanSortOrder,
  TrainingPlanStatus,
  TransformJobStatus,
  UltraServerHealthStatus,
  UserProfileSortKey,
  UserProfileStatus,
  VariantPropertyType,
  VendorGuidance,
  WarmPoolResourceStatus,
  WorkforceIpAddressType,
} from "./enums";
import {
  AlgorithmSpecification,
  AppSpecification,
  BatchDataCaptureConfig,
  BatchTransformInput,
  CfnUpdateTemplateProvider,
  CheckpointConfig,
  ClusterAutoScalingConfig,
  ClusterOrchestrator,
  ClusterTieredStorageConfig,
  CodeEditorAppImageConfig,
  ComputeQuotaConfig,
  ComputeQuotaTarget,
  DeploymentConfiguration,
  InferenceSpecification,
  JupyterLabAppImageConfig,
  KernelGatewayImageConfig,
  MetadataProperties,
  OutputDataConfig,
  ResourceConfig,
  SchedulerConfig,
  StoppingCondition,
  TransformInput,
  TransformOutput,
  TransformResources,
  UserContext,
  VpcConfig,
  AdditionalInferenceSpecificationDefinition,
  Channel,
  ClusterInstanceGroupSpecification,
  ClusterRestrictedInstanceGroupSpecification,
  ContainerDefinition,
  OutputParameter,
  Tag,
} from "./models_0";
import {
  DefaultSpaceSettings,
  DeploymentConfig,
  DriftCheckBaselines,
  EdgeOutputConfig,
  ExperimentConfig,
  InferenceComponentRuntimeConfig,
  InferenceComponentSpecification,
  InferenceExecutionConfig,
  InferenceExperimentDataStorageConfig,
  InferenceExperimentSchedule,
  InstanceMetadataServiceConfiguration,
  ModelCardSecurityConfig,
  ModelLifeCycle,
  ModelMetrics,
  ModelPackageModelCard,
  ModelPackageSecurityConfig,
  ModelPackageValidationSpecification,
  MonitoringScheduleConfig,
  NetworkConfig,
  ParallelismConfiguration,
  PartnerAppConfig,
  PartnerAppMaintenanceConfig,
  PipelineDefinitionS3Location,
  ProcessingOutputConfig,
  ProcessingResources,
  ProcessingStoppingCondition,
  RetryStrategy,
  ServiceCatalogProvisioningDetails,
  ShadowModeConfig,
  SourceAlgorithmSpecification,
  TtlDuration,
  UiTemplate,
  UserSettings,
  FeatureDefinition,
  ModelVariantConfig,
  NotebookInstanceLifecycleHook,
  ProcessingInput,
  ProvisioningParameter,
} from "./models_1";
import {
  DataProcessing,
  DebugHookConfig,
  DeploymentRecommendation,
  InferenceComponentDeploymentConfig,
  ModelArtifacts,
  ModelClientConfig,
  ModelPackageConfig,
  ModelPackageStatusDetails,
  MonitoringExecutionSummary,
  NotificationConfiguration,
  OidcConfig,
  PipelineExperimentConfig,
  ProfilerConfig,
  SourceIpConfig,
  SpaceSettings,
  SpaceStorageSettings,
  TensorBoardOutputConfig,
  TrialComponentStatus,
  WorkerAccessConfiguration,
  WorkforceVpcConfigRequest,
  DebugRuleConfiguration,
  DebugRuleEvaluationStatus,
  FeatureParameter,
  HyperParameterTrainingJobSummary,
  MemberDefinition,
  ProfilerRuleConfiguration,
  TrialComponentArtifact,
  TrialComponentParameterValue,
} from "./models_2";
import {
  DomainSettingsForUpdate,
  Endpoint,
  Experiment,
  FeatureGroup,
  FeatureMetadata,
  GitConfigForUpdate,
  HyperParameterTuningJobSearchEntity,
  SelectiveExecutionConfig,
  ServiceCatalogProvisionedProductDetails,
  TrialComponentSource,
  TrialSource,
  WarmPoolStatus,
  DesiredWeightAndCapacity,
  Device,
  DeviceDeploymentSummary,
  Edge,
  Filter,
  MetricData,
  MonitoringAlertSummary,
  Parameter,
  PipelineSummary,
  ReservedCapacitySummary,
  SecondaryStatusTransition,
  SubscribedWorkteam,
  TemplateProviderDetail,
  TrialComponentMetricSummary,
  Workforce,
  Workteam,
} from "./models_3";
export interface ListPipelinesResponse {
  PipelineSummaries?: PipelineSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListPipelineVersionsRequest {
  PipelineName: string | undefined;
  CreatedAfter?: Date | undefined;
  CreatedBefore?: Date | undefined;
  SortOrder?: SortOrder | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface PipelineVersionSummary {
  PipelineArn?: string | undefined;
  PipelineVersionId?: number | undefined;
  CreationTime?: Date | undefined;
  PipelineVersionDescription?: string | undefined;
  PipelineVersionDisplayName?: string | undefined;
  LastExecutionPipelineExecutionArn?: string | undefined;
}
export interface ListPipelineVersionsResponse {
  PipelineVersionSummaries?: PipelineVersionSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListProcessingJobsRequest {
  CreationTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  LastModifiedTimeAfter?: Date | undefined;
  LastModifiedTimeBefore?: Date | undefined;
  NameContains?: string | undefined;
  StatusEquals?: ProcessingJobStatus | undefined;
  SortBy?: SortBy | undefined;
  SortOrder?: SortOrder | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface ProcessingJobSummary {
  ProcessingJobName: string | undefined;
  ProcessingJobArn: string | undefined;
  CreationTime: Date | undefined;
  ProcessingEndTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  ProcessingJobStatus: ProcessingJobStatus | undefined;
  FailureReason?: string | undefined;
  ExitMessage?: string | undefined;
}
export interface ListProcessingJobsResponse {
  ProcessingJobSummaries: ProcessingJobSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListProjectsInput {
  CreationTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  MaxResults?: number | undefined;
  NameContains?: string | undefined;
  NextToken?: string | undefined;
  SortBy?: ProjectSortBy | undefined;
  SortOrder?: ProjectSortOrder | undefined;
}
export interface ProjectSummary {
  ProjectName: string | undefined;
  ProjectDescription?: string | undefined;
  ProjectArn: string | undefined;
  ProjectId: string | undefined;
  CreationTime: Date | undefined;
  ProjectStatus: ProjectStatus | undefined;
}
export interface ListProjectsOutput {
  ProjectSummaryList: ProjectSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListResourceCatalogsRequest {
  NameContains?: string | undefined;
  CreationTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  SortOrder?: ResourceCatalogSortOrder | undefined;
  SortBy?: ResourceCatalogSortBy | undefined;
  MaxResults?: number | undefined;
  NextToken?: string | undefined;
}
export interface ResourceCatalog {
  ResourceCatalogArn: string | undefined;
  ResourceCatalogName: string | undefined;
  Description: string | undefined;
  CreationTime: Date | undefined;
}
export interface ListResourceCatalogsResponse {
  ResourceCatalogs?: ResourceCatalog[] | undefined;
  NextToken?: string | undefined;
}
export interface ListSpacesRequest {
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  SortOrder?: SortOrder | undefined;
  SortBy?: SpaceSortKey | undefined;
  DomainIdEquals?: string | undefined;
  SpaceNameContains?: string | undefined;
}
export interface OwnershipSettingsSummary {
  OwnerUserProfileName?: string | undefined;
}
export interface SpaceSettingsSummary {
  AppType?: AppType | undefined;
  RemoteAccess?: FeatureStatus | undefined;
  SpaceStorageSettings?: SpaceStorageSettings | undefined;
}
export interface SpaceSharingSettingsSummary {
  SharingType?: SharingType | undefined;
}
export interface SpaceDetails {
  DomainId?: string | undefined;
  SpaceName?: string | undefined;
  Status?: SpaceStatus | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  SpaceSettingsSummary?: SpaceSettingsSummary | undefined;
  SpaceSharingSettingsSummary?: SpaceSharingSettingsSummary | undefined;
  OwnershipSettingsSummary?: OwnershipSettingsSummary | undefined;
  SpaceDisplayName?: string | undefined;
}
export interface ListSpacesResponse {
  Spaces?: SpaceDetails[] | undefined;
  NextToken?: string | undefined;
}
export interface ListStageDevicesRequest {
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  EdgeDeploymentPlanName: string | undefined;
  ExcludeDevicesDeployedInOtherStage?: boolean | undefined;
  StageName: string | undefined;
}
export interface ListStageDevicesResponse {
  DeviceDeploymentSummaries: DeviceDeploymentSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListStudioLifecycleConfigsRequest {
  MaxResults?: number | undefined;
  NextToken?: string | undefined;
  NameContains?: string | undefined;
  AppTypeEquals?: StudioLifecycleConfigAppType | undefined;
  CreationTimeBefore?: Date | undefined;
  CreationTimeAfter?: Date | undefined;
  ModifiedTimeBefore?: Date | undefined;
  ModifiedTimeAfter?: Date | undefined;
  SortBy?: StudioLifecycleConfigSortKey | undefined;
  SortOrder?: SortOrder | undefined;
}
export interface StudioLifecycleConfigDetails {
  StudioLifecycleConfigArn?: string | undefined;
  StudioLifecycleConfigName?: string | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  StudioLifecycleConfigAppType?: StudioLifecycleConfigAppType | undefined;
}
export interface ListStudioLifecycleConfigsResponse {
  NextToken?: string | undefined;
  StudioLifecycleConfigs?: StudioLifecycleConfigDetails[] | undefined;
}
export interface ListSubscribedWorkteamsRequest {
  NameContains?: string | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface ListSubscribedWorkteamsResponse {
  SubscribedWorkteams: SubscribedWorkteam[] | undefined;
  NextToken?: string | undefined;
}
export interface ListTagsInput {
  ResourceArn: string | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface ListTagsOutput {
  Tags?: Tag[] | undefined;
  NextToken?: string | undefined;
}
export interface ListTrainingJobsRequest {
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  CreationTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  LastModifiedTimeAfter?: Date | undefined;
  LastModifiedTimeBefore?: Date | undefined;
  NameContains?: string | undefined;
  StatusEquals?: TrainingJobStatus | undefined;
  SortBy?: SortBy | undefined;
  SortOrder?: SortOrder | undefined;
  WarmPoolStatusEquals?: WarmPoolResourceStatus | undefined;
  TrainingPlanArnEquals?: string | undefined;
}
export interface TrainingJobSummary {
  TrainingJobName: string | undefined;
  TrainingJobArn: string | undefined;
  CreationTime: Date | undefined;
  TrainingEndTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  TrainingJobStatus: TrainingJobStatus | undefined;
  SecondaryStatus?: SecondaryStatus | undefined;
  WarmPoolStatus?: WarmPoolStatus | undefined;
  TrainingPlanArn?: string | undefined;
}
export interface ListTrainingJobsResponse {
  TrainingJobSummaries: TrainingJobSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListTrainingJobsForHyperParameterTuningJobRequest {
  HyperParameterTuningJobName: string | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  StatusEquals?: TrainingJobStatus | undefined;
  SortBy?: TrainingJobSortByOptions | undefined;
  SortOrder?: SortOrder | undefined;
}
export interface ListTrainingJobsForHyperParameterTuningJobResponse {
  TrainingJobSummaries: HyperParameterTrainingJobSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface TrainingPlanFilter {
  Name: TrainingPlanFilterName | undefined;
  Value: string | undefined;
}
export interface ListTrainingPlansRequest {
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  StartTimeAfter?: Date | undefined;
  StartTimeBefore?: Date | undefined;
  SortBy?: TrainingPlanSortBy | undefined;
  SortOrder?: TrainingPlanSortOrder | undefined;
  Filters?: TrainingPlanFilter[] | undefined;
}
export interface TrainingPlanSummary {
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
  TotalUltraServerCount?: number | undefined;
  TargetResources?: SageMakerResourceName[] | undefined;
  ReservedCapacitySummaries?: ReservedCapacitySummary[] | undefined;
}
export interface ListTrainingPlansResponse {
  NextToken?: string | undefined;
  TrainingPlanSummaries: TrainingPlanSummary[] | undefined;
}
export interface ListTransformJobsRequest {
  CreationTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  LastModifiedTimeAfter?: Date | undefined;
  LastModifiedTimeBefore?: Date | undefined;
  NameContains?: string | undefined;
  StatusEquals?: TransformJobStatus | undefined;
  SortBy?: SortBy | undefined;
  SortOrder?: SortOrder | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface TransformJobSummary {
  TransformJobName: string | undefined;
  TransformJobArn: string | undefined;
  CreationTime: Date | undefined;
  TransformEndTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  TransformJobStatus: TransformJobStatus | undefined;
  FailureReason?: string | undefined;
}
export interface ListTransformJobsResponse {
  TransformJobSummaries: TransformJobSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListTrialComponentsRequest {
  ExperimentName?: string | undefined;
  TrialName?: string | undefined;
  SourceArn?: string | undefined;
  CreatedAfter?: Date | undefined;
  CreatedBefore?: Date | undefined;
  SortBy?: SortTrialComponentsBy | undefined;
  SortOrder?: SortOrder | undefined;
  MaxResults?: number | undefined;
  NextToken?: string | undefined;
}
export interface TrialComponentSummary {
  TrialComponentName?: string | undefined;
  TrialComponentArn?: string | undefined;
  DisplayName?: string | undefined;
  TrialComponentSource?: TrialComponentSource | undefined;
  Status?: TrialComponentStatus | undefined;
  StartTime?: Date | undefined;
  EndTime?: Date | undefined;
  CreationTime?: Date | undefined;
  CreatedBy?: UserContext | undefined;
  LastModifiedTime?: Date | undefined;
  LastModifiedBy?: UserContext | undefined;
}
export interface ListTrialComponentsResponse {
  TrialComponentSummaries?: TrialComponentSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListTrialsRequest {
  ExperimentName?: string | undefined;
  TrialComponentName?: string | undefined;
  CreatedAfter?: Date | undefined;
  CreatedBefore?: Date | undefined;
  SortBy?: SortTrialsBy | undefined;
  SortOrder?: SortOrder | undefined;
  MaxResults?: number | undefined;
  NextToken?: string | undefined;
}
export interface TrialSummary {
  TrialArn?: string | undefined;
  TrialName?: string | undefined;
  DisplayName?: string | undefined;
  TrialSource?: TrialSource | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
}
export interface ListTrialsResponse {
  TrialSummaries?: TrialSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListUltraServersByReservedCapacityRequest {
  ReservedCapacityArn: string | undefined;
  MaxResults?: number | undefined;
  NextToken?: string | undefined;
}
export interface UltraServer {
  UltraServerId: string | undefined;
  UltraServerType: string | undefined;
  AvailabilityZone: string | undefined;
  InstanceType: ReservedCapacityInstanceType | undefined;
  TotalInstanceCount: number | undefined;
  ConfiguredSpareInstanceCount?: number | undefined;
  AvailableInstanceCount?: number | undefined;
  InUseInstanceCount?: number | undefined;
  AvailableSpareInstanceCount?: number | undefined;
  UnhealthyInstanceCount?: number | undefined;
  HealthStatus?: UltraServerHealthStatus | undefined;
}
export interface ListUltraServersByReservedCapacityResponse {
  NextToken?: string | undefined;
  UltraServers: UltraServer[] | undefined;
}
export interface ListUserProfilesRequest {
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  SortOrder?: SortOrder | undefined;
  SortBy?: UserProfileSortKey | undefined;
  DomainIdEquals?: string | undefined;
  UserProfileNameContains?: string | undefined;
}
export interface UserProfileDetails {
  DomainId?: string | undefined;
  UserProfileName?: string | undefined;
  Status?: UserProfileStatus | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
}
export interface ListUserProfilesResponse {
  UserProfiles?: UserProfileDetails[] | undefined;
  NextToken?: string | undefined;
}
export interface ListWorkforcesRequest {
  SortBy?: ListWorkforcesSortByOptions | undefined;
  SortOrder?: SortOrder | undefined;
  NameContains?: string | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface ListWorkforcesResponse {
  Workforces: Workforce[] | undefined;
  NextToken?: string | undefined;
}
export interface ListWorkteamsRequest {
  SortBy?: ListWorkteamsSortByOptions | undefined;
  SortOrder?: SortOrder | undefined;
  NameContains?: string | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface ListWorkteamsResponse {
  Workteams: Workteam[] | undefined;
  NextToken?: string | undefined;
}
export interface Model {
  ModelName?: string | undefined;
  PrimaryContainer?: ContainerDefinition | undefined;
  Containers?: ContainerDefinition[] | undefined;
  InferenceExecutionConfig?: InferenceExecutionConfig | undefined;
  ExecutionRoleArn?: string | undefined;
  VpcConfig?: VpcConfig | undefined;
  CreationTime?: Date | undefined;
  ModelArn?: string | undefined;
  EnableNetworkIsolation?: boolean | undefined;
  Tags?: Tag[] | undefined;
  DeploymentRecommendation?: DeploymentRecommendation | undefined;
}
export interface ModelCard {
  ModelCardArn?: string | undefined;
  ModelCardName?: string | undefined;
  ModelCardVersion?: number | undefined;
  Content?: string | undefined;
  ModelCardStatus?: ModelCardStatus | undefined;
  SecurityConfig?: ModelCardSecurityConfig | undefined;
  CreationTime?: Date | undefined;
  CreatedBy?: UserContext | undefined;
  LastModifiedTime?: Date | undefined;
  LastModifiedBy?: UserContext | undefined;
  Tags?: Tag[] | undefined;
  ModelId?: string | undefined;
  RiskRating?: string | undefined;
  ModelPackageGroupName?: string | undefined;
}
export interface ModelDashboardEndpoint {
  EndpointName: string | undefined;
  EndpointArn: string | undefined;
  CreationTime: Date | undefined;
  LastModifiedTime: Date | undefined;
  EndpointStatus: EndpointStatus | undefined;
}
export interface TransformJob {
  TransformJobName?: string | undefined;
  TransformJobArn?: string | undefined;
  TransformJobStatus?: TransformJobStatus | undefined;
  FailureReason?: string | undefined;
  ModelName?: string | undefined;
  MaxConcurrentTransforms?: number | undefined;
  ModelClientConfig?: ModelClientConfig | undefined;
  MaxPayloadInMB?: number | undefined;
  BatchStrategy?: BatchStrategy | undefined;
  Environment?: Record<string, string> | undefined;
  TransformInput?: TransformInput | undefined;
  TransformOutput?: TransformOutput | undefined;
  DataCaptureConfig?: BatchDataCaptureConfig | undefined;
  TransformResources?: TransformResources | undefined;
  CreationTime?: Date | undefined;
  TransformStartTime?: Date | undefined;
  TransformEndTime?: Date | undefined;
  LabelingJobArn?: string | undefined;
  AutoMLJobArn?: string | undefined;
  DataProcessing?: DataProcessing | undefined;
  ExperimentConfig?: ExperimentConfig | undefined;
  Tags?: Tag[] | undefined;
}
export interface ModelDashboardModelCard {
  ModelCardArn?: string | undefined;
  ModelCardName?: string | undefined;
  ModelCardVersion?: number | undefined;
  ModelCardStatus?: ModelCardStatus | undefined;
  SecurityConfig?: ModelCardSecurityConfig | undefined;
  CreationTime?: Date | undefined;
  CreatedBy?: UserContext | undefined;
  LastModifiedTime?: Date | undefined;
  LastModifiedBy?: UserContext | undefined;
  Tags?: Tag[] | undefined;
  ModelId?: string | undefined;
  RiskRating?: string | undefined;
}
export interface ModelDashboardMonitoringSchedule {
  MonitoringScheduleArn?: string | undefined;
  MonitoringScheduleName?: string | undefined;
  MonitoringScheduleStatus?: ScheduleStatus | undefined;
  MonitoringType?: MonitoringType | undefined;
  FailureReason?: string | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  MonitoringScheduleConfig?: MonitoringScheduleConfig | undefined;
  EndpointName?: string | undefined;
  MonitoringAlertSummaries?: MonitoringAlertSummary[] | undefined;
  LastMonitoringExecutionSummary?: MonitoringExecutionSummary | undefined;
  BatchTransformInput?: BatchTransformInput | undefined;
}
export interface ModelDashboardModel {
  Model?: Model | undefined;
  Endpoints?: ModelDashboardEndpoint[] | undefined;
  LastBatchTransformJob?: TransformJob | undefined;
  MonitoringSchedules?: ModelDashboardMonitoringSchedule[] | undefined;
  ModelCard?: ModelDashboardModelCard | undefined;
}
export interface ModelPackage {
  ModelPackageName?: string | undefined;
  ModelPackageGroupName?: string | undefined;
  ModelPackageVersion?: number | undefined;
  ModelPackageRegistrationType?: ModelPackageRegistrationType | undefined;
  ModelPackageArn?: string | undefined;
  ModelPackageDescription?: string | undefined;
  CreationTime?: Date | undefined;
  InferenceSpecification?: InferenceSpecification | undefined;
  SourceAlgorithmSpecification?: SourceAlgorithmSpecification | undefined;
  ValidationSpecification?: ModelPackageValidationSpecification | undefined;
  ModelPackageStatus?: ModelPackageStatus | undefined;
  ModelPackageStatusDetails?: ModelPackageStatusDetails | undefined;
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
  AdditionalInferenceSpecifications?:
    | AdditionalInferenceSpecificationDefinition[]
    | undefined;
  SourceUri?: string | undefined;
  SecurityConfig?: ModelPackageSecurityConfig | undefined;
  ModelCard?: ModelPackageModelCard | undefined;
  ModelLifeCycle?: ModelLifeCycle | undefined;
  Tags?: Tag[] | undefined;
  CustomerMetadataProperties?: Record<string, string> | undefined;
  DriftCheckBaselines?: DriftCheckBaselines | undefined;
  SkipModelValidation?: SkipModelValidation | undefined;
}
export interface ModelPackageGroup {
  ModelPackageGroupName?: string | undefined;
  ModelPackageGroupArn?: string | undefined;
  ModelPackageGroupDescription?: string | undefined;
  CreationTime?: Date | undefined;
  CreatedBy?: UserContext | undefined;
  ModelPackageGroupStatus?: ModelPackageGroupStatus | undefined;
  Tags?: Tag[] | undefined;
}
export interface NestedFilters {
  NestedPropertyName: string | undefined;
  Filters: Filter[] | undefined;
}
export interface OnlineStoreConfigUpdate {
  TtlDuration?: TtlDuration | undefined;
}
export interface Parent {
  TrialName?: string | undefined;
  ExperimentName?: string | undefined;
}
export interface Pipeline {
  PipelineArn?: string | undefined;
  PipelineName?: string | undefined;
  PipelineDisplayName?: string | undefined;
  PipelineDescription?: string | undefined;
  RoleArn?: string | undefined;
  PipelineStatus?: PipelineStatus | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  LastRunTime?: Date | undefined;
  CreatedBy?: UserContext | undefined;
  LastModifiedBy?: UserContext | undefined;
  ParallelismConfiguration?: ParallelismConfiguration | undefined;
  Tags?: Tag[] | undefined;
}
export interface PipelineExecution {
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
  PipelineParameters?: Parameter[] | undefined;
  PipelineVersionId?: number | undefined;
  PipelineVersionDisplayName?: string | undefined;
}
export interface PipelineVersion {
  PipelineArn?: string | undefined;
  PipelineVersionId?: number | undefined;
  PipelineVersionDisplayName?: string | undefined;
  PipelineVersionDescription?: string | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  CreatedBy?: UserContext | undefined;
  LastModifiedBy?: UserContext | undefined;
  LastExecutedPipelineExecutionArn?: string | undefined;
  LastExecutedPipelineExecutionDisplayName?: string | undefined;
  LastExecutedPipelineExecutionStatus?: PipelineExecutionStatus | undefined;
}
export interface ProcessingJob {
  ProcessingInputs?: ProcessingInput[] | undefined;
  ProcessingOutputConfig?: ProcessingOutputConfig | undefined;
  ProcessingJobName?: string | undefined;
  ProcessingResources?: ProcessingResources | undefined;
  StoppingCondition?: ProcessingStoppingCondition | undefined;
  AppSpecification?: AppSpecification | undefined;
  Environment?: Record<string, string> | undefined;
  NetworkConfig?: NetworkConfig | undefined;
  RoleArn?: string | undefined;
  ExperimentConfig?: ExperimentConfig | undefined;
  ProcessingJobArn?: string | undefined;
  ProcessingJobStatus?: ProcessingJobStatus | undefined;
  ExitMessage?: string | undefined;
  FailureReason?: string | undefined;
  ProcessingEndTime?: Date | undefined;
  ProcessingStartTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  CreationTime?: Date | undefined;
  MonitoringScheduleArn?: string | undefined;
  AutoMLJobArn?: string | undefined;
  TrainingJobArn?: string | undefined;
  Tags?: Tag[] | undefined;
}
export interface ProfilerConfigForUpdate {
  S3OutputPath?: string | undefined;
  ProfilingIntervalInMilliseconds?: number | undefined;
  ProfilingParameters?: Record<string, string> | undefined;
  DisableProfiler?: boolean | undefined;
}
export interface Project {
  ProjectArn?: string | undefined;
  ProjectName?: string | undefined;
  ProjectId?: string | undefined;
  ProjectDescription?: string | undefined;
  ServiceCatalogProvisioningDetails?:
    | ServiceCatalogProvisioningDetails
    | undefined;
  ServiceCatalogProvisionedProductDetails?:
    | ServiceCatalogProvisionedProductDetails
    | undefined;
  ProjectStatus?: ProjectStatus | undefined;
  CreatedBy?: UserContext | undefined;
  CreationTime?: Date | undefined;
  TemplateProviderDetails?: TemplateProviderDetail[] | undefined;
  Tags?: Tag[] | undefined;
  LastModifiedTime?: Date | undefined;
  LastModifiedBy?: UserContext | undefined;
}
export interface PutModelPackageGroupPolicyInput {
  ModelPackageGroupName: string | undefined;
  ResourcePolicy: string | undefined;
}
export interface PutModelPackageGroupPolicyOutput {
  ModelPackageGroupArn: string | undefined;
}
export interface QueryFilters {
  Types?: string[] | undefined;
  LineageTypes?: LineageType[] | undefined;
  CreatedBefore?: Date | undefined;
  CreatedAfter?: Date | undefined;
  ModifiedBefore?: Date | undefined;
  ModifiedAfter?: Date | undefined;
  Properties?: Record<string, string> | undefined;
}
export interface QueryLineageRequest {
  StartArns?: string[] | undefined;
  Direction?: Direction | undefined;
  IncludeEdges?: boolean | undefined;
  Filters?: QueryFilters | undefined;
  MaxDepth?: number | undefined;
  MaxResults?: number | undefined;
  NextToken?: string | undefined;
}
export interface Vertex {
  Arn?: string | undefined;
  Type?: string | undefined;
  LineageType?: LineageType | undefined;
}
export interface QueryLineageResponse {
  Vertices?: Vertex[] | undefined;
  Edges?: Edge[] | undefined;
  NextToken?: string | undefined;
}
export interface RegisterDevicesRequest {
  DeviceFleetName: string | undefined;
  Devices: Device[] | undefined;
  Tags?: Tag[] | undefined;
}
export interface RemoteDebugConfigForUpdate {
  EnableRemoteDebug?: boolean | undefined;
}
export interface RenderableTask {
  Input: string | undefined;
}
export interface RenderingError {
  Code: string | undefined;
  Message: string | undefined;
}
export interface RenderUiTemplateRequest {
  UiTemplate?: UiTemplate | undefined;
  Task: RenderableTask | undefined;
  RoleArn: string | undefined;
  HumanTaskUiArn?: string | undefined;
}
export interface RenderUiTemplateResponse {
  RenderedContent: string | undefined;
  Errors: RenderingError[] | undefined;
}
export interface ReservedCapacityOffering {
  ReservedCapacityType?: ReservedCapacityType | undefined;
  UltraServerType?: string | undefined;
  UltraServerCount?: number | undefined;
  InstanceType: ReservedCapacityInstanceType | undefined;
  InstanceCount: number | undefined;
  AvailabilityZone?: string | undefined;
  DurationHours?: number | undefined;
  DurationMinutes?: number | undefined;
  StartTime?: Date | undefined;
  EndTime?: Date | undefined;
  ExtensionStartTime?: Date | undefined;
  ExtensionEndTime?: Date | undefined;
}
export interface ResourceConfigForUpdate {
  KeepAlivePeriodInSeconds: number | undefined;
}
export interface RetryPipelineExecutionRequest {
  PipelineExecutionArn: string | undefined;
  ClientRequestToken?: string | undefined;
  ParallelismConfiguration?: ParallelismConfiguration | undefined;
}
export interface RetryPipelineExecutionResponse {
  PipelineExecutionArn?: string | undefined;
}
export interface VisibilityConditions {
  Key?: string | undefined;
  Value?: string | undefined;
}
export interface TrainingJob {
  TrainingJobName?: string | undefined;
  TrainingJobArn?: string | undefined;
  TuningJobArn?: string | undefined;
  LabelingJobArn?: string | undefined;
  AutoMLJobArn?: string | undefined;
  ModelArtifacts?: ModelArtifacts | undefined;
  TrainingJobStatus?: TrainingJobStatus | undefined;
  SecondaryStatus?: SecondaryStatus | undefined;
  FailureReason?: string | undefined;
  HyperParameters?: Record<string, string> | undefined;
  AlgorithmSpecification?: AlgorithmSpecification | undefined;
  RoleArn?: string | undefined;
  InputDataConfig?: Channel[] | undefined;
  OutputDataConfig?: OutputDataConfig | undefined;
  ResourceConfig?: ResourceConfig | undefined;
  VpcConfig?: VpcConfig | undefined;
  StoppingCondition?: StoppingCondition | undefined;
  CreationTime?: Date | undefined;
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
  OutputModelPackageArn?: string | undefined;
  ModelPackageConfig?: ModelPackageConfig | undefined;
  ProfilerConfig?: ProfilerConfig | undefined;
  Environment?: Record<string, string> | undefined;
  RetryStrategy?: RetryStrategy | undefined;
  Tags?: Tag[] | undefined;
}
export interface TrialComponentSimpleSummary {
  TrialComponentName?: string | undefined;
  TrialComponentArn?: string | undefined;
  TrialComponentSource?: TrialComponentSource | undefined;
  CreationTime?: Date | undefined;
  CreatedBy?: UserContext | undefined;
}
export interface Trial {
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
  Tags?: Tag[] | undefined;
  TrialComponentSummaries?: TrialComponentSimpleSummary[] | undefined;
}
export interface TrialComponentSourceDetail {
  SourceArn?: string | undefined;
  TrainingJob?: TrainingJob | undefined;
  ProcessingJob?: ProcessingJob | undefined;
  TransformJob?: TransformJob | undefined;
}
export interface TrialComponent {
  TrialComponentName?: string | undefined;
  DisplayName?: string | undefined;
  TrialComponentArn?: string | undefined;
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
  Metrics?: TrialComponentMetricSummary[] | undefined;
  MetadataProperties?: MetadataProperties | undefined;
  SourceDetail?: TrialComponentSourceDetail | undefined;
  LineageGroupArn?: string | undefined;
  Tags?: Tag[] | undefined;
  Parents?: Parent[] | undefined;
  RunName?: string | undefined;
}
export interface SearchRecord {
  TrainingJob?: TrainingJob | undefined;
  Experiment?: Experiment | undefined;
  Trial?: Trial | undefined;
  TrialComponent?: TrialComponent | undefined;
  Endpoint?: Endpoint | undefined;
  ModelPackage?: ModelPackage | undefined;
  ModelPackageGroup?: ModelPackageGroup | undefined;
  Pipeline?: Pipeline | undefined;
  PipelineExecution?: PipelineExecution | undefined;
  PipelineVersion?: PipelineVersion | undefined;
  FeatureGroup?: FeatureGroup | undefined;
  FeatureMetadata?: FeatureMetadata | undefined;
  Project?: Project | undefined;
  HyperParameterTuningJob?: HyperParameterTuningJobSearchEntity | undefined;
  ModelCard?: ModelCard | undefined;
  Model?: ModelDashboardModel | undefined;
}
export interface TotalHits {
  Value?: number | undefined;
  Relation?: Relation | undefined;
}
export interface SearchResponse {
  Results?: SearchRecord[] | undefined;
  NextToken?: string | undefined;
  TotalHits?: TotalHits | undefined;
}
export interface SearchTrainingPlanOfferingsRequest {
  InstanceType?: ReservedCapacityInstanceType | undefined;
  InstanceCount?: number | undefined;
  UltraServerType?: string | undefined;
  UltraServerCount?: number | undefined;
  StartTimeAfter?: Date | undefined;
  EndTimeBefore?: Date | undefined;
  DurationHours?: number | undefined;
  TargetResources?: SageMakerResourceName[] | undefined;
  TrainingPlanArn?: string | undefined;
}
export interface TrainingPlanExtensionOffering {
  TrainingPlanExtensionOfferingId: string | undefined;
  AvailabilityZone?: string | undefined;
  StartDate?: Date | undefined;
  EndDate?: Date | undefined;
  DurationHours?: number | undefined;
  UpfrontFee?: string | undefined;
  CurrencyCode?: string | undefined;
}
export interface TrainingPlanOffering {
  TrainingPlanOfferingId: string | undefined;
  TargetResources: SageMakerResourceName[] | undefined;
  RequestedStartTimeAfter?: Date | undefined;
  RequestedEndTimeBefore?: Date | undefined;
  DurationHours?: number | undefined;
  DurationMinutes?: number | undefined;
  UpfrontFee?: string | undefined;
  CurrencyCode?: string | undefined;
  ReservedCapacityOfferings?: ReservedCapacityOffering[] | undefined;
}
export interface SearchTrainingPlanOfferingsResponse {
  TrainingPlanOfferings: TrainingPlanOffering[] | undefined;
  TrainingPlanExtensionOfferings?: TrainingPlanExtensionOffering[] | undefined;
}
export interface SendPipelineExecutionStepFailureRequest {
  CallbackToken: string | undefined;
  FailureReason?: string | undefined;
  ClientRequestToken?: string | undefined;
}
export interface SendPipelineExecutionStepFailureResponse {
  PipelineExecutionArn?: string | undefined;
}
export interface SendPipelineExecutionStepSuccessRequest {
  CallbackToken: string | undefined;
  OutputParameters?: OutputParameter[] | undefined;
  ClientRequestToken?: string | undefined;
}
export interface SendPipelineExecutionStepSuccessResponse {
  PipelineExecutionArn?: string | undefined;
}
export interface StartEdgeDeploymentStageRequest {
  EdgeDeploymentPlanName: string | undefined;
  StageName: string | undefined;
}
export interface StartInferenceExperimentRequest {
  Name: string | undefined;
}
export interface StartInferenceExperimentResponse {
  InferenceExperimentArn: string | undefined;
}
export interface StartMlflowTrackingServerRequest {
  TrackingServerName: string | undefined;
}
export interface StartMlflowTrackingServerResponse {
  TrackingServerArn?: string | undefined;
}
export interface StartMonitoringScheduleRequest {
  MonitoringScheduleName: string | undefined;
}
export interface StartNotebookInstanceInput {
  NotebookInstanceName: string | undefined;
}
export interface StartPipelineExecutionRequest {
  PipelineName: string | undefined;
  PipelineExecutionDisplayName?: string | undefined;
  PipelineParameters?: Parameter[] | undefined;
  PipelineExecutionDescription?: string | undefined;
  ClientRequestToken?: string | undefined;
  ParallelismConfiguration?: ParallelismConfiguration | undefined;
  SelectiveExecutionConfig?: SelectiveExecutionConfig | undefined;
  PipelineVersionId?: number | undefined;
  MlflowExperimentName?: string | undefined;
}
export interface StartPipelineExecutionResponse {
  PipelineExecutionArn?: string | undefined;
}
export interface StartSessionRequest {
  ResourceIdentifier: string | undefined;
}
export interface StartSessionResponse {
  SessionId?: string | undefined;
  StreamUrl?: string | undefined;
  TokenValue?: string | undefined;
}
export interface StopAutoMLJobRequest {
  AutoMLJobName: string | undefined;
}
export interface StopCompilationJobRequest {
  CompilationJobName: string | undefined;
}
export interface StopEdgeDeploymentStageRequest {
  EdgeDeploymentPlanName: string | undefined;
  StageName: string | undefined;
}
export interface StopEdgePackagingJobRequest {
  EdgePackagingJobName: string | undefined;
}
export interface StopHyperParameterTuningJobRequest {
  HyperParameterTuningJobName: string | undefined;
}
export interface StopInferenceExperimentRequest {
  Name: string | undefined;
  ModelVariantActions: Record<string, ModelVariantAction> | undefined;
  DesiredModelVariants?: ModelVariantConfig[] | undefined;
  DesiredState?: InferenceExperimentStopDesiredState | undefined;
  Reason?: string | undefined;
}
export interface StopInferenceExperimentResponse {
  InferenceExperimentArn: string | undefined;
}
export interface StopInferenceRecommendationsJobRequest {
  JobName: string | undefined;
}
export interface StopLabelingJobRequest {
  LabelingJobName: string | undefined;
}
export interface StopMlflowTrackingServerRequest {
  TrackingServerName: string | undefined;
}
export interface StopMlflowTrackingServerResponse {
  TrackingServerArn?: string | undefined;
}
export interface StopMonitoringScheduleRequest {
  MonitoringScheduleName: string | undefined;
}
export interface StopNotebookInstanceInput {
  NotebookInstanceName: string | undefined;
}
export interface StopOptimizationJobRequest {
  OptimizationJobName: string | undefined;
}
export interface StopPipelineExecutionRequest {
  PipelineExecutionArn: string | undefined;
  ClientRequestToken?: string | undefined;
}
export interface StopPipelineExecutionResponse {
  PipelineExecutionArn?: string | undefined;
}
export interface StopProcessingJobRequest {
  ProcessingJobName: string | undefined;
}
export interface StopTrainingJobRequest {
  TrainingJobName: string | undefined;
}
export interface StopTransformJobRequest {
  TransformJobName: string | undefined;
}
export interface UpdateActionRequest {
  ActionName: string | undefined;
  Description?: string | undefined;
  Status?: ActionStatus | undefined;
  Properties?: Record<string, string> | undefined;
  PropertiesToRemove?: string[] | undefined;
}
export interface UpdateActionResponse {
  ActionArn?: string | undefined;
}
export interface UpdateAppImageConfigRequest {
  AppImageConfigName: string | undefined;
  KernelGatewayImageConfig?: KernelGatewayImageConfig | undefined;
  JupyterLabAppImageConfig?: JupyterLabAppImageConfig | undefined;
  CodeEditorAppImageConfig?: CodeEditorAppImageConfig | undefined;
}
export interface UpdateAppImageConfigResponse {
  AppImageConfigArn?: string | undefined;
}
export interface UpdateArtifactRequest {
  ArtifactArn: string | undefined;
  ArtifactName?: string | undefined;
  Properties?: Record<string, string> | undefined;
  PropertiesToRemove?: string[] | undefined;
}
export interface UpdateArtifactResponse {
  ArtifactArn?: string | undefined;
}
export interface UpdateClusterRequest {
  ClusterName: string | undefined;
  InstanceGroups?: ClusterInstanceGroupSpecification[] | undefined;
  RestrictedInstanceGroups?:
    | ClusterRestrictedInstanceGroupSpecification[]
    | undefined;
  TieredStorageConfig?: ClusterTieredStorageConfig | undefined;
  NodeRecovery?: ClusterNodeRecovery | undefined;
  InstanceGroupsToDelete?: string[] | undefined;
  NodeProvisioningMode?: ClusterNodeProvisioningMode | undefined;
  ClusterRole?: string | undefined;
  AutoScaling?: ClusterAutoScalingConfig | undefined;
  Orchestrator?: ClusterOrchestrator | undefined;
}
export interface UpdateClusterResponse {
  ClusterArn: string | undefined;
}
export interface UpdateClusterSchedulerConfigRequest {
  ClusterSchedulerConfigId: string | undefined;
  TargetVersion: number | undefined;
  SchedulerConfig?: SchedulerConfig | undefined;
  Description?: string | undefined;
}
export interface UpdateClusterSchedulerConfigResponse {
  ClusterSchedulerConfigArn: string | undefined;
  ClusterSchedulerConfigVersion: number | undefined;
}
export interface UpdateClusterSoftwareInstanceGroupSpecification {
  InstanceGroupName: string | undefined;
}
export interface UpdateClusterSoftwareRequest {
  ClusterName: string | undefined;
  InstanceGroups?:
    | UpdateClusterSoftwareInstanceGroupSpecification[]
    | undefined;
  DeploymentConfig?: DeploymentConfiguration | undefined;
  ImageId?: string | undefined;
}
export interface UpdateClusterSoftwareResponse {
  ClusterArn: string | undefined;
}
export interface UpdateCodeRepositoryInput {
  CodeRepositoryName: string | undefined;
  GitConfig?: GitConfigForUpdate | undefined;
}
export interface UpdateCodeRepositoryOutput {
  CodeRepositoryArn: string | undefined;
}
export interface UpdateComputeQuotaRequest {
  ComputeQuotaId: string | undefined;
  TargetVersion: number | undefined;
  ComputeQuotaConfig?: ComputeQuotaConfig | undefined;
  ComputeQuotaTarget?: ComputeQuotaTarget | undefined;
  ActivationState?: ActivationState | undefined;
  Description?: string | undefined;
}
export interface UpdateComputeQuotaResponse {
  ComputeQuotaArn: string | undefined;
  ComputeQuotaVersion: number | undefined;
}
export interface UpdateContextRequest {
  ContextName: string | undefined;
  Description?: string | undefined;
  Properties?: Record<string, string> | undefined;
  PropertiesToRemove?: string[] | undefined;
}
export interface UpdateContextResponse {
  ContextArn?: string | undefined;
}
export interface UpdateDeviceFleetRequest {
  DeviceFleetName: string | undefined;
  RoleArn?: string | undefined;
  Description?: string | undefined;
  OutputConfig: EdgeOutputConfig | undefined;
  EnableIotRoleAlias?: boolean | undefined;
}
export interface UpdateDevicesRequest {
  DeviceFleetName: string | undefined;
  Devices: Device[] | undefined;
}
export interface UpdateDomainRequest {
  DomainId: string | undefined;
  DefaultUserSettings?: UserSettings | undefined;
  DomainSettingsForUpdate?: DomainSettingsForUpdate | undefined;
  AppSecurityGroupManagement?: AppSecurityGroupManagement | undefined;
  DefaultSpaceSettings?: DefaultSpaceSettings | undefined;
  SubnetIds?: string[] | undefined;
  AppNetworkAccessType?: AppNetworkAccessType | undefined;
  TagPropagation?: TagPropagation | undefined;
  VpcId?: string | undefined;
}
export interface UpdateDomainResponse {
  DomainArn?: string | undefined;
}
export interface VariantProperty {
  VariantPropertyType: VariantPropertyType | undefined;
}
export interface UpdateEndpointInput {
  EndpointName: string | undefined;
  EndpointConfigName: string | undefined;
  RetainAllVariantProperties?: boolean | undefined;
  ExcludeRetainedVariantProperties?: VariantProperty[] | undefined;
  DeploymentConfig?: DeploymentConfig | undefined;
  RetainDeploymentConfig?: boolean | undefined;
}
export interface UpdateEndpointOutput {
  EndpointArn: string | undefined;
}
export interface UpdateEndpointWeightsAndCapacitiesInput {
  EndpointName: string | undefined;
  DesiredWeightsAndCapacities: DesiredWeightAndCapacity[] | undefined;
}
export interface UpdateEndpointWeightsAndCapacitiesOutput {
  EndpointArn: string | undefined;
}
export interface UpdateExperimentRequest {
  ExperimentName: string | undefined;
  DisplayName?: string | undefined;
  Description?: string | undefined;
}
export interface UpdateExperimentResponse {
  ExperimentArn?: string | undefined;
}
export interface ThroughputConfigUpdate {
  ThroughputMode?: ThroughputMode | undefined;
  ProvisionedReadCapacityUnits?: number | undefined;
  ProvisionedWriteCapacityUnits?: number | undefined;
}
export interface UpdateFeatureGroupRequest {
  FeatureGroupName: string | undefined;
  FeatureAdditions?: FeatureDefinition[] | undefined;
  OnlineStoreConfig?: OnlineStoreConfigUpdate | undefined;
  ThroughputConfig?: ThroughputConfigUpdate | undefined;
}
export interface UpdateFeatureGroupResponse {
  FeatureGroupArn: string | undefined;
}
export interface UpdateFeatureMetadataRequest {
  FeatureGroupName: string | undefined;
  FeatureName: string | undefined;
  Description?: string | undefined;
  ParameterAdditions?: FeatureParameter[] | undefined;
  ParameterRemovals?: string[] | undefined;
}
export interface UpdateHubRequest {
  HubName: string | undefined;
  HubDescription?: string | undefined;
  HubDisplayName?: string | undefined;
  HubSearchKeywords?: string[] | undefined;
}
export interface UpdateHubResponse {
  HubArn: string | undefined;
}
export interface UpdateHubContentRequest {
  HubName: string | undefined;
  HubContentName: string | undefined;
  HubContentType: HubContentType | undefined;
  HubContentVersion: string | undefined;
  HubContentDisplayName?: string | undefined;
  HubContentDescription?: string | undefined;
  HubContentMarkdown?: string | undefined;
  HubContentSearchKeywords?: string[] | undefined;
  SupportStatus?: HubContentSupportStatus | undefined;
}
export interface UpdateHubContentResponse {
  HubArn: string | undefined;
  HubContentArn: string | undefined;
}
export interface UpdateHubContentReferenceRequest {
  HubName: string | undefined;
  HubContentName: string | undefined;
  HubContentType: HubContentType | undefined;
  MinVersion?: string | undefined;
}
export interface UpdateHubContentReferenceResponse {
  HubArn: string | undefined;
  HubContentArn: string | undefined;
}
export interface UpdateImageRequest {
  DeleteProperties?: string[] | undefined;
  Description?: string | undefined;
  DisplayName?: string | undefined;
  ImageName: string | undefined;
  RoleArn?: string | undefined;
}
export interface UpdateImageResponse {
  ImageArn?: string | undefined;
}
export interface UpdateImageVersionRequest {
  ImageName: string | undefined;
  Alias?: string | undefined;
  Version?: number | undefined;
  AliasesToAdd?: string[] | undefined;
  AliasesToDelete?: string[] | undefined;
  VendorGuidance?: VendorGuidance | undefined;
  JobType?: JobType | undefined;
  MLFramework?: string | undefined;
  ProgrammingLang?: string | undefined;
  Processor?: Processor | undefined;
  Horovod?: boolean | undefined;
  ReleaseNotes?: string | undefined;
}
export interface UpdateImageVersionResponse {
  ImageVersionArn?: string | undefined;
}
export interface UpdateInferenceComponentInput {
  InferenceComponentName: string | undefined;
  Specification?: InferenceComponentSpecification | undefined;
  RuntimeConfig?: InferenceComponentRuntimeConfig | undefined;
  DeploymentConfig?: InferenceComponentDeploymentConfig | undefined;
}
export interface UpdateInferenceComponentOutput {
  InferenceComponentArn: string | undefined;
}
export interface UpdateInferenceComponentRuntimeConfigInput {
  InferenceComponentName: string | undefined;
  DesiredRuntimeConfig: InferenceComponentRuntimeConfig | undefined;
}
export interface UpdateInferenceComponentRuntimeConfigOutput {
  InferenceComponentArn: string | undefined;
}
export interface UpdateInferenceExperimentRequest {
  Name: string | undefined;
  Schedule?: InferenceExperimentSchedule | undefined;
  Description?: string | undefined;
  ModelVariants?: ModelVariantConfig[] | undefined;
  DataStorageConfig?: InferenceExperimentDataStorageConfig | undefined;
  ShadowModeConfig?: ShadowModeConfig | undefined;
}
export interface UpdateInferenceExperimentResponse {
  InferenceExperimentArn: string | undefined;
}
export interface UpdateMlflowAppRequest {
  Arn: string | undefined;
  Name?: string | undefined;
  ArtifactStoreUri?: string | undefined;
  ModelRegistrationMode?: ModelRegistrationMode | undefined;
  WeeklyMaintenanceWindowStart?: string | undefined;
  DefaultDomainIdList?: string[] | undefined;
  AccountDefaultStatus?: AccountDefaultStatus | undefined;
}
export interface UpdateMlflowAppResponse {
  Arn?: string | undefined;
}
export interface UpdateMlflowTrackingServerRequest {
  TrackingServerName: string | undefined;
  ArtifactStoreUri?: string | undefined;
  TrackingServerSize?: TrackingServerSize | undefined;
  AutomaticModelRegistration?: boolean | undefined;
  WeeklyMaintenanceWindowStart?: string | undefined;
  S3BucketOwnerAccountId?: string | undefined;
  S3BucketOwnerVerification?: boolean | undefined;
}
export interface UpdateMlflowTrackingServerResponse {
  TrackingServerArn?: string | undefined;
}
export interface UpdateModelCardRequest {
  ModelCardName: string | undefined;
  Content?: string | undefined;
  ModelCardStatus?: ModelCardStatus | undefined;
}
export interface UpdateModelCardResponse {
  ModelCardArn: string | undefined;
}
export interface UpdateModelPackageInput {
  ModelPackageArn: string | undefined;
  ModelApprovalStatus?: ModelApprovalStatus | undefined;
  ModelPackageRegistrationType?: ModelPackageRegistrationType | undefined;
  ApprovalDescription?: string | undefined;
  CustomerMetadataProperties?: Record<string, string> | undefined;
  CustomerMetadataPropertiesToRemove?: string[] | undefined;
  AdditionalInferenceSpecificationsToAdd?:
    | AdditionalInferenceSpecificationDefinition[]
    | undefined;
  InferenceSpecification?: InferenceSpecification | undefined;
  SourceUri?: string | undefined;
  ModelCard?: ModelPackageModelCard | undefined;
  ModelLifeCycle?: ModelLifeCycle | undefined;
  ClientToken?: string | undefined;
}
export interface UpdateModelPackageOutput {
  ModelPackageArn: string | undefined;
}
export interface UpdateMonitoringAlertRequest {
  MonitoringScheduleName: string | undefined;
  MonitoringAlertName: string | undefined;
  DatapointsToAlert: number | undefined;
  EvaluationPeriod: number | undefined;
}
export interface UpdateMonitoringAlertResponse {
  MonitoringScheduleArn: string | undefined;
  MonitoringAlertName?: string | undefined;
}
export interface UpdateMonitoringScheduleRequest {
  MonitoringScheduleName: string | undefined;
  MonitoringScheduleConfig: MonitoringScheduleConfig | undefined;
}
export interface UpdateMonitoringScheduleResponse {
  MonitoringScheduleArn: string | undefined;
}
export interface UpdateNotebookInstanceInput {
  NotebookInstanceName: string | undefined;
  InstanceType?: _InstanceType | undefined;
  IpAddressType?: IPAddressType | undefined;
  PlatformIdentifier?: string | undefined;
  RoleArn?: string | undefined;
  LifecycleConfigName?: string | undefined;
  DisassociateLifecycleConfig?: boolean | undefined;
  VolumeSizeInGB?: number | undefined;
  DefaultCodeRepository?: string | undefined;
  AdditionalCodeRepositories?: string[] | undefined;
  AcceleratorTypes?: NotebookInstanceAcceleratorType[] | undefined;
  DisassociateAcceleratorTypes?: boolean | undefined;
  DisassociateDefaultCodeRepository?: boolean | undefined;
  DisassociateAdditionalCodeRepositories?: boolean | undefined;
  RootAccess?: RootAccess | undefined;
  InstanceMetadataServiceConfiguration?:
    | InstanceMetadataServiceConfiguration
    | undefined;
}
export interface UpdateNotebookInstanceOutput {}
export interface UpdateNotebookInstanceLifecycleConfigInput {
  NotebookInstanceLifecycleConfigName: string | undefined;
  OnCreate?: NotebookInstanceLifecycleHook[] | undefined;
  OnStart?: NotebookInstanceLifecycleHook[] | undefined;
}
export interface UpdateNotebookInstanceLifecycleConfigOutput {}
export interface UpdatePartnerAppRequest {
  Arn: string | undefined;
  MaintenanceConfig?: PartnerAppMaintenanceConfig | undefined;
  Tier?: string | undefined;
  ApplicationConfig?: PartnerAppConfig | undefined;
  EnableIamSessionBasedIdentity?: boolean | undefined;
  EnableAutoMinorVersionUpgrade?: boolean | undefined;
  AppVersion?: string | undefined;
  ClientToken?: string | undefined;
  Tags?: Tag[] | undefined;
}
export interface UpdatePartnerAppResponse {
  Arn?: string | undefined;
}
export interface UpdatePipelineRequest {
  PipelineName: string | undefined;
  PipelineDisplayName?: string | undefined;
  PipelineDefinition?: string | undefined;
  PipelineDefinitionS3Location?: PipelineDefinitionS3Location | undefined;
  PipelineDescription?: string | undefined;
  RoleArn?: string | undefined;
  ParallelismConfiguration?: ParallelismConfiguration | undefined;
}
export interface UpdatePipelineResponse {
  PipelineArn?: string | undefined;
  PipelineVersionId?: number | undefined;
}
export interface UpdatePipelineExecutionRequest {
  PipelineExecutionArn: string | undefined;
  PipelineExecutionDescription?: string | undefined;
  PipelineExecutionDisplayName?: string | undefined;
  ParallelismConfiguration?: ParallelismConfiguration | undefined;
}
export interface UpdatePipelineExecutionResponse {
  PipelineExecutionArn?: string | undefined;
}
export interface UpdatePipelineVersionRequest {
  PipelineArn: string | undefined;
  PipelineVersionId: number | undefined;
  PipelineVersionDisplayName?: string | undefined;
  PipelineVersionDescription?: string | undefined;
}
export interface UpdatePipelineVersionResponse {
  PipelineArn?: string | undefined;
  PipelineVersionId?: number | undefined;
}
export interface ServiceCatalogProvisioningUpdateDetails {
  ProvisioningArtifactId?: string | undefined;
  ProvisioningParameters?: ProvisioningParameter[] | undefined;
}
export interface UpdateTemplateProvider {
  CfnTemplateProvider?: CfnUpdateTemplateProvider | undefined;
}
export interface UpdateProjectInput {
  ProjectName: string | undefined;
  ProjectDescription?: string | undefined;
  ServiceCatalogProvisioningUpdateDetails?:
    | ServiceCatalogProvisioningUpdateDetails
    | undefined;
  Tags?: Tag[] | undefined;
  TemplateProvidersToUpdate?: UpdateTemplateProvider[] | undefined;
}
export interface UpdateProjectOutput {
  ProjectArn: string | undefined;
}
export interface UpdateSpaceRequest {
  DomainId: string | undefined;
  SpaceName: string | undefined;
  SpaceSettings?: SpaceSettings | undefined;
  SpaceDisplayName?: string | undefined;
}
export interface UpdateSpaceResponse {
  SpaceArn?: string | undefined;
}
export interface UpdateTrainingJobRequest {
  TrainingJobName: string | undefined;
  ProfilerConfig?: ProfilerConfigForUpdate | undefined;
  ProfilerRuleConfigurations?: ProfilerRuleConfiguration[] | undefined;
  ResourceConfig?: ResourceConfigForUpdate | undefined;
  RemoteDebugConfig?: RemoteDebugConfigForUpdate | undefined;
}
export interface UpdateTrainingJobResponse {
  TrainingJobArn: string | undefined;
}
export interface UpdateTrialRequest {
  TrialName: string | undefined;
  DisplayName?: string | undefined;
}
export interface UpdateTrialResponse {
  TrialArn?: string | undefined;
}
export interface UpdateTrialComponentRequest {
  TrialComponentName: string | undefined;
  DisplayName?: string | undefined;
  Status?: TrialComponentStatus | undefined;
  StartTime?: Date | undefined;
  EndTime?: Date | undefined;
  Parameters?: Record<string, TrialComponentParameterValue> | undefined;
  ParametersToRemove?: string[] | undefined;
  InputArtifacts?: Record<string, TrialComponentArtifact> | undefined;
  InputArtifactsToRemove?: string[] | undefined;
  OutputArtifacts?: Record<string, TrialComponentArtifact> | undefined;
  OutputArtifactsToRemove?: string[] | undefined;
}
export interface UpdateTrialComponentResponse {
  TrialComponentArn?: string | undefined;
}
export interface UpdateUserProfileRequest {
  DomainId: string | undefined;
  UserProfileName: string | undefined;
  UserSettings?: UserSettings | undefined;
}
export interface UpdateUserProfileResponse {
  UserProfileArn?: string | undefined;
}
export interface UpdateWorkforceRequest {
  WorkforceName: string | undefined;
  SourceIpConfig?: SourceIpConfig | undefined;
  OidcConfig?: OidcConfig | undefined;
  WorkforceVpcConfig?: WorkforceVpcConfigRequest | undefined;
  IpAddressType?: WorkforceIpAddressType | undefined;
}
export interface UpdateWorkforceResponse {
  Workforce: Workforce | undefined;
}
export interface UpdateWorkteamRequest {
  WorkteamName: string | undefined;
  MemberDefinitions?: MemberDefinition[] | undefined;
  Description?: string | undefined;
  NotificationConfiguration?: NotificationConfiguration | undefined;
  WorkerAccessConfiguration?: WorkerAccessConfiguration | undefined;
}
export interface UpdateWorkteamResponse {
  Workteam: Workteam | undefined;
}
export interface SearchExpression {
  Filters?: Filter[] | undefined;
  NestedFilters?: NestedFilters[] | undefined;
  SubExpressions?: SearchExpression[] | undefined;
  Operator?: BooleanOperator | undefined;
}
export interface SearchRequest {
  Resource: ResourceType | undefined;
  SearchExpression?: SearchExpression | undefined;
  SortBy?: string | undefined;
  SortOrder?: SearchSortOrder | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  CrossAccountFilterOption?: CrossAccountFilterOption | undefined;
  VisibilityConditions?: VisibilityConditions[] | undefined;
}
