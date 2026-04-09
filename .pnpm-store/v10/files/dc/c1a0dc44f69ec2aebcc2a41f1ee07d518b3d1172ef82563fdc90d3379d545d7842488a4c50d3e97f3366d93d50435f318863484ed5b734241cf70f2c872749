import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DeleteHyperParameterTuningJobRequest } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteHyperParameterTuningJobCommand}.
 */
export interface DeleteHyperParameterTuningJobCommandInput extends DeleteHyperParameterTuningJobRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteHyperParameterTuningJobCommand}.
 */
export interface DeleteHyperParameterTuningJobCommandOutput extends __MetadataBearer {
}
declare const DeleteHyperParameterTuningJobCommand_base: {
    new (input: DeleteHyperParameterTuningJobCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteHyperParameterTuningJobCommandInput, DeleteHyperParameterTuningJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteHyperParameterTuningJobCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteHyperParameterTuningJobCommandInput, DeleteHyperParameterTuningJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes a hyperparameter tuning job. The <code>DeleteHyperParameterTuningJob</code> API deletes only the tuning job entry that was created in SageMaker when you called the <code>CreateHyperParameterTuningJob</code> API. It does not delete training jobs, artifacts, or the IAM role that you specified when creating the model.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteHyperParameterTuningJobCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteHyperParameterTuningJobCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DeleteHyperParameterTuningJobRequest
 *   HyperParameterTuningJobName: "STRING_VALUE", // required
 * };
 * const command = new DeleteHyperParameterTuningJobCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteHyperParameterTuningJobCommandInput - {@link DeleteHyperParameterTuningJobCommandInput}
 * @returns {@link DeleteHyperParameterTuningJobCommandOutput}
 * @see {@link DeleteHyperParameterTuningJobCommandInput} for command's `input` shape.
 * @see {@link DeleteHyperParameterTuningJobCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class DeleteHyperParameterTuningJobCommand extends DeleteHyperParameterTuningJobCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteHyperParameterTuningJobRequest;
            output: {};
        };
        sdk: {
            input: DeleteHyperParameterTuningJobCommandInput;
            output: DeleteHyperParameterTuningJobCommandOutput;
        };
    };
}
