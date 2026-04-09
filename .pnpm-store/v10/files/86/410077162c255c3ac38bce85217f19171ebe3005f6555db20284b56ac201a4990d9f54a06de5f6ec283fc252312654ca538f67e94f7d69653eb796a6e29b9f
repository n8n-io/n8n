import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { StartNotebookInstanceInput } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link StartNotebookInstanceCommand}.
 */
export interface StartNotebookInstanceCommandInput extends StartNotebookInstanceInput {
}
/**
 * @public
 *
 * The output of {@link StartNotebookInstanceCommand}.
 */
export interface StartNotebookInstanceCommandOutput extends __MetadataBearer {
}
declare const StartNotebookInstanceCommand_base: {
    new (input: StartNotebookInstanceCommandInput): import("@smithy/smithy-client").CommandImpl<StartNotebookInstanceCommandInput, StartNotebookInstanceCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: StartNotebookInstanceCommandInput): import("@smithy/smithy-client").CommandImpl<StartNotebookInstanceCommandInput, StartNotebookInstanceCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Launches an ML compute instance with the latest version of the libraries and attaches your ML storage volume. After configuring the notebook instance, SageMaker AI sets the notebook instance status to <code>InService</code>. A notebook instance's status must be <code>InService</code> before you can connect to your Jupyter notebook. </p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, StartNotebookInstanceCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, StartNotebookInstanceCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // StartNotebookInstanceInput
 *   NotebookInstanceName: "STRING_VALUE", // required
 * };
 * const command = new StartNotebookInstanceCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param StartNotebookInstanceCommandInput - {@link StartNotebookInstanceCommandInput}
 * @returns {@link StartNotebookInstanceCommandOutput}
 * @see {@link StartNotebookInstanceCommandInput} for command's `input` shape.
 * @see {@link StartNotebookInstanceCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceLimitExceeded} (client fault)
 *  <p> You have exceeded an SageMaker resource limit. For example, you might have too many training jobs created. </p>
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class StartNotebookInstanceCommand extends StartNotebookInstanceCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: StartNotebookInstanceInput;
            output: {};
        };
        sdk: {
            input: StartNotebookInstanceCommandInput;
            output: StartNotebookInstanceCommandOutput;
        };
    };
}
