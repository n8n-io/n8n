import { _InstanceType, AccountDefaultStatus, ActionStatus, ActivationState, AppNetworkAccessType, AppSecurityGroupManagement, AppType, BatchStrategy, BooleanOperator, ClusterNodeProvisioningMode, ClusterNodeRecovery, CrossAccountFilterOption, Direction, EndpointStatus, FeatureStatus, HubContentSupportStatus, HubContentType, InferenceExperimentStopDesiredState, IPAddressType, JobType, LineageType, ListWorkforcesSortByOptions, ListWorkteamsSortByOptions, ModelApprovalStatus, ModelCardStatus, ModelPackageGroupStatus, ModelPackageRegistrationType, ModelPackageStatus, ModelRegistrationMode, ModelVariantAction, MonitoringType, NotebookInstanceAcceleratorType, PipelineExecutionStatus, PipelineStatus, ProcessingJobStatus, Processor, ProjectSortBy, ProjectSortOrder, ProjectStatus, Relation, ReservedCapacityInstanceType, ReservedCapacityType, ResourceCatalogSortBy, ResourceCatalogSortOrder, ResourceType, RootAccess, SageMakerResourceName, ScheduleStatus, SearchSortOrder, SecondaryStatus, SharingType, SkipModelValidation, SortBy, SortOrder, SortTrialComponentsBy, SortTrialsBy, SpaceSortKey, SpaceStatus, StudioLifecycleConfigAppType, StudioLifecycleConfigSortKey, TagPropagation, ThroughputMode, TrackingServerSize, TrainingJobSortByOptions, TrainingJobStatus, TrainingPlanFilterName, TrainingPlanSortBy, TrainingPlanSortOrder, TrainingPlanStatus, TransformJobStatus, UltraServerHealthStatus, UserProfileSortKey, UserProfileStatus, VariantPropertyType, VendorGuidance, WarmPoolResourceStatus, WorkforceIpAddressType } from "./enums";
import { type AlgorithmSpecification, type AppSpecification, type BatchDataCaptureConfig, type BatchTransformInput, type CfnUpdateTemplateProvider, type CheckpointConfig, type ClusterAutoScalingConfig, type ClusterOrchestrator, type ClusterTieredStorageConfig, type CodeEditorAppImageConfig, type ComputeQuotaConfig, type ComputeQuotaTarget, type DeploymentConfiguration, type InferenceSpecification, type JupyterLabAppImageConfig, type KernelGatewayImageConfig, type MetadataProperties, type OutputDataConfig, type ResourceConfig, type SchedulerConfig, type StoppingCondition, type TransformInput, type TransformOutput, type TransformResources, type UserContext, type VpcConfig, AdditionalInferenceSpecificationDefinition, Channel, ClusterInstanceGroupSpecification, ClusterRestrictedInstanceGroupSpecification, ContainerDefinition, OutputParameter, Tag } from "./models_0";
import { type DefaultSpaceSettings, type DeploymentConfig, type DriftCheckBaselines, type EdgeOutputConfig, type ExperimentConfig, type InferenceComponentRuntimeConfig, type InferenceComponentSpecification, type InferenceExecutionConfig, type InferenceExperimentDataStorageConfig, type InferenceExperimentSchedule, type InstanceMetadataServiceConfiguration, type ModelCardSecurityConfig, type ModelLifeCycle, type ModelMetrics, type ModelPackageModelCard, type ModelPackageSecurityConfig, type ModelPackageValidationSpecification, type MonitoringScheduleConfig, type NetworkConfig, type ParallelismConfiguration, type PartnerAppConfig, type PartnerAppMaintenanceConfig, type PipelineDefinitionS3Location, type ProcessingOutputConfig, type ProcessingResources, type ProcessingStoppingCondition, type RetryStrategy, type ServiceCatalogProvisioningDetails, type ShadowModeConfig, type SourceAlgorithmSpecification, type TtlDuration, type UiTemplate, type UserSettings, FeatureDefinition, ModelVariantConfig, NotebookInstanceLifecycleHook, ProcessingInput, ProvisioningParameter } from "./models_1";
import { type DataProcessing, type DebugHookConfig, type DeploymentRecommendation, type InferenceComponentDeploymentConfig, type ModelArtifacts, type ModelClientConfig, type ModelPackageConfig, type ModelPackageStatusDetails, type MonitoringExecutionSummary, type NotificationConfiguration, type OidcConfig, type PipelineExperimentConfig, type ProfilerConfig, type SourceIpConfig, type SpaceSettings, type SpaceStorageSettings, type TensorBoardOutputConfig, type TrialComponentStatus, type WorkerAccessConfiguration, type WorkforceVpcConfigRequest, DebugRuleConfiguration, DebugRuleEvaluationStatus, FeatureParameter, HyperParameterTrainingJobSummary, MemberDefinition, ProfilerRuleConfiguration, TrialComponentArtifact, TrialComponentParameterValue } from "./models_2";
import { type DomainSettingsForUpdate, type Endpoint, type Experiment, type FeatureGroup, type FeatureMetadata, type GitConfigForUpdate, type HyperParameterTuningJobSearchEntity, type SelectiveExecutionConfig, type ServiceCatalogProvisionedProductDetails, type TrialComponentSource, type TrialSource, type WarmPoolStatus, DesiredWeightAndCapacity, Device, DeviceDeploymentSummary, Edge, Filter, MetricData, MonitoringAlertSummary, Parameter, PipelineSummary, ReservedCapacitySummary, SecondaryStatusTransition, SubscribedWorkteam, TemplateProviderDetail, TrialComponentMetricSummary, Workforce, Workteam } from "./models_3";
/**
 * @public
 */
