import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { StopNotebookInstanceInput } from "../models/models_5";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link StopNotebookInstanceCommand}.
 */
export interface StopNotebookInstanceCommandInput extends StopNotebookInstanceInput {
}
/**
 * @public
 *
 * The output of {@link StopNotebookInstanceCommand}.
 */
export interface StopNotebookInstanceCommandOutput extends __MetadataBearer {
}
declare const StopNotebookInstanceCommand_base: {
    new (input: StopNotebookInstanceCommandInput): import("@smithy/smithy-client").CommandImpl<StopNotebookInstanceCommandInput, StopNotebookInstanceCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: StopNotebookInstanceCommandInput): import("@smithy/smithy-client").CommandImpl<StopNotebookInstanceCommandInput, StopNotebookInstanceCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Terminates the ML compute instance. Before terminating the instance, SageMaker AI disconnects the ML storage volume from it. SageMaker AI preserves the ML storage volume. SageMaker AI stops charging you for the ML compute instance when you call <code>StopNotebookInstance</code>.</p> <p>To access data on the ML storage volume for a notebook instance that has been terminated, call the <code>StartNotebookInstance</code> API. <code>StartNotebookInstance</code> launches another ML compute instance, configures it, and attaches the preserved ML storage volume so you can continue your work. </p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, StopNotebookInstanceCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, StopNotebookInstanceCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // StopNotebookInstanceInput
 *   NotebookInstanceName: "STRING_VALUE", // required
 * };
 * const command = new StopNotebookInstanceCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param StopNotebookInstanceCommandInput - {@link StopNotebookInstanceCommandInput}
 * @returns {@link StopNotebookInstanceCommandOutput}
 * @see {@link StopNotebookInstanceCommandInput} for command's `input` shape.
 * @see {@link StopNotebookInstanceCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class StopNotebookInstanceCommand extends StopNotebookInstanceCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: StopNotebookInstanceInput;
            output: {};
        };
        sdk: {
            input: StopNotebookInstanceCommandInput;
            output: StopNotebookInstanceCommandOutput;
        };
    };
}
