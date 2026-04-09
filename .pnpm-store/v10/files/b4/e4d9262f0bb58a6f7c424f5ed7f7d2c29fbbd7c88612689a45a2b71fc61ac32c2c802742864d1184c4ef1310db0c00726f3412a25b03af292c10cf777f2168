import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { RetryPipelineExecutionRequest, RetryPipelineExecutionResponse } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link RetryPipelineExecutionCommand}.
 */
export interface RetryPipelineExecutionCommandInput extends RetryPipelineExecutionRequest {
}
/**
 * @public
 *
 * The output of {@link RetryPipelineExecutionCommand}.
 */
export interface RetryPipelineExecutionCommandOutput extends RetryPipelineExecutionResponse, __MetadataBearer {
}
declare const RetryPipelineExecutionCommand_base: {
    new (input: RetryPipelineExecutionCommandInput): import("@smithy/smithy-client").CommandImpl<RetryPipelineExecutionCommandInput, RetryPipelineExecutionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: RetryPipelineExecutionCommandInput): import("@smithy/smithy-client").CommandImpl<RetryPipelineExecutionCommandInput, RetryPipelineExecutionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Retry the execution of the pipeline.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, RetryPipelineExecutionCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, RetryPipelineExecutionCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // RetryPipelineExecutionRequest
 *   PipelineExecutionArn: "STRING_VALUE", // required
 *   ClientRequestToken: "STRING_VALUE", // required
 *   ParallelismConfiguration: { // ParallelismConfiguration
 *     MaxParallelExecutionSteps: Number("int"), // required
 *   },
 * };
 * const command = new RetryPipelineExecutionCommand(input);
 * const response = await client.send(command);
 * // { // RetryPipelineExecutionResponse
 * //   PipelineExecutionArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param RetryPipelineExecutionCommandInput - {@link RetryPipelineExecutionCommandInput}
 * @returns {@link RetryPipelineExecutionCommandOutput}
 * @see {@link RetryPipelineExecutionCommandInput} for command's `input` shape.
 * @see {@link RetryPipelineExecutionCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ConflictException} (client fault)
 *  <p>There was a conflict when you attempted to modify a SageMaker entity such as an <code>Experiment</code> or <code>Artifact</code>.</p>
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
export declare class RetryPipelineExecutionCommand extends RetryPipelineExecutionCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: RetryPipelineExecutionRequest;
            output: RetryPipelineExecutionResponse;
        };
        sdk: {
            input: RetryPipelineExecutionCommandInput;
            output: RetryPipelineExecutionCommandOutput;
        };
    };
}
