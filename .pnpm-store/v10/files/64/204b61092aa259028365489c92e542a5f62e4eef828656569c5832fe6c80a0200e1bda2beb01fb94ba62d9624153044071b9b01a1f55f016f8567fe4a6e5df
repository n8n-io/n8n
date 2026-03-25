import {
  ActionStatus,
  ActivationState,
  AdditionalInferenceSpecificationDefinition,
  AppNetworkAccessType,
  AppSecurityGroupManagement,
  BooleanOperator,
  ClusterInstanceGroupSpecification,
  ClusterNodeRecovery,
  CodeEditorAppImageConfig,
  ComputeQuotaConfig,
  ComputeQuotaTarget,
  DeploymentConfiguration,
  InferenceSpecification,
  JupyterLabAppImageConfig,
  KernelGatewayImageConfig,
  ModelApprovalStatus,
  Tag,
} from "./models_0";
import {
  _InstanceType,
  DefaultSpaceSettings,
  DeploymentConfig,
  EdgeOutputConfig,
  FeatureDefinition,
  InferenceComponentRuntimeConfig,
  InferenceComponentSpecification,
  InferenceExperimentDataStorageConfig,
  InferenceExperimentSchedule,
  JobType,
  ModelCardStatus,
  ModelLifeCycle,
  ModelPackageModelCard,
  ModelVariantConfig,
  Processor,
  SchedulerConfig,
  ShadowModeConfig,
  TagPropagation,
  ThroughputMode,
  TrackingServerSize,
  UserSettings,
  VendorGuidance,
} from "./models_1";
import {
  CrossAccountFilterOption,
  FeatureParameter,
  HubContentType,
  InstanceMetadataServiceConfiguration,
  MemberDefinition,
  MonitoringScheduleConfig,
  NotebookInstanceAcceleratorType,
  NotebookInstanceLifecycleHook,
  NotificationConfiguration,
  OidcConfig,
  ParallelismConfiguration,
  PartnerAppConfig,
  PartnerAppMaintenanceConfig,
  PipelineDefinitionS3Location,
  ProfilerRuleConfiguration,
  ProvisioningParameter,
  RootAccess,
  SourceIpConfig,
  SpaceSettings,
  TrialComponentArtifact,
  TrialComponentParameterValue,
  TrialComponentStatus,
  WorkerAccessConfiguration,
  WorkforceVpcConfigRequest,
} from "./models_2";
import {
  DesiredWeightAndCapacity,
  Device,
  DomainSettingsForUpdate,
  Filter,
  GitConfigForUpdate,
  HubContentSupportStatus,
  InferenceComponentDeploymentConfig,
  ResourceType,
  Workforce,
  Workteam,
} from "./models_3";
import {
  NestedFilters,
  OnlineStoreConfigUpdate,
  ProfilerConfigForUpdate,
  RemoteDebugConfigForUpdate,
  ResourceConfigForUpdate,
  SearchSortOrder,
  VisibilityConditions,
} from "./models_4";
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
  InstanceGroups: ClusterInstanceGroupSpecification[] | undefined;
  NodeRecovery?: ClusterNodeRecovery | undefined;
  InstanceGroupsToDelete?: string[] | undefined;
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
}
export interface UpdateDomainResponse {
  DomainArn?: string | undefined;
}
export declare const VariantPropertyType: {
  readonly DataCaptureConfig: "DataCaptureConfig";
  readonly DesiredInstanceCount: "DesiredInstanceCount";
  readonly DesiredWeight: "DesiredWeight";
};
export type VariantPropertyType =
  (typeof VariantPropertyType)[keyof typeof VariantPropertyType];
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
export interface UpdateMlflowTrackingServerRequest {
  TrackingServerName: string | undefined;
  ArtifactStoreUri?: string | undefined;
  TrackingServerSize?: TrackingServerSize | undefined;
  AutomaticModelRegistration?: boolean | undefined;
  WeeklyMaintenanceWindowStart?: string | undefined;
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
export interface ServiceCatalogProvisioningUpdateDetails {
  ProvisioningArtifactId?: string | undefined;
  ProvisioningParameters?: ProvisioningParameter[] | undefined;
}
export interface UpdateProjectInput {
  ProjectName: string | undefined;
  ProjectDescription?: string | undefined;
  ServiceCatalogProvisioningUpdateDetails?:
    | ServiceCatalogProvisioningUpdateDetails
    | undefined;
  Tags?: Tag[] | undefined;
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
export declare const UpdateModelCardRequestFilterSensitiveLog: (
  obj: UpdateModelCardRequest
) => any;
export declare const UpdateModelPackageInputFilterSensitiveLog: (
  obj: UpdateModelPackageInput
) => any;
export declare const UpdateWorkforceRequestFilterSensitiveLog: (
  obj: UpdateWorkforceRequest
) => any;