export interface ListPipelinesResponse {
    /**
     * <p>Contains a sorted list of <code>PipelineSummary</code> objects matching the specified filters. Each <code>PipelineSummary</code> consists of PipelineArn, PipelineName, ExperimentName, PipelineDescription, CreationTime, LastModifiedTime, LastRunTime, and RoleArn. This list can be empty. </p>
     * @public
     */
    PipelineSummaries?: PipelineSummary[] | undefined;
    /**
     * <p>If the result of the previous <code>ListPipelines</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of pipelines, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListPipelineVersionsRequest {
    /**
     * <p>The Amazon Resource Name (ARN) of the pipeline.</p>
     * @public
     */
    PipelineName: string | undefined;
    /**
     * <p>A filter that returns the pipeline versions that were created after a specified time.</p>
     * @public
     */
    CreatedAfter?: Date | undefined;
    /**
     * <p>A filter that returns the pipeline versions that were created before a specified time.</p>
     * @public
     */
    CreatedBefore?: Date | undefined;
    /**
     * <p>The sort order for the results.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>If the result of the previous <code>ListPipelineVersions</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of pipeline versions, use this token in your next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of pipeline versions to return in the response.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * <p>The summary of the pipeline version.</p>
 * @public
 */
export interface PipelineVersionSummary {
    /**
     * <p>The Amazon Resource Name (ARN) of the pipeline.</p>
     * @public
     */
    PipelineArn?: string | undefined;
    /**
     * <p>The ID of the pipeline version.</p>
     * @public
     */
    PipelineVersionId?: number | undefined;
    /**
     * <p>The creation time of the pipeline version.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>The description of the pipeline version.</p>
     * @public
     */
    PipelineVersionDescription?: string | undefined;
    /**
     * <p>The display name of the pipeline version.</p>
     * @public
     */
    PipelineVersionDisplayName?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the most recent pipeline execution created from this pipeline version.</p>
     * @public
     */
    LastExecutionPipelineExecutionArn?: string | undefined;
}
/**
 * @public
 */
export interface ListPipelineVersionsResponse {
    /**
     * <p>Contains a sorted list of pipeline version summary objects matching the specified filters. Each version summary includes the pipeline version ID, the creation date, and the last pipeline execution created from that version. This list can be empty.</p>
     * @public
     */
    PipelineVersionSummaries?: PipelineVersionSummary[] | undefined;
    /**
     * <p>If the result of the previous <code>ListPipelineVersions</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of pipeline versions, use this token in your next request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListProcessingJobsRequest {
    /**
     * <p>A filter that returns only processing jobs created after the specified time.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only processing jobs created after the specified time.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns only processing jobs modified after the specified time.</p>
     * @public
     */
    LastModifiedTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only processing jobs modified before the specified time.</p>
     * @public
     */
    LastModifiedTimeBefore?: Date | undefined;
    /**
     * <p>A string in the processing job name. This filter returns only processing jobs whose name contains the specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>A filter that retrieves only processing jobs with a specific status.</p>
     * @public
     */
    StatusEquals?: ProcessingJobStatus | undefined;
    /**
     * <p>The field to sort results by. The default is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: SortBy | undefined;
    /**
     * <p>The sort order for results. The default is <code>Ascending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>If the result of the previous <code>ListProcessingJobs</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of processing jobs, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of processing jobs to return in the response.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * <p>Summary of information about a processing job.</p>
 * @public
 */
export interface ProcessingJobSummary {
    /**
     * <p>The name of the processing job.</p>
     * @public
     */
    ProcessingJobName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the processing job..</p>
     * @public
     */
    ProcessingJobArn: string | undefined;
    /**
     * <p>The time at which the processing job was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The time at which the processing job completed.</p>
     * @public
     */
    ProcessingEndTime?: Date | undefined;
    /**
     * <p>A timestamp that indicates the last time the processing job was modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>The status of the processing job.</p>
     * @public
     */
    ProcessingJobStatus: ProcessingJobStatus | undefined;
    /**
     * <p>A string, up to one KB in size, that contains the reason a processing job failed, if it failed.</p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>An optional string, up to one KB in size, that contains metadata from the processing container when the processing job exits.</p>
     * @public
     */
    ExitMessage?: string | undefined;
}
/**
 * @public
 */
export interface ListProcessingJobsResponse {
    /**
     * <p>An array of <code>ProcessingJobSummary</code> objects, each listing a processing job.</p>
     * @public
     */
    ProcessingJobSummaries: ProcessingJobSummary[] | undefined;
    /**
     * <p>If the response is truncated, Amazon SageMaker returns this token. To retrieve the next set of processing jobs, use it in the subsequent request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListProjectsInput {
    /**
     * <p>A filter that returns the projects that were created after a specified time.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns the projects that were created before a specified time.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>The maximum number of projects to return in the response.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>A filter that returns the projects whose name contains a specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>If the result of the previous <code>ListProjects</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of projects, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The field by which to sort results. The default is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: ProjectSortBy | undefined;
    /**
     * <p>The sort order for results. The default is <code>Ascending</code>.</p>
     * @public
     */
    SortOrder?: ProjectSortOrder | undefined;
}
/**
 * <p>Information about a project.</p>
 * @public
 */
export interface ProjectSummary {
    /**
     * <p>The name of the project.</p>
     * @public
     */
    ProjectName: string | undefined;
    /**
     * <p>The description of the project.</p>
     * @public
     */
    ProjectDescription?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the project.</p>
     * @public
     */
    ProjectArn: string | undefined;
    /**
     * <p>The ID of the project.</p>
     * @public
     */
    ProjectId: string | undefined;
    /**
     * <p>The time that the project was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The status of the project.</p>
     * @public
     */
    ProjectStatus: ProjectStatus | undefined;
}
/**
 * @public
 */
export interface ListProjectsOutput {
    /**
     * <p>A list of summaries of projects.</p>
     * @public
     */
    ProjectSummaryList: ProjectSummary[] | undefined;
    /**
     * <p>If the result of the previous <code>ListCompilationJobs</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of model compilation jobs, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListResourceCatalogsRequest {
    /**
     * <p> A string that partially matches one or more <code>ResourceCatalog</code>s names. Filters <code>ResourceCatalog</code> by name. </p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p> Use this parameter to search for <code>ResourceCatalog</code>s created after a specific date and time. </p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p> Use this parameter to search for <code>ResourceCatalog</code>s created before a specific date and time. </p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p> The order in which the resource catalogs are listed. </p>
     * @public
     */
    SortOrder?: ResourceCatalogSortOrder | undefined;
    /**
     * <p> The value on which the resource catalog list is sorted. </p>
     * @public
     */
    SortBy?: ResourceCatalogSortBy | undefined;
    /**
     * <p> The maximum number of results returned by <code>ListResourceCatalogs</code>. </p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p> A token to resume pagination of <code>ListResourceCatalogs</code> results. </p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * <p> A resource catalog containing all of the resources of a specific resource type within a resource owner account. For an example on sharing the Amazon SageMaker Feature Store <code>DefaultFeatureGroupCatalog</code>, see <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/feature-store-cross-account-discoverability-share-sagemaker-catalog.html">Share Amazon SageMaker Catalog resource type</a> in the Amazon SageMaker Developer Guide. </p>
 * @public
 */
export interface ResourceCatalog {
    /**
     * <p> The Amazon Resource Name (ARN) of the <code>ResourceCatalog</code>. </p>
     * @public
     */
    ResourceCatalogArn: string | undefined;
    /**
     * <p> The name of the <code>ResourceCatalog</code>. </p>
     * @public
     */
    ResourceCatalogName: string | undefined;
    /**
     * <p> A free form description of the <code>ResourceCatalog</code>. </p>
     * @public
     */
    Description: string | undefined;
    /**
     * <p> The time the <code>ResourceCatalog</code> was created. </p>
     * @public
     */
    CreationTime: Date | undefined;
}
/**
 * @public
 */
export interface ListResourceCatalogsResponse {
    /**
     * <p> A list of the requested <code>ResourceCatalog</code>s. </p>
     * @public
     */
    ResourceCatalogs?: ResourceCatalog[] | undefined;
    /**
     * <p> A token to resume pagination of <code>ListResourceCatalogs</code> results. </p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListSpacesRequest {
    /**
     * <p>If the previous response was truncated, you will receive this token. Use it in your next request to receive the next set of results.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>This parameter defines the maximum number of results that can be return in a single response. The <code>MaxResults</code> parameter is an upper bound, not a target. If there are more results available than the value specified, a <code>NextToken</code> is provided in the response. The <code>NextToken</code> indicates that the user should get the next set of results by providing this token as a part of a subsequent call. The default value for <code>MaxResults</code> is 10.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>The sort order for the results. The default is <code>Ascending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>The parameter by which to sort the results. The default is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: SpaceSortKey | undefined;
    /**
     * <p>A parameter to search for the domain ID.</p>
     * @public
     */
    DomainIdEquals?: string | undefined;
    /**
     * <p>A parameter by which to filter the results.</p>
     * @public
     */
    SpaceNameContains?: string | undefined;
}
/**
 * <p>Specifies summary information about the ownership settings.</p>
 * @public
 */
export interface OwnershipSettingsSummary {
    /**
     * <p>The user profile who is the owner of the space.</p>
     * @public
     */
    OwnerUserProfileName?: string | undefined;
}
/**
 * <p>Specifies summary information about the space settings.</p>
 * @public
 */
export interface SpaceSettingsSummary {
    /**
     * <p>The type of app created within the space.</p>
     * @public
     */
    AppType?: AppType | undefined;
    /**
     * <p>A setting that enables or disables remote access for a SageMaker space. When enabled, this allows you to connect to the remote space from your local IDE.</p>
     * @public
     */
    RemoteAccess?: FeatureStatus | undefined;
    /**
     * <p>The storage settings for a space.</p>
     * @public
     */
    SpaceStorageSettings?: SpaceStorageSettings | undefined;
}
/**
 * <p>Specifies summary information about the space sharing settings.</p>
 * @public
 */
export interface SpaceSharingSettingsSummary {
    /**
     * <p>Specifies the sharing type of the space.</p>
     * @public
     */
    SharingType?: SharingType | undefined;
}
/**
 * <p>The space's details.</p>
 * @public
 */
export interface SpaceDetails {
    /**
     * <p>The ID of the associated domain.</p>
     * @public
     */
    DomainId?: string | undefined;
    /**
     * <p>The name of the space.</p>
     * @public
     */
    SpaceName?: string | undefined;
    /**
     * <p>The status.</p>
     * @public
     */
    Status?: SpaceStatus | undefined;
    /**
     * <p>The creation time.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>The last modified time.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>Specifies summary information about the space settings.</p>
     * @public
     */
    SpaceSettingsSummary?: SpaceSettingsSummary | undefined;
    /**
     * <p>Specifies summary information about the space sharing settings.</p>
     * @public
     */
    SpaceSharingSettingsSummary?: SpaceSharingSettingsSummary | undefined;
    /**
     * <p>Specifies summary information about the ownership settings.</p>
     * @public
     */
    OwnershipSettingsSummary?: OwnershipSettingsSummary | undefined;
    /**
     * <p>The name of the space that appears in the Studio UI.</p>
     * @public
     */
    SpaceDisplayName?: string | undefined;
}
/**
 * @public
 */
export interface ListSpacesResponse {
    /**
     * <p>The list of spaces.</p>
     * @public
     */
    Spaces?: SpaceDetails[] | undefined;
    /**
     * <p>If the previous response was truncated, you will receive this token. Use it in your next request to receive the next set of results.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListStageDevicesRequest {
    /**
     * <p>The response from the last list when returning a list large enough to neeed tokening.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of requests to select.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>The name of the edge deployment plan.</p>
     * @public
     */
    EdgeDeploymentPlanName: string | undefined;
    /**
     * <p>Toggle for excluding devices deployed in other stages.</p>
     * @public
     */
    ExcludeDevicesDeployedInOtherStage?: boolean | undefined;
    /**
     * <p>The name of the stage in the deployment.</p>
     * @public
     */
    StageName: string | undefined;
}
/**
 * @public
 */
export interface ListStageDevicesResponse {
    /**
     * <p>List of summaries of devices allocated to the stage.</p>
     * @public
     */
    DeviceDeploymentSummaries: DeviceDeploymentSummary[] | undefined;
    /**
     * <p>The token to use when calling the next page of results.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListStudioLifecycleConfigsRequest {
    /**
     * <p>The total number of items to return in the response. If the total number of items available is more than the value specified, a <code>NextToken</code> is provided in the response. To resume pagination, provide the <code>NextToken</code> value in the as part of a subsequent call. The default value is 10.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>If the previous call to ListStudioLifecycleConfigs didn't return the full set of Lifecycle Configurations, the call returns a token for getting the next set of Lifecycle Configurations.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>A string in the Lifecycle Configuration name. This filter returns only Lifecycle Configurations whose name contains the specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>A parameter to search for the App Type to which the Lifecycle Configuration is attached.</p>
     * @public
     */
    AppTypeEquals?: StudioLifecycleConfigAppType | undefined;
    /**
     * <p>A filter that returns only Lifecycle Configurations created on or before the specified time.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns only Lifecycle Configurations created on or after the specified time.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only Lifecycle Configurations modified before the specified time.</p>
     * @public
     */
    ModifiedTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns only Lifecycle Configurations modified after the specified time.</p>
     * @public
     */
    ModifiedTimeAfter?: Date | undefined;
    /**
     * <p>The property used to sort results. The default value is CreationTime.</p>
     * @public
     */
    SortBy?: StudioLifecycleConfigSortKey | undefined;
    /**
     * <p>The sort order. The default value is Descending.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
}
/**
 * <p>Details of the Amazon SageMaker AI Studio Lifecycle Configuration.</p>
 * @public
 */
export interface StudioLifecycleConfigDetails {
    /**
     * <p> The Amazon Resource Name (ARN) of the Lifecycle Configuration.</p>
     * @public
     */
    StudioLifecycleConfigArn?: string | undefined;
    /**
     * <p>The name of the Amazon SageMaker AI Studio Lifecycle Configuration.</p>
     * @public
     */
    StudioLifecycleConfigName?: string | undefined;
    /**
     * <p>The creation time of the Amazon SageMaker AI Studio Lifecycle Configuration.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>This value is equivalent to CreationTime because Amazon SageMaker AI Studio Lifecycle Configurations are immutable.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>The App type to which the Lifecycle Configuration is attached.</p>
     * @public
     */
    StudioLifecycleConfigAppType?: StudioLifecycleConfigAppType | undefined;
}
/**
 * @public
 */
export interface ListStudioLifecycleConfigsResponse {
    /**
     * <p>If the previous response was truncated, you will receive this token. Use it in your next request to receive the next set of results.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>A list of Lifecycle Configurations and their properties.</p>
     * @public
     */
    StudioLifecycleConfigs?: StudioLifecycleConfigDetails[] | undefined;
}
/**
 * @public
 */
export interface ListSubscribedWorkteamsRequest {
    /**
     * <p>A string in the work team name. This filter returns only work teams whose name contains the specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>If the result of the previous <code>ListSubscribedWorkteams</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of labeling jobs, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of work teams to return in each page of the response.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * @public
 */
export interface ListSubscribedWorkteamsResponse {
    /**
     * <p>An array of <code>Workteam</code> objects, each describing a work team.</p>
     * @public
     */
    SubscribedWorkteams: SubscribedWorkteam[] | undefined;
    /**
     * <p>If the response is truncated, Amazon SageMaker returns this token. To retrieve the next set of work teams, use it in the subsequent request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListTagsInput {
    /**
     * <p>The Amazon Resource Name (ARN) of the resource whose tags you want to retrieve.</p>
     * @public
     */
    ResourceArn: string | undefined;
    /**
     * <p> If the response to the previous <code>ListTags</code> request is truncated, SageMaker returns this token. To retrieve the next set of tags, use it in the subsequent request. </p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>Maximum number of tags to return.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * @public
 */
export interface ListTagsOutput {
    /**
     * <p>An array of <code>Tag</code> objects, each with a tag key and a value.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p> If response is truncated, SageMaker includes a token in the response. You can use this token in your subsequent request to fetch next set of tokens. </p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListTrainingJobsRequest {
    /**
     * <p>If the result of the previous <code>ListTrainingJobs</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of training jobs, use the token in the next request. </p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of training jobs to return in the response.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>A filter that returns only training jobs created after the specified time (timestamp).</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only training jobs created before the specified time (timestamp).</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns only training jobs modified after the specified time (timestamp).</p>
     * @public
     */
    LastModifiedTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only training jobs modified before the specified time (timestamp).</p>
     * @public
     */
    LastModifiedTimeBefore?: Date | undefined;
    /**
     * <p>A string in the training job name. This filter returns only training jobs whose name contains the specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>A filter that retrieves only training jobs with a specific status.</p>
     * @public
     */
    StatusEquals?: TrainingJobStatus | undefined;
    /**
     * <p>The field to sort results by. The default is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: SortBy | undefined;
    /**
     * <p>The sort order for results. The default is <code>Ascending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>A filter that retrieves only training jobs with a specific warm pool status.</p>
     * @public
     */
    WarmPoolStatusEquals?: WarmPoolResourceStatus | undefined;
    /**
     * <p>The Amazon Resource Name (ARN); of the training plan to filter training jobs by. For more information about reserving GPU capacity for your SageMaker training jobs using Amazon SageMaker Training Plan, see <code> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTrainingPlan.html">CreateTrainingPlan</a> </code>.</p>
     * @public
     */
    TrainingPlanArnEquals?: string | undefined;
}
/**
 * <p>Provides summary information about a training job.</p>
 * @public
 */
export interface TrainingJobSummary {
    /**
     * <p>The name of the training job that you want a summary for.</p>
     * @public
     */
    TrainingJobName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the training job.</p>
     * @public
     */
    TrainingJobArn: string | undefined;
    /**
     * <p>A timestamp that shows when the training job was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>A timestamp that shows when the training job ended. This field is set only if the training job has one of the terminal statuses (<code>Completed</code>, <code>Failed</code>, or <code>Stopped</code>). </p>
     * @public
     */
    TrainingEndTime?: Date | undefined;
    /**
     * <p> Timestamp when the training job was last modified. </p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>The status of the training job.</p>
     * @public
     */
    TrainingJobStatus: TrainingJobStatus | undefined;
    /**
     * <p>The secondary status of the training job.</p>
     * @public
     */
    SecondaryStatus?: SecondaryStatus | undefined;
    /**
     * <p>The status of the warm pool associated with the training job.</p>
     * @public
     */
    WarmPoolStatus?: WarmPoolStatus | undefined;
    /**
     * <p>The Amazon Resource Name (ARN); of the training plan associated with this training job.</p> <p>For more information about how to reserve GPU capacity for your SageMaker HyperPod clusters using Amazon SageMaker Training Plan, see <code> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTrainingPlan.html">CreateTrainingPlan</a> </code>.</p>
     * @public
     */
    TrainingPlanArn?: string | undefined;
}
/**
 * @public
 */
export interface ListTrainingJobsResponse {
    /**
     * <p>An array of <code>TrainingJobSummary</code> objects, each listing a training job.</p>
     * @public
     */
    TrainingJobSummaries: TrainingJobSummary[] | undefined;
    /**
     * <p>If the response is truncated, SageMaker returns this token. To retrieve the next set of training jobs, use it in the subsequent request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListTrainingJobsForHyperParameterTuningJobRequest {
    /**
     * <p>The name of the tuning job whose training jobs you want to list.</p>
     * @public
     */
    HyperParameterTuningJobName: string | undefined;
    /**
     * <p>If the result of the previous <code>ListTrainingJobsForHyperParameterTuningJob</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of training jobs, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of training jobs to return. The default value is 10.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>A filter that returns only training jobs with the specified status.</p>
     * @public
     */
    StatusEquals?: TrainingJobStatus | undefined;
    /**
     * <p>The field to sort results by. The default is <code>Name</code>.</p> <p>If the value of this field is <code>FinalObjectiveMetricValue</code>, any training jobs that did not return an objective metric are not listed.</p>
     * @public
     */
    SortBy?: TrainingJobSortByOptions | undefined;
    /**
     * <p>The sort order for results. The default is <code>Ascending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
}
/**
 * @public
 */
export interface ListTrainingJobsForHyperParameterTuningJobResponse {
    /**
     * <p>A list of <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_TrainingJobSummary.html">TrainingJobSummary</a> objects that describe the training jobs that the <code>ListTrainingJobsForHyperParameterTuningJob</code> request returned.</p>
     * @public
     */
    TrainingJobSummaries: HyperParameterTrainingJobSummary[] | undefined;
    /**
     * <p>If the result of this <code>ListTrainingJobsForHyperParameterTuningJob</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of training jobs, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * <p>A filter to apply when listing or searching for training plans.</p> <p>For more information about how to reserve GPU capacity for your SageMaker HyperPod clusters using Amazon SageMaker Training Plan, see <code> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTrainingPlan.html">CreateTrainingPlan</a> </code>.</p>
 * @public
 */
export interface TrainingPlanFilter {
    /**
     * <p>The name of the filter field (e.g., Status, InstanceType).</p>
     * @public
     */
    Name: TrainingPlanFilterName | undefined;
    /**
     * <p>The value to filter by for the specified field.</p>
     * @public
     */
    Value: string | undefined;
}
/**
 * @public
 */
export interface ListTrainingPlansRequest {
    /**
     * <p>A token to continue pagination if more results are available.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of results to return in the response.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>Filter to list only training plans with an actual start time after this date.</p>
     * @public
     */
    StartTimeAfter?: Date | undefined;
    /**
     * <p>Filter to list only training plans with an actual start time before this date.</p>
     * @public
     */
    StartTimeBefore?: Date | undefined;
    /**
     * <p>The training plan field to sort the results by (e.g., StartTime, Status).</p>
     * @public
     */
    SortBy?: TrainingPlanSortBy | undefined;
    /**
     * <p>The order to sort the results (Ascending or Descending).</p>
     * @public
     */
    SortOrder?: TrainingPlanSortOrder | undefined;
    /**
     * <p>Additional filters to apply to the list of training plans.</p>
     * @public
     */
    Filters?: TrainingPlanFilter[] | undefined;
}
/**
 * <p>Details of the training plan.</p> <p>For more information about how to reserve GPU capacity for your SageMaker HyperPod clusters using Amazon SageMaker Training Plan, see <code> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTrainingPlan.html">CreateTrainingPlan</a> </code>.</p>
 * @public
 */
export interface TrainingPlanSummary {
    /**
     * <p>The Amazon Resource Name (ARN); of the training plan.</p>
     * @public
     */
    TrainingPlanArn: string | undefined;
    /**
     * <p>The name of the training plan.</p>
     * @public
     */
    TrainingPlanName: string | undefined;
    /**
     * <p>The current status of the training plan (e.g., Pending, Active, Expired). To see the complete list of status values available for a training plan, refer to the <code>Status</code> attribute within the <code> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_TrainingPlanSummary.html">TrainingPlanSummary</a> </code> object.</p>
     * @public
     */
    Status: TrainingPlanStatus | undefined;
    /**
     * <p>A message providing additional information about the current status of the training plan.</p>
     * @public
     */
    StatusMessage?: string | undefined;
    /**
     * <p>The number of whole hours in the total duration for this training plan.</p>
     * @public
     */
    DurationHours?: number | undefined;
    /**
     * <p>The additional minutes beyond whole hours in the total duration for this training plan.</p>
     * @public
     */
    DurationMinutes?: number | undefined;
    /**
     * <p>The start time of the training plan.</p>
     * @public
     */
    StartTime?: Date | undefined;
    /**
     * <p>The end time of the training plan.</p>
     * @public
     */
    EndTime?: Date | undefined;
    /**
     * <p>The upfront fee for the training plan.</p>
     * @public
     */
    UpfrontFee?: string | undefined;
    /**
     * <p>The currency code for the upfront fee (e.g., USD).</p>
     * @public
     */
    CurrencyCode?: string | undefined;
    /**
     * <p>The total number of instances reserved in this training plan.</p>
     * @public
     */
    TotalInstanceCount?: number | undefined;
    /**
     * <p>The number of instances currently available for use in this training plan.</p>
     * @public
     */
    AvailableInstanceCount?: number | undefined;
    /**
     * <p>The number of instances currently in use from this training plan.</p>
     * @public
     */
    InUseInstanceCount?: number | undefined;
    /**
     * <p>The total number of UltraServers allocated to this training plan.</p>
     * @public
     */
    TotalUltraServerCount?: number | undefined;
    /**
     * <p>The target resources (e.g., training jobs, HyperPod clusters, Endpoints) that can use this training plan.</p> <p>Training plans are specific to their target resource.</p> <ul> <li> <p>A training plan designed for SageMaker training jobs can only be used to schedule and run training jobs.</p> </li> <li> <p>A training plan for HyperPod clusters can be used exclusively to provide compute resources to a cluster's instance group.</p> </li> <li> <p>A training plan for SageMaker endpoints can be used exclusively to provide compute resources to SageMaker endpoints for model deployment.</p> </li> </ul>
     * @public
     */
    TargetResources?: SageMakerResourceName[] | undefined;
    /**
     * <p>A list of reserved capacities associated with this training plan, including details such as instance types, counts, and availability zones.</p>
     * @public
     */
    ReservedCapacitySummaries?: ReservedCapacitySummary[] | undefined;
}
/**
 * @public
 */
export interface ListTrainingPlansResponse {
    /**
     * <p>A token to continue pagination if more results are available.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>A list of summary information for the training plans.</p>
     * @public
     */
    TrainingPlanSummaries: TrainingPlanSummary[] | undefined;
}
/**
 * @public
 */
export interface ListTransformJobsRequest {
    /**
     * <p>A filter that returns only transform jobs created after the specified time.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only transform jobs created before the specified time.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns only transform jobs modified after the specified time.</p>
     * @public
     */
    LastModifiedTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only transform jobs modified before the specified time.</p>
     * @public
     */
    LastModifiedTimeBefore?: Date | undefined;
    /**
     * <p>A string in the transform job name. This filter returns only transform jobs whose name contains the specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>A filter that retrieves only transform jobs with a specific status.</p>
     * @public
     */
    StatusEquals?: TransformJobStatus | undefined;
    /**
     * <p>The field to sort results by. The default is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: SortBy | undefined;
    /**
     * <p>The sort order for results. The default is <code>Descending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>If the result of the previous <code>ListTransformJobs</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of transform jobs, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of transform jobs to return in the response. The default value is <code>10</code>.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * <p>Provides a summary of a transform job. Multiple <code>TransformJobSummary</code> objects are returned as a list after in response to a <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_ListTransformJobs.html">ListTransformJobs</a> call.</p>
 * @public
 */
export interface TransformJobSummary {
    /**
     * <p>The name of the transform job.</p>
     * @public
     */
    TransformJobName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the transform job.</p>
     * @public
     */
    TransformJobArn: string | undefined;
    /**
     * <p>A timestamp that shows when the transform Job was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>Indicates when the transform job ends on compute instances. For successful jobs and stopped jobs, this is the exact time recorded after the results are uploaded. For failed jobs, this is when Amazon SageMaker detected that the job failed.</p>
     * @public
     */
    TransformEndTime?: Date | undefined;
    /**
     * <p>Indicates when the transform job was last modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>The status of the transform job.</p>
     * @public
     */
    TransformJobStatus: TransformJobStatus | undefined;
    /**
     * <p>If the transform job failed, the reason it failed.</p>
     * @public
     */
    FailureReason?: string | undefined;
}
/**
 * @public
 */
export interface ListTransformJobsResponse {
    /**
     * <p>An array of <code>TransformJobSummary</code> objects.</p>
     * @public
     */
    TransformJobSummaries: TransformJobSummary[] | undefined;
    /**
     * <p>If the response is truncated, Amazon SageMaker returns this token. To retrieve the next set of transform jobs, use it in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListTrialComponentsRequest {
    /**
     * <p>A filter that returns only components that are part of the specified experiment. If you specify <code>ExperimentName</code>, you can't filter by <code>SourceArn</code> or <code>TrialName</code>.</p>
     * @public
     */
    ExperimentName?: string | undefined;
    /**
     * <p>A filter that returns only components that are part of the specified trial. If you specify <code>TrialName</code>, you can't filter by <code>ExperimentName</code> or <code>SourceArn</code>.</p>
     * @public
     */
    TrialName?: string | undefined;
    /**
     * <p>A filter that returns only components that have the specified source Amazon Resource Name (ARN). If you specify <code>SourceArn</code>, you can't filter by <code>ExperimentName</code> or <code>TrialName</code>.</p>
     * @public
     */
    SourceArn?: string | undefined;
    /**
     * <p>A filter that returns only components created after the specified time.</p>
     * @public
     */
    CreatedAfter?: Date | undefined;
    /**
     * <p>A filter that returns only components created before the specified time.</p>
     * @public
     */
    CreatedBefore?: Date | undefined;
    /**
     * <p>The property used to sort results. The default value is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: SortTrialComponentsBy | undefined;
    /**
     * <p>The sort order. The default value is <code>Descending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>The maximum number of components to return in the response. The default value is 10.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>If the previous call to <code>ListTrialComponents</code> didn't return the full set of components, the call returns a token for getting the next set of components.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * <p>A summary of the properties of a trial component. To get all the properties, call the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_DescribeTrialComponent.html">DescribeTrialComponent</a> API and provide the <code>TrialComponentName</code>.</p>
 * @public
 */
export interface TrialComponentSummary {
    /**
     * <p>The name of the trial component.</p>
     * @public
     */
    TrialComponentName?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the trial component.</p>
     * @public
     */
    TrialComponentArn?: string | undefined;
    /**
     * <p>The name of the component as displayed. If <code>DisplayName</code> isn't specified, <code>TrialComponentName</code> is displayed.</p>
     * @public
     */
    DisplayName?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) and job type of the source of a trial component.</p>
     * @public
     */
    TrialComponentSource?: TrialComponentSource | undefined;
    /**
     * <p>The status of the component. States include:</p> <ul> <li> <p>InProgress</p> </li> <li> <p>Completed</p> </li> <li> <p>Failed</p> </li> </ul>
     * @public
     */
    Status?: TrialComponentStatus | undefined;
    /**
     * <p>When the component started.</p>
     * @public
     */
    StartTime?: Date | undefined;
    /**
     * <p>When the component ended.</p>
     * @public
     */
    EndTime?: Date | undefined;
    /**
     * <p>When the component was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>Who created the trial component.</p>
     * @public
     */
    CreatedBy?: UserContext | undefined;
    /**
     * <p>When the component was last modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>Who last modified the component.</p>
     * @public
     */
    LastModifiedBy?: UserContext | undefined;
}
/**
 * @public
 */
export interface ListTrialComponentsResponse {
    /**
     * <p>A list of the summaries of your trial components.</p>
     * @public
     */
    TrialComponentSummaries?: TrialComponentSummary[] | undefined;
    /**
     * <p>A token for getting the next set of components, if there are any.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListTrialsRequest {
    /**
     * <p>A filter that returns only trials that are part of the specified experiment.</p>
     * @public
     */
    ExperimentName?: string | undefined;
    /**
     * <p>A filter that returns only trials that are associated with the specified trial component.</p>
     * @public
     */
    TrialComponentName?: string | undefined;
    /**
     * <p>A filter that returns only trials created after the specified time.</p>
     * @public
     */
    CreatedAfter?: Date | undefined;
    /**
     * <p>A filter that returns only trials created before the specified time.</p>
     * @public
     */
    CreatedBefore?: Date | undefined;
    /**
     * <p>The property used to sort results. The default value is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: SortTrialsBy | undefined;
    /**
     * <p>The sort order. The default value is <code>Descending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>The maximum number of trials to return in the response. The default value is 10.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>If the previous call to <code>ListTrials</code> didn't return the full set of trials, the call returns a token for getting the next set of trials.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * <p>A summary of the properties of a trial. To get the complete set of properties, call the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_DescribeTrial.html">DescribeTrial</a> API and provide the <code>TrialName</code>.</p>
 * @public
 */
export interface TrialSummary {
    /**
     * <p>The Amazon Resource Name (ARN) of the trial.</p>
     * @public
     */
    TrialArn?: string | undefined;
    /**
     * <p>The name of the trial.</p>
     * @public
     */
    TrialName?: string | undefined;
    /**
     * <p>The name of the trial as displayed. If <code>DisplayName</code> isn't specified, <code>TrialName</code> is displayed.</p>
     * @public
     */
    DisplayName?: string | undefined;
    /**
     * <p>The source of the trial.</p>
     * @public
     */
    TrialSource?: TrialSource | undefined;
    /**
     * <p>When the trial was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>When the trial was last modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
}
/**
 * @public
 */
export interface ListTrialsResponse {
    /**
     * <p>A list of the summaries of your trials.</p>
     * @public
     */
    TrialSummaries?: TrialSummary[] | undefined;
    /**
     * <p>A token for getting the next set of trials, if there are any.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListUltraServersByReservedCapacityRequest {
    /**
     * <p>The ARN of the reserved capacity to list UltraServers for.</p>
     * @public
     */
    ReservedCapacityArn: string | undefined;
    /**
     * <p>The maximum number of UltraServers to return in the response. The default value is 10.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>If the previous response was truncated, you receive this token. Use it in your next request to receive the next set of results.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * <p>Represents a high-performance compute server used for distributed training in SageMaker AI. An UltraServer consists of multiple instances within a shared NVLink interconnect domain.</p>
 * @public
 */
export interface UltraServer {
    /**
     * <p>The unique identifier for the UltraServer.</p>
     * @public
     */
    UltraServerId: string | undefined;
    /**
     * <p>The type of UltraServer, such as ml.u-p6e-gb200x72.</p>
     * @public
     */
    UltraServerType: string | undefined;
    /**
     * <p>The name of the Availability Zone where the UltraServer is provisioned.</p>
     * @public
     */
    AvailabilityZone: string | undefined;
    /**
     * <p>The Amazon EC2 instance type used in the UltraServer.</p>
     * @public
     */
    InstanceType: ReservedCapacityInstanceType | undefined;
    /**
     * <p>The total number of instances in this UltraServer.</p>
     * @public
     */
    TotalInstanceCount: number | undefined;
    /**
     * <p>The number of spare instances configured for this UltraServer to provide enhanced resiliency.</p>
     * @public
     */
    ConfiguredSpareInstanceCount?: number | undefined;
    /**
     * <p>The number of instances currently available for use in this UltraServer.</p>
     * @public
     */
    AvailableInstanceCount?: number | undefined;
    /**
     * <p>The number of instances currently in use in this UltraServer.</p>
     * @public
     */
    InUseInstanceCount?: number | undefined;
    /**
     * <p>The number of available spare instances in the UltraServer.</p>
     * @public
     */
    AvailableSpareInstanceCount?: number | undefined;
    /**
     * <p>The number of instances in this UltraServer that are currently in an unhealthy state.</p>
     * @public
     */
    UnhealthyInstanceCount?: number | undefined;
    /**
     * <p>The overall health status of the UltraServer.</p>
     * @public
     */
    HealthStatus?: UltraServerHealthStatus | undefined;
}
/**
 * @public
 */
export interface ListUltraServersByReservedCapacityResponse {
    /**
     * <p>If the response is truncated, SageMaker returns this token. Use it in the next request to retrieve the next set of UltraServers.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>A list of UltraServers that are part of the specified reserved capacity.</p>
     * @public
     */
    UltraServers: UltraServer[] | undefined;
}
/**
 * @public
 */
export interface ListUserProfilesRequest {
    /**
     * <p>If the previous response was truncated, you will receive this token. Use it in your next request to receive the next set of results.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>This parameter defines the maximum number of results that can be return in a single response. The <code>MaxResults</code> parameter is an upper bound, not a target. If there are more results available than the value specified, a <code>NextToken</code> is provided in the response. The <code>NextToken</code> indicates that the user should get the next set of results by providing this token as a part of a subsequent call. The default value for <code>MaxResults</code> is 10.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>The sort order for the results. The default is Ascending.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>The parameter by which to sort the results. The default is CreationTime.</p>
     * @public
     */
    SortBy?: UserProfileSortKey | undefined;
    /**
     * <p>A parameter by which to filter the results.</p>
     * @public
     */
    DomainIdEquals?: string | undefined;
    /**
     * <p>A parameter by which to filter the results.</p>
     * @public
     */
    UserProfileNameContains?: string | undefined;
}
/**
 * <p>The user profile details.</p>
 * @public
 */
export interface UserProfileDetails {
    /**
     * <p>The domain ID.</p>
     * @public
     */
    DomainId?: string | undefined;
    /**
     * <p>The user profile name.</p>
     * @public
     */
    UserProfileName?: string | undefined;
    /**
     * <p>The status.</p>
     * @public
     */
    Status?: UserProfileStatus | undefined;
    /**
     * <p>The creation time.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>The last modified time.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
}
/**
 * @public
 */
export interface ListUserProfilesResponse {
    /**
     * <p>The list of user profiles.</p>
     * @public
     */
    UserProfiles?: UserProfileDetails[] | undefined;
    /**
     * <p>If the previous response was truncated, you will receive this token. Use it in your next request to receive the next set of results.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListWorkforcesRequest {
    /**
     * <p>Sort workforces using the workforce name or creation date.</p>
     * @public
     */
    SortBy?: ListWorkforcesSortByOptions | undefined;
    /**
     * <p>Sort workforces in ascending or descending order.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>A filter you can use to search for workforces using part of the workforce name.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>A token to resume pagination.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of workforces returned in the response.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * @public
 */
export interface ListWorkforcesResponse {
    /**
     * <p>A list containing information about your workforce.</p>
     * @public
     */
    Workforces: Workforce[] | undefined;
    /**
     * <p>A token to resume pagination.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListWorkteamsRequest {
    /**
     * <p>The field to sort results by. The default is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: ListWorkteamsSortByOptions | undefined;
    /**
     * <p>The sort order for results. The default is <code>Ascending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>A string in the work team's name. This filter returns only work teams whose name contains the specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>If the result of the previous <code>ListWorkteams</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of labeling jobs, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of work teams to return in each page of the response.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * @public
 */
export interface ListWorkteamsResponse {
    /**
     * <p>An array of <code>Workteam</code> objects, each describing a work team.</p>
     * @public
     */
    Workteams: Workteam[] | undefined;
    /**
     * <p>If the response is truncated, Amazon SageMaker returns this token. To retrieve the next set of work teams, use it in the subsequent request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * <p>The properties of a model as returned by the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_Search.html">Search</a> API.</p>
 * @public
 */
export interface Model {
    /**
     * <p>The name of the model.</p>
     * @public
     */
    ModelName?: string | undefined;
    /**
     * <p>Describes the container, as part of model definition.</p>
     * @public
     */
    PrimaryContainer?: ContainerDefinition | undefined;
    /**
     * <p>The containers in the inference pipeline.</p>
     * @public
     */
    Containers?: ContainerDefinition[] | undefined;
    /**
     * <p>Specifies details about how containers in a multi-container endpoint are run.</p>
     * @public
     */
    InferenceExecutionConfig?: InferenceExecutionConfig | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the IAM role that you specified for the model.</p>
     * @public
     */
    ExecutionRoleArn?: string | undefined;
    /**
     * <p>Specifies an Amazon Virtual Private Cloud (VPC) that your SageMaker jobs, hosted models, and compute resources have access to. You can control access to and from your resources by configuring a VPC. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/infrastructure-give-access.html">Give SageMaker Access to Resources in your Amazon VPC</a>. </p>
     * @public
     */
    VpcConfig?: VpcConfig | undefined;
    /**
     * <p>A timestamp that indicates when the model was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the model.</p>
     * @public
     */
    ModelArn?: string | undefined;
    /**
     * <p>Isolates the model container. No inbound or outbound network calls can be made to or from the model container.</p>
     * @public
     */
    EnableNetworkIsolation?: boolean | undefined;
    /**
     * <p>A list of key-value pairs associated with the model. For more information, see <a href="https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html">Tagging Amazon Web Services resources</a> in the <i>Amazon Web Services General Reference Guide</i>.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>A set of recommended deployment configurations for the model.</p>
     * @public
     */
    DeploymentRecommendation?: DeploymentRecommendation | undefined;
}
/**
 * <p>An Amazon SageMaker Model Card.</p>
 * @public
 */
export interface ModelCard {
    /**
     * <p>The Amazon Resource Name (ARN) of the model card.</p>
     * @public
     */
    ModelCardArn?: string | undefined;
    /**
     * <p>The unique name of the model card.</p>
     * @public
     */
    ModelCardName?: string | undefined;
    /**
     * <p>The version of the model card.</p>
     * @public
     */
    ModelCardVersion?: number | undefined;
    /**
     * <p>The content of the model card. Content uses the <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/model-cards.html#model-cards-json-schema">model card JSON schema</a> and provided as a string.</p>
     * @public
     */
    Content?: string | undefined;
    /**
     * <p>The approval status of the model card within your organization. Different organizations might have different criteria for model card review and approval.</p> <ul> <li> <p> <code>Draft</code>: The model card is a work in progress.</p> </li> <li> <p> <code>PendingReview</code>: The model card is pending review.</p> </li> <li> <p> <code>Approved</code>: The model card is approved.</p> </li> <li> <p> <code>Archived</code>: The model card is archived. No more updates should be made to the model card, but it can still be exported.</p> </li> </ul>
     * @public
     */
    ModelCardStatus?: ModelCardStatus | undefined;
    /**
     * <p>The security configuration used to protect model card data.</p>
     * @public
     */
    SecurityConfig?: ModelCardSecurityConfig | undefined;
    /**
     * <p>The date and time that the model card was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>Information about the user who created or modified a SageMaker resource.</p>
     * @public
     */
    CreatedBy?: UserContext | undefined;
    /**
     * <p>The date and time that the model card was last modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>Information about the user who created or modified a SageMaker resource.</p>
     * @public
     */
    LastModifiedBy?: UserContext | undefined;
    /**
     * <p>Key-value pairs used to manage metadata for the model card.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>The unique name (ID) of the model.</p>
     * @public
     */
    ModelId?: string | undefined;
    /**
     * <p>The risk rating of the model. Different organizations might have different criteria for model card risk ratings. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/model-cards-risk-rating.html">Risk ratings</a>.</p>
     * @public
     */
    RiskRating?: string | undefined;
    /**
     * <p>The model package group that contains the model package. Only relevant for model cards created for model packages in the Amazon SageMaker Model Registry. </p>
     * @public
     */
    ModelPackageGroupName?: string | undefined;
}
/**
 * <p>An endpoint that hosts a model displayed in the Amazon SageMaker Model Dashboard.</p>
 * @public
 */
export interface ModelDashboardEndpoint {
    /**
     * <p>The endpoint name.</p>
     * @public
     */
    EndpointName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the endpoint.</p>
     * @public
     */
    EndpointArn: string | undefined;
    /**
     * <p>A timestamp that indicates when the endpoint was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The last time the endpoint was modified.</p>
     * @public
     */
    LastModifiedTime: Date | undefined;
    /**
     * <p>The endpoint status.</p>
     * @public
     */
    EndpointStatus: EndpointStatus | undefined;
}
/**
 * <p>A batch transform job. For information about SageMaker batch transform, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/batch-transform.html">Use Batch Transform</a>.</p>
 * @public
 */
export interface TransformJob {
    /**
     * <p>The name of the transform job.</p>
     * @public
     */
    TransformJobName?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the transform job.</p>
     * @public
     */
    TransformJobArn?: string | undefined;
    /**
     * <p>The status of the transform job.</p> <p>Transform job statuses are:</p> <ul> <li> <p> <code>InProgress</code> - The job is in progress.</p> </li> <li> <p> <code>Completed</code> - The job has completed.</p> </li> <li> <p> <code>Failed</code> - The transform job has failed. To see the reason for the failure, see the <code>FailureReason</code> field in the response to a <code>DescribeTransformJob</code> call.</p> </li> <li> <p> <code>Stopping</code> - The transform job is stopping.</p> </li> <li> <p> <code>Stopped</code> - The transform job has stopped.</p> </li> </ul>
     * @public
     */
    TransformJobStatus?: TransformJobStatus | undefined;
    /**
     * <p>If the transform job failed, the reason it failed.</p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>The name of the model associated with the transform job.</p>
     * @public
     */
    ModelName?: string | undefined;
    /**
     * <p>The maximum number of parallel requests that can be sent to each instance in a transform job. If <code>MaxConcurrentTransforms</code> is set to 0 or left unset, SageMaker checks the optional execution-parameters to determine the settings for your chosen algorithm. If the execution-parameters endpoint is not enabled, the default value is 1. For built-in algorithms, you don't need to set a value for <code>MaxConcurrentTransforms</code>.</p>
     * @public
     */
    MaxConcurrentTransforms?: number | undefined;
    /**
     * <p>Configures the timeout and maximum number of retries for processing a transform job invocation.</p>
     * @public
     */
    ModelClientConfig?: ModelClientConfig | undefined;
    /**
     * <p>The maximum allowed size of the payload, in MB. A payload is the data portion of a record (without metadata). The value in <code>MaxPayloadInMB</code> must be greater than, or equal to, the size of a single record. To estimate the size of a record in MB, divide the size of your dataset by the number of records. To ensure that the records fit within the maximum payload size, we recommend using a slightly larger value. The default value is 6 MB. For cases where the payload might be arbitrarily large and is transmitted using HTTP chunked encoding, set the value to 0. This feature works only in supported algorithms. Currently, SageMaker built-in algorithms do not support HTTP chunked encoding.</p>
     * @public
     */
    MaxPayloadInMB?: number | undefined;
    /**
     * <p>Specifies the number of records to include in a mini-batch for an HTTP inference request. A record is a single unit of input data that inference can be made on. For example, a single line in a CSV file is a record.</p>
     * @public
     */
    BatchStrategy?: BatchStrategy | undefined;
    /**
     * <p>The environment variables to set in the Docker container. We support up to 16 key and values entries in the map.</p>
     * @public
     */
    Environment?: Record<string, string> | undefined;
    /**
     * <p>Describes the input source of a transform job and the way the transform job consumes it.</p>
     * @public
     */
    TransformInput?: TransformInput | undefined;
    /**
     * <p>Describes the results of a transform job.</p>
     * @public
     */
    TransformOutput?: TransformOutput | undefined;
    /**
     * <p>Configuration to control how SageMaker captures inference data for batch transform jobs.</p>
     * @public
     */
    DataCaptureConfig?: BatchDataCaptureConfig | undefined;
    /**
     * <p>Describes the resources, including ML instance types and ML instance count, to use for transform job.</p>
     * @public
     */
    TransformResources?: TransformResources | undefined;
    /**
     * <p>A timestamp that shows when the transform Job was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>Indicates when the transform job starts on ML instances. You are billed for the time interval between this time and the value of <code>TransformEndTime</code>.</p>
     * @public
     */
    TransformStartTime?: Date | undefined;
    /**
     * <p>Indicates when the transform job has been completed, or has stopped or failed. You are billed for the time interval between this time and the value of <code>TransformStartTime</code>.</p>
     * @public
     */
    TransformEndTime?: Date | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the labeling job that created the transform job.</p>
     * @public
     */
    LabelingJobArn?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the AutoML job that created the transform job.</p>
     * @public
     */
    AutoMLJobArn?: string | undefined;
    /**
     * <p>The data structure used to specify the data to be used for inference in a batch transform job and to associate the data that is relevant to the prediction results in the output. The input filter provided allows you to exclude input data that is not needed for inference in a batch transform job. The output filter provided allows you to include input data relevant to interpreting the predictions in the output from the job. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/batch-transform-data-processing.html">Associate Prediction Results with their Corresponding Input Records</a>.</p>
     * @public
     */
    DataProcessing?: DataProcessing | undefined;
    /**
     * <p>Associates a SageMaker job as a trial component with an experiment and trial. Specified when you call the following APIs:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateProcessingJob.html">CreateProcessingJob</a> </p> </li> <li> <p> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTrainingJob.html">CreateTrainingJob</a> </p> </li> <li> <p> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTransformJob.html">CreateTransformJob</a> </p> </li> </ul>
     * @public
     */
    ExperimentConfig?: ExperimentConfig | undefined;
    /**
     * <p>A list of tags associated with the transform job.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * <p>The model card for a model displayed in the Amazon SageMaker Model Dashboard.</p>
 * @public
 */
export interface ModelDashboardModelCard {
    /**
     * <p>The Amazon Resource Name (ARN) for a model card.</p>
     * @public
     */
    ModelCardArn?: string | undefined;
    /**
     * <p>The name of a model card.</p>
     * @public
     */
    ModelCardName?: string | undefined;
    /**
     * <p>The model card version.</p>
     * @public
     */
    ModelCardVersion?: number | undefined;
    /**
     * <p>The model card status.</p>
     * @public
     */
    ModelCardStatus?: ModelCardStatus | undefined;
    /**
     * <p>The KMS Key ID (<code>KMSKeyId</code>) for encryption of model card information.</p>
     * @public
     */
    SecurityConfig?: ModelCardSecurityConfig | undefined;
    /**
     * <p>A timestamp that indicates when the model card was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>Information about the user who created or modified a SageMaker resource.</p>
     * @public
     */
    CreatedBy?: UserContext | undefined;
    /**
     * <p>A timestamp that indicates when the model card was last updated.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>Information about the user who created or modified a SageMaker resource.</p>
     * @public
     */
    LastModifiedBy?: UserContext | undefined;
    /**
     * <p>The tags associated with a model card.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>For models created in SageMaker, this is the model ARN. For models created outside of SageMaker, this is a user-customized string.</p>
     * @public
     */
    ModelId?: string | undefined;
    /**
     * <p>A model card's risk rating. Can be low, medium, or high.</p>
     * @public
     */
    RiskRating?: string | undefined;
}
/**
 * <p>A monitoring schedule for a model displayed in the Amazon SageMaker Model Dashboard.</p>
 * @public
 */
export interface ModelDashboardMonitoringSchedule {
    /**
     * <p>The Amazon Resource Name (ARN) of a monitoring schedule.</p>
     * @public
     */
    MonitoringScheduleArn?: string | undefined;
    /**
     * <p>The name of a monitoring schedule.</p>
     * @public
     */
    MonitoringScheduleName?: string | undefined;
    /**
     * <p>The status of the monitoring schedule.</p>
     * @public
     */
    MonitoringScheduleStatus?: ScheduleStatus | undefined;
    /**
     * <p>The monitor type of a model monitor.</p>
     * @public
     */
    MonitoringType?: MonitoringType | undefined;
    /**
     * <p>If a monitoring job failed, provides the reason.</p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>A timestamp that indicates when the monitoring schedule was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>A timestamp that indicates when the monitoring schedule was last updated.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>Configures the monitoring schedule and defines the monitoring job.</p>
     * @public
     */
    MonitoringScheduleConfig?: MonitoringScheduleConfig | undefined;
    /**
     * <p>The endpoint which is monitored.</p>
     * @public
     */
    EndpointName?: string | undefined;
    /**
     * <p>A JSON array where each element is a summary for a monitoring alert.</p>
     * @public
     */
    MonitoringAlertSummaries?: MonitoringAlertSummary[] | undefined;
    /**
     * <p>Summary of information about the last monitoring job to run.</p>
     * @public
     */
    LastMonitoringExecutionSummary?: MonitoringExecutionSummary | undefined;
    /**
     * <p>Input object for the batch transform job.</p>
     * @public
     */
    BatchTransformInput?: BatchTransformInput | undefined;
}
/**
 * <p>A model displayed in the Amazon SageMaker Model Dashboard.</p>
 * @public
 */
export interface ModelDashboardModel {
    /**
     * <p>A model displayed in the Model Dashboard.</p>
     * @public
     */
    Model?: Model | undefined;
    /**
     * <p>The endpoints that host a model.</p>
     * @public
     */
    Endpoints?: ModelDashboardEndpoint[] | undefined;
    /**
     * <p>A batch transform job. For information about SageMaker batch transform, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/batch-transform.html">Use Batch Transform</a>.</p>
     * @public
     */
    LastBatchTransformJob?: TransformJob | undefined;
    /**
     * <p>The monitoring schedules for a model.</p>
     * @public
     */
    MonitoringSchedules?: ModelDashboardMonitoringSchedule[] | undefined;
    /**
     * <p>The model card for a model.</p>
     * @public
     */
    ModelCard?: ModelDashboardModelCard | undefined;
}
/**
 * <p>A container for your trained model that can be deployed for SageMaker inference. This can include inference code, artifacts, and metadata. The model package type can be one of the following.</p> <ul> <li> <p>Versioned model: A part of a model package group in Model Registry.</p> </li> <li> <p>Unversioned model: Not part of a model package group and used in Amazon Web Services Marketplace.</p> </li> </ul> <p>For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateModelPackage.html"> <code>CreateModelPackage</code> </a>.</p>
 * @public
 */
export interface ModelPackage {
    /**
     * <p>The name of the model package. The name can be as follows:</p> <ul> <li> <p>For a versioned model, the name is automatically generated by SageMaker Model Registry and follows the format '<code>ModelPackageGroupName/ModelPackageVersion</code>'.</p> </li> <li> <p>For an unversioned model, you must provide the name.</p> </li> </ul>
     * @public
     */
    ModelPackageName?: string | undefined;
    /**
     * <p>The model group to which the model belongs.</p>
     * @public
     */
    ModelPackageGroupName?: string | undefined;
    /**
     * <p>The version number of a versioned model.</p>
     * @public
     */
    ModelPackageVersion?: number | undefined;
    /**
     * <p> The package registration type of the model package. </p>
     * @public
     */
    ModelPackageRegistrationType?: ModelPackageRegistrationType | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the model package.</p>
     * @public
     */
    ModelPackageArn?: string | undefined;
    /**
     * <p>The description of the model package.</p>
     * @public
     */
    ModelPackageDescription?: string | undefined;
    /**
     * <p>The time that the model package was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>Defines how to perform inference generation after a training job is run.</p>
     * @public
     */
    InferenceSpecification?: InferenceSpecification | undefined;
    /**
     * <p>A list of algorithms that were used to create a model package.</p>
     * @public
     */
    SourceAlgorithmSpecification?: SourceAlgorithmSpecification | undefined;
    /**
     * <p>Specifies batch transform jobs that SageMaker runs to validate your model package.</p>
     * @public
     */
    ValidationSpecification?: ModelPackageValidationSpecification | undefined;
    /**
     * <p>The status of the model package. This can be one of the following values.</p> <ul> <li> <p> <code>PENDING</code> - The model package is pending being created.</p> </li> <li> <p> <code>IN_PROGRESS</code> - The model package is in the process of being created.</p> </li> <li> <p> <code>COMPLETED</code> - The model package was successfully created.</p> </li> <li> <p> <code>FAILED</code> - The model package failed.</p> </li> <li> <p> <code>DELETING</code> - The model package is in the process of being deleted.</p> </li> </ul>
     * @public
     */
    ModelPackageStatus?: ModelPackageStatus | undefined;
    /**
     * <p>Specifies the validation and image scan statuses of the model package.</p>
     * @public
     */
    ModelPackageStatusDetails?: ModelPackageStatusDetails | undefined;
    /**
     * <p>Whether the model package is to be certified to be listed on Amazon Web Services Marketplace. For information about listing model packages on Amazon Web Services Marketplace, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-mkt-list.html">List Your Algorithm or Model Package on Amazon Web Services Marketplace</a>.</p>
     * @public
     */
    CertifyForMarketplace?: boolean | undefined;
    /**
     * <p>The approval status of the model. This can be one of the following values.</p> <ul> <li> <p> <code>APPROVED</code> - The model is approved</p> </li> <li> <p> <code>REJECTED</code> - The model is rejected.</p> </li> <li> <p> <code>PENDING_MANUAL_APPROVAL</code> - The model is waiting for manual approval.</p> </li> </ul>
     * @public
     */
    ModelApprovalStatus?: ModelApprovalStatus | undefined;
    /**
     * <p>Information about the user who created or modified an experiment, trial, trial component, lineage group, or project.</p>
     * @public
     */
    CreatedBy?: UserContext | undefined;
    /**
     * <p>Metadata properties of the tracking entity, trial, or trial component.</p>
     * @public
     */
    MetadataProperties?: MetadataProperties | undefined;
    /**
     * <p>Metrics for the model.</p>
     * @public
     */
    ModelMetrics?: ModelMetrics | undefined;
    /**
     * <p>The last time the model package was modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>Information about the user who created or modified an experiment, trial, trial component, lineage group, or project.</p>
     * @public
     */
    LastModifiedBy?: UserContext | undefined;
    /**
     * <p>A description provided when the model approval is set.</p>
     * @public
     */
    ApprovalDescription?: string | undefined;
    /**
     * <p>The machine learning domain of your model package and its components. Common machine learning domains include computer vision and natural language processing.</p>
     * @public
     */
    Domain?: string | undefined;
    /**
     * <p>The machine learning task your model package accomplishes. Common machine learning tasks include object detection and image classification.</p>
     * @public
     */
    Task?: string | undefined;
    /**
     * <p>The Amazon Simple Storage Service path where the sample payload are stored. This path must point to a single gzip compressed tar archive (.tar.gz suffix).</p>
     * @public
     */
    SamplePayloadUrl?: string | undefined;
    /**
     * <p>An array of additional Inference Specification objects.</p>
     * @public
     */
    AdditionalInferenceSpecifications?: AdditionalInferenceSpecificationDefinition[] | undefined;
    /**
     * <p>The URI of the source for the model package.</p>
     * @public
     */
    SourceUri?: string | undefined;
    /**
     * <p>An optional Key Management Service key to encrypt, decrypt, and re-encrypt model package information for regulated workloads with highly sensitive data.</p>
     * @public
     */
    SecurityConfig?: ModelPackageSecurityConfig | undefined;
    /**
     * <p>The model card associated with the model package. Since <code>ModelPackageModelCard</code> is tied to a model package, it is a specific usage of a model card and its schema is simplified compared to the schema of <code>ModelCard</code>. The <code>ModelPackageModelCard</code> schema does not include <code>model_package_details</code>, and <code>model_overview</code> is composed of the <code>model_creator</code> and <code>model_artifact</code> properties. For more information about the model package model card schema, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/model-registry-details.html#model-card-schema">Model package model card schema</a>. For more information about the model card associated with the model package, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/model-registry-details.html">View the Details of a Model Version</a>.</p>
     * @public
     */
    ModelCard?: ModelPackageModelCard | undefined;
    /**
     * <p> A structure describing the current state of the model in its life cycle. </p>
     * @public
     */
    ModelLifeCycle?: ModelLifeCycle | undefined;
    /**
     * <p>A list of the tags associated with the model package. For more information, see <a href="https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html">Tagging Amazon Web Services resources</a> in the <i>Amazon Web Services General Reference Guide</i>.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>The metadata properties for the model package. </p>
     * @public
     */
    CustomerMetadataProperties?: Record<string, string> | undefined;
    /**
     * <p>Represents the drift check baselines that can be used when the model monitor is set using the model package.</p>
     * @public
     */
    DriftCheckBaselines?: DriftCheckBaselines | undefined;
    /**
     * <p>Indicates if you want to skip model validation.</p>
     * @public
     */
    SkipModelValidation?: SkipModelValidation | undefined;
}
/**
 * <p>A group of versioned models in the Model Registry.</p>
 * @public
 */
export interface ModelPackageGroup {
    /**
     * <p>The name of the model group.</p>
     * @public
     */
    ModelPackageGroupName?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the model group.</p>
     * @public
     */
    ModelPackageGroupArn?: string | undefined;
    /**
     * <p>The description for the model group.</p>
     * @public
     */
    ModelPackageGroupDescription?: string | undefined;
    /**
     * <p>The time that the model group was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>Information about the user who created or modified a SageMaker resource.</p>
     * @public
     */
    CreatedBy?: UserContext | undefined;
    /**
     * <p>The status of the model group. This can be one of the following values.</p> <ul> <li> <p> <code>PENDING</code> - The model group is pending being created.</p> </li> <li> <p> <code>IN_PROGRESS</code> - The model group is in the process of being created.</p> </li> <li> <p> <code>COMPLETED</code> - The model group was successfully created.</p> </li> <li> <p> <code>FAILED</code> - The model group failed.</p> </li> <li> <p> <code>DELETING</code> - The model group is in the process of being deleted.</p> </li> <li> <p> <code>DELETE_FAILED</code> - SageMaker failed to delete the model group.</p> </li> </ul>
     * @public
     */
    ModelPackageGroupStatus?: ModelPackageGroupStatus | undefined;
    /**
     * <p>A list of the tags associated with the model group. For more information, see <a href="https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html">Tagging Amazon Web Services resources</a> in the <i>Amazon Web Services General Reference Guide</i>.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * <p>A list of nested <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_Filter.html">Filter</a> objects. A resource must satisfy the conditions of all filters to be included in the results returned from the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_Search.html">Search</a> API.</p> <p>For example, to filter on a training job's <code>InputDataConfig</code> property with a specific channel name and <code>S3Uri</code> prefix, define the following filters:</p> <ul> <li> <p> <code>'\{Name:"InputDataConfig.ChannelName", "Operator":"Equals", "Value":"train"\}',</code> </p> </li> <li> <p> <code>'\{Name:"InputDataConfig.DataSource.S3DataSource.S3Uri", "Operator":"Contains", "Value":"mybucket/catdata"\}'</code> </p> </li> </ul>
 * @public
 */
export interface NestedFilters {
    /**
     * <p>The name of the property to use in the nested filters. The value must match a listed property name, such as <code>InputDataConfig</code>.</p>
     * @public
     */
    NestedPropertyName: string | undefined;
    /**
     * <p>A list of filters. Each filter acts on a property. Filters must contain at least one <code>Filters</code> value. For example, a <code>NestedFilters</code> call might include a filter on the <code>PropertyName</code> parameter of the <code>InputDataConfig</code> property: <code>InputDataConfig.DataSource.S3DataSource.S3Uri</code>.</p>
     * @public
     */
    Filters: Filter[] | undefined;
}
/**
 * <p>Updates the feature group online store configuration.</p>
 * @public
 */
export interface OnlineStoreConfigUpdate {
    /**
     * <p>Time to live duration, where the record is hard deleted after the expiration time is reached; <code>ExpiresAt</code> = <code>EventTime</code> + <code>TtlDuration</code>. For information on HardDelete, see the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_feature_store_DeleteRecord.html">DeleteRecord</a> API in the Amazon SageMaker API Reference guide.</p>
     * @public
     */
    TtlDuration?: TtlDuration | undefined;
}
/**
 * <p>The trial that a trial component is associated with and the experiment the trial is part of. A component might not be associated with a trial. A component can be associated with multiple trials.</p>
 * @public
 */
export interface Parent {
    /**
     * <p>The name of the trial.</p>
     * @public
     */
    TrialName?: string | undefined;
    /**
     * <p>The name of the experiment.</p>
     * @public
     */
    ExperimentName?: string | undefined;
}
/**
 * <p>A SageMaker Model Building Pipeline instance.</p>
 * @public
 */
export interface Pipeline {
    /**
     * <p>The Amazon Resource Name (ARN) of the pipeline.</p>
     * @public
     */
    PipelineArn?: string | undefined;
    /**
     * <p>The name of the pipeline.</p>
     * @public
     */
    PipelineName?: string | undefined;
    /**
     * <p>The display name of the pipeline.</p>
     * @public
     */
    PipelineDisplayName?: string | undefined;
    /**
     * <p>The description of the pipeline.</p>
     * @public
     */
    PipelineDescription?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the role that created the pipeline.</p>
     * @public
     */
    RoleArn?: string | undefined;
    /**
     * <p>The status of the pipeline.</p>
     * @public
     */
    PipelineStatus?: PipelineStatus | undefined;
    /**
     * <p>The creation time of the pipeline.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>The time that the pipeline was last modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>The time when the pipeline was last run.</p>
     * @public
     */
    LastRunTime?: Date | undefined;
    /**
     * <p>Information about the user who created or modified a SageMaker resource.</p>
     * @public
     */
    CreatedBy?: UserContext | undefined;
    /**
     * <p>Information about the user who created or modified a SageMaker resource.</p>
     * @public
     */
    LastModifiedBy?: UserContext | undefined;
    /**
     * <p>The parallelism configuration applied to the pipeline.</p>
     * @public
     */
    ParallelismConfiguration?: ParallelismConfiguration | undefined;
    /**
     * <p>A list of tags that apply to the pipeline.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * <p>An execution of a pipeline.</p>
 * @public
 */
export interface PipelineExecution {
    /**
     * <p>The Amazon Resource Name (ARN) of the pipeline that was executed.</p>
     * @public
     */
    PipelineArn?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the pipeline execution.</p>
     * @public
     */
    PipelineExecutionArn?: string | undefined;
    /**
     * <p>The display name of the pipeline execution.</p>
     * @public
     */
    PipelineExecutionDisplayName?: string | undefined;
    /**
     * <p>The status of the pipeline status.</p>
     * @public
     */
    PipelineExecutionStatus?: PipelineExecutionStatus | undefined;
    /**
     * <p>The description of the pipeline execution.</p>
     * @public
     */
    PipelineExecutionDescription?: string | undefined;
    /**
     * <p>Specifies the names of the experiment and trial created by a pipeline.</p>
     * @public
     */
    PipelineExperimentConfig?: PipelineExperimentConfig | undefined;
    /**
     * <p>If the execution failed, a message describing why.</p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>The creation time of the pipeline execution.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>The time that the pipeline execution was last modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>Information about the user who created or modified a SageMaker resource.</p>
     * @public
     */
    CreatedBy?: UserContext | undefined;
    /**
     * <p>Information about the user who created or modified a SageMaker resource.</p>
     * @public
     */
    LastModifiedBy?: UserContext | undefined;
    /**
     * <p>The parallelism configuration applied to the pipeline execution.</p>
     * @public
     */
    ParallelismConfiguration?: ParallelismConfiguration | undefined;
    /**
     * <p>The selective execution configuration applied to the pipeline run.</p>
     * @public
     */
    SelectiveExecutionConfig?: SelectiveExecutionConfig | undefined;
    /**
     * <p>Contains a list of pipeline parameters. This list can be empty. </p>
     * @public
     */
    PipelineParameters?: Parameter[] | undefined;
    /**
     * <p>The ID of the pipeline version that started this execution.</p>
     * @public
     */
    PipelineVersionId?: number | undefined;
    /**
     * <p>The display name of the pipeline version that started this execution.</p>
     * @public
     */
    PipelineVersionDisplayName?: string | undefined;
}
/**
 * <p>The version of the pipeline.</p>
 * @public
 */
export interface PipelineVersion {
    /**
     * <p>The Amazon Resource Name (ARN) of the pipeline.</p>
     * @public
     */
    PipelineArn?: string | undefined;
    /**
     * <p>The ID of the pipeline version.</p>
     * @public
     */
    PipelineVersionId?: number | undefined;
    /**
     * <p>The display name of the pipeline version.</p>
     * @public
     */
    PipelineVersionDisplayName?: string | undefined;
    /**
     * <p>The description of the pipeline version.</p>
     * @public
     */
    PipelineVersionDescription?: string | undefined;
    /**
     * <p>The creation time of the pipeline version.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>The time when the pipeline version was last modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>Information about the user who created or modified a SageMaker resource.</p>
     * @public
     */
    CreatedBy?: UserContext | undefined;
    /**
     * <p>Information about the user who created or modified a SageMaker resource.</p>
     * @public
     */
    LastModifiedBy?: UserContext | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the most recent pipeline execution created from this pipeline version.</p>
     * @public
     */
    LastExecutedPipelineExecutionArn?: string | undefined;
    /**
     * <p>The display name of the most recent pipeline execution created from this pipeline version.</p>
     * @public
     */
    LastExecutedPipelineExecutionDisplayName?: string | undefined;
    /**
     * <p>The status of the most recent pipeline execution created from this pipeline version.</p>
     * @public
     */
    LastExecutedPipelineExecutionStatus?: PipelineExecutionStatus | undefined;
}
/**
 * <p>An Amazon SageMaker processing job that is used to analyze data and evaluate models. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/processing-job.html">Process Data and Evaluate Models</a>.</p>
 * @public
 */
export interface ProcessingJob {
    /**
     * <p>List of input configurations for the processing job.</p>
     * @public
     */
    ProcessingInputs?: ProcessingInput[] | undefined;
    /**
     * <p>Configuration for uploading output from the processing container.</p>
     * @public
     */
    ProcessingOutputConfig?: ProcessingOutputConfig | undefined;
    /**
     * <p>The name of the processing job.</p>
     * @public
     */
    ProcessingJobName?: string | undefined;
    /**
     * <p>Identifies the resources, ML compute instances, and ML storage volumes to deploy for a processing job. In distributed training, you specify more than one instance.</p>
     * @public
     */
    ProcessingResources?: ProcessingResources | undefined;
    /**
     * <p>Configures conditions under which the processing job should be stopped, such as how long the processing job has been running. After the condition is met, the processing job is stopped.</p>
     * @public
     */
    StoppingCondition?: ProcessingStoppingCondition | undefined;
    /**
     * <p>Configuration to run a processing job in a specified container image.</p>
     * @public
     */
    AppSpecification?: AppSpecification | undefined;
    /**
     * <p>Sets the environment variables in the Docker container.</p>
     * @public
     */
    Environment?: Record<string, string> | undefined;
    /**
     * <p>Networking options for a job, such as network traffic encryption between containers, whether to allow inbound and outbound network calls to and from containers, and the VPC subnets and security groups to use for VPC-enabled jobs.</p>
     * @public
     */
    NetworkConfig?: NetworkConfig | undefined;
    /**
     * <p>The ARN of the role used to create the processing job.</p>
     * @public
     */
    RoleArn?: string | undefined;
    /**
     * <p>Associates a SageMaker job as a trial component with an experiment and trial. Specified when you call the following APIs:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateProcessingJob.html">CreateProcessingJob</a> </p> </li> <li> <p> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTrainingJob.html">CreateTrainingJob</a> </p> </li> <li> <p> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTransformJob.html">CreateTransformJob</a> </p> </li> </ul>
     * @public
     */
    ExperimentConfig?: ExperimentConfig | undefined;
    /**
     * <p>The ARN of the processing job.</p>
     * @public
     */
    ProcessingJobArn?: string | undefined;
    /**
     * <p>The status of the processing job.</p>
     * @public
     */
    ProcessingJobStatus?: ProcessingJobStatus | undefined;
    /**
     * <p>A string, up to one KB in size, that contains metadata from the processing container when the processing job exits.</p>
     * @public
     */
    ExitMessage?: string | undefined;
    /**
     * <p>A string, up to one KB in size, that contains the reason a processing job failed, if it failed.</p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>The time that the processing job ended.</p>
     * @public
     */
    ProcessingEndTime?: Date | undefined;
    /**
     * <p>The time that the processing job started.</p>
     * @public
     */
    ProcessingStartTime?: Date | undefined;
    /**
     * <p>The time the processing job was last modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>The time the processing job was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>The ARN of a monitoring schedule for an endpoint associated with this processing job.</p>
     * @public
     */
    MonitoringScheduleArn?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the AutoML job associated with this processing job.</p>
     * @public
     */
    AutoMLJobArn?: string | undefined;
    /**
     * <p>The ARN of the training job associated with this processing job.</p>
     * @public
     */
    TrainingJobArn?: string | undefined;
    /**
     * <p>An array of key-value pairs. For more information, see <a href="https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html#allocation-whatURL">Using Cost Allocation Tags</a> in the <i>Amazon Web Services Billing and Cost Management User Guide</i>.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * <p>Configuration information for updating the Amazon SageMaker Debugger profile parameters, system and framework metrics configurations, and storage paths.</p>
 * @public
 */
export interface ProfilerConfigForUpdate {
    /**
     * <p>Path to Amazon S3 storage location for system and framework metrics.</p>
     * @public
     */
    S3OutputPath?: string | undefined;
    /**
     * <p>A time interval for capturing system metrics in milliseconds. Available values are 100, 200, 500, 1000 (1 second), 5000 (5 seconds), and 60000 (1 minute) milliseconds. The default value is 500 milliseconds.</p>
     * @public
     */
    ProfilingIntervalInMilliseconds?: number | undefined;
    /**
     * <p>Configuration information for capturing framework metrics. Available key strings for different profiling options are <code>DetailedProfilingConfig</code>, <code>PythonProfilingConfig</code>, and <code>DataLoaderProfilingConfig</code>. The following codes are configuration structures for the <code>ProfilingParameters</code> parameter. To learn more about how to configure the <code>ProfilingParameters</code> parameter, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/debugger-createtrainingjob-api.html">Use the SageMaker and Debugger Configuration API Operations to Create, Update, and Debug Your Training Job</a>. </p>
     * @public
     */
    ProfilingParameters?: Record<string, string> | undefined;
    /**
     * <p>To turn off Amazon SageMaker Debugger monitoring and profiling while a training job is in progress, set to <code>True</code>.</p>
     * @public
     */
    DisableProfiler?: boolean | undefined;
}
/**
 * <p>The properties of a project as returned by the Search API.</p>
 * @public
 */
export interface Project {
    /**
     * <p>The Amazon Resource Name (ARN) of the project.</p>
     * @public
     */
    ProjectArn?: string | undefined;
    /**
     * <p>The name of the project.</p>
     * @public
     */
    ProjectName?: string | undefined;
    /**
     * <p>The ID of the project.</p>
     * @public
     */
    ProjectId?: string | undefined;
    /**
     * <p>The description of the project.</p>
     * @public
     */
    ProjectDescription?: string | undefined;
    /**
     * <p>Details that you specify to provision a service catalog product. For information about service catalog, see <a href="https://docs.aws.amazon.com/servicecatalog/latest/adminguide/introduction.html">What is Amazon Web Services Service Catalog</a>.</p>
     * @public
     */
    ServiceCatalogProvisioningDetails?: ServiceCatalogProvisioningDetails | undefined;
    /**
     * <p>Details of a provisioned service catalog product. For information about service catalog, see <a href="https://docs.aws.amazon.com/servicecatalog/latest/adminguide/introduction.html">What is Amazon Web Services Service Catalog</a>.</p>
     * @public
     */
    ServiceCatalogProvisionedProductDetails?: ServiceCatalogProvisionedProductDetails | undefined;
    /**
     * <p>The status of the project.</p>
     * @public
     */
    ProjectStatus?: ProjectStatus | undefined;
    /**
     * <p>Who created the project.</p>
     * @public
     */
    CreatedBy?: UserContext | undefined;
    /**
     * <p>A timestamp specifying when the project was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p> An array of template providers associated with the project. </p>
     * @public
     */
    TemplateProviderDetails?: TemplateProviderDetail[] | undefined;
    /**
     * <p>An array of key-value pairs. You can use tags to categorize your Amazon Web Services resources in different ways, for example, by purpose, owner, or environment. For more information, see <a href="https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html">Tagging Amazon Web Services Resources</a>.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>A timestamp container for when the project was last modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>Information about the user who created or modified a SageMaker resource.</p>
     * @public
     */
    LastModifiedBy?: UserContext | undefined;
}
/**
 * @public
 */
export interface PutModelPackageGroupPolicyInput {
    /**
     * <p>The name of the model group to add a resource policy to.</p>
     * @public
     */
    ModelPackageGroupName: string | undefined;
    /**
     * <p>The resource policy for the model group.</p>
     * @public
     */
    ResourcePolicy: string | undefined;
}
/**
 * @public
 */
export interface PutModelPackageGroupPolicyOutput {
    /**
     * <p>The Amazon Resource Name (ARN) of the model package group.</p>
     * @public
     */
    ModelPackageGroupArn: string | undefined;
}
/**
 * <p>A set of filters to narrow the set of lineage entities connected to the <code>StartArn</code>(s) returned by the <code>QueryLineage</code> API action.</p>
 * @public
 */
export interface QueryFilters {
    /**
     * <p>Filter the lineage entities connected to the <code>StartArn</code> by type. For example: <code>DataSet</code>, <code>Model</code>, <code>Endpoint</code>, or <code>ModelDeployment</code>.</p>
     * @public
     */
    Types?: string[] | undefined;
    /**
     * <p>Filter the lineage entities connected to the <code>StartArn</code>(s) by the type of the lineage entity.</p>
     * @public
     */
    LineageTypes?: LineageType[] | undefined;
    /**
     * <p>Filter the lineage entities connected to the <code>StartArn</code>(s) by created date.</p>
     * @public
     */
    CreatedBefore?: Date | undefined;
    /**
     * <p>Filter the lineage entities connected to the <code>StartArn</code>(s) after the create date.</p>
     * @public
     */
    CreatedAfter?: Date | undefined;
    /**
     * <p>Filter the lineage entities connected to the <code>StartArn</code>(s) before the last modified date.</p>
     * @public
     */
    ModifiedBefore?: Date | undefined;
    /**
     * <p>Filter the lineage entities connected to the <code>StartArn</code>(s) after the last modified date.</p>
     * @public
     */
    ModifiedAfter?: Date | undefined;
    /**
     * <p>Filter the lineage entities connected to the <code>StartArn</code>(s) by a set if property key value pairs. If multiple pairs are provided, an entity is included in the results if it matches any of the provided pairs.</p>
     * @public
     */
    Properties?: Record<string, string> | undefined;
}
/**
 * @public
 */
export interface QueryLineageRequest {
    /**
     * <p>A list of resource Amazon Resource Name (ARN) that represent the starting point for your lineage query.</p>
     * @public
     */
    StartArns?: string[] | undefined;
    /**
     * <p>Associations between lineage entities have a direction. This parameter determines the direction from the StartArn(s) that the query traverses.</p>
     * @public
     */
    Direction?: Direction | undefined;
    /**
     * <p> Setting this value to <code>True</code> retrieves not only the entities of interest but also the <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/lineage-tracking-entities.html">Associations</a> and lineage entities on the path. Set to <code>False</code> to only return lineage entities that match your query.</p>
     * @public
     */
    IncludeEdges?: boolean | undefined;
    /**
     * <p>A set of filtering parameters that allow you to specify which entities should be returned.</p> <ul> <li> <p>Properties - Key-value pairs to match on the lineage entities' properties.</p> </li> <li> <p>LineageTypes - A set of lineage entity types to match on. For example: <code>TrialComponent</code>, <code>Artifact</code>, or <code>Context</code>.</p> </li> <li> <p>CreatedBefore - Filter entities created before this date.</p> </li> <li> <p>ModifiedBefore - Filter entities modified before this date.</p> </li> <li> <p>ModifiedAfter - Filter entities modified after this date.</p> </li> </ul>
     * @public
     */
    Filters?: QueryFilters | undefined;
    /**
     * <p>The maximum depth in lineage relationships from the <code>StartArns</code> that are traversed. Depth is a measure of the number of <code>Associations</code> from the <code>StartArn</code> entity to the matched results.</p>
     * @public
     */
    MaxDepth?: number | undefined;
    /**
     * <p>Limits the number of vertices in the results. Use the <code>NextToken</code> in a response to to retrieve the next page of results.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>Limits the number of vertices in the request. Use the <code>NextToken</code> in a response to to retrieve the next page of results.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * <p>A lineage entity connected to the starting entity(ies).</p>
 * @public
 */
export interface Vertex {
    /**
     * <p>The Amazon Resource Name (ARN) of the lineage entity resource.</p>
     * @public
     */
    Arn?: string | undefined;
    /**
     * <p>The type of the lineage entity resource. For example: <code>DataSet</code>, <code>Model</code>, <code>Endpoint</code>, etc...</p>
     * @public
     */
    Type?: string | undefined;
    /**
     * <p>The type of resource of the lineage entity.</p>
     * @public
     */
    LineageType?: LineageType | undefined;
}
/**
 * @public
 */
export interface QueryLineageResponse {
    /**
     * <p>A list of vertices connected to the start entity(ies) in the lineage graph.</p>
     * @public
     */
    Vertices?: Vertex[] | undefined;
    /**
     * <p>A list of edges that connect vertices in the response.</p>
     * @public
     */
    Edges?: Edge[] | undefined;
    /**
     * <p>Limits the number of vertices in the response. Use the <code>NextToken</code> in a response to to retrieve the next page of results.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface RegisterDevicesRequest {
    /**
     * <p>The name of the fleet.</p>
     * @public
     */
    DeviceFleetName: string | undefined;
    /**
     * <p>A list of devices to register with SageMaker Edge Manager.</p>
     * @public
     */
    Devices: Device[] | undefined;
    /**
     * <p>The tags associated with devices.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * <p>Configuration for remote debugging for the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_UpdateTrainingJob.html">UpdateTrainingJob</a> API. To learn more about the remote debugging functionality of SageMaker, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/train-remote-debugging.html">Access a training container through Amazon Web Services Systems Manager (SSM) for remote debugging</a>.</p>
 * @public
 */
export interface RemoteDebugConfigForUpdate {
    /**
     * <p>If set to True, enables remote debugging.</p>
     * @public
     */
    EnableRemoteDebug?: boolean | undefined;
}
/**
 * <p>Contains input values for a task.</p>
 * @public
 */
export interface RenderableTask {
    /**
     * <p>A JSON object that contains values for the variables defined in the template. It is made available to the template under the substitution variable <code>task.input</code>. For example, if you define a variable <code>task.input.text</code> in your template, you can supply the variable in the JSON object as <code>"text": "sample text"</code>.</p>
     * @public
     */
    Input: string | undefined;
}
/**
 * <p>A description of an error that occurred while rendering the template.</p>
 * @public
 */
export interface RenderingError {
    /**
     * <p>A unique identifier for a specific class of errors.</p>
     * @public
     */
    Code: string | undefined;
    /**
     * <p>A human-readable message describing the error.</p>
     * @public
     */
    Message: string | undefined;
}
/**
 * @public
 */
export interface RenderUiTemplateRequest {
    /**
     * <p>A <code>Template</code> object containing the worker UI template to render.</p>
     * @public
     */
    UiTemplate?: UiTemplate | undefined;
    /**
     * <p>A <code>RenderableTask</code> object containing a representative task to render.</p>
     * @public
     */
    Task: RenderableTask | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) that has access to the S3 objects that are used by the template.</p>
     * @public
     */
    RoleArn: string | undefined;
    /**
     * <p>The <code>HumanTaskUiArn</code> of the worker UI that you want to render. Do not provide a <code>HumanTaskUiArn</code> if you use the <code>UiTemplate</code> parameter.</p> <p>See a list of available Human Ui Amazon Resource Names (ARNs) in <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_UiConfig.html">UiConfig</a>.</p>
     * @public
     */
    HumanTaskUiArn?: string | undefined;
}
/**
 * @public
 */
export interface RenderUiTemplateResponse {
    /**
     * <p>A Liquid template that renders the HTML for the worker UI.</p>
     * @public
     */
    RenderedContent: string | undefined;
    /**
     * <p>A list of one or more <code>RenderingError</code> objects if any were encountered while rendering the template. If there were no errors, the list is empty.</p>
     * @public
     */
    Errors: RenderingError[] | undefined;
}
/**
 * <p>Details about a reserved capacity offering for a training plan offering.</p> <p>For more information about how to reserve GPU capacity for your SageMaker HyperPod clusters using Amazon SageMaker Training Plan, see <code> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTrainingPlan.html">CreateTrainingPlan</a> </code>.</p>
 * @public
 */
export interface ReservedCapacityOffering {
    /**
     * <p>The type of reserved capacity offering.</p>
     * @public
     */
    ReservedCapacityType?: ReservedCapacityType | undefined;
    /**
     * <p>The type of UltraServer included in this reserved capacity offering, such as ml.u-p6e-gb200x72.</p>
     * @public
     */
    UltraServerType?: string | undefined;
    /**
     * <p>The number of UltraServers included in this reserved capacity offering.</p>
     * @public
     */
    UltraServerCount?: number | undefined;
    /**
     * <p>The instance type for the reserved capacity offering.</p>
     * @public
     */
    InstanceType: ReservedCapacityInstanceType | undefined;
    /**
     * <p>The number of instances in the reserved capacity offering.</p>
     * @public
     */
    InstanceCount: number | undefined;
    /**
     * <p>The availability zone for the reserved capacity offering.</p>
     * @public
     */
    AvailabilityZone?: string | undefined;
    /**
     * <p>The number of whole hours in the total duration for this reserved capacity offering.</p>
     * @public
     */
    DurationHours?: number | undefined;
    /**
     * <p>The additional minutes beyond whole hours in the total duration for this reserved capacity offering.</p>
     * @public
     */
    DurationMinutes?: number | undefined;
    /**
     * <p>The start time of the reserved capacity offering.</p>
     * @public
     */
    StartTime?: Date | undefined;
    /**
     * <p>The end time of the reserved capacity offering.</p>
     * @public
     */
    EndTime?: Date | undefined;
    /**
     * <p>The start time of the extension for the reserved capacity offering.</p>
     * @public
     */
    ExtensionStartTime?: Date | undefined;
    /**
     * <p>The end time of the extension for the reserved capacity offering.</p>
     * @public
     */
    ExtensionEndTime?: Date | undefined;
}
/**
 * <p>The <code>ResourceConfig</code> to update <code>KeepAlivePeriodInSeconds</code>. Other fields in the <code>ResourceConfig</code> cannot be updated.</p>
 * @public
 */
export interface ResourceConfigForUpdate {
    /**
     * <p>The <code>KeepAlivePeriodInSeconds</code> value specified in the <code>ResourceConfig</code> to update.</p>
     * @public
     */
    KeepAlivePeriodInSeconds: number | undefined;
}
/**
 * @public
 */
export interface RetryPipelineExecutionRequest {
    /**
     * <p>The Amazon Resource Name (ARN) of the pipeline execution.</p>
     * @public
     */
    PipelineExecutionArn: string | undefined;
    /**
     * <p>A unique, case-sensitive identifier that you provide to ensure the idempotency of the operation. An idempotent operation completes no more than once.</p>
     * @public
     */
    ClientRequestToken?: string | undefined;
    /**
     * <p>This configuration, if specified, overrides the parallelism configuration of the parent pipeline.</p>
     * @public
     */
    ParallelismConfiguration?: ParallelismConfiguration | undefined;
}
/**
 * @public
 */
export interface RetryPipelineExecutionResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the pipeline execution.</p>
     * @public
     */
    PipelineExecutionArn?: string | undefined;
}
/**
 * <p>The list of key-value pairs used to filter your search results. If a search result contains a key from your list, it is included in the final search response if the value associated with the key in the result matches the value you specified. If the value doesn't match, the result is excluded from the search response. Any resources that don't have a key from the list that you've provided will also be included in the search response.</p>
 * @public
 */
export interface VisibilityConditions {
    /**
     * <p>The key that specifies the tag that you're using to filter the search results. It must be in the following format: <code>Tags.&lt;key&gt;</code>.</p>
     * @public
     */
    Key?: string | undefined;
    /**
     * <p>The value for the tag that you're using to filter the search results.</p>
     * @public
     */
    Value?: string | undefined;
}
/**
 * <p>Contains information about a training job.</p>
 * @public
 */
export interface TrainingJob {
    /**
     * <p>The name of the training job.</p>
     * @public
     */
    TrainingJobName?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the training job.</p>
     * @public
     */
    TrainingJobArn?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the associated hyperparameter tuning job if the training job was launched by a hyperparameter tuning job.</p>
     * @public
     */
    TuningJobArn?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the labeling job.</p>
     * @public
     */
    LabelingJobArn?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the job.</p>
     * @public
     */
    AutoMLJobArn?: string | undefined;
    /**
     * <p>Information about the Amazon S3 location that is configured for storing model artifacts.</p>
     * @public
     */
    ModelArtifacts?: ModelArtifacts | undefined;
    /**
     * <p>The status of the training job.</p> <p>Training job statuses are:</p> <ul> <li> <p> <code>InProgress</code> - The training is in progress.</p> </li> <li> <p> <code>Completed</code> - The training job has completed.</p> </li> <li> <p> <code>Failed</code> - The training job has failed. To see the reason for the failure, see the <code>FailureReason</code> field in the response to a <code>DescribeTrainingJobResponse</code> call.</p> </li> <li> <p> <code>Stopping</code> - The training job is stopping.</p> </li> <li> <p> <code>Stopped</code> - The training job has stopped.</p> </li> </ul> <p>For more detailed information, see <code>SecondaryStatus</code>. </p>
     * @public
     */
    TrainingJobStatus?: TrainingJobStatus | undefined;
    /**
     * <p> Provides detailed information about the state of the training job. For detailed information about the secondary status of the training job, see <code>StatusMessage</code> under <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_SecondaryStatusTransition.html">SecondaryStatusTransition</a>.</p> <p>SageMaker provides primary statuses and secondary statuses that apply to each of them:</p> <dl> <dt>InProgress</dt> <dd> <ul> <li> <p> <code>Starting</code> - Starting the training job.</p> </li> <li> <p> <code>Downloading</code> - An optional stage for algorithms that support <code>File</code> training input mode. It indicates that data is being downloaded to the ML storage volumes.</p> </li> <li> <p> <code>Training</code> - Training is in progress.</p> </li> <li> <p> <code>Uploading</code> - Training is complete and the model artifacts are being uploaded to the S3 location.</p> </li> </ul> </dd> <dt>Completed</dt> <dd> <ul> <li> <p> <code>Completed</code> - The training job has completed.</p> </li> </ul> </dd> <dt>Failed</dt> <dd> <ul> <li> <p> <code>Failed</code> - The training job has failed. The reason for the failure is returned in the <code>FailureReason</code> field of <code>DescribeTrainingJobResponse</code>.</p> </li> </ul> </dd> <dt>Stopped</dt> <dd> <ul> <li> <p> <code>MaxRuntimeExceeded</code> - The job stopped because it exceeded the maximum allowed runtime.</p> </li> <li> <p> <code>Stopped</code> - The training job has stopped.</p> </li> </ul> </dd> <dt>Stopping</dt> <dd> <ul> <li> <p> <code>Stopping</code> - Stopping the training job.</p> </li> </ul> </dd> </dl> <important> <p>Valid values for <code>SecondaryStatus</code> are subject to change. </p> </important> <p>We no longer support the following secondary statuses:</p> <ul> <li> <p> <code>LaunchingMLInstances</code> </p> </li> <li> <p> <code>PreparingTrainingStack</code> </p> </li> <li> <p> <code>DownloadingTrainingImage</code> </p> </li> </ul>
     * @public
     */
    SecondaryStatus?: SecondaryStatus | undefined;
    /**
     * <p>If the training job failed, the reason it failed.</p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>Algorithm-specific parameters.</p>
     * @public
     */
    HyperParameters?: Record<string, string> | undefined;
    /**
     * <p>Information about the algorithm used for training, and algorithm metadata.</p>
     * @public
     */
    AlgorithmSpecification?: AlgorithmSpecification | undefined;
    /**
     * <p>The Amazon Web Services Identity and Access Management (IAM) role configured for the training job.</p>
     * @public
     */
    RoleArn?: string | undefined;
    /**
     * <p>An array of <code>Channel</code> objects that describes each data input channel.</p> <p>Your input must be in the same Amazon Web Services region as your training job.</p>
     * @public
     */
    InputDataConfig?: Channel[] | undefined;
    /**
     * <p>The S3 path where model artifacts that you configured when creating the job are stored. SageMaker creates subfolders for model artifacts.</p>
     * @public
     */
    OutputDataConfig?: OutputDataConfig | undefined;
    /**
     * <p>Resources, including ML compute instances and ML storage volumes, that are configured for model training.</p>
     * @public
     */
    ResourceConfig?: ResourceConfig | undefined;
    /**
     * <p>A <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_VpcConfig.html">VpcConfig</a> object that specifies the VPC that this training job has access to. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/train-vpc.html">Protect Training Jobs by Using an Amazon Virtual Private Cloud</a>.</p>
     * @public
     */
    VpcConfig?: VpcConfig | undefined;
    /**
     * <p>Specifies a limit to how long a model training job can run. It also specifies how long a managed Spot training job has to complete. When the job reaches the time limit, SageMaker ends the training job. Use this API to cap model training costs.</p> <p>To stop a job, SageMaker sends the algorithm the <code>SIGTERM</code> signal, which delays job termination for 120 seconds. Algorithms can use this 120-second window to save the model artifacts, so the results of training are not lost. </p>
     * @public
     */
    StoppingCondition?: StoppingCondition | undefined;
    /**
     * <p>A timestamp that indicates when the training job was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>Indicates the time when the training job starts on training instances. You are billed for the time interval between this time and the value of <code>TrainingEndTime</code>. The start time in CloudWatch Logs might be later than this time. The difference is due to the time it takes to download the training data and to the size of the training container.</p>
     * @public
     */
    TrainingStartTime?: Date | undefined;
    /**
     * <p>Indicates the time when the training job ends on training instances. You are billed for the time interval between the value of <code>TrainingStartTime</code> and this time. For successful jobs and stopped jobs, this is the time after model artifacts are uploaded. For failed jobs, this is the time when SageMaker detects a job failure.</p>
     * @public
     */
    TrainingEndTime?: Date | undefined;
    /**
     * <p>A timestamp that indicates when the status of the training job was last modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>A history of all of the secondary statuses that the training job has transitioned through.</p>
     * @public
     */
    SecondaryStatusTransitions?: SecondaryStatusTransition[] | undefined;
    /**
     * <p>A list of final metric values that are set when the training job completes. Used only if the training job was configured to use metrics.</p>
     * @public
     */
    FinalMetricDataList?: MetricData[] | undefined;
    /**
     * <p>If the <code>TrainingJob</code> was created with network isolation, the value is set to <code>true</code>. If network isolation is enabled, nodes can't communicate beyond the VPC they run in.</p>
     * @public
     */
    EnableNetworkIsolation?: boolean | undefined;
    /**
     * <p>To encrypt all communications between ML compute instances in distributed training, choose <code>True</code>. Encryption provides greater security for distributed training, but training might take longer. How long it takes depends on the amount of communication between compute instances, especially if you use a deep learning algorithm in distributed training.</p>
     * @public
     */
    EnableInterContainerTrafficEncryption?: boolean | undefined;
    /**
     * <p>When true, enables managed spot training using Amazon EC2 Spot instances to run training jobs instead of on-demand instances. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/model-managed-spot-training.html">Managed Spot Training</a>.</p>
     * @public
     */
    EnableManagedSpotTraining?: boolean | undefined;
    /**
     * <p>Contains information about the output location for managed spot training checkpoint data. </p>
     * @public
     */
    CheckpointConfig?: CheckpointConfig | undefined;
    /**
     * <p>The training time in seconds.</p>
     * @public
     */
    TrainingTimeInSeconds?: number | undefined;
    /**
     * <p>The billable time in seconds.</p>
     * @public
     */
    BillableTimeInSeconds?: number | undefined;
    /**
     * <p>Configuration information for the Amazon SageMaker Debugger hook parameters, metric and tensor collections, and storage paths. To learn more about how to configure the <code>DebugHookConfig</code> parameter, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/debugger-createtrainingjob-api.html">Use the SageMaker and Debugger Configuration API Operations to Create, Update, and Debug Your Training Job</a>.</p>
     * @public
     */
    DebugHookConfig?: DebugHookConfig | undefined;
    /**
     * <p>Associates a SageMaker job as a trial component with an experiment and trial. Specified when you call the following APIs:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateProcessingJob.html">CreateProcessingJob</a> </p> </li> <li> <p> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTrainingJob.html">CreateTrainingJob</a> </p> </li> <li> <p> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTransformJob.html">CreateTransformJob</a> </p> </li> </ul>
     * @public
     */
    ExperimentConfig?: ExperimentConfig | undefined;
    /**
     * <p>Information about the debug rule configuration.</p>
     * @public
     */
    DebugRuleConfigurations?: DebugRuleConfiguration[] | undefined;
    /**
     * <p>Configuration of storage locations for the Amazon SageMaker Debugger TensorBoard output data.</p>
     * @public
     */
    TensorBoardOutputConfig?: TensorBoardOutputConfig | undefined;
    /**
     * <p>Information about the evaluation status of the rules for the training job.</p>
     * @public
     */
    DebugRuleEvaluationStatuses?: DebugRuleEvaluationStatus[] | undefined;
    /**
     * <p> The output model package Amazon Resource Name (ARN) that contains model weights or checkpoint. </p>
     * @public
     */
    OutputModelPackageArn?: string | undefined;
    /**
     * <p> The model package configuration. </p>
     * @public
     */
    ModelPackageConfig?: ModelPackageConfig | undefined;
    /**
     * <p>Configuration information for Amazon SageMaker Debugger system monitoring, framework profiling, and storage paths.</p>
     * @public
     */
    ProfilerConfig?: ProfilerConfig | undefined;
    /**
     * <p>The environment variables to set in the Docker container.</p>
     * @public
     */
    Environment?: Record<string, string> | undefined;
    /**
     * <p>The number of times to retry the job when the job fails due to an <code>InternalServerError</code>.</p>
     * @public
     */
    RetryStrategy?: RetryStrategy | undefined;
    /**
     * <p>An array of key-value pairs. You can use tags to categorize your Amazon Web Services resources in different ways, for example, by purpose, owner, or environment. For more information, see <a href="https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html">Tagging Amazon Web Services Resources</a>.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * <p>A short summary of a trial component.</p>
 * @public
 */
export interface TrialComponentSimpleSummary {
    /**
     * <p>The name of the trial component.</p>
     * @public
     */
    TrialComponentName?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the trial component.</p>
     * @public
     */
    TrialComponentArn?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) and job type of the source of a trial component.</p>
     * @public
     */
    TrialComponentSource?: TrialComponentSource | undefined;
    /**
     * <p>When the component was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>Information about the user who created or modified a SageMaker resource.</p>
     * @public
     */
    CreatedBy?: UserContext | undefined;
}
/**
 * <p>The properties of a trial as returned by the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_Search.html">Search</a> API.</p>
 * @public
 */
export interface Trial {
    /**
     * <p>The name of the trial.</p>
     * @public
     */
    TrialName?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the trial.</p>
     * @public
     */
    TrialArn?: string | undefined;
    /**
     * <p>The name of the trial as displayed. If <code>DisplayName</code> isn't specified, <code>TrialName</code> is displayed.</p>
     * @public
     */
    DisplayName?: string | undefined;
    /**
     * <p>The name of the experiment the trial is part of.</p>
     * @public
     */
    ExperimentName?: string | undefined;
    /**
     * <p>The source of the trial.</p>
     * @public
     */
    Source?: TrialSource | undefined;
    /**
     * <p>When the trial was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>Who created the trial.</p>
     * @public
     */
    CreatedBy?: UserContext | undefined;
    /**
     * <p>Who last modified the trial.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>Information about the user who created or modified a SageMaker resource.</p>
     * @public
     */
    LastModifiedBy?: UserContext | undefined;
    /**
     * <p>Metadata properties of the tracking entity, trial, or trial component.</p>
     * @public
     */
    MetadataProperties?: MetadataProperties | undefined;
    /**
     * <p>The list of tags that are associated with the trial. You can use <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_Search.html">Search</a> API to search on the tags.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>A list of the components associated with the trial. For each component, a summary of the component's properties is included.</p>
     * @public
     */
    TrialComponentSummaries?: TrialComponentSimpleSummary[] | undefined;
}
/**
 * <p>Detailed information about the source of a trial component. Either <code>ProcessingJob</code> or <code>TrainingJob</code> is returned.</p>
 * @public
 */
export interface TrialComponentSourceDetail {
    /**
     * <p>The Amazon Resource Name (ARN) of the source.</p>
     * @public
     */
    SourceArn?: string | undefined;
    /**
     * <p>Information about a training job that's the source of a trial component.</p>
     * @public
     */
    TrainingJob?: TrainingJob | undefined;
    /**
     * <p>Information about a processing job that's the source of a trial component.</p>
     * @public
     */
    ProcessingJob?: ProcessingJob | undefined;
    /**
     * <p>Information about a transform job that's the source of a trial component.</p>
     * @public
     */
    TransformJob?: TransformJob | undefined;
}
/**
 * <p>The properties of a trial component as returned by the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_Search.html">Search</a> API.</p>
 * @public
 */
export interface TrialComponent {
    /**
     * <p>The name of the trial component.</p>
     * @public
     */
    TrialComponentName?: string | undefined;
    /**
     * <p>The name of the component as displayed. If <code>DisplayName</code> isn't specified, <code>TrialComponentName</code> is displayed.</p>
     * @public
     */
    DisplayName?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the trial component.</p>
     * @public
     */
    TrialComponentArn?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) and job type of the source of the component.</p>
     * @public
     */
    Source?: TrialComponentSource | undefined;
    /**
     * <p>The status of the trial component.</p>
     * @public
     */
    Status?: TrialComponentStatus | undefined;
    /**
     * <p>When the component started.</p>
     * @public
     */
    StartTime?: Date | undefined;
    /**
     * <p>When the component ended.</p>
     * @public
     */
    EndTime?: Date | undefined;
    /**
     * <p>When the component was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>Who created the trial component.</p>
     * @public
     */
    CreatedBy?: UserContext | undefined;
    /**
     * <p>When the component was last modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>Information about the user who created or modified a SageMaker resource.</p>
     * @public
     */
    LastModifiedBy?: UserContext | undefined;
    /**
     * <p>The hyperparameters of the component.</p>
     * @public
     */
    Parameters?: Record<string, TrialComponentParameterValue> | undefined;
    /**
     * <p>The input artifacts of the component.</p>
     * @public
     */
    InputArtifacts?: Record<string, TrialComponentArtifact> | undefined;
    /**
     * <p>The output artifacts of the component.</p>
     * @public
     */
    OutputArtifacts?: Record<string, TrialComponentArtifact> | undefined;
    /**
     * <p>The metrics for the component.</p>
     * @public
     */
    Metrics?: TrialComponentMetricSummary[] | undefined;
    /**
     * <p>Metadata properties of the tracking entity, trial, or trial component.</p>
     * @public
     */
    MetadataProperties?: MetadataProperties | undefined;
    /**
     * <p>Details of the source of the component.</p>
     * @public
     */
    SourceDetail?: TrialComponentSourceDetail | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the lineage group resource.</p>
     * @public
     */
    LineageGroupArn?: string | undefined;
    /**
     * <p>The list of tags that are associated with the component. You can use <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_Search.html">Search</a> API to search on the tags.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>An array of the parents of the component. A parent is a trial the component is associated with and the experiment the trial is part of. A component might not have any parents.</p>
     * @public
     */
    Parents?: Parent[] | undefined;
    /**
     * <p>The name of the experiment run.</p>
     * @public
     */
    RunName?: string | undefined;
}
/**
 * <p>A single resource returned as part of the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_Search.html">Search</a> API response.</p>
 * @public
 */
export interface SearchRecord {
    /**
     * <p>The properties of a training job.</p>
     * @public
     */
    TrainingJob?: TrainingJob | undefined;
    /**
     * <p>The properties of an experiment.</p>
     * @public
     */
    Experiment?: Experiment | undefined;
    /**
     * <p>The properties of a trial.</p>
     * @public
     */
    Trial?: Trial | undefined;
    /**
     * <p>The properties of a trial component.</p>
     * @public
     */
    TrialComponent?: TrialComponent | undefined;
    /**
     * <p>A hosted endpoint for real-time inference.</p>
     * @public
     */
    Endpoint?: Endpoint | undefined;
    /**
     * <p>A container for your trained model that can be deployed for SageMaker inference. This can include inference code, artifacts, and metadata. The model package type can be one of the following.</p> <ul> <li> <p>Versioned model: A part of a model package group in Model Registry.</p> </li> <li> <p>Unversioned model: Not part of a model package group and used in Amazon Web Services Marketplace.</p> </li> </ul> <p>For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateModelPackage.html"> <code>CreateModelPackage</code> </a>.</p>
     * @public
     */
    ModelPackage?: ModelPackage | undefined;
    /**
     * <p>A group of versioned models in the Model Registry.</p>
     * @public
     */
    ModelPackageGroup?: ModelPackageGroup | undefined;
    /**
     * <p>A SageMaker Model Building Pipeline instance.</p>
     * @public
     */
    Pipeline?: Pipeline | undefined;
    /**
     * <p>An execution of a pipeline.</p>
     * @public
     */
    PipelineExecution?: PipelineExecution | undefined;
    /**
     * <p>The version of the pipeline.</p>
     * @public
     */
    PipelineVersion?: PipelineVersion | undefined;
    /**
     * <p>Amazon SageMaker Feature Store stores features in a collection called Feature Group. A Feature Group can be visualized as a table which has rows, with a unique identifier for each row where each column in the table is a feature. In principle, a Feature Group is composed of features and values per features.</p>
     * @public
     */
    FeatureGroup?: FeatureGroup | undefined;
    /**
     * <p>The feature metadata used to search through the features.</p>
     * @public
     */
    FeatureMetadata?: FeatureMetadata | undefined;
    /**
     * <p>The properties of a project.</p>
     * @public
     */
    Project?: Project | undefined;
    /**
     * <p>The properties of a hyperparameter tuning job.</p>
     * @public
     */
    HyperParameterTuningJob?: HyperParameterTuningJobSearchEntity | undefined;
    /**
     * <p>An Amazon SageMaker Model Card that documents details about a machine learning model.</p>
     * @public
     */
    ModelCard?: ModelCard | undefined;
    /**
     * <p>A model displayed in the Amazon SageMaker Model Dashboard.</p>
     * @public
     */
    Model?: ModelDashboardModel | undefined;
}
/**
 * <p>Represents the total number of matching results and indicates how accurate that count is.</p> <p>The <code>Value</code> field provides the count, which may be exact or estimated. The <code>Relation</code> field indicates whether it's an exact figure or a lower bound. This helps understand the full scope of search results, especially when dealing with large result sets.</p>
 * @public
 */
export interface TotalHits {
    /**
     * <p>The total number of matching results. This value may be exact or an estimate, depending on the <code>Relation</code> field.</p>
     * @public
     */
    Value?: number | undefined;
    /**
     * <p>Indicates the relationship between the returned <code>Value</code> and the actual total number of matching results. Possible values are:</p> <ul> <li> <p> <code>EqualTo</code>: The <code>Value</code> is the exact count of matching results.</p> </li> <li> <p> <code>GreaterThanOrEqualTo</code>: The <code>Value</code> is a lower bound of the actual count of matching results.</p> </li> </ul>
     * @public
     */
    Relation?: Relation | undefined;
}
/**
 * @public
 */
export interface SearchResponse {
    /**
     * <p>A list of <code>SearchRecord</code> objects.</p>
     * @public
     */
    Results?: SearchRecord[] | undefined;
    /**
     * <p>If the result of the previous <code>Search</code> request was truncated, the response includes a NextToken. To retrieve the next set of results, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The total number of matching results.</p>
     * @public
     */
    TotalHits?: TotalHits | undefined;
}
/**
 * @public
 */
export interface SearchTrainingPlanOfferingsRequest {
    /**
     * <p>The type of instance you want to search for in the available training plan offerings. This field allows you to filter the search results based on the specific compute resources you require for your SageMaker training jobs or SageMaker HyperPod clusters. When searching for training plan offerings, specifying the instance type helps you find Reserved Instances that match your computational needs.</p>
     * @public
     */
    InstanceType?: ReservedCapacityInstanceType | undefined;
    /**
     * <p>The number of instances you want to reserve in the training plan offerings. This allows you to specify the quantity of compute resources needed for your SageMaker training jobs or SageMaker HyperPod clusters, helping you find reserved capacity offerings that match your requirements.</p>
     * @public
     */
    InstanceCount?: number | undefined;
    /**
     * <p>The type of UltraServer to search for, such as ml.u-p6e-gb200x72.</p>
     * @public
     */
    UltraServerType?: string | undefined;
    /**
     * <p>The number of UltraServers to search for.</p>
     * @public
     */
    UltraServerCount?: number | undefined;
    /**
     * <p>A filter to search for training plan offerings with a start time after a specified date.</p>
     * @public
     */
    StartTimeAfter?: Date | undefined;
    /**
     * <p>A filter to search for reserved capacity offerings with an end time before a specified date.</p>
     * @public
     */
    EndTimeBefore?: Date | undefined;
    /**
     * <p>The desired duration in hours for the training plan offerings.</p>
     * @public
     */
    DurationHours?: number | undefined;
    /**
     * <p>The target resources (e.g., SageMaker Training Jobs, SageMaker HyperPod, SageMaker Endpoints) to search for in the offerings.</p> <p>Training plans are specific to their target resource.</p> <ul> <li> <p>A training plan designed for SageMaker training jobs can only be used to schedule and run training jobs.</p> </li> <li> <p>A training plan for HyperPod clusters can be used exclusively to provide compute resources to a cluster's instance group.</p> </li> <li> <p>A training plan for SageMaker endpoints can be used exclusively to provide compute resources to SageMaker endpoints for model deployment.</p> </li> </ul>
     * @public
     */
    TargetResources?: SageMakerResourceName[] | undefined;
    /**
     * <p>The Amazon Resource Name (ARN); of an existing training plan to search for extension offerings. When specified, the API returns extension offerings that can be used to extend the specified training plan.</p>
     * @public
     */
    TrainingPlanArn?: string | undefined;
}
/**
 * <p>Details about an available extension offering for a training plan. Use the offering ID with the <code> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_ExtendTrainingPlan.html">ExtendTrainingPlan</a> </code> API to extend a training plan.</p>
 * @public
 */
export interface TrainingPlanExtensionOffering {
    /**
     * <p>The unique identifier for this extension offering.</p>
     * @public
     */
    TrainingPlanExtensionOfferingId: string | undefined;
    /**
     * <p>The Availability Zone for this extension offering.</p>
     * @public
     */
    AvailabilityZone?: string | undefined;
    /**
     * <p>The start date of this extension offering.</p>
     * @public
     */
    StartDate?: Date | undefined;
    /**
     * <p>The end date of this extension offering.</p>
     * @public
     */
    EndDate?: Date | undefined;
    /**
     * <p>The duration of this extension offering in hours.</p>
     * @public
     */
    DurationHours?: number | undefined;
    /**
     * <p>The upfront fee for this extension offering.</p>
     * @public
     */
    UpfrontFee?: string | undefined;
    /**
     * <p>The currency code for the upfront fee (e.g., USD).</p>
     * @public
     */
    CurrencyCode?: string | undefined;
}
/**
 * <p>Details about a training plan offering.</p> <p>For more information about how to reserve GPU capacity for your SageMaker HyperPod clusters using Amazon SageMaker Training Plan, see <code> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTrainingPlan.html">CreateTrainingPlan</a> </code>.</p>
 * @public
 */
export interface TrainingPlanOffering {
    /**
     * <p>The unique identifier for this training plan offering.</p>
     * @public
     */
    TrainingPlanOfferingId: string | undefined;
    /**
     * <p>The target resources (e.g., SageMaker Training Jobs, SageMaker HyperPod, SageMaker Endpoints) for this training plan offering.</p> <p>Training plans are specific to their target resource.</p> <ul> <li> <p>A training plan designed for SageMaker training jobs can only be used to schedule and run training jobs.</p> </li> <li> <p>A training plan for HyperPod clusters can be used exclusively to provide compute resources to a cluster's instance group.</p> </li> <li> <p>A training plan for SageMaker endpoints can be used exclusively to provide compute resources to SageMaker endpoints for model deployment.</p> </li> </ul>
     * @public
     */
    TargetResources: SageMakerResourceName[] | undefined;
    /**
     * <p>The requested start time that the user specified when searching for the training plan offering.</p>
     * @public
     */
    RequestedStartTimeAfter?: Date | undefined;
    /**
     * <p>The requested end time that the user specified when searching for the training plan offering.</p>
     * @public
     */
    RequestedEndTimeBefore?: Date | undefined;
    /**
     * <p>The number of whole hours in the total duration for this training plan offering.</p>
     * @public
     */
    DurationHours?: number | undefined;
    /**
     * <p>The additional minutes beyond whole hours in the total duration for this training plan offering.</p>
     * @public
     */
    DurationMinutes?: number | undefined;
    /**
     * <p>The upfront fee for this training plan offering.</p>
     * @public
     */
    UpfrontFee?: string | undefined;
    /**
     * <p>The currency code for the upfront fee (e.g., USD).</p>
     * @public
     */
    CurrencyCode?: string | undefined;
    /**
     * <p>A list of reserved capacity offerings associated with this training plan offering.</p>
     * @public
     */
    ReservedCapacityOfferings?: ReservedCapacityOffering[] | undefined;
}
/**
 * @public
 */
export interface SearchTrainingPlanOfferingsResponse {
    /**
     * <p>A list of training plan offerings that match the search criteria.</p>
     * @public
     */
    TrainingPlanOfferings: TrainingPlanOffering[] | undefined;
    /**
     * <p>A list of extension offerings available for the specified training plan. These offerings can be used with the <code> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_ExtendTrainingPlan.html">ExtendTrainingPlan</a> </code> API to extend an existing training plan.</p>
     * @public
     */
    TrainingPlanExtensionOfferings?: TrainingPlanExtensionOffering[] | undefined;
}
/**
 * @public
 */
export interface SendPipelineExecutionStepFailureRequest {
    /**
     * <p>The pipeline generated token from the Amazon SQS queue.</p>
     * @public
     */
    CallbackToken: string | undefined;
    /**
     * <p>A message describing why the step failed.</p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>A unique, case-sensitive identifier that you provide to ensure the idempotency of the operation. An idempotent operation completes no more than one time.</p>
     * @public
     */
    ClientRequestToken?: string | undefined;
}
/**
 * @public
 */
export interface SendPipelineExecutionStepFailureResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the pipeline execution.</p>
     * @public
     */
    PipelineExecutionArn?: string | undefined;
}
/**
 * @public
 */
export interface SendPipelineExecutionStepSuccessRequest {
    /**
     * <p>The pipeline generated token from the Amazon SQS queue.</p>
     * @public
     */
    CallbackToken: string | undefined;
    /**
     * <p>A list of the output parameters of the callback step.</p>
     * @public
     */
    OutputParameters?: OutputParameter[] | undefined;
    /**
     * <p>A unique, case-sensitive identifier that you provide to ensure the idempotency of the operation. An idempotent operation completes no more than one time.</p>
     * @public
     */
    ClientRequestToken?: string | undefined;
}
/**
 * @public
 */
export interface SendPipelineExecutionStepSuccessResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the pipeline execution.</p>
     * @public
     */
    PipelineExecutionArn?: string | undefined;
}
/**
 * @public
 */
export interface StartEdgeDeploymentStageRequest {
    /**
     * <p>The name of the edge deployment plan to start.</p>
     * @public
     */
    EdgeDeploymentPlanName: string | undefined;
    /**
     * <p>The name of the stage to start.</p>
     * @public
     */
    StageName: string | undefined;
}
/**
 * @public
 */
export interface StartInferenceExperimentRequest {
    /**
     * <p>The name of the inference experiment to start.</p>
     * @public
     */
    Name: string | undefined;
}
/**
 * @public
 */
export interface StartInferenceExperimentResponse {
    /**
     * <p>The ARN of the started inference experiment to start.</p>
     * @public
     */
    InferenceExperimentArn: string | undefined;
}
/**
 * @public
 */
export interface StartMlflowTrackingServerRequest {
    /**
     * <p>The name of the tracking server to start.</p>
     * @public
     */
    TrackingServerName: string | undefined;
}
/**
 * @public
 */
export interface StartMlflowTrackingServerResponse {
    /**
     * <p>The ARN of the started tracking server.</p>
     * @public
     */
    TrackingServerArn?: string | undefined;
}
/**
 * @public
 */
export interface StartMonitoringScheduleRequest {
    /**
     * <p>The name of the schedule to start.</p>
     * @public
     */
    MonitoringScheduleName: string | undefined;
}
/**
 * @public
 */
export interface StartNotebookInstanceInput {
    /**
     * <p>The name of the notebook instance to start.</p>
     * @public
     */
    NotebookInstanceName: string | undefined;
}
/**
 * @public
 */
export interface StartPipelineExecutionRequest {
    /**
     * <p>The name or Amazon Resource Name (ARN) of the pipeline.</p>
     * @public
     */
    PipelineName: string | undefined;
    /**
     * <p>The display name of the pipeline execution.</p>
     * @public
     */
    PipelineExecutionDisplayName?: string | undefined;
    /**
     * <p>Contains a list of pipeline parameters. This list can be empty. </p>
     * @public
     */
    PipelineParameters?: Parameter[] | undefined;
    /**
     * <p>The description of the pipeline execution.</p>
     * @public
     */
    PipelineExecutionDescription?: string | undefined;
    /**
     * <p>A unique, case-sensitive identifier that you provide to ensure the idempotency of the operation. An idempotent operation completes no more than once.</p>
     * @public
     */
    ClientRequestToken?: string | undefined;
    /**
     * <p>This configuration, if specified, overrides the parallelism configuration of the parent pipeline for this specific run.</p>
     * @public
     */
    ParallelismConfiguration?: ParallelismConfiguration | undefined;
    /**
     * <p>The selective execution configuration applied to the pipeline run.</p>
     * @public
     */
    SelectiveExecutionConfig?: SelectiveExecutionConfig | undefined;
    /**
     * <p>The ID of the pipeline version to start execution from.</p>
     * @public
     */
    PipelineVersionId?: number | undefined;
    /**
     * <p> The MLflow experiment name of the pipeline execution. </p>
     * @public
     */
    MlflowExperimentName?: string | undefined;
}
/**
 * @public
 */
export interface StartPipelineExecutionResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the pipeline execution.</p>
     * @public
     */
    PipelineExecutionArn?: string | undefined;
}
/**
 * @public
 */
export interface StartSessionRequest {
    /**
     * <p>The Amazon Resource Name (ARN) of the resource to which the remote connection will be established. For example, this identifies the specific ARN space application you want to connect to from your local IDE.</p>
     * @public
     */
    ResourceIdentifier: string | undefined;
}
/**
 * @public
 */
export interface StartSessionResponse {
    /**
     * <p>A unique identifier for the established remote connection session.</p>
     * @public
     */
    SessionId?: string | undefined;
    /**
     * <p>A WebSocket URL used to establish a SSH connection between the local IDE and remote SageMaker space.</p>
     * @public
     */
    StreamUrl?: string | undefined;
    /**
     * <p>An encrypted token value containing session and caller information. </p>
     * @public
     */
    TokenValue?: string | undefined;
}
/**
 * @public
 */
export interface StopAutoMLJobRequest {
    /**
     * <p>The name of the object you are requesting.</p>
     * @public
     */
    AutoMLJobName: string | undefined;
}
/**
 * @public
 */
export interface StopCompilationJobRequest {
    /**
     * <p>The name of the model compilation job to stop.</p>
     * @public
     */
    CompilationJobName: string | undefined;
}
/**
 * @public
 */
export interface StopEdgeDeploymentStageRequest {
    /**
     * <p>The name of the edge deployment plan to stop.</p>
     * @public
     */
    EdgeDeploymentPlanName: string | undefined;
    /**
     * <p>The name of the stage to stop.</p>
     * @public
     */
    StageName: string | undefined;
}
/**
 * @public
 */
export interface StopEdgePackagingJobRequest {
    /**
     * <p>The name of the edge packaging job.</p>
     * @public
     */
    EdgePackagingJobName: string | undefined;
}
/**
 * @public
 */
export interface StopHyperParameterTuningJobRequest {
    /**
     * <p>The name of the tuning job to stop.</p>
     * @public
     */
    HyperParameterTuningJobName: string | undefined;
}
/**
 * @public
 */
export interface StopInferenceExperimentRequest {
    /**
     * <p>The name of the inference experiment to stop.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p> Array of key-value pairs, with names of variants mapped to actions. The possible actions are the following: </p> <ul> <li> <p> <code>Promote</code> - Promote the shadow variant to a production variant</p> </li> <li> <p> <code>Remove</code> - Delete the variant</p> </li> <li> <p> <code>Retain</code> - Keep the variant as it is</p> </li> </ul>
     * @public
     */
    ModelVariantActions: Record<string, ModelVariantAction> | undefined;
    /**
     * <p> An array of <code>ModelVariantConfig</code> objects. There is one for each variant that you want to deploy after the inference experiment stops. Each <code>ModelVariantConfig</code> describes the infrastructure configuration for deploying the corresponding variant. </p>
     * @public
     */
    DesiredModelVariants?: ModelVariantConfig[] | undefined;
    /**
     * <p> The desired state of the experiment after stopping. The possible states are the following: </p> <ul> <li> <p> <code>Completed</code>: The experiment completed successfully</p> </li> <li> <p> <code>Cancelled</code>: The experiment was canceled</p> </li> </ul>
     * @public
     */
    DesiredState?: InferenceExperimentStopDesiredState | undefined;
    /**
     * <p>The reason for stopping the experiment.</p>
     * @public
     */
    Reason?: string | undefined;
}
/**
 * @public
 */
export interface StopInferenceExperimentResponse {
    /**
     * <p>The ARN of the stopped inference experiment.</p>
     * @public
     */
    InferenceExperimentArn: string | undefined;
}
/**
 * @public
 */
export interface StopInferenceRecommendationsJobRequest {
    /**
     * <p>The name of the job you want to stop.</p>
     * @public
     */
    JobName: string | undefined;
}
/**
 * @public
 */
export interface StopLabelingJobRequest {
    /**
     * <p>The name of the labeling job to stop.</p>
     * @public
     */
    LabelingJobName: string | undefined;
}
/**
 * @public
 */
export interface StopMlflowTrackingServerRequest {
    /**
     * <p>The name of the tracking server to stop.</p>
     * @public
     */
    TrackingServerName: string | undefined;
}
/**
 * @public
 */
export interface StopMlflowTrackingServerResponse {
    /**
     * <p>The ARN of the stopped tracking server.</p>
     * @public
     */
    TrackingServerArn?: string | undefined;
}
/**
 * @public
 */
export interface StopMonitoringScheduleRequest {
    /**
     * <p>The name of the schedule to stop.</p>
     * @public
     */
    MonitoringScheduleName: string | undefined;
}
/**
 * @public
 */
export interface StopNotebookInstanceInput {
    /**
     * <p>The name of the notebook instance to terminate.</p>
     * @public
     */
    NotebookInstanceName: string | undefined;
}
/**
 * @public
 */
export interface StopOptimizationJobRequest {
    /**
     * <p>The name that you assigned to the optimization job.</p>
     * @public
     */
    OptimizationJobName: string | undefined;
}
/**
 * @public
 */
export interface StopPipelineExecutionRequest {
    /**
     * <p>The Amazon Resource Name (ARN) of the pipeline execution.</p>
     * @public
     */
    PipelineExecutionArn: string | undefined;
    /**
     * <p>A unique, case-sensitive identifier that you provide to ensure the idempotency of the operation. An idempotent operation completes no more than once.</p>
     * @public
     */
    ClientRequestToken?: string | undefined;
}
/**
 * @public
 */
export interface StopPipelineExecutionResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the pipeline execution.</p>
     * @public
     */
    PipelineExecutionArn?: string | undefined;
}
/**
 * @public
 */
export interface StopProcessingJobRequest {
    /**
     * <p>The name of the processing job to stop.</p>
     * @public
     */
    ProcessingJobName: string | undefined;
}
/**
 * @public
 */
export interface StopTrainingJobRequest {
    /**
     * <p>The name of the training job to stop.</p>
     * @public
     */
    TrainingJobName: string | undefined;
}
/**
 * @public
 */
export interface StopTransformJobRequest {
    /**
     * <p>The name of the batch transform job to stop.</p>
     * @public
     */
    TransformJobName: string | undefined;
}
/**
 * @public
 */
export interface UpdateActionRequest {
    /**
     * <p>The name of the action to update.</p>
     * @public
     */
    ActionName: string | undefined;
    /**
     * <p>The new description for the action.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>The new status for the action.</p>
     * @public
     */
    Status?: ActionStatus | undefined;
    /**
     * <p>The new list of properties. Overwrites the current property list.</p>
     * @public
     */
    Properties?: Record<string, string> | undefined;
    /**
     * <p>A list of properties to remove.</p>
     * @public
     */
    PropertiesToRemove?: string[] | undefined;
}
/**
 * @public
 */
export interface UpdateActionResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the action.</p>
     * @public
     */
    ActionArn?: string | undefined;
}
/**
 * @public
 */
export interface UpdateAppImageConfigRequest {
    /**
     * <p>The name of the AppImageConfig to update.</p>
     * @public
     */
    AppImageConfigName: string | undefined;
    /**
     * <p>The new KernelGateway app to run on the image.</p>
     * @public
     */
    KernelGatewayImageConfig?: KernelGatewayImageConfig | undefined;
    /**
     * <p>The JupyterLab app running on the image.</p>
     * @public
     */
    JupyterLabAppImageConfig?: JupyterLabAppImageConfig | undefined;
    /**
     * <p>The Code Editor app running on the image.</p>
     * @public
     */
    CodeEditorAppImageConfig?: CodeEditorAppImageConfig | undefined;
}
/**
 * @public
 */
export interface UpdateAppImageConfigResponse {
    /**
     * <p>The ARN for the AppImageConfig.</p>
     * @public
     */
    AppImageConfigArn?: string | undefined;
}
/**
 * @public
 */
export interface UpdateArtifactRequest {
    /**
     * <p>The Amazon Resource Name (ARN) of the artifact to update.</p>
     * @public
     */
    ArtifactArn: string | undefined;
    /**
     * <p>The new name for the artifact.</p>
     * @public
     */
    ArtifactName?: string | undefined;
    /**
     * <p>The new list of properties. Overwrites the current property list.</p>
     * @public
     */
    Properties?: Record<string, string> | undefined;
    /**
     * <p>A list of properties to remove.</p>
     * @public
     */
    PropertiesToRemove?: string[] | undefined;
}
/**
 * @public
 */
export interface UpdateArtifactResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the artifact.</p>
     * @public
     */
    ArtifactArn?: string | undefined;
}
/**
 * @public
 */
export interface UpdateClusterRequest {
    /**
     * <p>Specify the name of the SageMaker HyperPod cluster you want to update.</p>
     * @public
     */
    ClusterName: string | undefined;
    /**
     * <p>Specify the instance groups to update.</p>
     * @public
     */
    InstanceGroups?: ClusterInstanceGroupSpecification[] | undefined;
    /**
     * <p>The specialized instance groups for training models like Amazon Nova to be created in the SageMaker HyperPod cluster.</p>
     * @public
     */
    RestrictedInstanceGroups?: ClusterRestrictedInstanceGroupSpecification[] | undefined;
    /**
     * <p>Updates the configuration for managed tier checkpointing on the HyperPod cluster. For example, you can enable or disable the feature and modify the percentage of cluster memory allocated for checkpoint storage.</p>
     * @public
     */
    TieredStorageConfig?: ClusterTieredStorageConfig | undefined;
    /**
     * <p>The node recovery mode to be applied to the SageMaker HyperPod cluster.</p>
     * @public
     */
    NodeRecovery?: ClusterNodeRecovery | undefined;
    /**
     * <p>Specify the names of the instance groups to delete. Use a single <code>,</code> as the separator between multiple names.</p>
     * @public
     */
    InstanceGroupsToDelete?: string[] | undefined;
    /**
     * <p>Determines how instance provisioning is handled during cluster operations. In <code>Continuous</code> mode, the cluster provisions available instances incrementally and retries until the target count is reached. The cluster becomes operational once cluster-level resources are ready. Use <code>CurrentCount</code> and <code>TargetCount</code> in <code>DescribeCluster</code> to track provisioning progress.</p>
     * @public
     */
    NodeProvisioningMode?: ClusterNodeProvisioningMode | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the IAM role that HyperPod assumes for cluster autoscaling operations. Cannot be updated while autoscaling is enabled.</p>
     * @public
     */
    ClusterRole?: string | undefined;
    /**
     * <p>Updates the autoscaling configuration for the cluster. Use to enable or disable automatic node scaling.</p>
     * @public
     */
    AutoScaling?: ClusterAutoScalingConfig | undefined;
    /**
     * <p>The type of orchestrator used for the SageMaker HyperPod cluster.</p>
     * @public
     */
    Orchestrator?: ClusterOrchestrator | undefined;
}
/**
 * @public
 */
export interface UpdateClusterResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the updated SageMaker HyperPod cluster.</p>
     * @public
     */
    ClusterArn: string | undefined;
}
/**
 * @public
 */
export interface UpdateClusterSchedulerConfigRequest {
    /**
     * <p>ID of the cluster policy.</p>
     * @public
     */
    ClusterSchedulerConfigId: string | undefined;
    /**
     * <p>Target version.</p>
     * @public
     */
    TargetVersion: number | undefined;
    /**
     * <p>Cluster policy configuration.</p>
     * @public
     */
    SchedulerConfig?: SchedulerConfig | undefined;
    /**
     * <p>Description of the cluster policy.</p>
     * @public
     */
    Description?: string | undefined;
}
/**
 * @public
 */
export interface UpdateClusterSchedulerConfigResponse {
    /**
     * <p>ARN of the cluster policy.</p>
     * @public
     */
    ClusterSchedulerConfigArn: string | undefined;
    /**
     * <p>Version of the cluster policy.</p>
     * @public
     */
    ClusterSchedulerConfigVersion: number | undefined;
}
/**
 * <p>The configuration that describes specifications of the instance groups to update.</p>
 * @public
 */
export interface UpdateClusterSoftwareInstanceGroupSpecification {
    /**
     * <p>The name of the instance group to update.</p>
     * @public
     */
    InstanceGroupName: string | undefined;
}
/**
 * @public
 */
export interface UpdateClusterSoftwareRequest {
    /**
     * <p>Specify the name or the Amazon Resource Name (ARN) of the SageMaker HyperPod cluster you want to update for security patching.</p>
     * @public
     */
    ClusterName: string | undefined;
    /**
     * <p>The array of instance groups for which to update AMI versions.</p>
     * @public
     */
    InstanceGroups?: UpdateClusterSoftwareInstanceGroupSpecification[] | undefined;
    /**
     * <p>The configuration to use when updating the AMI versions.</p>
     * @public
     */
    DeploymentConfig?: DeploymentConfiguration | undefined;
    /**
     * <p>When configuring your HyperPod cluster, you can specify an image ID using one of the following options:</p> <ul> <li> <p> <code>HyperPodPublicAmiId</code>: Use a HyperPod public AMI</p> </li> <li> <p> <code>CustomAmiId</code>: Use your custom AMI</p> </li> <li> <p> <code>default</code>: Use the default latest system image</p> </li> </ul> <p>If you choose to use a custom AMI (<code>CustomAmiId</code>), ensure it meets the following requirements:</p> <ul> <li> <p>Encryption: The custom AMI must be unencrypted.</p> </li> <li> <p>Ownership: The custom AMI must be owned by the same Amazon Web Services account that is creating the HyperPod cluster.</p> </li> <li> <p>Volume support: Only the primary AMI snapshot volume is supported; additional AMI volumes are not supported.</p> </li> </ul> <p>When updating the instance group's AMI through the <code>UpdateClusterSoftware</code> operation, if an instance group uses a custom AMI, you must provide an <code>ImageId</code> or use the default as input. Note that if you don't specify an instance group in your <code>UpdateClusterSoftware</code> request, then all of the instance groups are patched with the specified image.</p>
     * @public
     */
    ImageId?: string | undefined;
}
/**
 * @public
 */
export interface UpdateClusterSoftwareResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the SageMaker HyperPod cluster being updated for security patching.</p>
     * @public
     */
    ClusterArn: string | undefined;
}
/**
 * @public
 */
export interface UpdateCodeRepositoryInput {
    /**
     * <p>The name of the Git repository to update.</p>
     * @public
     */
    CodeRepositoryName: string | undefined;
    /**
     * <p>The configuration of the git repository, including the URL and the Amazon Resource Name (ARN) of the Amazon Web Services Secrets Manager secret that contains the credentials used to access the repository. The secret must have a staging label of <code>AWSCURRENT</code> and must be in the following format:</p> <p> <code>\{"username": <i>UserName</i>, "password": <i>Password</i>\}</code> </p>
     * @public
     */
    GitConfig?: GitConfigForUpdate | undefined;
}
/**
 * @public
 */
export interface UpdateCodeRepositoryOutput {
    /**
     * <p>The ARN of the Git repository.</p>
     * @public
     */
    CodeRepositoryArn: string | undefined;
}
/**
 * @public
 */
export interface UpdateComputeQuotaRequest {
    /**
     * <p>ID of the compute allocation definition.</p>
     * @public
     */
    ComputeQuotaId: string | undefined;
    /**
     * <p>Target version.</p>
     * @public
     */
    TargetVersion: number | undefined;
    /**
     * <p>Configuration of the compute allocation definition. This includes the resource sharing option, and the setting to preempt low priority tasks.</p>
     * @public
     */
    ComputeQuotaConfig?: ComputeQuotaConfig | undefined;
    /**
     * <p>The target entity to allocate compute resources to.</p>
     * @public
     */
    ComputeQuotaTarget?: ComputeQuotaTarget | undefined;
    /**
     * <p>The state of the compute allocation being described. Use to enable or disable compute allocation.</p> <p>Default is <code>Enabled</code>.</p>
     * @public
     */
    ActivationState?: ActivationState | undefined;
    /**
     * <p>Description of the compute allocation definition.</p>
     * @public
     */
    Description?: string | undefined;
}
/**
 * @public
 */
export interface UpdateComputeQuotaResponse {
    /**
     * <p>ARN of the compute allocation definition.</p>
     * @public
     */
    ComputeQuotaArn: string | undefined;
    /**
     * <p>Version of the compute allocation definition.</p>
     * @public
     */
    ComputeQuotaVersion: number | undefined;
}
/**
 * @public
 */
export interface UpdateContextRequest {
    /**
     * <p>The name of the context to update.</p>
     * @public
     */
    ContextName: string | undefined;
    /**
     * <p>The new description for the context.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>The new list of properties. Overwrites the current property list.</p>
     * @public
     */
    Properties?: Record<string, string> | undefined;
    /**
     * <p>A list of properties to remove.</p>
     * @public
     */
    PropertiesToRemove?: string[] | undefined;
}
/**
 * @public
 */
export interface UpdateContextResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the context.</p>
     * @public
     */
    ContextArn?: string | undefined;
}
/**
 * @public
 */
export interface UpdateDeviceFleetRequest {
    /**
     * <p>The name of the fleet.</p>
     * @public
     */
    DeviceFleetName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the device.</p>
     * @public
     */
    RoleArn?: string | undefined;
    /**
     * <p>Description of the fleet.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>Output configuration for storing sample data collected by the fleet.</p>
     * @public
     */
    OutputConfig: EdgeOutputConfig | undefined;
    /**
     * <p>Whether to create an Amazon Web Services IoT Role Alias during device fleet creation. The name of the role alias generated will match this pattern: "SageMakerEdge-\{DeviceFleetName\}".</p> <p>For example, if your device fleet is called "demo-fleet", the name of the role alias will be "SageMakerEdge-demo-fleet".</p>
     * @public
     */
    EnableIotRoleAlias?: boolean | undefined;
}
/**
 * @public
 */
export interface UpdateDevicesRequest {
    /**
     * <p>The name of the fleet the devices belong to.</p>
     * @public
     */
    DeviceFleetName: string | undefined;
    /**
     * <p>List of devices to register with Edge Manager agent.</p>
     * @public
     */
    Devices: Device[] | undefined;
}
/**
 * @public
 */
export interface UpdateDomainRequest {
    /**
     * <p>The ID of the domain to be updated.</p>
     * @public
     */
    DomainId: string | undefined;
    /**
     * <p>A collection of settings.</p>
     * @public
     */
    DefaultUserSettings?: UserSettings | undefined;
    /**
     * <p>A collection of <code>DomainSettings</code> configuration values to update.</p>
     * @public
     */
    DomainSettingsForUpdate?: DomainSettingsForUpdate | undefined;
    /**
     * <p>The entity that creates and manages the required security groups for inter-app communication in <code>VPCOnly</code> mode. Required when <code>CreateDomain.AppNetworkAccessType</code> is <code>VPCOnly</code> and <code>DomainSettings.RStudioServerProDomainSettings.DomainExecutionRoleArn</code> is provided. If setting up the domain for use with RStudio, this value must be set to <code>Service</code>.</p>
     * @public
     */
    AppSecurityGroupManagement?: AppSecurityGroupManagement | undefined;
    /**
     * <p>The default settings for shared spaces that users create in the domain.</p>
     * @public
     */
    DefaultSpaceSettings?: DefaultSpaceSettings | undefined;
    /**
     * <p>The VPC subnets that Studio uses for communication.</p> <p>If removing subnets, ensure there are no apps in the <code>InService</code>, <code>Pending</code>, or <code>Deleting</code> state.</p>
     * @public
     */
    SubnetIds?: string[] | undefined;
    /**
     * <p>Specifies the VPC used for non-EFS traffic.</p> <ul> <li> <p> <code>PublicInternetOnly</code> - Non-EFS traffic is through a VPC managed by Amazon SageMaker AI, which allows direct internet access.</p> </li> <li> <p> <code>VpcOnly</code> - All Studio traffic is through the specified VPC and subnets.</p> </li> </ul> <p>This configuration can only be modified if there are no apps in the <code>InService</code>, <code>Pending</code>, or <code>Deleting</code> state. The configuration cannot be updated if <code>DomainSettings.RStudioServerProDomainSettings.DomainExecutionRoleArn</code> is already set or <code>DomainSettings.RStudioServerProDomainSettings.DomainExecutionRoleArn</code> is provided as part of the same request.</p>
     * @public
     */
    AppNetworkAccessType?: AppNetworkAccessType | undefined;
    /**
     * <p>Indicates whether custom tag propagation is supported for the domain. Defaults to <code>DISABLED</code>.</p>
     * @public
     */
    TagPropagation?: TagPropagation | undefined;
    /**
     * <p>The identifier for the VPC used by the domain for network communication. Use this field only when adding VPC configuration to a SageMaker AI domain used in Amazon SageMaker Unified Studio that was created without VPC settings. SageMaker AI doesn't automatically apply VPC updates to existing applications. Stop and restart your applications to apply the changes.</p>
     * @public
     */
    VpcId?: string | undefined;
}
/**
 * @public
 */
export interface UpdateDomainResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the domain.</p>
     * @public
     */
    DomainArn?: string | undefined;
}
/**
 * <p>Specifies a production variant property type for an Endpoint.</p> <p>If you are updating an endpoint with the <code>RetainAllVariantProperties</code> option of <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_UpdateEndpoint.html">UpdateEndpointInput</a> set to <code>true</code>, the <code>VariantProperty</code> objects listed in the <code>ExcludeRetainedVariantProperties</code> parameter of <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_UpdateEndpoint.html">UpdateEndpointInput</a> override the existing variant properties of the endpoint.</p>
 * @public
 */
export interface VariantProperty {
    /**
     * <p>The type of variant property. The supported values are:</p> <ul> <li> <p> <code>DesiredInstanceCount</code>: Overrides the existing variant instance counts using the <code>InitialInstanceCount</code> values in the <code>ProductionVariants</code> of <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateEndpointConfig.html">CreateEndpointConfig</a>.</p> </li> <li> <p> <code>DesiredWeight</code>: Overrides the existing variant weights using the <code>InitialVariantWeight</code> values in the <code>ProductionVariants</code> of <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateEndpointConfig.html">CreateEndpointConfig</a>.</p> </li> <li> <p> <code>DataCaptureConfig</code>: (Not currently supported.)</p> </li> </ul>
     * @public
     */
    VariantPropertyType: VariantPropertyType | undefined;
}
/**
 * @public
 */
export interface UpdateEndpointInput {
    /**
     * <p>The name of the endpoint whose configuration you want to update.</p>
     * @public
     */
    EndpointName: string | undefined;
    /**
     * <p>The name of the new endpoint configuration.</p>
     * @public
     */
    EndpointConfigName: string | undefined;
    /**
     * <p>When updating endpoint resources, enables or disables the retention of <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_VariantProperty.html">variant properties</a>, such as the instance count or the variant weight. To retain the variant properties of an endpoint when updating it, set <code>RetainAllVariantProperties</code> to <code>true</code>. To use the variant properties specified in a new <code>EndpointConfig</code> call when updating an endpoint, set <code>RetainAllVariantProperties</code> to <code>false</code>. The default is <code>false</code>.</p>
     * @public
     */
    RetainAllVariantProperties?: boolean | undefined;
    /**
     * <p>When you are updating endpoint resources with <code>RetainAllVariantProperties</code>, whose value is set to <code>true</code>, <code>ExcludeRetainedVariantProperties</code> specifies the list of type <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_VariantProperty.html">VariantProperty</a> to override with the values provided by <code>EndpointConfig</code>. If you don't specify a value for <code>ExcludeRetainedVariantProperties</code>, no variant properties are overridden. </p>
     * @public
     */
    ExcludeRetainedVariantProperties?: VariantProperty[] | undefined;
    /**
     * <p>The deployment configuration for an endpoint, which contains the desired deployment strategy and rollback configurations.</p>
     * @public
     */
    DeploymentConfig?: DeploymentConfig | undefined;
    /**
     * <p>Specifies whether to reuse the last deployment configuration. The default value is false (the configuration is not reused).</p>
     * @public
     */
    RetainDeploymentConfig?: boolean | undefined;
}
/**
 * @public
 */
export interface UpdateEndpointOutput {
    /**
     * <p>The Amazon Resource Name (ARN) of the endpoint.</p>
     * @public
     */
    EndpointArn: string | undefined;
}
/**
 * @public
 */
export interface UpdateEndpointWeightsAndCapacitiesInput {
    /**
     * <p>The name of an existing SageMaker endpoint.</p>
     * @public
     */
    EndpointName: string | undefined;
    /**
     * <p>An object that provides new capacity and weight values for a variant.</p>
     * @public
     */
    DesiredWeightsAndCapacities: DesiredWeightAndCapacity[] | undefined;
}
/**
 * @public
 */
export interface UpdateEndpointWeightsAndCapacitiesOutput {
    /**
     * <p>The Amazon Resource Name (ARN) of the updated endpoint.</p>
     * @public
     */
    EndpointArn: string | undefined;
}
/**
 * @public
 */
export interface UpdateExperimentRequest {
    /**
     * <p>The name of the experiment to update.</p>
     * @public
     */
    ExperimentName: string | undefined;
    /**
     * <p>The name of the experiment as displayed. The name doesn't need to be unique. If <code>DisplayName</code> isn't specified, <code>ExperimentName</code> is displayed.</p>
     * @public
     */
    DisplayName?: string | undefined;
    /**
     * <p>The description of the experiment.</p>
     * @public
     */
    Description?: string | undefined;
}
/**
 * @public
 */
export interface UpdateExperimentResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the experiment.</p>
     * @public
     */
    ExperimentArn?: string | undefined;
}
/**
 * <p>The new throughput configuration for the feature group. You can switch between on-demand and provisioned modes or update the read / write capacity of provisioned feature groups. You can switch a feature group to on-demand only once in a 24 hour period. </p>
 * @public
 */
export interface ThroughputConfigUpdate {
    /**
     * <p>Target throughput mode of the feature group. Throughput update is an asynchronous operation, and the outcome should be monitored by polling <code>LastUpdateStatus</code> field in <code>DescribeFeatureGroup</code> response. You cannot update a feature group's throughput while another update is in progress. </p>
     * @public
     */
    ThroughputMode?: ThroughputMode | undefined;
    /**
     * <p>For provisioned feature groups with online store enabled, this indicates the read throughput you are billed for and can consume without throttling. </p>
     * @public
     */
    ProvisionedReadCapacityUnits?: number | undefined;
    /**
     * <p>For provisioned feature groups, this indicates the write throughput you are billed for and can consume without throttling. </p>
     * @public
     */
    ProvisionedWriteCapacityUnits?: number | undefined;
}
/**
 * @public
 */
export interface UpdateFeatureGroupRequest {
    /**
     * <p>The name or Amazon Resource Name (ARN) of the feature group that you're updating.</p>
     * @public
     */
    FeatureGroupName: string | undefined;
    /**
     * <p>Updates the feature group. Updating a feature group is an asynchronous operation. When you get an HTTP 200 response, you've made a valid request. It takes some time after you've made a valid request for Feature Store to update the feature group.</p>
     * @public
     */
    FeatureAdditions?: FeatureDefinition[] | undefined;
    /**
     * <p>Updates the feature group online store configuration.</p>
     * @public
     */
    OnlineStoreConfig?: OnlineStoreConfigUpdate | undefined;
    /**
     * <p>The new throughput configuration for the feature group. You can switch between on-demand and provisioned modes or update the read / write capacity of provisioned feature groups. You can switch a feature group to on-demand only once in a 24 hour period. </p>
     * @public
     */
    ThroughputConfig?: ThroughputConfigUpdate | undefined;
}
/**
 * @public
 */
export interface UpdateFeatureGroupResponse {
    /**
     * <p>The Amazon Resource Number (ARN) of the feature group that you're updating.</p>
     * @public
     */
    FeatureGroupArn: string | undefined;
}
/**
 * @public
 */
export interface UpdateFeatureMetadataRequest {
    /**
     * <p>The name or Amazon Resource Name (ARN) of the feature group containing the feature that you're updating.</p>
     * @public
     */
    FeatureGroupName: string | undefined;
    /**
     * <p>The name of the feature that you're updating.</p>
     * @public
     */
    FeatureName: string | undefined;
    /**
     * <p>A description that you can write to better describe the feature.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>A list of key-value pairs that you can add to better describe the feature.</p>
     * @public
     */
    ParameterAdditions?: FeatureParameter[] | undefined;
    /**
     * <p>A list of parameter keys that you can specify to remove parameters that describe your feature.</p>
     * @public
     */
    ParameterRemovals?: string[] | undefined;
}
/**
 * @public
 */
export interface UpdateHubRequest {
    /**
     * <p>The name of the hub to update.</p>
     * @public
     */
    HubName: string | undefined;
    /**
     * <p>A description of the updated hub.</p>
     * @public
     */
    HubDescription?: string | undefined;
    /**
     * <p>The display name of the hub.</p>
     * @public
     */
    HubDisplayName?: string | undefined;
    /**
     * <p>The searchable keywords for the hub.</p>
     * @public
     */
    HubSearchKeywords?: string[] | undefined;
}
/**
 * @public
 */
export interface UpdateHubResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the updated hub.</p>
     * @public
     */
    HubArn: string | undefined;
}
/**
 * @public
 */
export interface UpdateHubContentRequest {
    /**
     * <p>The name of the SageMaker hub that contains the hub content you want to update. You can optionally use the hub ARN instead.</p>
     * @public
     */
    HubName: string | undefined;
    /**
     * <p>The name of the hub content resource that you want to update.</p>
     * @public
     */
    HubContentName: string | undefined;
    /**
     * <p>The content type of the resource that you want to update. Only specify a <code>Model</code> or <code>Notebook</code> resource for this API. To update a <code>ModelReference</code>, use the <code>UpdateHubContentReference</code> API instead.</p>
     * @public
     */
    HubContentType: HubContentType | undefined;
    /**
     * <p>The hub content version that you want to update. For example, if you have two versions of a resource in your hub, you can update the second version.</p>
     * @public
     */
    HubContentVersion: string | undefined;
    /**
     * <p>The display name of the hub content.</p>
     * @public
     */
    HubContentDisplayName?: string | undefined;
    /**
     * <p>The description of the hub content.</p>
     * @public
     */
    HubContentDescription?: string | undefined;
    /**
     * <p>A string that provides a description of the hub content. This string can include links, tables, and standard markdown formatting.</p>
     * @public
     */
    HubContentMarkdown?: string | undefined;
    /**
     * <p>The searchable keywords of the hub content.</p>
     * @public
     */
    HubContentSearchKeywords?: string[] | undefined;
    /**
     * <p>Indicates the current status of the hub content resource.</p>
     * @public
     */
    SupportStatus?: HubContentSupportStatus | undefined;
}
/**
 * @public
 */
export interface UpdateHubContentResponse {
    /**
     * <p>The ARN of the private model hub that contains the updated hub content.</p>
     * @public
     */
    HubArn: string | undefined;
    /**
     * <p>The ARN of the hub content resource that was updated.</p>
     * @public
     */
    HubContentArn: string | undefined;
}
/**
 * @public
 */
export interface UpdateHubContentReferenceRequest {
    /**
     * <p>The name of the SageMaker hub that contains the hub content you want to update. You can optionally use the hub ARN instead.</p>
     * @public
     */
    HubName: string | undefined;
    /**
     * <p>The name of the hub content resource that you want to update.</p>
     * @public
     */
    HubContentName: string | undefined;
    /**
     * <p>The content type of the resource that you want to update. Only specify a <code>ModelReference</code> resource for this API. To update a <code>Model</code> or <code>Notebook</code> resource, use the <code>UpdateHubContent</code> API instead.</p>
     * @public
     */
    HubContentType: HubContentType | undefined;
    /**
     * <p>The minimum hub content version of the referenced model that you want to use. The minimum version must be older than the latest available version of the referenced model. To support all versions of a model, set the value to <code>1.0.0</code>.</p>
     * @public
     */
    MinVersion?: string | undefined;
}
/**
 * @public
 */
export interface UpdateHubContentReferenceResponse {
    /**
     * <p>The ARN of the private model hub that contains the updated hub content.</p>
     * @public
     */
    HubArn: string | undefined;
    /**
     * <p>The ARN of the hub content resource that was updated.</p>
     * @public
     */
    HubContentArn: string | undefined;
}
/**
 * @public
 */
export interface UpdateImageRequest {
    /**
     * <p>A list of properties to delete. Only the <code>Description</code> and <code>DisplayName</code> properties can be deleted.</p>
     * @public
     */
    DeleteProperties?: string[] | undefined;
    /**
     * <p>The new description for the image.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>The new display name for the image.</p>
     * @public
     */
    DisplayName?: string | undefined;
    /**
     * <p>The name of the image to update.</p>
     * @public
     */
    ImageName: string | undefined;
    /**
     * <p>The new ARN for the IAM role that enables Amazon SageMaker AI to perform tasks on your behalf.</p>
     * @public
     */
    RoleArn?: string | undefined;
}
/**
 * @public
 */
export interface UpdateImageResponse {
    /**
     * <p>The ARN of the image.</p>
     * @public
     */
    ImageArn?: string | undefined;
}
/**
 * @public
 */
export interface UpdateImageVersionRequest {
    /**
     * <p>The name of the image.</p>
     * @public
     */
    ImageName: string | undefined;
    /**
     * <p>The alias of the image version.</p>
     * @public
     */
    Alias?: string | undefined;
    /**
     * <p>The version of the image.</p>
     * @public
     */
    Version?: number | undefined;
    /**
     * <p>A list of aliases to add.</p>
     * @public
     */
    AliasesToAdd?: string[] | undefined;
    /**
     * <p>A list of aliases to delete.</p>
     * @public
     */
    AliasesToDelete?: string[] | undefined;
    /**
     * <p>The availability of the image version specified by the maintainer.</p> <ul> <li> <p> <code>NOT_PROVIDED</code>: The maintainers did not provide a status for image version stability.</p> </li> <li> <p> <code>STABLE</code>: The image version is stable.</p> </li> <li> <p> <code>TO_BE_ARCHIVED</code>: The image version is set to be archived. Custom image versions that are set to be archived are automatically archived after three months.</p> </li> <li> <p> <code>ARCHIVED</code>: The image version is archived. Archived image versions are not searchable and are no longer actively supported. </p> </li> </ul>
     * @public
     */
    VendorGuidance?: VendorGuidance | undefined;
    /**
     * <p>Indicates SageMaker AI job type compatibility.</p> <ul> <li> <p> <code>TRAINING</code>: The image version is compatible with SageMaker AI training jobs.</p> </li> <li> <p> <code>INFERENCE</code>: The image version is compatible with SageMaker AI inference jobs.</p> </li> <li> <p> <code>NOTEBOOK_KERNEL</code>: The image version is compatible with SageMaker AI notebook kernels.</p> </li> </ul>
     * @public
     */
    JobType?: JobType | undefined;
    /**
     * <p>The machine learning framework vended in the image version.</p>
     * @public
     */
    MLFramework?: string | undefined;
    /**
     * <p>The supported programming language and its version.</p>
     * @public
     */
    ProgrammingLang?: string | undefined;
    /**
     * <p>Indicates CPU or GPU compatibility.</p> <ul> <li> <p> <code>CPU</code>: The image version is compatible with CPU.</p> </li> <li> <p> <code>GPU</code>: The image version is compatible with GPU.</p> </li> </ul>
     * @public
     */
    Processor?: Processor | undefined;
    /**
     * <p>Indicates Horovod compatibility.</p>
     * @public
     */
    Horovod?: boolean | undefined;
    /**
     * <p>The maintainer description of the image version.</p>
     * @public
     */
    ReleaseNotes?: string | undefined;
}
/**
 * @public
 */
export interface UpdateImageVersionResponse {
    /**
     * <p>The ARN of the image version.</p>
     * @public
     */
    ImageVersionArn?: string | undefined;
}
/**
 * @public
 */
export interface UpdateInferenceComponentInput {
    /**
     * <p>The name of the inference component.</p>
     * @public
     */
    InferenceComponentName: string | undefined;
    /**
     * <p>Details about the resources to deploy with this inference component, including the model, container, and compute resources.</p>
     * @public
     */
    Specification?: InferenceComponentSpecification | undefined;
    /**
     * <p>Runtime settings for a model that is deployed with an inference component.</p>
     * @public
     */
    RuntimeConfig?: InferenceComponentRuntimeConfig | undefined;
    /**
     * <p>The deployment configuration for the inference component. The configuration contains the desired deployment strategy and rollback settings.</p>
     * @public
     */
    DeploymentConfig?: InferenceComponentDeploymentConfig | undefined;
}
/**
 * @public
 */
export interface UpdateInferenceComponentOutput {
    /**
     * <p>The Amazon Resource Name (ARN) of the inference component.</p>
     * @public
     */
    InferenceComponentArn: string | undefined;
}
/**
 * @public
 */
export interface UpdateInferenceComponentRuntimeConfigInput {
    /**
     * <p>The name of the inference component to update.</p>
     * @public
     */
    InferenceComponentName: string | undefined;
    /**
     * <p>Runtime settings for a model that is deployed with an inference component.</p>
     * @public
     */
    DesiredRuntimeConfig: InferenceComponentRuntimeConfig | undefined;
}
/**
 * @public
 */
export interface UpdateInferenceComponentRuntimeConfigOutput {
    /**
     * <p>The Amazon Resource Name (ARN) of the inference component.</p>
     * @public
     */
    InferenceComponentArn: string | undefined;
}
/**
 * @public
 */
export interface UpdateInferenceExperimentRequest {
    /**
     * <p>The name of the inference experiment to be updated.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p> The duration for which the inference experiment will run. If the status of the inference experiment is <code>Created</code>, then you can update both the start and end dates. If the status of the inference experiment is <code>Running</code>, then you can update only the end date. </p>
     * @public
     */
    Schedule?: InferenceExperimentSchedule | undefined;
    /**
     * <p>The description of the inference experiment.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p> An array of <code>ModelVariantConfig</code> objects. There is one for each variant, whose infrastructure configuration you want to update. </p>
     * @public
     */
    ModelVariants?: ModelVariantConfig[] | undefined;
    /**
     * <p>The Amazon S3 location and configuration for storing inference request and response data.</p>
     * @public
     */
    DataStorageConfig?: InferenceExperimentDataStorageConfig | undefined;
    /**
     * <p> The configuration of <code>ShadowMode</code> inference experiment type. Use this field to specify a production variant which takes all the inference requests, and a shadow variant to which Amazon SageMaker replicates a percentage of the inference requests. For the shadow variant also specify the percentage of requests that Amazon SageMaker replicates. </p>
     * @public
     */
    ShadowModeConfig?: ShadowModeConfig | undefined;
}
/**
 * @public
 */
export interface UpdateInferenceExperimentResponse {
    /**
     * <p>The ARN of the updated inference experiment.</p>
     * @public
     */
    InferenceExperimentArn: string | undefined;
}
/**
 * @public
 */
export interface UpdateMlflowAppRequest {
    /**
     * <p>The ARN of the MLflow App to update.</p>
     * @public
     */
    Arn: string | undefined;
    /**
     * <p>The name of the MLflow App to update.</p>
     * @public
     */
    Name?: string | undefined;
    /**
     * <p>The new S3 URI for the general purpose bucket to use as the artifact store for the MLflow App.</p>
     * @public
     */
    ArtifactStoreUri?: string | undefined;
    /**
     * <p>Whether to enable or disable automatic registration of new MLflow models to the SageMaker Model Registry. To enable automatic model registration, set this value to <code>AutoModelRegistrationEnabled</code>. To disable automatic model registration, set this value to <code>AutoModelRegistrationDisabled</code>. If not specified, <code>AutomaticModelRegistration</code> defaults to <code>AutoModelRegistrationEnabled</code> </p>
     * @public
     */
    ModelRegistrationMode?: ModelRegistrationMode | undefined;
    /**
     * <p>The new weekly maintenance window start day and time to update. The maintenance window day and time should be in Coordinated Universal Time (UTC) 24-hour standard time. For example: TUE:03:30.</p>
     * @public
     */
    WeeklyMaintenanceWindowStart?: string | undefined;
    /**
     * <p>List of SageMaker Domain IDs for which this MLflow App is the default.</p>
     * @public
     */
    DefaultDomainIdList?: string[] | undefined;
    /**
     * <p>Indicates whether this this MLflow App is the default for the account.</p>
     * @public
     */
    AccountDefaultStatus?: AccountDefaultStatus | undefined;
}
/**
 * @public
 */
export interface UpdateMlflowAppResponse {
    /**
     * <p>The ARN of the updated MLflow App.</p>
     * @public
     */
    Arn?: string | undefined;
}
/**
 * @public
 */
export interface UpdateMlflowTrackingServerRequest {
    /**
     * <p>The name of the MLflow Tracking Server to update.</p>
     * @public
     */
    TrackingServerName: string | undefined;
    /**
     * <p>The new S3 URI for the general purpose bucket to use as the artifact store for the MLflow Tracking Server.</p>
     * @public
     */
    ArtifactStoreUri?: string | undefined;
    /**
     * <p>The new size for the MLflow Tracking Server.</p>
     * @public
     */
    TrackingServerSize?: TrackingServerSize | undefined;
    /**
     * <p>Whether to enable or disable automatic registration of new MLflow models to the SageMaker Model Registry. To enable automatic model registration, set this value to <code>True</code>. To disable automatic model registration, set this value to <code>False</code>. If not specified, <code>AutomaticModelRegistration</code> defaults to <code>False</code> </p>
     * @public
     */
    AutomaticModelRegistration?: boolean | undefined;
    /**
     * <p>The new weekly maintenance window start day and time to update. The maintenance window day and time should be in Coordinated Universal Time (UTC) 24-hour standard time. For example: TUE:03:30.</p>
     * @public
     */
    WeeklyMaintenanceWindowStart?: string | undefined;
    /**
     * <p>The new expected Amazon Web Services account ID that owns the Amazon S3 bucket for artifact storage.</p>
     * @public
     */
    S3BucketOwnerAccountId?: string | undefined;
    /**
     * <p>Whether to enable or disable Amazon S3 Bucket Owenrship Verifaction whenever the MLflow Tracking Server interacts with Amazon Amazon S3.</p>
     * @public
     */
    S3BucketOwnerVerification?: boolean | undefined;
}
/**
 * @public
 */
export interface UpdateMlflowTrackingServerResponse {
    /**
     * <p>The ARN of the updated MLflow Tracking Server.</p>
     * @public
     */
    TrackingServerArn?: string | undefined;
}
/**
 * @public
 */
export interface UpdateModelCardRequest {
    /**
     * <p>The name or Amazon Resource Name (ARN) of the model card to update.</p>
     * @public
     */
    ModelCardName: string | undefined;
    /**
     * <p>The updated model card content. Content must be in <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/model-cards.html#model-cards-json-schema">model card JSON schema</a> and provided as a string.</p> <p>When updating model card content, be sure to include the full content and not just updated content.</p>
     * @public
     */
    Content?: string | undefined;
    /**
     * <p>The approval status of the model card within your organization. Different organizations might have different criteria for model card review and approval.</p> <ul> <li> <p> <code>Draft</code>: The model card is a work in progress.</p> </li> <li> <p> <code>PendingReview</code>: The model card is pending review.</p> </li> <li> <p> <code>Approved</code>: The model card is approved.</p> </li> <li> <p> <code>Archived</code>: The model card is archived. No more updates should be made to the model card, but it can still be exported.</p> </li> </ul>
     * @public
     */
    ModelCardStatus?: ModelCardStatus | undefined;
}
/**
 * @public
 */
export interface UpdateModelCardResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the updated model card.</p>
     * @public
     */
    ModelCardArn: string | undefined;
}
/**
 * @public
 */
export interface UpdateModelPackageInput {
    /**
     * <p>The Amazon Resource Name (ARN) of the model package.</p>
     * @public
     */
    ModelPackageArn: string | undefined;
    /**
     * <p>The approval status of the model.</p>
     * @public
     */
    ModelApprovalStatus?: ModelApprovalStatus | undefined;
    /**
     * <p> The package registration type of the model package input. </p>
     * @public
     */
    ModelPackageRegistrationType?: ModelPackageRegistrationType | undefined;
    /**
     * <p>A description for the approval status of the model.</p>
     * @public
     */
    ApprovalDescription?: string | undefined;
    /**
     * <p>The metadata properties associated with the model package versions.</p>
     * @public
     */
    CustomerMetadataProperties?: Record<string, string> | undefined;
    /**
     * <p>The metadata properties associated with the model package versions to remove.</p>
     * @public
     */
    CustomerMetadataPropertiesToRemove?: string[] | undefined;
    /**
     * <p>An array of additional Inference Specification objects to be added to the existing array additional Inference Specification. Total number of additional Inference Specifications can not exceed 15. Each additional Inference Specification specifies artifacts based on this model package that can be used on inference endpoints. Generally used with SageMaker Neo to store the compiled artifacts.</p>
     * @public
     */
    AdditionalInferenceSpecificationsToAdd?: AdditionalInferenceSpecificationDefinition[] | undefined;
    /**
     * <p>Specifies details about inference jobs that you can run with models based on this model package, including the following information:</p> <ul> <li> <p>The Amazon ECR paths of containers that contain the inference code and model artifacts.</p> </li> <li> <p>The instance types that the model package supports for transform jobs and real-time endpoints used for inference.</p> </li> <li> <p>The input and output content formats that the model package supports for inference.</p> </li> </ul>
     * @public
     */
    InferenceSpecification?: InferenceSpecification | undefined;
    /**
     * <p>The URI of the source for the model package.</p>
     * @public
     */
    SourceUri?: string | undefined;
    /**
     * <p>The model card associated with the model package. Since <code>ModelPackageModelCard</code> is tied to a model package, it is a specific usage of a model card and its schema is simplified compared to the schema of <code>ModelCard</code>. The <code>ModelPackageModelCard</code> schema does not include <code>model_package_details</code>, and <code>model_overview</code> is composed of the <code>model_creator</code> and <code>model_artifact</code> properties. For more information about the model package model card schema, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/model-registry-details.html#model-card-schema">Model package model card schema</a>. For more information about the model card associated with the model package, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/model-registry-details.html">View the Details of a Model Version</a>.</p>
     * @public
     */
    ModelCard?: ModelPackageModelCard | undefined;
    /**
     * <p> A structure describing the current state of the model in its life cycle. </p>
     * @public
     */
    ModelLifeCycle?: ModelLifeCycle | undefined;
    /**
     * <p> A unique token that guarantees that the call to this API is idempotent. </p>
     * @public
     */
    ClientToken?: string | undefined;
}
/**
 * @public
 */
export interface UpdateModelPackageOutput {
    /**
     * <p>The Amazon Resource Name (ARN) of the model.</p>
     * @public
     */
    ModelPackageArn: string | undefined;
}
/**
 * @public
 */
export interface UpdateMonitoringAlertRequest {
    /**
     * <p>The name of a monitoring schedule.</p>
     * @public
     */
    MonitoringScheduleName: string | undefined;
    /**
     * <p>The name of a monitoring alert.</p>
     * @public
     */
    MonitoringAlertName: string | undefined;
    /**
     * <p>Within <code>EvaluationPeriod</code>, how many execution failures will raise an alert.</p>
     * @public
     */
    DatapointsToAlert: number | undefined;
    /**
     * <p>The number of most recent monitoring executions to consider when evaluating alert status.</p>
     * @public
     */
    EvaluationPeriod: number | undefined;
}
/**
 * @public
 */
export interface UpdateMonitoringAlertResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the monitoring schedule.</p>
     * @public
     */
    MonitoringScheduleArn: string | undefined;
    /**
     * <p>The name of a monitoring alert.</p>
     * @public
     */
    MonitoringAlertName?: string | undefined;
}
/**
 * @public
 */
export interface UpdateMonitoringScheduleRequest {
    /**
     * <p>The name of the monitoring schedule. The name must be unique within an Amazon Web Services Region within an Amazon Web Services account.</p>
     * @public
     */
    MonitoringScheduleName: string | undefined;
    /**
     * <p>The configuration object that specifies the monitoring schedule and defines the monitoring job.</p>
     * @public
     */
    MonitoringScheduleConfig: MonitoringScheduleConfig | undefined;
}
/**
 * @public
 */
export interface UpdateMonitoringScheduleResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the monitoring schedule.</p>
     * @public
     */
    MonitoringScheduleArn: string | undefined;
}
/**
 * @public
 */
export interface UpdateNotebookInstanceInput {
    /**
     * <p>The name of the notebook instance to update.</p>
     * @public
     */
    NotebookInstanceName: string | undefined;
    /**
     * <p>The Amazon ML compute instance type.</p>
     * @public
     */
    InstanceType?: _InstanceType | undefined;
    /**
     * <p>The IP address type for the notebook instance. Specify <code>ipv4</code> for IPv4-only connectivity or <code>dualstack</code> for both IPv4 and IPv6 connectivity. The notebook instance must be stopped before updating this setting. When you specify <code>dualstack</code>, the subnet must support IPv6 addressing.</p>
     * @public
     */
    IpAddressType?: IPAddressType | undefined;
    /**
     * <p>The platform identifier of the notebook instance runtime environment.</p>
     * @public
     */
    PlatformIdentifier?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the IAM role that SageMaker AI can assume to access the notebook instance. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-roles.html">SageMaker AI Roles</a>. </p> <note> <p>To be able to pass this role to SageMaker AI, the caller of this API must have the <code>iam:PassRole</code> permission.</p> </note>
     * @public
     */
    RoleArn?: string | undefined;
    /**
     * <p>The name of a lifecycle configuration to associate with the notebook instance. For information about lifestyle configurations, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/notebook-lifecycle-config.html">Step 2.1: (Optional) Customize a Notebook Instance</a>.</p>
     * @public
     */
    LifecycleConfigName?: string | undefined;
    /**
     * <p>Set to <code>true</code> to remove the notebook instance lifecycle configuration currently associated with the notebook instance. This operation is idempotent. If you specify a lifecycle configuration that is not associated with the notebook instance when you call this method, it does not throw an error.</p>
     * @public
     */
    DisassociateLifecycleConfig?: boolean | undefined;
    /**
     * <p>The size, in GB, of the ML storage volume to attach to the notebook instance. The default value is 5 GB. ML storage volumes are encrypted, so SageMaker AI can't determine the amount of available free space on the volume. Because of this, you can increase the volume size when you update a notebook instance, but you can't decrease the volume size. If you want to decrease the size of the ML storage volume in use, create a new notebook instance with the desired size.</p>
     * @public
     */
    VolumeSizeInGB?: number | undefined;
    /**
     * <p>The Git repository to associate with the notebook instance as its default code repository. This can be either the name of a Git repository stored as a resource in your account, or the URL of a Git repository in <a href="https://docs.aws.amazon.com/codecommit/latest/userguide/welcome.html">Amazon Web Services CodeCommit</a> or in any other Git repository. When you open a notebook instance, it opens in the directory that contains this repository. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/nbi-git-repo.html">Associating Git Repositories with SageMaker AI Notebook Instances</a>.</p>
     * @public
     */
    DefaultCodeRepository?: string | undefined;
    /**
     * <p>An array of up to three Git repositories to associate with the notebook instance. These can be either the names of Git repositories stored as resources in your account, or the URL of Git repositories in <a href="https://docs.aws.amazon.com/codecommit/latest/userguide/welcome.html">Amazon Web Services CodeCommit</a> or in any other Git repository. These repositories are cloned at the same level as the default repository of your notebook instance. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/nbi-git-repo.html">Associating Git Repositories with SageMaker AI Notebook Instances</a>.</p>
     * @public
     */
    AdditionalCodeRepositories?: string[] | undefined;
    /**
     * <p>This parameter is no longer supported. Elastic Inference (EI) is no longer available.</p> <p>This parameter was used to specify a list of the EI instance types to associate with this notebook instance.</p>
     * @public
     */
    AcceleratorTypes?: NotebookInstanceAcceleratorType[] | undefined;
    /**
     * <p>This parameter is no longer supported. Elastic Inference (EI) is no longer available.</p> <p>This parameter was used to specify a list of the EI instance types to remove from this notebook instance.</p>
     * @public
     */
    DisassociateAcceleratorTypes?: boolean | undefined;
    /**
     * <p>The name or URL of the default Git repository to remove from this notebook instance. This operation is idempotent. If you specify a Git repository that is not associated with the notebook instance when you call this method, it does not throw an error.</p>
     * @public
     */
    DisassociateDefaultCodeRepository?: boolean | undefined;
    /**
     * <p>A list of names or URLs of the default Git repositories to remove from this notebook instance. This operation is idempotent. If you specify a Git repository that is not associated with the notebook instance when you call this method, it does not throw an error.</p>
     * @public
     */
    DisassociateAdditionalCodeRepositories?: boolean | undefined;
    /**
     * <p>Whether root access is enabled or disabled for users of the notebook instance. The default value is <code>Enabled</code>.</p> <note> <p>If you set this to <code>Disabled</code>, users don't have root access on the notebook instance, but lifecycle configuration scripts still run with root permissions.</p> </note>
     * @public
     */
    RootAccess?: RootAccess | undefined;
    /**
     * <p>Information on the IMDS configuration of the notebook instance</p>
     * @public
     */
    InstanceMetadataServiceConfiguration?: InstanceMetadataServiceConfiguration | undefined;
}
/**
 * @public
 */
export interface UpdateNotebookInstanceOutput {
}
/**
 * @public
 */
export interface UpdateNotebookInstanceLifecycleConfigInput {
    /**
     * <p>The name of the lifecycle configuration.</p>
     * @public
     */
    NotebookInstanceLifecycleConfigName: string | undefined;
    /**
     * <p>The shell script that runs only once, when you create a notebook instance. The shell script must be a base64-encoded string.</p>
     * @public
     */
    OnCreate?: NotebookInstanceLifecycleHook[] | undefined;
    /**
     * <p>The shell script that runs every time you start a notebook instance, including when you create the notebook instance. The shell script must be a base64-encoded string.</p>
     * @public
     */
    OnStart?: NotebookInstanceLifecycleHook[] | undefined;
}
/**
 * @public
 */
export interface UpdateNotebookInstanceLifecycleConfigOutput {
}
/**
 * @public
 */
export interface UpdatePartnerAppRequest {
    /**
     * <p>The ARN of the SageMaker Partner AI App to update.</p>
     * @public
     */
    Arn: string | undefined;
    /**
     * <p>Maintenance configuration settings for the SageMaker Partner AI App.</p>
     * @public
     */
    MaintenanceConfig?: PartnerAppMaintenanceConfig | undefined;
    /**
     * <p>Indicates the instance type and size of the cluster attached to the SageMaker Partner AI App.</p>
     * @public
     */
    Tier?: string | undefined;
    /**
     * <p>Configuration settings for the SageMaker Partner AI App.</p>
     * @public
     */
    ApplicationConfig?: PartnerAppConfig | undefined;
    /**
     * <p>When set to <code>TRUE</code>, the SageMaker Partner AI App sets the Amazon Web Services IAM session name or the authenticated IAM user as the identity of the SageMaker Partner AI App user.</p>
     * @public
     */
    EnableIamSessionBasedIdentity?: boolean | undefined;
    /**
     * <p>When set to <code>TRUE</code>, the SageMaker Partner AI App is automatically upgraded to the latest minor version during the next scheduled maintenance window, if one is available.</p>
     * @public
     */
    EnableAutoMinorVersionUpgrade?: boolean | undefined;
    /**
     * <p>The semantic version to upgrade the SageMaker Partner AI App to. Must be the same semantic version returned in the <code>AvailableUpgrade</code> field from <code>DescribePartnerApp</code>. Version skipping and downgrades are not supported.</p>
     * @public
     */
    AppVersion?: string | undefined;
    /**
     * <p>A unique token that guarantees that the call to this API is idempotent.</p>
     * @public
     */
    ClientToken?: string | undefined;
    /**
     * <p>Each tag consists of a key and an optional value. Tag keys must be unique per resource.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * @public
 */
export interface UpdatePartnerAppResponse {
    /**
     * <p>The ARN of the SageMaker Partner AI App that was updated.</p>
     * @public
     */
    Arn?: string | undefined;
}
/**
 * @public
 */
export interface UpdatePipelineRequest {
    /**
     * <p>The name of the pipeline to update.</p>
     * @public
     */
    PipelineName: string | undefined;
    /**
     * <p>The display name of the pipeline.</p>
     * @public
     */
    PipelineDisplayName?: string | undefined;
    /**
     * <p>The JSON pipeline definition.</p>
     * @public
     */
    PipelineDefinition?: string | undefined;
    /**
     * <p>The location of the pipeline definition stored in Amazon S3. If specified, SageMaker will retrieve the pipeline definition from this location.</p>
     * @public
     */
    PipelineDefinitionS3Location?: PipelineDefinitionS3Location | undefined;
    /**
     * <p>The description of the pipeline.</p>
     * @public
     */
    PipelineDescription?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) that the pipeline uses to execute.</p>
     * @public
     */
    RoleArn?: string | undefined;
    /**
     * <p>If specified, it applies to all executions of this pipeline by default.</p>
     * @public
     */
    ParallelismConfiguration?: ParallelismConfiguration | undefined;
}
/**
 * @public
 */
export interface UpdatePipelineResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the updated pipeline.</p>
     * @public
     */
    PipelineArn?: string | undefined;
    /**
     * <p>The ID of the pipeline version.</p>
     * @public
     */
    PipelineVersionId?: number | undefined;
}
/**
 * @public
 */
export interface UpdatePipelineExecutionRequest {
    /**
     * <p>The Amazon Resource Name (ARN) of the pipeline execution.</p>
     * @public
     */
    PipelineExecutionArn: string | undefined;
    /**
     * <p>The description of the pipeline execution.</p>
     * @public
     */
    PipelineExecutionDescription?: string | undefined;
    /**
     * <p>The display name of the pipeline execution.</p>
     * @public
     */
    PipelineExecutionDisplayName?: string | undefined;
    /**
     * <p>This configuration, if specified, overrides the parallelism configuration of the parent pipeline for this specific run.</p>
     * @public
     */
    ParallelismConfiguration?: ParallelismConfiguration | undefined;
}
/**
 * @public
 */
export interface UpdatePipelineExecutionResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the updated pipeline execution.</p>
     * @public
     */
    PipelineExecutionArn?: string | undefined;
}
/**
 * @public
 */
export interface UpdatePipelineVersionRequest {
    /**
     * <p>The Amazon Resource Name (ARN) of the pipeline.</p>
     * @public
     */
    PipelineArn: string | undefined;
    /**
     * <p>The pipeline version ID to update.</p>
     * @public
     */
    PipelineVersionId: number | undefined;
    /**
     * <p>The display name of the pipeline version.</p>
     * @public
     */
    PipelineVersionDisplayName?: string | undefined;
    /**
     * <p>The description of the pipeline version.</p>
     * @public
     */
    PipelineVersionDescription?: string | undefined;
}
/**
 * @public
 */
export interface UpdatePipelineVersionResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the pipeline.</p>
     * @public
     */
    PipelineArn?: string | undefined;
    /**
     * <p>The ID of the pipeline version.</p>
     * @public
     */
    PipelineVersionId?: number | undefined;
}
/**
 * <p>Details that you specify to provision a service catalog product. For information about service catalog, see <a href="https://docs.aws.amazon.com/servicecatalog/latest/adminguide/introduction.html">What is Amazon Web Services Service Catalog</a>. </p>
 * @public
 */
export interface ServiceCatalogProvisioningUpdateDetails {
    /**
     * <p>The ID of the provisioning artifact.</p>
     * @public
     */
    ProvisioningArtifactId?: string | undefined;
    /**
     * <p>A list of key value pairs that you specify when you provision a product.</p>
     * @public
     */
    ProvisioningParameters?: ProvisioningParameter[] | undefined;
}
/**
 * <p> Contains configuration details for updating an existing template provider in the project. </p>
 * @public
 */
export interface UpdateTemplateProvider {
    /**
     * <p> The CloudFormation template provider configuration to update. </p>
     * @public
     */
    CfnTemplateProvider?: CfnUpdateTemplateProvider | undefined;
}
/**
 * @public
 */
export interface UpdateProjectInput {
    /**
     * <p>The name of the project.</p>
     * @public
     */
    ProjectName: string | undefined;
    /**
     * <p>The description for the project.</p>
     * @public
     */
    ProjectDescription?: string | undefined;
    /**
     * <p>The product ID and provisioning artifact ID to provision a service catalog. The provisioning artifact ID will default to the latest provisioning artifact ID of the product, if you don't provide the provisioning artifact ID. For more information, see <a href="https://docs.aws.amazon.com/servicecatalog/latest/adminguide/introduction.html">What is Amazon Web Services Service Catalog</a>. </p>
     * @public
     */
    ServiceCatalogProvisioningUpdateDetails?: ServiceCatalogProvisioningUpdateDetails | undefined;
    /**
     * <p>An array of key-value pairs. You can use tags to categorize your Amazon Web Services resources in different ways, for example, by purpose, owner, or environment. For more information, see <a href="https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html">Tagging Amazon Web Services Resources</a>. In addition, the project must have tag update constraints set in order to include this parameter in the request. For more information, see <a href="https://docs.aws.amazon.com/servicecatalog/latest/adminguide/constraints-resourceupdate.html">Amazon Web Services Service Catalog Tag Update Constraints</a>.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p> The template providers to update in the project. </p>
     * @public
     */
    TemplateProvidersToUpdate?: UpdateTemplateProvider[] | undefined;
}
/**
 * @public
 */
export interface UpdateProjectOutput {
    /**
     * <p>The Amazon Resource Name (ARN) of the project.</p>
     * @public
     */
    ProjectArn: string | undefined;
}
/**
 * @public
 */
export interface UpdateSpaceRequest {
    /**
     * <p>The ID of the associated domain.</p>
     * @public
     */
    DomainId: string | undefined;
    /**
     * <p>The name of the space.</p>
     * @public
     */
    SpaceName: string | undefined;
    /**
     * <p>A collection of space settings.</p>
     * @public
     */
    SpaceSettings?: SpaceSettings | undefined;
    /**
     * <p>The name of the space that appears in the Amazon SageMaker Studio UI.</p>
     * @public
     */
    SpaceDisplayName?: string | undefined;
}
/**
 * @public
 */
export interface UpdateSpaceResponse {
    /**
     * <p>The space's Amazon Resource Name (ARN).</p>
     * @public
     */
    SpaceArn?: string | undefined;
}
/**
 * @public
 */
export interface UpdateTrainingJobRequest {
    /**
     * <p>The name of a training job to update the Debugger profiling configuration.</p>
     * @public
     */
    TrainingJobName: string | undefined;
    /**
     * <p>Configuration information for Amazon SageMaker Debugger system monitoring, framework profiling, and storage paths.</p>
     * @public
     */
    ProfilerConfig?: ProfilerConfigForUpdate | undefined;
    /**
     * <p>Configuration information for Amazon SageMaker Debugger rules for profiling system and framework metrics.</p>
     * @public
     */
    ProfilerRuleConfigurations?: ProfilerRuleConfiguration[] | undefined;
    /**
     * <p>The training job <code>ResourceConfig</code> to update warm pool retention length.</p>
     * @public
     */
    ResourceConfig?: ResourceConfigForUpdate | undefined;
    /**
     * <p>Configuration for remote debugging while the training job is running. You can update the remote debugging configuration when the <code>SecondaryStatus</code> of the job is <code>Downloading</code> or <code>Training</code>.To learn more about the remote debugging functionality of SageMaker, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/train-remote-debugging.html">Access a training container through Amazon Web Services Systems Manager (SSM) for remote debugging</a>.</p>
     * @public
     */
    RemoteDebugConfig?: RemoteDebugConfigForUpdate | undefined;
}
/**
 * @public
 */
export interface UpdateTrainingJobResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the training job.</p>
     * @public
     */
    TrainingJobArn: string | undefined;
}
/**
 * @public
 */
