import { ActionSource, ActionStatus, ActivationState, AlgorithmSpecification, AlgorithmStatus, AlgorithmStatusDetails, AlgorithmValidationSpecification, AppNetworkAccessType, AppSecurityGroupManagement, AppSpecification, AppStatus, AppType, ArtifactSource, AsyncInferenceConfig, AthenaDatasetDefinition, AuthMode, AutoMLCandidate, AutoMLChannel, AutoMLComputeConfig, AutoMLDataSplitConfig, AutoMLJobArtifacts, AutoMLJobChannel, AutoMLJobCompletionCriteria, AutoMLJobConfig, AutoMLJobObjective, AutoMLJobSecondaryStatus, AutoMLJobStatus, AutoMLOutputDataConfig, AutoMLPartialFailureReason, AutoMLProblemTypeConfig, AutoMLProblemTypeConfigName, AutoMLResolvedAttributes, AutoMLSecurityConfig, BatchDataCaptureConfig, BatchStrategy, BatchTransformInput, CaptureStatus, Channel, CheckpointConfig, ClusterInstanceGroupDetails, ClusterNodeDetails, ClusterNodeRecovery, ClusterOrchestrator, ClusterStatus, CodeEditorAppImageConfig, CodeRepository, CognitoConfig, CognitoMemberDefinition, CollectionConfiguration, CompilationJobStatus, ComputeQuotaConfig, ComputeQuotaTarget, FeatureStatus, GitConfig, InferenceSpecification, JupyterLabAppImageConfig, KernelGatewayImageConfig, OutputDataConfig, ProblemType, ProcessingS3DataDistributionType, ProcessingS3InputMode, ProductionVariantInstanceType, ResourceConfig, ResourceSpec, SchedulerResourceStatus, StoppingCondition, Tag, TransformInput, TransformOutput, TransformResources, UserContext, VpcConfig } from "./models_0";
import { _InstanceType, ContextSource, DataCaptureConfig, DataQualityAppSpecification, DataQualityBaselineConfig, DataQualityJobInput, DefaultSpaceSettings, DeploymentConfig, DeviceSelectionConfig, DomainSettings, EdgeDeploymentConfig, EdgeDeploymentModelConfig, EdgeOutputConfig, EdgePresetDeploymentType, EndpointInput, ExplainerConfig, FeatureDefinition, FeatureType, FlowDefinitionOutputConfig, HumanLoopActivationConfig, HumanLoopConfig, HumanLoopRequestSource, InputConfig, JupyterServerAppSettings, KernelGatewayAppSettings, MetadataProperties, ModelDeployConfig, MonitoringAppSpecification, MonitoringBaselineConfig, MonitoringNetworkConfig, MonitoringOutputConfig, MonitoringResources, MonitoringStoppingCondition, NeoVpcConfig, OfflineStoreConfig, OnlineStoreConfig, OutputConfig, ProcessingInstanceType, ProcessingS3UploadMode, ProductionVariant, ProductionVariantAcceleratorType, ProductionVariantManagedInstanceScaling, ProductionVariantRoutingConfig, ProductionVariantServerlessConfig, RetryStrategy, SchedulerConfig, TagPropagation, ThroughputMode, TrainingSpecification, UserSettings } from "./models_1";
/**
 * <p>The inputs for a monitoring job.</p>
 * @public
 */
export interface MonitoringInput {
    /**
     * <p>The endpoint for a monitoring job.</p>
     * @public
     */
    EndpointInput?: EndpointInput | undefined;
    /**
     * <p>Input object for the batch transform job.</p>
     * @public
     */
    BatchTransformInput?: BatchTransformInput | undefined;
}
/**
 * <p>Networking options for a job, such as network traffic encryption between containers, whether to allow inbound and outbound network calls to and from containers, and the VPC subnets and security groups to use for VPC-enabled jobs.</p>
 * @public
 */
export interface NetworkConfig {
    /**
     * <p>Whether to encrypt all communications between distributed processing jobs. Choose <code>True</code> to encrypt communications. Encryption provides greater security for distributed processing jobs, but the processing might take longer.</p>
     * @public
     */
    EnableInterContainerTrafficEncryption?: boolean | undefined;
    /**
     * <p>Whether to allow inbound and outbound network calls to and from the containers used for the processing job.</p>
     * @public
     */
    EnableNetworkIsolation?: boolean | undefined;
    /**
     * <p>Specifies an Amazon Virtual Private Cloud (VPC) that your SageMaker jobs, hosted models, and compute resources have access to. You can control access to and from your resources by configuring a VPC. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/infrastructure-give-access.html">Give SageMaker Access to Resources in your Amazon VPC</a>. </p>
     * @public
     */
    VpcConfig?: VpcConfig | undefined;
}
/**
 * <p>Defines the monitoring job.</p>
 * @public
 */
