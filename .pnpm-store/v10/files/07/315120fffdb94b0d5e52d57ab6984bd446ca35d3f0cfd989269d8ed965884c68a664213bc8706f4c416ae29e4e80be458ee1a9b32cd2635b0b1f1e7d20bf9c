import { AdditionalInferenceSpecificationDefinition, AlgorithmSpecification, AppSpecification, AppType, AutoMLJobStepMetadata, BatchDataCaptureConfig, BatchStrategy, BatchTransformInput, CacheHitResult, CallbackStepMetadata, Channel, CheckpointConfig, ClarifyCheckStepMetadata, ComputeQuotaSummary, ConditionStepMetadata, InferenceSpecification, ModelApprovalStatus, ModelPackageStatus, OutputDataConfig, OutputParameter, ResourceConfig, SchedulerResourceStatus, StoppingCondition, Tag, TransformInput, TransformOutput, TransformResources, UserContext, VpcConfig } from "./models_0";
import { _InstanceType, ContainerDefinition, ContextSummary, DriftCheckBaselines, InferenceExecutionConfig, InferenceExperimentType, MetadataProperties, ModelCardSecurityConfig, ModelCardStatus, ModelLifeCycle, ModelMetrics, ModelPackageModelCard, ModelPackageSecurityConfig, ModelPackageValidationSpecification, ModelVariantConfig, RetryStrategy, SkipModelValidation, SourceAlgorithmSpecification, TtlDuration, UiTemplate } from "./models_1";
import { CrossAccountFilterOption, DataProcessing, DebugHookConfig, DebugRuleConfiguration, DebugRuleEvaluationStatus, DeploymentRecommendation, EdgePackagingJobStatus, EndpointStatus, ExperimentConfig, FeatureGroupStatus, HubContentType, ModelArtifacts, ModelClientConfig, MonitoringScheduleConfig, MonitoringType, NetworkConfig, OfflineStoreStatusValue, OptimizationJobDeploymentInstanceType, ParallelismConfiguration, PartnerAppType, ProcessingInput, ProcessingOutputConfig, ProcessingResources, ProcessingStoppingCondition, ProfilerConfig, ServiceCatalogProvisioningDetails, SharingType, SpaceStorageSettings, StudioLifecycleConfigAppType, TensorBoardOutputConfig, TrialComponentArtifact, TrialComponentParameterValue, TrialComponentStatus } from "./models_2";
import { Device, DeviceDeploymentSummary, DeviceFleetSummary, DeviceSummary, Direction, DomainDetails, Edge, EdgeDeploymentPlanSummary, EdgePackagingJobSummary, EMRStepMetadata, Endpoint, EndpointConfigSortKey, EndpointConfigStepMetadata, EndpointConfigSummary, EndpointSortKey, EndpointStepMetadata, EndpointSummary, ExecutionStatus, Experiment, ExperimentSummary, FailStepMetadata, FeatureGroup, FeatureGroupSortBy, FeatureGroupSortOrder, FeatureGroupSummary, FeatureMetadata, Filter, FlowDefinitionSummary, HubContentInfo, HubContentSortBy, HubInfo, HubSortBy, HumanTaskUiSummary, HyperParameterTrainingJobSummary, HyperParameterTuningJobSearchEntity, HyperParameterTuningJobSortByOptions, HyperParameterTuningJobStatus, HyperParameterTuningJobSummary, Image, ImageSortBy, ImageSortOrder, ImageVersion, ImageVersionSortBy, ImageVersionSortOrder, InferenceComponentSortKey, InferenceComponentStatus, InferenceComponentSummary, InferenceExperimentStatus, InferenceExperimentStopDesiredState, InferenceExperimentSummary, InferenceRecommendationsJob, InferenceRecommendationsJobStep, IsTrackingServerActive, LabelingJobForWorkteamSummary, LabelingJobStatus, LabelingJobSummary, LambdaStepMetadata, LineageGroupSummary, LineageType, MetricData, ModelCardExportJobStatus, ModelPackageGroupStatus, ModelPackageStatusDetails, MonitoringExecutionSummary, NotebookInstanceStatus, OptimizationJobStatus, PartnerAppStatus, PipelineExecutionStatus, PipelineExperimentConfig, PipelineStatus, ProcessingJobStatus, ProjectStatus, RecommendationJobStatus, RecommendationStepType, ReservedCapacityInstanceType, ReservedCapacitySummary, SageMakerResourceName, ScheduleStatus, SecondaryStatus, SecondaryStatusTransition, SelectiveExecutionConfig, ServiceCatalogProvisionedProductDetails, SortOrder, SpaceStatus, SubscribedWorkteam, TrackingServerStatus, TrainingJobStatus, TrainingPlanStatus, TransformJobStatus, TrialComponentMetricSummary, TrialComponentSource, TrialSource, UserProfileStatus, WarmPoolResourceStatus, WarmPoolStatus, Workforce, Workteam } from "./models_3";
/**
 * @public
 * @enum
 */
export declare const SortQuotaBy: {
    readonly CLUSTER_ARN: "ClusterArn";
    readonly CREATION_TIME: "CreationTime";
    readonly NAME: "Name";
    readonly STATUS: "Status";
};
/**
 * @public
 */
export type SortQuotaBy = (typeof SortQuotaBy)[keyof typeof SortQuotaBy];
/**
 * @public
 */
