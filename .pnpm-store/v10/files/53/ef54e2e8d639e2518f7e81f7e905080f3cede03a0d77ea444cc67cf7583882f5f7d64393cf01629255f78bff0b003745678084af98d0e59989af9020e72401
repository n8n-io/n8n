import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { StartInferenceExperimentRequest, StartInferenceExperimentResponse } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link StartInferenceExperimentCommand}.
 */
export interface StartInferenceExperimentCommandInput extends StartInferenceExperimentRequest {
}
/**
 * @public
 *
 * The output of {@link StartInferenceExperimentCommand}.
 */
export interface StartInferenceExperimentCommandOutput extends StartInferenceExperimentResponse, __MetadataBearer {
}
declare const StartInferenceExperimentCommand_base: {
    new (input: StartInferenceExperimentCommandInput): import("@smithy/smithy-client").CommandImpl<StartInferenceExperimentCommandInput, StartInferenceExperimentCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: StartInferenceExperimentCommandInput): import("@smithy/smithy-client").CommandImpl<StartInferenceExperimentCommandInput, StartInferenceExperimentCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Starts an inference experiment.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, StartInferenceExperimentCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, StartInferenceExperimentCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // StartInferenceExperimentRequest
 *   Name: "STRING_VALUE", // required
 * };
 * const command = new StartInferenceExperimentCommand(input);
 * const response = await client.send(command);
 * // { // StartInferenceExperimentResponse
 * //   InferenceExperimentArn: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param StartInferenceExperimentCommandInput - {@link StartInferenceExperimentCommandInput}
 * @returns {@link StartInferenceExperimentCommandOutput}
 * @see {@link StartInferenceExperimentCommandInput} for command's `input` shape.
 * @see {@link StartInferenceExperimentCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ConflictException} (client fault)
 *  <p>There was a conflict when you attempted to modify a SageMaker entity such as an <code>Experiment</code> or <code>Artifact</code>.</p>
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
export declare class StartInferenceExperimentCommand extends StartInferenceExperimentCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: StartInferenceExperimentRequest;
            output: StartInferenceExperimentResponse;
        };
        sdk: {
            input: StartInferenceExperimentCommandInput;
            output: StartInferenceExperimentCommandOutput;
        };
    };
}
