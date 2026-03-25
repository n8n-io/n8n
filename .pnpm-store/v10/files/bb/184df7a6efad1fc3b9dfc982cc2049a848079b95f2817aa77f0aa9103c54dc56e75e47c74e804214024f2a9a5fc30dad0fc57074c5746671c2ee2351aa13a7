import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateOptimizationJobRequest, CreateOptimizationJobResponse } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateOptimizationJobCommand}.
 */
export interface CreateOptimizationJobCommandInput extends CreateOptimizationJobRequest {
}
/**
 * @public
 *
 * The output of {@link CreateOptimizationJobCommand}.
 */
export interface CreateOptimizationJobCommandOutput extends CreateOptimizationJobResponse, __MetadataBearer {
}
declare const CreateOptimizationJobCommand_base: {
    new (input: CreateOptimizationJobCommandInput): import("@smithy/smithy-client").CommandImpl<CreateOptimizationJobCommandInput, CreateOptimizationJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateOptimizationJobCommandInput): import("@smithy/smithy-client").CommandImpl<CreateOptimizationJobCommandInput, CreateOptimizationJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates a job that optimizes a model for inference performance. To create the job, you provide the location of a source model, and you provide the settings for the optimization techniques that you want the job to apply. When the job completes successfully, SageMaker uploads the new optimized model to the output destination that you specify.</p> <p>For more information about how to use this action, and about the supported optimization techniques, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/model-optimize.html">Optimize model inference with Amazon SageMaker</a>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreateOptimizationJobCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreateOptimizationJobCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // CreateOptimizationJobRequest
 *   OptimizationJobName: "STRING_VALUE", // required
 *   RoleArn: "STRING_VALUE", // required
 *   ModelSource: { // OptimizationJobModelSource
 *     S3: { // OptimizationJobModelSourceS3
 *       S3Uri: "STRING_VALUE",
 *       ModelAccessConfig: { // OptimizationModelAccessConfig
 *         AcceptEula: true || false, // required
 *       },
 *     },
 *   },
 *   DeploymentInstanceType: "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.p5.48xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.12xlarge" || "ml.g5.16xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.12xlarge" || "ml.g6e.16xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.inf2.xlarge" || "ml.inf2.8xlarge" || "ml.inf2.24xlarge" || "ml.inf2.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge", // required
 *   OptimizationEnvironment: { // OptimizationJobEnvironmentVariables
 *     "<keys>": "STRING_VALUE",
 *   },
 *   OptimizationConfigs: [ // OptimizationConfigs // required
 *     { // OptimizationConfig Union: only one key present
 *       ModelQuantizationConfig: { // ModelQuantizationConfig
 *         Image: "STRING_VALUE",
 *         OverrideEnvironment: {
 *           "<keys>": "STRING_VALUE",
 *         },
 *       },
 *       ModelCompilationConfig: { // ModelCompilationConfig
 *         Image: "STRING_VALUE",
 *         OverrideEnvironment: {
 *           "<keys>": "STRING_VALUE",
 *         },
 *       },
 *       ModelShardingConfig: { // ModelShardingConfig
 *         Image: "STRING_VALUE",
 *         OverrideEnvironment: {
 *           "<keys>": "STRING_VALUE",
 *         },
 *       },
 *     },
 *   ],
 *   OutputConfig: { // OptimizationJobOutputConfig
 *     KmsKeyId: "STRING_VALUE",
 *     S3OutputLocation: "STRING_VALUE", // required
 *   },
 *   StoppingCondition: { // StoppingCondition
 *     MaxRuntimeInSeconds: Number("int"),
 *     MaxWaitTimeInSeconds: Number("int"),
 *     MaxPendingTimeInSeconds: Number("int"),
 *   },
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 *   VpcConfig: { // OptimizationVpcConfig
 *     SecurityGroupIds: [ // OptimizationVpcSecurityGroupIds // required
 *       "STRING_VALUE",
 *     ],
 *     Subnets: [ // OptimizationVpcSubnets // required
 *       "STRING_VALUE",
 *     ],
 *   },
 * };
 * const command = new CreateOptimizationJobCommand(input);
 * const response = await client.send(command);
 * // { // CreateOptimizationJobResponse
 * //   OptimizationJobArn: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param CreateOptimizationJobCommandInput - {@link CreateOptimizationJobCommandInput}
 * @returns {@link CreateOptimizationJobCommandOutput}
 * @see {@link CreateOptimizationJobCommandInput} for command's `input` shape.
 * @see {@link CreateOptimizationJobCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceInUse} (client fault)
 *  <p>Resource being accessed is in use.</p>
 *
 * @throws {@link ResourceLimitExceeded} (client fault)
 *  <p> You have exceeded an SageMaker resource limit. For example, you might have too many training jobs created. </p>
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class CreateOptimizationJobCommand extends CreateOptimizationJobCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateOptimizationJobRequest;
            output: CreateOptimizationJobResponse;
        };
        sdk: {
            input: CreateOptimizationJobCommandInput;
            output: CreateOptimizationJobCommandOutput;
        };
    };
}
