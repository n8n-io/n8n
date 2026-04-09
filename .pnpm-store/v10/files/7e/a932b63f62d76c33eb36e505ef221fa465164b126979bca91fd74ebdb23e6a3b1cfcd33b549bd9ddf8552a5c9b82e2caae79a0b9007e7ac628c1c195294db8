import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { SendPipelineExecutionStepFailureRequest, SendPipelineExecutionStepFailureResponse } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link SendPipelineExecutionStepFailureCommand}.
 */
export interface SendPipelineExecutionStepFailureCommandInput extends SendPipelineExecutionStepFailureRequest {
}
/**
 * @public
 *
 * The output of {@link SendPipelineExecutionStepFailureCommand}.
 */
export interface SendPipelineExecutionStepFailureCommandOutput extends SendPipelineExecutionStepFailureResponse, __MetadataBearer {
}
declare const SendPipelineExecutionStepFailureCommand_base: {
    new (input: SendPipelineExecutionStepFailureCommandInput): import("@smithy/smithy-client").CommandImpl<SendPipelineExecutionStepFailureCommandInput, SendPipelineExecutionStepFailureCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: SendPipelineExecutionStepFailureCommandInput): import("@smithy/smithy-client").CommandImpl<SendPipelineExecutionStepFailureCommandInput, SendPipelineExecutionStepFailureCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Notifies the pipeline that the execution of a callback step failed, along with a message describing why. When a callback step is run, the pipeline generates a callback token and includes the token in a message sent to Amazon Simple Queue Service (Amazon SQS).</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, SendPipelineExecutionStepFailureCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, SendPipelineExecutionStepFailureCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // SendPipelineExecutionStepFailureRequest
 *   CallbackToken: "STRING_VALUE", // required
 *   FailureReason: "STRING_VALUE",
 *   ClientRequestToken: "STRING_VALUE",
 * };
 * const command = new SendPipelineExecutionStepFailureCommand(input);
 * const response = await client.send(command);
 * // { // SendPipelineExecutionStepFailureResponse
 * //   PipelineExecutionArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param SendPipelineExecutionStepFailureCommandInput - {@link SendPipelineExecutionStepFailureCommandInput}
 * @returns {@link SendPipelineExecutionStepFailureCommandOutput}
 * @see {@link SendPipelineExecutionStepFailureCommandInput} for command's `input` shape.
 * @see {@link SendPipelineExecutionStepFailureCommandOutput} for command's `response` shape.
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
export declare class SendPipelineExecutionStepFailureCommand extends SendPipelineExecutionStepFailureCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: SendPipelineExecutionStepFailureRequest;
            output: SendPipelineExecutionStepFailureResponse;
        };
        sdk: {
            input: SendPipelineExecutionStepFailureCommandInput;
            output: SendPipelineExecutionStepFailureCommandOutput;
        };
    };
}
