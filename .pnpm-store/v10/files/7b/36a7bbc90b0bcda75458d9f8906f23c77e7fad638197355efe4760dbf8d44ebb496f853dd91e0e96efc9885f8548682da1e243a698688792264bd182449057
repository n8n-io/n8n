import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DescribeHyperParameterTuningJobRequest, DescribeHyperParameterTuningJobResponse } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeHyperParameterTuningJobCommand}.
 */
export interface DescribeHyperParameterTuningJobCommandInput extends DescribeHyperParameterTuningJobRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeHyperParameterTuningJobCommand}.
 */
export interface DescribeHyperParameterTuningJobCommandOutput extends DescribeHyperParameterTuningJobResponse, __MetadataBearer {
}
declare const DescribeHyperParameterTuningJobCommand_base: {
    new (input: DescribeHyperParameterTuningJobCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeHyperParameterTuningJobCommandInput, DescribeHyperParameterTuningJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeHyperParameterTuningJobCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeHyperParameterTuningJobCommandInput, DescribeHyperParameterTuningJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Returns a description of a hyperparameter tuning job, depending on the fields selected. These fields can include the name, Amazon Resource Name (ARN), job status of your tuning job and more.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeHyperParameterTuningJobCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeHyperParameterTuningJobCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DescribeHyperParameterTuningJobRequest
 *   HyperParameterTuningJobName: "STRING_VALUE", // required
 * };
 * const command = new DescribeHyperParameterTuningJobCommand(input);
 * const response = await client.send(command);
 * // { // DescribeHyperParameterTuningJobResponse
 * //   HyperParameterTuningJobName: "STRING_VALUE", // required
 * //   HyperParameterTuningJobArn: "STRING_VALUE", // required
 * //   HyperParameterTuningJobConfig: { // HyperParameterTuningJobConfig
 * //     Strategy: "Bayesian" || "Random" || "Hyperband" || "Grid", // required
 * //     StrategyConfig: { // HyperParameterTuningJobStrategyConfig
 * //       HyperbandStrategyConfig: { // HyperbandStrategyConfig
 * //         MinResource: Number("int"),
 * //         MaxResource: Number("int"),
 * //       },
 * //     },
 * //     HyperParameterTuningJobObjective: { // HyperParameterTuningJobObjective
 * //       Type: "Maximize" || "Minimize", // required
 * //       MetricName: "STRING_VALUE", // required
 * //     },
 * //     ResourceLimits: { // ResourceLimits
 * //       MaxNumberOfTrainingJobs: Number("int"),
 * //       MaxParallelTrainingJobs: Number("int"), // required
 * //       MaxRuntimeInSeconds: Number("int"),
 * //     },
 * //     ParameterRanges: { // ParameterRanges
 * //       IntegerParameterRanges: [ // IntegerParameterRanges
 * //         { // IntegerParameterRange
 * //           Name: "STRING_VALUE", // required
 * //           MinValue: "STRING_VALUE", // required
 * //           MaxValue: "STRING_VALUE", // required
 * //           ScalingType: "Auto" || "Linear" || "Logarithmic" || "ReverseLogarithmic",
 * //         },
 * //       ],
 * //       ContinuousParameterRanges: [ // ContinuousParameterRanges
 * //         { // ContinuousParameterRange
 * //           Name: "STRING_VALUE", // required
 * //           MinValue: "STRING_VALUE", // required
 * //           MaxValue: "STRING_VALUE", // required
 * //           ScalingType: "Auto" || "Linear" || "Logarithmic" || "ReverseLogarithmic",
 * //         },
 * //       ],
 * //       CategoricalParameterRanges: [ // CategoricalParameterRanges
 * //         { // CategoricalParameterRange
 * //           Name: "STRING_VALUE", // required
 * //           Values: [ // ParameterValues // required
 * //             "STRING_VALUE",
 * //           ],
 * //         },
 * //       ],
 * //       AutoParameters: [ // AutoParameters
 * //         { // AutoParameter
 * //           Name: "STRING_VALUE", // required
 * //           ValueHint: "STRING_VALUE", // required
 * //         },
 * //       ],
 * //     },
 * //     TrainingJobEarlyStoppingType: "Off" || "Auto",
 * //     TuningJobCompletionCriteria: { // TuningJobCompletionCriteria
 * //       TargetObjectiveMetricValue: Number("float"),
 * //       BestObjectiveNotImproving: { // BestObjectiveNotImproving
 * //         MaxNumberOfTrainingJobsNotImproving: Number("int"),
 * //       },
 * //       ConvergenceDetected: { // ConvergenceDetected
 * //         CompleteOnConvergence: "Disabled" || "Enabled",
 * //       },
 * //     },
 * //     RandomSeed: Number("int"),
 * //   },
 * //   TrainingJobDefinition: { // HyperParameterTrainingJobDefinition
 * //     DefinitionName: "STRING_VALUE",
 * //     TuningObjective: {
 * //       Type: "Maximize" || "Minimize", // required
 * //       MetricName: "STRING_VALUE", // required
 * //     },
 * //     HyperParameterRanges: {
 * //       IntegerParameterRanges: [
 * //         {
 * //           Name: "STRING_VALUE", // required
 * //           MinValue: "STRING_VALUE", // required
 * //           MaxValue: "STRING_VALUE", // required
 * //           ScalingType: "Auto" || "Linear" || "Logarithmic" || "ReverseLogarithmic",
 * //         },
 * //       ],
 * //       ContinuousParameterRanges: [
 * //         {
 * //           Name: "STRING_VALUE", // required
 * //           MinValue: "STRING_VALUE", // required
 * //           MaxValue: "STRING_VALUE", // required
 * //           ScalingType: "Auto" || "Linear" || "Logarithmic" || "ReverseLogarithmic",
 * //         },
 * //       ],
 * //       CategoricalParameterRanges: [
 * //         {
 * //           Name: "STRING_VALUE", // required
 * //           Values: [ // required
 * //             "STRING_VALUE",
 * //           ],
 * //         },
 * //       ],
 * //       AutoParameters: [
 * //         {
 * //           Name: "STRING_VALUE", // required
 * //           ValueHint: "STRING_VALUE", // required
 * //         },
 * //       ],
 * //     },
 * //     StaticHyperParameters: { // HyperParameters
 * //       "<keys>": "STRING_VALUE",
 * //     },
 * //     AlgorithmSpecification: { // HyperParameterAlgorithmSpecification
 * //       TrainingImage: "STRING_VALUE",
 * //       TrainingInputMode: "Pipe" || "File" || "FastFile", // required
 * //       AlgorithmName: "STRING_VALUE",
 * //       MetricDefinitions: [ // MetricDefinitionList
 * //         { // MetricDefinition
 * //           Name: "STRING_VALUE", // required
 * //           Regex: "STRING_VALUE", // required
 * //         },
 * //       ],
 * //     },
 * //     RoleArn: "STRING_VALUE", // required
 * //     InputDataConfig: [ // InputDataConfig
 * //       { // Channel
 * //         ChannelName: "STRING_VALUE", // required
 * //         DataSource: { // DataSource
 * //           S3DataSource: { // S3DataSource
 * //             S3DataType: "ManifestFile" || "S3Prefix" || "AugmentedManifestFile" || "Converse", // required
 * //             S3Uri: "STRING_VALUE", // required
 * //             S3DataDistributionType: "FullyReplicated" || "ShardedByS3Key",
 * //             AttributeNames: [ // AttributeNames
 * //               "STRING_VALUE",
 * //             ],
 * //             InstanceGroupNames: [ // InstanceGroupNames
 * //               "STRING_VALUE",
 * //             ],
 * //             ModelAccessConfig: { // ModelAccessConfig
 * //               AcceptEula: true || false, // required
 * //             },
 * //             HubAccessConfig: { // HubAccessConfig
 * //               HubContentArn: "STRING_VALUE", // required
 * //             },
 * //           },
 * //           FileSystemDataSource: { // FileSystemDataSource
 * //             FileSystemId: "STRING_VALUE", // required
 * //             FileSystemAccessMode: "rw" || "ro", // required
 * //             FileSystemType: "EFS" || "FSxLustre", // required
 * //             DirectoryPath: "STRING_VALUE", // required
 * //           },
 * //           DatasetSource: { // DatasetSource
 * //             DatasetArn: "STRING_VALUE", // required
 * //           },
 * //         },
 * //         ContentType: "STRING_VALUE",
 * //         CompressionType: "None" || "Gzip",
 * //         RecordWrapperType: "None" || "RecordIO",
 * //         InputMode: "Pipe" || "File" || "FastFile",
 * //         ShuffleConfig: { // ShuffleConfig
 * //           Seed: Number("long"), // required
 * //         },
 * //       },
 * //     ],
 * //     VpcConfig: { // VpcConfig
 * //       SecurityGroupIds: [ // VpcSecurityGroupIds // required
 * //         "STRING_VALUE",
 * //       ],
 * //       Subnets: [ // Subnets // required
 * //         "STRING_VALUE",
 * //       ],
 * //     },
 * //     OutputDataConfig: { // OutputDataConfig
 * //       KmsKeyId: "STRING_VALUE",
 * //       S3OutputPath: "STRING_VALUE", // required
 * //       CompressionType: "GZIP" || "NONE",
 * //     },
 * //     ResourceConfig: { // ResourceConfig
 * //       InstanceType: "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.c5n.xlarge" || "ml.c5n.2xlarge" || "ml.c5n.4xlarge" || "ml.c5n.9xlarge" || "ml.c5n.18xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.16xlarge" || "ml.g6.12xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.16xlarge" || "ml.g6e.12xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.trn2.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.8xlarge" || "ml.c6i.4xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.8xlarge" || "ml.r5d.12xlarge" || "ml.r5d.16xlarge" || "ml.r5d.24xlarge" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge" || "ml.p6-b200.48xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge" || "ml.p6e-gb200.36xlarge" || "ml.p5.4xlarge" || "ml.p6-b300.48xlarge" || "ml.g7e.2xlarge" || "ml.g7e.4xlarge" || "ml.g7e.8xlarge" || "ml.g7e.12xlarge" || "ml.g7e.24xlarge" || "ml.g7e.48xlarge",
 * //       InstanceCount: Number("int"),
 * //       VolumeSizeInGB: Number("int"),
 * //       VolumeKmsKeyId: "STRING_VALUE",
 * //       KeepAlivePeriodInSeconds: Number("int"),
 * //       InstanceGroups: [ // InstanceGroups
 * //         { // InstanceGroup
 * //           InstanceType: "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.c5n.xlarge" || "ml.c5n.2xlarge" || "ml.c5n.4xlarge" || "ml.c5n.9xlarge" || "ml.c5n.18xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.16xlarge" || "ml.g6.12xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.16xlarge" || "ml.g6e.12xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.trn2.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.8xlarge" || "ml.c6i.4xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.8xlarge" || "ml.r5d.12xlarge" || "ml.r5d.16xlarge" || "ml.r5d.24xlarge" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge" || "ml.p6-b200.48xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge" || "ml.p6e-gb200.36xlarge" || "ml.p5.4xlarge" || "ml.p6-b300.48xlarge" || "ml.g7e.2xlarge" || "ml.g7e.4xlarge" || "ml.g7e.8xlarge" || "ml.g7e.12xlarge" || "ml.g7e.24xlarge" || "ml.g7e.48xlarge", // required
 * //           InstanceCount: Number("int"), // required
 * //           InstanceGroupName: "STRING_VALUE", // required
 * //         },
 * //       ],
 * //       TrainingPlanArn: "STRING_VALUE",
 * //       InstancePlacementConfig: { // InstancePlacementConfig
 * //         EnableMultipleJobs: true || false,
 * //         PlacementSpecifications: [ // PlacementSpecifications
 * //           { // PlacementSpecification
 * //             UltraServerId: "STRING_VALUE",
 * //             InstanceCount: Number("int"), // required
 * //           },
 * //         ],
 * //       },
 * //     },
 * //     HyperParameterTuningResourceConfig: { // HyperParameterTuningResourceConfig
 * //       InstanceType: "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.c5n.xlarge" || "ml.c5n.2xlarge" || "ml.c5n.4xlarge" || "ml.c5n.9xlarge" || "ml.c5n.18xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.16xlarge" || "ml.g6.12xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.16xlarge" || "ml.g6e.12xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.trn2.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.8xlarge" || "ml.c6i.4xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.8xlarge" || "ml.r5d.12xlarge" || "ml.r5d.16xlarge" || "ml.r5d.24xlarge" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge" || "ml.p6-b200.48xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge" || "ml.p6e-gb200.36xlarge" || "ml.p5.4xlarge" || "ml.p6-b300.48xlarge" || "ml.g7e.2xlarge" || "ml.g7e.4xlarge" || "ml.g7e.8xlarge" || "ml.g7e.12xlarge" || "ml.g7e.24xlarge" || "ml.g7e.48xlarge",
 * //       InstanceCount: Number("int"),
 * //       VolumeSizeInGB: Number("int"),
 * //       VolumeKmsKeyId: "STRING_VALUE",
 * //       AllocationStrategy: "Prioritized",
 * //       InstanceConfigs: [ // HyperParameterTuningInstanceConfigs
 * //         { // HyperParameterTuningInstanceConfig
 * //           InstanceType: "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.c5n.xlarge" || "ml.c5n.2xlarge" || "ml.c5n.4xlarge" || "ml.c5n.9xlarge" || "ml.c5n.18xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.16xlarge" || "ml.g6.12xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.16xlarge" || "ml.g6e.12xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.trn2.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.8xlarge" || "ml.c6i.4xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.8xlarge" || "ml.r5d.12xlarge" || "ml.r5d.16xlarge" || "ml.r5d.24xlarge" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge" || "ml.p6-b200.48xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge" || "ml.p6e-gb200.36xlarge" || "ml.p5.4xlarge" || "ml.p6-b300.48xlarge" || "ml.g7e.2xlarge" || "ml.g7e.4xlarge" || "ml.g7e.8xlarge" || "ml.g7e.12xlarge" || "ml.g7e.24xlarge" || "ml.g7e.48xlarge", // required
 * //           InstanceCount: Number("int"), // required
 * //           VolumeSizeInGB: Number("int"), // required
 * //         },
 * //       ],
 * //     },
 * //     StoppingCondition: { // StoppingCondition
 * //       MaxRuntimeInSeconds: Number("int"),
 * //       MaxWaitTimeInSeconds: Number("int"),
 * //       MaxPendingTimeInSeconds: Number("int"),
 * //     },
 * //     EnableNetworkIsolation: true || false,
 * //     EnableInterContainerTrafficEncryption: true || false,
 * //     EnableManagedSpotTraining: true || false,
 * //     CheckpointConfig: { // CheckpointConfig
 * //       S3Uri: "STRING_VALUE", // required
 * //       LocalPath: "STRING_VALUE",
 * //     },
 * //     RetryStrategy: { // RetryStrategy
 * //       MaximumRetryAttempts: Number("int"), // required
 * //     },
 * //     Environment: { // HyperParameterTrainingJobEnvironmentMap
 * //       "<keys>": "STRING_VALUE",
 * //     },
 * //   },
 * //   TrainingJobDefinitions: [ // HyperParameterTrainingJobDefinitions
 * //     {
 * //       DefinitionName: "STRING_VALUE",
 * //       TuningObjective: {
 * //         Type: "Maximize" || "Minimize", // required
 * //         MetricName: "STRING_VALUE", // required
 * //       },
 * //       HyperParameterRanges: {
 * //         IntegerParameterRanges: [
 * //           {
 * //             Name: "STRING_VALUE", // required
 * //             MinValue: "STRING_VALUE", // required
 * //             MaxValue: "STRING_VALUE", // required
 * //             ScalingType: "Auto" || "Linear" || "Logarithmic" || "ReverseLogarithmic",
 * //           },
 * //         ],
 * //         ContinuousParameterRanges: [
 * //           {
 * //             Name: "STRING_VALUE", // required
 * //             MinValue: "STRING_VALUE", // required
 * //             MaxValue: "STRING_VALUE", // required
 * //             ScalingType: "Auto" || "Linear" || "Logarithmic" || "ReverseLogarithmic",
 * //           },
 * //         ],
 * //         CategoricalParameterRanges: [
 * //           {
 * //             Name: "STRING_VALUE", // required
 * //             Values: [ // required
 * //               "STRING_VALUE",
 * //             ],
 * //           },
 * //         ],
 * //         AutoParameters: [
 * //           {
 * //             Name: "STRING_VALUE", // required
 * //             ValueHint: "STRING_VALUE", // required
 * //           },
 * //         ],
 * //       },
 * //       StaticHyperParameters: {
 * //         "<keys>": "STRING_VALUE",
 * //       },
 * //       AlgorithmSpecification: {
 * //         TrainingImage: "STRING_VALUE",
 * //         TrainingInputMode: "Pipe" || "File" || "FastFile", // required
 * //         AlgorithmName: "STRING_VALUE",
 * //         MetricDefinitions: [
 * //           {
 * //             Name: "STRING_VALUE", // required
 * //             Regex: "STRING_VALUE", // required
 * //           },
 * //         ],
 * //       },
 * //       RoleArn: "STRING_VALUE", // required
 * //       InputDataConfig: [
 * //         {
 * //           ChannelName: "STRING_VALUE", // required
 * //           DataSource: {
 * //             S3DataSource: {
 * //               S3DataType: "ManifestFile" || "S3Prefix" || "AugmentedManifestFile" || "Converse", // required
 * //               S3Uri: "STRING_VALUE", // required
 * //               S3DataDistributionType: "FullyReplicated" || "ShardedByS3Key",
 * //               AttributeNames: [
 * //                 "STRING_VALUE",
 * //               ],
 * //               InstanceGroupNames: [
 * //                 "STRING_VALUE",
 * //               ],
 * //               ModelAccessConfig: {
 * //                 AcceptEula: true || false, // required
 * //               },
 * //               HubAccessConfig: {
 * //                 HubContentArn: "STRING_VALUE", // required
 * //               },
 * //             },
 * //             FileSystemDataSource: {
 * //               FileSystemId: "STRING_VALUE", // required
 * //               FileSystemAccessMode: "rw" || "ro", // required
 * //               FileSystemType: "EFS" || "FSxLustre", // required
 * //               DirectoryPath: "STRING_VALUE", // required
 * //             },
 * //             DatasetSource: {
 * //               DatasetArn: "STRING_VALUE", // required
 * //             },
 * //           },
 * //           ContentType: "STRING_VALUE",
 * //           CompressionType: "None" || "Gzip",
 * //           RecordWrapperType: "None" || "RecordIO",
 * //           InputMode: "Pipe" || "File" || "FastFile",
 * //           ShuffleConfig: {
 * //             Seed: Number("long"), // required
 * //           },
 * //         },
 * //       ],
 * //       VpcConfig: {
 * //         SecurityGroupIds: [ // required
 * //           "STRING_VALUE",
 * //         ],
 * //         Subnets: [ // required
 * //           "STRING_VALUE",
 * //         ],
 * //       },
 * //       OutputDataConfig: {
 * //         KmsKeyId: "STRING_VALUE",
 * //         S3OutputPath: "STRING_VALUE", // required
 * //         CompressionType: "GZIP" || "NONE",
 * //       },
 * //       ResourceConfig: {
 * //         InstanceType: "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.c5n.xlarge" || "ml.c5n.2xlarge" || "ml.c5n.4xlarge" || "ml.c5n.9xlarge" || "ml.c5n.18xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.16xlarge" || "ml.g6.12xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.16xlarge" || "ml.g6e.12xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.trn2.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.8xlarge" || "ml.c6i.4xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.8xlarge" || "ml.r5d.12xlarge" || "ml.r5d.16xlarge" || "ml.r5d.24xlarge" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge" || "ml.p6-b200.48xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge" || "ml.p6e-gb200.36xlarge" || "ml.p5.4xlarge" || "ml.p6-b300.48xlarge" || "ml.g7e.2xlarge" || "ml.g7e.4xlarge" || "ml.g7e.8xlarge" || "ml.g7e.12xlarge" || "ml.g7e.24xlarge" || "ml.g7e.48xlarge",
 * //         InstanceCount: Number("int"),
 * //         VolumeSizeInGB: Number("int"),
 * //         VolumeKmsKeyId: "STRING_VALUE",
 * //         KeepAlivePeriodInSeconds: Number("int"),
 * //         InstanceGroups: [
 * //           {
 * //             InstanceType: "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.c5n.xlarge" || "ml.c5n.2xlarge" || "ml.c5n.4xlarge" || "ml.c5n.9xlarge" || "ml.c5n.18xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.16xlarge" || "ml.g6.12xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.16xlarge" || "ml.g6e.12xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.trn2.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.8xlarge" || "ml.c6i.4xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.8xlarge" || "ml.r5d.12xlarge" || "ml.r5d.16xlarge" || "ml.r5d.24xlarge" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge" || "ml.p6-b200.48xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge" || "ml.p6e-gb200.36xlarge" || "ml.p5.4xlarge" || "ml.p6-b300.48xlarge" || "ml.g7e.2xlarge" || "ml.g7e.4xlarge" || "ml.g7e.8xlarge" || "ml.g7e.12xlarge" || "ml.g7e.24xlarge" || "ml.g7e.48xlarge", // required
 * //             InstanceCount: Number("int"), // required
 * //             InstanceGroupName: "STRING_VALUE", // required
 * //           },
 * //         ],
 * //         TrainingPlanArn: "STRING_VALUE",
 * //         InstancePlacementConfig: {
 * //           EnableMultipleJobs: true || false,
 * //           PlacementSpecifications: [
 * //             {
 * //               UltraServerId: "STRING_VALUE",
 * //               InstanceCount: Number("int"), // required
 * //             },
 * //           ],
 * //         },
 * //       },
 * //       HyperParameterTuningResourceConfig: {
 * //         InstanceType: "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.c5n.xlarge" || "ml.c5n.2xlarge" || "ml.c5n.4xlarge" || "ml.c5n.9xlarge" || "ml.c5n.18xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.16xlarge" || "ml.g6.12xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.16xlarge" || "ml.g6e.12xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.trn2.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.8xlarge" || "ml.c6i.4xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.8xlarge" || "ml.r5d.12xlarge" || "ml.r5d.16xlarge" || "ml.r5d.24xlarge" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge" || "ml.p6-b200.48xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge" || "ml.p6e-gb200.36xlarge" || "ml.p5.4xlarge" || "ml.p6-b300.48xlarge" || "ml.g7e.2xlarge" || "ml.g7e.4xlarge" || "ml.g7e.8xlarge" || "ml.g7e.12xlarge" || "ml.g7e.24xlarge" || "ml.g7e.48xlarge",
 * //         InstanceCount: Number("int"),
 * //         VolumeSizeInGB: Number("int"),
 * //         VolumeKmsKeyId: "STRING_VALUE",
 * //         AllocationStrategy: "Prioritized",
 * //         InstanceConfigs: [
 * //           {
 * //             InstanceType: "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.p3dn.24xlarge" || "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.c5n.xlarge" || "ml.c5n.2xlarge" || "ml.c5n.4xlarge" || "ml.c5n.9xlarge" || "ml.c5n.18xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.16xlarge" || "ml.g6.12xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.16xlarge" || "ml.g6e.12xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.trn2.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.8xlarge" || "ml.c6i.4xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.8xlarge" || "ml.r5d.12xlarge" || "ml.r5d.16xlarge" || "ml.r5d.24xlarge" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge" || "ml.p6-b200.48xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.c7i.large" || "ml.c7i.xlarge" || "ml.c7i.2xlarge" || "ml.c7i.4xlarge" || "ml.c7i.8xlarge" || "ml.c7i.12xlarge" || "ml.c7i.16xlarge" || "ml.c7i.24xlarge" || "ml.c7i.48xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge" || "ml.p6e-gb200.36xlarge" || "ml.p5.4xlarge" || "ml.p6-b300.48xlarge" || "ml.g7e.2xlarge" || "ml.g7e.4xlarge" || "ml.g7e.8xlarge" || "ml.g7e.12xlarge" || "ml.g7e.24xlarge" || "ml.g7e.48xlarge", // required
 * //             InstanceCount: Number("int"), // required
 * //             VolumeSizeInGB: Number("int"), // required
 * //           },
 * //         ],
 * //       },
 * //       StoppingCondition: {
 * //         MaxRuntimeInSeconds: Number("int"),
 * //         MaxWaitTimeInSeconds: Number("int"),
 * //         MaxPendingTimeInSeconds: Number("int"),
 * //       },
 * //       EnableNetworkIsolation: true || false,
 * //       EnableInterContainerTrafficEncryption: true || false,
 * //       EnableManagedSpotTraining: true || false,
 * //       CheckpointConfig: {
 * //         S3Uri: "STRING_VALUE", // required
 * //         LocalPath: "STRING_VALUE",
 * //       },
 * //       RetryStrategy: {
 * //         MaximumRetryAttempts: Number("int"), // required
 * //       },
 * //       Environment: {
 * //         "<keys>": "STRING_VALUE",
 * //       },
 * //     },
 * //   ],
 * //   HyperParameterTuningJobStatus: "Completed" || "InProgress" || "Failed" || "Stopped" || "Stopping" || "Deleting" || "DeleteFailed", // required
 * //   CreationTime: new Date("TIMESTAMP"), // required
 * //   HyperParameterTuningEndTime: new Date("TIMESTAMP"),
 * //   LastModifiedTime: new Date("TIMESTAMP"),
 * //   TrainingJobStatusCounters: { // TrainingJobStatusCounters
 * //     Completed: Number("int"),
 * //     InProgress: Number("int"),
 * //     RetryableError: Number("int"),
 * //     NonRetryableError: Number("int"),
 * //     Stopped: Number("int"),
 * //   },
 * //   ObjectiveStatusCounters: { // ObjectiveStatusCounters
 * //     Succeeded: Number("int"),
 * //     Pending: Number("int"),
 * //     Failed: Number("int"),
 * //   },
 * //   BestTrainingJob: { // HyperParameterTrainingJobSummary
 * //     TrainingJobDefinitionName: "STRING_VALUE",
 * //     TrainingJobName: "STRING_VALUE", // required
 * //     TrainingJobArn: "STRING_VALUE", // required
 * //     TuningJobName: "STRING_VALUE",
 * //     CreationTime: new Date("TIMESTAMP"), // required
 * //     TrainingStartTime: new Date("TIMESTAMP"),
 * //     TrainingEndTime: new Date("TIMESTAMP"),
 * //     TrainingJobStatus: "InProgress" || "Completed" || "Failed" || "Stopping" || "Stopped" || "Deleting", // required
 * //     TunedHyperParameters: { // required
 * //       "<keys>": "STRING_VALUE",
 * //     },
 * //     FailureReason: "STRING_VALUE",
 * //     FinalHyperParameterTuningJobObjectiveMetric: { // FinalHyperParameterTuningJobObjectiveMetric
 * //       Type: "Maximize" || "Minimize",
 * //       MetricName: "STRING_VALUE", // required
 * //       Value: Number("float"), // required
 * //     },
 * //     ObjectiveStatus: "Succeeded" || "Pending" || "Failed",
 * //   },
 * //   OverallBestTrainingJob: {
 * //     TrainingJobDefinitionName: "STRING_VALUE",
 * //     TrainingJobName: "STRING_VALUE", // required
 * //     TrainingJobArn: "STRING_VALUE", // required
 * //     TuningJobName: "STRING_VALUE",
 * //     CreationTime: new Date("TIMESTAMP"), // required
 * //     TrainingStartTime: new Date("TIMESTAMP"),
 * //     TrainingEndTime: new Date("TIMESTAMP"),
 * //     TrainingJobStatus: "InProgress" || "Completed" || "Failed" || "Stopping" || "Stopped" || "Deleting", // required
 * //     TunedHyperParameters: { // required
 * //       "<keys>": "STRING_VALUE",
 * //     },
 * //     FailureReason: "STRING_VALUE",
 * //     FinalHyperParameterTuningJobObjectiveMetric: {
 * //       Type: "Maximize" || "Minimize",
 * //       MetricName: "STRING_VALUE", // required
 * //       Value: Number("float"), // required
 * //     },
 * //     ObjectiveStatus: "Succeeded" || "Pending" || "Failed",
 * //   },
 * //   WarmStartConfig: { // HyperParameterTuningJobWarmStartConfig
 * //     ParentHyperParameterTuningJobs: [ // ParentHyperParameterTuningJobs // required
 * //       { // ParentHyperParameterTuningJob
 * //         HyperParameterTuningJobName: "STRING_VALUE",
 * //       },
 * //     ],
 * //     WarmStartType: "IdenticalDataAndAlgorithm" || "TransferLearning", // required
 * //   },
 * //   Autotune: { // Autotune
 * //     Mode: "Enabled", // required
 * //   },
 * //   FailureReason: "STRING_VALUE",
 * //   TuningJobCompletionDetails: { // HyperParameterTuningJobCompletionDetails
 * //     NumberOfTrainingJobsObjectiveNotImproving: Number("int"),
 * //     ConvergenceDetectedTime: new Date("TIMESTAMP"),
 * //   },
 * //   ConsumedResources: { // HyperParameterTuningJobConsumedResources
 * //     RuntimeInSeconds: Number("int"),
 * //   },
 * // };
 *
 * ```
 *
 * @param DescribeHyperParameterTuningJobCommandInput - {@link DescribeHyperParameterTuningJobCommandInput}
 * @returns {@link DescribeHyperParameterTuningJobCommandOutput}
 * @see {@link DescribeHyperParameterTuningJobCommandInput} for command's `input` shape.
 * @see {@link DescribeHyperParameterTuningJobCommandOutput} for command's `response` shape.
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
export declare class DescribeHyperParameterTuningJobCommand extends DescribeHyperParameterTuningJobCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeHyperParameterTuningJobRequest;
            output: DescribeHyperParameterTuningJobResponse;
        };
        sdk: {
            input: DescribeHyperParameterTuningJobCommandInput;
            output: DescribeHyperParameterTuningJobCommandOutput;
        };
    };
}