export interface UpdateTrialRequest {
    /**
     * <p>The name of the trial to update.</p>
     * @public
     */
    TrialName: string | undefined;
    /**
     * <p>The name of the trial as displayed. The name doesn't need to be unique. If <code>DisplayName</code> isn't specified, <code>TrialName</code> is displayed.</p>
     * @public
     */
    DisplayName?: string | undefined;
}
/**
 * @public
 */
export interface UpdateTrialResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the trial.</p>
     * @public
     */
    TrialArn?: string | undefined;
}
/**
 * @public
 */
export interface UpdateTrialComponentRequest {
    /**
     * <p>The name of the component to update.</p>
     * @public
     */
    TrialComponentName: string | undefined;
    /**
     * <p>The name of the component as displayed. The name doesn't need to be unique. If <code>DisplayName</code> isn't specified, <code>TrialComponentName</code> is displayed.</p>
     * @public
     */
    DisplayName?: string | undefined;
    /**
     * <p>The new status of the component.</p>
     * @public
     */
    Status?: TrialComponentStatus | undefined;
    /**
     * <p>When the component started.</p>
     * @public
     */
    StartTime?: Date | undefined;
    /**
     * <p>When the component ended.</p>
     * @public
     */
    EndTime?: Date | undefined;
    /**
     * <p>Replaces all of the component's hyperparameters with the specified hyperparameters or add new hyperparameters. Existing hyperparameters are replaced if the trial component is updated with an identical hyperparameter key.</p>
     * @public
     */
    Parameters?: Record<string, TrialComponentParameterValue> | undefined;
    /**
     * <p>The hyperparameters to remove from the component.</p>
     * @public
     */
    ParametersToRemove?: string[] | undefined;
    /**
     * <p>Replaces all of the component's input artifacts with the specified artifacts or adds new input artifacts. Existing input artifacts are replaced if the trial component is updated with an identical input artifact key.</p>
     * @public
     */
    InputArtifacts?: Record<string, TrialComponentArtifact> | undefined;
    /**
     * <p>The input artifacts to remove from the component.</p>
     * @public
     */
    InputArtifactsToRemove?: string[] | undefined;
    /**
     * <p>Replaces all of the component's output artifacts with the specified artifacts or adds new output artifacts. Existing output artifacts are replaced if the trial component is updated with an identical output artifact key.</p>
     * @public
     */
    OutputArtifacts?: Record<string, TrialComponentArtifact> | undefined;
    /**
     * <p>The output artifacts to remove from the component.</p>
     * @public
     */
    OutputArtifactsToRemove?: string[] | undefined;
}
/**
 * @public
 */
