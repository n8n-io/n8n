import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { SearchResponse } from "../models/models_4";
import { SearchRequest } from "../models/models_5";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link SearchCommand}.
 */
export interface SearchCommandInput extends SearchRequest {
}
/**
 * @public
 *
 * The output of {@link SearchCommand}.
 */
export interface SearchCommandOutput extends SearchResponse, __MetadataBearer {
}
declare const SearchCommand_base: {
    new (input: SearchCommandInput): import("@smithy/smithy-client").CommandImpl<SearchCommandInput, SearchCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: SearchCommandInput): import("@smithy/smithy-client").CommandImpl<SearchCommandInput, SearchCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Finds SageMaker resources that match a search query. Matching resources are returned as a list of <code>SearchRecord</code> objects in the response. You can sort the search results by any resource property in a ascending or descending order.</p> <p>You can query against the following value types: numeric, text, Boolean, and timestamp.</p> <note> <p>The Search API may provide access to otherwise restricted data. See <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/api-permissions-reference.html">Amazon SageMaker API Permissions: Actions, Permissions, and Resources Reference</a> for more information.</p> </note>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, SearchCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, SearchCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // SearchRequest
 *   Resource: "TrainingJob" || "Experiment" || "ExperimentTrial" || "ExperimentTrialComponent" || "Endpoint" || "Model" || "ModelPackage" || "ModelPackageGroup" || "Pipeline" || "PipelineExecution" || "FeatureGroup" || "FeatureMetadata" || "Image" || "ImageVersion" || "Project" || "HyperParameterTuningJob" || "ModelCard", // required
 *   SearchExpression: { // SearchExpression
 *     Filters: [ // FilterList
 *       { // Filter
 *         Name: "STRING_VALUE", // required
 *         Operator: "Equals" || "NotEquals" || "GreaterThan" || "GreaterThanOrEqualTo" || "LessThan" || "LessThanOrEqualTo" || "Contains" || "Exists" || "NotExists" || "In",
 *         Value: "STRING_VALUE",
 *       },
 *     ],
 *     NestedFilters: [ // NestedFiltersList
 *       { // NestedFilters
 *         NestedPropertyName: "STRING_VALUE", // required
 *         Filters: [ // required
 *           {
 *             Name: "STRING_VALUE", // required
 *             Operator: "Equals" || "NotEquals" || "GreaterThan" || "GreaterThanOrEqualTo" || "LessThan" || "LessThanOrEqualTo" || "Contains" || "Exists" || "NotExists" || "In",
 *             Value: "STRING_VALUE",
 *           },
 *         ],
 *       },
 *     ],
 *     SubExpressions: [ // SearchExpressionList
 *       {
 *         Filters: [
 *           {
 *             Name: "STRING_VALUE", // required
 *             Operator: "Equals" || "NotEquals" || "GreaterThan" || "GreaterThanOrEqualTo" || "LessThan" || "LessThanOrEqualTo" || "Contains" || "Exists" || "NotExists" || "In",
 *             Value: "STRING_VALUE",
 *           },
 *         ],
 *         NestedFilters: [
 *           {
 *             NestedPropertyName: "STRING_VALUE", // required
 *             Filters: "<FilterList>", // required
 *           },
 *         ],
 *         SubExpressions: [
 *           "<SearchExpression>",
 *         ],
 *         Operator: "And" || "Or",
 *       },
 *     ],
 *     Operator: "And" || "Or",
 *   },
 *   SortBy: "STRING_VALUE",
 *   SortOrder: "Ascending" || "Descending",
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 *   CrossAccountFilterOption: "SameAccount" || "CrossAccount",
 *   VisibilityConditions: [ // VisibilityConditionsList
 *     { // VisibilityConditions
 *       Key: "STRING_VALUE",
 *       Value: "STRING_VALUE",
 *     },
 *   ],
 * };
 * const command = new SearchCommand(input);
 * const response = await client.send(command);
 * // { // SearchResponse
 * //   Results: [ // SearchResultsList
 * //     { // SearchRecord
 * //       TrainingJob: { // TrainingJob
 * //         TrainingJobName: "STRING_VALUE",
 * //         TrainingJobArn: "STRING_VALUE",
 * //         TuningJobArn: "STRING_VALUE",
 * //         LabelingJobArn: "STRING_VALUE",
 * //         AutoMLJobArn: "STRING_VALUE",
 * //         ModelArtifacts: { // ModelArtifacts
 * //           S3ModelArtifacts: "STRING_VALUE", // required
 * //         },
 * //         TrainingJobStatus: "InProgress" || "Completed" || "Failed" || "Stopping" || "Stopped",
 * //         SecondaryStatus: "Starting" || "LaunchingMLInstances" || "PreparingTrainingStack" || "Downloading" || "DownloadingTrainingImage" || "Training" || "Uploading" || "Stopping" || "Stopped" || "MaxRuntimeExceeded" || "Completed" || "Failed" || "Interrupted" || "MaxWaitTimeExceeded" || "Updating" || "Restarting" || "Pending",
 * //         FailureReason: "STRING_VALUE",
 * //         HyperParameters: { // HyperParameters
 * //           "<keys>": "STRING_VALUE",
 * //         },
 * //         AlgorithmSpecification: { // AlgorithmSpecification
 * //           TrainingImage: "STRING_VALUE",
 * //           AlgorithmName: "STRING_VALUE",
 * //           TrainingInputMode: "Pipe" || "File" || "FastFile", // required
 * //           MetricDefinitions: [ // MetricDefinitionList
 * //             { // MetricDefinition
 * //               Name: "STRING_VALUE", // required
 * //               Regex: "STRING_VALUE", // required
 * //             },
 * //           ],
 * //           EnableSageMakerMetricsTimeSeries: true || false,
 * //           ContainerEntrypoint: [ // TrainingContainerEntrypoint
 * //             "STRING_VALUE",
 * //           ],
 * //           ContainerArguments: [ // TrainingContainerArguments
 * //             "STRING_VALUE",
 * //           ],
 * //           TrainingImageConfig: { // TrainingImageConfig
 * //             TrainingRepositoryAccessMode: "Platform" || "Vpc", // required
 * //             TrainingRepositoryAuthConfig: { // TrainingRepositoryAuthConfig
 * //               TrainingRepositoryCredentialsProviderArn: "STRING_VALUE", // required
 * //             },
 * //           },
 * //         },
 * //         RoleArn: "STRING_VALUE",
 * //         InputDataConfig: [ // InputDataConfig
 * //           { // Channel
 * //             ChannelName: "STRING_VALUE", // required
 * //             DataSource: { // DataSource
 * //               S3DataSource: { // S3DataSource
 * //                 S3DataType: "ManifestFile" || "S3Prefix" || "AugmentedManifestFile", // required
 * //                 S3Uri: "STRING_VALUE", // required
 * //                 S3DataDistributionType: "FullyReplicated" || "ShardedByS3Key",
 * //                 AttributeNames: [ // AttributeNames
 * //                   "STRING_VALUE",
 * //                 ],
 * //                 InstanceGroupNames: [ // InstanceGroupNames
 * //                   "STRING_VALUE",
 * //                 ],
 * //                 ModelAccessConfig: { // ModelAccessConfig
 * //                   AcceptEula: true || false, // required
 * //                 },
 * //                 HubAccessConfig: { // HubAccessConfig
 * //                   HubContentArn: "STRING_VALUE", // required
 * //                 },
 * //               },
 * //               FileSystemDataSource: { // FileSystemDataSource
 * //                 FileSystemId: "STRING_VALUE", // required
 * //                 FileSystemAccessMode: "rw" || "ro", // required
 * //                 FileSystemType: "EFS" || "FSxLustre", // required
 * //                 DirectoryPath: "STRING_VALUE", // required
 * //               },
 * //             },
 * //             ContentType: "STRING_VALUE",
 * //             CompressionType: "None" || "Gzip",
 * //             RecordWrapperType: "None" || "RecordIO",
 * //             InputMode: "Pipe" || "File" || "FastFile",
 * //             ShuffleConfig: { // ShuffleConfig
 * //               Seed: Number("long"), // required
 * //             },
 * //           },
 * //         ],
 * //         OutputDataConfig: { // OutputDataConfig
 * //           KmsKeyId: "STRING_VALUE",
 * //           S3OutputPath: "STRING_VALUE", // required
 * //           CompressionType: "GZIP" || "NONE",
 * //         },
 * //         ResourceConfig: { // ResourceConfig
 * //           InstanceType: "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.c5n.xlarge" || "ml.c5n.2xlarge" || "ml.c5n.4xlarge" || "ml.c5n.9xlarge" || "ml.c5n.18xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.16xlarge" || "ml.g6.12xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.16xlarge" || "ml.g6e.12xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.trn2.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.8xlarge" || "ml.c6i.4xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.8xlarge" || "ml.r5d.12xlarge" || "ml.r5d.16xlarge" || "ml.r5d.24xlarge" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge",
 * //           InstanceCount: Number("int"),
 * //           VolumeSizeInGB: Number("int"), // required
 * //           VolumeKmsKeyId: "STRING_VALUE",
 * //           KeepAlivePeriodInSeconds: Number("int"),
 * //           InstanceGroups: [ // InstanceGroups
 * //             { // InstanceGroup
 * //               InstanceType: "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.c5n.xlarge" || "ml.c5n.2xlarge" || "ml.c5n.4xlarge" || "ml.c5n.9xlarge" || "ml.c5n.18xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.16xlarge" || "ml.g6.12xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.16xlarge" || "ml.g6e.12xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.trn2.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.8xlarge" || "ml.c6i.4xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.8xlarge" || "ml.r5d.12xlarge" || "ml.r5d.16xlarge" || "ml.r5d.24xlarge" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge", // required
 * //               InstanceCount: Number("int"), // required
 * //               InstanceGroupName: "STRING_VALUE", // required
 * //             },
 * //           ],
 * //           TrainingPlanArn: "STRING_VALUE",
 * //         },
 * //         VpcConfig: { // VpcConfig
 * //           SecurityGroupIds: [ // VpcSecurityGroupIds // required
 * //             "STRING_VALUE",
 * //           ],
 * //           Subnets: [ // Subnets // required
 * //             "STRING_VALUE",
 * //           ],
 * //         },
 * //         StoppingCondition: { // StoppingCondition
 * //           MaxRuntimeInSeconds: Number("int"),
 * //           MaxWaitTimeInSeconds: Number("int"),
 * //           MaxPendingTimeInSeconds: Number("int"),
 * //         },
 * //         CreationTime: new Date("TIMESTAMP"),
 * //         TrainingStartTime: new Date("TIMESTAMP"),
 * //         TrainingEndTime: new Date("TIMESTAMP"),
 * //         LastModifiedTime: new Date("TIMESTAMP"),
 * //         SecondaryStatusTransitions: [ // SecondaryStatusTransitions
 * //           { // SecondaryStatusTransition
 * //             Status: "Starting" || "LaunchingMLInstances" || "PreparingTrainingStack" || "Downloading" || "DownloadingTrainingImage" || "Training" || "Uploading" || "Stopping" || "Stopped" || "MaxRuntimeExceeded" || "Completed" || "Failed" || "Interrupted" || "MaxWaitTimeExceeded" || "Updating" || "Restarting" || "Pending", // required
 * //             StartTime: new Date("TIMESTAMP"), // required
 * //             EndTime: new Date("TIMESTAMP"),
 * //             StatusMessage: "STRING_VALUE",
 * //           },
 * //         ],
 * //         FinalMetricDataList: [ // FinalMetricDataList
 * //           { // MetricData
 * //             MetricName: "STRING_VALUE",
 * //             Value: Number("float"),
 * //             Timestamp: new Date("TIMESTAMP"),
 * //           },
 * //         ],
 * //         EnableNetworkIsolation: true || false,
 * //         EnableInterContainerTrafficEncryption: true || false,
 * //         EnableManagedSpotTraining: true || false,
 * //         CheckpointConfig: { // CheckpointConfig
 * //           S3Uri: "STRING_VALUE", // required
 * //           LocalPath: "STRING_VALUE",
 * //         },
 * //         TrainingTimeInSeconds: Number("int"),
 * //         BillableTimeInSeconds: Number("int"),
 * //         DebugHookConfig: { // DebugHookConfig
 * //           LocalPath: "STRING_VALUE",
 * //           S3OutputPath: "STRING_VALUE", // required
 * //           HookParameters: { // HookParameters
 * //             "<keys>": "STRING_VALUE",
 * //           },
 * //           CollectionConfigurations: [ // CollectionConfigurations
 * //             { // CollectionConfiguration
 * //               CollectionName: "STRING_VALUE",
 * //               CollectionParameters: { // CollectionParameters
 * //                 "<keys>": "STRING_VALUE",
 * //               },
 * //             },
 * //           ],
 * //         },
 * //         ExperimentConfig: { // ExperimentConfig
 * //           ExperimentName: "STRING_VALUE",
 * //           TrialName: "STRING_VALUE",
 * //           TrialComponentDisplayName: "STRING_VALUE",
 * //           RunName: "STRING_VALUE",
 * //         },
 * //         DebugRuleConfigurations: [ // DebugRuleConfigurations
 * //           { // DebugRuleConfiguration
 * //             RuleConfigurationName: "STRING_VALUE", // required
 * //             LocalPath: "STRING_VALUE",
 * //             S3OutputPath: "STRING_VALUE",
 * //             RuleEvaluatorImage: "STRING_VALUE", // required
 * //             InstanceType: "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.8xlarge" || "ml.r5d.12xlarge" || "ml.r5d.16xlarge" || "ml.r5d.24xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.12xlarge" || "ml.g6e.16xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge",
 * //             VolumeSizeInGB: Number("int"),
 * //             RuleParameters: { // RuleParameters
 * //               "<keys>": "STRING_VALUE",
 * //             },
 * //           },
 * //         ],
 * //         TensorBoardOutputConfig: { // TensorBoardOutputConfig
 * //           LocalPath: "STRING_VALUE",
 * //           S3OutputPath: "STRING_VALUE", // required
 * //         },
 * //         DebugRuleEvaluationStatuses: [ // DebugRuleEvaluationStatuses
 * //           { // DebugRuleEvaluationStatus
 * //             RuleConfigurationName: "STRING_VALUE",
 * //             RuleEvaluationJobArn: "STRING_VALUE",
 * //             RuleEvaluationStatus: "InProgress" || "NoIssuesFound" || "IssuesFound" || "Error" || "Stopping" || "Stopped",
 * //             StatusDetails: "STRING_VALUE",
 * //             LastModifiedTime: new Date("TIMESTAMP"),
 * //           },
 * //         ],
 * //         ProfilerConfig: { // ProfilerConfig
 * //           S3OutputPath: "STRING_VALUE",
 * //           ProfilingIntervalInMilliseconds: Number("long"),
 * //           ProfilingParameters: { // ProfilingParameters
 * //             "<keys>": "STRING_VALUE",
 * //           },
 * //           DisableProfiler: true || false,
 * //         },
 * //         Environment: { // TrainingEnvironmentMap
 * //           "<keys>": "STRING_VALUE",
 * //         },
 * //         RetryStrategy: { // RetryStrategy
 * //           MaximumRetryAttempts: Number("int"), // required
 * //         },
 * //         Tags: [ // TagList
 * //           { // Tag
 * //             Key: "STRING_VALUE", // required
 * //             Value: "STRING_VALUE", // required
 * //           },
 * //         ],
 * //       },
 * //       Experiment: { // Experiment
 * //         ExperimentName: "STRING_VALUE",
 * //         ExperimentArn: "STRING_VALUE",
 * //         DisplayName: "STRING_VALUE",
 * //         Source: { // ExperimentSource
 * //           SourceArn: "STRING_VALUE", // required
 * //           SourceType: "STRING_VALUE",
 * //         },
 * //         Description: "STRING_VALUE",
 * //         CreationTime: new Date("TIMESTAMP"),
 * //         CreatedBy: { // UserContext
 * //           UserProfileArn: "STRING_VALUE",
 * //           UserProfileName: "STRING_VALUE",
 * //           DomainId: "STRING_VALUE",
 * //           IamIdentity: { // IamIdentity
 * //             Arn: "STRING_VALUE",
 * //             PrincipalId: "STRING_VALUE",
 * //             SourceIdentity: "STRING_VALUE",
 * //           },
 * //         },
 * //         LastModifiedTime: new Date("TIMESTAMP"),
 * //         LastModifiedBy: {
 * //           UserProfileArn: "STRING_VALUE",
 * //           UserProfileName: "STRING_VALUE",
 * //           DomainId: "STRING_VALUE",
 * //           IamIdentity: {
 * //             Arn: "STRING_VALUE",
 * //             PrincipalId: "STRING_VALUE",
 * //             SourceIdentity: "STRING_VALUE",
 * //           },
 * //         },
 * //         Tags: [
 * //           {
 * //             Key: "STRING_VALUE", // required
 * //             Value: "STRING_VALUE", // required
 * //           },
 * //         ],
 * //       },
 * //       Trial: { // Trial
 * //         TrialName: "STRING_VALUE",
 * //         TrialArn: "STRING_VALUE",
 * //         DisplayName: "STRING_VALUE",
 * //         ExperimentName: "STRING_VALUE",
 * //         Source: { // TrialSource
 * //           SourceArn: "STRING_VALUE", // required
 * //           SourceType: "STRING_VALUE",
 * //         },
 * //         CreationTime: new Date("TIMESTAMP"),
 * //         CreatedBy: {
 * //           UserProfileArn: "STRING_VALUE",
 * //           UserProfileName: "STRING_VALUE",
 * //           DomainId: "STRING_VALUE",
 * //           IamIdentity: {
 * //             Arn: "STRING_VALUE",
 * //             PrincipalId: "STRING_VALUE",
 * //             SourceIdentity: "STRING_VALUE",
 * //           },
 * //         },
 * //         LastModifiedTime: new Date("TIMESTAMP"),
 * //         LastModifiedBy: {
 * //           UserProfileArn: "STRING_VALUE",
 * //           UserProfileName: "STRING_VALUE",
 * //           DomainId: "STRING_VALUE",
 * //           IamIdentity: {
 * //             Arn: "STRING_VALUE",
 * //             PrincipalId: "STRING_VALUE",
 * //             SourceIdentity: "STRING_VALUE",
 * //           },
 * //         },
 * //         MetadataProperties: { // MetadataProperties
 * //           CommitId: "STRING_VALUE",
 * //           Repository: "STRING_VALUE",
 * //           GeneratedBy: "STRING_VALUE",
 * //           ProjectId: "STRING_VALUE",
 * //         },
 * //         Tags: [
 * //           {
 * //             Key: "STRING_VALUE", // required
 * //             Value: "STRING_VALUE", // required
 * //           },
 * //         ],
 * //         TrialComponentSummaries: [ // TrialComponentSimpleSummaries
 * //           { // TrialComponentSimpleSummary
 * //             TrialComponentName: "STRING_VALUE",
 * //             TrialComponentArn: "STRING_VALUE",
 * //             TrialComponentSource: { // TrialComponentSource
 * //               SourceArn: "STRING_VALUE", // required
 * //               SourceType: "STRING_VALUE",
 * //             },
 * //             CreationTime: new Date("TIMESTAMP"),
 * //             CreatedBy: {
 * //               UserProfileArn: "STRING_VALUE",
 * //               UserProfileName: "STRING_VALUE",
 * //               DomainId: "STRING_VALUE",
 * //               IamIdentity: {
 * //                 Arn: "STRING_VALUE",
 * //                 PrincipalId: "STRING_VALUE",
 * //                 SourceIdentity: "STRING_VALUE",
 * //               },
 * //             },
 * //           },
 * //         ],
 * //       },
 * //       TrialComponent: { // TrialComponent
 * //         TrialComponentName: "STRING_VALUE",
 * //         DisplayName: "STRING_VALUE",
 * //         TrialComponentArn: "STRING_VALUE",
 * //         Source: {
 * //           SourceArn: "STRING_VALUE", // required
 * //           SourceType: "STRING_VALUE",
 * //         },
 * //         Status: { // TrialComponentStatus
 * //           PrimaryStatus: "InProgress" || "Completed" || "Failed" || "Stopping" || "Stopped",
 * //           Message: "STRING_VALUE",
 * //         },
 * //         StartTime: new Date("TIMESTAMP"),
 * //         EndTime: new Date("TIMESTAMP"),
 * //         CreationTime: new Date("TIMESTAMP"),
 * //         CreatedBy: "<UserContext>",
 * //         LastModifiedTime: new Date("TIMESTAMP"),
 * //         LastModifiedBy: "<UserContext>",
 * //         Parameters: { // TrialComponentParameters
 * //           "<keys>": { // TrialComponentParameterValue Union: only one key present
 * //             StringValue: "STRING_VALUE",
 * //             NumberValue: Number("double"),
 * //           },
 * //         },
 * //         InputArtifacts: { // TrialComponentArtifacts
 * //           "<keys>": { // TrialComponentArtifact
 * //             MediaType: "STRING_VALUE",
 * //             Value: "STRING_VALUE", // required
 * //           },
 * //         },
 * //         OutputArtifacts: {
 * //           "<keys>": {
 * //             MediaType: "STRING_VALUE",
 * //             Value: "STRING_VALUE", // required
 * //           },
 * //         },
 * //         Metrics: [ // TrialComponentMetricSummaries
 * //           { // TrialComponentMetricSummary
 * //             MetricName: "STRING_VALUE",
 * //             SourceArn: "STRING_VALUE",
 * //             TimeStamp: new Date("TIMESTAMP"),
 * //             Max: Number("double"),
 * //             Min: Number("double"),
 * //             Last: Number("double"),
 * //             Count: Number("int"),
 * //             Avg: Number("double"),
 * //             StdDev: Number("double"),
 * //           },
 * //         ],
 * //         MetadataProperties: {
 * //           CommitId: "STRING_VALUE",
 * //           Repository: "STRING_VALUE",
 * //           GeneratedBy: "STRING_VALUE",
 * //           ProjectId: "STRING_VALUE",
 * //         },
 * //         SourceDetail: { // TrialComponentSourceDetail
 * //           SourceArn: "STRING_VALUE",
 * //           TrainingJob: {
 * //             TrainingJobName: "STRING_VALUE",
 * //             TrainingJobArn: "STRING_VALUE",
 * //             TuningJobArn: "STRING_VALUE",
 * //             LabelingJobArn: "STRING_VALUE",
 * //             AutoMLJobArn: "STRING_VALUE",
 * //             ModelArtifacts: {
 * //               S3ModelArtifacts: "STRING_VALUE", // required
 * //             },
 * //             TrainingJobStatus: "InProgress" || "Completed" || "Failed" || "Stopping" || "Stopped",
 * //             SecondaryStatus: "Starting" || "LaunchingMLInstances" || "PreparingTrainingStack" || "Downloading" || "DownloadingTrainingImage" || "Training" || "Uploading" || "Stopping" || "Stopped" || "MaxRuntimeExceeded" || "Completed" || "Failed" || "Interrupted" || "MaxWaitTimeExceeded" || "Updating" || "Restarting" || "Pending",
 * //             FailureReason: "STRING_VALUE",
 * //             HyperParameters: {
 * //               "<keys>": "STRING_VALUE",
 * //             },
 * //             AlgorithmSpecification: {
 * //               TrainingImage: "STRING_VALUE",
 * //               AlgorithmName: "STRING_VALUE",
 * //               TrainingInputMode: "Pipe" || "File" || "FastFile", // required
 * //               MetricDefinitions: [
 * //                 {
 * //                   Name: "STRING_VALUE", // required
 * //                   Regex: "STRING_VALUE", // required
 * //                 },
 * //               ],
 * //               EnableSageMakerMetricsTimeSeries: true || false,
 * //               ContainerEntrypoint: [
 * //                 "STRING_VALUE",
 * //               ],
 * //               ContainerArguments: [
 * //                 "STRING_VALUE",
 * //               ],
 * //               TrainingImageConfig: {
 * //                 TrainingRepositoryAccessMode: "Platform" || "Vpc", // required
 * //                 TrainingRepositoryAuthConfig: {
 * //                   TrainingRepositoryCredentialsProviderArn: "STRING_VALUE", // required
 * //                 },
 * //               },
 * //             },
 * //             RoleArn: "STRING_VALUE",
 * //             InputDataConfig: [
 * //               {
 * //                 ChannelName: "STRING_VALUE", // required
 * //                 DataSource: {
 * //                   S3DataSource: {
 * //                     S3DataType: "ManifestFile" || "S3Prefix" || "AugmentedManifestFile", // required
 * //                     S3Uri: "STRING_VALUE", // required
 * //                     S3DataDistributionType: "FullyReplicated" || "ShardedByS3Key",
 * //                     AttributeNames: [
 * //                       "STRING_VALUE",
 * //                     ],
 * //                     InstanceGroupNames: [
 * //                       "STRING_VALUE",
 * //                     ],
 * //                     ModelAccessConfig: {
 * //                       AcceptEula: true || false, // required
 * //                     },
 * //                     HubAccessConfig: {
 * //                       HubContentArn: "STRING_VALUE", // required
 * //                     },
 * //                   },
 * //                   FileSystemDataSource: {
 * //                     FileSystemId: "STRING_VALUE", // required
 * //                     FileSystemAccessMode: "rw" || "ro", // required
 * //                     FileSystemType: "EFS" || "FSxLustre", // required
 * //                     DirectoryPath: "STRING_VALUE", // required
 * //                   },
 * //                 },
 * //                 ContentType: "STRING_VALUE",
 * //                 CompressionType: "None" || "Gzip",
 * //                 RecordWrapperType: "None" || "RecordIO",
 * //                 InputMode: "Pipe" || "File" || "FastFile",
 * //                 ShuffleConfig: {
 * //                   Seed: Number("long"), // required
 * //                 },
 * //               },
 * //             ],
 * //             OutputDataConfig: {
 * //               KmsKeyId: "STRING_VALUE",
 * //               S3OutputPath: "STRING_VALUE", // required
 * //               CompressionType: "GZIP" || "NONE",
 * //             },
 * //             ResourceConfig: {
 * //               InstanceType: "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.c5n.xlarge" || "ml.c5n.2xlarge" || "ml.c5n.4xlarge" || "ml.c5n.9xlarge" || "ml.c5n.18xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.16xlarge" || "ml.g6.12xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.16xlarge" || "ml.g6e.12xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.trn2.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.8xlarge" || "ml.c6i.4xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.8xlarge" || "ml.r5d.12xlarge" || "ml.r5d.16xlarge" || "ml.r5d.24xlarge" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge",
 * //               InstanceCount: Number("int"),
 * //               VolumeSizeInGB: Number("int"), // required
 * //               VolumeKmsKeyId: "STRING_VALUE",
 * //               KeepAlivePeriodInSeconds: Number("int"),
 * //               InstanceGroups: [
 * //                 {
 * //                   InstanceType: "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.c5n.xlarge" || "ml.c5n.2xlarge" || "ml.c5n.4xlarge" || "ml.c5n.9xlarge" || "ml.c5n.18xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.16xlarge" || "ml.g6.12xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.16xlarge" || "ml.g6e.12xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.trn2.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.8xlarge" || "ml.c6i.4xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.8xlarge" || "ml.r5d.12xlarge" || "ml.r5d.16xlarge" || "ml.r5d.24xlarge" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge", // required
 * //                   InstanceCount: Number("int"), // required
 * //                   InstanceGroupName: "STRING_VALUE", // required
 * //                 },
 * //               ],
 * //               TrainingPlanArn: "STRING_VALUE",
 * //             },
 * //             VpcConfig: {
 * //               SecurityGroupIds: [ // required
 * //                 "STRING_VALUE",
 * //               ],
 * //               Subnets: [ // required
 * //                 "STRING_VALUE",
 * //               ],
 * //             },
 * //             StoppingCondition: {
 * //               MaxRuntimeInSeconds: Number("int"),
 * //               MaxWaitTimeInSeconds: Number("int"),
 * //               MaxPendingTimeInSeconds: Number("int"),
 * //             },
 * //             CreationTime: new Date("TIMESTAMP"),
 * //             TrainingStartTime: new Date("TIMESTAMP"),
 * //             TrainingEndTime: new Date("TIMESTAMP"),
 * //             LastModifiedTime: new Date("TIMESTAMP"),
 * //             SecondaryStatusTransitions: [
 * //               {
 * //                 Status: "Starting" || "LaunchingMLInstances" || "PreparingTrainingStack" || "Downloading" || "DownloadingTrainingImage" || "Training" || "Uploading" || "Stopping" || "Stopped" || "MaxRuntimeExceeded" || "Completed" || "Failed" || "Interrupted" || "MaxWaitTimeExceeded" || "Updating" || "Restarting" || "Pending", // required
 * //                 StartTime: new Date("TIMESTAMP"), // required
 * //                 EndTime: new Date("TIMESTAMP"),
 * //                 StatusMessage: "STRING_VALUE",
 * //               },
 * //             ],
 * //             FinalMetricDataList: [
 * //               {
 * //                 MetricName: "STRING_VALUE",
 * //                 Value: Number("float"),
 * //                 Timestamp: new Date("TIMESTAMP"),
 * //               },
 * //             ],
 * //             EnableNetworkIsolation: true || false,
 * //             EnableInterContainerTrafficEncryption: true || false,
 * //             EnableManagedSpotTraining: true || false,
 * //             CheckpointConfig: {
 * //               S3Uri: "STRING_VALUE", // required
 * //               LocalPath: "STRING_VALUE",
 * //             },
 * //             TrainingTimeInSeconds: Number("int"),
 * //             BillableTimeInSeconds: Number("int"),
 * //             DebugHookConfig: {
 * //               LocalPath: "STRING_VALUE",
 * //               S3OutputPath: "STRING_VALUE", // required
 * //               HookParameters: {
 * //                 "<keys>": "STRING_VALUE",
 * //               },
 * //               CollectionConfigurations: [
 * //                 {
 * //                   CollectionName: "STRING_VALUE",
 * //                   CollectionParameters: {
 * //                     "<keys>": "STRING_VALUE",
 * //                   },
 * //                 },
 * //               ],
 * //             },
 * //             ExperimentConfig: {
 * //               ExperimentName: "STRING_VALUE",
 * //               TrialName: "STRING_VALUE",
 * //               TrialComponentDisplayName: "STRING_VALUE",
 * //               RunName: "STRING_VALUE",
 * //             },
 * //             DebugRuleConfigurations: [
 * //               {
 * //                 RuleConfigurationName: "STRING_VALUE", // required
 * //                 LocalPath: "STRING_VALUE",
 * //                 S3OutputPath: "STRING_VALUE",
 * //                 RuleEvaluatorImage: "STRING_VALUE", // required
 * //                 InstanceType: "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.8xlarge" || "ml.r5d.12xlarge" || "ml.r5d.16xlarge" || "ml.r5d.24xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.12xlarge" || "ml.g6e.16xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge",
 * //                 VolumeSizeInGB: Number("int"),
 * //                 RuleParameters: {
 * //                   "<keys>": "STRING_VALUE",
 * //                 },
 * //               },
 * //             ],
 * //             TensorBoardOutputConfig: {
 * //               LocalPath: "STRING_VALUE",
 * //               S3OutputPath: "STRING_VALUE", // required
 * //             },
 * //             DebugRuleEvaluationStatuses: [
 * //               {
 * //                 RuleConfigurationName: "STRING_VALUE",
 * //                 RuleEvaluationJobArn: "STRING_VALUE",
 * //                 RuleEvaluationStatus: "InProgress" || "NoIssuesFound" || "IssuesFound" || "Error" || "Stopping" || "Stopped",
 * //                 StatusDetails: "STRING_VALUE",
 * //                 LastModifiedTime: new Date("TIMESTAMP"),
 * //               },
 * //             ],
 * //             ProfilerConfig: {
 * //               S3OutputPath: "STRING_VALUE",
 * //               ProfilingIntervalInMilliseconds: Number("long"),
 * //               ProfilingParameters: {
 * //                 "<keys>": "STRING_VALUE",
 * //               },
 * //               DisableProfiler: true || false,
 * //             },
 * //             Environment: {
 * //               "<keys>": "STRING_VALUE",
 * //             },
 * //             RetryStrategy: {
 * //               MaximumRetryAttempts: Number("int"), // required
 * //             },
 * //             Tags: [
 * //               {
 * //                 Key: "STRING_VALUE", // required
 * //                 Value: "STRING_VALUE", // required
 * //               },
 * //             ],
 * //           },
 * //           ProcessingJob: { // ProcessingJob
 * //             ProcessingInputs: [ // ProcessingInputs
 * //               { // ProcessingInput
 * //                 InputName: "STRING_VALUE", // required
 * //                 AppManaged: true || false,
 * //                 S3Input: { // ProcessingS3Input
 * //                   S3Uri: "STRING_VALUE", // required
 * //                   LocalPath: "STRING_VALUE",
 * //                   S3DataType: "ManifestFile" || "S3Prefix", // required
 * //                   S3InputMode: "Pipe" || "File",
 * //                   S3DataDistributionType: "FullyReplicated" || "ShardedByS3Key",
 * //                   S3CompressionType: "None" || "Gzip",
 * //                 },
 * //                 DatasetDefinition: { // DatasetDefinition
 * //                   AthenaDatasetDefinition: { // AthenaDatasetDefinition
 * //                     Catalog: "STRING_VALUE", // required
 * //                     Database: "STRING_VALUE", // required
 * //                     QueryString: "STRING_VALUE", // required
 * //                     WorkGroup: "STRING_VALUE",
 * //                     OutputS3Uri: "STRING_VALUE", // required
 * //                     KmsKeyId: "STRING_VALUE",
 * //                     OutputFormat: "PARQUET" || "ORC" || "AVRO" || "JSON" || "TEXTFILE", // required
 * //                     OutputCompression: "GZIP" || "SNAPPY" || "ZLIB",
 * //                   },
 * //                   RedshiftDatasetDefinition: { // RedshiftDatasetDefinition
 * //                     ClusterId: "STRING_VALUE", // required
 * //                     Database: "STRING_VALUE", // required
 * //                     DbUser: "STRING_VALUE", // required
 * //                     QueryString: "STRING_VALUE", // required
 * //                     ClusterRoleArn: "STRING_VALUE", // required
 * //                     OutputS3Uri: "STRING_VALUE", // required
 * //                     KmsKeyId: "STRING_VALUE",
 * //                     OutputFormat: "PARQUET" || "CSV", // required
 * //                     OutputCompression: "None" || "GZIP" || "BZIP2" || "ZSTD" || "SNAPPY",
 * //                   },
 * //                   LocalPath: "STRING_VALUE",
 * //                   DataDistributionType: "FullyReplicated" || "ShardedByS3Key",
 * //                   InputMode: "Pipe" || "File",
 * //                 },
 * //               },
 * //             ],
 * //             ProcessingOutputConfig: { // ProcessingOutputConfig
 * //               Outputs: [ // ProcessingOutputs // required
 * //                 { // ProcessingOutput
 * //                   OutputName: "STRING_VALUE", // required
 * //                   S3Output: { // ProcessingS3Output
 * //                     S3Uri: "STRING_VALUE", // required
 * //                     LocalPath: "STRING_VALUE",
 * //                     S3UploadMode: "Continuous" || "EndOfJob", // required
 * //                   },
 * //                   FeatureStoreOutput: { // ProcessingFeatureStoreOutput
 * //                     FeatureGroupName: "STRING_VALUE", // required
 * //                   },
 * //                   AppManaged: true || false,
 * //                 },
 * //               ],
 * //               KmsKeyId: "STRING_VALUE",
 * //             },
 * //             ProcessingJobName: "STRING_VALUE",
 * //             ProcessingResources: { // ProcessingResources
 * //               ClusterConfig: { // ProcessingClusterConfig
 * //                 InstanceCount: Number("int"), // required
 * //                 InstanceType: "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.8xlarge" || "ml.r5d.12xlarge" || "ml.r5d.16xlarge" || "ml.r5d.24xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.12xlarge" || "ml.g6e.16xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge", // required
 * //                 VolumeSizeInGB: Number("int"), // required
 * //                 VolumeKmsKeyId: "STRING_VALUE",
 * //               },
 * //             },
 * //             StoppingCondition: { // ProcessingStoppingCondition
 * //               MaxRuntimeInSeconds: Number("int"), // required
 * //             },
 * //             AppSpecification: { // AppSpecification
 * //               ImageUri: "STRING_VALUE", // required
 * //               ContainerEntrypoint: [ // ContainerEntrypoint
 * //                 "STRING_VALUE",
 * //               ],
 * //               ContainerArguments: [ // ContainerArguments
 * //                 "STRING_VALUE",
 * //               ],
 * //             },
 * //             Environment: { // ProcessingEnvironmentMap
 * //               "<keys>": "STRING_VALUE",
 * //             },
 * //             NetworkConfig: { // NetworkConfig
 * //               EnableInterContainerTrafficEncryption: true || false,
 * //               EnableNetworkIsolation: true || false,
 * //               VpcConfig: "<VpcConfig>",
 * //             },
 * //             RoleArn: "STRING_VALUE",
 * //             ExperimentConfig: {
 * //               ExperimentName: "STRING_VALUE",
 * //               TrialName: "STRING_VALUE",
 * //               TrialComponentDisplayName: "STRING_VALUE",
 * //               RunName: "STRING_VALUE",
 * //             },
 * //             ProcessingJobArn: "STRING_VALUE",
 * //             ProcessingJobStatus: "InProgress" || "Completed" || "Failed" || "Stopping" || "Stopped",
 * //             ExitMessage: "STRING_VALUE",
 * //             FailureReason: "STRING_VALUE",
 * //             ProcessingEndTime: new Date("TIMESTAMP"),
 * //             ProcessingStartTime: new Date("TIMESTAMP"),
 * //             LastModifiedTime: new Date("TIMESTAMP"),
 * //             CreationTime: new Date("TIMESTAMP"),
 * //             MonitoringScheduleArn: "STRING_VALUE",
 * //             AutoMLJobArn: "STRING_VALUE",
 * //             TrainingJobArn: "STRING_VALUE",
 * //             Tags: [
 * //               {
 * //                 Key: "STRING_VALUE", // required
 * //                 Value: "STRING_VALUE", // required
 * //               },
 * //             ],
 * //           },
 * //           TransformJob: { // TransformJob
 * //             TransformJobName: "STRING_VALUE",
 * //             TransformJobArn: "STRING_VALUE",
 * //             TransformJobStatus: "InProgress" || "Completed" || "Failed" || "Stopping" || "Stopped",
 * //             FailureReason: "STRING_VALUE",
 * //             ModelName: "STRING_VALUE",
 * //             MaxConcurrentTransforms: Number("int"),
 * //             ModelClientConfig: { // ModelClientConfig
 * //               InvocationsTimeoutInSeconds: Number("int"),
 * //               InvocationsMaxRetries: Number("int"),
 * //             },
 * //             MaxPayloadInMB: Number("int"),
 * //             BatchStrategy: "MultiRecord" || "SingleRecord",
 * //             Environment: { // TransformEnvironmentMap
 * //               "<keys>": "STRING_VALUE",
 * //             },
 * //             TransformInput: { // TransformInput
 * //               DataSource: { // TransformDataSource
 * //                 S3DataSource: { // TransformS3DataSource
 * //                   S3DataType: "ManifestFile" || "S3Prefix" || "AugmentedManifestFile", // required
 * //                   S3Uri: "STRING_VALUE", // required
 * //                 },
 * //               },
 * //               ContentType: "STRING_VALUE",
 * //               CompressionType: "None" || "Gzip",
 * //               SplitType: "None" || "Line" || "RecordIO" || "TFRecord",
 * //             },
 * //             TransformOutput: { // TransformOutput
 * //               S3OutputPath: "STRING_VALUE", // required
 * //               Accept: "STRING_VALUE",
 * //               AssembleWith: "None" || "Line",
 * //               KmsKeyId: "STRING_VALUE",
 * //             },
 * //             DataCaptureConfig: { // BatchDataCaptureConfig
 * //               DestinationS3Uri: "STRING_VALUE", // required
 * //               KmsKeyId: "STRING_VALUE",
 * //               GenerateInferenceId: true || false,
 * //             },
 * //             TransformResources: { // TransformResources
 * //               InstanceType: "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.12xlarge" || "ml.g5.16xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.inf2.xlarge" || "ml.inf2.8xlarge" || "ml.inf2.24xlarge" || "ml.inf2.48xlarge", // required
 * //               InstanceCount: Number("int"), // required
 * //               VolumeKmsKeyId: "STRING_VALUE",
 * //               TransformAmiVersion: "STRING_VALUE",
 * //             },
 * //             CreationTime: new Date("TIMESTAMP"),
 * //             TransformStartTime: new Date("TIMESTAMP"),
 * //             TransformEndTime: new Date("TIMESTAMP"),
 * //             LabelingJobArn: "STRING_VALUE",
 * //             AutoMLJobArn: "STRING_VALUE",
 * //             DataProcessing: { // DataProcessing
 * //               InputFilter: "STRING_VALUE",
 * //               OutputFilter: "STRING_VALUE",
 * //               JoinSource: "Input" || "None",
 * //             },
 * //             ExperimentConfig: {
 * //               ExperimentName: "STRING_VALUE",
 * //               TrialName: "STRING_VALUE",
 * //               TrialComponentDisplayName: "STRING_VALUE",
 * //               RunName: "STRING_VALUE",
 * //             },
 * //             Tags: "<TagList>",
 * //           },
 * //         },
 * //         LineageGroupArn: "STRING_VALUE",
 * //         Tags: "<TagList>",
 * //         Parents: [ // Parents
 * //           { // Parent
 * //             TrialName: "STRING_VALUE",
 * //             ExperimentName: "STRING_VALUE",
 * //           },
 * //         ],
 * //         RunName: "STRING_VALUE",
 * //       },
 * //       Endpoint: { // Endpoint
 * //         EndpointName: "STRING_VALUE", // required
 * //         EndpointArn: "STRING_VALUE", // required
 * //         EndpointConfigName: "STRING_VALUE", // required
 * //         ProductionVariants: [ // ProductionVariantSummaryList
 * //           { // ProductionVariantSummary
 * //             VariantName: "STRING_VALUE", // required
 * //             DeployedImages: [ // DeployedImages
 * //               { // DeployedImage
 * //                 SpecifiedImage: "STRING_VALUE",
 * //                 ResolvedImage: "STRING_VALUE",
 * //                 ResolutionTime: new Date("TIMESTAMP"),
 * //               },
 * //             ],
 * //             CurrentWeight: Number("float"),
 * //             DesiredWeight: Number("float"),
 * //             CurrentInstanceCount: Number("int"),
 * //             DesiredInstanceCount: Number("int"),
 * //             VariantStatus: [ // ProductionVariantStatusList
 * //               { // ProductionVariantStatus
 * //                 Status: "Creating" || "Updating" || "Deleting" || "ActivatingTraffic" || "Baking", // required
 * //                 StatusMessage: "STRING_VALUE",
 * //                 StartTime: new Date("TIMESTAMP"),
 * //               },
 * //             ],
 * //             CurrentServerlessConfig: { // ProductionVariantServerlessConfig
 * //               MemorySizeInMB: Number("int"), // required
 * //               MaxConcurrency: Number("int"), // required
 * //               ProvisionedConcurrency: Number("int"),
 * //             },
 * //             DesiredServerlessConfig: {
 * //               MemorySizeInMB: Number("int"), // required
 * //               MaxConcurrency: Number("int"), // required
 * //               ProvisionedConcurrency: Number("int"),
 * //             },
 * //             ManagedInstanceScaling: { // ProductionVariantManagedInstanceScaling
 * //               Status: "ENABLED" || "DISABLED",
 * //               MinInstanceCount: Number("int"),
 * //               MaxInstanceCount: Number("int"),
 * //             },
 * //             RoutingConfig: { // ProductionVariantRoutingConfig
 * //               RoutingStrategy: "LEAST_OUTSTANDING_REQUESTS" || "RANDOM", // required
 * //             },
 * //           },
 * //         ],
 * //         DataCaptureConfig: { // DataCaptureConfigSummary
 * //           EnableCapture: true || false, // required
 * //           CaptureStatus: "Started" || "Stopped", // required
 * //           CurrentSamplingPercentage: Number("int"), // required
 * //           DestinationS3Uri: "STRING_VALUE", // required
 * //           KmsKeyId: "STRING_VALUE", // required
 * //         },
 * //         EndpointStatus: "OutOfService" || "Creating" || "Updating" || "SystemUpdating" || "RollingBack" || "InService" || "Deleting" || "Failed" || "UpdateRollbackFailed", // required
 * //         FailureReason: "STRING_VALUE",
 * //         CreationTime: new Date("TIMESTAMP"), // required
 * //         LastModifiedTime: new Date("TIMESTAMP"), // required
 * //         MonitoringSchedules: [ // MonitoringScheduleList
 * //           { // MonitoringSchedule
 * //             MonitoringScheduleArn: "STRING_VALUE",
 * //             MonitoringScheduleName: "STRING_VALUE",
 * //             MonitoringScheduleStatus: "Pending" || "Failed" || "Scheduled" || "Stopped",
 * //             MonitoringType: "DataQuality" || "ModelQuality" || "ModelBias" || "ModelExplainability",
 * //             FailureReason: "STRING_VALUE",
 * //             CreationTime: new Date("TIMESTAMP"),
 * //             LastModifiedTime: new Date("TIMESTAMP"),
 * //             MonitoringScheduleConfig: { // MonitoringScheduleConfig
 * //               ScheduleConfig: { // ScheduleConfig
 * //                 ScheduleExpression: "STRING_VALUE", // required
 * //                 DataAnalysisStartTime: "STRING_VALUE",
 * //                 DataAnalysisEndTime: "STRING_VALUE",
 * //               },
 * //               MonitoringJobDefinition: { // MonitoringJobDefinition
 * //                 BaselineConfig: { // MonitoringBaselineConfig
 * //                   BaseliningJobName: "STRING_VALUE",
 * //                   ConstraintsResource: { // MonitoringConstraintsResource
 * //                     S3Uri: "STRING_VALUE",
 * //                   },
 * //                   StatisticsResource: { // MonitoringStatisticsResource
 * //                     S3Uri: "STRING_VALUE",
 * //                   },
 * //                 },
 * //                 MonitoringInputs: [ // MonitoringInputs // required
 * //                   { // MonitoringInput
 * //                     EndpointInput: { // EndpointInput
 * //                       EndpointName: "STRING_VALUE", // required
 * //                       LocalPath: "STRING_VALUE", // required
 * //                       S3InputMode: "Pipe" || "File",
 * //                       S3DataDistributionType: "FullyReplicated" || "ShardedByS3Key",
 * //                       FeaturesAttribute: "STRING_VALUE",
 * //                       InferenceAttribute: "STRING_VALUE",
 * //                       ProbabilityAttribute: "STRING_VALUE",
 * //                       ProbabilityThresholdAttribute: Number("double"),
 * //                       StartTimeOffset: "STRING_VALUE",
 * //                       EndTimeOffset: "STRING_VALUE",
 * //                       ExcludeFeaturesAttribute: "STRING_VALUE",
 * //                     },
 * //                     BatchTransformInput: { // BatchTransformInput
 * //                       DataCapturedDestinationS3Uri: "STRING_VALUE", // required
 * //                       DatasetFormat: { // MonitoringDatasetFormat
 * //                         Csv: { // MonitoringCsvDatasetFormat
 * //                           Header: true || false,
 * //                         },
 * //                         Json: { // MonitoringJsonDatasetFormat
 * //                           Line: true || false,
 * //                         },
 * //                         Parquet: {},
 * //                       },
 * //                       LocalPath: "STRING_VALUE", // required
 * //                       S3InputMode: "Pipe" || "File",
 * //                       S3DataDistributionType: "FullyReplicated" || "ShardedByS3Key",
 * //                       FeaturesAttribute: "STRING_VALUE",
 * //                       InferenceAttribute: "STRING_VALUE",
 * //                       ProbabilityAttribute: "STRING_VALUE",
 * //                       ProbabilityThresholdAttribute: Number("double"),
 * //                       StartTimeOffset: "STRING_VALUE",
 * //                       EndTimeOffset: "STRING_VALUE",
 * //                       ExcludeFeaturesAttribute: "STRING_VALUE",
 * //                     },
 * //                   },
 * //                 ],
 * //                 MonitoringOutputConfig: { // MonitoringOutputConfig
 * //                   MonitoringOutputs: [ // MonitoringOutputs // required
 * //                     { // MonitoringOutput
 * //                       S3Output: { // MonitoringS3Output
 * //                         S3Uri: "STRING_VALUE", // required
 * //                         LocalPath: "STRING_VALUE", // required
 * //                         S3UploadMode: "Continuous" || "EndOfJob",
 * //                       },
 * //                     },
 * //                   ],
 * //                   KmsKeyId: "STRING_VALUE",
 * //                 },
 * //                 MonitoringResources: { // MonitoringResources
 * //                   ClusterConfig: { // MonitoringClusterConfig
 * //                     InstanceCount: Number("int"), // required
 * //                     InstanceType: "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.8xlarge" || "ml.r5d.12xlarge" || "ml.r5d.16xlarge" || "ml.r5d.24xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.12xlarge" || "ml.g6e.16xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge", // required
 * //                     VolumeSizeInGB: Number("int"), // required
 * //                     VolumeKmsKeyId: "STRING_VALUE",
 * //                   },
 * //                 },
 * //                 MonitoringAppSpecification: { // MonitoringAppSpecification
 * //                   ImageUri: "STRING_VALUE", // required
 * //                   ContainerEntrypoint: [
 * //                     "STRING_VALUE",
 * //                   ],
 * //                   ContainerArguments: [ // MonitoringContainerArguments
 * //                     "STRING_VALUE",
 * //                   ],
 * //                   RecordPreprocessorSourceUri: "STRING_VALUE",
 * //                   PostAnalyticsProcessorSourceUri: "STRING_VALUE",
 * //                 },
 * //                 StoppingCondition: { // MonitoringStoppingCondition
 * //                   MaxRuntimeInSeconds: Number("int"), // required
 * //                 },
 * //                 Environment: { // MonitoringEnvironmentMap
 * //                   "<keys>": "STRING_VALUE",
 * //                 },
 * //                 NetworkConfig: {
 * //                   EnableInterContainerTrafficEncryption: true || false,
 * //                   EnableNetworkIsolation: true || false,
 * //                   VpcConfig: "<VpcConfig>",
 * //                 },
 * //                 RoleArn: "STRING_VALUE", // required
 * //               },
 * //               MonitoringJobDefinitionName: "STRING_VALUE",
 * //               MonitoringType: "DataQuality" || "ModelQuality" || "ModelBias" || "ModelExplainability",
 * //             },
 * //             EndpointName: "STRING_VALUE",
 * //             LastMonitoringExecutionSummary: { // MonitoringExecutionSummary
 * //               MonitoringScheduleName: "STRING_VALUE", // required
 * //               ScheduledTime: new Date("TIMESTAMP"), // required
 * //               CreationTime: new Date("TIMESTAMP"), // required
 * //               LastModifiedTime: new Date("TIMESTAMP"), // required
 * //               MonitoringExecutionStatus: "Pending" || "Completed" || "CompletedWithViolations" || "InProgress" || "Failed" || "Stopping" || "Stopped", // required
 * //               ProcessingJobArn: "STRING_VALUE",
 * //               EndpointName: "STRING_VALUE",
 * //               FailureReason: "STRING_VALUE",
 * //               MonitoringJobDefinitionName: "STRING_VALUE",
 * //               MonitoringType: "DataQuality" || "ModelQuality" || "ModelBias" || "ModelExplainability",
 * //             },
 * //             Tags: "<TagList>",
 * //           },
 * //         ],
 * //         Tags: "<TagList>",
 * //         ShadowProductionVariants: [
 * //           {
 * //             VariantName: "STRING_VALUE", // required
 * //             DeployedImages: [
 * //               {
 * //                 SpecifiedImage: "STRING_VALUE",
 * //                 ResolvedImage: "STRING_VALUE",
 * //                 ResolutionTime: new Date("TIMESTAMP"),
 * //               },
 * //             ],
 * //             CurrentWeight: Number("float"),
 * //             DesiredWeight: Number("float"),
 * //             CurrentInstanceCount: Number("int"),
 * //             DesiredInstanceCount: Number("int"),
 * //             VariantStatus: [
 * //               {
 * //                 Status: "Creating" || "Updating" || "Deleting" || "ActivatingTraffic" || "Baking", // required
 * //                 StatusMessage: "STRING_VALUE",
 * //                 StartTime: new Date("TIMESTAMP"),
 * //               },
 * //             ],
 * //             CurrentServerlessConfig: {
 * //               MemorySizeInMB: Number("int"), // required
 * //               MaxConcurrency: Number("int"), // required
 * //               ProvisionedConcurrency: Number("int"),
 * //             },
 * //             DesiredServerlessConfig: {
 * //               MemorySizeInMB: Number("int"), // required
 * //               MaxConcurrency: Number("int"), // required
 * //               ProvisionedConcurrency: Number("int"),
 * //             },
 * //             ManagedInstanceScaling: {
 * //               Status: "ENABLED" || "DISABLED",
 * //               MinInstanceCount: Number("int"),
 * //               MaxInstanceCount: Number("int"),
 * //             },
 * //             RoutingConfig: {
 * //               RoutingStrategy: "LEAST_OUTSTANDING_REQUESTS" || "RANDOM", // required
 * //             },
 * //           },
 * //         ],
 * //       },
 * //       ModelPackage: { // ModelPackage
 * //         ModelPackageName: "STRING_VALUE",
 * //         ModelPackageGroupName: "STRING_VALUE",
 * //         ModelPackageVersion: Number("int"),
 * //         ModelPackageArn: "STRING_VALUE",
 * //         ModelPackageDescription: "STRING_VALUE",
 * //         CreationTime: new Date("TIMESTAMP"),
 * //         InferenceSpecification: { // InferenceSpecification
 * //           Containers: [ // ModelPackageContainerDefinitionList // required
 * //             { // ModelPackageContainerDefinition
 * //               ContainerHostname: "STRING_VALUE",
 * //               Image: "STRING_VALUE", // required
 * //               ImageDigest: "STRING_VALUE",
 * //               ModelDataUrl: "STRING_VALUE",
 * //               ModelDataSource: { // ModelDataSource
 * //                 S3DataSource: { // S3ModelDataSource
 * //                   S3Uri: "STRING_VALUE", // required
 * //                   S3DataType: "S3Prefix" || "S3Object", // required
 * //                   CompressionType: "None" || "Gzip", // required
 * //                   ModelAccessConfig: "<ModelAccessConfig>",
 * //                   HubAccessConfig: { // InferenceHubAccessConfig
 * //                     HubContentArn: "STRING_VALUE", // required
 * //                   },
 * //                   ManifestS3Uri: "STRING_VALUE",
 * //                   ETag: "STRING_VALUE",
 * //                   ManifestEtag: "STRING_VALUE",
 * //                 },
 * //               },
 * //               ProductId: "STRING_VALUE",
 * //               Environment: { // EnvironmentMap
 * //                 "<keys>": "STRING_VALUE",
 * //               },
 * //               ModelInput: { // ModelInput
 * //                 DataInputConfig: "STRING_VALUE", // required
 * //               },
 * //               Framework: "STRING_VALUE",
 * //               FrameworkVersion: "STRING_VALUE",
 * //               NearestModelName: "STRING_VALUE",
 * //               AdditionalS3DataSource: { // AdditionalS3DataSource
 * //                 S3DataType: "S3Object" || "S3Prefix", // required
 * //                 S3Uri: "STRING_VALUE", // required
 * //                 CompressionType: "None" || "Gzip",
 * //                 ETag: "STRING_VALUE",
 * //               },
 * //               ModelDataETag: "STRING_VALUE",
 * //             },
 * //           ],
 * //           SupportedTransformInstanceTypes: [ // TransformInstanceTypes
 * //             "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.12xlarge" || "ml.g5.16xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.inf2.xlarge" || "ml.inf2.8xlarge" || "ml.inf2.24xlarge" || "ml.inf2.48xlarge",
 * //           ],
 * //           SupportedRealtimeInferenceInstanceTypes: [ // RealtimeInferenceInstanceTypes
 * //             "ml.t2.medium" || "ml.t2.large" || "ml.t2.xlarge" || "ml.t2.2xlarge" || "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.m5d.large" || "ml.m5d.xlarge" || "ml.m5d.2xlarge" || "ml.m5d.4xlarge" || "ml.m5d.12xlarge" || "ml.m5d.24xlarge" || "ml.c4.large" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.c5.large" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.c5d.large" || "ml.c5d.xlarge" || "ml.c5d.2xlarge" || "ml.c5d.4xlarge" || "ml.c5d.9xlarge" || "ml.c5d.18xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.12xlarge" || "ml.r5.24xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.12xlarge" || "ml.r5d.24xlarge" || "ml.inf1.xlarge" || "ml.inf1.2xlarge" || "ml.inf1.6xlarge" || "ml.inf1.24xlarge" || "ml.dl1.24xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.12xlarge" || "ml.g5.16xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.r8g.medium" || "ml.r8g.large" || "ml.r8g.xlarge" || "ml.r8g.2xlarge" || "ml.r8g.4xlarge" || "ml.r8g.8xlarge" || "ml.r8g.12xlarge" || "ml.r8g.16xlarge" || "ml.r8g.24xlarge" || "ml.r8g.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.12xlarge" || "ml.g6e.16xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.p4d.24xlarge" || "ml.c7g.large" || "ml.c7g.xlarge" || "ml.c7g.2xlarge" || "ml.c7g.4xlarge" || "ml.c7g.8xlarge" || "ml.c7g.12xlarge" || "ml.c7g.16xlarge" || "ml.m6g.large" || "ml.m6g.xlarge" || "ml.m6g.2xlarge" || "ml.m6g.4xlarge" || "ml.m6g.8xlarge" || "ml.m6g.12xlarge" || "ml.m6g.16xlarge" || "ml.m6gd.large" || "ml.m6gd.xlarge" || "ml.m6gd.2xlarge" || "ml.m6gd.4xlarge" || "ml.m6gd.8xlarge" || "ml.m6gd.12xlarge" || "ml.m6gd.16xlarge" || "ml.c6g.large" || "ml.c6g.xlarge" || "ml.c6g.2xlarge" || "ml.c6g.4xlarge" || "ml.c6g.8xlarge" || "ml.c6g.12xlarge" || "ml.c6g.16xlarge" || "ml.c6gd.large" || "ml.c6gd.xlarge" || "ml.c6gd.2xlarge" || "ml.c6gd.4xlarge" || "ml.c6gd.8xlarge" || "ml.c6gd.12xlarge" || "ml.c6gd.16xlarge" || "ml.c6gn.large" || "ml.c6gn.xlarge" || "ml.c6gn.2xlarge" || "ml.c6gn.4xlarge" || "ml.c6gn.8xlarge" || "ml.c6gn.12xlarge" || "ml.c6gn.16xlarge" || "ml.r6g.large" || "ml.r6g.xlarge" || "ml.r6g.2xlarge" || "ml.r6g.4xlarge" || "ml.r6g.8xlarge" || "ml.r6g.12xlarge" || "ml.r6g.16xlarge" || "ml.r6gd.large" || "ml.r6gd.xlarge" || "ml.r6gd.2xlarge" || "ml.r6gd.4xlarge" || "ml.r6gd.8xlarge" || "ml.r6gd.12xlarge" || "ml.r6gd.16xlarge" || "ml.p4de.24xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.trn2.48xlarge" || "ml.inf2.xlarge" || "ml.inf2.8xlarge" || "ml.inf2.24xlarge" || "ml.inf2.48xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge",
 * //           ],
 * //           SupportedContentTypes: [ // ContentTypes
 * //             "STRING_VALUE",
 * //           ],
 * //           SupportedResponseMIMETypes: [ // ResponseMIMETypes
 * //             "STRING_VALUE",
 * //           ],
 * //         },
 * //         SourceAlgorithmSpecification: { // SourceAlgorithmSpecification
 * //           SourceAlgorithms: [ // SourceAlgorithmList // required
 * //             { // SourceAlgorithm
 * //               ModelDataUrl: "STRING_VALUE",
 * //               ModelDataSource: {
 * //                 S3DataSource: {
 * //                   S3Uri: "STRING_VALUE", // required
 * //                   S3DataType: "S3Prefix" || "S3Object", // required
 * //                   CompressionType: "None" || "Gzip", // required
 * //                   ModelAccessConfig: "<ModelAccessConfig>",
 * //                   HubAccessConfig: {
 * //                     HubContentArn: "STRING_VALUE", // required
 * //                   },
 * //                   ManifestS3Uri: "STRING_VALUE",
 * //                   ETag: "STRING_VALUE",
 * //                   ManifestEtag: "STRING_VALUE",
 * //                 },
 * //               },
 * //               ModelDataETag: "STRING_VALUE",
 * //               AlgorithmName: "STRING_VALUE", // required
 * //             },
 * //           ],
 * //         },
 * //         ValidationSpecification: { // ModelPackageValidationSpecification
 * //           ValidationRole: "STRING_VALUE", // required
 * //           ValidationProfiles: [ // ModelPackageValidationProfiles // required
 * //             { // ModelPackageValidationProfile
 * //               ProfileName: "STRING_VALUE", // required
 * //               TransformJobDefinition: { // TransformJobDefinition
 * //                 MaxConcurrentTransforms: Number("int"),
 * //                 MaxPayloadInMB: Number("int"),
 * //                 BatchStrategy: "MultiRecord" || "SingleRecord",
 * //                 Environment: {
 * //                   "<keys>": "STRING_VALUE",
 * //                 },
 * //                 TransformInput: {
 * //                   DataSource: {
 * //                     S3DataSource: {
 * //                       S3DataType: "ManifestFile" || "S3Prefix" || "AugmentedManifestFile", // required
 * //                       S3Uri: "STRING_VALUE", // required
 * //                     },
 * //                   },
 * //                   ContentType: "STRING_VALUE",
 * //                   CompressionType: "None" || "Gzip",
 * //                   SplitType: "None" || "Line" || "RecordIO" || "TFRecord",
 * //                 },
 * //                 TransformOutput: {
 * //                   S3OutputPath: "STRING_VALUE", // required
 * //                   Accept: "STRING_VALUE",
 * //                   AssembleWith: "None" || "Line",
 * //                   KmsKeyId: "STRING_VALUE",
 * //                 },
 * //                 TransformResources: {
 * //                   InstanceType: "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.12xlarge" || "ml.g5.16xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.inf2.xlarge" || "ml.inf2.8xlarge" || "ml.inf2.24xlarge" || "ml.inf2.48xlarge", // required
 * //                   InstanceCount: Number("int"), // required
 * //                   VolumeKmsKeyId: "STRING_VALUE",
 * //                   TransformAmiVersion: "STRING_VALUE",
 * //                 },
 * //               },
 * //             },
 * //           ],
 * //         },
 * //         ModelPackageStatus: "Pending" || "InProgress" || "Completed" || "Failed" || "Deleting",
 * //         ModelPackageStatusDetails: { // ModelPackageStatusDetails
 * //           ValidationStatuses: [ // ModelPackageStatusItemList // required
 * //             { // ModelPackageStatusItem
 * //               Name: "STRING_VALUE", // required
 * //               Status: "NotStarted" || "InProgress" || "Completed" || "Failed", // required
 * //               FailureReason: "STRING_VALUE",
 * //             },
 * //           ],
 * //           ImageScanStatuses: [
 * //             {
 * //               Name: "STRING_VALUE", // required
 * //               Status: "NotStarted" || "InProgress" || "Completed" || "Failed", // required
 * //               FailureReason: "STRING_VALUE",
 * //             },
 * //           ],
 * //         },
 * //         CertifyForMarketplace: true || false,
 * //         ModelApprovalStatus: "Approved" || "Rejected" || "PendingManualApproval",
 * //         CreatedBy: "<UserContext>",
 * //         MetadataProperties: {
 * //           CommitId: "STRING_VALUE",
 * //           Repository: "STRING_VALUE",
 * //           GeneratedBy: "STRING_VALUE",
 * //           ProjectId: "STRING_VALUE",
 * //         },
 * //         ModelMetrics: { // ModelMetrics
 * //           ModelQuality: { // ModelQuality
 * //             Statistics: { // MetricsSource
 * //               ContentType: "STRING_VALUE", // required
 * //               ContentDigest: "STRING_VALUE",
 * //               S3Uri: "STRING_VALUE", // required
 * //             },
 * //             Constraints: {
 * //               ContentType: "STRING_VALUE", // required
 * //               ContentDigest: "STRING_VALUE",
 * //               S3Uri: "STRING_VALUE", // required
 * //             },
 * //           },
 * //           ModelDataQuality: { // ModelDataQuality
 * //             Statistics: {
 * //               ContentType: "STRING_VALUE", // required
 * //               ContentDigest: "STRING_VALUE",
 * //               S3Uri: "STRING_VALUE", // required
 * //             },
 * //             Constraints: {
 * //               ContentType: "STRING_VALUE", // required
 * //               ContentDigest: "STRING_VALUE",
 * //               S3Uri: "STRING_VALUE", // required
 * //             },
 * //           },
 * //           Bias: { // Bias
 * //             Report: {
 * //               ContentType: "STRING_VALUE", // required
 * //               ContentDigest: "STRING_VALUE",
 * //               S3Uri: "STRING_VALUE", // required
 * //             },
 * //             PreTrainingReport: "<MetricsSource>",
 * //             PostTrainingReport: "<MetricsSource>",
 * //           },
 * //           Explainability: { // Explainability
 * //             Report: "<MetricsSource>",
 * //           },
 * //         },
 * //         LastModifiedTime: new Date("TIMESTAMP"),
 * //         LastModifiedBy: "<UserContext>",
 * //         ApprovalDescription: "STRING_VALUE",
 * //         Domain: "STRING_VALUE",
 * //         Task: "STRING_VALUE",
 * //         SamplePayloadUrl: "STRING_VALUE",
 * //         AdditionalInferenceSpecifications: [ // AdditionalInferenceSpecifications
 * //           { // AdditionalInferenceSpecificationDefinition
 * //             Name: "STRING_VALUE", // required
 * //             Description: "STRING_VALUE",
 * //             Containers: [ // required
 * //               {
 * //                 ContainerHostname: "STRING_VALUE",
 * //                 Image: "STRING_VALUE", // required
 * //                 ImageDigest: "STRING_VALUE",
 * //                 ModelDataUrl: "STRING_VALUE",
 * //                 ModelDataSource: {
 * //                   S3DataSource: {
 * //                     S3Uri: "STRING_VALUE", // required
 * //                     S3DataType: "S3Prefix" || "S3Object", // required
 * //                     CompressionType: "None" || "Gzip", // required
 * //                     ModelAccessConfig: "<ModelAccessConfig>",
 * //                     HubAccessConfig: {
 * //                       HubContentArn: "STRING_VALUE", // required
 * //                     },
 * //                     ManifestS3Uri: "STRING_VALUE",
 * //                     ETag: "STRING_VALUE",
 * //                     ManifestEtag: "STRING_VALUE",
 * //                   },
 * //                 },
 * //                 ProductId: "STRING_VALUE",
 * //                 Environment: {
 * //                   "<keys>": "STRING_VALUE",
 * //                 },
 * //                 ModelInput: {
 * //                   DataInputConfig: "STRING_VALUE", // required
 * //                 },
 * //                 Framework: "STRING_VALUE",
 * //                 FrameworkVersion: "STRING_VALUE",
 * //                 NearestModelName: "STRING_VALUE",
 * //                 AdditionalS3DataSource: {
 * //                   S3DataType: "S3Object" || "S3Prefix", // required
 * //                   S3Uri: "STRING_VALUE", // required
 * //                   CompressionType: "None" || "Gzip",
 * //                   ETag: "STRING_VALUE",
 * //                 },
 * //                 ModelDataETag: "STRING_VALUE",
 * //               },
 * //             ],
 * //             SupportedTransformInstanceTypes: [
 * //               "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.12xlarge" || "ml.g5.16xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.inf2.xlarge" || "ml.inf2.8xlarge" || "ml.inf2.24xlarge" || "ml.inf2.48xlarge",
 * //             ],
 * //             SupportedRealtimeInferenceInstanceTypes: [
 * //               "ml.t2.medium" || "ml.t2.large" || "ml.t2.xlarge" || "ml.t2.2xlarge" || "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.m5d.large" || "ml.m5d.xlarge" || "ml.m5d.2xlarge" || "ml.m5d.4xlarge" || "ml.m5d.12xlarge" || "ml.m5d.24xlarge" || "ml.c4.large" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.c5.large" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.c5d.large" || "ml.c5d.xlarge" || "ml.c5d.2xlarge" || "ml.c5d.4xlarge" || "ml.c5d.9xlarge" || "ml.c5d.18xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.12xlarge" || "ml.r5.24xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.12xlarge" || "ml.r5d.24xlarge" || "ml.inf1.xlarge" || "ml.inf1.2xlarge" || "ml.inf1.6xlarge" || "ml.inf1.24xlarge" || "ml.dl1.24xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.12xlarge" || "ml.g5.16xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.r8g.medium" || "ml.r8g.large" || "ml.r8g.xlarge" || "ml.r8g.2xlarge" || "ml.r8g.4xlarge" || "ml.r8g.8xlarge" || "ml.r8g.12xlarge" || "ml.r8g.16xlarge" || "ml.r8g.24xlarge" || "ml.r8g.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.12xlarge" || "ml.g6e.16xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.p4d.24xlarge" || "ml.c7g.large" || "ml.c7g.xlarge" || "ml.c7g.2xlarge" || "ml.c7g.4xlarge" || "ml.c7g.8xlarge" || "ml.c7g.12xlarge" || "ml.c7g.16xlarge" || "ml.m6g.large" || "ml.m6g.xlarge" || "ml.m6g.2xlarge" || "ml.m6g.4xlarge" || "ml.m6g.8xlarge" || "ml.m6g.12xlarge" || "ml.m6g.16xlarge" || "ml.m6gd.large" || "ml.m6gd.xlarge" || "ml.m6gd.2xlarge" || "ml.m6gd.4xlarge" || "ml.m6gd.8xlarge" || "ml.m6gd.12xlarge" || "ml.m6gd.16xlarge" || "ml.c6g.large" || "ml.c6g.xlarge" || "ml.c6g.2xlarge" || "ml.c6g.4xlarge" || "ml.c6g.8xlarge" || "ml.c6g.12xlarge" || "ml.c6g.16xlarge" || "ml.c6gd.large" || "ml.c6gd.xlarge" || "ml.c6gd.2xlarge" || "ml.c6gd.4xlarge" || "ml.c6gd.8xlarge" || "ml.c6gd.12xlarge" || "ml.c6gd.16xlarge" || "ml.c6gn.large" || "ml.c6gn.xlarge" || "ml.c6gn.2xlarge" || "ml.c6gn.4xlarge" || "ml.c6gn.8xlarge" || "ml.c6gn.12xlarge" || "ml.c6gn.16xlarge" || "ml.r6g.large" || "ml.r6g.xlarge" || "ml.r6g.2xlarge" || "ml.r6g.4xlarge" || "ml.r6g.8xlarge" || "ml.r6g.12xlarge" || "ml.r6g.16xlarge" || "ml.r6gd.large" || "ml.r6gd.xlarge" || "ml.r6gd.2xlarge" || "ml.r6gd.4xlarge" || "ml.r6gd.8xlarge" || "ml.r6gd.12xlarge" || "ml.r6gd.16xlarge" || "ml.p4de.24xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.trn2.48xlarge" || "ml.inf2.xlarge" || "ml.inf2.8xlarge" || "ml.inf2.24xlarge" || "ml.inf2.48xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge",
 * //             ],
 * //             SupportedContentTypes: [
 * //               "STRING_VALUE",
 * //             ],
 * //             SupportedResponseMIMETypes: [
 * //               "STRING_VALUE",
 * //             ],
 * //           },
 * //         ],
 * //         SourceUri: "STRING_VALUE",
 * //         SecurityConfig: { // ModelPackageSecurityConfig
 * //           KmsKeyId: "STRING_VALUE", // required
 * //         },
 * //         ModelCard: { // ModelPackageModelCard
 * //           ModelCardContent: "STRING_VALUE",
 * //           ModelCardStatus: "Draft" || "PendingReview" || "Approved" || "Archived",
 * //         },
 * //         ModelLifeCycle: { // ModelLifeCycle
 * //           Stage: "STRING_VALUE", // required
 * //           StageStatus: "STRING_VALUE", // required
 * //           StageDescription: "STRING_VALUE",
 * //         },
 * //         Tags: "<TagList>",
 * //         CustomerMetadataProperties: { // CustomerMetadataMap
 * //           "<keys>": "STRING_VALUE",
 * //         },
 * //         DriftCheckBaselines: { // DriftCheckBaselines
 * //           Bias: { // DriftCheckBias
 * //             ConfigFile: { // FileSource
 * //               ContentType: "STRING_VALUE",
 * //               ContentDigest: "STRING_VALUE",
 * //               S3Uri: "STRING_VALUE", // required
 * //             },
 * //             PreTrainingConstraints: "<MetricsSource>",
 * //             PostTrainingConstraints: "<MetricsSource>",
 * //           },
 * //           Explainability: { // DriftCheckExplainability
 * //             Constraints: "<MetricsSource>",
 * //             ConfigFile: {
 * //               ContentType: "STRING_VALUE",
 * //               ContentDigest: "STRING_VALUE",
 * //               S3Uri: "STRING_VALUE", // required
 * //             },
 * //           },
 * //           ModelQuality: { // DriftCheckModelQuality
 * //             Statistics: "<MetricsSource>",
 * //             Constraints: "<MetricsSource>",
 * //           },
 * //           ModelDataQuality: { // DriftCheckModelDataQuality
 * //             Statistics: "<MetricsSource>",
 * //             Constraints: "<MetricsSource>",
 * //           },
 * //         },
 * //         SkipModelValidation: "All" || "None",
 * //       },
 * //       ModelPackageGroup: { // ModelPackageGroup
 * //         ModelPackageGroupName: "STRING_VALUE",
 * //         ModelPackageGroupArn: "STRING_VALUE",
 * //         ModelPackageGroupDescription: "STRING_VALUE",
 * //         CreationTime: new Date("TIMESTAMP"),
 * //         CreatedBy: "<UserContext>",
 * //         ModelPackageGroupStatus: "Pending" || "InProgress" || "Completed" || "Failed" || "Deleting" || "DeleteFailed",
 * //         Tags: "<TagList>",
 * //       },
 * //       Pipeline: { // Pipeline
 * //         PipelineArn: "STRING_VALUE",
 * //         PipelineName: "STRING_VALUE",
 * //         PipelineDisplayName: "STRING_VALUE",
 * //         PipelineDescription: "STRING_VALUE",
 * //         RoleArn: "STRING_VALUE",
 * //         PipelineStatus: "Active" || "Deleting",
 * //         CreationTime: new Date("TIMESTAMP"),
 * //         LastModifiedTime: new Date("TIMESTAMP"),
 * //         LastRunTime: new Date("TIMESTAMP"),
 * //         CreatedBy: "<UserContext>",
 * //         LastModifiedBy: "<UserContext>",
 * //         ParallelismConfiguration: { // ParallelismConfiguration
 * //           MaxParallelExecutionSteps: Number("int"), // required
 * //         },
 * //         Tags: "<TagList>",
 * //       },
 * //       PipelineExecution: { // PipelineExecution
 * //         PipelineArn: "STRING_VALUE",
 * //         PipelineExecutionArn: "STRING_VALUE",
 * //         PipelineExecutionDisplayName: "STRING_VALUE",
 * //         PipelineExecutionStatus: "Executing" || "Stopping" || "Stopped" || "Failed" || "Succeeded",
 * //         PipelineExecutionDescription: "STRING_VALUE",
 * //         PipelineExperimentConfig: { // PipelineExperimentConfig
 * //           ExperimentName: "STRING_VALUE",
 * //           TrialName: "STRING_VALUE",
 * //         },
 * //         FailureReason: "STRING_VALUE",
 * //         CreationTime: new Date("TIMESTAMP"),
 * //         LastModifiedTime: new Date("TIMESTAMP"),
 * //         CreatedBy: "<UserContext>",
 * //         LastModifiedBy: "<UserContext>",
 * //         ParallelismConfiguration: {
 * //           MaxParallelExecutionSteps: Number("int"), // required
 * //         },
 * //         SelectiveExecutionConfig: { // SelectiveExecutionConfig
 * //           SourcePipelineExecutionArn: "STRING_VALUE",
 * //           SelectedSteps: [ // SelectedStepList // required
 * //             { // SelectedStep
 * //               StepName: "STRING_VALUE", // required
 * //             },
 * //           ],
 * //         },
 * //         PipelineParameters: [ // ParameterList
 * //           { // Parameter
 * //             Name: "STRING_VALUE", // required
 * //             Value: "STRING_VALUE", // required
 * //           },
 * //         ],
 * //       },
 * //       FeatureGroup: { // FeatureGroup
 * //         FeatureGroupArn: "STRING_VALUE",
 * //         FeatureGroupName: "STRING_VALUE",
 * //         RecordIdentifierFeatureName: "STRING_VALUE",
 * //         EventTimeFeatureName: "STRING_VALUE",
 * //         FeatureDefinitions: [ // FeatureDefinitions
 * //           { // FeatureDefinition
 * //             FeatureName: "STRING_VALUE", // required
 * //             FeatureType: "Integral" || "Fractional" || "String", // required
 * //             CollectionType: "List" || "Set" || "Vector",
 * //             CollectionConfig: { // CollectionConfig Union: only one key present
 * //               VectorConfig: { // VectorConfig
 * //                 Dimension: Number("int"), // required
 * //               },
 * //             },
 * //           },
 * //         ],
 * //         CreationTime: new Date("TIMESTAMP"),
 * //         LastModifiedTime: new Date("TIMESTAMP"),
 * //         OnlineStoreConfig: { // OnlineStoreConfig
 * //           SecurityConfig: { // OnlineStoreSecurityConfig
 * //             KmsKeyId: "STRING_VALUE",
 * //           },
 * //           EnableOnlineStore: true || false,
 * //           TtlDuration: { // TtlDuration
 * //             Unit: "Seconds" || "Minutes" || "Hours" || "Days" || "Weeks",
 * //             Value: Number("int"),
 * //           },
 * //           StorageType: "Standard" || "InMemory",
 * //         },
 * //         OfflineStoreConfig: { // OfflineStoreConfig
 * //           S3StorageConfig: { // S3StorageConfig
 * //             S3Uri: "STRING_VALUE", // required
 * //             KmsKeyId: "STRING_VALUE",
 * //             ResolvedOutputS3Uri: "STRING_VALUE",
 * //           },
 * //           DisableGlueTableCreation: true || false,
 * //           DataCatalogConfig: { // DataCatalogConfig
 * //             TableName: "STRING_VALUE", // required
 * //             Catalog: "STRING_VALUE", // required
 * //             Database: "STRING_VALUE", // required
 * //           },
 * //           TableFormat: "Default" || "Glue" || "Iceberg",
 * //         },
 * //         RoleArn: "STRING_VALUE",
 * //         FeatureGroupStatus: "Creating" || "Created" || "CreateFailed" || "Deleting" || "DeleteFailed",
 * //         OfflineStoreStatus: { // OfflineStoreStatus
 * //           Status: "Active" || "Blocked" || "Disabled", // required
 * //           BlockedReason: "STRING_VALUE",
 * //         },
 * //         LastUpdateStatus: { // LastUpdateStatus
 * //           Status: "Successful" || "Failed" || "InProgress", // required
 * //           FailureReason: "STRING_VALUE",
 * //         },
 * //         FailureReason: "STRING_VALUE",
 * //         Description: "STRING_VALUE",
 * //         Tags: "<TagList>",
 * //       },
 * //       FeatureMetadata: { // FeatureMetadata
 * //         FeatureGroupArn: "STRING_VALUE",
 * //         FeatureGroupName: "STRING_VALUE",
 * //         FeatureName: "STRING_VALUE",
 * //         FeatureType: "Integral" || "Fractional" || "String",
 * //         CreationTime: new Date("TIMESTAMP"),
 * //         LastModifiedTime: new Date("TIMESTAMP"),
 * //         Description: "STRING_VALUE",
 * //         Parameters: [ // FeatureParameters
 * //           { // FeatureParameter
 * //             Key: "STRING_VALUE",
 * //             Value: "STRING_VALUE",
 * //           },
 * //         ],
 * //       },
 * //       Project: { // Project
 * //         ProjectArn: "STRING_VALUE",
 * //         ProjectName: "STRING_VALUE",
 * //         ProjectId: "STRING_VALUE",
 * //         ProjectDescription: "STRING_VALUE",
 * //         ServiceCatalogProvisioningDetails: { // ServiceCatalogProvisioningDetails
 * //           ProductId: "STRING_VALUE", // required
 * //           ProvisioningArtifactId: "STRING_VALUE",
 * //           PathId: "STRING_VALUE",
 * //           ProvisioningParameters: [ // ProvisioningParameters
 * //             { // ProvisioningParameter
 * //               Key: "STRING_VALUE",
 * //               Value: "STRING_VALUE",
 * //             },
 * //           ],
 * //         },
 * //         ServiceCatalogProvisionedProductDetails: { // ServiceCatalogProvisionedProductDetails
 * //           ProvisionedProductId: "STRING_VALUE",
 * //           ProvisionedProductStatusMessage: "STRING_VALUE",
 * //         },
 * //         ProjectStatus: "Pending" || "CreateInProgress" || "CreateCompleted" || "CreateFailed" || "DeleteInProgress" || "DeleteFailed" || "DeleteCompleted" || "UpdateInProgress" || "UpdateCompleted" || "UpdateFailed",
 * //         CreatedBy: "<UserContext>",
 * //         CreationTime: new Date("TIMESTAMP"),
 * //         Tags: "<TagList>",
 * //         LastModifiedTime: new Date("TIMESTAMP"),
 * //         LastModifiedBy: "<UserContext>",
 * //       },
 * //       HyperParameterTuningJob: { // HyperParameterTuningJobSearchEntity
 * //         HyperParameterTuningJobName: "STRING_VALUE",
 * //         HyperParameterTuningJobArn: "STRING_VALUE",
 * //         HyperParameterTuningJobConfig: { // HyperParameterTuningJobConfig
 * //           Strategy: "Bayesian" || "Random" || "Hyperband" || "Grid", // required
 * //           StrategyConfig: { // HyperParameterTuningJobStrategyConfig
 * //             HyperbandStrategyConfig: { // HyperbandStrategyConfig
 * //               MinResource: Number("int"),
 * //               MaxResource: Number("int"),
 * //             },
 * //           },
 * //           HyperParameterTuningJobObjective: { // HyperParameterTuningJobObjective
 * //             Type: "Maximize" || "Minimize", // required
 * //             MetricName: "STRING_VALUE", // required
 * //           },
 * //           ResourceLimits: { // ResourceLimits
 * //             MaxNumberOfTrainingJobs: Number("int"),
 * //             MaxParallelTrainingJobs: Number("int"), // required
 * //             MaxRuntimeInSeconds: Number("int"),
 * //           },
 * //           ParameterRanges: { // ParameterRanges
 * //             IntegerParameterRanges: [ // IntegerParameterRanges
 * //               { // IntegerParameterRange
 * //                 Name: "STRING_VALUE", // required
 * //                 MinValue: "STRING_VALUE", // required
 * //                 MaxValue: "STRING_VALUE", // required
 * //                 ScalingType: "Auto" || "Linear" || "Logarithmic" || "ReverseLogarithmic",
 * //               },
 * //             ],
 * //             ContinuousParameterRanges: [ // ContinuousParameterRanges
 * //               { // ContinuousParameterRange
 * //                 Name: "STRING_VALUE", // required
 * //                 MinValue: "STRING_VALUE", // required
 * //                 MaxValue: "STRING_VALUE", // required
 * //                 ScalingType: "Auto" || "Linear" || "Logarithmic" || "ReverseLogarithmic",
 * //               },
 * //             ],
 * //             CategoricalParameterRanges: [ // CategoricalParameterRanges
 * //               { // CategoricalParameterRange
 * //                 Name: "STRING_VALUE", // required
 * //                 Values: [ // ParameterValues // required
 * //                   "STRING_VALUE",
 * //                 ],
 * //               },
 * //             ],
 * //             AutoParameters: [ // AutoParameters
 * //               { // AutoParameter
 * //                 Name: "STRING_VALUE", // required
 * //                 ValueHint: "STRING_VALUE", // required
 * //               },
 * //             ],
 * //           },
 * //           TrainingJobEarlyStoppingType: "Off" || "Auto",
 * //           TuningJobCompletionCriteria: { // TuningJobCompletionCriteria
 * //             TargetObjectiveMetricValue: Number("float"),
 * //             BestObjectiveNotImproving: { // BestObjectiveNotImproving
 * //               MaxNumberOfTrainingJobsNotImproving: Number("int"),
 * //             },
 * //             ConvergenceDetected: { // ConvergenceDetected
 * //               CompleteOnConvergence: "Disabled" || "Enabled",
 * //             },
 * //           },
 * //           RandomSeed: Number("int"),
 * //         },
 * //         TrainingJobDefinition: { // HyperParameterTrainingJobDefinition
 * //           DefinitionName: "STRING_VALUE",
 * //           TuningObjective: {
 * //             Type: "Maximize" || "Minimize", // required
 * //             MetricName: "STRING_VALUE", // required
 * //           },
 * //           HyperParameterRanges: {
 * //             IntegerParameterRanges: [
 * //               {
 * //                 Name: "STRING_VALUE", // required
 * //                 MinValue: "STRING_VALUE", // required
 * //                 MaxValue: "STRING_VALUE", // required
 * //                 ScalingType: "Auto" || "Linear" || "Logarithmic" || "ReverseLogarithmic",
 * //               },
 * //             ],
 * //             ContinuousParameterRanges: [
 * //               {
 * //                 Name: "STRING_VALUE", // required
 * //                 MinValue: "STRING_VALUE", // required
 * //                 MaxValue: "STRING_VALUE", // required
 * //                 ScalingType: "Auto" || "Linear" || "Logarithmic" || "ReverseLogarithmic",
 * //               },
 * //             ],
 * //             CategoricalParameterRanges: [
 * //               {
 * //                 Name: "STRING_VALUE", // required
 * //                 Values: [ // required
 * //                   "STRING_VALUE",
 * //                 ],
 * //               },
 * //             ],
 * //             AutoParameters: [
 * //               {
 * //                 Name: "STRING_VALUE", // required
 * //                 ValueHint: "STRING_VALUE", // required
 * //               },
 * //             ],
 * //           },
 * //           StaticHyperParameters: "<HyperParameters>",
 * //           AlgorithmSpecification: { // HyperParameterAlgorithmSpecification
 * //             TrainingImage: "STRING_VALUE",
 * //             TrainingInputMode: "Pipe" || "File" || "FastFile", // required
 * //             AlgorithmName: "STRING_VALUE",
 * //             MetricDefinitions: "<MetricDefinitionList>",
 * //           },
 * //           RoleArn: "STRING_VALUE", // required
 * //           InputDataConfig: "<InputDataConfig>",
 * //           VpcConfig: "<VpcConfig>",
 * //           OutputDataConfig: "<OutputDataConfig>", // required
 * //           ResourceConfig: "<ResourceConfig>",
 * //           HyperParameterTuningResourceConfig: { // HyperParameterTuningResourceConfig
 * //             InstanceType: "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.c5n.xlarge" || "ml.c5n.2xlarge" || "ml.c5n.4xlarge" || "ml.c5n.9xlarge" || "ml.c5n.18xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.16xlarge" || "ml.g6.12xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.16xlarge" || "ml.g6e.12xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.trn2.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.8xlarge" || "ml.c6i.4xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.8xlarge" || "ml.r5d.12xlarge" || "ml.r5d.16xlarge" || "ml.r5d.24xlarge" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge",
 * //             InstanceCount: Number("int"),
 * //             VolumeSizeInGB: Number("int"),
 * //             VolumeKmsKeyId: "STRING_VALUE",
 * //             AllocationStrategy: "Prioritized",
 * //             InstanceConfigs: [ // HyperParameterTuningInstanceConfigs
 * //               { // HyperParameterTuningInstanceConfig
 * //                 InstanceType: "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.c5n.xlarge" || "ml.c5n.2xlarge" || "ml.c5n.4xlarge" || "ml.c5n.9xlarge" || "ml.c5n.18xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.16xlarge" || "ml.g6.12xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.16xlarge" || "ml.g6e.12xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.trn2.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.8xlarge" || "ml.c6i.4xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.8xlarge" || "ml.r5d.12xlarge" || "ml.r5d.16xlarge" || "ml.r5d.24xlarge" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge", // required
 * //                 InstanceCount: Number("int"), // required
 * //                 VolumeSizeInGB: Number("int"), // required
 * //               },
 * //             ],
 * //           },
 * //           StoppingCondition: "<StoppingCondition>", // required
 * //           EnableNetworkIsolation: true || false,
 * //           EnableInterContainerTrafficEncryption: true || false,
 * //           EnableManagedSpotTraining: true || false,
 * //           CheckpointConfig: "<CheckpointConfig>",
 * //           RetryStrategy: "<RetryStrategy>",
 * //           Environment: { // HyperParameterTrainingJobEnvironmentMap
 * //             "<keys>": "STRING_VALUE",
 * //           },
 * //         },
 * //         TrainingJobDefinitions: [ // HyperParameterTrainingJobDefinitions
 * //           {
 * //             DefinitionName: "STRING_VALUE",
 * //             TuningObjective: {
 * //               Type: "Maximize" || "Minimize", // required
 * //               MetricName: "STRING_VALUE", // required
 * //             },
 * //             HyperParameterRanges: {
 * //               IntegerParameterRanges: [
 * //                 {
 * //                   Name: "STRING_VALUE", // required
 * //                   MinValue: "STRING_VALUE", // required
 * //                   MaxValue: "STRING_VALUE", // required
 * //                   ScalingType: "Auto" || "Linear" || "Logarithmic" || "ReverseLogarithmic",
 * //                 },
 * //               ],
 * //               ContinuousParameterRanges: [
 * //                 {
 * //                   Name: "STRING_VALUE", // required
 * //                   MinValue: "STRING_VALUE", // required
 * //                   MaxValue: "STRING_VALUE", // required
 * //                   ScalingType: "Auto" || "Linear" || "Logarithmic" || "ReverseLogarithmic",
 * //                 },
 * //               ],
 * //               CategoricalParameterRanges: [
 * //                 {
 * //                   Name: "STRING_VALUE", // required
 * //                   Values: [ // required
 * //                     "STRING_VALUE",
 * //                   ],
 * //                 },
 * //               ],
 * //               AutoParameters: [
 * //                 {
 * //                   Name: "STRING_VALUE", // required
 * //                   ValueHint: "STRING_VALUE", // required
 * //                 },
 * //               ],
 * //             },
 * //             StaticHyperParameters: "<HyperParameters>",
 * //             AlgorithmSpecification: {
 * //               TrainingImage: "STRING_VALUE",
 * //               TrainingInputMode: "Pipe" || "File" || "FastFile", // required
 * //               AlgorithmName: "STRING_VALUE",
 * //               MetricDefinitions: "<MetricDefinitionList>",
 * //             },
 * //             RoleArn: "STRING_VALUE", // required
 * //             InputDataConfig: "<InputDataConfig>",
 * //             VpcConfig: "<VpcConfig>",
 * //             OutputDataConfig: "<OutputDataConfig>", // required
 * //             ResourceConfig: "<ResourceConfig>",
 * //             HyperParameterTuningResourceConfig: {
 * //               InstanceType: "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.c5n.xlarge" || "ml.c5n.2xlarge" || "ml.c5n.4xlarge" || "ml.c5n.9xlarge" || "ml.c5n.18xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.16xlarge" || "ml.g6.12xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.16xlarge" || "ml.g6e.12xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.trn2.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.8xlarge" || "ml.c6i.4xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.8xlarge" || "ml.r5d.12xlarge" || "ml.r5d.16xlarge" || "ml.r5d.24xlarge" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge",
 * //               InstanceCount: Number("int"),
 * //               VolumeSizeInGB: Number("int"),
 * //               VolumeKmsKeyId: "STRING_VALUE",
 * //               AllocationStrategy: "Prioritized",
 * //               InstanceConfigs: [
 * //                 {
 * //                   InstanceType: "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.c5n.xlarge" || "ml.c5n.2xlarge" || "ml.c5n.4xlarge" || "ml.c5n.9xlarge" || "ml.c5n.18xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.16xlarge" || "ml.g6.12xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.16xlarge" || "ml.g6e.12xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.trn2.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.8xlarge" || "ml.c6i.4xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.8xlarge" || "ml.r5d.12xlarge" || "ml.r5d.16xlarge" || "ml.r5d.24xlarge" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge", // required
 * //                   InstanceCount: Number("int"), // required
 * //                   VolumeSizeInGB: Number("int"), // required
 * //                 },
 * //               ],
 * //             },
 * //             StoppingCondition: "<StoppingCondition>", // required
 * //             EnableNetworkIsolation: true || false,
 * //             EnableInterContainerTrafficEncryption: true || false,
 * //             EnableManagedSpotTraining: true || false,
 * //             CheckpointConfig: "<CheckpointConfig>",
 * //             RetryStrategy: "<RetryStrategy>",
 * //             Environment: {
 * //               "<keys>": "STRING_VALUE",
 * //             },
 * //           },
 * //         ],
 * //         HyperParameterTuningJobStatus: "Completed" || "InProgress" || "Failed" || "Stopped" || "Stopping" || "Deleting" || "DeleteFailed",
 * //         CreationTime: new Date("TIMESTAMP"),
 * //         HyperParameterTuningEndTime: new Date("TIMESTAMP"),
 * //         LastModifiedTime: new Date("TIMESTAMP"),
 * //         TrainingJobStatusCounters: { // TrainingJobStatusCounters
 * //           Completed: Number("int"),
 * //           InProgress: Number("int"),
 * //           RetryableError: Number("int"),
 * //           NonRetryableError: Number("int"),
 * //           Stopped: Number("int"),
 * //         },
 * //         ObjectiveStatusCounters: { // ObjectiveStatusCounters
 * //           Succeeded: Number("int"),
 * //           Pending: Number("int"),
 * //           Failed: Number("int"),
 * //         },
 * //         BestTrainingJob: { // HyperParameterTrainingJobSummary
 * //           TrainingJobDefinitionName: "STRING_VALUE",
 * //           TrainingJobName: "STRING_VALUE", // required
 * //           TrainingJobArn: "STRING_VALUE", // required
 * //           TuningJobName: "STRING_VALUE",
 * //           CreationTime: new Date("TIMESTAMP"), // required
 * //           TrainingStartTime: new Date("TIMESTAMP"),
 * //           TrainingEndTime: new Date("TIMESTAMP"),
 * //           TrainingJobStatus: "InProgress" || "Completed" || "Failed" || "Stopping" || "Stopped", // required
 * //           TunedHyperParameters: "<HyperParameters>", // required
 * //           FailureReason: "STRING_VALUE",
 * //           FinalHyperParameterTuningJobObjectiveMetric: { // FinalHyperParameterTuningJobObjectiveMetric
 * //             Type: "Maximize" || "Minimize",
 * //             MetricName: "STRING_VALUE", // required
 * //             Value: Number("float"), // required
 * //           },
 * //           ObjectiveStatus: "Succeeded" || "Pending" || "Failed",
 * //         },
 * //         OverallBestTrainingJob: {
 * //           TrainingJobDefinitionName: "STRING_VALUE",
 * //           TrainingJobName: "STRING_VALUE", // required
 * //           TrainingJobArn: "STRING_VALUE", // required
 * //           TuningJobName: "STRING_VALUE",
 * //           CreationTime: new Date("TIMESTAMP"), // required
 * //           TrainingStartTime: new Date("TIMESTAMP"),
 * //           TrainingEndTime: new Date("TIMESTAMP"),
 * //           TrainingJobStatus: "InProgress" || "Completed" || "Failed" || "Stopping" || "Stopped", // required
 * //           TunedHyperParameters: "<HyperParameters>", // required
 * //           FailureReason: "STRING_VALUE",
 * //           FinalHyperParameterTuningJobObjectiveMetric: {
 * //             Type: "Maximize" || "Minimize",
 * //             MetricName: "STRING_VALUE", // required
 * //             Value: Number("float"), // required
 * //           },
 * //           ObjectiveStatus: "Succeeded" || "Pending" || "Failed",
 * //         },
 * //         WarmStartConfig: { // HyperParameterTuningJobWarmStartConfig
 * //           ParentHyperParameterTuningJobs: [ // ParentHyperParameterTuningJobs // required
 * //             { // ParentHyperParameterTuningJob
 * //               HyperParameterTuningJobName: "STRING_VALUE",
 * //             },
 * //           ],
 * //           WarmStartType: "IdenticalDataAndAlgorithm" || "TransferLearning", // required
 * //         },
 * //         FailureReason: "STRING_VALUE",
 * //         TuningJobCompletionDetails: { // HyperParameterTuningJobCompletionDetails
 * //           NumberOfTrainingJobsObjectiveNotImproving: Number("int"),
 * //           ConvergenceDetectedTime: new Date("TIMESTAMP"),
 * //         },
 * //         ConsumedResources: { // HyperParameterTuningJobConsumedResources
 * //           RuntimeInSeconds: Number("int"),
 * //         },
 * //         Tags: "<TagList>",
 * //       },
 * //       ModelCard: { // ModelCard
 * //         ModelCardArn: "STRING_VALUE",
 * //         ModelCardName: "STRING_VALUE",
 * //         ModelCardVersion: Number("int"),
 * //         Content: "STRING_VALUE",
 * //         ModelCardStatus: "Draft" || "PendingReview" || "Approved" || "Archived",
 * //         SecurityConfig: { // ModelCardSecurityConfig
 * //           KmsKeyId: "STRING_VALUE",
 * //         },
 * //         CreationTime: new Date("TIMESTAMP"),
 * //         CreatedBy: "<UserContext>",
 * //         LastModifiedTime: new Date("TIMESTAMP"),
 * //         LastModifiedBy: "<UserContext>",
 * //         Tags: "<TagList>",
 * //         ModelId: "STRING_VALUE",
 * //         RiskRating: "STRING_VALUE",
 * //         ModelPackageGroupName: "STRING_VALUE",
 * //       },
 * //       Model: { // ModelDashboardModel
 * //         Model: { // Model
 * //           ModelName: "STRING_VALUE",
 * //           PrimaryContainer: { // ContainerDefinition
 * //             ContainerHostname: "STRING_VALUE",
 * //             Image: "STRING_VALUE",
 * //             ImageConfig: { // ImageConfig
 * //               RepositoryAccessMode: "Platform" || "Vpc", // required
 * //               RepositoryAuthConfig: { // RepositoryAuthConfig
 * //                 RepositoryCredentialsProviderArn: "STRING_VALUE", // required
 * //               },
 * //             },
 * //             Mode: "SingleModel" || "MultiModel",
 * //             ModelDataUrl: "STRING_VALUE",
 * //             ModelDataSource: "<ModelDataSource>",
 * //             AdditionalModelDataSources: [ // AdditionalModelDataSources
 * //               { // AdditionalModelDataSource
 * //                 ChannelName: "STRING_VALUE", // required
 * //                 S3DataSource: {
 * //                   S3Uri: "STRING_VALUE", // required
 * //                   S3DataType: "S3Prefix" || "S3Object", // required
 * //                   CompressionType: "None" || "Gzip", // required
 * //                   ModelAccessConfig: "<ModelAccessConfig>",
 * //                   HubAccessConfig: {
 * //                     HubContentArn: "STRING_VALUE", // required
 * //                   },
 * //                   ManifestS3Uri: "STRING_VALUE",
 * //                   ETag: "STRING_VALUE",
 * //                   ManifestEtag: "STRING_VALUE",
 * //                 },
 * //               },
 * //             ],
 * //             Environment: "<EnvironmentMap>",
 * //             ModelPackageName: "STRING_VALUE",
 * //             InferenceSpecificationName: "STRING_VALUE",
 * //             MultiModelConfig: { // MultiModelConfig
 * //               ModelCacheSetting: "Enabled" || "Disabled",
 * //             },
 * //           },
 * //           Containers: [ // ContainerDefinitionList
 * //             {
 * //               ContainerHostname: "STRING_VALUE",
 * //               Image: "STRING_VALUE",
 * //               ImageConfig: {
 * //                 RepositoryAccessMode: "Platform" || "Vpc", // required
 * //                 RepositoryAuthConfig: {
 * //                   RepositoryCredentialsProviderArn: "STRING_VALUE", // required
 * //                 },
 * //               },
 * //               Mode: "SingleModel" || "MultiModel",
 * //               ModelDataUrl: "STRING_VALUE",
 * //               ModelDataSource: "<ModelDataSource>",
 * //               AdditionalModelDataSources: [
 * //                 {
 * //                   ChannelName: "STRING_VALUE", // required
 * //                   S3DataSource: {
 * //                     S3Uri: "STRING_VALUE", // required
 * //                     S3DataType: "S3Prefix" || "S3Object", // required
 * //                     CompressionType: "None" || "Gzip", // required
 * //                     ModelAccessConfig: "<ModelAccessConfig>",
 * //                     HubAccessConfig: {
 * //                       HubContentArn: "STRING_VALUE", // required
 * //                     },
 * //                     ManifestS3Uri: "STRING_VALUE",
 * //                     ETag: "STRING_VALUE",
 * //                     ManifestEtag: "STRING_VALUE",
 * //                   },
 * //                 },
 * //               ],
 * //               Environment: "<EnvironmentMap>",
 * //               ModelPackageName: "STRING_VALUE",
 * //               InferenceSpecificationName: "STRING_VALUE",
 * //               MultiModelConfig: {
 * //                 ModelCacheSetting: "Enabled" || "Disabled",
 * //               },
 * //             },
 * //           ],
 * //           InferenceExecutionConfig: { // InferenceExecutionConfig
 * //             Mode: "Serial" || "Direct", // required
 * //           },
 * //           ExecutionRoleArn: "STRING_VALUE",
 * //           VpcConfig: "<VpcConfig>",
 * //           CreationTime: new Date("TIMESTAMP"),
 * //           ModelArn: "STRING_VALUE",
 * //           EnableNetworkIsolation: true || false,
 * //           Tags: "<TagList>",
 * //           DeploymentRecommendation: { // DeploymentRecommendation
 * //             RecommendationStatus: "IN_PROGRESS" || "COMPLETED" || "FAILED" || "NOT_APPLICABLE", // required
 * //             RealTimeInferenceRecommendations: [ // RealTimeInferenceRecommendations
 * //               { // RealTimeInferenceRecommendation
 * //                 RecommendationId: "STRING_VALUE", // required
 * //                 InstanceType: "ml.t2.medium" || "ml.t2.large" || "ml.t2.xlarge" || "ml.t2.2xlarge" || "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.m5d.large" || "ml.m5d.xlarge" || "ml.m5d.2xlarge" || "ml.m5d.4xlarge" || "ml.m5d.12xlarge" || "ml.m5d.24xlarge" || "ml.c4.large" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.c5.large" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.c5d.large" || "ml.c5d.xlarge" || "ml.c5d.2xlarge" || "ml.c5d.4xlarge" || "ml.c5d.9xlarge" || "ml.c5d.18xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.12xlarge" || "ml.r5.24xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.12xlarge" || "ml.r5d.24xlarge" || "ml.inf1.xlarge" || "ml.inf1.2xlarge" || "ml.inf1.6xlarge" || "ml.inf1.24xlarge" || "ml.dl1.24xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.12xlarge" || "ml.g5.16xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.r8g.medium" || "ml.r8g.large" || "ml.r8g.xlarge" || "ml.r8g.2xlarge" || "ml.r8g.4xlarge" || "ml.r8g.8xlarge" || "ml.r8g.12xlarge" || "ml.r8g.16xlarge" || "ml.r8g.24xlarge" || "ml.r8g.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.12xlarge" || "ml.g6e.16xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.p4d.24xlarge" || "ml.c7g.large" || "ml.c7g.xlarge" || "ml.c7g.2xlarge" || "ml.c7g.4xlarge" || "ml.c7g.8xlarge" || "ml.c7g.12xlarge" || "ml.c7g.16xlarge" || "ml.m6g.large" || "ml.m6g.xlarge" || "ml.m6g.2xlarge" || "ml.m6g.4xlarge" || "ml.m6g.8xlarge" || "ml.m6g.12xlarge" || "ml.m6g.16xlarge" || "ml.m6gd.large" || "ml.m6gd.xlarge" || "ml.m6gd.2xlarge" || "ml.m6gd.4xlarge" || "ml.m6gd.8xlarge" || "ml.m6gd.12xlarge" || "ml.m6gd.16xlarge" || "ml.c6g.large" || "ml.c6g.xlarge" || "ml.c6g.2xlarge" || "ml.c6g.4xlarge" || "ml.c6g.8xlarge" || "ml.c6g.12xlarge" || "ml.c6g.16xlarge" || "ml.c6gd.large" || "ml.c6gd.xlarge" || "ml.c6gd.2xlarge" || "ml.c6gd.4xlarge" || "ml.c6gd.8xlarge" || "ml.c6gd.12xlarge" || "ml.c6gd.16xlarge" || "ml.c6gn.large" || "ml.c6gn.xlarge" || "ml.c6gn.2xlarge" || "ml.c6gn.4xlarge" || "ml.c6gn.8xlarge" || "ml.c6gn.12xlarge" || "ml.c6gn.16xlarge" || "ml.r6g.large" || "ml.r6g.xlarge" || "ml.r6g.2xlarge" || "ml.r6g.4xlarge" || "ml.r6g.8xlarge" || "ml.r6g.12xlarge" || "ml.r6g.16xlarge" || "ml.r6gd.large" || "ml.r6gd.xlarge" || "ml.r6gd.2xlarge" || "ml.r6gd.4xlarge" || "ml.r6gd.8xlarge" || "ml.r6gd.12xlarge" || "ml.r6gd.16xlarge" || "ml.p4de.24xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.trn2.48xlarge" || "ml.inf2.xlarge" || "ml.inf2.8xlarge" || "ml.inf2.24xlarge" || "ml.inf2.48xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge", // required
 * //                 Environment: "<EnvironmentMap>",
 * //               },
 * //             ],
 * //           },
 * //         },
 * //         Endpoints: [ // ModelDashboardEndpoints
 * //           { // ModelDashboardEndpoint
 * //             EndpointName: "STRING_VALUE", // required
 * //             EndpointArn: "STRING_VALUE", // required
 * //             CreationTime: new Date("TIMESTAMP"), // required
 * //             LastModifiedTime: new Date("TIMESTAMP"), // required
 * //             EndpointStatus: "OutOfService" || "Creating" || "Updating" || "SystemUpdating" || "RollingBack" || "InService" || "Deleting" || "Failed" || "UpdateRollbackFailed", // required
 * //           },
 * //         ],
 * //         LastBatchTransformJob: {
 * //           TransformJobName: "STRING_VALUE",
 * //           TransformJobArn: "STRING_VALUE",
 * //           TransformJobStatus: "InProgress" || "Completed" || "Failed" || "Stopping" || "Stopped",
 * //           FailureReason: "STRING_VALUE",
 * //           ModelName: "STRING_VALUE",
 * //           MaxConcurrentTransforms: Number("int"),
 * //           ModelClientConfig: {
 * //             InvocationsTimeoutInSeconds: Number("int"),
 * //             InvocationsMaxRetries: Number("int"),
 * //           },
 * //           MaxPayloadInMB: Number("int"),
 * //           BatchStrategy: "MultiRecord" || "SingleRecord",
 * //           Environment: "<TransformEnvironmentMap>",
 * //           TransformInput: "<TransformInput>",
 * //           TransformOutput: "<TransformOutput>",
 * //           DataCaptureConfig: {
 * //             DestinationS3Uri: "STRING_VALUE", // required
 * //             KmsKeyId: "STRING_VALUE",
 * //             GenerateInferenceId: true || false,
 * //           },
 * //           TransformResources: "<TransformResources>",
 * //           CreationTime: new Date("TIMESTAMP"),
 * //           TransformStartTime: new Date("TIMESTAMP"),
 * //           TransformEndTime: new Date("TIMESTAMP"),
 * //           LabelingJobArn: "STRING_VALUE",
 * //           AutoMLJobArn: "STRING_VALUE",
 * //           DataProcessing: {
 * //             InputFilter: "STRING_VALUE",
 * //             OutputFilter: "STRING_VALUE",
 * //             JoinSource: "Input" || "None",
 * //           },
 * //           ExperimentConfig: "<ExperimentConfig>",
 * //           Tags: "<TagList>",
 * //         },
 * //         MonitoringSchedules: [ // ModelDashboardMonitoringSchedules
 * //           { // ModelDashboardMonitoringSchedule
 * //             MonitoringScheduleArn: "STRING_VALUE",
 * //             MonitoringScheduleName: "STRING_VALUE",
 * //             MonitoringScheduleStatus: "Pending" || "Failed" || "Scheduled" || "Stopped",
 * //             MonitoringType: "DataQuality" || "ModelQuality" || "ModelBias" || "ModelExplainability",
 * //             FailureReason: "STRING_VALUE",
 * //             CreationTime: new Date("TIMESTAMP"),
 * //             LastModifiedTime: new Date("TIMESTAMP"),
 * //             MonitoringScheduleConfig: {
 * //               ScheduleConfig: {
 * //                 ScheduleExpression: "STRING_VALUE", // required
 * //                 DataAnalysisStartTime: "STRING_VALUE",
 * //                 DataAnalysisEndTime: "STRING_VALUE",
 * //               },
 * //               MonitoringJobDefinition: {
 * //                 BaselineConfig: {
 * //                   BaseliningJobName: "STRING_VALUE",
 * //                   ConstraintsResource: {
 * //                     S3Uri: "STRING_VALUE",
 * //                   },
 * //                   StatisticsResource: {
 * //                     S3Uri: "STRING_VALUE",
 * //                   },
 * //                 },
 * //                 MonitoringInputs: [ // required
 * //                   {
 * //                     EndpointInput: {
 * //                       EndpointName: "STRING_VALUE", // required
 * //                       LocalPath: "STRING_VALUE", // required
 * //                       S3InputMode: "Pipe" || "File",
 * //                       S3DataDistributionType: "FullyReplicated" || "ShardedByS3Key",
 * //                       FeaturesAttribute: "STRING_VALUE",
 * //                       InferenceAttribute: "STRING_VALUE",
 * //                       ProbabilityAttribute: "STRING_VALUE",
 * //                       ProbabilityThresholdAttribute: Number("double"),
 * //                       StartTimeOffset: "STRING_VALUE",
 * //                       EndTimeOffset: "STRING_VALUE",
 * //                       ExcludeFeaturesAttribute: "STRING_VALUE",
 * //                     },
 * //                     BatchTransformInput: {
 * //                       DataCapturedDestinationS3Uri: "STRING_VALUE", // required
 * //                       DatasetFormat: {
 * //                         Csv: {
 * //                           Header: true || false,
 * //                         },
 * //                         Json: {
 * //                           Line: true || false,
 * //                         },
 * //                         Parquet: {},
 * //                       },
 * //                       LocalPath: "STRING_VALUE", // required
 * //                       S3InputMode: "Pipe" || "File",
 * //                       S3DataDistributionType: "FullyReplicated" || "ShardedByS3Key",
 * //                       FeaturesAttribute: "STRING_VALUE",
 * //                       InferenceAttribute: "STRING_VALUE",
 * //                       ProbabilityAttribute: "STRING_VALUE",
 * //                       ProbabilityThresholdAttribute: Number("double"),
 * //                       StartTimeOffset: "STRING_VALUE",
 * //                       EndTimeOffset: "STRING_VALUE",
 * //                       ExcludeFeaturesAttribute: "STRING_VALUE",
 * //                     },
 * //                   },
 * //                 ],
 * //                 MonitoringOutputConfig: {
 * //                   MonitoringOutputs: [ // required
 * //                     {
 * //                       S3Output: {
 * //                         S3Uri: "STRING_VALUE", // required
 * //                         LocalPath: "STRING_VALUE", // required
 * //                         S3UploadMode: "Continuous" || "EndOfJob",
 * //                       },
 * //                     },
 * //                   ],
 * //                   KmsKeyId: "STRING_VALUE",
 * //                 },
 * //                 MonitoringResources: {
 * //                   ClusterConfig: {
 * //                     InstanceCount: Number("int"), // required
 * //                     InstanceType: "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.8xlarge" || "ml.r5d.12xlarge" || "ml.r5d.16xlarge" || "ml.r5d.24xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.12xlarge" || "ml.g6e.16xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge", // required
 * //                     VolumeSizeInGB: Number("int"), // required
 * //                     VolumeKmsKeyId: "STRING_VALUE",
 * //                   },
 * //                 },
 * //                 MonitoringAppSpecification: {
 * //                   ImageUri: "STRING_VALUE", // required
 * //                   ContainerEntrypoint: [
 * //                     "STRING_VALUE",
 * //                   ],
 * //                   ContainerArguments: [
 * //                     "STRING_VALUE",
 * //                   ],
 * //                   RecordPreprocessorSourceUri: "STRING_VALUE",
 * //                   PostAnalyticsProcessorSourceUri: "STRING_VALUE",
 * //                 },
 * //                 StoppingCondition: {
 * //                   MaxRuntimeInSeconds: Number("int"), // required
 * //                 },
 * //                 Environment: {
 * //                   "<keys>": "STRING_VALUE",
 * //                 },
 * //                 NetworkConfig: {
 * //                   EnableInterContainerTrafficEncryption: true || false,
 * //                   EnableNetworkIsolation: true || false,
 * //                   VpcConfig: "<VpcConfig>",
 * //                 },
 * //                 RoleArn: "STRING_VALUE", // required
 * //               },
 * //               MonitoringJobDefinitionName: "STRING_VALUE",
 * //               MonitoringType: "DataQuality" || "ModelQuality" || "ModelBias" || "ModelExplainability",
 * //             },
 * //             EndpointName: "STRING_VALUE",
 * //             MonitoringAlertSummaries: [ // MonitoringAlertSummaryList
 * //               { // MonitoringAlertSummary
 * //                 MonitoringAlertName: "STRING_VALUE", // required
 * //                 CreationTime: new Date("TIMESTAMP"), // required
 * //                 LastModifiedTime: new Date("TIMESTAMP"), // required
 * //                 AlertStatus: "InAlert" || "OK", // required
 * //                 DatapointsToAlert: Number("int"), // required
 * //                 EvaluationPeriod: Number("int"), // required
 * //                 Actions: { // MonitoringAlertActions
 * //                   ModelDashboardIndicator: { // ModelDashboardIndicatorAction
 * //                     Enabled: true || false,
 * //                   },
 * //                 },
 * //               },
 * //             ],
 * //             LastMonitoringExecutionSummary: {
 * //               MonitoringScheduleName: "STRING_VALUE", // required
 * //               ScheduledTime: new Date("TIMESTAMP"), // required
 * //               CreationTime: new Date("TIMESTAMP"), // required
 * //               LastModifiedTime: new Date("TIMESTAMP"), // required
 * //               MonitoringExecutionStatus: "Pending" || "Completed" || "CompletedWithViolations" || "InProgress" || "Failed" || "Stopping" || "Stopped", // required
 * //               ProcessingJobArn: "STRING_VALUE",
 * //               EndpointName: "STRING_VALUE",
 * //               FailureReason: "STRING_VALUE",
 * //               MonitoringJobDefinitionName: "STRING_VALUE",
 * //               MonitoringType: "DataQuality" || "ModelQuality" || "ModelBias" || "ModelExplainability",
 * //             },
 * //             BatchTransformInput: {
 * //               DataCapturedDestinationS3Uri: "STRING_VALUE", // required
 * //               DatasetFormat: {
 * //                 Csv: {
 * //                   Header: true || false,
 * //                 },
 * //                 Json: {
 * //                   Line: true || false,
 * //                 },
 * //                 Parquet: {},
 * //               },
 * //               LocalPath: "STRING_VALUE", // required
 * //               S3InputMode: "Pipe" || "File",
 * //               S3DataDistributionType: "FullyReplicated" || "ShardedByS3Key",
 * //               FeaturesAttribute: "STRING_VALUE",
 * //               InferenceAttribute: "STRING_VALUE",
 * //               ProbabilityAttribute: "STRING_VALUE",
 * //               ProbabilityThresholdAttribute: Number("double"),
 * //               StartTimeOffset: "STRING_VALUE",
 * //               EndTimeOffset: "STRING_VALUE",
 * //               ExcludeFeaturesAttribute: "STRING_VALUE",
 * //             },
 * //           },
 * //         ],
 * //         ModelCard: { // ModelDashboardModelCard
 * //           ModelCardArn: "STRING_VALUE",
 * //           ModelCardName: "STRING_VALUE",
 * //           ModelCardVersion: Number("int"),
 * //           ModelCardStatus: "Draft" || "PendingReview" || "Approved" || "Archived",
 * //           SecurityConfig: {
 * //             KmsKeyId: "STRING_VALUE",
 * //           },
 * //           CreationTime: new Date("TIMESTAMP"),
 * //           CreatedBy: "<UserContext>",
 * //           LastModifiedTime: new Date("TIMESTAMP"),
 * //           LastModifiedBy: "<UserContext>",
 * //           Tags: "<TagList>",
 * //           ModelId: "STRING_VALUE",
 * //           RiskRating: "STRING_VALUE",
 * //         },
 * //       },
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * //   TotalHits: { // TotalHits
 * //     Value: Number("long"),
 * //     Relation: "EqualTo" || "GreaterThanOrEqualTo",
 * //   },
 * // };
 *
 * ```
 *
 * @param SearchCommandInput - {@link SearchCommandInput}
 * @returns {@link SearchCommandOutput}
 * @see {@link SearchCommandInput} for command's `input` shape.
 * @see {@link SearchCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class SearchCommand extends SearchCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: SearchRequest;
            output: SearchResponse;
        };
        sdk: {
            input: SearchCommandInput;
            output: SearchCommandOutput;
        };
    };
}
