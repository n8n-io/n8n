import { _InstanceType, AccountDefaultStatus, AlgorithmSortBy, AppImageConfigSortKey, AppSortKey, AssociationEdgeType, AutoMLJobStatus, AutoMLSortBy, AutoMLSortOrder, BatchStrategy, CandidateSortBy, CandidateStatus, ClusterEventResourceType, ClusterSortBy, CodeRepositorySortBy, CodeRepositorySortOrder, CompilationJobStatus, CrossAccountFilterOption, DeviceDeploymentStatus, DomainStatus, EdgePackagingJobStatus, EndpointConfigSortKey, EndpointSortKey, EndpointStatus, EventSortBy, ExecutionRoleIdentityConfig, ExecutionStatus, FeatureGroupSortBy, FeatureGroupSortOrder, FeatureGroupStatus, FeatureType, FlowDefinitionStatus, HubContentSortBy, HubContentStatus, HubContentSupportStatus, HubContentType, HubSortBy, HubStatus, HyperParameterTuningJobSortByOptions, HyperParameterTuningJobStatus, HyperParameterTuningJobStrategyType, ImageSortBy, ImageSortOrder, ImageStatus, ImageVersionSortBy, ImageVersionSortOrder, ImageVersionStatus, InferenceComponentSortKey, InferenceComponentStatus, InferenceExperimentStatus, InferenceExperimentType, IPAddressType, IsTrackingServerActive, LabelingJobStatus, ListCompilationJobsSortBy, ListDeviceFleetsSortBy, ListEdgeDeploymentPlansSortBy, ListEdgePackagingJobsSortBy, ListInferenceRecommendationsJobsSortBy, ListLabelingJobsForWorkteamSortByOptions, ListOptimizationJobsSortBy, MlflowAppStatus, ModelApprovalStatus, ModelCardExportJobSortBy, ModelCardExportJobSortOrder, ModelCardExportJobStatus, ModelCardSortBy, ModelCardSortOrder, ModelCardStatus, ModelCardVersionSortBy, ModelMetadataFilterType, ModelPackageGroupSortBy, ModelPackageGroupStatus, ModelPackageRegistrationType, ModelPackageSortBy, ModelPackageStatus, ModelPackageType, ModelSortKey, MonitoringAlertHistorySortKey, MonitoringAlertStatus, MonitoringExecutionSortKey, MonitoringJobDefinitionSortKey, MonitoringScheduleSortKey, MonitoringType, NotebookInstanceLifecycleConfigSortKey, NotebookInstanceLifecycleConfigSortOrder, NotebookInstanceSortKey, NotebookInstanceSortOrder, NotebookInstanceStatus, OfflineStoreStatusValue, Operator, OptimizationJobDeploymentInstanceType, OptimizationJobStatus, OrderKey, PartnerAppStatus, PartnerAppType, PipelineExecutionStatus, ProcessingJobStatus, ProfilingStatus, ProjectStatus, RecommendationJobStatus, RecommendationJobType, RecommendationStepType, ReservedCapacityInstanceType, ReservedCapacityStatus, ReservedCapacityType, ResourceType, RuleEvaluationStatus, SageMakerResourceName, SagemakerServicecatalogStatus, SchedulerResourceStatus, ScheduleStatus, SecondaryStatus, SortActionsBy, SortArtifactsBy, SortAssociationsBy, SortBy, SortClusterSchedulerConfigBy, SortContextsBy, SortExperimentsBy, SortInferenceExperimentsBy, SortLineageGroupsBy, SortMlflowAppBy, SortOrder, SortPipelineExecutionsBy, SortPipelinesBy, SortQuotaBy, SortTrackingServerBy, SpaceStatus, StepStatus, StudioLifecycleConfigAppType, TrackingServerStatus, TrainingJobStatus, TrainingPlanStatus, TransformJobStatus, UserProfileStatus, VolumeAttachmentStatus, WarmPoolResourceStatus, WorkforceIpAddressType, WorkforceStatus } from "./enums";
import { type AlgorithmSpecification, type AmazonQSettings, type AppSpecification, type AutoMLJobStepMetadata, type BatchDataCaptureConfig, type BedrockCustomModelDeploymentMetadata, type BedrockCustomModelMetadata, type BedrockModelImportMetadata, type BedrockProvisionedModelThroughputMetadata, type CacheHitResult, type CallbackStepMetadata, type CfnTemplateProviderDetail, type CheckpointConfig, type ClarifyCheckStepMetadata, type CognitoConfig, type ConditionStepMetadata, type MetadataProperties, type OutputDataConfig, type ResourceConfig, type ResourceSpec, type StoppingCondition, type TransformInput, type TransformOutput, type TransformResources, type UserContext, type VpcConfig, ActionSummary, AgentVersion, AlgorithmSummary, AppDetails, AppImageConfigDetails, ArtifactSummary, AssociationInfo, AssociationSummary, AutoMLCandidate, AutoMLJobSummary, Channel, ClusterEventSummary, ClusterNodeSummary, ClusterSchedulerConfigSummary, ClusterSummary, CodeRepositorySummary, CompilationJobSummary, ComputeQuotaSummary, ContextSummary, OutputParameter, Tag } from "./models_0";
import { type DockerSettings, type EdgeOutputConfig, type ExperimentConfig, type HyperParameterTuningJobConfig, type HyperParameterTuningJobWarmStartConfig, type InferenceExperimentSchedule, type LabelingJobInputConfig, type ModelLifeCycle, type MonitoringScheduleConfig, type NetworkConfig, type OfflineStoreConfig, type OnlineStoreConfig, type OwnershipSettings, type ParallelismConfiguration, type ProcessingOutputConfig, type ProcessingResources, type ProcessingStoppingCondition, type ResourceLimits, type RetryStrategy, type ServiceCatalogProvisioningDetails, type TrustedIdentityPropagationSettings, type UnifiedStudioSettings, type UserSettings, FeatureDefinition, HyperParameterTrainingJobDefinition, ProcessingInput } from "./models_1";
import { type DataCaptureConfigSummary, type DataProcessing, type DebugHookConfig, type EndpointOutputConfiguration, type ExperimentSource, type HyperParameterTrainingJobSummary, type HyperParameterTuningJobCompletionDetails, type HyperParameterTuningJobConsumedResources, type InferenceMetrics, type InfraCheckConfig, type LabelCounters, type LabelingJobOutput, type LastUpdateStatus, type MlflowConfig, type MLflowConfiguration, type ModelArtifacts, type ModelClientConfig, type ModelConfiguration, type ModelPackageConfig, type NotificationConfiguration, type ObjectiveStatusCounters, type OfflineStoreStatus, type PipelineExperimentConfig, type ProfilerConfig, type RecommendationMetrics, type RemoteDebugConfig, type ServerlessJobConfig, type SourceIpConfig, type SpaceSettings, type SpaceSharingSettings, type TensorBoardOutputConfig, type TrainingJobStatusCounters, type TrialComponentStatus, type WorkerAccessConfiguration, CustomizedMetricSpecification, DebugRuleConfiguration, DebugRuleEvaluationStatus, FeatureParameter, MemberDefinition, MonitoringExecutionSummary, ProductionVariantSummary, ProfilerRuleConfiguration, SelectedStep, TrialComponentArtifact, TrialComponentParameterValue } from "./models_2";
/**
 * <p>The selective execution configuration applied to the pipeline run.</p>
 * @public
 */
export interface SelectiveExecutionConfig {
    /**
     * <p>The ARN from a reference execution of the current pipeline. Used to copy input collaterals needed for the selected steps to run. The execution status of the pipeline can be either <code>Failed</code> or <code>Success</code>.</p> <p>This field is required if the steps you specify for <code>SelectedSteps</code> depend on output collaterals from any non-specified pipeline steps. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/pipelines-selective-ex.html">Selective Execution for Pipeline Steps</a>.</p>
     * @public
     */
    SourcePipelineExecutionArn?: string | undefined;
    /**
     * <p>A list of pipeline steps to run. All step(s) in all path(s) between two selected steps should be included.</p>
     * @public
     */
    SelectedSteps: SelectedStep[] | undefined;
}
/**
 * @public
 */
export interface DescribePipelineExecutionResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the pipeline.</p>
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
     * <p>The time when the pipeline execution was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>The time when the pipeline execution was modified last.</p>
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
     * <p>The parallelism configuration applied to the pipeline.</p>
     * @public
     */
    ParallelismConfiguration?: ParallelismConfiguration | undefined;
    /**
     * <p>The selective execution configuration applied to the pipeline run.</p>
     * @public
     */
    SelectiveExecutionConfig?: SelectiveExecutionConfig | undefined;
    /**
     * <p>The ID of the pipeline version.</p>
     * @public
     */
    PipelineVersionId?: number | undefined;
    /**
     * <p> The MLflow configuration of the pipeline execution. </p>
     * @public
     */
    MLflowConfig?: MLflowConfiguration | undefined;
}
/**
 * @public
 */
export interface DescribeProcessingJobRequest {
    /**
     * <p>The name of the processing job. The name must be unique within an Amazon Web Services Region in the Amazon Web Services account.</p>
     * @public
     */
    ProcessingJobName: string | undefined;
}
/**
 * @public
 */
export interface DescribeProcessingJobResponse {
    /**
     * <p>The inputs for a processing job.</p>
     * @public
     */
    ProcessingInputs?: ProcessingInput[] | undefined;
    /**
     * <p>Output configuration for the processing job.</p>
     * @public
     */
    ProcessingOutputConfig?: ProcessingOutputConfig | undefined;
    /**
     * <p>The name of the processing job. The name must be unique within an Amazon Web Services Region in the Amazon Web Services account.</p>
     * @public
     */
    ProcessingJobName: string | undefined;
    /**
     * <p>Identifies the resources, ML compute instances, and ML storage volumes to deploy for a processing job. In distributed training, you specify more than one instance.</p>
     * @public
     */
    ProcessingResources: ProcessingResources | undefined;
    /**
     * <p>The time limit for how long the processing job is allowed to run.</p>
     * @public
     */
    StoppingCondition?: ProcessingStoppingCondition | undefined;
    /**
     * <p>Configures the processing job to run a specified container image.</p>
     * @public
     */
    AppSpecification: AppSpecification | undefined;
    /**
     * <p>The environment variables set in the Docker container.</p>
     * @public
     */
    Environment?: Record<string, string> | undefined;
    /**
     * <p>Networking options for a processing job.</p>
     * @public
     */
    NetworkConfig?: NetworkConfig | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an IAM role that Amazon SageMaker can assume to perform tasks on your behalf.</p>
     * @public
     */
    RoleArn?: string | undefined;
    /**
     * <p>The configuration information used to create an experiment.</p>
     * @public
     */
    ExperimentConfig?: ExperimentConfig | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the processing job.</p>
     * @public
     */
    ProcessingJobArn: string | undefined;
    /**
     * <p>Provides the status of a processing job.</p>
     * @public
     */
    ProcessingJobStatus: ProcessingJobStatus | undefined;
    /**
     * <p>An optional string, up to one KB in size, that contains metadata from the processing container when the processing job exits.</p>
     * @public
     */
    ExitMessage?: string | undefined;
    /**
     * <p>A string, up to one KB in size, that contains the reason a processing job failed, if it failed.</p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>The time at which the processing job completed.</p>
     * @public
     */
    ProcessingEndTime?: Date | undefined;
    /**
     * <p>The time at which the processing job started.</p>
     * @public
     */
    ProcessingStartTime?: Date | undefined;
    /**
     * <p>The time at which the processing job was last modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>The time at which the processing job was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The ARN of a monitoring schedule for an endpoint associated with this processing job.</p>
     * @public
     */
    MonitoringScheduleArn?: string | undefined;
    /**
     * <p>The ARN of an AutoML job associated with this processing job.</p>
     * @public
     */
    AutoMLJobArn?: string | undefined;
    /**
     * <p>The ARN of a training job associated with this processing job.</p>
     * @public
     */
    TrainingJobArn?: string | undefined;
}
/**
 * @public
 */
export interface DescribeProjectInput {
    /**
     * <p>The name of the project to describe.</p>
     * @public
     */
    ProjectName: string | undefined;
}
/**
 * <p>Details of a provisioned service catalog product. For information about service catalog, see <a href="https://docs.aws.amazon.com/servicecatalog/latest/adminguide/introduction.html">What is Amazon Web Services Service Catalog</a>.</p>
 * @public
 */
export interface ServiceCatalogProvisionedProductDetails {
    /**
     * <p>The ID of the provisioned product.</p>
     * @public
     */
    ProvisionedProductId?: string | undefined;
    /**
     * <p>The current status of the product.</p> <ul> <li> <p> <code>AVAILABLE</code> - Stable state, ready to perform any operation. The most recent operation succeeded and completed.</p> </li> <li> <p> <code>UNDER_CHANGE</code> - Transitive state. Operations performed might not have valid results. Wait for an AVAILABLE status before performing operations.</p> </li> <li> <p> <code>TAINTED</code> - Stable state, ready to perform any operation. The stack has completed the requested operation but is not exactly what was requested. For example, a request to update to a new version failed and the stack rolled back to the current version.</p> </li> <li> <p> <code>ERROR</code> - An unexpected error occurred. The provisioned product exists but the stack is not running. For example, CloudFormation received a parameter value that was not valid and could not launch the stack.</p> </li> <li> <p> <code>PLAN_IN_PROGRESS</code> - Transitive state. The plan operations were performed to provision a new product, but resources have not yet been created. After reviewing the list of resources to be created, execute the plan. Wait for an AVAILABLE status before performing operations.</p> </li> </ul>
     * @public
     */
    ProvisionedProductStatusMessage?: string | undefined;
}
/**
 * <p> Details about a template provider configuration and associated provisioning information. </p>
 * @public
 */
export interface TemplateProviderDetail {
    /**
     * <p> Details about a CloudFormation template provider configuration and associated provisioning information. </p>
     * @public
     */
    CfnTemplateProviderDetail?: CfnTemplateProviderDetail | undefined;
}
/**
 * @public
 */
export interface DescribeProjectOutput {
    /**
     * <p>The Amazon Resource Name (ARN) of the project.</p>
     * @public
     */
    ProjectArn: string | undefined;
    /**
     * <p>The name of the project.</p>
     * @public
     */
    ProjectName: string | undefined;
    /**
     * <p>The ID of the project.</p>
     * @public
     */
    ProjectId: string | undefined;
    /**
     * <p>The description of the project.</p>
     * @public
     */
    ProjectDescription?: string | undefined;
    /**
     * <p>Information used to provision a service catalog product. For information, see <a href="https://docs.aws.amazon.com/servicecatalog/latest/adminguide/introduction.html">What is Amazon Web Services Service Catalog</a>.</p>
     * @public
     */
    ServiceCatalogProvisioningDetails?: ServiceCatalogProvisioningDetails | undefined;
    /**
     * <p>Information about a provisioned service catalog product.</p>
     * @public
     */
    ServiceCatalogProvisionedProductDetails?: ServiceCatalogProvisionedProductDetails | undefined;
    /**
     * <p>The status of the project.</p>
     * @public
     */
    ProjectStatus: ProjectStatus | undefined;
    /**
     * <p> An array of template providers associated with the project. </p>
     * @public
     */
    TemplateProviderDetails?: TemplateProviderDetail[] | undefined;
    /**
     * <p>Information about the user who created or modified a SageMaker resource.</p>
     * @public
     */
    CreatedBy?: UserContext | undefined;
    /**
     * <p>The time when the project was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The timestamp when project was last modified.</p>
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
export interface DescribeReservedCapacityRequest {
    /**
     * <p>ARN of the reserved capacity to describe.</p>
     * @public
     */
    ReservedCapacityArn: string | undefined;
}
/**
 * <p>A summary of UltraServer resources and their current status.</p>
 * @public
 */
export interface UltraServerSummary {
    /**
     * <p>The type of UltraServer, such as ml.u-p6e-gb200x72.</p>
     * @public
     */
    UltraServerType: string | undefined;
    /**
     * <p>The Amazon EC2 instance type used in the UltraServer.</p>
     * @public
     */
    InstanceType: ReservedCapacityInstanceType | undefined;
    /**
     * <p>The number of UltraServers of this type.</p>
     * @public
     */
    UltraServerCount?: number | undefined;
    /**
     * <p>The number of available spare instances in the UltraServers.</p>
     * @public
     */
    AvailableSpareInstanceCount?: number | undefined;
    /**
     * <p>The total number of instances across all UltraServers of this type that are currently in an unhealthy state.</p>
     * @public
     */
    UnhealthyInstanceCount?: number | undefined;
}
/**
 * @public
 */
export interface DescribeReservedCapacityResponse {
    /**
     * <p>ARN of the reserved capacity.</p>
     * @public
     */
    ReservedCapacityArn: string | undefined;
    /**
     * <p>The type of reserved capacity.</p>
     * @public
     */
    ReservedCapacityType?: ReservedCapacityType | undefined;
    /**
     * <p>The current status of the reserved capacity.</p>
     * @public
     */
    Status?: ReservedCapacityStatus | undefined;
    /**
     * <p>The Availability Zone where the reserved capacity is provisioned.</p>
     * @public
     */
    AvailabilityZone?: string | undefined;
    /**
     * <p>The total duration of the reserved capacity in hours.</p>
     * @public
     */
    DurationHours?: number | undefined;
    /**
     * <p>The number of minutes for the duration of the reserved capacity. For example, if a reserved capacity starts at 08:55 and ends at 11:30, the minutes field would be 35.</p>
     * @public
     */
    DurationMinutes?: number | undefined;
    /**
     * <p>The timestamp when the reserved capacity becomes active.</p>
     * @public
     */
    StartTime?: Date | undefined;
    /**
     * <p>The timestamp when the reserved capacity expires.</p>
     * @public
     */
    EndTime?: Date | undefined;
    /**
     * <p>The Amazon EC2 instance type used in the reserved capacity.</p>
     * @public
     */
    InstanceType: ReservedCapacityInstanceType | undefined;
    /**
     * <p>The total number of instances allocated to this reserved capacity.</p>
     * @public
     */
    TotalInstanceCount: number | undefined;
    /**
     * <p>The number of instances currently available for use in this reserved capacity.</p>
     * @public
     */
    AvailableInstanceCount?: number | undefined;
    /**
     * <p>The number of instances currently in use from this reserved capacity.</p>
     * @public
     */
    InUseInstanceCount?: number | undefined;
    /**
     * <p>A summary of the UltraServer associated with this reserved capacity.</p>
     * @public
     */
    UltraServerSummary?: UltraServerSummary | undefined;
}
/**
 * @public
 */
export interface DescribeSpaceRequest {
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
}
/**
 * @public
 */
export interface DescribeSpaceResponse {
    /**
     * <p>The ID of the associated domain.</p>
     * @public
     */
    DomainId?: string | undefined;
    /**
     * <p>The space's Amazon Resource Name (ARN).</p>
     * @public
     */
    SpaceArn?: string | undefined;
    /**
     * <p>The name of the space.</p>
     * @public
     */
    SpaceName?: string | undefined;
    /**
     * <p>The ID of the space's profile in the Amazon EFS volume.</p>
     * @public
     */
    HomeEfsFileSystemUid?: string | undefined;
    /**
     * <p>The status.</p>
     * @public
     */
    Status?: SpaceStatus | undefined;
    /**
     * <p>The last modified time.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>The creation time.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>The failure reason.</p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>A collection of space settings.</p>
     * @public
     */
    SpaceSettings?: SpaceSettings | undefined;
    /**
     * <p>The collection of ownership settings for a space.</p>
     * @public
     */
    OwnershipSettings?: OwnershipSettings | undefined;
    /**
     * <p>The collection of space sharing settings for a space.</p>
     * @public
     */
    SpaceSharingSettings?: SpaceSharingSettings | undefined;
    /**
     * <p>The name of the space that appears in the Amazon SageMaker Studio UI.</p>
     * @public
     */
    SpaceDisplayName?: string | undefined;
    /**
     * <p>Returns the URL of the space. If the space is created with Amazon Web Services IAM Identity Center (Successor to Amazon Web Services Single Sign-On) authentication, users can navigate to the URL after appending the respective redirect parameter for the application type to be federated through Amazon Web Services IAM Identity Center.</p> <p>The following application types are supported:</p> <ul> <li> <p>Studio Classic: <code>&amp;redirect=JupyterServer</code> </p> </li> <li> <p>JupyterLab: <code>&amp;redirect=JupyterLab</code> </p> </li> <li> <p>Code Editor, based on Code-OSS, Visual Studio Code - Open Source: <code>&amp;redirect=CodeEditor</code> </p> </li> </ul>
     * @public
     */
    Url?: string | undefined;
}
/**
 * @public
 */
