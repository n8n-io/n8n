import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { CreateNotebookInstanceLifecycleConfigInput, CreateNotebookInstanceLifecycleConfigOutput } from "../models/models_1";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateNotebookInstanceLifecycleConfigCommand}.
 */
export interface CreateNotebookInstanceLifecycleConfigCommandInput extends CreateNotebookInstanceLifecycleConfigInput {
}
/**
 * @public
 *
 * The output of {@link CreateNotebookInstanceLifecycleConfigCommand}.
 */
export interface CreateNotebookInstanceLifecycleConfigCommandOutput extends CreateNotebookInstanceLifecycleConfigOutput, __MetadataBearer {
}
declare const CreateNotebookInstanceLifecycleConfigCommand_base: {
    new (input: CreateNotebookInstanceLifecycleConfigCommandInput): import("@smithy/smithy-client").CommandImpl<CreateNotebookInstanceLifecycleConfigCommandInput, CreateNotebookInstanceLifecycleConfigCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateNotebookInstanceLifecycleConfigCommandInput): import("@smithy/smithy-client").CommandImpl<CreateNotebookInstanceLifecycleConfigCommandInput, CreateNotebookInstanceLifecycleConfigCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates a lifecycle configuration that you can associate with a notebook instance. A <i>lifecycle configuration</i> is a collection of shell scripts that run when you create or start a notebook instance.</p> <p>Each lifecycle configuration script has a limit of 16384 characters.</p> <p>The value of the <code>$PATH</code> environment variable that is available to both scripts is <code>/sbin:bin:/usr/sbin:/usr/bin</code>.</p> <p>View Amazon CloudWatch Logs for notebook instance lifecycle configurations in log group <code>/aws/sagemaker/NotebookInstances</code> in log stream <code>[notebook-instance-name]/[LifecycleConfigHook]</code>.</p> <p>Lifecycle configuration scripts cannot run for longer than 5 minutes. If a script runs for longer than 5 minutes, it fails and the notebook instance is not created or started.</p> <p>For information about notebook instance lifestyle configurations, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/notebook-lifecycle-config.html">Step 2.1: (Optional) Customize a Notebook Instance</a>.</p> <note> <p>Lifecycle configuration scripts execute with root access and the notebook instance's IAM execution role privileges. Grant this permission only to trusted principals. See <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/notebook-lifecycle-config.html">Customize a Notebook Instance Using a Lifecycle Configuration Script</a> for security best practices.</p> </note>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreateNotebookInstanceLifecycleConfigCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreateNotebookInstanceLifecycleConfigCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // CreateNotebookInstanceLifecycleConfigInput
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
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 * };
 * const command = new CreateNotebookInstanceLifecycleConfigCommand(input);
 * const response = await client.send(command);
 * // { // CreateNotebookInstanceLifecycleConfigOutput
 * //   NotebookInstanceLifecycleConfigArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param CreateNotebookInstanceLifecycleConfigCommandInput - {@link CreateNotebookInstanceLifecycleConfigCommandInput}
 * @returns {@link CreateNotebookInstanceLifecycleConfigCommandOutput}
 * @see {@link CreateNotebookInstanceLifecycleConfigCommandInput} for command's `input` shape.
 * @see {@link CreateNotebookInstanceLifecycleConfigCommandOutput} for command's `response` shape.
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
export declare class CreateNotebookInstanceLifecycleConfigCommand extends CreateNotebookInstanceLifecycleConfigCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateNotebookInstanceLifecycleConfigInput;
            output: CreateNotebookInstanceLifecycleConfigOutput;
        };
        sdk: {
            input: CreateNotebookInstanceLifecycleConfigCommandInput;
            output: CreateNotebookInstanceLifecycleConfigCommandOutput;
        };
    };
}