export interface UpdateTrialComponentResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the trial component.</p>
     * @public
     */
    TrialComponentArn?: string | undefined;
}
/**
 * @public
 */
export interface UpdateUserProfileRequest {
    /**
     * <p>The domain ID.</p>
     * @public
     */
    DomainId: string | undefined;
    /**
     * <p>The user profile name.</p>
     * @public
     */
    UserProfileName: string | undefined;
    /**
     * <p>A collection of settings.</p>
     * @public
     */
    UserSettings?: UserSettings | undefined;
}
/**
 * @public
 */
export interface UpdateUserProfileResponse {
    /**
     * <p>The user profile Amazon Resource Name (ARN).</p>
     * @public
     */
    UserProfileArn?: string | undefined;
}
/**
 * @public
 */
export interface UpdateWorkforceRequest {
    /**
     * <p>The name of the private workforce that you want to update. You can find your workforce name by using the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_ListWorkforces.html">ListWorkforces</a> operation.</p>
     * @public
     */
    WorkforceName: string | undefined;
    /**
     * <p>A list of one to ten worker IP address ranges (<a href="https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Subnets.html">CIDRs</a>) that can be used to access tasks assigned to this workforce.</p> <p>Maximum: Ten CIDR values</p>
     * @public
     */
    SourceIpConfig?: SourceIpConfig | undefined;
    /**
     * <p>Use this parameter to update your OIDC Identity Provider (IdP) configuration for a workforce made using your own IdP.</p>
     * @public
     */
    OidcConfig?: OidcConfig | undefined;
    /**
     * <p>Use this parameter to update your VPC configuration for a workforce.</p>
     * @public
     */
    WorkforceVpcConfig?: WorkforceVpcConfigRequest | undefined;
    /**
     * <p>Use this parameter to specify whether you want <code>IPv4</code> only or <code>dualstack</code> (<code>IPv4</code> and <code>IPv6</code>) to support your labeling workforce.</p>
     * @public
     */
    IpAddressType?: WorkforceIpAddressType | undefined;
}
/**
 * @public
 */
