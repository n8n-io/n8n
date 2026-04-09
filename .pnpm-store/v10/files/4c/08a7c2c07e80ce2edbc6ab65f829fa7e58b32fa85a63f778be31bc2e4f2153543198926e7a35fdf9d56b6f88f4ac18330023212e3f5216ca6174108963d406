import { ActionStatus, ActivationState, ActiveClusterOperationName, AdditionalS3DataSourceDataType, AggregationTransformationValue, AlgorithmStatus, AppInstanceType, AppStatus, AppType, ArtifactSourceIdType, AssemblyType, AssociationEdgeType, AsyncNotificationTopicTypes, AthenaResultCompressionType, AthenaResultFormat, AutoMLAlgorithm, AutoMLChannelType, AutoMLJobObjectiveType, AutoMLJobSecondaryStatus, AutoMLJobStatus, AutoMLMetricEnum, AutoMLMetricExtendedEnum, AutoMLMode, AutoMLProcessingUnit, AutoMLS3DataType, AutotuneMode, BatchAddClusterNodesErrorCode, BatchDeleteClusterNodesErrorCode, BatchRebootClusterNodesErrorCode, BatchReplaceClusterNodesErrorCode, BatchStrategy, CandidateStatus, CandidateStepType, CapacityReservationType, CapacitySizeType, CaptureMode, ClarifyFeatureType, ClarifyTextGranularity, ClarifyTextLanguage, ClusterAutoScalerType, ClusterAutoScalingMode, ClusterAutoScalingStatus, ClusterCapacityType, ClusterConfigMode, ClusterEventResourceType, ClusterInstanceStatus, ClusterInstanceType, ClusterKubernetesTaintEffect, ClusterNodeProvisioningMode, ClusterNodeRecovery, ClusterSlurmConfigStrategy, ClusterSlurmNodeType, ClusterStatus, CompilationJobStatus, CompleteOnConvergence, CompressionType, ConditionOutcome, ContainerMode, DataSourceName, DeepHealthCheckType, DetailedAlgorithmStatus, FairShare, FeatureStatus, FileSystemAccessMode, FileSystemType, FillingType, Framework, HyperParameterScalingType, HyperParameterTuningJobObjectiveType, IdleResourceSharing, InstanceGroupStatus, LifecycleManagement, MetricSetSource, MIGProfileType, ModelApprovalStatus, ModelCacheSetting, ModelCompressionType, ModelPackageRegistrationType, ModelPackageStatus, NodeUnavailabilityType, ObjectiveStatus, OutputCompressionType, ParameterType, PreemptTeamTasks, ProblemType, ProcessingS3DataDistributionType, ProcessingS3InputMode, ProductionVariantInstanceType, RecordWrapper, RepositoryAccessMode, ResourceSharingStrategy, S3DataDistribution, S3DataType, S3ModelDataType, SchedulerResourceStatus, SoftwareUpdateStatus, SplitType, TargetDevice, TargetPlatformAccelerator, TargetPlatformArch, TargetPlatformOs, TrafficRoutingConfigType, TrainingInputMode, TrainingInstanceType, TrainingRepositoryAccessMode, TransformInstanceType, VolumeAttachmentStatus } from "./enums";
/**
 * <p>Configuration for allocating accelerator partitions.</p>
 * @public
 */
export interface AcceleratorPartitionConfig {
    /**
     * <p>The Multi-Instance GPU (MIG) profile type that defines the partition configuration. The profile specifies the compute and memory allocation for each partition instance. The available profile types depend on the instance type specified in the compute quota configuration.</p>
     * @public
     */
    Type: MIGProfileType | undefined;
    /**
     * <p>The number of accelerator partitions to allocate with the specified partition type. If you don't specify a value for vCPU and MemoryInGiB, SageMaker AI automatically allocates ratio-based values for those parameters based on the accelerator partition count you provide.</p>
     * @public
     */
    Count: number | undefined;
}
/**
 * <p>Configuration of the resources used for the compute allocation definition.</p>
 * @public
 */
export interface ComputeQuotaResourceConfig {
    /**
     * <p>The instance type of the instance group for the cluster.</p>
     * @public
     */
    InstanceType: ClusterInstanceType | undefined;
    /**
     * <p>The number of instances to add to the instance group of a SageMaker HyperPod cluster.</p>
     * @public
     */
    Count?: number | undefined;
    /**
     * <p>The number of accelerators to allocate. If you don't specify a value for vCPU and MemoryInGiB, SageMaker AI automatically allocates ratio-based values for those parameters based on the number of accelerators you provide. For example, if you allocate 16 out of 32 total accelerators, SageMaker AI uses the ratio of 0.5 and allocates values to vCPU and MemoryInGiB.</p>
     * @public
     */
    Accelerators?: number | undefined;
    /**
     * <p>The number of vCPU to allocate. If you specify a value only for vCPU, SageMaker AI automatically allocates ratio-based values for MemoryInGiB based on this vCPU parameter. For example, if you allocate 20 out of 40 total vCPU, SageMaker AI uses the ratio of 0.5 and allocates values to MemoryInGiB. Accelerators are set to 0.</p>
     * @public
     */
    VCpu?: number | undefined;
    /**
     * <p>The amount of memory in GiB to allocate. If you specify a value only for this parameter, SageMaker AI automatically allocates a ratio-based value for vCPU based on this memory that you provide. For example, if you allocate 200 out of 400 total memory in GiB, SageMaker AI uses the ratio of 0.5 and allocates values to vCPU. Accelerators are set to 0.</p>
     * @public
     */
    MemoryInGiB?: number | undefined;
    /**
     * <p>The accelerator partition configuration for fractional GPU allocation.</p>
     * @public
     */
    AcceleratorPartition?: AcceleratorPartitionConfig | undefined;
}
/**
 * <p>A structure describing the source of an action.</p>
 * @public
 */
export interface ActionSource {
    /**
     * <p>The URI of the source.</p>
     * @public
     */
    SourceUri: string | undefined;
    /**
     * <p>The type of the source.</p>
     * @public
     */
    SourceType?: string | undefined;
    /**
     * <p>The ID of the source.</p>
     * @public
     */
    SourceId?: string | undefined;
}
/**
 * <p>Lists the properties of an <i>action</i>. An action represents an action or activity. Some examples are a workflow step and a model deployment. Generally, an action involves at least one input artifact or output artifact.</p>
 * @public
 */
export interface ActionSummary {
    /**
     * <p>The Amazon Resource Name (ARN) of the action.</p>
     * @public
     */
    ActionArn?: string | undefined;
    /**
     * <p>The name of the action.</p>
     * @public
     */
    ActionName?: string | undefined;
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
     * <p>The status of the action.</p>
     * @public
     */
    Status?: ActionStatus | undefined;
    /**
     * <p>When the action was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>When the action was last modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
}
/**
 * @public
 */
export interface AddAssociationRequest {
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
    /**
     * <p>The type of association. The following are suggested uses for each type. Amazon SageMaker places no restrictions on their use.</p> <ul> <li> <p>ContributedTo - The source contributed to the destination or had a part in enabling the destination. For example, the training data contributed to the training job.</p> </li> <li> <p>AssociatedWith - The source is connected to the destination. For example, an approval workflow is associated with a model deployment.</p> </li> <li> <p>DerivedFrom - The destination is a modification of the source. For example, a digest output of a channel input for a processing job is derived from the original inputs.</p> </li> <li> <p>Produced - The source generated the destination. For example, a training job produced a model artifact.</p> </li> </ul>
     * @public
     */
    AssociationType?: AssociationEdgeType | undefined;
}
/**
 * @public
 */
export interface AddAssociationResponse {
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
 * <p>Specifies an instance group and the number of nodes to add to it.</p>
 * @public
 */
export interface AddClusterNodeSpecification {
    /**
     * <p>The name of the instance group to which you want to add nodes.</p>
     * @public
     */
    InstanceGroupName: string | undefined;
    /**
     * <p>The number of nodes to add to the specified instance group. The total number of nodes across all instance groups in a single request cannot exceed 50.</p>
     * @public
     */
    IncrementTargetCountBy: number | undefined;
}
/**
 * <p>Information about additional Elastic Network Interfaces (ENIs) associated with an instance.</p>
 * @public
 */
export interface AdditionalEnis {
    /**
     * <p>A list of Elastic Fabric Adapter (EFA) ENIs associated with the instance.</p>
     * @public
     */
    EfaEnis?: string[] | undefined;
}
/**
 * <p>A data source used for training or inference that is in addition to the input dataset or model data.</p>
 * @public
 */
export interface AdditionalS3DataSource {
    /**
     * <p>The data type of the additional data source that you specify for use in inference or training. </p>
     * @public
     */
    S3DataType: AdditionalS3DataSourceDataType | undefined;
    /**
     * <p>The uniform resource identifier (URI) used to identify an additional data source used in inference or training.</p>
     * @public
     */
    S3Uri: string | undefined;
    /**
     * <p>The type of compression used for an additional data source used in inference or training. Specify <code>None</code> if your additional data source is not compressed.</p>
     * @public
     */
    CompressionType?: CompressionType | undefined;
    /**
     * <p>The ETag associated with S3 URI.</p>
     * @public
     */
    ETag?: string | undefined;
}
/**
 * <p>Identifies the foundation model that was used as the starting point for model customization.</p>
 * @public
 */
export interface BaseModel {
    /**
     * <p> The hub content name of the base model. </p>
     * @public
     */
    HubContentName?: string | undefined;
    /**
     * <p> The hub content version of the base model. </p>
     * @public
     */
    HubContentVersion?: string | undefined;
    /**
     * <p> The recipe name of the base model. </p>
     * @public
     */
    RecipeName?: string | undefined;
}
/**
 * <p>Configuration information specifying which hub contents have accessible deployment options.</p>
 * @public
 */
export interface InferenceHubAccessConfig {
    /**
     * <p>The ARN of the hub content for which deployment access is allowed.</p>
     * @public
     */
    HubContentArn: string | undefined;
}
/**
 * <p>The access configuration file to control access to the ML model. You can explicitly accept the model end-user license agreement (EULA) within the <code>ModelAccessConfig</code>.</p> <ul> <li> <p>If you are a Jumpstart user, see the <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/jumpstart-foundation-models-choose.html#jumpstart-foundation-models-choose-eula">End-user license agreements</a> section for more details on accepting the EULA.</p> </li> <li> <p>If you are an AutoML user, see the <i>Optional Parameters</i> section of <i>Create an AutoML job to fine-tune text generation models using the API</i> for details on <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-create-experiment-finetune-llms.html#autopilot-llms-finetuning-api-optional-params">How to set the EULA acceptance when fine-tuning a model using the AutoML API</a>.</p> </li> </ul>
 * @public
 */
export interface ModelAccessConfig {
    /**
     * <p>Specifies agreement to the model end-user license agreement (EULA). The <code>AcceptEula</code> value must be explicitly defined as <code>True</code> in order to accept the EULA that this model requires. You are responsible for reviewing and complying with any applicable license terms and making sure they are acceptable for your use case before downloading or using a model.</p>
     * @public
     */
    AcceptEula: boolean | undefined;
}
/**
 * <p>Specifies the S3 location of ML model data to deploy.</p>
 * @public
 */
export interface S3ModelDataSource {
    /**
     * <p>Specifies the S3 path of ML model data to deploy.</p>
     * @public
     */
    S3Uri: string | undefined;
    /**
     * <p>Specifies the type of ML model data to deploy.</p> <p>If you choose <code>S3Prefix</code>, <code>S3Uri</code> identifies a key name prefix. SageMaker uses all objects that match the specified key name prefix as part of the ML model data to deploy. A valid key name prefix identified by <code>S3Uri</code> always ends with a forward slash (/).</p> <p>If you choose <code>S3Object</code>, <code>S3Uri</code> identifies an object that is the ML model data to deploy.</p>
     * @public
     */
    S3DataType: S3ModelDataType | undefined;
    /**
     * <p>Specifies how the ML model data is prepared.</p> <p>If you choose <code>Gzip</code> and choose <code>S3Object</code> as the value of <code>S3DataType</code>, <code>S3Uri</code> identifies an object that is a gzip-compressed TAR archive. SageMaker will attempt to decompress and untar the object during model deployment.</p> <p>If you choose <code>None</code> and chooose <code>S3Object</code> as the value of <code>S3DataType</code>, <code>S3Uri</code> identifies an object that represents an uncompressed ML model to deploy.</p> <p>If you choose None and choose <code>S3Prefix</code> as the value of <code>S3DataType</code>, <code>S3Uri</code> identifies a key name prefix, under which all objects represents the uncompressed ML model to deploy.</p> <p>If you choose None, then SageMaker will follow rules below when creating model data files under /opt/ml/model directory for use by your inference code:</p> <ul> <li> <p>If you choose <code>S3Object</code> as the value of <code>S3DataType</code>, then SageMaker will split the key of the S3 object referenced by <code>S3Uri</code> by slash (/), and use the last part as the filename of the file holding the content of the S3 object.</p> </li> <li> <p>If you choose <code>S3Prefix</code> as the value of <code>S3DataType</code>, then for each S3 object under the key name pefix referenced by <code>S3Uri</code>, SageMaker will trim its key by the prefix, and use the remainder as the path (relative to <code>/opt/ml/model</code>) of the file holding the content of the S3 object. SageMaker will split the remainder by slash (/), using intermediate parts as directory names and the last part as filename of the file holding the content of the S3 object.</p> </li> <li> <p>Do not use any of the following as file names or directory names:</p> <ul> <li> <p>An empty or blank string</p> </li> <li> <p>A string which contains null bytes</p> </li> <li> <p>A string longer than 255 bytes</p> </li> <li> <p>A single dot (<code>.</code>)</p> </li> <li> <p>A double dot (<code>..</code>)</p> </li> </ul> </li> <li> <p>Ambiguous file names will result in model deployment failure. For example, if your uncompressed ML model consists of two S3 objects <code>s3://mybucket/model/weights</code> and <code>s3://mybucket/model/weights/part1</code> and you specify <code>s3://mybucket/model/</code> as the value of <code>S3Uri</code> and <code>S3Prefix</code> as the value of <code>S3DataType</code>, then it will result in name clash between <code>/opt/ml/model/weights</code> (a regular file) and <code>/opt/ml/model/weights/</code> (a directory).</p> </li> <li> <p>Do not organize the model artifacts in <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-folders.html">S3 console using folders</a>. When you create a folder in S3 console, S3 creates a 0-byte object with a key set to the folder name you provide. They key of the 0-byte object ends with a slash (/) which violates SageMaker restrictions on model artifact file names, leading to model deployment failure. </p> </li> </ul>
     * @public
     */
    CompressionType: ModelCompressionType | undefined;
    /**
     * <p>Specifies the access configuration file for the ML model. You can explicitly accept the model end-user license agreement (EULA) within the <code>ModelAccessConfig</code>. You are responsible for reviewing and complying with any applicable license terms and making sure they are acceptable for your use case before downloading or using a model.</p>
     * @public
     */
    ModelAccessConfig?: ModelAccessConfig | undefined;
    /**
     * <p>Configuration information for hub access.</p>
     * @public
     */
    HubAccessConfig?: InferenceHubAccessConfig | undefined;
    /**
     * <p>The Amazon S3 URI of the manifest file. The manifest file is a CSV file that stores the artifact locations.</p>
     * @public
     */
    ManifestS3Uri?: string | undefined;
    /**
     * <p>The ETag associated with S3 URI.</p>
     * @public
     */
    ETag?: string | undefined;
    /**
     * <p>The ETag associated with Manifest S3 URI.</p>
     * @public
     */
    ManifestEtag?: string | undefined;
}
/**
 * <p>Specifies the location of ML model data to deploy. If specified, you must specify one and only one of the available data sources.</p>
 * @public
 */
export interface ModelDataSource {
    /**
     * <p>Specifies the S3 location of ML model data to deploy.</p>
     * @public
     */
    S3DataSource?: S3ModelDataSource | undefined;
}
/**
 * <p>Input object for the model.</p>
 * @public
 */
export interface ModelInput {
    /**
     * <p>The input configuration object for the model.</p>
     * @public
     */
    DataInputConfig: string | undefined;
}
/**
 * <p>Describes the Docker container for the model package.</p>
 * @public
 */
export interface ModelPackageContainerDefinition {
    /**
     * <p>The DNS host name for the Docker container.</p>
     * @public
     */
    ContainerHostname?: string | undefined;
    /**
     * <p>The Amazon Elastic Container Registry (Amazon ECR) path where inference code is stored.</p> <p>If you are using your own custom algorithm instead of an algorithm provided by SageMaker, the inference code must meet SageMaker requirements. SageMaker supports both <code>registry/repository[:tag]</code> and <code>registry/repository[@digest]</code> image path formats. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/your-algorithms.html">Using Your Own Algorithms with Amazon SageMaker</a>.</p>
     * @public
     */
    Image?: string | undefined;
    /**
     * <p>An MD5 hash of the training algorithm that identifies the Docker image used for training.</p>
     * @public
     */
    ImageDigest?: string | undefined;
    /**
     * <p>The Amazon S3 path where the model artifacts, which result from model training, are stored. This path must point to a single <code>gzip</code> compressed tar archive (<code>.tar.gz</code> suffix).</p> <note> <p>The model artifacts must be in an S3 bucket that is in the same region as the model package.</p> </note>
     * @public
     */
    ModelDataUrl?: string | undefined;
    /**
     * <p>Specifies the location of ML model data to deploy during endpoint creation.</p>
     * @public
     */
    ModelDataSource?: ModelDataSource | undefined;
    /**
     * <p>The Amazon Web Services Marketplace product ID of the model package.</p>
     * @public
     */
    ProductId?: string | undefined;
    /**
     * <p>The environment variables to set in the Docker container. Each key and value in the <code>Environment</code> string to string map can have length of up to 1024. We support up to 16 entries in the map.</p>
     * @public
     */
    Environment?: Record<string, string> | undefined;
    /**
     * <p>A structure with Model Input details.</p>
     * @public
     */
    ModelInput?: ModelInput | undefined;
    /**
     * <p>The machine learning framework of the model package container image.</p>
     * @public
     */
    Framework?: string | undefined;
    /**
     * <p>The framework version of the Model Package Container Image.</p>
     * @public
     */
    FrameworkVersion?: string | undefined;
    /**
     * <p>The name of a pre-trained machine learning benchmarked by Amazon SageMaker Inference Recommender model that matches your model. You can find a list of benchmarked models by calling <code>ListModelMetadata</code>.</p>
     * @public
     */
    NearestModelName?: string | undefined;
    /**
     * <p>The additional data source that is used during inference in the Docker container for your model package.</p>
     * @public
     */
    AdditionalS3DataSource?: AdditionalS3DataSource | undefined;
    /**
     * <p>The ETag associated with Model Data URL.</p>
     * @public
     */
    ModelDataETag?: string | undefined;
    /**
     * <p> Specifies whether the model data is a training checkpoint. </p>
     * @public
     */
    IsCheckpoint?: boolean | undefined;
    /**
     * <p> Identifies the foundation model that was used as the starting point for model customization. </p>
     * @public
     */
    BaseModel?: BaseModel | undefined;
}
/**
 * <p>A structure of additional Inference Specification. Additional Inference Specification specifies details about inference jobs that can be run with models based on this model package</p>
 * @public
 */
export interface AdditionalInferenceSpecificationDefinition {
    /**
     * <p>A unique name to identify the additional inference specification. The name must be unique within the list of your additional inference specifications for a particular model package.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>A description of the additional Inference specification</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>The Amazon ECR registry path of the Docker image that contains the inference code.</p>
     * @public
     */
    Containers: ModelPackageContainerDefinition[] | undefined;
    /**
     * <p>A list of the instance types on which a transformation job can be run or on which an endpoint can be deployed.</p>
     * @public
     */
    SupportedTransformInstanceTypes?: TransformInstanceType[] | undefined;
    /**
     * <p>A list of the instance types that are used to generate inferences in real-time.</p>
     * @public
     */
    SupportedRealtimeInferenceInstanceTypes?: ProductionVariantInstanceType[] | undefined;
    /**
     * <p>The supported MIME types for the input data.</p>
     * @public
     */
    SupportedContentTypes?: string[] | undefined;
    /**
     * <p>The supported MIME types for the output data.</p>
     * @public
     */
    SupportedResponseMIMETypes?: string[] | undefined;
}
/**
 * <p>Data sources that are available to your model in addition to the one that you specify for <code>ModelDataSource</code> when you use the <code>CreateModel</code> action.</p>
 * @public
 */
export interface AdditionalModelDataSource {
    /**
     * <p>A custom name for this <code>AdditionalModelDataSource</code> object.</p>
     * @public
     */
    ChannelName: string | undefined;
    /**
     * <p>Specifies the S3 location of ML model data to deploy.</p>
     * @public
     */
    S3DataSource: S3ModelDataSource | undefined;
}
/**
 * <p>A tag object that consists of a key and an optional value, used to manage metadata for SageMaker Amazon Web Services resources.</p> <p>You can add tags to notebook instances, training jobs, hyperparameter tuning jobs, batch transform jobs, models, labeling jobs, work teams, endpoint configurations, and endpoints. For more information on adding tags to SageMaker resources, see <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_AddTags.html">AddTags</a>.</p> <p>For more information on adding metadata to your Amazon Web Services resources with tagging, see <a href="https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html">Tagging Amazon Web Services resources</a>. For advice on best practices for managing Amazon Web Services resources with tagging, see <a href="https://d1.awsstatic.com/whitepapers/aws-tagging-best-practices.pdf">Tagging Best Practices: Implement an Effective Amazon Web Services Resource Tagging Strategy</a>.</p>
 * @public
 */
export interface Tag {
    /**
     * <p>The tag key. Tag keys must be unique per resource.</p>
     * @public
     */
    Key: string | undefined;
    /**
     * <p>The tag value.</p>
     * @public
     */
    Value: string | undefined;
}
/**
 * @public
 */
export interface AddTagsInput {
    /**
     * <p>The Amazon Resource Name (ARN) of the resource that you want to tag.</p>
     * @public
     */
    ResourceArn: string | undefined;
    /**
     * <p>An array of key-value pairs. You can use tags to categorize your Amazon Web Services resources in different ways, for example, by purpose, owner, or environment. For more information, see <a href="https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html">Tagging Amazon Web Services Resources</a>.</p>
     * @public
     */
    Tags: Tag[] | undefined;
}
/**
 * @public
 */
export interface AddTagsOutput {
    /**
     * <p>A list of tags associated with the SageMaker resource.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * <p>Edge Manager agent version.</p>
 * @public
 */
export interface AgentVersion {
    /**
     * <p>Version of the agent.</p>
     * @public
     */
    Version: string | undefined;
    /**
     * <p>The number of Edge Manager agents.</p>
     * @public
     */
    AgentCount: number | undefined;
}
/**
 * <p>An Amazon CloudWatch alarm configured to monitor metrics on an endpoint.</p>
 * @public
 */
export interface Alarm {
    /**
     * <p>The name of a CloudWatch alarm in your account.</p>
     * @public
     */
    AlarmName?: string | undefined;
}
/**
 * <p>The details of the alarm to monitor during the AMI update.</p>
 * @public
 */
export interface AlarmDetails {
    /**
     * <p>The name of the alarm.</p>
     * @public
     */
    AlarmName: string | undefined;
}
/**
 * <p>Specifies a metric that the training algorithm writes to <code>stderr</code> or <code>stdout</code>. You can view these logs to understand how your training job performs and check for any errors encountered during training. SageMaker hyperparameter tuning captures all defined metrics. Specify one of the defined metrics to use as an objective metric using the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_HyperParameterTrainingJobDefinition.html#sagemaker-Type-HyperParameterTrainingJobDefinition-TuningObjective">TuningObjective</a> parameter in the <code>HyperParameterTrainingJobDefinition</code> API to evaluate job performance during hyperparameter tuning.</p>
 * @public
 */
export interface MetricDefinition {
    /**
     * <p>The name of the metric.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>A regular expression that searches the output of a training job and gets the value of the metric. For more information about using regular expressions to define metrics, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/automatic-model-tuning-define-metrics-variables.html">Defining metrics and environment variables</a>.</p>
     * @public
     */
    Regex: string | undefined;
}
/**
 * <p>An object containing authentication information for a private Docker registry.</p>
 * @public
 */
export interface TrainingRepositoryAuthConfig {
    /**
     * <p>The Amazon Resource Name (ARN) of an Amazon Web Services Lambda function used to give SageMaker access credentials to your private Docker registry.</p>
     * @public
     */
    TrainingRepositoryCredentialsProviderArn: string | undefined;
}
/**
 * <p>The configuration to use an image from a private Docker registry for a training job.</p>
 * @public
 */
export interface TrainingImageConfig {
    /**
     * <p>The method that your training job will use to gain access to the images in your private Docker registry. For access to an image in a private Docker registry, set to <code>Vpc</code>.</p>
     * @public
     */
    TrainingRepositoryAccessMode: TrainingRepositoryAccessMode | undefined;
    /**
     * <p>An object containing authentication information for a private Docker registry containing your training images.</p>
     * @public
     */
    TrainingRepositoryAuthConfig?: TrainingRepositoryAuthConfig | undefined;
}
/**
 * <p>Specifies the training algorithm to use in a <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTrainingJob.html">CreateTrainingJob</a> request.</p> <important> <p>SageMaker uses its own SageMaker account credentials to pull and access built-in algorithms so built-in algorithms are universally accessible across all Amazon Web Services accounts. As a result, built-in algorithms have standard, unrestricted access. You cannot restrict built-in algorithms using IAM roles. Use custom algorithms if you require specific access controls.</p> </important> <p>For more information about algorithms provided by SageMaker, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/algos.html">Algorithms</a>. For information about using your own algorithms, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/your-algorithms.html">Using Your Own Algorithms with Amazon SageMaker</a>. </p>
 * @public
 */
export interface AlgorithmSpecification {
    /**
     * <p>The registry path of the Docker image that contains the training algorithm. For information about docker registry paths for SageMaker built-in algorithms, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-algo-docker-registry-paths.html">Docker Registry Paths and Example Code</a> in the <i>Amazon SageMaker developer guide</i>. SageMaker supports both <code>registry/repository[:tag]</code> and <code>registry/repository[@digest]</code> image path formats. For more information about using your custom training container, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/your-algorithms.html">Using Your Own Algorithms with Amazon SageMaker</a>.</p> <note> <p>You must specify either the algorithm name to the <code>AlgorithmName</code> parameter or the image URI of the algorithm container to the <code>TrainingImage</code> parameter.</p> <p>For more information, see the note in the <code>AlgorithmName</code> parameter description.</p> </note>
     * @public
     */
    TrainingImage?: string | undefined;
    /**
     * <p>The name of the algorithm resource to use for the training job. This must be an algorithm resource that you created or subscribe to on Amazon Web Services Marketplace.</p> <note> <p>You must specify either the algorithm name to the <code>AlgorithmName</code> parameter or the image URI of the algorithm container to the <code>TrainingImage</code> parameter.</p> <p>Note that the <code>AlgorithmName</code> parameter is mutually exclusive with the <code>TrainingImage</code> parameter. If you specify a value for the <code>AlgorithmName</code> parameter, you can't specify a value for <code>TrainingImage</code>, and vice versa.</p> <p>If you specify values for both parameters, the training job might break; if you don't specify any value for both parameters, the training job might raise a <code>null</code> error.</p> </note>
     * @public
     */
    AlgorithmName?: string | undefined;
    /**
     * <p>The training input mode that the algorithm supports. For more information about input modes, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/algos.html">Algorithms</a>.</p> <p> <b>Pipe mode</b> </p> <p>If an algorithm supports <code>Pipe</code> mode, Amazon SageMaker streams data directly from Amazon S3 to the container.</p> <p> <b>File mode</b> </p> <p>If an algorithm supports <code>File</code> mode, SageMaker downloads the training data from S3 to the provisioned ML storage volume, and mounts the directory to the Docker volume for the training container.</p> <p>You must provision the ML storage volume with sufficient capacity to accommodate the data downloaded from S3. In addition to the training data, the ML storage volume also stores the output model. The algorithm container uses the ML storage volume to also store intermediate information, if any.</p> <p>For distributed algorithms, training data is distributed uniformly. Your training duration is predictable if the input data objects sizes are approximately the same. SageMaker does not split the files any further for model training. If the object sizes are skewed, training won't be optimal as the data distribution is also skewed when one host in a training cluster is overloaded, thus becoming a bottleneck in training.</p> <p> <b>FastFile mode</b> </p> <p>If an algorithm supports <code>FastFile</code> mode, SageMaker streams data directly from S3 to the container with no code changes, and provides file system access to the data. Users can author their training script to interact with these files as if they were stored on disk.</p> <p> <code>FastFile</code> mode works best when the data is read sequentially. Augmented manifest files aren't supported. The startup time is lower when there are fewer files in the S3 bucket provided.</p>
     * @public
     */
    TrainingInputMode: TrainingInputMode | undefined;
    /**
     * <p>A list of metric definition objects. Each object specifies the metric name and regular expressions used to parse algorithm logs. SageMaker publishes each metric to Amazon CloudWatch.</p>
     * @public
     */
    MetricDefinitions?: MetricDefinition[] | undefined;
    /**
     * <p>To generate and save time-series metrics during training, set to <code>true</code>. The default is <code>false</code> and time-series metrics aren't generated except in the following cases:</p> <ul> <li> <p>You use one of the SageMaker built-in algorithms</p> </li> <li> <p>You use one of the following <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/pre-built-containers-frameworks-deep-learning.html">Prebuilt SageMaker Docker Images</a>:</p> <ul> <li> <p>Tensorflow (version &gt;= 1.15)</p> </li> <li> <p>MXNet (version &gt;= 1.6)</p> </li> <li> <p>PyTorch (version &gt;= 1.3)</p> </li> </ul> </li> <li> <p>You specify at least one <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_MetricDefinition.html">MetricDefinition</a> </p> </li> </ul>
     * @public
     */
    EnableSageMakerMetricsTimeSeries?: boolean | undefined;
    /**
     * <p>The <a href="https://docs.docker.com/engine/reference/builder/">entrypoint script for a Docker container</a> used to run a training job. This script takes precedence over the default train processing instructions. See <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/your-algorithms-training-algo-dockerfile.html">How Amazon SageMaker Runs Your Training Image</a> for more information.</p>
     * @public
     */
    ContainerEntrypoint?: string[] | undefined;
    /**
     * <p>The arguments for a container used to run a training job. See <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/your-algorithms-training-algo-dockerfile.html">How Amazon SageMaker Runs Your Training Image</a> for additional information.</p>
     * @public
     */
    ContainerArguments?: string[] | undefined;
    /**
     * <p>The configuration to use an image from a private Docker registry for a training job.</p>
     * @public
     */
    TrainingImageConfig?: TrainingImageConfig | undefined;
}
/**
 * <p>Represents the overall status of an algorithm.</p>
 * @public
 */
export interface AlgorithmStatusItem {
    /**
     * <p>The name of the algorithm for which the overall status is being reported.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>The current status.</p>
     * @public
     */
    Status: DetailedAlgorithmStatus | undefined;
    /**
     * <p>if the overall status is <code>Failed</code>, the reason for the failure.</p>
     * @public
     */
    FailureReason?: string | undefined;
}
/**
 * <p>Specifies the validation and image scan statuses of the algorithm.</p>
 * @public
 */
export interface AlgorithmStatusDetails {
    /**
     * <p>The status of algorithm validation.</p>
     * @public
     */
    ValidationStatuses?: AlgorithmStatusItem[] | undefined;
    /**
     * <p>The status of the scan of the algorithm's Docker image container.</p>
     * @public
     */
    ImageScanStatuses?: AlgorithmStatusItem[] | undefined;
}
/**
 * <p>Provides summary information about an algorithm.</p>
 * @public
 */
export interface AlgorithmSummary {
    /**
     * <p>The name of the algorithm that is described by the summary.</p>
     * @public
     */
    AlgorithmName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the algorithm.</p>
     * @public
     */
    AlgorithmArn: string | undefined;
    /**
     * <p>A brief description of the algorithm.</p>
     * @public
     */
    AlgorithmDescription?: string | undefined;
    /**
     * <p>A timestamp that shows when the algorithm was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The overall status of the algorithm.</p>
     * @public
     */
    AlgorithmStatus: AlgorithmStatus | undefined;
}
/**
 * <p> Specifies a dataset source for a channel. </p>
 * @public
 */
export interface DatasetSource {
    /**
     * <p> The Amazon Resource Name (ARN) of the dataset resource. </p>
     * @public
     */
    DatasetArn: string | undefined;
}
/**
 * <p>Specifies a file system data source for a channel.</p>
 * @public
 */
export interface FileSystemDataSource {
    /**
     * <p>The file system id.</p>
     * @public
     */
    FileSystemId: string | undefined;
    /**
     * <p>The access mode of the mount of the directory associated with the channel. A directory can be mounted either in <code>ro</code> (read-only) or <code>rw</code> (read-write) mode.</p>
     * @public
     */
    FileSystemAccessMode: FileSystemAccessMode | undefined;
    /**
     * <p>The file system type. </p>
     * @public
     */
    FileSystemType: FileSystemType | undefined;
    /**
     * <p>The full path to the directory to associate with the channel.</p>
     * @public
     */
    DirectoryPath: string | undefined;
}
/**
 * <p>The configuration for a private hub model reference that points to a public SageMaker JumpStart model.</p> <p>For more information about private hubs, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/jumpstart-curated-hubs.html">Private curated hubs for foundation model access control in JumpStart</a>.</p>
 * @public
 */
export interface HubAccessConfig {
    /**
     * <p>The ARN of your private model hub content. This should be a <code>ModelReference</code> resource type that points to a SageMaker JumpStart public hub model.</p>
     * @public
     */
    HubContentArn: string | undefined;
}
/**
 * <p>Describes the S3 data source.</p> <p>Your input bucket must be in the same Amazon Web Services region as your training job.</p>
 * @public
 */
export interface S3DataSource {
    /**
     * <p>If you choose <code>S3Prefix</code>, <code>S3Uri</code> identifies a key name prefix. SageMaker uses all objects that match the specified key name prefix for model training. </p> <p>If you choose <code>ManifestFile</code>, <code>S3Uri</code> identifies an object that is a manifest file containing a list of object keys that you want SageMaker to use for model training. </p> <p>If you choose <code>AugmentedManifestFile</code>, <code>S3Uri</code> identifies an object that is an augmented manifest file in JSON lines format. This file contains the data you want to use for model training. <code>AugmentedManifestFile</code> can only be used if the Channel's input mode is <code>Pipe</code>.</p> <p>If you choose <code>Converse</code>, <code>S3Uri</code> identifies an Amazon S3 location that contains data formatted according to Converse format. This format structures conversational messages with specific roles and content types used for training and fine-tuning foundational models.</p>
     * @public
     */
    S3DataType: S3DataType | undefined;
    /**
     * <p>Depending on the value specified for the <code>S3DataType</code>, identifies either a key name prefix or a manifest. For example: </p> <ul> <li> <p> A key name prefix might look like this: <code>s3://bucketname/exampleprefix/</code> </p> </li> <li> <p> A manifest might look like this: <code>s3://bucketname/example.manifest</code> </p> <p> A manifest is an S3 object which is a JSON file consisting of an array of elements. The first element is a prefix which is followed by one or more suffixes. SageMaker appends the suffix elements to the prefix to get a full set of <code>S3Uri</code>. Note that the prefix must be a valid non-empty <code>S3Uri</code> that precludes users from specifying a manifest whose individual <code>S3Uri</code> is sourced from different S3 buckets.</p> <p> The following code example shows a valid manifest format: </p> <p> <code>[ \{"prefix": "s3://customer_bucket/some/prefix/"\},</code> </p> <p> <code> "relative/path/to/custdata-1",</code> </p> <p> <code> "relative/path/custdata-2",</code> </p> <p> <code> ...</code> </p> <p> <code> "relative/path/custdata-N"</code> </p> <p> <code>]</code> </p> <p> This JSON is equivalent to the following <code>S3Uri</code> list:</p> <p> <code>s3://customer_bucket/some/prefix/relative/path/to/custdata-1</code> </p> <p> <code>s3://customer_bucket/some/prefix/relative/path/custdata-2</code> </p> <p> <code>...</code> </p> <p> <code>s3://customer_bucket/some/prefix/relative/path/custdata-N</code> </p> <p>The complete set of <code>S3Uri</code> in this manifest is the input data for the channel for this data source. The object that each <code>S3Uri</code> points to must be readable by the IAM role that SageMaker uses to perform tasks on your behalf. </p> </li> </ul> <p>Your input bucket must be located in same Amazon Web Services region as your training job.</p>
     * @public
     */
    S3Uri: string | undefined;
    /**
     * <p>If you want SageMaker to replicate the entire dataset on each ML compute instance that is launched for model training, specify <code>FullyReplicated</code>. </p> <p>If you want SageMaker to replicate a subset of data on each ML compute instance that is launched for model training, specify <code>ShardedByS3Key</code>. If there are <i>n</i> ML compute instances launched for a training job, each instance gets approximately 1/<i>n</i> of the number of S3 objects. In this case, model training on each machine uses only the subset of training data. </p> <p>Don't choose more ML compute instances for training than available S3 objects. If you do, some nodes won't get any data and you will pay for nodes that aren't getting any training data. This applies in both File and Pipe modes. Keep this in mind when developing algorithms. </p> <p>In distributed training, where you use multiple ML compute EC2 instances, you might choose <code>ShardedByS3Key</code>. If the algorithm requires copying training data to the ML storage volume (when <code>TrainingInputMode</code> is set to <code>File</code>), this copies 1/<i>n</i> of the number of objects. </p>
     * @public
     */
    S3DataDistributionType?: S3DataDistribution | undefined;
    /**
     * <p>A list of one or more attribute names to use that are found in a specified augmented manifest file.</p>
     * @public
     */
    AttributeNames?: string[] | undefined;
    /**
     * <p>A list of names of instance groups that get data from the S3 data source.</p>
     * @public
     */
    InstanceGroupNames?: string[] | undefined;
    /**
     * <p>The access configuration file to control access to the ML model. You can explicitly accept the model end-user license agreement (EULA) within the <code>ModelAccessConfig</code>.</p> <ul> <li> <p>If you are a Jumpstart user, see the <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/jumpstart-foundation-models-choose.html#jumpstart-foundation-models-choose-eula">End-user license agreements</a> section for more details on accepting the EULA.</p> </li> <li> <p>If you are an AutoML user, see the <i>Optional Parameters</i> section of <i>Create an AutoML job to fine-tune text generation models using the API</i> for details on <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-create-experiment-finetune-llms.html#autopilot-llms-finetuning-api-optional-params">How to set the EULA acceptance when fine-tuning a model using the AutoML API</a>.</p> </li> </ul>
     * @public
     */
    ModelAccessConfig?: ModelAccessConfig | undefined;
    /**
     * <p>The configuration for a private hub model reference that points to a SageMaker JumpStart public hub model.</p>
     * @public
     */
    HubAccessConfig?: HubAccessConfig | undefined;
}
/**
 * <p>Describes the location of the channel data.</p>
 * @public
 */
export interface DataSource {
    /**
     * <p>The S3 location of the data source that is associated with a channel.</p>
     * @public
     */
    S3DataSource?: S3DataSource | undefined;
    /**
     * <p>The file system that is associated with a channel.</p>
     * @public
     */
    FileSystemDataSource?: FileSystemDataSource | undefined;
    /**
     * <p> The dataset resource that's associated with a channel. </p>
     * @public
     */
    DatasetSource?: DatasetSource | undefined;
}
/**
 * <p>A configuration for a shuffle option for input data in a channel. If you use <code>S3Prefix</code> for <code>S3DataType</code>, the results of the S3 key prefix matches are shuffled. If you use <code>ManifestFile</code>, the order of the S3 object references in the <code>ManifestFile</code> is shuffled. If you use <code>AugmentedManifestFile</code>, the order of the JSON lines in the <code>AugmentedManifestFile</code> is shuffled. The shuffling order is determined using the <code>Seed</code> value.</p> <p>For Pipe input mode, when <code>ShuffleConfig</code> is specified shuffling is done at the start of every epoch. With large datasets, this ensures that the order of the training data is different for each epoch, and it helps reduce bias and possible overfitting. In a multi-node training job when <code>ShuffleConfig</code> is combined with <code>S3DataDistributionType</code> of <code>ShardedByS3Key</code>, the data is shuffled across nodes so that the content sent to a particular node on the first epoch might be sent to a different node on the second epoch.</p>
 * @public
 */
export interface ShuffleConfig {
    /**
     * <p>Determines the shuffling order in <code>ShuffleConfig</code> value.</p>
     * @public
     */
    Seed: number | undefined;
}
/**
 * <p>A channel is a named input source that training algorithms can consume. </p>
 * @public
 */
export interface Channel {
    /**
     * <p>The name of the channel. </p>
     * @public
     */
    ChannelName: string | undefined;
    /**
     * <p>The location of the channel data.</p>
     * @public
     */
    DataSource: DataSource | undefined;
    /**
     * <p>The MIME type of the data.</p>
     * @public
     */
    ContentType?: string | undefined;
    /**
     * <p>If training data is compressed, the compression type. The default value is <code>None</code>. <code>CompressionType</code> is used only in Pipe input mode. In File mode, leave this field unset or set it to None.</p>
     * @public
     */
    CompressionType?: CompressionType | undefined;
    /**
     * <p/> <p>Specify RecordIO as the value when input data is in raw format but the training algorithm requires the RecordIO format. In this case, SageMaker wraps each individual S3 object in a RecordIO record. If the input data is already in RecordIO format, you don't need to set this attribute. For more information, see <a href="https://mxnet.apache.org/api/architecture/note_data_loading#data-format">Create a Dataset Using RecordIO</a>. </p> <p>In File mode, leave this field unset or set it to None.</p>
     * @public
     */
    RecordWrapperType?: RecordWrapper | undefined;
    /**
     * <p>(Optional) The input mode to use for the data channel in a training job. If you don't set a value for <code>InputMode</code>, SageMaker uses the value set for <code>TrainingInputMode</code>. Use this parameter to override the <code>TrainingInputMode</code> setting in a <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_AlgorithmSpecification.html">AlgorithmSpecification</a> request when you have a channel that needs a different input mode from the training job's general setting. To download the data from Amazon Simple Storage Service (Amazon S3) to the provisioned ML storage volume, and mount the directory to a Docker volume, use <code>File</code> input mode. To stream data directly from Amazon S3 to the container, choose <code>Pipe</code> input mode.</p> <p>To use a model for incremental training, choose <code>File</code> input model.</p>
     * @public
     */
    InputMode?: TrainingInputMode | undefined;
    /**
     * <p>A configuration for a shuffle option for input data in a channel. If you use <code>S3Prefix</code> for <code>S3DataType</code>, this shuffles the results of the S3 key prefix matches. If you use <code>ManifestFile</code>, the order of the S3 object references in the <code>ManifestFile</code> is shuffled. If you use <code>AugmentedManifestFile</code>, the order of the JSON lines in the <code>AugmentedManifestFile</code> is shuffled. The shuffling order is determined using the <code>Seed</code> value.</p> <p>For Pipe input mode, shuffling is done at the start of every epoch. With large datasets this ensures that the order of the training data is different for each epoch, it helps reduce bias and possible overfitting. In a multi-node training job when ShuffleConfig is combined with <code>S3DataDistributionType</code> of <code>ShardedByS3Key</code>, the data is shuffled across nodes so that the content sent to a particular node on the first epoch might be sent to a different node on the second epoch.</p>
     * @public
     */
    ShuffleConfig?: ShuffleConfig | undefined;
}
/**
 * <p>Provides information about how to store model training results (model artifacts).</p>
 * @public
 */
export interface OutputDataConfig {
    /**
     * <p>The Amazon Web Services Key Management Service (Amazon Web Services KMS) key that SageMaker uses to encrypt the model artifacts at rest using Amazon S3 server-side encryption. The <code>KmsKeyId</code> can be any of the following formats: </p> <ul> <li> <p>// KMS Key ID</p> <p> <code>"1234abcd-12ab-34cd-56ef-1234567890ab"</code> </p> </li> <li> <p>// Amazon Resource Name (ARN) of a KMS Key</p> <p> <code>"arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab"</code> </p> </li> <li> <p>// KMS Key Alias</p> <p> <code>"alias/ExampleAlias"</code> </p> </li> <li> <p>// Amazon Resource Name (ARN) of a KMS Key Alias</p> <p> <code>"arn:aws:kms:us-west-2:111122223333:alias/ExampleAlias"</code> </p> </li> </ul> <p>If you use a KMS key ID or an alias of your KMS key, the SageMaker execution role must include permissions to call <code>kms:Encrypt</code>. If you don't provide a KMS key ID, SageMaker uses the default KMS key for Amazon S3 for your role's account. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html">KMS-Managed Encryption Keys</a> in the <i>Amazon Simple Storage Service Developer Guide</i>. If the output data is stored in Amazon S3 Express One Zone, it is encrypted with server-side encryption with Amazon S3 managed keys (SSE-S3). KMS key is not supported for Amazon S3 Express One Zone</p> <p>The KMS key policy must grant permission to the IAM role that you specify in your <code>CreateTrainingJob</code>, <code>CreateTransformJob</code>, or <code>CreateHyperParameterTuningJob</code> requests. For more information, see <a href="https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html">Using Key Policies in Amazon Web Services KMS</a> in the <i>Amazon Web Services Key Management Service Developer Guide</i>.</p>
     * @public
     */
    KmsKeyId?: string | undefined;
    /**
     * <p>Identifies the S3 path where you want SageMaker to store the model artifacts. For example, <code>s3://bucket-name/key-name-prefix</code>. </p>
     * @public
     */
    S3OutputPath: string | undefined;
    /**
     * <p>The model output compression type. Select <code>None</code> to output an uncompressed model, recommended for large model outputs. Defaults to gzip.</p>
     * @public
     */
    CompressionType?: OutputCompressionType | undefined;
}
/**
 * <p>Defines an instance group for heterogeneous cluster training. When requesting a training job using the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTrainingJob.html">CreateTrainingJob</a> API, you can configure multiple instance groups .</p>
 * @public
 */
export interface InstanceGroup {
    /**
     * <p>Specifies the instance type of the instance group.</p>
     * @public
     */
    InstanceType: TrainingInstanceType | undefined;
    /**
     * <p>Specifies the number of instances of the instance group.</p>
     * @public
     */
    InstanceCount: number | undefined;
    /**
     * <p>Specifies the name of the instance group.</p>
     * @public
     */
    InstanceGroupName: string | undefined;
}
/**
 * <p>Specifies how instances should be placed on a specific UltraServer.</p>
 * @public
 */
export interface PlacementSpecification {
    /**
     * <p>The unique identifier of the UltraServer where instances should be placed.</p>
     * @public
     */
    UltraServerId?: string | undefined;
    /**
     * <p>The number of ML compute instances required to be placed together on the same UltraServer. Minimum value of 1.</p>
     * @public
     */
    InstanceCount: number | undefined;
}
/**
 * <p>Configuration for how instances are placed and allocated within UltraServers. This is only applicable for UltraServer capacity.</p>
 * @public
 */
export interface InstancePlacementConfig {
    /**
     * <p>If set to true, allows multiple jobs to share the same UltraServer instances. If set to false, ensures this job's instances are placed on an UltraServer exclusively, with no other jobs sharing the same UltraServer. Default is false.</p>
     * @public
     */
    EnableMultipleJobs?: boolean | undefined;
    /**
     * <p>A list of specifications for how instances should be placed on specific UltraServers. Maximum of 10 items is supported.</p>
     * @public
     */
    PlacementSpecifications?: PlacementSpecification[] | undefined;
}
/**
 * <p>Describes the resources, including machine learning (ML) compute instances and ML storage volumes, to use for model training. </p>
 * @public
 */
export interface ResourceConfig {
    /**
     * <p>The ML compute instance type. </p>
     * @public
     */
    InstanceType?: TrainingInstanceType | undefined;
    /**
     * <p>The number of ML compute instances to use. For distributed training, provide a value greater than 1. </p>
     * @public
     */
    InstanceCount?: number | undefined;
    /**
     * <p>The size of the ML storage volume that you want to provision. </p> <p>SageMaker automatically selects the volume size for serverless training jobs. You cannot customize this setting.</p> <p>ML storage volumes store model artifacts and incremental states. Training algorithms might also use the ML storage volume for scratch space. If you want to store the training data in the ML storage volume, choose <code>File</code> as the <code>TrainingInputMode</code> in the algorithm specification. </p> <p>When using an ML instance with <a href="https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ssd-instance-store.html#nvme-ssd-volumes">NVMe SSD volumes</a>, SageMaker doesn't provision Amazon EBS General Purpose SSD (gp2) storage. Available storage is fixed to the NVMe-type instance's storage capacity. SageMaker configures storage paths for training datasets, checkpoints, model artifacts, and outputs to use the entire capacity of the instance storage. For example, ML instance families with the NVMe-type instance storage include <code>ml.p4d</code>, <code>ml.g4dn</code>, and <code>ml.g5</code>. </p> <p>When using an ML instance with the EBS-only storage option and without instance storage, you must define the size of EBS volume through <code>VolumeSizeInGB</code> in the <code>ResourceConfig</code> API. For example, ML instance families that use EBS volumes include <code>ml.c5</code> and <code>ml.p2</code>. </p> <p>To look up instance types and their instance storage types and volumes, see <a href="http://aws.amazon.com/ec2/instance-types/">Amazon EC2 Instance Types</a>.</p> <p>To find the default local paths defined by the SageMaker training platform, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/model-train-storage.html">Amazon SageMaker Training Storage Folders for Training Datasets, Checkpoints, Model Artifacts, and Outputs</a>.</p>
     * @public
     */
    VolumeSizeInGB?: number | undefined;
    /**
     * <p>The Amazon Web Services KMS key that SageMaker uses to encrypt data on the storage volume attached to the ML compute instance(s) that run the training job.</p> <note> <p>Certain Nitro-based instances include local storage, dependent on the instance type. Local storage volumes are encrypted using a hardware module on the instance. You can't request a <code>VolumeKmsKeyId</code> when using an instance type with local storage.</p> <p>For a list of instance types that support local instance storage, see <a href="https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/InstanceStorage.html#instance-store-volumes">Instance Store Volumes</a>.</p> <p>For more information about local instance storage encryption, see <a href="https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ssd-instance-store.html">SSD Instance Store Volumes</a>.</p> </note> <p>The <code>VolumeKmsKeyId</code> can be in any of the following formats:</p> <ul> <li> <p>// KMS Key ID</p> <p> <code>"1234abcd-12ab-34cd-56ef-1234567890ab"</code> </p> </li> <li> <p>// Amazon Resource Name (ARN) of a KMS Key</p> <p> <code>"arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab"</code> </p> </li> </ul>
     * @public
     */
    VolumeKmsKeyId?: string | undefined;
    /**
     * <p>The duration of time in seconds to retain configured resources in a warm pool for subsequent training jobs.</p>
     * @public
     */
    KeepAlivePeriodInSeconds?: number | undefined;
    /**
     * <p>The configuration of a heterogeneous cluster in JSON format.</p>
     * @public
     */
    InstanceGroups?: InstanceGroup[] | undefined;
    /**
     * <p>The Amazon Resource Name (ARN); of the training plan to use for this resource configuration.</p>
     * @public
     */
    TrainingPlanArn?: string | undefined;
    /**
     * <p>Configuration for how training job instances are placed and allocated within UltraServers. Only applicable for UltraServer capacity.</p>
     * @public
     */
    InstancePlacementConfig?: InstancePlacementConfig | undefined;
}
/**
 * <p>Specifies a limit to how long a job can run. When the job reaches the time limit, SageMaker ends the job. Use this API to cap costs.</p> <p>To stop a training job, SageMaker sends the algorithm the <code>SIGTERM</code> signal, which delays job termination for 120 seconds. Algorithms can use this 120-second window to save the model artifacts, so the results of training are not lost. </p> <p>The training algorithms provided by SageMaker automatically save the intermediate results of a model training job when possible. This attempt to save artifacts is only a best effort case as model might not be in a state from which it can be saved. For example, if training has just started, the model might not be ready to save. When saved, this intermediate data is a valid model artifact. You can use it to create a model with <code>CreateModel</code>.</p> <note> <p>The Neural Topic Model (NTM) currently does not support saving intermediate model artifacts. When training NTMs, make sure that the maximum runtime is sufficient for the training job to complete.</p> </note>
 * @public
 */
export interface StoppingCondition {
    /**
     * <p>The maximum length of time, in seconds, that a training or compilation job can run before it is stopped.</p> <p>For compilation jobs, if the job does not complete during this time, a <code>TimeOut</code> error is generated. We recommend starting with 900 seconds and increasing as necessary based on your model.</p> <p>For all other jobs, if the job does not complete during this time, SageMaker ends the job. When <code>RetryStrategy</code> is specified in the job request, <code>MaxRuntimeInSeconds</code> specifies the maximum time for all of the attempts in total, not each individual attempt. The default value is 1 day. The maximum value is 28 days.</p> <p>The maximum time that a <code>TrainingJob</code> can run in total, including any time spent publishing metrics or archiving and uploading models after it has been stopped, is 30 days.</p>
     * @public
     */
    MaxRuntimeInSeconds?: number | undefined;
    /**
     * <p>The maximum length of time, in seconds, that a managed Spot training job has to complete. It is the amount of time spent waiting for Spot capacity plus the amount of time the job can run. It must be equal to or greater than <code>MaxRuntimeInSeconds</code>. If the job does not complete during this time, SageMaker ends the job.</p> <p>When <code>RetryStrategy</code> is specified in the job request, <code>MaxWaitTimeInSeconds</code> specifies the maximum time for all of the attempts in total, not each individual attempt.</p>
     * @public
     */
    MaxWaitTimeInSeconds?: number | undefined;
    /**
     * <p>The maximum length of time, in seconds, that a training or compilation job can be pending before it is stopped.</p> <note> <p>When working with training jobs that use capacity from <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/reserve-capacity-with-training-plans.html">training plans</a>, not all <code>Pending</code> job states count against the <code>MaxPendingTimeInSeconds</code> limit. The following scenarios do not increment the <code>MaxPendingTimeInSeconds</code> counter:</p> <ul> <li> <p>The plan is in a <code>Scheduled</code> state: Jobs queued (in <code>Pending</code> status) before a plan's start date (waiting for scheduled start time)</p> </li> <li> <p>Between capacity reservations: Jobs temporarily back to <code>Pending</code> status between two capacity reservation periods</p> </li> </ul> <p> <code>MaxPendingTimeInSeconds</code> only increments when jobs are actively waiting for capacity in an <code>Active</code> plan.</p> </note>
     * @public
     */
    MaxPendingTimeInSeconds?: number | undefined;
}
/**
 * <p>Defines the input needed to run a training job using the algorithm.</p>
 * @public
 */
export interface TrainingJobDefinition {
    /**
     * <p>The training input mode that the algorithm supports. For more information about input modes, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/algos.html">Algorithms</a>.</p> <p> <b>Pipe mode</b> </p> <p>If an algorithm supports <code>Pipe</code> mode, Amazon SageMaker streams data directly from Amazon S3 to the container.</p> <p> <b>File mode</b> </p> <p>If an algorithm supports <code>File</code> mode, SageMaker downloads the training data from S3 to the provisioned ML storage volume, and mounts the directory to the Docker volume for the training container.</p> <p>You must provision the ML storage volume with sufficient capacity to accommodate the data downloaded from S3. In addition to the training data, the ML storage volume also stores the output model. The algorithm container uses the ML storage volume to also store intermediate information, if any.</p> <p>For distributed algorithms, training data is distributed uniformly. Your training duration is predictable if the input data objects sizes are approximately the same. SageMaker does not split the files any further for model training. If the object sizes are skewed, training won't be optimal as the data distribution is also skewed when one host in a training cluster is overloaded, thus becoming a bottleneck in training.</p> <p> <b>FastFile mode</b> </p> <p>If an algorithm supports <code>FastFile</code> mode, SageMaker streams data directly from S3 to the container with no code changes, and provides file system access to the data. Users can author their training script to interact with these files as if they were stored on disk.</p> <p> <code>FastFile</code> mode works best when the data is read sequentially. Augmented manifest files aren't supported. The startup time is lower when there are fewer files in the S3 bucket provided.</p>
     * @public
     */
    TrainingInputMode: TrainingInputMode | undefined;
    /**
     * <p>The hyperparameters used for the training job.</p>
     * @public
     */
    HyperParameters?: Record<string, string> | undefined;
    /**
     * <p>An array of <code>Channel</code> objects, each of which specifies an input source.</p>
     * @public
     */
    InputDataConfig: Channel[] | undefined;
    /**
     * <p>the path to the S3 bucket where you want to store model artifacts. SageMaker creates subfolders for the artifacts.</p>
     * @public
     */
    OutputDataConfig: OutputDataConfig | undefined;
    /**
     * <p>The resources, including the ML compute instances and ML storage volumes, to use for model training.</p>
     * @public
     */
    ResourceConfig: ResourceConfig | undefined;
    /**
     * <p>Specifies a limit to how long a model training job can run. It also specifies how long a managed Spot training job has to complete. When the job reaches the time limit, SageMaker ends the training job. Use this API to cap model training costs.</p> <p>To stop a job, SageMaker sends the algorithm the SIGTERM signal, which delays job termination for 120 seconds. Algorithms can use this 120-second window to save the model artifacts.</p>
     * @public
     */
    StoppingCondition: StoppingCondition | undefined;
}
/**
 * <p>Describes the S3 data source.</p>
 * @public
 */
export interface TransformS3DataSource {
    /**
     * <p>If you choose <code>S3Prefix</code>, <code>S3Uri</code> identifies a key name prefix. Amazon SageMaker uses all objects with the specified key name prefix for batch transform. </p> <p>If you choose <code>ManifestFile</code>, <code>S3Uri</code> identifies an object that is a manifest file containing a list of object keys that you want Amazon SageMaker to use for batch transform. </p> <p>The following values are compatible: <code>ManifestFile</code>, <code>S3Prefix</code> </p> <p>The following value is not compatible: <code>AugmentedManifestFile</code> </p>
     * @public
     */
    S3DataType: S3DataType | undefined;
    /**
     * <p>Depending on the value specified for the <code>S3DataType</code>, identifies either a key name prefix or a manifest. For example:</p> <ul> <li> <p> A key name prefix might look like this: <code>s3://bucketname/exampleprefix/</code>. </p> </li> <li> <p> A manifest might look like this: <code>s3://bucketname/example.manifest</code> </p> <p> The manifest is an S3 object which is a JSON file with the following format: </p> <p> <code>[ \{"prefix": "s3://customer_bucket/some/prefix/"\},</code> </p> <p> <code>"relative/path/to/custdata-1",</code> </p> <p> <code>"relative/path/custdata-2",</code> </p> <p> <code>...</code> </p> <p> <code>"relative/path/custdata-N"</code> </p> <p> <code>]</code> </p> <p> The preceding JSON matches the following <code>S3Uris</code>: </p> <p> <code>s3://customer_bucket/some/prefix/relative/path/to/custdata-1</code> </p> <p> <code>s3://customer_bucket/some/prefix/relative/path/custdata-2</code> </p> <p> <code>...</code> </p> <p> <code>s3://customer_bucket/some/prefix/relative/path/custdata-N</code> </p> <p> The complete set of <code>S3Uris</code> in this manifest constitutes the input data for the channel for this datasource. The object that each <code>S3Uris</code> points to must be readable by the IAM role that Amazon SageMaker uses to perform tasks on your behalf.</p> </li> </ul>
     * @public
     */
    S3Uri: string | undefined;
}
/**
 * <p>Describes the location of the channel data.</p>
 * @public
 */
export interface TransformDataSource {
    /**
     * <p>The S3 location of the data source that is associated with a channel.</p>
     * @public
     */
    S3DataSource: TransformS3DataSource | undefined;
}
/**
 * <p>Describes the input source of a transform job and the way the transform job consumes it.</p>
 * @public
 */
export interface TransformInput {
    /**
     * <p>Describes the location of the channel data, which is, the S3 location of the input data that the model can consume.</p>
     * @public
     */
    DataSource: TransformDataSource | undefined;
    /**
     * <p>The multipurpose internet mail extension (MIME) type of the data. Amazon SageMaker uses the MIME type with each http call to transfer data to the transform job.</p>
     * @public
     */
    ContentType?: string | undefined;
    /**
     * <p>If your transform data is compressed, specify the compression type. Amazon SageMaker automatically decompresses the data for the transform job accordingly. The default value is <code>None</code>.</p>
     * @public
     */
    CompressionType?: CompressionType | undefined;
    /**
     * <p>The method to use to split the transform job's data files into smaller batches. Splitting is necessary when the total size of each object is too large to fit in a single request. You can also use data splitting to improve performance by processing multiple concurrent mini-batches. The default value for <code>SplitType</code> is <code>None</code>, which indicates that input data files are not split, and request payloads contain the entire contents of an input object. Set the value of this parameter to <code>Line</code> to split records on a newline character boundary. <code>SplitType</code> also supports a number of record-oriented binary data formats. Currently, the supported record formats are:</p> <ul> <li> <p>RecordIO</p> </li> <li> <p>TFRecord</p> </li> </ul> <p>When splitting is enabled, the size of a mini-batch depends on the values of the <code>BatchStrategy</code> and <code>MaxPayloadInMB</code> parameters. When the value of <code>BatchStrategy</code> is <code>MultiRecord</code>, Amazon SageMaker sends the maximum number of records in each request, up to the <code>MaxPayloadInMB</code> limit. If the value of <code>BatchStrategy</code> is <code>SingleRecord</code>, Amazon SageMaker sends individual records in each request.</p> <note> <p>Some data formats represent a record as a binary payload wrapped with extra padding bytes. When splitting is applied to a binary data format, padding is removed if the value of <code>BatchStrategy</code> is set to <code>SingleRecord</code>. Padding is not removed if the value of <code>BatchStrategy</code> is set to <code>MultiRecord</code>.</p> <p>For more information about <code>RecordIO</code>, see <a href="https://mxnet.apache.org/api/faq/recordio">Create a Dataset Using RecordIO</a> in the MXNet documentation. For more information about <code>TFRecord</code>, see <a href="https://www.tensorflow.org/guide/data#consuming_tfrecord_data">Consuming TFRecord data</a> in the TensorFlow documentation.</p> </note>
     * @public
     */
    SplitType?: SplitType | undefined;
}
/**
 * <p>Describes the results of a transform job.</p>
 * @public
 */
export interface TransformOutput {
    /**
     * <p>The Amazon S3 path where you want Amazon SageMaker to store the results of the transform job. For example, <code>s3://bucket-name/key-name-prefix</code>.</p> <p>For every S3 object used as input for the transform job, batch transform stores the transformed data with an .<code>out</code> suffix in a corresponding subfolder in the location in the output prefix. For example, for the input data stored at <code>s3://bucket-name/input-name-prefix/dataset01/data.csv</code>, batch transform stores the transformed data at <code>s3://bucket-name/output-name-prefix/input-name-prefix/data.csv.out</code>. Batch transform doesn't upload partially processed objects. For an input S3 object that contains multiple records, it creates an .<code>out</code> file only if the transform job succeeds on the entire file. When the input contains multiple S3 objects, the batch transform job processes the listed S3 objects and uploads only the output for successfully processed objects. If any object fails in the transform job batch transform marks the job as failed to prompt investigation.</p>
     * @public
     */
    S3OutputPath: string | undefined;
    /**
     * <p>The MIME type used to specify the output data. Amazon SageMaker uses the MIME type with each http call to transfer data from the transform job.</p>
     * @public
     */
    Accept?: string | undefined;
    /**
     * <p>Defines how to assemble the results of the transform job as a single S3 object. Choose a format that is most convenient to you. To concatenate the results in binary format, specify <code>None</code>. To add a newline character at the end of every transformed record, specify <code>Line</code>.</p>
     * @public
     */
    AssembleWith?: AssemblyType | undefined;
    /**
     * <p>The Amazon Web Services Key Management Service (Amazon Web Services KMS) key that Amazon SageMaker uses to encrypt the model artifacts at rest using Amazon S3 server-side encryption. The <code>KmsKeyId</code> can be any of the following formats: </p> <ul> <li> <p>Key ID: <code>1234abcd-12ab-34cd-56ef-1234567890ab</code> </p> </li> <li> <p>Key ARN: <code>arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab</code> </p> </li> <li> <p>Alias name: <code>alias/ExampleAlias</code> </p> </li> <li> <p>Alias name ARN: <code>arn:aws:kms:us-west-2:111122223333:alias/ExampleAlias</code> </p> </li> </ul> <p>If you don't provide a KMS key ID, Amazon SageMaker uses the default KMS key for Amazon S3 for your role's account. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingKMSEncryption.html">KMS-Managed Encryption Keys</a> in the <i>Amazon Simple Storage Service Developer Guide.</i> </p> <p>The KMS key policy must grant permission to the IAM role that you specify in your <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateModel.html">CreateModel</a> request. For more information, see <a href="https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html">Using Key Policies in Amazon Web Services KMS</a> in the <i>Amazon Web Services Key Management Service Developer Guide</i>.</p>
     * @public
     */
    KmsKeyId?: string | undefined;
}
/**
 * <p>Describes the resources, including ML instance types and ML instance count, to use for transform job.</p>
 * @public
 */
export interface TransformResources {
    /**
     * <p>The ML compute instance type for the transform job. If you are using built-in algorithms to transform moderately sized datasets, we recommend using ml.m4.xlarge or <code>ml.m5.large</code>instance types.</p>
     * @public
     */
    InstanceType: TransformInstanceType | undefined;
    /**
     * <p>The number of ML compute instances to use in the transform job. The default value is <code>1</code>, and the maximum is <code>100</code>. For distributed transform jobs, specify a value greater than <code>1</code>.</p>
     * @public
     */
    InstanceCount: number | undefined;
    /**
     * <p>The Amazon Web Services Key Management Service (Amazon Web Services KMS) key that Amazon SageMaker uses to encrypt model data on the storage volume attached to the ML compute instance(s) that run the batch transform job.</p> <note> <p>Certain Nitro-based instances include local storage, dependent on the instance type. Local storage volumes are encrypted using a hardware module on the instance. You can't request a <code>VolumeKmsKeyId</code> when using an instance type with local storage.</p> <p>For a list of instance types that support local instance storage, see <a href="https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/InstanceStorage.html#instance-store-volumes">Instance Store Volumes</a>.</p> <p>For more information about local instance storage encryption, see <a href="https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ssd-instance-store.html">SSD Instance Store Volumes</a>.</p> </note> <p> The <code>VolumeKmsKeyId</code> can be any of the following formats:</p> <ul> <li> <p>Key ID: <code>1234abcd-12ab-34cd-56ef-1234567890ab</code> </p> </li> <li> <p>Key ARN: <code>arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab</code> </p> </li> <li> <p>Alias name: <code>alias/ExampleAlias</code> </p> </li> <li> <p>Alias name ARN: <code>arn:aws:kms:us-west-2:111122223333:alias/ExampleAlias</code> </p> </li> </ul>
     * @public
     */
    VolumeKmsKeyId?: string | undefined;
    /**
     * <p>Specifies an option from a collection of preconfigured Amazon Machine Image (AMI) images. Each image is configured by Amazon Web Services with a set of software and driver versions.</p> <dl> <dt>al2-ami-sagemaker-batch-gpu-470</dt> <dd> <ul> <li> <p>Accelerator: GPU</p> </li> <li> <p>NVIDIA driver version: 470</p> </li> </ul> </dd> <dt>al2-ami-sagemaker-batch-gpu-535</dt> <dd> <ul> <li> <p>Accelerator: GPU</p> </li> <li> <p>NVIDIA driver version: 535</p> </li> </ul> </dd> </dl>
     * @public
     */
    TransformAmiVersion?: string | undefined;
}
/**
 * <p>Defines the input needed to run a transform job using the inference specification specified in the algorithm.</p>
 * @public
 */
export interface TransformJobDefinition {
    /**
     * <p>The maximum number of parallel requests that can be sent to each instance in a transform job. The default value is 1.</p>
     * @public
     */
    MaxConcurrentTransforms?: number | undefined;
    /**
     * <p>The maximum payload size allowed, in MB. A payload is the data portion of a record (without metadata).</p>
     * @public
     */
    MaxPayloadInMB?: number | undefined;
    /**
     * <p>A string that determines the number of records included in a single mini-batch.</p> <p> <code>SingleRecord</code> means only one record is used per mini-batch. <code>MultiRecord</code> means a mini-batch is set to contain as many records that can fit within the <code>MaxPayloadInMB</code> limit.</p>
     * @public
     */
    BatchStrategy?: BatchStrategy | undefined;
    /**
     * <p>The environment variables to set in the Docker container. We support up to 16 key and values entries in the map.</p>
     * @public
     */
    Environment?: Record<string, string> | undefined;
    /**
     * <p>A description of the input source and the way the transform job consumes it.</p>
     * @public
     */
    TransformInput: TransformInput | undefined;
    /**
     * <p>Identifies the Amazon S3 location where you want Amazon SageMaker to save the results from the transform job.</p>
     * @public
     */
    TransformOutput: TransformOutput | undefined;
    /**
     * <p>Identifies the ML compute instances for the transform job.</p>
     * @public
     */
    TransformResources: TransformResources | undefined;
}
/**
 * <p>Defines a training job and a batch transform job that SageMaker runs to validate your algorithm.</p> <p>The data provided in the validation profile is made available to your buyers on Amazon Web Services Marketplace.</p>
 * @public
 */
export interface AlgorithmValidationProfile {
    /**
     * <p>The name of the profile for the algorithm. The name must have 1 to 63 characters. Valid characters are a-z, A-Z, 0-9, and - (hyphen).</p>
     * @public
     */
    ProfileName: string | undefined;
    /**
     * <p>The <code>TrainingJobDefinition</code> object that describes the training job that SageMaker runs to validate your algorithm.</p>
     * @public
     */
    TrainingJobDefinition: TrainingJobDefinition | undefined;
    /**
     * <p>The <code>TransformJobDefinition</code> object that describes the transform job that SageMaker runs to validate your algorithm.</p>
     * @public
     */
    TransformJobDefinition?: TransformJobDefinition | undefined;
}
/**
 * <p>Specifies configurations for one or more training jobs that SageMaker runs to test the algorithm.</p>
 * @public
 */
export interface AlgorithmValidationSpecification {
    /**
     * <p>The IAM roles that SageMaker uses to run the training jobs.</p>
     * @public
     */
    ValidationRole: string | undefined;
    /**
     * <p>An array of <code>AlgorithmValidationProfile</code> objects, each of which specifies a training job and batch transform job that SageMaker runs to validate your algorithm.</p>
     * @public
     */
    ValidationProfiles: AlgorithmValidationProfile[] | undefined;
}
/**
 * <p>A collection of settings that configure the Amazon Q experience within the domain.</p>
 * @public
 */
export interface AmazonQSettings {
    /**
     * <p>Whether Amazon Q has been enabled within the domain.</p>
     * @public
     */
    Status?: FeatureStatus | undefined;
    /**
     * <p>The ARN of the Amazon Q profile used within the domain.</p>
     * @public
     */
    QProfileArn?: string | undefined;
}
/**
 * <p>Configures how labels are consolidated across human workers and processes output data.</p>
 * @public
 */
export interface AnnotationConsolidationConfig {
    /**
     * <p>The Amazon Resource Name (ARN) of a Lambda function implements the logic for <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/sms-annotation-consolidation.html">annotation consolidation</a> and to process output data.</p> <p>For <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/sms-task-types.html">built-in task types</a>, use one of the following Amazon SageMaker Ground Truth Lambda function ARNs for <code>AnnotationConsolidationLambdaArn</code>. For custom labeling workflows, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/sms-custom-templates-step3.html#sms-custom-templates-step3-postlambda">Post-annotation Lambda</a>.</p> <p> <b>Bounding box</b> - Finds the most similar boxes from different workers based on the Jaccard index of the boxes.</p> <ul> <li> <p> <code>arn:aws:lambda:us-east-1:432418664414:function:ACS-BoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-east-2:266458841044:function:ACS-BoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-west-2:081040173940:function:ACS-BoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-1:568282634449:function:ACS-BoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-1:477331159723:function:ACS-BoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-2:454466003867:function:ACS-BoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-south-1:565803892007:function:ACS-BoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-central-1:203001061592:function:ACS-BoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-2:845288260483:function:ACS-BoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-2:487402164563:function:ACS-BoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-1:377565633583:function:ACS-BoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:ca-central-1:918755190332:function:ACS-BoundingBox</code> </p> </li> </ul> <p> <b>Image classification</b> - Uses a variant of the Expectation Maximization approach to estimate the true class of an image based on annotations from individual workers.</p> <ul> <li> <p> <code>arn:aws:lambda:us-east-1:432418664414:function:ACS-ImageMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-east-2:266458841044:function:ACS-ImageMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-west-2:081040173940:function:ACS-ImageMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-1:568282634449:function:ACS-ImageMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-1:477331159723:function:ACS-ImageMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-2:454466003867:function:ACS-ImageMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-south-1:565803892007:function:ACS-ImageMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-central-1:203001061592:function:ACS-ImageMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-2:845288260483:function:ACS-ImageMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-2:487402164563:function:ACS-ImageMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-1:377565633583:function:ACS-ImageMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:ca-central-1:918755190332:function:ACS-ImageMultiClass</code> </p> </li> </ul> <p> <b>Multi-label image classification</b> - Uses a variant of the Expectation Maximization approach to estimate the true classes of an image based on annotations from individual workers.</p> <ul> <li> <p> <code>arn:aws:lambda:us-east-1:432418664414:function:ACS-ImageMultiClassMultiLabel</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-east-2:266458841044:function:ACS-ImageMultiClassMultiLabel</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-west-2:081040173940:function:ACS-ImageMultiClassMultiLabel</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-1:568282634449:function:ACS-ImageMultiClassMultiLabel</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-1:477331159723:function:ACS-ImageMultiClassMultiLabel</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-2:454466003867:function:ACS-ImageMultiClassMultiLabel</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-south-1:565803892007:function:ACS-ImageMultiClassMultiLabel</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-central-1:203001061592:function:ACS-ImageMultiClassMultiLabel</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-2:845288260483:function:ACS-ImageMultiClassMultiLabel</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-2:487402164563:function:ACS-ImageMultiClassMultiLabel</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-1:377565633583:function:ACS-ImageMultiClassMultiLabel</code> </p> </li> <li> <p> <code>arn:aws:lambda:ca-central-1:918755190332:function:ACS-ImageMultiClassMultiLabel</code> </p> </li> </ul> <p> <b>Semantic segmentation</b> - Treats each pixel in an image as a multi-class classification and treats pixel annotations from workers as "votes" for the correct label.</p> <ul> <li> <p> <code>arn:aws:lambda:us-east-1:432418664414:function:ACS-SemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-east-2:266458841044:function:ACS-SemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-west-2:081040173940:function:ACS-SemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-1:568282634449:function:ACS-SemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-1:477331159723:function:ACS-SemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-2:454466003867:function:ACS-SemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-south-1:565803892007:function:ACS-SemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-central-1:203001061592:function:ACS-SemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-2:845288260483:function:ACS-SemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-2:487402164563:function:ACS-SemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-1:377565633583:function:ACS-SemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:ca-central-1:918755190332:function:ACS-SemanticSegmentation</code> </p> </li> </ul> <p> <b>Text classification</b> - Uses a variant of the Expectation Maximization approach to estimate the true class of text based on annotations from individual workers.</p> <ul> <li> <p> <code>arn:aws:lambda:us-east-1:432418664414:function:ACS-TextMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-east-2:266458841044:function:ACS-TextMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-west-2:081040173940:function:ACS-TextMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-1:568282634449:function:ACS-TextMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-1:477331159723:function:ACS-TextMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-2:454466003867:function:ACS-TextMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-south-1:565803892007:function:ACS-TextMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-central-1:203001061592:function:ACS-TextMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-2:845288260483:function:ACS-TextMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-2:487402164563:function:ACS-TextMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-1:377565633583:function:ACS-TextMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:ca-central-1:918755190332:function:ACS-TextMultiClass</code> </p> </li> </ul> <p> <b>Multi-label text classification</b> - Uses a variant of the Expectation Maximization approach to estimate the true classes of text based on annotations from individual workers.</p> <ul> <li> <p> <code>arn:aws:lambda:us-east-1:432418664414:function:ACS-TextMultiClassMultiLabel</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-east-2:266458841044:function:ACS-TextMultiClassMultiLabel</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-west-2:081040173940:function:ACS-TextMultiClassMultiLabel</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-1:568282634449:function:ACS-TextMultiClassMultiLabel</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-1:477331159723:function:ACS-TextMultiClassMultiLabel</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-2:454466003867:function:ACS-TextMultiClassMultiLabel</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-south-1:565803892007:function:ACS-TextMultiClassMultiLabel</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-central-1:203001061592:function:ACS-TextMultiClassMultiLabel</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-2:845288260483:function:ACS-TextMultiClassMultiLabel</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-2:487402164563:function:ACS-TextMultiClassMultiLabel</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-1:377565633583:function:ACS-TextMultiClassMultiLabel</code> </p> </li> <li> <p> <code>arn:aws:lambda:ca-central-1:918755190332:function:ACS-TextMultiClassMultiLabel</code> </p> </li> </ul> <p> <b>Named entity recognition</b> - Groups similar selections and calculates aggregate boundaries, resolving to most-assigned label.</p> <ul> <li> <p> <code>arn:aws:lambda:us-east-1:432418664414:function:ACS-NamedEntityRecognition</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-east-2:266458841044:function:ACS-NamedEntityRecognition</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-west-2:081040173940:function:ACS-NamedEntityRecognition</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-1:568282634449:function:ACS-NamedEntityRecognition</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-1:477331159723:function:ACS-NamedEntityRecognition</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-2:454466003867:function:ACS-NamedEntityRecognition</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-south-1:565803892007:function:ACS-NamedEntityRecognition</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-central-1:203001061592:function:ACS-NamedEntityRecognition</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-2:845288260483:function:ACS-NamedEntityRecognition</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-2:487402164563:function:ACS-NamedEntityRecognition</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-1:377565633583:function:ACS-NamedEntityRecognition</code> </p> </li> <li> <p> <code>arn:aws:lambda:ca-central-1:918755190332:function:ACS-NamedEntityRecognition</code> </p> </li> </ul> <p> <b>Video Classification</b> - Use this task type when you need workers to classify videos using predefined labels that you specify. Workers are shown videos and are asked to choose one label for each video.</p> <ul> <li> <p> <code>arn:aws:lambda:us-east-1:432418664414:function:ACS-VideoMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-east-2:266458841044:function:ACS-VideoMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-west-2:081040173940:function:ACS-VideoMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-1:568282634449:function:ACS-VideoMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-1:477331159723:function:ACS-VideoMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-2:454466003867:function:ACS-VideoMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-south-1:565803892007:function:ACS-VideoMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-central-1:203001061592:function:ACS-VideoMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-2:845288260483:function:ACS-VideoMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-2:487402164563:function:ACS-VideoMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-1:377565633583:function:ACS-VideoMultiClass</code> </p> </li> <li> <p> <code>arn:aws:lambda:ca-central-1:918755190332:function:ACS-VideoMultiClass</code> </p> </li> </ul> <p> <b>Video Frame Object Detection</b> - Use this task type to have workers identify and locate objects in a sequence of video frames (images extracted from a video) using bounding boxes. For example, you can use this task to ask workers to identify and localize various objects in a series of video frames, such as cars, bikes, and pedestrians.</p> <ul> <li> <p> <code>arn:aws:lambda:us-east-1:432418664414:function:ACS-VideoObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-east-2:266458841044:function:ACS-VideoObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-west-2:081040173940:function:ACS-VideoObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-1:568282634449:function:ACS-VideoObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-1:477331159723:function:ACS-VideoObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-2:454466003867:function:ACS-VideoObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-south-1:565803892007:function:ACS-VideoObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-central-1:203001061592:function:ACS-VideoObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-2:845288260483:function:ACS-VideoObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-2:487402164563:function:ACS-VideoObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-1:377565633583:function:ACS-VideoObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:ca-central-1:918755190332:function:ACS-VideoObjectDetection</code> </p> </li> </ul> <p> <b>Video Frame Object Tracking</b> - Use this task type to have workers track the movement of objects in a sequence of video frames (images extracted from a video) using bounding boxes. For example, you can use this task to ask workers to track the movement of objects, such as cars, bikes, and pedestrians. </p> <ul> <li> <p> <code>arn:aws:lambda:us-east-1:432418664414:function:ACS-VideoObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-east-2:266458841044:function:ACS-VideoObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-west-2:081040173940:function:ACS-VideoObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-1:568282634449:function:ACS-VideoObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-1:477331159723:function:ACS-VideoObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-2:454466003867:function:ACS-VideoObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-south-1:565803892007:function:ACS-VideoObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-central-1:203001061592:function:ACS-VideoObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-2:845288260483:function:ACS-VideoObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-2:487402164563:function:ACS-VideoObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-1:377565633583:function:ACS-VideoObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:ca-central-1:918755190332:function:ACS-VideoObjectTracking</code> </p> </li> </ul> <p> <b>3D Point Cloud Object Detection</b> - Use this task type when you want workers to classify objects in a 3D point cloud by drawing 3D cuboids around objects. For example, you can use this task type to ask workers to identify different types of objects in a point cloud, such as cars, bikes, and pedestrians.</p> <ul> <li> <p> <code>arn:aws:lambda:us-east-1:432418664414:function:ACS-3DPointCloudObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-east-2:266458841044:function:ACS-3DPointCloudObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-west-2:081040173940:function:ACS-3DPointCloudObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-1:568282634449:function:ACS-3DPointCloudObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-1:477331159723:function:ACS-3DPointCloudObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-2:454466003867:function:ACS-3DPointCloudObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-south-1:565803892007:function:ACS-3DPointCloudObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-central-1:203001061592:function:ACS-3DPointCloudObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-2:845288260483:function:ACS-3DPointCloudObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-2:487402164563:function:ACS-3DPointCloudObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-1:377565633583:function:ACS-3DPointCloudObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:ca-central-1:918755190332:function:ACS-3DPointCloudObjectDetection</code> </p> </li> </ul> <p> <b>3D Point Cloud Object Tracking</b> - Use this task type when you want workers to draw 3D cuboids around objects that appear in a sequence of 3D point cloud frames. For example, you can use this task type to ask workers to track the movement of vehicles across multiple point cloud frames. </p> <ul> <li> <p> <code>arn:aws:lambda:us-east-1:432418664414:function:ACS-3DPointCloudObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-east-2:266458841044:function:ACS-3DPointCloudObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-west-2:081040173940:function:ACS-3DPointCloudObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-1:568282634449:function:ACS-3DPointCloudObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-1:477331159723:function:ACS-3DPointCloudObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-2:454466003867:function:ACS-3DPointCloudObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-south-1:565803892007:function:ACS-3DPointCloudObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-central-1:203001061592:function:ACS-3DPointCloudObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-2:845288260483:function:ACS-3DPointCloudObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-2:487402164563:function:ACS-3DPointCloudObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-1:377565633583:function:ACS-3DPointCloudObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:ca-central-1:918755190332:function:ACS-3DPointCloudObjectTracking</code> </p> </li> </ul> <p> <b>3D Point Cloud Semantic Segmentation</b> - Use this task type when you want workers to create a point-level semantic segmentation masks by painting objects in a 3D point cloud using different colors where each color is assigned to one of the classes you specify.</p> <ul> <li> <p> <code>arn:aws:lambda:us-east-1:432418664414:function:ACS-3DPointCloudSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-east-2:266458841044:function:ACS-3DPointCloudSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-west-2:081040173940:function:ACS-3DPointCloudSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-1:568282634449:function:ACS-3DPointCloudSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-1:477331159723:function:ACS-3DPointCloudSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-2:454466003867:function:ACS-3DPointCloudSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-south-1:565803892007:function:ACS-3DPointCloudSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-central-1:203001061592:function:ACS-3DPointCloudSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-2:845288260483:function:ACS-3DPointCloudSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-2:487402164563:function:ACS-3DPointCloudSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-1:377565633583:function:ACS-3DPointCloudSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:ca-central-1:918755190332:function:ACS-3DPointCloudSemanticSegmentation</code> </p> </li> </ul> <p> <b>Use the following ARNs for Label Verification and Adjustment Jobs</b> </p> <p>Use label verification and adjustment jobs to review and adjust labels. To learn more, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/sms-verification-data.html">Verify and Adjust Labels </a>.</p> <p> <b>Semantic Segmentation Adjustment</b> - Treats each pixel in an image as a multi-class classification and treats pixel adjusted annotations from workers as "votes" for the correct label.</p> <ul> <li> <p> <code>arn:aws:lambda:us-east-1:432418664414:function:ACS-AdjustmentSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-east-2:266458841044:function:ACS-AdjustmentSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-west-2:081040173940:function:ACS-AdjustmentSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-1:568282634449:function:ACS-AdjustmentSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-1:477331159723:function:ACS-AdjustmentSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-2:454466003867:function:ACS-AdjustmentSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-south-1:565803892007:function:ACS-AdjustmentSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-central-1:203001061592:function:ACS-AdjustmentSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-2:845288260483:function:ACS-AdjustmentSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-2:487402164563:function:ACS-AdjustmentSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-1:377565633583:function:ACS-AdjustmentSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:ca-central-1:918755190332:function:ACS-AdjustmentSemanticSegmentation</code> </p> </li> </ul> <p> <b>Semantic Segmentation Verification</b> - Uses a variant of the Expectation Maximization approach to estimate the true class of verification judgment for semantic segmentation labels based on annotations from individual workers.</p> <ul> <li> <p> <code>arn:aws:lambda:us-east-1:432418664414:function:ACS-VerificationSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-east-2:266458841044:function:ACS-VerificationSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-west-2:081040173940:function:ACS-VerificationSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-1:568282634449:function:ACS-VerificationSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-1:477331159723:function:ACS-VerificationSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-2:454466003867:function:ACS-VerificationSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-south-1:565803892007:function:ACS-VerificationSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-central-1:203001061592:function:ACS-VerificationSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-2:845288260483:function:ACS-VerificationSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-2:487402164563:function:ACS-VerificationSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-1:377565633583:function:ACS-VerificationSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:ca-central-1:918755190332:function:ACS-VerificationSemanticSegmentation</code> </p> </li> </ul> <p> <b>Bounding Box Adjustment</b> - Finds the most similar boxes from different workers based on the Jaccard index of the adjusted annotations.</p> <ul> <li> <p> <code>arn:aws:lambda:us-east-1:432418664414:function:ACS-AdjustmentBoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-east-2:266458841044:function:ACS-AdjustmentBoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-west-2:081040173940:function:ACS-AdjustmentBoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-1:568282634449:function:ACS-AdjustmentBoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-1:477331159723:function:ACS-AdjustmentBoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-2:454466003867:function:ACS-AdjustmentBoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-south-1:565803892007:function:ACS-AdjustmentBoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-central-1:203001061592:function:ACS-AdjustmentBoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-2:845288260483:function:ACS-AdjustmentBoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-2:487402164563:function:ACS-AdjustmentBoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-1:377565633583:function:ACS-AdjustmentBoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:ca-central-1:918755190332:function:ACS-AdjustmentBoundingBox</code> </p> </li> </ul> <p> <b>Bounding Box Verification</b> - Uses a variant of the Expectation Maximization approach to estimate the true class of verification judgement for bounding box labels based on annotations from individual workers.</p> <ul> <li> <p> <code>arn:aws:lambda:us-east-1:432418664414:function:ACS-VerificationBoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-east-2:266458841044:function:ACS-VerificationBoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-west-2:081040173940:function:ACS-VerificationBoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-1:568282634449:function:ACS-VerificationBoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-1:477331159723:function:ACS-VerificationBoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-2:454466003867:function:ACS-VerificationBoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-south-1:565803892007:function:ACS-VerificationBoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-central-1:203001061592:function:ACS-VerificationBoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-2:845288260483:function:ACS-VerificationBoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-2:487402164563:function:ACS-VerificationBoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-1:377565633583:function:ACS-VerificationBoundingBox</code> </p> </li> <li> <p> <code>arn:aws:lambda:ca-central-1:918755190332:function:ACS-VerificationBoundingBox</code> </p> </li> </ul> <p> <b>Video Frame Object Detection Adjustment</b> - Use this task type when you want workers to adjust bounding boxes that workers have added to video frames to classify and localize objects in a sequence of video frames.</p> <ul> <li> <p> <code>arn:aws:lambda:us-east-1:432418664414:function:ACS-AdjustmentVideoObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-east-2:266458841044:function:ACS-AdjustmentVideoObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-west-2:081040173940:function:ACS-AdjustmentVideoObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-1:568282634449:function:ACS-AdjustmentVideoObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-1:477331159723:function:ACS-AdjustmentVideoObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-2:454466003867:function:ACS-AdjustmentVideoObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-south-1:565803892007:function:ACS-AdjustmentVideoObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-central-1:203001061592:function:ACS-AdjustmentVideoObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-2:845288260483:function:ACS-AdjustmentVideoObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-2:487402164563:function:ACS-AdjustmentVideoObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-1:377565633583:function:ACS-AdjustmentVideoObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:ca-central-1:918755190332:function:ACS-AdjustmentVideoObjectDetection</code> </p> </li> </ul> <p> <b>Video Frame Object Tracking Adjustment</b> - Use this task type when you want workers to adjust bounding boxes that workers have added to video frames to track object movement across a sequence of video frames.</p> <ul> <li> <p> <code>arn:aws:lambda:us-east-1:432418664414:function:ACS-AdjustmentVideoObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-east-2:266458841044:function:ACS-AdjustmentVideoObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-west-2:081040173940:function:ACS-AdjustmentVideoObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-1:568282634449:function:ACS-AdjustmentVideoObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-1:477331159723:function:ACS-AdjustmentVideoObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-2:454466003867:function:ACS-AdjustmentVideoObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-south-1:565803892007:function:ACS-AdjustmentVideoObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-central-1:203001061592:function:ACS-AdjustmentVideoObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-2:845288260483:function:ACS-AdjustmentVideoObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-2:487402164563:function:ACS-AdjustmentVideoObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-1:377565633583:function:ACS-AdjustmentVideoObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:ca-central-1:918755190332:function:ACS-AdjustmentVideoObjectTracking</code> </p> </li> </ul> <p> <b>3D Point Cloud Object Detection Adjustment</b> - Use this task type when you want workers to adjust 3D cuboids around objects in a 3D point cloud. </p> <ul> <li> <p> <code>arn:aws:lambda:us-east-1:432418664414:function:ACS-Adjustment3DPointCloudObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-east-2:266458841044:function:ACS-Adjustment3DPointCloudObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-west-2:081040173940:function:ACS-Adjustment3DPointCloudObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-1:568282634449:function:ACS-Adjustment3DPointCloudObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-1:477331159723:function:ACS-Adjustment3DPointCloudObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-2:454466003867:function:ACS-Adjustment3DPointCloudObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-south-1:565803892007:function:ACS-Adjustment3DPointCloudObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-central-1:203001061592:function:ACS-Adjustment3DPointCloudObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-2:845288260483:function:ACS-Adjustment3DPointCloudObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-2:487402164563:function:ACS-Adjustment3DPointCloudObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-1:377565633583:function:ACS-Adjustment3DPointCloudObjectDetection</code> </p> </li> <li> <p> <code>arn:aws:lambda:ca-central-1:918755190332:function:ACS-Adjustment3DPointCloudObjectDetection</code> </p> </li> </ul> <p> <b>3D Point Cloud Object Tracking Adjustment</b> - Use this task type when you want workers to adjust 3D cuboids around objects that appear in a sequence of 3D point cloud frames.</p> <ul> <li> <p> <code>arn:aws:lambda:us-east-1:432418664414:function:ACS-Adjustment3DPointCloudObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-east-2:266458841044:function:ACS-Adjustment3DPointCloudObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-west-2:081040173940:function:ACS-Adjustment3DPointCloudObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-1:568282634449:function:ACS-Adjustment3DPointCloudObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-1:477331159723:function:ACS-Adjustment3DPointCloudObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-2:454466003867:function:ACS-Adjustment3DPointCloudObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-south-1:565803892007:function:ACS-Adjustment3DPointCloudObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-central-1:203001061592:function:ACS-Adjustment3DPointCloudObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-2:845288260483:function:ACS-Adjustment3DPointCloudObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-2:487402164563:function:ACS-Adjustment3DPointCloudObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-1:377565633583:function:ACS-Adjustment3DPointCloudObjectTracking</code> </p> </li> <li> <p> <code>arn:aws:lambda:ca-central-1:918755190332:function:ACS-Adjustment3DPointCloudObjectTracking</code> </p> </li> </ul> <p> <b>3D Point Cloud Semantic Segmentation Adjustment</b> - Use this task type when you want workers to adjust a point-level semantic segmentation masks using a paint tool.</p> <ul> <li> <p> <code>arn:aws:lambda:us-east-1:432418664414:function:ACS-3DPointCloudSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-east-1:432418664414:function:ACS-Adjustment3DPointCloudSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-east-2:266458841044:function:ACS-Adjustment3DPointCloudSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-west-2:081040173940:function:ACS-Adjustment3DPointCloudSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-1:568282634449:function:ACS-Adjustment3DPointCloudSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-1:477331159723:function:ACS-Adjustment3DPointCloudSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-2:454466003867:function:ACS-Adjustment3DPointCloudSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-south-1:565803892007:function:ACS-Adjustment3DPointCloudSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-central-1:203001061592:function:ACS-Adjustment3DPointCloudSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-2:845288260483:function:ACS-Adjustment3DPointCloudSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-2:487402164563:function:ACS-Adjustment3DPointCloudSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-1:377565633583:function:ACS-Adjustment3DPointCloudSemanticSegmentation</code> </p> </li> <li> <p> <code>arn:aws:lambda:ca-central-1:918755190332:function:ACS-Adjustment3DPointCloudSemanticSegmentation</code> </p> </li> </ul> <p> <b>Generative AI/Custom</b> - Direct passthrough of output data without any transformation.</p> <ul> <li> <p> <code>arn:aws:lambda:us-east-1:432418664414:function:ACS-PassThrough</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-east-2:266458841044:function:ACS-PassThrough</code> </p> </li> <li> <p> <code>arn:aws:lambda:us-west-2:081040173940:function:ACS-PassThrough</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-1:568282634449:function:ACS-PassThrough</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-1:477331159723:function:ACS-PassThrough</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-2:454466003867:function:ACS-PassThrough</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-south-1:565803892007:function:ACS-PassThrough</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-central-1:203001061592:function:ACS-PassThrough</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-northeast-2:845288260483:function:ACS-PassThrough</code> </p> </li> <li> <p> <code>arn:aws:lambda:eu-west-2:487402164563:function:ACS-PassThrough</code> </p> </li> <li> <p> <code>arn:aws:lambda:ap-southeast-1:377565633583:function:ACS-PassThrough</code> </p> </li> <li> <p> <code>arn:aws:lambda:ca-central-1:918755190332:function:ACS-PassThrough</code> </p> </li> </ul>
     * @public
     */
    AnnotationConsolidationLambdaArn: string | undefined;
}
/**
 * <p>Specifies the ARN's of a SageMaker AI image and SageMaker AI image version, and the instance type that the version runs on.</p> <note> <p>When both <code>SageMakerImageVersionArn</code> and <code>SageMakerImageArn</code> are passed, <code>SageMakerImageVersionArn</code> is used. Any updates to <code>SageMakerImageArn</code> will not take effect if <code>SageMakerImageVersionArn</code> already exists in the <code>ResourceSpec</code> because <code>SageMakerImageVersionArn</code> always takes precedence. To clear the value set for <code>SageMakerImageVersionArn</code>, pass <code>None</code> as the value.</p> </note>
 * @public
 */
export interface ResourceSpec {
    /**
     * <p>The ARN of the SageMaker AI image that the image version belongs to.</p>
     * @public
     */
    SageMakerImageArn?: string | undefined;
    /**
     * <p>The ARN of the image version created on the instance. To clear the value set for <code>SageMakerImageVersionArn</code>, pass <code>None</code> as the value.</p>
     * @public
     */
    SageMakerImageVersionArn?: string | undefined;
    /**
     * <p>The SageMakerImageVersionAlias of the image to launch with. This value is in SemVer 2.0.0 versioning format.</p>
     * @public
     */
    SageMakerImageVersionAlias?: string | undefined;
    /**
     * <p>The instance type that the image version runs on.</p> <note> <p> <b>JupyterServer apps</b> only support the <code>system</code> value.</p> <p>For <b>KernelGateway apps</b>, the <code>system</code> value is translated to <code>ml.t3.medium</code>. KernelGateway apps also support all other values for available instance types.</p> </note>
     * @public
     */
    InstanceType?: AppInstanceType | undefined;
    /**
     * <p> The Amazon Resource Name (ARN) of the Lifecycle Configuration attached to the Resource.</p>
     * @public
     */
    LifecycleConfigArn?: string | undefined;
}
/**
 * <p>Details about an Amazon SageMaker AI app.</p>
 * @public
 */
export interface AppDetails {
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
     * <p>The name of the space.</p>
     * @public
     */
    SpaceName?: string | undefined;
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
     * <p>The status.</p>
     * @public
     */
    Status?: AppStatus | undefined;
    /**
     * <p>The creation time.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>Specifies the ARN's of a SageMaker AI image and SageMaker AI image version, and the instance type that the version runs on.</p> <note> <p>When both <code>SageMakerImageVersionArn</code> and <code>SageMakerImageArn</code> are passed, <code>SageMakerImageVersionArn</code> is used. Any updates to <code>SageMakerImageArn</code> will not take effect if <code>SageMakerImageVersionArn</code> already exists in the <code>ResourceSpec</code> because <code>SageMakerImageVersionArn</code> always takes precedence. To clear the value set for <code>SageMakerImageVersionArn</code>, pass <code>None</code> as the value.</p> </note>
     * @public
     */
    ResourceSpec?: ResourceSpec | undefined;
}
/**
 * <p>The configuration used to run the application image container.</p>
 * @public
 */
export interface ContainerConfig {
    /**
     * <p>The arguments for the container when you're running the application.</p>
     * @public
     */
    ContainerArguments?: string[] | undefined;
    /**
     * <p>The entrypoint used to run the application in the container.</p>
     * @public
     */
    ContainerEntrypoint?: string[] | undefined;
    /**
     * <p>The environment variables to set in the container</p>
     * @public
     */
    ContainerEnvironmentVariables?: Record<string, string> | undefined;
}
/**
 * <p>The Amazon Elastic File System storage configuration for a SageMaker AI image.</p>
 * @public
 */
export interface FileSystemConfig {
    /**
     * <p>The path within the image to mount the user's EFS home directory. The directory should be empty. If not specified, defaults to <i>/home/sagemaker-user</i>.</p>
     * @public
     */
    MountPath?: string | undefined;
    /**
     * <p>The default POSIX user ID (UID). If not specified, defaults to <code>1000</code>.</p>
     * @public
     */
    DefaultUid?: number | undefined;
    /**
     * <p>The default POSIX group ID (GID). If not specified, defaults to <code>100</code>.</p>
     * @public
     */
    DefaultGid?: number | undefined;
}
/**
 * <p>The configuration for the file system and kernels in a SageMaker image running as a Code Editor app. The <code>FileSystemConfig</code> object is not supported.</p>
 * @public
 */
export interface CodeEditorAppImageConfig {
    /**
     * <p>The Amazon Elastic File System storage configuration for a SageMaker AI image.</p>
     * @public
     */
    FileSystemConfig?: FileSystemConfig | undefined;
    /**
     * <p>The configuration used to run the application image container.</p>
     * @public
     */
    ContainerConfig?: ContainerConfig | undefined;
}
/**
 * <p>The configuration for the file system and kernels in a SageMaker AI image running as a JupyterLab app. The <code>FileSystemConfig</code> object is not supported.</p>
 * @public
 */
export interface JupyterLabAppImageConfig {
    /**
     * <p>The Amazon Elastic File System storage configuration for a SageMaker AI image.</p>
     * @public
     */
    FileSystemConfig?: FileSystemConfig | undefined;
    /**
     * <p>The configuration used to run the application image container.</p>
     * @public
     */
    ContainerConfig?: ContainerConfig | undefined;
}
/**
 * <p>The specification of a Jupyter kernel.</p>
 * @public
 */
export interface KernelSpec {
    /**
     * <p>The name of the Jupyter kernel in the image. This value is case sensitive.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>The display name of the kernel.</p>
     * @public
     */
    DisplayName?: string | undefined;
}
/**
 * <p>The configuration for the file system and kernels in a SageMaker AI image running as a KernelGateway app.</p>
 * @public
 */
export interface KernelGatewayImageConfig {
    /**
     * <p>The specification of the Jupyter kernels in the image.</p>
     * @public
     */
    KernelSpecs: KernelSpec[] | undefined;
    /**
     * <p>The Amazon Elastic File System storage configuration for a SageMaker AI image.</p>
     * @public
     */
    FileSystemConfig?: FileSystemConfig | undefined;
}
/**
 * <p>The configuration for running a SageMaker AI image as a KernelGateway app.</p>
 * @public
 */
export interface AppImageConfigDetails {
    /**
     * <p>The ARN of the AppImageConfig.</p>
     * @public
     */
    AppImageConfigArn?: string | undefined;
    /**
     * <p>The name of the AppImageConfig. Must be unique to your account.</p>
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
     * <p>The configuration for the file system and kernels in the SageMaker AI image.</p>
     * @public
     */
    KernelGatewayImageConfig?: KernelGatewayImageConfig | undefined;
    /**
     * <p>The configuration for the file system and the runtime, such as the environment variables and entry point.</p>
     * @public
     */
    JupyterLabAppImageConfig?: JupyterLabAppImageConfig | undefined;
    /**
     * <p>The configuration for the file system and the runtime, such as the environment variables and entry point.</p>
     * @public
     */
    CodeEditorAppImageConfig?: CodeEditorAppImageConfig | undefined;
}
/**
 * <p>Settings related to idle shutdown of Studio applications.</p>
 * @public
 */
export interface IdleSettings {
    /**
     * <p>Indicates whether idle shutdown is activated for the application type.</p>
     * @public
     */
    LifecycleManagement?: LifecycleManagement | undefined;
    /**
     * <p>The time that SageMaker waits after the application becomes idle before shutting it down.</p>
     * @public
     */
    IdleTimeoutInMinutes?: number | undefined;
    /**
     * <p>The minimum value in minutes that custom idle shutdown can be set to by the user.</p>
     * @public
     */
    MinIdleTimeoutInMinutes?: number | undefined;
    /**
     * <p>The maximum value in minutes that custom idle shutdown can be set to by the user.</p>
     * @public
     */
    MaxIdleTimeoutInMinutes?: number | undefined;
}
/**
 * <p>Settings that are used to configure and manage the lifecycle of Amazon SageMaker Studio applications.</p>
 * @public
 */
export interface AppLifecycleManagement {
    /**
     * <p>Settings related to idle shutdown of Studio applications.</p>
     * @public
     */
    IdleSettings?: IdleSettings | undefined;
}
/**
 * <p>Configuration to run a processing job in a specified container image.</p>
 * @public
 */
export interface AppSpecification {
    /**
     * <p>The container image to be run by the processing job.</p>
     * @public
     */
    ImageUri: string | undefined;
    /**
     * <p>The entrypoint for a container used to run a processing job.</p>
     * @public
     */
    ContainerEntrypoint?: string[] | undefined;
    /**
     * <p>The arguments for a container used to run a processing job.</p>
     * @public
     */
    ContainerArguments?: string[] | undefined;
}
/**
 * <p>The ID and ID type of an artifact source.</p>
 * @public
 */
export interface ArtifactSourceType {
    /**
     * <p>The type of ID.</p>
     * @public
     */
    SourceIdType: ArtifactSourceIdType | undefined;
    /**
     * <p>The ID.</p>
     * @public
     */
    Value: string | undefined;
}
/**
 * <p>A structure describing the source of an artifact.</p>
 * @public
 */
export interface ArtifactSource {
    /**
     * <p>The URI of the source.</p>
     * @public
     */
    SourceUri: string | undefined;
    /**
     * <p>A list of source types.</p>
     * @public
     */
    SourceTypes?: ArtifactSourceType[] | undefined;
}
/**
 * <p>Lists a summary of the properties of an artifact. An artifact represents a URI addressable object or data. Some examples are a dataset and a model.</p>
 * @public
 */
export interface ArtifactSummary {
    /**
     * <p>The Amazon Resource Name (ARN) of the artifact.</p>
     * @public
     */
    ArtifactArn?: string | undefined;
    /**
     * <p>The name of the artifact.</p>
     * @public
     */
    ArtifactName?: string | undefined;
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
     * <p>When the artifact was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>When the artifact was last modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
}
/**
 * @public
 */
export interface AssociateTrialComponentRequest {
    /**
     * <p>The name of the component to associated with the trial.</p>
     * @public
     */
    TrialComponentName: string | undefined;
    /**
     * <p>The name of the trial to associate with.</p>
     * @public
     */
    TrialName: string | undefined;
}
/**
 * @public
 */
export interface AssociateTrialComponentResponse {
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
 * <p> The data type used to describe the relationship between different sources. </p>
 * @public
 */
export interface AssociationInfo {
    /**
     * <p> The Amazon Resource Name (ARN) of the <code>AssociationInfo</code> source. </p>
     * @public
     */
    SourceArn: string | undefined;
    /**
     * <p> The Amazon Resource Name (ARN) of the <code>AssociationInfo</code> destination. </p>
     * @public
     */
    DestinationArn: string | undefined;
}
/**
 * <p>The IAM Identity details associated with the user. These details are associated with model package groups, model packages and project entities only.</p>
 * @public
 */
export interface IamIdentity {
    /**
     * <p>The Amazon Resource Name (ARN) of the IAM identity.</p>
     * @public
     */
    Arn?: string | undefined;
    /**
     * <p>The ID of the principal that assumes the IAM identity.</p>
     * @public
     */
    PrincipalId?: string | undefined;
    /**
     * <p>The person or application which assumes the IAM identity.</p>
     * @public
     */
    SourceIdentity?: string | undefined;
}
/**
 * <p>Information about the user who created or modified a SageMaker resource.</p>
 * @public
 */
export interface UserContext {
    /**
     * <p>The Amazon Resource Name (ARN) of the user's profile.</p>
     * @public
     */
    UserProfileArn?: string | undefined;
    /**
     * <p>The name of the user's profile.</p>
     * @public
     */
    UserProfileName?: string | undefined;
    /**
     * <p>The domain associated with the user.</p>
     * @public
     */
    DomainId?: string | undefined;
    /**
     * <p>The IAM Identity details associated with the user. These details are associated with model package groups, model packages, and project entities only.</p>
     * @public
     */
    IamIdentity?: IamIdentity | undefined;
}
/**
 * <p>Lists a summary of the properties of an association. An association is an entity that links other lineage or experiment entities. An example would be an association between a training job and a model.</p>
 * @public
 */
export interface AssociationSummary {
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
    /**
     * <p>The source type.</p>
     * @public
     */
    SourceType?: string | undefined;
    /**
     * <p>The destination type.</p>
     * @public
     */
    DestinationType?: string | undefined;
    /**
     * <p>The type of the association.</p>
     * @public
     */
    AssociationType?: AssociationEdgeType | undefined;
    /**
     * <p>The name of the source.</p>
     * @public
     */
    SourceName?: string | undefined;
    /**
     * <p>The name of the destination.</p>
     * @public
     */
    DestinationName?: string | undefined;
    /**
     * <p>When the association was created.</p>
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
 * <p>Configures the behavior of the client used by SageMaker to interact with the model container during asynchronous inference.</p>
 * @public
 */
export interface AsyncInferenceClientConfig {
    /**
     * <p>The maximum number of concurrent requests sent by the SageMaker client to the model container. If no value is provided, SageMaker chooses an optimal value.</p>
     * @public
     */
    MaxConcurrentInvocationsPerInstance?: number | undefined;
}
/**
 * <p>Specifies the configuration for notifications of inference results for asynchronous inference.</p>
 * @public
 */
export interface AsyncInferenceNotificationConfig {
    /**
     * <p>Amazon SNS topic to post a notification to when inference completes successfully. If no topic is provided, no notification is sent on success.</p>
     * @public
     */
    SuccessTopic?: string | undefined;
    /**
     * <p>Amazon SNS topic to post a notification to when inference fails. If no topic is provided, no notification is sent on failure.</p>
     * @public
     */
    ErrorTopic?: string | undefined;
    /**
     * <p>The Amazon SNS topics where you want the inference response to be included.</p> <note> <p>The inference response is included only if the response size is less than or equal to 128 KB.</p> </note>
     * @public
     */
    IncludeInferenceResponseIn?: AsyncNotificationTopicTypes[] | undefined;
}
/**
 * <p>Specifies the configuration for asynchronous inference invocation outputs.</p>
 * @public
 */
export interface AsyncInferenceOutputConfig {
    /**
     * <p>The Amazon Web Services Key Management Service (Amazon Web Services KMS) key that SageMaker uses to encrypt the asynchronous inference output in Amazon S3.</p> <p/>
     * @public
     */
    KmsKeyId?: string | undefined;
    /**
     * <p>The Amazon S3 location to upload inference responses to.</p>
     * @public
     */
    S3OutputPath?: string | undefined;
    /**
     * <p>Specifies the configuration for notifications of inference results for asynchronous inference.</p>
     * @public
     */
    NotificationConfig?: AsyncInferenceNotificationConfig | undefined;
    /**
     * <p>The Amazon S3 location to upload failure inference responses to.</p>
     * @public
     */
    S3FailurePath?: string | undefined;
}
/**
 * <p>Specifies configuration for how an endpoint performs asynchronous inference.</p>
 * @public
 */
export interface AsyncInferenceConfig {
    /**
     * <p>Configures the behavior of the client used by SageMaker to interact with the model container during asynchronous inference.</p>
     * @public
     */
    ClientConfig?: AsyncInferenceClientConfig | undefined;
    /**
     * <p>Specifies the configuration for asynchronous inference invocation outputs.</p>
     * @public
     */
    OutputConfig: AsyncInferenceOutputConfig | undefined;
}
/**
 * <p>Configuration for Athena Dataset Definition input.</p>
 * @public
 */
export interface AthenaDatasetDefinition {
    /**
     * <p>The name of the data catalog used in Athena query execution.</p>
     * @public
     */
    Catalog: string | undefined;
    /**
     * <p>The name of the database used in the Athena query execution.</p>
     * @public
     */
    Database: string | undefined;
    /**
     * <p>The SQL query statements, to be executed.</p>
     * @public
     */
    QueryString: string | undefined;
    /**
     * <p>The name of the workgroup in which the Athena query is being started.</p>
     * @public
     */
    WorkGroup?: string | undefined;
    /**
     * <p>The location in Amazon S3 where Athena query results are stored.</p>
     * @public
     */
    OutputS3Uri: string | undefined;
    /**
     * <p>The Amazon Web Services Key Management Service (Amazon Web Services KMS) key that Amazon SageMaker uses to encrypt data generated from an Athena query execution.</p>
     * @public
     */
    KmsKeyId?: string | undefined;
    /**
     * <p>The data storage format for Athena query results.</p>
     * @public
     */
    OutputFormat: AthenaResultFormat | undefined;
    /**
     * <p>The compression used for Athena query results.</p>
     * @public
     */
    OutputCompression?: AthenaResultCompressionType | undefined;
}
/**
 * @public
 */
export interface AttachClusterNodeVolumeRequest {
    /**
     * <p> The Amazon Resource Name (ARN) of your SageMaker HyperPod cluster containing the target node. Your cluster must use EKS as the orchestration and be in the <code>InService</code> state. </p>
     * @public
     */
    ClusterArn: string | undefined;
    /**
     * <p> The unique identifier of the cluster node to which you want to attach the volume. The node must belong to your specified HyperPod cluster and cannot be part of a Restricted Instance Group (RIG). </p>
     * @public
     */
    NodeId: string | undefined;
    /**
     * <p> The unique identifier of your EBS volume to attach. The volume must be in the <code>available</code> state. </p>
     * @public
     */
    VolumeId: string | undefined;
}
/**
 * @public
 */
export interface AttachClusterNodeVolumeResponse {
    /**
     * <p> The Amazon Resource Name (ARN) of your SageMaker HyperPod cluster where the volume attachment operation was performed. </p>
     * @public
     */
    ClusterArn: string | undefined;
    /**
     * <p> The unique identifier of the cluster node where your volume was attached. </p>
     * @public
     */
    NodeId: string | undefined;
    /**
     * <p> The unique identifier of your EBS volume that was attached. </p>
     * @public
     */
    VolumeId: string | undefined;
    /**
     * <p> The timestamp when the volume attachment operation was initiated by the SageMaker HyperPod service. </p>
     * @public
     */
    AttachTime: Date | undefined;
    /**
     * <p> The current status of your volume attachment operation. </p>
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
 * <p>Contains a presigned URL and its associated local file path for downloading hub content artifacts.</p>
 * @public
 */
export interface AuthorizedUrl {
    /**
     * <p>The presigned S3 URL that provides temporary, secure access to download the file. URLs expire within 15 minutes for security purposes.</p>
     * @public
     */
    Url?: string | undefined;
    /**
     * <p>The recommended local file path where the downloaded file should be stored to maintain proper directory structure and file organization.</p>
     * @public
     */
    LocalPath?: string | undefined;
}
/**
 * <p>The selection of algorithms trained on your dataset to generate the model candidates for an Autopilot job.</p>
 * @public
 */
export interface AutoMLAlgorithmConfig {
    /**
     * <p>The selection of algorithms trained on your dataset to generate the model candidates for an Autopilot job.</p> <ul> <li> <p> <b>For the tabular problem type <code>TabularJobConfig</code>:</b> </p> <note> <p>Selected algorithms must belong to the list corresponding to the training mode set in <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_AutoMLJobConfig.html#sagemaker-Type-AutoMLJobConfig-Mode">AutoMLJobConfig.Mode</a> (<code>ENSEMBLING</code> or <code>HYPERPARAMETER_TUNING</code>). Choose a minimum of 1 algorithm.</p> </note> <ul> <li> <p>In <code>ENSEMBLING</code> mode:</p> <ul> <li> <p>"catboost"</p> </li> <li> <p>"extra-trees"</p> </li> <li> <p>"fastai"</p> </li> <li> <p>"lightgbm"</p> </li> <li> <p>"linear-learner"</p> </li> <li> <p>"nn-torch"</p> </li> <li> <p>"randomforest"</p> </li> <li> <p>"xgboost"</p> </li> </ul> </li> <li> <p>In <code>HYPERPARAMETER_TUNING</code> mode:</p> <ul> <li> <p>"linear-learner"</p> </li> <li> <p>"mlp"</p> </li> <li> <p>"xgboost"</p> </li> </ul> </li> </ul> </li> <li> <p> <b>For the time-series forecasting problem type <code>TimeSeriesForecastingJobConfig</code>:</b> </p> <ul> <li> <p>Choose your algorithms from this list.</p> <ul> <li> <p>"cnn-qr"</p> </li> <li> <p>"deepar"</p> </li> <li> <p>"prophet"</p> </li> <li> <p>"arima"</p> </li> <li> <p>"npts"</p> </li> <li> <p>"ets"</p> </li> </ul> </li> </ul> </li> </ul>
     * @public
     */
    AutoMLAlgorithms: AutoMLAlgorithm[] | undefined;
}
/**
 * <p>The location of artifacts for an AutoML candidate job.</p>
 * @public
 */
export interface CandidateArtifactLocations {
    /**
     * <p>The Amazon S3 prefix to the explainability artifacts generated for the AutoML candidate.</p>
     * @public
     */
    Explainability: string | undefined;
    /**
     * <p>The Amazon S3 prefix to the model insight artifacts generated for the AutoML candidate.</p>
     * @public
     */
    ModelInsights?: string | undefined;
    /**
     * <p>The Amazon S3 prefix to the accuracy metrics and the inference results observed over the testing window. Available only for the time-series forecasting problem type.</p>
     * @public
     */
    BacktestResults?: string | undefined;
}
/**
 * <p>Information about the metric for a candidate produced by an AutoML job.</p>
 * @public
 */
export interface MetricDatum {
    /**
     * <p>The name of the metric.</p>
     * @public
     */
    MetricName?: AutoMLMetricEnum | undefined;
    /**
     * <p>The name of the standard metric. </p> <note> <p>For definitions of the standard metrics, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-model-support-validation.html#autopilot-metrics"> <code>Autopilot candidate metrics</code> </a>.</p> </note>
     * @public
     */
    StandardMetricName?: AutoMLMetricExtendedEnum | undefined;
    /**
     * <p>The value of the metric.</p>
     * @public
     */
    Value?: number | undefined;
    /**
     * <p>The dataset split from which the AutoML job produced the metric.</p>
     * @public
     */
    Set?: MetricSetSource | undefined;
}
/**
 * <p>The properties of an AutoML candidate job.</p>
 * @public
 */
export interface CandidateProperties {
    /**
     * <p>The Amazon S3 prefix to the artifacts generated for an AutoML candidate.</p>
     * @public
     */
    CandidateArtifactLocations?: CandidateArtifactLocations | undefined;
    /**
     * <p>Information about the candidate metrics for an AutoML job.</p>
     * @public
     */
    CandidateMetrics?: MetricDatum[] | undefined;
}
/**
 * <p>Information about the steps for a candidate and what step it is working on.</p>
 * @public
 */
export interface AutoMLCandidateStep {
    /**
     * <p>Whether the candidate is at the transform, training, or processing step.</p>
     * @public
     */
    CandidateStepType: CandidateStepType | undefined;
    /**
     * <p>The ARN for the candidate's step.</p>
     * @public
     */
    CandidateStepArn: string | undefined;
    /**
     * <p>The name for the candidate's step.</p>
     * @public
     */
    CandidateStepName: string | undefined;
}
/**
 * <p>The best candidate result from an AutoML training job.</p>
 * @public
 */
export interface FinalAutoMLJobObjectiveMetric {
    /**
     * <p>The type of metric with the best result.</p>
     * @public
     */
    Type?: AutoMLJobObjectiveType | undefined;
    /**
     * <p>The name of the metric with the best result. For a description of the possible objective metrics, see <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_AutoMLJobObjective.html">AutoMLJobObjective$MetricName</a>.</p>
     * @public
     */
    MetricName: AutoMLMetricEnum | undefined;
    /**
     * <p>The value of the metric with the best result.</p>
     * @public
     */
    Value: number | undefined;
    /**
     * <p>The name of the standard metric. For a description of the standard metrics, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-metrics-validation.html#autopilot-metrics">Autopilot candidate metrics</a>.</p>
     * @public
     */
    StandardMetricName?: AutoMLMetricEnum | undefined;
}
/**
 * <p>A list of container definitions that describe the different containers that make up an AutoML candidate. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_ContainerDefinition.html"> ContainerDefinition</a>.</p>
 * @public
 */
export interface AutoMLContainerDefinition {
    /**
     * <p>The Amazon Elastic Container Registry (Amazon ECR) path of the container. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_ContainerDefinition.html"> ContainerDefinition</a>.</p>
     * @public
     */
    Image: string | undefined;
    /**
     * <p>The location of the model artifacts. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_ContainerDefinition.html"> ContainerDefinition</a>.</p>
     * @public
     */
    ModelDataUrl: string | undefined;
    /**
     * <p>The environment variables to set in the container. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_ContainerDefinition.html"> ContainerDefinition</a>.</p>
     * @public
     */
    Environment?: Record<string, string> | undefined;
}
/**
 * <p>Information about a candidate produced by an AutoML training job, including its status, steps, and other properties.</p>
 * @public
 */
export interface AutoMLCandidate {
    /**
     * <p>The name of the candidate.</p>
     * @public
     */
    CandidateName: string | undefined;
    /**
     * <p>The best candidate result from an AutoML training job.</p>
     * @public
     */
    FinalAutoMLJobObjectiveMetric?: FinalAutoMLJobObjectiveMetric | undefined;
    /**
     * <p>The objective's status.</p>
     * @public
     */
    ObjectiveStatus: ObjectiveStatus | undefined;
    /**
     * <p>Information about the candidate's steps.</p>
     * @public
     */
    CandidateSteps: AutoMLCandidateStep[] | undefined;
    /**
     * <p>The candidate's status.</p>
     * @public
     */
    CandidateStatus: CandidateStatus | undefined;
    /**
     * <p>Information about the recommended inference container definitions.</p>
     * @public
     */
    InferenceContainers?: AutoMLContainerDefinition[] | undefined;
    /**
     * <p>The creation time.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The end time.</p>
     * @public
     */
    EndTime?: Date | undefined;
    /**
     * <p>The last modified time.</p>
     * @public
     */
    LastModifiedTime: Date | undefined;
    /**
     * <p>The failure reason.</p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>The properties of an AutoML candidate job.</p>
     * @public
     */
    CandidateProperties?: CandidateProperties | undefined;
    /**
     * <p>The mapping of all supported processing unit (CPU, GPU, etc...) to inference container definitions for the candidate. This field is populated for the AutoML jobs V2 (for example, for jobs created by calling <code>CreateAutoMLJobV2</code>) related to image or text classification problem types only.</p>
     * @public
     */
    InferenceContainerDefinitions?: Partial<Record<AutoMLProcessingUnit, AutoMLContainerDefinition[]>> | undefined;
}
/**
 * <p>Stores the configuration information for how a candidate is generated (optional).</p>
 * @public
 */
export interface AutoMLCandidateGenerationConfig {
    /**
     * <p>A URL to the Amazon S3 data source containing selected features from the input data source to run an Autopilot job. You can input <code>FeatureAttributeNames</code> (optional) in JSON format as shown below: </p> <p> <code>\{ "FeatureAttributeNames":["col1", "col2", ...] \}</code>.</p> <p>You can also specify the data type of the feature (optional) in the format shown below:</p> <p> <code>\{ "FeatureDataTypes":\{"col1":"numeric", "col2":"categorical" ... \} \}</code> </p> <note> <p>These column keys may not include the target column.</p> </note> <p>In ensembling mode, Autopilot only supports the following data types: <code>numeric</code>, <code>categorical</code>, <code>text</code>, and <code>datetime</code>. In HPO mode, Autopilot can support <code>numeric</code>, <code>categorical</code>, <code>text</code>, <code>datetime</code>, and <code>sequence</code>.</p> <p>If only <code>FeatureDataTypes</code> is provided, the column keys (<code>col1</code>, <code>col2</code>,..) should be a subset of the column names in the input data. </p> <p>If both <code>FeatureDataTypes</code> and <code>FeatureAttributeNames</code> are provided, then the column keys should be a subset of the column names provided in <code>FeatureAttributeNames</code>. </p> <p>The key name <code>FeatureAttributeNames</code> is fixed. The values listed in <code>["col1", "col2", ...]</code> are case sensitive and should be a list of strings containing unique values that are a subset of the column names in the input data. The list of columns provided must not include the target column.</p>
     * @public
     */
    FeatureSpecificationS3Uri?: string | undefined;
    /**
     * <p>Stores the configuration information for the selection of algorithms trained on tabular data.</p> <p>The list of available algorithms to choose from depends on the training mode set in <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_TabularJobConfig.html"> <code>TabularJobConfig.Mode</code> </a>.</p> <ul> <li> <p> <code>AlgorithmsConfig</code> should not be set if the training mode is set on <code>AUTO</code>.</p> </li> <li> <p>When <code>AlgorithmsConfig</code> is provided, one <code>AutoMLAlgorithms</code> attribute must be set and one only.</p> <p>If the list of algorithms provided as values for <code>AutoMLAlgorithms</code> is empty, <code>CandidateGenerationConfig</code> uses the full set of algorithms for the given training mode.</p> </li> <li> <p>When <code>AlgorithmsConfig</code> is not provided, <code>CandidateGenerationConfig</code> uses the full set of algorithms for the given training mode.</p> </li> </ul> <p>For the list of all algorithms per problem type and training mode, see <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_AutoMLAlgorithmConfig.html"> AutoMLAlgorithmConfig</a>.</p> <p>For more information on each algorithm, see the <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-model-support-validation.html#autopilot-algorithm-support">Algorithm support</a> section in Autopilot developer guide.</p>
     * @public
     */
    AlgorithmsConfig?: AutoMLAlgorithmConfig[] | undefined;
}
/**
 * <p>Describes the Amazon S3 data source.</p>
 * @public
 */
export interface AutoMLS3DataSource {
    /**
     * <p>The data type. </p> <ul> <li> <p>If you choose <code>S3Prefix</code>, <code>S3Uri</code> identifies a key name prefix. SageMaker AI uses all objects that match the specified key name prefix for model training.</p> <p>The <code>S3Prefix</code> should have the following format:</p> <p> <code>s3://DOC-EXAMPLE-BUCKET/DOC-EXAMPLE-FOLDER-OR-FILE</code> </p> </li> <li> <p>If you choose <code>ManifestFile</code>, <code>S3Uri</code> identifies an object that is a manifest file containing a list of object keys that you want SageMaker AI to use for model training.</p> <p>A <code>ManifestFile</code> should have the format shown below:</p> <p> <code>[ \{"prefix": "s3://DOC-EXAMPLE-BUCKET/DOC-EXAMPLE-FOLDER/DOC-EXAMPLE-PREFIX/"\}, </code> </p> <p> <code>"DOC-EXAMPLE-RELATIVE-PATH/DOC-EXAMPLE-FOLDER/DATA-1",</code> </p> <p> <code>"DOC-EXAMPLE-RELATIVE-PATH/DOC-EXAMPLE-FOLDER/DATA-2",</code> </p> <p> <code>... "DOC-EXAMPLE-RELATIVE-PATH/DOC-EXAMPLE-FOLDER/DATA-N" ]</code> </p> </li> <li> <p>If you choose <code>AugmentedManifestFile</code>, <code>S3Uri</code> identifies an object that is an augmented manifest file in JSON lines format. This file contains the data you want to use for model training. <code>AugmentedManifestFile</code> is available for V2 API jobs only (for example, for jobs created by calling <code>CreateAutoMLJobV2</code>).</p> <p>Here is a minimal, single-record example of an <code>AugmentedManifestFile</code>:</p> <p> <code>\{"source-ref": "s3://DOC-EXAMPLE-BUCKET/DOC-EXAMPLE-FOLDER/cats/cat.jpg",</code> </p> <p> <code>"label-metadata": \{"class-name": "cat"</code> \}</p> <p>For more information on <code>AugmentedManifestFile</code>, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/augmented-manifest.html">Provide Dataset Metadata to Training Jobs with an Augmented Manifest File</a>.</p> </li> </ul>
     * @public
     */
    S3DataType: AutoMLS3DataType | undefined;
    /**
     * <p>The URL to the Amazon S3 data source. The Uri refers to the Amazon S3 prefix or ManifestFile depending on the data type.</p>
     * @public
     */
    S3Uri: string | undefined;
}
/**
 * <p>The data source for the Autopilot job.</p>
 * @public
 */
export interface AutoMLDataSource {
    /**
     * <p>The Amazon S3 location of the input data.</p>
     * @public
     */
    S3DataSource: AutoMLS3DataSource | undefined;
}
/**
 * <p>A channel is a named input source that training algorithms can consume. The validation dataset size is limited to less than 2 GB. The training dataset size must be less than 100 GB. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_Channel.html"> Channel</a>.</p> <note> <p>A validation dataset must contain the same headers as the training dataset.</p> </note> <p/>
 * @public
 */
export interface AutoMLChannel {
    /**
     * <p>The data source for an AutoML channel.</p>
     * @public
     */
    DataSource?: AutoMLDataSource | undefined;
    /**
     * <p>You can use <code>Gzip</code> or <code>None</code>. The default value is <code>None</code>.</p>
     * @public
     */
    CompressionType?: CompressionType | undefined;
    /**
     * <p>The name of the target variable in supervised learning, usually represented by 'y'.</p>
     * @public
     */
    TargetAttributeName: string | undefined;
    /**
     * <p>The content type of the data from the input source. You can use <code>text/csv;header=present</code> or <code>x-application/vnd.amazon+parquet</code>. The default value is <code>text/csv;header=present</code>.</p>
     * @public
     */
    ContentType?: string | undefined;
    /**
     * <p>The channel type (optional) is an <code>enum</code> string. The default value is <code>training</code>. Channels for training and validation must share the same <code>ContentType</code> and <code>TargetAttributeName</code>. For information on specifying training and validation channel types, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-datasets-problem-types.html#autopilot-data-sources-training-or-validation">How to specify training and validation datasets</a>.</p>
     * @public
     */
    ChannelType?: AutoMLChannelType | undefined;
    /**
     * <p>If specified, this column name indicates which column of the dataset should be treated as sample weights for use by the objective metric during the training, evaluation, and the selection of the best model. This column is not considered as a predictive feature. For more information on Autopilot metrics, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-metrics-validation.html">Metrics and validation</a>.</p> <p>Sample weights should be numeric, non-negative, with larger values indicating which rows are more important than others. Data points that have invalid or no weight value are excluded.</p> <p>Support for sample weights is available in <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_AutoMLAlgorithmConfig.html">Ensembling</a> mode only.</p>
     * @public
     */
    SampleWeightAttributeName?: string | undefined;
}
/**
 * <note> <p>This data type is intended for use exclusively by SageMaker Canvas and cannot be used in other contexts at the moment.</p> </note> <p>Specifies the compute configuration for the EMR Serverless job.</p>
 * @public
 */
export interface EmrServerlessComputeConfig {
    /**
     * <p>The ARN of the IAM role granting the AutoML job V2 the necessary permissions access policies to list, connect to, or manage EMR Serverless jobs. For detailed information about the required permissions of this role, see "How to configure AutoML to initiate a remote job on EMR Serverless for large datasets" in <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-automate-model-development-create-experiment.html">Create a regression or classification job for tabular data using the AutoML API</a> or <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-create-experiment-timeseries-forecasting.html#timeseries-forecasting-api-optional-params">Create an AutoML job for time-series forecasting using the API</a>.</p>
     * @public
     */
    ExecutionRoleARN: string | undefined;
}
/**
 * <note> <p>This data type is intended for use exclusively by SageMaker Canvas and cannot be used in other contexts at the moment.</p> </note> <p>Specifies the compute configuration for an AutoML job V2.</p>
 * @public
 */
export interface AutoMLComputeConfig {
    /**
     * <p>The configuration for using <a href="https://docs.aws.amazon.com/emr/latest/EMR-Serverless-UserGuide/emr-serverless.html"> EMR Serverless</a> to run the AutoML job V2.</p> <p>To allow your AutoML job V2 to automatically initiate a remote job on EMR Serverless when additional compute resources are needed to process large datasets, you need to provide an <code>EmrServerlessComputeConfig</code> object, which includes an <code>ExecutionRoleARN</code> attribute, to the <code>AutoMLComputeConfig</code> of the AutoML job V2 input request.</p> <p>By seamlessly transitioning to EMR Serverless when required, the AutoML job can handle datasets that would otherwise exceed the initially provisioned resources, without any manual intervention from you. </p> <p>EMR Serverless is available for the tabular and time series problem types. We recommend setting up this option for tabular datasets larger than 5 GB and time series datasets larger than 30 GB.</p>
     * @public
     */
    EmrServerlessComputeConfig?: EmrServerlessComputeConfig | undefined;
}
/**
 * <p>This structure specifies how to split the data into train and validation datasets.</p> <p>The validation and training datasets must contain the same headers. For jobs created by calling <code>CreateAutoMLJob</code>, the validation dataset must be less than 2 GB in size.</p>
 * @public
 */
export interface AutoMLDataSplitConfig {
    /**
     * <p>The validation fraction (optional) is a float that specifies the portion of the training dataset to be used for validation. The default value is 0.2, and values must be greater than 0 and less than 1. We recommend setting this value to be less than 0.5.</p>
     * @public
     */
    ValidationFraction?: number | undefined;
}
/**
 * <p>The artifacts that are generated during an AutoML job.</p>
 * @public
 */
export interface AutoMLJobArtifacts {
    /**
     * <p>The URL of the notebook location.</p>
     * @public
     */
    CandidateDefinitionNotebookLocation?: string | undefined;
    /**
     * <p>The URL of the notebook location.</p>
     * @public
     */
    DataExplorationNotebookLocation?: string | undefined;
}
/**
 * <p>A channel is a named input source that training algorithms can consume. This channel is used for AutoML jobs V2 (jobs created by calling <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateAutoMLJobV2.html">CreateAutoMLJobV2</a>).</p>
 * @public
 */
export interface AutoMLJobChannel {
    /**
     * <p>The type of channel. Defines whether the data are used for training or validation. The default value is <code>training</code>. Channels for <code>training</code> and <code>validation</code> must share the same <code>ContentType</code> </p> <note> <p>The type of channel defaults to <code>training</code> for the time-series forecasting problem type.</p> </note>
     * @public
     */
    ChannelType?: AutoMLChannelType | undefined;
    /**
     * <p>The content type of the data from the input source. The following are the allowed content types for different problems:</p> <ul> <li> <p>For tabular problem types: <code>text/csv;header=present</code> or <code>x-application/vnd.amazon+parquet</code>. The default value is <code>text/csv;header=present</code>.</p> </li> <li> <p>For image classification: <code>image/png</code>, <code>image/jpeg</code>, or <code>image/*</code>. The default value is <code>image/*</code>.</p> </li> <li> <p>For text classification: <code>text/csv;header=present</code> or <code>x-application/vnd.amazon+parquet</code>. The default value is <code>text/csv;header=present</code>.</p> </li> <li> <p>For time-series forecasting: <code>text/csv;header=present</code> or <code>x-application/vnd.amazon+parquet</code>. The default value is <code>text/csv;header=present</code>.</p> </li> <li> <p>For text generation (LLMs fine-tuning): <code>text/csv;header=present</code> or <code>x-application/vnd.amazon+parquet</code>. The default value is <code>text/csv;header=present</code>.</p> </li> </ul>
     * @public
     */
    ContentType?: string | undefined;
    /**
     * <p>The allowed compression types depend on the input format and problem type. We allow the compression type <code>Gzip</code> for <code>S3Prefix</code> inputs on tabular data only. For all other inputs, the compression type should be <code>None</code>. If no compression type is provided, we default to <code>None</code>.</p>
     * @public
     */
    CompressionType?: CompressionType | undefined;
    /**
     * <p>The data source for an AutoML channel (Required).</p>
     * @public
     */
    DataSource?: AutoMLDataSource | undefined;
}
/**
 * <p>How long a job is allowed to run, or how many candidates a job is allowed to generate.</p>
 * @public
 */
export interface AutoMLJobCompletionCriteria {
    /**
     * <p>The maximum number of times a training job is allowed to run.</p> <p>For text and image classification, time-series forecasting, as well as text generation (LLMs fine-tuning) problem types, the supported value is 1. For tabular problem types, the maximum value is 750.</p>
     * @public
     */
    MaxCandidates?: number | undefined;
    /**
     * <p>The maximum time, in seconds, that each training job executed inside hyperparameter tuning is allowed to run as part of a hyperparameter tuning job. For more information, see the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_StoppingCondition.html">StoppingCondition</a> used by the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateHyperParameterTuningJob.html">CreateHyperParameterTuningJob</a> action.</p> <p>For job V2s (jobs created by calling <code>CreateAutoMLJobV2</code>), this field controls the runtime of the job candidate.</p> <p>For <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_TextClassificationJobConfig.html">TextGenerationJobConfig</a> problem types, the maximum time defaults to 72 hours (259200 seconds).</p>
     * @public
     */
    MaxRuntimePerTrainingJobInSeconds?: number | undefined;
    /**
     * <p>The maximum runtime, in seconds, an AutoML job has to complete.</p> <p>If an AutoML job exceeds the maximum runtime, the job is stopped automatically and its processing is ended gracefully. The AutoML job identifies the best model whose training was completed and marks it as the best-performing model. Any unfinished steps of the job, such as automatic one-click Autopilot model deployment, are not completed.</p>
     * @public
     */
    MaxAutoMLJobRuntimeInSeconds?: number | undefined;
}
/**
 * <p>Specifies an Amazon Virtual Private Cloud (VPC) that your SageMaker jobs, hosted models, and compute resources have access to. You can control access to and from your resources by configuring a VPC. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/infrastructure-give-access.html">Give SageMaker Access to Resources in your Amazon VPC</a>. </p>
 * @public
 */
export interface VpcConfig {
    /**
     * <p>The VPC security group IDs, in the form <code>sg-xxxxxxxx</code>. Specify the security groups for the VPC that is specified in the <code>Subnets</code> field.</p>
     * @public
     */
    SecurityGroupIds: string[] | undefined;
    /**
     * <p>The ID of the subnets in the VPC to which you want to connect your training job or model. For information about the availability of specific instance types, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/instance-types-az.html">Supported Instance Types and Availability Zones</a>.</p>
     * @public
     */
    Subnets: string[] | undefined;
}
/**
 * <p>Security options.</p>
 * @public
 */
export interface AutoMLSecurityConfig {
    /**
     * <p>The key used to encrypt stored data.</p>
     * @public
     */
    VolumeKmsKeyId?: string | undefined;
    /**
     * <p>Whether to use traffic encryption between the container layers.</p>
     * @public
     */
    EnableInterContainerTrafficEncryption?: boolean | undefined;
    /**
     * <p>The VPC configuration.</p>
     * @public
     */
    VpcConfig?: VpcConfig | undefined;
}
/**
 * <p>A collection of settings used for an AutoML job.</p>
 * @public
 */
export interface AutoMLJobConfig {
    /**
     * <p>How long an AutoML job is allowed to run, or how many candidates a job is allowed to generate.</p>
     * @public
     */
    CompletionCriteria?: AutoMLJobCompletionCriteria | undefined;
    /**
     * <p>The security configuration for traffic encryption or Amazon VPC settings.</p>
     * @public
     */
    SecurityConfig?: AutoMLSecurityConfig | undefined;
    /**
     * <p>The configuration for generating a candidate for an AutoML job (optional). </p>
     * @public
     */
    CandidateGenerationConfig?: AutoMLCandidateGenerationConfig | undefined;
    /**
     * <p>The configuration for splitting the input training dataset.</p> <p>Type: AutoMLDataSplitConfig</p>
     * @public
     */
    DataSplitConfig?: AutoMLDataSplitConfig | undefined;
    /**
     * <p>The method that Autopilot uses to train the data. You can either specify the mode manually or let Autopilot choose for you based on the dataset size by selecting <code>AUTO</code>. In <code>AUTO</code> mode, Autopilot chooses <code>ENSEMBLING</code> for datasets smaller than 100 MB, and <code>HYPERPARAMETER_TUNING</code> for larger ones.</p> <p>The <code>ENSEMBLING</code> mode uses a multi-stack ensemble model to predict classification and regression tasks directly from your dataset. This machine learning mode combines several base models to produce an optimal predictive model. It then uses a stacking ensemble method to combine predictions from contributing members. A multi-stack ensemble model can provide better performance over a single model by combining the predictive capabilities of multiple models. See <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-model-support-validation.html#autopilot-algorithm-support">Autopilot algorithm support</a> for a list of algorithms supported by <code>ENSEMBLING</code> mode.</p> <p>The <code>HYPERPARAMETER_TUNING</code> (HPO) mode uses the best hyperparameters to train the best version of a model. HPO automatically selects an algorithm for the type of problem you want to solve. Then HPO finds the best hyperparameters according to your objective metric. See <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-model-support-validation.html#autopilot-algorithm-support">Autopilot algorithm support</a> for a list of algorithms supported by <code>HYPERPARAMETER_TUNING</code> mode.</p>
     * @public
     */
    Mode?: AutoMLMode | undefined;
}
/**
 * <p>Specifies a metric to minimize or maximize as the objective of an AutoML job.</p>
 * @public
 */
export interface AutoMLJobObjective {
    /**
     * <p>The name of the objective metric used to measure the predictive quality of a machine learning system. During training, the model's parameters are updated iteratively to optimize its performance based on the feedback provided by the objective metric when evaluating the model on the validation dataset.</p> <p>The list of available metrics supported by Autopilot and the default metric applied when you do not specify a metric name explicitly depend on the problem type.</p> <ul> <li> <p>For tabular problem types:</p> <ul> <li> <p>List of available metrics: </p> <ul> <li> <p> Regression: <code>MAE</code>, <code>MSE</code>, <code>R2</code>, <code>RMSE</code> </p> </li> <li> <p> Binary classification: <code>Accuracy</code>, <code>AUC</code>, <code>BalancedAccuracy</code>, <code>F1</code>, <code>Precision</code>, <code>Recall</code> </p> </li> <li> <p> Multiclass classification: <code>Accuracy</code>, <code>BalancedAccuracy</code>, <code>F1macro</code>, <code>PrecisionMacro</code>, <code>RecallMacro</code> </p> </li> </ul> <p>For a description of each metric, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-metrics-validation.html#autopilot-metrics">Autopilot metrics for classification and regression</a>.</p> </li> <li> <p>Default objective metrics:</p> <ul> <li> <p>Regression: <code>MSE</code>.</p> </li> <li> <p>Binary classification: <code>F1</code>.</p> </li> <li> <p>Multiclass classification: <code>Accuracy</code>.</p> </li> </ul> </li> </ul> </li> <li> <p>For image or text classification problem types:</p> <ul> <li> <p>List of available metrics: <code>Accuracy</code> </p> <p>For a description of each metric, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/text-classification-data-format-and-metric.html">Autopilot metrics for text and image classification</a>.</p> </li> <li> <p>Default objective metrics: <code>Accuracy</code> </p> </li> </ul> </li> <li> <p>For time-series forecasting problem types:</p> <ul> <li> <p>List of available metrics: <code>RMSE</code>, <code>wQL</code>, <code>Average wQL</code>, <code>MASE</code>, <code>MAPE</code>, <code>WAPE</code> </p> <p>For a description of each metric, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/timeseries-objective-metric.html">Autopilot metrics for time-series forecasting</a>.</p> </li> <li> <p>Default objective metrics: <code>AverageWeightedQuantileLoss</code> </p> </li> </ul> </li> <li> <p>For text generation problem types (LLMs fine-tuning): Fine-tuning language models in Autopilot does not require setting the <code>AutoMLJobObjective</code> field. Autopilot fine-tunes LLMs without requiring multiple candidates to be trained and evaluated. Instead, using your dataset, Autopilot directly fine-tunes your target model to enhance a default objective metric, the cross-entropy loss. After fine-tuning a language model, you can evaluate the quality of its generated text using different metrics. For a list of the available metrics, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-llms-finetuning-metrics.html">Metrics for fine-tuning LLMs in Autopilot</a>.</p> </li> </ul>
     * @public
     */
    MetricName: AutoMLMetricEnum | undefined;
}
/**
 * <p>Metadata for an AutoML job step.</p>
 * @public
 */
export interface AutoMLJobStepMetadata {
    /**
     * <p>The Amazon Resource Name (ARN) of the AutoML job.</p>
     * @public
     */
    Arn?: string | undefined;
}
/**
 * <p>The reason for a partial failure of an AutoML job.</p>
 * @public
 */
export interface AutoMLPartialFailureReason {
    /**
     * <p>The message containing the reason for a partial failure of an AutoML job.</p>
     * @public
     */
    PartialFailureMessage?: string | undefined;
}
/**
 * <p>Provides a summary about an AutoML job.</p>
 * @public
 */
export interface AutoMLJobSummary {
    /**
     * <p>The name of the AutoML job you are requesting.</p>
     * @public
     */
    AutoMLJobName: string | undefined;
    /**
     * <p>The ARN of the AutoML job.</p>
     * @public
     */
    AutoMLJobArn: string | undefined;
    /**
     * <p>The status of the AutoML job.</p>
     * @public
     */
    AutoMLJobStatus: AutoMLJobStatus | undefined;
    /**
     * <p>The secondary status of the AutoML job.</p>
     * @public
     */
    AutoMLJobSecondaryStatus: AutoMLJobSecondaryStatus | undefined;
    /**
     * <p>When the AutoML job was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The end time of an AutoML job.</p>
     * @public
     */
    EndTime?: Date | undefined;
    /**
     * <p>When the AutoML job was last modified.</p>
     * @public
     */
    LastModifiedTime: Date | undefined;
    /**
     * <p>The failure reason of an AutoML job.</p>
     * @public
     */
    FailureReason?: string | undefined;
    /**
     * <p>The list of reasons for partial failures within an AutoML job.</p>
     * @public
     */
    PartialFailureReasons?: AutoMLPartialFailureReason[] | undefined;
}
/**
 * <p>The output data configuration.</p>
 * @public
 */
export interface AutoMLOutputDataConfig {
    /**
     * <p>The Key Management Service encryption key ID.</p>
     * @public
     */
    KmsKeyId?: string | undefined;
    /**
     * <p>The Amazon S3 output path. Must be 512 characters or less.</p>
     * @public
     */
    S3OutputPath: string | undefined;
}
/**
 * <p>The collection of settings used by an AutoML job V2 for the image classification problem type.</p>
 * @public
 */
export interface ImageClassificationJobConfig {
    /**
     * <p>How long a job is allowed to run, or how many candidates a job is allowed to generate.</p>
     * @public
     */
    CompletionCriteria?: AutoMLJobCompletionCriteria | undefined;
}
/**
 * <p>Stores the configuration information for how model candidates are generated using an AutoML job V2.</p>
 * @public
 */
export interface CandidateGenerationConfig {
    /**
     * <p>Your Autopilot job trains a default set of algorithms on your dataset. For tabular and time-series data, you can customize the algorithm list by selecting a subset of algorithms for your problem type.</p> <p> <code>AlgorithmsConfig</code> stores the customized selection of algorithms to train on your data.</p> <ul> <li> <p> <b>For the tabular problem type <code>TabularJobConfig</code>,</b> the list of available algorithms to choose from depends on the training mode set in <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_AutoMLJobConfig.html"> <code>AutoMLJobConfig.Mode</code> </a>.</p> <ul> <li> <p> <code>AlgorithmsConfig</code> should not be set when the training mode <code>AutoMLJobConfig.Mode</code> is set to <code>AUTO</code>.</p> </li> <li> <p>When <code>AlgorithmsConfig</code> is provided, one <code>AutoMLAlgorithms</code> attribute must be set and one only.</p> <p>If the list of algorithms provided as values for <code>AutoMLAlgorithms</code> is empty, <code>CandidateGenerationConfig</code> uses the full set of algorithms for the given training mode.</p> </li> <li> <p>When <code>AlgorithmsConfig</code> is not provided, <code>CandidateGenerationConfig</code> uses the full set of algorithms for the given training mode.</p> </li> </ul> <p>For the list of all algorithms per training mode, see <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_AutoMLAlgorithmConfig.html"> AlgorithmConfig</a>.</p> <p>For more information on each algorithm, see the <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-model-support-validation.html#autopilot-algorithm-support">Algorithm support</a> section in the Autopilot developer guide.</p> </li> <li> <p> <b>For the time-series forecasting problem type <code>TimeSeriesForecastingJobConfig</code>,</b> choose your algorithms from the list provided in <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_AutoMLAlgorithmConfig.html"> AlgorithmConfig</a>.</p> <p>For more information on each algorithm, see the <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/timeseries-forecasting-algorithms.html">Algorithms support for time-series forecasting</a> section in the Autopilot developer guide.</p> <ul> <li> <p>When <code>AlgorithmsConfig</code> is provided, one <code>AutoMLAlgorithms</code> attribute must be set and one only.</p> <p>If the list of algorithms provided as values for <code>AutoMLAlgorithms</code> is empty, <code>CandidateGenerationConfig</code> uses the full set of algorithms for time-series forecasting.</p> </li> <li> <p>When <code>AlgorithmsConfig</code> is not provided, <code>CandidateGenerationConfig</code> uses the full set of algorithms for time-series forecasting.</p> </li> </ul> </li> </ul>
     * @public
     */
    AlgorithmsConfig?: AutoMLAlgorithmConfig[] | undefined;
}
/**
 * <p>The collection of settings used by an AutoML job V2 for the tabular problem type.</p>
 * @public
 */
export interface TabularJobConfig {
    /**
     * <p>The configuration information of how model candidates are generated.</p>
     * @public
     */
    CandidateGenerationConfig?: CandidateGenerationConfig | undefined;
    /**
     * <p>How long a job is allowed to run, or how many candidates a job is allowed to generate.</p>
     * @public
     */
    CompletionCriteria?: AutoMLJobCompletionCriteria | undefined;
    /**
     * <p>A URL to the Amazon S3 data source containing selected features from the input data source to run an Autopilot job V2. You can input <code>FeatureAttributeNames</code> (optional) in JSON format as shown below: </p> <p> <code>\{ "FeatureAttributeNames":["col1", "col2", ...] \}</code>.</p> <p>You can also specify the data type of the feature (optional) in the format shown below:</p> <p> <code>\{ "FeatureDataTypes":\{"col1":"numeric", "col2":"categorical" ... \} \}</code> </p> <note> <p>These column keys may not include the target column.</p> </note> <p>In ensembling mode, Autopilot only supports the following data types: <code>numeric</code>, <code>categorical</code>, <code>text</code>, and <code>datetime</code>. In HPO mode, Autopilot can support <code>numeric</code>, <code>categorical</code>, <code>text</code>, <code>datetime</code>, and <code>sequence</code>.</p> <p>If only <code>FeatureDataTypes</code> is provided, the column keys (<code>col1</code>, <code>col2</code>,..) should be a subset of the column names in the input data. </p> <p>If both <code>FeatureDataTypes</code> and <code>FeatureAttributeNames</code> are provided, then the column keys should be a subset of the column names provided in <code>FeatureAttributeNames</code>. </p> <p>The key name <code>FeatureAttributeNames</code> is fixed. The values listed in <code>["col1", "col2", ...]</code> are case sensitive and should be a list of strings containing unique values that are a subset of the column names in the input data. The list of columns provided must not include the target column.</p>
     * @public
     */
    FeatureSpecificationS3Uri?: string | undefined;
    /**
     * <p>The method that Autopilot uses to train the data. You can either specify the mode manually or let Autopilot choose for you based on the dataset size by selecting <code>AUTO</code>. In <code>AUTO</code> mode, Autopilot chooses <code>ENSEMBLING</code> for datasets smaller than 100 MB, and <code>HYPERPARAMETER_TUNING</code> for larger ones.</p> <p>The <code>ENSEMBLING</code> mode uses a multi-stack ensemble model to predict classification and regression tasks directly from your dataset. This machine learning mode combines several base models to produce an optimal predictive model. It then uses a stacking ensemble method to combine predictions from contributing members. A multi-stack ensemble model can provide better performance over a single model by combining the predictive capabilities of multiple models. See <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-model-support-validation.html#autopilot-algorithm-support">Autopilot algorithm support</a> for a list of algorithms supported by <code>ENSEMBLING</code> mode.</p> <p>The <code>HYPERPARAMETER_TUNING</code> (HPO) mode uses the best hyperparameters to train the best version of a model. HPO automatically selects an algorithm for the type of problem you want to solve. Then HPO finds the best hyperparameters according to your objective metric. See <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-model-support-validation.html#autopilot-algorithm-support">Autopilot algorithm support</a> for a list of algorithms supported by <code>HYPERPARAMETER_TUNING</code> mode.</p>
     * @public
     */
    Mode?: AutoMLMode | undefined;
    /**
     * <p>Generates possible candidates without training the models. A model candidate is a combination of data preprocessors, algorithms, and algorithm parameter settings.</p>
     * @public
     */
    GenerateCandidateDefinitionsOnly?: boolean | undefined;
    /**
     * <p>The type of supervised learning problem available for the model candidates of the AutoML job V2. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-datasets-problem-types.html#autopilot-problem-types"> SageMaker Autopilot problem types</a>.</p> <note> <p>You must either specify the type of supervised learning problem in <code>ProblemType</code> and provide the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateAutoMLJobV2.html#sagemaker-CreateAutoMLJobV2-request-AutoMLJobObjective">AutoMLJobObjective</a> metric, or none at all.</p> </note>
     * @public
     */
    ProblemType?: ProblemType | undefined;
    /**
     * <p>The name of the target variable in supervised learning, usually represented by 'y'.</p>
     * @public
     */
    TargetAttributeName: string | undefined;
    /**
     * <p>If specified, this column name indicates which column of the dataset should be treated as sample weights for use by the objective metric during the training, evaluation, and the selection of the best model. This column is not considered as a predictive feature. For more information on Autopilot metrics, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-metrics-validation.html">Metrics and validation</a>.</p> <p>Sample weights should be numeric, non-negative, with larger values indicating which rows are more important than others. Data points that have invalid or no weight value are excluded.</p> <p>Support for sample weights is available in <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_AutoMLAlgorithmConfig.html">Ensembling</a> mode only.</p>
     * @public
     */
    SampleWeightAttributeName?: string | undefined;
}
/**
 * <p>The collection of settings used by an AutoML job V2 for the text classification problem type.</p>
 * @public
 */
export interface TextClassificationJobConfig {
    /**
     * <p>How long a job is allowed to run, or how many candidates a job is allowed to generate.</p>
     * @public
     */
    CompletionCriteria?: AutoMLJobCompletionCriteria | undefined;
    /**
     * <p>The name of the column used to provide the sentences to be classified. It should not be the same as the target column.</p>
     * @public
     */
    ContentColumn: string | undefined;
    /**
     * <p>The name of the column used to provide the class labels. It should not be same as the content column.</p>
     * @public
     */
    TargetLabelColumn: string | undefined;
}
/**
 * <p>The collection of settings used by an AutoML job V2 for the text generation problem type.</p> <note> <p>The text generation models that support fine-tuning in Autopilot are currently accessible exclusively in regions supported by Canvas. Refer to the documentation of Canvas for the <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/canvas.html">full list of its supported Regions</a>.</p> </note>
 * @public
 */
export interface TextGenerationJobConfig {
    /**
     * <p>How long a fine-tuning job is allowed to run. For <code>TextGenerationJobConfig</code> problem types, the <code>MaxRuntimePerTrainingJobInSeconds</code> attribute of <code>AutoMLJobCompletionCriteria</code> defaults to 72h (259200s).</p>
     * @public
     */
    CompletionCriteria?: AutoMLJobCompletionCriteria | undefined;
    /**
     * <p>The name of the base model to fine-tune. Autopilot supports fine-tuning a variety of large language models. For information on the list of supported models, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-llms-finetuning-models.html#autopilot-llms-finetuning-supported-llms">Text generation models supporting fine-tuning in Autopilot</a>. If no <code>BaseModelName</code> is provided, the default model used is <b>Falcon7BInstruct</b>. </p>
     * @public
     */
    BaseModelName?: string | undefined;
    /**
     * <p>The hyperparameters used to configure and optimize the learning process of the base model. You can set any combination of the following hyperparameters for all base models. For more information on each supported hyperparameter, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-llms-finetuning-set-hyperparameters.html">Optimize the learning process of your text generation models with hyperparameters</a>.</p> <ul> <li> <p> <code>"epochCount"</code>: The number of times the model goes through the entire training dataset. Its value should be a string containing an integer value within the range of "1" to "10".</p> </li> <li> <p> <code>"batchSize"</code>: The number of data samples used in each iteration of training. Its value should be a string containing an integer value within the range of "1" to "64".</p> </li> <li> <p> <code>"learningRate"</code>: The step size at which a model's parameters are updated during training. Its value should be a string containing a floating-point value within the range of "0" to "1".</p> </li> <li> <p> <code>"learningRateWarmupSteps"</code>: The number of training steps during which the learning rate gradually increases before reaching its target or maximum value. Its value should be a string containing an integer value within the range of "0" to "250".</p> </li> </ul> <p>Here is an example where all four hyperparameters are configured.</p> <p> <code>\{ "epochCount":"5", "learningRate":"0.5", "batchSize": "32", "learningRateWarmupSteps": "10" \}</code> </p>
     * @public
     */
    TextGenerationHyperParameters?: Record<string, string> | undefined;
    /**
     * <p>The access configuration file to control access to the ML model. You can explicitly accept the model end-user license agreement (EULA) within the <code>ModelAccessConfig</code>.</p> <ul> <li> <p>If you are a Jumpstart user, see the <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/jumpstart-foundation-models-choose.html#jumpstart-foundation-models-choose-eula">End-user license agreements</a> section for more details on accepting the EULA.</p> </li> <li> <p>If you are an AutoML user, see the <i>Optional Parameters</i> section of <i>Create an AutoML job to fine-tune text generation models using the API</i> for details on <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-create-experiment-finetune-llms.html#autopilot-llms-finetuning-api-optional-params">How to set the EULA acceptance when fine-tuning a model using the AutoML API</a>.</p> </li> </ul>
     * @public
     */
    ModelAccessConfig?: ModelAccessConfig | undefined;
}
/**
 * <p>Stores the holiday featurization attributes applicable to each item of time-series datasets during the training of a forecasting model. This allows the model to identify patterns associated with specific holidays.</p>
 * @public
 */
export interface HolidayConfigAttributes {
    /**
     * <p>The country code for the holiday calendar.</p> <p>For the list of public holiday calendars supported by AutoML job V2, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-timeseries-forecasting-holiday-calendars.html#holiday-country-codes">Country Codes</a>. Use the country code corresponding to the country of your choice.</p>
     * @public
     */
    CountryCode?: string | undefined;
}
/**
 * <p>The collection of components that defines the time-series.</p>
 * @public
 */
export interface TimeSeriesConfig {
    /**
     * <p>The name of the column representing the target variable that you want to predict for each item in your dataset. The data type of the target variable must be numerical.</p>
     * @public
     */
    TargetAttributeName: string | undefined;
    /**
     * <p>The name of the column indicating a point in time at which the target value of a given item is recorded.</p>
     * @public
     */
    TimestampAttributeName: string | undefined;
    /**
     * <p>The name of the column that represents the set of item identifiers for which you want to predict the target value.</p>
     * @public
     */
    ItemIdentifierAttributeName: string | undefined;
    /**
     * <p>A set of columns names that can be grouped with the item identifier column to create a composite key for which a target value is predicted.</p>
     * @public
     */
    GroupingAttributeNames?: string[] | undefined;
}
/**
 * <p>Transformations allowed on the dataset. Supported transformations are <code>Filling</code> and <code>Aggregation</code>. <code>Filling</code> specifies how to add values to missing values in the dataset. <code>Aggregation</code> defines how to aggregate data that does not align with forecast frequency.</p>
 * @public
 */
export interface TimeSeriesTransformations {
    /**
     * <p>A key value pair defining the filling method for a column, where the key is the column name and the value is an object which defines the filling logic. You can specify multiple filling methods for a single column.</p> <p>The supported filling methods and their corresponding options are:</p> <ul> <li> <p> <code>frontfill</code>: <code>none</code> (Supported only for target column)</p> </li> <li> <p> <code>middlefill</code>: <code>zero</code>, <code>value</code>, <code>median</code>, <code>mean</code>, <code>min</code>, <code>max</code> </p> </li> <li> <p> <code>backfill</code>: <code>zero</code>, <code>value</code>, <code>median</code>, <code>mean</code>, <code>min</code>, <code>max</code> </p> </li> <li> <p> <code>futurefill</code>: <code>zero</code>, <code>value</code>, <code>median</code>, <code>mean</code>, <code>min</code>, <code>max</code> </p> </li> </ul> <p>To set a filling method to a specific value, set the fill parameter to the chosen filling method value (for example <code>"backfill" : "value"</code>), and define the filling value in an additional parameter prefixed with "_value". For example, to set <code>backfill</code> to a value of <code>2</code>, you must include two parameters: <code>"backfill": "value"</code> and <code>"backfill_value":"2"</code>.</p>
     * @public
     */
    Filling?: Record<string, Partial<Record<FillingType, string>>> | undefined;
    /**
     * <p>A key value pair defining the aggregation method for a column, where the key is the column name and the value is the aggregation method.</p> <p>The supported aggregation methods are <code>sum</code> (default), <code>avg</code>, <code>first</code>, <code>min</code>, <code>max</code>.</p> <note> <p>Aggregation is only supported for the target column.</p> </note>
     * @public
     */
    Aggregation?: Record<string, AggregationTransformationValue> | undefined;
}
/**
 * <p>The collection of settings used by an AutoML job V2 for the time-series forecasting problem type.</p>
 * @public
 */
export interface TimeSeriesForecastingJobConfig {
    /**
     * <p>A URL to the Amazon S3 data source containing additional selected features that complement the target, itemID, timestamp, and grouped columns set in <code>TimeSeriesConfig</code>. When not provided, the AutoML job V2 includes all the columns from the original dataset that are not already declared in <code>TimeSeriesConfig</code>. If provided, the AutoML job V2 only considers these additional columns as a complement to the ones declared in <code>TimeSeriesConfig</code>.</p> <p>You can input <code>FeatureAttributeNames</code> (optional) in JSON format as shown below: </p> <p> <code>\{ "FeatureAttributeNames":["col1", "col2", ...] \}</code>.</p> <p>You can also specify the data type of the feature (optional) in the format shown below:</p> <p> <code>\{ "FeatureDataTypes":\{"col1":"numeric", "col2":"categorical" ... \} \}</code> </p> <p>Autopilot supports the following data types: <code>numeric</code>, <code>categorical</code>, <code>text</code>, and <code>datetime</code>.</p> <note> <p>These column keys must not include any column set in <code>TimeSeriesConfig</code>.</p> </note>
     * @public
     */
    FeatureSpecificationS3Uri?: string | undefined;
    /**
     * <p>How long a job is allowed to run, or how many candidates a job is allowed to generate.</p>
     * @public
     */
    CompletionCriteria?: AutoMLJobCompletionCriteria | undefined;
    /**
     * <p>The frequency of predictions in a forecast.</p> <p>Valid intervals are an integer followed by Y (Year), M (Month), W (Week), D (Day), H (Hour), and min (Minute). For example, <code>1D</code> indicates every day and <code>15min</code> indicates every 15 minutes. The value of a frequency must not overlap with the next larger frequency. For example, you must use a frequency of <code>1H</code> instead of <code>60min</code>.</p> <p>The valid values for each frequency are the following:</p> <ul> <li> <p>Minute - 1-59</p> </li> <li> <p>Hour - 1-23</p> </li> <li> <p>Day - 1-6</p> </li> <li> <p>Week - 1-4</p> </li> <li> <p>Month - 1-11</p> </li> <li> <p>Year - 1</p> </li> </ul>
     * @public
     */
    ForecastFrequency: string | undefined;
    /**
     * <p>The number of time-steps that the model predicts. The forecast horizon is also called the prediction length. The maximum forecast horizon is the lesser of 500 time-steps or 1/4 of the time-steps in the dataset.</p>
     * @public
     */
    ForecastHorizon: number | undefined;
    /**
     * <p>The quantiles used to train the model for forecasts at a specified quantile. You can specify quantiles from <code>0.01</code> (p1) to <code>0.99</code> (p99), by increments of 0.01 or higher. Up to five forecast quantiles can be specified. When <code>ForecastQuantiles</code> is not provided, the AutoML job uses the quantiles p10, p50, and p90 as default.</p>
     * @public
     */
    ForecastQuantiles?: string[] | undefined;
    /**
     * <p>The transformations modifying specific attributes of the time-series, such as filling strategies for missing values.</p>
     * @public
     */
    Transformations?: TimeSeriesTransformations | undefined;
    /**
     * <p>The collection of components that defines the time-series.</p>
     * @public
     */
    TimeSeriesConfig: TimeSeriesConfig | undefined;
    /**
     * <p>The collection of holiday featurization attributes used to incorporate national holiday information into your forecasting model.</p>
     * @public
     */
    HolidayConfig?: HolidayConfigAttributes[] | undefined;
    /**
     * <p>Stores the configuration information for how model candidates are generated using an AutoML job V2.</p>
     * @public
     */
    CandidateGenerationConfig?: CandidateGenerationConfig | undefined;
}
/**
 * <p>A collection of settings specific to the problem type used to configure an AutoML job V2. There must be one and only one config of the following type.</p>
 * @public
 */
export type AutoMLProblemTypeConfig = AutoMLProblemTypeConfig.ImageClassificationJobConfigMember | AutoMLProblemTypeConfig.TabularJobConfigMember | AutoMLProblemTypeConfig.TextClassificationJobConfigMember | AutoMLProblemTypeConfig.TextGenerationJobConfigMember | AutoMLProblemTypeConfig.TimeSeriesForecastingJobConfigMember | AutoMLProblemTypeConfig.$UnknownMember;
/**
 * @public
 */
export declare namespace AutoMLProblemTypeConfig {
    /**
     * <p>Settings used to configure an AutoML job V2 for the image classification problem type.</p>
     * @public
     */
    interface ImageClassificationJobConfigMember {
        ImageClassificationJobConfig: ImageClassificationJobConfig;
        TextClassificationJobConfig?: never;
        TimeSeriesForecastingJobConfig?: never;
        TabularJobConfig?: never;
        TextGenerationJobConfig?: never;
        $unknown?: never;
    }
    /**
     * <p>Settings used to configure an AutoML job V2 for the text classification problem type.</p>
     * @public
     */
    interface TextClassificationJobConfigMember {
        ImageClassificationJobConfig?: never;
        TextClassificationJobConfig: TextClassificationJobConfig;
        TimeSeriesForecastingJobConfig?: never;
        TabularJobConfig?: never;
        TextGenerationJobConfig?: never;
        $unknown?: never;
    }
    /**
     * <p>Settings used to configure an AutoML job V2 for the time-series forecasting problem type.</p>
     * @public
     */
    interface TimeSeriesForecastingJobConfigMember {
        ImageClassificationJobConfig?: never;
        TextClassificationJobConfig?: never;
        TimeSeriesForecastingJobConfig: TimeSeriesForecastingJobConfig;
        TabularJobConfig?: never;
        TextGenerationJobConfig?: never;
        $unknown?: never;
    }
    /**
     * <p>Settings used to configure an AutoML job V2 for the tabular problem type (regression, classification).</p>
     * @public
     */
    interface TabularJobConfigMember {
        ImageClassificationJobConfig?: never;
        TextClassificationJobConfig?: never;
        TimeSeriesForecastingJobConfig?: never;
        TabularJobConfig: TabularJobConfig;
        TextGenerationJobConfig?: never;
        $unknown?: never;
    }
    /**
     * <p>Settings used to configure an AutoML job V2 for the text generation (LLMs fine-tuning) problem type.</p> <note> <p>The text generation models that support fine-tuning in Autopilot are currently accessible exclusively in regions supported by Canvas. Refer to the documentation of Canvas for the <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/canvas.html">full list of its supported Regions</a>.</p> </note>
     * @public
     */
    interface TextGenerationJobConfigMember {
        ImageClassificationJobConfig?: never;
        TextClassificationJobConfig?: never;
        TimeSeriesForecastingJobConfig?: never;
        TabularJobConfig?: never;
        TextGenerationJobConfig: TextGenerationJobConfig;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        ImageClassificationJobConfig?: never;
        TextClassificationJobConfig?: never;
        TimeSeriesForecastingJobConfig?: never;
        TabularJobConfig?: never;
        TextGenerationJobConfig?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        ImageClassificationJobConfig: (value: ImageClassificationJobConfig) => T;
        TextClassificationJobConfig: (value: TextClassificationJobConfig) => T;
        TimeSeriesForecastingJobConfig: (value: TimeSeriesForecastingJobConfig) => T;
        TabularJobConfig: (value: TabularJobConfig) => T;
        TextGenerationJobConfig: (value: TextGenerationJobConfig) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>The resolved attributes specific to the tabular problem type.</p>
 * @public
 */
export interface TabularResolvedAttributes {
    /**
     * <p>The type of supervised learning problem available for the model candidates of the AutoML job V2 (Binary Classification, Multiclass Classification, Regression). For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-datasets-problem-types.html#autopilot-problem-types"> SageMaker Autopilot problem types</a>.</p>
     * @public
     */
    ProblemType?: ProblemType | undefined;
}
/**
 * <p>The resolved attributes specific to the text generation problem type.</p>
 * @public
 */
export interface TextGenerationResolvedAttributes {
    /**
     * <p>The name of the base model to fine-tune.</p>
     * @public
     */
    BaseModelName?: string | undefined;
}
/**
 * <p>Stores resolved attributes specific to the problem type of an AutoML job V2.</p>
 * @public
 */
export type AutoMLProblemTypeResolvedAttributes = AutoMLProblemTypeResolvedAttributes.TabularResolvedAttributesMember | AutoMLProblemTypeResolvedAttributes.TextGenerationResolvedAttributesMember | AutoMLProblemTypeResolvedAttributes.$UnknownMember;
/**
 * @public
 */
export declare namespace AutoMLProblemTypeResolvedAttributes {
    /**
     * <p>The resolved attributes for the tabular problem type.</p>
     * @public
     */
    interface TabularResolvedAttributesMember {
        TabularResolvedAttributes: TabularResolvedAttributes;
        TextGenerationResolvedAttributes?: never;
        $unknown?: never;
    }
    /**
     * <p>The resolved attributes for the text generation problem type.</p>
     * @public
     */
    interface TextGenerationResolvedAttributesMember {
        TabularResolvedAttributes?: never;
        TextGenerationResolvedAttributes: TextGenerationResolvedAttributes;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        TabularResolvedAttributes?: never;
        TextGenerationResolvedAttributes?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        TabularResolvedAttributes: (value: TabularResolvedAttributes) => T;
        TextGenerationResolvedAttributes: (value: TextGenerationResolvedAttributes) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>The resolved attributes used to configure an AutoML job V2.</p>
 * @public
 */
export interface AutoMLResolvedAttributes {
    /**
     * <p>Specifies a metric to minimize or maximize as the objective of an AutoML job.</p>
     * @public
     */
    AutoMLJobObjective?: AutoMLJobObjective | undefined;
    /**
     * <p>How long a job is allowed to run, or how many candidates a job is allowed to generate.</p>
     * @public
     */
    CompletionCriteria?: AutoMLJobCompletionCriteria | undefined;
    /**
     * <p>Defines the resolved attributes specific to a problem type.</p>
     * @public
     */
    AutoMLProblemTypeResolvedAttributes?: AutoMLProblemTypeResolvedAttributes | undefined;
}
/**
 * <p>The name and an example value of the hyperparameter that you want to use in Autotune. If Automatic model tuning (AMT) determines that your hyperparameter is eligible for Autotune, an optimal hyperparameter range is selected for you.</p>
 * @public
 */
export interface AutoParameter {
    /**
     * <p>The name of the hyperparameter to optimize using Autotune.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>An example value of the hyperparameter to optimize using Autotune.</p>
     * @public
     */
    ValueHint: string | undefined;
}
/**
 * <p>Automatic rollback configuration for handling endpoint deployment failures and recovery.</p>
 * @public
 */
export interface AutoRollbackConfig {
    /**
     * <p>List of CloudWatch alarms in your account that are configured to monitor metrics on an endpoint. If any alarms are tripped during a deployment, SageMaker rolls back the deployment.</p>
     * @public
     */
    Alarms?: Alarm[] | undefined;
}
/**
 * <p>A flag to indicate if you want to use Autotune to automatically find optimal values for the following fields:</p> <ul> <li> <p> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_HyperParameterTuningJobConfig.html#sagemaker-Type-HyperParameterTuningJobConfig-ParameterRanges">ParameterRanges</a>: The names and ranges of parameters that a hyperparameter tuning job can optimize.</p> </li> <li> <p> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_ResourceLimits.html">ResourceLimits</a>: The maximum resources that can be used for a training job. These resources include the maximum number of training jobs, the maximum runtime of a tuning job, and the maximum number of training jobs to run at the same time.</p> </li> <li> <p> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_HyperParameterTuningJobConfig.html#sagemaker-Type-HyperParameterTuningJobConfig-TrainingJobEarlyStoppingType">TrainingJobEarlyStoppingType</a>: A flag that specifies whether or not to use early stopping for training jobs launched by a hyperparameter tuning job.</p> </li> <li> <p> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_HyperParameterTrainingJobDefinition.html#sagemaker-Type-HyperParameterTrainingJobDefinition-RetryStrategy">RetryStrategy</a>: The number of times to retry a training job.</p> </li> <li> <p> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_HyperParameterTuningJobConfig.html">Strategy</a>: Specifies how hyperparameter tuning chooses the combinations of hyperparameter values to use for the training jobs that it launches.</p> </li> <li> <p> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_ConvergenceDetected.html">ConvergenceDetected</a>: A flag to indicate that Automatic model tuning (AMT) has detected model convergence.</p> </li> </ul>
 * @public
 */
export interface Autotune {
    /**
     * <p>Set <code>Mode</code> to <code>Enabled</code> if you want to use Autotune.</p>
     * @public
     */
    Mode: AutotuneMode | undefined;
}
/**
 * <p>Contains information about an available upgrade for a SageMaker Partner AI App, including the version number and release notes.</p>
 * @public
 */
export interface AvailableUpgrade {
    /**
     * <p>The semantic version number of the available upgrade for the SageMaker Partner AI App.</p>
     * @public
     */
    Version?: string | undefined;
    /**
     * <p>A list of release notes describing the changes and improvements included in the available upgrade version.</p>
     * @public
     */
    ReleaseNotes?: string[] | undefined;
}
/**
 * @public
 */
export interface BatchAddClusterNodesRequest {
    /**
     * <p>The name of the HyperPod cluster to which you want to add nodes.</p>
     * @public
     */
    ClusterName: string | undefined;
    /**
     * <p>A unique, case-sensitive identifier that you provide to ensure the idempotency of the request. This token is valid for 8 hours. If you retry the request with the same client token within this timeframe and the same parameters, the API returns the same set of <code>NodeLogicalIds</code> with their latest status.</p>
     * @public
     */
    ClientToken?: string | undefined;
    /**
     * <p>A list of instance groups and the number of nodes to add to each. You can specify up to 5 instance groups in a single request, with a maximum of 50 nodes total across all instance groups.</p>
     * @public
     */
    NodesToAdd: AddClusterNodeSpecification[] | undefined;
}
/**
 * <p>Information about an error that occurred during the node addition operation.</p>
 * @public
 */
export interface BatchAddClusterNodesError {
    /**
     * <p>The name of the instance group for which the error occurred.</p>
     * @public
     */
    InstanceGroupName: string | undefined;
    /**
     * <p>The error code associated with the failure. Possible values include <code>InstanceGroupNotFound</code> and <code>InvalidInstanceGroupState</code>.</p>
     * @public
     */
    ErrorCode: BatchAddClusterNodesErrorCode | undefined;
    /**
     * <p>The number of nodes that failed to be added to the specified instance group.</p>
     * @public
     */
    FailedCount: number | undefined;
    /**
     * <p>A descriptive message providing additional details about the error.</p>
     * @public
     */
    Message?: string | undefined;
}
/**
 * <p>Information about a node that was successfully added to the cluster.</p>
 * @public
 */
export interface NodeAdditionResult {
    /**
     * <p>A unique identifier assigned to the node that can be used to track its provisioning status through the <code>DescribeClusterNode</code> operation.</p>
     * @public
     */
    NodeLogicalId: string | undefined;
    /**
     * <p>The name of the instance group to which the node was added.</p>
     * @public
     */
    InstanceGroupName: string | undefined;
    /**
     * <p>The current status of the node. Possible values include <code>Pending</code>, <code>Running</code>, <code>Failed</code>, <code>ShuttingDown</code>, <code>SystemUpdating</code>, <code>DeepHealthCheckInProgress</code>, and <code>NotFound</code>.</p>
     * @public
     */
    Status: ClusterInstanceStatus | undefined;
}
/**
 * @public
 */
export interface BatchAddClusterNodesResponse {
    /**
     * <p>A list of <code>NodeLogicalIDs</code> that were successfully added to the cluster. The <code>NodeLogicalID</code> is unique per cluster and does not change between instance replacements. Each entry includes a <code>NodeLogicalId</code> that can be used to track the node's provisioning status (with <code>DescribeClusterNode</code>), the instance group name, and the current status of the node.</p>
     * @public
     */
    Successful: NodeAdditionResult[] | undefined;
    /**
     * <p>A list of errors that occurred during the node addition operation. Each entry includes the instance group name, error code, number of failed additions, and an error message.</p>
     * @public
     */
    Failed: BatchAddClusterNodesError[] | undefined;
}
/**
 * <p>Configuration to control how SageMaker captures inference data for batch transform jobs.</p>
 * @public
 */
export interface BatchDataCaptureConfig {
    /**
     * <p>The Amazon S3 location being used to capture the data.</p>
     * @public
     */
    DestinationS3Uri: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of a Amazon Web Services Key Management Service key that SageMaker uses to encrypt data on the storage volume attached to the ML compute instance that hosts the batch transform job.</p> <p>The KmsKeyId can be any of the following formats: </p> <ul> <li> <p>Key ID: <code>1234abcd-12ab-34cd-56ef-1234567890ab</code> </p> </li> <li> <p>Key ARN: <code>arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab</code> </p> </li> <li> <p>Alias name: <code>alias/ExampleAlias</code> </p> </li> <li> <p>Alias name ARN: <code>arn:aws:kms:us-west-2:111122223333:alias/ExampleAlias</code> </p> </li> </ul>
     * @public
     */
    KmsKeyId?: string | undefined;
    /**
     * <p>Flag that indicates whether to append inference id to the output.</p>
     * @public
     */
    GenerateInferenceId?: boolean | undefined;
}
/**
 * <p>Information about an error that occurred when attempting to delete a node identified by its <code>NodeLogicalId</code>.</p>
 * @public
 */
export interface BatchDeleteClusterNodeLogicalIdsError {
    /**
     * <p>The error code associated with the failure. Possible values include <code>NodeLogicalIdNotFound</code>, <code>InvalidNodeStatus</code>, and <code>InternalError</code>.</p>
     * @public
     */
    Code: BatchDeleteClusterNodesErrorCode | undefined;
    /**
     * <p>A descriptive message providing additional details about the error.</p>
     * @public
     */
    Message: string | undefined;
    /**
     * <p>The <code>NodeLogicalId</code> of the node that could not be deleted.</p>
     * @public
     */
    NodeLogicalId: string | undefined;
}
/**
 * @public
 */
export interface BatchDeleteClusterNodesRequest {
    /**
     * <p>The name of the SageMaker HyperPod cluster from which to delete the specified nodes.</p>
     * @public
     */
    ClusterName: string | undefined;
    /**
     * <p>A list of node IDs to be deleted from the specified cluster.</p> <note> <ul> <li> <p>For SageMaker HyperPod clusters using the Slurm workload manager, you cannot remove instances that are configured as Slurm controller nodes.</p> </li> <li> <p>If you need to delete more than 99 instances, contact <a href="http://aws.amazon.com/contact-us/">Support</a> for assistance.</p> </li> </ul> </note>
     * @public
     */
    NodeIds?: string[] | undefined;
    /**
     * <p>A list of <code>NodeLogicalIds</code> identifying the nodes to be deleted. You can specify up to 50 <code>NodeLogicalIds</code>. You must specify either <code>NodeLogicalIds</code>, <code>InstanceIds</code>, or both, with a combined maximum of 50 identifiers.</p>
     * @public
     */
    NodeLogicalIds?: string[] | undefined;
}
/**
 * <p>Represents an error encountered when deleting a node from a SageMaker HyperPod cluster.</p>
 * @public
 */
export interface BatchDeleteClusterNodesError {
    /**
     * <p>The error code associated with the error encountered when deleting a node.</p> <p>The code provides information about the specific issue encountered, such as the node not being found, the node's status being invalid for deletion, or the node ID being in use by another process.</p>
     * @public
     */
    Code: BatchDeleteClusterNodesErrorCode | undefined;
    /**
     * <p>A message describing the error encountered when deleting a node.</p>
     * @public
     */
    Message: string | undefined;
    /**
     * <p>The ID of the node that encountered an error during the deletion process.</p>
     * @public
     */
    NodeId: string | undefined;
}
/**
 * @public
 */
export interface BatchDeleteClusterNodesResponse {
    /**
     * <p>A list of errors encountered when deleting the specified nodes.</p>
     * @public
     */
    Failed?: BatchDeleteClusterNodesError[] | undefined;
    /**
     * <p>A list of node IDs that were successfully deleted from the specified cluster.</p>
     * @public
     */
    Successful?: string[] | undefined;
    /**
     * <p>A list of <code>NodeLogicalIds</code> that could not be deleted, along with error information explaining why the deletion failed.</p>
     * @public
     */
    FailedNodeLogicalIds?: BatchDeleteClusterNodeLogicalIdsError[] | undefined;
    /**
     * <p>A list of <code>NodeLogicalIds</code> that were successfully deleted from the cluster.</p>
     * @public
     */
    SuccessfulNodeLogicalIds?: string[] | undefined;
}
/**
 * @public
 */
export interface BatchDescribeModelPackageInput {
    /**
     * <p>The list of Amazon Resource Name (ARN) of the model package groups.</p>
     * @public
     */
    ModelPackageArnList: string[] | undefined;
}
/**
 * <p>The error code and error description associated with the resource.</p>
 * @public
 */
export interface BatchDescribeModelPackageError {
    /**
     * <p/>
     * @public
     */
    ErrorCode: string | undefined;
    /**
     * <p/>
     * @public
     */
    ErrorResponse: string | undefined;
}
/**
 * <p>Defines how to perform inference generation after a training job is run.</p>
 * @public
 */
export interface InferenceSpecification {
    /**
     * <p>The Amazon ECR registry path of the Docker image that contains the inference code.</p>
     * @public
     */
    Containers: ModelPackageContainerDefinition[] | undefined;
    /**
     * <p>A list of the instance types on which a transformation job can be run or on which an endpoint can be deployed.</p> <p>This parameter is required for unversioned models, and optional for versioned models.</p>
     * @public
     */
    SupportedTransformInstanceTypes?: TransformInstanceType[] | undefined;
    /**
     * <p>A list of the instance types that are used to generate inferences in real-time.</p> <p>This parameter is required for unversioned models, and optional for versioned models.</p>
     * @public
     */
    SupportedRealtimeInferenceInstanceTypes?: ProductionVariantInstanceType[] | undefined;
    /**
     * <p>The supported MIME types for the input data.</p>
     * @public
     */
    SupportedContentTypes?: string[] | undefined;
    /**
     * <p>The supported MIME types for the output data.</p>
     * @public
     */
    SupportedResponseMIMETypes?: string[] | undefined;
}
/**
 * <p>Provides summary information about the model package.</p>
 * @public
 */
export interface BatchDescribeModelPackageSummary {
    /**
     * <p>The group name for the model package</p>
     * @public
     */
    ModelPackageGroupName: string | undefined;
    /**
     * <p>The version number of a versioned model.</p>
     * @public
     */
    ModelPackageVersion?: number | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the model package.</p>
     * @public
     */
    ModelPackageArn: string | undefined;
    /**
     * <p>The description of the model package.</p>
     * @public
     */
    ModelPackageDescription?: string | undefined;
    /**
     * <p>The creation time of the mortgage package summary.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>Defines how to perform inference generation after a training job is run.</p>
     * @public
     */
    InferenceSpecification: InferenceSpecification | undefined;
    /**
     * <p>The status of the mortgage package.</p>
     * @public
     */
    ModelPackageStatus: ModelPackageStatus | undefined;
    /**
     * <p>The approval status of the model.</p>
     * @public
     */
    ModelApprovalStatus?: ModelApprovalStatus | undefined;
    /**
     * <p> The package registration type of the model package summary. </p>
     * @public
     */
    ModelPackageRegistrationType?: ModelPackageRegistrationType | undefined;
}
/**
 * @public
 */
export interface BatchDescribeModelPackageOutput {
    /**
     * <p>The summaries for the model package versions</p>
     * @public
     */
    ModelPackageSummaries?: Record<string, BatchDescribeModelPackageSummary> | undefined;
    /**
     * <p>A map of the resource and BatchDescribeModelPackageError objects reporting the error associated with describing the model package.</p>
     * @public
     */
    BatchDescribeModelPackageErrorMap?: Record<string, BatchDescribeModelPackageError> | undefined;
}
/**
 * <p>Represents an error encountered when rebooting a node (identified by its logical node ID) from a SageMaker HyperPod cluster.</p>
 * @public
 */
export interface BatchRebootClusterNodeLogicalIdsError {
    /**
     * <p>The logical node ID of the node that encountered an error during the reboot operation.</p>
     * @public
     */
    NodeLogicalId: string | undefined;
    /**
     * <p>The error code associated with the error encountered when rebooting a node by logical node ID.</p> <p>Possible values:</p> <ul> <li> <p> <code>InstanceIdNotFound</code>: The node does not exist in the specified cluster.</p> </li> <li> <p> <code>InvalidInstanceStatus</code>: The node is in a state that does not allow rebooting. Wait for the node to finish any ongoing changes before retrying.</p> </li> <li> <p> <code>InstanceIdInUse</code>: Another operation is already in progress for this node. Wait for the operation to complete before retrying.</p> </li> <li> <p> <code>InternalServerError</code>: An internal error occurred while processing this node.</p> </li> </ul>
     * @public
     */
    ErrorCode: BatchRebootClusterNodesErrorCode | undefined;
    /**
     * <p>A human-readable message describing the error encountered when rebooting a node by logical node ID.</p>
     * @public
     */
    Message: string | undefined;
}
/**
 * @public
 */
export interface BatchRebootClusterNodesRequest {
    /**
     * <p>The name or Amazon Resource Name (ARN) of the SageMaker HyperPod cluster containing the nodes to reboot.</p>
     * @public
     */
    ClusterName: string | undefined;
    /**
     * <p>A list of EC2 instance IDs to reboot using soft recovery. You can specify between 1 and 25 instance IDs.</p> <note> <ul> <li> <p>Either <code>NodeIds</code> or <code>NodeLogicalIds</code> must be provided (or both), but at least one is required.</p> </li> <li> <p>Each instance ID must follow the pattern <code>i-</code> followed by 17 hexadecimal characters (for example, <code>i-0123456789abcdef0</code>).</p> </li> </ul> </note>
     * @public
     */
    NodeIds?: string[] | undefined;
    /**
     * <p>A list of logical node IDs to reboot using soft recovery. You can specify between 1 and 25 logical node IDs.</p> <p>The <code>NodeLogicalId</code> is a unique identifier that persists throughout the node's lifecycle and can be used to track nodes that are still being provisioned and don't yet have an EC2 instance ID assigned.</p> <important> <ul> <li> <p>This parameter is only supported for clusters using <code>Continuous</code> as the <code>NodeProvisioningMode</code>. For clusters using the default provisioning mode, use <code>NodeIds</code> instead.</p> </li> <li> <p>Either <code>NodeIds</code> or <code>NodeLogicalIds</code> must be provided (or both), but at least one is required.</p> </li> </ul> </important>
     * @public
     */
    NodeLogicalIds?: string[] | undefined;
}
/**
 * <p>Represents an error encountered when rebooting a node from a SageMaker HyperPod cluster.</p>
 * @public
 */
export interface BatchRebootClusterNodesError {
    /**
     * <p>The EC2 instance ID of the node that encountered an error during the reboot operation.</p>
     * @public
     */
    NodeId: string | undefined;
    /**
     * <p>The error code associated with the error encountered when rebooting a node.</p> <p>Possible values:</p> <ul> <li> <p> <code>InstanceIdNotFound</code>: The instance does not exist in the specified cluster.</p> </li> <li> <p> <code>InvalidInstanceStatus</code>: The instance is in a state that does not allow rebooting. Wait for the instance to finish any ongoing changes before retrying.</p> </li> <li> <p> <code>InstanceIdInUse</code>: Another operation is already in progress for this node. Wait for the operation to complete before retrying.</p> </li> <li> <p> <code>InternalServerError</code>: An internal error occurred while processing this node.</p> </li> </ul>
     * @public
     */
    ErrorCode: BatchRebootClusterNodesErrorCode | undefined;
    /**
     * <p>A human-readable message describing the error encountered when rebooting a node.</p>
     * @public
     */
    Message: string | undefined;
}
/**
 * @public
 */
export interface BatchRebootClusterNodesResponse {
    /**
     * <p>A list of EC2 instance IDs for which the reboot operation was successfully initiated.</p>
     * @public
     */
    Successful?: string[] | undefined;
    /**
     * <p>A list of errors encountered for EC2 instance IDs that could not be rebooted. Each error includes the instance ID, an error code, and a descriptive message.</p>
     * @public
     */
    Failed?: BatchRebootClusterNodesError[] | undefined;
    /**
     * <p>A list of errors encountered for logical node IDs that could not be rebooted. Each error includes the logical node ID, an error code, and a descriptive message. This field is only present when <code>NodeLogicalIds</code> were provided in the request.</p>
     * @public
     */
    FailedNodeLogicalIds?: BatchRebootClusterNodeLogicalIdsError[] | undefined;
    /**
     * <p>A list of logical node IDs for which the reboot operation was successfully initiated. This field is only present when <code>NodeLogicalIds</code> were provided in the request.</p>
     * @public
     */
    SuccessfulNodeLogicalIds?: string[] | undefined;
}
/**
 * <p>Represents an error encountered when replacing a node (identified by its logical node ID) in a SageMaker HyperPod cluster.</p>
 * @public
 */
export interface BatchReplaceClusterNodeLogicalIdsError {
    /**
     * <p>The logical node ID of the node that encountered an error during the replacement operation.</p>
     * @public
     */
    NodeLogicalId: string | undefined;
    /**
     * <p>The error code associated with the error encountered when replacing a node by logical node ID.</p> <p>Possible values:</p> <ul> <li> <p> <code>InstanceIdNotFound</code>: The node does not exist in the specified cluster.</p> </li> <li> <p> <code>InvalidInstanceStatus</code>: The node is in a state that does not allow replacement. Wait for the node to finish any ongoing changes before retrying.</p> </li> <li> <p> <code>InstanceIdInUse</code>: Another operation is already in progress for this node. Wait for the operation to complete before retrying.</p> </li> <li> <p> <code>InternalServerError</code>: An internal error occurred while processing this node.</p> </li> </ul>
     * @public
     */
    ErrorCode: BatchReplaceClusterNodesErrorCode | undefined;
    /**
     * <p>A human-readable message describing the error encountered when replacing a node by logical node ID.</p>
     * @public
     */
    Message: string | undefined;
}
/**
 * @public
 */
export interface BatchReplaceClusterNodesRequest {
    /**
     * <p>The name or Amazon Resource Name (ARN) of the SageMaker HyperPod cluster containing the nodes to replace.</p>
     * @public
     */
    ClusterName: string | undefined;
    /**
     * <p>A list of EC2 instance IDs to replace with new hardware. You can specify between 1 and 25 instance IDs.</p> <important> <p>Replace operations destroy all instance volumes (root and secondary). Ensure you have backed up any important data before proceeding.</p> </important> <note> <ul> <li> <p>Either <code>NodeIds</code> or <code>NodeLogicalIds</code> must be provided (or both), but at least one is required.</p> </li> <li> <p>Each instance ID must follow the pattern <code>i-</code> followed by 17 hexadecimal characters (for example, <code>i-0123456789abcdef0</code>).</p> </li> <li> <p>For SageMaker HyperPod clusters using the Slurm workload manager, you cannot replace instances that are configured as Slurm controller nodes.</p> </li> </ul> </note>
     * @public
     */
    NodeIds?: string[] | undefined;
    /**
     * <p>A list of logical node IDs to replace with new hardware. You can specify between 1 and 25 logical node IDs.</p> <p>The <code>NodeLogicalId</code> is a unique identifier that persists throughout the node's lifecycle and can be used to track nodes that are still being provisioned and don't yet have an EC2 instance ID assigned.</p> <important> <ul> <li> <p>Replace operations destroy all instance volumes (root and secondary). Ensure you have backed up any important data before proceeding.</p> </li> <li> <p>This parameter is only supported for clusters using <code>Continuous</code> as the <code>NodeProvisioningMode</code>. For clusters using the default provisioning mode, use <code>NodeIds</code> instead.</p> </li> <li> <p>Either <code>NodeIds</code> or <code>NodeLogicalIds</code> must be provided (or both), but at least one is required.</p> </li> </ul> </important>
     * @public
     */
    NodeLogicalIds?: string[] | undefined;
}
/**
 * <p>Represents an error encountered when replacing a node in a SageMaker HyperPod cluster.</p>
 * @public
 */
export interface BatchReplaceClusterNodesError {
    /**
     * <p>The EC2 instance ID of the node that encountered an error during the replacement operation.</p>
     * @public
     */
    NodeId: string | undefined;
    /**
     * <p>The error code associated with the error encountered when replacing a node.</p> <p>Possible values:</p> <ul> <li> <p> <code>InstanceIdNotFound</code>: The instance does not exist in the specified cluster.</p> </li> <li> <p> <code>InvalidInstanceStatus</code>: The instance is in a state that does not allow replacement. Wait for the instance to finish any ongoing changes before retrying.</p> </li> <li> <p> <code>InstanceIdInUse</code>: Another operation is already in progress for this node. Wait for the operation to complete before retrying.</p> </li> <li> <p> <code>InternalServerError</code>: An internal error occurred while processing this node.</p> </li> </ul>
     * @public
     */
    ErrorCode: BatchReplaceClusterNodesErrorCode | undefined;
    /**
     * <p>A human-readable message describing the error encountered when replacing a node.</p>
     * @public
     */
    Message: string | undefined;
}
/**
 * @public
 */
export interface BatchReplaceClusterNodesResponse {
    /**
     * <p>A list of EC2 instance IDs for which the replacement operation was successfully initiated.</p>
     * @public
     */
    Successful?: string[] | undefined;
    /**
     * <p>A list of errors encountered for EC2 instance IDs that could not be replaced. Each error includes the instance ID, an error code, and a descriptive message.</p>
     * @public
     */
    Failed?: BatchReplaceClusterNodesError[] | undefined;
    /**
     * <p>A list of errors encountered for logical node IDs that could not be replaced. Each error includes the logical node ID, an error code, and a descriptive message. This field is only present when <code>NodeLogicalIds</code> were provided in the request.</p>
     * @public
     */
    FailedNodeLogicalIds?: BatchReplaceClusterNodeLogicalIdsError[] | undefined;
    /**
     * <p>A list of logical node IDs for which the replacement operation was successfully initiated. This field is only present when <code>NodeLogicalIds</code> were provided in the request.</p>
     * @public
     */
    SuccessfulNodeLogicalIds?: string[] | undefined;
}
/**
 * <p>Represents the CSV dataset format used when running a monitoring job.</p>
 * @public
 */
export interface MonitoringCsvDatasetFormat {
    /**
     * <p>Indicates if the CSV data has a header.</p>
     * @public
     */
    Header?: boolean | undefined;
}
/**
 * <p>Represents the JSON dataset format used when running a monitoring job.</p>
 * @public
 */
export interface MonitoringJsonDatasetFormat {
    /**
     * <p>Indicates if the file should be read as a JSON object per line. </p>
     * @public
     */
    Line?: boolean | undefined;
}
/**
 * <p>Represents the Parquet dataset format used when running a monitoring job.</p>
 * @public
 */
export interface MonitoringParquetDatasetFormat {
}
/**
 * <p>Represents the dataset format used when running a monitoring job.</p>
 * @public
 */
export interface MonitoringDatasetFormat {
    /**
     * <p>The CSV dataset used in the monitoring job.</p>
     * @public
     */
    Csv?: MonitoringCsvDatasetFormat | undefined;
    /**
     * <p>The JSON dataset used in the monitoring job</p>
     * @public
     */
    Json?: MonitoringJsonDatasetFormat | undefined;
    /**
     * <p>The Parquet dataset used in the monitoring job</p>
     * @public
     */
    Parquet?: MonitoringParquetDatasetFormat | undefined;
}
/**
 * <p>Input object for the batch transform job.</p>
 * @public
 */
export interface BatchTransformInput {
    /**
     * <p>The Amazon S3 location being used to capture the data.</p>
     * @public
     */
    DataCapturedDestinationS3Uri: string | undefined;
    /**
     * <p>The dataset format for your batch transform job.</p>
     * @public
     */
    DatasetFormat: MonitoringDatasetFormat | undefined;
    /**
     * <p>Path to the filesystem where the batch transform data is available to the container.</p>
     * @public
     */
    LocalPath: string | undefined;
    /**
     * <p>Whether the <code>Pipe</code> or <code>File</code> is used as the input mode for transferring data for the monitoring job. <code>Pipe</code> mode is recommended for large datasets. <code>File</code> mode is useful for small files that fit in memory. Defaults to <code>File</code>.</p>
     * @public
     */
    S3InputMode?: ProcessingS3InputMode | undefined;
    /**
     * <p>Whether input data distributed in Amazon S3 is fully replicated or sharded by an S3 key. Defaults to <code>FullyReplicated</code> </p>
     * @public
     */
    S3DataDistributionType?: ProcessingS3DataDistributionType | undefined;
    /**
     * <p>The attributes of the input data that are the input features.</p>
     * @public
     */
    FeaturesAttribute?: string | undefined;
    /**
     * <p>The attribute of the input data that represents the ground truth label.</p>
     * @public
     */
    InferenceAttribute?: string | undefined;
    /**
     * <p>In a classification problem, the attribute that represents the class probability.</p>
     * @public
     */
    ProbabilityAttribute?: string | undefined;
    /**
     * <p>The threshold for the class probability to be evaluated as a positive result.</p>
     * @public
     */
    ProbabilityThresholdAttribute?: number | undefined;
    /**
     * <p>If specified, monitoring jobs substract this time from the start time. For information about using offsets for scheduling monitoring jobs, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/model-monitor-model-quality-schedule.html">Schedule Model Quality Monitoring Jobs</a>.</p>
     * @public
     */
    StartTimeOffset?: string | undefined;
    /**
     * <p>If specified, monitoring jobs subtract this time from the end time. For information about using offsets for scheduling monitoring jobs, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/model-monitor-model-quality-schedule.html">Schedule Model Quality Monitoring Jobs</a>.</p>
     * @public
     */
    EndTimeOffset?: string | undefined;
    /**
     * <p>The attributes of the input data to exclude from the analysis.</p>
     * @public
     */
    ExcludeFeaturesAttribute?: string | undefined;
}
/**
 * <p> The metadata of the Amazon Bedrock custom model deployment. </p>
 * @public
 */
export interface BedrockCustomModelDeploymentMetadata {
    /**
     * <p> The Amazon Resource Name (ARN) for the Amazon Bedrock custom model deployment. </p>
     * @public
     */
    Arn?: string | undefined;
}
/**
 * <p> The metadata of the Amazon Bedrock custom model. </p>
 * @public
 */
export interface BedrockCustomModelMetadata {
    /**
     * <p> The Amazon Resource Name (ARN) of the Amazon Bedrock custom model. </p>
     * @public
     */
    Arn?: string | undefined;
}
/**
 * <p> The metadata of the Amazon Bedrock model import. </p>
 * @public
 */
export interface BedrockModelImportMetadata {
    /**
     * <p> The Amazon Resource Name (ARN) of the Amazon Bedrock model import. </p>
     * @public
     */
    Arn?: string | undefined;
}
/**
 * <p> The metadata of the Amazon Bedrock provisioned model throughput. </p>
 * @public
 */
export interface BedrockProvisionedModelThroughputMetadata {
    /**
     * <p> The Amazon Resource Name (ARN) of the Amazon Bedrock provisioned model throughput. </p>
     * @public
     */
    Arn?: string | undefined;
}
/**
 * <p>A structure that keeps track of which training jobs launched by your hyperparameter tuning job are not improving model performance as evaluated against an objective function.</p>
 * @public
 */
export interface BestObjectiveNotImproving {
    /**
     * <p>The number of training jobs that have failed to improve model performance by 1% or greater over prior training jobs as evaluated against an objective function.</p>
     * @public
     */
    MaxNumberOfTrainingJobsNotImproving?: number | undefined;
}
/**
 * <p>Details about the metrics source.</p>
 * @public
 */
export interface MetricsSource {
    /**
     * <p>The metric source content type.</p>
     * @public
     */
    ContentType: string | undefined;
    /**
     * <p>The hash key used for the metrics source.</p>
     * @public
     */
    ContentDigest?: string | undefined;
    /**
     * <p>The S3 URI for the metrics source.</p>
     * @public
     */
    S3Uri: string | undefined;
}
/**
 * <p>Contains bias metrics for a model.</p>
 * @public
 */
export interface Bias {
    /**
     * <p>The bias report for a model</p>
     * @public
     */
    Report?: MetricsSource | undefined;
    /**
     * <p>The pre-training bias report for a model.</p>
     * @public
     */
    PreTrainingReport?: MetricsSource | undefined;
    /**
     * <p>The post-training bias report for a model.</p>
     * @public
     */
    PostTrainingReport?: MetricsSource | undefined;
}
/**
 * <p>Specifies the type and size of the endpoint capacity to activate for a blue/green deployment, a rolling deployment, or a rollback strategy. You can specify your batches as either instance count or the overall percentage or your fleet.</p> <p>For a rollback strategy, if you don't specify the fields in this object, or if you set the <code>Value</code> to 100%, then SageMaker uses a blue/green rollback strategy and rolls all traffic back to the blue fleet.</p>
 * @public
 */
export interface CapacitySize {
    /**
     * <p>Specifies the endpoint capacity type.</p> <ul> <li> <p> <code>INSTANCE_COUNT</code>: The endpoint activates based on the number of instances.</p> </li> <li> <p> <code>CAPACITY_PERCENT</code>: The endpoint activates based on the specified percentage of capacity.</p> </li> </ul>
     * @public
     */
    Type: CapacitySizeType | undefined;
    /**
     * <p>Defines the capacity size, either as a number of instances or a capacity percentage.</p>
     * @public
     */
    Value: number | undefined;
}
/**
 * <p>Defines the traffic routing strategy during an endpoint deployment to shift traffic from the old fleet to the new fleet.</p>
 * @public
 */
export interface TrafficRoutingConfig {
    /**
     * <p>Traffic routing strategy type.</p> <ul> <li> <p> <code>ALL_AT_ONCE</code>: Endpoint traffic shifts to the new fleet in a single step. </p> </li> <li> <p> <code>CANARY</code>: Endpoint traffic shifts to the new fleet in two steps. The first step is the canary, which is a small portion of the traffic. The second step is the remainder of the traffic. </p> </li> <li> <p> <code>LINEAR</code>: Endpoint traffic shifts to the new fleet in n steps of a configurable size. </p> </li> </ul>
     * @public
     */
    Type: TrafficRoutingConfigType | undefined;
    /**
     * <p>The waiting time (in seconds) between incremental steps to turn on traffic on the new endpoint fleet.</p>
     * @public
     */
    WaitIntervalInSeconds: number | undefined;
    /**
     * <p>Batch size for the first step to turn on traffic on the new endpoint fleet. <code>Value</code> must be less than or equal to 50% of the variant's total instance count.</p>
     * @public
     */
    CanarySize?: CapacitySize | undefined;
    /**
     * <p>Batch size for each step to turn on traffic on the new endpoint fleet. <code>Value</code> must be 10-50% of the variant's total instance count.</p>
     * @public
     */
    LinearStepSize?: CapacitySize | undefined;
}
/**
 * <p>Update policy for a blue/green deployment. If this update policy is specified, SageMaker creates a new fleet during the deployment while maintaining the old fleet. SageMaker flips traffic to the new fleet according to the specified traffic routing configuration. Only one update policy should be used in the deployment configuration. If no update policy is specified, SageMaker uses a blue/green deployment strategy with all at once traffic shifting by default.</p>
 * @public
 */
export interface BlueGreenUpdatePolicy {
    /**
     * <p>Defines the traffic routing strategy to shift traffic from the old fleet to the new fleet during an endpoint deployment.</p>
     * @public
     */
    TrafficRoutingConfiguration: TrafficRoutingConfig | undefined;
    /**
     * <p>Additional waiting time in seconds after the completion of an endpoint deployment before terminating the old endpoint fleet. Default is 0.</p>
     * @public
     */
    TerminationWaitInSeconds?: number | undefined;
    /**
     * <p>Maximum execution timeout for the deployment. Note that the timeout value should be larger than the total waiting time specified in <code>TerminationWaitInSeconds</code> and <code>WaitIntervalInSeconds</code>.</p>
     * @public
     */
    MaximumExecutionTimeoutInSeconds?: number | undefined;
}
/**
 * <p>Details on the cache hit of a pipeline execution step.</p>
 * @public
 */
export interface CacheHitResult {
    /**
     * <p>The Amazon Resource Name (ARN) of the pipeline execution.</p>
     * @public
     */
    SourcePipelineExecutionArn?: string | undefined;
}
/**
 * <p>An output parameter of a pipeline step.</p>
 * @public
 */
export interface OutputParameter {
    /**
     * <p>The name of the output parameter.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>The value of the output parameter.</p>
     * @public
     */
    Value: string | undefined;
}
/**
 * <p>Metadata about a callback step.</p>
 * @public
 */
export interface CallbackStepMetadata {
    /**
     * <p>The pipeline generated token from the Amazon SQS queue.</p>
     * @public
     */
    CallbackToken?: string | undefined;
    /**
     * <p>The URL of the Amazon Simple Queue Service (Amazon SQS) queue used by the callback step.</p>
     * @public
     */
    SqsQueueUrl?: string | undefined;
    /**
     * <p>A list of the output parameters of the callback step.</p>
     * @public
     */
    OutputParameters?: OutputParameter[] | undefined;
}
/**
 * <p>The model deployment settings for the SageMaker Canvas application.</p> <note> <p>In order to enable model deployment for Canvas, the SageMaker Domain's or user profile's Amazon Web Services IAM execution role must have the <code>AmazonSageMakerCanvasDirectDeployAccess</code> policy attached. You can also turn on model deployment permissions through the SageMaker Domain's or user profile's settings in the SageMaker console.</p> </note>
 * @public
 */
export interface DirectDeploySettings {
    /**
     * <p>Describes whether model deployment permissions are enabled or disabled in the Canvas application.</p>
     * @public
     */
    Status?: FeatureStatus | undefined;
}
/**
 * <p>The settings for running Amazon EMR Serverless jobs in SageMaker Canvas.</p>
 * @public
 */
export interface EmrServerlessSettings {
    /**
     * <p>The Amazon Resource Name (ARN) of the Amazon Web Services IAM role that is assumed for running Amazon EMR Serverless jobs in SageMaker Canvas. This role should have the necessary permissions to read and write data attached and a trust relationship with EMR Serverless.</p>
     * @public
     */
    ExecutionRoleArn?: string | undefined;
    /**
     * <p>Describes whether Amazon EMR Serverless job capabilities are enabled or disabled in the SageMaker Canvas application.</p>
     * @public
     */
    Status?: FeatureStatus | undefined;
}
/**
 * <p>The generative AI settings for the SageMaker Canvas application.</p> <p>Configure these settings for Canvas users starting chats with generative AI foundation models. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/canvas-fm-chat.html"> Use generative AI with foundation models</a>.</p>
 * @public
 */
export interface GenerativeAiSettings {
    /**
     * <p>The ARN of an Amazon Web Services IAM role that allows fine-tuning of large language models (LLMs) in Amazon Bedrock. The IAM role should have Amazon S3 read and write permissions, as well as a trust relationship that establishes <code>bedrock.amazonaws.com</code> as a service principal.</p>
     * @public
     */
    AmazonBedrockRoleArn?: string | undefined;
}
/**
 * <p>The Amazon SageMaker Canvas application setting where you configure OAuth for connecting to an external data source, such as Snowflake.</p>
 * @public
 */
export interface IdentityProviderOAuthSetting {
    /**
     * <p>The name of the data source that you're connecting to. Canvas currently supports OAuth for Snowflake and Salesforce Data Cloud.</p>
     * @public
     */
    DataSourceName?: DataSourceName | undefined;
    /**
     * <p>Describes whether OAuth for a data source is enabled or disabled in the Canvas application.</p>
     * @public
     */
    Status?: FeatureStatus | undefined;
    /**
     * <p>The ARN of an Amazon Web Services Secrets Manager secret that stores the credentials from your identity provider, such as the client ID and secret, authorization URL, and token URL. </p>
     * @public
     */
    SecretArn?: string | undefined;
}
/**
 * <p>The Amazon SageMaker Canvas application setting where you configure document querying.</p>
 * @public
 */
export interface KendraSettings {
    /**
     * <p>Describes whether the document querying feature is enabled or disabled in the Canvas application.</p>
     * @public
     */
    Status?: FeatureStatus | undefined;
}
/**
 * <p>The model registry settings for the SageMaker Canvas application.</p>
 * @public
 */
export interface ModelRegisterSettings {
    /**
     * <p>Describes whether the integration to the model registry is enabled or disabled in the Canvas application.</p>
     * @public
     */
    Status?: FeatureStatus | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the SageMaker model registry account. Required only to register model versions created by a different SageMaker Canvas Amazon Web Services account than the Amazon Web Services account in which SageMaker model registry is set up.</p>
     * @public
     */
    CrossAccountModelRegisterRoleArn?: string | undefined;
}
/**
 * <p>Time series forecast settings for the SageMaker Canvas application.</p>
 * @public
 */
export interface TimeSeriesForecastingSettings {
    /**
     * <p>Describes whether time series forecasting is enabled or disabled in the Canvas application.</p>
     * @public
     */
    Status?: FeatureStatus | undefined;
    /**
     * <p>The IAM role that Canvas passes to Amazon Forecast for time series forecasting. By default, Canvas uses the execution role specified in the <code>UserProfile</code> that launches the Canvas application. If an execution role is not specified in the <code>UserProfile</code>, Canvas uses the execution role specified in the Domain that owns the <code>UserProfile</code>. To allow time series forecasting, this IAM role should have the <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/security-iam-awsmanpol-canvas.html#security-iam-awsmanpol-AmazonSageMakerCanvasForecastAccess"> AmazonSageMakerCanvasForecastAccess</a> policy attached and <code>forecast.amazonaws.com</code> added in the trust relationship as a service principal.</p>
     * @public
     */
    AmazonForecastRoleArn?: string | undefined;
}
/**
 * <p>The workspace settings for the SageMaker Canvas application.</p>
 * @public
 */
export interface WorkspaceSettings {
    /**
     * <p>The Amazon S3 bucket used to store artifacts generated by Canvas. Updating the Amazon S3 location impacts existing configuration settings, and Canvas users no longer have access to their artifacts. Canvas users must log out and log back in to apply the new location.</p>
     * @public
     */
    S3ArtifactPath?: string | undefined;
    /**
     * <p>The Amazon Web Services Key Management Service (KMS) encryption key ID that is used to encrypt artifacts generated by Canvas in the Amazon S3 bucket.</p>
     * @public
     */
    S3KmsKeyId?: string | undefined;
}
/**
 * <p>The SageMaker Canvas application settings.</p>
 * @public
 */
export interface CanvasAppSettings {
    /**
     * <p>Time series forecast settings for the SageMaker Canvas application.</p>
     * @public
     */
    TimeSeriesForecastingSettings?: TimeSeriesForecastingSettings | undefined;
    /**
     * <p>The model registry settings for the SageMaker Canvas application.</p>
     * @public
     */
    ModelRegisterSettings?: ModelRegisterSettings | undefined;
    /**
     * <p>The workspace settings for the SageMaker Canvas application.</p>
     * @public
     */
    WorkspaceSettings?: WorkspaceSettings | undefined;
    /**
     * <p>The settings for connecting to an external data source with OAuth.</p>
     * @public
     */
    IdentityProviderOAuthSettings?: IdentityProviderOAuthSetting[] | undefined;
    /**
     * <p>The model deployment settings for the SageMaker Canvas application.</p>
     * @public
     */
    DirectDeploySettings?: DirectDeploySettings | undefined;
    /**
     * <p>The settings for document querying.</p>
     * @public
     */
    KendraSettings?: KendraSettings | undefined;
    /**
     * <p>The generative AI settings for the SageMaker Canvas application.</p>
     * @public
     */
    GenerativeAiSettings?: GenerativeAiSettings | undefined;
    /**
     * <p>The settings for running Amazon EMR Serverless data processing jobs in SageMaker Canvas.</p>
     * @public
     */
    EmrServerlessSettings?: EmrServerlessSettings | undefined;
}
/**
 * <p>Information about the Capacity Reservation used by an instance or instance group.</p>
 * @public
 */
export interface CapacityReservation {
    /**
     * <p>The Amazon Resource Name (ARN) of the Capacity Reservation.</p>
     * @public
     */
    Arn?: string | undefined;
    /**
     * <p>The type of Capacity Reservation. Valid values are <code>ODCR</code> (On-Demand Capacity Reservation) or <code>CRG</code> (Capacity Reservation Group).</p>
     * @public
     */
    Type?: CapacityReservationType | undefined;
}
/**
 * <p>The configuration of the size measurements of the AMI update. Using this configuration, you can specify whether SageMaker should update your instance group by an amount or percentage of instances.</p>
 * @public
 */
export interface CapacitySizeConfig {
    /**
     * <p>Specifies whether SageMaker should process the update by amount or percentage of instances.</p>
     * @public
     */
    Type: NodeUnavailabilityType | undefined;
    /**
     * <p>Specifies the amount or percentage of instances SageMaker updates at a time.</p>
     * @public
     */
    Value: number | undefined;
}
/**
 * <p>Configuration specifying how to treat different headers. If no headers are specified Amazon SageMaker AI will by default base64 encode when capturing the data.</p>
 * @public
 */
export interface CaptureContentTypeHeader {
    /**
     * <p>The list of all content type headers that Amazon SageMaker AI will treat as CSV and capture accordingly.</p>
     * @public
     */
    CsvContentTypes?: string[] | undefined;
    /**
     * <p>The list of all content type headers that SageMaker AI will treat as JSON and capture accordingly.</p>
     * @public
     */
    JsonContentTypes?: string[] | undefined;
}
/**
 * <p>Specifies data Model Monitor will capture.</p>
 * @public
 */
export interface CaptureOption {
    /**
     * <p>Specify the boundary of data to capture.</p>
     * @public
     */
    CaptureMode: CaptureMode | undefined;
}
/**
 * <p>Environment parameters you want to benchmark your load test against.</p>
 * @public
 */
export interface CategoricalParameter {
    /**
     * <p>The Name of the environment variable.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>The list of values you can pass.</p>
     * @public
     */
    Value: string[] | undefined;
}
/**
 * <p>A list of categorical hyperparameters to tune.</p>
 * @public
 */
export interface CategoricalParameterRange {
    /**
     * <p>The name of the categorical hyperparameter to tune.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>A list of the categories for the hyperparameter.</p>
     * @public
     */
    Values: string[] | undefined;
}
/**
 * <p>Defines the possible values for a categorical hyperparameter.</p>
 * @public
 */
export interface CategoricalParameterRangeSpecification {
    /**
     * <p>The allowed categories for the hyperparameter.</p>
     * @public
     */
    Values: string[] | undefined;
}
/**
 * <p> A key-value pair that represents a parameter for the CloudFormation stack. </p>
 * @public
 */
export interface CfnStackCreateParameter {
    /**
     * <p> The name of the CloudFormation parameter. </p>
     * @public
     */
    Key: string | undefined;
    /**
     * <p> The value of the CloudFormation parameter. </p>
     * @public
     */
    Value?: string | undefined;
}
/**
 * <p> The CloudFormation template provider configuration for creating infrastructure resources. </p>
 * @public
 */
export interface CfnCreateTemplateProvider {
    /**
     * <p> A unique identifier for the template within the project. </p>
     * @public
     */
    TemplateName: string | undefined;
    /**
     * <p> The Amazon S3 URL of the CloudFormation template. </p>
     * @public
     */
    TemplateURL: string | undefined;
    /**
     * <p> The IAM role that CloudFormation assumes when creating the stack. </p>
     * @public
     */
    RoleARN?: string | undefined;
    /**
     * <p> An array of CloudFormation stack parameters.</p>
     * @public
     */
    Parameters?: CfnStackCreateParameter[] | undefined;
}
/**
 * <p> Details about the CloudFormation stack. </p>
 * @public
 */
export interface CfnStackDetail {
    /**
     * <p> The name of the CloudFormation stack. </p>
     * @public
     */
    Name?: string | undefined;
    /**
     * <p> The unique identifier of the CloudFormation stack. </p>
     * @public
     */
    Id?: string | undefined;
    /**
     * <p> A human-readable message about the stack's current status. </p>
     * @public
     */
    StatusMessage: string | undefined;
}
/**
 * <p> A key-value pair representing a parameter used in the CloudFormation stack. </p>
 * @public
 */
export interface CfnStackParameter {
    /**
     * <p> The name of the CloudFormation parameter. </p>
     * @public
     */
    Key: string | undefined;
    /**
     * <p> The value of the CloudFormation parameter. </p>
     * @public
     */
    Value?: string | undefined;
}
/**
 * <p> A key-value pair representing a parameter used in the CloudFormation stack. </p>
 * @public
 */
export interface CfnStackUpdateParameter {
    /**
     * <p> The name of the CloudFormation parameter. </p>
     * @public
     */
    Key: string | undefined;
    /**
     * <p> The value of the CloudFormation parameter. </p>
     * @public
     */
    Value?: string | undefined;
}
/**
 * <p> Details about a CloudFormation template provider configuration and associated provisioning information. </p>
 * @public
 */
export interface CfnTemplateProviderDetail {
    /**
     * <p> The unique identifier of the template within the project. </p>
     * @public
     */
    TemplateName: string | undefined;
    /**
     * <p> The Amazon S3 URL of the CloudFormation template. </p>
     * @public
     */
    TemplateURL: string | undefined;
    /**
     * <p> The IAM role used by CloudFormation to create the stack. </p>
     * @public
     */
    RoleARN?: string | undefined;
    /**
     * <p> An array of CloudFormation stack parameters.</p>
     * @public
     */
    Parameters?: CfnStackParameter[] | undefined;
    /**
     * <p> Information about the CloudFormation stack created by the template provider. </p>
     * @public
     */
    StackDetail?: CfnStackDetail | undefined;
}
/**
 * <p> Contains configuration details for updating an existing CloudFormation template provider in the project. </p>
 * @public
 */
export interface CfnUpdateTemplateProvider {
    /**
     * <p> The unique identifier of the template to update within the project. </p>
     * @public
     */
    TemplateName: string | undefined;
    /**
     * <p> The Amazon S3 URL of the CloudFormation template.</p>
     * @public
     */
    TemplateURL: string | undefined;
    /**
     * <p> An array of CloudFormation stack parameters. </p>
     * @public
     */
    Parameters?: CfnStackUpdateParameter[] | undefined;
}
/**
 * <p>Defines a named input source, called a channel, to be used by an algorithm.</p>
 * @public
 */
export interface ChannelSpecification {
    /**
     * <p>The name of the channel.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>A brief description of the channel.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>Indicates whether the channel is required by the algorithm.</p>
     * @public
     */
    IsRequired?: boolean | undefined;
    /**
     * <p>The supported MIME types for the data.</p>
     * @public
     */
    SupportedContentTypes: string[] | undefined;
    /**
     * <p>The allowed compression types, if data compression is used.</p>
     * @public
     */
    SupportedCompressionTypes?: CompressionType[] | undefined;
    /**
     * <p>The allowed input mode, either FILE or PIPE.</p> <p>In FILE mode, Amazon SageMaker copies the data from the input source onto the local Amazon Elastic Block Store (Amazon EBS) volumes before starting your training algorithm. This is the most commonly used input mode.</p> <p>In PIPE mode, Amazon SageMaker streams input data from the source directly to your algorithm without using the EBS volume.</p>
     * @public
     */
    SupportedInputModes: TrainingInputMode[] | undefined;
}
/**
 * <p>Contains information about the output location for managed spot training checkpoint data. </p>
 * @public
 */
export interface CheckpointConfig {
    /**
     * <p>Identifies the S3 path where you want SageMaker to store checkpoints. For example, <code>s3://bucket-name/key-name-prefix</code>.</p>
     * @public
     */
    S3Uri: string | undefined;
    /**
     * <p>(Optional) The local directory where checkpoints are written. The default directory is <code>/opt/ml/checkpoints/</code>. </p>
     * @public
     */
    LocalPath?: string | undefined;
}
/**
 * <p>The container for the metadata for the ClarifyCheck step. For more information, see the topic on <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/build-and-manage-steps.html#step-type-clarify-check">ClarifyCheck step</a> in the <i>Amazon SageMaker Developer Guide</i>. </p>
 * @public
 */
export interface ClarifyCheckStepMetadata {
    /**
     * <p>The type of the Clarify Check step</p>
     * @public
     */
    CheckType?: string | undefined;
    /**
     * <p>The Amazon S3 URI of baseline constraints file to be used for the drift check.</p>
     * @public
     */
    BaselineUsedForDriftCheckConstraints?: string | undefined;
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
     * <p>The Amazon S3 URI of the violation report if violations are detected.</p>
     * @public
     */
    ViolationReport?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the check processing job that was run by this step's execution.</p>
     * @public
     */
    CheckJobArn?: string | undefined;
    /**
     * <p>This flag indicates if the drift check against the previous baseline will be skipped or not. If it is set to <code>False</code>, the previous baseline of the configured check type must be available.</p>
     * @public
     */
    SkipCheck?: boolean | undefined;
    /**
     * <p>This flag indicates if a newly calculated baseline can be accessed through step properties <code>BaselineUsedForDriftCheckConstraints</code> and <code>BaselineUsedForDriftCheckStatistics</code>. If it is set to <code>False</code>, the previous baseline of the configured check type must also be available. These can be accessed through the <code>BaselineUsedForDriftCheckConstraints</code> property. </p>
     * @public
     */
    RegisterNewBaseline?: boolean | undefined;
}
/**
 * <p>The inference configuration parameter for the model container.</p>
 * @public
 */
export interface ClarifyInferenceConfig {
    /**
     * <p>Provides the JMESPath expression to extract the features from a model container input in JSON Lines format. For example, if <code>FeaturesAttribute</code> is the JMESPath expression <code>'myfeatures'</code>, it extracts a list of features <code>[1,2,3]</code> from request data <code>'\{"myfeatures":[1,2,3]\}'</code>.</p>
     * @public
     */
    FeaturesAttribute?: string | undefined;
    /**
     * <p>A template string used to format a JSON record into an acceptable model container input. For example, a <code>ContentTemplate</code> string <code>'\{"myfeatures":$features\}'</code> will format a list of features <code>[1,2,3]</code> into the record string <code>'\{"myfeatures":[1,2,3]\}'</code>. Required only when the model container input is in JSON Lines format.</p>
     * @public
     */
    ContentTemplate?: string | undefined;
    /**
     * <p>The maximum number of records in a request that the model container can process when querying the model container for the predictions of a <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/clarify-online-explainability-create-endpoint.html#clarify-online-explainability-create-endpoint-synthetic">synthetic dataset</a>. A record is a unit of input data that inference can be made on, for example, a single line in CSV data. If <code>MaxRecordCount</code> is <code>1</code>, the model container expects one record per request. A value of 2 or greater means that the model expects batch requests, which can reduce overhead and speed up the inferencing process. If this parameter is not provided, the explainer will tune the record count per request according to the model container's capacity at runtime.</p>
     * @public
     */
    MaxRecordCount?: number | undefined;
    /**
     * <p>The maximum payload size (MB) allowed of a request from the explainer to the model container. Defaults to <code>6</code> MB.</p>
     * @public
     */
    MaxPayloadInMB?: number | undefined;
    /**
     * <p>A zero-based index used to extract a probability value (score) or list from model container output in CSV format. If this value is not provided, the entire model container output will be treated as a probability value (score) or list.</p> <p> <b>Example for a single class model:</b> If the model container output consists of a string-formatted prediction label followed by its probability: <code>'1,0.6'</code>, set <code>ProbabilityIndex</code> to <code>1</code> to select the probability value <code>0.6</code>.</p> <p> <b>Example for a multiclass model:</b> If the model container output consists of a string-formatted prediction label followed by its probability: <code>'"[\'cat\',\'dog\',\'fish\']","[0.1,0.6,0.3]"'</code>, set <code>ProbabilityIndex</code> to <code>1</code> to select the probability values <code>[0.1,0.6,0.3]</code>.</p>
     * @public
     */
    ProbabilityIndex?: number | undefined;
    /**
     * <p>A zero-based index used to extract a label header or list of label headers from model container output in CSV format.</p> <p> <b>Example for a multiclass model:</b> If the model container output consists of label headers followed by probabilities: <code>'"[\'cat\',\'dog\',\'fish\']","[0.1,0.6,0.3]"'</code>, set <code>LabelIndex</code> to <code>0</code> to select the label headers <code>['cat','dog','fish']</code>.</p>
     * @public
     */
    LabelIndex?: number | undefined;
    /**
     * <p>A JMESPath expression used to extract the probability (or score) from the model container output if the model container is in JSON Lines format.</p> <p> <b>Example</b>: If the model container output of a single request is <code>'\{"predicted_label":1,"probability":0.6\}'</code>, then set <code>ProbabilityAttribute</code> to <code>'probability'</code>.</p>
     * @public
     */
    ProbabilityAttribute?: string | undefined;
    /**
     * <p>A JMESPath expression used to locate the list of label headers in the model container output.</p> <p> <b>Example</b>: If the model container output of a batch request is <code>'\{"labels":["cat","dog","fish"],"probability":[0.6,0.3,0.1]\}'</code>, then set <code>LabelAttribute</code> to <code>'labels'</code> to extract the list of label headers <code>["cat","dog","fish"]</code> </p>
     * @public
     */
    LabelAttribute?: string | undefined;
    /**
     * <p>For multiclass classification problems, the label headers are the names of the classes. Otherwise, the label header is the name of the predicted label. These are used to help readability for the output of the <code>InvokeEndpoint</code> API. See the <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/clarify-online-explainability-invoke-endpoint.html#clarify-online-explainability-response">response</a> section under <b>Invoke the endpoint</b> in the Developer Guide for more information. If there are no label headers in the model container output, provide them manually using this parameter.</p>
     * @public
     */
    LabelHeaders?: string[] | undefined;
    /**
     * <p>The names of the features. If provided, these are included in the endpoint response payload to help readability of the <code>InvokeEndpoint</code> output. See the <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/clarify-online-explainability-invoke-endpoint.html#clarify-online-explainability-response">Response</a> section under <b>Invoke the endpoint</b> in the Developer Guide for more information.</p>
     * @public
     */
    FeatureHeaders?: string[] | undefined;
    /**
     * <p>A list of data types of the features (optional). Applicable only to NLP explainability. If provided, <code>FeatureTypes</code> must have at least one <code>'text'</code> string (for example, <code>['text']</code>). If <code>FeatureTypes</code> is not provided, the explainer infers the feature types based on the baseline data. The feature types are included in the endpoint response payload. For additional information see the <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/clarify-online-explainability-invoke-endpoint.html#clarify-online-explainability-response">response</a> section under <b>Invoke the endpoint</b> in the Developer Guide for more information.</p>
     * @public
     */
    FeatureTypes?: ClarifyFeatureType[] | undefined;
}
/**
 * <p>The configuration for the <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/clarify-feature-attribute-shap-baselines.html">SHAP baseline</a> (also called the background or reference dataset) of the Kernal SHAP algorithm.</p> <note> <ul> <li> <p>The number of records in the baseline data determines the size of the synthetic dataset, which has an impact on latency of explainability requests. For more information, see the <b>Synthetic data</b> of <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/clarify-online-explainability-create-endpoint.html">Configure and create an endpoint</a>.</p> </li> <li> <p> <code>ShapBaseline</code> and <code>ShapBaselineUri</code> are mutually exclusive parameters. One or the either is required to configure a SHAP baseline. </p> </li> </ul> </note>
 * @public
 */
export interface ClarifyShapBaselineConfig {
    /**
     * <p>The MIME type of the baseline data. Choose from <code>'text/csv'</code> or <code>'application/jsonlines'</code>. Defaults to <code>'text/csv'</code>.</p>
     * @public
     */
    MimeType?: string | undefined;
    /**
     * <p>The inline SHAP baseline data in string format. <code>ShapBaseline</code> can have one or multiple records to be used as the baseline dataset. The format of the SHAP baseline file should be the same format as the training dataset. For example, if the training dataset is in CSV format and each record contains four features, and all features are numerical, then the format of the baseline data should also share these characteristics. For natural language processing (NLP) of text columns, the baseline value should be the value used to replace the unit of text specified by the <code>Granularity</code> of the <code>TextConfig</code> parameter. The size limit for <code>ShapBasline</code> is 4 KB. Use the <code>ShapBaselineUri</code> parameter if you want to provide more than 4 KB of baseline data.</p>
     * @public
     */
    ShapBaseline?: string | undefined;
    /**
     * <p>The uniform resource identifier (URI) of the S3 bucket where the SHAP baseline file is stored. The format of the SHAP baseline file should be the same format as the format of the training dataset. For example, if the training dataset is in CSV format, and each record in the training dataset has four features, and all features are numerical, then the baseline file should also have this same format. Each record should contain only the features. If you are using a virtual private cloud (VPC), the <code>ShapBaselineUri</code> should be accessible to the VPC. For more information about setting up endpoints with Amazon Virtual Private Cloud, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/infrastructure-give-access.html">Give SageMaker access to Resources in your Amazon Virtual Private Cloud</a>.</p>
     * @public
     */
    ShapBaselineUri?: string | undefined;
}
/**
 * <p>A parameter used to configure the SageMaker Clarify explainer to treat text features as text so that explanations are provided for individual units of text. Required only for natural language processing (NLP) explainability. </p>
 * @public
 */
export interface ClarifyTextConfig {
    /**
     * <p>Specifies the language of the text features in <a href=" https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes">ISO 639-1</a> or <a href="https://en.wikipedia.org/wiki/ISO_639-3">ISO 639-3</a> code of a supported language. </p> <note> <p>For a mix of multiple languages, use code <code>'xx'</code>.</p> </note>
     * @public
     */
    Language: ClarifyTextLanguage | undefined;
    /**
     * <p>The unit of granularity for the analysis of text features. For example, if the unit is <code>'token'</code>, then each token (like a word in English) of the text is treated as a feature. SHAP values are computed for each unit/feature.</p>
     * @public
     */
    Granularity: ClarifyTextGranularity | undefined;
}
/**
 * <p>The configuration for SHAP analysis using SageMaker Clarify Explainer.</p>
 * @public
 */
export interface ClarifyShapConfig {
    /**
     * <p>The configuration for the SHAP baseline of the Kernal SHAP algorithm.</p>
     * @public
     */
    ShapBaselineConfig: ClarifyShapBaselineConfig | undefined;
    /**
     * <p>The number of samples to be used for analysis by the Kernal SHAP algorithm. </p> <note> <p>The number of samples determines the size of the synthetic dataset, which has an impact on latency of explainability requests. For more information, see the <b>Synthetic data</b> of <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/clarify-online-explainability-create-endpoint.html">Configure and create an endpoint</a>.</p> </note>
     * @public
     */
    NumberOfSamples?: number | undefined;
    /**
     * <p>A Boolean toggle to indicate if you want to use the logit function (true) or log-odds units (false) for model predictions. Defaults to false.</p>
     * @public
     */
    UseLogit?: boolean | undefined;
    /**
     * <p>The starting value used to initialize the random number generator in the explainer. Provide a value for this parameter to obtain a deterministic SHAP result.</p>
     * @public
     */
    Seed?: number | undefined;
    /**
     * <p>A parameter that indicates if text features are treated as text and explanations are provided for individual units of text. Required for natural language processing (NLP) explainability only.</p>
     * @public
     */
    TextConfig?: ClarifyTextConfig | undefined;
}
/**
 * <p>The configuration parameters for the SageMaker Clarify explainer.</p>
 * @public
 */
export interface ClarifyExplainerConfig {
    /**
     * <p>A JMESPath boolean expression used to filter which records to explain. Explanations are activated by default. See <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/clarify-online-explainability-create-endpoint.html#clarify-online-explainability-create-endpoint-enable"> <code>EnableExplanations</code> </a>for additional information.</p>
     * @public
     */
    EnableExplanations?: string | undefined;
    /**
     * <p>The inference configuration parameter for the model container.</p>
     * @public
     */
    InferenceConfig?: ClarifyInferenceConfig | undefined;
    /**
     * <p>The configuration for SHAP analysis.</p>
     * @public
     */
    ShapConfig: ClarifyShapConfig | undefined;
}
/**
 * <p>Specifies the autoscaling configuration for a HyperPod cluster.</p>
 * @public
 */
export interface ClusterAutoScalingConfig {
    /**
     * <p>Describes whether autoscaling is enabled or disabled for the cluster. Valid values are <code>Enable</code> and <code>Disable</code>.</p>
     * @public
     */
    Mode: ClusterAutoScalingMode | undefined;
    /**
     * <p>The type of autoscaler to use. Currently supported value is <code>Karpenter</code>.</p>
     * @public
     */
    AutoScalerType?: ClusterAutoScalerType | undefined;
}
/**
 * <p>The autoscaling configuration and status information for a HyperPod cluster.</p>
 * @public
 */
export interface ClusterAutoScalingConfigOutput {
    /**
     * <p>Describes whether autoscaling is enabled or disabled for the cluster.</p>
     * @public
     */
    Mode: ClusterAutoScalingMode | undefined;
    /**
     * <p>The type of autoscaler configured for the cluster.</p>
     * @public
     */
    AutoScalerType?: ClusterAutoScalerType | undefined;
    /**
     * <p>The current status of the autoscaling configuration. Valid values are <code>InService</code>, <code>Failed</code>, <code>Creating</code>, and <code>Deleting</code>.</p>
     * @public
     */
    Status: ClusterAutoScalingStatus | undefined;
    /**
     * <p>If the autoscaling status is <code>Failed</code>, this field contains a message describing the failure.</p>
     * @public
     */
    FailureMessage?: string | undefined;
}
/**
 * <p>Configuration options specific to On-Demand instances.</p>
 * @public
 */
export interface ClusterOnDemandOptions {
}
/**
 * <p>Configuration options specific to Spot instances.</p>
 * @public
 */
export interface ClusterSpotOptions {
}
/**
 * <p>Defines the instance capacity requirements for an instance group, including configurations for both Spot and On-Demand capacity types. </p>
 * @public
 */
export interface ClusterCapacityRequirements {
    /**
     * <p>Configuration options specific to Spot instances.</p>
     * @public
     */
    Spot?: ClusterSpotOptions | undefined;
    /**
     * <p>Configuration options specific to On-Demand instances.</p>
     * @public
     */
    OnDemand?: ClusterOnDemandOptions | undefined;
}
/**
 * <p>Defines the configuration for attaching an additional Amazon Elastic Block Store (EBS) volume to each instance of the SageMaker HyperPod cluster instance group. To learn more, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-release-notes.html#sagemaker-hyperpod-release-notes-20240620">SageMaker HyperPod release notes: June 20, 2024</a>.</p>
 * @public
 */
export interface ClusterEbsVolumeConfig {
    /**
     * <p>The size in gigabytes (GB) of the additional EBS volume to be attached to the instances in the SageMaker HyperPod cluster instance group. The additional EBS volume is attached to each instance within the SageMaker HyperPod cluster instance group and mounted to <code>/opt/sagemaker</code>.</p>
     * @public
     */
    VolumeSizeInGB?: number | undefined;
    /**
     * <p>The ID of a KMS key to encrypt the Amazon EBS volume.</p>
     * @public
     */
    VolumeKmsKeyId?: string | undefined;
    /**
     * <p>Specifies whether the configuration is for the cluster's root or secondary Amazon EBS volume. You can specify two <code>ClusterEbsVolumeConfig</code> fields to configure both the root and secondary volumes. Set the value to <code>True</code> if you'd like to provide your own customer managed Amazon Web Services KMS key to encrypt the root volume. When <code>True</code>:</p> <ul> <li> <p>The configuration is applied to the root volume.</p> </li> <li> <p>You can't specify the <code>VolumeSizeInGB</code> field. The size of the root volume is determined for you.</p> </li> <li> <p>You must specify a KMS key ID for <code>VolumeKmsKeyId</code> to encrypt the root volume with your own KMS key instead of an Amazon Web Services owned KMS key.</p> </li> </ul> <p>Otherwise, by default, the value is <code>False</code>, and the following applies:</p> <ul> <li> <p>The configuration is applied to the secondary volume, while the root volume is encrypted with an Amazon Web Services owned key.</p> </li> <li> <p>You must specify the <code>VolumeSizeInGB</code> field.</p> </li> <li> <p>You can optionally specify the <code>VolumeKmsKeyId</code> to encrypt the secondary volume with your own KMS key instead of an Amazon Web Services owned KMS key.</p> </li> </ul>
     * @public
     */
    RootVolume?: boolean | undefined;
}
/**
 * <p>Metadata information about a HyperPod cluster showing information about the cluster level operations, such as creating, updating, and deleting.</p>
 * @public
 */
export interface ClusterMetadata {
    /**
     * <p>An error message describing why the cluster level operation (such as creating, updating, or deleting) failed.</p>
     * @public
     */
    FailureMessage?: string | undefined;
    /**
     * <p>A list of Amazon EKS IAM role ARNs associated with the cluster. This is created by HyperPod on your behalf and only applies for EKS orchestrated clusters.</p>
     * @public
     */
    EksRoleAccessEntries?: string[] | undefined;
    /**
     * <p>The Service-Linked Role (SLR) associated with the cluster. This is created by HyperPod on your behalf and only applies for EKS orchestrated clusters.</p>
     * @public
     */
    SlrAccessEntry?: string | undefined;
}
/**
 * <p>Metadata information about an instance in a HyperPod cluster.</p>
 * @public
 */
export interface InstanceMetadata {
    /**
     * <p>The ID of the customer-managed Elastic Network Interface (ENI) associated with the instance.</p>
     * @public
     */
    CustomerEni?: string | undefined;
    /**
     * <p>Information about additional Elastic Network Interfaces (ENIs) associated with the instance.</p>
     * @public
     */
    AdditionalEnis?: AdditionalEnis | undefined;
    /**
     * <p>Information about the Capacity Reservation used by the instance.</p>
     * @public
     */
    CapacityReservation?: CapacityReservation | undefined;
    /**
     * <p>An error message describing why the instance creation or update failed, if applicable.</p>
     * @public
     */
    FailureMessage?: string | undefined;
    /**
     * <p>The execution state of the Lifecycle Script (LCS) for the instance.</p>
     * @public
     */
    LcsExecutionState?: string | undefined;
    /**
     * <p>The unique logical identifier of the node within the cluster. The ID used here is the same object as in the <code>BatchAddClusterNodes</code> API.</p>
     * @public
     */
    NodeLogicalId?: string | undefined;
}
/**
 * <p>Metadata information about an instance group in a HyperPod cluster.</p>
 * @public
 */
export interface InstanceGroupMetadata {
    /**
     * <p>An error message describing why the instance group level operation (such as creating, scaling, or deleting) failed.</p>
     * @public
     */
    FailureMessage?: string | undefined;
    /**
     * <p>The ID of the Availability Zone where the instance group is located.</p>
     * @public
     */
    AvailabilityZoneId?: string | undefined;
    /**
     * <p>Information about the Capacity Reservation used by the instance group.</p>
     * @public
     */
    CapacityReservation?: CapacityReservation | undefined;
    /**
     * <p>The ID of the subnet where the instance group is located.</p>
     * @public
     */
    SubnetId?: string | undefined;
    /**
     * <p>A list of security group IDs associated with the instance group.</p>
     * @public
     */
    SecurityGroupIds?: string[] | undefined;
    /**
     * <p>If you use a custom Amazon Machine Image (AMI) for the instance group, this field shows the ID of the custom AMI.</p>
     * @public
     */
    AmiOverride?: string | undefined;
}
/**
 * <p>Metadata information about scaling operations for an instance group.</p>
 * @public
 */
export interface InstanceGroupScalingMetadata {
    /**
     * <p>The current number of instances in the group.</p>
     * @public
     */
    InstanceCount?: number | undefined;
    /**
     * <p>The desired number of instances for the group after scaling.</p>
     * @public
     */
    TargetCount?: number | undefined;
    /**
     * <p>Minimum instance count of the instance group.</p>
     * @public
     */
    MinCount?: number | undefined;
    /**
     * <p>An error message describing why the scaling operation failed, if applicable.</p>
     * @public
     */
    FailureMessage?: string | undefined;
}
/**
 * <p>Metadata associated with a cluster event, which may include details about various resource types.</p>
 * @public
 */
export type EventMetadata = EventMetadata.ClusterMember | EventMetadata.InstanceMember | EventMetadata.InstanceGroupMember | EventMetadata.InstanceGroupScalingMember | EventMetadata.$UnknownMember;
/**
 * @public
 */
export declare namespace EventMetadata {
    /**
     * <p>Metadata specific to cluster-level events.</p>
     * @public
     */
    interface ClusterMember {
        Cluster: ClusterMetadata;
        InstanceGroup?: never;
        InstanceGroupScaling?: never;
        Instance?: never;
        $unknown?: never;
    }
    /**
     * <p>Metadata specific to instance group-level events.</p>
     * @public
     */
    interface InstanceGroupMember {
        Cluster?: never;
        InstanceGroup: InstanceGroupMetadata;
        InstanceGroupScaling?: never;
        Instance?: never;
        $unknown?: never;
    }
    /**
     * <p>Metadata related to instance group scaling events.</p>
     * @public
     */
    interface InstanceGroupScalingMember {
        Cluster?: never;
        InstanceGroup?: never;
        InstanceGroupScaling: InstanceGroupScalingMetadata;
        Instance?: never;
        $unknown?: never;
    }
    /**
     * <p>Metadata specific to instance-level events.</p>
     * @public
     */
    interface InstanceMember {
        Cluster?: never;
        InstanceGroup?: never;
        InstanceGroupScaling?: never;
        Instance: InstanceMetadata;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        Cluster?: never;
        InstanceGroup?: never;
        InstanceGroupScaling?: never;
        Instance?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        Cluster: (value: ClusterMetadata) => T;
        InstanceGroup: (value: InstanceGroupMetadata) => T;
        InstanceGroupScaling: (value: InstanceGroupScalingMetadata) => T;
        Instance: (value: InstanceMetadata) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>Detailed information about a specific event, including event metadata.</p>
 * @public
 */
export interface EventDetails {
    /**
     * <p>Metadata specific to the event, which may include information about the cluster, instance group, or instance involved.</p>
     * @public
     */
    EventMetadata?: EventMetadata | undefined;
}
/**
 * <p>Detailed information about a specific event in a HyperPod cluster.</p>
 * @public
 */
export interface ClusterEventDetail {
    /**
     * <p>The unique identifier (UUID) of the event.</p>
     * @public
     */
    EventId: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the HyperPod cluster associated with the event.</p>
     * @public
     */
    ClusterArn: string | undefined;
    /**
     * <p>The name of the HyperPod cluster associated with the event.</p>
     * @public
     */
    ClusterName: string | undefined;
    /**
     * <p>The name of the instance group associated with the event, if applicable.</p>
     * @public
     */
    InstanceGroupName?: string | undefined;
    /**
     * <p>The EC2 instance ID associated with the event, if applicable.</p>
     * @public
     */
    InstanceId?: string | undefined;
    /**
     * <p>The type of resource associated with the event. Valid values are <code>Cluster</code>, <code>InstanceGroup</code>, or <code>Instance</code>.</p>
     * @public
     */
    ResourceType: ClusterEventResourceType | undefined;
    /**
     * <p>The timestamp when the event occurred.</p>
     * @public
     */
    EventTime: Date | undefined;
    /**
     * <p>Additional details about the event, including event-specific metadata.</p>
     * @public
     */
    EventDetails?: EventDetails | undefined;
    /**
     * <p>A human-readable description of the event.</p>
     * @public
     */
    Description?: string | undefined;
}
/**
 * <p>A summary of an event in a HyperPod cluster.</p>
 * @public
 */
export interface ClusterEventSummary {
    /**
     * <p>The unique identifier (UUID) of the event.</p>
     * @public
     */
    EventId: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the HyperPod cluster associated with the event.</p>
     * @public
     */
    ClusterArn: string | undefined;
    /**
     * <p>The name of the HyperPod cluster associated with the event.</p>
     * @public
     */
    ClusterName: string | undefined;
    /**
     * <p>The name of the instance group associated with the event, if applicable.</p>
     * @public
     */
    InstanceGroupName?: string | undefined;
    /**
     * <p>The Amazon Elastic Compute Cloud (EC2) instance ID associated with the event, if applicable.</p>
     * @public
     */
    InstanceId?: string | undefined;
    /**
     * <p>The type of resource associated with the event. Valid values are <code>Cluster</code>, <code>InstanceGroup</code>, or <code>Instance</code>.</p>
     * @public
     */
    ResourceType: ClusterEventResourceType | undefined;
    /**
     * <p>The timestamp when the event occurred.</p>
     * @public
     */
    EventTime: Date | undefined;
    /**
     * <p>A brief, human-readable description of the event.</p>
     * @public
     */
    Description?: string | undefined;
}
/**
 * <p>Defines the configuration for attaching an Amazon FSx for Lustre file system to instances in a SageMaker HyperPod cluster instance group.</p>
 * @public
 */
export interface ClusterFsxLustreConfig {
    /**
     * <p>The DNS name of the Amazon FSx for Lustre file system.</p>
     * @public
     */
    DnsName: string | undefined;
    /**
     * <p>The mount name of the Amazon FSx for Lustre file system.</p>
     * @public
     */
    MountName: string | undefined;
    /**
     * <p>The local path where the Amazon FSx for Lustre file system is mounted on instances.</p>
     * @public
     */
    MountPath?: string | undefined;
}
/**
 * <p>Defines the configuration for attaching an Amazon FSx for OpenZFS file system to instances in a SageMaker HyperPod cluster instance group.</p>
 * @public
 */
export interface ClusterFsxOpenZfsConfig {
    /**
     * <p>The DNS name of the Amazon FSx for OpenZFS file system.</p>
     * @public
     */
    DnsName: string | undefined;
    /**
     * <p>The local path where the Amazon FSx for OpenZFS file system is mounted on instances.</p>
     * @public
     */
    MountPath?: string | undefined;
}
/**
 * <p>The configurations that SageMaker uses when updating the AMI versions.</p>
 * @public
 */
export interface RollingDeploymentPolicy {
    /**
     * <p>The maximum amount of instances in the cluster that SageMaker can update at a time.</p>
     * @public
     */
    MaximumBatchSize: CapacitySizeConfig | undefined;
    /**
     * <p>The maximum amount of instances in the cluster that SageMaker can roll back at a time.</p>
     * @public
     */
    RollbackMaximumBatchSize?: CapacitySizeConfig | undefined;
}
/**
 * <p>The configuration to use when updating the AMI versions.</p>
 * @public
 */
export interface DeploymentConfiguration {
    /**
     * <p>The policy that SageMaker uses when updating the AMI versions of the cluster. </p>
     * @public
     */
    RollingUpdatePolicy?: RollingDeploymentPolicy | undefined;
    /**
     * <p>The duration in seconds that SageMaker waits before updating more instances in the cluster.</p>
     * @public
     */
    WaitIntervalInSeconds?: number | undefined;
    /**
     * <p>An array that contains the alarms that SageMaker monitors to know whether to roll back the AMI update.</p>
     * @public
     */
    AutoRollbackConfiguration?: AlarmDetails[] | undefined;
}
/**
 * <p>Defines the configuration for attaching additional storage to the instances in the SageMaker HyperPod cluster instance group. To learn more, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-release-notes.html#sagemaker-hyperpod-release-notes-20240620">SageMaker HyperPod release notes: June 20, 2024</a>.</p>
 * @public
 */
export type ClusterInstanceStorageConfig = ClusterInstanceStorageConfig.EbsVolumeConfigMember | ClusterInstanceStorageConfig.FsxLustreConfigMember | ClusterInstanceStorageConfig.FsxOpenZfsConfigMember | ClusterInstanceStorageConfig.$UnknownMember;
/**
 * @public
 */
export declare namespace ClusterInstanceStorageConfig {
    /**
     * <p>Defines the configuration for attaching additional Amazon Elastic Block Store (EBS) volumes to the instances in the SageMaker HyperPod cluster instance group. The additional EBS volume is attached to each instance within the SageMaker HyperPod cluster instance group and mounted to <code>/opt/sagemaker</code>.</p>
     * @public
     */
    interface EbsVolumeConfigMember {
        EbsVolumeConfig: ClusterEbsVolumeConfig;
        FsxLustreConfig?: never;
        FsxOpenZfsConfig?: never;
        $unknown?: never;
    }
    /**
     * <p>Defines the configuration for attaching an Amazon FSx for Lustre file system to the instances in the SageMaker HyperPod cluster instance group.</p>
     * @public
     */
    interface FsxLustreConfigMember {
        EbsVolumeConfig?: never;
        FsxLustreConfig: ClusterFsxLustreConfig;
        FsxOpenZfsConfig?: never;
        $unknown?: never;
    }
    /**
     * <p>Defines the configuration for attaching an Amazon FSx for OpenZFS file system to the instances in the SageMaker HyperPod cluster instance group.</p>
     * @public
     */
    interface FsxOpenZfsConfigMember {
        EbsVolumeConfig?: never;
        FsxLustreConfig?: never;
        FsxOpenZfsConfig: ClusterFsxOpenZfsConfig;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        EbsVolumeConfig?: never;
        FsxLustreConfig?: never;
        FsxOpenZfsConfig?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        EbsVolumeConfig: (value: ClusterEbsVolumeConfig) => T;
        FsxLustreConfig: (value: ClusterFsxLustreConfig) => T;
        FsxOpenZfsConfig: (value: ClusterFsxOpenZfsConfig) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>A Kubernetes taint that can be applied to cluster nodes.</p>
 * @public
 */
export interface ClusterKubernetesTaint {
    /**
     * <p>The key of the taint.</p>
     * @public
     */
    Key: string | undefined;
    /**
     * <p>The value of the taint.</p>
     * @public
     */
    Value?: string | undefined;
    /**
     * <p>The effect of the taint. Valid values are <code>NoSchedule</code>, <code>PreferNoSchedule</code>, and <code>NoExecute</code>. </p>
     * @public
     */
    Effect: ClusterKubernetesTaintEffect | undefined;
}
/**
 * <p>Detailed Kubernetes configuration showing both the current and desired state of labels and taints for cluster nodes. </p>
 * @public
 */
export interface ClusterKubernetesConfigDetails {
    /**
     * <p>The current labels applied to cluster nodes of an instance group.</p>
     * @public
     */
    CurrentLabels?: Record<string, string> | undefined;
    /**
     * <p>The desired labels to be applied to cluster nodes of an instance group.</p>
     * @public
     */
    DesiredLabels?: Record<string, string> | undefined;
    /**
     * <p>The current taints applied to cluster nodes of an instance group.</p>
     * @public
     */
    CurrentTaints?: ClusterKubernetesTaint[] | undefined;
    /**
     * <p>The desired taints to be applied to cluster nodes of an instance group.</p>
     * @public
     */
    DesiredTaints?: ClusterKubernetesTaint[] | undefined;
}
/**
 * <p>The lifecycle configuration for a SageMaker HyperPod cluster.</p>
 * @public
 */
export interface ClusterLifeCycleConfig {
    /**
     * <p>An Amazon S3 bucket path where your lifecycle scripts are stored.</p> <important> <p>Make sure that the S3 bucket path starts with <code>s3://sagemaker-</code>. The <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-prerequisites.html#sagemaker-hyperpod-prerequisites-iam-role-for-hyperpod">IAM role for SageMaker HyperPod</a> has the managed <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/security-iam-awsmanpol-cluster.html"> <code>AmazonSageMakerClusterInstanceRolePolicy</code> </a> attached, which allows access to S3 buckets with the specific prefix <code>sagemaker-</code>.</p> </important>
     * @public
     */
    SourceS3Uri: string | undefined;
    /**
     * <p>The file name of the entrypoint script of lifecycle scripts under <code>SourceS3Uri</code>. This entrypoint script runs during cluster creation.</p>
     * @public
     */
    OnCreate: string | undefined;
}
/**
 * <p>The configuration object of the schedule that SageMaker follows when updating the AMI.</p>
 * @public
 */
export interface ScheduledUpdateConfig {
    /**
     * <p>A cron expression that specifies the schedule that SageMaker follows when updating the AMI.</p>
     * @public
     */
    ScheduleExpression: string | undefined;
    /**
     * <p>The configuration to use when updating the AMI versions.</p>
     * @public
     */
    DeploymentConfig?: DeploymentConfiguration | undefined;
}
/**
 * <p>The Slurm configuration details for an instance group in a SageMaker HyperPod cluster.</p>
 * @public
 */
export interface ClusterSlurmConfigDetails {
    /**
     * <p>The type of Slurm node for the instance group. Valid values are <code>Controller</code>, <code>Worker</code>, and <code>Login</code>.</p>
     * @public
     */
    NodeType: ClusterSlurmNodeType | undefined;
    /**
     * <p>The list of Slurm partition names that the instance group belongs to.</p>
     * @public
     */
    PartitionNames?: string[] | undefined;
}
/**
 * <p>Details of an instance group in a SageMaker HyperPod cluster.</p>
 * @public
 */
export interface ClusterInstanceGroupDetails {
    /**
     * <p>The number of instances that are currently in the instance group of a SageMaker HyperPod cluster.</p>
     * @public
     */
    CurrentCount?: number | undefined;
    /**
     * <p>The number of instances you specified to add to the instance group of a SageMaker HyperPod cluster.</p>
     * @public
     */
    TargetCount?: number | undefined;
    /**
     * <p>The minimum number of instances that must be available in the instance group of a SageMaker HyperPod cluster before it transitions to <code>InService</code> status. </p>
     * @public
     */
    MinCount?: number | undefined;
    /**
     * <p>The name of the instance group of a SageMaker HyperPod cluster.</p>
     * @public
     */
    InstanceGroupName?: string | undefined;
    /**
     * <p>The instance type of the instance group of a SageMaker HyperPod cluster.</p>
     * @public
     */
    InstanceType?: ClusterInstanceType | undefined;
    /**
     * <p>Details of LifeCycle configuration for the instance group.</p>
     * @public
     */
    LifeCycleConfig?: ClusterLifeCycleConfig | undefined;
    /**
     * <p>The execution role for the instance group to assume.</p>
     * @public
     */
    ExecutionRole?: string | undefined;
    /**
     * <p>The number you specified to <code>TreadsPerCore</code> in <code>CreateCluster</code> for enabling or disabling multithreading. For instance types that support multithreading, you can specify 1 for disabling multithreading and 2 for enabling multithreading. For more information, see the reference table of <a href="https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/cpu-options-supported-instances-values.html">CPU cores and threads per CPU core per instance type</a> in the <i>Amazon Elastic Compute Cloud User Guide</i>.</p>
     * @public
     */
    ThreadsPerCore?: number | undefined;
    /**
     * <p>The additional storage configurations for the instances in the SageMaker HyperPod cluster instance group.</p>
     * @public
     */
    InstanceStorageConfigs?: ClusterInstanceStorageConfig[] | undefined;
    /**
     * <p>A flag indicating whether deep health checks should be performed when the cluster instance group is created or updated.</p>
     * @public
     */
    OnStartDeepHealthChecks?: DeepHealthCheckType[] | undefined;
    /**
     * <p>The current status of the cluster instance group.</p> <ul> <li> <p> <code>InService</code>: The instance group is active and healthy.</p> </li> <li> <p> <code>Creating</code>: The instance group is being provisioned.</p> </li> <li> <p> <code>Updating</code>: The instance group is being updated.</p> </li> <li> <p> <code>Failed</code>: The instance group has failed to provision or is no longer healthy.</p> </li> <li> <p> <code>Degraded</code>: The instance group is degraded, meaning that some instances have failed to provision or are no longer healthy.</p> </li> <li> <p> <code>Deleting</code>: The instance group is being deleted.</p> </li> </ul>
     * @public
     */
    Status?: InstanceGroupStatus | undefined;
    /**
     * <p>The Amazon Resource Name (ARN); of the training plan associated with this cluster instance group.</p> <p>For more information about how to reserve GPU capacity for your SageMaker HyperPod clusters using Amazon SageMaker Training Plan, see <code> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTrainingPlan.html">CreateTrainingPlan</a> </code>.</p>
     * @public
     */
    TrainingPlanArn?: string | undefined;
    /**
     * <p>The current status of the training plan associated with this cluster instance group.</p>
     * @public
     */
    TrainingPlanStatus?: string | undefined;
    /**
     * <p>The customized Amazon VPC configuration at the instance group level that overrides the default Amazon VPC configuration of the SageMaker HyperPod cluster.</p>
     * @public
     */
    OverrideVpcConfig?: VpcConfig | undefined;
    /**
     * <p>The configuration object of the schedule that SageMaker follows when updating the AMI.</p>
     * @public
     */
    ScheduledUpdateConfig?: ScheduledUpdateConfig | undefined;
    /**
     * <p>The ID of the Amazon Machine Image (AMI) currently in use by the instance group.</p>
     * @public
     */
    CurrentImageId?: string | undefined;
    /**
     * <p>The ID of the Amazon Machine Image (AMI) desired for the instance group.</p>
     * @public
     */
    DesiredImageId?: string | undefined;
    /**
     * <p>A map indicating active operations currently in progress for the instance group of a SageMaker HyperPod cluster. When there is a scaling operation in progress, this map contains a key <code>Scaling</code> with value 1. </p>
     * @public
     */
    ActiveOperations?: Partial<Record<ActiveClusterOperationName, number>> | undefined;
    /**
     * <p>The Kubernetes configuration for the instance group that contains labels and taints to be applied for the nodes in this instance group. </p>
     * @public
     */
    KubernetesConfig?: ClusterKubernetesConfigDetails | undefined;
    /**
     * <p>The instance capacity requirements for the instance group.</p>
     * @public
     */
    CapacityRequirements?: ClusterCapacityRequirements | undefined;
    /**
     * <p>Represents the number of running nodes using the desired Image ID.</p> <ol> <li> <p> <b>During software update operations:</b> This count shows the number of nodes running on the desired Image ID. If a rollback occurs, the current image ID and desired image ID (both included in the describe cluster response) swap values. The TargetStateCount then shows the number of nodes running on the newly designated desired image ID (which was previously the current image ID).</p> </li> <li> <p> <b>During simultaneous scaling and software update operations:</b> This count shows the number of instances running on the desired image ID, including any new instances created as part of the scaling request. New nodes are always created using the desired image ID, so TargetStateCount reflects the total count of nodes running on the desired image ID, even during rollback scenarios.</p> </li> </ol>
     * @public
     */
    TargetStateCount?: number | undefined;
    /**
     * <p>Status of the last software udpate request.</p> <p>Status transitions follow these possible sequences:</p> <ul> <li> <p>Pending -&gt; InProgress -&gt; Succeeded</p> </li> <li> <p>Pending -&gt; InProgress -&gt; RollbackInProgress -&gt; RollbackComplete</p> </li> <li> <p>Pending -&gt; InProgress -&gt; RollbackInProgress -&gt; Failed</p> </li> </ul>
     * @public
     */
    SoftwareUpdateStatus?: SoftwareUpdateStatus | undefined;
    /**
     * <p>The configuration to use when updating the AMI versions.</p>
     * @public
     */
    ActiveSoftwareUpdateConfig?: DeploymentConfiguration | undefined;
    /**
     * <p>The Slurm configuration for the instance group.</p>
     * @public
     */
    SlurmConfig?: ClusterSlurmConfigDetails | undefined;
}
/**
 * <p>Kubernetes configuration that specifies labels and taints to be applied to cluster nodes in an instance group. </p>
 * @public
 */
export interface ClusterKubernetesConfig {
    /**
     * <p>Key-value pairs of labels to be applied to cluster nodes.</p>
     * @public
     */
    Labels?: Record<string, string> | undefined;
    /**
     * <p>List of taints to be applied to cluster nodes.</p>
     * @public
     */
    Taints?: ClusterKubernetesTaint[] | undefined;
}
/**
 * <p>The Slurm configuration for an instance group in a SageMaker HyperPod cluster.</p>
 * @public
 */
export interface ClusterSlurmConfig {
    /**
     * <p>The type of Slurm node for the instance group. Valid values are <code>Controller</code>, <code>Worker</code>, and <code>Login</code>.</p>
     * @public
     */
    NodeType: ClusterSlurmNodeType | undefined;
    /**
     * <p>The list of Slurm partition names that the instance group belongs to.</p>
     * @public
     */
    PartitionNames?: string[] | undefined;
}
/**
 * <p>The specifications of an instance group that you need to define.</p>
 * @public
 */
export interface ClusterInstanceGroupSpecification {
    /**
     * <p>Specifies the number of instances to add to the instance group of a SageMaker HyperPod cluster.</p>
     * @public
     */
    InstanceCount: number | undefined;
    /**
     * <p>Defines the minimum number of instances required for an instance group to become <code>InService</code>. If this threshold isn't met within 3 hours, the instance group rolls back to its previous state - zero instances for new instance groups, or previous settings for existing instance groups. <code>MinInstanceCount</code> only affects the initial transition to <code>InService</code> and does not guarantee maintaining this minimum afterward. </p>
     * @public
     */
    MinInstanceCount?: number | undefined;
    /**
     * <p>Specifies the name of the instance group.</p>
     * @public
     */
    InstanceGroupName: string | undefined;
    /**
     * <p>Specifies the instance type of the instance group.</p>
     * @public
     */
    InstanceType: ClusterInstanceType | undefined;
    /**
     * <p>Specifies the LifeCycle configuration for the instance group.</p>
     * @public
     */
    LifeCycleConfig: ClusterLifeCycleConfig | undefined;
    /**
     * <p>Specifies an IAM execution role to be assumed by the instance group.</p>
     * @public
     */
    ExecutionRole: string | undefined;
    /**
     * <p>Specifies the value for <b>Threads per core</b>. For instance types that support multithreading, you can specify <code>1</code> for disabling multithreading and <code>2</code> for enabling multithreading. For instance types that doesn't support multithreading, specify <code>1</code>. For more information, see the reference table of <a href="https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/cpu-options-supported-instances-values.html">CPU cores and threads per CPU core per instance type</a> in the <i>Amazon Elastic Compute Cloud User Guide</i>.</p>
     * @public
     */
    ThreadsPerCore?: number | undefined;
    /**
     * <p>Specifies the additional storage configurations for the instances in the SageMaker HyperPod cluster instance group.</p>
     * @public
     */
    InstanceStorageConfigs?: ClusterInstanceStorageConfig[] | undefined;
    /**
     * <p>A flag indicating whether deep health checks should be performed when the cluster instance group is created or updated.</p>
     * @public
     */
    OnStartDeepHealthChecks?: DeepHealthCheckType[] | undefined;
    /**
     * <p>The Amazon Resource Name (ARN); of the training plan to use for this cluster instance group.</p> <p>For more information about how to reserve GPU capacity for your SageMaker HyperPod clusters using Amazon SageMaker Training Plan, see <code> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTrainingPlan.html">CreateTrainingPlan</a> </code>.</p>
     * @public
     */
    TrainingPlanArn?: string | undefined;
    /**
     * <p>To configure multi-AZ deployments, customize the Amazon VPC configuration at the instance group level. You can specify different subnets and security groups across different AZs in the instance group specification to override a SageMaker HyperPod cluster's default Amazon VPC configuration. For more information about deploying a cluster in multiple AZs, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-prerequisites.html#sagemaker-hyperpod-prerequisites-multiple-availability-zones">Setting up SageMaker HyperPod clusters across multiple AZs</a>.</p> <note> <p>When your Amazon VPC and subnets support IPv6, network communications differ based on the cluster orchestration platform:</p> <ul> <li> <p>Slurm-orchestrated clusters automatically configure nodes with dual IPv6 and IPv4 addresses, allowing immediate IPv6 network communications.</p> </li> <li> <p>In Amazon EKS-orchestrated clusters, nodes receive dual-stack addressing, but pods can only use IPv6 when the Amazon EKS cluster is explicitly IPv6-enabled. For information about deploying an IPv6 Amazon EKS cluster, see <a href="https://docs.aws.amazon.com/eks/latest/userguide/deploy-ipv6-cluster.html#_deploy_an_ipv6_cluster_with_eksctl">Amazon EKS IPv6 Cluster Deployment</a>.</p> </li> </ul> <p>Additional resources for IPv6 configuration:</p> <ul> <li> <p>For information about adding IPv6 support to your VPC, see to <a href="https://docs.aws.amazon.com/vpc/latest/userguide/vpc-migrate-ipv6.html">IPv6 Support for VPC</a>.</p> </li> <li> <p>For information about creating a new IPv6-compatible VPC, see <a href="https://docs.aws.amazon.com/vpc/latest/userguide/create-vpc.html">Amazon VPC Creation Guide</a>.</p> </li> <li> <p>To configure SageMaker HyperPod with a custom Amazon VPC, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-prerequisites.html#sagemaker-hyperpod-prerequisites-optional-vpc">Custom Amazon VPC Setup for SageMaker HyperPod</a>.</p> </li> </ul> </note>
     * @public
     */
    OverrideVpcConfig?: VpcConfig | undefined;
    /**
     * <p>The configuration object of the schedule that SageMaker uses to update the AMI.</p>
     * @public
     */
    ScheduledUpdateConfig?: ScheduledUpdateConfig | undefined;
    /**
     * <p>When configuring your HyperPod cluster, you can specify an image ID using one of the following options:</p> <ul> <li> <p> <code>HyperPodPublicAmiId</code>: Use a HyperPod public AMI</p> </li> <li> <p> <code>CustomAmiId</code>: Use your custom AMI</p> </li> <li> <p> <code>default</code>: Use the default latest system image</p> </li> </ul> <p>If you choose to use a custom AMI (<code>CustomAmiId</code>), ensure it meets the following requirements:</p> <ul> <li> <p>Encryption: The custom AMI must be unencrypted.</p> </li> <li> <p>Ownership: The custom AMI must be owned by the same Amazon Web Services account that is creating the HyperPod cluster.</p> </li> <li> <p>Volume support: Only the primary AMI snapshot volume is supported; additional AMI volumes are not supported.</p> </li> </ul> <p>When updating the instance group's AMI through the <code>UpdateClusterSoftware</code> operation, if an instance group uses a custom AMI, you must provide an <code>ImageId</code> or use the default as input. Note that if you don't specify an instance group in your <code>UpdateClusterSoftware</code> request, then all of the instance groups are patched with the specified image.</p>
     * @public
     */
    ImageId?: string | undefined;
    /**
     * <p>Specifies the Kubernetes configuration for the instance group. You describe what you want the labels and taints to look like, and the cluster works to reconcile the actual state with the declared state for nodes in this instance group. </p>
     * @public
     */
    KubernetesConfig?: ClusterKubernetesConfig | undefined;
    /**
     * <p>Specifies the Slurm configuration for the instance group.</p>
     * @public
     */
    SlurmConfig?: ClusterSlurmConfig | undefined;
    /**
     * <p>Specifies the capacity requirements for the instance group.</p>
     * @public
     */
    CapacityRequirements?: ClusterCapacityRequirements | undefined;
}
/**
 * <p>Specifies the placement details for the node in the SageMaker HyperPod cluster, including the Availability Zone and the unique identifier (ID) of the Availability Zone.</p>
 * @public
 */
export interface ClusterInstancePlacement {
    /**
     * <p>The Availability Zone where the node in the SageMaker HyperPod cluster is launched.</p>
     * @public
     */
    AvailabilityZone?: string | undefined;
    /**
     * <p>The unique identifier (ID) of the Availability Zone where the node in the SageMaker HyperPod cluster is launched.</p>
     * @public
     */
    AvailabilityZoneId?: string | undefined;
}
/**
 * <p>Details of an instance in a SageMaker HyperPod cluster.</p>
 * @public
 */
export interface ClusterInstanceStatusDetails {
    /**
     * <p>The status of an instance in a SageMaker HyperPod cluster.</p>
     * @public
     */
    Status: ClusterInstanceStatus | undefined;
    /**
     * <p>The message from an instance in a SageMaker HyperPod cluster.</p>
     * @public
     */
    Message?: string | undefined;
}
/**
 * <p>Node-specific Kubernetes configuration showing both current and desired state of labels and taints for an individual cluster node. </p>
 * @public
 */
export interface ClusterKubernetesConfigNodeDetails {
    /**
     * <p>The current labels applied to the cluster node.</p>
     * @public
     */
    CurrentLabels?: Record<string, string> | undefined;
    /**
     * <p>The desired labels to be applied to the cluster node.</p>
     * @public
     */
    DesiredLabels?: Record<string, string> | undefined;
    /**
     * <p>The current taints applied to the cluster node.</p>
     * @public
     */
    CurrentTaints?: ClusterKubernetesTaint[] | undefined;
    /**
     * <p>The desired taints to be applied to the cluster node.</p>
     * @public
     */
    DesiredTaints?: ClusterKubernetesTaint[] | undefined;
}
/**
 * <p>Contains information about the UltraServer object.</p>
 * @public
 */
export interface UltraServerInfo {
    /**
     * <p>The unique identifier of the UltraServer.</p>
     * @public
     */
    Id?: string | undefined;
    /**
     * <p>The type of the UltraServer.</p>
     * @public
     */
    Type?: string | undefined;
}
/**
 * <p>Details of an instance (also called a <i>node</i> interchangeably) in a SageMaker HyperPod cluster.</p>
 * @public
 */
export interface ClusterNodeDetails {
    /**
     * <p>The instance group name in which the instance is.</p>
     * @public
     */
    InstanceGroupName?: string | undefined;
    /**
     * <p>The ID of the instance.</p>
     * @public
     */
    InstanceId?: string | undefined;
    /**
     * <p>A unique identifier for the node that persists throughout its lifecycle, from provisioning request to termination. This identifier can be used to track the node even before it has an assigned <code>InstanceId</code>.</p>
     * @public
     */
    NodeLogicalId?: string | undefined;
    /**
     * <p>The status of the instance.</p>
     * @public
     */
    InstanceStatus?: ClusterInstanceStatusDetails | undefined;
    /**
     * <p>The type of the instance.</p>
     * @public
     */
    InstanceType?: ClusterInstanceType | undefined;
    /**
     * <p>The time when the instance is launched.</p>
     * @public
     */
    LaunchTime?: Date | undefined;
    /**
     * <p>The time when the cluster was last updated.</p>
     * @public
     */
    LastSoftwareUpdateTime?: Date | undefined;
    /**
     * <p>The LifeCycle configuration applied to the instance.</p>
     * @public
     */
    LifeCycleConfig?: ClusterLifeCycleConfig | undefined;
    /**
     * <p>The customized Amazon VPC configuration at the instance group level that overrides the default Amazon VPC configuration of the SageMaker HyperPod cluster.</p>
     * @public
     */
    OverrideVpcConfig?: VpcConfig | undefined;
    /**
     * <p>The number of threads per CPU core you specified under <code>CreateCluster</code>.</p>
     * @public
     */
    ThreadsPerCore?: number | undefined;
    /**
     * <p>The configurations of additional storage specified to the instance group where the instance (node) is launched.</p>
     * @public
     */
    InstanceStorageConfigs?: ClusterInstanceStorageConfig[] | undefined;
    /**
     * <p>The private primary IP address of the SageMaker HyperPod cluster node.</p>
     * @public
     */
    PrivatePrimaryIp?: string | undefined;
    /**
     * <p>The private primary IPv6 address of the SageMaker HyperPod cluster node when configured with an Amazon VPC that supports IPv6 and includes subnets with IPv6 addressing enabled in either the cluster Amazon VPC configuration or the instance group Amazon VPC configuration.</p>
     * @public
     */
    PrivatePrimaryIpv6?: string | undefined;
    /**
     * <p>The private DNS hostname of the SageMaker HyperPod cluster node.</p>
     * @public
     */
    PrivateDnsHostname?: string | undefined;
    /**
     * <p>The placement details of the SageMaker HyperPod cluster node.</p>
     * @public
     */
    Placement?: ClusterInstancePlacement | undefined;
    /**
     * <p>The ID of the Amazon Machine Image (AMI) currently in use by the node.</p>
     * @public
     */
    CurrentImageId?: string | undefined;
    /**
     * <p>The ID of the Amazon Machine Image (AMI) desired for the node.</p>
     * @public
     */
    DesiredImageId?: string | undefined;
    /**
     * <p>Contains information about the UltraServer.</p>
     * @public
     */
    UltraServerInfo?: UltraServerInfo | undefined;
    /**
     * <p>The Kubernetes configuration applied to this node, showing both the current and desired state of labels and taints. The cluster works to reconcile the actual state with the declared state. </p>
     * @public
     */
    KubernetesConfig?: ClusterKubernetesConfigNodeDetails | undefined;
    /**
     * <p>The capacity type of the node. Valid values are <code>OnDemand</code> and <code>Spot</code>. When set to <code>OnDemand</code>, the node is launched as an On-Demand instance. When set to <code>Spot</code>, the node is launched as a Spot instance. </p>
     * @public
     */
    CapacityType?: ClusterCapacityType | undefined;
}
/**
 * <p>Lists a summary of the properties of an instance (also called a <i>node</i> interchangeably) of a SageMaker HyperPod cluster.</p>
 * @public
 */
export interface ClusterNodeSummary {
    /**
     * <p>The name of the instance group in which the instance is.</p>
     * @public
     */
    InstanceGroupName: string | undefined;
    /**
     * <p>The ID of the instance.</p>
     * @public
     */
    InstanceId: string | undefined;
    /**
     * <p>A unique identifier for the node that persists throughout its lifecycle, from provisioning request to termination. This identifier can be used to track the node even before it has an assigned <code>InstanceId</code>. This field is only included when <code>IncludeNodeLogicalIds</code> is set to <code>True</code> in the <code>ListClusterNodes</code> request.</p>
     * @public
     */
    NodeLogicalId?: string | undefined;
    /**
     * <p>The type of the instance.</p>
     * @public
     */
    InstanceType: ClusterInstanceType | undefined;
    /**
     * <p>The time when the instance is launched.</p>
     * @public
     */
    LaunchTime: Date | undefined;
    /**
     * <p>The time when SageMaker last updated the software of the instances in the cluster.</p>
     * @public
     */
    LastSoftwareUpdateTime?: Date | undefined;
    /**
     * <p>The status of the instance.</p>
     * @public
     */
    InstanceStatus: ClusterInstanceStatusDetails | undefined;
    /**
     * <p>Contains information about the UltraServer.</p>
     * @public
     */
    UltraServerInfo?: UltraServerInfo | undefined;
    /**
     * <p>The private DNS hostname of the SageMaker HyperPod cluster node.</p>
     * @public
     */
    PrivateDnsHostname?: string | undefined;
}
/**
 * <p>The configuration settings for the Amazon EKS cluster used as the orchestrator for the SageMaker HyperPod cluster.</p>
 * @public
 */
export interface ClusterOrchestratorEksConfig {
    /**
     * <p>The Amazon Resource Name (ARN) of the Amazon EKS cluster associated with the SageMaker HyperPod cluster.</p>
     * @public
     */
    ClusterArn: string | undefined;
}
/**
 * <p>The configuration settings for the Slurm orchestrator used with the SageMaker HyperPod cluster.</p>
 * @public
 */
export interface ClusterOrchestratorSlurmConfig {
    /**
     * <p>The strategy for managing partitions for the Slurm configuration. Valid values are <code>Managed</code>, <code>Overwrite</code>, and <code>Merge</code>.</p>
     * @public
     */
    SlurmConfigStrategy?: ClusterSlurmConfigStrategy | undefined;
}
/**
 * <p>The type of orchestrator used for the SageMaker HyperPod cluster.</p>
 * @public
 */
export interface ClusterOrchestrator {
    /**
     * <p>The Amazon EKS cluster used as the orchestrator for the SageMaker HyperPod cluster.</p>
     * @public
     */
    Eks?: ClusterOrchestratorEksConfig | undefined;
    /**
     * <p>The Slurm orchestrator configuration for the SageMaker HyperPod cluster.</p>
     * @public
     */
    Slurm?: ClusterOrchestratorSlurmConfig | undefined;
}
/**
 * <p>Configuration settings for an Amazon FSx for Lustre file system to be used with the cluster.</p>
 * @public
 */
export interface FSxLustreConfig {
    /**
     * <p>The storage capacity of the Amazon FSx for Lustre file system, specified in gibibytes (GiB).</p>
     * @public
     */
    SizeInGiB: number | undefined;
    /**
     * <p>The throughput capacity of the Amazon FSx for Lustre file system, measured in MB/s per TiB of storage.</p>
     * @public
     */
    PerUnitStorageThroughput: number | undefined;
}
/**
 * <p>The configuration details for the restricted instance groups (RIG) environment.</p>
 * @public
 */
export interface EnvironmentConfigDetails {
    /**
     * <p>Configuration settings for an Amazon FSx for Lustre file system to be used with the cluster.</p>
     * @public
     */
    FSxLustreConfig?: FSxLustreConfig | undefined;
    /**
     * <p>The Amazon S3 path where output data from the restricted instance group (RIG) environment will be stored.</p>
     * @public
     */
    S3OutputPath?: string | undefined;
}
/**
 * <p>The instance group details of the restricted instance group (RIG).</p>
 * @public
 */
export interface ClusterRestrictedInstanceGroupDetails {
    /**
     * <p>The number of instances that are currently in the restricted instance group of a SageMaker HyperPod cluster.</p>
     * @public
     */
    CurrentCount?: number | undefined;
    /**
     * <p>The number of instances you specified to add to the restricted instance group of a SageMaker HyperPod cluster.</p>
     * @public
     */
    TargetCount?: number | undefined;
    /**
     * <p>The name of the restricted instance group of a SageMaker HyperPod cluster.</p>
     * @public
     */
    InstanceGroupName?: string | undefined;
    /**
     * <p>The instance type of the restricted instance group of a SageMaker HyperPod cluster.</p>
     * @public
     */
    InstanceType?: ClusterInstanceType | undefined;
    /**
     * <p>The execution role for the restricted instance group to assume.</p>
     * @public
     */
    ExecutionRole?: string | undefined;
    /**
     * <p>The number you specified to <code>TreadsPerCore</code> in <code>CreateCluster</code> for enabling or disabling multithreading. For instance types that support multithreading, you can specify 1 for disabling multithreading and 2 for enabling multithreading. For more information, see the reference table of <a href="https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/cpu-options-supported-instances-values.html">CPU cores and threads per CPU core per instance type</a> in the <i>Amazon Elastic Compute Cloud User Guide</i>.</p>
     * @public
     */
    ThreadsPerCore?: number | undefined;
    /**
     * <p>The additional storage configurations for the instances in the SageMaker HyperPod cluster restricted instance group.</p>
     * @public
     */
    InstanceStorageConfigs?: ClusterInstanceStorageConfig[] | undefined;
    /**
     * <p>A flag indicating whether deep health checks should be performed when the cluster's restricted instance group is created or updated.</p>
     * @public
     */
    OnStartDeepHealthChecks?: DeepHealthCheckType[] | undefined;
    /**
     * <p>The current status of the cluster's restricted instance group.</p> <ul> <li> <p> <code>InService</code>: The restricted instance group is active and healthy.</p> </li> <li> <p> <code>Creating</code>: The restricted instance group is being provisioned.</p> </li> <li> <p> <code>Updating</code>: The restricted instance group is being updated.</p> </li> <li> <p> <code>Failed</code>: The restricted instance group has failed to provision or is no longer healthy.</p> </li> <li> <p> <code>Degraded</code>: The restricted instance group is degraded, meaning that some instances have failed to provision or are no longer healthy.</p> </li> <li> <p> <code>Deleting</code>: The restricted instance group is being deleted.</p> </li> </ul>
     * @public
     */
    Status?: InstanceGroupStatus | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the training plan to filter clusters by. For more information about reserving GPU capacity for your SageMaker HyperPod clusters using Amazon SageMaker Training Plan, see <code> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTrainingPlan.html">CreateTrainingPlan</a> </code>.</p>
     * @public
     */
    TrainingPlanArn?: string | undefined;
    /**
     * <p>The current status of the training plan associated with this cluster restricted instance group.</p>
     * @public
     */
    TrainingPlanStatus?: string | undefined;
    /**
     * <p>Specifies an Amazon Virtual Private Cloud (VPC) that your SageMaker jobs, hosted models, and compute resources have access to. You can control access to and from your resources by configuring a VPC. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/infrastructure-give-access.html">Give SageMaker Access to Resources in your Amazon VPC</a>. </p>
     * @public
     */
    OverrideVpcConfig?: VpcConfig | undefined;
    /**
     * <p>The configuration object of the schedule that SageMaker follows when updating the AMI.</p>
     * @public
     */
    ScheduledUpdateConfig?: ScheduledUpdateConfig | undefined;
    /**
     * <p>The configuration for the restricted instance groups (RIG) environment.</p>
     * @public
     */
    EnvironmentConfig?: EnvironmentConfigDetails | undefined;
}
/**
 * <p>The configuration for the restricted instance groups (RIG) environment.</p>
 * @public
 */
export interface EnvironmentConfig {
    /**
     * <p>Configuration settings for an Amazon FSx for Lustre file system to be used with the cluster.</p>
     * @public
     */
    FSxLustreConfig?: FSxLustreConfig | undefined;
}
/**
 * <p>The specifications of a restricted instance group that you need to define.</p>
 * @public
 */
export interface ClusterRestrictedInstanceGroupSpecification {
    /**
     * <p>Specifies the number of instances to add to the restricted instance group of a SageMaker HyperPod cluster.</p>
     * @public
     */
    InstanceCount: number | undefined;
    /**
     * <p>Specifies the name of the restricted instance group.</p>
     * @public
     */
    InstanceGroupName: string | undefined;
    /**
     * <p>Specifies the instance type of the restricted instance group.</p>
     * @public
     */
    InstanceType: ClusterInstanceType | undefined;
    /**
     * <p>Specifies an IAM execution role to be assumed by the restricted instance group.</p>
     * @public
     */
    ExecutionRole: string | undefined;
    /**
     * <p>The number you specified to <code>TreadsPerCore</code> in <code>CreateCluster</code> for enabling or disabling multithreading. For instance types that support multithreading, you can specify 1 for disabling multithreading and 2 for enabling multithreading. For more information, see the reference table of <a href="https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/cpu-options-supported-instances-values.html">CPU cores and threads per CPU core per instance type</a> in the <i>Amazon Elastic Compute Cloud User Guide</i>.</p>
     * @public
     */
    ThreadsPerCore?: number | undefined;
    /**
     * <p>Specifies the additional storage configurations for the instances in the SageMaker HyperPod cluster restricted instance group.</p>
     * @public
     */
    InstanceStorageConfigs?: ClusterInstanceStorageConfig[] | undefined;
    /**
     * <p>A flag indicating whether deep health checks should be performed when the cluster restricted instance group is created or updated.</p>
     * @public
     */
    OnStartDeepHealthChecks?: DeepHealthCheckType[] | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the training plan to filter clusters by. For more information about reserving GPU capacity for your SageMaker HyperPod clusters using Amazon SageMaker Training Plan, see <code> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTrainingPlan.html">CreateTrainingPlan</a> </code>.</p>
     * @public
     */
    TrainingPlanArn?: string | undefined;
    /**
     * <p>Specifies an Amazon Virtual Private Cloud (VPC) that your SageMaker jobs, hosted models, and compute resources have access to. You can control access to and from your resources by configuring a VPC. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/infrastructure-give-access.html">Give SageMaker Access to Resources in your Amazon VPC</a>. </p>
     * @public
     */
    OverrideVpcConfig?: VpcConfig | undefined;
    /**
     * <p>The configuration object of the schedule that SageMaker follows when updating the AMI.</p>
     * @public
     */
    ScheduledUpdateConfig?: ScheduledUpdateConfig | undefined;
    /**
     * <p>The configuration for the restricted instance groups (RIG) environment.</p>
     * @public
     */
    EnvironmentConfig: EnvironmentConfig | undefined;
}
/**
 * <p>Summary of the cluster policy.</p>
 * @public
 */
export interface ClusterSchedulerConfigSummary {
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
     * <p>Version of the cluster policy.</p>
     * @public
     */
    ClusterSchedulerConfigVersion?: number | undefined;
    /**
     * <p>Name of the cluster policy.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>Creation time of the cluster policy.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>Last modified time of the cluster policy.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>Status of the cluster policy.</p>
     * @public
     */
    Status: SchedulerResourceStatus | undefined;
    /**
     * <p>ARN of the cluster.</p>
     * @public
     */
    ClusterArn?: string | undefined;
}
/**
 * <p>Lists a summary of the properties of a SageMaker HyperPod cluster.</p>
 * @public
 */
export interface ClusterSummary {
    /**
     * <p>The Amazon Resource Name (ARN) of the SageMaker HyperPod cluster.</p>
     * @public
     */
    ClusterArn: string | undefined;
    /**
     * <p>The name of the SageMaker HyperPod cluster.</p>
     * @public
     */
    ClusterName: string | undefined;
    /**
     * <p>The time when the SageMaker HyperPod cluster is created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The status of the SageMaker HyperPod cluster.</p>
     * @public
     */
    ClusterStatus: ClusterStatus | undefined;
    /**
     * <p>A list of Amazon Resource Names (ARNs) of the training plans associated with this cluster.</p> <p>For more information about how to reserve GPU capacity for your SageMaker HyperPod clusters using Amazon SageMaker Training Plan, see <code> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTrainingPlan.html">CreateTrainingPlan</a> </code>.</p>
     * @public
     */
    TrainingPlanArns?: string[] | undefined;
}
/**
 * <p>Defines the configuration for managed tier checkpointing in a HyperPod cluster. Managed tier checkpointing uses multiple storage tiers, including cluster CPU memory, to provide faster checkpoint operations and improved fault tolerance for large-scale model training. The system automatically saves checkpoints at high frequency to memory and periodically persists them to durable storage, like Amazon S3.</p>
 * @public
 */
export interface ClusterTieredStorageConfig {
    /**
     * <p>Specifies whether managed tier checkpointing is enabled or disabled for the HyperPod cluster. When set to <code>Enable</code>, the system installs a memory management daemon that provides disaggregated memory as a service for checkpoint storage. When set to <code>Disable</code>, the feature is turned off and the memory management daemon is removed from the cluster.</p>
     * @public
     */
    Mode: ClusterConfigMode | undefined;
    /**
     * <p>The percentage (int) of cluster memory to allocate for checkpointing.</p>
     * @public
     */
    InstanceMemoryAllocationPercentage?: number | undefined;
}
/**
 * <p>A custom SageMaker AI image. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/studio-byoi.html">Bring your own SageMaker AI image</a>.</p>
 * @public
 */
export interface CustomImage {
    /**
     * <p>The name of the CustomImage. Must be unique to your account.</p>
     * @public
     */
    ImageName: string | undefined;
    /**
     * <p>The version number of the CustomImage.</p>
     * @public
     */
    ImageVersionNumber?: number | undefined;
    /**
     * <p>The name of the AppImageConfig.</p>
     * @public
     */
    AppImageConfigName: string | undefined;
}
/**
 * <p>The Code Editor application settings.</p> <p>For more information about Code Editor, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/code-editor.html">Get started with Code Editor in Amazon SageMaker</a>.</p>
 * @public
 */
export interface CodeEditorAppSettings {
    /**
     * <p>Specifies the ARN's of a SageMaker AI image and SageMaker AI image version, and the instance type that the version runs on.</p> <note> <p>When both <code>SageMakerImageVersionArn</code> and <code>SageMakerImageArn</code> are passed, <code>SageMakerImageVersionArn</code> is used. Any updates to <code>SageMakerImageArn</code> will not take effect if <code>SageMakerImageVersionArn</code> already exists in the <code>ResourceSpec</code> because <code>SageMakerImageVersionArn</code> always takes precedence. To clear the value set for <code>SageMakerImageVersionArn</code>, pass <code>None</code> as the value.</p> </note>
     * @public
     */
    DefaultResourceSpec?: ResourceSpec | undefined;
    /**
     * <p>A list of custom SageMaker images that are configured to run as a Code Editor app.</p>
     * @public
     */
    CustomImages?: CustomImage[] | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the Code Editor application lifecycle configuration.</p>
     * @public
     */
    LifecycleConfigArns?: string[] | undefined;
    /**
     * <p>Settings that are used to configure and manage the lifecycle of CodeEditor applications.</p>
     * @public
     */
    AppLifecycleManagement?: AppLifecycleManagement | undefined;
    /**
     * <p>The lifecycle configuration that runs before the default lifecycle configuration. It can override changes made in the default lifecycle configuration.</p>
     * @public
     */
    BuiltInLifecycleConfigArn?: string | undefined;
}
/**
 * <p>A Git repository that SageMaker AI automatically displays to users for cloning in the JupyterServer application.</p>
 * @public
 */
export interface CodeRepository {
    /**
     * <p>The URL of the Git repository.</p>
     * @public
     */
    RepositoryUrl: string | undefined;
}
/**
 * <p>Specifies configuration details for a Git repository in your Amazon Web Services account.</p>
 * @public
 */
export interface GitConfig {
    /**
     * <p>The URL where the Git repository is located.</p>
     * @public
     */
    RepositoryUrl: string | undefined;
    /**
     * <p>The default branch for the Git repository.</p>
     * @public
     */
    Branch?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the Amazon Web Services Secrets Manager secret that contains the credentials used to access the git repository. The secret must have a staging label of <code>AWSCURRENT</code> and must be in the following format:</p> <p> <code>\{"username": <i>UserName</i>, "password": <i>Password</i>\}</code> </p>
     * @public
     */
    SecretArn?: string | undefined;
}
/**
 * <p>Specifies summary information about a Git repository.</p>
 * @public
 */
export interface CodeRepositorySummary {
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
     * <p>The date and time that the Git repository was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The date and time that the Git repository was last modified.</p>
     * @public
     */
    LastModifiedTime: Date | undefined;
    /**
     * <p>Configuration details for the Git repository, including the URL where it is located and the ARN of the Amazon Web Services Secrets Manager secret that contains the credentials used to access the repository.</p>
     * @public
     */
    GitConfig?: GitConfig | undefined;
}
/**
 * <p>Use this parameter to configure your Amazon Cognito workforce. A single Cognito workforce is created using and corresponds to a single <a href="https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html"> Amazon Cognito user pool</a>.</p>
 * @public
 */
export interface CognitoConfig {
    /**
     * <p>A <a href="https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html"> user pool</a> is a user directory in Amazon Cognito. With a user pool, your users can sign in to your web or mobile app through Amazon Cognito. Your users can also sign in through social identity providers like Google, Facebook, Amazon, or Apple, and through SAML identity providers.</p>
     * @public
     */
    UserPool: string | undefined;
    /**
     * <p>The client ID for your Amazon Cognito user pool.</p>
     * @public
     */
    ClientId: string | undefined;
}
/**
 * <p>Identifies a Amazon Cognito user group. A user group can be used in on or more work teams.</p>
 * @public
 */
export interface CognitoMemberDefinition {
    /**
     * <p>An identifier for a user pool. The user pool must be in the same region as the service that you are calling.</p>
     * @public
     */
    UserPool: string | undefined;
    /**
     * <p>An identifier for a user group.</p>
     * @public
     */
    UserGroup: string | undefined;
    /**
     * <p>An identifier for an application client. You must create the app client ID using Amazon Cognito.</p>
     * @public
     */
    ClientId: string | undefined;
}
/**
 * <p>Configuration for your vector collection type.</p>
 * @public
 */
export interface VectorConfig {
    /**
     * <p>The number of elements in your vector.</p>
     * @public
     */
    Dimension: number | undefined;
}
/**
 * <p>Configuration for your collection.</p>
 * @public
 */
export type CollectionConfig = CollectionConfig.VectorConfigMember | CollectionConfig.$UnknownMember;
/**
 * @public
 */
export declare namespace CollectionConfig {
    /**
     * <p>Configuration for your vector collection type.</p> <ul> <li> <p> <code>Dimension</code>: The number of elements in your vector.</p> </li> </ul>
     * @public
     */
    interface VectorConfigMember {
        VectorConfig: VectorConfig;
        $unknown?: never;
    }
    /**
     * @public
     */
    interface $UnknownMember {
        VectorConfig?: never;
        $unknown: [string, any];
    }
    /**
     * @deprecated unused in schema-serde mode.
     *
     */
    interface Visitor<T> {
        VectorConfig: (value: VectorConfig) => T;
        _: (name: string, value: any) => T;
    }
}
/**
 * <p>Configuration information for the Amazon SageMaker Debugger output tensor collections.</p>
 * @public
 */
export interface CollectionConfiguration {
    /**
     * <p>The name of the tensor collection. The name must be unique relative to other rule configuration names.</p>
     * @public
     */
    CollectionName?: string | undefined;
    /**
     * <p>Parameter values for the tensor collection. The allowed parameters are <code>"name"</code>, <code>"include_regex"</code>, <code>"reduction_config"</code>, <code>"save_config"</code>, <code>"tensor_names"</code>, and <code>"save_histogram"</code>.</p>
     * @public
     */
    CollectionParameters?: Record<string, string> | undefined;
}
/**
 * <p>A summary of a model compilation job.</p>
 * @public
 */
export interface CompilationJobSummary {
    /**
     * <p>The name of the model compilation job that you want a summary for.</p>
     * @public
     */
    CompilationJobName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the model compilation job.</p>
     * @public
     */
    CompilationJobArn: string | undefined;
    /**
     * <p>The time when the model compilation job was created.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>The time when the model compilation job started.</p>
     * @public
     */
    CompilationStartTime?: Date | undefined;
    /**
     * <p>The time when the model compilation job completed.</p>
     * @public
     */
    CompilationEndTime?: Date | undefined;
    /**
     * <p>The type of device that the model will run on after the compilation job has completed.</p>
     * @public
     */
    CompilationTargetDevice?: TargetDevice | undefined;
    /**
     * <p>The type of OS that the model will run on after the compilation job has completed.</p>
     * @public
     */
    CompilationTargetPlatformOs?: TargetPlatformOs | undefined;
    /**
     * <p>The type of architecture that the model will run on after the compilation job has completed.</p>
     * @public
     */
    CompilationTargetPlatformArch?: TargetPlatformArch | undefined;
    /**
     * <p>The type of accelerator that the model will run on after the compilation job has completed.</p>
     * @public
     */
    CompilationTargetPlatformAccelerator?: TargetPlatformAccelerator | undefined;
    /**
     * <p>The time when the model compilation job was last modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>The status of the model compilation job.</p>
     * @public
     */
    CompilationJobStatus: CompilationJobStatus | undefined;
}
/**
 * <p>Resource sharing configuration.</p>
 * @public
 */
export interface ResourceSharingConfig {
    /**
     * <p>The strategy of how idle compute is shared within the cluster. The following are the options of strategies.</p> <ul> <li> <p> <code>DontLend</code>: entities do not lend idle compute.</p> </li> <li> <p> <code>Lend</code>: entities can lend idle compute to entities that can borrow.</p> </li> <li> <p> <code>LendandBorrow</code>: entities can lend idle compute and borrow idle compute from other entities.</p> </li> </ul> <p>Default is <code>LendandBorrow</code>.</p>
     * @public
     */
    Strategy: ResourceSharingStrategy | undefined;
    /**
     * <p>The limit on how much idle compute can be borrowed.The values can be 1 - 500 percent of idle compute that the team is allowed to borrow.</p> <p>Default is <code>50</code>.</p>
     * @public
     */
    BorrowLimit?: number | undefined;
    /**
     * <p>The absolute limits on compute resources that can be borrowed from idle compute. When specified, these limits define the maximum amount of specific resource types (such as accelerators, vCPU, or memory) that an entity can borrow, regardless of the percentage-based <code>BorrowLimit</code>.</p>
     * @public
     */
    AbsoluteBorrowLimits?: ComputeQuotaResourceConfig[] | undefined;
}
/**
 * <p>Configuration of the compute allocation definition for an entity. This includes the resource sharing option and the setting to preempt low priority tasks.</p>
 * @public
 */
export interface ComputeQuotaConfig {
    /**
     * <p>Allocate compute resources by instance types.</p>
     * @public
     */
    ComputeQuotaResources?: ComputeQuotaResourceConfig[] | undefined;
    /**
     * <p>Resource sharing configuration. This defines how an entity can lend and borrow idle compute with other entities within the cluster.</p>
     * @public
     */
    ResourceSharingConfig?: ResourceSharingConfig | undefined;
    /**
     * <p>Allows workloads from within an entity to preempt same-team workloads. When set to <code>LowerPriority</code>, the entity's lower priority tasks are preempted by their own higher priority tasks.</p> <p>Default is <code>LowerPriority</code>.</p>
     * @public
     */
    PreemptTeamTasks?: PreemptTeamTasks | undefined;
}
/**
 * <p>The target entity to allocate compute resources to.</p>
 * @public
 */
export interface ComputeQuotaTarget {
    /**
     * <p>Name of the team to allocate compute resources to.</p>
     * @public
     */
    TeamName: string | undefined;
    /**
     * <p>Assigned entity fair-share weight. Idle compute will be shared across entities based on these assigned weights. This weight is only used when <code>FairShare</code> is enabled.</p> <p>A weight of 0 is the lowest priority and 100 is the highest. Weight 0 is the default.</p>
     * @public
     */
    FairShareWeight?: number | undefined;
}
/**
 * <p>Summary of the compute allocation definition.</p>
 * @public
 */
export interface ComputeQuotaSummary {
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
     * <p>Version of the compute allocation definition.</p>
     * @public
     */
    ComputeQuotaVersion?: number | undefined;
    /**
     * <p>Status of the compute allocation definition.</p>
     * @public
     */
    Status: SchedulerResourceStatus | undefined;
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
     * <p>Creation time of the compute allocation definition.</p>
     * @public
     */
    CreationTime: Date | undefined;
    /**
     * <p>Last modified time of the compute allocation definition.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
}
/**
 * <p>Metadata for a Condition step.</p>
 * @public
 */
export interface ConditionStepMetadata {
    /**
     * <p>The outcome of the Condition step evaluation.</p>
     * @public
     */
    Outcome?: ConditionOutcome | undefined;
}
/**
 * <p>Specifies an authentication configuration for the private docker registry where your model image is hosted. Specify a value for this property only if you specified <code>Vpc</code> as the value for the <code>RepositoryAccessMode</code> field of the <code>ImageConfig</code> object that you passed to a call to <code>CreateModel</code> and the private Docker registry where the model image is hosted requires authentication.</p>
 * @public
 */
export interface RepositoryAuthConfig {
    /**
     * <p>The Amazon Resource Name (ARN) of an Amazon Web Services Lambda function that provides credentials to authenticate to the private Docker registry where your model image is hosted. For information about how to create an Amazon Web Services Lambda function, see <a href="https://docs.aws.amazon.com/lambda/latest/dg/getting-started-create-function.html">Create a Lambda function with the console</a> in the <i>Amazon Web Services Lambda Developer Guide</i>.</p>
     * @public
     */
    RepositoryCredentialsProviderArn: string | undefined;
}
/**
 * <p>Specifies whether the model container is in Amazon ECR or a private Docker registry accessible from your Amazon Virtual Private Cloud (VPC).</p>
 * @public
 */
export interface ImageConfig {
    /**
     * <p>Set this to one of the following values:</p> <ul> <li> <p> <code>Platform</code> - The model image is hosted in Amazon ECR.</p> </li> <li> <p> <code>Vpc</code> - The model image is hosted in a private Docker registry in your VPC.</p> </li> </ul>
     * @public
     */
    RepositoryAccessMode: RepositoryAccessMode | undefined;
    /**
     * <p>(Optional) Specifies an authentication configuration for the private docker registry where your model image is hosted. Specify a value for this property only if you specified <code>Vpc</code> as the value for the <code>RepositoryAccessMode</code> field, and the private Docker registry where the model image is hosted requires authentication.</p>
     * @public
     */
    RepositoryAuthConfig?: RepositoryAuthConfig | undefined;
}
/**
 * <p>Specifies additional configuration for hosting multi-model endpoints.</p>
 * @public
 */
export interface MultiModelConfig {
    /**
     * <p>Whether to cache models for a multi-model endpoint. By default, multi-model endpoints cache models so that a model does not have to be loaded into memory each time it is invoked. Some use cases do not benefit from model caching. For example, if an endpoint hosts a large number of models that are each invoked infrequently, the endpoint might perform better if you disable model caching. To disable model caching, set the value of this parameter to <code>Disabled</code>.</p>
     * @public
     */
    ModelCacheSetting?: ModelCacheSetting | undefined;
}
/**
 * <p>Describes the container, as part of model definition.</p>
 * @public
 */
export interface ContainerDefinition {
    /**
     * <p>This parameter is ignored for models that contain only a <code>PrimaryContainer</code>.</p> <p>When a <code>ContainerDefinition</code> is part of an inference pipeline, the value of the parameter uniquely identifies the container for the purposes of logging and metrics. For information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/inference-pipeline-logs-metrics.html">Use Logs and Metrics to Monitor an Inference Pipeline</a>. If you don't specify a value for this parameter for a <code>ContainerDefinition</code> that is part of an inference pipeline, a unique name is automatically assigned based on the position of the <code>ContainerDefinition</code> in the pipeline. If you specify a value for the <code>ContainerHostName</code> for any <code>ContainerDefinition</code> that is part of an inference pipeline, you must specify a value for the <code>ContainerHostName</code> parameter of every <code>ContainerDefinition</code> in that pipeline.</p>
     * @public
     */
    ContainerHostname?: string | undefined;
    /**
     * <p>The path where inference code is stored. This can be either in Amazon EC2 Container Registry or in a Docker registry that is accessible from the same VPC that you configure for your endpoint. If you are using your own custom algorithm instead of an algorithm provided by SageMaker, the inference code must meet SageMaker requirements. SageMaker supports both <code>registry/repository[:tag]</code> and <code>registry/repository[@digest]</code> image path formats. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/your-algorithms.html">Using Your Own Algorithms with Amazon SageMaker</a>. </p> <note> <p>The model artifacts in an Amazon S3 bucket and the Docker image for inference container in Amazon EC2 Container Registry must be in the same region as the model or endpoint you are creating.</p> </note>
     * @public
     */
    Image?: string | undefined;
    /**
     * <p>Specifies whether the model container is in Amazon ECR or a private Docker registry accessible from your Amazon Virtual Private Cloud (VPC). For information about storing containers in a private Docker registry, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/your-algorithms-containers-inference-private.html">Use a Private Docker Registry for Real-Time Inference Containers</a>. </p> <note> <p>The model artifacts in an Amazon S3 bucket and the Docker image for inference container in Amazon EC2 Container Registry must be in the same region as the model or endpoint you are creating.</p> </note>
     * @public
     */
    ImageConfig?: ImageConfig | undefined;
    /**
     * <p>Whether the container hosts a single model or multiple models.</p>
     * @public
     */
    Mode?: ContainerMode | undefined;
    /**
     * <p>The S3 path where the model artifacts, which result from model training, are stored. This path must point to a single gzip compressed tar archive (.tar.gz suffix). The S3 path is required for SageMaker built-in algorithms, but not if you use your own algorithms. For more information on built-in algorithms, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-algo-docker-registry-paths.html">Common Parameters</a>. </p> <note> <p>The model artifacts must be in an S3 bucket that is in the same region as the model or endpoint you are creating.</p> </note> <p>If you provide a value for this parameter, SageMaker uses Amazon Web Services Security Token Service to download model artifacts from the S3 path you provide. Amazon Web Services STS is activated in your Amazon Web Services account by default. If you previously deactivated Amazon Web Services STS for a region, you need to reactivate Amazon Web Services STS for that region. For more information, see <a href="https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_enable-regions.html">Activating and Deactivating Amazon Web Services STS in an Amazon Web Services Region</a> in the <i>Amazon Web Services Identity and Access Management User Guide</i>.</p> <important> <p>If you use a built-in algorithm to create a model, SageMaker requires that you provide a S3 path to the model artifacts in <code>ModelDataUrl</code>.</p> </important>
     * @public
     */
    ModelDataUrl?: string | undefined;
    /**
     * <p>Specifies the location of ML model data to deploy.</p> <note> <p>Currently you cannot use <code>ModelDataSource</code> in conjunction with SageMaker batch transform, SageMaker serverless endpoints, SageMaker multi-model endpoints, and SageMaker Marketplace.</p> </note>
     * @public
     */
    ModelDataSource?: ModelDataSource | undefined;
    /**
     * <p>Data sources that are available to your model in addition to the one that you specify for <code>ModelDataSource</code> when you use the <code>CreateModel</code> action.</p>
     * @public
     */
    AdditionalModelDataSources?: AdditionalModelDataSource[] | undefined;
    /**
     * <p>The environment variables to set in the Docker container. Don't include any sensitive data in your environment variables.</p> <p>The maximum length of each key and value in the <code>Environment</code> map is 1024 bytes. The maximum length of all keys and values in the map, combined, is 32 KB. If you pass multiple containers to a <code>CreateModel</code> request, then the maximum length of all of their maps, combined, is also 32 KB.</p>
     * @public
     */
    Environment?: Record<string, string> | undefined;
    /**
     * <p>The name or Amazon Resource Name (ARN) of the model package to use to create the model.</p>
     * @public
     */
    ModelPackageName?: string | undefined;
    /**
     * <p>The inference specification name in the model package version.</p>
     * @public
     */
    InferenceSpecificationName?: string | undefined;
    /**
     * <p>Specifies additional configuration for multi-model endpoints.</p>
     * @public
     */
    MultiModelConfig?: MultiModelConfig | undefined;
}
/**
 * <p>A structure describing the source of a context.</p>
 * @public
 */
export interface ContextSource {
    /**
     * <p>The URI of the source.</p>
     * @public
     */
    SourceUri: string | undefined;
    /**
     * <p>The type of the source.</p>
     * @public
     */
    SourceType?: string | undefined;
    /**
     * <p>The ID of the source.</p>
     * @public
     */
    SourceId?: string | undefined;
}
/**
 * <p>Lists a summary of the properties of a context. A context provides a logical grouping of other entities.</p>
 * @public
 */
export interface ContextSummary {
    /**
     * <p>The Amazon Resource Name (ARN) of the context.</p>
     * @public
     */
    ContextArn?: string | undefined;
    /**
     * <p>The name of the context.</p>
     * @public
     */
    ContextName?: string | undefined;
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
     * <p>When the context was created.</p>
     * @public
     */
    CreationTime?: Date | undefined;
    /**
     * <p>When the context was last modified.</p>
     * @public
     */
    LastModifiedTime?: Date | undefined;
}
/**
 * <p>A list of continuous hyperparameters to tune.</p>
 * @public
 */
export interface ContinuousParameterRange {
    /**
     * <p>The name of the continuous hyperparameter to tune.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>The minimum value for the hyperparameter. The tuning job uses floating-point values between this value and <code>MaxValue</code>for tuning.</p>
     * @public
     */
    MinValue: string | undefined;
    /**
     * <p>The maximum value for the hyperparameter. The tuning job uses floating-point values between <code>MinValue</code> value and this value for tuning.</p>
     * @public
     */
    MaxValue: string | undefined;
    /**
     * <p>The scale that hyperparameter tuning uses to search the hyperparameter range. For information about choosing a hyperparameter scale, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/automatic-model-tuning-define-ranges.html#scaling-type">Hyperparameter Scaling</a>. One of the following values:</p> <dl> <dt>Auto</dt> <dd> <p>SageMaker hyperparameter tuning chooses the best scale for the hyperparameter.</p> </dd> <dt>Linear</dt> <dd> <p>Hyperparameter tuning searches the values in the hyperparameter range by using a linear scale.</p> </dd> <dt>Logarithmic</dt> <dd> <p>Hyperparameter tuning searches the values in the hyperparameter range by using a logarithmic scale.</p> <p>Logarithmic scaling works only for ranges that have only values greater than 0.</p> </dd> <dt>ReverseLogarithmic</dt> <dd> <p>Hyperparameter tuning searches the values in the hyperparameter range by using a reverse logarithmic scale.</p> <p>Reverse logarithmic scaling works only for ranges that are entirely within the range 0&lt;=x&lt;1.0.</p> </dd> </dl>
     * @public
     */
    ScalingType?: HyperParameterScalingType | undefined;
}
/**
 * <p>Defines the possible values for a continuous hyperparameter.</p>
 * @public
 */
export interface ContinuousParameterRangeSpecification {
    /**
     * <p>The minimum floating-point value allowed.</p>
     * @public
     */
    MinValue: string | undefined;
    /**
     * <p>The maximum floating-point value allowed.</p>
     * @public
     */
    MaxValue: string | undefined;
}
/**
 * <p>A flag to indicating that automatic model tuning (AMT) has detected model convergence, defined as a lack of significant improvement (1% or less) against an objective metric.</p>
 * @public
 */
export interface ConvergenceDetected {
    /**
     * <p>A flag to stop a tuning job once AMT has detected that the job has converged.</p>
     * @public
     */
    CompleteOnConvergence?: CompleteOnConvergence | undefined;
}
/**
 * <p>Metadata properties of the tracking entity, trial, or trial component.</p>
 * @public
 */
export interface MetadataProperties {
    /**
     * <p>The commit ID.</p>
     * @public
     */
    CommitId?: string | undefined;
    /**
     * <p>The repository.</p>
     * @public
     */
    Repository?: string | undefined;
    /**
     * <p>The entity this entity was generated by.</p>
     * @public
     */
    GeneratedBy?: string | undefined;
    /**
     * <p>The project ID.</p>
     * @public
     */
    ProjectId?: string | undefined;
}
/**
 * @public
 */
export interface CreateActionRequest {
    /**
     * <p>The name of the action. Must be unique to your account in an Amazon Web Services Region.</p>
     * @public
     */
    ActionName: string | undefined;
    /**
     * <p>The source type, ID, and URI.</p>
     * @public
     */
    Source: ActionSource | undefined;
    /**
     * <p>The action type.</p>
     * @public
     */
    ActionType: string | undefined;
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
     * <p>A list of properties to add to the action.</p>
     * @public
     */
    Properties?: Record<string, string> | undefined;
    /**
     * <p>Metadata properties of the tracking entity, trial, or trial component.</p>
     * @public
     */
    MetadataProperties?: MetadataProperties | undefined;
    /**
     * <p>A list of tags to apply to the action.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * @public
 */
export interface CreateActionResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the action.</p>
     * @public
     */
    ActionArn?: string | undefined;
}
/**
 * <p>Defines the possible values for an integer hyperparameter.</p>
 * @public
 */
export interface IntegerParameterRangeSpecification {
    /**
     * <p>The minimum integer value allowed.</p>
     * @public
     */
    MinValue: string | undefined;
    /**
     * <p>The maximum integer value allowed.</p>
     * @public
     */
    MaxValue: string | undefined;
}
/**
 * <p>Defines the possible values for categorical, continuous, and integer hyperparameters to be used by an algorithm.</p>
 * @public
 */
export interface ParameterRange {
    /**
     * <p>A <code>IntegerParameterRangeSpecification</code> object that defines the possible values for an integer hyperparameter.</p>
     * @public
     */
    IntegerParameterRangeSpecification?: IntegerParameterRangeSpecification | undefined;
    /**
     * <p>A <code>ContinuousParameterRangeSpecification</code> object that defines the possible values for a continuous hyperparameter.</p>
     * @public
     */
    ContinuousParameterRangeSpecification?: ContinuousParameterRangeSpecification | undefined;
    /**
     * <p>A <code>CategoricalParameterRangeSpecification</code> object that defines the possible values for a categorical hyperparameter.</p>
     * @public
     */
    CategoricalParameterRangeSpecification?: CategoricalParameterRangeSpecification | undefined;
}
/**
 * <p>Defines a hyperparameter to be used by an algorithm.</p>
 * @public
 */
export interface HyperParameterSpecification {
    /**
     * <p>The name of this hyperparameter. The name must be unique.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>A brief description of the hyperparameter.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>The type of this hyperparameter. The valid types are <code>Integer</code>, <code>Continuous</code>, <code>Categorical</code>, and <code>FreeText</code>.</p>
     * @public
     */
    Type: ParameterType | undefined;
    /**
     * <p>The allowed range for this hyperparameter.</p>
     * @public
     */
    Range?: ParameterRange | undefined;
    /**
     * <p>Indicates whether this hyperparameter is tunable in a hyperparameter tuning job.</p>
     * @public
     */
    IsTunable?: boolean | undefined;
    /**
     * <p>Indicates whether this hyperparameter is required.</p>
     * @public
     */
    IsRequired?: boolean | undefined;
    /**
     * <p>The default value for this hyperparameter. If a default value is specified, a hyperparameter cannot be required.</p>
     * @public
     */
    DefaultValue?: string | undefined;
}
/**
 * <p>Defines the objective metric for a hyperparameter tuning job. Hyperparameter tuning uses the value of this metric to evaluate the training jobs it launches, and returns the training job that results in either the highest or lowest value for this metric, depending on the value you specify for the <code>Type</code> parameter. If you want to define a custom objective metric, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/automatic-model-tuning-define-metrics-variables.html">Define metrics and environment variables</a>.</p>
 * @public
 */
export interface HyperParameterTuningJobObjective {
    /**
     * <p>Whether to minimize or maximize the objective metric.</p>
     * @public
     */
    Type: HyperParameterTuningJobObjectiveType | undefined;
    /**
     * <p>The name of the metric to use for the objective metric.</p>
     * @public
     */
    MetricName: string | undefined;
}
/**
 * <p>Defines how the algorithm is used for a training job.</p>
 * @public
 */
export interface TrainingSpecification {
    /**
     * <p>The Amazon ECR registry path of the Docker image that contains the training algorithm.</p>
     * @public
     */
    TrainingImage: string | undefined;
    /**
     * <p>An MD5 hash of the training algorithm that identifies the Docker image used for training.</p>
     * @public
     */
    TrainingImageDigest?: string | undefined;
    /**
     * <p>A list of the <code>HyperParameterSpecification</code> objects, that define the supported hyperparameters. This is required if the algorithm supports automatic model tuning.&gt;</p>
     * @public
     */
    SupportedHyperParameters?: HyperParameterSpecification[] | undefined;
    /**
     * <p>A list of the instance types that this algorithm can use for training.</p>
     * @public
     */
    SupportedTrainingInstanceTypes: TrainingInstanceType[] | undefined;
    /**
     * <p>Indicates whether the algorithm supports distributed training. If set to false, buyers can't request more than one instance during training.</p>
     * @public
     */
    SupportsDistributedTraining?: boolean | undefined;
    /**
     * <p>A list of <code>MetricDefinition</code> objects, which are used for parsing metrics generated by the algorithm.</p>
     * @public
     */
    MetricDefinitions?: MetricDefinition[] | undefined;
    /**
     * <p>A list of <code>ChannelSpecification</code> objects, which specify the input sources to be used by the algorithm.</p>
     * @public
     */
    TrainingChannels: ChannelSpecification[] | undefined;
    /**
     * <p>A list of the metrics that the algorithm emits that can be used as the objective metric in a hyperparameter tuning job.</p>
     * @public
     */
    SupportedTuningJobObjectiveMetrics?: HyperParameterTuningJobObjective[] | undefined;
    /**
     * <p>The additional data source used during the training job.</p>
     * @public
     */
    AdditionalS3DataSource?: AdditionalS3DataSource | undefined;
}
/**
 * @public
 */
export interface CreateAlgorithmInput {
    /**
     * <p>The name of the algorithm.</p>
     * @public
     */
    AlgorithmName: string | undefined;
    /**
     * <p>A description of the algorithm.</p>
     * @public
     */
    AlgorithmDescription?: string | undefined;
    /**
     * <p>Specifies details about training jobs run by this algorithm, including the following:</p> <ul> <li> <p>The Amazon ECR path of the container and the version digest of the algorithm.</p> </li> <li> <p>The hyperparameters that the algorithm supports.</p> </li> <li> <p>The instance types that the algorithm supports for training.</p> </li> <li> <p>Whether the algorithm supports distributed training.</p> </li> <li> <p>The metrics that the algorithm emits to Amazon CloudWatch.</p> </li> <li> <p>Which metrics that the algorithm emits can be used as the objective metric for hyperparameter tuning jobs.</p> </li> <li> <p>The input channels that the algorithm supports for training data. For example, an algorithm might support <code>train</code>, <code>validation</code>, and <code>test</code> channels.</p> </li> </ul>
     * @public
     */
    TrainingSpecification: TrainingSpecification | undefined;
    /**
     * <p>Specifies details about inference jobs that the algorithm runs, including the following:</p> <ul> <li> <p>The Amazon ECR paths of containers that contain the inference code and model artifacts.</p> </li> <li> <p>The instance types that the algorithm supports for transform jobs and real-time endpoints used for inference.</p> </li> <li> <p>The input and output content formats that the algorithm supports for inference.</p> </li> </ul>
     * @public
     */
    InferenceSpecification?: InferenceSpecification | undefined;
    /**
     * <p>Specifies configurations for one or more training jobs and that SageMaker runs to test the algorithm's training code and, optionally, one or more batch transform jobs that SageMaker runs to test the algorithm's inference code.</p>
     * @public
     */
    ValidationSpecification?: AlgorithmValidationSpecification | undefined;
    /**
     * <p>Whether to certify the algorithm so that it can be listed in Amazon Web Services Marketplace.</p>
     * @public
     */
    CertifyForMarketplace?: boolean | undefined;
    /**
     * <p>An array of key-value pairs. You can use tags to categorize your Amazon Web Services resources in different ways, for example, by purpose, owner, or environment. For more information, see <a href="https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html">Tagging Amazon Web Services Resources</a>.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * @public
 */
export interface CreateAlgorithmOutput {
    /**
     * <p>The Amazon Resource Name (ARN) of the new algorithm.</p>
     * @public
     */
    AlgorithmArn: string | undefined;
}
/**
 * @public
 */
export interface CreateAppRequest {
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
    /**
     * <p>Each tag consists of a key and an optional value. Tag keys must be unique per resource.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>The instance type and the Amazon Resource Name (ARN) of the SageMaker AI image created on the instance.</p> <note> <p>The value of <code>InstanceType</code> passed as part of the <code>ResourceSpec</code> in the <code>CreateApp</code> call overrides the value passed as part of the <code>ResourceSpec</code> configured for the user profile or the domain. If <code>InstanceType</code> is not specified in any of those three <code>ResourceSpec</code> values for a <code>KernelGateway</code> app, the <code>CreateApp</code> call fails with a request validation error.</p> </note>
     * @public
     */
    ResourceSpec?: ResourceSpec | undefined;
    /**
     * <p> Indicates whether the application is launched in recovery mode. </p>
     * @public
     */
    RecoveryMode?: boolean | undefined;
}
/**
 * @public
 */
export interface CreateAppResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the app.</p>
     * @public
     */
    AppArn?: string | undefined;
}
/**
 * @public
 */
export interface CreateAppImageConfigRequest {
    /**
     * <p>The name of the AppImageConfig. Must be unique to your account.</p>
     * @public
     */
    AppImageConfigName: string | undefined;
    /**
     * <p>A list of tags to apply to the AppImageConfig.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>The KernelGatewayImageConfig. You can only specify one image kernel in the AppImageConfig API. This kernel will be shown to users before the image starts. Once the image runs, all kernels are visible in JupyterLab.</p>
     * @public
     */
    KernelGatewayImageConfig?: KernelGatewayImageConfig | undefined;
    /**
     * <p>The <code>JupyterLabAppImageConfig</code>. You can only specify one image kernel in the <code>AppImageConfig</code> API. This kernel is shown to users before the image starts. After the image runs, all kernels are visible in JupyterLab.</p>
     * @public
     */
    JupyterLabAppImageConfig?: JupyterLabAppImageConfig | undefined;
    /**
     * <p>The <code>CodeEditorAppImageConfig</code>. You can only specify one image kernel in the AppImageConfig API. This kernel is shown to users before the image starts. After the image runs, all kernels are visible in Code Editor.</p>
     * @public
     */
    CodeEditorAppImageConfig?: CodeEditorAppImageConfig | undefined;
}
/**
 * @public
 */
export interface CreateAppImageConfigResponse {
    /**
     * <p>The ARN of the AppImageConfig.</p>
     * @public
     */
    AppImageConfigArn?: string | undefined;
}
/**
 * @public
 */
export interface CreateArtifactRequest {
    /**
     * <p>The name of the artifact. Must be unique to your account in an Amazon Web Services Region.</p>
     * @public
     */
    ArtifactName?: string | undefined;
    /**
     * <p>The ID, ID type, and URI of the source.</p>
     * @public
     */
    Source: ArtifactSource | undefined;
    /**
     * <p>The artifact type.</p>
     * @public
     */
    ArtifactType: string | undefined;
    /**
     * <p>A list of properties to add to the artifact.</p>
     * @public
     */
    Properties?: Record<string, string> | undefined;
    /**
     * <p>Metadata properties of the tracking entity, trial, or trial component.</p>
     * @public
     */
    MetadataProperties?: MetadataProperties | undefined;
    /**
     * <p>A list of tags to apply to the artifact.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * @public
 */
export interface CreateArtifactResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the artifact.</p>
     * @public
     */
    ArtifactArn?: string | undefined;
}
/**
 * <p>Specifies how to generate the endpoint name for an automatic one-click Autopilot model deployment.</p>
 * @public
 */
export interface ModelDeployConfig {
    /**
     * <p>Set to <code>True</code> to automatically generate an endpoint name for a one-click Autopilot model deployment; set to <code>False</code> otherwise. The default value is <code>False</code>.</p> <note> <p>If you set <code>AutoGenerateEndpointName</code> to <code>True</code>, do not specify the <code>EndpointName</code>; otherwise a 400 error is thrown.</p> </note>
     * @public
     */
    AutoGenerateEndpointName?: boolean | undefined;
    /**
     * <p>Specifies the endpoint name to use for a one-click Autopilot model deployment if the endpoint name is not generated automatically.</p> <note> <p>Specify the <code>EndpointName</code> if and only if you set <code>AutoGenerateEndpointName</code> to <code>False</code>; otherwise a 400 error is thrown.</p> </note>
     * @public
     */
    EndpointName?: string | undefined;
}
/**
 * @public
 */
export interface CreateAutoMLJobRequest {
    /**
     * <p>Identifies an Autopilot job. The name must be unique to your account and is case insensitive.</p>
     * @public
     */
    AutoMLJobName: string | undefined;
    /**
     * <p>An array of channel objects that describes the input data and its location. Each channel is a named input source. Similar to <code>InputDataConfig</code> supported by <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_HyperParameterTrainingJobDefinition.html">HyperParameterTrainingJobDefinition</a>. Format(s) supported: CSV, Parquet. A minimum of 500 rows is required for the training dataset. There is not a minimum number of rows required for the validation dataset.</p>
     * @public
     */
    InputDataConfig: AutoMLChannel[] | undefined;
    /**
     * <p>Provides information about encryption and the Amazon S3 output path needed to store artifacts from an AutoML job. Format(s) supported: CSV.</p>
     * @public
     */
    OutputDataConfig: AutoMLOutputDataConfig | undefined;
    /**
     * <p>Defines the type of supervised learning problem available for the candidates. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-datasets-problem-types.html#autopilot-problem-types"> SageMaker Autopilot problem types</a>.</p>
     * @public
     */
    ProblemType?: ProblemType | undefined;
    /**
     * <p>Specifies a metric to minimize or maximize as the objective of a job. If not specified, the default objective metric depends on the problem type. See <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_AutoMLJobObjective.html">AutoMLJobObjective</a> for the default values.</p>
     * @public
     */
    AutoMLJobObjective?: AutoMLJobObjective | undefined;
    /**
     * <p>A collection of settings used to configure an AutoML job.</p>
     * @public
     */
    AutoMLJobConfig?: AutoMLJobConfig | undefined;
    /**
     * <p>The ARN of the role that is used to access the data.</p>
     * @public
     */
    RoleArn: string | undefined;
    /**
     * <p>Generates possible candidates without training the models. A candidate is a combination of data preprocessors, algorithms, and algorithm parameter settings.</p>
     * @public
     */
    GenerateCandidateDefinitionsOnly?: boolean | undefined;
    /**
     * <p>An array of key-value pairs. You can use tags to categorize your Amazon Web Services resources in different ways, for example, by purpose, owner, or environment. For more information, see <a href="https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html">Tagging Amazon Web ServicesResources</a>. Tag keys must be unique per resource.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>Specifies how to generate the endpoint name for an automatic one-click Autopilot model deployment.</p>
     * @public
     */
    ModelDeployConfig?: ModelDeployConfig | undefined;
}
/**
 * @public
 */
export interface CreateAutoMLJobResponse {
    /**
     * <p>The unique ARN assigned to the AutoML job when it is created.</p>
     * @public
     */
    AutoMLJobArn: string | undefined;
}
/**
 * @public
 */
export interface CreateAutoMLJobV2Request {
    /**
     * <p>Identifies an Autopilot job. The name must be unique to your account and is case insensitive.</p>
     * @public
     */
    AutoMLJobName: string | undefined;
    /**
     * <p>An array of channel objects describing the input data and their location. Each channel is a named input source. Similar to the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateAutoMLJob.html#sagemaker-CreateAutoMLJob-request-InputDataConfig">InputDataConfig</a> attribute in the <code>CreateAutoMLJob</code> input parameters. The supported formats depend on the problem type:</p> <ul> <li> <p>For tabular problem types: <code>S3Prefix</code>, <code>ManifestFile</code>.</p> </li> <li> <p>For image classification: <code>S3Prefix</code>, <code>ManifestFile</code>, <code>AugmentedManifestFile</code>.</p> </li> <li> <p>For text classification: <code>S3Prefix</code>.</p> </li> <li> <p>For time-series forecasting: <code>S3Prefix</code>.</p> </li> <li> <p>For text generation (LLMs fine-tuning): <code>S3Prefix</code>.</p> </li> </ul>
     * @public
     */
    AutoMLJobInputDataConfig: AutoMLJobChannel[] | undefined;
    /**
     * <p>Provides information about encryption and the Amazon S3 output path needed to store artifacts from an AutoML job.</p>
     * @public
     */
    OutputDataConfig: AutoMLOutputDataConfig | undefined;
    /**
     * <p>Defines the configuration settings of one of the supported problem types.</p>
     * @public
     */
    AutoMLProblemTypeConfig: AutoMLProblemTypeConfig | undefined;
    /**
     * <p>The ARN of the role that is used to access the data.</p>
     * @public
     */
    RoleArn: string | undefined;
    /**
     * <p>An array of key-value pairs. You can use tags to categorize your Amazon Web Services resources in different ways, such as by purpose, owner, or environment. For more information, see <a href="https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html">Tagging Amazon Web ServicesResources</a>. Tag keys must be unique per resource.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>The security configuration for traffic encryption or Amazon VPC settings.</p>
     * @public
     */
    SecurityConfig?: AutoMLSecurityConfig | undefined;
    /**
     * <p>Specifies a metric to minimize or maximize as the objective of a job. If not specified, the default objective metric depends on the problem type. For the list of default values per problem type, see <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_AutoMLJobObjective.html">AutoMLJobObjective</a>.</p> <note> <ul> <li> <p>For tabular problem types: You must either provide both the <code>AutoMLJobObjective</code> and indicate the type of supervised learning problem in <code>AutoMLProblemTypeConfig</code> (<code>TabularJobConfig.ProblemType</code>), or none at all.</p> </li> <li> <p>For text generation problem types (LLMs fine-tuning): Fine-tuning language models in Autopilot does not require setting the <code>AutoMLJobObjective</code> field. Autopilot fine-tunes LLMs without requiring multiple candidates to be trained and evaluated. Instead, using your dataset, Autopilot directly fine-tunes your target model to enhance a default objective metric, the cross-entropy loss. After fine-tuning a language model, you can evaluate the quality of its generated text using different metrics. For a list of the available metrics, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/autopilot-llms-finetuning-metrics.html">Metrics for fine-tuning LLMs in Autopilot</a>.</p> </li> </ul> </note>
     * @public
     */
    AutoMLJobObjective?: AutoMLJobObjective | undefined;
    /**
     * <p>Specifies how to generate the endpoint name for an automatic one-click Autopilot model deployment.</p>
     * @public
     */
    ModelDeployConfig?: ModelDeployConfig | undefined;
    /**
     * <p>This structure specifies how to split the data into train and validation datasets.</p> <p>The validation and training datasets must contain the same headers. For jobs created by calling <code>CreateAutoMLJob</code>, the validation dataset must be less than 2 GB in size.</p> <note> <p>This attribute must not be set for the time-series forecasting problem type, as Autopilot automatically splits the input dataset into training and validation sets.</p> </note>
     * @public
     */
    DataSplitConfig?: AutoMLDataSplitConfig | undefined;
    /**
     * <p>Specifies the compute configuration for the AutoML job V2.</p>
     * @public
     */
    AutoMLComputeConfig?: AutoMLComputeConfig | undefined;
}
/**
 * @public
 */
export interface CreateAutoMLJobV2Response {
    /**
     * <p>The unique ARN assigned to the AutoMLJob when it is created.</p>
     * @public
     */
    AutoMLJobArn: string | undefined;
}
/**
 * @public
 */
export interface CreateClusterRequest {
    /**
     * <p>The name for the new SageMaker HyperPod cluster.</p>
     * @public
     */
    ClusterName: string | undefined;
    /**
     * <p>The instance groups to be created in the SageMaker HyperPod cluster.</p>
     * @public
     */
    InstanceGroups?: ClusterInstanceGroupSpecification[] | undefined;
    /**
     * <p>The specialized instance groups for training models like Amazon Nova to be created in the SageMaker HyperPod cluster.</p>
     * @public
     */
    RestrictedInstanceGroups?: ClusterRestrictedInstanceGroupSpecification[] | undefined;
    /**
     * <p>Specifies the Amazon Virtual Private Cloud (VPC) that is associated with the Amazon SageMaker HyperPod cluster. You can control access to and from your resources by configuring your VPC. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/infrastructure-give-access.html">Give SageMaker access to resources in your Amazon VPC</a>.</p> <note> <p>When your Amazon VPC and subnets support IPv6, network communications differ based on the cluster orchestration platform:</p> <ul> <li> <p>Slurm-orchestrated clusters automatically configure nodes with dual IPv6 and IPv4 addresses, allowing immediate IPv6 network communications.</p> </li> <li> <p>In Amazon EKS-orchestrated clusters, nodes receive dual-stack addressing, but pods can only use IPv6 when the Amazon EKS cluster is explicitly IPv6-enabled. For information about deploying an IPv6 Amazon EKS cluster, see <a href="https://docs.aws.amazon.com/eks/latest/userguide/deploy-ipv6-cluster.html#_deploy_an_ipv6_cluster_with_eksctl">Amazon EKS IPv6 Cluster Deployment</a>.</p> </li> </ul> <p>Additional resources for IPv6 configuration:</p> <ul> <li> <p>For information about adding IPv6 support to your VPC, see to <a href="https://docs.aws.amazon.com/vpc/latest/userguide/vpc-migrate-ipv6.html">IPv6 Support for VPC</a>.</p> </li> <li> <p>For information about creating a new IPv6-compatible VPC, see <a href="https://docs.aws.amazon.com/vpc/latest/userguide/create-vpc.html">Amazon VPC Creation Guide</a>.</p> </li> <li> <p>To configure SageMaker HyperPod with a custom Amazon VPC, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-prerequisites.html#sagemaker-hyperpod-prerequisites-optional-vpc">Custom Amazon VPC Setup for SageMaker HyperPod</a>.</p> </li> </ul> </note>
     * @public
     */
    VpcConfig?: VpcConfig | undefined;
    /**
     * <p>Custom tags for managing the SageMaker HyperPod cluster as an Amazon Web Services resource. You can add tags to your cluster in the same way you add them in other Amazon Web Services services that support tagging. To learn more about tagging Amazon Web Services resources in general, see <a href="https://docs.aws.amazon.com/tag-editor/latest/userguide/tagging.html">Tagging Amazon Web Services Resources User Guide</a>.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>The type of orchestrator to use for the SageMaker HyperPod cluster. Currently, supported values are <code>"Eks"</code> and <code>"Slurm"</code>, which is to use an Amazon Elastic Kubernetes Service or Slurm cluster as the orchestrator.</p> <note> <p>If you specify the <code>Orchestrator</code> field, you must provide exactly one orchestrator configuration: either <code>Eks</code> or <code>Slurm</code>. Specifying both or providing an empty configuration returns a validation error.</p> </note>
     * @public
     */
    Orchestrator?: ClusterOrchestrator | undefined;
    /**
     * <p>The node recovery mode for the SageMaker HyperPod cluster. When set to <code>Automatic</code>, SageMaker HyperPod will automatically reboot or replace faulty nodes when issues are detected. When set to <code>None</code>, cluster administrators will need to manually manage any faulty cluster instances.</p>
     * @public
     */
    NodeRecovery?: ClusterNodeRecovery | undefined;
    /**
     * <p>The configuration for managed tier checkpointing on the HyperPod cluster. When enabled, this feature uses a multi-tier storage approach for storing model checkpoints, providing faster checkpoint operations and improved fault tolerance across cluster nodes.</p>
     * @public
     */
    TieredStorageConfig?: ClusterTieredStorageConfig | undefined;
    /**
     * <p>The mode for provisioning nodes in the cluster. You can specify the following modes:</p> <ul> <li> <p> <b>Continuous</b>: Scaling behavior that enables 1) concurrent operation execution within instance groups, 2) continuous retry mechanisms for failed operations, 3) enhanced customer visibility into cluster events through detailed event streams, 4) partial provisioning capabilities. Your clusters and instance groups remain <code>InService</code> while scaling. This mode is only supported for EKS orchestrated clusters.</p> </li> </ul>
     * @public
     */
    NodeProvisioningMode?: ClusterNodeProvisioningMode | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the IAM role that HyperPod assumes to perform cluster autoscaling operations. This role must have permissions for <code>sagemaker:BatchAddClusterNodes</code> and <code>sagemaker:BatchDeleteClusterNodes</code>. This is only required when autoscaling is enabled and when HyperPod is performing autoscaling operations.</p>
     * @public
     */
    ClusterRole?: string | undefined;
    /**
     * <p>The autoscaling configuration for the cluster. Enables automatic scaling of cluster nodes based on workload demand using a Karpenter-based system.</p>
     * @public
     */
    AutoScaling?: ClusterAutoScalingConfig | undefined;
}
/**
 * @public
 */
export interface CreateClusterResponse {
    /**
     * <p>The Amazon Resource Name (ARN) of the cluster.</p>
     * @public
     */
    ClusterArn: string | undefined;
}
/**
 * <p>Priority class configuration. When included in <code>PriorityClasses</code>, these class configurations define how tasks are queued.</p>
 * @public
 */
export interface PriorityClass {
    /**
     * <p>Name of the priority class.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>Weight of the priority class. The value is within a range from 0 to 100, where 0 is the default.</p> <p>A weight of 0 is the lowest priority and 100 is the highest. Weight 0 is the default.</p>
     * @public
     */
    Weight: number | undefined;
}
/**
 * <p>Cluster policy configuration. This policy is used for task prioritization and fair-share allocation. This helps prioritize critical workloads and distributes idle compute across entities.</p>
 * @public
 */
export interface SchedulerConfig {
    /**
     * <p>List of the priority classes, <code>PriorityClass</code>, of the cluster policy. When specified, these class configurations define how tasks are queued.</p>
     * @public
     */
    PriorityClasses?: PriorityClass[] | undefined;
    /**
     * <p>When enabled, entities borrow idle compute based on their assigned <code>FairShareWeight</code>.</p> <p>When disabled, entities borrow idle compute based on a first-come first-serve basis.</p> <p>Default is <code>Enabled</code>.</p>
     * @public
     */
    FairShare?: FairShare | undefined;
    /**
     * <p>Configuration for sharing idle compute resources across entities in the cluster. When enabled, unallocated resources are automatically calculated and made available for entities to borrow. </p>
     * @public
     */
    IdleResourceSharing?: IdleResourceSharing | undefined;
}
/**
 * @public
 */
export interface CreateClusterSchedulerConfigRequest {
    /**
     * <p>Name for the cluster policy.</p>
     * @public
     */
    Name: string | undefined;
    /**
     * <p>ARN of the cluster.</p>
     * @public
     */
    ClusterArn: string | undefined;
    /**
     * <p>Configuration about the monitoring schedule.</p>
     * @public
     */
    SchedulerConfig: SchedulerConfig | undefined;
    /**
     * <p>Description of the cluster policy.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>Tags of the cluster policy.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * @public
 */
export interface CreateClusterSchedulerConfigResponse {
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
}
/**
 * @public
 */
export interface CreateCodeRepositoryInput {
    /**
     * <p>The name of the Git repository. The name must have 1 to 63 characters. Valid characters are a-z, A-Z, 0-9, and - (hyphen).</p>
     * @public
     */
    CodeRepositoryName: string | undefined;
    /**
     * <p>Specifies details about the repository, including the URL where the repository is located, the default branch, and credentials to use to access the repository.</p>
     * @public
     */
    GitConfig: GitConfig | undefined;
    /**
     * <p>An array of key-value pairs. You can use tags to categorize your Amazon Web Services resources in different ways, for example, by purpose, owner, or environment. For more information, see <a href="https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html">Tagging Amazon Web Services Resources</a>.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * @public
 */
export interface CreateCodeRepositoryOutput {
    /**
     * <p>The Amazon Resource Name (ARN) of the new repository.</p>
     * @public
     */
    CodeRepositoryArn: string | undefined;
}
/**
 * <p>Contains information about the location of input model artifacts, the name and shape of the expected data inputs, and the framework in which the model was trained.</p>
 * @public
 */
export interface InputConfig {
    /**
     * <p>The S3 path where the model artifacts, which result from model training, are stored. This path must point to a single gzip compressed tar archive (.tar.gz suffix).</p>
     * @public
     */
    S3Uri: string | undefined;
    /**
     * <p>Specifies the name and shape of the expected data inputs for your trained model with a JSON dictionary form. The data inputs are <code>Framework</code> specific. </p> <ul> <li> <p> <code>TensorFlow</code>: You must specify the name and shape (NHWC format) of the expected data inputs using a dictionary format for your trained model. The dictionary formats required for the console and CLI are different.</p> <ul> <li> <p>Examples for one input:</p> <ul> <li> <p>If using the console, <code>\{"input":[1,1024,1024,3]\}</code> </p> </li> <li> <p>If using the CLI, <code>\{\"input\":[1,1024,1024,3]\}</code> </p> </li> </ul> </li> <li> <p>Examples for two inputs:</p> <ul> <li> <p>If using the console, <code>\{"data1": [1,28,28,1], "data2":[1,28,28,1]\}</code> </p> </li> <li> <p>If using the CLI, <code>\{\"data1\": [1,28,28,1], \"data2\":[1,28,28,1]\}</code> </p> </li> </ul> </li> </ul> </li> <li> <p> <code>KERAS</code>: You must specify the name and shape (NCHW format) of expected data inputs using a dictionary format for your trained model. Note that while Keras model artifacts should be uploaded in NHWC (channel-last) format, <code>DataInputConfig</code> should be specified in NCHW (channel-first) format. The dictionary formats required for the console and CLI are different.</p> <ul> <li> <p>Examples for one input:</p> <ul> <li> <p>If using the console, <code>\{"input_1":[1,3,224,224]\}</code> </p> </li> <li> <p>If using the CLI, <code>\{\"input_1\":[1,3,224,224]\}</code> </p> </li> </ul> </li> <li> <p>Examples for two inputs:</p> <ul> <li> <p>If using the console, <code>\{"input_1": [1,3,224,224], "input_2":[1,3,224,224]\} </code> </p> </li> <li> <p>If using the CLI, <code>\{\"input_1\": [1,3,224,224], \"input_2\":[1,3,224,224]\}</code> </p> </li> </ul> </li> </ul> </li> <li> <p> <code>MXNET/ONNX/DARKNET</code>: You must specify the name and shape (NCHW format) of the expected data inputs in order using a dictionary format for your trained model. The dictionary formats required for the console and CLI are different.</p> <ul> <li> <p>Examples for one input:</p> <ul> <li> <p>If using the console, <code>\{"data":[1,3,1024,1024]\}</code> </p> </li> <li> <p>If using the CLI, <code>\{\"data\":[1,3,1024,1024]\}</code> </p> </li> </ul> </li> <li> <p>Examples for two inputs:</p> <ul> <li> <p>If using the console, <code>\{"var1": [1,1,28,28], "var2":[1,1,28,28]\} </code> </p> </li> <li> <p>If using the CLI, <code>\{\"var1\": [1,1,28,28], \"var2\":[1,1,28,28]\}</code> </p> </li> </ul> </li> </ul> </li> <li> <p> <code>PyTorch</code>: You can either specify the name and shape (NCHW format) of expected data inputs in order using a dictionary format for your trained model or you can specify the shape only using a list format. The dictionary formats required for the console and CLI are different. The list formats for the console and CLI are the same.</p> <ul> <li> <p>Examples for one input in dictionary format:</p> <ul> <li> <p>If using the console, <code>\{"input0":[1,3,224,224]\}</code> </p> </li> <li> <p>If using the CLI, <code>\{\"input0\":[1,3,224,224]\}</code> </p> </li> </ul> </li> <li> <p>Example for one input in list format: <code>[[1,3,224,224]]</code> </p> </li> <li> <p>Examples for two inputs in dictionary format:</p> <ul> <li> <p>If using the console, <code>\{"input0":[1,3,224,224], "input1":[1,3,224,224]\}</code> </p> </li> <li> <p>If using the CLI, <code>\{\"input0\":[1,3,224,224], \"input1\":[1,3,224,224]\} </code> </p> </li> </ul> </li> <li> <p>Example for two inputs in list format: <code>[[1,3,224,224], [1,3,224,224]]</code> </p> </li> </ul> </li> <li> <p> <code>XGBOOST</code>: input data name and shape are not needed.</p> </li> </ul> <p> <code>DataInputConfig</code> supports the following parameters for <code>CoreML</code> <code>TargetDevice</code> (ML Model format):</p> <ul> <li> <p> <code>shape</code>: Input shape, for example <code>\{"input_1": \{"shape": [1,224,224,3]\}\}</code>. In addition to static input shapes, CoreML converter supports Flexible input shapes:</p> <ul> <li> <p>Range Dimension. You can use the Range Dimension feature if you know the input shape will be within some specific interval in that dimension, for example: <code>\{"input_1": \{"shape": ["1..10", 224, 224, 3]\}\}</code> </p> </li> <li> <p>Enumerated shapes. Sometimes, the models are trained to work only on a select set of inputs. You can enumerate all supported input shapes, for example: <code>\{"input_1": \{"shape": [[1, 224, 224, 3], [1, 160, 160, 3]]\}\}</code> </p> </li> </ul> </li> <li> <p> <code>default_shape</code>: Default input shape. You can set a default shape during conversion for both Range Dimension and Enumerated Shapes. For example <code>\{"input_1": \{"shape": ["1..10", 224, 224, 3], "default_shape": [1, 224, 224, 3]\}\}</code> </p> </li> <li> <p> <code>type</code>: Input type. Allowed values: <code>Image</code> and <code>Tensor</code>. By default, the converter generates an ML Model with inputs of type Tensor (MultiArray). User can set input type to be Image. Image input type requires additional input parameters such as <code>bias</code> and <code>scale</code>.</p> </li> <li> <p> <code>bias</code>: If the input type is an Image, you need to provide the bias vector.</p> </li> <li> <p> <code>scale</code>: If the input type is an Image, you need to provide a scale factor.</p> </li> </ul> <p>CoreML <code>ClassifierConfig</code> parameters can be specified using <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_OutputConfig.html">OutputConfig</a> <code>CompilerOptions</code>. CoreML converter supports Tensorflow and PyTorch models. CoreML conversion examples:</p> <ul> <li> <p>Tensor type input:</p> <ul> <li> <p> <code>"DataInputConfig": \{"input_1": \{"shape": [[1,224,224,3], [1,160,160,3]], "default_shape": [1,224,224,3]\}\}</code> </p> </li> </ul> </li> <li> <p>Tensor type input without input name (PyTorch):</p> <ul> <li> <p> <code>"DataInputConfig": [\{"shape": [[1,3,224,224], [1,3,160,160]], "default_shape": [1,3,224,224]\}]</code> </p> </li> </ul> </li> <li> <p>Image type input:</p> <ul> <li> <p> <code>"DataInputConfig": \{"input_1": \{"shape": [[1,224,224,3], [1,160,160,3]], "default_shape": [1,224,224,3], "type": "Image", "bias": [-1,-1,-1], "scale": 0.007843137255\}\}</code> </p> </li> <li> <p> <code>"CompilerOptions": \{"class_labels": "imagenet_labels_1000.txt"\}</code> </p> </li> </ul> </li> <li> <p>Image type input without input name (PyTorch):</p> <ul> <li> <p> <code>"DataInputConfig": [\{"shape": [[1,3,224,224], [1,3,160,160]], "default_shape": [1,3,224,224], "type": "Image", "bias": [-1,-1,-1], "scale": 0.007843137255\}]</code> </p> </li> <li> <p> <code>"CompilerOptions": \{"class_labels": "imagenet_labels_1000.txt"\}</code> </p> </li> </ul> </li> </ul> <p>Depending on the model format, <code>DataInputConfig</code> requires the following parameters for <code>ml_eia2</code> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_OutputConfig.html#sagemaker-Type-OutputConfig-TargetDevice">OutputConfig:TargetDevice</a>.</p> <ul> <li> <p>For TensorFlow models saved in the SavedModel format, specify the input names from <code>signature_def_key</code> and the input model shapes for <code>DataInputConfig</code>. Specify the <code>signature_def_key</code> in <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_OutputConfig.html#sagemaker-Type-OutputConfig-CompilerOptions"> <code>OutputConfig:CompilerOptions</code> </a> if the model does not use TensorFlow's default signature def key. For example:</p> <ul> <li> <p> <code>"DataInputConfig": \{"inputs": [1, 224, 224, 3]\}</code> </p> </li> <li> <p> <code>"CompilerOptions": \{"signature_def_key": "serving_custom"\}</code> </p> </li> </ul> </li> <li> <p>For TensorFlow models saved as a frozen graph, specify the input tensor names and shapes in <code>DataInputConfig</code> and the output tensor names for <code>output_names</code> in <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_OutputConfig.html#sagemaker-Type-OutputConfig-CompilerOptions"> <code>OutputConfig:CompilerOptions</code> </a>. For example:</p> <ul> <li> <p> <code>"DataInputConfig": \{"input_tensor:0": [1, 224, 224, 3]\}</code> </p> </li> <li> <p> <code>"CompilerOptions": \{"output_names": ["output_tensor:0"]\}</code> </p> </li> </ul> </li> </ul>
     * @public
     */
    DataInputConfig?: string | undefined;
    /**
     * <p>Identifies the framework in which the model was trained. For example: TENSORFLOW.</p>
     * @public
     */
    Framework: Framework | undefined;
    /**
     * <p>Specifies the framework version to use. This API field is only supported for the MXNet, PyTorch, TensorFlow and TensorFlow Lite frameworks.</p> <p>For information about framework versions supported for cloud targets and edge devices, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/neo-supported-cloud.html">Cloud Supported Instance Types and Frameworks</a> and <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/neo-supported-devices-edge-frameworks.html">Edge Supported Frameworks</a>.</p>
     * @public
     */
    FrameworkVersion?: string | undefined;
}
/**
 * <p>Contains information about a target platform that you want your model to run on, such as OS, architecture, and accelerators. It is an alternative of <code>TargetDevice</code>.</p>
 * @public
 */
export interface TargetPlatform {
    /**
     * <p>Specifies a target platform OS.</p> <ul> <li> <p> <code>LINUX</code>: Linux-based operating systems.</p> </li> <li> <p> <code>ANDROID</code>: Android operating systems. Android API level can be specified using the <code>ANDROID_PLATFORM</code> compiler option. For example, <code>"CompilerOptions": \{'ANDROID_PLATFORM': 28\}</code> </p> </li> </ul>
     * @public
     */
    Os: TargetPlatformOs | undefined;
    /**
     * <p>Specifies a target platform architecture.</p> <ul> <li> <p> <code>X86_64</code>: 64-bit version of the x86 instruction set.</p> </li> <li> <p> <code>X86</code>: 32-bit version of the x86 instruction set.</p> </li> <li> <p> <code>ARM64</code>: ARMv8 64-bit CPU.</p> </li> <li> <p> <code>ARM_EABIHF</code>: ARMv7 32-bit, Hard Float.</p> </li> <li> <p> <code>ARM_EABI</code>: ARMv7 32-bit, Soft Float. Used by Android 32-bit ARM platform.</p> </li> </ul>
     * @public
     */
    Arch: TargetPlatformArch | undefined;
    /**
     * <p>Specifies a target platform accelerator (optional).</p> <ul> <li> <p> <code>NVIDIA</code>: Nvidia graphics processing unit. It also requires <code>gpu-code</code>, <code>trt-ver</code>, <code>cuda-ver</code> compiler options</p> </li> <li> <p> <code>MALI</code>: ARM Mali graphics processor</p> </li> <li> <p> <code>INTEL_GRAPHICS</code>: Integrated Intel graphics</p> </li> </ul>
     * @public
     */
    Accelerator?: TargetPlatformAccelerator | undefined;
}
