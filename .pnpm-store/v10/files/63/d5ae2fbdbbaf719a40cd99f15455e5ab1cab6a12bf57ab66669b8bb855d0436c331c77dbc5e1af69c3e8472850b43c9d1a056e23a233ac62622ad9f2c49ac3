import {
  AdditionalInferenceSpecificationDefinition,
  AlgorithmSpecification,
  AppSpecification,
  AppType,
  AutoMLJobStepMetadata,
  BatchDataCaptureConfig,
  BatchStrategy,
  BatchTransformInput,
  CacheHitResult,
  CallbackStepMetadata,
  Channel,
  CheckpointConfig,
  ClarifyCheckStepMetadata,
  ComputeQuotaSummary,
  ConditionStepMetadata,
  InferenceSpecification,
  ModelApprovalStatus,
  ModelPackageStatus,
  OutputDataConfig,
  OutputParameter,
  ResourceConfig,
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
  ContextSummary,
  DriftCheckBaselines,
  InferenceExecutionConfig,
  InferenceExperimentType,
  MetadataProperties,
  ModelCardSecurityConfig,
  ModelCardStatus,
  ModelLifeCycle,
  ModelMetrics,
  ModelPackageModelCard,
  ModelPackageSecurityConfig,
  ModelPackageValidationSpecification,
  ModelVariantConfig,
  RetryStrategy,
  SkipModelValidation,
  SourceAlgorithmSpecification,
  TtlDuration,
  UiTemplate,
} from "./models_1";
import {
  CrossAccountFilterOption,
  DataProcessing,
  DebugHookConfig,
  DebugRuleConfiguration,
  DebugRuleEvaluationStatus,
  DeploymentRecommendation,
  EdgePackagingJobStatus,
  EndpointStatus,
  ExperimentConfig,
  FeatureGroupStatus,
  HubContentType,
  ModelArtifacts,
  ModelClientConfig,
  MonitoringScheduleConfig,
  MonitoringType,
  NetworkConfig,
  OfflineStoreStatusValue,
  OptimizationJobDeploymentInstanceType,
  ParallelismConfiguration,
  PartnerAppType,
  ProcessingInput,
  ProcessingOutputConfig,
  ProcessingResources,
  ProcessingStoppingCondition,
  ProfilerConfig,
  ServiceCatalogProvisioningDetails,
  SharingType,
  SpaceStorageSettings,
  StudioLifecycleConfigAppType,
  TensorBoardOutputConfig,
  TrialComponentArtifact,
  TrialComponentParameterValue,
  TrialComponentStatus,
} from "./models_2";
import {
  Device,
  DeviceDeploymentSummary,
  DeviceFleetSummary,
  DeviceSummary,
  Direction,
  DomainDetails,
  Edge,
  EdgeDeploymentPlanSummary,
  EdgePackagingJobSummary,
  EMRStepMetadata,
  Endpoint,
  EndpointConfigSortKey,
  EndpointConfigStepMetadata,
  EndpointConfigSummary,
  EndpointSortKey,
  EndpointStepMetadata,
  EndpointSummary,
  ExecutionStatus,
  Experiment,
  ExperimentSummary,
  FailStepMetadata,
  FeatureGroup,
  FeatureGroupSortBy,
  FeatureGroupSortOrder,
  FeatureGroupSummary,
  FeatureMetadata,
  Filter,
  FlowDefinitionSummary,
  HubContentInfo,
  HubContentSortBy,
  HubInfo,
  HubSortBy,
  HumanTaskUiSummary,
  HyperParameterTrainingJobSummary,
  HyperParameterTuningJobSearchEntity,
  HyperParameterTuningJobSortByOptions,
  HyperParameterTuningJobStatus,
  HyperParameterTuningJobSummary,
  Image,
  ImageSortBy,
  ImageSortOrder,
  ImageVersion,
  ImageVersionSortBy,
  ImageVersionSortOrder,
  InferenceComponentSortKey,
  InferenceComponentStatus,
  InferenceComponentSummary,
  InferenceExperimentStatus,
  InferenceExperimentStopDesiredState,
  InferenceExperimentSummary,
  InferenceRecommendationsJob,
  InferenceRecommendationsJobStep,
  IsTrackingServerActive,
  LabelingJobForWorkteamSummary,
  LabelingJobStatus,
  LabelingJobSummary,
  LambdaStepMetadata,
  LineageGroupSummary,
  LineageType,
  MetricData,
  ModelCardExportJobStatus,
  ModelPackageGroupStatus,
  ModelPackageStatusDetails,
  MonitoringExecutionSummary,
  NotebookInstanceStatus,
  OptimizationJobStatus,
  PartnerAppStatus,
  PipelineExecutionStatus,
  PipelineExperimentConfig,
  PipelineStatus,
  ProcessingJobStatus,
  ProjectStatus,
  RecommendationJobStatus,
  RecommendationStepType,
  ReservedCapacityInstanceType,
  ReservedCapacitySummary,
  SageMakerResourceName,
  ScheduleStatus,
  SecondaryStatus,
  SecondaryStatusTransition,
  SelectiveExecutionConfig,
  ServiceCatalogProvisionedProductDetails,
  SortOrder,
  SpaceStatus,
  SubscribedWorkteam,
  TrackingServerStatus,
  TrainingJobStatus,
  TrainingPlanStatus,
  TransformJobStatus,
  TrialComponentMetricSummary,
  TrialComponentSource,
  TrialSource,
  UserProfileStatus,
  WarmPoolResourceStatus,
  WarmPoolStatus,
  Workforce,
  Workteam,
} from "./models_3";
export declare const SortQuotaBy: {
  readonly CLUSTER_ARN: "ClusterArn";
  readonly CREATION_TIME: "CreationTime";
  readonly NAME: "Name";
  readonly STATUS: "Status";
};
export type SortQuotaBy = (typeof SortQuotaBy)[keyof typeof SortQuotaBy];
export interface ListComputeQuotasRequest {
  CreatedAfter?: Date | undefined;
  CreatedBefore?: Date | undefined;
  NameContains?: string | undefined;
  Status?: SchedulerResourceStatus | undefined;
  ClusterArn?: string | undefined;
  SortBy?: SortQuotaBy | undefined;
  SortOrder?: SortOrder | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface ListComputeQuotasResponse {
  ComputeQuotaSummaries?: ComputeQuotaSummary[] | undefined;
  NextToken?: string | undefined;
}
export declare const SortContextsBy: {
  readonly CREATION_TIME: "CreationTime";
  readonly NAME: "Name";
};
export type SortContextsBy =
  (typeof SortContextsBy)[keyof typeof SortContextsBy];
export interface ListContextsRequest {
  SourceUri?: string | undefined;
  ContextType?: string | undefined;
  CreatedAfter?: Date | undefined;
  CreatedBefore?: Date | undefined;
  SortBy?: SortContextsBy | undefined;
  SortOrder?: SortOrder | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface ListContextsResponse {
  ContextSummaries?: ContextSummary[] | undefined;
  NextToken?: string | undefined;
}
export declare const MonitoringJobDefinitionSortKey: {
  readonly CREATION_TIME: "CreationTime";
  readonly NAME: "Name";
};
export type MonitoringJobDefinitionSortKey =
  (typeof MonitoringJobDefinitionSortKey)[keyof typeof MonitoringJobDefinitionSortKey];
export interface ListDataQualityJobDefinitionsRequest {
  EndpointName?: string | undefined;
  SortBy?: MonitoringJobDefinitionSortKey | undefined;
  SortOrder?: SortOrder | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  NameContains?: string | undefined;
  CreationTimeBefore?: Date | undefined;
  CreationTimeAfter?: Date | undefined;
}
export interface MonitoringJobDefinitionSummary {
  MonitoringJobDefinitionName: string | undefined;
  MonitoringJobDefinitionArn: string | undefined;
  CreationTime: Date | undefined;
  EndpointName: string | undefined;
}
export interface ListDataQualityJobDefinitionsResponse {
  JobDefinitionSummaries: MonitoringJobDefinitionSummary[] | undefined;
  NextToken?: string | undefined;
}
export declare const ListDeviceFleetsSortBy: {
  readonly CreationTime: "CREATION_TIME";
  readonly LastModifiedTime: "LAST_MODIFIED_TIME";
  readonly Name: "NAME";
};
export type ListDeviceFleetsSortBy =
  (typeof ListDeviceFleetsSortBy)[keyof typeof ListDeviceFleetsSortBy];
export interface ListDeviceFleetsRequest {
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  CreationTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  LastModifiedTimeAfter?: Date | undefined;
  LastModifiedTimeBefore?: Date | undefined;
  NameContains?: string | undefined;
  SortBy?: ListDeviceFleetsSortBy | undefined;
  SortOrder?: SortOrder | undefined;
}
export interface ListDeviceFleetsResponse {
  DeviceFleetSummaries: DeviceFleetSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListDevicesRequest {
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  LatestHeartbeatAfter?: Date | undefined;
  ModelName?: string | undefined;
  DeviceFleetName?: string | undefined;
}
export interface ListDevicesResponse {
  DeviceSummaries: DeviceSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListDomainsRequest {
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface ListDomainsResponse {
  Domains?: DomainDetails[] | undefined;
  NextToken?: string | undefined;
}
export declare const ListEdgeDeploymentPlansSortBy: {
  readonly CreationTime: "CREATION_TIME";
  readonly DeviceFleetName: "DEVICE_FLEET_NAME";
  readonly LastModifiedTime: "LAST_MODIFIED_TIME";
  readonly Name: "NAME";
};
export type ListEdgeDeploymentPlansSortBy =
  (typeof ListEdgeDeploymentPlansSortBy)[keyof typeof ListEdgeDeploymentPlansSortBy];
export interface ListEdgeDeploymentPlansRequest {
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  CreationTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  LastModifiedTimeAfter?: Date | undefined;
  LastModifiedTimeBefore?: Date | undefined;
  NameContains?: string | undefined;
  DeviceFleetNameContains?: string | undefined;
  SortBy?: ListEdgeDeploymentPlansSortBy | undefined;
  SortOrder?: SortOrder | undefined;
}
export interface ListEdgeDeploymentPlansResponse {
  EdgeDeploymentPlanSummaries: EdgeDeploymentPlanSummary[] | undefined;
  NextToken?: string | undefined;
}
export declare const ListEdgePackagingJobsSortBy: {
  readonly CreationTime: "CREATION_TIME";
  readonly EdgePackagingJobStatus: "STATUS";
  readonly LastModifiedTime: "LAST_MODIFIED_TIME";
  readonly ModelName: "MODEL_NAME";
  readonly Name: "NAME";
};
export type ListEdgePackagingJobsSortBy =
  (typeof ListEdgePackagingJobsSortBy)[keyof typeof ListEdgePackagingJobsSortBy];
export interface ListEdgePackagingJobsRequest {
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  CreationTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  LastModifiedTimeAfter?: Date | undefined;
  LastModifiedTimeBefore?: Date | undefined;
  NameContains?: string | undefined;
  ModelNameContains?: string | undefined;
  StatusEquals?: EdgePackagingJobStatus | undefined;
  SortBy?: ListEdgePackagingJobsSortBy | undefined;
  SortOrder?: SortOrder | undefined;
}
export interface ListEdgePackagingJobsResponse {
  EdgePackagingJobSummaries: EdgePackagingJobSummary[] | undefined;
  NextToken?: string | undefined;
}
export declare const OrderKey: {
  readonly Ascending: "Ascending";
  readonly Descending: "Descending";
};
export type OrderKey = (typeof OrderKey)[keyof typeof OrderKey];
export interface ListEndpointConfigsInput {
  SortBy?: EndpointConfigSortKey | undefined;
  SortOrder?: OrderKey | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  NameContains?: string | undefined;
  CreationTimeBefore?: Date | undefined;
  CreationTimeAfter?: Date | undefined;
}
export interface ListEndpointConfigsOutput {
  EndpointConfigs: EndpointConfigSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListEndpointsInput {
  SortBy?: EndpointSortKey | undefined;
  SortOrder?: OrderKey | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  NameContains?: string | undefined;
  CreationTimeBefore?: Date | undefined;
  CreationTimeAfter?: Date | undefined;
  LastModifiedTimeBefore?: Date | undefined;
  LastModifiedTimeAfter?: Date | undefined;
  StatusEquals?: EndpointStatus | undefined;
}
export interface ListEndpointsOutput {
  Endpoints: EndpointSummary[] | undefined;
  NextToken?: string | undefined;
}
export declare const SortExperimentsBy: {
  readonly CREATION_TIME: "CreationTime";
  readonly NAME: "Name";
};
export type SortExperimentsBy =
  (typeof SortExperimentsBy)[keyof typeof SortExperimentsBy];
export interface ListExperimentsRequest {
  CreatedAfter?: Date | undefined;
  CreatedBefore?: Date | undefined;
  SortBy?: SortExperimentsBy | undefined;
  SortOrder?: SortOrder | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface ListExperimentsResponse {
  ExperimentSummaries?: ExperimentSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListFeatureGroupsRequest {
  NameContains?: string | undefined;
  FeatureGroupStatusEquals?: FeatureGroupStatus | undefined;
  OfflineStoreStatusEquals?: OfflineStoreStatusValue | undefined;
  CreationTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  SortOrder?: FeatureGroupSortOrder | undefined;
  SortBy?: FeatureGroupSortBy | undefined;
  MaxResults?: number | undefined;
  NextToken?: string | undefined;
}
export interface ListFeatureGroupsResponse {
  FeatureGroupSummaries: FeatureGroupSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListFlowDefinitionsRequest {
  CreationTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  SortOrder?: SortOrder | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface ListFlowDefinitionsResponse {
  FlowDefinitionSummaries: FlowDefinitionSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListHubContentsRequest {
  HubName: string | undefined;
  HubContentType: HubContentType | undefined;
  NameContains?: string | undefined;
  MaxSchemaVersion?: string | undefined;
  CreationTimeBefore?: Date | undefined;
  CreationTimeAfter?: Date | undefined;
  SortBy?: HubContentSortBy | undefined;
  SortOrder?: SortOrder | undefined;
  MaxResults?: number | undefined;
  NextToken?: string | undefined;
}
export interface ListHubContentsResponse {
  HubContentSummaries: HubContentInfo[] | undefined;
  NextToken?: string | undefined;
}
export interface ListHubContentVersionsRequest {
  HubName: string | undefined;
  HubContentType: HubContentType | undefined;
  HubContentName: string | undefined;
  MinVersion?: string | undefined;
  MaxSchemaVersion?: string | undefined;
  CreationTimeBefore?: Date | undefined;
  CreationTimeAfter?: Date | undefined;
  SortBy?: HubContentSortBy | undefined;
  SortOrder?: SortOrder | undefined;
  MaxResults?: number | undefined;
  NextToken?: string | undefined;
}
export interface ListHubContentVersionsResponse {
  HubContentSummaries: HubContentInfo[] | undefined;
  NextToken?: string | undefined;
}
export interface ListHubsRequest {
  NameContains?: string | undefined;
  CreationTimeBefore?: Date | undefined;
  CreationTimeAfter?: Date | undefined;
  LastModifiedTimeBefore?: Date | undefined;
  LastModifiedTimeAfter?: Date | undefined;
  SortBy?: HubSortBy | undefined;
  SortOrder?: SortOrder | undefined;
  MaxResults?: number | undefined;
  NextToken?: string | undefined;
}
export interface ListHubsResponse {
  HubSummaries: HubInfo[] | undefined;
  NextToken?: string | undefined;
}
export interface ListHumanTaskUisRequest {
  CreationTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  SortOrder?: SortOrder | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface ListHumanTaskUisResponse {
  HumanTaskUiSummaries: HumanTaskUiSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListHyperParameterTuningJobsRequest {
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  SortBy?: HyperParameterTuningJobSortByOptions | undefined;
  SortOrder?: SortOrder | undefined;
  NameContains?: string | undefined;
  CreationTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  LastModifiedTimeAfter?: Date | undefined;
  LastModifiedTimeBefore?: Date | undefined;
  StatusEquals?: HyperParameterTuningJobStatus | undefined;
}
export interface ListHyperParameterTuningJobsResponse {
  HyperParameterTuningJobSummaries:
    | HyperParameterTuningJobSummary[]
    | undefined;
  NextToken?: string | undefined;
}
export interface ListImagesRequest {
  CreationTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  LastModifiedTimeAfter?: Date | undefined;
  LastModifiedTimeBefore?: Date | undefined;
  MaxResults?: number | undefined;
  NameContains?: string | undefined;
  NextToken?: string | undefined;
  SortBy?: ImageSortBy | undefined;
  SortOrder?: ImageSortOrder | undefined;
}
export interface ListImagesResponse {
  Images?: Image[] | undefined;
  NextToken?: string | undefined;
}
export interface ListImageVersionsRequest {
  CreationTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  ImageName: string | undefined;
  LastModifiedTimeAfter?: Date | undefined;
  LastModifiedTimeBefore?: Date | undefined;
  MaxResults?: number | undefined;
  NextToken?: string | undefined;
  SortBy?: ImageVersionSortBy | undefined;
  SortOrder?: ImageVersionSortOrder | undefined;
}
export interface ListImageVersionsResponse {
  ImageVersions?: ImageVersion[] | undefined;
  NextToken?: string | undefined;
}
export interface ListInferenceComponentsInput {
  SortBy?: InferenceComponentSortKey | undefined;
  SortOrder?: OrderKey | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  NameContains?: string | undefined;
  CreationTimeBefore?: Date | undefined;
  CreationTimeAfter?: Date | undefined;
  LastModifiedTimeBefore?: Date | undefined;
  LastModifiedTimeAfter?: Date | undefined;
  StatusEquals?: InferenceComponentStatus | undefined;
  EndpointNameEquals?: string | undefined;
  VariantNameEquals?: string | undefined;
}
export interface ListInferenceComponentsOutput {
  InferenceComponents: InferenceComponentSummary[] | undefined;
  NextToken?: string | undefined;
}
export declare const SortInferenceExperimentsBy: {
  readonly CREATION_TIME: "CreationTime";
  readonly NAME: "Name";
  readonly STATUS: "Status";
};
export type SortInferenceExperimentsBy =
  (typeof SortInferenceExperimentsBy)[keyof typeof SortInferenceExperimentsBy];
export interface ListInferenceExperimentsRequest {
  NameContains?: string | undefined;
  Type?: InferenceExperimentType | undefined;
  StatusEquals?: InferenceExperimentStatus | undefined;
  CreationTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  LastModifiedTimeAfter?: Date | undefined;
  LastModifiedTimeBefore?: Date | undefined;
  SortBy?: SortInferenceExperimentsBy | undefined;
  SortOrder?: SortOrder | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface ListInferenceExperimentsResponse {
  InferenceExperiments?: InferenceExperimentSummary[] | undefined;
  NextToken?: string | undefined;
}
export declare const ListInferenceRecommendationsJobsSortBy: {
  readonly CREATION_TIME: "CreationTime";
  readonly NAME: "Name";
  readonly STATUS: "Status";
};
export type ListInferenceRecommendationsJobsSortBy =
  (typeof ListInferenceRecommendationsJobsSortBy)[keyof typeof ListInferenceRecommendationsJobsSortBy];
export interface ListInferenceRecommendationsJobsRequest {
  CreationTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  LastModifiedTimeAfter?: Date | undefined;
  LastModifiedTimeBefore?: Date | undefined;
  NameContains?: string | undefined;
  StatusEquals?: RecommendationJobStatus | undefined;
  SortBy?: ListInferenceRecommendationsJobsSortBy | undefined;
  SortOrder?: SortOrder | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  ModelNameEquals?: string | undefined;
  ModelPackageVersionArnEquals?: string | undefined;
}
export interface ListInferenceRecommendationsJobsResponse {
  InferenceRecommendationsJobs: InferenceRecommendationsJob[] | undefined;
  NextToken?: string | undefined;
}
export interface ListInferenceRecommendationsJobStepsRequest {
  JobName: string | undefined;
  Status?: RecommendationJobStatus | undefined;
  StepType?: RecommendationStepType | undefined;
  MaxResults?: number | undefined;
  NextToken?: string | undefined;
}
export interface ListInferenceRecommendationsJobStepsResponse {
  Steps?: InferenceRecommendationsJobStep[] | undefined;
  NextToken?: string | undefined;
}
export declare const SortBy: {
  readonly CREATION_TIME: "CreationTime";
  readonly NAME: "Name";
  readonly STATUS: "Status";
};
export type SortBy = (typeof SortBy)[keyof typeof SortBy];
export interface ListLabelingJobsRequest {
  CreationTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  LastModifiedTimeAfter?: Date | undefined;
  LastModifiedTimeBefore?: Date | undefined;
  MaxResults?: number | undefined;
  NextToken?: string | undefined;
  NameContains?: string | undefined;
  SortBy?: SortBy | undefined;
  SortOrder?: SortOrder | undefined;
  StatusEquals?: LabelingJobStatus | undefined;
}
export interface ListLabelingJobsResponse {
  LabelingJobSummaryList?: LabelingJobSummary[] | undefined;
  NextToken?: string | undefined;
}
export declare const ListLabelingJobsForWorkteamSortByOptions: {
  readonly CREATION_TIME: "CreationTime";
};
export type ListLabelingJobsForWorkteamSortByOptions =
  (typeof ListLabelingJobsForWorkteamSortByOptions)[keyof typeof ListLabelingJobsForWorkteamSortByOptions];
export interface ListLabelingJobsForWorkteamRequest {
  WorkteamArn: string | undefined;
  MaxResults?: number | undefined;
  NextToken?: string | undefined;
  CreationTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  JobReferenceCodeContains?: string | undefined;
  SortBy?: ListLabelingJobsForWorkteamSortByOptions | undefined;
  SortOrder?: SortOrder | undefined;
}
export interface ListLabelingJobsForWorkteamResponse {
  LabelingJobSummaryList: LabelingJobForWorkteamSummary[] | undefined;
  NextToken?: string | undefined;
}
export declare const SortLineageGroupsBy: {
  readonly CREATION_TIME: "CreationTime";
  readonly NAME: "Name";
};
export type SortLineageGroupsBy =
  (typeof SortLineageGroupsBy)[keyof typeof SortLineageGroupsBy];
export interface ListLineageGroupsRequest {
  CreatedAfter?: Date | undefined;
  CreatedBefore?: Date | undefined;
  SortBy?: SortLineageGroupsBy | undefined;
  SortOrder?: SortOrder | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface ListLineageGroupsResponse {
  LineageGroupSummaries?: LineageGroupSummary[] | undefined;
  NextToken?: string | undefined;
}
export declare const SortTrackingServerBy: {
  readonly CREATION_TIME: "CreationTime";
  readonly NAME: "Name";
  readonly STATUS: "Status";
};
export type SortTrackingServerBy =
  (typeof SortTrackingServerBy)[keyof typeof SortTrackingServerBy];
export interface ListMlflowTrackingServersRequest {
  CreatedAfter?: Date | undefined;
  CreatedBefore?: Date | undefined;
  TrackingServerStatus?: TrackingServerStatus | undefined;
  MlflowVersion?: string | undefined;
  SortBy?: SortTrackingServerBy | undefined;
  SortOrder?: SortOrder | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface TrackingServerSummary {
  TrackingServerArn?: string | undefined;
  TrackingServerName?: string | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  TrackingServerStatus?: TrackingServerStatus | undefined;
  IsActive?: IsTrackingServerActive | undefined;
  MlflowVersion?: string | undefined;
}
export interface ListMlflowTrackingServersResponse {
  TrackingServerSummaries?: TrackingServerSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListModelBiasJobDefinitionsRequest {
  EndpointName?: string | undefined;
  SortBy?: MonitoringJobDefinitionSortKey | undefined;
  SortOrder?: SortOrder | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  NameContains?: string | undefined;
  CreationTimeBefore?: Date | undefined;
  CreationTimeAfter?: Date | undefined;
}
export interface ListModelBiasJobDefinitionsResponse {
  JobDefinitionSummaries: MonitoringJobDefinitionSummary[] | undefined;
  NextToken?: string | undefined;
}
export declare const ModelCardExportJobSortBy: {
  readonly CREATION_TIME: "CreationTime";
  readonly NAME: "Name";
  readonly STATUS: "Status";
};
export type ModelCardExportJobSortBy =
  (typeof ModelCardExportJobSortBy)[keyof typeof ModelCardExportJobSortBy];
export declare const ModelCardExportJobSortOrder: {
  readonly ASCENDING: "Ascending";
  readonly DESCENDING: "Descending";
};
export type ModelCardExportJobSortOrder =
  (typeof ModelCardExportJobSortOrder)[keyof typeof ModelCardExportJobSortOrder];
export interface ListModelCardExportJobsRequest {
  ModelCardName: string | undefined;
  ModelCardVersion?: number | undefined;
  CreationTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  ModelCardExportJobNameContains?: string | undefined;
  StatusEquals?: ModelCardExportJobStatus | undefined;
  SortBy?: ModelCardExportJobSortBy | undefined;
  SortOrder?: ModelCardExportJobSortOrder | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface ModelCardExportJobSummary {
  ModelCardExportJobName: string | undefined;
  ModelCardExportJobArn: string | undefined;
  Status: ModelCardExportJobStatus | undefined;
  ModelCardName: string | undefined;
  ModelCardVersion: number | undefined;
  CreatedAt: Date | undefined;
  LastModifiedAt: Date | undefined;
}
export interface ListModelCardExportJobsResponse {
  ModelCardExportJobSummaries: ModelCardExportJobSummary[] | undefined;
  NextToken?: string | undefined;
}
export declare const ModelCardSortBy: {
  readonly CREATION_TIME: "CreationTime";
  readonly NAME: "Name";
};
export type ModelCardSortBy =
  (typeof ModelCardSortBy)[keyof typeof ModelCardSortBy];
export declare const ModelCardSortOrder: {
  readonly ASCENDING: "Ascending";
  readonly DESCENDING: "Descending";
};
export type ModelCardSortOrder =
  (typeof ModelCardSortOrder)[keyof typeof ModelCardSortOrder];
export interface ListModelCardsRequest {
  CreationTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  MaxResults?: number | undefined;
  NameContains?: string | undefined;
  ModelCardStatus?: ModelCardStatus | undefined;
  NextToken?: string | undefined;
  SortBy?: ModelCardSortBy | undefined;
  SortOrder?: ModelCardSortOrder | undefined;
}
export interface ModelCardSummary {
  ModelCardName: string | undefined;
  ModelCardArn: string | undefined;
  ModelCardStatus: ModelCardStatus | undefined;
  CreationTime: Date | undefined;
  LastModifiedTime?: Date | undefined;
}
export interface ListModelCardsResponse {
  ModelCardSummaries: ModelCardSummary[] | undefined;
  NextToken?: string | undefined;
}
export declare const ModelCardVersionSortBy: {
  readonly VERSION: "Version";
};
export type ModelCardVersionSortBy =
  (typeof ModelCardVersionSortBy)[keyof typeof ModelCardVersionSortBy];
export interface ListModelCardVersionsRequest {
  CreationTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  MaxResults?: number | undefined;
  ModelCardName: string | undefined;
  ModelCardStatus?: ModelCardStatus | undefined;
  NextToken?: string | undefined;
  SortBy?: ModelCardVersionSortBy | undefined;
  SortOrder?: ModelCardSortOrder | undefined;
}
export interface ModelCardVersionSummary {
  ModelCardName: string | undefined;
  ModelCardArn: string | undefined;
  ModelCardStatus: ModelCardStatus | undefined;
  ModelCardVersion: number | undefined;
  CreationTime: Date | undefined;
  LastModifiedTime?: Date | undefined;
}
export interface ListModelCardVersionsResponse {
  ModelCardVersionSummaryList: ModelCardVersionSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListModelExplainabilityJobDefinitionsRequest {
  EndpointName?: string | undefined;
  SortBy?: MonitoringJobDefinitionSortKey | undefined;
  SortOrder?: SortOrder | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  NameContains?: string | undefined;
  CreationTimeBefore?: Date | undefined;
  CreationTimeAfter?: Date | undefined;
}
export interface ListModelExplainabilityJobDefinitionsResponse {
  JobDefinitionSummaries: MonitoringJobDefinitionSummary[] | undefined;
  NextToken?: string | undefined;
}
export declare const ModelMetadataFilterType: {
  readonly DOMAIN: "Domain";
  readonly FRAMEWORK: "Framework";
  readonly FRAMEWORKVERSION: "FrameworkVersion";
  readonly TASK: "Task";
};
export type ModelMetadataFilterType =
  (typeof ModelMetadataFilterType)[keyof typeof ModelMetadataFilterType];
export interface ModelMetadataFilter {
  Name: ModelMetadataFilterType | undefined;
  Value: string | undefined;
}
export interface ModelMetadataSearchExpression {
  Filters?: ModelMetadataFilter[] | undefined;
}
export interface ListModelMetadataRequest {
  SearchExpression?: ModelMetadataSearchExpression | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface ModelMetadataSummary {
  Domain: string | undefined;
  Framework: string | undefined;
  Task: string | undefined;
  Model: string | undefined;
  FrameworkVersion: string | undefined;
}
export interface ListModelMetadataResponse {
  ModelMetadataSummaries: ModelMetadataSummary[] | undefined;
  NextToken?: string | undefined;
}
export declare const ModelPackageGroupSortBy: {
  readonly CREATION_TIME: "CreationTime";
  readonly NAME: "Name";
};
export type ModelPackageGroupSortBy =
  (typeof ModelPackageGroupSortBy)[keyof typeof ModelPackageGroupSortBy];
export interface ListModelPackageGroupsInput {
  CreationTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  MaxResults?: number | undefined;
  NameContains?: string | undefined;
  NextToken?: string | undefined;
  SortBy?: ModelPackageGroupSortBy | undefined;
  SortOrder?: SortOrder | undefined;
  CrossAccountFilterOption?: CrossAccountFilterOption | undefined;
}
export interface ModelPackageGroupSummary {
  ModelPackageGroupName: string | undefined;
  ModelPackageGroupArn: string | undefined;
  ModelPackageGroupDescription?: string | undefined;
  CreationTime: Date | undefined;
  ModelPackageGroupStatus: ModelPackageGroupStatus | undefined;
}
export interface ListModelPackageGroupsOutput {
  ModelPackageGroupSummaryList: ModelPackageGroupSummary[] | undefined;
  NextToken?: string | undefined;
}
export declare const ModelPackageType: {
  readonly BOTH: "Both";
  readonly UNVERSIONED: "Unversioned";
  readonly VERSIONED: "Versioned";
};
export type ModelPackageType =
  (typeof ModelPackageType)[keyof typeof ModelPackageType];
export declare const ModelPackageSortBy: {
  readonly CREATION_TIME: "CreationTime";
  readonly NAME: "Name";
};
export type ModelPackageSortBy =
  (typeof ModelPackageSortBy)[keyof typeof ModelPackageSortBy];
export interface ListModelPackagesInput {
  CreationTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  MaxResults?: number | undefined;
  NameContains?: string | undefined;
  ModelApprovalStatus?: ModelApprovalStatus | undefined;
  ModelPackageGroupName?: string | undefined;
  ModelPackageType?: ModelPackageType | undefined;
  NextToken?: string | undefined;
  SortBy?: ModelPackageSortBy | undefined;
  SortOrder?: SortOrder | undefined;
}
export interface ModelPackageSummary {
  ModelPackageName?: string | undefined;
  ModelPackageGroupName?: string | undefined;
  ModelPackageVersion?: number | undefined;
  ModelPackageArn: string | undefined;
  ModelPackageDescription?: string | undefined;
  CreationTime: Date | undefined;
  ModelPackageStatus: ModelPackageStatus | undefined;
  ModelApprovalStatus?: ModelApprovalStatus | undefined;
  ModelLifeCycle?: ModelLifeCycle | undefined;
}
export interface ListModelPackagesOutput {
  ModelPackageSummaryList: ModelPackageSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListModelQualityJobDefinitionsRequest {
  EndpointName?: string | undefined;
  SortBy?: MonitoringJobDefinitionSortKey | undefined;
  SortOrder?: SortOrder | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  NameContains?: string | undefined;
  CreationTimeBefore?: Date | undefined;
  CreationTimeAfter?: Date | undefined;
}
export interface ListModelQualityJobDefinitionsResponse {
  JobDefinitionSummaries: MonitoringJobDefinitionSummary[] | undefined;
  NextToken?: string | undefined;
}
export declare const ModelSortKey: {
  readonly CreationTime: "CreationTime";
  readonly Name: "Name";
};
export type ModelSortKey = (typeof ModelSortKey)[keyof typeof ModelSortKey];
export interface ListModelsInput {
  SortBy?: ModelSortKey | undefined;
  SortOrder?: OrderKey | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  NameContains?: string | undefined;
  CreationTimeBefore?: Date | undefined;
  CreationTimeAfter?: Date | undefined;
}
export interface ModelSummary {
  ModelName: string | undefined;
  ModelArn: string | undefined;
  CreationTime: Date | undefined;
}
export interface ListModelsOutput {
  Models: ModelSummary[] | undefined;
  NextToken?: string | undefined;
}
export declare const MonitoringAlertHistorySortKey: {
  readonly CreationTime: "CreationTime";
  readonly Status: "Status";
};
export type MonitoringAlertHistorySortKey =
  (typeof MonitoringAlertHistorySortKey)[keyof typeof MonitoringAlertHistorySortKey];
export declare const MonitoringAlertStatus: {
  readonly IN_ALERT: "InAlert";
  readonly OK: "OK";
};
export type MonitoringAlertStatus =
  (typeof MonitoringAlertStatus)[keyof typeof MonitoringAlertStatus];
export interface ListMonitoringAlertHistoryRequest {
  MonitoringScheduleName?: string | undefined;
  MonitoringAlertName?: string | undefined;
  SortBy?: MonitoringAlertHistorySortKey | undefined;
  SortOrder?: SortOrder | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  CreationTimeBefore?: Date | undefined;
  CreationTimeAfter?: Date | undefined;
  StatusEquals?: MonitoringAlertStatus | undefined;
}
export interface MonitoringAlertHistorySummary {
  MonitoringScheduleName: string | undefined;
  MonitoringAlertName: string | undefined;
  CreationTime: Date | undefined;
  AlertStatus: MonitoringAlertStatus | undefined;
}
export interface ListMonitoringAlertHistoryResponse {
  MonitoringAlertHistory?: MonitoringAlertHistorySummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListMonitoringAlertsRequest {
  MonitoringScheduleName: string | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface ModelDashboardIndicatorAction {
  Enabled?: boolean | undefined;
}
export interface MonitoringAlertActions {
  ModelDashboardIndicator?: ModelDashboardIndicatorAction | undefined;
}
export interface MonitoringAlertSummary {
  MonitoringAlertName: string | undefined;
  CreationTime: Date | undefined;
  LastModifiedTime: Date | undefined;
  AlertStatus: MonitoringAlertStatus | undefined;
  DatapointsToAlert: number | undefined;
  EvaluationPeriod: number | undefined;
  Actions: MonitoringAlertActions | undefined;
}
export interface ListMonitoringAlertsResponse {
  MonitoringAlertSummaries?: MonitoringAlertSummary[] | undefined;
  NextToken?: string | undefined;
}
export declare const MonitoringExecutionSortKey: {
  readonly CREATION_TIME: "CreationTime";
  readonly SCHEDULED_TIME: "ScheduledTime";
  readonly STATUS: "Status";
};
export type MonitoringExecutionSortKey =
  (typeof MonitoringExecutionSortKey)[keyof typeof MonitoringExecutionSortKey];
export interface ListMonitoringExecutionsRequest {
  MonitoringScheduleName?: string | undefined;
  EndpointName?: string | undefined;
  SortBy?: MonitoringExecutionSortKey | undefined;
  SortOrder?: SortOrder | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  ScheduledTimeBefore?: Date | undefined;
  ScheduledTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  CreationTimeAfter?: Date | undefined;
  LastModifiedTimeBefore?: Date | undefined;
  LastModifiedTimeAfter?: Date | undefined;
  StatusEquals?: ExecutionStatus | undefined;
  MonitoringJobDefinitionName?: string | undefined;
  MonitoringTypeEquals?: MonitoringType | undefined;
}
export interface ListMonitoringExecutionsResponse {
  MonitoringExecutionSummaries: MonitoringExecutionSummary[] | undefined;
  NextToken?: string | undefined;
}
export declare const MonitoringScheduleSortKey: {
  readonly CREATION_TIME: "CreationTime";
  readonly NAME: "Name";
  readonly STATUS: "Status";
};
export type MonitoringScheduleSortKey =
  (typeof MonitoringScheduleSortKey)[keyof typeof MonitoringScheduleSortKey];
export interface ListMonitoringSchedulesRequest {
  EndpointName?: string | undefined;
  SortBy?: MonitoringScheduleSortKey | undefined;
  SortOrder?: SortOrder | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  NameContains?: string | undefined;
  CreationTimeBefore?: Date | undefined;
  CreationTimeAfter?: Date | undefined;
  LastModifiedTimeBefore?: Date | undefined;
  LastModifiedTimeAfter?: Date | undefined;
  StatusEquals?: ScheduleStatus | undefined;
  MonitoringJobDefinitionName?: string | undefined;
  MonitoringTypeEquals?: MonitoringType | undefined;
}
export interface MonitoringScheduleSummary {
  MonitoringScheduleName: string | undefined;
  MonitoringScheduleArn: string | undefined;
  CreationTime: Date | undefined;
  LastModifiedTime: Date | undefined;
  MonitoringScheduleStatus: ScheduleStatus | undefined;
  EndpointName?: string | undefined;
  MonitoringJobDefinitionName?: string | undefined;
  MonitoringType?: MonitoringType | undefined;
}
export interface ListMonitoringSchedulesResponse {
  MonitoringScheduleSummaries: MonitoringScheduleSummary[] | undefined;
  NextToken?: string | undefined;
}
export declare const NotebookInstanceLifecycleConfigSortKey: {
  readonly CREATION_TIME: "CreationTime";
  readonly LAST_MODIFIED_TIME: "LastModifiedTime";
  readonly NAME: "Name";
};
export type NotebookInstanceLifecycleConfigSortKey =
  (typeof NotebookInstanceLifecycleConfigSortKey)[keyof typeof NotebookInstanceLifecycleConfigSortKey];
export declare const NotebookInstanceLifecycleConfigSortOrder: {
  readonly ASCENDING: "Ascending";
  readonly DESCENDING: "Descending";
};
export type NotebookInstanceLifecycleConfigSortOrder =
  (typeof NotebookInstanceLifecycleConfigSortOrder)[keyof typeof NotebookInstanceLifecycleConfigSortOrder];
export interface ListNotebookInstanceLifecycleConfigsInput {
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  SortBy?: NotebookInstanceLifecycleConfigSortKey | undefined;
  SortOrder?: NotebookInstanceLifecycleConfigSortOrder | undefined;
  NameContains?: string | undefined;
  CreationTimeBefore?: Date | undefined;
  CreationTimeAfter?: Date | undefined;
  LastModifiedTimeBefore?: Date | undefined;
  LastModifiedTimeAfter?: Date | undefined;
}
export interface NotebookInstanceLifecycleConfigSummary {
  NotebookInstanceLifecycleConfigName: string | undefined;
  NotebookInstanceLifecycleConfigArn: string | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
}
export interface ListNotebookInstanceLifecycleConfigsOutput {
  NextToken?: string | undefined;
  NotebookInstanceLifecycleConfigs?:
    | NotebookInstanceLifecycleConfigSummary[]
    | undefined;
}
export declare const NotebookInstanceSortKey: {
  readonly CREATION_TIME: "CreationTime";
  readonly NAME: "Name";
  readonly STATUS: "Status";
};
export type NotebookInstanceSortKey =
  (typeof NotebookInstanceSortKey)[keyof typeof NotebookInstanceSortKey];
export declare const NotebookInstanceSortOrder: {
  readonly ASCENDING: "Ascending";
  readonly DESCENDING: "Descending";
};
export type NotebookInstanceSortOrder =
  (typeof NotebookInstanceSortOrder)[keyof typeof NotebookInstanceSortOrder];
export interface ListNotebookInstancesInput {
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  SortBy?: NotebookInstanceSortKey | undefined;
  SortOrder?: NotebookInstanceSortOrder | undefined;
  NameContains?: string | undefined;
  CreationTimeBefore?: Date | undefined;
  CreationTimeAfter?: Date | undefined;
  LastModifiedTimeBefore?: Date | undefined;
  LastModifiedTimeAfter?: Date | undefined;
  StatusEquals?: NotebookInstanceStatus | undefined;
  NotebookInstanceLifecycleConfigNameContains?: string | undefined;
  DefaultCodeRepositoryContains?: string | undefined;
  AdditionalCodeRepositoryEquals?: string | undefined;
}
export interface NotebookInstanceSummary {
  NotebookInstanceName: string | undefined;
  NotebookInstanceArn: string | undefined;
  NotebookInstanceStatus?: NotebookInstanceStatus | undefined;
  Url?: string | undefined;
  InstanceType?: _InstanceType | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  NotebookInstanceLifecycleConfigName?: string | undefined;
  DefaultCodeRepository?: string | undefined;
  AdditionalCodeRepositories?: string[] | undefined;
}
export interface ListNotebookInstancesOutput {
  NextToken?: string | undefined;
  NotebookInstances?: NotebookInstanceSummary[] | undefined;
}
export declare const ListOptimizationJobsSortBy: {
  readonly CREATION_TIME: "CreationTime";
  readonly NAME: "Name";
  readonly STATUS: "Status";
};
export type ListOptimizationJobsSortBy =
  (typeof ListOptimizationJobsSortBy)[keyof typeof ListOptimizationJobsSortBy];
export interface ListOptimizationJobsRequest {
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  CreationTimeAfter?: Date | undefined;
  CreationTimeBefore?: Date | undefined;
  LastModifiedTimeAfter?: Date | undefined;
  LastModifiedTimeBefore?: Date | undefined;
  OptimizationContains?: string | undefined;
  NameContains?: string | undefined;
  StatusEquals?: OptimizationJobStatus | undefined;
  SortBy?: ListOptimizationJobsSortBy | undefined;
  SortOrder?: SortOrder | undefined;
}
export interface OptimizationJobSummary {
  OptimizationJobName: string | undefined;
  OptimizationJobArn: string | undefined;
  CreationTime: Date | undefined;
  OptimizationJobStatus: OptimizationJobStatus | undefined;
  OptimizationStartTime?: Date | undefined;
  OptimizationEndTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  DeploymentInstanceType: OptimizationJobDeploymentInstanceType | undefined;
  OptimizationTypes: string[] | undefined;
}
export interface ListOptimizationJobsResponse {
  OptimizationJobSummaries: OptimizationJobSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListPartnerAppsRequest {
  MaxResults?: number | undefined;
  NextToken?: string | undefined;
}
export interface PartnerAppSummary {
  Arn?: string | undefined;
  Name?: string | undefined;
  Type?: PartnerAppType | undefined;
  Status?: PartnerAppStatus | undefined;
  CreationTime?: Date | undefined;
}
export interface ListPartnerAppsResponse {
  Summaries?: PartnerAppSummary[] | undefined;
  NextToken?: string | undefined;
}
export declare const SortPipelineExecutionsBy: {
  readonly CREATION_TIME: "CreationTime";
  readonly PIPELINE_EXECUTION_ARN: "PipelineExecutionArn";
};
export type SortPipelineExecutionsBy =
  (typeof SortPipelineExecutionsBy)[keyof typeof SortPipelineExecutionsBy];
export interface ListPipelineExecutionsRequest {
  PipelineName: string | undefined;
  CreatedAfter?: Date | undefined;
  CreatedBefore?: Date | undefined;
  SortBy?: SortPipelineExecutionsBy | undefined;
  SortOrder?: SortOrder | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface PipelineExecutionSummary {
  PipelineExecutionArn?: string | undefined;
  StartTime?: Date | undefined;
  PipelineExecutionStatus?: PipelineExecutionStatus | undefined;
  PipelineExecutionDescription?: string | undefined;
  PipelineExecutionDisplayName?: string | undefined;
  PipelineExecutionFailureReason?: string | undefined;
}
export interface ListPipelineExecutionsResponse {
  PipelineExecutionSummaries?: PipelineExecutionSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListPipelineExecutionStepsRequest {
  PipelineExecutionArn?: string | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  SortOrder?: SortOrder | undefined;
}
export interface ModelStepMetadata {
  Arn?: string | undefined;
}
export interface ProcessingJobStepMetadata {
  Arn?: string | undefined;
}
export interface QualityCheckStepMetadata {
  CheckType?: string | undefined;
  BaselineUsedForDriftCheckStatistics?: string | undefined;
  BaselineUsedForDriftCheckConstraints?: string | undefined;
  CalculatedBaselineStatistics?: string | undefined;
  CalculatedBaselineConstraints?: string | undefined;
  ModelPackageGroupName?: string | undefined;
  ViolationReport?: string | undefined;
  CheckJobArn?: string | undefined;
  SkipCheck?: boolean | undefined;
  RegisterNewBaseline?: boolean | undefined;
}
export interface RegisterModelStepMetadata {
  Arn?: string | undefined;
}
export interface TrainingJobStepMetadata {
  Arn?: string | undefined;
}
export interface TransformJobStepMetadata {
  Arn?: string | undefined;
}
export interface TuningJobStepMetaData {
  Arn?: string | undefined;
}
export interface PipelineExecutionStepMetadata {
  TrainingJob?: TrainingJobStepMetadata | undefined;
  ProcessingJob?: ProcessingJobStepMetadata | undefined;
  TransformJob?: TransformJobStepMetadata | undefined;
  TuningJob?: TuningJobStepMetaData | undefined;
  Model?: ModelStepMetadata | undefined;
  RegisterModel?: RegisterModelStepMetadata | undefined;
  Condition?: ConditionStepMetadata | undefined;
  Callback?: CallbackStepMetadata | undefined;
  Lambda?: LambdaStepMetadata | undefined;
  EMR?: EMRStepMetadata | undefined;
  QualityCheck?: QualityCheckStepMetadata | undefined;
  ClarifyCheck?: ClarifyCheckStepMetadata | undefined;
  Fail?: FailStepMetadata | undefined;
  AutoMLJob?: AutoMLJobStepMetadata | undefined;
  Endpoint?: EndpointStepMetadata | undefined;
  EndpointConfig?: EndpointConfigStepMetadata | undefined;
}
export interface SelectiveExecutionResult {
  SourcePipelineExecutionArn?: string | undefined;
}
export declare const StepStatus: {
  readonly EXECUTING: "Executing";
  readonly FAILED: "Failed";
  readonly STARTING: "Starting";
  readonly STOPPED: "Stopped";
  readonly STOPPING: "Stopping";
  readonly SUCCEEDED: "Succeeded";
};
export type StepStatus = (typeof StepStatus)[keyof typeof StepStatus];
export interface PipelineExecutionStep {
  StepName?: string | undefined;
  StepDisplayName?: string | undefined;
  StepDescription?: string | undefined;
  StartTime?: Date | undefined;
  EndTime?: Date | undefined;
  StepStatus?: StepStatus | undefined;
  CacheHitResult?: CacheHitResult | undefined;
  FailureReason?: string | undefined;
  Metadata?: PipelineExecutionStepMetadata | undefined;
  AttemptCount?: number | undefined;
  SelectiveExecutionResult?: SelectiveExecutionResult | undefined;
}
export interface ListPipelineExecutionStepsResponse {
  PipelineExecutionSteps?: PipelineExecutionStep[] | undefined;
  NextToken?: string | undefined;
}
export interface ListPipelineParametersForExecutionRequest {
  PipelineExecutionArn: string | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface Parameter {
  Name: string | undefined;
  Value: string | undefined;
}
export interface ListPipelineParametersForExecutionResponse {
  PipelineParameters?: Parameter[] | undefined;
  NextToken?: string | undefined;
}
export declare const SortPipelinesBy: {
  readonly CREATION_TIME: "CreationTime";
  readonly NAME: "Name";
};
export type SortPipelinesBy =
  (typeof SortPipelinesBy)[keyof typeof SortPipelinesBy];
export interface ListPipelinesRequest {
  PipelineNamePrefix?: string | undefined;
  CreatedAfter?: Date | undefined;
  CreatedBefore?: Date | undefined;
  SortBy?: SortPipelinesBy | undefined;
  SortOrder?: SortOrder | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface PipelineSummary {
  PipelineArn?: string | undefined;
  PipelineName?: string | undefined;
  PipelineDisplayName?: string | undefined;
  PipelineDescription?: string | undefined;
  RoleArn?: string | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  LastExecutionTime?: Date | undefined;
}
export interface ListPipelinesResponse {
  PipelineSummaries?: PipelineSummary[] | undefined;
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
export declare const ProjectSortBy: {
  readonly CREATION_TIME: "CreationTime";
  readonly NAME: "Name";
};
export type ProjectSortBy = (typeof ProjectSortBy)[keyof typeof ProjectSortBy];
export declare const ProjectSortOrder: {
  readonly ASCENDING: "Ascending";
  readonly DESCENDING: "Descending";
};
export type ProjectSortOrder =
  (typeof ProjectSortOrder)[keyof typeof ProjectSortOrder];
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
export declare const ResourceCatalogSortBy: {
  readonly CREATION_TIME: "CreationTime";
};
export type ResourceCatalogSortBy =
  (typeof ResourceCatalogSortBy)[keyof typeof ResourceCatalogSortBy];
export declare const ResourceCatalogSortOrder: {
  readonly ASCENDING: "Ascending";
  readonly DESCENDING: "Descending";
};
export type ResourceCatalogSortOrder =
  (typeof ResourceCatalogSortOrder)[keyof typeof ResourceCatalogSortOrder];
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
export declare const SpaceSortKey: {
  readonly CreationTime: "CreationTime";
  readonly LastModifiedTime: "LastModifiedTime";
};
export type SpaceSortKey = (typeof SpaceSortKey)[keyof typeof SpaceSortKey];
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
export declare const StudioLifecycleConfigSortKey: {
  readonly CreationTime: "CreationTime";
  readonly LastModifiedTime: "LastModifiedTime";
  readonly Name: "Name";
};
export type StudioLifecycleConfigSortKey =
  (typeof StudioLifecycleConfigSortKey)[keyof typeof StudioLifecycleConfigSortKey];
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
export declare const TrainingJobSortByOptions: {
  readonly CreationTime: "CreationTime";
  readonly FinalObjectiveMetricValue: "FinalObjectiveMetricValue";
  readonly Name: "Name";
  readonly Status: "Status";
};
export type TrainingJobSortByOptions =
  (typeof TrainingJobSortByOptions)[keyof typeof TrainingJobSortByOptions];
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
export declare const TrainingPlanFilterName: {
  readonly STATUS: "Status";
};
export type TrainingPlanFilterName =
  (typeof TrainingPlanFilterName)[keyof typeof TrainingPlanFilterName];
export interface TrainingPlanFilter {
  Name: TrainingPlanFilterName | undefined;
  Value: string | undefined;
}
export declare const TrainingPlanSortBy: {
  readonly NAME: "TrainingPlanName";
  readonly START_TIME: "StartTime";
  readonly STATUS: "Status";
};
export type TrainingPlanSortBy =
  (typeof TrainingPlanSortBy)[keyof typeof TrainingPlanSortBy];
export declare const TrainingPlanSortOrder: {
  readonly ASCENDING: "Ascending";
  readonly DESCENDING: "Descending";
};
export type TrainingPlanSortOrder =
  (typeof TrainingPlanSortOrder)[keyof typeof TrainingPlanSortOrder];
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
export declare const SortTrialComponentsBy: {
  readonly CREATION_TIME: "CreationTime";
  readonly NAME: "Name";
};
export type SortTrialComponentsBy =
  (typeof SortTrialComponentsBy)[keyof typeof SortTrialComponentsBy];
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
export declare const SortTrialsBy: {
  readonly CREATION_TIME: "CreationTime";
  readonly NAME: "Name";
};
export type SortTrialsBy = (typeof SortTrialsBy)[keyof typeof SortTrialsBy];
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
export declare const UserProfileSortKey: {
  readonly CreationTime: "CreationTime";
  readonly LastModifiedTime: "LastModifiedTime";
};
export type UserProfileSortKey =
  (typeof UserProfileSortKey)[keyof typeof UserProfileSortKey];
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
export declare const ListWorkforcesSortByOptions: {
  readonly CreateDate: "CreateDate";
  readonly Name: "Name";
};
export type ListWorkforcesSortByOptions =
  (typeof ListWorkforcesSortByOptions)[keyof typeof ListWorkforcesSortByOptions];
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
export declare const ListWorkteamsSortByOptions: {
  readonly CreateDate: "CreateDate";
  readonly Name: "Name";
};
export type ListWorkteamsSortByOptions =
  (typeof ListWorkteamsSortByOptions)[keyof typeof ListWorkteamsSortByOptions];
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
export declare const ModelVariantAction: {
  readonly PROMOTE: "Promote";
  readonly REMOVE: "Remove";
  readonly RETAIN: "Retain";
};
export type ModelVariantAction =
  (typeof ModelVariantAction)[keyof typeof ModelVariantAction];
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
export declare const Relation: {
  readonly EQUAL_TO: "EqualTo";
  readonly GREATER_THAN_OR_EQUAL_TO: "GreaterThanOrEqualTo";
};
export type Relation = (typeof Relation)[keyof typeof Relation];
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
  InstanceType: ReservedCapacityInstanceType | undefined;
  InstanceCount: number | undefined;
  AvailabilityZone?: string | undefined;
  DurationHours?: number | undefined;
  DurationMinutes?: number | undefined;
  StartTime?: Date | undefined;
  EndTime?: Date | undefined;
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
export declare const SearchSortOrder: {
  readonly ASCENDING: "Ascending";
  readonly DESCENDING: "Descending";
};
export type SearchSortOrder =
  (typeof SearchSortOrder)[keyof typeof SearchSortOrder];
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
  StartTimeAfter?: Date | undefined;
  EndTimeBefore?: Date | undefined;
  DurationHours: number | undefined;
  TargetResources: SageMakerResourceName[] | undefined;
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
}
export interface StartPipelineExecutionResponse {
  PipelineExecutionArn?: string | undefined;
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
export declare const ModelCardFilterSensitiveLog: (obj: ModelCard) => any;
export declare const ModelPackageFilterSensitiveLog: (obj: ModelPackage) => any;
export declare const SearchRecordFilterSensitiveLog: (obj: SearchRecord) => any;
export declare const SearchResponseFilterSensitiveLog: (
  obj: SearchResponse
) => any;
