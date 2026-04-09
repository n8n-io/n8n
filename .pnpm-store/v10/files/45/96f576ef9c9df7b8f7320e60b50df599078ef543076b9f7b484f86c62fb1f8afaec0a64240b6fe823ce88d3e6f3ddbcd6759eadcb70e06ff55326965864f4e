import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DeleteTrainingJobRequest } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteTrainingJobCommand}.
 */
export interface DeleteTrainingJobCommandInput extends DeleteTrainingJobRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteTrainingJobCommand}.
 */
export interface DeleteTrainingJobCommandOutput extends __MetadataBearer {
}
declare const DeleteTrainingJobCommand_base: {
    new (input: DeleteTrainingJobCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteTrainingJobCommandInput, DeleteTrainingJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteTrainingJobCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteTrainingJobCommandInput, DeleteTrainingJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes a training job. After SageMaker deletes a training job, all of the metadata for the training job is lost. You can delete only training jobs that are in a terminal state (<code>Stopped</code>, <code>Failed</code>, or <code>Completed</code>) and don't retain an <code>Available</code> <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/train-warm-pools.html">managed warm pool</a>. You cannot delete a job that is in the <code>InProgress</code> or <code>Stopping</code> state. After deleting the job, you can reuse its name to create another training job.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteTrainingJobCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteTrainingJobCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DeleteTrainingJobRequest
 *   TrainingJobName: "STRING_VALUE", // required
 * };
 * const command = new DeleteTrainingJobCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteTrainingJobCommandInput - {@link DeleteTrainingJobCommandInput}
 * @returns {@link DeleteTrainingJobCommandOutput}
 * @see {@link DeleteTrainingJobCommandInput} for command's `input` shape.
 * @see {@link DeleteTrainingJobCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceInUse} (client fault)
 *  <p>Resource being accessed is in use.</p>
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
export declare class DeleteTrainingJobCommand extends DeleteTrainingJobCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteTrainingJobRequest;
            output: {};
        };
        sdk: {
            input: DeleteTrainingJobCommandInput;
            output: DeleteTrainingJobCommandOutput;
        };
    };
}