export interface ListComputeQuotasRequest {
    /**
     * <p>Filter for after this creation time. The input for this parameter is a Unix timestamp. To convert a date and time into a Unix timestamp, see <a href="https://www.epochconverter.com/">EpochConverter</a>.</p>
     * @public
     */
    CreatedAfter?: Date | undefined;
    /**
     * <p>Filter for before this creation time. The input for this parameter is a Unix timestamp. To convert a date and time into a Unix timestamp, see <a href="https://www.epochconverter.com/">EpochConverter</a>.</p>
     * @public
     */
    CreatedBefore?: Date | undefined;
    /**
     * <p>Filter for name containing this string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>Filter for status.</p>
     * @public
     */
    Status?: SchedulerResourceStatus | undefined;
    /**
     * <p>Filter for ARN of the cluster.</p>
     * @public
     */
    ClusterArn?: string | undefined;
    /**
     * <p>Filter for sorting the list by a given value. For example, sort by name, creation time, or status.</p>
     * @public
     */
    SortBy?: SortQuotaBy | undefined;
    /**
     * <p>The order of the list. By default, listed in <code>Descending</code> order according to by <code>SortBy</code>. To change the list order, you can specify <code>SortOrder</code> to be <code>Ascending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>If the previous response was truncated, you will receive this token. Use it in your next request to receive the next set of results.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of compute allocation definitions to list.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * @public
 */
export interface ListComputeQuotasResponse {
    /**
     * <p>Summaries of the compute allocation definitions.</p>
     * @public
     */
    ComputeQuotaSummaries?: ComputeQuotaSummary[] | undefined;
    /**
     * <p>If the previous response was truncated, you will receive this token. Use it in your next request to receive the next set of results.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const SortContextsBy: {
    readonly CREATION_TIME: "CreationTime";
    readonly NAME: "Name";
};
/**
 * @public
 */
export type SortContextsBy = (typeof SortContextsBy)[keyof typeof SortContextsBy];
/**
 * @public
 */
export interface ListContextsRequest {
    /**
     * <p>A filter that returns only contexts with the specified source URI.</p>
     * @public
     */
    SourceUri?: string | undefined;
    /**
     * <p>A filter that returns only contexts of the specified type.</p>
     * @public
     */
    ContextType?: string | undefined;
    /**
     * <p>A filter that returns only contexts created on or after the specified time.</p>
     * @public
     */
    CreatedAfter?: Date | undefined;
    /**
     * <p>A filter that returns only contexts created on or before the specified time.</p>
     * @public
     */
    CreatedBefore?: Date | undefined;
    /**
     * <p>The property used to sort results. The default value is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: SortContextsBy | undefined;
    /**
     * <p>The sort order. The default value is <code>Descending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>If the previous call to <code>ListContexts</code> didn't return the full set of contexts, the call returns a token for getting the next set of contexts.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of contexts to return in the response. The default value is 10.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * @public
 */
export interface ListContextsResponse {
    /**
     * <p>A list of contexts and their properties.</p>
     * @public
     */
    ContextSummaries?: ContextSummary[] | undefined;
    /**
     * <p>A token for getting the next set of contexts, if there are any.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const MonitoringJobDefinitionSortKey: {
    readonly CREATION_TIME: "CreationTime";
    readonly NAME: "Name";
};
/**
 * @public
 */
export type MonitoringJobDefinitionSortKey = (typeof MonitoringJobDefinitionSortKey)[keyof typeof MonitoringJobDefinitionSortKey];
/**
 * @public
 */
export interface ListDataQualityJobDefinitionsRequest {
    /**
     * <p>A filter that lists the data quality job definitions associated with the specified endpoint.</p>
     * @public
     */
    EndpointName?: string | undefined;
    /**
     * <p>The field to sort results by. The default is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: MonitoringJobDefinitionSortKey | undefined;
    /**
     * <p>Whether to sort the results in <code>Ascending</code> or <code>Descending</code> order. The default is <code>Descending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>If the result of the previous <code>ListDataQualityJobDefinitions</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of transform jobs, use the token in the next request.&gt;</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of data quality monitoring job definitions to return in the response.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>A string in the data quality monitoring job definition name. This filter returns only data quality monitoring job definitions whose name contains the specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>A filter that returns only data quality monitoring job definitions created before the specified time.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns only data quality monitoring job definitions created after the specified time.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
}
/**
 * <p>Summary information about a monitoring job.</p>
 * @public
 */
export interface MonitoringJobDefinitionSummary {
    /**
     * <p>The name of the monitoring job.</p>
     * @public
     */
    MonitoringJobDefinitionName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the monitoring job.</p>
     * @public
     */
    MonitoringJobDefinitionArn: string | undefined;
    /**
     * <p>The time that the monitoring job was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The name of the endpoint that the job monitors.</p>
     * @public
     */
    EndpointName: string | undefined;
}
/**
 * @public
 */
export interface ListDataQualityJobDefinitionsResponse {
    /**
     * <p>A list of data quality monitoring job definitions.</p>
     * @public
     */
    JobDefinitionSummaries: MonitoringJobDefinitionSummary[] | undefined;
    /**
     * <p>If the result of the previous <code>ListDataQualityJobDefinitions</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of data quality monitoring job definitions, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ListDeviceFleetsSortBy: {
    readonly CreationTime: "CREATION_TIME";
    readonly LastModifiedTime: "LAST_MODIFIED_TIME";
    readonly Name: "NAME";
};
/**
 * @public
 */
export type ListDeviceFleetsSortBy = (typeof ListDeviceFleetsSortBy)[keyof typeof ListDeviceFleetsSortBy];
/**
 * @public
 */
export interface ListDeviceFleetsRequest {
    /**
     * <p>The response from the last list when returning a list large enough to need tokening.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of results to select.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>Filter fleets where packaging job was created after specified time.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>Filter fleets where the edge packaging job was created before specified time.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>Select fleets where the job was updated after X</p>
     * @public
     */
    LastModifiedTimeAfter?: Date | undefined;
    /**
     * <p>Select fleets where the job was updated before X</p>
     * @public
     */
    LastModifiedTimeBefore?: Date | undefined;
    /**
     * <p>Filter for fleets containing this name in their fleet device name.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>The column to sort by.</p>
     * @public
     */
    SortBy?: ListDeviceFleetsSortBy | undefined;
    /**
     * <p>What direction to sort in.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
}
/**
 * @public
 */
export interface ListDeviceFleetsResponse {
    /**
     * <p>Summary of the device fleet.</p>
     * @public
     */
    DeviceFleetSummaries: DeviceFleetSummary[] | undefined;
    /**
     * <p>The response from the last list when returning a list large enough to need tokening.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListDevicesRequest {
    /**
     * <p>The response from the last list when returning a list large enough to need tokening.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>Maximum number of results to select.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>Select fleets where the job was updated after X</p>
     * @public
     */
    LatestHeartbeatAfter?: Date | undefined;
    /**
     * <p>A filter that searches devices that contains this name in any of their models.</p>
     * @public
     */
    ModelName?: string | undefined;
    /**
     * <p>Filter for fleets containing this name in their device fleet name.</p>
     * @public
     */
    DeviceFleetName?: string | undefined;
}
/**
 * @public
 */
export interface ListDevicesResponse {
    /**
     * <p>Summary of devices.</p>
     * @public
     */
    DeviceSummaries: DeviceSummary[] | undefined;
    /**
     * <p>The response from the last list when returning a list large enough to need tokening.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListDomainsRequest {
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
}
/**
 * @public
 */
export interface ListDomainsResponse {
    /**
     * <p>The list of domains.</p>
     * @public
     */
    Domains?: DomainDetails[] | undefined;
    /**
     * <p>If the previous response was truncated, you will receive this token. Use it in your next request to receive the next set of results.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ListEdgeDeploymentPlansSortBy: {
    readonly CreationTime: "CREATION_TIME";
    readonly DeviceFleetName: "DEVICE_FLEET_NAME";
    readonly LastModifiedTime: "LAST_MODIFIED_TIME";
    readonly Name: "NAME";
};
/**
 * @public
 */
export type ListEdgeDeploymentPlansSortBy = (typeof ListEdgeDeploymentPlansSortBy)[keyof typeof ListEdgeDeploymentPlansSortBy];
/**
 * @public
 */
export interface ListEdgeDeploymentPlansRequest {
    /**
     * <p>The response from the last list when returning a list large enough to need tokening.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of results to select (50 by default).</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>Selects edge deployment plans created after this time.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>Selects edge deployment plans created before this time.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>Selects edge deployment plans that were last updated after this time.</p>
     * @public
     */
    LastModifiedTimeAfter?: Date | undefined;
    /**
     * <p>Selects edge deployment plans that were last updated before this time.</p>
     * @public
     */
    LastModifiedTimeBefore?: Date | undefined;
    /**
     * <p>Selects edge deployment plans with names containing this name.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>Selects edge deployment plans with a device fleet name containing this name.</p>
     * @public
     */
    DeviceFleetNameContains?: string | undefined;
    /**
     * <p>The column by which to sort the edge deployment plans. Can be one of <code>NAME</code>, <code>DEVICEFLEETNAME</code>, <code>CREATIONTIME</code>, <code>LASTMODIFIEDTIME</code>.</p>
     * @public
     */
    SortBy?: ListEdgeDeploymentPlansSortBy | undefined;
    /**
     * <p>The direction of the sorting (ascending or descending).</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
}
/**
 * @public
 */
export interface ListEdgeDeploymentPlansResponse {
    /**
     * <p>List of summaries of edge deployment plans.</p>
     * @public
     */
    EdgeDeploymentPlanSummaries: EdgeDeploymentPlanSummary[] | undefined;
    /**
     * <p>The token to use when calling the next page of results.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ListEdgePackagingJobsSortBy: {
    readonly CreationTime: "CREATION_TIME";
    readonly EdgePackagingJobStatus: "STATUS";
    readonly LastModifiedTime: "LAST_MODIFIED_TIME";
    readonly ModelName: "MODEL_NAME";
    readonly Name: "NAME";
};
/**
 * @public
 */
export type ListEdgePackagingJobsSortBy = (typeof ListEdgePackagingJobsSortBy)[keyof typeof ListEdgePackagingJobsSortBy];
/**
 * @public
 */
export interface ListEdgePackagingJobsRequest {
    /**
     * <p>The response from the last list when returning a list large enough to need tokening.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>Maximum number of results to select.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>Select jobs where the job was created after specified time.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>Select jobs where the job was created before specified time.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>Select jobs where the job was updated after specified time.</p>
     * @public
     */
    LastModifiedTimeAfter?: Date | undefined;
    /**
     * <p>Select jobs where the job was updated before specified time.</p>
     * @public
     */
    LastModifiedTimeBefore?: Date | undefined;
    /**
     * <p>Filter for jobs containing this name in their packaging job name.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>Filter for jobs where the model name contains this string.</p>
     * @public
     */
    ModelNameContains?: string | undefined;
    /**
     * <p>The job status to filter for.</p>
     * @public
     */
    StatusEquals?: EdgePackagingJobStatus | undefined;
    /**
     * <p>Use to specify what column to sort by.</p>
     * @public
     */
    SortBy?: ListEdgePackagingJobsSortBy | undefined;
    /**
     * <p>What direction to sort by.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
}
/**
 * @public
 */
export interface ListEdgePackagingJobsResponse {
    /**
     * <p>Summaries of edge packaging jobs.</p>
     * @public
     */
    EdgePackagingJobSummaries: EdgePackagingJobSummary[] | undefined;
    /**
     * <p>Token to use when calling the next page of results.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const OrderKey: {
    readonly Ascending: "Ascending";
    readonly Descending: "Descending";
};
/**
 * @public
 */
export type OrderKey = (typeof OrderKey)[keyof typeof OrderKey];
/**
 * @public
 */
export interface ListEndpointConfigsInput {
    /**
     * <p>The field to sort results by. The default is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: EndpointConfigSortKey | undefined;
    /**
     * <p>The sort order for results. The default is <code>Descending</code>.</p>
     * @public
     */
    SortOrder?: OrderKey | undefined;
    /**
     * <p>If the result of the previous <code>ListEndpointConfig</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of endpoint configurations, use the token in the next request. </p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of training jobs to return in the response.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>A string in the endpoint configuration name. This filter returns only endpoint configurations whose name contains the specified string. </p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>A filter that returns only endpoint configurations created before the specified time (timestamp).</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns only endpoint configurations with a creation time greater than or equal to the specified time (timestamp).</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
}
/**
 * @public
 */
export interface ListEndpointConfigsOutput {
    /**
     * <p>An array of endpoint configurations.</p>
     * @public
     */
    EndpointConfigs: EndpointConfigSummary[] | undefined;
    /**
     * <p> If the response is truncated, SageMaker returns this token. To retrieve the next set of endpoint configurations, use it in the subsequent request </p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListEndpointsInput {
    /**
     * <p>Sorts the list of results. The default is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: EndpointSortKey | undefined;
    /**
     * <p>The sort order for results. The default is <code>Descending</code>.</p>
     * @public
     */
    SortOrder?: OrderKey | undefined;
    /**
     * <p>If the result of a <code>ListEndpoints</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of endpoints, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of endpoints to return in the response. This value defaults to 10.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>A string in endpoint names. This filter returns only endpoints whose name contains the specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>A filter that returns only endpoints that were created before the specified time (timestamp).</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns only endpoints with a creation time greater than or equal to the specified time (timestamp).</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p> A filter that returns only endpoints that were modified before the specified timestamp. </p>
     * @public
     */
    LastModifiedTimeBefore?: Date | undefined;
    /**
     * <p> A filter that returns only endpoints that were modified after the specified timestamp. </p>
     * @public
     */
    LastModifiedTimeAfter?: Date | undefined;
    /**
     * <p> A filter that returns only endpoints with the specified status.</p>
     * @public
     */
    StatusEquals?: EndpointStatus | undefined;
}
/**
 * @public
 */
export interface ListEndpointsOutput {
    /**
     * <p> An array or endpoint objects. </p>
     * @public
     */
    Endpoints: EndpointSummary[] | undefined;
    /**
     * <p> If the response is truncated, SageMaker returns this token. To retrieve the next set of training jobs, use it in the subsequent request. </p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const SortExperimentsBy: {
    readonly CREATION_TIME: "CreationTime";
    readonly NAME: "Name";
};
/**
 * @public
 */
export type SortExperimentsBy = (typeof SortExperimentsBy)[keyof typeof SortExperimentsBy];
/**
 * @public
 */
export interface ListExperimentsRequest {
    /**
     * <p>A filter that returns only experiments created after the specified time.</p>
     * @public
     */
    CreatedAfter?: Date | undefined;
    /**
     * <p>A filter that returns only experiments created before the specified time.</p>
     * @public
     */
    CreatedBefore?: Date | undefined;
    /**
     * <p>The property used to sort results. The default value is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: SortExperimentsBy | undefined;
    /**
     * <p>The sort order. The default value is <code>Descending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>If the previous call to <code>ListExperiments</code> didn't return the full set of experiments, the call returns a token for getting the next set of experiments.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of experiments to return in the response. The default value is 10.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * @public
 */
export interface ListExperimentsResponse {
    /**
     * <p>A list of the summaries of your experiments.</p>
     * @public
     */
    ExperimentSummaries?: ExperimentSummary[] | undefined;
    /**
     * <p>A token for getting the next set of experiments, if there are any.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListFeatureGroupsRequest {
    /**
     * <p>A string that partially matches one or more <code>FeatureGroup</code>s names. Filters <code>FeatureGroup</code>s by name. </p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>A <code>FeatureGroup</code> status. Filters by <code>FeatureGroup</code> status. </p>
     * @public
     */
    FeatureGroupStatusEquals?: FeatureGroupStatus | undefined;
    /**
     * <p>An <code>OfflineStore</code> status. Filters by <code>OfflineStore</code> status. </p>
     * @public
     */
    OfflineStoreStatusEquals?: OfflineStoreStatusValue | undefined;
    /**
     * <p>Use this parameter to search for <code>FeatureGroups</code>s created after a specific date and time.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>Use this parameter to search for <code>FeatureGroups</code>s created before a specific date and time.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>The order in which feature groups are listed.</p>
     * @public
     */
    SortOrder?: FeatureGroupSortOrder | undefined;
    /**
     * <p>The value on which the feature group list is sorted.</p>
     * @public
     */
    SortBy?: FeatureGroupSortBy | undefined;
    /**
     * <p>The maximum number of results returned by <code>ListFeatureGroups</code>.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>A token to resume pagination of <code>ListFeatureGroups</code> results.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListFeatureGroupsResponse {
    /**
     * <p>A summary of feature groups.</p>
     * @public
     */
    FeatureGroupSummaries: FeatureGroupSummary[] | undefined;
    /**
     * <p>A token to resume pagination of <code>ListFeatureGroups</code> results.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListFlowDefinitionsRequest {
    /**
     * <p>A filter that returns only flow definitions with a creation time greater than or equal to the specified timestamp.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only flow definitions that were created before the specified timestamp.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>An optional value that specifies whether you want the results sorted in <code>Ascending</code> or <code>Descending</code> order.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>A token to resume pagination.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The total number of items to return. If the total number of available items is more than the value specified in <code>MaxResults</code>, then a <code>NextToken</code> will be provided in the output that you can use to resume pagination.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * @public
 */
export interface ListFlowDefinitionsResponse {
    /**
     * <p>An array of objects describing the flow definitions.</p>
     * @public
     */
    FlowDefinitionSummaries: FlowDefinitionSummary[] | undefined;
    /**
     * <p>A token to resume pagination.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListHubContentsRequest {
    /**
     * <p>The name of the hub to list the contents of.</p>
     * @public
     */
    HubName: string | undefined;
    /**
     * <p>The type of hub content to list.</p>
     * @public
     */
    HubContentType: HubContentType | undefined;
    /**
     * <p>Only list hub content if the name contains the specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>The upper bound of the hub content schema verion.</p>
     * @public
     */
    MaxSchemaVersion?: string | undefined;
    /**
     * <p>Only list hub content that was created before the time specified.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>Only list hub content that was created after the time specified.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>Sort hub content versions by either name or creation time.</p>
     * @public
     */
    SortBy?: HubContentSortBy | undefined;
    /**
     * <p>Sort hubs by ascending or descending order.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>The maximum amount of hub content to list.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>If the response to a previous <code>ListHubContents</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of hub content, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListHubContentsResponse {
    /**
     * <p>The summaries of the listed hub content.</p>
     * @public
     */
    HubContentSummaries: HubContentInfo[] | undefined;
    /**
     * <p>If the response is truncated, SageMaker returns this token. To retrieve the next set of hub content, use it in the subsequent request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListHubContentVersionsRequest {
    /**
     * <p>The name of the hub to list the content versions of.</p>
     * @public
     */
    HubName: string | undefined;
    /**
     * <p>The type of hub content to list versions of.</p>
     * @public
     */
    HubContentType: HubContentType | undefined;
    /**
     * <p>The name of the hub content.</p>
     * @public
     */
    HubContentName: string | undefined;
    /**
     * <p>The lower bound of the hub content versions to list.</p>
     * @public
     */
    MinVersion?: string | undefined;
    /**
     * <p>The upper bound of the hub content schema version.</p>
     * @public
     */
    MaxSchemaVersion?: string | undefined;
    /**
     * <p>Only list hub content versions that were created before the time specified.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>Only list hub content versions that were created after the time specified.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>Sort hub content versions by either name or creation time.</p>
     * @public
     */
    SortBy?: HubContentSortBy | undefined;
    /**
     * <p>Sort hub content versions by ascending or descending order.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>The maximum number of hub content versions to list.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>If the response to a previous <code>ListHubContentVersions</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of hub content versions, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListHubContentVersionsResponse {
    /**
     * <p>The summaries of the listed hub content versions.</p>
     * @public
     */
    HubContentSummaries: HubContentInfo[] | undefined;
    /**
     * <p>If the response is truncated, SageMaker returns this token. To retrieve the next set of hub content versions, use it in the subsequent request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListHubsRequest {
    /**
     * <p>Only list hubs with names that contain the specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>Only list hubs that were created before the time specified.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>Only list hubs that were created after the time specified.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>Only list hubs that were last modified before the time specified.</p>
     * @public
     */
    LastModifiedTimeBefore?: Date | undefined;
    /**
     * <p>Only list hubs that were last modified after the time specified.</p>
     * @public
     */
    LastModifiedTimeAfter?: Date | undefined;
    /**
     * <p>Sort hubs by either name or creation time.</p>
     * @public
     */
    SortBy?: HubSortBy | undefined;
    /**
     * <p>Sort hubs by ascending or descending order.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>The maximum number of hubs to list.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>If the response to a previous <code>ListHubs</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of hubs, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListHubsResponse {
    /**
     * <p>The summaries of the listed hubs.</p>
     * @public
     */
    HubSummaries: HubInfo[] | undefined;
    /**
     * <p>If the response is truncated, SageMaker returns this token. To retrieve the next set of hubs, use it in the subsequent request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListHumanTaskUisRequest {
    /**
     * <p>A filter that returns only human task user interfaces with a creation time greater than or equal to the specified timestamp.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only human task user interfaces that were created before the specified timestamp.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>An optional value that specifies whether you want the results sorted in <code>Ascending</code> or <code>Descending</code> order.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>A token to resume pagination.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The total number of items to return. If the total number of available items is more than the value specified in <code>MaxResults</code>, then a <code>NextToken</code> will be provided in the output that you can use to resume pagination.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * @public
 */
export interface ListHumanTaskUisResponse {
    /**
     * <p>An array of objects describing the human task user interfaces.</p>
     * @public
     */
    HumanTaskUiSummaries: HumanTaskUiSummary[] | undefined;
    /**
     * <p>A token to resume pagination.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListHyperParameterTuningJobsRequest {
    /**
     * <p>If the result of the previous <code>ListHyperParameterTuningJobs</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of tuning jobs, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of tuning jobs to return. The default value is 10.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>The field to sort results by. The default is <code>Name</code>.</p>
     * @public
     */
    SortBy?: HyperParameterTuningJobSortByOptions | undefined;
    /**
     * <p>The sort order for results. The default is <code>Ascending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>A string in the tuning job name. This filter returns only tuning jobs whose name contains the specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>A filter that returns only tuning jobs that were created after the specified time.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only tuning jobs that were created before the specified time.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns only tuning jobs that were modified after the specified time.</p>
     * @public
     */
    LastModifiedTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only tuning jobs that were modified before the specified time.</p>
     * @public
     */
    LastModifiedTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns only tuning jobs with the specified status.</p>
     * @public
     */
    StatusEquals?: HyperParameterTuningJobStatus | undefined;
}
/**
 * @public
 */
export interface ListHyperParameterTuningJobsResponse {
    /**
     * <p>A list of <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_HyperParameterTuningJobSummary.html">HyperParameterTuningJobSummary</a> objects that describe the tuning jobs that the <code>ListHyperParameterTuningJobs</code> request returned.</p>
     * @public
     */
    HyperParameterTuningJobSummaries: HyperParameterTuningJobSummary[] | undefined;
    /**
     * <p>If the result of this <code>ListHyperParameterTuningJobs</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of tuning jobs, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListImagesRequest {
    /**
     * <p>A filter that returns only images created on or after the specified time.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only images created on or before the specified time.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns only images modified on or after the specified time.</p>
     * @public
     */
    LastModifiedTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only images modified on or before the specified time.</p>
     * @public
     */
    LastModifiedTimeBefore?: Date | undefined;
    /**
     * <p>The maximum number of images to return in the response. The default value is 10. </p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>A filter that returns only images whose name contains the specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>If the previous call to <code>ListImages</code> didn't return the full set of images, the call returns a token for getting the next set of images.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The property used to sort results. The default value is <code>CREATION_TIME</code>.</p>
     * @public
     */
    SortBy?: ImageSortBy | undefined;
    /**
     * <p>The sort order. The default value is <code>DESCENDING</code>.</p>
     * @public
     */
    SortOrder?: ImageSortOrder | undefined;
}
/**
 * @public
 */
export interface ListImagesResponse {
    /**
     * <p>A list of images and their properties.</p>
     * @public
     */
    Images?: Image[] | undefined;
    /**
     * <p>A token for getting the next set of images, if there are any.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListImageVersionsRequest {
    /**
     * <p>A filter that returns only versions created on or after the specified time.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only versions created on or before the specified time.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>The name of the image to list the versions of.</p>
     * @public
     */
    ImageName: string | undefined;
    /**
     * <p>A filter that returns only versions modified on or after the specified time.</p>
     * @public
     */
    LastModifiedTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only versions modified on or before the specified time.</p>
     * @public
     */
    LastModifiedTimeBefore?: Date | undefined;
    /**
     * <p>The maximum number of versions to return in the response. The default value is 10. </p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>If the previous call to <code>ListImageVersions</code> didn't return the full set of versions, the call returns a token for getting the next set of versions.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The property used to sort results. The default value is <code>CREATION_TIME</code>.</p>
     * @public
     */
    SortBy?: ImageVersionSortBy | undefined;
    /**
     * <p>The sort order. The default value is <code>DESCENDING</code>.</p>
     * @public
     */
    SortOrder?: ImageVersionSortOrder | undefined;
}
/**
 * @public
 */
export interface ListImageVersionsResponse {
    /**
     * <p>A list of versions and their properties.</p>
     * @public
     */
    ImageVersions?: ImageVersion[] | undefined;
    /**
     * <p>A token for getting the next set of versions, if there are any.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListInferenceComponentsInput {
    /**
     * <p>The field by which to sort the inference components in the response. The default is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: InferenceComponentSortKey | undefined;
    /**
     * <p>The sort order for results. The default is <code>Descending</code>.</p>
     * @public
     */
    SortOrder?: OrderKey | undefined;
    /**
     * <p>A token that you use to get the next set of results following a truncated response. If the response to the previous request was truncated, that response provides the value for this token.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of inference components to return in the response. This value defaults to 10.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>Filters the results to only those inference components with a name that contains the specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>Filters the results to only those inference components that were created before the specified time.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>Filters the results to only those inference components that were created after the specified time.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>Filters the results to only those inference components that were updated before the specified time.</p>
     * @public
     */
    LastModifiedTimeBefore?: Date | undefined;
    /**
     * <p>Filters the results to only those inference components that were updated after the specified time.</p>
     * @public
     */
    LastModifiedTimeAfter?: Date | undefined;
    /**
     * <p>Filters the results to only those inference components with the specified status.</p>
     * @public
     */
    StatusEquals?: InferenceComponentStatus | undefined;
    /**
     * <p>An endpoint name to filter the listed inference components. The response includes only those inference components that are hosted at the specified endpoint.</p>
     * @public
     */
    EndpointNameEquals?: string | undefined;
    /**
     * <p>A production variant name to filter the listed inference components. The response includes only those inference components that are hosted at the specified variant.</p>
     * @public
     */
    VariantNameEquals?: string | undefined;
}
/**
 * @public
 */
export interface ListInferenceComponentsOutput {
    /**
     * <p>A list of inference components and their properties that matches any of the filters you specified in the request.</p>
     * @public
     */
    InferenceComponents: InferenceComponentSummary[] | undefined;
    /**
     * <p>The token to use in a subsequent request to get the next set of results following a truncated response.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const SortInferenceExperimentsBy: {
    readonly CREATION_TIME: "CreationTime";
    readonly NAME: "Name";
    readonly STATUS: "Status";
};
/**
 * @public
 */
export type SortInferenceExperimentsBy = (typeof SortInferenceExperimentsBy)[keyof typeof SortInferenceExperimentsBy];
/**
 * @public
 */
export interface ListInferenceExperimentsRequest {
    /**
     * <p>Selects inference experiments whose names contain this name.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p> Selects inference experiments of this type. For the possible types of inference experiments, see <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateInferenceExperiment.html">CreateInferenceExperiment</a>. </p>
     * @public
     */
    Type?: InferenceExperimentType | undefined;
    /**
     * <p> Selects inference experiments which are in this status. For the possible statuses, see <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_DescribeInferenceExperiment.html">DescribeInferenceExperiment</a>. </p>
     * @public
     */
    StatusEquals?: InferenceExperimentStatus | undefined;
    /**
     * <p>Selects inference experiments which were created after this timestamp.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>Selects inference experiments which were created before this timestamp.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>Selects inference experiments which were last modified after this timestamp.</p>
     * @public
     */
    LastModifiedTimeAfter?: Date | undefined;
    /**
     * <p>Selects inference experiments which were last modified before this timestamp.</p>
     * @public
     */
    LastModifiedTimeBefore?: Date | undefined;
    /**
     * <p>The column by which to sort the listed inference experiments.</p>
     * @public
     */
    SortBy?: SortInferenceExperimentsBy | undefined;
    /**
     * <p>The direction of sorting (ascending or descending).</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p> The response from the last list when returning a list large enough to need tokening. </p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of results to select.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * @public
 */
export interface ListInferenceExperimentsResponse {
    /**
     * <p>List of inference experiments.</p>
     * @public
     */
    InferenceExperiments?: InferenceExperimentSummary[] | undefined;
    /**
     * <p>The token to use when calling the next page of results.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ListInferenceRecommendationsJobsSortBy: {
    readonly CREATION_TIME: "CreationTime";
    readonly NAME: "Name";
    readonly STATUS: "Status";
};
/**
 * @public
 */
export type ListInferenceRecommendationsJobsSortBy = (typeof ListInferenceRecommendationsJobsSortBy)[keyof typeof ListInferenceRecommendationsJobsSortBy];
/**
 * @public
 */
export interface ListInferenceRecommendationsJobsRequest {
    /**
     * <p>A filter that returns only jobs created after the specified time (timestamp).</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only jobs created before the specified time (timestamp).</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns only jobs that were last modified after the specified time (timestamp).</p>
     * @public
     */
    LastModifiedTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only jobs that were last modified before the specified time (timestamp).</p>
     * @public
     */
    LastModifiedTimeBefore?: Date | undefined;
    /**
     * <p>A string in the job name. This filter returns only recommendations whose name contains the specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>A filter that retrieves only inference recommendations jobs with a specific status.</p>
     * @public
     */
    StatusEquals?: RecommendationJobStatus | undefined;
    /**
     * <p>The parameter by which to sort the results.</p>
     * @public
     */
    SortBy?: ListInferenceRecommendationsJobsSortBy | undefined;
    /**
     * <p>The sort order for the results.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>If the response to a previous <code>ListInferenceRecommendationsJobsRequest</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of recommendations, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of recommendations to return in the response.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>A filter that returns only jobs that were created for this model.</p>
     * @public
     */
    ModelNameEquals?: string | undefined;
    /**
     * <p>A filter that returns only jobs that were created for this versioned model package.</p>
     * @public
     */
    ModelPackageVersionArnEquals?: string | undefined;
}
/**
 * @public
 */
export interface ListInferenceRecommendationsJobsResponse {
    /**
     * <p>The recommendations created from the Amazon SageMaker Inference Recommender job.</p>
     * @public
     */
    InferenceRecommendationsJobs: InferenceRecommendationsJob[] | undefined;
    /**
     * <p>A token for getting the next set of recommendations, if there are any.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListInferenceRecommendationsJobStepsRequest {
    /**
     * <p>The name for the Inference Recommender job.</p>
     * @public
     */
    JobName: string | undefined;
    /**
     * <p>A filter to return benchmarks of a specified status. If this field is left empty, then all benchmarks are returned.</p>
     * @public
     */
    Status?: RecommendationJobStatus | undefined;
    /**
     * <p>A filter to return details about the specified type of subtask.</p> <p> <code>BENCHMARK</code>: Evaluate the performance of your model on different instance types.</p>
     * @public
     */
    StepType?: RecommendationStepType | undefined;
    /**
     * <p>The maximum number of results to return.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>A token that you can specify to return more results from the list. Specify this field if you have a token that was returned from a previous request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListInferenceRecommendationsJobStepsResponse {
    /**
     * <p>A list of all subtask details in Inference Recommender.</p>
     * @public
     */
    Steps?: InferenceRecommendationsJobStep[] | undefined;
    /**
     * <p>A token that you can specify in your next request to return more results from the list.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const SortBy: {
    readonly CREATION_TIME: "CreationTime";
    readonly NAME: "Name";
    readonly STATUS: "Status";
};
/**
 * @public
 */
export type SortBy = (typeof SortBy)[keyof typeof SortBy];
/**
 * @public
 */
export interface ListLabelingJobsRequest {
    /**
     * <p>A filter that returns only labeling jobs created after the specified time (timestamp).</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only labeling jobs created before the specified time (timestamp).</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns only labeling jobs modified after the specified time (timestamp).</p>
     * @public
     */
    LastModifiedTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only labeling jobs modified before the specified time (timestamp).</p>
     * @public
     */
    LastModifiedTimeBefore?: Date | undefined;
    /**
     * <p>The maximum number of labeling jobs to return in each page of the response.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>If the result of the previous <code>ListLabelingJobs</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of labeling jobs, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>A string in the labeling job name. This filter returns only labeling jobs whose name contains the specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
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
     * <p>A filter that retrieves only labeling jobs with a specific status.</p>
     * @public
     */
    StatusEquals?: LabelingJobStatus | undefined;
}
/**
 * @public
 */
export interface ListLabelingJobsResponse {
    /**
     * <p>An array of <code>LabelingJobSummary</code> objects, each describing a labeling job.</p>
     * @public
     */
    LabelingJobSummaryList?: LabelingJobSummary[] | undefined;
    /**
     * <p>If the response is truncated, SageMaker returns this token. To retrieve the next set of labeling jobs, use it in the subsequent request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ListLabelingJobsForWorkteamSortByOptions: {
    readonly CREATION_TIME: "CreationTime";
};
/**
 * @public
 */
export type ListLabelingJobsForWorkteamSortByOptions = (typeof ListLabelingJobsForWorkteamSortByOptions)[keyof typeof ListLabelingJobsForWorkteamSortByOptions];
/**
 * @public
 */
export interface ListLabelingJobsForWorkteamRequest {
    /**
     * <p>The Amazon Resource Name (ARN) of the work team for which you want to see labeling jobs for.</p>
     * @public
     */
    WorkteamArn: string | undefined;
    /**
     * <p>The maximum number of labeling jobs to return in each page of the response.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>If the result of the previous <code>ListLabelingJobsForWorkteam</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of labeling jobs, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>A filter that returns only labeling jobs created after the specified time (timestamp).</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only labeling jobs created before the specified time (timestamp).</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>A filter the limits jobs to only the ones whose job reference code contains the specified string.</p>
     * @public
     */
    JobReferenceCodeContains?: string | undefined;
    /**
     * <p>The field to sort results by. The default is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: ListLabelingJobsForWorkteamSortByOptions | undefined;
    /**
     * <p>The sort order for results. The default is <code>Ascending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
}
/**
 * @public
 */
export interface ListLabelingJobsForWorkteamResponse {
    /**
     * <p>An array of <code>LabelingJobSummary</code> objects, each describing a labeling job.</p>
     * @public
     */
    LabelingJobSummaryList: LabelingJobForWorkteamSummary[] | undefined;
    /**
     * <p>If the response is truncated, SageMaker returns this token. To retrieve the next set of labeling jobs, use it in the subsequent request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const SortLineageGroupsBy: {
    readonly CREATION_TIME: "CreationTime";
    readonly NAME: "Name";
};
/**
 * @public
 */
export type SortLineageGroupsBy = (typeof SortLineageGroupsBy)[keyof typeof SortLineageGroupsBy];
/**
 * @public
 */
export interface ListLineageGroupsRequest {
    /**
     * <p>A timestamp to filter against lineage groups created after a certain point in time.</p>
     * @public
     */
    CreatedAfter?: Date | undefined;
    /**
     * <p>A timestamp to filter against lineage groups created before a certain point in time.</p>
     * @public
     */
    CreatedBefore?: Date | undefined;
    /**
     * <p>The parameter by which to sort the results. The default is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: SortLineageGroupsBy | undefined;
    /**
     * <p>The sort order for the results. The default is <code>Ascending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>If the response is truncated, SageMaker returns this token. To retrieve the next set of algorithms, use it in the subsequent request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of endpoints to return in the response. This value defaults to 10.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * @public
 */
export interface ListLineageGroupsResponse {
    /**
     * <p>A list of lineage groups and their properties.</p>
     * @public
     */
    LineageGroupSummaries?: LineageGroupSummary[] | undefined;
    /**
     * <p>If the response is truncated, SageMaker returns this token. To retrieve the next set of algorithms, use it in the subsequent request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const SortTrackingServerBy: {
    readonly CREATION_TIME: "CreationTime";
    readonly NAME: "Name";
    readonly STATUS: "Status";
};
/**
 * @public
 */
export type SortTrackingServerBy = (typeof SortTrackingServerBy)[keyof typeof SortTrackingServerBy];
/**
 * @public
 */
export interface ListMlflowTrackingServersRequest {
    /**
     * <p>Use the <code>CreatedAfter</code> filter to only list tracking servers created after a specific date and time. Listed tracking servers are shown with a date and time such as <code>"2024-03-16T01:46:56+00:00"</code>. The <code>CreatedAfter</code> parameter takes in a Unix timestamp. To convert a date and time into a Unix timestamp, see <a href="https://www.epochconverter.com/">EpochConverter</a>.</p>
     * @public
     */
    CreatedAfter?: Date | undefined;
    /**
     * <p>Use the <code>CreatedBefore</code> filter to only list tracking servers created before a specific date and time. Listed tracking servers are shown with a date and time such as <code>"2024-03-16T01:46:56+00:00"</code>. The <code>CreatedBefore</code> parameter takes in a Unix timestamp. To convert a date and time into a Unix timestamp, see <a href="https://www.epochconverter.com/">EpochConverter</a>.</p>
     * @public
     */
    CreatedBefore?: Date | undefined;
    /**
     * <p>Filter for tracking servers with a specified creation status.</p>
     * @public
     */
    TrackingServerStatus?: TrackingServerStatus | undefined;
    /**
     * <p>Filter for tracking servers using the specified MLflow version.</p>
     * @public
     */
    MlflowVersion?: string | undefined;
    /**
     * <p>Filter for trackings servers sorting by name, creation time, or creation status.</p>
     * @public
     */
    SortBy?: SortTrackingServerBy | undefined;
    /**
     * <p>Change the order of the listed tracking servers. By default, tracking servers are listed in <code>Descending</code> order by creation time. To change the list order, you can specify <code>SortOrder</code> to be <code>Ascending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>If the previous response was truncated, you will receive this token. Use it in your next request to receive the next set of results.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of tracking servers to list.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * <p>The summary of the tracking server to list.</p>
 * @public
 */
export interface TrackingServerSummary {
    /**
     * <p>The ARN of a listed tracking server.</p>
     * @public
     */
    TrackingServerArn?: string | undefined;
    /**
     * <p>The name of a listed tracking server.</p>
     * @public
     */
    TrackingServerName?: string | undefined;
    /**
     * <p>The creation time of a listed tracking server.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>The last modified time of a listed tracking server.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>The creation status of a listed tracking server.</p>
     * @public
     */
    TrackingServerStatus?: TrackingServerStatus | undefined;
    /**
     * <p>The activity status of a listed tracking server.</p>
     * @public
     */
    IsActive?: IsTrackingServerActive | undefined;
    /**
     * <p>The MLflow version used for a listed tracking server.</p>
     * @public
     */
    MlflowVersion?: string | undefined;
}
/**
 * @public
 */
export interface ListMlflowTrackingServersResponse {
    /**
     * <p>A list of tracking servers according to chosen filters.</p>
     * @public
     */
    TrackingServerSummaries?: TrackingServerSummary[] | undefined;
    /**
     * <p>If the previous response was truncated, you will receive this token. Use it in your next request to receive the next set of results.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListModelBiasJobDefinitionsRequest {
    /**
     * <p>Name of the endpoint to monitor for model bias.</p>
     * @public
     */
    EndpointName?: string | undefined;
    /**
     * <p>Whether to sort results by the <code>Name</code> or <code>CreationTime</code> field. The default is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: MonitoringJobDefinitionSortKey | undefined;
    /**
     * <p>Whether to sort the results in <code>Ascending</code> or <code>Descending</code> order. The default is <code>Descending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>The token returned if the response is truncated. To retrieve the next set of job executions, use it in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of model bias jobs to return in the response. The default value is 10.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>Filter for model bias jobs whose name contains a specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>A filter that returns only model bias jobs created before a specified time.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns only model bias jobs created after a specified time.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
}
/**
 * @public
 */
export interface ListModelBiasJobDefinitionsResponse {
    /**
     * <p>A JSON array in which each element is a summary for a model bias jobs.</p>
     * @public
     */
    JobDefinitionSummaries: MonitoringJobDefinitionSummary[] | undefined;
    /**
     * <p>The token returned if the response is truncated. To retrieve the next set of job executions, use it in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ModelCardExportJobSortBy: {
    readonly CREATION_TIME: "CreationTime";
    readonly NAME: "Name";
    readonly STATUS: "Status";
};
/**
 * @public
 */
export type ModelCardExportJobSortBy = (typeof ModelCardExportJobSortBy)[keyof typeof ModelCardExportJobSortBy];
/**
 * @public
 * @enum
 */
export declare const ModelCardExportJobSortOrder: {
    readonly ASCENDING: "Ascending";
    readonly DESCENDING: "Descending";
};
/**
 * @public
 */
export type ModelCardExportJobSortOrder = (typeof ModelCardExportJobSortOrder)[keyof typeof ModelCardExportJobSortOrder];
/**
 * @public
 */
export interface ListModelCardExportJobsRequest {
    /**
     * <p>List export jobs for the model card with the specified name.</p>
     * @public
     */
    ModelCardName: string | undefined;
    /**
     * <p>List export jobs for the model card with the specified version.</p>
     * @public
     */
    ModelCardVersion?: number | undefined;
    /**
     * <p>Only list model card export jobs that were created after the time specified.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>Only list model card export jobs that were created before the time specified.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>Only list model card export jobs with names that contain the specified string.</p>
     * @public
     */
    ModelCardExportJobNameContains?: string | undefined;
    /**
     * <p>Only list model card export jobs with the specified status.</p>
     * @public
     */
    StatusEquals?: ModelCardExportJobStatus | undefined;
    /**
     * <p>Sort model card export jobs by either name or creation time. Sorts by creation time by default.</p>
     * @public
     */
    SortBy?: ModelCardExportJobSortBy | undefined;
    /**
     * <p>Sort model card export jobs by ascending or descending order.</p>
     * @public
     */
    SortOrder?: ModelCardExportJobSortOrder | undefined;
    /**
     * <p>If the response to a previous <code>ListModelCardExportJobs</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of model card export jobs, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of model card export jobs to list.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * <p>The summary of the Amazon SageMaker Model Card export job.</p>
 * @public
 */
export interface ModelCardExportJobSummary {
    /**
     * <p>The name of the model card export job.</p>
     * @public
     */
    ModelCardExportJobName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the model card export job.</p>
     * @public
     */
    ModelCardExportJobArn: string | undefined;
    /**
     * <p>The completion status of the model card export job.</p>
     * @public
     */
    Status: ModelCardExportJobStatus | undefined;
    /**
     * <p>The name of the model card that the export job exports.</p>
     * @public
     */
    ModelCardName: string | undefined;
    /**
     * <p>The version of the model card that the export job exports.</p>
     * @public
     */
    ModelCardVersion: number | undefined;
    /**
     * <p>The date and time that the model card export job was created.</p>
     * @public
     */
    CreatedAt: Date | undefined;
    /**
     * <p>The date and time that the model card export job was last modified..</p>
     * @public
     */
    LastModifiedAt: Date | undefined;
}
/**
 * @public
 */
export interface ListModelCardExportJobsResponse {
    /**
     * <p>The summaries of the listed model card export jobs.</p>
     * @public
     */
    ModelCardExportJobSummaries: ModelCardExportJobSummary[] | undefined;
    /**
     * <p>If the response is truncated, SageMaker returns this token. To retrieve the next set of model card export jobs, use it in the subsequent request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ModelCardSortBy: {
    readonly CREATION_TIME: "CreationTime";
    readonly NAME: "Name";
};
/**
 * @public
 */
export type ModelCardSortBy = (typeof ModelCardSortBy)[keyof typeof ModelCardSortBy];
/**
 * @public
 * @enum
 */
export declare const ModelCardSortOrder: {
    readonly ASCENDING: "Ascending";
    readonly DESCENDING: "Descending";
};
/**
 * @public
 */
export type ModelCardSortOrder = (typeof ModelCardSortOrder)[keyof typeof ModelCardSortOrder];
/**
 * @public
 */
export interface ListModelCardsRequest {
    /**
     * <p>Only list model cards that were created after the time specified.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>Only list model cards that were created before the time specified.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>The maximum number of model cards to list.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>Only list model cards with names that contain the specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>Only list model cards with the specified approval status.</p>
     * @public
     */
    ModelCardStatus?: ModelCardStatus | undefined;
    /**
     * <p>If the response to a previous <code>ListModelCards</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of model cards, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>Sort model cards by either name or creation time. Sorts by creation time by default.</p>
     * @public
     */
    SortBy?: ModelCardSortBy | undefined;
    /**
     * <p>Sort model cards by ascending or descending order.</p>
     * @public
     */
    SortOrder?: ModelCardSortOrder | undefined;
}
/**
 * <p>A summary of the model card.</p>
 * @public
 */
export interface ModelCardSummary {
    /**
     * <p>The name of the model card.</p>
     * @public
     */
    ModelCardName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the model card.</p>
     * @public
     */
    ModelCardArn: string | undefined;
    /**
     * <p>The approval status of the model card within your organization. Different organizations might have different criteria for model card review and approval.</p> <ul> <li> <p> <code>Draft</code>: The model card is a work in progress.</p> </li> <li> <p> <code>PendingReview</code>: The model card is pending review.</p> </li> <li> <p> <code>Approved</code>: The model card is approved.</p> </li> <li> <p> <code>Archived</code>: The model card is archived. No more updates should be made to the model card, but it can still be exported.</p> </li> </ul>
     * @public
     */
    ModelCardStatus: ModelCardStatus | undefined;
    /**
     * <p>The date and time that the model card was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The date and time that the model card was last modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
}
/**
 * @public
 */
export interface ListModelCardsResponse {
    /**
     * <p>The summaries of the listed model cards.</p>
     * @public
     */
    ModelCardSummaries: ModelCardSummary[] | undefined;
    /**
     * <p>If the response is truncated, SageMaker returns this token. To retrieve the next set of model cards, use it in the subsequent request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ModelCardVersionSortBy: {
    readonly VERSION: "Version";
};
/**
 * @public
 */
export type ModelCardVersionSortBy = (typeof ModelCardVersionSortBy)[keyof typeof ModelCardVersionSortBy];
/**
 * @public
 */
export interface ListModelCardVersionsRequest {
    /**
     * <p>Only list model card versions that were created after the time specified.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>Only list model card versions that were created before the time specified.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>The maximum number of model card versions to list.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>List model card versions for the model card with the specified name or Amazon Resource Name (ARN).</p>
     * @public
     */
    ModelCardName: string | undefined;
    /**
     * <p>Only list model card versions with the specified approval status.</p>
     * @public
     */
    ModelCardStatus?: ModelCardStatus | undefined;
    /**
     * <p>If the response to a previous <code>ListModelCardVersions</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of model card versions, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>Sort listed model card versions by version. Sorts by version by default.</p>
     * @public
     */
    SortBy?: ModelCardVersionSortBy | undefined;
    /**
     * <p>Sort model card versions by ascending or descending order.</p>
     * @public
     */
    SortOrder?: ModelCardSortOrder | undefined;
}
/**
 * <p>A summary of a specific version of the model card.</p>
 * @public
 */
export interface ModelCardVersionSummary {
    /**
     * <p>The name of the model card.</p>
     * @public
     */
    ModelCardName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the model card.</p>
     * @public
     */
    ModelCardArn: string | undefined;
    /**
     * <p>The approval status of the model card version within your organization. Different organizations might have different criteria for model card review and approval.</p> <ul> <li> <p> <code>Draft</code>: The model card is a work in progress.</p> </li> <li> <p> <code>PendingReview</code>: The model card is pending review.</p> </li> <li> <p> <code>Approved</code>: The model card is approved.</p> </li> <li> <p> <code>Archived</code>: The model card is archived. No more updates should be made to the model card, but it can still be exported.</p> </li> </ul>
     * @public
     */
    ModelCardStatus: ModelCardStatus | undefined;
    /**
     * <p>A version of the model card.</p>
     * @public
     */
    ModelCardVersion: number | undefined;
    /**
     * <p>The date and time that the model card version was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The time date and time that the model card version was last modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
}
/**
 * @public
 */
export interface ListModelCardVersionsResponse {
    /**
     * <p>The summaries of the listed versions of the model card.</p>
     * @public
     */
    ModelCardVersionSummaryList: ModelCardVersionSummary[] | undefined;
    /**
     * <p>If the response is truncated, SageMaker returns this token. To retrieve the next set of model card versions, use it in the subsequent request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListModelExplainabilityJobDefinitionsRequest {
    /**
     * <p>Name of the endpoint to monitor for model explainability.</p>
     * @public
     */
    EndpointName?: string | undefined;
    /**
     * <p>Whether to sort results by the <code>Name</code> or <code>CreationTime</code> field. The default is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: MonitoringJobDefinitionSortKey | undefined;
    /**
     * <p>Whether to sort the results in <code>Ascending</code> or <code>Descending</code> order. The default is <code>Descending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>The token returned if the response is truncated. To retrieve the next set of job executions, use it in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of jobs to return in the response. The default value is 10.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>Filter for model explainability jobs whose name contains a specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>A filter that returns only model explainability jobs created before a specified time.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns only model explainability jobs created after a specified time.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
}
/**
 * @public
 */
export interface ListModelExplainabilityJobDefinitionsResponse {
    /**
     * <p>A JSON array in which each element is a summary for a explainability bias jobs.</p>
     * @public
     */
    JobDefinitionSummaries: MonitoringJobDefinitionSummary[] | undefined;
    /**
     * <p>The token returned if the response is truncated. To retrieve the next set of job executions, use it in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ModelMetadataFilterType: {
    readonly DOMAIN: "Domain";
    readonly FRAMEWORK: "Framework";
    readonly FRAMEWORKVERSION: "FrameworkVersion";
    readonly TASK: "Task";
};
/**
 * @public
 */
export type ModelMetadataFilterType = (typeof ModelMetadataFilterType)[keyof typeof ModelMetadataFilterType];
/**
 * <p>Part of the search expression. You can specify the name and value (domain, task, framework, framework version, task, and model).</p>
 * @public
 */
export interface ModelMetadataFilter {
    /**
     * <p>The name of the of the model to filter by.</p>
     * @public
     */
    Name: ModelMetadataFilterType | undefined;
    /**
     * <p>The value to filter the model metadata.</p>
     * @public
     */
    Value: string | undefined;
}
/**
 * <p>One or more filters that searches for the specified resource or resources in a search. All resource objects that satisfy the expression's condition are included in the search results</p>
 * @public
 */
export interface ModelMetadataSearchExpression {
    /**
     * <p>A list of filter objects.</p>
     * @public
     */
    Filters?: ModelMetadataFilter[] | undefined;
}
/**
 * @public
 */
export interface ListModelMetadataRequest {
    /**
     * <p>One or more filters that searches for the specified resource or resources in a search. All resource objects that satisfy the expression's condition are included in the search results. Specify the Framework, FrameworkVersion, Domain or Task to filter supported. Filter names and values are case-sensitive.</p>
     * @public
     */
    SearchExpression?: ModelMetadataSearchExpression | undefined;
    /**
     * <p>If the response to a previous <code>ListModelMetadataResponse</code> request was truncated, the response includes a NextToken. To retrieve the next set of model metadata, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of models to return in the response.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * <p>A summary of the model metadata.</p>
 * @public
 */
export interface ModelMetadataSummary {
    /**
     * <p>The machine learning domain of the model.</p>
     * @public
     */
    Domain: string | undefined;
    /**
     * <p>The machine learning framework of the model.</p>
     * @public
     */
    Framework: string | undefined;
    /**
     * <p>The machine learning task of the model.</p>
     * @public
     */
    Task: string | undefined;
    /**
     * <p>The name of the model.</p>
     * @public
     */
    Model: string | undefined;
    /**
     * <p>The framework version of the model.</p>
     * @public
     */
    FrameworkVersion: string | undefined;
}
/**
 * @public
 */
export interface ListModelMetadataResponse {
    /**
     * <p>A structure that holds model metadata.</p>
     * @public
     */
    ModelMetadataSummaries: ModelMetadataSummary[] | undefined;
    /**
     * <p>A token for getting the next set of recommendations, if there are any.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ModelPackageGroupSortBy: {
    readonly CREATION_TIME: "CreationTime";
    readonly NAME: "Name";
};
/**
 * @public
 */
export type ModelPackageGroupSortBy = (typeof ModelPackageGroupSortBy)[keyof typeof ModelPackageGroupSortBy];
/**
 * @public
 */
export interface ListModelPackageGroupsInput {
    /**
     * <p>A filter that returns only model groups created after the specified time.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only model groups created before the specified time.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>The maximum number of results to return in the response.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>A string in the model group name. This filter returns only model groups whose name contains the specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>If the result of the previous <code>ListModelPackageGroups</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of model groups, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The field to sort results by. The default is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: ModelPackageGroupSortBy | undefined;
    /**
     * <p>The sort order for results. The default is <code>Ascending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>A filter that returns either model groups shared with you or model groups in your own account. When the value is <code>CrossAccount</code>, the results show the resources made discoverable to you from other accounts. When the value is <code>SameAccount</code> or <code>null</code>, the results show resources from your account. The default is <code>SameAccount</code>.</p>
     * @public
     */
    CrossAccountFilterOption?: CrossAccountFilterOption | undefined;
}
/**
 * <p>Summary information about a model group.</p>
 * @public
 */
export interface ModelPackageGroupSummary {
    /**
     * <p>The name of the model group.</p>
     * @public
     */
    ModelPackageGroupName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the model group.</p>
     * @public
     */
    ModelPackageGroupArn: string | undefined;
    /**
     * <p>A description of the model group.</p>
     * @public
     */
    ModelPackageGroupDescription?: string | undefined;
    /**
     * <p>The time that the model group was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The status of the model group.</p>
     * @public
     */
    ModelPackageGroupStatus: ModelPackageGroupStatus | undefined;
}
/**
 * @public
 */
export interface ListModelPackageGroupsOutput {
    /**
     * <p>A list of summaries of the model groups in your Amazon Web Services account.</p>
     * @public
     */
    ModelPackageGroupSummaryList: ModelPackageGroupSummary[] | undefined;
    /**
     * <p>If the response is truncated, SageMaker returns this token. To retrieve the next set of model groups, use it in the subsequent request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ModelPackageType: {
    readonly BOTH: "Both";
    readonly UNVERSIONED: "Unversioned";
    readonly VERSIONED: "Versioned";
};
/**
 * @public
 */
export type ModelPackageType = (typeof ModelPackageType)[keyof typeof ModelPackageType];
/**
 * @public
 * @enum
 */
export declare const ModelPackageSortBy: {
    readonly CREATION_TIME: "CreationTime";
    readonly NAME: "Name";
};
/**
 * @public
 */
export type ModelPackageSortBy = (typeof ModelPackageSortBy)[keyof typeof ModelPackageSortBy];
/**
 * @public
 */
export interface ListModelPackagesInput {
    /**
     * <p>A filter that returns only model packages created after the specified time (timestamp).</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only model packages created before the specified time (timestamp).</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>The maximum number of model packages to return in the response.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>A string in the model package name. This filter returns only model packages whose name contains the specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>A filter that returns only the model packages with the specified approval status.</p>
     * @public
     */
    ModelApprovalStatus?: ModelApprovalStatus | undefined;
    /**
     * <p>A filter that returns only model versions that belong to the specified model group.</p>
     * @public
     */
    ModelPackageGroupName?: string | undefined;
    /**
     * <p>A filter that returns only the model packages of the specified type. This can be one of the following values.</p> <ul> <li> <p> <code>UNVERSIONED</code> - List only unversioined models. This is the default value if no <code>ModelPackageType</code> is specified.</p> </li> <li> <p> <code>VERSIONED</code> - List only versioned models.</p> </li> <li> <p> <code>BOTH</code> - List both versioned and unversioned models.</p> </li> </ul>
     * @public
     */
    ModelPackageType?: ModelPackageType | undefined;
    /**
     * <p>If the response to a previous <code>ListModelPackages</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of model packages, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The parameter by which to sort the results. The default is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: ModelPackageSortBy | undefined;
    /**
     * <p>The sort order for the results. The default is <code>Ascending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
}
/**
 * <p>Provides summary information about a model package.</p>
 * @public
 */
export interface ModelPackageSummary {
    /**
     * <p>The name of the model package.</p>
     * @public
     */
    ModelPackageName?: string | undefined;
    /**
     * <p>If the model package is a versioned model, the model group that the versioned model belongs to.</p>
     * @public
     */
    ModelPackageGroupName?: string | undefined;
    /**
     * <p>If the model package is a versioned model, the version of the model.</p>
     * @public
     */
    ModelPackageVersion?: number | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the model package.</p>
     * @public
     */
    ModelPackageArn: string | undefined;
    /**
     * <p>A brief description of the model package.</p>
     * @public
     */
    ModelPackageDescription?: string | undefined;
    /**
     * <p>A timestamp that shows when the model package was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The overall status of the model package.</p>
     * @public
     */
    ModelPackageStatus: ModelPackageStatus | undefined;
    /**
     * <p>The approval status of the model. This can be one of the following values.</p> <ul> <li> <p> <code>APPROVED</code> - The model is approved</p> </li> <li> <p> <code>REJECTED</code> - The model is rejected.</p> </li> <li> <p> <code>PENDING_MANUAL_APPROVAL</code> - The model is waiting for manual approval.</p> </li> </ul>
     * @public
     */
    ModelApprovalStatus?: ModelApprovalStatus | undefined;
    /**
     * <p> A structure describing the current state of the model in its life cycle. </p>
     * @public
     */
    ModelLifeCycle?: ModelLifeCycle | undefined;
}
/**
 * @public
 */
export interface ListModelPackagesOutput {
    /**
     * <p>An array of <code>ModelPackageSummary</code> objects, each of which lists a model package.</p>
     * @public
     */
    ModelPackageSummaryList: ModelPackageSummary[] | undefined;
    /**
     * <p>If the response is truncated, SageMaker returns this token. To retrieve the next set of model packages, use it in the subsequent request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListModelQualityJobDefinitionsRequest {
    /**
     * <p>A filter that returns only model quality monitoring job definitions that are associated with the specified endpoint.</p>
     * @public
     */
    EndpointName?: string | undefined;
    /**
     * <p>The field to sort results by. The default is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: MonitoringJobDefinitionSortKey | undefined;
    /**
     * <p>Whether to sort the results in <code>Ascending</code> or <code>Descending</code> order. The default is <code>Descending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>If the result of the previous <code>ListModelQualityJobDefinitions</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of model quality monitoring job definitions, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of results to return in a call to <code>ListModelQualityJobDefinitions</code>.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>A string in the transform job name. This filter returns only model quality monitoring job definitions whose name contains the specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>A filter that returns only model quality monitoring job definitions created before the specified time.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns only model quality monitoring job definitions created after the specified time.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
}
/**
 * @public
 */
export interface ListModelQualityJobDefinitionsResponse {
    /**
     * <p>A list of summaries of model quality monitoring job definitions.</p>
     * @public
     */
    JobDefinitionSummaries: MonitoringJobDefinitionSummary[] | undefined;
    /**
     * <p>If the response is truncated, Amazon SageMaker AI returns this token. To retrieve the next set of model quality monitoring job definitions, use it in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ModelSortKey: {
    readonly CreationTime: "CreationTime";
    readonly Name: "Name";
};
/**
 * @public
 */
export type ModelSortKey = (typeof ModelSortKey)[keyof typeof ModelSortKey];
/**
 * @public
 */
export interface ListModelsInput {
    /**
     * <p>Sorts the list of results. The default is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: ModelSortKey | undefined;
    /**
     * <p>The sort order for results. The default is <code>Descending</code>.</p>
     * @public
     */
    SortOrder?: OrderKey | undefined;
    /**
     * <p>If the response to a previous <code>ListModels</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of models, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of models to return in the response.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>A string in the model name. This filter returns only models whose name contains the specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>A filter that returns only models created before the specified time (timestamp).</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns only models with a creation time greater than or equal to the specified time (timestamp).</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
}
/**
 * <p>Provides summary information about a model.</p>
 * @public
 */
export interface ModelSummary {
    /**
     * <p>The name of the model that you want a summary for.</p>
     * @public
     */
    ModelName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the model.</p>
     * @public
     */
    ModelArn: string | undefined;
    /**
     * <p>A timestamp that indicates when the model was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
}
/**
 * @public
 */
export interface ListModelsOutput {
    /**
     * <p>An array of <code>ModelSummary</code> objects, each of which lists a model.</p>
     * @public
     */
    Models: ModelSummary[] | undefined;
    /**
     * <p> If the response is truncated, SageMaker returns this token. To retrieve the next set of models, use it in the subsequent request. </p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const MonitoringAlertHistorySortKey: {
    readonly CreationTime: "CreationTime";
    readonly Status: "Status";
};
/**
 * @public
 */
export type MonitoringAlertHistorySortKey = (typeof MonitoringAlertHistorySortKey)[keyof typeof MonitoringAlertHistorySortKey];
/**
 * @public
 * @enum
 */
export declare const MonitoringAlertStatus: {
    readonly IN_ALERT: "InAlert";
    readonly OK: "OK";
};
/**
 * @public
 */
export type MonitoringAlertStatus = (typeof MonitoringAlertStatus)[keyof typeof MonitoringAlertStatus];
/**
 * @public
 */
export interface ListMonitoringAlertHistoryRequest {
    /**
     * <p>The name of a monitoring schedule.</p>
     * @public
     */
    MonitoringScheduleName?: string | undefined;
    /**
     * <p>The name of a monitoring alert.</p>
     * @public
     */
    MonitoringAlertName?: string | undefined;
    /**
     * <p>The field used to sort results. The default is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: MonitoringAlertHistorySortKey | undefined;
    /**
     * <p>The sort order, whether <code>Ascending</code> or <code>Descending</code>, of the alert history. The default is <code>Descending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>If the result of the previous <code>ListMonitoringAlertHistory</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of alerts in the history, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of results to display. The default is 100.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>A filter that returns only alerts created on or before the specified time.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns only alerts created on or after the specified time.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>A filter that retrieves only alerts with a specific status.</p>
     * @public
     */
    StatusEquals?: MonitoringAlertStatus | undefined;
}
/**
 * <p>Provides summary information of an alert's history.</p>
 * @public
 */
export interface MonitoringAlertHistorySummary {
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
     * <p>A timestamp that indicates when the first alert transition occurred in an alert history. An alert transition can be from status <code>InAlert</code> to <code>OK</code>, or from <code>OK</code> to <code>InAlert</code>.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The current alert status of an alert.</p>
     * @public
     */
    AlertStatus: MonitoringAlertStatus | undefined;
}
/**
 * @public
 */
export interface ListMonitoringAlertHistoryResponse {
    /**
     * <p>An alert history for a model monitoring schedule.</p>
     * @public
     */
    MonitoringAlertHistory?: MonitoringAlertHistorySummary[] | undefined;
    /**
     * <p>If the response is truncated, SageMaker returns this token. To retrieve the next set of alerts, use it in the subsequent request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListMonitoringAlertsRequest {
    /**
     * <p>The name of a monitoring schedule.</p>
     * @public
     */
    MonitoringScheduleName: string | undefined;
    /**
     * <p>If the result of the previous <code>ListMonitoringAlerts</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of alerts in the history, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of results to display. The default is 100.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * <p>An alert action taken to light up an icon on the Amazon SageMaker Model Dashboard when an alert goes into <code>InAlert</code> status.</p>
 * @public
 */
export interface ModelDashboardIndicatorAction {
    /**
     * <p>Indicates whether the alert action is turned on.</p>
     * @public
     */
    Enabled?: boolean | undefined;
}
/**
 * <p>A list of alert actions taken in response to an alert going into <code>InAlert</code> status.</p>
 * @public
 */
export interface MonitoringAlertActions {
    /**
     * <p>An alert action taken to light up an icon on the Model Dashboard when an alert goes into <code>InAlert</code> status.</p>
     * @public
     */
    ModelDashboardIndicator?: ModelDashboardIndicatorAction | undefined;
}
/**
 * <p>Provides summary information about a monitor alert.</p>
 * @public
 */
export interface MonitoringAlertSummary {
    /**
     * <p>The name of a monitoring alert.</p>
     * @public
     */
    MonitoringAlertName: string | undefined;
    /**
     * <p>A timestamp that indicates when a monitor alert was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>A timestamp that indicates when a monitor alert was last updated.</p>
     * @public
     */
    LastModifiedTime: Date | undefined;
    /**
     * <p>The current status of an alert.</p>
     * @public
     */
    AlertStatus: MonitoringAlertStatus | undefined;
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
    /**
     * <p>A list of alert actions taken in response to an alert going into <code>InAlert</code> status.</p>
     * @public
     */
    Actions: MonitoringAlertActions | undefined;
}
/**
 * @public
 */
export interface ListMonitoringAlertsResponse {
    /**
     * <p>A JSON array where each element is a summary for a monitoring alert.</p>
     * @public
     */
    MonitoringAlertSummaries?: MonitoringAlertSummary[] | undefined;
    /**
     * <p>If the response is truncated, SageMaker returns this token. To retrieve the next set of alerts, use it in the subsequent request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const MonitoringExecutionSortKey: {
    readonly CREATION_TIME: "CreationTime";
    readonly SCHEDULED_TIME: "ScheduledTime";
    readonly STATUS: "Status";
};
/**
 * @public
 */
export type MonitoringExecutionSortKey = (typeof MonitoringExecutionSortKey)[keyof typeof MonitoringExecutionSortKey];
/**
 * @public
 */
export interface ListMonitoringExecutionsRequest {
    /**
     * <p>Name of a specific schedule to fetch jobs for.</p>
     * @public
     */
    MonitoringScheduleName?: string | undefined;
    /**
     * <p>Name of a specific endpoint to fetch jobs for.</p>
     * @public
     */
    EndpointName?: string | undefined;
    /**
     * <p>Whether to sort the results by the <code>Status</code>, <code>CreationTime</code>, or <code>ScheduledTime</code> field. The default is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: MonitoringExecutionSortKey | undefined;
    /**
     * <p>Whether to sort the results in <code>Ascending</code> or <code>Descending</code> order. The default is <code>Descending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>The token returned if the response is truncated. To retrieve the next set of job executions, use it in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of jobs to return in the response. The default value is 10.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>Filter for jobs scheduled before a specified time.</p>
     * @public
     */
    ScheduledTimeBefore?: Date | undefined;
    /**
     * <p>Filter for jobs scheduled after a specified time.</p>
     * @public
     */
    ScheduledTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only jobs created before a specified time.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns only jobs created after a specified time.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only jobs modified after a specified time.</p>
     * @public
     */
    LastModifiedTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns only jobs modified before a specified time.</p>
     * @public
     */
    LastModifiedTimeAfter?: Date | undefined;
    /**
     * <p>A filter that retrieves only jobs with a specific status.</p>
     * @public
     */
    StatusEquals?: ExecutionStatus | undefined;
    /**
     * <p>Gets a list of the monitoring job runs of the specified monitoring job definitions.</p>
     * @public
     */
    MonitoringJobDefinitionName?: string | undefined;
    /**
     * <p>A filter that returns only the monitoring job runs of the specified monitoring type.</p>
     * @public
     */
    MonitoringTypeEquals?: MonitoringType | undefined;
}
/**
 * @public
 */
export interface ListMonitoringExecutionsResponse {
    /**
     * <p>A JSON array in which each element is a summary for a monitoring execution.</p>
     * @public
     */
    MonitoringExecutionSummaries: MonitoringExecutionSummary[] | undefined;
    /**
     * <p>The token returned if the response is truncated. To retrieve the next set of job executions, use it in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const MonitoringScheduleSortKey: {
    readonly CREATION_TIME: "CreationTime";
    readonly NAME: "Name";
    readonly STATUS: "Status";
};
/**
 * @public
 */
export type MonitoringScheduleSortKey = (typeof MonitoringScheduleSortKey)[keyof typeof MonitoringScheduleSortKey];
/**
 * @public
 */
export interface ListMonitoringSchedulesRequest {
    /**
     * <p>Name of a specific endpoint to fetch schedules for.</p>
     * @public
     */
    EndpointName?: string | undefined;
    /**
     * <p>Whether to sort the results by the <code>Status</code>, <code>CreationTime</code>, or <code>ScheduledTime</code> field. The default is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: MonitoringScheduleSortKey | undefined;
    /**
     * <p>Whether to sort the results in <code>Ascending</code> or <code>Descending</code> order. The default is <code>Descending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>The token returned if the response is truncated. To retrieve the next set of job executions, use it in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of jobs to return in the response. The default value is 10.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>Filter for monitoring schedules whose name contains a specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>A filter that returns only monitoring schedules created before a specified time.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns only monitoring schedules created after a specified time.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only monitoring schedules modified before a specified time.</p>
     * @public
     */
    LastModifiedTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns only monitoring schedules modified after a specified time.</p>
     * @public
     */
    LastModifiedTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only monitoring schedules modified before a specified time.</p>
     * @public
     */
    StatusEquals?: ScheduleStatus | undefined;
    /**
     * <p>Gets a list of the monitoring schedules for the specified monitoring job definition.</p>
     * @public
     */
    MonitoringJobDefinitionName?: string | undefined;
    /**
     * <p>A filter that returns only the monitoring schedules for the specified monitoring type.</p>
     * @public
     */
    MonitoringTypeEquals?: MonitoringType | undefined;
}
/**
 * <p>Summarizes the monitoring schedule.</p>
 * @public
 */
export interface MonitoringScheduleSummary {
    /**
     * <p>The name of the monitoring schedule.</p>
     * @public
     */
    MonitoringScheduleName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the monitoring schedule.</p>
     * @public
     */
    MonitoringScheduleArn: string | undefined;
    /**
     * <p>The creation time of the monitoring schedule.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The last time the monitoring schedule was modified.</p>
     * @public
     */
    LastModifiedTime: Date | undefined;
    /**
     * <p>The status of the monitoring schedule.</p>
     * @public
     */
    MonitoringScheduleStatus: ScheduleStatus | undefined;
    /**
     * <p>The name of the endpoint using the monitoring schedule.</p>
     * @public
     */
    EndpointName?: string | undefined;
    /**
     * <p>The name of the monitoring job definition that the schedule is for.</p>
     * @public
     */
    MonitoringJobDefinitionName?: string | undefined;
    /**
     * <p>The type of the monitoring job definition that the schedule is for.</p>
     * @public
     */
    MonitoringType?: MonitoringType | undefined;
}
/**
 * @public
 */
export interface ListMonitoringSchedulesResponse {
    /**
     * <p>A JSON array in which each element is a summary for a monitoring schedule.</p>
     * @public
     */
    MonitoringScheduleSummaries: MonitoringScheduleSummary[] | undefined;
    /**
     * <p>The token returned if the response is truncated. To retrieve the next set of job executions, use it in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const NotebookInstanceLifecycleConfigSortKey: {
    readonly CREATION_TIME: "CreationTime";
    readonly LAST_MODIFIED_TIME: "LastModifiedTime";
    readonly NAME: "Name";
};
/**
 * @public
 */
export type NotebookInstanceLifecycleConfigSortKey = (typeof NotebookInstanceLifecycleConfigSortKey)[keyof typeof NotebookInstanceLifecycleConfigSortKey];
/**
 * @public
 * @enum
 */
export declare const NotebookInstanceLifecycleConfigSortOrder: {
    readonly ASCENDING: "Ascending";
    readonly DESCENDING: "Descending";
};
/**
 * @public
 */
export type NotebookInstanceLifecycleConfigSortOrder = (typeof NotebookInstanceLifecycleConfigSortOrder)[keyof typeof NotebookInstanceLifecycleConfigSortOrder];
/**
 * @public
 */
export interface ListNotebookInstanceLifecycleConfigsInput {
    /**
     * <p>If the result of a <code>ListNotebookInstanceLifecycleConfigs</code> request was truncated, the response includes a <code>NextToken</code>. To get the next set of lifecycle configurations, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of lifecycle configurations to return in the response.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>Sorts the list of results. The default is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: NotebookInstanceLifecycleConfigSortKey | undefined;
    /**
     * <p>The sort order for results.</p>
     * @public
     */
    SortOrder?: NotebookInstanceLifecycleConfigSortOrder | undefined;
    /**
     * <p>A string in the lifecycle configuration name. This filter returns only lifecycle configurations whose name contains the specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>A filter that returns only lifecycle configurations that were created before the specified time (timestamp).</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns only lifecycle configurations that were created after the specified time (timestamp).</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only lifecycle configurations that were modified before the specified time (timestamp).</p>
     * @public
     */
    LastModifiedTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns only lifecycle configurations that were modified after the specified time (timestamp).</p>
     * @public
     */
    LastModifiedTimeAfter?: Date | undefined;
}
/**
 * <p>Provides a summary of a notebook instance lifecycle configuration.</p>
 * @public
 */
export interface NotebookInstanceLifecycleConfigSummary {
    /**
     * <p>The name of the lifecycle configuration.</p>
     * @public
     */
    NotebookInstanceLifecycleConfigName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the lifecycle configuration.</p>
     * @public
     */
    NotebookInstanceLifecycleConfigArn: string | undefined;
    /**
     * <p>A timestamp that tells when the lifecycle configuration was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>A timestamp that tells when the lifecycle configuration was last modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
}
/**
 * @public
 */
export interface ListNotebookInstanceLifecycleConfigsOutput {
    /**
     * <p>If the response is truncated, SageMaker AI returns this token. To get the next set of lifecycle configurations, use it in the next request. </p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>An array of <code>NotebookInstanceLifecycleConfiguration</code> objects, each listing a lifecycle configuration.</p>
     * @public
     */
    NotebookInstanceLifecycleConfigs?: NotebookInstanceLifecycleConfigSummary[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const NotebookInstanceSortKey: {
    readonly CREATION_TIME: "CreationTime";
    readonly NAME: "Name";
    readonly STATUS: "Status";
};
/**
 * @public
 */
export type NotebookInstanceSortKey = (typeof NotebookInstanceSortKey)[keyof typeof NotebookInstanceSortKey];
/**
 * @public
 * @enum
 */
export declare const NotebookInstanceSortOrder: {
    readonly ASCENDING: "Ascending";
    readonly DESCENDING: "Descending";
};
/**
 * @public
 */
export type NotebookInstanceSortOrder = (typeof NotebookInstanceSortOrder)[keyof typeof NotebookInstanceSortOrder];
/**
 * @public
 */
export interface ListNotebookInstancesInput {
    /**
     * <p> If the previous call to the <code>ListNotebookInstances</code> is truncated, the response includes a <code>NextToken</code>. You can use this token in your subsequent <code>ListNotebookInstances</code> request to fetch the next set of notebook instances. </p> <note> <p>You might specify a filter or a sort order in your request. When response is truncated, you must use the same values for the filer and sort order in the next request. </p> </note>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of notebook instances to return.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>The field to sort results by. The default is <code>Name</code>.</p>
     * @public
     */
    SortBy?: NotebookInstanceSortKey | undefined;
    /**
     * <p>The sort order for results. </p>
     * @public
     */
    SortOrder?: NotebookInstanceSortOrder | undefined;
    /**
     * <p>A string in the notebook instances' name. This filter returns only notebook instances whose name contains the specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>A filter that returns only notebook instances that were created before the specified time (timestamp). </p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns only notebook instances that were created after the specified time (timestamp).</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only notebook instances that were modified before the specified time (timestamp).</p>
     * @public
     */
    LastModifiedTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns only notebook instances that were modified after the specified time (timestamp).</p>
     * @public
     */
    LastModifiedTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only notebook instances with the specified status.</p>
     * @public
     */
    StatusEquals?: NotebookInstanceStatus | undefined;
    /**
     * <p>A string in the name of a notebook instances lifecycle configuration associated with this notebook instance. This filter returns only notebook instances associated with a lifecycle configuration with a name that contains the specified string.</p>
     * @public
     */
    NotebookInstanceLifecycleConfigNameContains?: string | undefined;
    /**
     * <p>A string in the name or URL of a Git repository associated with this notebook instance. This filter returns only notebook instances associated with a git repository with a name that contains the specified string.</p>
     * @public
     */
    DefaultCodeRepositoryContains?: string | undefined;
    /**
     * <p>A filter that returns only notebook instances with associated with the specified git repository.</p>
     * @public
     */
    AdditionalCodeRepositoryEquals?: string | undefined;
}
/**
 * <p>Provides summary information for an SageMaker AI notebook instance.</p>
 * @public
 */
export interface NotebookInstanceSummary {
    /**
     * <p>The name of the notebook instance that you want a summary for.</p>
     * @public
     */
    NotebookInstanceName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the notebook instance.</p>
     * @public
     */
    NotebookInstanceArn: string | undefined;
    /**
     * <p>The status of the notebook instance.</p>
     * @public
     */
    NotebookInstanceStatus?: NotebookInstanceStatus | undefined;
    /**
     * <p>The URL that you use to connect to the Jupyter notebook running in your notebook instance. </p>
     * @public
     */
    Url?: string | undefined;
    /**
     * <p>The type of ML compute instance that the notebook instance is running on.</p>
     * @public
     */
    InstanceType?: _InstanceType | undefined;
    /**
     * <p>A timestamp that shows when the notebook instance was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>A timestamp that shows when the notebook instance was last modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>The name of a notebook instance lifecycle configuration associated with this notebook instance.</p> <p>For information about notebook instance lifestyle configurations, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/notebook-lifecycle-config.html">Step 2.1: (Optional) Customize a Notebook Instance</a>.</p>
     * @public
     */
    NotebookInstanceLifecycleConfigName?: string | undefined;
    /**
     * <p>The Git repository associated with the notebook instance as its default code repository. This can be either the name of a Git repository stored as a resource in your account, or the URL of a Git repository in <a href="https://docs.aws.amazon.com/codecommit/latest/userguide/welcome.html">Amazon Web Services CodeCommit</a> or in any other Git repository. When you open a notebook instance, it opens in the directory that contains this repository. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/nbi-git-repo.html">Associating Git Repositories with SageMaker AI Notebook Instances</a>.</p>
     * @public
     */
    DefaultCodeRepository?: string | undefined;
    /**
     * <p>An array of up to three Git repositories associated with the notebook instance. These can be either the names of Git repositories stored as resources in your account, or the URL of Git repositories in <a href="https://docs.aws.amazon.com/codecommit/latest/userguide/welcome.html">Amazon Web Services CodeCommit</a> or in any other Git repository. These repositories are cloned at the same level as the default repository of your notebook instance. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/nbi-git-repo.html">Associating Git Repositories with SageMaker AI Notebook Instances</a>.</p>
     * @public
     */
    AdditionalCodeRepositories?: string[] | undefined;
}
/**
 * @public
 */
export interface ListNotebookInstancesOutput {
    /**
     * <p>If the response to the previous <code>ListNotebookInstances</code> request was truncated, SageMaker AI returns this token. To retrieve the next set of notebook instances, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>An array of <code>NotebookInstanceSummary</code> objects, one for each notebook instance.</p>
     * @public
     */
    NotebookInstances?: NotebookInstanceSummary[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ListOptimizationJobsSortBy: {
    readonly CREATION_TIME: "CreationTime";
    readonly NAME: "Name";
    readonly STATUS: "Status";
};
/**
 * @public
 */
export type ListOptimizationJobsSortBy = (typeof ListOptimizationJobsSortBy)[keyof typeof ListOptimizationJobsSortBy];
/**
 * @public
 */
export interface ListOptimizationJobsRequest {
    /**
     * <p>A token that you use to get the next set of results following a truncated response. If the response to the previous request was truncated, that response provides the value for this token.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of optimization jobs to return in the response. The default is 50.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>Filters the results to only those optimization jobs that were created after the specified time.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>Filters the results to only those optimization jobs that were created before the specified time.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>Filters the results to only those optimization jobs that were updated after the specified time.</p>
     * @public
     */
    LastModifiedTimeAfter?: Date | undefined;
    /**
     * <p>Filters the results to only those optimization jobs that were updated before the specified time.</p>
     * @public
     */
    LastModifiedTimeBefore?: Date | undefined;
    /**
     * <p>Filters the results to only those optimization jobs that apply the specified optimization techniques. You can specify either <code>Quantization</code> or <code>Compilation</code>.</p>
     * @public
     */
    OptimizationContains?: string | undefined;
    /**
     * <p>Filters the results to only those optimization jobs with a name that contains the specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>Filters the results to only those optimization jobs with the specified status.</p>
     * @public
     */
    StatusEquals?: OptimizationJobStatus | undefined;
    /**
     * <p>The field by which to sort the optimization jobs in the response. The default is <code>CreationTime</code> </p>
     * @public
     */
    SortBy?: ListOptimizationJobsSortBy | undefined;
    /**
     * <p>The sort order for results. The default is <code>Ascending</code> </p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
}
/**
 * <p>Summarizes an optimization job by providing some of its key properties.</p>
 * @public
 */
export interface OptimizationJobSummary {
    /**
     * <p>The name that you assigned to the optimization job.</p>
     * @public
     */
    OptimizationJobName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the optimization job.</p>
     * @public
     */
    OptimizationJobArn: string | undefined;
    /**
     * <p>The time when you created the optimization job.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The current status of the optimization job.</p>
     * @public
     */
    OptimizationJobStatus: OptimizationJobStatus | undefined;
    /**
     * <p>The time when the optimization job started.</p>
     * @public
     */
    OptimizationStartTime?: Date | undefined;
    /**
     * <p>The time when the optimization job finished processing.</p>
     * @public
     */
    OptimizationEndTime?: Date | undefined;
    /**
     * <p>The time when the optimization job was last updated.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>The type of instance that hosts the optimized model that you create with the optimization job.</p>
     * @public
     */
    DeploymentInstanceType: OptimizationJobDeploymentInstanceType | undefined;
    /**
     * <p>The optimization techniques that are applied by the optimization job.</p>
     * @public
     */
    OptimizationTypes: string[] | undefined;
}
/**
 * @public
 */
export interface ListOptimizationJobsResponse {
    /**
     * <p>A list of optimization jobs and their properties that matches any of the filters you specified in the request.</p>
     * @public
     */
    OptimizationJobSummaries: OptimizationJobSummary[] | undefined;
    /**
     * <p>The token to use in a subsequent request to get the next set of results following a truncated response.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListPartnerAppsRequest {
    /**
     * <p>This parameter defines the maximum number of results that can be returned in a single response. The <code>MaxResults</code> parameter is an upper bound, not a target. If there are more results available than the value specified, a <code>NextToken</code> is provided in the response. The <code>NextToken</code> indicates that the user should get the next set of results by providing this token as a part of a subsequent call. The default value for <code>MaxResults</code> is 10.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>If the previous response was truncated, you will receive this token. Use it in your next request to receive the next set of results.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * <p>A subset of information related to a SageMaker Partner AI App. This information is used as part of the <code>ListPartnerApps</code> API response.</p>
 * @public
 */
export interface PartnerAppSummary {
    /**
     * <p>The ARN of the SageMaker Partner AI App.</p>
     * @public
     */
    Arn?: string | undefined;
    /**
     * <p>The name of the SageMaker Partner AI App.</p>
     * @public
     */
    Name?: string | undefined;
    /**
     * <p>The type of SageMaker Partner AI App to create. Must be one of the following: <code>lakera-guard</code>, <code>comet</code>, <code>deepchecks-llm-evaluation</code>, or <code>fiddler</code>.</p>
     * @public
     */
    Type?: PartnerAppType | undefined;
    /**
     * <p>The status of the SageMaker Partner AI App.</p>
     * @public
     */
    Status?: PartnerAppStatus | undefined;
    /**
     * <p>The creation time of the SageMaker Partner AI App.</p>
     * @public
     */
    CreationTime?: Date | undefined;
}
/**
 * @public
 */
export interface ListPartnerAppsResponse {
    /**
     * <p>The information related to each of the SageMaker Partner AI Apps in an account.</p>
     * @public
     */
    Summaries?: PartnerAppSummary[] | undefined;
    /**
     * <p>If the previous response was truncated, you will receive this token. Use it in your next request to receive the next set of results.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const SortPipelineExecutionsBy: {
    readonly CREATION_TIME: "CreationTime";
    readonly PIPELINE_EXECUTION_ARN: "PipelineExecutionArn";
};
/**
 * @public
 */
export type SortPipelineExecutionsBy = (typeof SortPipelineExecutionsBy)[keyof typeof SortPipelineExecutionsBy];
/**
 * @public
 */
export interface ListPipelineExecutionsRequest {
    /**
     * <p>The name or Amazon Resource Name (ARN) of the pipeline.</p>
     * @public
     */
    PipelineName: string | undefined;
    /**
     * <p>A filter that returns the pipeline executions that were created after a specified time.</p>
     * @public
     */
    CreatedAfter?: Date | undefined;
    /**
     * <p>A filter that returns the pipeline executions that were created before a specified time.</p>
     * @public
     */
    CreatedBefore?: Date | undefined;
    /**
     * <p>The field by which to sort results. The default is <code>CreatedTime</code>.</p>
     * @public
     */
    SortBy?: SortPipelineExecutionsBy | undefined;
    /**
     * <p>The sort order for results.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>If the result of the previous <code>ListPipelineExecutions</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of pipeline executions, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of pipeline executions to return in the response.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * <p>A pipeline execution summary.</p>
 * @public
 */
export interface PipelineExecutionSummary {
    /**
     * <p>The Amazon Resource Name (ARN) of the pipeline execution.</p>
     * @public
     */
    PipelineExecutionArn?: string | undefined;
    /**
     * <p>The start time of the pipeline execution.</p>
     * @public
     */
    StartTime?: Date | undefined;
    /**
     * <p>The status of the pipeline execution.</p>
     * @public
     */
    PipelineExecutionStatus?: PipelineExecutionStatus | undefined;
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
     * <p>A message generated by SageMaker Pipelines describing why the pipeline execution failed.</p>
     * @public
     */
    PipelineExecutionFailureReason?: string | undefined;
}
/**
 * @public
 */
export interface ListPipelineExecutionsResponse {
    /**
     * <p>Contains a sorted list of pipeline execution summary objects matching the specified filters. Each run summary includes the Amazon Resource Name (ARN) of the pipeline execution, the run date, and the status. This list can be empty. </p>
     * @public
     */
    PipelineExecutionSummaries?: PipelineExecutionSummary[] | undefined;
    /**
     * <p>If the result of the previous <code>ListPipelineExecutions</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of pipeline executions, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListPipelineExecutionStepsRequest {
    /**
     * <p>The Amazon Resource Name (ARN) of the pipeline execution.</p>
     * @public
     */
    PipelineExecutionArn?: string | undefined;
    /**
     * <p>If the result of the previous <code>ListPipelineExecutionSteps</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of pipeline execution steps, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of pipeline execution steps to return in the response.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>The field by which to sort results. The default is <code>CreatedTime</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
}
/**
 * <p>Metadata for Model steps.</p>
 * @public
 */
export interface ModelStepMetadata {
    /**
     * <p>The Amazon Resource Name (ARN) of the created model.</p>
     * @public
     */
    Arn?: string | undefined;
}
/**
 * <p>Metadata for a processing job step.</p>
 * @public
 */
export interface ProcessingJobStepMetadata {
    /**
     * <p>The Amazon Resource Name (ARN) of the processing job.</p>
     * @public
     */
    Arn?: string | undefined;
}
/**
 * <p>Container for the metadata for a Quality check step. For more information, see the topic on <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/build-and-manage-steps.html#step-type-quality-check">QualityCheck step</a> in the <i>Amazon SageMaker Developer Guide</i>. </p>
 * @public
 */
export interface QualityCheckStepMetadata {
    /**
     * <p>The type of the Quality check step.</p>
     * @public
     */
    CheckType?: string | undefined;
    /**
     * <p>The Amazon S3 URI of the baseline statistics file used for the drift check.</p>
     * @public
     */
    BaselineUsedForDriftCheckStatistics?: string | undefined;
    /**
     * <p>The Amazon S3 URI of the baseline constraints file used for the drift check.</p>
     * @public
     */
    BaselineUsedForDriftCheckConstraints?: string | undefined;
    /**
     * <p>The Amazon S3 URI of the newly calculated baseline statistics file.</p>
     * @public
     */
    CalculatedBaselineStatistics?: string | undefined;
    /**
     * <p>The Amazon S3 URI of the newly calculated baseline constraints file.</p>
     * @public
     */
    CalculatedBaselineConstraints?: string | undefined;
    /**
     * <p>The model package group name.</p>
     * @public
     */
    ModelPackageGroupName?: string | undefined;
    /**
     * <p>The Amazon S3 URI of violation report if violations are detected.</p>
     * @public
     */
    ViolationReport?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the Quality check processing job that was run by this step execution.</p>
     * @public
     */
    CheckJobArn?: string | undefined;
    /**
     * <p>This flag indicates if the drift check against the previous baseline will be skipped or not. If it is set to <code>False</code>, the previous baseline of the configured check type must be available.</p>
     * @public
     */
    SkipCheck?: boolean | undefined;
    /**
     * <p>This flag indicates if a newly calculated baseline can be accessed through step properties <code>BaselineUsedForDriftCheckConstraints</code> and <code>BaselineUsedForDriftCheckStatistics</code>. If it is set to <code>False</code>, the previous baseline of the configured check type must also be available. These can be accessed through the <code>BaselineUsedForDriftCheckConstraints</code> and <code> BaselineUsedForDriftCheckStatistics</code> properties. </p>
     * @public
     */
    RegisterNewBaseline?: boolean | undefined;
}
/**
 * <p>Metadata for a register model job step.</p>
 * @public
 */
export interface RegisterModelStepMetadata {
    /**
     * <p>The Amazon Resource Name (ARN) of the model package.</p>
     * @public
     */
    Arn?: string | undefined;
}
/**
 * <p>Metadata for a training job step.</p>
 * @public
 */
export interface TrainingJobStepMetadata {
    /**
     * <p>The Amazon Resource Name (ARN) of the training job that was run by this step execution.</p>
     * @public
     */
    Arn?: string | undefined;
}
/**
 * <p>Metadata for a transform job step.</p>
 * @public
 */
export interface TransformJobStepMetadata {
    /**
     * <p>The Amazon Resource Name (ARN) of the transform job that was run by this step execution.</p>
     * @public
     */
    Arn?: string | undefined;
}
/**
 * <p>Metadata for a tuning step.</p>
 * @public
 */
export interface TuningJobStepMetaData {
    /**
     * <p>The Amazon Resource Name (ARN) of the tuning job that was run by this step execution.</p>
     * @public
     */
    Arn?: string | undefined;
}
/**
 * <p>Metadata for a step execution.</p>
 * @public
 */
export interface PipelineExecutionStepMetadata {
    /**
     * <p>The Amazon Resource Name (ARN) of the training job that was run by this step execution.</p>
     * @public
     */
    TrainingJob?: TrainingJobStepMetadata | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the processing job that was run by this step execution.</p>
     * @public
     */
    ProcessingJob?: ProcessingJobStepMetadata | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the transform job that was run by this step execution.</p>
     * @public
     */
    TransformJob?: TransformJobStepMetadata | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the tuning job that was run by this step execution.</p>
     * @public
     */
    TuningJob?: TuningJobStepMetaData | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the model that was created by this step execution.</p>
     * @public
     */
    Model?: ModelStepMetadata | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the model package that the model was registered to by this step execution.</p>
     * @public
     */
    RegisterModel?: RegisterModelStepMetadata | undefined;
    /**
     * <p>The outcome of the condition evaluation that was run by this step execution.</p>
     * @public
     */
    Condition?: ConditionStepMetadata | undefined;
    /**
     * <p>The URL of the Amazon SQS queue used by this step execution, the pipeline generated token, and a list of output parameters.</p>
     * @public
     */
    Callback?: CallbackStepMetadata | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the Lambda function that was run by this step execution and a list of output parameters.</p>
     * @public
     */
    Lambda?: LambdaStepMetadata | undefined;
    /**
     * <p>The configurations and outcomes of an Amazon EMR step execution.</p>
     * @public
     */
    EMR?: EMRStepMetadata | undefined;
    /**
     * <p>The configurations and outcomes of the check step execution. This includes: </p> <ul> <li> <p>The type of the check conducted.</p> </li> <li> <p>The Amazon S3 URIs of baseline constraints and statistics files to be used for the drift check.</p> </li> <li> <p>The Amazon S3 URIs of newly calculated baseline constraints and statistics.</p> </li> <li> <p>The model package group name provided.</p> </li> <li> <p>The Amazon S3 URI of the violation report if violations detected.</p> </li> <li> <p>The Amazon Resource Name (ARN) of check processing job initiated by the step execution.</p> </li> <li> <p>The Boolean flags indicating if the drift check is skipped.</p> </li> <li> <p>If step property <code>BaselineUsedForDriftCheck</code> is set the same as <code>CalculatedBaseline</code>.</p> </li> </ul>
     * @public
     */
    QualityCheck?: QualityCheckStepMetadata | undefined;
    /**
     * <p>Container for the metadata for a Clarify check step. The configurations and outcomes of the check step execution. This includes: </p> <ul> <li> <p>The type of the check conducted,</p> </li> <li> <p>The Amazon S3 URIs of baseline constraints and statistics files to be used for the drift check.</p> </li> <li> <p>The Amazon S3 URIs of newly calculated baseline constraints and statistics.</p> </li> <li> <p>The model package group name provided.</p> </li> <li> <p>The Amazon S3 URI of the violation report if violations detected.</p> </li> <li> <p>The Amazon Resource Name (ARN) of check processing job initiated by the step execution.</p> </li> <li> <p>The boolean flags indicating if the drift check is skipped.</p> </li> <li> <p>If step property <code>BaselineUsedForDriftCheck</code> is set the same as <code>CalculatedBaseline</code>.</p> </li> </ul>
     * @public
     */
    ClarifyCheck?: ClarifyCheckStepMetadata | undefined;
    /**
     * <p>The configurations and outcomes of a Fail step execution.</p>
     * @public
     */
    Fail?: FailStepMetadata | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the AutoML job that was run by this step.</p>
     * @public
     */
    AutoMLJob?: AutoMLJobStepMetadata | undefined;
    /**
     * <p>The endpoint that was invoked during this step execution.</p>
     * @public
     */
    Endpoint?: EndpointStepMetadata | undefined;
    /**
     * <p>The endpoint configuration used to create an endpoint during this step execution.</p>
     * @public
     */
    EndpointConfig?: EndpointConfigStepMetadata | undefined;
}
/**
 * <p>The ARN from an execution of the current pipeline.</p>
 * @public
 */
export interface SelectiveExecutionResult {
    /**
     * <p>The ARN from an execution of the current pipeline.</p>
     * @public
     */
    SourcePipelineExecutionArn?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const StepStatus: {
    readonly EXECUTING: "Executing";
    readonly FAILED: "Failed";
    readonly STARTING: "Starting";
    readonly STOPPED: "Stopped";
    readonly STOPPING: "Stopping";
    readonly SUCCEEDED: "Succeeded";
};
/**
 * @public
 */
export type StepStatus = (typeof StepStatus)[keyof typeof StepStatus];
/**
 * <p>An execution of a step in a pipeline.</p>
 * @public
 */
export interface PipelineExecutionStep {
    /**
     * <p>The name of the step that is executed.</p>
     * @public
     */
    StepName?: string | undefined;
    /**
     * <p>The display name of the step.</p>
     * @public
     */
    StepDisplayName?: string | undefined;
    /**
     * <p>The description of the step.</p>
     * @public
     */
    StepDescription?: string | undefined;
    /**
     * <p>The time that the step started executing.</p>
     * @public
     */
    StartTime?: Date | undefined;
    /**
     * <p>The time that the step stopped executing.</p>
     * @public
     */
    EndTime?: Date | undefined;
    /**
     * <p>The status of the step execution.</p>
     * @public
     */
    StepStatus?: StepStatus | undefined;
    /**
     * <p>If this pipeline execution step was cached, details on the cache hit.</p>
     * @public
     */
    CacheHitResult?: CacheHitResult | undefined;
    /**
     * <p>The reason why the step failed execution. This is only returned if the step failed its execution.</p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>Metadata to run the pipeline step.</p>
     * @public
     */
    Metadata?: PipelineExecutionStepMetadata | undefined;
    /**
     * <p>The current attempt of the execution step. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/pipelines-retry-policy.html">Retry Policy for SageMaker Pipelines steps</a>.</p>
     * @public
     */
    AttemptCount?: number | undefined;
    /**
     * <p>The ARN from an execution of the current pipeline from which results are reused for this step.</p>
     * @public
     */
    SelectiveExecutionResult?: SelectiveExecutionResult | undefined;
}
/**
 * @public
 */
export interface ListPipelineExecutionStepsResponse {
    /**
     * <p>A list of <code>PipeLineExecutionStep</code> objects. Each <code>PipeLineExecutionStep</code> consists of StepName, StartTime, EndTime, StepStatus, and Metadata. Metadata is an object with properties for each job that contains relevant information about the job created by the step.</p>
     * @public
     */
    PipelineExecutionSteps?: PipelineExecutionStep[] | undefined;
    /**
     * <p>If the result of the previous <code>ListPipelineExecutionSteps</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of pipeline execution steps, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListPipelineParametersForExecutionRequest {
    /**
     * <p>The Amazon Resource Name (ARN) of the pipeline execution.</p>
     * @public
     */
    PipelineExecutionArn: string | undefined;
    /**
     * <p>If the result of the previous <code>ListPipelineParametersForExecution</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of parameters, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of parameters to return in the response.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * <p>Assigns a value to a named Pipeline parameter.</p>
 * @public
 */
export interface Parameter {
    /**
     * <p>The name of the parameter to assign a value to. This parameter name must match a named parameter in the pipeline definition.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>The literal value for the parameter.</p>
     * @public
     */
    Value: string | undefined;
}
/**
 * @public
 */
export interface ListPipelineParametersForExecutionResponse {
    /**
     * <p>Contains a list of pipeline parameters. This list can be empty. </p>
     * @public
     */
    PipelineParameters?: Parameter[] | undefined;
    /**
     * <p>If the result of the previous <code>ListPipelineParametersForExecution</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of parameters, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const SortPipelinesBy: {
    readonly CREATION_TIME: "CreationTime";
    readonly NAME: "Name";
};
/**
 * @public
 */
export type SortPipelinesBy = (typeof SortPipelinesBy)[keyof typeof SortPipelinesBy];
/**
 * @public
 */
export interface ListPipelinesRequest {
    /**
     * <p>The prefix of the pipeline name.</p>
     * @public
     */
    PipelineNamePrefix?: string | undefined;
    /**
     * <p>A filter that returns the pipelines that were created after a specified time.</p>
     * @public
     */
    CreatedAfter?: Date | undefined;
    /**
     * <p>A filter that returns the pipelines that were created before a specified time.</p>
     * @public
     */
    CreatedBefore?: Date | undefined;
    /**
     * <p>The field by which to sort results. The default is <code>CreatedTime</code>.</p>
     * @public
     */
    SortBy?: SortPipelinesBy | undefined;
    /**
     * <p>The sort order for results.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>If the result of the previous <code>ListPipelines</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of pipelines, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of pipelines to return in the response.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * <p>A summary of a pipeline.</p>
 * @public
 */
export interface PipelineSummary {
    /**
     * <p> The Amazon Resource Name (ARN) of the pipeline.</p>
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
     * <p>The Amazon Resource Name (ARN) that the pipeline used to execute.</p>
     * @public
     */
    RoleArn?: string | undefined;
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
     * <p>The last time that a pipeline execution began.</p>
     * @public
     */
    LastExecutionTime?: Date | undefined;
}
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
 * @enum
 */
export declare const ProjectSortBy: {
    readonly CREATION_TIME: "CreationTime";
    readonly NAME: "Name";
};
/**
 * @public
 */
export type ProjectSortBy = (typeof ProjectSortBy)[keyof typeof ProjectSortBy];
/**
 * @public
 * @enum
 */
export declare const ProjectSortOrder: {
    readonly ASCENDING: "Ascending";
    readonly DESCENDING: "Descending";
};
/**
 * @public
 */
export type ProjectSortOrder = (typeof ProjectSortOrder)[keyof typeof ProjectSortOrder];
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
 * @enum
 */
export declare const ResourceCatalogSortBy: {
    readonly CREATION_TIME: "CreationTime";
};
/**
 * @public
 */
export type ResourceCatalogSortBy = (typeof ResourceCatalogSortBy)[keyof typeof ResourceCatalogSortBy];
/**
 * @public
 * @enum
 */
export declare const ResourceCatalogSortOrder: {
    readonly ASCENDING: "Ascending";
    readonly DESCENDING: "Descending";
};
/**
 * @public
 */
export type ResourceCatalogSortOrder = (typeof ResourceCatalogSortOrder)[keyof typeof ResourceCatalogSortOrder];
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
 * @enum
 */
export declare const SpaceSortKey: {
    readonly CreationTime: "CreationTime";
    readonly LastModifiedTime: "LastModifiedTime";
};
/**
 * @public
 */
export type SpaceSortKey = (typeof SpaceSortKey)[keyof typeof SpaceSortKey];
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
 * @enum
 */
export declare const StudioLifecycleConfigSortKey: {
    readonly CreationTime: "CreationTime";
    readonly LastModifiedTime: "LastModifiedTime";
    readonly Name: "Name";
};
/**
 * @public
 */
export type StudioLifecycleConfigSortKey = (typeof StudioLifecycleConfigSortKey)[keyof typeof StudioLifecycleConfigSortKey];
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
 * @enum
 */
export declare const TrainingJobSortByOptions: {
    readonly CreationTime: "CreationTime";
    readonly FinalObjectiveMetricValue: "FinalObjectiveMetricValue";
    readonly Name: "Name";
    readonly Status: "Status";
};
/**
 * @public
 */
export type TrainingJobSortByOptions = (typeof TrainingJobSortByOptions)[keyof typeof TrainingJobSortByOptions];
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
 * @public
 * @enum
 */
export declare const TrainingPlanFilterName: {
    readonly STATUS: "Status";
};
/**
 * @public
 */
export type TrainingPlanFilterName = (typeof TrainingPlanFilterName)[keyof typeof TrainingPlanFilterName];
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
 * @enum
 */
export declare const TrainingPlanSortBy: {
    readonly NAME: "TrainingPlanName";
    readonly START_TIME: "StartTime";
    readonly STATUS: "Status";
};
/**
 * @public
 */
export type TrainingPlanSortBy = (typeof TrainingPlanSortBy)[keyof typeof TrainingPlanSortBy];
/**
 * @public
 * @enum
 */
export declare const TrainingPlanSortOrder: {
    readonly ASCENDING: "Ascending";
    readonly DESCENDING: "Descending";
};
/**
 * @public
 */
export type TrainingPlanSortOrder = (typeof TrainingPlanSortOrder)[keyof typeof TrainingPlanSortOrder];
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
     * <p>The target resources (e.g., training jobs, HyperPod clusters) that can use this training plan.</p> <p>Training plans are specific to their target resource.</p> <ul> <li> <p>A training plan designed for SageMaker training jobs can only be used to schedule and run training jobs.</p> </li> <li> <p>A training plan for HyperPod clusters can be used exclusively to provide compute resources to a cluster's instance group.</p> </li> </ul>
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
 * @enum
 */
export declare const SortTrialComponentsBy: {
    readonly CREATION_TIME: "CreationTime";
    readonly NAME: "Name";
};
/**
 * @public
 */
export type SortTrialComponentsBy = (typeof SortTrialComponentsBy)[keyof typeof SortTrialComponentsBy];
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
 * @enum
 */
export declare const SortTrialsBy: {
    readonly CREATION_TIME: "CreationTime";
    readonly NAME: "Name";
};
/**
 * @public
 */
export type SortTrialsBy = (typeof SortTrialsBy)[keyof typeof SortTrialsBy];
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
 * @enum
 */
export declare const UserProfileSortKey: {
    readonly CreationTime: "CreationTime";
    readonly LastModifiedTime: "LastModifiedTime";
};
/**
 * @public
 */
export type UserProfileSortKey = (typeof UserProfileSortKey)[keyof typeof UserProfileSortKey];
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
 * @enum
 */
export declare const ListWorkforcesSortByOptions: {
    readonly CreateDate: "CreateDate";
    readonly Name: "Name";
};
/**
 * @public
 */
export type ListWorkforcesSortByOptions = (typeof ListWorkforcesSortByOptions)[keyof typeof ListWorkforcesSortByOptions];
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
 * @enum
 */
export declare const ListWorkteamsSortByOptions: {
    readonly CreateDate: "CreateDate";
    readonly Name: "Name";
};
/**
 * @public
 */
export type ListWorkteamsSortByOptions = (typeof ListWorkteamsSortByOptions)[keyof typeof ListWorkteamsSortByOptions];
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
     * <p>Information about the user who created or modified an experiment, trial, trial component, lineage group, project, or model card.</p>
     * @public
     */
    CreatedBy?: UserContext | undefined;
    /**
     * <p>The date and time that the model card was last modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>Information about the user who created or modified an experiment, trial, trial component, lineage group, project, or model card.</p>
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
     * <p>Information about the user who created or modified an experiment, trial, trial component, lineage group, project, or model card.</p>
     * @public
     */
    CreatedBy?: UserContext | undefined;
    /**
     * <p>A timestamp that indicates when the model card was last updated.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>Information about the user who created or modified an experiment, trial, trial component, lineage group, project, or model card.</p>
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
     * <p>Information about the user who created or modified an experiment, trial, trial component, lineage group, project, or model card.</p>
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
 * @public
 * @enum
 */
export declare const ModelVariantAction: {
    readonly PROMOTE: "Promote";
    readonly REMOVE: "Remove";
    readonly RETAIN: "Retain";
};
/**
 * @public
 */
export type ModelVariantAction = (typeof ModelVariantAction)[keyof typeof ModelVariantAction];
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
     * <p>Information about the user who created or modified an experiment, trial, trial component, lineage group, project, or model card.</p>
     * @public
     */
    CreatedBy?: UserContext | undefined;
    /**
     * <p>Information about the user who created or modified an experiment, trial, trial component, lineage group, project, or model card.</p>
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
     * <p>Information about the user who created or modified an experiment, trial, trial component, lineage group, project, or model card.</p>
     * @public
     */
    CreatedBy?: UserContext | undefined;
    /**
     * <p>Information about the user who created or modified an experiment, trial, trial component, lineage group, project, or model card.</p>
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
     * <p>Information about the user who created or modified an experiment, trial, trial component, lineage group, project, or model card.</p>
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
 * @public
 * @enum
 */
export declare const Relation: {
    readonly EQUAL_TO: "EqualTo";
    readonly GREATER_THAN_OR_EQUAL_TO: "GreaterThanOrEqualTo";
};
/**
 * @public
 */
export type Relation = (typeof Relation)[keyof typeof Relation];
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
 * @public
 * @enum
 */
export declare const SearchSortOrder: {
    readonly ASCENDING: "Ascending";
    readonly DESCENDING: "Descending";
};
/**
 * @public
 */
export type SearchSortOrder = (typeof SearchSortOrder)[keyof typeof SearchSortOrder];
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
     * <p>Information about the user who created or modified an experiment, trial, trial component, lineage group, project, or model card.</p>
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
     * <p>Information about the user who created or modified an experiment, trial, trial component, lineage group, project, or model card.</p>
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
     * <p>Information about the user who created or modified an experiment, trial, trial component, lineage group, project, or model card.</p>
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
    DurationHours: number | undefined;
    /**
     * <p>The target resources (e.g., SageMaker Training Jobs, SageMaker HyperPod) to search for in the offerings.</p> <p>Training plans are specific to their target resource.</p> <ul> <li> <p>A training plan designed for SageMaker training jobs can only be used to schedule and run training jobs.</p> </li> <li> <p>A training plan for HyperPod clusters can be used exclusively to provide compute resources to a cluster's instance group.</p> </li> </ul>
     * @public
     */
    TargetResources: SageMakerResourceName[] | undefined;
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
     * <p>The target resources (e.g., SageMaker Training Jobs, SageMaker HyperPod) for this training plan offering.</p> <p>Training plans are specific to their target resource.</p> <ul> <li> <p>A training plan designed for SageMaker training jobs can only be used to schedule and run training jobs.</p> </li> <li> <p>A training plan for HyperPod clusters can be used exclusively to provide compute resources to a cluster's instance group.</p> </li> </ul>
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
 * @internal
 */
export declare const ModelCardFilterSensitiveLog: (obj: ModelCard) => any;
/**
 * @internal
 */
export declare const ModelPackageFilterSensitiveLog: (obj: ModelPackage) => any;
/**
 * @internal
 */
export declare const SearchRecordFilterSensitiveLog: (obj: SearchRecord) => any;
/**
 * @internal
 */
export declare const SearchResponseFilterSensitiveLog: (obj: SearchResponse) => any;
