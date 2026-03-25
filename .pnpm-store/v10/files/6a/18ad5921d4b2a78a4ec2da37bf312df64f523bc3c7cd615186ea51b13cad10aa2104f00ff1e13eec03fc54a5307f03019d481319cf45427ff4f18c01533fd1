import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { StopInferenceRecommendationsJobRequest } from "../models/models_5";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link StopInferenceRecommendationsJobCommand}.
 */
export interface StopInferenceRecommendationsJobCommandInput extends StopInferenceRecommendationsJobRequest {
}
/**
 * @public
 *
 * The output of {@link StopInferenceRecommendationsJobCommand}.
 */
export interface StopInferenceRecommendationsJobCommandOutput extends __MetadataBearer {
}
declare const StopInferenceRecommendationsJobCommand_base: {
    new (input: StopInferenceRecommendationsJobCommandInput): import("@smithy/smithy-client").CommandImpl<StopInferenceRecommendationsJobCommandInput, StopInferenceRecommendationsJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: StopInferenceRecommendationsJobCommandInput): import("@smithy/smithy-client").CommandImpl<StopInferenceRecommendationsJobCommandInput, StopInferenceRecommendationsJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Stops an Inference Recommender job.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, StopInferenceRecommendationsJobCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, StopInferenceRecommendationsJobCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // StopInferenceRecommendationsJobRequest
 *   JobName: "STRING_VALUE", // required
 * };
 * const command = new StopInferenceRecommendationsJobCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param StopInferenceRecommendationsJobCommandInput - {@link StopInferenceRecommendationsJobCommandInput}
 * @returns {@link StopInferenceRecommendationsJobCommandOutput}
 * @see {@link StopInferenceRecommendationsJobCommandInput} for command's `input` shape.
 * @see {@link StopInferenceRecommendationsJobCommandOutput} for command's `response` shape.
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
export declare class StopInferenceRecommendationsJobCommand extends StopInferenceRecommendationsJobCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: StopInferenceRecommendationsJobRequest;
            output: {};
        };
        sdk: {
            input: StopInferenceRecommendationsJobCommandInput;
            output: StopInferenceRecommendationsJobCommandOutput;
        };
    };
}