export interface UpdateWorkforceResponse {
    /**
     * <p>A single private workforce. You can create one private work force in each Amazon Web Services Region. By default, any workforce-related API operation used in a specific region will apply to the workforce created in that region. To learn how to create a private workforce, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/sms-workforce-create-private.html">Create a Private Workforce</a>.</p>
     * @public
     */
    Workforce: Workforce | undefined;
}
/**
 * @public
 */
export interface UpdateWorkteamRequest {
    /**
     * <p>The name of the work team to update.</p>
     * @public
     */
    WorkteamName: string | undefined;
    /**
     * <p>A list of <code>MemberDefinition</code> objects that contains objects that identify the workers that make up the work team. </p> <p>Workforces can be created using Amazon Cognito or your own OIDC Identity Provider (IdP). For private workforces created using Amazon Cognito use <code>CognitoMemberDefinition</code>. For workforces created using your own OIDC identity provider (IdP) use <code>OidcMemberDefinition</code>. You should not provide input for both of these parameters in a single request.</p> <p>For workforces created using Amazon Cognito, private work teams correspond to Amazon Cognito <i>user groups</i> within the user pool used to create a workforce. All of the <code>CognitoMemberDefinition</code> objects that make up the member definition must have the same <code>ClientId</code> and <code>UserPool</code> values. To add a Amazon Cognito user group to an existing worker pool, see <a href="">Adding groups to a User Pool</a>. For more information about user pools, see <a href="https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html">Amazon Cognito User Pools</a>.</p> <p>For workforces created using your own OIDC IdP, specify the user groups that you want to include in your private work team in <code>OidcMemberDefinition</code> by listing those groups in <code>Groups</code>. Be aware that user groups that are already in the work team must also be listed in <code>Groups</code> when you make this request to remain on the work team. If you do not include these user groups, they will no longer be associated with the work team you update. </p>
     * @public
     */
    MemberDefinitions?: MemberDefinition[] | undefined;
    /**
     * <p>An updated description for the work team.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>Configures SNS topic notifications for available or expiring work items</p>
     * @public
     */
    NotificationConfiguration?: NotificationConfiguration | undefined;
    /**
     * <p>Use this optional parameter to constrain access to an Amazon S3 resource based on the IP address using supported IAM global condition keys. The Amazon S3 resource is accessed in the worker portal using a Amazon S3 presigned URL.</p>
     * @public
     */
    WorkerAccessConfiguration?: WorkerAccessConfiguration | undefined;
}
/**
 * @public
 */