export interface DescribeStudioLifecycleConfigRequest {
    /**
     * <p>The name of the Amazon SageMaker AI Studio Lifecycle Configuration to describe.</p>
     * @public
     */
    StudioLifecycleConfigName: string | undefined;
}
/**
 * @public
 */
export interface DescribeStudioLifecycleConfigResponse {
    /**
     * <p>The ARN of the Lifecycle Configuration to describe.</p>
     * @public
     */
    StudioLifecycleConfigArn?: string | undefined;
    /**
     * <p>The name of the Amazon SageMaker AI Studio Lifecycle Configuration that is described.</p>
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
     * <p>The content of your Amazon SageMaker AI Studio Lifecycle Configuration script.</p>
     * @public
     */
    StudioLifecycleConfigContent?: string | undefined;
    /**
     * <p>The App type that the Lifecycle Configuration is attached to.</p>
     * @public
     */
    StudioLifecycleConfigAppType?: StudioLifecycleConfigAppType | undefined;
}
/**
 * @public
 */
export interface DescribeSubscribedWorkteamRequest {
    /**
     * <p>The Amazon Resource Name (ARN) of the subscribed work team to describe.</p>
     * @public
     */
    WorkteamArn: string | undefined;
}
/**
 * <p>Describes a work team of a vendor that does the labelling job.</p>
 * @public
 */
export interface SubscribedWorkteam {
    /**
     * <p>The Amazon Resource Name (ARN) of the vendor that you have subscribed.</p>
     * @public
     */
    WorkteamArn: string | undefined;
    /**
     * <p>The title of the service provided by the vendor in the Amazon Marketplace.</p>
     * @public
     */
    MarketplaceTitle?: string | undefined;
    /**
     * <p>The name of the vendor in the Amazon Marketplace.</p>
     * @public
     */
    SellerName?: string | undefined;
    /**
     * <p>The description of the vendor from the Amazon Marketplace.</p>
     * @public
     */
    MarketplaceDescription?: string | undefined;
    /**
     * <p>Marketplace product listing ID.</p>
     * @public
     */
    ListingId?: string | undefined;
}
/**
 * @public
 */
export interface DescribeSubscribedWorkteamResponse {
    /**
     * <p>A <code>Workteam</code> instance that contains information about the work team.</p>
     * @public
     */
    SubscribedWorkteam: SubscribedWorkteam | undefined;
}
/**
 * @public
 */
export interface DescribeTrainingJobRequest {
    /**
     * <p>The name of the training job.</p>
     * @public
     */
    TrainingJobName: string | undefined;
}
/**
 * <p>The name, value, and date and time of a metric that was emitted to Amazon CloudWatch.</p>
 * @public
 */
export interface MetricData {
    /**
     * <p>The name of the metric.</p>
     * @public
     */
    MetricName?: string | undefined;
    /**
     * <p>The value of the metric.</p>
     * @public
     */
    Value?: number | undefined;
    /**
     * <p>The date and time that the algorithm emitted the metric.</p>
     * @public
     */
    Timestamp?: Date | undefined;
}
/**
 * <p> The MLflow details of this job. </p>
 * @public
 */
export interface MlflowDetails {
    /**
     * <p> The MLflow experiment ID used for this job. </p>
     * @public
     */
    MlflowExperimentId?: string | undefined;
    /**
     * <p> The MLflow run ID used for this job. </p>
     * @public
     */
    MlflowRunId?: string | undefined;
}
/**
 * <p>Information about the status of the rule evaluation.</p>
 * @public
 */
