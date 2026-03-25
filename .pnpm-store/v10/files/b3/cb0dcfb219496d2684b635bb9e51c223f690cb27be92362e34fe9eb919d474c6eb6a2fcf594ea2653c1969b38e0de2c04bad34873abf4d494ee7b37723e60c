import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DescribeTrainingJobRequest, DescribeTrainingJobResponse } from "../models/models_3";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeTrainingJobCommand}.
 */
export interface DescribeTrainingJobCommandInput extends DescribeTrainingJobRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeTrainingJobCommand}.
 */
export interface DescribeTrainingJobCommandOutput extends DescribeTrainingJobResponse, __MetadataBearer {
}
declare const DescribeTrainingJobCommand_base: {
    new (input: DescribeTrainingJobCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeTrainingJobCommandInput, DescribeTrainingJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeTrainingJobCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeTrainingJobCommandInput, DescribeTrainingJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Returns information about a training job. </p> <p>Some of the attributes below only appear if the training job successfully starts. If the training job fails, <code>TrainingJobStatus</code> is <code>Failed</code> and, depending on the <code>FailureReason</code>, attributes like <code>TrainingStartTime</code>, <code>TrainingTimeInSeconds</code>, <code>TrainingEndTime</code>, and <code>BillableTimeInSeconds</code> may not be present in the response.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeTrainingJobCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeTrainingJobCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DescribeTrainingJobRequest
 *   TrainingJobName: "STRING_VALUE", // required
 * };
 * const command = new DescribeTrainingJobCommand(input);
 * const response = await client.send(command);
 * // { // DescribeTrainingJobResponse
 * //   TrainingJobName: "STRING_VALUE", // required
 * //   TrainingJobArn: "STRING_VALUE", // required
 * //   TuningJobArn: "STRING_VALUE",
 * //   LabelingJobArn: "STRING_VALUE",
 * //   AutoMLJobArn: "STRING_VALUE",
 * //   ModelArtifacts: { // ModelArtifacts
 * //     S3ModelArtifacts: "STRING_VALUE", // required
 * //   },
 * //   TrainingJobStatus: "InProgress" || "Completed" || "Failed" || "Stopping" || "Stopped", // required
 * //   SecondaryStatus: "Starting" || "LaunchingMLInstances" || "PreparingTrainingStack" || "Downloading" || "DownloadingTrainingImage" || "Training" || "Uploading" || "Stopping" || "Stopped" || "MaxRuntimeExceeded" || "Completed" || "Failed" || "Interrupted" || "MaxWaitTimeExceeded" || "Updating" || "Restarting" || "Pending", // required
 * //   FailureReason: "STRING_VALUE",
 * //   HyperParameters: { // HyperParameters
 * //     "<keys>": "STRING_VALUE",
 * //   },
 * //   AlgorithmSpecification: { // AlgorithmSpecification
 * //     TrainingImage: "STRING_VALUE",
 * //     AlgorithmName: "STRING_VALUE",
 * //     TrainingInputMode: "Pipe" || "File" || "FastFile", // required
 * //     MetricDefinitions: [ // MetricDefinitionList
 * //       { // MetricDefinition
 * //         Name: "STRING_VALUE", // required
 * //         Regex: "STRING_VALUE", // required
 * //       },
 * //     ],
 * //     EnableSageMakerMetricsTimeSeries: true || false,
 * //     ContainerEntrypoint: [ // TrainingContainerEntrypoint
 * //       "STRING_VALUE",
 * //     ],
 * //     ContainerArguments: [ // TrainingContainerArguments
 * //       "STRING_VALUE",
 * //     ],
 * //     TrainingImageConfig: { // TrainingImageConfig
 * //       TrainingRepositoryAccessMode: "Platform" || "Vpc", // required
 * //       TrainingRepositoryAuthConfig: { // TrainingRepositoryAuthConfig
 * //         TrainingRepositoryCredentialsProviderArn: "STRING_VALUE", // required
 * //       },
 * //     },
 * //   },
 * //   RoleArn: "STRING_VALUE",
 * //   InputDataConfig: [ // InputDataConfig
 * //     { // Channel
 * //       ChannelName: "STRING_VALUE", // required
 * //       DataSource: { // DataSource
 * //         S3DataSource: { // S3DataSource
 * //           S3DataType: "ManifestFile" || "S3Prefix" || "AugmentedManifestFile", // required
 * //           S3Uri: "STRING_VALUE", // required
 * //           S3DataDistributionType: "FullyReplicated" || "ShardedByS3Key",
 * //           AttributeNames: [ // AttributeNames
 * //             "STRING_VALUE",
 * //           ],
 * //           InstanceGroupNames: [ // InstanceGroupNames
 * //             "STRING_VALUE",
 * //           ],
 * //           ModelAccessConfig: { // ModelAccessConfig
 * //             AcceptEula: true || false, // required
 * //           },
 * //           HubAccessConfig: { // HubAccessConfig
 * //             HubContentArn: "STRING_VALUE", // required
 * //           },
 * //         },
 * //         FileSystemDataSource: { // FileSystemDataSource
 * //           FileSystemId: "STRING_VALUE", // required
 * //           FileSystemAccessMode: "rw" || "ro", // required
 * //           FileSystemType: "EFS" || "FSxLustre", // required
 * //           DirectoryPath: "STRING_VALUE", // required
 * //         },
 * //       },
 * //       ContentType: "STRING_VALUE",
 * //       CompressionType: "None" || "Gzip",
 * //       RecordWrapperType: "None" || "RecordIO",
 * //       InputMode: "Pipe" || "File" || "FastFile",
 * //       ShuffleConfig: { // ShuffleConfig
 * //         Seed: Number("long"), // required
 * //       },
 * //     },
 * //   ],
 * //   OutputDataConfig: { // OutputDataConfig
 * //     KmsKeyId: "STRING_VALUE",
 * //     S3OutputPath: "STRING_VALUE", // required
 * //     CompressionType: "GZIP" || "NONE",
 * //   },
 * //   ResourceConfig: { // ResourceConfig
 * //     InstanceType: "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.c5n.xlarge" || "ml.c5n.2xlarge" || "ml.c5n.4xlarge" || "ml.c5n.9xlarge" || "ml.c5n.18xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.16xlarge" || "ml.g6.12xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.16xlarge" || "ml.g6e.12xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.trn2.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.8xlarge" || "ml.c6i.4xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.8xlarge" || "ml.r5d.12xlarge" || "ml.r5d.16xlarge" || "ml.r5d.24xlarge" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge",
 * //     InstanceCount: Number("int"),
 * //     VolumeSizeInGB: Number("int"), // required
 * //     VolumeKmsKeyId: "STRING_VALUE",
 * //     KeepAlivePeriodInSeconds: Number("int"),
 * //     InstanceGroups: [ // InstanceGroups
 * //       { // InstanceGroup
 * //         InstanceType: "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.c5n.xlarge" || "ml.c5n.2xlarge" || "ml.c5n.4xlarge" || "ml.c5n.9xlarge" || "ml.c5n.18xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.16xlarge" || "ml.g6.12xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.16xlarge" || "ml.g6e.12xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.trn2.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.8xlarge" || "ml.c6i.4xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.8xlarge" || "ml.r5d.12xlarge" || "ml.r5d.16xlarge" || "ml.r5d.24xlarge" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge", // required
 * //         InstanceCount: Number("int"), // required
 * //         InstanceGroupName: "STRING_VALUE", // required
 * //       },
 * //     ],
 * //     TrainingPlanArn: "STRING_VALUE",
 * //   },
 * //   WarmPoolStatus: { // WarmPoolStatus
 * //     Status: "Available" || "Terminated" || "Reused" || "InUse", // required
 * //     ResourceRetainedBillableTimeInSeconds: Number("int"),
 * //     ReusedByJob: "STRING_VALUE",
 * //   },
 * //   VpcConfig: { // VpcConfig
 * //     SecurityGroupIds: [ // VpcSecurityGroupIds // required
 * //       "STRING_VALUE",
 * //     ],
 * //     Subnets: [ // Subnets // required
 * //       "STRING_VALUE",
 * //     ],
 * //   },
 * //   StoppingCondition: { // StoppingCondition
 * //     MaxRuntimeInSeconds: Number("int"),
 * //     MaxWaitTimeInSeconds: Number("int"),
 * //     MaxPendingTimeInSeconds: Number("int"),
 * //   },
 * //   CreationTime: new Date("TIMESTAMP"), // required
 * //   TrainingStartTime: new Date("TIMESTAMP"),
 * //   TrainingEndTime: new Date("TIMESTAMP"),
 * //   LastModifiedTime: new Date("TIMESTAMP"),
 * //   SecondaryStatusTransitions: [ // SecondaryStatusTransitions
 * //     { // SecondaryStatusTransition
 * //       Status: "Starting" || "LaunchingMLInstances" || "PreparingTrainingStack" || "Downloading" || "DownloadingTrainingImage" || "Training" || "Uploading" || "Stopping" || "Stopped" || "MaxRuntimeExceeded" || "Completed" || "Failed" || "Interrupted" || "MaxWaitTimeExceeded" || "Updating" || "Restarting" || "Pending", // required
 * //       StartTime: new Date("TIMESTAMP"), // required
 * //       EndTime: new Date("TIMESTAMP"),
 * //       StatusMessage: "STRING_VALUE",
 * //     },
 * //   ],
 * //   FinalMetricDataList: [ // FinalMetricDataList
 * //     { // MetricData
 * //       MetricName: "STRING_VALUE",
 * //       Value: Number("float"),
 * //       Timestamp: new Date("TIMESTAMP"),
 * //     },
 * //   ],
 * //   EnableNetworkIsolation: true || false,
 * //   EnableInterContainerTrafficEncryption: true || false,
 * //   EnableManagedSpotTraining: true || false,
 * //   CheckpointConfig: { // CheckpointConfig
 * //     S3Uri: "STRING_VALUE", // required
 * //     LocalPath: "STRING_VALUE",
 * //   },
 * //   TrainingTimeInSeconds: Number("int"),
 * //   BillableTimeInSeconds: Number("int"),
 * //   DebugHookConfig: { // DebugHookConfig
 * //     LocalPath: "STRING_VALUE",
 * //     S3OutputPath: "STRING_VALUE", // required
 * //     HookParameters: { // HookParameters
 * //       "<keys>": "STRING_VALUE",
 * //     },
 * //     CollectionConfigurations: [ // CollectionConfigurations
 * //       { // CollectionConfiguration
 * //         CollectionName: "STRING_VALUE",
 * //         CollectionParameters: { // CollectionParameters
 * //           "<keys>": "STRING_VALUE",
 * //         },
 * //       },
 * //     ],
 * //   },
 * //   ExperimentConfig: { // ExperimentConfig
 * //     ExperimentName: "STRING_VALUE",
 * //     TrialName: "STRING_VALUE",
 * //     TrialComponentDisplayName: "STRING_VALUE",
 * //     RunName: "STRING_VALUE",
 * //   },
 * //   DebugRuleConfigurations: [ // DebugRuleConfigurations
 * //     { // DebugRuleConfiguration
 * //       RuleConfigurationName: "STRING_VALUE", // required
 * //       LocalPath: "STRING_VALUE",
 * //       S3OutputPath: "STRING_VALUE",
 * //       RuleEvaluatorImage: "STRING_VALUE", // required
 * //       InstanceType: "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.8xlarge" || "ml.r5d.12xlarge" || "ml.r5d.16xlarge" || "ml.r5d.24xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.12xlarge" || "ml.g6e.16xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge",
 * //       VolumeSizeInGB: Number("int"),
 * //       RuleParameters: { // RuleParameters
 * //         "<keys>": "STRING_VALUE",
 * //       },
 * //     },
 * //   ],
 * //   TensorBoardOutputConfig: { // TensorBoardOutputConfig
 * //     LocalPath: "STRING_VALUE",
 * //     S3OutputPath: "STRING_VALUE", // required
 * //   },
 * //   DebugRuleEvaluationStatuses: [ // DebugRuleEvaluationStatuses
 * //     { // DebugRuleEvaluationStatus
 * //       RuleConfigurationName: "STRING_VALUE",
 * //       RuleEvaluationJobArn: "STRING_VALUE",
 * //       RuleEvaluationStatus: "InProgress" || "NoIssuesFound" || "IssuesFound" || "Error" || "Stopping" || "Stopped",
 * //       StatusDetails: "STRING_VALUE",
 * //       LastModifiedTime: new Date("TIMESTAMP"),
 * //     },
 * //   ],
 * //   ProfilerConfig: { // ProfilerConfig
 * //     S3OutputPath: "STRING_VALUE",
 * //     ProfilingIntervalInMilliseconds: Number("long"),
 * //     ProfilingParameters: { // ProfilingParameters
 * //       "<keys>": "STRING_VALUE",
 * //     },
 * //     DisableProfiler: true || false,
 * //   },
 * //   ProfilerRuleConfigurations: [ // ProfilerRuleConfigurations
 * //     { // ProfilerRuleConfiguration
 * //       RuleConfigurationName: "STRING_VALUE", // required
 * //       LocalPath: "STRING_VALUE",
 * //       S3OutputPath: "STRING_VALUE",
 * //       RuleEvaluatorImage: "STRING_VALUE", // required
 * //       InstanceType: "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.8xlarge" || "ml.r5d.12xlarge" || "ml.r5d.16xlarge" || "ml.r5d.24xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.12xlarge" || "ml.g6e.16xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge",
 * //       VolumeSizeInGB: Number("int"),
 * //       RuleParameters: {
 * //         "<keys>": "STRING_VALUE",
 * //       },
 * //     },
 * //   ],
 * //   ProfilerRuleEvaluationStatuses: [ // ProfilerRuleEvaluationStatuses
 * //     { // ProfilerRuleEvaluationStatus
 * //       RuleConfigurationName: "STRING_VALUE",
 * //       RuleEvaluationJobArn: "STRING_VALUE",
 * //       RuleEvaluationStatus: "InProgress" || "NoIssuesFound" || "IssuesFound" || "Error" || "Stopping" || "Stopped",
 * //       StatusDetails: "STRING_VALUE",
 * //       LastModifiedTime: new Date("TIMESTAMP"),
 * //     },
 * //   ],
 * //   ProfilingStatus: "Enabled" || "Disabled",
 * //   Environment: { // TrainingEnvironmentMap
 * //     "<keys>": "STRING_VALUE",
 * //   },
 * //   RetryStrategy: { // RetryStrategy
 * //     MaximumRetryAttempts: Number("int"), // required
 * //   },
 * //   RemoteDebugConfig: { // RemoteDebugConfig
 * //     EnableRemoteDebug: true || false,
 * //   },
 * //   InfraCheckConfig: { // InfraCheckConfig
 * //     EnableInfraCheck: true || false,
 * //   },
 * // };
 *
 * ```
 *
 * @param DescribeTrainingJobCommandInput - {@link DescribeTrainingJobCommandInput}
 * @returns {@link DescribeTrainingJobCommandOutput}
 * @see {@link DescribeTrainingJobCommandInput} for command's `input` shape.
 * @see {@link DescribeTrainingJobCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceNotFound} (client fault)
 *  <p>Resource being access is not found.</p>
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class DescribeTrainingJobCommand extends DescribeTrainingJobCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeTrainingJobRequest;
            output: DescribeTrainingJobResponse;
        };
        sdk: {
            input: DescribeTrainingJobCommandInput;
            output: DescribeTrainingJobCommandOutput;
        };
    };
}
