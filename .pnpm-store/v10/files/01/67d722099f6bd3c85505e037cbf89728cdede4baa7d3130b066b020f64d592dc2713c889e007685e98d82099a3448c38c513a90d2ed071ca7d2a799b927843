import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteNotebookInstanceLifecycleConfigInput } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteNotebookInstanceLifecycleConfigCommand}.
 */
export interface DeleteNotebookInstanceLifecycleConfigCommandInput extends DeleteNotebookInstanceLifecycleConfigInput {
}
/**
 * @public
 *
 * The output of {@link DeleteNotebookInstanceLifecycleConfigCommand}.
 */
export interface DeleteNotebookInstanceLifecycleConfigCommandOutput extends __MetadataBearer {
}
declare const DeleteNotebookInstanceLifecycleConfigCommand_base: {
    new (input: DeleteNotebookInstanceLifecycleConfigCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteNotebookInstanceLifecycleConfigCommandInput, DeleteNotebookInstanceLifecycleConfigCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteNotebookInstanceLifecycleConfigCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteNotebookInstanceLifecycleConfigCommandInput, DeleteNotebookInstanceLifecycleConfigCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes a notebook instance lifecycle configuration.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteNotebookInstanceLifecycleConfigCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteNotebookInstanceLifecycleConfigCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DeleteNotebookInstanceLifecycleConfigInput
 *   NotebookInstanceLifecycleConfigName: "STRING_VALUE", // required
 * };
 * const command = new DeleteNotebookInstanceLifecycleConfigCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteNotebookInstanceLifecycleConfigCommandInput - {@link DeleteNotebookInstanceLifecycleConfigCommandInput}
 * @returns {@link DeleteNotebookInstanceLifecycleConfigCommandOutput}
 * @see {@link DeleteNotebookInstanceLifecycleConfigCommandInput} for command's `input` shape.
 * @see {@link DeleteNotebookInstanceLifecycleConfigCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class DeleteNotebookInstanceLifecycleConfigCommand extends DeleteNotebookInstanceLifecycleConfigCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteNotebookInstanceLifecycleConfigInput;
            output: {};
        };
        sdk: {
            input: DeleteNotebookInstanceLifecycleConfigCommandInput;
            output: DeleteNotebookInstanceLifecycleConfigCommandOutput;
        };
    };
}