export interface UpdateWorkteamResponse {
    /**
     * <p>A <code>Workteam</code> object that describes the updated work team.</p>
     * @public
     */
    Workteam: Workteam | undefined;
}
/**
 * <p>A multi-expression that searches for the specified resource or resources in a search. All resource objects that satisfy the expression's condition are included in the search results. You must specify at least one subexpression, filter, or nested filter. A <code>SearchExpression</code> can contain up to twenty elements.</p> <p>A <code>SearchExpression</code> contains the following components:</p> <ul> <li> <p>A list of <code>Filter</code> objects. Each filter defines a simple Boolean expression comprised of a resource property name, Boolean operator, and value.</p> </li> <li> <p>A list of <code>NestedFilter</code> objects. Each nested filter defines a list of Boolean expressions using a list of resource properties. A nested filter is satisfied if a single object in the list satisfies all Boolean expressions.</p> </li> <li> <p>A list of <code>SearchExpression</code> objects. A search expression object can be nested in a list of search expression objects.</p> </li> <li> <p>A Boolean operator: <code>And</code> or <code>Or</code>.</p> </li> </ul>
 * @public
 */
export interface SearchExpression {
    /**
     * <p>A list of filter objects.</p>
     * @public
     */
    Filters?: Filter[] | undefined;
    /**
     * <p>A list of nested filter objects.</p>
     * @public
     */
    NestedFilters?: NestedFilters[] | undefined;
    /**
     * <p>A list of search expression objects.</p>
     * @public
     */
    SubExpressions?: SearchExpression[] | undefined;
    /**
     * <p>A Boolean operator used to evaluate the search expression. If you want every conditional statement in all lists to be satisfied for the entire search expression to be true, specify <code>And</code>. If only a single conditional statement needs to be true for the entire search expression to be true, specify <code>Or</code>. The default value is <code>And</code>.</p>
     * @public
     */
    Operator?: BooleanOperator | undefined;
}
/**
 * @public
 */
