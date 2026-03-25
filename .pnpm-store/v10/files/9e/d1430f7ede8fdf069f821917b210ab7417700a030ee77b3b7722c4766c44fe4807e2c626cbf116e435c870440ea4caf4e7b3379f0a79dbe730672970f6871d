import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteTrialComponentRequest, DeleteTrialComponentResponse } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteTrialComponentCommand}.
 */
export interface DeleteTrialComponentCommandInput extends DeleteTrialComponentRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteTrialComponentCommand}.
 */
export interface DeleteTrialComponentCommandOutput extends DeleteTrialComponentResponse, __MetadataBearer {
}
declare const DeleteTrialComponentCommand_base: {
    new (input: DeleteTrialComponentCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteTrialComponentCommandInput, DeleteTrialComponentCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteTrialComponentCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteTrialComponentCommandInput, DeleteTrialComponentCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes the specified trial component. A trial component must be disassociated from all trials before the trial component can be deleted. To disassociate a trial component from a trial, call the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_DisassociateTrialComponent.html">DisassociateTrialComponent</a> API.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteTrialComponentCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteTrialComponentCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DeleteTrialComponentRequest
 *   TrialComponentName: "STRING_VALUE", // required
 * };
 * const command = new DeleteTrialComponentCommand(input);
 * const response = await client.send(command);
 * // { // DeleteTrialComponentResponse
 * //   TrialComponentArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param DeleteTrialComponentCommandInput - {@link DeleteTrialComponentCommandInput}
 * @returns {@link DeleteTrialComponentCommandOutput}
 * @see {@link DeleteTrialComponentCommandInput} for command's `input` shape.
 * @see {@link DeleteTrialComponentCommandOutput} for command's `response` shape.
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
export declare class DeleteTrialComponentCommand extends DeleteTrialComponentCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteTrialComponentRequest;
            output: DeleteTrialComponentResponse;
        };
        sdk: {
            input: DeleteTrialComponentCommandInput;
            output: DeleteTrialComponentCommandOutput;
        };
    };
}
