import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteNotebookInstanceInput } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteNotebookInstanceCommand}.
 */
export interface DeleteNotebookInstanceCommandInput extends DeleteNotebookInstanceInput {
}
/**
 * @public
 *
 * The output of {@link DeleteNotebookInstanceCommand}.
 */
export interface DeleteNotebookInstanceCommandOutput extends __MetadataBearer {
}
declare const DeleteNotebookInstanceCommand_base: {
    new (input: DeleteNotebookInstanceCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteNotebookInstanceCommandInput, DeleteNotebookInstanceCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteNotebookInstanceCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteNotebookInstanceCommandInput, DeleteNotebookInstanceCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p> Deletes an SageMaker AI notebook instance. Before you can delete a notebook instance, you must call the <code>StopNotebookInstance</code> API. </p> <important> <p>When you delete a notebook instance, you lose all of your data. SageMaker AI removes the ML compute instance, and deletes the ML storage volume and the network interface associated with the notebook instance. </p> </important>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteNotebookInstanceCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteNotebookInstanceCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DeleteNotebookInstanceInput
 *   NotebookInstanceName: "STRING_VALUE", // required
 * };
 * const command = new DeleteNotebookInstanceCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteNotebookInstanceCommandInput - {@link DeleteNotebookInstanceCommandInput}
 * @returns {@link DeleteNotebookInstanceCommandOutput}
 * @see {@link DeleteNotebookInstanceCommandInput} for command's `input` shape.
 * @see {@link DeleteNotebookInstanceCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class DeleteNotebookInstanceCommand extends DeleteNotebookInstanceCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteNotebookInstanceInput;
            output: {};
        };
        sdk: {
            input: DeleteNotebookInstanceCommandInput;
            output: DeleteNotebookInstanceCommandOutput;
        };
    };
}