export interface SearchRequest {
    /**
     * <p>The name of the SageMaker resource to search for.</p>
     * @public
     */
    Resource: ResourceType | undefined;
    /**
     * <p>A Boolean conditional statement. Resources must satisfy this condition to be included in search results. You must provide at least one subexpression, filter, or nested filter. The maximum number of recursive <code>SubExpressions</code>, <code>NestedFilters</code>, and <code>Filters</code> that can be included in a <code>SearchExpression</code> object is 50.</p>
     * @public
     */
    SearchExpression?: SearchExpression | undefined;
    /**
     * <p>The name of the resource property used to sort the <code>SearchResults</code>. The default is <code>LastModifiedTime</code>.</p>
     * @public
     */
    SortBy?: string | undefined;
    /**
     * <p>How <code>SearchResults</code> are ordered. Valid values are <code>Ascending</code> or <code>Descending</code>. The default is <code>Descending</code>.</p>
     * @public
     */
    SortOrder?: SearchSortOrder | undefined;
    /**
     * <p>If more than <code>MaxResults</code> resources match the specified <code>SearchExpression</code>, the response includes a <code>NextToken</code>. The <code>NextToken</code> can be passed to the next <code>SearchRequest</code> to continue retrieving results.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of results to return.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p> A cross account filter option. When the value is <code>"CrossAccount"</code> the search results will only include resources made discoverable to you from other accounts. When the value is <code>"SameAccount"</code> or <code>null</code> the search results will only include resources from your account. Default is <code>null</code>. For more information on searching for resources made discoverable to your account, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/feature-store-cross-account-discoverability-use.html"> Search discoverable resources</a> in the SageMaker Developer Guide. The maximum number of <code>ResourceCatalog</code>s viewable is 1000. </p>
     * @public
     */
    CrossAccountFilterOption?: CrossAccountFilterOption | undefined;
    /**
     * <p> Limits the results of your search request to the resources that you can access. </p>
     * @public
     */
    VisibilityConditions?: VisibilityConditions[] | undefined;
}