export interface ProfilerRuleEvaluationStatus {
    /**
     * <p>The name of the rule configuration.</p>
     * @public
     */
    RuleConfigurationName?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the rule evaluation job.</p>
     * @public
     */
    RuleEvaluationJobArn?: string | undefined;
    /**
     * <p>Status of the rule evaluation.</p>
     * @public
     */
    RuleEvaluationStatus?: RuleEvaluationStatus | undefined;
    /**
     * <p>Details from the rule evaluation.</p>
     * @public
     */
    StatusDetails?: string | undefined;
    /**
     * <p>Timestamp when the rule evaluation status was last modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
}
/**
 * <p> The serverless training job progress information. </p>
 * @public
 */
export interface TrainingProgressInfo {
    /**
     * <p> The total step count per epoch. </p>
     * @public
     */
    TotalStepCountPerEpoch?: number | undefined;
    /**
     * <p> The current step number. </p>
     * @public
     */
    CurrentStep?: number | undefined;
    /**
     * <p> The current epoch number. </p>
     * @public
     */
    CurrentEpoch?: number | undefined;
    /**
     * <p> The maximum number of epochs for this job. </p>
     * @public
     */
    MaxEpoch?: number | undefined;
}
/**
 * <p>An array element of <code>SecondaryStatusTransitions</code> for <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_DescribeTrainingJob.html">DescribeTrainingJob</a>. It provides additional details about a status that the training job has transitioned through. A training job can be in one of several states, for example, starting, downloading, training, or uploading. Within each state, there are a number of intermediate states. For example, within the starting state, SageMaker could be starting the training job or launching the ML instances. These transitional states are referred to as the job's secondary status. </p> <p/>
 * @public
 */
export interface SecondaryStatusTransition {
    /**
     * <p>Contains a secondary status information from a training job.</p> <p>Status might be one of the following secondary statuses:</p> <dl> <dt>InProgress</dt> <dd> <ul> <li> <p> <code>Starting</code> - Starting the training job.</p> </li> <li> <p> <code>Downloading</code> - An optional stage for algorithms that support <code>File</code> training input mode. It indicates that data is being downloaded to the ML storage volumes.</p> </li> <li> <p> <code>Training</code> - Training is in progress.</p> </li> <li> <p> <code>Uploading</code> - Training is complete and the model artifacts are being uploaded to the S3 location.</p> </li> </ul> </dd> <dt>Completed</dt> <dd> <ul> <li> <p> <code>Completed</code> - The training job has completed.</p> </li> </ul> </dd> <dt>Failed</dt> <dd> <ul> <li> <p> <code>Failed</code> - The training job has failed. The reason for the failure is returned in the <code>FailureReason</code> field of <code>DescribeTrainingJobResponse</code>.</p> </li> </ul> </dd> <dt>Stopped</dt> <dd> <ul> <li> <p> <code>MaxRuntimeExceeded</code> - The job stopped because it exceeded the maximum allowed runtime.</p> </li> <li> <p> <code>Stopped</code> - The training job has stopped.</p> </li> </ul> </dd> <dt>Stopping</dt> <dd> <ul> <li> <p> <code>Stopping</code> - Stopping the training job.</p> </li> </ul> </dd> </dl> <p>We no longer support the following secondary statuses:</p> <ul> <li> <p> <code>LaunchingMLInstances</code> </p> </li> <li> <p> <code>PreparingTrainingStack</code> </p> </li> <li> <p> <code>DownloadingTrainingImage</code> </p> </li> </ul>
     * @public
     */
    Status: SecondaryStatus | undefined;
    /**
     * <p>A timestamp that shows when the training job transitioned to the current secondary status state.</p>
     * @public
     */
    StartTime: Date | undefined;
    /**
     * <p>A timestamp that shows when the training job transitioned out of this secondary status state into another secondary status state or when the training job has ended.</p>
     * @public
     */
    EndTime?: Date | undefined;
    /**
     * <p>A detailed description of the progress within a secondary status. </p> <p>SageMaker provides secondary statuses and status messages that apply to each of them:</p> <dl> <dt>Starting</dt> <dd> <ul> <li> <p>Starting the training job.</p> </li> <li> <p>Launching requested ML instances.</p> </li> <li> <p>Insufficient capacity error from EC2 while launching instances, retrying!</p> </li> <li> <p>Launched instance was unhealthy, replacing it!</p> </li> <li> <p>Preparing the instances for training.</p> </li> </ul> </dd> <dt>Training</dt> <dd> <ul> <li> <p>Training image download completed. Training in progress.</p> </li> </ul> </dd> </dl> <important> <p>Status messages are subject to change. Therefore, we recommend not including them in code that programmatically initiates actions. For examples, don't use status messages in if statements.</p> </important> <p>To have an overview of your training job's progress, view <code>TrainingJobStatus</code> and <code>SecondaryStatus</code> in <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_DescribeTrainingJob.html">DescribeTrainingJob</a>, and <code>StatusMessage</code> together. For example, at the start of a training job, you might see the following:</p> <ul> <li> <p> <code>TrainingJobStatus</code> - InProgress</p> </li> <li> <p> <code>SecondaryStatus</code> - Training</p> </li> <li> <p> <code>StatusMessage</code> - Downloading the training image</p> </li> </ul>
     * @public
     */
    StatusMessage?: string | undefined;
}
/**
 * <p>Status and billing information about the warm pool.</p>
 * @public
 */
export interface WarmPoolStatus {
    /**
     * <p>The status of the warm pool.</p> <ul> <li> <p> <code>InUse</code>: The warm pool is in use for the training job.</p> </li> <li> <p> <code>Available</code>: The warm pool is available to reuse for a matching training job.</p> </li> <li> <p> <code>Reused</code>: The warm pool moved to a matching training job for reuse.</p> </li> <li> <p> <code>Terminated</code>: The warm pool is no longer available. Warm pools are unavailable if they are terminated by a user, terminated for a patch update, or terminated for exceeding the specified <code>KeepAlivePeriodInSeconds</code>.</p> </li> </ul>
     * @public
     */
    Status: WarmPoolResourceStatus | undefined;
    /**
     * <p>The billable time in seconds used by the warm pool. Billable time refers to the absolute wall-clock time.</p> <p>Multiply <code>ResourceRetainedBillableTimeInSeconds</code> by the number of instances (<code>InstanceCount</code>) in your training cluster to get the total compute time SageMaker bills you if you run warm pool training. The formula is as follows: <code>ResourceRetainedBillableTimeInSeconds * InstanceCount</code>.</p>
     * @public
     */
    ResourceRetainedBillableTimeInSeconds?: number | undefined;
    /**
     * <p>The name of the matching training job that reused the warm pool.</p>
     * @public
     */
    ReusedByJob?: string | undefined;
}
/**
 * @public
 */
export interface DescribeTrainingJobResponse {
    /**
     * <p> Name of the model training job. </p>
     * @public
     */
    TrainingJobName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the training job.</p>
     * @public
     */
    TrainingJobArn: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the associated hyperparameter tuning job if the training job was launched by a hyperparameter tuning job.</p>
     * @public
     */
    TuningJobArn?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the SageMaker Ground Truth labeling job that created the transform or training job.</p>
     * @public
     */
    LabelingJobArn?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an AutoML job.</p>
     * @public
     */
    AutoMLJobArn?: string | undefined;
    /**
     * <p>Information about the Amazon S3 location that is configured for storing model artifacts. </p>
     * @public
     */
    ModelArtifacts: ModelArtifacts | undefined;
    /**
     * <p>The status of the training job.</p> <p>SageMaker provides the following training job statuses:</p> <ul> <li> <p> <code>InProgress</code> - The training is in progress.</p> </li> <li> <p> <code>Completed</code> - The training job has completed.</p> </li> <li> <p> <code>Failed</code> - The training job has failed. To see the reason for the failure, see the <code>FailureReason</code> field in the response to a <code>DescribeTrainingJobResponse</code> call.</p> </li> <li> <p> <code>Stopping</code> - The training job is stopping.</p> </li> <li> <p> <code>Stopped</code> - The training job has stopped.</p> </li> </ul> <p>For more detailed information, see <code>SecondaryStatus</code>. </p>
     * @public
     */
    TrainingJobStatus: TrainingJobStatus | undefined;
    /**
     * <p> Provides detailed information about the state of the training job. For detailed information on the secondary status of the training job, see <code>StatusMessage</code> under <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_SecondaryStatusTransition.html">SecondaryStatusTransition</a>.</p> <p>SageMaker provides primary statuses and secondary statuses that apply to each of them:</p> <dl> <dt>InProgress</dt> <dd> <ul> <li> <p> <code>Starting</code> - Starting the training job.</p> </li> <li> <p> <code>Pending</code> - The training job is waiting for compute capacity or compute resource provision.</p> </li> <li> <p> <code>Downloading</code> - An optional stage for algorithms that support <code>File</code> training input mode. It indicates that data is being downloaded to the ML storage volumes.</p> </li> <li> <p> <code>Training</code> - Training is in progress.</p> </li> <li> <p> <code>Interrupted</code> - The job stopped because the managed spot training instances were interrupted. </p> </li> <li> <p> <code>Uploading</code> - Training is complete and the model artifacts are being uploaded to the S3 location.</p> </li> </ul> </dd> <dt>Completed</dt> <dd> <ul> <li> <p> <code>Completed</code> - The training job has completed.</p> </li> </ul> </dd> <dt>Failed</dt> <dd> <ul> <li> <p> <code>Failed</code> - The training job has failed. The reason for the failure is returned in the <code>FailureReason</code> field of <code>DescribeTrainingJobResponse</code>.</p> </li> </ul> </dd> <dt>Stopped</dt> <dd> <ul> <li> <p> <code>MaxRuntimeExceeded</code> - The job stopped because it exceeded the maximum allowed runtime.</p> </li> <li> <p> <code>MaxWaitTimeExceeded</code> - The job stopped because it exceeded the maximum allowed wait time.</p> </li> <li> <p> <code>Stopped</code> - The training job has stopped.</p> </li> </ul> </dd> <dt>Stopping</dt> <dd> <ul> <li> <p> <code>Stopping</code> - Stopping the training job.</p> </li> </ul> </dd> </dl> <important> <p>Valid values for <code>SecondaryStatus</code> are subject to change. </p> </important> <p>We no longer support the following secondary statuses:</p> <ul> <li> <p> <code>LaunchingMLInstances</code> </p> </li> <li> <p> <code>PreparingTraining</code> </p> </li> <li> <p> <code>DownloadingTrainingImage</code> </p> </li> </ul>
     * @public
     */
    SecondaryStatus: SecondaryStatus | undefined;
    /**
     * <p>If the training job failed, the reason it failed. </p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>Algorithm-specific parameters. </p>
     * @public
     */
    HyperParameters?: Record<string, string> | undefined;
    /**
     * <p>Information about the algorithm used for training, and algorithm metadata. </p>
     * @public
     */
    AlgorithmSpecification?: AlgorithmSpecification | undefined;
    /**
     * <p>The Amazon Web Services Identity and Access Management (IAM) role configured for the training job. </p>
     * @public
     */
    RoleArn?: string | undefined;
    /**
     * <p>An array of <code>Channel</code> objects that describes each data input channel. </p>
     * @public
     */
    InputDataConfig?: Channel[] | undefined;
    /**
     * <p>The S3 path where model artifacts that you configured when creating the job are stored. SageMaker creates subfolders for model artifacts. </p>
     * @public
     */
    OutputDataConfig?: OutputDataConfig | undefined;
    /**
     * <p>Resources, including ML compute instances and ML storage volumes, that are configured for model training. </p>
     * @public
     */
    ResourceConfig?: ResourceConfig | undefined;
    /**
     * <p>The status of the warm pool associated with the training job.</p>
     * @public
     */
    WarmPoolStatus?: WarmPoolStatus | undefined;
    /**
     * <p>A <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_VpcConfig.html">VpcConfig</a> object that specifies the VPC that this training job has access to. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/train-vpc.html">Protect Training Jobs by Using an Amazon Virtual Private Cloud</a>.</p>
     * @public
     */
    VpcConfig?: VpcConfig | undefined;
    /**
     * <p>Specifies a limit to how long a model training job can run. It also specifies how long a managed Spot training job has to complete. When the job reaches the time limit, SageMaker ends the training job. Use this API to cap model training costs.</p> <p>To stop a job, SageMaker sends the algorithm the <code>SIGTERM</code> signal, which delays job termination for 120 seconds. Algorithms can use this 120-second window to save the model artifacts, so the results of training are not lost. </p>
     * @public
     */
    StoppingCondition: StoppingCondition | undefined;
    /**
     * <p>A timestamp that indicates when the training job was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
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
     * <p>A collection of <code>MetricData</code> objects that specify the names, values, and dates and times that the training algorithm emitted to Amazon CloudWatch.</p>
     * @public
     */
    FinalMetricDataList?: MetricData[] | undefined;
    /**
     * <p>If you want to allow inbound or outbound network calls, except for calls between peers within a training cluster for distributed training, choose <code>True</code>. If you enable network isolation for training jobs that are configured to use a VPC, SageMaker downloads and uploads customer data and model artifacts through the specified VPC, but the training container does not have network access.</p>
     * @public
     */
    EnableNetworkIsolation?: boolean | undefined;
    /**
     * <p>To encrypt all communications between ML compute instances in distributed training, choose <code>True</code>. Encryption provides greater security for distributed training, but training might take longer. How long it takes depends on the amount of communication between compute instances, especially if you use a deep learning algorithms in distributed training.</p>
     * @public
     */
    EnableInterContainerTrafficEncryption?: boolean | undefined;
    /**
     * <p>A Boolean indicating whether managed spot training is enabled (<code>True</code>) or not (<code>False</code>).</p>
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
     * <p>The billable time in seconds. Billable time refers to the absolute wall-clock time.</p> <p>Multiply <code>BillableTimeInSeconds</code> by the number of instances (<code>InstanceCount</code>) in your training cluster to get the total compute time SageMaker bills you if you run distributed training. The formula is as follows: <code>BillableTimeInSeconds * InstanceCount</code> .</p> <p>You can calculate the savings from using managed spot training using the formula <code>(1 - BillableTimeInSeconds / TrainingTimeInSeconds) * 100</code>. For example, if <code>BillableTimeInSeconds</code> is 100 and <code>TrainingTimeInSeconds</code> is 500, the savings is 80%.</p>
     * @public
     */
    BillableTimeInSeconds?: number | undefined;
    /**
     * <p> The billable token count for eligible serverless training jobs. </p>
     * @public
     */
    BillableTokenCount?: number | undefined;
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
     * <p>Configuration information for Amazon SageMaker Debugger rules for debugging output tensors.</p>
     * @public
     */
    DebugRuleConfigurations?: DebugRuleConfiguration[] | undefined;
    /**
     * <p>Configuration of storage locations for the Amazon SageMaker Debugger TensorBoard output data.</p>
     * @public
     */
    TensorBoardOutputConfig?: TensorBoardOutputConfig | undefined;
    /**
     * <p>Evaluation status of Amazon SageMaker Debugger rules for debugging on a training job.</p>
     * @public
     */
    DebugRuleEvaluationStatuses?: DebugRuleEvaluationStatus[] | undefined;
    /**
     * <p>Configuration information for Amazon SageMaker Debugger system monitoring, framework profiling, and storage paths.</p>
     * @public
     */
    ProfilerConfig?: ProfilerConfig | undefined;
    /**
     * <p>Configuration information for Amazon SageMaker Debugger rules for profiling system and framework metrics.</p>
     * @public
     */
    ProfilerRuleConfigurations?: ProfilerRuleConfiguration[] | undefined;
    /**
     * <p>Evaluation status of Amazon SageMaker Debugger rules for profiling on a training job.</p>
     * @public
     */
    ProfilerRuleEvaluationStatuses?: ProfilerRuleEvaluationStatus[] | undefined;
    /**
     * <p>Profiling status of a training job.</p>
     * @public
     */
    ProfilingStatus?: ProfilingStatus | undefined;
    /**
     * <p>The environment variables to set in the Docker container.</p> <important> <p>Do not include any security-sensitive information including account access IDs, secrets, or tokens in any environment fields. As part of the shared responsibility model, you are responsible for any potential exposure, unauthorized access, or compromise of your sensitive data if caused by security-sensitive information included in the request environment variable or plain text fields.</p> </important>
     * @public
     */
    Environment?: Record<string, string> | undefined;
    /**
     * <p>The number of times to retry the job when the job fails due to an <code>InternalServerError</code>.</p>
     * @public
     */
    RetryStrategy?: RetryStrategy | undefined;
    /**
     * <p>Configuration for remote debugging. To learn more about the remote debugging functionality of SageMaker, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/train-remote-debugging.html">Access a training container through Amazon Web Services Systems Manager (SSM) for remote debugging</a>.</p>
     * @public
     */
    RemoteDebugConfig?: RemoteDebugConfig | undefined;
    /**
     * <p>Contains information about the infrastructure health check configuration for the training job.</p>
     * @public
     */
    InfraCheckConfig?: InfraCheckConfig | undefined;
    /**
     * <p> The configuration for serverless training jobs. </p>
     * @public
     */
    ServerlessJobConfig?: ServerlessJobConfig | undefined;
    /**
     * <p> The MLflow configuration using SageMaker managed MLflow. </p>
     * @public
     */
    MlflowConfig?: MlflowConfig | undefined;
    /**
     * <p> The configuration for the model package. </p>
     * @public
     */
    ModelPackageConfig?: ModelPackageConfig | undefined;
    /**
     * <p> The MLflow details of this job. </p>
     * @public
     */
    MlflowDetails?: MlflowDetails | undefined;
    /**
     * <p> The Serverless training job progress information. </p>
     * @public
     */
    ProgressInfo?: TrainingProgressInfo | undefined;
    /**
     * <p> The Amazon Resource Name (ARN) of the output model package containing model weights or checkpoints. </p>
     * @public
     */
    OutputModelPackageArn?: string | undefined;
}
/**
 * @public
 */
export interface DescribeTrainingPlanRequest {
    /**
     * <p>The name of the training plan to describe.</p>
     * @public
     */
    TrainingPlanName: string | undefined;
}
/**
 * <p>Details of a reserved capacity for the training plan.</p> <p>For more information about how to reserve GPU capacity for your SageMaker HyperPod clusters using Amazon SageMaker Training Plan, see <code> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTrainingPlan.html">CreateTrainingPlan</a> </code>.</p>
 * @public
 */
export interface ReservedCapacitySummary {
    /**
     * <p>The Amazon Resource Name (ARN); of the reserved capacity.</p>
     * @public
     */
    ReservedCapacityArn: string | undefined;
    /**
     * <p>The type of reserved capacity.</p>
     * @public
     */
    ReservedCapacityType?: ReservedCapacityType | undefined;
    /**
     * <p>The type of UltraServer included in this reserved capacity, such as ml.u-p6e-gb200x72.</p>
     * @public
     */
    UltraServerType?: string | undefined;
    /**
     * <p>The number of UltraServers included in this reserved capacity.</p>
     * @public
     */
    UltraServerCount?: number | undefined;
    /**
     * <p>The instance type for the reserved capacity.</p>
     * @public
     */
    InstanceType: ReservedCapacityInstanceType | undefined;
    /**
     * <p>The total number of instances in the reserved capacity.</p>
     * @public
     */
    TotalInstanceCount: number | undefined;
    /**
     * <p>The current status of the reserved capacity.</p>
     * @public
     */
    Status: ReservedCapacityStatus | undefined;
    /**
     * <p>The availability zone for the reserved capacity.</p>
     * @public
     */
    AvailabilityZone?: string | undefined;
    /**
     * <p>The number of whole hours in the total duration for this reserved capacity.</p>
     * @public
     */
    DurationHours?: number | undefined;
    /**
     * <p>The additional minutes beyond whole hours in the total duration for this reserved capacity.</p>
     * @public
     */
    DurationMinutes?: number | undefined;
    /**
     * <p>The start time of the reserved capacity.</p>
     * @public
     */
    StartTime?: Date | undefined;
    /**
     * <p>The end time of the reserved capacity.</p>
     * @public
     */
    EndTime?: Date | undefined;
}
/**
 * @public
 */
export interface DescribeTrainingPlanResponse {
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
     * <p>The number of instances in the training plan that are currently in an unhealthy state.</p>
     * @public
     */
    UnhealthyInstanceCount?: number | undefined;
    /**
     * <p>The number of available spare instances in the training plan.</p>
     * @public
     */
    AvailableSpareInstanceCount?: number | undefined;
    /**
     * <p>The total number of UltraServers reserved to this training plan.</p>
     * @public
     */
    TotalUltraServerCount?: number | undefined;
    /**
     * <p>The target resources (e.g., SageMaker Training Jobs, SageMaker HyperPod, SageMaker Endpoints) that can use this training plan.</p> <p>Training plans are specific to their target resource.</p> <ul> <li> <p>A training plan designed for SageMaker training jobs can only be used to schedule and run training jobs.</p> </li> <li> <p>A training plan for HyperPod clusters can be used exclusively to provide compute resources to a cluster's instance group.</p> </li> <li> <p>A training plan for SageMaker endpoints can be used exclusively to provide compute resources to SageMaker endpoints for model deployment.</p> </li> </ul>
     * @public
     */
    TargetResources?: SageMakerResourceName[] | undefined;
    /**
     * <p>The list of Reserved Capacity providing the underlying compute resources of the plan. </p>
     * @public
     */
    ReservedCapacitySummaries?: ReservedCapacitySummary[] | undefined;
}
/**
 * @public
 */
export interface DescribeTrainingPlanExtensionHistoryRequest {
    /**
     * <p>The Amazon Resource Name (ARN); of the training plan to retrieve extension history for.</p>
     * @public
     */
    TrainingPlanArn: string | undefined;
    /**
     * <p>A token to continue pagination if more results are available.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of extensions to return in the response.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * <p>Details about an extension to a training plan, including the offering ID, dates, status, and cost information.</p>
 * @public
 */
export interface TrainingPlanExtension {
    /**
     * <p>The unique identifier of the extension offering that was used to create this extension.</p>
     * @public
     */
    TrainingPlanExtensionOfferingId: string | undefined;
    /**
     * <p>The timestamp when the extension was created.</p>
     * @public
     */
    ExtendedAt?: Date | undefined;
    /**
     * <p>The start date of the extension period.</p>
     * @public
     */
    StartDate?: Date | undefined;
    /**
     * <p>The end date of the extension period.</p>
     * @public
     */
    EndDate?: Date | undefined;
    /**
     * <p>The current status of the extension (e.g., Pending, Active, Scheduled, Failed, Expired).</p>
     * @public
     */
    Status?: string | undefined;
    /**
     * <p>The payment processing status of the extension.</p>
     * @public
     */
    PaymentStatus?: string | undefined;
    /**
     * <p>The Availability Zone of the extension.</p>
     * @public
     */
    AvailabilityZone?: string | undefined;
    /**
     * <p>The Availability Zone ID of the extension.</p>
     * @public
     */
    AvailabilityZoneId?: string | undefined;
    /**
     * <p>The duration of the extension in hours.</p>
     * @public
     */
    DurationHours?: number | undefined;
    /**
     * <p>The upfront fee for the extension.</p>
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
 * @public
 */
export interface DescribeTrainingPlanExtensionHistoryResponse {
    /**
     * <p>A list of extensions for the specified training plan.</p>
     * @public
     */
    TrainingPlanExtensions: TrainingPlanExtension[] | undefined;
    /**
     * <p>A token to continue pagination if more results are available.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface DescribeTransformJobRequest {
    /**
     * <p>The name of the transform job that you want to view details of.</p>
     * @public
     */
    TransformJobName: string | undefined;
}
/**
 * @public
 */
export interface DescribeTransformJobResponse {
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
     * <p>The status of the transform job. If the transform job failed, the reason is returned in the <code>FailureReason</code> field.</p>
     * @public
     */
    TransformJobStatus: TransformJobStatus | undefined;
    /**
     * <p>If the transform job failed, <code>FailureReason</code> describes why it failed. A transform job creates a log file, which includes error messages, and stores it as an Amazon S3 object. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/logging-cloudwatch.html">Log Amazon SageMaker Events with Amazon CloudWatch</a>.</p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>The name of the model used in the transform job.</p>
     * @public
     */
    ModelName: string | undefined;
    /**
     * <p>The maximum number of parallel requests on each instance node that can be launched in a transform job. The default value is 1.</p>
     * @public
     */
    MaxConcurrentTransforms?: number | undefined;
    /**
     * <p>The timeout and maximum number of retries for processing a transform job invocation.</p>
     * @public
     */
    ModelClientConfig?: ModelClientConfig | undefined;
    /**
     * <p>The maximum payload size, in MB, used in the transform job.</p>
     * @public
     */
    MaxPayloadInMB?: number | undefined;
    /**
     * <p>Specifies the number of records to include in a mini-batch for an HTTP inference request. A <i>record</i> <i/> is a single unit of input data that inference can be made on. For example, a single line in a CSV file is a record. </p> <p>To enable the batch strategy, you must set <code>SplitType</code> to <code>Line</code>, <code>RecordIO</code>, or <code>TFRecord</code>.</p>
     * @public
     */
    BatchStrategy?: BatchStrategy | undefined;
    /**
     * <p>The environment variables to set in the Docker container. We support up to 16 key and values entries in the map.</p>
     * @public
     */
    Environment?: Record<string, string> | undefined;
    /**
     * <p>Describes the dataset to be transformed and the Amazon S3 location where it is stored.</p>
     * @public
     */
    TransformInput: TransformInput | undefined;
    /**
     * <p>Identifies the Amazon S3 location where you want Amazon SageMaker to save the results from the transform job.</p>
     * @public
     */
    TransformOutput?: TransformOutput | undefined;
    /**
     * <p>Configuration to control how SageMaker captures inference data.</p>
     * @public
     */
    DataCaptureConfig?: BatchDataCaptureConfig | undefined;
    /**
     * <p>Describes the resources, including ML instance types and ML instance count, to use for the transform job.</p>
     * @public
     */
    TransformResources: TransformResources | undefined;
    /**
     * <p>A timestamp that shows when the transform Job was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
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
     * <p>The Amazon Resource Name (ARN) of the Amazon SageMaker Ground Truth labeling job that created the transform or training job.</p>
     * @public
     */
    LabelingJobArn?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the AutoML transform job.</p>
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
}
/**
 * @public
 */
export interface DescribeTrialRequest {
    /**
     * <p>The name of the trial to describe.</p>
     * @public
     */
    TrialName: string | undefined;
}
/**
 * <p>The source of the trial.</p>
 * @public
 */
export interface TrialSource {
    /**
     * <p>The Amazon Resource Name (ARN) of the source.</p>
     * @public
     */
    SourceArn: string | undefined;
    /**
     * <p>The source job type.</p>
     * @public
     */
    SourceType?: string | undefined;
}
/**
 * @public
 */
export interface DescribeTrialResponse {
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
     * <p>The Amazon Resource Name (ARN) of the source and, optionally, the job type.</p>
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
     * <p>When the trial was last modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>Who last modified the trial.</p>
     * @public
     */
    LastModifiedBy?: UserContext | undefined;
    /**
     * <p>Metadata properties of the tracking entity, trial, or trial component.</p>
     * @public
     */
    MetadataProperties?: MetadataProperties | undefined;
}
/**
 * @public
 */
export interface DescribeTrialComponentRequest {
    /**
     * <p>The name of the trial component to describe.</p>
     * @public
     */
    TrialComponentName: string | undefined;
}
/**
 * <p>A summary of the metrics of a trial component.</p>
 * @public
 */
export interface TrialComponentMetricSummary {
    /**
     * <p>The name of the metric.</p>
     * @public
     */
    MetricName?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the source.</p>
     * @public
     */
    SourceArn?: string | undefined;
    /**
     * <p>When the metric was last updated.</p>
     * @public
     */
    TimeStamp?: Date | undefined;
    /**
     * <p>The maximum value of the metric.</p>
     * @public
     */
    Max?: number | undefined;
    /**
     * <p>The minimum value of the metric.</p>
     * @public
     */
    Min?: number | undefined;
    /**
     * <p>The most recent value of the metric.</p>
     * @public
     */
    Last?: number | undefined;
    /**
     * <p>The number of samples used to generate the metric.</p>
     * @public
     */
    Count?: number | undefined;
    /**
     * <p>The average value of the metric.</p>
     * @public
     */
    Avg?: number | undefined;
    /**
     * <p>The standard deviation of the metric.</p>
     * @public
     */
    StdDev?: number | undefined;
}
/**
 * <p>The Amazon Resource Name (ARN) and job type of the source of a trial component.</p>
 * @public
 */
export interface TrialComponentSource {
    /**
     * <p>The source Amazon Resource Name (ARN).</p>
     * @public
     */
    SourceArn: string | undefined;
    /**
     * <p>The source job type.</p>
     * @public
     */
    SourceType?: string | undefined;
}
/**
 * @public
 */
export interface DescribeTrialComponentResponse {
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
     * <p>The Amazon Resource Name (ARN) of the source and, optionally, the job type.</p>
     * @public
     */
    Source?: TrialComponentSource | undefined;
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
     * <p>Metadata properties of the tracking entity, trial, or trial component.</p>
     * @public
     */
    MetadataProperties?: MetadataProperties | undefined;
    /**
     * <p>The metrics for the component.</p>
     * @public
     */
    Metrics?: TrialComponentMetricSummary[] | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the lineage group.</p>
     * @public
     */
    LineageGroupArn?: string | undefined;
    /**
     * <p>A list of ARNs and, if applicable, job types for multiple sources of an experiment run.</p>
     * @public
     */
    Sources?: TrialComponentSource[] | undefined;
}
/**
 * @public
 */
export interface DescribeUserProfileRequest {
    /**
     * <p>The domain ID.</p>
     * @public
     */
    DomainId: string | undefined;
    /**
     * <p>The user profile name. This value is not case sensitive.</p>
     * @public
     */
    UserProfileName: string | undefined;
}
/**
 * @public
 */
export interface DescribeUserProfileResponse {
    /**
     * <p>The ID of the domain that contains the profile.</p>
     * @public
     */
    DomainId?: string | undefined;
    /**
     * <p>The user profile Amazon Resource Name (ARN).</p>
     * @public
     */
    UserProfileArn?: string | undefined;
    /**
     * <p>The user profile name.</p>
     * @public
     */
    UserProfileName?: string | undefined;
    /**
     * <p>The ID of the user's profile in the Amazon Elastic File System volume.</p>
     * @public
     */
    HomeEfsFileSystemUid?: string | undefined;
    /**
     * <p>The status.</p>
     * @public
     */
    Status?: UserProfileStatus | undefined;
    /**
     * <p>The last modified time.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>The creation time.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>The failure reason.</p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>The IAM Identity Center user identifier.</p>
     * @public
     */
    SingleSignOnUserIdentifier?: string | undefined;
    /**
     * <p>The IAM Identity Center user value.</p>
     * @public
     */
    SingleSignOnUserValue?: string | undefined;
    /**
     * <p>A collection of settings.</p>
     * @public
     */
    UserSettings?: UserSettings | undefined;
}
/**
 * @public
 */
export interface DescribeWorkforceRequest {
    /**
     * <p>The name of the private workforce whose access you want to restrict. <code>WorkforceName</code> is automatically set to <code>default</code> when a workforce is created and cannot be modified. </p>
     * @public
     */
    WorkforceName: string | undefined;
}
/**
 * <p>Your OIDC IdP workforce configuration.</p>
 * @public
 */
export interface OidcConfigForResponse {
    /**
     * <p>The OIDC IdP client ID used to configure your private workforce.</p>
     * @public
     */
    ClientId?: string | undefined;
    /**
     * <p>The OIDC IdP issuer used to configure your private workforce.</p>
     * @public
     */
    Issuer?: string | undefined;
    /**
     * <p>The OIDC IdP authorization endpoint used to configure your private workforce.</p>
     * @public
     */
    AuthorizationEndpoint?: string | undefined;
    /**
     * <p>The OIDC IdP token endpoint used to configure your private workforce.</p>
     * @public
     */
    TokenEndpoint?: string | undefined;
    /**
     * <p>The OIDC IdP user information endpoint used to configure your private workforce.</p>
     * @public
     */
    UserInfoEndpoint?: string | undefined;
    /**
     * <p>The OIDC IdP logout endpoint used to configure your private workforce.</p>
     * @public
     */
    LogoutEndpoint?: string | undefined;
    /**
     * <p>The OIDC IdP JSON Web Key Set (Jwks) URI used to configure your private workforce.</p>
     * @public
     */
    JwksUri?: string | undefined;
    /**
     * <p>An array of string identifiers used to refer to the specific pieces of user data or claims that the client application wants to access.</p>
     * @public
     */
    Scope?: string | undefined;
    /**
     * <p>A string to string map of identifiers specific to the custom identity provider (IdP) being used.</p>
     * @public
     */
    AuthenticationRequestExtraParams?: Record<string, string> | undefined;
}
/**
 * <p>A VpcConfig object that specifies the VPC that you want your workforce to connect to.</p>
 * @public
 */
export interface WorkforceVpcConfigResponse {
    /**
     * <p>The ID of the VPC that the workforce uses for communication.</p>
     * @public
     */
    VpcId: string | undefined;
    /**
     * <p>The VPC security group IDs, in the form sg-xxxxxxxx. The security groups must be for the same VPC as specified in the subnet.</p>
     * @public
     */
    SecurityGroupIds: string[] | undefined;
    /**
     * <p>The ID of the subnets in the VPC that you want to connect.</p>
     * @public
     */
    Subnets: string[] | undefined;
    /**
     * <p>The IDs for the VPC service endpoints of your VPC workforce when it is created and updated.</p>
     * @public
     */
    VpcEndpointId?: string | undefined;
}
/**
 * <p>A single private workforce, which is automatically created when you create your first private work team. You can create one private work force in each Amazon Web Services Region. By default, any workforce-related API operation used in a specific region will apply to the workforce created in that region. To learn how to create a private workforce, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/sms-workforce-create-private.html">Create a Private Workforce</a>.</p>
 * @public
 */
export interface Workforce {
    /**
     * <p>The name of the private workforce.</p>
     * @public
     */
    WorkforceName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the private workforce.</p>
     * @public
     */
    WorkforceArn: string | undefined;
    /**
     * <p>The most recent date that <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_UpdateWorkforce.html">UpdateWorkforce</a> was used to successfully add one or more IP address ranges (<a href="https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Subnets.html">CIDRs</a>) to a private workforce's allow list.</p>
     * @public
     */
    LastUpdatedDate?: Date | undefined;
    /**
     * <p>A list of one to ten IP address ranges (<a href="https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Subnets.html">CIDRs</a>) to be added to the workforce allow list. By default, a workforce isn't restricted to specific IP addresses.</p>
     * @public
     */
    SourceIpConfig?: SourceIpConfig | undefined;
    /**
     * <p>The subdomain for your OIDC Identity Provider.</p>
     * @public
     */
    SubDomain?: string | undefined;
    /**
     * <p>The configuration of an Amazon Cognito workforce. A single Cognito workforce is created using and corresponds to a single <a href="https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html"> Amazon Cognito user pool</a>.</p>
     * @public
     */
    CognitoConfig?: CognitoConfig | undefined;
    /**
     * <p>The configuration of an OIDC Identity Provider (IdP) private workforce.</p>
     * @public
     */
    OidcConfig?: OidcConfigForResponse | undefined;
    /**
     * <p>The date that the workforce is created.</p>
     * @public
     */
    CreateDate?: Date | undefined;
    /**
     * <p>The configuration of a VPC workforce.</p>
     * @public
     */
    WorkforceVpcConfig?: WorkforceVpcConfigResponse | undefined;
    /**
     * <p>The status of your workforce.</p>
     * @public
     */
    Status?: WorkforceStatus | undefined;
    /**
     * <p>The reason your workforce failed.</p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>The IP address type you specify - either <code>IPv4</code> only or <code>dualstack</code> (<code>IPv4</code> and <code>IPv6</code>) - to support your labeling workforce.</p>
     * @public
     */
    IpAddressType?: WorkforceIpAddressType | undefined;
}
/**
 * @public
 */
export interface DescribeWorkforceResponse {
    /**
     * <p>A single private workforce, which is automatically created when you create your first private work team. You can create one private work force in each Amazon Web Services Region. By default, any workforce-related API operation used in a specific region will apply to the workforce created in that region. To learn how to create a private workforce, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/sms-workforce-create-private.html">Create a Private Workforce</a>.</p>
     * @public
     */
    Workforce: Workforce | undefined;
}
/**
 * @public
 */
export interface DescribeWorkteamRequest {
    /**
     * <p>The name of the work team to return a description of.</p>
     * @public
     */
    WorkteamName: string | undefined;
}
/**
 * <p>Provides details about a labeling work team.</p>
 * @public
 */
export interface Workteam {
    /**
     * <p>The name of the work team.</p>
     * @public
     */
    WorkteamName: string | undefined;
    /**
     * <p>A list of <code>MemberDefinition</code> objects that contains objects that identify the workers that make up the work team. </p> <p>Workforces can be created using Amazon Cognito or your own OIDC Identity Provider (IdP). For private workforces created using Amazon Cognito use <code>CognitoMemberDefinition</code>. For workforces created using your own OIDC identity provider (IdP) use <code>OidcMemberDefinition</code>.</p>
     * @public
     */
    MemberDefinitions: MemberDefinition[] | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) that identifies the work team.</p>
     * @public
     */
    WorkteamArn: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the workforce.</p>
     * @public
     */
    WorkforceArn?: string | undefined;
    /**
     * <p>The Amazon Marketplace identifier for a vendor's work team.</p>
     * @public
     */
    ProductListingIds?: string[] | undefined;
    /**
     * <p>A description of the work team.</p>
     * @public
     */
    Description: string | undefined;
    /**
     * <p>The URI of the labeling job's user interface. Workers open this URI to start labeling your data objects.</p>
     * @public
     */
    SubDomain?: string | undefined;
    /**
     * <p>The date and time that the work team was created (timestamp).</p>
     * @public
     */
    CreateDate?: Date | undefined;
    /**
     * <p>The date and time that the work team was last updated (timestamp).</p>
     * @public
     */
    LastUpdatedDate?: Date | undefined;
    /**
     * <p>Configures SNS notifications of available or expiring work items for work teams.</p>
     * @public
     */
    NotificationConfiguration?: NotificationConfiguration | undefined;
    /**
     * <p>Describes any access constraints that have been defined for Amazon S3 resources.</p>
     * @public
     */
    WorkerAccessConfiguration?: WorkerAccessConfiguration | undefined;
}
/**
 * @public
 */
export interface DescribeWorkteamResponse {
    /**
     * <p>A <code>Workteam</code> instance that contains information about the work team. </p>
     * @public
     */
    Workteam: Workteam | undefined;
}
/**
 * <p>Specifies the serverless update concurrency configuration for an endpoint variant.</p>
 * @public
 */
export interface ProductionVariantServerlessUpdateConfig {
    /**
     * <p>The updated maximum number of concurrent invocations your serverless endpoint can process.</p>
     * @public
     */
    MaxConcurrency?: number | undefined;
    /**
     * <p>The updated amount of provisioned concurrency to allocate for the serverless endpoint. Should be less than or equal to <code>MaxConcurrency</code>.</p>
     * @public
     */
    ProvisionedConcurrency?: number | undefined;
}
/**
 * <p>Specifies weight and capacity values for a production variant.</p>
 * @public
 */
export interface DesiredWeightAndCapacity {
    /**
     * <p>The name of the variant to update.</p>
     * @public
     */
    VariantName: string | undefined;
    /**
     * <p>The variant's weight.</p>
     * @public
     */
    DesiredWeight?: number | undefined;
    /**
     * <p>The variant's capacity.</p>
     * @public
     */
    DesiredInstanceCount?: number | undefined;
    /**
     * <p>Specifies the serverless update concurrency configuration for an endpoint variant.</p>
     * @public
     */
    ServerlessUpdateConfig?: ProductionVariantServerlessUpdateConfig | undefined;
}
/**
 * @public
 */
export interface DetachClusterNodeVolumeRequest {
    /**
     * <p> The Amazon Resource Name (ARN) of your SageMaker HyperPod cluster containing the target node. Your cluster must use EKS as the orchestration and be in the <code>InService</code> state. </p>
     * @public
     */
    ClusterArn: string | undefined;
    /**
     * <p> The unique identifier of the cluster node from which you want to detach the volume. </p>
     * @public
     */
    NodeId: string | undefined;
    /**
     * <p> The unique identifier of your EBS volume that you want to detach. Your volume must be currently attached to the specified node. </p>
     * @public
     */
    VolumeId: string | undefined;
}
/**
 * @public
 */
export interface DetachClusterNodeVolumeResponse {
    /**
     * <p> The Amazon Resource Name (ARN) of your SageMaker HyperPod cluster where the volume detachment operation was performed. </p>
     * @public
     */
    ClusterArn: string | undefined;
    /**
     * <p> The unique identifier of the cluster node from which your volume was detached. </p>
     * @public
     */
    NodeId: string | undefined;
    /**
     * <p> The unique identifier of your EBS volume that was detached. </p>
     * @public
     */
    VolumeId: string | undefined;
    /**
     * <p> The original timestamp when your volume was initially attached to the node. </p>
     * @public
     */
    AttachTime: Date | undefined;
    /**
     * <p> The current status of your volume detachment operation. </p>
     * @public
     */
    Status: VolumeAttachmentStatus | undefined;
    /**
     * <p> The device name assigned to your attached volume on the target instance. </p>
     * @public
     */
    DeviceName: string | undefined;
}
/**
 * <p>Information of a particular device.</p>
 * @public
 */
export interface Device {
    /**
     * <p>The name of the device.</p>
     * @public
     */
    DeviceName: string | undefined;
    /**
     * <p>Description of the device.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>Amazon Web Services Internet of Things (IoT) object name.</p>
     * @public
     */
    IotThingName?: string | undefined;
}
/**
 * <p>Contains information summarizing device details and deployment status.</p>
 * @public
 */
export interface DeviceDeploymentSummary {
    /**
     * <p>The ARN of the edge deployment plan.</p>
     * @public
     */
    EdgeDeploymentPlanArn: string | undefined;
    /**
     * <p>The name of the edge deployment plan.</p>
     * @public
     */
    EdgeDeploymentPlanName: string | undefined;
    /**
     * <p>The name of the stage in the edge deployment plan.</p>
     * @public
     */
    StageName: string | undefined;
    /**
     * <p>The name of the deployed stage.</p>
     * @public
     */
    DeployedStageName?: string | undefined;
    /**
     * <p>The name of the fleet to which the device belongs to.</p>
     * @public
     */
    DeviceFleetName?: string | undefined;
    /**
     * <p>The name of the device.</p>
     * @public
     */
    DeviceName: string | undefined;
    /**
     * <p>The ARN of the device.</p>
     * @public
     */
    DeviceArn: string | undefined;
    /**
     * <p>The deployment status of the device.</p>
     * @public
     */
    DeviceDeploymentStatus?: DeviceDeploymentStatus | undefined;
    /**
     * <p>The detailed error message for the deployoment status result.</p>
     * @public
     */
    DeviceDeploymentStatusMessage?: string | undefined;
    /**
     * <p>The description of the device.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>The time when the deployment on the device started.</p>
     * @public
     */
    DeploymentStartTime?: Date | undefined;
}
/**
 * <p>Summary of the device fleet.</p>
 * @public
 */
export interface DeviceFleetSummary {
    /**
     * <p>Amazon Resource Name (ARN) of the device fleet.</p>
     * @public
     */
    DeviceFleetArn: string | undefined;
    /**
     * <p>Name of the device fleet.</p>
     * @public
     */
    DeviceFleetName: string | undefined;
    /**
     * <p>Timestamp of when the device fleet was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>Timestamp of when the device fleet was last updated.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
}
/**
 * <p>Status of devices.</p>
 * @public
 */
export interface DeviceStats {
    /**
     * <p>The number of devices connected with a heartbeat.</p>
     * @public
     */
    ConnectedDeviceCount: number | undefined;
    /**
     * <p>The number of registered devices.</p>
     * @public
     */
    RegisteredDeviceCount: number | undefined;
}
/**
 * <p>Summary of model on edge device.</p>
 * @public
 */
export interface EdgeModelSummary {
    /**
     * <p>The name of the model.</p>
     * @public
     */
    ModelName: string | undefined;
    /**
     * <p>The version model.</p>
     * @public
     */
    ModelVersion: string | undefined;
}
/**
 * <p>Summary of the device.</p>
 * @public
 */
export interface DeviceSummary {
    /**
     * <p>The unique identifier of the device.</p>
     * @public
     */
    DeviceName: string | undefined;
    /**
     * <p>Amazon Resource Name (ARN) of the device.</p>
     * @public
     */
    DeviceArn: string | undefined;
    /**
     * <p>A description of the device.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>The name of the fleet the device belongs to.</p>
     * @public
     */
    DeviceFleetName?: string | undefined;
    /**
     * <p>The Amazon Web Services Internet of Things (IoT) object thing name associated with the device..</p>
     * @public
     */
    IotThingName?: string | undefined;
    /**
     * <p>The timestamp of the last registration or de-reregistration.</p>
     * @public
     */
    RegistrationTime?: Date | undefined;
    /**
     * <p>The last heartbeat received from the device.</p>
     * @public
     */
    LatestHeartbeat?: Date | undefined;
    /**
     * <p>Models on the device.</p>
     * @public
     */
    Models?: EdgeModelSummary[] | undefined;
    /**
     * <p>Edge Manager agent version.</p>
     * @public
     */
    AgentVersion?: string | undefined;
}
/**
 * @public
 */
export interface DisableSagemakerServicecatalogPortfolioInput {
}
/**
 * @public
 */
export interface DisableSagemakerServicecatalogPortfolioOutput {
}
/**
 * @public
 */
export interface DisassociateTrialComponentRequest {
    /**
     * <p>The name of the component to disassociate from the trial.</p>
     * @public
     */
    TrialComponentName: string | undefined;
    /**
     * <p>The name of the trial to disassociate from.</p>
     * @public
     */
    TrialName: string | undefined;
}
/**
 * @public
 */
export interface DisassociateTrialComponentResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the trial component.</p>
     * @public
     */
    TrialComponentArn?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the trial.</p>
     * @public
     */
    TrialArn?: string | undefined;
}
/**
 * <p>The domain's details.</p>
 * @public
 */
export interface DomainDetails {
    /**
     * <p>The domain's Amazon Resource Name (ARN).</p>
     * @public
     */
    DomainArn?: string | undefined;
    /**
     * <p>The domain ID.</p>
     * @public
     */
    DomainId?: string | undefined;
    /**
     * <p>The domain name.</p>
     * @public
     */
    DomainName?: string | undefined;
    /**
     * <p>The status.</p>
     * @public
     */
    Status?: DomainStatus | undefined;
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
     * <p>The domain's URL.</p>
     * @public
     */
    Url?: string | undefined;
}
/**
 * <p>A collection of settings that update the current configuration for the <code>RStudioServerPro</code> Domain-level app.</p>
 * @public
 */
export interface RStudioServerProDomainSettingsForUpdate {
    /**
     * <p>The execution role for the <code>RStudioServerPro</code> Domain-level app.</p>
     * @public
     */
    DomainExecutionRoleArn: string | undefined;
    /**
     * <p>Specifies the ARN's of a SageMaker AI image and SageMaker AI image version, and the instance type that the version runs on.</p> <note> <p>When both <code>SageMakerImageVersionArn</code> and <code>SageMakerImageArn</code> are passed, <code>SageMakerImageVersionArn</code> is used. Any updates to <code>SageMakerImageArn</code> will not take effect if <code>SageMakerImageVersionArn</code> already exists in the <code>ResourceSpec</code> because <code>SageMakerImageVersionArn</code> always takes precedence. To clear the value set for <code>SageMakerImageVersionArn</code>, pass <code>None</code> as the value.</p> </note>
     * @public
     */
    DefaultResourceSpec?: ResourceSpec | undefined;
    /**
     * <p>A URL pointing to an RStudio Connect server.</p>
     * @public
     */
    RStudioConnectUrl?: string | undefined;
    /**
     * <p>A URL pointing to an RStudio Package Manager server.</p>
     * @public
     */
    RStudioPackageManagerUrl?: string | undefined;
}
/**
 * <p>A collection of <code>Domain</code> configuration settings to update.</p>
 * @public
 */
export interface DomainSettingsForUpdate {
    /**
     * <p>A collection of <code>RStudioServerPro</code> Domain-level app settings to update. A single <code>RStudioServerPro</code> application is created for a domain.</p>
     * @public
     */
    RStudioServerProDomainSettingsForUpdate?: RStudioServerProDomainSettingsForUpdate | undefined;
    /**
     * <p>The configuration for attaching a SageMaker AI user profile name to the execution role as a <a href="https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_control-access_monitor.html">sts:SourceIdentity key</a>. This configuration can only be modified if there are no apps in the <code>InService</code> or <code>Pending</code> state.</p>
     * @public
     */
    ExecutionRoleIdentityConfig?: ExecutionRoleIdentityConfig | undefined;
    /**
     * <p>The security groups for the Amazon Virtual Private Cloud that the <code>Domain</code> uses for communication between Domain-level apps and user apps.</p>
     * @public
     */
    SecurityGroupIds?: string[] | undefined;
    /**
     * <p>The Trusted Identity Propagation (TIP) settings for the SageMaker domain. These settings determine how user identities from IAM Identity Center are propagated through the domain to TIP enabled Amazon Web Services services.</p>
     * @public
     */
    TrustedIdentityPropagationSettings?: TrustedIdentityPropagationSettings | undefined;
    /**
     * <p>A collection of settings that configure the domain's Docker interaction.</p>
     * @public
     */
    DockerSettings?: DockerSettings | undefined;
    /**
     * <p>A collection of settings that configure the Amazon Q experience within the domain.</p>
     * @public
     */
    AmazonQSettings?: AmazonQSettings | undefined;
    /**
     * <p>The settings that apply to an SageMaker AI domain when you use it in Amazon SageMaker Unified Studio.</p>
     * @public
     */
    UnifiedStudioSettings?: UnifiedStudioSettings | undefined;
    /**
     * <p>The IP address type for the domain. Specify <code>ipv4</code> for IPv4-only connectivity or <code>dualstack</code> for both IPv4 and IPv6 connectivity. When you specify <code>dualstack</code>, the subnet must support IPv6 CIDR blocks.</p>
     * @public
     */
    IpAddressType?: IPAddressType | undefined;
}
/**
 * <p>A specification for a predefined metric.</p>
 * @public
 */
export interface PredefinedMetricSpecification {
    /**
     * <p>The metric type. You can only apply SageMaker metric types to SageMaker endpoints.</p>
     * @public
     */
    PredefinedMetricType?: string | undefined;
}
/**
 * <p>An object containing information about a metric.</p>
 * @public
 */
export type MetricSpecification = MetricSpecification.CustomizedMember | MetricSpecification.PredefinedMember | MetricSpecification.$UnknownMember;
/**
 * @public
 */
export declare namespace MetricSpecification {
    /**
     * <p>Information about a predefined metric.</p>
     * @public
     */
    interface PredefinedMember {
        Predefined: PredefinedMetricSpecification;
        Customized?: never;
        $unknown?: never;
    }
    /**
     * <p>Information about a customized metric.</p>
     * @public
     */
    interface CustomizedMember {
        Predefined?: never;
        Customized: CustomizedMetricSpecification;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        Predefined?: never;
        Customized?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        Predefined: (value: PredefinedMetricSpecification) => T;
        Customized: (value: CustomizedMetricSpecification) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>A target tracking scaling policy. Includes support for predefined or customized metrics.</p> <p>When using the <a href="https://docs.aws.amazon.com/autoscaling/application/APIReference/API_PutScalingPolicy.html">PutScalingPolicy</a> API, this parameter is required when you are creating a policy with the policy type <code>TargetTrackingScaling</code>.</p>
 * @public
 */
export interface TargetTrackingScalingPolicyConfiguration {
    /**
     * <p>An object containing information about a metric.</p>
     * @public
     */
    MetricSpecification?: MetricSpecification | undefined;
    /**
     * <p>The recommended target value to specify for the metric when creating a scaling policy.</p>
     * @public
     */
    TargetValue?: number | undefined;
}
/**
 * <p>An object containing a recommended scaling policy.</p>
 * @public
 */
export type ScalingPolicy = ScalingPolicy.TargetTrackingMember | ScalingPolicy.$UnknownMember;
/**
 * @public
 */
export declare namespace ScalingPolicy {
    /**
     * <p>A target tracking scaling policy. Includes support for predefined or customized metrics.</p>
     * @public
     */
    interface TargetTrackingMember {
        TargetTracking: TargetTrackingScalingPolicyConfiguration;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        TargetTracking?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        TargetTracking: (value: TargetTrackingScalingPolicyConfiguration) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>An object with the recommended values for you to specify when creating an autoscaling policy.</p>
 * @public
 */
export interface DynamicScalingConfiguration {
    /**
     * <p>The recommended minimum capacity to specify for your autoscaling policy.</p>
     * @public
     */
    MinCapacity?: number | undefined;
    /**
     * <p>The recommended maximum capacity to specify for your autoscaling policy.</p>
     * @public
     */
    MaxCapacity?: number | undefined;
    /**
     * <p>The recommended scale in cooldown time for your autoscaling policy.</p>
     * @public
     */
    ScaleInCooldown?: number | undefined;
    /**
     * <p>The recommended scale out cooldown time for your autoscaling policy.</p>
     * @public
     */
    ScaleOutCooldown?: number | undefined;
    /**
     * <p>An object of the scaling policies for each metric.</p>
     * @public
     */
    ScalingPolicies?: ScalingPolicy[] | undefined;
}
/**
 * <p>A directed edge connecting two lineage entities.</p>
 * @public
 */
export interface Edge {
    /**
     * <p>The Amazon Resource Name (ARN) of the source lineage entity of the directed edge.</p>
     * @public
     */
    SourceArn?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the destination lineage entity of the directed edge.</p>
     * @public
     */
    DestinationArn?: string | undefined;
    /**
     * <p>The type of the Association(Edge) between the source and destination. For example <code>ContributedTo</code>, <code>Produced</code>, or <code>DerivedFrom</code>.</p>
     * @public
     */
    AssociationType?: AssociationEdgeType | undefined;
}
/**
 * <p>Contains information summarizing an edge deployment plan.</p>
 * @public
 */
export interface EdgeDeploymentPlanSummary {
    /**
     * <p>The ARN of the edge deployment plan.</p>
     * @public
     */
    EdgeDeploymentPlanArn: string | undefined;
    /**
     * <p>The name of the edge deployment plan.</p>
     * @public
     */
    EdgeDeploymentPlanName: string | undefined;
    /**
     * <p>The name of the device fleet used for the deployment. </p>
     * @public
     */
    DeviceFleetName: string | undefined;
    /**
     * <p>The number of edge devices with the successful deployment.</p>
     * @public
     */
    EdgeDeploymentSuccess: number | undefined;
    /**
     * <p>The number of edge devices yet to pick up the deployment, or in progress.</p>
     * @public
     */
    EdgeDeploymentPending: number | undefined;
    /**
     * <p>The number of edge devices that failed the deployment.</p>
     * @public
     */
    EdgeDeploymentFailed: number | undefined;
    /**
     * <p>The time when the edge deployment plan was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>The time when the edge deployment plan was last updated.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
}
/**
 * <p>Status of edge devices with this model.</p>
 * @public
 */
export interface EdgeModelStat {
    /**
     * <p>The name of the model.</p>
     * @public
     */
    ModelName: string | undefined;
    /**
     * <p>The model version.</p>
     * @public
     */
    ModelVersion: string | undefined;
    /**
     * <p>The number of devices that have this model version and do not have a heart beat.</p>
     * @public
     */
    OfflineDeviceCount: number | undefined;
    /**
     * <p>The number of devices that have this model version and have a heart beat. </p>
     * @public
     */
    ConnectedDeviceCount: number | undefined;
    /**
     * <p>The number of devices that have this model version, a heart beat, and are currently running.</p>
     * @public
     */
    ActiveDeviceCount: number | undefined;
    /**
     * <p>The number of devices with this model version and are producing sample data.</p>
     * @public
     */
    SamplingDeviceCount: number | undefined;
}
/**
 * <p>Summary of edge packaging job.</p>
 * @public
 */
export interface EdgePackagingJobSummary {
    /**
     * <p>The Amazon Resource Name (ARN) of the edge packaging job.</p>
     * @public
     */
    EdgePackagingJobArn: string | undefined;
    /**
     * <p>The name of the edge packaging job.</p>
     * @public
     */
    EdgePackagingJobName: string | undefined;
    /**
     * <p>The status of the edge packaging job.</p>
     * @public
     */
    EdgePackagingJobStatus: EdgePackagingJobStatus | undefined;
    /**
     * <p>The name of the SageMaker Neo compilation job.</p>
     * @public
     */
    CompilationJobName?: string | undefined;
    /**
     * <p>The name of the model.</p>
     * @public
     */
    ModelName?: string | undefined;
    /**
     * <p>The version of the model.</p>
     * @public
     */
    ModelVersion?: string | undefined;
    /**
     * <p>The timestamp of when the job was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>The timestamp of when the edge packaging job was last updated.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
}
/**
 * <p>The configurations and outcomes of an Amazon EMR step execution.</p>
 * @public
 */
export interface EMRStepMetadata {
    /**
     * <p>The identifier of the EMR cluster.</p>
     * @public
     */
    ClusterId?: string | undefined;
    /**
     * <p>The identifier of the EMR cluster step.</p>
     * @public
     */
    StepId?: string | undefined;
    /**
     * <p>The name of the EMR cluster step.</p>
     * @public
     */
    StepName?: string | undefined;
    /**
     * <p>The path to the log file where the cluster step's failure root cause is recorded.</p>
     * @public
     */
    LogFilePath?: string | undefined;
}
/**
 * @public
 */
export interface EnableSagemakerServicecatalogPortfolioInput {
}
/**
 * @public
 */
export interface EnableSagemakerServicecatalogPortfolioOutput {
}
/**
 * <p>A schedule for a model monitoring job. For information about model monitor, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/model-monitor.html">Amazon SageMaker Model Monitor</a>.</p>
 * @public
 */
export interface MonitoringSchedule {
    /**
     * <p>The Amazon Resource Name (ARN) of the monitoring schedule.</p>
     * @public
     */
    MonitoringScheduleArn?: string | undefined;
    /**
     * <p>The name of the monitoring schedule.</p>
     * @public
     */
    MonitoringScheduleName?: string | undefined;
    /**
     * <p>The status of the monitoring schedule. This can be one of the following values.</p> <ul> <li> <p> <code>PENDING</code> - The schedule is pending being created.</p> </li> <li> <p> <code>FAILED</code> - The schedule failed.</p> </li> <li> <p> <code>SCHEDULED</code> - The schedule was successfully created.</p> </li> <li> <p> <code>STOPPED</code> - The schedule was stopped.</p> </li> </ul>
     * @public
     */
    MonitoringScheduleStatus?: ScheduleStatus | undefined;
    /**
     * <p>The type of the monitoring job definition to schedule.</p>
     * @public
     */
    MonitoringType?: MonitoringType | undefined;
    /**
     * <p>If the monitoring schedule failed, the reason it failed.</p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>The time that the monitoring schedule was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>The last time the monitoring schedule was changed.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>Configures the monitoring schedule and defines the monitoring job.</p>
     * @public
     */
    MonitoringScheduleConfig?: MonitoringScheduleConfig | undefined;
    /**
     * <p>The endpoint that hosts the model being monitored.</p>
     * @public
     */
    EndpointName?: string | undefined;
    /**
     * <p>Summary of information about the last monitoring job to run.</p>
     * @public
     */
    LastMonitoringExecutionSummary?: MonitoringExecutionSummary | undefined;
    /**
     * <p>A list of the tags associated with the monitoring schedlue. For more information, see <a href="https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html">Tagging Amazon Web Services resources</a> in the <i>Amazon Web Services General Reference Guide</i>.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * <p>A hosted endpoint for real-time inference.</p>
 * @public
 */
export interface Endpoint {
    /**
     * <p>The name of the endpoint.</p>
     * @public
     */
    EndpointName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the endpoint.</p>
     * @public
     */
    EndpointArn: string | undefined;
    /**
     * <p>The endpoint configuration associated with the endpoint.</p>
     * @public
     */
    EndpointConfigName: string | undefined;
    /**
     * <p>A list of the production variants hosted on the endpoint. Each production variant is a model.</p>
     * @public
     */
    ProductionVariants?: ProductionVariantSummary[] | undefined;
    /**
     * <p>The currently active data capture configuration used by your Endpoint.</p>
     * @public
     */
    DataCaptureConfig?: DataCaptureConfigSummary | undefined;
    /**
     * <p>The status of the endpoint.</p>
     * @public
     */
    EndpointStatus: EndpointStatus | undefined;
    /**
     * <p>If the endpoint failed, the reason it failed.</p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>The time that the endpoint was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The last time the endpoint was modified.</p>
     * @public
     */
    LastModifiedTime: Date | undefined;
    /**
     * <p>A list of monitoring schedules for the endpoint. For information about model monitoring, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/model-monitor.html">Amazon SageMaker Model Monitor</a>.</p>
     * @public
     */
    MonitoringSchedules?: MonitoringSchedule[] | undefined;
    /**
     * <p>A list of the tags associated with the endpoint. For more information, see <a href="https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html">Tagging Amazon Web Services resources</a> in the <i>Amazon Web Services General Reference Guide</i>.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>A list of the shadow variants hosted on the endpoint. Each shadow variant is a model in shadow mode with production traffic replicated from the production variant.</p>
     * @public
     */
    ShadowProductionVariants?: ProductionVariantSummary[] | undefined;
}
/**
 * <p>Metadata for an endpoint configuration step.</p>
 * @public
 */
export interface EndpointConfigStepMetadata {
    /**
     * <p>The Amazon Resource Name (ARN) of the endpoint configuration used in the step.</p>
     * @public
     */
    Arn?: string | undefined;
}
/**
 * <p>Provides summary information for an endpoint configuration.</p>
 * @public
 */
export interface EndpointConfigSummary {
    /**
     * <p>The name of the endpoint configuration.</p>
     * @public
     */
    EndpointConfigName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the endpoint configuration.</p>
     * @public
     */
    EndpointConfigArn: string | undefined;
    /**
     * <p>A timestamp that shows when the endpoint configuration was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
}
/**
 * <p>Metadata for an endpoint step.</p>
 * @public
 */
export interface EndpointStepMetadata {
    /**
     * <p>The Amazon Resource Name (ARN) of the endpoint in the step.</p>
     * @public
     */
    Arn?: string | undefined;
}
/**
 * <p>Provides summary information for an endpoint.</p>
 * @public
 */
export interface EndpointSummary {
    /**
     * <p>The name of the endpoint.</p>
     * @public
     */
    EndpointName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the endpoint.</p>
     * @public
     */
    EndpointArn: string | undefined;
    /**
     * <p>A timestamp that shows when the endpoint was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>A timestamp that shows when the endpoint was last modified.</p>
     * @public
     */
    LastModifiedTime: Date | undefined;
    /**
     * <p>The status of the endpoint.</p> <ul> <li> <p> <code>OutOfService</code>: Endpoint is not available to take incoming requests.</p> </li> <li> <p> <code>Creating</code>: <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateEndpoint.html">CreateEndpoint</a> is executing.</p> </li> <li> <p> <code>Updating</code>: <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_UpdateEndpoint.html">UpdateEndpoint</a> or <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_UpdateEndpointWeightsAndCapacities.html">UpdateEndpointWeightsAndCapacities</a> is executing.</p> </li> <li> <p> <code>SystemUpdating</code>: Endpoint is undergoing maintenance and cannot be updated or deleted or re-scaled until it has completed. This maintenance operation does not change any customer-specified values such as VPC config, KMS encryption, model, instance type, or instance count.</p> </li> <li> <p> <code>RollingBack</code>: Endpoint fails to scale up or down or change its variant weight and is in the process of rolling back to its previous configuration. Once the rollback completes, endpoint returns to an <code>InService</code> status. This transitional status only applies to an endpoint that has autoscaling enabled and is undergoing variant weight or capacity changes as part of an <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_UpdateEndpointWeightsAndCapacities.html">UpdateEndpointWeightsAndCapacities</a> call or when the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_UpdateEndpointWeightsAndCapacities.html">UpdateEndpointWeightsAndCapacities</a> operation is called explicitly.</p> </li> <li> <p> <code>InService</code>: Endpoint is available to process incoming requests.</p> </li> <li> <p> <code>Deleting</code>: <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_DeleteEndpoint.html">DeleteEndpoint</a> is executing.</p> </li> <li> <p> <code>Failed</code>: Endpoint could not be created, updated, or re-scaled. Use <code>DescribeEndpointOutput$FailureReason</code> for information about the failure. <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_DeleteEndpoint.html">DeleteEndpoint</a> is the only operation that can be performed on a failed endpoint.</p> </li> </ul> <p>To get a list of endpoints with a specified status, use the <code>StatusEquals</code> filter with a call to <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_ListEndpoints.html">ListEndpoints</a>.</p>
     * @public
     */
    EndpointStatus: EndpointStatus | undefined;
}
/**
 * <p>The properties of an experiment as returned by the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_Search.html">Search</a> API. For information about experiments, see the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateExperiment.html">CreateExperiment</a> API.</p>
 * @public
 */
export interface Experiment {
    /**
     * <p>The name of the experiment.</p>
     * @public
     */
    ExperimentName?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the experiment.</p>
     * @public
     */
    ExperimentArn?: string | undefined;
    /**
     * <p>The name of the experiment as displayed. If <code>DisplayName</code> isn't specified, <code>ExperimentName</code> is displayed.</p>
     * @public
     */
    DisplayName?: string | undefined;
    /**
     * <p>The source of the experiment.</p>
     * @public
     */
    Source?: ExperimentSource | undefined;
    /**
     * <p>The description of the experiment.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>When the experiment was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>Who created the experiment.</p>
     * @public
     */
    CreatedBy?: UserContext | undefined;
    /**
     * <p>When the experiment was last modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>Information about the user who created or modified a SageMaker resource.</p>
     * @public
     */
    LastModifiedBy?: UserContext | undefined;
    /**
     * <p>The list of tags that are associated with the experiment. You can use <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_Search.html">Search</a> API to search on the tags.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * <p>A summary of the properties of an experiment. To get the complete set of properties, call the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_DescribeExperiment.html">DescribeExperiment</a> API and provide the <code>ExperimentName</code>.</p>
 * @public
 */
export interface ExperimentSummary {
    /**
     * <p>The Amazon Resource Name (ARN) of the experiment.</p>
     * @public
     */
    ExperimentArn?: string | undefined;
    /**
     * <p>The name of the experiment.</p>
     * @public
     */
    ExperimentName?: string | undefined;
    /**
     * <p>The name of the experiment as displayed. If <code>DisplayName</code> isn't specified, <code>ExperimentName</code> is displayed.</p>
     * @public
     */
    DisplayName?: string | undefined;
    /**
     * <p>The source of the experiment.</p>
     * @public
     */
    ExperimentSource?: ExperimentSource | undefined;
    /**
     * <p>When the experiment was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>When the experiment was last modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
}
/**
 * @public
 */
export interface ExtendTrainingPlanRequest {
    /**
     * <p>The unique identifier of the extension offering to purchase. You can retrieve this ID from the <code>TrainingPlanExtensionOfferings</code> in the response of the <code>SearchTrainingPlanOfferings</code> API.</p>
     * @public
     */
    TrainingPlanExtensionOfferingId: string | undefined;
}
/**
 * @public
 */
export interface ExtendTrainingPlanResponse {
    /**
     * <p>The list of extensions for the training plan, including the newly created extension.</p>
     * @public
     */
    TrainingPlanExtensions: TrainingPlanExtension[] | undefined;
}
/**
 * <p>The container for the metadata for Fail step.</p>
 * @public
 */
export interface FailStepMetadata {
    /**
     * <p>A message that you define and then is processed and rendered by the Fail step when the error occurs.</p>
     * @public
     */
    ErrorMessage?: string | undefined;
}
/**
 * <p>Amazon SageMaker Feature Store stores features in a collection called Feature Group. A Feature Group can be visualized as a table which has rows, with a unique identifier for each row where each column in the table is a feature. In principle, a Feature Group is composed of features and values per features.</p>
 * @public
 */
export interface FeatureGroup {
    /**
     * <p>The Amazon Resource Name (ARN) of a <code>FeatureGroup</code>.</p>
     * @public
     */
    FeatureGroupArn?: string | undefined;
    /**
     * <p>The name of the <code>FeatureGroup</code>.</p>
     * @public
     */
    FeatureGroupName?: string | undefined;
    /**
     * <p>The name of the <code>Feature</code> whose value uniquely identifies a <code>Record</code> defined in the <code>FeatureGroup</code> <code>FeatureDefinitions</code>.</p>
     * @public
     */
    RecordIdentifierFeatureName?: string | undefined;
    /**
     * <p>The name of the feature that stores the <code>EventTime</code> of a Record in a <code>FeatureGroup</code>.</p> <p>A <code>EventTime</code> is point in time when a new event occurs that corresponds to the creation or update of a <code>Record</code> in <code>FeatureGroup</code>. All <code>Records</code> in the <code>FeatureGroup</code> must have a corresponding <code>EventTime</code>.</p>
     * @public
     */
    EventTimeFeatureName?: string | undefined;
    /**
     * <p>A list of <code>Feature</code>s. Each <code>Feature</code> must include a <code>FeatureName</code> and a <code>FeatureType</code>. </p> <p>Valid <code>FeatureType</code>s are <code>Integral</code>, <code>Fractional</code> and <code>String</code>. </p> <p> <code>FeatureName</code>s cannot be any of the following: <code>is_deleted</code>, <code>write_time</code>, <code>api_invocation_time</code>.</p> <p>You can create up to 2,500 <code>FeatureDefinition</code>s per <code>FeatureGroup</code>.</p>
     * @public
     */
    FeatureDefinitions?: FeatureDefinition[] | undefined;
    /**
     * <p>The time a <code>FeatureGroup</code> was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>A timestamp indicating the last time you updated the feature group.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>Use this to specify the Amazon Web Services Key Management Service (KMS) Key ID, or <code>KMSKeyId</code>, for at rest data encryption. You can turn <code>OnlineStore</code> on or off by specifying the <code>EnableOnlineStore</code> flag at General Assembly.</p> <p>The default value is <code>False</code>.</p>
     * @public
     */
    OnlineStoreConfig?: OnlineStoreConfig | undefined;
    /**
     * <p>The configuration of an <code>OfflineStore</code>.</p> <p>Provide an <code>OfflineStoreConfig</code> in a request to <code>CreateFeatureGroup</code> to create an <code>OfflineStore</code>.</p> <p>To encrypt an <code>OfflineStore</code> using at rest data encryption, specify Amazon Web Services Key Management Service (KMS) key ID, or <code>KMSKeyId</code>, in <code>S3StorageConfig</code>.</p>
     * @public
     */
    OfflineStoreConfig?: OfflineStoreConfig | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the IAM execution role used to create the feature group.</p>
     * @public
     */
    RoleArn?: string | undefined;
    /**
     * <p>A <code>FeatureGroup</code> status.</p>
     * @public
     */
    FeatureGroupStatus?: FeatureGroupStatus | undefined;
    /**
     * <p>The status of <code>OfflineStore</code>.</p>
     * @public
     */
    OfflineStoreStatus?: OfflineStoreStatus | undefined;
    /**
     * <p>A value that indicates whether the feature group was updated successfully.</p>
     * @public
     */
    LastUpdateStatus?: LastUpdateStatus | undefined;
    /**
     * <p>The reason that the <code>FeatureGroup</code> failed to be replicated in the <code>OfflineStore</code>. This is failure may be due to a failure to create a <code>FeatureGroup</code> in or delete a <code>FeatureGroup</code> from the <code>OfflineStore</code>.</p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>A free form description of a <code>FeatureGroup</code>.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>Tags used to define a <code>FeatureGroup</code>.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * <p>The name, ARN, <code>CreationTime</code>, <code>FeatureGroup</code> values, <code>LastUpdatedTime</code> and <code>EnableOnlineStorage</code> status of a <code>FeatureGroup</code>.</p>
 * @public
 */
export interface FeatureGroupSummary {
    /**
     * <p>The name of <code>FeatureGroup</code>.</p>
     * @public
     */
    FeatureGroupName: string | undefined;
    /**
     * <p>Unique identifier for the <code>FeatureGroup</code>.</p>
     * @public
     */
    FeatureGroupArn: string | undefined;
    /**
     * <p>A timestamp indicating the time of creation time of the <code>FeatureGroup</code>.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The status of a FeatureGroup. The status can be any of the following: <code>Creating</code>, <code>Created</code>, <code>CreateFail</code>, <code>Deleting</code> or <code>DetailFail</code>. </p>
     * @public
     */
    FeatureGroupStatus?: FeatureGroupStatus | undefined;
    /**
     * <p>Notifies you if replicating data into the <code>OfflineStore</code> has failed. Returns either: <code>Active</code> or <code>Blocked</code>.</p>
     * @public
     */
    OfflineStoreStatus?: OfflineStoreStatus | undefined;
}
/**
 * <p>The metadata for a feature. It can either be metadata that you specify, or metadata that is updated automatically.</p>
 * @public
 */
export interface FeatureMetadata {
    /**
     * <p>The Amazon Resource Number (ARN) of the feature group.</p>
     * @public
     */
    FeatureGroupArn?: string | undefined;
    /**
     * <p>The name of the feature group containing the feature.</p>
     * @public
     */
    FeatureGroupName?: string | undefined;
    /**
     * <p>The name of feature.</p>
     * @public
     */
    FeatureName?: string | undefined;
    /**
     * <p>The data type of the feature.</p>
     * @public
     */
    FeatureType?: FeatureType | undefined;
    /**
     * <p>A timestamp indicating when the feature was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>A timestamp indicating when the feature was last modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>An optional description that you specify to better describe the feature.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>Optional key-value pairs that you specify to better describe the feature.</p>
     * @public
     */
    Parameters?: FeatureParameter[] | undefined;
}
/**
 * <p>A conditional statement for a search expression that includes a resource property, a Boolean operator, and a value. Resources that match the statement are returned in the results from the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_Search.html">Search</a> API.</p> <p>If you specify a <code>Value</code>, but not an <code>Operator</code>, SageMaker uses the equals operator.</p> <p>In search, there are several property types:</p> <dl> <dt>Metrics</dt> <dd> <p>To define a metric filter, enter a value using the form <code>"Metrics.&lt;name&gt;"</code>, where <code>&lt;name&gt;</code> is a metric name. For example, the following filter searches for training jobs with an <code>"accuracy"</code> metric greater than <code>"0.9"</code>:</p> <p> <code>\{</code> </p> <p> <code>"Name": "Metrics.accuracy",</code> </p> <p> <code>"Operator": "GreaterThan",</code> </p> <p> <code>"Value": "0.9"</code> </p> <p> <code>\}</code> </p> </dd> <dt>HyperParameters</dt> <dd> <p>To define a hyperparameter filter, enter a value with the form <code>"HyperParameters.&lt;name&gt;"</code>. Decimal hyperparameter values are treated as a decimal in a comparison if the specified <code>Value</code> is also a decimal value. If the specified <code>Value</code> is an integer, the decimal hyperparameter values are treated as integers. For example, the following filter is satisfied by training jobs with a <code>"learning_rate"</code> hyperparameter that is less than <code>"0.5"</code>:</p> <p> <code> \{</code> </p> <p> <code> "Name": "HyperParameters.learning_rate",</code> </p> <p> <code> "Operator": "LessThan",</code> </p> <p> <code> "Value": "0.5"</code> </p> <p> <code> \}</code> </p> </dd> <dt>Tags</dt> <dd> <p>To define a tag filter, enter a value with the form <code>Tags.&lt;key&gt;</code>.</p> </dd> </dl>
 * @public
 */
export interface Filter {
    /**
     * <p>A resource property name. For example, <code>TrainingJobName</code>. For valid property names, see <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_SearchRecord.html">SearchRecord</a>. You must specify a valid property for the resource.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>A Boolean binary operator that is used to evaluate the filter. The operator field contains one of the following values:</p> <dl> <dt>Equals</dt> <dd> <p>The value of <code>Name</code> equals <code>Value</code>.</p> </dd> <dt>NotEquals</dt> <dd> <p>The value of <code>Name</code> doesn't equal <code>Value</code>.</p> </dd> <dt>Exists</dt> <dd> <p>The <code>Name</code> property exists.</p> </dd> <dt>NotExists</dt> <dd> <p>The <code>Name</code> property does not exist.</p> </dd> <dt>GreaterThan</dt> <dd> <p>The value of <code>Name</code> is greater than <code>Value</code>. Not supported for text properties.</p> </dd> <dt>GreaterThanOrEqualTo</dt> <dd> <p>The value of <code>Name</code> is greater than or equal to <code>Value</code>. Not supported for text properties.</p> </dd> <dt>LessThan</dt> <dd> <p>The value of <code>Name</code> is less than <code>Value</code>. Not supported for text properties.</p> </dd> <dt>LessThanOrEqualTo</dt> <dd> <p>The value of <code>Name</code> is less than or equal to <code>Value</code>. Not supported for text properties.</p> </dd> <dt>In</dt> <dd> <p>The value of <code>Name</code> is one of the comma delimited strings in <code>Value</code>. Only supported for text properties.</p> </dd> <dt>Contains</dt> <dd> <p>The value of <code>Name</code> contains the string <code>Value</code>. Only supported for text properties.</p> <p>A <code>SearchExpression</code> can include the <code>Contains</code> operator multiple times when the value of <code>Name</code> is one of the following:</p> <ul> <li> <p> <code>Experiment.DisplayName</code> </p> </li> <li> <p> <code>Experiment.ExperimentName</code> </p> </li> <li> <p> <code>Experiment.Tags</code> </p> </li> <li> <p> <code>Trial.DisplayName</code> </p> </li> <li> <p> <code>Trial.TrialName</code> </p> </li> <li> <p> <code>Trial.Tags</code> </p> </li> <li> <p> <code>TrialComponent.DisplayName</code> </p> </li> <li> <p> <code>TrialComponent.TrialComponentName</code> </p> </li> <li> <p> <code>TrialComponent.Tags</code> </p> </li> <li> <p> <code>TrialComponent.InputArtifacts</code> </p> </li> <li> <p> <code>TrialComponent.OutputArtifacts</code> </p> </li> </ul> <p>A <code>SearchExpression</code> can include only one <code>Contains</code> operator for all other values of <code>Name</code>. In these cases, if you include multiple <code>Contains</code> operators in the <code>SearchExpression</code>, the result is the following error message: "<code>'CONTAINS' operator usage limit of 1 exceeded.</code>"</p> </dd> </dl>
     * @public
     */
    Operator?: Operator | undefined;
    /**
     * <p>A value used with <code>Name</code> and <code>Operator</code> to determine which resources satisfy the filter's condition. For numerical properties, <code>Value</code> must be an integer or floating-point decimal. For timestamp properties, <code>Value</code> must be an ISO 8601 date-time string of the following format: <code>YYYY-mm-dd'T'HH:MM:SS</code>.</p>
     * @public
     */
    Value?: string | undefined;
}
/**
 * <p>Contains summary information about the flow definition.</p>
 * @public
 */
export interface FlowDefinitionSummary {
    /**
     * <p>The name of the flow definition.</p>
     * @public
     */
    FlowDefinitionName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the flow definition.</p>
     * @public
     */
    FlowDefinitionArn: string | undefined;
    /**
     * <p>The status of the flow definition. Valid values:</p>
     * @public
     */
    FlowDefinitionStatus: FlowDefinitionStatus | undefined;
    /**
     * <p>The timestamp when SageMaker created the flow definition.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The reason why the flow definition creation failed. A failure reason is returned only when the flow definition status is <code>Failed</code>.</p>
     * @public
     */
    FailureReason?: string | undefined;
}
/**
 * @public
 */
export interface GetDeviceFleetReportRequest {
    /**
     * <p>The name of the fleet.</p>
     * @public
     */
    DeviceFleetName: string | undefined;
}
/**
 * @public
 */
export interface GetDeviceFleetReportResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the device.</p>
     * @public
     */
    DeviceFleetArn: string | undefined;
    /**
     * <p>The name of the fleet.</p>
     * @public
     */
    DeviceFleetName: string | undefined;
    /**
     * <p>The output configuration for storing sample data collected by the fleet.</p>
     * @public
     */
    OutputConfig?: EdgeOutputConfig | undefined;
    /**
     * <p>Description of the fleet.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>Timestamp of when the report was generated.</p>
     * @public
     */
    ReportGenerated?: Date | undefined;
    /**
     * <p>Status of devices.</p>
     * @public
     */
    DeviceStats?: DeviceStats | undefined;
    /**
     * <p>The versions of Edge Manager agent deployed on the fleet.</p>
     * @public
     */
    AgentVersions?: AgentVersion[] | undefined;
    /**
     * <p>Status of model on device.</p>
     * @public
     */
    ModelStats?: EdgeModelStat[] | undefined;
}
/**
 * @public
 */
export interface GetLineageGroupPolicyRequest {
    /**
     * <p>The name or Amazon Resource Name (ARN) of the lineage group.</p>
     * @public
     */
    LineageGroupName: string | undefined;
}
/**
 * @public
 */
export interface GetLineageGroupPolicyResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the lineage group.</p>
     * @public
     */
    LineageGroupArn?: string | undefined;
    /**
     * <p>The resource policy that gives access to the lineage group in another account.</p>
     * @public
     */
    ResourcePolicy?: string | undefined;
}
/**
 * @public
 */
export interface GetModelPackageGroupPolicyInput {
    /**
     * <p>The name of the model group for which to get the resource policy.</p>
     * @public
     */
    ModelPackageGroupName: string | undefined;
}
/**
 * @public
 */
export interface GetModelPackageGroupPolicyOutput {
    /**
     * <p>The resource policy for the model group.</p>
     * @public
     */
    ResourcePolicy: string | undefined;
}
/**
 * @public
 */
export interface GetSagemakerServicecatalogPortfolioStatusInput {
}
/**
 * @public
 */
export interface GetSagemakerServicecatalogPortfolioStatusOutput {
    /**
     * <p>Whether Service Catalog is enabled or disabled in SageMaker.</p>
     * @public
     */
    Status?: SagemakerServicecatalogStatus | undefined;
}
/**
 * <p>An object where you specify the anticipated traffic pattern for an endpoint.</p>
 * @public
 */
export interface ScalingPolicyObjective {
    /**
     * <p>The minimum number of expected requests to your endpoint per minute.</p>
     * @public
     */
    MinInvocationsPerMinute?: number | undefined;
    /**
     * <p>The maximum number of expected requests to your endpoint per minute.</p>
     * @public
     */
    MaxInvocationsPerMinute?: number | undefined;
}
/**
 * @public
 */
export interface GetScalingConfigurationRecommendationRequest {
    /**
     * <p>The name of a previously completed Inference Recommender job.</p>
     * @public
     */
    InferenceRecommendationsJobName: string | undefined;
    /**
     * <p>The recommendation ID of a previously completed inference recommendation. This ID should come from one of the recommendations returned by the job specified in the <code>InferenceRecommendationsJobName</code> field.</p> <p>Specify either this field or the <code>EndpointName</code> field.</p>
     * @public
     */
    RecommendationId?: string | undefined;
    /**
     * <p>The name of an endpoint benchmarked during a previously completed inference recommendation job. This name should come from one of the recommendations returned by the job specified in the <code>InferenceRecommendationsJobName</code> field.</p> <p>Specify either this field or the <code>RecommendationId</code> field.</p>
     * @public
     */
    EndpointName?: string | undefined;
    /**
     * <p>The percentage of how much utilization you want an instance to use before autoscaling. The default value is 50%.</p>
     * @public
     */
    TargetCpuUtilizationPerCore?: number | undefined;
    /**
     * <p>An object where you specify the anticipated traffic pattern for an endpoint.</p>
     * @public
     */
    ScalingPolicyObjective?: ScalingPolicyObjective | undefined;
}
/**
 * <p>The metric for a scaling policy.</p>
 * @public
 */
export interface ScalingPolicyMetric {
    /**
     * <p>The number of invocations sent to a model, normalized by <code>InstanceCount</code> in each ProductionVariant. <code>1/numberOfInstances</code> is sent as the value on each request, where <code>numberOfInstances</code> is the number of active instances for the ProductionVariant behind the endpoint at the time of the request.</p>
     * @public
     */
    InvocationsPerInstance?: number | undefined;
    /**
     * <p>The interval of time taken by a model to respond as viewed from SageMaker. This interval includes the local communication times taken to send the request and to fetch the response from the container of a model and the time taken to complete the inference in the container.</p>
     * @public
     */
    ModelLatency?: number | undefined;
}
/**
 * @public
 */
export interface GetScalingConfigurationRecommendationResponse {
    /**
     * <p>The name of a previously completed Inference Recommender job.</p>
     * @public
     */
    InferenceRecommendationsJobName?: string | undefined;
    /**
     * <p>The recommendation ID of a previously completed inference recommendation.</p>
     * @public
     */
    RecommendationId?: string | undefined;
    /**
     * <p>The name of an endpoint benchmarked during a previously completed Inference Recommender job.</p>
     * @public
     */
    EndpointName?: string | undefined;
    /**
     * <p>The percentage of how much utilization you want an instance to use before autoscaling, which you specified in the request. The default value is 50%.</p>
     * @public
     */
    TargetCpuUtilizationPerCore?: number | undefined;
    /**
     * <p>An object representing the anticipated traffic pattern for an endpoint that you specified in the request.</p>
     * @public
     */
    ScalingPolicyObjective?: ScalingPolicyObjective | undefined;
    /**
     * <p>An object with a list of metrics that were benchmarked during the previously completed Inference Recommender job.</p>
     * @public
     */
    Metric?: ScalingPolicyMetric | undefined;
    /**
     * <p>An object with the recommended values for you to specify when creating an autoscaling policy.</p>
     * @public
     */
    DynamicScalingConfiguration?: DynamicScalingConfiguration | undefined;
}
/**
 * <p>Part of the <code>SuggestionQuery</code> type. Specifies a hint for retrieving property names that begin with the specified text.</p>
 * @public
 */
export interface PropertyNameQuery {
    /**
     * <p>Text that begins a property's name.</p>
     * @public
     */
    PropertyNameHint: string | undefined;
}
/**
 * <p>Specified in the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_GetSearchSuggestions.html">GetSearchSuggestions</a> request. Limits the property names that are included in the response.</p>
 * @public
 */
export interface SuggestionQuery {
    /**
     * <p>Defines a property name hint. Only property names that begin with the specified hint are included in the response.</p>
     * @public
     */
    PropertyNameQuery?: PropertyNameQuery | undefined;
}
/**
 * @public
 */
export interface GetSearchSuggestionsRequest {
    /**
     * <p>The name of the SageMaker resource to search for.</p>
     * @public
     */
    Resource: ResourceType | undefined;
    /**
     * <p>Limits the property names that are included in the response.</p>
     * @public
     */
    SuggestionQuery?: SuggestionQuery | undefined;
}
/**
 * <p>A property name returned from a <code>GetSearchSuggestions</code> call that specifies a value in the <code>PropertyNameQuery</code> field.</p>
 * @public
 */
export interface PropertyNameSuggestion {
    /**
     * <p>A suggested property name based on what you entered in the search textbox in the SageMaker console.</p>
     * @public
     */
    PropertyName?: string | undefined;
}
/**
 * @public
 */
export interface GetSearchSuggestionsResponse {
    /**
     * <p>A list of property names for a <code>Resource</code> that match a <code>SuggestionQuery</code>.</p>
     * @public
     */
    PropertyNameSuggestions?: PropertyNameSuggestion[] | undefined;
}
/**
 * <p>Specifies configuration details for a Git repository when the repository is updated.</p>
 * @public
 */
export interface GitConfigForUpdate {
    /**
     * <p>The Amazon Resource Name (ARN) of the Amazon Web Services Secrets Manager secret that contains the credentials used to access the git repository. The secret must have a staging label of <code>AWSCURRENT</code> and must be in the following format:</p> <p> <code>\{"username": <i>UserName</i>, "password": <i>Password</i>\}</code> </p>
     * @public
     */
    SecretArn?: string | undefined;
}
/**
 * <p>Information about hub content.</p>
 * @public
 */
export interface HubContentInfo {
    /**
     * <p>The name of the hub content.</p>
     * @public
     */
    HubContentName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the hub content.</p>
     * @public
     */
    HubContentArn: string | undefined;
    /**
     * <p>The ARN of the public hub content.</p>
     * @public
     */
    SageMakerPublicHubContentArn?: string | undefined;
    /**
     * <p>The version of the hub content.</p>
     * @public
     */
    HubContentVersion: string | undefined;
    /**
     * <p>The type of hub content.</p>
     * @public
     */
    HubContentType: HubContentType | undefined;
    /**
     * <p>The version of the hub content document schema.</p>
     * @public
     */
    DocumentSchemaVersion: string | undefined;
    /**
     * <p>The display name of the hub content.</p>
     * @public
     */
    HubContentDisplayName?: string | undefined;
    /**
     * <p>A description of the hub content.</p>
     * @public
     */
    HubContentDescription?: string | undefined;
    /**
     * <p>The support status of the hub content.</p>
     * @public
     */
    SupportStatus?: HubContentSupportStatus | undefined;
    /**
     * <p>The searchable keywords for the hub content.</p>
     * @public
     */
    HubContentSearchKeywords?: string[] | undefined;
    /**
     * <p>The status of the hub content.</p>
     * @public
     */
    HubContentStatus: HubContentStatus | undefined;
    /**
     * <p>The date and time that the hub content was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The date and time when the hub content was originally created, before any updates or revisions.</p>
     * @public
     */
    OriginalCreationTime?: Date | undefined;
}
/**
 * <p>Information about a hub.</p>
 * @public
 */
export interface HubInfo {
    /**
     * <p>The name of the hub.</p>
     * @public
     */
    HubName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the hub.</p>
     * @public
     */
    HubArn: string | undefined;
    /**
     * <p>The display name of the hub.</p>
     * @public
     */
    HubDisplayName?: string | undefined;
    /**
     * <p>A description of the hub.</p>
     * @public
     */
    HubDescription?: string | undefined;
    /**
     * <p>The searchable keywords for the hub.</p>
     * @public
     */
    HubSearchKeywords?: string[] | undefined;
    /**
     * <p>The status of the hub.</p>
     * @public
     */
    HubStatus: HubStatus | undefined;
    /**
     * <p>The date and time that the hub was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The date and time that the hub was last modified.</p>
     * @public
     */
    LastModifiedTime: Date | undefined;
}
/**
 * <p>Container for human task user interface information.</p>
 * @public
 */
export interface HumanTaskUiSummary {
    /**
     * <p>The name of the human task user interface.</p>
     * @public
     */
    HumanTaskUiName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the human task user interface.</p>
     * @public
     */
    HumanTaskUiArn: string | undefined;
    /**
     * <p>A timestamp when SageMaker created the human task user interface.</p>
     * @public
     */
    CreationTime: Date | undefined;
}
/**
 * <p>An entity returned by the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_SearchRecord.html">SearchRecord</a> API containing the properties of a hyperparameter tuning job.</p>
 * @public
 */
export interface HyperParameterTuningJobSearchEntity {
    /**
     * <p>The name of a hyperparameter tuning job.</p>
     * @public
     */
    HyperParameterTuningJobName?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of a hyperparameter tuning job.</p>
     * @public
     */
    HyperParameterTuningJobArn?: string | undefined;
    /**
     * <p>Configures a hyperparameter tuning job.</p>
     * @public
     */
    HyperParameterTuningJobConfig?: HyperParameterTuningJobConfig | undefined;
    /**
     * <p>Defines the training jobs launched by a hyperparameter tuning job.</p>
     * @public
     */
    TrainingJobDefinition?: HyperParameterTrainingJobDefinition | undefined;
    /**
     * <p>The job definitions included in a hyperparameter tuning job.</p>
     * @public
     */
    TrainingJobDefinitions?: HyperParameterTrainingJobDefinition[] | undefined;
    /**
     * <p>The status of a hyperparameter tuning job.</p>
     * @public
     */
    HyperParameterTuningJobStatus?: HyperParameterTuningJobStatus | undefined;
    /**
     * <p>The time that a hyperparameter tuning job was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>The time that a hyperparameter tuning job ended.</p>
     * @public
     */
    HyperParameterTuningEndTime?: Date | undefined;
    /**
     * <p>The time that a hyperparameter tuning job was last modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>The numbers of training jobs launched by a hyperparameter tuning job, categorized by status.</p>
     * @public
     */
    TrainingJobStatusCounters?: TrainingJobStatusCounters | undefined;
    /**
     * <p>Specifies the number of training jobs that this hyperparameter tuning job launched, categorized by the status of their objective metric. The objective metric status shows whether the final objective metric for the training job has been evaluated by the tuning job and used in the hyperparameter tuning process.</p>
     * @public
     */
    ObjectiveStatusCounters?: ObjectiveStatusCounters | undefined;
    /**
     * <p>The container for the summary information about a training job.</p>
     * @public
     */
    BestTrainingJob?: HyperParameterTrainingJobSummary | undefined;
    /**
     * <p>The container for the summary information about a training job.</p>
     * @public
     */
    OverallBestTrainingJob?: HyperParameterTrainingJobSummary | undefined;
    /**
     * <p>Specifies the configuration for a hyperparameter tuning job that uses one or more previous hyperparameter tuning jobs as a starting point. The results of previous tuning jobs are used to inform which combinations of hyperparameters to search over in the new tuning job.</p> <p>All training jobs launched by the new hyperparameter tuning job are evaluated by using the objective metric, and the training job that performs the best is compared to the best training jobs from the parent tuning jobs. From these, the training job that performs the best as measured by the objective metric is returned as the overall best training job.</p> <note> <p>All training jobs launched by parent hyperparameter tuning jobs and the new hyperparameter tuning jobs count against the limit of training jobs for the tuning job.</p> </note>
     * @public
     */
    WarmStartConfig?: HyperParameterTuningJobWarmStartConfig | undefined;
    /**
     * <p>The error that was created when a hyperparameter tuning job failed.</p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>Information about either a current or completed hyperparameter tuning job.</p>
     * @public
     */
    TuningJobCompletionDetails?: HyperParameterTuningJobCompletionDetails | undefined;
    /**
     * <p>The total amount of resources consumed by a hyperparameter tuning job.</p>
     * @public
     */
    ConsumedResources?: HyperParameterTuningJobConsumedResources | undefined;
    /**
     * <p>The tags associated with a hyperparameter tuning job. For more information see <a href="https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html">Tagging Amazon Web Services resources</a>.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * <p>Provides summary information about a hyperparameter tuning job.</p>
 * @public
 */
export interface HyperParameterTuningJobSummary {
    /**
     * <p>The name of the tuning job.</p>
     * @public
     */
    HyperParameterTuningJobName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the tuning job.</p>
     * @public
     */
    HyperParameterTuningJobArn: string | undefined;
    /**
     * <p>The status of the tuning job.</p>
     * @public
     */
    HyperParameterTuningJobStatus: HyperParameterTuningJobStatus | undefined;
    /**
     * <p>Specifies the search strategy hyperparameter tuning uses to choose which hyperparameters to evaluate at each iteration.</p>
     * @public
     */
    Strategy: HyperParameterTuningJobStrategyType | undefined;
    /**
     * <p>The date and time that the tuning job was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The date and time that the tuning job ended.</p>
     * @public
     */
    HyperParameterTuningEndTime?: Date | undefined;
    /**
     * <p>The date and time that the tuning job was modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>The <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_TrainingJobStatusCounters.html">TrainingJobStatusCounters</a> object that specifies the numbers of training jobs, categorized by status, that this tuning job launched.</p>
     * @public
     */
    TrainingJobStatusCounters: TrainingJobStatusCounters | undefined;
    /**
     * <p>The <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_ObjectiveStatusCounters.html">ObjectiveStatusCounters</a> object that specifies the numbers of training jobs, categorized by objective metric status, that this tuning job launched.</p>
     * @public
     */
    ObjectiveStatusCounters: ObjectiveStatusCounters | undefined;
    /**
     * <p>The <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_ResourceLimits.html">ResourceLimits</a> object that specifies the maximum number of training jobs and parallel training jobs allowed for this tuning job.</p>
     * @public
     */
    ResourceLimits?: ResourceLimits | undefined;
}
/**
 * <p>A SageMaker AI image. A SageMaker AI image represents a set of container images that are derived from a common base container image. Each of these container images is represented by a SageMaker AI <code>ImageVersion</code>.</p>
 * @public
 */
export interface Image {
    /**
     * <p>When the image was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The description of the image.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>The name of the image as displayed.</p>
     * @public
     */
    DisplayName?: string | undefined;
    /**
     * <p>When a create, update, or delete operation fails, the reason for the failure.</p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>The ARN of the image.</p>
     * @public
     */
    ImageArn: string | undefined;
    /**
     * <p>The name of the image.</p>
     * @public
     */
    ImageName: string | undefined;
    /**
     * <p>The status of the image.</p>
     * @public
     */
    ImageStatus: ImageStatus | undefined;
    /**
     * <p>When the image was last modified.</p>
     * @public
     */
    LastModifiedTime: Date | undefined;
}
/**
 * <p>A version of a SageMaker AI <code>Image</code>. A version represents an existing container image.</p>
 * @public
 */
export interface ImageVersion {
    /**
     * <p>When the version was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>When a create or delete operation fails, the reason for the failure.</p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>The ARN of the image the version is based on.</p>
     * @public
     */
    ImageArn: string | undefined;
    /**
     * <p>The ARN of the version.</p>
     * @public
     */
    ImageVersionArn: string | undefined;
    /**
     * <p>The status of the version.</p>
     * @public
     */
    ImageVersionStatus: ImageVersionStatus | undefined;
    /**
     * <p>When the version was last modified.</p>
     * @public
     */
    LastModifiedTime: Date | undefined;
    /**
     * <p>The version number.</p>
     * @public
     */
    Version: number | undefined;
}
/**
 * @public
 */
export interface ImportHubContentRequest {
    /**
     * <p>The name of the hub content to import.</p>
     * @public
     */
    HubContentName: string | undefined;
    /**
     * <p>The version of the hub content to import.</p>
     * @public
     */
    HubContentVersion?: string | undefined;
    /**
     * <p>The type of hub content to import.</p>
     * @public
     */
    HubContentType: HubContentType | undefined;
    /**
     * <p>The version of the hub content schema to import.</p>
     * @public
     */
    DocumentSchemaVersion: string | undefined;
    /**
     * <p>The name of the hub to import content into.</p>
     * @public
     */
    HubName: string | undefined;
    /**
     * <p>The display name of the hub content to import.</p>
     * @public
     */
    HubContentDisplayName?: string | undefined;
    /**
     * <p>A description of the hub content to import.</p>
     * @public
     */
    HubContentDescription?: string | undefined;
    /**
     * <p>A string that provides a description of the hub content. This string can include links, tables, and standard markdown formating.</p>
     * @public
     */
    HubContentMarkdown?: string | undefined;
    /**
     * <p>The hub content document that describes information about the hub content such as type, associated containers, scripts, and more.</p>
     * @public
     */
    HubContentDocument: string | undefined;
    /**
     * <p>The status of the hub content resource.</p>
     * @public
     */
    SupportStatus?: HubContentSupportStatus | undefined;
    /**
     * <p>The searchable keywords of the hub content.</p>
     * @public
     */
    HubContentSearchKeywords?: string[] | undefined;
    /**
     * <p>Any tags associated with the hub content.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * @public
 */
export interface ImportHubContentResponse {
    /**
     * <p>The ARN of the hub that the content was imported into.</p>
     * @public
     */
    HubArn: string | undefined;
    /**
     * <p>The ARN of the hub content that was imported.</p>
     * @public
     */
    HubContentArn: string | undefined;
}
/**
 * <p> The metadata of the inference component. </p>
 * @public
 */
export interface InferenceComponentMetadata {
    /**
     * <p> The Amazon Resource Name (ARN) of the inference component. </p>
     * @public
     */
    Arn?: string | undefined;
}
/**
 * <p>A summary of the properties of an inference component.</p>
 * @public
 */
export interface InferenceComponentSummary {
    /**
     * <p>The time when the inference component was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the inference component.</p>
     * @public
     */
    InferenceComponentArn: string | undefined;
    /**
     * <p>The name of the inference component.</p>
     * @public
     */
    InferenceComponentName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the endpoint that hosts the inference component.</p>
     * @public
     */
    EndpointArn: string | undefined;
    /**
     * <p>The name of the endpoint that hosts the inference component.</p>
     * @public
     */
    EndpointName: string | undefined;
    /**
     * <p>The name of the production variant that hosts the inference component.</p>
     * @public
     */
    VariantName: string | undefined;
    /**
     * <p>The status of the inference component.</p>
     * @public
     */
    InferenceComponentStatus?: InferenceComponentStatus | undefined;
    /**
     * <p>The time when the inference component was last updated.</p>
     * @public
     */
    LastModifiedTime: Date | undefined;
}
/**
 * <p>Lists a summary of properties of an inference experiment.</p>
 * @public
 */
export interface InferenceExperimentSummary {
    /**
     * <p>The name of the inference experiment.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>The type of the inference experiment.</p>
     * @public
     */
    Type: InferenceExperimentType | undefined;
    /**
     * <p>The duration for which the inference experiment ran or will run.</p> <p>The maximum duration that you can set for an inference experiment is 30 days.</p>
     * @public
     */
    Schedule?: InferenceExperimentSchedule | undefined;
    /**
     * <p>The status of the inference experiment.</p>
     * @public
     */
    Status: InferenceExperimentStatus | undefined;
    /**
     * <p>The error message for the inference experiment status result.</p>
     * @public
     */
    StatusReason?: string | undefined;
    /**
     * <p>The description of the inference experiment.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>The timestamp at which the inference experiment was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The timestamp at which the inference experiment was completed.</p>
     * @public
     */
    CompletionTime?: Date | undefined;
    /**
     * <p>The timestamp when you last modified the inference experiment.</p>
     * @public
     */
    LastModifiedTime: Date | undefined;
    /**
     * <p> The ARN of the IAM role that Amazon SageMaker can assume to access model artifacts and container images, and manage Amazon SageMaker Inference endpoints for model deployment. </p>
     * @public
     */
    RoleArn?: string | undefined;
}
/**
 * <p>A structure that contains a list of recommendation jobs.</p>
 * @public
 */
export interface InferenceRecommendationsJob {
    /**
     * <p>The name of the job.</p>
     * @public
     */
    JobName: string | undefined;
    /**
     * <p>The job description.</p>
     * @public
     */
    JobDescription: string | undefined;
    /**
     * <p>The recommendation job type.</p>
     * @public
     */
    JobType: RecommendationJobType | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the recommendation job.</p>
     * @public
     */
    JobArn: string | undefined;
    /**
     * <p>The status of the job.</p>
     * @public
     */
    Status: RecommendationJobStatus | undefined;
    /**
     * <p>A timestamp that shows when the job was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>A timestamp that shows when the job completed.</p>
     * @public
     */
    CompletionTime?: Date | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an IAM role that enables Amazon SageMaker to perform tasks on your behalf.</p>
     * @public
     */
    RoleArn: string | undefined;
    /**
     * <p>A timestamp that shows when the job was last modified.</p>
     * @public
     */
    LastModifiedTime: Date | undefined;
    /**
     * <p>If the job fails, provides information why the job failed.</p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>The name of the created model.</p>
     * @public
     */
    ModelName?: string | undefined;
    /**
     * <p>The Amazon Simple Storage Service (Amazon S3) path where the sample payload is stored. This path must point to a single gzip compressed tar archive (.tar.gz suffix).</p>
     * @public
     */
    SamplePayloadUrl?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of a versioned model package.</p>
     * @public
     */
    ModelPackageVersionArn?: string | undefined;
}
/**
 * <p>The details for a specific benchmark from an Inference Recommender job.</p>
 * @public
 */
export interface RecommendationJobInferenceBenchmark {
    /**
     * <p>The metrics of recommendations.</p>
     * @public
     */
    Metrics?: RecommendationMetrics | undefined;
    /**
     * <p>The metrics for an existing endpoint compared in an Inference Recommender job.</p>
     * @public
     */
    EndpointMetrics?: InferenceMetrics | undefined;
    /**
     * <p>The endpoint configuration made by Inference Recommender during a recommendation job.</p>
     * @public
     */
    EndpointConfiguration?: EndpointOutputConfiguration | undefined;
    /**
     * <p>Defines the model configuration. Includes the specification name and environment parameters.</p>
     * @public
     */
    ModelConfiguration: ModelConfiguration | undefined;
    /**
     * <p>The reason why a benchmark failed.</p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>A timestamp that shows when the benchmark completed.</p>
     * @public
     */
    InvocationEndTime?: Date | undefined;
    /**
     * <p>A timestamp that shows when the benchmark started.</p>
     * @public
     */
    InvocationStartTime?: Date | undefined;
}
/**
 * <p>A returned array object for the <code>Steps</code> response field in the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_ListInferenceRecommendationsJobSteps.html">ListInferenceRecommendationsJobSteps</a> API command.</p>
 * @public
 */
export interface InferenceRecommendationsJobStep {
    /**
     * <p>The type of the subtask.</p> <p> <code>BENCHMARK</code>: Evaluate the performance of your model on different instance types.</p>
     * @public
     */
    StepType: RecommendationStepType | undefined;
    /**
     * <p>The name of the Inference Recommender job.</p>
     * @public
     */
    JobName: string | undefined;
    /**
     * <p>The current status of the benchmark.</p>
     * @public
     */
    Status: RecommendationJobStatus | undefined;
    /**
     * <p>The details for a specific benchmark.</p>
     * @public
     */
    InferenceBenchmark?: RecommendationJobInferenceBenchmark | undefined;
}
/**
 * <p>Provides counts for human-labeled tasks in the labeling job.</p>
 * @public
 */
export interface LabelCountersForWorkteam {
    /**
     * <p>The total number of data objects labeled by a human worker.</p>
     * @public
     */
    HumanLabeled?: number | undefined;
    /**
     * <p>The total number of data objects that need to be labeled by a human worker.</p>
     * @public
     */
    PendingHuman?: number | undefined;
    /**
     * <p>The total number of tasks in the labeling job.</p>
     * @public
     */
    Total?: number | undefined;
}
/**
 * <p>Provides summary information for a work team.</p>
 * @public
 */
export interface LabelingJobForWorkteamSummary {
    /**
     * <p>The name of the labeling job that the work team is assigned to.</p>
     * @public
     */
    LabelingJobName?: string | undefined;
    /**
     * <p>A unique identifier for a labeling job. You can use this to refer to a specific labeling job.</p>
     * @public
     */
    JobReferenceCode: string | undefined;
    /**
     * <p>The Amazon Web Services account ID of the account used to start the labeling job.</p>
     * @public
     */
    WorkRequesterAccountId: string | undefined;
    /**
     * <p>The date and time that the labeling job was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>Provides information about the progress of a labeling job.</p>
     * @public
     */
    LabelCounters?: LabelCountersForWorkteam | undefined;
    /**
     * <p>The configured number of workers per data object.</p>
     * @public
     */
    NumberOfHumanWorkersPerDataObject?: number | undefined;
}
/**
 * <p>Provides summary information about a labeling job.</p>
 * @public
 */
export interface LabelingJobSummary {
    /**
     * <p>The name of the labeling job.</p>
     * @public
     */
    LabelingJobName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) assigned to the labeling job when it was created.</p>
     * @public
     */
    LabelingJobArn: string | undefined;
    /**
     * <p>The date and time that the job was created (timestamp).</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The date and time that the job was last modified (timestamp).</p>
     * @public
     */
    LastModifiedTime: Date | undefined;
    /**
     * <p>The current status of the labeling job. </p>
     * @public
     */
    LabelingJobStatus: LabelingJobStatus | undefined;
    /**
     * <p>Counts showing the progress of the labeling job.</p>
     * @public
     */
    LabelCounters: LabelCounters | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the work team assigned to the job.</p>
     * @public
     */
    WorkteamArn: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of a Lambda function. The function is run before each data object is sent to a worker.</p>
     * @public
     */
    PreHumanTaskLambdaArn?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the Lambda function used to consolidate the annotations from individual workers into a label for a data object. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/sms-annotation-consolidation.html">Annotation Consolidation</a>.</p>
     * @public
     */
    AnnotationConsolidationLambdaArn?: string | undefined;
    /**
     * <p>If the <code>LabelingJobStatus</code> field is <code>Failed</code>, this field contains a description of the error.</p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>The location of the output produced by the labeling job.</p>
     * @public
     */
    LabelingJobOutput?: LabelingJobOutput | undefined;
    /**
     * <p>Input configuration for the labeling job.</p>
     * @public
     */
    InputConfig?: LabelingJobInputConfig | undefined;
}
/**
 * <p>Metadata for a Lambda step.</p>
 * @public
 */
export interface LambdaStepMetadata {
    /**
     * <p>The Amazon Resource Name (ARN) of the Lambda function that was run by this step execution.</p>
     * @public
     */
    Arn?: string | undefined;
    /**
     * <p>A list of the output parameters of the Lambda step.</p>
     * @public
     */
    OutputParameters?: OutputParameter[] | undefined;
}
/**
 * <p>Lists a summary of the properties of a lineage group. A lineage group provides a group of shareable lineage entity resources.</p>
 * @public
 */
export interface LineageGroupSummary {
    /**
     * <p>The Amazon Resource Name (ARN) of the lineage group resource.</p>
     * @public
     */
    LineageGroupArn?: string | undefined;
    /**
     * <p>The name or Amazon Resource Name (ARN) of the lineage group.</p>
     * @public
     */
    LineageGroupName?: string | undefined;
    /**
     * <p>The display name of the lineage group summary.</p>
     * @public
     */
    DisplayName?: string | undefined;
    /**
     * <p>The creation time of the lineage group summary.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>The last modified time of the lineage group summary.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
}
/**
 * <p> The metadata that tracks relationships between ML artifacts, actions, and contexts. </p>
 * @public
 */
export interface LineageMetadata {
    /**
     * <p> The Amazon Resource Name (ARN) of the lineage action. </p>
     * @public
     */
    ActionArns?: Record<string, string> | undefined;
    /**
     * <p> The Amazon Resource Name (ARN) of the lineage artifact. </p>
     * @public
     */
    ArtifactArns?: Record<string, string> | undefined;
    /**
     * <p> The Amazon Resource Name (ARN) of the lineage context. </p>
     * @public
     */
    ContextArns?: Record<string, string> | undefined;
    /**
     * <p> The lineage associations. </p>
     * @public
     */
    Associations?: AssociationInfo[] | undefined;
}
/**
 * @public
 */
export interface ListActionsRequest {
    /**
     * <p>A filter that returns only actions with the specified source URI.</p>
     * @public
     */
    SourceUri?: string | undefined;
    /**
     * <p>A filter that returns only actions of the specified type.</p>
     * @public
     */
    ActionType?: string | undefined;
    /**
     * <p>A filter that returns only actions created on or after the specified time.</p>
     * @public
     */
    CreatedAfter?: Date | undefined;
    /**
     * <p>A filter that returns only actions created on or before the specified time.</p>
     * @public
     */
    CreatedBefore?: Date | undefined;
    /**
     * <p>The property used to sort results. The default value is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: SortActionsBy | undefined;
    /**
     * <p>The sort order. The default value is <code>Descending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>If the previous call to <code>ListActions</code> didn't return the full set of actions, the call returns a token for getting the next set of actions.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of actions to return in the response. The default value is 10.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * @public
 */
export interface ListActionsResponse {
    /**
     * <p>A list of actions and their properties.</p>
     * @public
     */
    ActionSummaries?: ActionSummary[] | undefined;
    /**
     * <p>A token for getting the next set of actions, if there are any.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListAlgorithmsInput {
    /**
     * <p>A filter that returns only algorithms created after the specified time (timestamp).</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only algorithms created before the specified time (timestamp).</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>The maximum number of algorithms to return in the response.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>A string in the algorithm name. This filter returns only algorithms whose name contains the specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>If the response to a previous <code>ListAlgorithms</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of algorithms, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The parameter by which to sort the results. The default is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: AlgorithmSortBy | undefined;
    /**
     * <p>The sort order for the results. The default is <code>Ascending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
}
/**
 * @public
 */
export interface ListAlgorithmsOutput {
    /**
     * <p>&gt;An array of <code>AlgorithmSummary</code> objects, each of which lists an algorithm.</p>
     * @public
     */
    AlgorithmSummaryList: AlgorithmSummary[] | undefined;
    /**
     * <p>If the response is truncated, SageMaker returns this token. To retrieve the next set of algorithms, use it in the subsequent request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListAliasesRequest {
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
     * <p>The version of the image. If image version is not specified, the aliases of all versions of the image are listed.</p>
     * @public
     */
    Version?: number | undefined;
    /**
     * <p>The maximum number of aliases to return.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>If the previous call to <code>ListAliases</code> didn't return the full set of aliases, the call returns a token for retrieving the next set of aliases.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListAliasesResponse {
    /**
     * <p>A list of SageMaker AI image version aliases.</p>
     * @public
     */
    SageMakerImageVersionAliases?: string[] | undefined;
    /**
     * <p>A token for getting the next set of aliases, if more aliases exist.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListAppImageConfigsRequest {
    /**
     * <p>The total number of items to return in the response. If the total number of items available is more than the value specified, a <code>NextToken</code> is provided in the response. To resume pagination, provide the <code>NextToken</code> value in the as part of a subsequent call. The default value is 10.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>If the previous call to <code>ListImages</code> didn't return the full set of AppImageConfigs, the call returns a token for getting the next set of AppImageConfigs.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>A filter that returns only AppImageConfigs whose name contains the specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>A filter that returns only AppImageConfigs created on or before the specified time.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns only AppImageConfigs created on or after the specified time.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only AppImageConfigs modified on or before the specified time.</p>
     * @public
     */
    ModifiedTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns only AppImageConfigs modified on or after the specified time.</p>
     * @public
     */
    ModifiedTimeAfter?: Date | undefined;
    /**
     * <p>The property used to sort results. The default value is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: AppImageConfigSortKey | undefined;
    /**
     * <p>The sort order. The default value is <code>Descending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
}
/**
 * @public
 */
export interface ListAppImageConfigsResponse {
    /**
     * <p>A token for getting the next set of AppImageConfigs, if there are any.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>A list of AppImageConfigs and their properties.</p>
     * @public
     */
    AppImageConfigs?: AppImageConfigDetails[] | undefined;
}
/**
 * @public
 */
export interface ListAppsRequest {
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
    SortBy?: AppSortKey | undefined;
    /**
     * <p>A parameter to search for the domain ID.</p>
     * @public
     */
    DomainIdEquals?: string | undefined;
    /**
     * <p>A parameter to search by user profile name. If <code>SpaceNameEquals</code> is set, then this value cannot be set.</p>
     * @public
     */
    UserProfileNameEquals?: string | undefined;
    /**
     * <p>A parameter to search by space name. If <code>UserProfileNameEquals</code> is set, then this value cannot be set.</p>
     * @public
     */
    SpaceNameEquals?: string | undefined;
}
/**
 * @public
 */
export interface ListAppsResponse {
    /**
     * <p>The list of apps.</p>
     * @public
     */
    Apps?: AppDetails[] | undefined;
    /**
     * <p>If the previous response was truncated, you will receive this token. Use it in your next request to receive the next set of results.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListArtifactsRequest {
    /**
     * <p>A filter that returns only artifacts with the specified source URI.</p>
     * @public
     */
    SourceUri?: string | undefined;
    /**
     * <p>A filter that returns only artifacts of the specified type.</p>
     * @public
     */
    ArtifactType?: string | undefined;
    /**
     * <p>A filter that returns only artifacts created on or after the specified time.</p>
     * @public
     */
    CreatedAfter?: Date | undefined;
    /**
     * <p>A filter that returns only artifacts created on or before the specified time.</p>
     * @public
     */
    CreatedBefore?: Date | undefined;
    /**
     * <p>The property used to sort results. The default value is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: SortArtifactsBy | undefined;
    /**
     * <p>The sort order. The default value is <code>Descending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>If the previous call to <code>ListArtifacts</code> didn't return the full set of artifacts, the call returns a token for getting the next set of artifacts.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of artifacts to return in the response. The default value is 10.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * @public
 */
export interface ListArtifactsResponse {
    /**
     * <p>A list of artifacts and their properties.</p>
     * @public
     */
    ArtifactSummaries?: ArtifactSummary[] | undefined;
    /**
     * <p>A token for getting the next set of artifacts, if there are any.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListAssociationsRequest {
    /**
     * <p>A filter that returns only associations with the specified source ARN.</p>
     * @public
     */
    SourceArn?: string | undefined;
    /**
     * <p>A filter that returns only associations with the specified destination Amazon Resource Name (ARN).</p>
     * @public
     */
    DestinationArn?: string | undefined;
    /**
     * <p>A filter that returns only associations with the specified source type.</p>
     * @public
     */
    SourceType?: string | undefined;
    /**
     * <p>A filter that returns only associations with the specified destination type.</p>
     * @public
     */
    DestinationType?: string | undefined;
    /**
     * <p>A filter that returns only associations of the specified type.</p>
     * @public
     */
    AssociationType?: AssociationEdgeType | undefined;
    /**
     * <p>A filter that returns only associations created on or after the specified time.</p>
     * @public
     */
    CreatedAfter?: Date | undefined;
    /**
     * <p>A filter that returns only associations created on or before the specified time.</p>
     * @public
     */
    CreatedBefore?: Date | undefined;
    /**
     * <p>The property used to sort results. The default value is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: SortAssociationsBy | undefined;
    /**
     * <p>The sort order. The default value is <code>Descending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>If the previous call to <code>ListAssociations</code> didn't return the full set of associations, the call returns a token for getting the next set of associations.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of associations to return in the response. The default value is 10.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * @public
 */
export interface ListAssociationsResponse {
    /**
     * <p>A list of associations and their properties.</p>
     * @public
     */
    AssociationSummaries?: AssociationSummary[] | undefined;
    /**
     * <p>A token for getting the next set of associations, if there are any.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListAutoMLJobsRequest {
    /**
     * <p>Request a list of jobs, using a filter for time.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>Request a list of jobs, using a filter for time.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>Request a list of jobs, using a filter for time.</p>
     * @public
     */
    LastModifiedTimeAfter?: Date | undefined;
    /**
     * <p>Request a list of jobs, using a filter for time.</p>
     * @public
     */
    LastModifiedTimeBefore?: Date | undefined;
    /**
     * <p>Request a list of jobs, using a search filter for name.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>Request a list of jobs, using a filter for status.</p>
     * @public
     */
    StatusEquals?: AutoMLJobStatus | undefined;
    /**
     * <p>The sort order for the results. The default is <code>Descending</code>.</p>
     * @public
     */
    SortOrder?: AutoMLSortOrder | undefined;
    /**
     * <p>The parameter by which to sort the results. The default is <code>Name</code>.</p>
     * @public
     */
    SortBy?: AutoMLSortBy | undefined;
    /**
     * <p>Request a list of jobs up to a specified limit.</p>
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
 * @public
 */
export interface ListAutoMLJobsResponse {
    /**
     * <p>Returns a summary list of jobs.</p>
     * @public
     */
    AutoMLJobSummaries: AutoMLJobSummary[] | undefined;
    /**
     * <p>If the previous response was truncated, you receive this token. Use it in your next request to receive the next set of results.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListCandidatesForAutoMLJobRequest {
    /**
     * <p>List the candidates created for the job by providing the job's name.</p>
     * @public
     */
    AutoMLJobName: string | undefined;
    /**
     * <p>List the candidates for the job and filter by status.</p>
     * @public
     */
    StatusEquals?: CandidateStatus | undefined;
    /**
     * <p>List the candidates for the job and filter by candidate name.</p>
     * @public
     */
    CandidateNameEquals?: string | undefined;
    /**
     * <p>The sort order for the results. The default is <code>Ascending</code>.</p>
     * @public
     */
    SortOrder?: AutoMLSortOrder | undefined;
    /**
     * <p>The parameter by which to sort the results. The default is <code>Descending</code>.</p>
     * @public
     */
    SortBy?: CandidateSortBy | undefined;
    /**
     * <p>List the job's candidates up to a specified limit.</p>
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
 * @public
 */
export interface ListCandidatesForAutoMLJobResponse {
    /**
     * <p>Summaries about the <code>AutoMLCandidates</code>.</p>
     * @public
     */
    Candidates: AutoMLCandidate[] | undefined;
    /**
     * <p>If the previous response was truncated, you receive this token. Use it in your next request to receive the next set of results.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListClusterEventsRequest {
    /**
     * <p>The name or Amazon Resource Name (ARN) of the HyperPod cluster for which to list events.</p>
     * @public
     */
    ClusterName: string | undefined;
    /**
     * <p>The name of the instance group to filter events. If specified, only events related to this instance group are returned.</p>
     * @public
     */
    InstanceGroupName?: string | undefined;
    /**
     * <p>The EC2 instance ID to filter events. If specified, only events related to this instance are returned.</p>
     * @public
     */
    NodeId?: string | undefined;
    /**
     * <p>The start of the time range for filtering events. Only events that occurred after this time are included in the results.</p>
     * @public
     */
    EventTimeAfter?: Date | undefined;
    /**
     * <p>The end of the time range for filtering events. Only events that occurred before this time are included in the results.</p>
     * @public
     */
    EventTimeBefore?: Date | undefined;
    /**
     * <p>The field to use for sorting the event list. Currently, the only supported value is <code>EventTime</code>.</p>
     * @public
     */
    SortBy?: EventSortBy | undefined;
    /**
     * <p>The order in which to sort the results. Valid values are <code>Ascending</code> or <code>Descending</code> (the default is <code>Descending</code>).</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>The type of resource for which to filter events. Valid values are <code>Cluster</code>, <code>InstanceGroup</code>, or <code>Instance</code>.</p>
     * @public
     */
    ResourceType?: ClusterEventResourceType | undefined;
    /**
     * <p>The maximum number of events to return in the response. Valid range is 1 to 100.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>A token to retrieve the next set of results. This token is obtained from the output of a previous <code>ListClusterEvents</code> call.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListClusterEventsResponse {
    /**
     * <p>A token to retrieve the next set of results. Include this token in subsequent <code>ListClusterEvents</code> calls to fetch more events.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>A list of event summaries matching the specified criteria.</p>
     * @public
     */
    Events?: ClusterEventSummary[] | undefined;
}
/**
 * @public
 */
export interface ListClusterNodesRequest {
    /**
     * <p>The string name or the Amazon Resource Name (ARN) of the SageMaker HyperPod cluster in which you want to retrieve the list of nodes.</p>
     * @public
     */
    ClusterName: string | undefined;
    /**
     * <p>A filter that returns nodes in a SageMaker HyperPod cluster created after the specified time. Timestamps are formatted according to the ISO 8601 standard. </p> <p>Acceptable formats include:</p> <ul> <li> <p> <code>YYYY-MM-DDThh:mm:ss.sssTZD</code> (UTC), for example, <code>2014-10-01T20:30:00.000Z</code> </p> </li> <li> <p> <code>YYYY-MM-DDThh:mm:ss.sssTZD</code> (with offset), for example, <code>2014-10-01T12:30:00.000-08:00</code> </p> </li> <li> <p> <code>YYYY-MM-DD</code>, for example, <code>2014-10-01</code> </p> </li> <li> <p>Unix time in seconds, for example, <code>1412195400</code>. This is also referred to as Unix Epoch time and represents the number of seconds since midnight, January 1, 1970 UTC.</p> </li> </ul> <p>For more information about the timestamp format, see <a href="https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-parameters-types.html#parameter-type-timestamp">Timestamp</a> in the <i>Amazon Web Services Command Line Interface User Guide</i>.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns nodes in a SageMaker HyperPod cluster created before the specified time. The acceptable formats are the same as the timestamp formats for <code>CreationTimeAfter</code>. For more information about the timestamp format, see <a href="https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-parameters-types.html#parameter-type-timestamp">Timestamp</a> in the <i>Amazon Web Services Command Line Interface User Guide</i>.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns the instance groups whose name contain a specified string.</p>
     * @public
     */
    InstanceGroupNameContains?: string | undefined;
    /**
     * <p>The maximum number of nodes to return in the response.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>If the result of the previous <code>ListClusterNodes</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of cluster nodes, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The field by which to sort results. The default value is <code>CREATION_TIME</code>.</p>
     * @public
     */
    SortBy?: ClusterSortBy | undefined;
    /**
     * <p>The sort order for results. The default value is <code>Ascending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>Specifies whether to include nodes that are still being provisioned in the response. When set to true, the response includes all nodes regardless of their provisioning status. When set to <code>False</code> (default), only nodes with assigned <code>InstanceIds</code> are returned.</p>
     * @public
     */
    IncludeNodeLogicalIds?: boolean | undefined;
}
/**
 * @public
 */
export interface ListClusterNodesResponse {
    /**
     * <p>The next token specified for listing instances in a SageMaker HyperPod cluster.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The summaries of listed instances in a SageMaker HyperPod cluster</p>
     * @public
     */
    ClusterNodeSummaries: ClusterNodeSummary[] | undefined;
}
/**
 * @public
 */
export interface ListClustersRequest {
    /**
     * <p>Set a start time for the time range during which you want to list SageMaker HyperPod clusters. Timestamps are formatted according to the ISO 8601 standard. </p> <p>Acceptable formats include:</p> <ul> <li> <p> <code>YYYY-MM-DDThh:mm:ss.sssTZD</code> (UTC), for example, <code>2014-10-01T20:30:00.000Z</code> </p> </li> <li> <p> <code>YYYY-MM-DDThh:mm:ss.sssTZD</code> (with offset), for example, <code>2014-10-01T12:30:00.000-08:00</code> </p> </li> <li> <p> <code>YYYY-MM-DD</code>, for example, <code>2014-10-01</code> </p> </li> <li> <p>Unix time in seconds, for example, <code>1412195400</code>. This is also referred to as Unix Epoch time and represents the number of seconds since midnight, January 1, 1970 UTC.</p> </li> </ul> <p>For more information about the timestamp format, see <a href="https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-parameters-types.html#parameter-type-timestamp">Timestamp</a> in the <i>Amazon Web Services Command Line Interface User Guide</i>.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>Set an end time for the time range during which you want to list SageMaker HyperPod clusters. A filter that returns nodes in a SageMaker HyperPod cluster created before the specified time. The acceptable formats are the same as the timestamp formats for <code>CreationTimeAfter</code>. For more information about the timestamp format, see <a href="https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-parameters-types.html#parameter-type-timestamp">Timestamp</a> in the <i>Amazon Web Services Command Line Interface User Guide</i>.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>Specifies the maximum number of clusters to evaluate for the operation (not necessarily the number of matching items). After SageMaker processes the number of clusters up to <code>MaxResults</code>, it stops the operation and returns the matching clusters up to that point. If all the matching clusters are desired, SageMaker will go through all the clusters until <code>NextToken</code> is empty.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>Set the maximum number of instances to print in the list.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>Set the next token to retrieve the list of SageMaker HyperPod clusters.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The field by which to sort results. The default value is <code>CREATION_TIME</code>.</p>
     * @public
     */
    SortBy?: ClusterSortBy | undefined;
    /**
     * <p>The sort order for results. The default value is <code>Ascending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>The Amazon Resource Name (ARN); of the training plan to filter clusters by. For more information about reserving GPU capacity for your SageMaker HyperPod clusters using Amazon SageMaker Training Plan, see <code> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTrainingPlan.html">CreateTrainingPlan</a> </code>.</p>
     * @public
     */
    TrainingPlanArn?: string | undefined;
}
/**
 * @public
 */
export interface ListClustersResponse {
    /**
     * <p>If the result of the previous <code>ListClusters</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of clusters, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The summaries of listed SageMaker HyperPod clusters.</p>
     * @public
     */
    ClusterSummaries: ClusterSummary[] | undefined;
}
/**
 * @public
 */
export interface ListClusterSchedulerConfigsRequest {
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
     * <p>Filter for ARN of the cluster.</p>
     * @public
     */
    ClusterArn?: string | undefined;
    /**
     * <p>Filter for status.</p>
     * @public
     */
    Status?: SchedulerResourceStatus | undefined;
    /**
     * <p>Filter for sorting the list by a given value. For example, sort by name, creation time, or status.</p>
     * @public
     */
    SortBy?: SortClusterSchedulerConfigBy | undefined;
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
     * <p>The maximum number of cluster policies to list.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * @public
 */
export interface ListClusterSchedulerConfigsResponse {
    /**
     * <p>Summaries of the cluster policies.</p>
     * @public
     */
    ClusterSchedulerConfigSummaries?: ClusterSchedulerConfigSummary[] | undefined;
    /**
     * <p>If the previous response was truncated, you will receive this token. Use it in your next request to receive the next set of results.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListCodeRepositoriesInput {
    /**
     * <p>A filter that returns only Git repositories that were created after the specified time.</p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only Git repositories that were created before the specified time.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns only Git repositories that were last modified after the specified time.</p>
     * @public
     */
    LastModifiedTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns only Git repositories that were last modified before the specified time.</p>
     * @public
     */
    LastModifiedTimeBefore?: Date | undefined;
    /**
     * <p>The maximum number of Git repositories to return in the response.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>A string in the Git repositories name. This filter returns only repositories whose name contains the specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>If the result of a <code>ListCodeRepositoriesOutput</code> request was truncated, the response includes a <code>NextToken</code>. To get the next set of Git repositories, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The field to sort results by. The default is <code>Name</code>.</p>
     * @public
     */
    SortBy?: CodeRepositorySortBy | undefined;
    /**
     * <p>The sort order for results. The default is <code>Ascending</code>.</p>
     * @public
     */
    SortOrder?: CodeRepositorySortOrder | undefined;
}
/**
 * @public
 */
export interface ListCodeRepositoriesOutput {
    /**
     * <p>Gets a list of summaries of the Git repositories. Each summary specifies the following values for the repository: </p> <ul> <li> <p>Name</p> </li> <li> <p>Amazon Resource Name (ARN)</p> </li> <li> <p>Creation time</p> </li> <li> <p>Last modified time</p> </li> <li> <p>Configuration information, including the URL location of the repository and the ARN of the Amazon Web Services Secrets Manager secret that contains the credentials used to access the repository.</p> </li> </ul>
     * @public
     */
    CodeRepositorySummaryList: CodeRepositorySummary[] | undefined;
    /**
     * <p>If the result of a <code>ListCodeRepositoriesOutput</code> request was truncated, the response includes a <code>NextToken</code>. To get the next set of Git repositories, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListCompilationJobsRequest {
    /**
     * <p>If the result of the previous <code>ListCompilationJobs</code> request was truncated, the response includes a <code>NextToken</code>. To retrieve the next set of model compilation jobs, use the token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of model compilation jobs to return in the response.</p>
     * @public
     */
    MaxResults?: number | undefined;
    /**
     * <p>A filter that returns the model compilation jobs that were created after a specified time. </p>
     * @public
     */
    CreationTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns the model compilation jobs that were created before a specified time.</p>
     * @public
     */
    CreationTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns the model compilation jobs that were modified after a specified time.</p>
     * @public
     */
    LastModifiedTimeAfter?: Date | undefined;
    /**
     * <p>A filter that returns the model compilation jobs that were modified before a specified time.</p>
     * @public
     */
    LastModifiedTimeBefore?: Date | undefined;
    /**
     * <p>A filter that returns the model compilation jobs whose name contains a specified string.</p>
     * @public
     */
    NameContains?: string | undefined;
    /**
     * <p>A filter that retrieves model compilation jobs with a specific <code>CompilationJobStatus</code> status.</p>
     * @public
     */
    StatusEquals?: CompilationJobStatus | undefined;
    /**
     * <p>The field by which to sort results. The default is <code>CreationTime</code>.</p>
     * @public
     */
    SortBy?: ListCompilationJobsSortBy | undefined;
    /**
     * <p>The sort order for results. The default is <code>Ascending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
}
/**
 * @public
 */
export interface ListCompilationJobsResponse {
    /**
     * <p>An array of <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CompilationJobSummary.html">CompilationJobSummary</a> objects, each describing a model compilation job. </p>
     * @public
     */
    CompilationJobSummaries: CompilationJobSummary[] | undefined;
    /**
     * <p>If the response is truncated, Amazon SageMaker AI returns this <code>NextToken</code>. To retrieve the next set of model compilation jobs, use this token in the next request.</p>
     * @public
     */
    NextToken?: string | undefined;
}
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
 */
export interface ListMlflowAppsRequest {
    /**
     * <p>Use the <code>CreatedAfter</code> filter to only list MLflow Apps created after a specific date and time. Listed MLflow Apps are shown with a date and time such as <code>"2024-03-16T01:46:56+00:00"</code>. The <code>CreatedAfter</code> parameter takes in a Unix timestamp.</p>
     * @public
     */
    CreatedAfter?: Date | undefined;
    /**
     * <p>Use the <code>CreatedBefore</code> filter to only list MLflow Apps created before a specific date and time. Listed MLflow Apps are shown with a date and time such as <code>"2024-03-16T01:46:56+00:00"</code>. The <code>CreatedAfter</code> parameter takes in a Unix timestamp.</p>
     * @public
     */
    CreatedBefore?: Date | undefined;
    /**
     * <p>Filter for Mlflow apps with a specific creation status.</p>
     * @public
     */
    Status?: MlflowAppStatus | undefined;
    /**
     * <p>Filter for Mlflow Apps with the specified version.</p>
     * @public
     */
    MlflowVersion?: string | undefined;
    /**
     * <p>Filter for MLflow Apps with the specified default SageMaker Domain ID.</p>
     * @public
     */
    DefaultForDomainId?: string | undefined;
    /**
     * <p>Filter for MLflow Apps with the specified <code>AccountDefaultStatus</code>.</p>
     * @public
     */
    AccountDefaultStatus?: AccountDefaultStatus | undefined;
    /**
     * <p>Filter for MLflow Apps sorting by name, creation time, or creation status.</p>
     * @public
     */
    SortBy?: SortMlflowAppBy | undefined;
    /**
     * <p>Change the order of the listed MLflow Apps. By default, MLflow Apps are listed in <code>Descending</code> order by creation time. To change the list order, specify <code>SortOrder</code> to be <code>Ascending</code>.</p>
     * @public
     */
    SortOrder?: SortOrder | undefined;
    /**
     * <p>If the previous response was truncated, use this token in your next request to receive the next set of results.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of MLflow Apps to list.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * <p>The summary of the Mlflow App to list.</p>
 * @public
 */
export interface MlflowAppSummary {
    /**
     * <p>The ARN of a listed MLflow App.</p>
     * @public
     */
    Arn?: string | undefined;
    /**
     * <p>The name of the MLflow App.</p>
     * @public
     */
    Name?: string | undefined;
    /**
     * <p>The status of the MLflow App.</p>
     * @public
     */
    Status?: MlflowAppStatus | undefined;
    /**
     * <p>The creation time of a listed MLflow App.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>The last modified time of a listed MLflow App.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>The version of a listed MLflow App.</p>
     * @public
     */
    MlflowVersion?: string | undefined;
}
/**
 * @public
 */
export interface ListMlflowAppsResponse {
    /**
     * <p>A list of MLflow Apps according to chosen filters.</p>
     * @public
     */
    Summaries?: MlflowAppSummary[] | undefined;
    /**
     * <p>If the previous response was truncated, you will receive this token. Use it in your next request to receive the next set of results.</p>
     * @public
     */
    NextToken?: string | undefined;
}
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
    /**
     * <p> The package registration type of the model package summary. </p>
     * @public
     */
    ModelPackageRegistrationType?: ModelPackageRegistrationType | undefined;
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
     * <p>The maximum number of instances to use for the optimization job.</p>
     * @public
     */
    MaxInstanceCount?: number | undefined;
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
    /**
     * <p> The metadata of the Amazon Bedrock custom model used in the pipeline execution step. </p>
     * @public
     */
    BedrockCustomModel?: BedrockCustomModelMetadata | undefined;
    /**
     * <p> The metadata of the Amazon Bedrock custom model deployment used in pipeline execution step. </p>
     * @public
     */
    BedrockCustomModelDeployment?: BedrockCustomModelDeploymentMetadata | undefined;
    /**
     * <p> The metadata of the Amazon Bedrock provisioned model throughput used in the pipeline execution step. </p>
     * @public
     */
    BedrockProvisionedModelThroughput?: BedrockProvisionedModelThroughputMetadata | undefined;
    /**
     * <p> The metadata of Amazon Bedrock model import used in pipeline execution step. </p>
     * @public
     */
    BedrockModelImport?: BedrockModelImportMetadata | undefined;
    /**
     * <p> The metadata of the inference component used in pipeline execution step. </p>
     * @public
     */
    InferenceComponent?: InferenceComponentMetadata | undefined;
    /**
     * <p> The metadata of the lineage used in pipeline execution step. </p>
     * @public
     */
    Lineage?: LineageMetadata | undefined;
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
