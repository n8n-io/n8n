import { ActionStatus, ActivationState, AdditionalInferenceSpecificationDefinition, AppNetworkAccessType, AppSecurityGroupManagement, BooleanOperator, ClusterInstanceGroupSpecification, ClusterNodeRecovery, CodeEditorAppImageConfig, ComputeQuotaConfig, ComputeQuotaTarget, DeploymentConfiguration, InferenceSpecification, JupyterLabAppImageConfig, KernelGatewayImageConfig, ModelApprovalStatus, Tag } from "./models_0";
import { _InstanceType, DefaultSpaceSettings, DeploymentConfig, EdgeOutputConfig, FeatureDefinition, InferenceComponentRuntimeConfig, InferenceComponentSpecification, InferenceExperimentDataStorageConfig, InferenceExperimentSchedule, JobType, ModelCardStatus, ModelLifeCycle, ModelPackageModelCard, ModelVariantConfig, Processor, SchedulerConfig, ShadowModeConfig, TagPropagation, ThroughputMode, TrackingServerSize, UserSettings, VendorGuidance } from "./models_1";
import { CrossAccountFilterOption, FeatureParameter, HubContentType, InstanceMetadataServiceConfiguration, MemberDefinition, MonitoringScheduleConfig, NotebookInstanceAcceleratorType, NotebookInstanceLifecycleHook, NotificationConfiguration, OidcConfig, ParallelismConfiguration, PartnerAppConfig, PartnerAppMaintenanceConfig, PipelineDefinitionS3Location, ProfilerRuleConfiguration, ProvisioningParameter, RootAccess, SourceIpConfig, SpaceSettings, TrialComponentArtifact, TrialComponentParameterValue, TrialComponentStatus, WorkerAccessConfiguration, WorkforceVpcConfigRequest } from "./models_2";
import { DesiredWeightAndCapacity, Device, DomainSettingsForUpdate, Filter, GitConfigForUpdate, HubContentSupportStatus, InferenceComponentDeploymentConfig, ResourceType, Workforce, Workteam } from "./models_3";
import { NestedFilters, OnlineStoreConfigUpdate, ProfilerConfigForUpdate, RemoteDebugConfigForUpdate, ResourceConfigForUpdate, SearchSortOrder, VisibilityConditions } from "./models_4";
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
    InstanceGroups: ClusterInstanceGroupSpecification[] | undefined;
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
 * @public
 * @enum
 */
export declare const VariantPropertyType: {
    readonly DataCaptureConfig: "DataCaptureConfig";
    readonly DesiredInstanceCount: "DesiredInstanceCount";
    readonly DesiredWeight: "DesiredWeight";
};
/**
 * @public
 */
export type VariantPropertyType = (typeof VariantPropertyType)[keyof typeof VariantPropertyType];
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
/**
 * @internal
 */
export declare const UpdateModelCardRequestFilterSensitiveLog: (obj: UpdateModelCardRequest) => any;
/**
 * @internal
 */
export declare const UpdateModelPackageInputFilterSensitiveLog: (obj: UpdateModelPackageInput) => any;
/**
 * @internal
 */
export declare const UpdateWorkforceRequestFilterSensitiveLog: (obj: UpdateWorkforceRequest) => any;
