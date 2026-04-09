import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { StopHyperParameterTuningJobRequest } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link StopHyperParameterTuningJobCommand}.
 */
export interface StopHyperParameterTuningJobCommandInput extends StopHyperParameterTuningJobRequest {
}
/**
 * @public
 *
 * The output of {@link StopHyperParameterTuningJobCommand}.
 */
export interface StopHyperParameterTuningJobCommandOutput extends __MetadataBearer {
}
declare const StopHyperParameterTuningJobCommand_base: {
    new (input: StopHyperParameterTuningJobCommandInput): import("@smithy/smithy-client").CommandImpl<StopHyperParameterTuningJobCommandInput, StopHyperParameterTuningJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: StopHyperParameterTuningJobCommandInput): import("@smithy/smithy-client").CommandImpl<StopHyperParameterTuningJobCommandInput, StopHyperParameterTuningJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Stops a running hyperparameter tuning job and all running training jobs that the tuning job launched.</p> <p>All model artifacts output from the training jobs are stored in Amazon Simple Storage Service (Amazon S3). All data that the training jobs write to Amazon CloudWatch Logs are still available in CloudWatch. After the tuning job moves to the <code>Stopped</code> state, it releases all reserved resources for the tuning job.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, StopHyperParameterTuningJobCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, StopHyperParameterTuningJobCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // StopHyperParameterTuningJobRequest
 *   HyperParameterTuningJobName: "STRING_VALUE", // required
 * };
 * const command = new StopHyperParameterTuningJobCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param StopHyperParameterTuningJobCommandInput - {@link StopHyperParameterTuningJobCommandInput}
 * @returns {@link StopHyperParameterTuningJobCommandOutput}
 * @see {@link StopHyperParameterTuningJobCommandInput} for command's `input` shape.
 * @see {@link StopHyperParameterTuningJobCommandOutput} for command's `response` shape.
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
export declare class StopHyperParameterTuningJobCommand extends StopHyperParameterTuningJobCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: StopHyperParameterTuningJobRequest;
            output: {};
        };
        sdk: {
            input: StopHyperParameterTuningJobCommandInput;
            output: StopHyperParameterTuningJobCommandOutput;
        };
    };
}
