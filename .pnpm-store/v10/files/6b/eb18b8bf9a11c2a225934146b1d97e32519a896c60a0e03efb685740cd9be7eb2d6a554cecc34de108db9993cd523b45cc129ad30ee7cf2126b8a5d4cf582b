import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { UpdateNotebookInstanceLifecycleConfigInput, UpdateNotebookInstanceLifecycleConfigOutput } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateNotebookInstanceLifecycleConfigCommand}.
 */
export interface UpdateNotebookInstanceLifecycleConfigCommandInput extends UpdateNotebookInstanceLifecycleConfigInput {
}
/**
 * @public
 *
 * The output of {@link UpdateNotebookInstanceLifecycleConfigCommand}.
 */
export interface UpdateNotebookInstanceLifecycleConfigCommandOutput extends UpdateNotebookInstanceLifecycleConfigOutput, __MetadataBearer {
}
declare const UpdateNotebookInstanceLifecycleConfigCommand_base: {
    new (input: UpdateNotebookInstanceLifecycleConfigCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateNotebookInstanceLifecycleConfigCommandInput, UpdateNotebookInstanceLifecycleConfigCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateNotebookInstanceLifecycleConfigCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateNotebookInstanceLifecycleConfigCommandInput, UpdateNotebookInstanceLifecycleConfigCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Updates a notebook instance lifecycle configuration created with the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateNotebookInstanceLifecycleConfig.html">CreateNotebookInstanceLifecycleConfig</a> API.</p> <note> <p>Updates to lifecycle configurations affect all notebook instances using that configuration upon their next start. Lifecycle configuration scripts execute with root access and the notebook instance's IAM execution role privileges. Grant this permission only to trusted principals. See <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/notebook-lifecycle-config.html">Customize a Notebook Instance Using a Lifecycle Configuration Script</a> for security best practices.</p> </note>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, UpdateNotebookInstanceLifecycleConfigCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, UpdateNotebookInstanceLifecycleConfigCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // UpdateNotebookInstanceLifecycleConfigInput
 *   NotebookInstanceLifecycleConfigName: "STRING_VALUE", // required
 *   OnCreate: [ // NotebookInstanceLifecycleConfigList
 *     { // NotebookInstanceLifecycleHook
 *       Content: "STRING_VALUE",
 *     },
 *   ],
 *   OnStart: [
 *     {
 *       Content: "STRING_VALUE",
 *     },
 *   ],
 * };
 * const command = new UpdateNotebookInstanceLifecycleConfigCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param UpdateNotebookInstanceLifecycleConfigCommandInput - {@link UpdateNotebookInstanceLifecycleConfigCommandInput}
 * @returns {@link UpdateNotebookInstanceLifecycleConfigCommandOutput}
 * @see {@link UpdateNotebookInstanceLifecycleConfigCommandInput} for command's `input` shape.
 * @see {@link UpdateNotebookInstanceLifecycleConfigCommandOutput} for command's `response` shape.
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
export declare class UpdateNotebookInstanceLifecycleConfigCommand extends UpdateNotebookInstanceLifecycleConfigCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateNotebookInstanceLifecycleConfigInput;
            output: {};
        };
        sdk: {
            input: UpdateNotebookInstanceLifecycleConfigCommandInput;
            output: UpdateNotebookInstanceLifecycleConfigCommandOutput;
        };
    };
}
