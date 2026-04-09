import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { StopTrainingJobRequest } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link StopTrainingJobCommand}.
 */
export interface StopTrainingJobCommandInput extends StopTrainingJobRequest {
}
/**
 * @public
 *
 * The output of {@link StopTrainingJobCommand}.
 */
export interface StopTrainingJobCommandOutput extends __MetadataBearer {
}
declare const StopTrainingJobCommand_base: {
    new (input: StopTrainingJobCommandInput): import("@smithy/smithy-client").CommandImpl<StopTrainingJobCommandInput, StopTrainingJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: StopTrainingJobCommandInput): import("@smithy/smithy-client").CommandImpl<StopTrainingJobCommandInput, StopTrainingJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Stops a training job. To stop a job, SageMaker sends the algorithm the <code>SIGTERM</code> signal, which delays job termination for 120 seconds. Algorithms might use this 120-second window to save the model artifacts, so the results of the training is not lost. </p> <p>When it receives a <code>StopTrainingJob</code> request, SageMaker changes the status of the job to <code>Stopping</code>. After SageMaker stops the job, it sets the status to <code>Stopped</code>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, StopTrainingJobCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, StopTrainingJobCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // StopTrainingJobRequest
 *   TrainingJobName: "STRING_VALUE", // required
 * };
 * const command = new StopTrainingJobCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param StopTrainingJobCommandInput - {@link StopTrainingJobCommandInput}
 * @returns {@link StopTrainingJobCommandOutput}
 * @see {@link StopTrainingJobCommandInput} for command's `input` shape.
 * @see {@link StopTrainingJobCommandOutput} for command's `response` shape.
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
export declare class StopTrainingJobCommand extends StopTrainingJobCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: StopTrainingJobRequest;
            output: {};
        };
        sdk: {
            input: StopTrainingJobCommandInput;
            output: StopTrainingJobCommandOutput;
        };
    };
}
