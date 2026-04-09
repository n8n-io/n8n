import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DeleteInferenceComponentInput } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteInferenceComponentCommand}.
 */
export interface DeleteInferenceComponentCommandInput extends DeleteInferenceComponentInput {
}
/**
 * @public
 *
 * The output of {@link DeleteInferenceComponentCommand}.
 */
export interface DeleteInferenceComponentCommandOutput extends __MetadataBearer {
}
declare const DeleteInferenceComponentCommand_base: {
    new (input: DeleteInferenceComponentCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteInferenceComponentCommandInput, DeleteInferenceComponentCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteInferenceComponentCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteInferenceComponentCommandInput, DeleteInferenceComponentCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes an inference component.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteInferenceComponentCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteInferenceComponentCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DeleteInferenceComponentInput
 *   InferenceComponentName: "STRING_VALUE", // required
 * };
 * const command = new DeleteInferenceComponentCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteInferenceComponentCommandInput - {@link DeleteInferenceComponentCommandInput}
 * @returns {@link DeleteInferenceComponentCommandOutput}
 * @see {@link DeleteInferenceComponentCommandInput} for command's `input` shape.
 * @see {@link DeleteInferenceComponentCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class DeleteInferenceComponentCommand extends DeleteInferenceComponentCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteInferenceComponentInput;
            output: {};
        };
        sdk: {
            input: DeleteInferenceComponentCommandInput;
            output: DeleteInferenceComponentCommandOutput;
        };
    };
}