export interface MonitoringJobDefinition {
    /**
     * <p>Baseline configuration used to validate that the data conforms to the specified constraints and statistics</p>
     * @public
     */
    BaselineConfig?: MonitoringBaselineConfig | undefined;
    /**
     * <p>The array of inputs for the monitoring job. Currently we support monitoring an Amazon SageMaker AI Endpoint.</p>
     * @public
     */
    MonitoringInputs: MonitoringInput[] | undefined;
    /**
     * <p>The array of outputs from the monitoring job to be uploaded to Amazon S3.</p>
     * @public
     */
    MonitoringOutputConfig: MonitoringOutputConfig | undefined;
    /**
     * <p>Identifies the resources, ML compute instances, and ML storage volumes to deploy for a monitoring job. In distributed processing, you specify more than one instance.</p>
     * @public
     */
    MonitoringResources: MonitoringResources | undefined;
    /**
     * <p>Configures the monitoring job to run a specified Docker container image.</p>
     * @public
     */
    MonitoringAppSpecification: MonitoringAppSpecification | undefined;
    /**
     * <p>Specifies a time limit for how long the monitoring job is allowed to run.</p>
     * @public
     */
    StoppingCondition?: MonitoringStoppingCondition | undefined;
    /**
     * <p>Sets the environment variables in the Docker container.</p>
     * @public
     */
    Environment?: Record<string, string> | undefined;
    /**
     * <p>Specifies networking options for an monitoring job.</p>
     * @public
     */
    NetworkConfig?: NetworkConfig | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an IAM role that Amazon SageMaker AI can assume to perform tasks on your behalf.</p>
     * @public
     */
    RoleArn: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const MonitoringType: {
    readonly DATA_QUALITY: "DataQuality";
    readonly MODEL_BIAS: "ModelBias";
    readonly MODEL_EXPLAINABILITY: "ModelExplainability";
    readonly MODEL_QUALITY: "ModelQuality";
};
/**
 * @public
 */
export type MonitoringType = (typeof MonitoringType)[keyof typeof MonitoringType];
/**
 * <p>Configuration details about the monitoring schedule.</p>
 * @public
 */
export interface ScheduleConfig {
    /**
     * <p>A cron expression that describes details about the monitoring schedule.</p> <p>The supported cron expressions are:</p> <ul> <li> <p>If you want to set the job to start every hour, use the following:</p> <p> <code>Hourly: cron(0 * ? * * *)</code> </p> </li> <li> <p>If you want to start the job daily:</p> <p> <code>cron(0 [00-23] ? * * *)</code> </p> </li> <li> <p>If you want to run the job one time, immediately, use the following keyword:</p> <p> <code>NOW</code> </p> </li> </ul> <p>For example, the following are valid cron expressions:</p> <ul> <li> <p>Daily at noon UTC: <code>cron(0 12 ? * * *)</code> </p> </li> <li> <p>Daily at midnight UTC: <code>cron(0 0 ? * * *)</code> </p> </li> </ul> <p>To support running every 6, 12 hours, the following are also supported:</p> <p> <code>cron(0 [00-23]/[01-24] ? * * *)</code> </p> <p>For example, the following are valid cron expressions:</p> <ul> <li> <p>Every 12 hours, starting at 5pm UTC: <code>cron(0 17/12 ? * * *)</code> </p> </li> <li> <p>Every two hours starting at midnight: <code>cron(0 0/2 ? * * *)</code> </p> </li> </ul> <note> <ul> <li> <p>Even though the cron expression is set to start at 5PM UTC, note that there could be a delay of 0-20 minutes from the actual requested time to run the execution. </p> </li> <li> <p>We recommend that if you would like a daily schedule, you do not provide this parameter. Amazon SageMaker AI will pick a time for running every day.</p> </li> </ul> </note> <p>You can also specify the keyword <code>NOW</code> to run the monitoring job immediately, one time, without recurring.</p>
     * @public
     */
    ScheduleExpression: string | undefined;
    /**
     * <p>Sets the start time for a monitoring job window. Express this time as an offset to the times that you schedule your monitoring jobs to run. You schedule monitoring jobs with the <code>ScheduleExpression</code> parameter. Specify this offset in ISO 8601 duration format. For example, if you want to monitor the five hours of data in your dataset that precede the start of each monitoring job, you would specify: <code>"-PT5H"</code>.</p> <p>The start time that you specify must not precede the end time that you specify by more than 24 hours. You specify the end time with the <code>DataAnalysisEndTime</code> parameter.</p> <p>If you set <code>ScheduleExpression</code> to <code>NOW</code>, this parameter is required.</p>
     * @public
     */
    DataAnalysisStartTime?: string | undefined;
    /**
     * <p>Sets the end time for a monitoring job window. Express this time as an offset to the times that you schedule your monitoring jobs to run. You schedule monitoring jobs with the <code>ScheduleExpression</code> parameter. Specify this offset in ISO 8601 duration format. For example, if you want to end the window one hour before the start of each monitoring job, you would specify: <code>"-PT1H"</code>.</p> <p>The end time that you specify must not follow the start time that you specify by more than 24 hours. You specify the start time with the <code>DataAnalysisStartTime</code> parameter.</p> <p>If you set <code>ScheduleExpression</code> to <code>NOW</code>, this parameter is required.</p>
     * @public
     */
    DataAnalysisEndTime?: string | undefined;
}
/**
 * <p>Configures the monitoring schedule and defines the monitoring job.</p>
 * @public
 */
export interface MonitoringScheduleConfig {
    /**
     * <p>Configures the monitoring schedule.</p>
     * @public
     */
    ScheduleConfig?: ScheduleConfig | undefined;
    /**
     * <p>Defines the monitoring job.</p>
     * @public
     */
    MonitoringJobDefinition?: MonitoringJobDefinition | undefined;
    /**
     * <p>The name of the monitoring job definition to schedule.</p>
     * @public
     */
    MonitoringJobDefinitionName?: string | undefined;
    /**
     * <p>The type of the monitoring job definition to schedule.</p>
     * @public
     */
    MonitoringType?: MonitoringType | undefined;
}
/**
 * @public
 */
export interface CreateMonitoringScheduleRequest {
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
    /**
     * <p>(Optional) An array of key-value pairs. For more information, see <a href=" https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html#allocation-whatURL">Using Cost Allocation Tags</a> in the <i>Amazon Web Services Billing and Cost Management User Guide</i>.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * @public
 */
export interface CreateMonitoringScheduleResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the monitoring schedule.</p>
     * @public
     */
    MonitoringScheduleArn: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const NotebookInstanceAcceleratorType: {
    readonly ML_EIA1_LARGE: "ml.eia1.large";
    readonly ML_EIA1_MEDIUM: "ml.eia1.medium";
    readonly ML_EIA1_XLARGE: "ml.eia1.xlarge";
    readonly ML_EIA2_LARGE: "ml.eia2.large";
    readonly ML_EIA2_MEDIUM: "ml.eia2.medium";
    readonly ML_EIA2_XLARGE: "ml.eia2.xlarge";
};
/**
 * @public
 */
export type NotebookInstanceAcceleratorType = (typeof NotebookInstanceAcceleratorType)[keyof typeof NotebookInstanceAcceleratorType];
/**
 * @public
 * @enum
 */
export declare const DirectInternetAccess: {
    readonly DISABLED: "Disabled";
    readonly ENABLED: "Enabled";
};
/**
 * @public
 */
export type DirectInternetAccess = (typeof DirectInternetAccess)[keyof typeof DirectInternetAccess];
/**
 * <p>Information on the IMDS configuration of the notebook instance</p>
 * @public
 */
export interface InstanceMetadataServiceConfiguration {
    /**
     * <p>Indicates the minimum IMDS version that the notebook instance supports. When passed as part of <code>CreateNotebookInstance</code>, if no value is selected, then it defaults to IMDSv1. This means that both IMDSv1 and IMDSv2 are supported. If passed as part of <code>UpdateNotebookInstance</code>, there is no default.</p>
     * @public
     */
    MinimumInstanceMetadataServiceVersion: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const RootAccess: {
    readonly DISABLED: "Disabled";
    readonly ENABLED: "Enabled";
};
/**
 * @public
 */
export type RootAccess = (typeof RootAccess)[keyof typeof RootAccess];
/**
 * @public
 */
export interface CreateNotebookInstanceInput {
    /**
     * <p>The name of the new notebook instance.</p>
     * @public
     */
    NotebookInstanceName: string | undefined;
    /**
     * <p>The type of ML compute instance to launch for the notebook instance.</p>
     * @public
     */
    InstanceType: _InstanceType | undefined;
    /**
     * <p>The ID of the subnet in a VPC to which you would like to have a connectivity from your ML compute instance. </p>
     * @public
     */
    SubnetId?: string | undefined;
    /**
     * <p>The VPC security group IDs, in the form sg-xxxxxxxx. The security groups must be for the same VPC as specified in the subnet. </p>
     * @public
     */
    SecurityGroupIds?: string[] | undefined;
    /**
     * <p> When you send any requests to Amazon Web Services resources from the notebook instance, SageMaker AI assumes this role to perform tasks on your behalf. You must grant this role necessary permissions so SageMaker AI can perform these tasks. The policy must allow the SageMaker AI service principal (sagemaker.amazonaws.com) permissions to assume this role. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-roles.html">SageMaker AI Roles</a>. </p> <note> <p>To be able to pass this role to SageMaker AI, the caller of this API must have the <code>iam:PassRole</code> permission.</p> </note>
     * @public
     */
    RoleArn: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of a Amazon Web Services Key Management Service key that SageMaker AI uses to encrypt data on the storage volume attached to your notebook instance. The KMS key you provide must be enabled. For information, see <a href="https://docs.aws.amazon.com/kms/latest/developerguide/enabling-keys.html">Enabling and Disabling Keys</a> in the <i>Amazon Web Services Key Management Service Developer Guide</i>.</p>
     * @public
     */
    KmsKeyId?: string | undefined;
    /**
     * <p>An array of key-value pairs. You can use tags to categorize your Amazon Web Services resources in different ways, for example, by purpose, owner, or environment. For more information, see <a href="https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html">Tagging Amazon Web Services Resources</a>.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>The name of a lifecycle configuration to associate with the notebook instance. For information about lifestyle configurations, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/notebook-lifecycle-config.html">Step 2.1: (Optional) Customize a Notebook Instance</a>.</p>
     * @public
     */
    LifecycleConfigName?: string | undefined;
    /**
     * <p>Sets whether SageMaker AI provides internet access to the notebook instance. If you set this to <code>Disabled</code> this notebook instance is able to access resources only in your VPC, and is not be able to connect to SageMaker AI training and endpoint services unless you configure a NAT Gateway in your VPC.</p> <p>For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/appendix-additional-considerations.html#appendix-notebook-and-internet-access">Notebook Instances Are Internet-Enabled by Default</a>. You can set the value of this parameter to <code>Disabled</code> only if you set a value for the <code>SubnetId</code> parameter.</p>
     * @public
     */
    DirectInternetAccess?: DirectInternetAccess | undefined;
    /**
     * <p>The size, in GB, of the ML storage volume to attach to the notebook instance. The default value is 5 GB.</p>
     * @public
     */
    VolumeSizeInGB?: number | undefined;
    /**
     * <p>This parameter is no longer supported. Elastic Inference (EI) is no longer available.</p> <p>This parameter was used to specify a list of EI instance types to associate with this notebook instance.</p>
     * @public
     */
    AcceleratorTypes?: NotebookInstanceAcceleratorType[] | undefined;
    /**
     * <p>A Git repository to associate with the notebook instance as its default code repository. This can be either the name of a Git repository stored as a resource in your account, or the URL of a Git repository in <a href="https://docs.aws.amazon.com/codecommit/latest/userguide/welcome.html">Amazon Web Services CodeCommit</a> or in any other Git repository. When you open a notebook instance, it opens in the directory that contains this repository. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/nbi-git-repo.html">Associating Git Repositories with SageMaker AI Notebook Instances</a>.</p>
     * @public
     */
    DefaultCodeRepository?: string | undefined;
    /**
     * <p>An array of up to three Git repositories to associate with the notebook instance. These can be either the names of Git repositories stored as resources in your account, or the URL of Git repositories in <a href="https://docs.aws.amazon.com/codecommit/latest/userguide/welcome.html">Amazon Web Services CodeCommit</a> or in any other Git repository. These repositories are cloned at the same level as the default repository of your notebook instance. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/nbi-git-repo.html">Associating Git Repositories with SageMaker AI Notebook Instances</a>.</p>
     * @public
     */
    AdditionalCodeRepositories?: string[] | undefined;
    /**
     * <p>Whether root access is enabled or disabled for users of the notebook instance. The default value is <code>Enabled</code>.</p> <note> <p>Lifecycle configurations need root access to be able to set up a notebook instance. Because of this, lifecycle configurations associated with a notebook instance always run with root access even if you disable root access for users.</p> </note>
     * @public
     */
    RootAccess?: RootAccess | undefined;
    /**
     * <p>The platform identifier of the notebook instance runtime environment.</p>
     * @public
     */
    PlatformIdentifier?: string | undefined;
    /**
     * <p>Information on the IMDS configuration of the notebook instance</p>
     * @public
     */
    InstanceMetadataServiceConfiguration?: InstanceMetadataServiceConfiguration | undefined;
}
/**
 * @public
 */
export interface CreateNotebookInstanceOutput {
    /**
     * <p>The Amazon Resource Name (ARN) of the notebook instance. </p>
     * @public
     */
    NotebookInstanceArn?: string | undefined;
}
/**
 * <p>Contains the notebook instance lifecycle configuration script.</p> <p>Each lifecycle configuration script has a limit of 16384 characters.</p> <p>The value of the <code>$PATH</code> environment variable that is available to both scripts is <code>/sbin:bin:/usr/sbin:/usr/bin</code>.</p> <p>View Amazon CloudWatch Logs for notebook instance lifecycle configurations in log group <code>/aws/sagemaker/NotebookInstances</code> in log stream <code>[notebook-instance-name]/[LifecycleConfigHook]</code>.</p> <p>Lifecycle configuration scripts cannot run for longer than 5 minutes. If a script runs for longer than 5 minutes, it fails and the notebook instance is not created or started.</p> <p>For information about notebook instance lifestyle configurations, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/notebook-lifecycle-config.html">Step 2.1: (Optional) Customize a Notebook Instance</a>.</p>
 * @public
 */
export interface NotebookInstanceLifecycleHook {
    /**
     * <p>A base64-encoded string that contains a shell script for a notebook instance lifecycle configuration.</p>
     * @public
     */
    Content?: string | undefined;
}
/**
 * @public
 */
export interface CreateNotebookInstanceLifecycleConfigInput {
    /**
     * <p>The name of the lifecycle configuration.</p>
     * @public
     */
    NotebookInstanceLifecycleConfigName: string | undefined;
    /**
     * <p>A shell script that runs only once, when you create a notebook instance. The shell script must be a base64-encoded string.</p>
     * @public
     */
    OnCreate?: NotebookInstanceLifecycleHook[] | undefined;
    /**
     * <p>A shell script that runs every time you start a notebook instance, including when you create the notebook instance. The shell script must be a base64-encoded string.</p>
     * @public
     */
    OnStart?: NotebookInstanceLifecycleHook[] | undefined;
    /**
     * <p>An array of key-value pairs. You can use tags to categorize your Amazon Web Services resources in different ways, for example, by purpose, owner, or environment. For more information, see <a href="https://docs.aws.amazon.com/tag-editor/latest/userguide/tagging.html">Tagging Amazon Web Services Resources</a>.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * @public
 */
export interface CreateNotebookInstanceLifecycleConfigOutput {
    /**
     * <p>The Amazon Resource Name (ARN) of the lifecycle configuration.</p>
     * @public
     */
    NotebookInstanceLifecycleConfigArn?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const OptimizationJobDeploymentInstanceType: {
    readonly ML_G5_12XLARGE: "ml.g5.12xlarge";
    readonly ML_G5_16XLARGE: "ml.g5.16xlarge";
    readonly ML_G5_24XLARGE: "ml.g5.24xlarge";
    readonly ML_G5_2XLARGE: "ml.g5.2xlarge";
    readonly ML_G5_48XLARGE: "ml.g5.48xlarge";
    readonly ML_G5_4XLARGE: "ml.g5.4xlarge";
    readonly ML_G5_8XLARGE: "ml.g5.8xlarge";
    readonly ML_G5_XLARGE: "ml.g5.xlarge";
    readonly ML_G6E_12XLARGE: "ml.g6e.12xlarge";
    readonly ML_G6E_16XLARGE: "ml.g6e.16xlarge";
    readonly ML_G6E_24XLARGE: "ml.g6e.24xlarge";
    readonly ML_G6E_2XLARGE: "ml.g6e.2xlarge";
    readonly ML_G6E_48XLARGE: "ml.g6e.48xlarge";
    readonly ML_G6E_4XLARGE: "ml.g6e.4xlarge";
    readonly ML_G6E_8XLARGE: "ml.g6e.8xlarge";
    readonly ML_G6E_XLARGE: "ml.g6e.xlarge";
    readonly ML_G6_12XLARGE: "ml.g6.12xlarge";
    readonly ML_G6_16XLARGE: "ml.g6.16xlarge";
    readonly ML_G6_24XLARGE: "ml.g6.24xlarge";
    readonly ML_G6_2XLARGE: "ml.g6.2xlarge";
    readonly ML_G6_48XLARGE: "ml.g6.48xlarge";
    readonly ML_G6_4XLARGE: "ml.g6.4xlarge";
    readonly ML_G6_8XLARGE: "ml.g6.8xlarge";
    readonly ML_G6_XLARGE: "ml.g6.xlarge";
    readonly ML_INF2_24XLARGE: "ml.inf2.24xlarge";
    readonly ML_INF2_48XLARGE: "ml.inf2.48xlarge";
    readonly ML_INF2_8XLARGE: "ml.inf2.8xlarge";
    readonly ML_INF2_XLARGE: "ml.inf2.xlarge";
    readonly ML_P4DE_24XLARGE: "ml.p4de.24xlarge";
    readonly ML_P4D_24XLARGE: "ml.p4d.24xlarge";
    readonly ML_P5_48XLARGE: "ml.p5.48xlarge";
    readonly ML_TRN1N_32XLARGE: "ml.trn1n.32xlarge";
    readonly ML_TRN1_2XLARGE: "ml.trn1.2xlarge";
    readonly ML_TRN1_32XLARGE: "ml.trn1.32xlarge";
};
/**
 * @public
 */
export type OptimizationJobDeploymentInstanceType = (typeof OptimizationJobDeploymentInstanceType)[keyof typeof OptimizationJobDeploymentInstanceType];
/**
 * <p>The access configuration settings for the source ML model for an optimization job, where you can accept the model end-user license agreement (EULA).</p>
 * @public
 */
export interface OptimizationModelAccessConfig {
    /**
     * <p>Specifies agreement to the model end-user license agreement (EULA). The <code>AcceptEula</code> value must be explicitly defined as <code>True</code> in order to accept the EULA that this model requires. You are responsible for reviewing and complying with any applicable license terms and making sure they are acceptable for your use case before downloading or using a model.</p>
     * @public
     */
    AcceptEula: boolean | undefined;
}
/**
 * <p>The Amazon S3 location of a source model to optimize with an optimization job.</p>
 * @public
 */
export interface OptimizationJobModelSourceS3 {
    /**
     * <p>An Amazon S3 URI that locates a source model to optimize with an optimization job.</p>
     * @public
     */
    S3Uri?: string | undefined;
    /**
     * <p>The access configuration settings for the source ML model for an optimization job, where you can accept the model end-user license agreement (EULA).</p>
     * @public
     */
    ModelAccessConfig?: OptimizationModelAccessConfig | undefined;
}
/**
 * <p>The location of the source model to optimize with an optimization job.</p>
 * @public
 */
export interface OptimizationJobModelSource {
    /**
     * <p>The Amazon S3 location of a source model to optimize with an optimization job.</p>
     * @public
     */
    S3?: OptimizationJobModelSourceS3 | undefined;
}
/**
 * <p>Settings for the model compilation technique that's applied by a model optimization job.</p>
 * @public
 */
export interface ModelCompilationConfig {
    /**
     * <p>The URI of an LMI DLC in Amazon ECR. SageMaker uses this image to run the optimization.</p>
     * @public
     */
    Image?: string | undefined;
    /**
     * <p>Environment variables that override the default ones in the model container.</p>
     * @public
     */
    OverrideEnvironment?: Record<string, string> | undefined;
}
/**
 * <p>Settings for the model quantization technique that's applied by a model optimization job.</p>
 * @public
 */
export interface ModelQuantizationConfig {
    /**
     * <p>The URI of an LMI DLC in Amazon ECR. SageMaker uses this image to run the optimization.</p>
     * @public
     */
    Image?: string | undefined;
    /**
     * <p>Environment variables that override the default ones in the model container.</p>
     * @public
     */
    OverrideEnvironment?: Record<string, string> | undefined;
}
/**
 * <p>Settings for the model sharding technique that's applied by a model optimization job.</p>
 * @public
 */
export interface ModelShardingConfig {
    /**
     * <p>The URI of an LMI DLC in Amazon ECR. SageMaker uses this image to run the optimization.</p>
     * @public
     */
    Image?: string | undefined;
    /**
     * <p>Environment variables that override the default ones in the model container.</p>
     * @public
     */
    OverrideEnvironment?: Record<string, string> | undefined;
}
/**
 * <p>Settings for an optimization technique that you apply with a model optimization job.</p>
 * @public
 */
export type OptimizationConfig = OptimizationConfig.ModelCompilationConfigMember | OptimizationConfig.ModelQuantizationConfigMember | OptimizationConfig.ModelShardingConfigMember | OptimizationConfig.$UnknownMember;
/**
 * @public
 */
export declare namespace OptimizationConfig {
    /**
     * <p>Settings for the model quantization technique that's applied by a model optimization job.</p>
     * @public
     */
    interface ModelQuantizationConfigMember {
        ModelQuantizationConfig: ModelQuantizationConfig;
        ModelCompilationConfig?: never;
        ModelShardingConfig?: never;
        $unknown?: never;
    }
    /**
     * <p>Settings for the model compilation technique that's applied by a model optimization job.</p>
     * @public
     */
    interface ModelCompilationConfigMember {
        ModelQuantizationConfig?: never;
        ModelCompilationConfig: ModelCompilationConfig;
        ModelShardingConfig?: never;
        $unknown?: never;
    }
    /**
     * <p>Settings for the model sharding technique that's applied by a model optimization job.</p>
     * @public
     */
    interface ModelShardingConfigMember {
        ModelQuantizationConfig?: never;
        ModelCompilationConfig?: never;
        ModelShardingConfig: ModelShardingConfig;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        ModelQuantizationConfig?: never;
        ModelCompilationConfig?: never;
        ModelShardingConfig?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        ModelQuantizationConfig: (value: ModelQuantizationConfig) => T;
        ModelCompilationConfig: (value: ModelCompilationConfig) => T;
        ModelShardingConfig: (value: ModelShardingConfig) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: OptimizationConfig, visitor: Visitor<T>) => T;
}
/**
 * <p>Details for where to store the optimized model that you create with the optimization job.</p>
 * @public
 */
export interface OptimizationJobOutputConfig {
    /**
     * <p>The Amazon Resource Name (ARN) of a key in Amazon Web Services KMS. SageMaker uses they key to encrypt the artifacts of the optimized model when SageMaker uploads the model to Amazon S3.</p>
     * @public
     */
    KmsKeyId?: string | undefined;
    /**
     * <p>The Amazon S3 URI for where to store the optimized model that you create with an optimization job.</p>
     * @public
     */
    S3OutputLocation: string | undefined;
}
/**
 * <p>A VPC in Amazon VPC that's accessible to an optimized that you create with an optimization job. You can control access to and from your resources by configuring a VPC. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/infrastructure-give-access.html">Give SageMaker Access to Resources in your Amazon VPC</a>. </p>
 * @public
 */
export interface OptimizationVpcConfig {
    /**
     * <p>The VPC security group IDs, in the form <code>sg-xxxxxxxx</code>. Specify the security groups for the VPC that is specified in the <code>Subnets</code> field.</p>
     * @public
     */
    SecurityGroupIds: string[] | undefined;
    /**
     * <p>The ID of the subnets in the VPC to which you want to connect your optimized model.</p>
     * @public
     */
    Subnets: string[] | undefined;
}
/**
 * @public
 */
export interface CreateOptimizationJobRequest {
    /**
     * <p>A custom name for the new optimization job.</p>
     * @public
     */
    OptimizationJobName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an IAM role that enables Amazon SageMaker AI to perform tasks on your behalf. </p> <p>During model optimization, Amazon SageMaker AI needs your permission to:</p> <ul> <li> <p>Read input data from an S3 bucket</p> </li> <li> <p>Write model artifacts to an S3 bucket</p> </li> <li> <p>Write logs to Amazon CloudWatch Logs</p> </li> <li> <p>Publish metrics to Amazon CloudWatch</p> </li> </ul> <p>You grant permissions for all of these tasks to an IAM role. To pass this role to Amazon SageMaker AI, the caller of this API must have the <code>iam:PassRole</code> permission. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-roles.html">Amazon SageMaker AI Roles.</a> </p>
     * @public
     */
    RoleArn: string | undefined;
    /**
     * <p>The location of the source model to optimize with an optimization job.</p>
     * @public
     */
    ModelSource: OptimizationJobModelSource | undefined;
    /**
     * <p>The type of instance that hosts the optimized model that you create with the optimization job.</p>
     * @public
     */
    DeploymentInstanceType: OptimizationJobDeploymentInstanceType | undefined;
    /**
     * <p>The environment variables to set in the model container.</p>
     * @public
     */
    OptimizationEnvironment?: Record<string, string> | undefined;
    /**
     * <p>Settings for each of the optimization techniques that the job applies.</p>
     * @public
     */
    OptimizationConfigs: OptimizationConfig[] | undefined;
    /**
     * <p>Details for where to store the optimized model that you create with the optimization job.</p>
     * @public
     */
    OutputConfig: OptimizationJobOutputConfig | undefined;
    /**
     * <p>Specifies a limit to how long a job can run. When the job reaches the time limit, SageMaker ends the job. Use this API to cap costs.</p> <p>To stop a training job, SageMaker sends the algorithm the <code>SIGTERM</code> signal, which delays job termination for 120 seconds. Algorithms can use this 120-second window to save the model artifacts, so the results of training are not lost. </p> <p>The training algorithms provided by SageMaker automatically save the intermediate results of a model training job when possible. This attempt to save artifacts is only a best effort case as model might not be in a state from which it can be saved. For example, if training has just started, the model might not be ready to save. When saved, this intermediate data is a valid model artifact. You can use it to create a model with <code>CreateModel</code>.</p> <note> <p>The Neural Topic Model (NTM) currently does not support saving intermediate model artifacts. When training NTMs, make sure that the maximum runtime is sufficient for the training job to complete.</p> </note>
     * @public
     */
    StoppingCondition: StoppingCondition | undefined;
    /**
     * <p>A list of key-value pairs associated with the optimization job. For more information, see <a href="https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html">Tagging Amazon Web Services resources</a> in the <i>Amazon Web Services General Reference Guide</i>.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>A VPC in Amazon VPC that your optimized model has access to.</p>
     * @public
     */
    VpcConfig?: OptimizationVpcConfig | undefined;
}
/**
 * @public
 */
export interface CreateOptimizationJobResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the optimization job.</p>
     * @public
     */
    OptimizationJobArn: string | undefined;
}
/**
 * <p>Configuration settings for the SageMaker Partner AI App.</p>
 * @public
 */
export interface PartnerAppConfig {
    /**
     * <p>The list of users that are given admin access to the SageMaker Partner AI App.</p>
     * @public
     */
    AdminUsers?: string[] | undefined;
    /**
     * <p>This is a map of required inputs for a SageMaker Partner AI App. Based on the application type, the map is populated with a key and value pair that is specific to the user and application.</p>
     * @public
     */
    Arguments?: Record<string, string> | undefined;
}
/**
 * @public
 * @enum
 */
export declare const PartnerAppAuthType: {
    readonly IAM: "IAM";
};
/**
 * @public
 */
export type PartnerAppAuthType = (typeof PartnerAppAuthType)[keyof typeof PartnerAppAuthType];
/**
 * <p>Maintenance configuration settings for the SageMaker Partner AI App.</p>
 * @public
 */
export interface PartnerAppMaintenanceConfig {
    /**
     * <p>The day and time of the week in Coordinated Universal Time (UTC) 24-hour standard time that weekly maintenance updates are scheduled. This value must take the following format: <code>3-letter-day:24-h-hour:minute</code>. For example: <code>TUE:03:30</code>.</p>
     * @public
     */
    MaintenanceWindowStart?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const PartnerAppType: {
    readonly COMET: "comet";
    readonly DEEPCHECKS_LLM_EVALUATION: "deepchecks-llm-evaluation";
    readonly FIDDLER: "fiddler";
    readonly LAKERA_GUARD: "lakera-guard";
};
/**
 * @public
 */
export type PartnerAppType = (typeof PartnerAppType)[keyof typeof PartnerAppType];
/**
 * @public
 */
export interface CreatePartnerAppRequest {
    /**
     * <p>The name to give the SageMaker Partner AI App.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>The type of SageMaker Partner AI App to create. Must be one of the following: <code>lakera-guard</code>, <code>comet</code>, <code>deepchecks-llm-evaluation</code>, or <code>fiddler</code>.</p>
     * @public
     */
    Type: PartnerAppType | undefined;
    /**
     * <p>The ARN of the IAM role that the partner application uses.</p>
     * @public
     */
    ExecutionRoleArn: string | undefined;
    /**
     * <p>SageMaker Partner AI Apps uses Amazon Web Services KMS to encrypt data at rest using an Amazon Web Services managed key by default. For more control, specify a customer managed key.</p>
     * @public
     */
    KmsKeyId?: string | undefined;
    /**
     * <p>Maintenance configuration settings for the SageMaker Partner AI App.</p>
     * @public
     */
    MaintenanceConfig?: PartnerAppMaintenanceConfig | undefined;
    /**
     * <p>Indicates the instance type and size of the cluster attached to the SageMaker Partner AI App.</p>
     * @public
     */
    Tier: string | undefined;
    /**
     * <p>Configuration settings for the SageMaker Partner AI App.</p>
     * @public
     */
    ApplicationConfig?: PartnerAppConfig | undefined;
    /**
     * <p>The authorization type that users use to access the SageMaker Partner AI App.</p>
     * @public
     */
    AuthType: PartnerAppAuthType | undefined;
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
export interface CreatePartnerAppResponse {
    /**
     * <p>The ARN of the SageMaker Partner AI App.</p>
     * @public
     */
    Arn?: string | undefined;
}
/**
 * @public
 */
export interface CreatePartnerAppPresignedUrlRequest {
    /**
     * <p>The ARN of the SageMaker Partner AI App to create the presigned URL for.</p>
     * @public
     */
    Arn: string | undefined;
    /**
     * <p>The time that will pass before the presigned URL expires.</p>
     * @public
     */
    ExpiresInSeconds?: number | undefined;
    /**
     * <p>Indicates how long the Amazon SageMaker Partner AI App session can be accessed for after logging in.</p>
     * @public
     */
    SessionExpirationDurationInSeconds?: number | undefined;
}
/**
 * @public
 */
export interface CreatePartnerAppPresignedUrlResponse {
    /**
     * <p>The presigned URL that you can use to access the SageMaker Partner AI App.</p>
     * @public
     */
    Url?: string | undefined;
}
/**
 * <p>Configuration that controls the parallelism of the pipeline. By default, the parallelism configuration specified applies to all executions of the pipeline unless overridden.</p>
 * @public
 */
export interface ParallelismConfiguration {
    /**
     * <p>The max number of steps that can be executed in parallel. </p>
     * @public
     */
    MaxParallelExecutionSteps: number | undefined;
}
/**
 * <p>The location of the pipeline definition stored in Amazon S3.</p>
 * @public
 */
export interface PipelineDefinitionS3Location {
    /**
     * <p>Name of the S3 bucket.</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The object key (or key name) uniquely identifies the object in an S3 bucket. </p>
     * @public
     */
    ObjectKey: string | undefined;
    /**
     * <p>Version Id of the pipeline definition file. If not specified, Amazon SageMaker will retrieve the latest version.</p>
     * @public
     */
    VersionId?: string | undefined;
}
/**
 * @public
 */
export interface CreatePipelineRequest {
    /**
     * <p>The name of the pipeline.</p>
     * @public
     */
    PipelineName: string | undefined;
    /**
     * <p>The display name of the pipeline.</p>
     * @public
     */
    PipelineDisplayName?: string | undefined;
    /**
     * <p>The <a href="https://aws-sagemaker-mlops.github.io/sagemaker-model-building-pipeline-definition-JSON-schema/">JSON pipeline definition</a> of the pipeline.</p>
     * @public
     */
    PipelineDefinition?: string | undefined;
    /**
     * <p>The location of the pipeline definition stored in Amazon S3. If specified, SageMaker will retrieve the pipeline definition from this location.</p>
     * @public
     */
    PipelineDefinitionS3Location?: PipelineDefinitionS3Location | undefined;
    /**
     * <p>A description of the pipeline.</p>
     * @public
     */
    PipelineDescription?: string | undefined;
    /**
     * <p>A unique, case-sensitive identifier that you provide to ensure the idempotency of the operation. An idempotent operation completes no more than one time.</p>
     * @public
     */
    ClientRequestToken?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the role used by the pipeline to access and create resources.</p>
     * @public
     */
    RoleArn: string | undefined;
    /**
     * <p>A list of tags to apply to the created pipeline.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>This is the configuration that controls the parallelism of the pipeline. If specified, it applies to all runs of this pipeline by default.</p>
     * @public
     */
    ParallelismConfiguration?: ParallelismConfiguration | undefined;
}
/**
 * @public
 */
export interface CreatePipelineResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the created pipeline.</p>
     * @public
     */
    PipelineArn?: string | undefined;
}
/**
 * @public
 */
export interface CreatePresignedDomainUrlRequest {
    /**
     * <p>The domain ID.</p>
     * @public
     */
    DomainId: string | undefined;
    /**
     * <p>The name of the UserProfile to sign-in as.</p>
     * @public
     */
    UserProfileName: string | undefined;
    /**
     * <p>The session expiration duration in seconds. This value defaults to 43200.</p>
     * @public
     */
    SessionExpirationDurationInSeconds?: number | undefined;
    /**
     * <p>The number of seconds until the pre-signed URL expires. This value defaults to 300.</p>
     * @public
     */
    ExpiresInSeconds?: number | undefined;
    /**
     * <p>The name of the space.</p>
     * @public
     */
    SpaceName?: string | undefined;
    /**
     * <p>The landing page that the user is directed to when accessing the presigned URL. Using this value, users can access Studio or Studio Classic, even if it is not the default experience for the domain. The supported values are:</p> <ul> <li> <p> <code>studio::relative/path</code>: Directs users to the relative path in Studio.</p> </li> <li> <p> <code>app:JupyterServer:relative/path</code>: Directs users to the relative path in the Studio Classic application.</p> </li> <li> <p> <code>app:JupyterLab:relative/path</code>: Directs users to the relative path in the JupyterLab application.</p> </li> <li> <p> <code>app:RStudioServerPro:relative/path</code>: Directs users to the relative path in the RStudio application.</p> </li> <li> <p> <code>app:CodeEditor:relative/path</code>: Directs users to the relative path in the Code Editor, based on Code-OSS, Visual Studio Code - Open Source application.</p> </li> <li> <p> <code>app:Canvas:relative/path</code>: Directs users to the relative path in the Canvas application.</p> </li> </ul>
     * @public
     */
    LandingUri?: string | undefined;
}
/**
 * @public
 */
export interface CreatePresignedDomainUrlResponse {
    /**
     * <p>The presigned URL.</p>
     * @public
     */
    AuthorizedUrl?: string | undefined;
}
/**
 * @public
 */
export interface CreatePresignedMlflowTrackingServerUrlRequest {
    /**
     * <p>The name of the tracking server to connect to your MLflow UI.</p>
     * @public
     */
    TrackingServerName: string | undefined;
    /**
     * <p>The duration in seconds that your presigned URL is valid. The presigned URL can be used only once.</p>
     * @public
     */
    ExpiresInSeconds?: number | undefined;
    /**
     * <p>The duration in seconds that your MLflow UI session is valid.</p>
     * @public
     */
    SessionExpirationDurationInSeconds?: number | undefined;
}
/**
 * @public
 */
export interface CreatePresignedMlflowTrackingServerUrlResponse {
    /**
     * <p>A presigned URL with an authorization token.</p>
     * @public
     */
    AuthorizedUrl?: string | undefined;
}
/**
 * @public
 */
export interface CreatePresignedNotebookInstanceUrlInput {
    /**
     * <p>The name of the notebook instance.</p>
     * @public
     */
    NotebookInstanceName: string | undefined;
    /**
     * <p>The duration of the session, in seconds. The default is 12 hours.</p>
     * @public
     */
    SessionExpirationDurationInSeconds?: number | undefined;
}
/**
 * @public
 */
export interface CreatePresignedNotebookInstanceUrlOutput {
    /**
     * <p>A JSON object that contains the URL string. </p>
     * @public
     */
    AuthorizedUrl?: string | undefined;
}
/**
 * <p>Associates a SageMaker job as a trial component with an experiment and trial. Specified when you call the following APIs:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateProcessingJob.html">CreateProcessingJob</a> </p> </li> <li> <p> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTrainingJob.html">CreateTrainingJob</a> </p> </li> <li> <p> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTransformJob.html">CreateTransformJob</a> </p> </li> </ul>
 * @public
 */
export interface ExperimentConfig {
    /**
     * <p>The name of an existing experiment to associate with the trial component.</p>
     * @public
     */
    ExperimentName?: string | undefined;
    /**
     * <p>The name of an existing trial to associate the trial component with. If not specified, a new trial is created.</p>
     * @public
     */
    TrialName?: string | undefined;
    /**
     * <p>The display name for the trial component. If this key isn't specified, the display name is the trial component name.</p>
     * @public
     */
    TrialComponentDisplayName?: string | undefined;
    /**
     * <p>The name of the experiment run to associate with the trial component.</p>
     * @public
     */
    RunName?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const DataDistributionType: {
    readonly FULLYREPLICATED: "FullyReplicated";
    readonly SHARDEDBYS3KEY: "ShardedByS3Key";
};
/**
 * @public
 */
export type DataDistributionType = (typeof DataDistributionType)[keyof typeof DataDistributionType];
/**
 * @public
 * @enum
 */
export declare const InputMode: {
    readonly FILE: "File";
    readonly PIPE: "Pipe";
};
/**
 * @public
 */
export type InputMode = (typeof InputMode)[keyof typeof InputMode];
/**
 * @public
 * @enum
 */
export declare const RedshiftResultCompressionType: {
    readonly BZIP2: "BZIP2";
    readonly GZIP: "GZIP";
    readonly NONE: "None";
    readonly SNAPPY: "SNAPPY";
    readonly ZSTD: "ZSTD";
};
/**
 * @public
 */
export type RedshiftResultCompressionType = (typeof RedshiftResultCompressionType)[keyof typeof RedshiftResultCompressionType];
/**
 * @public
 * @enum
 */
export declare const RedshiftResultFormat: {
    readonly CSV: "CSV";
    readonly PARQUET: "PARQUET";
};
/**
 * @public
 */
export type RedshiftResultFormat = (typeof RedshiftResultFormat)[keyof typeof RedshiftResultFormat];
/**
 * <p>Configuration for Redshift Dataset Definition input.</p>
 * @public
 */
export interface RedshiftDatasetDefinition {
    /**
     * <p>The Redshift cluster Identifier.</p>
     * @public
     */
    ClusterId: string | undefined;
    /**
     * <p>The name of the Redshift database used in Redshift query execution.</p>
     * @public
     */
    Database: string | undefined;
    /**
     * <p>The database user name used in Redshift query execution.</p>
     * @public
     */
    DbUser: string | undefined;
    /**
     * <p>The SQL query statements to be executed.</p>
     * @public
     */
    QueryString: string | undefined;
    /**
     * <p>The IAM role attached to your Redshift cluster that Amazon SageMaker uses to generate datasets.</p>
     * @public
     */
    ClusterRoleArn: string | undefined;
    /**
     * <p>The location in Amazon S3 where the Redshift query results are stored.</p>
     * @public
     */
    OutputS3Uri: string | undefined;
    /**
     * <p>The Amazon Web Services Key Management Service (Amazon Web Services KMS) key that Amazon SageMaker uses to encrypt data from a Redshift execution.</p>
     * @public
     */
    KmsKeyId?: string | undefined;
    /**
     * <p>The data storage format for Redshift query results.</p>
     * @public
     */
    OutputFormat: RedshiftResultFormat | undefined;
    /**
     * <p>The compression used for Redshift query results.</p>
     * @public
     */
    OutputCompression?: RedshiftResultCompressionType | undefined;
}
/**
 * <p>Configuration for Dataset Definition inputs. The Dataset Definition input must specify exactly one of either <code>AthenaDatasetDefinition</code> or <code>RedshiftDatasetDefinition</code> types.</p>
 * @public
 */
export interface DatasetDefinition {
    /**
     * <p>Configuration for Athena Dataset Definition input.</p>
     * @public
     */
    AthenaDatasetDefinition?: AthenaDatasetDefinition | undefined;
    /**
     * <p>Configuration for Redshift Dataset Definition input.</p>
     * @public
     */
    RedshiftDatasetDefinition?: RedshiftDatasetDefinition | undefined;
    /**
     * <p>The local path where you want Amazon SageMaker to download the Dataset Definition inputs to run a processing job. <code>LocalPath</code> is an absolute path to the input data. This is a required parameter when <code>AppManaged</code> is <code>False</code> (default).</p>
     * @public
     */
    LocalPath?: string | undefined;
    /**
     * <p>Whether the generated dataset is <code>FullyReplicated</code> or <code>ShardedByS3Key</code> (default).</p>
     * @public
     */
    DataDistributionType?: DataDistributionType | undefined;
    /**
     * <p>Whether to use <code>File</code> or <code>Pipe</code> input mode. In <code>File</code> (default) mode, Amazon SageMaker copies the data from the input source onto the local Amazon Elastic Block Store (Amazon EBS) volumes before starting your training algorithm. This is the most commonly used input mode. In <code>Pipe</code> mode, Amazon SageMaker streams input data from the source directly to your algorithm without using the EBS volume.</p>
     * @public
     */
    InputMode?: InputMode | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ProcessingS3CompressionType: {
    readonly GZIP: "Gzip";
    readonly NONE: "None";
};
/**
 * @public
 */
export type ProcessingS3CompressionType = (typeof ProcessingS3CompressionType)[keyof typeof ProcessingS3CompressionType];
/**
 * @public
 * @enum
 */
export declare const ProcessingS3DataType: {
    readonly MANIFEST_FILE: "ManifestFile";
    readonly S3_PREFIX: "S3Prefix";
};
/**
 * @public
 */
export type ProcessingS3DataType = (typeof ProcessingS3DataType)[keyof typeof ProcessingS3DataType];
/**
 * <p>Configuration for downloading input data from Amazon S3 into the processing container.</p>
 * @public
 */
export interface ProcessingS3Input {
    /**
     * <p>The URI of the Amazon S3 prefix Amazon SageMaker downloads data required to run a processing job.</p>
     * @public
     */
    S3Uri: string | undefined;
    /**
     * <p>The local path in your container where you want Amazon SageMaker to write input data to. <code>LocalPath</code> is an absolute path to the input data and must begin with <code>/opt/ml/processing/</code>. <code>LocalPath</code> is a required parameter when <code>AppManaged</code> is <code>False</code> (default).</p>
     * @public
     */
    LocalPath?: string | undefined;
    /**
     * <p>Whether you use an <code>S3Prefix</code> or a <code>ManifestFile</code> for the data type. If you choose <code>S3Prefix</code>, <code>S3Uri</code> identifies a key name prefix. Amazon SageMaker uses all objects with the specified key name prefix for the processing job. If you choose <code>ManifestFile</code>, <code>S3Uri</code> identifies an object that is a manifest file containing a list of object keys that you want Amazon SageMaker to use for the processing job.</p>
     * @public
     */
    S3DataType: ProcessingS3DataType | undefined;
    /**
     * <p>Whether to use <code>File</code> or <code>Pipe</code> input mode. In File mode, Amazon SageMaker copies the data from the input source onto the local ML storage volume before starting your processing container. This is the most commonly used input mode. In <code>Pipe</code> mode, Amazon SageMaker streams input data from the source directly to your processing container into named pipes without using the ML storage volume.</p>
     * @public
     */
    S3InputMode?: ProcessingS3InputMode | undefined;
    /**
     * <p>Whether to distribute the data from Amazon S3 to all processing instances with <code>FullyReplicated</code>, or whether the data from Amazon S3 is shared by Amazon S3 key, downloading one shard of data to each processing instance.</p>
     * @public
     */
    S3DataDistributionType?: ProcessingS3DataDistributionType | undefined;
    /**
     * <p>Whether to GZIP-decompress the data in Amazon S3 as it is streamed into the processing container. <code>Gzip</code> can only be used when <code>Pipe</code> mode is specified as the <code>S3InputMode</code>. In <code>Pipe</code> mode, Amazon SageMaker streams input data from the source directly to your container without using the EBS volume.</p>
     * @public
     */
    S3CompressionType?: ProcessingS3CompressionType | undefined;
}
/**
 * <p>The inputs for a processing job. The processing input must specify exactly one of either <code>S3Input</code> or <code>DatasetDefinition</code> types.</p>
 * @public
 */
export interface ProcessingInput {
    /**
     * <p>The name for the processing job input.</p>
     * @public
     */
    InputName: string | undefined;
    /**
     * <p>When <code>True</code>, input operations such as data download are managed natively by the processing job application. When <code>False</code> (default), input operations are managed by Amazon SageMaker.</p>
     * @public
     */
    AppManaged?: boolean | undefined;
    /**
     * <p>Configuration for downloading input data from Amazon S3 into the processing container.</p>
     * @public
     */
    S3Input?: ProcessingS3Input | undefined;
    /**
     * <p>Configuration for a Dataset Definition input. </p>
     * @public
     */
    DatasetDefinition?: DatasetDefinition | undefined;
}
/**
 * <p>Configuration for processing job outputs in Amazon SageMaker Feature Store.</p>
 * @public
 */
export interface ProcessingFeatureStoreOutput {
    /**
     * <p>The name of the Amazon SageMaker FeatureGroup to use as the destination for processing job output. Note that your processing script is responsible for putting records into your Feature Store.</p>
     * @public
     */
    FeatureGroupName: string | undefined;
}
/**
 * <p>Configuration for uploading output data to Amazon S3 from the processing container.</p>
 * @public
 */
export interface ProcessingS3Output {
    /**
     * <p>A URI that identifies the Amazon S3 bucket where you want Amazon SageMaker to save the results of a processing job.</p>
     * @public
     */
    S3Uri: string | undefined;
    /**
     * <p>The local path of a directory where you want Amazon SageMaker to upload its contents to Amazon S3. <code>LocalPath</code> is an absolute path to a directory containing output files. This directory will be created by the platform and exist when your container's entrypoint is invoked.</p>
     * @public
     */
    LocalPath?: string | undefined;
    /**
     * <p>Whether to upload the results of the processing job continuously or after the job completes.</p>
     * @public
     */
    S3UploadMode: ProcessingS3UploadMode | undefined;
}
/**
 * <p>Describes the results of a processing job. The processing output must specify exactly one of either <code>S3Output</code> or <code>FeatureStoreOutput</code> types.</p>
 * @public
 */
export interface ProcessingOutput {
    /**
     * <p>The name for the processing job output.</p>
     * @public
     */
    OutputName: string | undefined;
    /**
     * <p>Configuration for processing job outputs in Amazon S3.</p>
     * @public
     */
    S3Output?: ProcessingS3Output | undefined;
    /**
     * <p>Configuration for processing job outputs in Amazon SageMaker Feature Store. This processing output type is only supported when <code>AppManaged</code> is specified. </p>
     * @public
     */
    FeatureStoreOutput?: ProcessingFeatureStoreOutput | undefined;
    /**
     * <p>When <code>True</code>, output operations such as data upload are managed natively by the processing job application. When <code>False</code> (default), output operations are managed by Amazon SageMaker.</p>
     * @public
     */
    AppManaged?: boolean | undefined;
}
/**
 * <p>Configuration for uploading output from the processing container.</p>
 * @public
 */
export interface ProcessingOutputConfig {
    /**
     * <p>An array of outputs configuring the data to upload from the processing container.</p>
     * @public
     */
    Outputs: ProcessingOutput[] | undefined;
    /**
     * <p>The Amazon Web Services Key Management Service (Amazon Web Services KMS) key that Amazon SageMaker uses to encrypt the processing job output. <code>KmsKeyId</code> can be an ID of a KMS key, ARN of a KMS key, or alias of a KMS key. The <code>KmsKeyId</code> is applied to all outputs.</p>
     * @public
     */
    KmsKeyId?: string | undefined;
}
/**
 * <p>Configuration for the cluster used to run a processing job.</p>
 * @public
 */
export interface ProcessingClusterConfig {
    /**
     * <p>The number of ML compute instances to use in the processing job. For distributed processing jobs, specify a value greater than 1. The default value is 1.</p>
     * @public
     */
    InstanceCount: number | undefined;
    /**
     * <p>The ML compute instance type for the processing job.</p>
     * @public
     */
    InstanceType: ProcessingInstanceType | undefined;
    /**
     * <p>The size of the ML storage volume in gigabytes that you want to provision. You must specify sufficient ML storage for your scenario.</p> <note> <p>Certain Nitro-based instances include local storage with a fixed total size, dependent on the instance type. When using these instances for processing, Amazon SageMaker mounts the local instance storage instead of Amazon EBS gp2 storage. You can't request a <code>VolumeSizeInGB</code> greater than the total size of the local instance storage.</p> <p>For a list of instance types that support local instance storage, including the total size per instance type, see <a href="https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/InstanceStorage.html#instance-store-volumes">Instance Store Volumes</a>.</p> </note>
     * @public
     */
    VolumeSizeInGB: number | undefined;
    /**
     * <p>The Amazon Web Services Key Management Service (Amazon Web Services KMS) key that Amazon SageMaker uses to encrypt data on the storage volume attached to the ML compute instance(s) that run the processing job. </p> <note> <p>Certain Nitro-based instances include local storage, dependent on the instance type. Local storage volumes are encrypted using a hardware module on the instance. You can't request a <code>VolumeKmsKeyId</code> when using an instance type with local storage.</p> <p>For a list of instance types that support local instance storage, see <a href="https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/InstanceStorage.html#instance-store-volumes">Instance Store Volumes</a>.</p> <p>For more information about local instance storage encryption, see <a href="https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ssd-instance-store.html">SSD Instance Store Volumes</a>.</p> </note>
     * @public
     */
    VolumeKmsKeyId?: string | undefined;
}
/**
 * <p>Identifies the resources, ML compute instances, and ML storage volumes to deploy for a processing job. In distributed training, you specify more than one instance.</p>
 * @public
 */
export interface ProcessingResources {
    /**
     * <p>The configuration for the resources in a cluster used to run the processing job.</p>
     * @public
     */
    ClusterConfig: ProcessingClusterConfig | undefined;
}
/**
 * <p>Configures conditions under which the processing job should be stopped, such as how long the processing job has been running. After the condition is met, the processing job is stopped.</p>
 * @public
 */
export interface ProcessingStoppingCondition {
    /**
     * <p>Specifies the maximum runtime in seconds.</p>
     * @public
     */
    MaxRuntimeInSeconds: number | undefined;
}
/**
 * @public
 */
export interface CreateProcessingJobRequest {
    /**
     * <p>An array of inputs configuring the data to download into the processing container.</p>
     * @public
     */
    ProcessingInputs?: ProcessingInput[] | undefined;
    /**
     * <p>Output configuration for the processing job.</p>
     * @public
     */
    ProcessingOutputConfig?: ProcessingOutputConfig | undefined;
    /**
     * <p> The name of the processing job. The name must be unique within an Amazon Web Services Region in the Amazon Web Services account.</p>
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
     * <p>Configures the processing job to run a specified Docker container image.</p>
     * @public
     */
    AppSpecification: AppSpecification | undefined;
    /**
     * <p>The environment variables to set in the Docker container. Up to 100 key and values entries in the map are supported.</p> <important> <p>Do not include any security-sensitive information including account access IDs, secrets, or tokens in any environment fields. As part of the shared responsibility model, you are responsible for any potential exposure, unauthorized access, or compromise of your sensitive data if caused by security-sensitive information included in the request environment variable or plain text fields.</p> </important>
     * @public
     */
    Environment?: Record<string, string> | undefined;
    /**
     * <p>Networking options for a processing job, such as whether to allow inbound and outbound network calls to and from processing containers, and the VPC subnets and security groups to use for VPC-enabled processing jobs.</p>
     * @public
     */
    NetworkConfig?: NetworkConfig | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an IAM role that Amazon SageMaker can assume to perform tasks on your behalf.</p>
     * @public
     */
    RoleArn: string | undefined;
    /**
     * <p>(Optional) An array of key-value pairs. For more information, see <a href="https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html#allocation-whatURL">Using Cost Allocation Tags</a> in the <i>Amazon Web Services Billing and Cost Management User Guide</i>.</p> <important> <p>Do not include any security-sensitive information including account access IDs, secrets, or tokens in any tags. As part of the shared responsibility model, you are responsible for any potential exposure, unauthorized access, or compromise of your sensitive data if caused by security-sensitive information included in the request tag variable or plain text fields.</p> </important>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>Associates a SageMaker job as a trial component with an experiment and trial. Specified when you call the following APIs:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateProcessingJob.html">CreateProcessingJob</a> </p> </li> <li> <p> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTrainingJob.html">CreateTrainingJob</a> </p> </li> <li> <p> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTransformJob.html">CreateTransformJob</a> </p> </li> </ul>
     * @public
     */
    ExperimentConfig?: ExperimentConfig | undefined;
}
/**
 * @public
 */
export interface CreateProcessingJobResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the processing job.</p>
     * @public
     */
    ProcessingJobArn: string | undefined;
}
/**
 * <p>A key value pair used when you provision a project as a service catalog product. For information, see <a href="https://docs.aws.amazon.com/servicecatalog/latest/adminguide/introduction.html">What is Amazon Web Services Service Catalog</a>.</p>
 * @public
 */
export interface ProvisioningParameter {
    /**
     * <p>The key that identifies a provisioning parameter.</p>
     * @public
     */
    Key?: string | undefined;
    /**
     * <p>The value of the provisioning parameter.</p>
     * @public
     */
    Value?: string | undefined;
}
/**
 * <p>Details that you specify to provision a service catalog product. For information about service catalog, see <a href="https://docs.aws.amazon.com/servicecatalog/latest/adminguide/introduction.html">What is Amazon Web Services Service Catalog</a>.</p>
 * @public
 */
export interface ServiceCatalogProvisioningDetails {
    /**
     * <p>The ID of the product to provision.</p>
     * @public
     */
    ProductId: string | undefined;
    /**
     * <p>The ID of the provisioning artifact.</p>
     * @public
     */
    ProvisioningArtifactId?: string | undefined;
    /**
     * <p>The path identifier of the product. This value is optional if the product has a default path, and required if the product has more than one path. </p>
     * @public
     */
    PathId?: string | undefined;
    /**
     * <p>A list of key value pairs that you specify when you provision a product.</p>
     * @public
     */
    ProvisioningParameters?: ProvisioningParameter[] | undefined;
}
/**
 * @public
 */
export interface CreateProjectInput {
    /**
     * <p>The name of the project.</p>
     * @public
     */
    ProjectName: string | undefined;
    /**
     * <p>A description for the project.</p>
     * @public
     */
    ProjectDescription?: string | undefined;
    /**
     * <p>The product ID and provisioning artifact ID to provision a service catalog. The provisioning artifact ID will default to the latest provisioning artifact ID of the product, if you don't provide the provisioning artifact ID. For more information, see <a href="https://docs.aws.amazon.com/servicecatalog/latest/adminguide/introduction.html">What is Amazon Web Services Service Catalog</a>.</p>
     * @public
     */
    ServiceCatalogProvisioningDetails?: ServiceCatalogProvisioningDetails | undefined;
    /**
     * <p>An array of key-value pairs that you want to use to organize and track your Amazon Web Services resource costs. For more information, see <a href="https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html">Tagging Amazon Web Services resources</a> in the <i>Amazon Web Services General Reference Guide</i>.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * @public
 */
export interface CreateProjectOutput {
    /**
     * <p>The Amazon Resource Name (ARN) of the project.</p>
     * @public
     */
    ProjectArn: string | undefined;
    /**
     * <p>The ID of the new project.</p>
     * @public
     */
    ProjectId: string | undefined;
}
/**
 * <p>The collection of ownership settings for a space.</p>
 * @public
 */
export interface OwnershipSettings {
    /**
     * <p>The user profile who is the owner of the space.</p>
     * @public
     */
    OwnerUserProfileName: string | undefined;
}
/**
 * <p>Settings related to idle shutdown of Studio applications in a space.</p>
 * @public
 */
export interface SpaceIdleSettings {
    /**
     * <p>The time that SageMaker waits after the application becomes idle before shutting it down.</p>
     * @public
     */
    IdleTimeoutInMinutes?: number | undefined;
}
/**
 * <p>Settings that are used to configure and manage the lifecycle of Amazon SageMaker Studio applications in a space.</p>
 * @public
 */
export interface SpaceAppLifecycleManagement {
    /**
     * <p>Settings related to idle shutdown of Studio applications.</p>
     * @public
     */
    IdleSettings?: SpaceIdleSettings | undefined;
}
/**
 * <p>The application settings for a Code Editor space.</p>
 * @public
 */
export interface SpaceCodeEditorAppSettings {
    /**
     * <p>Specifies the ARN's of a SageMaker AI image and SageMaker AI image version, and the instance type that the version runs on.</p> <note> <p>When both <code>SageMakerImageVersionArn</code> and <code>SageMakerImageArn</code> are passed, <code>SageMakerImageVersionArn</code> is used. Any updates to <code>SageMakerImageArn</code> will not take effect if <code>SageMakerImageVersionArn</code> already exists in the <code>ResourceSpec</code> because <code>SageMakerImageVersionArn</code> always takes precedence. To clear the value set for <code>SageMakerImageVersionArn</code>, pass <code>None</code> as the value.</p> </note>
     * @public
     */
    DefaultResourceSpec?: ResourceSpec | undefined;
    /**
     * <p>Settings that are used to configure and manage the lifecycle of CodeEditor applications in a space.</p>
     * @public
     */
    AppLifecycleManagement?: SpaceAppLifecycleManagement | undefined;
}
/**
 * <p>A file system, created by you in Amazon EFS, that you assign to a user profile or space for an Amazon SageMaker AI Domain. Permitted users can access this file system in Amazon SageMaker AI Studio.</p>
 * @public
 */
export interface EFSFileSystem {
    /**
     * <p>The ID of your Amazon EFS file system.</p>
     * @public
     */
    FileSystemId: string | undefined;
}
/**
 * <p>A custom file system in Amazon FSx for Lustre.</p>
 * @public
 */
export interface FSxLustreFileSystem {
    /**
     * <p>Amazon FSx for Lustre file system ID.</p>
     * @public
     */
    FileSystemId: string | undefined;
}
/**
 * <p>A file system, created by you, that you assign to a user profile or space for an Amazon SageMaker AI Domain. Permitted users can access this file system in Amazon SageMaker AI Studio.</p>
 * @public
 */
export type CustomFileSystem = CustomFileSystem.EFSFileSystemMember | CustomFileSystem.FSxLustreFileSystemMember | CustomFileSystem.$UnknownMember;
/**
 * @public
 */
export declare namespace CustomFileSystem {
    /**
     * <p>A custom file system in Amazon EFS.</p>
     * @public
     */
    interface EFSFileSystemMember {
        EFSFileSystem: EFSFileSystem;
        FSxLustreFileSystem?: never;
        $unknown?: never;
    }
    /**
     * <p>A custom file system in Amazon FSx for Lustre.</p>
     * @public
     */
    interface FSxLustreFileSystemMember {
        EFSFileSystem?: never;
        FSxLustreFileSystem: FSxLustreFileSystem;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        EFSFileSystem?: never;
        FSxLustreFileSystem?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        EFSFileSystem: (value: EFSFileSystem) => T;
        FSxLustreFileSystem: (value: FSxLustreFileSystem) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: CustomFileSystem, visitor: Visitor<T>) => T;
}
/**
 * <p>The settings for the JupyterLab application within a space.</p>
 * @public
 */
export interface SpaceJupyterLabAppSettings {
    /**
     * <p>Specifies the ARN's of a SageMaker AI image and SageMaker AI image version, and the instance type that the version runs on.</p> <note> <p>When both <code>SageMakerImageVersionArn</code> and <code>SageMakerImageArn</code> are passed, <code>SageMakerImageVersionArn</code> is used. Any updates to <code>SageMakerImageArn</code> will not take effect if <code>SageMakerImageVersionArn</code> already exists in the <code>ResourceSpec</code> because <code>SageMakerImageVersionArn</code> always takes precedence. To clear the value set for <code>SageMakerImageVersionArn</code>, pass <code>None</code> as the value.</p> </note>
     * @public
     */
    DefaultResourceSpec?: ResourceSpec | undefined;
    /**
     * <p>A list of Git repositories that SageMaker automatically displays to users for cloning in the JupyterLab application.</p>
     * @public
     */
    CodeRepositories?: CodeRepository[] | undefined;
    /**
     * <p>Settings that are used to configure and manage the lifecycle of JupyterLab applications in a space.</p>
     * @public
     */
    AppLifecycleManagement?: SpaceAppLifecycleManagement | undefined;
}
/**
 * <p>A collection of EBS storage settings that apply to both private and shared spaces.</p>
 * @public
 */
export interface EbsStorageSettings {
    /**
     * <p>The size of an EBS storage volume for a space.</p>
     * @public
     */
    EbsVolumeSizeInGb: number | undefined;
}
/**
 * <p>The storage settings for a space.</p>
 * @public
 */
export interface SpaceStorageSettings {
    /**
     * <p>A collection of EBS storage settings for a space.</p>
     * @public
     */
    EbsStorageSettings?: EbsStorageSettings | undefined;
}
/**
 * <p>A collection of space settings.</p>
 * @public
 */
export interface SpaceSettings {
    /**
     * <p>The JupyterServer app settings.</p>
     * @public
     */
    JupyterServerAppSettings?: JupyterServerAppSettings | undefined;
    /**
     * <p>The KernelGateway app settings.</p>
     * @public
     */
    KernelGatewayAppSettings?: KernelGatewayAppSettings | undefined;
    /**
     * <p>The Code Editor application settings.</p>
     * @public
     */
    CodeEditorAppSettings?: SpaceCodeEditorAppSettings | undefined;
    /**
     * <p>The settings for the JupyterLab application.</p>
     * @public
     */
    JupyterLabAppSettings?: SpaceJupyterLabAppSettings | undefined;
    /**
     * <p>The type of app created within the space.</p> <p>If using the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_UpdateSpace.html"> UpdateSpace</a> API, you can't change the app type of your space by specifying a different value for this field.</p>
     * @public
     */
    AppType?: AppType | undefined;
    /**
     * <p>The storage settings for a space.</p>
     * @public
     */
    SpaceStorageSettings?: SpaceStorageSettings | undefined;
    /**
     * <p>If you enable this option, SageMaker AI creates the following resources on your behalf when you create the space:</p> <ul> <li> <p>The user profile that possesses the space.</p> </li> <li> <p>The app that the space contains.</p> </li> </ul>
     * @public
     */
    SpaceManagedResources?: FeatureStatus | undefined;
    /**
     * <p>A file system, created by you, that you assign to a space for an Amazon SageMaker AI Domain. Permitted users can access this file system in Amazon SageMaker AI Studio.</p>
     * @public
     */
    CustomFileSystems?: CustomFileSystem[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const SharingType: {
    readonly Private: "Private";
    readonly Shared: "Shared";
};
/**
 * @public
 */
export type SharingType = (typeof SharingType)[keyof typeof SharingType];
/**
 * <p>A collection of space sharing settings.</p>
 * @public
 */
export interface SpaceSharingSettings {
    /**
     * <p>Specifies the sharing type of the space.</p>
     * @public
     */
    SharingType: SharingType | undefined;
}
/**
 * @public
 */
export interface CreateSpaceRequest {
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
     * <p>Tags to associated with the space. Each tag consists of a key and an optional value. Tag keys must be unique for each resource. Tags are searchable using the <code>Search</code> API.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>A collection of space settings.</p>
     * @public
     */
    SpaceSettings?: SpaceSettings | undefined;
    /**
     * <p>A collection of ownership settings.</p>
     * @public
     */
    OwnershipSettings?: OwnershipSettings | undefined;
    /**
     * <p>A collection of space sharing settings.</p>
     * @public
     */
    SpaceSharingSettings?: SpaceSharingSettings | undefined;
    /**
     * <p>The name of the space that appears in the SageMaker Studio UI.</p>
     * @public
     */
    SpaceDisplayName?: string | undefined;
}
/**
 * @public
 */
export interface CreateSpaceResponse {
    /**
     * <p>The space's Amazon Resource Name (ARN).</p>
     * @public
     */
    SpaceArn?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const StudioLifecycleConfigAppType: {
    readonly CodeEditor: "CodeEditor";
    readonly JupyterLab: "JupyterLab";
    readonly JupyterServer: "JupyterServer";
    readonly KernelGateway: "KernelGateway";
};
/**
 * @public
 */
export type StudioLifecycleConfigAppType = (typeof StudioLifecycleConfigAppType)[keyof typeof StudioLifecycleConfigAppType];
/**
 * @public
 */
export interface CreateStudioLifecycleConfigRequest {
    /**
     * <p>The name of the Amazon SageMaker AI Studio Lifecycle Configuration to create.</p>
     * @public
     */
    StudioLifecycleConfigName: string | undefined;
    /**
     * <p>The content of your Amazon SageMaker AI Studio Lifecycle Configuration script. This content must be base64 encoded.</p>
     * @public
     */
    StudioLifecycleConfigContent: string | undefined;
    /**
     * <p>The App type that the Lifecycle Configuration is attached to.</p>
     * @public
     */
    StudioLifecycleConfigAppType: StudioLifecycleConfigAppType | undefined;
    /**
     * <p>Tags to be associated with the Lifecycle Configuration. Each tag consists of a key and an optional value. Tag keys must be unique per resource. Tags are searchable using the Search API. </p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * @public
 */
export interface CreateStudioLifecycleConfigResponse {
    /**
     * <p>The ARN of your created Lifecycle Configuration.</p>
     * @public
     */
    StudioLifecycleConfigArn?: string | undefined;
}
/**
 * <p>Configuration information for the Amazon SageMaker Debugger hook parameters, metric and tensor collections, and storage paths. To learn more about how to configure the <code>DebugHookConfig</code> parameter, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/debugger-createtrainingjob-api.html">Use the SageMaker and Debugger Configuration API Operations to Create, Update, and Debug Your Training Job</a>.</p>
 * @public
 */
export interface DebugHookConfig {
    /**
     * <p>Path to local storage location for metrics and tensors. Defaults to <code>/opt/ml/output/tensors/</code>.</p>
     * @public
     */
    LocalPath?: string | undefined;
    /**
     * <p>Path to Amazon S3 storage location for metrics and tensors.</p>
     * @public
     */
    S3OutputPath: string | undefined;
    /**
     * <p>Configuration information for the Amazon SageMaker Debugger hook parameters.</p>
     * @public
     */
    HookParameters?: Record<string, string> | undefined;
    /**
     * <p>Configuration information for Amazon SageMaker Debugger tensor collections. To learn more about how to configure the <code>CollectionConfiguration</code> parameter, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/debugger-createtrainingjob-api.html">Use the SageMaker and Debugger Configuration API Operations to Create, Update, and Debug Your Training Job</a>. </p>
     * @public
     */
    CollectionConfigurations?: CollectionConfiguration[] | undefined;
}
/**
 * <p>Configuration information for SageMaker Debugger rules for debugging. To learn more about how to configure the <code>DebugRuleConfiguration</code> parameter, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/debugger-createtrainingjob-api.html">Use the SageMaker and Debugger Configuration API Operations to Create, Update, and Debug Your Training Job</a>.</p>
 * @public
 */
export interface DebugRuleConfiguration {
    /**
     * <p>The name of the rule configuration. It must be unique relative to other rule configuration names.</p>
     * @public
     */
    RuleConfigurationName: string | undefined;
    /**
     * <p>Path to local storage location for output of rules. Defaults to <code>/opt/ml/processing/output/rule/</code>.</p>
     * @public
     */
    LocalPath?: string | undefined;
    /**
     * <p>Path to Amazon S3 storage location for rules.</p>
     * @public
     */
    S3OutputPath?: string | undefined;
    /**
     * <p>The Amazon Elastic Container (ECR) Image for the managed rule evaluation.</p>
     * @public
     */
    RuleEvaluatorImage: string | undefined;
    /**
     * <p>The instance type to deploy a custom rule for debugging a training job.</p>
     * @public
     */
    InstanceType?: ProcessingInstanceType | undefined;
    /**
     * <p>The size, in GB, of the ML storage volume attached to the processing instance.</p>
     * @public
     */
    VolumeSizeInGB?: number | undefined;
    /**
     * <p>Runtime configuration for rule container.</p>
     * @public
     */
    RuleParameters?: Record<string, string> | undefined;
}
/**
 * <p>Configuration information for the infrastructure health check of a training job. A SageMaker-provided health check tests the health of instance hardware and cluster network connectivity.</p>
 * @public
 */
export interface InfraCheckConfig {
    /**
     * <p>Enables an infrastructure health check.</p>
     * @public
     */
    EnableInfraCheck?: boolean | undefined;
}
/**
 * <p>Configuration information for Amazon SageMaker Debugger system monitoring, framework profiling, and storage paths.</p>
 * @public
 */
export interface ProfilerConfig {
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
     * <p>Configuration to turn off Amazon SageMaker Debugger's system monitoring and profiling functionality. To turn it off, set to <code>True</code>.</p>
     * @public
     */
    DisableProfiler?: boolean | undefined;
}
/**
 * <p>Configuration information for profiling rules.</p>
 * @public
 */
export interface ProfilerRuleConfiguration {
    /**
     * <p>The name of the rule configuration. It must be unique relative to other rule configuration names.</p>
     * @public
     */
    RuleConfigurationName: string | undefined;
    /**
     * <p>Path to local storage location for output of rules. Defaults to <code>/opt/ml/processing/output/rule/</code>. </p>
     * @public
     */
    LocalPath?: string | undefined;
    /**
     * <p>Path to Amazon S3 storage location for rules.</p>
     * @public
     */
    S3OutputPath?: string | undefined;
    /**
     * <p>The Amazon Elastic Container Registry Image for the managed rule evaluation.</p>
     * @public
     */
    RuleEvaluatorImage: string | undefined;
    /**
     * <p>The instance type to deploy a custom rule for profiling a training job.</p>
     * @public
     */
    InstanceType?: ProcessingInstanceType | undefined;
    /**
     * <p>The size, in GB, of the ML storage volume attached to the processing instance.</p>
     * @public
     */
    VolumeSizeInGB?: number | undefined;
    /**
     * <p>Runtime configuration for rule container.</p>
     * @public
     */
    RuleParameters?: Record<string, string> | undefined;
}
/**
 * <p>Configuration for remote debugging for the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTrainingJob.html">CreateTrainingJob</a> API. To learn more about the remote debugging functionality of SageMaker, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/train-remote-debugging.html">Access a training container through Amazon Web Services Systems Manager (SSM) for remote debugging</a>.</p>
 * @public
 */
export interface RemoteDebugConfig {
    /**
     * <p>If set to True, enables remote debugging.</p>
     * @public
     */
    EnableRemoteDebug?: boolean | undefined;
}
/**
 * <p>Contains information about attribute-based access control (ABAC) for a training job. The session chaining configuration uses Amazon Security Token Service (STS) for your training job to request temporary, limited-privilege credentials to tenants. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/model-access-training-data.html#model-access-training-data-abac">Attribute-based access control (ABAC) for multi-tenancy training</a>.</p>
 * @public
 */
export interface SessionChainingConfig {
    /**
     * <p>Set to <code>True</code> to allow SageMaker to extract session tags from a training job creation role and reuse these tags when assuming the training job execution role.</p>
     * @public
     */
    EnableSessionTagChaining?: boolean | undefined;
}
/**
 * <p>Configuration of storage locations for the Amazon SageMaker Debugger TensorBoard output data.</p>
 * @public
 */
export interface TensorBoardOutputConfig {
    /**
     * <p>Path to local storage location for tensorBoard output. Defaults to <code>/opt/ml/output/tensorboard</code>.</p>
     * @public
     */
    LocalPath?: string | undefined;
    /**
     * <p>Path to Amazon S3 storage location for TensorBoard output.</p>
     * @public
     */
    S3OutputPath: string | undefined;
}
/**
 * @public
 */
export interface CreateTrainingJobRequest {
    /**
     * <p>The name of the training job. The name must be unique within an Amazon Web Services Region in an Amazon Web Services account. </p>
     * @public
     */
    TrainingJobName: string | undefined;
    /**
     * <p>Algorithm-specific parameters that influence the quality of the model. You set hyperparameters before you start the learning process. For a list of hyperparameters for each training algorithm provided by SageMaker, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/algos.html">Algorithms</a>. </p> <p>You can specify a maximum of 100 hyperparameters. Each hyperparameter is a key-value pair. Each key and value is limited to 256 characters, as specified by the <code>Length Constraint</code>. </p> <important> <p>Do not include any security-sensitive information including account access IDs, secrets, or tokens in any hyperparameter fields. As part of the shared responsibility model, you are responsible for any potential exposure, unauthorized access, or compromise of your sensitive data if caused by any security-sensitive information included in the request hyperparameter variable or plain text fields.</p> </important>
     * @public
     */
    HyperParameters?: Record<string, string> | undefined;
    /**
     * <p>The registry path of the Docker image that contains the training algorithm and algorithm-specific metadata, including the input mode. For more information about algorithms provided by SageMaker, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/algos.html">Algorithms</a>. For information about providing your own algorithms, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/your-algorithms.html">Using Your Own Algorithms with Amazon SageMaker</a>. </p>
     * @public
     */
    AlgorithmSpecification: AlgorithmSpecification | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an IAM role that SageMaker can assume to perform tasks on your behalf. </p> <p>During model training, SageMaker needs your permission to read input data from an S3 bucket, download a Docker image that contains training code, write model artifacts to an S3 bucket, write logs to Amazon CloudWatch Logs, and publish metrics to Amazon CloudWatch. You grant permissions for all of these tasks to an IAM role. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-roles.html">SageMaker Roles</a>. </p> <note> <p>To be able to pass this role to SageMaker, the caller of this API must have the <code>iam:PassRole</code> permission.</p> </note>
     * @public
     */
    RoleArn: string | undefined;
    /**
     * <p>An array of <code>Channel</code> objects. Each channel is a named input source. <code>InputDataConfig</code> describes the input data and its location. </p> <p>Algorithms can accept input data from one or more channels. For example, an algorithm might have two channels of input data, <code>training_data</code> and <code>validation_data</code>. The configuration for each channel provides the S3, EFS, or FSx location where the input data is stored. It also provides information about the stored data: the MIME type, compression method, and whether the data is wrapped in RecordIO format. </p> <p>Depending on the input mode that the algorithm supports, SageMaker either copies input data files from an S3 bucket to a local directory in the Docker container, or makes it available as input streams. For example, if you specify an EFS location, input data files are available as input streams. They do not need to be downloaded.</p> <p>Your input must be in the same Amazon Web Services region as your training job.</p>
     * @public
     */
    InputDataConfig?: Channel[] | undefined;
    /**
     * <p>Specifies the path to the S3 location where you want to store model artifacts. SageMaker creates subfolders for the artifacts. </p>
     * @public
     */
    OutputDataConfig: OutputDataConfig | undefined;
    /**
     * <p>The resources, including the ML compute instances and ML storage volumes, to use for model training. </p> <p>ML storage volumes store model artifacts and incremental states. Training algorithms might also use ML storage volumes for scratch space. If you want SageMaker to use the ML storage volume to store the training data, choose <code>File</code> as the <code>TrainingInputMode</code> in the algorithm specification. For distributed training algorithms, specify an instance count greater than 1.</p>
     * @public
     */
    ResourceConfig: ResourceConfig | undefined;
    /**
     * <p>A <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_VpcConfig.html">VpcConfig</a> object that specifies the VPC that you want your training job to connect to. Control access to and from your training container by configuring the VPC. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/train-vpc.html">Protect Training Jobs by Using an Amazon Virtual Private Cloud</a>.</p>
     * @public
     */
    VpcConfig?: VpcConfig | undefined;
    /**
     * <p>Specifies a limit to how long a model training job can run. It also specifies how long a managed Spot training job has to complete. When the job reaches the time limit, SageMaker ends the training job. Use this API to cap model training costs.</p> <p>To stop a job, SageMaker sends the algorithm the <code>SIGTERM</code> signal, which delays job termination for 120 seconds. Algorithms can use this 120-second window to save the model artifacts, so the results of training are not lost. </p>
     * @public
     */
    StoppingCondition: StoppingCondition | undefined;
    /**
     * <p>An array of key-value pairs. You can use tags to categorize your Amazon Web Services resources in different ways, for example, by purpose, owner, or environment. For more information, see <a href="https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html">Tagging Amazon Web Services Resources</a>.</p> <important> <p>Do not include any security-sensitive information including account access IDs, secrets, or tokens in any tags. As part of the shared responsibility model, you are responsible for any potential exposure, unauthorized access, or compromise of your sensitive data if caused by any security-sensitive information included in the request tag variable or plain text fields.</p> </important>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>Isolates the training container. No inbound or outbound network calls can be made, except for calls between peers within a training cluster for distributed training. If you enable network isolation for training jobs that are configured to use a VPC, SageMaker downloads and uploads customer data and model artifacts through the specified VPC, but the training container does not have network access.</p>
     * @public
     */
    EnableNetworkIsolation?: boolean | undefined;
    /**
     * <p>To encrypt all communications between ML compute instances in distributed training, choose <code>True</code>. Encryption provides greater security for distributed training, but training might take longer. How long it takes depends on the amount of communication between compute instances, especially if you use a deep learning algorithm in distributed training. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/train-encrypt.html">Protect Communications Between ML Compute Instances in a Distributed Training Job</a>.</p>
     * @public
     */
    EnableInterContainerTrafficEncryption?: boolean | undefined;
    /**
     * <p>To train models using managed spot training, choose <code>True</code>. Managed spot training provides a fully managed and scalable infrastructure for training machine learning models. this option is useful when training jobs can be interrupted and when there is flexibility when the training job is run. </p> <p>The complete and intermediate results of jobs are stored in an Amazon S3 bucket, and can be used as a starting point to train models incrementally. Amazon SageMaker provides metrics and logs in CloudWatch. They can be used to see when managed spot training jobs are running, interrupted, resumed, or completed. </p>
     * @public
     */
    EnableManagedSpotTraining?: boolean | undefined;
    /**
     * <p>Contains information about the output location for managed spot training checkpoint data.</p>
     * @public
     */
    CheckpointConfig?: CheckpointConfig | undefined;
    /**
     * <p>Configuration information for the Amazon SageMaker Debugger hook parameters, metric and tensor collections, and storage paths. To learn more about how to configure the <code>DebugHookConfig</code> parameter, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/debugger-createtrainingjob-api.html">Use the SageMaker and Debugger Configuration API Operations to Create, Update, and Debug Your Training Job</a>.</p>
     * @public
     */
    DebugHookConfig?: DebugHookConfig | undefined;
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
     * <p>Associates a SageMaker job as a trial component with an experiment and trial. Specified when you call the following APIs:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateProcessingJob.html">CreateProcessingJob</a> </p> </li> <li> <p> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTrainingJob.html">CreateTrainingJob</a> </p> </li> <li> <p> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTransformJob.html">CreateTransformJob</a> </p> </li> </ul>
     * @public
     */
    ExperimentConfig?: ExperimentConfig | undefined;
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
     * <p>Contains information about attribute-based access control (ABAC) for the training job.</p>
     * @public
     */
    SessionChainingConfig?: SessionChainingConfig | undefined;
}
/**
 * @public
 */
export interface CreateTrainingJobResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the training job.</p>
     * @public
     */
    TrainingJobArn: string | undefined;
}
/**
 * @public
 */
export interface CreateTrainingPlanRequest {
    /**
     * <p>The name of the training plan to create.</p>
     * @public
     */
    TrainingPlanName: string | undefined;
    /**
     * <p>The unique identifier of the training plan offering to use for creating this plan.</p>
     * @public
     */
    TrainingPlanOfferingId: string | undefined;
    /**
     * <p>An array of key-value pairs to apply to this training plan.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * @public
 */
export interface CreateTrainingPlanResponse {
    /**
     * <p>The Amazon Resource Name (ARN); of the created training plan.</p>
     * @public
     */
    TrainingPlanArn: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const JoinSource: {
    readonly INPUT: "Input";
    readonly NONE: "None";
};
/**
 * @public
 */
export type JoinSource = (typeof JoinSource)[keyof typeof JoinSource];
/**
 * <p>The data structure used to specify the data to be used for inference in a batch transform job and to associate the data that is relevant to the prediction results in the output. The input filter provided allows you to exclude input data that is not needed for inference in a batch transform job. The output filter provided allows you to include input data relevant to interpreting the predictions in the output from the job. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/batch-transform-data-processing.html">Associate Prediction Results with their Corresponding Input Records</a>.</p>
 * @public
 */
export interface DataProcessing {
    /**
     * <p>A <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/batch-transform-data-processing.html#data-processing-operators">JSONPath</a> expression used to select a portion of the input data to pass to the algorithm. Use the <code>InputFilter</code> parameter to exclude fields, such as an ID column, from the input. If you want SageMaker to pass the entire input dataset to the algorithm, accept the default value <code>$</code>.</p> <p>Examples: <code>"$"</code>, <code>"$[1:]"</code>, <code>"$.features"</code> </p>
     * @public
     */
    InputFilter?: string | undefined;
    /**
     * <p>A <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/batch-transform-data-processing.html#data-processing-operators">JSONPath</a> expression used to select a portion of the joined dataset to save in the output file for a batch transform job. If you want SageMaker to store the entire input dataset in the output file, leave the default value, <code>$</code>. If you specify indexes that aren't within the dimension size of the joined dataset, you get an error.</p> <p>Examples: <code>"$"</code>, <code>"$[0,5:]"</code>, <code>"$['id','SageMakerOutput']"</code> </p>
     * @public
     */
    OutputFilter?: string | undefined;
    /**
     * <p>Specifies the source of the data to join with the transformed data. The valid values are <code>None</code> and <code>Input</code>. The default value is <code>None</code>, which specifies not to join the input with the transformed data. If you want the batch transform job to join the original input data with the transformed data, set <code>JoinSource</code> to <code>Input</code>. You can specify <code>OutputFilter</code> as an additional filter to select a portion of the joined dataset and store it in the output file.</p> <p>For JSON or JSONLines objects, such as a JSON array, SageMaker adds the transformed data to the input JSON object in an attribute called <code>SageMakerOutput</code>. The joined result for JSON must be a key-value pair object. If the input is not a key-value pair object, SageMaker creates a new JSON file. In the new JSON file, and the input data is stored under the <code>SageMakerInput</code> key and the results are stored in <code>SageMakerOutput</code>.</p> <p>For CSV data, SageMaker takes each row as a JSON array and joins the transformed data with the input by appending each transformed row to the end of the input. The joined data has the original input data followed by the transformed data and the output is a CSV file.</p> <p>For information on how joining in applied, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/batch-transform-data-processing.html#batch-transform-data-processing-workflow">Workflow for Associating Inferences with Input Records</a>.</p>
     * @public
     */
    JoinSource?: JoinSource | undefined;
}
/**
 * <p>Configures the timeout and maximum number of retries for processing a transform job invocation.</p>
 * @public
 */
export interface ModelClientConfig {
    /**
     * <p>The timeout value in seconds for an invocation request. The default value is 600.</p>
     * @public
     */
    InvocationsTimeoutInSeconds?: number | undefined;
    /**
     * <p>The maximum number of retries when invocation requests are failing. The default value is 3.</p>
     * @public
     */
    InvocationsMaxRetries?: number | undefined;
}
/**
 * @public
 */
export interface CreateTransformJobRequest {
    /**
     * <p>The name of the transform job. The name must be unique within an Amazon Web Services Region in an Amazon Web Services account. </p>
     * @public
     */
    TransformJobName: string | undefined;
    /**
     * <p>The name of the model that you want to use for the transform job. <code>ModelName</code> must be the name of an existing Amazon SageMaker model within an Amazon Web Services Region in an Amazon Web Services account.</p>
     * @public
     */
    ModelName: string | undefined;
    /**
     * <p>The maximum number of parallel requests that can be sent to each instance in a transform job. If <code>MaxConcurrentTransforms</code> is set to <code>0</code> or left unset, Amazon SageMaker checks the optional execution-parameters to determine the settings for your chosen algorithm. If the execution-parameters endpoint is not enabled, the default value is <code>1</code>. For more information on execution-parameters, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/your-algorithms-batch-code.html#your-algorithms-batch-code-how-containe-serves-requests">How Containers Serve Requests</a>. For built-in algorithms, you don't need to set a value for <code>MaxConcurrentTransforms</code>.</p>
     * @public
     */
    MaxConcurrentTransforms?: number | undefined;
    /**
     * <p>Configures the timeout and maximum number of retries for processing a transform job invocation.</p>
     * @public
     */
    ModelClientConfig?: ModelClientConfig | undefined;
    /**
     * <p>The maximum allowed size of the payload, in MB. A <i>payload</i> is the data portion of a record (without metadata). The value in <code>MaxPayloadInMB</code> must be greater than, or equal to, the size of a single record. To estimate the size of a record in MB, divide the size of your dataset by the number of records. To ensure that the records fit within the maximum payload size, we recommend using a slightly larger value. The default value is <code>6</code> MB. </p> <p>The value of <code>MaxPayloadInMB</code> cannot be greater than 100 MB. If you specify the <code>MaxConcurrentTransforms</code> parameter, the value of <code>(MaxConcurrentTransforms * MaxPayloadInMB)</code> also cannot exceed 100 MB.</p> <p>For cases where the payload might be arbitrarily large and is transmitted using HTTP chunked encoding, set the value to <code>0</code>. This feature works only in supported algorithms. Currently, Amazon SageMaker built-in algorithms do not support HTTP chunked encoding.</p>
     * @public
     */
    MaxPayloadInMB?: number | undefined;
    /**
     * <p>Specifies the number of records to include in a mini-batch for an HTTP inference request. A <i>record</i> <i/> is a single unit of input data that inference can be made on. For example, a single line in a CSV file is a record. </p> <p>To enable the batch strategy, you must set the <code>SplitType</code> property to <code>Line</code>, <code>RecordIO</code>, or <code>TFRecord</code>.</p> <p>To use only one record when making an HTTP invocation request to a container, set <code>BatchStrategy</code> to <code>SingleRecord</code> and <code>SplitType</code> to <code>Line</code>.</p> <p>To fit as many records in a mini-batch as can fit within the <code>MaxPayloadInMB</code> limit, set <code>BatchStrategy</code> to <code>MultiRecord</code> and <code>SplitType</code> to <code>Line</code>.</p>
     * @public
     */
    BatchStrategy?: BatchStrategy | undefined;
    /**
     * <p>The environment variables to set in the Docker container. Don't include any sensitive data in your environment variables. We support up to 16 key and values entries in the map.</p>
     * @public
     */
    Environment?: Record<string, string> | undefined;
    /**
     * <p>Describes the input source and the way the transform job consumes it.</p>
     * @public
     */
    TransformInput: TransformInput | undefined;
    /**
     * <p>Describes the results of the transform job.</p>
     * @public
     */
    TransformOutput: TransformOutput | undefined;
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
     * <p>The data structure used to specify the data to be used for inference in a batch transform job and to associate the data that is relevant to the prediction results in the output. The input filter provided allows you to exclude input data that is not needed for inference in a batch transform job. The output filter provided allows you to include input data relevant to interpreting the predictions in the output from the job. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/batch-transform-data-processing.html">Associate Prediction Results with their Corresponding Input Records</a>.</p>
     * @public
     */
    DataProcessing?: DataProcessing | undefined;
    /**
     * <p>(Optional) An array of key-value pairs. For more information, see <a href="https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html#allocation-what">Using Cost Allocation Tags</a> in the <i>Amazon Web Services Billing and Cost Management User Guide</i>.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>Associates a SageMaker job as a trial component with an experiment and trial. Specified when you call the following APIs:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateProcessingJob.html">CreateProcessingJob</a> </p> </li> <li> <p> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTrainingJob.html">CreateTrainingJob</a> </p> </li> <li> <p> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTransformJob.html">CreateTransformJob</a> </p> </li> </ul>
     * @public
     */
    ExperimentConfig?: ExperimentConfig | undefined;
}
/**
 * @public
 */
export interface CreateTransformJobResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the transform job.</p>
     * @public
     */
    TransformJobArn: string | undefined;
}
/**
 * @public
 */
export interface CreateTrialRequest {
    /**
     * <p>The name of the trial. The name must be unique in your Amazon Web Services account and is not case-sensitive.</p>
     * @public
     */
    TrialName: string | undefined;
    /**
     * <p>The name of the trial as displayed. The name doesn't need to be unique. If <code>DisplayName</code> isn't specified, <code>TrialName</code> is displayed.</p>
     * @public
     */
    DisplayName?: string | undefined;
    /**
     * <p>The name of the experiment to associate the trial with.</p>
     * @public
     */
    ExperimentName: string | undefined;
    /**
     * <p>Metadata properties of the tracking entity, trial, or trial component.</p>
     * @public
     */
    MetadataProperties?: MetadataProperties | undefined;
    /**
     * <p>A list of tags to associate with the trial. You can use <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_Search.html">Search</a> API to search on the tags.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * @public
 */
export interface CreateTrialResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the trial.</p>
     * @public
     */
    TrialArn?: string | undefined;
}
/**
 * <p>Represents an input or output artifact of a trial component. You specify <code>TrialComponentArtifact</code> as part of the <code>InputArtifacts</code> and <code>OutputArtifacts</code> parameters in the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTrialComponent.html">CreateTrialComponent</a> request.</p> <p>Examples of input artifacts are datasets, algorithms, hyperparameters, source code, and instance types. Examples of output artifacts are metrics, snapshots, logs, and images.</p>
 * @public
 */
export interface TrialComponentArtifact {
    /**
     * <p>The media type of the artifact, which indicates the type of data in the artifact file. The media type consists of a <i>type</i> and a <i>subtype</i> concatenated with a slash (/) character, for example, text/csv, image/jpeg, and s3/uri. The type specifies the category of the media. The subtype specifies the kind of data.</p>
     * @public
     */
    MediaType?: string | undefined;
    /**
     * <p>The location of the artifact.</p>
     * @public
     */
    Value: string | undefined;
}
/**
 * <p>The value of a hyperparameter. Only one of <code>NumberValue</code> or <code>StringValue</code> can be specified.</p> <p>This object is specified in the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTrialComponent.html">CreateTrialComponent</a> request.</p>
 * @public
 */
export type TrialComponentParameterValue = TrialComponentParameterValue.NumberValueMember | TrialComponentParameterValue.StringValueMember | TrialComponentParameterValue.$UnknownMember;
/**
 * @public
 */
export declare namespace TrialComponentParameterValue {
    /**
     * <p>The string value of a categorical hyperparameter. If you specify a value for this parameter, you can't specify the <code>NumberValue</code> parameter.</p>
     * @public
     */
    interface StringValueMember {
        StringValue: string;
        NumberValue?: never;
        $unknown?: never;
    }
    /**
     * <p>The numeric value of a numeric hyperparameter. If you specify a value for this parameter, you can't specify the <code>StringValue</code> parameter.</p>
     * @public
     */
    interface NumberValueMember {
        StringValue?: never;
        NumberValue: number;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        StringValue?: never;
        NumberValue?: never;
        $unknown: [string, any];
    }
    interface Visitor<T> {
        StringValue: (value: string) => T;
        NumberValue: (value: number) => T;
        _: (name: string, value: any) => T;
    }
    const visit: <T>(value: TrialComponentParameterValue, visitor: Visitor<T>) => T;
}
/**
 * @public
 * @enum
 */
export declare const TrialComponentPrimaryStatus: {
    readonly COMPLETED: "Completed";
    readonly FAILED: "Failed";
    readonly IN_PROGRESS: "InProgress";
    readonly STOPPED: "Stopped";
    readonly STOPPING: "Stopping";
};
/**
 * @public
 */
export type TrialComponentPrimaryStatus = (typeof TrialComponentPrimaryStatus)[keyof typeof TrialComponentPrimaryStatus];
/**
 * <p>The status of the trial component.</p>
 * @public
 */
export interface TrialComponentStatus {
    /**
     * <p>The status of the trial component.</p>
     * @public
     */
    PrimaryStatus?: TrialComponentPrimaryStatus | undefined;
    /**
     * <p>If the component failed, a message describing why.</p>
     * @public
     */
    Message?: string | undefined;
}
/**
 * @public
 */
export interface CreateTrialComponentRequest {
    /**
     * <p>The name of the component. The name must be unique in your Amazon Web Services account and is not case-sensitive.</p>
     * @public
     */
    TrialComponentName: string | undefined;
    /**
     * <p>The name of the component as displayed. The name doesn't need to be unique. If <code>DisplayName</code> isn't specified, <code>TrialComponentName</code> is displayed.</p>
     * @public
     */
    DisplayName?: string | undefined;
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
     * <p>The hyperparameters for the component.</p>
     * @public
     */
    Parameters?: Record<string, TrialComponentParameterValue> | undefined;
    /**
     * <p>The input artifacts for the component. Examples of input artifacts are datasets, algorithms, hyperparameters, source code, and instance types.</p>
     * @public
     */
    InputArtifacts?: Record<string, TrialComponentArtifact> | undefined;
    /**
     * <p>The output artifacts for the component. Examples of output artifacts are metrics, snapshots, logs, and images.</p>
     * @public
     */
    OutputArtifacts?: Record<string, TrialComponentArtifact> | undefined;
    /**
     * <p>Metadata properties of the tracking entity, trial, or trial component.</p>
     * @public
     */
    MetadataProperties?: MetadataProperties | undefined;
    /**
     * <p>A list of tags to associate with the component. You can use <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_Search.html">Search</a> API to search on the tags.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * @public
 */
export interface CreateTrialComponentResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the trial component.</p>
     * @public
     */
    TrialComponentArn?: string | undefined;
}
/**
 * @public
 */
export interface CreateUserProfileRequest {
    /**
     * <p>The ID of the associated Domain.</p>
     * @public
     */
    DomainId: string | undefined;
    /**
     * <p>A name for the UserProfile. This value is not case sensitive.</p>
     * @public
     */
    UserProfileName: string | undefined;
    /**
     * <p>A specifier for the type of value specified in SingleSignOnUserValue. Currently, the only supported value is "UserName". If the Domain's AuthMode is IAM Identity Center, this field is required. If the Domain's AuthMode is not IAM Identity Center, this field cannot be specified. </p>
     * @public
     */
    SingleSignOnUserIdentifier?: string | undefined;
    /**
     * <p>The username of the associated Amazon Web Services Single Sign-On User for this UserProfile. If the Domain's AuthMode is IAM Identity Center, this field is required, and must match a valid username of a user in your directory. If the Domain's AuthMode is not IAM Identity Center, this field cannot be specified. </p>
     * @public
     */
    SingleSignOnUserValue?: string | undefined;
    /**
     * <p>Each tag consists of a key and an optional value. Tag keys must be unique per resource.</p> <p>Tags that you specify for the User Profile are also added to all Apps that the User Profile launches.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>A collection of settings.</p>
     * @public
     */
    UserSettings?: UserSettings | undefined;
}
/**
 * @public
 */
export interface CreateUserProfileResponse {
    /**
     * <p>The user profile Amazon Resource Name (ARN).</p>
     * @public
     */
    UserProfileArn?: string | undefined;
}
/**
 * <p>Use this parameter to configure your OIDC Identity Provider (IdP).</p>
 * @public
 */
export interface OidcConfig {
    /**
     * <p>The OIDC IdP client ID used to configure your private workforce.</p>
     * @public
     */
    ClientId: string | undefined;
    /**
     * <p>The OIDC IdP client secret used to configure your private workforce.</p>
     * @public
     */
    ClientSecret: string | undefined;
    /**
     * <p>The OIDC IdP issuer used to configure your private workforce.</p>
     * @public
     */
    Issuer: string | undefined;
    /**
     * <p>The OIDC IdP authorization endpoint used to configure your private workforce.</p>
     * @public
     */
    AuthorizationEndpoint: string | undefined;
    /**
     * <p>The OIDC IdP token endpoint used to configure your private workforce.</p>
     * @public
     */
    TokenEndpoint: string | undefined;
    /**
     * <p>The OIDC IdP user information endpoint used to configure your private workforce.</p>
     * @public
     */
    UserInfoEndpoint: string | undefined;
    /**
     * <p>The OIDC IdP logout endpoint used to configure your private workforce.</p>
     * @public
     */
    LogoutEndpoint: string | undefined;
    /**
     * <p>The OIDC IdP JSON Web Key Set (Jwks) URI used to configure your private workforce.</p>
     * @public
     */
    JwksUri: string | undefined;
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
 * <p>A list of IP address ranges (<a href="https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Subnets.html">CIDRs</a>). Used to create an allow list of IP addresses for a private workforce. Workers will only be able to log in to their worker portal from an IP address within this range. By default, a workforce isn't restricted to specific IP addresses.</p>
 * @public
 */
export interface SourceIpConfig {
    /**
     * <p>A list of one to ten <a href="https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Subnets.html">Classless Inter-Domain Routing</a> (CIDR) values.</p> <p>Maximum: Ten CIDR values</p> <note> <p>The following Length Constraints apply to individual CIDR values in the CIDR value list.</p> </note>
     * @public
     */
    Cidrs: string[] | undefined;
}
/**
 * <p>The VPC object you use to create or update a workforce.</p>
 * @public
 */
export interface WorkforceVpcConfigRequest {
    /**
     * <p>The ID of the VPC that the workforce uses for communication.</p>
     * @public
     */
    VpcId?: string | undefined;
    /**
     * <p>The VPC security group IDs, in the form <code>sg-xxxxxxxx</code>. The security groups must be for the same VPC as specified in the subnet.</p>
     * @public
     */
    SecurityGroupIds?: string[] | undefined;
    /**
     * <p>The ID of the subnets in the VPC that you want to connect.</p>
     * @public
     */
    Subnets?: string[] | undefined;
}
/**
 * @public
 */
export interface CreateWorkforceRequest {
    /**
     * <p>Use this parameter to configure an Amazon Cognito private workforce. A single Cognito workforce is created using and corresponds to a single <a href="https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html"> Amazon Cognito user pool</a>.</p> <p>Do not use <code>OidcConfig</code> if you specify values for <code>CognitoConfig</code>.</p>
     * @public
     */
    CognitoConfig?: CognitoConfig | undefined;
    /**
     * <p>Use this parameter to configure a private workforce using your own OIDC Identity Provider.</p> <p>Do not use <code>CognitoConfig</code> if you specify values for <code>OidcConfig</code>.</p>
     * @public
     */
    OidcConfig?: OidcConfig | undefined;
    /**
     * <p>A list of IP address ranges (<a href="https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Subnets.html">CIDRs</a>). Used to create an allow list of IP addresses for a private workforce. Workers will only be able to log in to their worker portal from an IP address within this range. By default, a workforce isn't restricted to specific IP addresses.</p>
     * @public
     */
    SourceIpConfig?: SourceIpConfig | undefined;
    /**
     * <p>The name of the private workforce.</p>
     * @public
     */
    WorkforceName: string | undefined;
    /**
     * <p>An array of key-value pairs that contain metadata to help you categorize and organize our workforce. Each tag consists of a key and a value, both of which you define.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>Use this parameter to configure a workforce using VPC.</p>
     * @public
     */
    WorkforceVpcConfig?: WorkforceVpcConfigRequest | undefined;
}
/**
 * @public
 */
export interface CreateWorkforceResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the workforce.</p>
     * @public
     */
    WorkforceArn: string | undefined;
}
/**
 * <p>A list of user groups that exist in your OIDC Identity Provider (IdP). One to ten groups can be used to create a single private work team. When you add a user group to the list of <code>Groups</code>, you can add that user group to one or more private work teams. If you add a user group to a private work team, all workers in that user group are added to the work team.</p>
 * @public
 */
export interface OidcMemberDefinition {
    /**
     * <p>A list of comma seperated strings that identifies user groups in your OIDC IdP. Each user group is made up of a group of private workers.</p>
     * @public
     */
    Groups?: string[] | undefined;
}
/**
 * <p>Defines an Amazon Cognito or your own OIDC IdP user group that is part of a work team.</p>
 * @public
 */
export interface MemberDefinition {
    /**
     * <p>The Amazon Cognito user group that is part of the work team.</p>
     * @public
     */
    CognitoMemberDefinition?: CognitoMemberDefinition | undefined;
    /**
     * <p>A list user groups that exist in your OIDC Identity Provider (IdP). One to ten groups can be used to create a single private work team. When you add a user group to the list of <code>Groups</code>, you can add that user group to one or more private work teams. If you add a user group to a private work team, all workers in that user group are added to the work team.</p>
     * @public
     */
    OidcMemberDefinition?: OidcMemberDefinition | undefined;
}
/**
 * <p>Configures Amazon SNS notifications of available or expiring work items for work teams.</p>
 * @public
 */
export interface NotificationConfiguration {
    /**
     * <p>The ARN for the Amazon SNS topic to which notifications should be published.</p>
     * @public
     */
    NotificationTopicArn?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const EnabledOrDisabled: {
    readonly Disabled: "Disabled";
    readonly Enabled: "Enabled";
};
/**
 * @public
 */
export type EnabledOrDisabled = (typeof EnabledOrDisabled)[keyof typeof EnabledOrDisabled];
/**
 * <p>Use this parameter to specify a supported global condition key that is added to the IAM policy.</p>
 * @public
 */
export interface IamPolicyConstraints {
    /**
     * <p>When <code>SourceIp</code> is <code>Enabled</code> the worker's IP address when a task is rendered in the worker portal is added to the IAM policy as a <code>Condition</code> used to generate the Amazon S3 presigned URL. This IP address is checked by Amazon S3 and must match in order for the Amazon S3 resource to be rendered in the worker portal.</p>
     * @public
     */
    SourceIp?: EnabledOrDisabled | undefined;
    /**
     * <p>When <code>VpcSourceIp</code> is <code>Enabled</code> the worker's IP address when a task is rendered in private worker portal inside the VPC is added to the IAM policy as a <code>Condition</code> used to generate the Amazon S3 presigned URL. To render the task successfully Amazon S3 checks that the presigned URL is being accessed over an Amazon S3 VPC Endpoint, and that the worker's IP address matches the IP address in the IAM policy. To learn more about configuring private worker portal, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/samurai-vpc-worker-portal.html">Use Amazon VPC mode from a private worker portal</a>.</p>
     * @public
     */
    VpcSourceIp?: EnabledOrDisabled | undefined;
}
/**
 * <p>This object defines the access restrictions to Amazon S3 resources that are included in custom worker task templates using the Liquid filter, <code>grant_read_access</code>.</p> <p>To learn more about how custom templates are created, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/a2i-custom-templates.html">Create custom worker task templates</a>.</p>
 * @public
 */
export interface S3Presign {
    /**
     * <p>Use this parameter to specify the allowed request source. Possible sources are either <code>SourceIp</code> or <code>VpcSourceIp</code>.</p>
     * @public
     */
    IamPolicyConstraints?: IamPolicyConstraints | undefined;
}
/**
 * <p>Use this optional parameter to constrain access to an Amazon S3 resource based on the IP address using supported IAM global condition keys. The Amazon S3 resource is accessed in the worker portal using a Amazon S3 presigned URL.</p>
 * @public
 */
export interface WorkerAccessConfiguration {
    /**
     * <p>Defines any Amazon S3 resource constraints.</p>
     * @public
     */
    S3Presign?: S3Presign | undefined;
}
/**
 * @public
 */
export interface CreateWorkteamRequest {
    /**
     * <p>The name of the work team. Use this name to identify the work team.</p>
     * @public
     */
    WorkteamName: string | undefined;
    /**
     * <p>The name of the workforce.</p>
     * @public
     */
    WorkforceName?: string | undefined;
    /**
     * <p>A list of <code>MemberDefinition</code> objects that contains objects that identify the workers that make up the work team. </p> <p>Workforces can be created using Amazon Cognito or your own OIDC Identity Provider (IdP). For private workforces created using Amazon Cognito use <code>CognitoMemberDefinition</code>. For workforces created using your own OIDC identity provider (IdP) use <code>OidcMemberDefinition</code>. Do not provide input for both of these parameters in a single request.</p> <p>For workforces created using Amazon Cognito, private work teams correspond to Amazon Cognito <i>user groups</i> within the user pool used to create a workforce. All of the <code>CognitoMemberDefinition</code> objects that make up the member definition must have the same <code>ClientId</code> and <code>UserPool</code> values. To add a Amazon Cognito user group to an existing worker pool, see <a href="">Adding groups to a User Pool</a>. For more information about user pools, see <a href="https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html">Amazon Cognito User Pools</a>.</p> <p>For workforces created using your own OIDC IdP, specify the user groups that you want to include in your private work team in <code>OidcMemberDefinition</code> by listing those groups in <code>Groups</code>.</p>
     * @public
     */
    MemberDefinitions: MemberDefinition[] | undefined;
    /**
     * <p>A description of the work team.</p>
     * @public
     */
    Description: string | undefined;
    /**
     * <p>Configures notification of workers regarding available or expiring work items.</p>
     * @public
     */
    NotificationConfiguration?: NotificationConfiguration | undefined;
    /**
     * <p>Use this optional parameter to constrain access to an Amazon S3 resource based on the IP address using supported IAM global condition keys. The Amazon S3 resource is accessed in the worker portal using a Amazon S3 presigned URL.</p>
     * @public
     */
    WorkerAccessConfiguration?: WorkerAccessConfiguration | undefined;
    /**
     * <p>An array of key-value pairs.</p> <p>For more information, see <a href="https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-resource-tags.html">Resource Tag</a> and <a href="https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html#allocation-what">Using Cost Allocation Tags</a> in the <i> Amazon Web Services Billing and Cost Management User Guide</i>.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * @public
 */
export interface CreateWorkteamResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the work team. You can use this ARN to identify the work team.</p>
     * @public
     */
    WorkteamArn?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const CrossAccountFilterOption: {
    readonly CROSS_ACCOUNT: "CrossAccount";
    readonly SAME_ACCOUNT: "SameAccount";
};
/**
 * @public
 */
export type CrossAccountFilterOption = (typeof CrossAccountFilterOption)[keyof typeof CrossAccountFilterOption];
/**
 * @public
 * @enum
 */
export declare const Statistic: {
    readonly AVERAGE: "Average";
    readonly MAXIMUM: "Maximum";
    readonly MINIMUM: "Minimum";
    readonly SAMPLE_COUNT: "SampleCount";
    readonly SUM: "Sum";
};
/**
 * @public
 */
export type Statistic = (typeof Statistic)[keyof typeof Statistic];
/**
 * <p>A customized metric.</p>
 * @public
 */
export interface CustomizedMetricSpecification {
    /**
     * <p>The name of the customized metric.</p>
     * @public
     */
    MetricName?: string | undefined;
    /**
     * <p>The namespace of the customized metric.</p>
     * @public
     */
    Namespace?: string | undefined;
    /**
     * <p>The statistic of the customized metric.</p>
     * @public
     */
    Statistic?: Statistic | undefined;
}
/**
 * <p>The currently active data capture configuration used by your Endpoint.</p>
 * @public
 */
export interface DataCaptureConfigSummary {
    /**
     * <p>Whether data capture is enabled or disabled.</p>
     * @public
     */
    EnableCapture: boolean | undefined;
    /**
     * <p>Whether data capture is currently functional.</p>
     * @public
     */
    CaptureStatus: CaptureStatus | undefined;
    /**
     * <p>The percentage of requests being captured by your Endpoint.</p>
     * @public
     */
    CurrentSamplingPercentage: number | undefined;
    /**
     * <p>The Amazon S3 location being used to capture the data.</p>
     * @public
     */
    DestinationS3Uri: string | undefined;
    /**
     * <p>The KMS key being used to encrypt the data in Amazon S3.</p>
     * @public
     */
    KmsKeyId: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const RuleEvaluationStatus: {
    readonly ERROR: "Error";
    readonly IN_PROGRESS: "InProgress";
    readonly ISSUES_FOUND: "IssuesFound";
    readonly NO_ISSUES_FOUND: "NoIssuesFound";
    readonly STOPPED: "Stopped";
    readonly STOPPING: "Stopping";
};
/**
 * @public
 */
export type RuleEvaluationStatus = (typeof RuleEvaluationStatus)[keyof typeof RuleEvaluationStatus];
/**
 * <p>Information about the status of the rule evaluation.</p>
 * @public
 */
export interface DebugRuleEvaluationStatus {
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
 * @public
 */
export interface DeleteActionRequest {
    /**
     * <p>The name of the action to delete.</p>
     * @public
     */
    ActionName: string | undefined;
}
/**
 * @public
 */
export interface DeleteActionResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the action.</p>
     * @public
     */
    ActionArn?: string | undefined;
}
/**
 * @public
 */
export interface DeleteAlgorithmInput {
    /**
     * <p>The name of the algorithm to delete.</p>
     * @public
     */
    AlgorithmName: string | undefined;
}
/**
 * @public
 */
export interface DeleteAppRequest {
    /**
     * <p>The domain ID.</p>
     * @public
     */
    DomainId: string | undefined;
    /**
     * <p>The user profile name. If this value is not set, then <code>SpaceName</code> must be set.</p>
     * @public
     */
    UserProfileName?: string | undefined;
    /**
     * <p>The name of the space. If this value is not set, then <code>UserProfileName</code> must be set.</p>
     * @public
     */
    SpaceName?: string | undefined;
    /**
     * <p>The type of app.</p>
     * @public
     */
    AppType: AppType | undefined;
    /**
     * <p>The name of the app.</p>
     * @public
     */
    AppName: string | undefined;
}
/**
 * @public
 */
export interface DeleteAppImageConfigRequest {
    /**
     * <p>The name of the AppImageConfig to delete.</p>
     * @public
     */
    AppImageConfigName: string | undefined;
}
/**
 * @public
 */
export interface DeleteArtifactRequest {
    /**
     * <p>The Amazon Resource Name (ARN) of the artifact to delete.</p>
     * @public
     */
    ArtifactArn?: string | undefined;
    /**
     * <p>The URI of the source.</p>
     * @public
     */
    Source?: ArtifactSource | undefined;
}
/**
 * @public
 */
export interface DeleteArtifactResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the artifact.</p>
     * @public
     */
    ArtifactArn?: string | undefined;
}
/**
 * @public
 */
export interface DeleteAssociationRequest {
    /**
     * <p>The ARN of the source.</p>
     * @public
     */
    SourceArn: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the destination.</p>
     * @public
     */
    DestinationArn: string | undefined;
}
/**
 * @public
 */
export interface DeleteAssociationResponse {
    /**
     * <p>The ARN of the source.</p>
     * @public
     */
    SourceArn?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the destination.</p>
     * @public
     */
    DestinationArn?: string | undefined;
}
/**
 * @public
 */
export interface DeleteClusterRequest {
    /**
     * <p>The string name or the Amazon Resource Name (ARN) of the SageMaker HyperPod cluster to delete.</p>
     * @public
     */
    ClusterName: string | undefined;
}
/**
 * @public
 */
export interface DeleteClusterResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the SageMaker HyperPod cluster to delete.</p>
     * @public
     */
    ClusterArn: string | undefined;
}
/**
 * @public
 */
export interface DeleteClusterSchedulerConfigRequest {
    /**
     * <p>ID of the cluster policy.</p>
     * @public
     */
    ClusterSchedulerConfigId: string | undefined;
}
/**
 * @public
 */
export interface DeleteCodeRepositoryInput {
    /**
     * <p>The name of the Git repository to delete.</p>
     * @public
     */
    CodeRepositoryName: string | undefined;
}
/**
 * @public
 */
export interface DeleteCompilationJobRequest {
    /**
     * <p>The name of the compilation job to delete.</p>
     * @public
     */
    CompilationJobName: string | undefined;
}
/**
 * @public
 */
export interface DeleteComputeQuotaRequest {
    /**
     * <p>ID of the compute allocation definition.</p>
     * @public
     */
    ComputeQuotaId: string | undefined;
}
/**
 * @public
 */
export interface DeleteContextRequest {
    /**
     * <p>The name of the context to delete.</p>
     * @public
     */
    ContextName: string | undefined;
}
/**
 * @public
 */
export interface DeleteContextResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the context.</p>
     * @public
     */
    ContextArn?: string | undefined;
}
/**
 * @public
 */
export interface DeleteDataQualityJobDefinitionRequest {
    /**
     * <p>The name of the data quality monitoring job definition to delete.</p>
     * @public
     */
    JobDefinitionName: string | undefined;
}
/**
 * @public
 */
export interface DeleteDeviceFleetRequest {
    /**
     * <p>The name of the fleet to delete.</p>
     * @public
     */
    DeviceFleetName: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const RetentionType: {
    readonly Delete: "Delete";
    readonly Retain: "Retain";
};
/**
 * @public
 */
export type RetentionType = (typeof RetentionType)[keyof typeof RetentionType];
/**
 * <p>The retention policy for data stored on an Amazon Elastic File System volume.</p>
 * @public
 */
export interface RetentionPolicy {
    /**
     * <p>The default is <code>Retain</code>, which specifies to keep the data stored on the Amazon EFS volume.</p> <p>Specify <code>Delete</code> to delete the data stored on the Amazon EFS volume.</p>
     * @public
     */
    HomeEfsFileSystem?: RetentionType | undefined;
}
/**
 * @public
 */
export interface DeleteDomainRequest {
    /**
     * <p>The domain ID.</p>
     * @public
     */
    DomainId: string | undefined;
    /**
     * <p>The retention policy for this domain, which specifies whether resources will be retained after the Domain is deleted. By default, all resources are retained (not automatically deleted). </p>
     * @public
     */
    RetentionPolicy?: RetentionPolicy | undefined;
}
/**
 * @public
 */
export interface DeleteEdgeDeploymentPlanRequest {
    /**
     * <p>The name of the edge deployment plan to delete.</p>
     * @public
     */
    EdgeDeploymentPlanName: string | undefined;
}
/**
 * @public
 */
export interface DeleteEdgeDeploymentStageRequest {
    /**
     * <p>The name of the edge deployment plan from which the stage will be deleted.</p>
     * @public
     */
    EdgeDeploymentPlanName: string | undefined;
    /**
     * <p>The name of the stage.</p>
     * @public
     */
    StageName: string | undefined;
}
/**
 * @public
 */
export interface DeleteEndpointInput {
    /**
     * <p>The name of the endpoint that you want to delete.</p>
     * @public
     */
    EndpointName: string | undefined;
}
/**
 * @public
 */
export interface DeleteEndpointConfigInput {
    /**
     * <p>The name of the endpoint configuration that you want to delete.</p>
     * @public
     */
    EndpointConfigName: string | undefined;
}
/**
 * @public
 */
export interface DeleteExperimentRequest {
    /**
     * <p>The name of the experiment to delete.</p>
     * @public
     */
    ExperimentName: string | undefined;
}
/**
 * @public
 */
export interface DeleteExperimentResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the experiment that is being deleted.</p>
     * @public
     */
    ExperimentArn?: string | undefined;
}
/**
 * @public
 */
export interface DeleteFeatureGroupRequest {
    /**
     * <p>The name of the <code>FeatureGroup</code> you want to delete. The name must be unique within an Amazon Web Services Region in an Amazon Web Services account. </p>
     * @public
     */
    FeatureGroupName: string | undefined;
}
/**
 * @public
 */
export interface DeleteFlowDefinitionRequest {
    /**
     * <p>The name of the flow definition you are deleting.</p>
     * @public
     */
    FlowDefinitionName: string | undefined;
}
/**
 * @public
 */
export interface DeleteFlowDefinitionResponse {
}
/**
 * @public
 */
export interface DeleteHubRequest {
    /**
     * <p>The name of the hub to delete.</p>
     * @public
     */
    HubName: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const HubContentType: {
    readonly MODEL: "Model";
    readonly MODEL_REFERENCE: "ModelReference";
    readonly NOTEBOOK: "Notebook";
};
/**
 * @public
 */
export type HubContentType = (typeof HubContentType)[keyof typeof HubContentType];
/**
 * @public
 */
export interface DeleteHubContentRequest {
    /**
     * <p>The name of the hub that you want to delete content in.</p>
     * @public
     */
    HubName: string | undefined;
    /**
     * <p>The type of content that you want to delete from a hub.</p>
     * @public
     */
    HubContentType: HubContentType | undefined;
    /**
     * <p>The name of the content that you want to delete from a hub.</p>
     * @public
     */
    HubContentName: string | undefined;
    /**
     * <p>The version of the content that you want to delete from a hub.</p>
     * @public
     */
    HubContentVersion: string | undefined;
}
/**
 * @public
 */
export interface DeleteHubContentReferenceRequest {
    /**
     * <p>The name of the hub to delete the hub content reference from.</p>
     * @public
     */
    HubName: string | undefined;
    /**
     * <p>The type of hub content reference to delete. The only supported type of hub content reference to delete is <code>ModelReference</code>.</p>
     * @public
     */
    HubContentType: HubContentType | undefined;
    /**
     * <p>The name of the hub content to delete.</p>
     * @public
     */
    HubContentName: string | undefined;
}
/**
 * @public
 */
export interface DeleteHumanTaskUiRequest {
    /**
     * <p>The name of the human task user interface (work task template) you want to delete.</p>
     * @public
     */
    HumanTaskUiName: string | undefined;
}
/**
 * @public
 */
export interface DeleteHumanTaskUiResponse {
}
/**
 * @public
 */
export interface DeleteHyperParameterTuningJobRequest {
    /**
     * <p>The name of the hyperparameter tuning job that you want to delete.</p>
     * @public
     */
    HyperParameterTuningJobName: string | undefined;
}
/**
 * @public
 */
export interface DeleteImageRequest {
    /**
     * <p>The name of the image to delete.</p>
     * @public
     */
    ImageName: string | undefined;
}
/**
 * @public
 */
export interface DeleteImageResponse {
}
/**
 * @public
 */
export interface DeleteImageVersionRequest {
    /**
     * <p>The name of the image to delete.</p>
     * @public
     */
    ImageName: string | undefined;
    /**
     * <p>The version to delete.</p>
     * @public
     */
    Version?: number | undefined;
    /**
     * <p>The alias of the image to delete.</p>
     * @public
     */
    Alias?: string | undefined;
}
/**
 * @public
 */
export interface DeleteImageVersionResponse {
}
/**
 * @public
 */
export interface DeleteInferenceComponentInput {
    /**
     * <p>The name of the inference component to delete.</p>
     * @public
     */
    InferenceComponentName: string | undefined;
}
/**
 * @public
 */
export interface DeleteInferenceExperimentRequest {
    /**
     * <p>The name of the inference experiment you want to delete.</p>
     * @public
     */
    Name: string | undefined;
}
/**
 * @public
 */
export interface DeleteInferenceExperimentResponse {
    /**
     * <p>The ARN of the deleted inference experiment.</p>
     * @public
     */
    InferenceExperimentArn: string | undefined;
}
/**
 * @public
 */
export interface DeleteMlflowTrackingServerRequest {
    /**
     * <p>The name of the the tracking server to delete.</p>
     * @public
     */
    TrackingServerName: string | undefined;
}
/**
 * @public
 */
export interface DeleteMlflowTrackingServerResponse {
    /**
     * <p>A <code>TrackingServerArn</code> object, the ARN of the tracking server that is deleted if successfully found.</p>
     * @public
     */
    TrackingServerArn?: string | undefined;
}
/**
 * @public
 */
export interface DeleteModelInput {
    /**
     * <p>The name of the model to delete.</p>
     * @public
     */
    ModelName: string | undefined;
}
/**
 * @public
 */
export interface DeleteModelBiasJobDefinitionRequest {
    /**
     * <p>The name of the model bias job definition to delete.</p>
     * @public
     */
    JobDefinitionName: string | undefined;
}
/**
 * @public
 */
export interface DeleteModelCardRequest {
    /**
     * <p>The name of the model card to delete.</p>
     * @public
     */
    ModelCardName: string | undefined;
}
/**
 * @public
 */
export interface DeleteModelExplainabilityJobDefinitionRequest {
    /**
     * <p>The name of the model explainability job definition to delete.</p>
     * @public
     */
    JobDefinitionName: string | undefined;
}
/**
 * @public
 */
export interface DeleteModelPackageInput {
    /**
     * <p>The name or Amazon Resource Name (ARN) of the model package to delete.</p> <p>When you specify a name, the name must have 1 to 63 characters. Valid characters are a-z, A-Z, 0-9, and - (hyphen).</p>
     * @public
     */
    ModelPackageName: string | undefined;
}
/**
 * @public
 */
export interface DeleteModelPackageGroupInput {
    /**
     * <p>The name of the model group to delete.</p>
     * @public
     */
    ModelPackageGroupName: string | undefined;
}
/**
 * @public
 */
export interface DeleteModelPackageGroupPolicyInput {
    /**
     * <p>The name of the model group for which to delete the policy.</p>
     * @public
     */
    ModelPackageGroupName: string | undefined;
}
/**
 * @public
 */
export interface DeleteModelQualityJobDefinitionRequest {
    /**
     * <p>The name of the model quality monitoring job definition to delete.</p>
     * @public
     */
    JobDefinitionName: string | undefined;
}
/**
 * @public
 */
export interface DeleteMonitoringScheduleRequest {
    /**
     * <p>The name of the monitoring schedule to delete.</p>
     * @public
     */
    MonitoringScheduleName: string | undefined;
}
/**
 * @public
 */
export interface DeleteNotebookInstanceInput {
    /**
     * <p>The name of the SageMaker AI notebook instance to delete.</p>
     * @public
     */
    NotebookInstanceName: string | undefined;
}
/**
 * @public
 */
export interface DeleteNotebookInstanceLifecycleConfigInput {
    /**
     * <p>The name of the lifecycle configuration to delete.</p>
     * @public
     */
    NotebookInstanceLifecycleConfigName: string | undefined;
}
/**
 * @public
 */
export interface DeleteOptimizationJobRequest {
    /**
     * <p>The name that you assigned to the optimization job.</p>
     * @public
     */
    OptimizationJobName: string | undefined;
}
/**
 * @public
 */
export interface DeletePartnerAppRequest {
    /**
     * <p>The ARN of the SageMaker Partner AI App to delete.</p>
     * @public
     */
    Arn: string | undefined;
    /**
     * <p>A unique token that guarantees that the call to this API is idempotent.</p>
     * @public
     */
    ClientToken?: string | undefined;
}
/**
 * @public
 */
export interface DeletePartnerAppResponse {
    /**
     * <p>The ARN of the SageMaker Partner AI App that was deleted.</p>
     * @public
     */
    Arn?: string | undefined;
}
/**
 * @public
 */
export interface DeletePipelineRequest {
    /**
     * <p>The name of the pipeline to delete.</p>
     * @public
     */
    PipelineName: string | undefined;
    /**
     * <p>A unique, case-sensitive identifier that you provide to ensure the idempotency of the operation. An idempotent operation completes no more than one time.</p>
     * @public
     */
    ClientRequestToken?: string | undefined;
}
/**
 * @public
 */
export interface DeletePipelineResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the pipeline to delete.</p>
     * @public
     */
    PipelineArn?: string | undefined;
}
/**
 * @public
 */
export interface DeleteProjectInput {
    /**
     * <p>The name of the project to delete.</p>
     * @public
     */
    ProjectName: string | undefined;
}
/**
 * @public
 */
export interface DeleteSpaceRequest {
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
export interface DeleteStudioLifecycleConfigRequest {
    /**
     * <p>The name of the Amazon SageMaker AI Studio Lifecycle Configuration to delete.</p>
     * @public
     */
    StudioLifecycleConfigName: string | undefined;
}
/**
 * @public
 */
export interface DeleteTagsInput {
    /**
     * <p>The Amazon Resource Name (ARN) of the resource whose tags you want to delete.</p>
     * @public
     */
    ResourceArn: string | undefined;
    /**
     * <p>An array or one or more tag keys to delete.</p>
     * @public
     */
    TagKeys: string[] | undefined;
}
/**
 * @public
 */
export interface DeleteTagsOutput {
}
/**
 * @public
 */
export interface DeleteTrialRequest {
    /**
     * <p>The name of the trial to delete.</p>
     * @public
     */
    TrialName: string | undefined;
}
/**
 * @public
 */
export interface DeleteTrialResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the trial that is being deleted.</p>
     * @public
     */
    TrialArn?: string | undefined;
}
/**
 * @public
 */
export interface DeleteTrialComponentRequest {
    /**
     * <p>The name of the component to delete.</p>
     * @public
     */
    TrialComponentName: string | undefined;
}
/**
 * @public
 */
export interface DeleteTrialComponentResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the component is being deleted.</p>
     * @public
     */
    TrialComponentArn?: string | undefined;
}
/**
 * @public
 */
export interface DeleteUserProfileRequest {
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
}
/**
 * @public
 */
export interface DeleteWorkforceRequest {
    /**
     * <p>The name of the workforce.</p>
     * @public
     */
    WorkforceName: string | undefined;
}
/**
 * @public
 */
export interface DeleteWorkforceResponse {
}
/**
 * @public
 */
export interface DeleteWorkteamRequest {
    /**
     * <p>The name of the work team to delete.</p>
     * @public
     */
    WorkteamName: string | undefined;
}
/**
 * @public
 */
export interface DeleteWorkteamResponse {
    /**
     * <p>Returns <code>true</code> if the work team was successfully deleted; otherwise, returns <code>false</code>.</p>
     * @public
     */
    Success: boolean | undefined;
}
/**
 * <p>Gets the Amazon EC2 Container Registry path of the docker image of the model that is hosted in this <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_ProductionVariant.html">ProductionVariant</a>.</p> <p>If you used the <code>registry/repository[:tag]</code> form to specify the image path of the primary container when you created the model hosted in this <code>ProductionVariant</code>, the path resolves to a path of the form <code>registry/repository[@digest]</code>. A digest is a hash value that identifies a specific version of an image. For information about Amazon ECR paths, see <a href="https://docs.aws.amazon.com/AmazonECR/latest/userguide/docker-pull-ecr-image.html">Pulling an Image</a> in the <i>Amazon ECR User Guide</i>.</p>
 * @public
 */
export interface DeployedImage {
    /**
     * <p>The image path you specified when you created the model.</p>
     * @public
     */
    SpecifiedImage?: string | undefined;
    /**
     * <p>The specific digest path of the image hosted in this <code>ProductionVariant</code>.</p>
     * @public
     */
    ResolvedImage?: string | undefined;
    /**
     * <p>The date and time when the image path for the model resolved to the <code>ResolvedImage</code> </p>
     * @public
     */
    ResolutionTime?: Date | undefined;
}
/**
 * <p>The recommended configuration to use for Real-Time Inference.</p>
 * @public
 */
export interface RealTimeInferenceRecommendation {
    /**
     * <p>The recommendation ID which uniquely identifies each recommendation.</p>
     * @public
     */
    RecommendationId: string | undefined;
    /**
     * <p>The recommended instance type for Real-Time Inference.</p>
     * @public
     */
    InstanceType: ProductionVariantInstanceType | undefined;
    /**
     * <p>The recommended environment variables to set in the model container for Real-Time Inference.</p>
     * @public
     */
    Environment?: Record<string, string> | undefined;
}
/**
 * @public
 * @enum
 */
export declare const RecommendationStatus: {
    readonly COMPLETED: "COMPLETED";
    readonly FAILED: "FAILED";
    readonly IN_PROGRESS: "IN_PROGRESS";
    readonly NOT_APPLICABLE: "NOT_APPLICABLE";
};
/**
 * @public
 */
export type RecommendationStatus = (typeof RecommendationStatus)[keyof typeof RecommendationStatus];
/**
 * <p>A set of recommended deployment configurations for the model. To get more advanced recommendations, see <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateInferenceRecommendationsJob.html">CreateInferenceRecommendationsJob</a> to create an inference recommendation job.</p>
 * @public
 */
export interface DeploymentRecommendation {
    /**
     * <p>Status of the deployment recommendation. The status <code>NOT_APPLICABLE</code> means that SageMaker is unable to provide a default recommendation for the model using the information provided. If the deployment status is <code>IN_PROGRESS</code>, retry your API call after a few seconds to get a <code>COMPLETED</code> deployment recommendation.</p>
     * @public
     */
    RecommendationStatus: RecommendationStatus | undefined;
    /**
     * <p>A list of <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_RealTimeInferenceRecommendation.html">RealTimeInferenceRecommendation</a> items.</p>
     * @public
     */
    RealTimeInferenceRecommendations?: RealTimeInferenceRecommendation[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const StageStatus: {
    readonly Creating: "CREATING";
    readonly Deployed: "DEPLOYED";
    readonly Failed: "FAILED";
    readonly InProgress: "INPROGRESS";
    readonly ReadyToDeploy: "READYTODEPLOY";
    readonly Starting: "STARTING";
    readonly Stopped: "STOPPED";
    readonly Stopping: "STOPPING";
};
/**
 * @public
 */
export type StageStatus = (typeof StageStatus)[keyof typeof StageStatus];
/**
 * <p>Contains information summarizing the deployment stage results.</p>
 * @public
 */
export interface EdgeDeploymentStatus {
    /**
     * <p>The general status of the current stage.</p>
     * @public
     */
    StageStatus: StageStatus | undefined;
    /**
     * <p>The number of edge devices with the successful deployment in the current stage.</p>
     * @public
     */
    EdgeDeploymentSuccessInStage: number | undefined;
    /**
     * <p>The number of edge devices yet to pick up the deployment in current stage, or in progress.</p>
     * @public
     */
    EdgeDeploymentPendingInStage: number | undefined;
    /**
     * <p>The number of edge devices that failed the deployment in current stage.</p>
     * @public
     */
    EdgeDeploymentFailedInStage: number | undefined;
    /**
     * <p>A detailed message about deployment status in current stage.</p>
     * @public
     */
    EdgeDeploymentStatusMessage?: string | undefined;
    /**
     * <p>The time when the deployment API started.</p>
     * @public
     */
    EdgeDeploymentStageStartTime?: Date | undefined;
}
/**
 * <p>Contains information summarizing the deployment stage results.</p>
 * @public
 */
export interface DeploymentStageStatusSummary {
    /**
     * <p>The name of the stage.</p>
     * @public
     */
    StageName: string | undefined;
    /**
     * <p>Configuration of the devices in the stage.</p>
     * @public
     */
    DeviceSelectionConfig: DeviceSelectionConfig | undefined;
    /**
     * <p>Configuration of the deployment details.</p>
     * @public
     */
    DeploymentConfig: EdgeDeploymentConfig | undefined;
    /**
     * <p>General status of the current state.</p>
     * @public
     */
    DeploymentStatus: EdgeDeploymentStatus | undefined;
}
/**
 * @public
 */
export interface DeregisterDevicesRequest {
    /**
     * <p>The name of the fleet the devices belong to.</p>
     * @public
     */
    DeviceFleetName: string | undefined;
    /**
     * <p>The unique IDs of the devices.</p>
     * @public
     */
    DeviceNames: string[] | undefined;
}
/**
 * <p>Information that SageMaker Neo automatically derived about the model.</p>
 * @public
 */
export interface DerivedInformation {
    /**
     * <p>The data input configuration that SageMaker Neo automatically derived for the model. When SageMaker Neo derives this information, you don't need to specify the data input configuration when you create a compilation job.</p>
     * @public
     */
    DerivedDataInputConfig?: string | undefined;
}
/**
 * @public
 */
export interface DescribeActionRequest {
    /**
     * <p>The name of the action to describe.</p>
     * @public
     */
    ActionName: string | undefined;
}
/**
 * @public
 */
export interface DescribeActionResponse {
    /**
     * <p>The name of the action.</p>
     * @public
     */
    ActionName?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the action.</p>
     * @public
     */
    ActionArn?: string | undefined;
    /**
     * <p>The source of the action.</p>
     * @public
     */
    Source?: ActionSource | undefined;
    /**
     * <p>The type of the action.</p>
     * @public
     */
    ActionType?: string | undefined;
    /**
     * <p>The description of the action.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>The status of the action.</p>
     * @public
     */
    Status?: ActionStatus | undefined;
    /**
     * <p>A list of the action's properties.</p>
     * @public
     */
    Properties?: Record<string, string> | undefined;
    /**
     * <p>When the action was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>Information about the user who created or modified an experiment, trial, trial component, lineage group, project, or model card.</p>
     * @public
     */
    CreatedBy?: UserContext | undefined;
    /**
     * <p>When the action was last modified.</p>
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
     * <p>The Amazon Resource Name (ARN) of the lineage group.</p>
     * @public
     */
    LineageGroupArn?: string | undefined;
}
/**
 * @public
 */
export interface DescribeAlgorithmInput {
    /**
     * <p>The name of the algorithm to describe.</p>
     * @public
     */
    AlgorithmName: string | undefined;
}
/**
 * @public
 */
export interface DescribeAlgorithmOutput {
    /**
     * <p>The name of the algorithm being described.</p>
     * @public
     */
    AlgorithmName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the algorithm.</p>
     * @public
     */
    AlgorithmArn: string | undefined;
    /**
     * <p>A brief summary about the algorithm.</p>
     * @public
     */
    AlgorithmDescription?: string | undefined;
    /**
     * <p>A timestamp specifying when the algorithm was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>Details about training jobs run by this algorithm.</p>
     * @public
     */
    TrainingSpecification: TrainingSpecification | undefined;
    /**
     * <p>Details about inference jobs that the algorithm runs.</p>
     * @public
     */
    InferenceSpecification?: InferenceSpecification | undefined;
    /**
     * <p>Details about configurations for one or more training jobs that SageMaker runs to test the algorithm.</p>
     * @public
     */
    ValidationSpecification?: AlgorithmValidationSpecification | undefined;
    /**
     * <p>The current status of the algorithm.</p>
     * @public
     */
    AlgorithmStatus: AlgorithmStatus | undefined;
    /**
     * <p>Details about the current status of the algorithm.</p>
     * @public
     */
    AlgorithmStatusDetails: AlgorithmStatusDetails | undefined;
    /**
     * <p>The product identifier of the algorithm.</p>
     * @public
     */
    ProductId?: string | undefined;
    /**
     * <p>Whether the algorithm is certified to be listed in Amazon Web Services Marketplace.</p>
     * @public
     */
    CertifyForMarketplace?: boolean | undefined;
}
/**
 * @public
 */
export interface DescribeAppRequest {
    /**
     * <p>The domain ID.</p>
     * @public
     */
    DomainId: string | undefined;
    /**
     * <p>The user profile name. If this value is not set, then <code>SpaceName</code> must be set.</p>
     * @public
     */
    UserProfileName?: string | undefined;
    /**
     * <p>The name of the space.</p>
     * @public
     */
    SpaceName?: string | undefined;
    /**
     * <p>The type of app.</p>
     * @public
     */
    AppType: AppType | undefined;
    /**
     * <p>The name of the app.</p>
     * @public
     */
    AppName: string | undefined;
}
/**
 * @public
 */
export interface DescribeAppResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the app.</p>
     * @public
     */
    AppArn?: string | undefined;
    /**
     * <p>The type of app.</p>
     * @public
     */
    AppType?: AppType | undefined;
    /**
     * <p>The name of the app.</p>
     * @public
     */
    AppName?: string | undefined;
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
     * <p>The name of the space. If this value is not set, then <code>UserProfileName</code> must be set.</p>
     * @public
     */
    SpaceName?: string | undefined;
    /**
     * <p>The status.</p>
     * @public
     */
    Status?: AppStatus | undefined;
    /**
     * <p> Indicates whether the application is launched in recovery mode. </p>
     * @public
     */
    RecoveryMode?: boolean | undefined;
    /**
     * <p>The timestamp of the last health check.</p>
     * @public
     */
    LastHealthCheckTimestamp?: Date | undefined;
    /**
     * <p>The timestamp of the last user's activity. <code>LastUserActivityTimestamp</code> is also updated when SageMaker AI performs health checks without user activity. As a result, this value is set to the same value as <code>LastHealthCheckTimestamp</code>.</p>
     * @public
     */
    LastUserActivityTimestamp?: Date | undefined;
    /**
     * <p>The creation time of the application.</p> <note> <p>After an application has been shut down for 24 hours, SageMaker AI deletes all metadata for the application. To be considered an update and retain application metadata, applications must be restarted within 24 hours after the previous application has been shut down. After this time window, creation of an application is considered a new application rather than an update of the previous application.</p> </note>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>The failure reason.</p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>The instance type and the Amazon Resource Name (ARN) of the SageMaker AI image created on the instance.</p>
     * @public
     */
    ResourceSpec?: ResourceSpec | undefined;
    /**
     * <p>The lifecycle configuration that runs before the default lifecycle configuration</p>
     * @public
     */
    BuiltInLifecycleConfigArn?: string | undefined;
}
/**
 * @public
 */
export interface DescribeAppImageConfigRequest {
    /**
     * <p>The name of the AppImageConfig to describe.</p>
     * @public
     */
    AppImageConfigName: string | undefined;
}
/**
 * @public
 */
export interface DescribeAppImageConfigResponse {
    /**
     * <p>The ARN of the AppImageConfig.</p>
     * @public
     */
    AppImageConfigArn?: string | undefined;
    /**
     * <p>The name of the AppImageConfig.</p>
     * @public
     */
    AppImageConfigName?: string | undefined;
    /**
     * <p>When the AppImageConfig was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>When the AppImageConfig was last modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>The configuration of a KernelGateway app.</p>
     * @public
     */
    KernelGatewayImageConfig?: KernelGatewayImageConfig | undefined;
    /**
     * <p>The configuration of the JupyterLab app.</p>
     * @public
     */
    JupyterLabAppImageConfig?: JupyterLabAppImageConfig | undefined;
    /**
     * <p>The configuration of the Code Editor app.</p>
     * @public
     */
    CodeEditorAppImageConfig?: CodeEditorAppImageConfig | undefined;
}
/**
 * @public
 */
export interface DescribeArtifactRequest {
    /**
     * <p>The Amazon Resource Name (ARN) of the artifact to describe.</p>
     * @public
     */
    ArtifactArn: string | undefined;
}
/**
 * @public
 */
export interface DescribeArtifactResponse {
    /**
     * <p>The name of the artifact.</p>
     * @public
     */
    ArtifactName?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the artifact.</p>
     * @public
     */
    ArtifactArn?: string | undefined;
    /**
     * <p>The source of the artifact.</p>
     * @public
     */
    Source?: ArtifactSource | undefined;
    /**
     * <p>The type of the artifact.</p>
     * @public
     */
    ArtifactType?: string | undefined;
    /**
     * <p>A list of the artifact's properties.</p>
     * @public
     */
    Properties?: Record<string, string> | undefined;
    /**
     * <p>When the artifact was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>Information about the user who created or modified an experiment, trial, trial component, lineage group, project, or model card.</p>
     * @public
     */
    CreatedBy?: UserContext | undefined;
    /**
     * <p>When the artifact was last modified.</p>
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
     * <p>The Amazon Resource Name (ARN) of the lineage group.</p>
     * @public
     */
    LineageGroupArn?: string | undefined;
}
/**
 * @public
 */
export interface DescribeAutoMLJobRequest {
    /**
     * <p>Requests information about an AutoML job using its unique name.</p>
     * @public
     */
    AutoMLJobName: string | undefined;
}
/**
 * <p>Provides information about the endpoint of the model deployment.</p>
 * @public
 */
export interface ModelDeployResult {
    /**
     * <p>The name of the endpoint to which the model has been deployed.</p> <note> <p>If model deployment fails, this field is omitted from the response.</p> </note>
     * @public
     */
    EndpointName?: string | undefined;
}
/**
 * <p>The resolved attributes.</p>
 * @public
 */
export interface ResolvedAttributes {
    /**
     * <p>Specifies a metric to minimize or maximize as the objective of an AutoML job.</p>
     * @public
     */
    AutoMLJobObjective?: AutoMLJobObjective | undefined;
    /**
     * <p>The problem type.</p>
     * @public
     */
    ProblemType?: ProblemType | undefined;
    /**
     * <p>How long a job is allowed to run, or how many candidates a job is allowed to generate.</p>
     * @public
     */
    CompletionCriteria?: AutoMLJobCompletionCriteria | undefined;
}
/**
 * @public
 */
export interface DescribeAutoMLJobResponse {
    /**
     * <p>Returns the name of the AutoML job.</p>
     * @public
     */
    AutoMLJobName: string | undefined;
    /**
     * <p>Returns the ARN of the AutoML job.</p>
     * @public
     */
    AutoMLJobArn: string | undefined;
    /**
     * <p>Returns the input data configuration for the AutoML job.</p>
     * @public
     */
    InputDataConfig: AutoMLChannel[] | undefined;
    /**
     * <p>Returns the job's output data config.</p>
     * @public
     */
    OutputDataConfig: AutoMLOutputDataConfig | undefined;
    /**
     * <p>The ARN of the IAM role that has read permission to the input data location and write permission to the output data location in Amazon S3.</p>
     * @public
     */
    RoleArn: string | undefined;
    /**
     * <p>Returns the job's objective.</p>
     * @public
     */
    AutoMLJobObjective?: AutoMLJobObjective | undefined;
    /**
     * <p>Returns the job's problem type.</p>
     * @public
     */
    ProblemType?: ProblemType | undefined;
    /**
     * <p>Returns the configuration for the AutoML job.</p>
     * @public
     */
    AutoMLJobConfig?: AutoMLJobConfig | undefined;
    /**
     * <p>Returns the creation time of the AutoML job.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>Returns the end time of the AutoML job.</p>
     * @public
     */
    EndTime?: Date | undefined;
    /**
     * <p>Returns the job's last modified time.</p>
     * @public
     */
    LastModifiedTime: Date | undefined;
    /**
     * <p>Returns the failure reason for an AutoML job, when applicable.</p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>Returns a list of reasons for partial failures within an AutoML job.</p>
     * @public
     */
    PartialFailureReasons?: AutoMLPartialFailureReason[] | undefined;
    /**
     * <p>The best model candidate selected by SageMaker AI Autopilot using both the best objective metric and lowest <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-metrics-validation.html">InferenceLatency</a> for an experiment.</p>
     * @public
     */
    BestCandidate?: AutoMLCandidate | undefined;
    /**
     * <p>Returns the status of the AutoML job.</p>
     * @public
     */
    AutoMLJobStatus: AutoMLJobStatus | undefined;
    /**
     * <p>Returns the secondary status of the AutoML job.</p>
     * @public
     */
    AutoMLJobSecondaryStatus: AutoMLJobSecondaryStatus | undefined;
    /**
     * <p>Indicates whether the output for an AutoML job generates candidate definitions only.</p>
     * @public
     */
    GenerateCandidateDefinitionsOnly?: boolean | undefined;
    /**
     * <p>Returns information on the job's artifacts found in <code>AutoMLJobArtifacts</code>.</p>
     * @public
     */
    AutoMLJobArtifacts?: AutoMLJobArtifacts | undefined;
    /**
     * <p>Contains <code>ProblemType</code>, <code>AutoMLJobObjective</code>, and <code>CompletionCriteria</code>. If you do not provide these values, they are inferred.</p>
     * @public
     */
    ResolvedAttributes?: ResolvedAttributes | undefined;
    /**
     * <p>Indicates whether the model was deployed automatically to an endpoint and the name of that endpoint if deployed automatically.</p>
     * @public
     */
    ModelDeployConfig?: ModelDeployConfig | undefined;
    /**
     * <p>Provides information about endpoint for the model deployment.</p>
     * @public
     */
    ModelDeployResult?: ModelDeployResult | undefined;
}
/**
 * @public
 */
export interface DescribeAutoMLJobV2Request {
    /**
     * <p>Requests information about an AutoML job V2 using its unique name.</p>
     * @public
     */
    AutoMLJobName: string | undefined;
}
/**
 * @public
 */
export interface DescribeAutoMLJobV2Response {
    /**
     * <p>Returns the name of the AutoML job V2.</p>
     * @public
     */
    AutoMLJobName: string | undefined;
    /**
     * <p>Returns the Amazon Resource Name (ARN) of the AutoML job V2.</p>
     * @public
     */
    AutoMLJobArn: string | undefined;
    /**
     * <p>Returns an array of channel objects describing the input data and their location.</p>
     * @public
     */
    AutoMLJobInputDataConfig: AutoMLJobChannel[] | undefined;
    /**
     * <p>Returns the job's output data config.</p>
     * @public
     */
    OutputDataConfig: AutoMLOutputDataConfig | undefined;
    /**
     * <p>The ARN of the IAM role that has read permission to the input data location and write permission to the output data location in Amazon S3.</p>
     * @public
     */
    RoleArn: string | undefined;
    /**
     * <p>Returns the job's objective.</p>
     * @public
     */
    AutoMLJobObjective?: AutoMLJobObjective | undefined;
    /**
     * <p>Returns the configuration settings of the problem type set for the AutoML job V2.</p>
     * @public
     */
    AutoMLProblemTypeConfig?: AutoMLProblemTypeConfig | undefined;
    /**
     * <p>Returns the name of the problem type configuration set for the AutoML job V2.</p>
     * @public
     */
    AutoMLProblemTypeConfigName?: AutoMLProblemTypeConfigName | undefined;
    /**
     * <p>Returns the creation time of the AutoML job V2.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>Returns the end time of the AutoML job V2.</p>
     * @public
     */
    EndTime?: Date | undefined;
    /**
     * <p>Returns the job's last modified time.</p>
     * @public
     */
    LastModifiedTime: Date | undefined;
    /**
     * <p>Returns the reason for the failure of the AutoML job V2, when applicable.</p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>Returns a list of reasons for partial failures within an AutoML job V2.</p>
     * @public
     */
    PartialFailureReasons?: AutoMLPartialFailureReason[] | undefined;
    /**
     * <p>Information about the candidate produced by an AutoML training job V2, including its status, steps, and other properties.</p>
     * @public
     */
    BestCandidate?: AutoMLCandidate | undefined;
    /**
     * <p>Returns the status of the AutoML job V2.</p>
     * @public
     */
    AutoMLJobStatus: AutoMLJobStatus | undefined;
    /**
     * <p>Returns the secondary status of the AutoML job V2.</p>
     * @public
     */
    AutoMLJobSecondaryStatus: AutoMLJobSecondaryStatus | undefined;
    /**
     * <p>The artifacts that are generated during an AutoML job.</p>
     * @public
     */
    AutoMLJobArtifacts?: AutoMLJobArtifacts | undefined;
    /**
     * <p>Returns the resolved attributes used by the AutoML job V2.</p>
     * @public
     */
    ResolvedAttributes?: AutoMLResolvedAttributes | undefined;
    /**
     * <p>Indicates whether the model was deployed automatically to an endpoint and the name of that endpoint if deployed automatically.</p>
     * @public
     */
    ModelDeployConfig?: ModelDeployConfig | undefined;
    /**
     * <p>Provides information about endpoint for the model deployment.</p>
     * @public
     */
    ModelDeployResult?: ModelDeployResult | undefined;
    /**
     * <p>Returns the configuration settings of how the data are split into train and validation datasets.</p>
     * @public
     */
    DataSplitConfig?: AutoMLDataSplitConfig | undefined;
    /**
     * <p>Returns the security configuration for traffic encryption or Amazon VPC settings.</p>
     * @public
     */
    SecurityConfig?: AutoMLSecurityConfig | undefined;
    /**
     * <p>The compute configuration used for the AutoML job V2.</p>
     * @public
     */
    AutoMLComputeConfig?: AutoMLComputeConfig | undefined;
}
/**
 * @public
 */
export interface DescribeClusterRequest {
    /**
     * <p>The string name or the Amazon Resource Name (ARN) of the SageMaker HyperPod cluster.</p>
     * @public
     */
    ClusterName: string | undefined;
}
/**
 * @public
 */
export interface DescribeClusterResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the SageMaker HyperPod cluster.</p>
     * @public
     */
    ClusterArn: string | undefined;
    /**
     * <p>The name of the SageMaker HyperPod cluster.</p>
     * @public
     */
    ClusterName?: string | undefined;
    /**
     * <p>The status of the SageMaker HyperPod cluster.</p>
     * @public
     */
    ClusterStatus: ClusterStatus | undefined;
    /**
     * <p>The time when the SageMaker Cluster is created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>The failure message of the SageMaker HyperPod cluster.</p>
     * @public
     */
    FailureMessage?: string | undefined;
    /**
     * <p>The instance groups of the SageMaker HyperPod cluster.</p>
     * @public
     */
    InstanceGroups: ClusterInstanceGroupDetails[] | undefined;
    /**
     * <p>Specifies an Amazon Virtual Private Cloud (VPC) that your SageMaker jobs, hosted models, and compute resources have access to. You can control access to and from your resources by configuring a VPC. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/infrastructure-give-access.html">Give SageMaker Access to Resources in your Amazon VPC</a>. </p>
     * @public
     */
    VpcConfig?: VpcConfig | undefined;
    /**
     * <p>The type of orchestrator used for the SageMaker HyperPod cluster. </p>
     * @public
     */
    Orchestrator?: ClusterOrchestrator | undefined;
    /**
     * <p>The node recovery mode configured for the SageMaker HyperPod cluster.</p>
     * @public
     */
    NodeRecovery?: ClusterNodeRecovery | undefined;
}
/**
 * @public
 */
export interface DescribeClusterNodeRequest {
    /**
     * <p>The string name or the Amazon Resource Name (ARN) of the SageMaker HyperPod cluster in which the node is.</p>
     * @public
     */
    ClusterName: string | undefined;
    /**
     * <p>The ID of the SageMaker HyperPod cluster node.</p>
     * @public
     */
    NodeId: string | undefined;
}
/**
 * @public
 */
export interface DescribeClusterNodeResponse {
    /**
     * <p>The details of the SageMaker HyperPod cluster node.</p>
     * @public
     */
    NodeDetails: ClusterNodeDetails | undefined;
}
/**
 * @public
 */
export interface DescribeClusterSchedulerConfigRequest {
    /**
     * <p>ID of the cluster policy.</p>
     * @public
     */
    ClusterSchedulerConfigId: string | undefined;
    /**
     * <p>Version of the cluster policy.</p>
     * @public
     */
    ClusterSchedulerConfigVersion?: number | undefined;
}
/**
 * @public
 */
export interface DescribeClusterSchedulerConfigResponse {
    /**
     * <p>ARN of the cluster policy.</p>
     * @public
     */
    ClusterSchedulerConfigArn: string | undefined;
    /**
     * <p>ID of the cluster policy.</p>
     * @public
     */
    ClusterSchedulerConfigId: string | undefined;
    /**
     * <p>Name of the cluster policy.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>Version of the cluster policy.</p>
     * @public
     */
    ClusterSchedulerConfigVersion: number | undefined;
    /**
     * <p>Status of the cluster policy.</p>
     * @public
     */
    Status: SchedulerResourceStatus | undefined;
    /**
     * <p>Failure reason of the cluster policy.</p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>ARN of the cluster where the cluster policy is applied.</p>
     * @public
     */
    ClusterArn?: string | undefined;
    /**
     * <p>Cluster policy configuration. This policy is used for task prioritization and fair-share allocation. This helps prioritize critical workloads and distributes idle compute across entities.</p>
     * @public
     */
    SchedulerConfig?: SchedulerConfig | undefined;
    /**
     * <p>Description of the cluster policy.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>Creation time of the cluster policy.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>Information about the user who created or modified an experiment, trial, trial component, lineage group, project, or model card.</p>
     * @public
     */
    CreatedBy?: UserContext | undefined;
    /**
     * <p>Last modified time of the cluster policy.</p>
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
export interface DescribeCodeRepositoryInput {
    /**
     * <p>The name of the Git repository to describe.</p>
     * @public
     */
    CodeRepositoryName: string | undefined;
}
/**
 * @public
 */
export interface DescribeCodeRepositoryOutput {
    /**
     * <p>The name of the Git repository.</p>
     * @public
     */
    CodeRepositoryName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the Git repository.</p>
     * @public
     */
    CodeRepositoryArn: string | undefined;
    /**
     * <p>The date and time that the repository was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The date and time that the repository was last changed.</p>
     * @public
     */
    LastModifiedTime: Date | undefined;
    /**
     * <p>Configuration details about the repository, including the URL where the repository is located, the default branch, and the Amazon Resource Name (ARN) of the Amazon Web Services Secrets Manager secret that contains the credentials used to access the repository.</p>
     * @public
     */
    GitConfig?: GitConfig | undefined;
}
/**
 * @public
 */
export interface DescribeCompilationJobRequest {
    /**
     * <p>The name of the model compilation job that you want information about.</p>
     * @public
     */
    CompilationJobName: string | undefined;
}
/**
 * <p>Provides information about the location that is configured for storing model artifacts. </p> <p>Model artifacts are outputs that result from training a model. They typically consist of trained parameters, a model definition that describes how to compute inferences, and other metadata. A SageMaker container stores your trained model artifacts in the <code>/opt/ml/model</code> directory. After training has completed, by default, these artifacts are uploaded to your Amazon S3 bucket as compressed files.</p>
 * @public
 */
export interface ModelArtifacts {
    /**
     * <p>The path of the S3 object that contains the model artifacts. For example, <code>s3://bucket-name/keynameprefix/model.tar.gz</code>.</p>
     * @public
     */
    S3ModelArtifacts: string | undefined;
}
/**
 * <p>Provides information to verify the integrity of stored model artifacts. </p>
 * @public
 */
export interface ModelDigests {
    /**
     * <p>Provides a hash value that uniquely identifies the stored model artifacts.</p>
     * @public
     */
    ArtifactDigest?: string | undefined;
}
/**
 * @public
 */
export interface DescribeCompilationJobResponse {
    /**
     * <p>The name of the model compilation job.</p>
     * @public
     */
    CompilationJobName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the model compilation job.</p>
     * @public
     */
    CompilationJobArn: string | undefined;
    /**
     * <p>The status of the model compilation job.</p>
     * @public
     */
    CompilationJobStatus: CompilationJobStatus | undefined;
    /**
     * <p>The time when the model compilation job started the <code>CompilationJob</code> instances. </p> <p>You are billed for the time between this timestamp and the timestamp in the <code>CompilationEndTime</code> field. In Amazon CloudWatch Logs, the start time might be later than this time. That's because it takes time to download the compilation job, which depends on the size of the compilation job container. </p>
     * @public
     */
    CompilationStartTime?: Date | undefined;
    /**
     * <p>The time when the model compilation job on a compilation job instance ended. For a successful or stopped job, this is when the job's model artifacts have finished uploading. For a failed job, this is when Amazon SageMaker AI detected that the job failed. </p>
     * @public
     */
    CompilationEndTime?: Date | undefined;
    /**
     * <p>Specifies a limit to how long a model compilation job can run. When the job reaches the time limit, Amazon SageMaker AI ends the compilation job. Use this API to cap model training costs.</p>
     * @public
     */
    StoppingCondition: StoppingCondition | undefined;
    /**
     * <p>The inference image to use when compiling a model. Specify an image only if the target device is a cloud instance.</p>
     * @public
     */
    InferenceImage?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the versioned model package that was provided to SageMaker Neo when you initiated a compilation job.</p>
     * @public
     */
    ModelPackageVersionArn?: string | undefined;
    /**
     * <p>The time that the model compilation job was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The time that the status of the model compilation job was last modified.</p>
     * @public
     */
    LastModifiedTime: Date | undefined;
    /**
     * <p>If a model compilation job failed, the reason it failed. </p>
     * @public
     */
    FailureReason: string | undefined;
    /**
     * <p>Information about the location in Amazon S3 that has been configured for storing the model artifacts used in the compilation job.</p>
     * @public
     */
    ModelArtifacts: ModelArtifacts | undefined;
    /**
     * <p>Provides a BLAKE2 hash value that identifies the compiled model artifacts in Amazon S3.</p>
     * @public
     */
    ModelDigests?: ModelDigests | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an IAM role that Amazon SageMaker AI assumes to perform the model compilation job.</p>
     * @public
     */
    RoleArn: string | undefined;
    /**
     * <p>Information about the location in Amazon S3 of the input model artifacts, the name and shape of the expected data inputs, and the framework in which the model was trained.</p>
     * @public
     */
    InputConfig: InputConfig | undefined;
    /**
     * <p>Information about the output location for the compiled model and the target device that the model runs on.</p>
     * @public
     */
    OutputConfig: OutputConfig | undefined;
    /**
     * <p>A <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_VpcConfig.html">VpcConfig</a> object that specifies the VPC that you want your compilation job to connect to. Control access to your models by configuring the VPC. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/neo-vpc.html">Protect Compilation Jobs by Using an Amazon Virtual Private Cloud</a>.</p>
     * @public
     */
    VpcConfig?: NeoVpcConfig | undefined;
    /**
     * <p>Information that SageMaker Neo automatically derived about the model.</p>
     * @public
     */
    DerivedInformation?: DerivedInformation | undefined;
}
/**
 * @public
 */
export interface DescribeComputeQuotaRequest {
    /**
     * <p>ID of the compute allocation definition.</p>
     * @public
     */
    ComputeQuotaId: string | undefined;
    /**
     * <p>Version of the compute allocation definition.</p>
     * @public
     */
    ComputeQuotaVersion?: number | undefined;
}
/**
 * @public
 */
export interface DescribeComputeQuotaResponse {
    /**
     * <p>ARN of the compute allocation definition.</p>
     * @public
     */
    ComputeQuotaArn: string | undefined;
    /**
     * <p>ID of the compute allocation definition.</p>
     * @public
     */
    ComputeQuotaId: string | undefined;
    /**
     * <p>Name of the compute allocation definition.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>Description of the compute allocation definition.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>Version of the compute allocation definition.</p>
     * @public
     */
    ComputeQuotaVersion: number | undefined;
    /**
     * <p>Status of the compute allocation definition.</p>
     * @public
     */
    Status: SchedulerResourceStatus | undefined;
    /**
     * <p>Failure reason of the compute allocation definition.</p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>ARN of the cluster.</p>
     * @public
     */
    ClusterArn?: string | undefined;
    /**
     * <p>Configuration of the compute allocation definition. This includes the resource sharing option, and the setting to preempt low priority tasks.</p>
     * @public
     */
    ComputeQuotaConfig?: ComputeQuotaConfig | undefined;
    /**
     * <p>The target entity to allocate compute resources to.</p>
     * @public
     */
    ComputeQuotaTarget: ComputeQuotaTarget | undefined;
    /**
     * <p>The state of the compute allocation being described. Use to enable or disable compute allocation.</p> <p>Default is <code>Enabled</code>.</p>
     * @public
     */
    ActivationState?: ActivationState | undefined;
    /**
     * <p>Creation time of the compute allocation configuration.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>Information about the user who created or modified an experiment, trial, trial component, lineage group, project, or model card.</p>
     * @public
     */
    CreatedBy?: UserContext | undefined;
    /**
     * <p>Last modified time of the compute allocation configuration.</p>
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
export interface DescribeContextRequest {
    /**
     * <p>The name of the context to describe.</p>
     * @public
     */
    ContextName: string | undefined;
}
/**
 * @public
 */
export interface DescribeContextResponse {
    /**
     * <p>The name of the context.</p>
     * @public
     */
    ContextName?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the context.</p>
     * @public
     */
    ContextArn?: string | undefined;
    /**
     * <p>The source of the context.</p>
     * @public
     */
    Source?: ContextSource | undefined;
    /**
     * <p>The type of the context.</p>
     * @public
     */
    ContextType?: string | undefined;
    /**
     * <p>The description of the context.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>A list of the context's properties.</p>
     * @public
     */
    Properties?: Record<string, string> | undefined;
    /**
     * <p>When the context was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>Information about the user who created or modified an experiment, trial, trial component, lineage group, project, or model card.</p>
     * @public
     */
    CreatedBy?: UserContext | undefined;
    /**
     * <p>When the context was last modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>Information about the user who created or modified an experiment, trial, trial component, lineage group, project, or model card.</p>
     * @public
     */
    LastModifiedBy?: UserContext | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the lineage group.</p>
     * @public
     */
    LineageGroupArn?: string | undefined;
}
/**
 * @public
 */
export interface DescribeDataQualityJobDefinitionRequest {
    /**
     * <p>The name of the data quality monitoring job definition to describe.</p>
     * @public
     */
    JobDefinitionName: string | undefined;
}
/**
 * @public
 */
export interface DescribeDataQualityJobDefinitionResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the data quality monitoring job definition.</p>
     * @public
     */
    JobDefinitionArn: string | undefined;
    /**
     * <p>The name of the data quality monitoring job definition.</p>
     * @public
     */
    JobDefinitionName: string | undefined;
    /**
     * <p>The time that the data quality monitoring job definition was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The constraints and baselines for the data quality monitoring job definition.</p>
     * @public
     */
    DataQualityBaselineConfig?: DataQualityBaselineConfig | undefined;
    /**
     * <p>Information about the container that runs the data quality monitoring job.</p>
     * @public
     */
    DataQualityAppSpecification: DataQualityAppSpecification | undefined;
    /**
     * <p>The list of inputs for the data quality monitoring job. Currently endpoints are supported.</p>
     * @public
     */
    DataQualityJobInput: DataQualityJobInput | undefined;
    /**
     * <p>The output configuration for monitoring jobs.</p>
     * @public
     */
    DataQualityJobOutputConfig: MonitoringOutputConfig | undefined;
    /**
     * <p>Identifies the resources to deploy for a monitoring job.</p>
     * @public
     */
    JobResources: MonitoringResources | undefined;
    /**
     * <p>The networking configuration for the data quality monitoring job.</p>
     * @public
     */
    NetworkConfig?: MonitoringNetworkConfig | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an IAM role that Amazon SageMaker AI can assume to perform tasks on your behalf.</p>
     * @public
     */
    RoleArn: string | undefined;
    /**
     * <p>A time limit for how long the monitoring job is allowed to run before stopping.</p>
     * @public
     */
    StoppingCondition?: MonitoringStoppingCondition | undefined;
}
/**
 * @public
 */
export interface DescribeDeviceRequest {
    /**
     * <p>Next token of device description.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The unique ID of the device.</p>
     * @public
     */
    DeviceName: string | undefined;
    /**
     * <p>The name of the fleet the devices belong to.</p>
     * @public
     */
    DeviceFleetName: string | undefined;
}
/**
 * <p>The model on the edge device.</p>
 * @public
 */
export interface EdgeModel {
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
     * <p>The timestamp of the last data sample taken.</p>
     * @public
     */
    LatestSampleTime?: Date | undefined;
    /**
     * <p>The timestamp of the last inference that was made.</p>
     * @public
     */
    LatestInference?: Date | undefined;
}
/**
 * @public
 */
export interface DescribeDeviceResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the device.</p>
     * @public
     */
    DeviceArn?: string | undefined;
    /**
     * <p>The unique identifier of the device.</p>
     * @public
     */
    DeviceName: string | undefined;
    /**
     * <p>A description of the device.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>The name of the fleet the device belongs to.</p>
     * @public
     */
    DeviceFleetName: string | undefined;
    /**
     * <p>The Amazon Web Services Internet of Things (IoT) object thing name associated with the device.</p>
     * @public
     */
    IotThingName?: string | undefined;
    /**
     * <p>The timestamp of the last registration or de-reregistration.</p>
     * @public
     */
    RegistrationTime: Date | undefined;
    /**
     * <p>The last heartbeat received from the device.</p>
     * @public
     */
    LatestHeartbeat?: Date | undefined;
    /**
     * <p>Models on the device.</p>
     * @public
     */
    Models?: EdgeModel[] | undefined;
    /**
     * <p>The maximum number of models.</p>
     * @public
     */
    MaxModels?: number | undefined;
    /**
     * <p>The response from the last list when returning a list large enough to need tokening.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>Edge Manager agent version.</p>
     * @public
     */
    AgentVersion?: string | undefined;
}
/**
 * @public
 */
export interface DescribeDeviceFleetRequest {
    /**
     * <p>The name of the fleet.</p>
     * @public
     */
    DeviceFleetName: string | undefined;
}
/**
 * @public
 */
export interface DescribeDeviceFleetResponse {
    /**
     * <p>The name of the fleet.</p>
     * @public
     */
    DeviceFleetName: string | undefined;
    /**
     * <p>The The Amazon Resource Name (ARN) of the fleet.</p>
     * @public
     */
    DeviceFleetArn: string | undefined;
    /**
     * <p>The output configuration for storing sampled data.</p>
     * @public
     */
    OutputConfig: EdgeOutputConfig | undefined;
    /**
     * <p>A description of the fleet.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>Timestamp of when the device fleet was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>Timestamp of when the device fleet was last updated.</p>
     * @public
     */
    LastModifiedTime: Date | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) that has access to Amazon Web Services Internet of Things (IoT).</p>
     * @public
     */
    RoleArn?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) alias created in Amazon Web Services Internet of Things (IoT).</p>
     * @public
     */
    IotRoleAlias?: string | undefined;
}
/**
 * @public
 */
export interface DescribeDomainRequest {
    /**
     * <p>The domain ID.</p>
     * @public
     */
    DomainId: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const DomainStatus: {
    readonly Delete_Failed: "Delete_Failed";
    readonly Deleting: "Deleting";
    readonly Failed: "Failed";
    readonly InService: "InService";
    readonly Pending: "Pending";
    readonly Update_Failed: "Update_Failed";
    readonly Updating: "Updating";
};
/**
 * @public
 */
export type DomainStatus = (typeof DomainStatus)[keyof typeof DomainStatus];
/**
 * @public
 */
export interface DescribeDomainResponse {
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
     * <p>The ID of the Amazon Elastic File System managed by this Domain.</p>
     * @public
     */
    HomeEfsFileSystemId?: string | undefined;
    /**
     * <p>The IAM Identity Center managed application instance ID.</p>
     * @public
     */
    SingleSignOnManagedApplicationInstanceId?: string | undefined;
    /**
     * <p>The ARN of the application managed by SageMaker AI in IAM Identity Center. This value is only returned for domains created after October 1, 2023.</p>
     * @public
     */
    SingleSignOnApplicationArn?: string | undefined;
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
     * <p>The failure reason.</p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>The ID of the security group that authorizes traffic between the <code>RSessionGateway</code> apps and the <code>RStudioServerPro</code> app.</p>
     * @public
     */
    SecurityGroupIdForDomainBoundary?: string | undefined;
    /**
     * <p>The domain's authentication mode.</p>
     * @public
     */
    AuthMode?: AuthMode | undefined;
    /**
     * <p>Settings which are applied to UserProfiles in this domain if settings are not explicitly specified in a given UserProfile. </p>
     * @public
     */
    DefaultUserSettings?: UserSettings | undefined;
    /**
     * <p>A collection of <code>Domain</code> settings.</p>
     * @public
     */
    DomainSettings?: DomainSettings | undefined;
    /**
     * <p>Specifies the VPC used for non-EFS traffic. The default value is <code>PublicInternetOnly</code>.</p> <ul> <li> <p> <code>PublicInternetOnly</code> - Non-EFS traffic is through a VPC managed by Amazon SageMaker AI, which allows direct internet access</p> </li> <li> <p> <code>VpcOnly</code> - All traffic is through the specified VPC and subnets</p> </li> </ul>
     * @public
     */
    AppNetworkAccessType?: AppNetworkAccessType | undefined;
    /**
     * <p>Use <code>KmsKeyId</code>.</p>
     *
     * @deprecated
     * @public
     */
    HomeEfsFileSystemKmsKeyId?: string | undefined;
    /**
     * <p>The VPC subnets that the domain uses for communication.</p>
     * @public
     */
    SubnetIds?: string[] | undefined;
    /**
     * <p>The domain's URL.</p>
     * @public
     */
    Url?: string | undefined;
    /**
     * <p>The ID of the Amazon Virtual Private Cloud (VPC) that the domain uses for communication.</p>
     * @public
     */
    VpcId?: string | undefined;
    /**
     * <p>The Amazon Web Services KMS customer managed key used to encrypt the EFS volume attached to the domain.</p>
     * @public
     */
    KmsKeyId?: string | undefined;
    /**
     * <p>The entity that creates and manages the required security groups for inter-app communication in <code>VPCOnly</code> mode. Required when <code>CreateDomain.AppNetworkAccessType</code> is <code>VPCOnly</code> and <code>DomainSettings.RStudioServerProDomainSettings.DomainExecutionRoleArn</code> is provided.</p>
     * @public
     */
    AppSecurityGroupManagement?: AppSecurityGroupManagement | undefined;
    /**
     * <p>Indicates whether custom tag propagation is supported for the domain.</p>
     * @public
     */
    TagPropagation?: TagPropagation | undefined;
    /**
     * <p>The default settings for shared spaces that users create in the domain.</p>
     * @public
     */
    DefaultSpaceSettings?: DefaultSpaceSettings | undefined;
}
/**
 * @public
 */
export interface DescribeEdgeDeploymentPlanRequest {
    /**
     * <p>The name of the deployment plan to describe.</p>
     * @public
     */
    EdgeDeploymentPlanName: string | undefined;
    /**
     * <p>If the edge deployment plan has enough stages to require tokening, then this is the response from the last list of stages returned.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The maximum number of results to select (50 by default).</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * @public
 */
export interface DescribeEdgeDeploymentPlanResponse {
    /**
     * <p>The ARN of edge deployment plan.</p>
     * @public
     */
    EdgeDeploymentPlanArn: string | undefined;
    /**
     * <p>The name of the edge deployment plan.</p>
     * @public
     */
    EdgeDeploymentPlanName: string | undefined;
    /**
     * <p>List of models associated with the edge deployment plan.</p>
     * @public
     */
    ModelConfigs: EdgeDeploymentModelConfig[] | undefined;
    /**
     * <p>The device fleet used for this edge deployment plan.</p>
     * @public
     */
    DeviceFleetName: string | undefined;
    /**
     * <p>The number of edge devices with the successful deployment.</p>
     * @public
     */
    EdgeDeploymentSuccess?: number | undefined;
    /**
     * <p>The number of edge devices yet to pick up deployment, or in progress.</p>
     * @public
     */
    EdgeDeploymentPending?: number | undefined;
    /**
     * <p>The number of edge devices that failed the deployment.</p>
     * @public
     */
    EdgeDeploymentFailed?: number | undefined;
    /**
     * <p>List of stages in the edge deployment plan.</p>
     * @public
     */
    Stages: DeploymentStageStatusSummary[] | undefined;
    /**
     * <p>Token to use when calling the next set of stages in the edge deployment plan.</p>
     * @public
     */
    NextToken?: string | undefined;
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
 * @public
 */
export interface DescribeEdgePackagingJobRequest {
    /**
     * <p>The name of the edge packaging job.</p>
     * @public
     */
    EdgePackagingJobName: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const EdgePackagingJobStatus: {
    readonly Completed: "COMPLETED";
    readonly Failed: "FAILED";
    readonly InProgress: "INPROGRESS";
    readonly Starting: "STARTING";
    readonly Stopped: "STOPPED";
    readonly Stopping: "STOPPING";
};
/**
 * @public
 */
export type EdgePackagingJobStatus = (typeof EdgePackagingJobStatus)[keyof typeof EdgePackagingJobStatus];
/**
 * @public
 * @enum
 */
export declare const EdgePresetDeploymentStatus: {
    readonly Completed: "COMPLETED";
    readonly Failed: "FAILED";
};
/**
 * @public
 */
export type EdgePresetDeploymentStatus = (typeof EdgePresetDeploymentStatus)[keyof typeof EdgePresetDeploymentStatus];
/**
 * <p>The output of a SageMaker Edge Manager deployable resource.</p>
 * @public
 */
export interface EdgePresetDeploymentOutput {
    /**
     * <p>The deployment type created by SageMaker Edge Manager. Currently only supports Amazon Web Services IoT Greengrass Version 2 components.</p>
     * @public
     */
    Type: EdgePresetDeploymentType | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the generated deployable resource.</p>
     * @public
     */
    Artifact?: string | undefined;
    /**
     * <p>The status of the deployable resource.</p>
     * @public
     */
    Status?: EdgePresetDeploymentStatus | undefined;
    /**
     * <p>Returns a message describing the status of the deployed resource.</p>
     * @public
     */
    StatusMessage?: string | undefined;
}
/**
 * @public
 */
export interface DescribeEdgePackagingJobResponse {
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
     * <p>The name of the SageMaker Neo compilation job that is used to locate model artifacts that are being packaged.</p>
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
     * <p>The Amazon Resource Name (ARN) of an IAM role that enables Amazon SageMaker to download and upload the model, and to contact Neo.</p>
     * @public
     */
    RoleArn?: string | undefined;
    /**
     * <p>The output configuration for the edge packaging job.</p>
     * @public
     */
    OutputConfig?: EdgeOutputConfig | undefined;
    /**
     * <p>The Amazon Web Services KMS key to use when encrypting the EBS volume the job run on.</p>
     * @public
     */
    ResourceKey?: string | undefined;
    /**
     * <p>The current status of the packaging job.</p>
     * @public
     */
    EdgePackagingJobStatus: EdgePackagingJobStatus | undefined;
    /**
     * <p>Returns a message describing the job status and error messages.</p>
     * @public
     */
    EdgePackagingJobStatusMessage?: string | undefined;
    /**
     * <p>The timestamp of when the packaging job was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>The timestamp of when the job was last updated.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>The Amazon Simple Storage (S3) URI where model artifacts ares stored.</p>
     * @public
     */
    ModelArtifact?: string | undefined;
    /**
     * <p>The signature document of files in the model artifact.</p>
     * @public
     */
    ModelSignature?: string | undefined;
    /**
     * <p>The output of a SageMaker Edge Manager deployable resource.</p>
     * @public
     */
    PresetDeploymentOutput?: EdgePresetDeploymentOutput | undefined;
}
/**
 * @public
 */
export interface DescribeEndpointInput {
    /**
     * <p>The name of the endpoint.</p>
     * @public
     */
    EndpointName: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const EndpointStatus: {
    readonly CREATING: "Creating";
    readonly DELETING: "Deleting";
    readonly FAILED: "Failed";
    readonly IN_SERVICE: "InService";
    readonly OUT_OF_SERVICE: "OutOfService";
    readonly ROLLING_BACK: "RollingBack";
    readonly SYSTEM_UPDATING: "SystemUpdating";
    readonly UPDATE_ROLLBACK_FAILED: "UpdateRollbackFailed";
    readonly UPDATING: "Updating";
};
/**
 * @public
 */
export type EndpointStatus = (typeof EndpointStatus)[keyof typeof EndpointStatus];
/**
 * @public
 * @enum
 */
export declare const VariantStatus: {
    readonly ACTIVATING_TRAFFIC: "ActivatingTraffic";
    readonly BAKING: "Baking";
    readonly CREATING: "Creating";
    readonly DELETING: "Deleting";
    readonly UPDATING: "Updating";
};
/**
 * @public
 */
export type VariantStatus = (typeof VariantStatus)[keyof typeof VariantStatus];
/**
 * <p>Describes the status of the production variant.</p>
 * @public
 */
export interface ProductionVariantStatus {
    /**
     * <p>The endpoint variant status which describes the current deployment stage status or operational status.</p> <ul> <li> <p> <code>Creating</code>: Creating inference resources for the production variant.</p> </li> <li> <p> <code>Deleting</code>: Terminating inference resources for the production variant.</p> </li> <li> <p> <code>Updating</code>: Updating capacity for the production variant.</p> </li> <li> <p> <code>ActivatingTraffic</code>: Turning on traffic for the production variant.</p> </li> <li> <p> <code>Baking</code>: Waiting period to monitor the CloudWatch alarms in the automatic rollback configuration.</p> </li> </ul>
     * @public
     */
    Status: VariantStatus | undefined;
    /**
     * <p>A message that describes the status of the production variant.</p>
     * @public
     */
    StatusMessage?: string | undefined;
    /**
     * <p>The start time of the current status change.</p>
     * @public
     */
    StartTime?: Date | undefined;
}
/**
 * <p>The production variant summary for a deployment when an endpoint is creating or updating with the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateEndpoint.html">CreateEndpoint</a> or <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_UpdateEndpoint.html">UpdateEndpoint</a> operations. Describes the <code>VariantStatus </code>, weight and capacity for a production variant associated with an endpoint. </p>
 * @public
 */
export interface PendingProductionVariantSummary {
    /**
     * <p>The name of the variant.</p>
     * @public
     */
    VariantName: string | undefined;
    /**
     * <p>An array of <code>DeployedImage</code> objects that specify the Amazon EC2 Container Registry paths of the inference images deployed on instances of this <code>ProductionVariant</code>.</p>
     * @public
     */
    DeployedImages?: DeployedImage[] | undefined;
    /**
     * <p>The weight associated with the variant.</p>
     * @public
     */
    CurrentWeight?: number | undefined;
    /**
     * <p>The requested weight for the variant in this deployment, as specified in the endpoint configuration for the endpoint. The value is taken from the request to the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateEndpointConfig.html">CreateEndpointConfig</a> operation.</p>
     * @public
     */
    DesiredWeight?: number | undefined;
    /**
     * <p>The number of instances associated with the variant.</p>
     * @public
     */
    CurrentInstanceCount?: number | undefined;
    /**
     * <p>The number of instances requested in this deployment, as specified in the endpoint configuration for the endpoint. The value is taken from the request to the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateEndpointConfig.html">CreateEndpointConfig</a> operation.</p>
     * @public
     */
    DesiredInstanceCount?: number | undefined;
    /**
     * <p>The type of instances associated with the variant.</p>
     * @public
     */
    InstanceType?: ProductionVariantInstanceType | undefined;
    /**
     * <p>This parameter is no longer supported. Elastic Inference (EI) is no longer available.</p> <p>This parameter was used to specify the size of the EI instance to use for the production variant.</p>
     * @public
     */
    AcceleratorType?: ProductionVariantAcceleratorType | undefined;
    /**
     * <p>The endpoint variant status which describes the current deployment stage status or operational status.</p>
     * @public
     */
    VariantStatus?: ProductionVariantStatus[] | undefined;
    /**
     * <p>The serverless configuration for the endpoint.</p>
     * @public
     */
    CurrentServerlessConfig?: ProductionVariantServerlessConfig | undefined;
    /**
     * <p>The serverless configuration requested for this deployment, as specified in the endpoint configuration for the endpoint.</p>
     * @public
     */
    DesiredServerlessConfig?: ProductionVariantServerlessConfig | undefined;
    /**
     * <p>Settings that control the range in the number of instances that the endpoint provisions as it scales up or down to accommodate traffic. </p>
     * @public
     */
    ManagedInstanceScaling?: ProductionVariantManagedInstanceScaling | undefined;
    /**
     * <p>Settings that control how the endpoint routes incoming traffic to the instances that the endpoint hosts.</p>
     * @public
     */
    RoutingConfig?: ProductionVariantRoutingConfig | undefined;
}
/**
 * <p>The summary of an in-progress deployment when an endpoint is creating or updating with a new endpoint configuration.</p>
 * @public
 */
export interface PendingDeploymentSummary {
    /**
     * <p>The name of the endpoint configuration used in the deployment. </p>
     * @public
     */
    EndpointConfigName: string | undefined;
    /**
     * <p>An array of <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_PendingProductionVariantSummary.html">PendingProductionVariantSummary</a> objects, one for each model hosted behind this endpoint for the in-progress deployment.</p>
     * @public
     */
    ProductionVariants?: PendingProductionVariantSummary[] | undefined;
    /**
     * <p>The start time of the deployment.</p>
     * @public
     */
    StartTime?: Date | undefined;
    /**
     * <p>An array of <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_PendingProductionVariantSummary.html">PendingProductionVariantSummary</a> objects, one for each model hosted behind this endpoint in shadow mode with production traffic replicated from the model specified on <code>ProductionVariants</code> for the in-progress deployment.</p>
     * @public
     */
    ShadowProductionVariants?: PendingProductionVariantSummary[] | undefined;
}
/**
 * <p>Describes weight and capacities for a production variant associated with an endpoint. If you sent a request to the <code>UpdateEndpointWeightsAndCapacities</code> API and the endpoint status is <code>Updating</code>, you get different desired and current values. </p>
 * @public
 */
export interface ProductionVariantSummary {
    /**
     * <p>The name of the variant.</p>
     * @public
     */
    VariantName: string | undefined;
    /**
     * <p>An array of <code>DeployedImage</code> objects that specify the Amazon EC2 Container Registry paths of the inference images deployed on instances of this <code>ProductionVariant</code>.</p>
     * @public
     */
    DeployedImages?: DeployedImage[] | undefined;
    /**
     * <p>The weight associated with the variant.</p>
     * @public
     */
    CurrentWeight?: number | undefined;
    /**
     * <p>The requested weight, as specified in the <code>UpdateEndpointWeightsAndCapacities</code> request. </p>
     * @public
     */
    DesiredWeight?: number | undefined;
    /**
     * <p>The number of instances associated with the variant.</p>
     * @public
     */
    CurrentInstanceCount?: number | undefined;
    /**
     * <p>The number of instances requested in the <code>UpdateEndpointWeightsAndCapacities</code> request. </p>
     * @public
     */
    DesiredInstanceCount?: number | undefined;
    /**
     * <p>The endpoint variant status which describes the current deployment stage status or operational status.</p>
     * @public
     */
    VariantStatus?: ProductionVariantStatus[] | undefined;
    /**
     * <p>The serverless configuration for the endpoint.</p>
     * @public
     */
    CurrentServerlessConfig?: ProductionVariantServerlessConfig | undefined;
    /**
     * <p>The serverless configuration requested for the endpoint update.</p>
     * @public
     */
    DesiredServerlessConfig?: ProductionVariantServerlessConfig | undefined;
    /**
     * <p>Settings that control the range in the number of instances that the endpoint provisions as it scales up or down to accommodate traffic. </p>
     * @public
     */
    ManagedInstanceScaling?: ProductionVariantManagedInstanceScaling | undefined;
    /**
     * <p>Settings that control how the endpoint routes incoming traffic to the instances that the endpoint hosts.</p>
     * @public
     */
    RoutingConfig?: ProductionVariantRoutingConfig | undefined;
}
/**
 * @public
 */
export interface DescribeEndpointOutput {
    /**
     * <p>Name of the endpoint.</p>
     * @public
     */
    EndpointName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the endpoint.</p>
     * @public
     */
    EndpointArn: string | undefined;
    /**
     * <p>The name of the endpoint configuration associated with this endpoint.</p>
     * @public
     */
    EndpointConfigName?: string | undefined;
    /**
     * <p>An array of <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_ProductionVariantSummary.html">ProductionVariantSummary</a> objects, one for each model hosted behind this endpoint.</p>
     * @public
     */
    ProductionVariants?: ProductionVariantSummary[] | undefined;
    /**
     * <p>The currently active data capture configuration used by your Endpoint.</p>
     * @public
     */
    DataCaptureConfig?: DataCaptureConfigSummary | undefined;
    /**
     * <p>The status of the endpoint.</p> <ul> <li> <p> <code>OutOfService</code>: Endpoint is not available to take incoming requests.</p> </li> <li> <p> <code>Creating</code>: <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateEndpoint.html">CreateEndpoint</a> is executing.</p> </li> <li> <p> <code>Updating</code>: <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_UpdateEndpoint.html">UpdateEndpoint</a> or <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_UpdateEndpointWeightsAndCapacities.html">UpdateEndpointWeightsAndCapacities</a> is executing.</p> </li> <li> <p> <code>SystemUpdating</code>: Endpoint is undergoing maintenance and cannot be updated or deleted or re-scaled until it has completed. This maintenance operation does not change any customer-specified values such as VPC config, KMS encryption, model, instance type, or instance count.</p> </li> <li> <p> <code>RollingBack</code>: Endpoint fails to scale up or down or change its variant weight and is in the process of rolling back to its previous configuration. Once the rollback completes, endpoint returns to an <code>InService</code> status. This transitional status only applies to an endpoint that has autoscaling enabled and is undergoing variant weight or capacity changes as part of an <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_UpdateEndpointWeightsAndCapacities.html">UpdateEndpointWeightsAndCapacities</a> call or when the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_UpdateEndpointWeightsAndCapacities.html">UpdateEndpointWeightsAndCapacities</a> operation is called explicitly.</p> </li> <li> <p> <code>InService</code>: Endpoint is available to process incoming requests.</p> </li> <li> <p> <code>Deleting</code>: <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_DeleteEndpoint.html">DeleteEndpoint</a> is executing.</p> </li> <li> <p> <code>Failed</code>: Endpoint could not be created, updated, or re-scaled. Use the <code>FailureReason</code> value returned by <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_DescribeEndpoint.html">DescribeEndpoint</a> for information about the failure. <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_DeleteEndpoint.html">DeleteEndpoint</a> is the only operation that can be performed on a failed endpoint.</p> </li> <li> <p> <code>UpdateRollbackFailed</code>: Both the rolling deployment and auto-rollback failed. Your endpoint is in service with a mix of the old and new endpoint configurations. For information about how to remedy this issue and restore the endpoint's status to <code>InService</code>, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/deployment-guardrails-rolling.html">Rolling Deployments</a>.</p> </li> </ul>
     * @public
     */
    EndpointStatus: EndpointStatus | undefined;
    /**
     * <p>If the status of the endpoint is <code>Failed</code>, the reason why it failed. </p>
     * @public
     */
    FailureReason?: string | undefined;
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
     * <p>The most recent deployment configuration for the endpoint.</p>
     * @public
     */
    LastDeploymentConfig?: DeploymentConfig | undefined;
    /**
     * <p>Returns the description of an endpoint configuration created using the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateEndpointConfig.html"> <code>CreateEndpointConfig</code> </a> API.</p>
     * @public
     */
    AsyncInferenceConfig?: AsyncInferenceConfig | undefined;
    /**
     * <p>Returns the summary of an in-progress deployment. This field is only returned when the endpoint is creating or updating with a new endpoint configuration.</p>
     * @public
     */
    PendingDeploymentSummary?: PendingDeploymentSummary | undefined;
    /**
     * <p>The configuration parameters for an explainer.</p>
     * @public
     */
    ExplainerConfig?: ExplainerConfig | undefined;
    /**
     * <p>An array of <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_ProductionVariantSummary.html">ProductionVariantSummary</a> objects, one for each model that you want to host at this endpoint in shadow mode with production traffic replicated from the model specified on <code>ProductionVariants</code>.</p>
     * @public
     */
    ShadowProductionVariants?: ProductionVariantSummary[] | undefined;
}
/**
 * @public
 */
export interface DescribeEndpointConfigInput {
    /**
     * <p>The name of the endpoint configuration.</p>
     * @public
     */
    EndpointConfigName: string | undefined;
}
/**
 * @public
 */
export interface DescribeEndpointConfigOutput {
    /**
     * <p>Name of the SageMaker endpoint configuration.</p>
     * @public
     */
    EndpointConfigName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the endpoint configuration.</p>
     * @public
     */
    EndpointConfigArn: string | undefined;
    /**
     * <p>An array of <code>ProductionVariant</code> objects, one for each model that you want to host at this endpoint.</p>
     * @public
     */
    ProductionVariants: ProductionVariant[] | undefined;
    /**
     * <p>Configuration to control how SageMaker AI captures inference data.</p>
     * @public
     */
    DataCaptureConfig?: DataCaptureConfig | undefined;
    /**
     * <p>Amazon Web Services KMS key ID Amazon SageMaker uses to encrypt data when storing it on the ML storage volume attached to the instance.</p>
     * @public
     */
    KmsKeyId?: string | undefined;
    /**
     * <p>A timestamp that shows when the endpoint configuration was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>Returns the description of an endpoint configuration created using the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateEndpointConfig.html"> <code>CreateEndpointConfig</code> </a> API.</p>
     * @public
     */
    AsyncInferenceConfig?: AsyncInferenceConfig | undefined;
    /**
     * <p>The configuration parameters for an explainer.</p>
     * @public
     */
    ExplainerConfig?: ExplainerConfig | undefined;
    /**
     * <p>An array of <code>ProductionVariant</code> objects, one for each model that you want to host at this endpoint in shadow mode with production traffic replicated from the model specified on <code>ProductionVariants</code>.</p>
     * @public
     */
    ShadowProductionVariants?: ProductionVariant[] | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the IAM role that you assigned to the endpoint configuration.</p>
     * @public
     */
    ExecutionRoleArn?: string | undefined;
    /**
     * <p>Specifies an Amazon Virtual Private Cloud (VPC) that your SageMaker jobs, hosted models, and compute resources have access to. You can control access to and from your resources by configuring a VPC. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/infrastructure-give-access.html">Give SageMaker Access to Resources in your Amazon VPC</a>. </p>
     * @public
     */
    VpcConfig?: VpcConfig | undefined;
    /**
     * <p>Indicates whether all model containers deployed to the endpoint are isolated. If they are, no inbound or outbound network calls can be made to or from the model containers.</p>
     * @public
     */
    EnableNetworkIsolation?: boolean | undefined;
}
/**
 * @public
 */
export interface DescribeExperimentRequest {
    /**
     * <p>The name of the experiment to describe.</p>
     * @public
     */
    ExperimentName: string | undefined;
}
/**
 * <p>The source of the experiment.</p>
 * @public
 */
export interface ExperimentSource {
    /**
     * <p>The Amazon Resource Name (ARN) of the source.</p>
     * @public
     */
    SourceArn: string | undefined;
    /**
     * <p>The source type.</p>
     * @public
     */
    SourceType?: string | undefined;
}
/**
 * @public
 */
export interface DescribeExperimentResponse {
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
     * <p>The Amazon Resource Name (ARN) of the source and, optionally, the type.</p>
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
     * <p>Who last modified the experiment.</p>
     * @public
     */
    LastModifiedBy?: UserContext | undefined;
}
/**
 * @public
 */
export interface DescribeFeatureGroupRequest {
    /**
     * <p>The name or Amazon Resource Name (ARN) of the <code>FeatureGroup</code> you want described. </p>
     * @public
     */
    FeatureGroupName: string | undefined;
    /**
     * <p>A token to resume pagination of the list of <code>Features</code> (<code>FeatureDefinitions</code>). 2,500 <code>Features</code> are returned by default.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const FeatureGroupStatus: {
    readonly CREATED: "Created";
    readonly CREATE_FAILED: "CreateFailed";
    readonly CREATING: "Creating";
    readonly DELETE_FAILED: "DeleteFailed";
    readonly DELETING: "Deleting";
};
/**
 * @public
 */
export type FeatureGroupStatus = (typeof FeatureGroupStatus)[keyof typeof FeatureGroupStatus];
/**
 * @public
 * @enum
 */
export declare const LastUpdateStatusValue: {
    readonly FAILED: "Failed";
    readonly IN_PROGRESS: "InProgress";
    readonly SUCCESSFUL: "Successful";
};
/**
 * @public
 */
export type LastUpdateStatusValue = (typeof LastUpdateStatusValue)[keyof typeof LastUpdateStatusValue];
/**
 * <p>A value that indicates whether the update was successful.</p>
 * @public
 */
export interface LastUpdateStatus {
    /**
     * <p>A value that indicates whether the update was made successful.</p>
     * @public
     */
    Status: LastUpdateStatusValue | undefined;
    /**
     * <p>If the update wasn't successful, indicates the reason why it failed.</p>
     * @public
     */
    FailureReason?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const OfflineStoreStatusValue: {
    readonly ACTIVE: "Active";
    readonly BLOCKED: "Blocked";
    readonly DISABLED: "Disabled";
};
/**
 * @public
 */
export type OfflineStoreStatusValue = (typeof OfflineStoreStatusValue)[keyof typeof OfflineStoreStatusValue];
/**
 * <p>The status of <code>OfflineStore</code>.</p>
 * @public
 */
export interface OfflineStoreStatus {
    /**
     * <p>An <code>OfflineStore</code> status.</p>
     * @public
     */
    Status: OfflineStoreStatusValue | undefined;
    /**
     * <p>The justification for why the OfflineStoreStatus is Blocked (if applicable).</p>
     * @public
     */
    BlockedReason?: string | undefined;
}
/**
 * <p>Active throughput configuration of the feature group. There are two modes: <code>ON_DEMAND</code> and <code>PROVISIONED</code>. With on-demand mode, you are charged for data reads and writes that your application performs on your feature group. You do not need to specify read and write throughput because Feature Store accommodates your workloads as they ramp up and down. You can switch a feature group to on-demand only once in a 24 hour period. With provisioned throughput mode, you specify the read and write capacity per second that you expect your application to require, and you are billed based on those limits. Exceeding provisioned throughput will result in your requests being throttled. </p> <p>Note: <code>PROVISIONED</code> throughput mode is supported only for feature groups that are offline-only, or use the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_OnlineStoreConfig.html#sagemaker-Type-OnlineStoreConfig-StorageType"> <code>Standard</code> </a> tier online store. </p>
 * @public
 */
export interface ThroughputConfigDescription {
    /**
     * <p>The mode used for your feature group throughput: <code>ON_DEMAND</code> or <code>PROVISIONED</code>. </p>
     * @public
     */
    ThroughputMode: ThroughputMode | undefined;
    /**
     * <p> For provisioned feature groups with online store enabled, this indicates the read throughput you are billed for and can consume without throttling. </p> <p>This field is not applicable for on-demand feature groups. </p>
     * @public
     */
    ProvisionedReadCapacityUnits?: number | undefined;
    /**
     * <p> For provisioned feature groups, this indicates the write throughput you are billed for and can consume without throttling. </p> <p>This field is not applicable for on-demand feature groups. </p>
     * @public
     */
    ProvisionedWriteCapacityUnits?: number | undefined;
}
/**
 * @public
 */
export interface DescribeFeatureGroupResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the <code>FeatureGroup</code>. </p>
     * @public
     */
    FeatureGroupArn: string | undefined;
    /**
     * <p>he name of the <code>FeatureGroup</code>.</p>
     * @public
     */
    FeatureGroupName: string | undefined;
    /**
     * <p>The name of the <code>Feature</code> used for <code>RecordIdentifier</code>, whose value uniquely identifies a record stored in the feature store.</p>
     * @public
     */
    RecordIdentifierFeatureName: string | undefined;
    /**
     * <p>The name of the feature that stores the <code>EventTime</code> of a Record in a <code>FeatureGroup</code>.</p> <p> An <code>EventTime</code> is a point in time when a new event occurs that corresponds to the creation or update of a <code>Record</code> in a <code>FeatureGroup</code>. All <code>Records</code> in the <code>FeatureGroup</code> have a corresponding <code>EventTime</code>.</p>
     * @public
     */
    EventTimeFeatureName: string | undefined;
    /**
     * <p>A list of the <code>Features</code> in the <code>FeatureGroup</code>. Each feature is defined by a <code>FeatureName</code> and <code>FeatureType</code>.</p>
     * @public
     */
    FeatureDefinitions: FeatureDefinition[] | undefined;
    /**
     * <p>A timestamp indicating when SageMaker created the <code>FeatureGroup</code>.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>A timestamp indicating when the feature group was last updated.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>The configuration for the <code>OnlineStore</code>.</p>
     * @public
     */
    OnlineStoreConfig?: OnlineStoreConfig | undefined;
    /**
     * <p>The configuration of the offline store. It includes the following configurations:</p> <ul> <li> <p>Amazon S3 location of the offline store.</p> </li> <li> <p>Configuration of the Glue data catalog.</p> </li> <li> <p>Table format of the offline store.</p> </li> <li> <p>Option to disable the automatic creation of a Glue table for the offline store.</p> </li> <li> <p>Encryption configuration.</p> </li> </ul>
     * @public
     */
    OfflineStoreConfig?: OfflineStoreConfig | undefined;
    /**
     * <p>Active throughput configuration of the feature group. There are two modes: <code>ON_DEMAND</code> and <code>PROVISIONED</code>. With on-demand mode, you are charged for data reads and writes that your application performs on your feature group. You do not need to specify read and write throughput because Feature Store accommodates your workloads as they ramp up and down. You can switch a feature group to on-demand only once in a 24 hour period. With provisioned throughput mode, you specify the read and write capacity per second that you expect your application to require, and you are billed based on those limits. Exceeding provisioned throughput will result in your requests being throttled. </p> <p>Note: <code>PROVISIONED</code> throughput mode is supported only for feature groups that are offline-only, or use the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_OnlineStoreConfig.html#sagemaker-Type-OnlineStoreConfig-StorageType"> <code>Standard</code> </a> tier online store. </p>
     * @public
     */
    ThroughputConfig?: ThroughputConfigDescription | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the IAM execution role used to persist data into the OfflineStore if an OfflineStoreConfig is provided.</p>
     * @public
     */
    RoleArn?: string | undefined;
    /**
     * <p>The status of the feature group.</p>
     * @public
     */
    FeatureGroupStatus?: FeatureGroupStatus | undefined;
    /**
     * <p>The status of the <code>OfflineStore</code>. Notifies you if replicating data into the <code>OfflineStore</code> has failed. Returns either: <code>Active</code> or <code>Blocked</code> </p>
     * @public
     */
    OfflineStoreStatus?: OfflineStoreStatus | undefined;
    /**
     * <p>A value indicating whether the update made to the feature group was successful.</p>
     * @public
     */
    LastUpdateStatus?: LastUpdateStatus | undefined;
    /**
     * <p>The reason that the <code>FeatureGroup</code> failed to be replicated in the <code>OfflineStore</code>. This is failure can occur because:</p> <ul> <li> <p>The <code>FeatureGroup</code> could not be created in the <code>OfflineStore</code>.</p> </li> <li> <p>The <code>FeatureGroup</code> could not be deleted from the <code>OfflineStore</code>.</p> </li> </ul>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>A free form description of the feature group.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>A token to resume pagination of the list of <code>Features</code> (<code>FeatureDefinitions</code>).</p>
     * @public
     */
    NextToken: string | undefined;
    /**
     * <p>The size of the <code>OnlineStore</code> in bytes.</p>
     * @public
     */
    OnlineStoreTotalSizeBytes?: number | undefined;
}
/**
 * @public
 */
export interface DescribeFeatureMetadataRequest {
    /**
     * <p>The name or Amazon Resource Name (ARN) of the feature group containing the feature.</p>
     * @public
     */
    FeatureGroupName: string | undefined;
    /**
     * <p>The name of the feature.</p>
     * @public
     */
    FeatureName: string | undefined;
}
/**
 * <p>A key-value pair that you specify to describe the feature.</p>
 * @public
 */
export interface FeatureParameter {
    /**
     * <p>A key that must contain a value to describe the feature.</p>
     * @public
     */
    Key?: string | undefined;
    /**
     * <p>The value that belongs to a key.</p>
     * @public
     */
    Value?: string | undefined;
}
/**
 * @public
 */
export interface DescribeFeatureMetadataResponse {
    /**
     * <p>The Amazon Resource Number (ARN) of the feature group that contains the feature.</p>
     * @public
     */
    FeatureGroupArn: string | undefined;
    /**
     * <p>The name of the feature group that you've specified.</p>
     * @public
     */
    FeatureGroupName: string | undefined;
    /**
     * <p>The name of the feature that you've specified.</p>
     * @public
     */
    FeatureName: string | undefined;
    /**
     * <p>The data type of the feature.</p>
     * @public
     */
    FeatureType: FeatureType | undefined;
    /**
     * <p>A timestamp indicating when the feature was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>A timestamp indicating when the metadata for the feature group was modified. For example, if you add a parameter describing the feature, the timestamp changes to reflect the last time you </p>
     * @public
     */
    LastModifiedTime: Date | undefined;
    /**
     * <p>The description you added to describe the feature.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>The key-value pairs that you added to describe the feature.</p>
     * @public
     */
    Parameters?: FeatureParameter[] | undefined;
}
/**
 * @public
 */
export interface DescribeFlowDefinitionRequest {
    /**
     * <p>The name of the flow definition.</p>
     * @public
     */
    FlowDefinitionName: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const FlowDefinitionStatus: {
    readonly ACTIVE: "Active";
    readonly DELETING: "Deleting";
    readonly FAILED: "Failed";
    readonly INITIALIZING: "Initializing";
};
/**
 * @public
 */
export type FlowDefinitionStatus = (typeof FlowDefinitionStatus)[keyof typeof FlowDefinitionStatus];
/**
 * @public
 */
export interface DescribeFlowDefinitionResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the flow defintion.</p>
     * @public
     */
    FlowDefinitionArn: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the flow definition.</p>
     * @public
     */
    FlowDefinitionName: string | undefined;
    /**
     * <p>The status of the flow definition. Valid values are listed below.</p>
     * @public
     */
    FlowDefinitionStatus: FlowDefinitionStatus | undefined;
    /**
     * <p>The timestamp when the flow definition was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>Container for configuring the source of human task requests. Used to specify if Amazon Rekognition or Amazon Textract is used as an integration source.</p>
     * @public
     */
    HumanLoopRequestSource?: HumanLoopRequestSource | undefined;
    /**
     * <p>An object containing information about what triggers a human review workflow.</p>
     * @public
     */
    HumanLoopActivationConfig?: HumanLoopActivationConfig | undefined;
    /**
     * <p>An object containing information about who works on the task, the workforce task price, and other task details.</p>
     * @public
     */
    HumanLoopConfig?: HumanLoopConfig | undefined;
    /**
     * <p>An object containing information about the output file.</p>
     * @public
     */
    OutputConfig: FlowDefinitionOutputConfig | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the Amazon Web Services Identity and Access Management (IAM) execution role for the flow definition.</p>
     * @public
     */
    RoleArn: string | undefined;
    /**
     * <p>The reason your flow definition failed.</p>
     * @public
     */
    FailureReason?: string | undefined;
}
/**
 * @public
 */
export interface DescribeHubRequest {
    /**
     * <p>The name of the hub to describe.</p>
     * @public
     */
    HubName: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const HubStatus: {
    readonly CREATE_FAILED: "CreateFailed";
    readonly CREATING: "Creating";
    readonly DELETE_FAILED: "DeleteFailed";
    readonly DELETING: "Deleting";
    readonly IN_SERVICE: "InService";
    readonly UPDATE_FAILED: "UpdateFailed";
    readonly UPDATING: "Updating";
};
/**
 * @public
 */
export type HubStatus = (typeof HubStatus)[keyof typeof HubStatus];
/**
 * @internal
 */
export declare const OidcConfigFilterSensitiveLog: (obj: OidcConfig) => any;
/**
 * @internal
 */
export declare const CreateWorkforceRequestFilterSensitiveLog: (obj: CreateWorkforceRequest) => any;
