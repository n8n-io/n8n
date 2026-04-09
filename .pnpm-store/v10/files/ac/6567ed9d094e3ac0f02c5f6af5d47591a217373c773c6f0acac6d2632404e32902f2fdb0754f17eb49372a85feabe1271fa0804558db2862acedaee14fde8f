import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DeleteInferenceExperimentRequest, DeleteInferenceExperimentResponse } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteInferenceExperimentCommand}.
 */
export interface DeleteInferenceExperimentCommandInput extends DeleteInferenceExperimentRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteInferenceExperimentCommand}.
 */
export interface DeleteInferenceExperimentCommandOutput extends DeleteInferenceExperimentResponse, __MetadataBearer {
}
declare const DeleteInferenceExperimentCommand_base: {
    new (input: DeleteInferenceExperimentCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteInferenceExperimentCommandInput, DeleteInferenceExperimentCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteInferenceExperimentCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteInferenceExperimentCommandInput, DeleteInferenceExperimentCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes an inference experiment.</p> <note> <p> This operation does not delete your endpoint, variants, or any underlying resources. This operation only deletes the metadata of your experiment. </p> </note>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteInferenceExperimentCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteInferenceExperimentCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DeleteInferenceExperimentRequest
 *   Name: "STRING_VALUE", // required
 * };
 * const command = new DeleteInferenceExperimentCommand(input);
 * const response = await client.send(command);
 * // { // DeleteInferenceExperimentResponse
 * //   InferenceExperimentArn: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param DeleteInferenceExperimentCommandInput - {@link DeleteInferenceExperimentCommandInput}
 * @returns {@link DeleteInferenceExperimentCommandOutput}
 * @see {@link DeleteInferenceExperimentCommandInput} for command's `input` shape.
 * @see {@link DeleteInferenceExperimentCommandOutput} for command's `response` shape.
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
export declare class DeleteInferenceExperimentCommand extends DeleteInferenceExperimentCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteInferenceExperimentRequest;
            output: DeleteInferenceExperimentResponse;
        };
        sdk: {
            input: DeleteInferenceExperimentCommandInput;
            output: DeleteInferenceExperimentCommandOutput;
        };
    };
}
