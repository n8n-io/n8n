import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { UpdateMonitoringScheduleRequest, UpdateMonitoringScheduleResponse } from "../models/models_5";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateMonitoringScheduleCommand}.
 */
export interface UpdateMonitoringScheduleCommandInput extends UpdateMonitoringScheduleRequest {
}
/**
 * @public
 *
 * The output of {@link UpdateMonitoringScheduleCommand}.
 */
export interface UpdateMonitoringScheduleCommandOutput extends UpdateMonitoringScheduleResponse, __MetadataBearer {
}
declare const UpdateMonitoringScheduleCommand_base: {
    new (input: UpdateMonitoringScheduleCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateMonitoringScheduleCommandInput, UpdateMonitoringScheduleCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateMonitoringScheduleCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateMonitoringScheduleCommandInput, UpdateMonitoringScheduleCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Updates a previously created schedule.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, UpdateMonitoringScheduleCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, UpdateMonitoringScheduleCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // UpdateMonitoringScheduleRequest
 *   MonitoringScheduleName: "STRING_VALUE", // required
 *   MonitoringScheduleConfig: { // MonitoringScheduleConfig
 *     ScheduleConfig: { // ScheduleConfig
 *       ScheduleExpression: "STRING_VALUE", // required
 *       DataAnalysisStartTime: "STRING_VALUE",
 *       DataAnalysisEndTime: "STRING_VALUE",
 *     },
 *     MonitoringJobDefinition: { // MonitoringJobDefinition
 *       BaselineConfig: { // MonitoringBaselineConfig
 *         BaseliningJobName: "STRING_VALUE",
 *         ConstraintsResource: { // MonitoringConstraintsResource
 *           S3Uri: "STRING_VALUE",
 *         },
 *         StatisticsResource: { // MonitoringStatisticsResource
 *           S3Uri: "STRING_VALUE",
 *         },
 *       },
 *       MonitoringInputs: [ // MonitoringInputs // required
 *         { // MonitoringInput
 *           EndpointInput: { // EndpointInput
 *             EndpointName: "STRING_VALUE", // required
 *             LocalPath: "STRING_VALUE", // required
 *             S3InputMode: "Pipe" || "File",
 *             S3DataDistributionType: "FullyReplicated" || "ShardedByS3Key",
 *             FeaturesAttribute: "STRING_VALUE",
 *             InferenceAttribute: "STRING_VALUE",
 *             ProbabilityAttribute: "STRING_VALUE",
 *             ProbabilityThresholdAttribute: Number("double"),
 *             StartTimeOffset: "STRING_VALUE",
 *             EndTimeOffset: "STRING_VALUE",
 *             ExcludeFeaturesAttribute: "STRING_VALUE",
 *           },
 *           BatchTransformInput: { // BatchTransformInput
 *             DataCapturedDestinationS3Uri: "STRING_VALUE", // required
 *             DatasetFormat: { // MonitoringDatasetFormat
 *               Csv: { // MonitoringCsvDatasetFormat
 *                 Header: true || false,
 *               },
 *               Json: { // MonitoringJsonDatasetFormat
 *                 Line: true || false,
 *               },
 *               Parquet: {},
 *             },
 *             LocalPath: "STRING_VALUE", // required
 *             S3InputMode: "Pipe" || "File",
 *             S3DataDistributionType: "FullyReplicated" || "ShardedByS3Key",
 *             FeaturesAttribute: "STRING_VALUE",
 *             InferenceAttribute: "STRING_VALUE",
 *             ProbabilityAttribute: "STRING_VALUE",
 *             ProbabilityThresholdAttribute: Number("double"),
 *             StartTimeOffset: "STRING_VALUE",
 *             EndTimeOffset: "STRING_VALUE",
 *             ExcludeFeaturesAttribute: "STRING_VALUE",
 *           },
 *         },
 *       ],
 *       MonitoringOutputConfig: { // MonitoringOutputConfig
 *         MonitoringOutputs: [ // MonitoringOutputs // required
 *           { // MonitoringOutput
 *             S3Output: { // MonitoringS3Output
 *               S3Uri: "STRING_VALUE", // required
 *               LocalPath: "STRING_VALUE", // required
 *               S3UploadMode: "Continuous" || "EndOfJob",
 *             },
 *           },
 *         ],
 *         KmsKeyId: "STRING_VALUE",
 *       },
 *       MonitoringResources: { // MonitoringResources
 *         ClusterConfig: { // MonitoringClusterConfig
 *           InstanceCount: Number("int"), // required
 *           InstanceType: "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.m4.xlarge" || "ml.m4.2xlarge" || "ml.m4.4xlarge" || "ml.m4.10xlarge" || "ml.m4.16xlarge" || "ml.c4.xlarge" || "ml.c4.2xlarge" || "ml.c4.4xlarge" || "ml.c4.8xlarge" || "ml.p2.xlarge" || "ml.p2.8xlarge" || "ml.p2.16xlarge" || "ml.p3.2xlarge" || "ml.p3.8xlarge" || "ml.p3.16xlarge" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.18xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.12xlarge" || "ml.m5.24xlarge" || "ml.r5.large" || "ml.r5.xlarge" || "ml.r5.2xlarge" || "ml.r5.4xlarge" || "ml.r5.8xlarge" || "ml.r5.12xlarge" || "ml.r5.16xlarge" || "ml.r5.24xlarge" || "ml.g4dn.xlarge" || "ml.g4dn.2xlarge" || "ml.g4dn.4xlarge" || "ml.g4dn.8xlarge" || "ml.g4dn.12xlarge" || "ml.g4dn.16xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.16xlarge" || "ml.g5.12xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.r5d.large" || "ml.r5d.xlarge" || "ml.r5d.2xlarge" || "ml.r5d.4xlarge" || "ml.r5d.8xlarge" || "ml.r5d.12xlarge" || "ml.r5d.16xlarge" || "ml.r5d.24xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.12xlarge" || "ml.g6e.16xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge", // required
 *           VolumeSizeInGB: Number("int"), // required
 *           VolumeKmsKeyId: "STRING_VALUE",
 *         },
 *       },
 *       MonitoringAppSpecification: { // MonitoringAppSpecification
 *         ImageUri: "STRING_VALUE", // required
 *         ContainerEntrypoint: [ // ContainerEntrypoint
 *           "STRING_VALUE",
 *         ],
 *         ContainerArguments: [ // MonitoringContainerArguments
 *           "STRING_VALUE",
 *         ],
 *         RecordPreprocessorSourceUri: "STRING_VALUE",
 *         PostAnalyticsProcessorSourceUri: "STRING_VALUE",
 *       },
 *       StoppingCondition: { // MonitoringStoppingCondition
 *         MaxRuntimeInSeconds: Number("int"), // required
 *       },
 *       Environment: { // MonitoringEnvironmentMap
 *         "<keys>": "STRING_VALUE",
 *       },
 *       NetworkConfig: { // NetworkConfig
 *         EnableInterContainerTrafficEncryption: true || false,
 *         EnableNetworkIsolation: true || false,
 *         VpcConfig: { // VpcConfig
 *           SecurityGroupIds: [ // VpcSecurityGroupIds // required
 *             "STRING_VALUE",
 *           ],
 *           Subnets: [ // Subnets // required
 *             "STRING_VALUE",
 *           ],
 *         },
 *       },
 *       RoleArn: "STRING_VALUE", // required
 *     },
 *     MonitoringJobDefinitionName: "STRING_VALUE",
 *     MonitoringType: "DataQuality" || "ModelQuality" || "ModelBias" || "ModelExplainability",
 *   },
 * };
 * const command = new UpdateMonitoringScheduleCommand(input);
 * const response = await client.send(command);
 * // { // UpdateMonitoringScheduleResponse
 * //   MonitoringScheduleArn: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param UpdateMonitoringScheduleCommandInput - {@link UpdateMonitoringScheduleCommandInput}
 * @returns {@link UpdateMonitoringScheduleCommandOutput}
 * @see {@link UpdateMonitoringScheduleCommandInput} for command's `input` shape.
 * @see {@link UpdateMonitoringScheduleCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceLimitExceeded} (client fault)
 *  <p> You have exceeded an SageMaker resource limit. For example, you might have too many training jobs created. </p>
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
export declare class UpdateMonitoringScheduleCommand extends UpdateMonitoringScheduleCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateMonitoringScheduleRequest;
            output: UpdateMonitoringScheduleResponse;
        };
        sdk: {
            input: UpdateMonitoringScheduleCommandInput;
            output: UpdateMonitoringScheduleCommandOutput;
        };
    };
}
