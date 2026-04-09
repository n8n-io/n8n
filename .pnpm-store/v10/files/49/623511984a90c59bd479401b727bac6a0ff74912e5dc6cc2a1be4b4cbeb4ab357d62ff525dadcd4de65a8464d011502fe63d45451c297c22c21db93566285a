import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DescribeOptimizationJobRequest, DescribeOptimizationJobResponse } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeOptimizationJobCommand}.
 */
export interface DescribeOptimizationJobCommandInput extends DescribeOptimizationJobRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeOptimizationJobCommand}.
 */
export interface DescribeOptimizationJobCommandOutput extends DescribeOptimizationJobResponse, __MetadataBearer {
}
declare const DescribeOptimizationJobCommand_base: {
    new (input: DescribeOptimizationJobCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeOptimizationJobCommandInput, DescribeOptimizationJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeOptimizationJobCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeOptimizationJobCommandInput, DescribeOptimizationJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Provides the properties of the specified optimization job.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeOptimizationJobCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeOptimizationJobCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DescribeOptimizationJobRequest
 *   OptimizationJobName: "STRING_VALUE", // required
 * };
 * const command = new DescribeOptimizationJobCommand(input);
 * const response = await client.send(command);
 * // { // DescribeOptimizationJobResponse
 * //   OptimizationJobArn: "STRING_VALUE", // required
 * //   OptimizationJobStatus: "INPROGRESS" || "COMPLETED" || "FAILED" || "STARTING" || "STOPPING" || "STOPPED", // required
 * //   OptimizationStartTime: new Date("TIMESTAMP"),
 * //   OptimizationEndTime: new Date("TIMESTAMP"),
 * //   CreationTime: new Date("TIMESTAMP"), // required
 * //   LastModifiedTime: new Date("TIMESTAMP"), // required
 * //   FailureReason: "STRING_VALUE",
 * //   OptimizationJobName: "STRING_VALUE", // required
 * //   ModelSource: { // OptimizationJobModelSource
 * //     S3: { // OptimizationJobModelSourceS3
 * //       S3Uri: "STRING_VALUE",
 * //       ModelAccessConfig: { // OptimizationModelAccessConfig
 * //         AcceptEula: true || false, // required
 * //       },
 * //     },
 * //     SageMakerModel: { // OptimizationSageMakerModel
 * //       ModelName: "STRING_VALUE",
 * //     },
 * //   },
 * //   OptimizationEnvironment: { // OptimizationJobEnvironmentVariables
 * //     "<keys>": "STRING_VALUE",
 * //   },
 * //   DeploymentInstanceType: "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.12xlarge" || "ml.g5.16xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.12xlarge" || "ml.g6e.16xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.inf2.xlarge" || "ml.inf2.8xlarge" || "ml.inf2.24xlarge" || "ml.inf2.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge", // required
 * //   MaxInstanceCount: Number("int"),
 * //   OptimizationConfigs: [ // OptimizationConfigs // required
 * //     { // OptimizationConfig Union: only one key present
 * //       ModelQuantizationConfig: { // ModelQuantizationConfig
 * //         Image: "STRING_VALUE",
 * //         OverrideEnvironment: {
 * //           "<keys>": "STRING_VALUE",
 * //         },
 * //       },
 * //       ModelCompilationConfig: { // ModelCompilationConfig
 * //         Image: "STRING_VALUE",
 * //         OverrideEnvironment: {
 * //           "<keys>": "STRING_VALUE",
 * //         },
 * //       },
 * //       ModelShardingConfig: { // ModelShardingConfig
 * //         Image: "STRING_VALUE",
 * //         OverrideEnvironment: {
 * //           "<keys>": "STRING_VALUE",
 * //         },
 * //       },
 * //       ModelSpeculativeDecodingConfig: { // ModelSpeculativeDecodingConfig
 * //         Technique: "EAGLE", // required
 * //         TrainingDataSource: { // ModelSpeculativeDecodingTrainingDataSource
 * //           S3Uri: "STRING_VALUE", // required
 * //           S3DataType: "S3Prefix" || "ManifestFile", // required
 * //         },
 * //       },
 * //     },
 * //   ],
 * //   OutputConfig: { // OptimizationJobOutputConfig
 * //     KmsKeyId: "STRING_VALUE",
 * //     S3OutputLocation: "STRING_VALUE", // required
 * //     SageMakerModel: {
 * //       ModelName: "STRING_VALUE",
 * //     },
 * //   },
 * //   OptimizationOutput: { // OptimizationOutput
 * //     RecommendedInferenceImage: "STRING_VALUE",
 * //   },
 * //   RoleArn: "STRING_VALUE", // required
 * //   StoppingCondition: { // StoppingCondition
 * //     MaxRuntimeInSeconds: Number("int"),
 * //     MaxWaitTimeInSeconds: Number("int"),
 * //     MaxPendingTimeInSeconds: Number("int"),
 * //   },
 * //   VpcConfig: { // OptimizationVpcConfig
 * //     SecurityGroupIds: [ // OptimizationVpcSecurityGroupIds // required
 * //       "STRING_VALUE",
 * //     ],
 * //     Subnets: [ // OptimizationVpcSubnets // required
 * //       "STRING_VALUE",
 * //     ],
 * //   },
 * // };
 *
 * ```
 *
 * @param DescribeOptimizationJobCommandInput - {@link DescribeOptimizationJobCommandInput}
 * @returns {@link DescribeOptimizationJobCommandOutput}
 * @see {@link DescribeOptimizationJobCommandInput} for command's `input` shape.
 * @see {@link DescribeOptimizationJobCommandOutput} for command's `response` shape.
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
export declare class DescribeOptimizationJobCommand extends DescribeOptimizationJobCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeOptimizationJobRequest;
            output: DescribeOptimizationJobResponse;
        };
        sdk: {
            input: DescribeOptimizationJobCommandInput;
            output: DescribeOptimizationJobCommandOutput;
        };
    };
}
