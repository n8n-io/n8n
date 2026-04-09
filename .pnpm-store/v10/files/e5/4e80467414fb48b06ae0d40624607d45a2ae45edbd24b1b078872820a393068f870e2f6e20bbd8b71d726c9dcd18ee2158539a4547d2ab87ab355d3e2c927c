import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DescribeNotebookInstanceLifecycleConfigInput, DescribeNotebookInstanceLifecycleConfigOutput } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeNotebookInstanceLifecycleConfigCommand}.
 */
export interface DescribeNotebookInstanceLifecycleConfigCommandInput extends DescribeNotebookInstanceLifecycleConfigInput {
}
/**
 * @public
 *
 * The output of {@link DescribeNotebookInstanceLifecycleConfigCommand}.
 */
export interface DescribeNotebookInstanceLifecycleConfigCommandOutput extends DescribeNotebookInstanceLifecycleConfigOutput, __MetadataBearer {
}
declare const DescribeNotebookInstanceLifecycleConfigCommand_base: {
    new (input: DescribeNotebookInstanceLifecycleConfigCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeNotebookInstanceLifecycleConfigCommandInput, DescribeNotebookInstanceLifecycleConfigCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeNotebookInstanceLifecycleConfigCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeNotebookInstanceLifecycleConfigCommandInput, DescribeNotebookInstanceLifecycleConfigCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Returns a description of a notebook instance lifecycle configuration.</p> <p>For information about notebook instance lifestyle configurations, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/notebook-lifecycle-config.html">Step 2.1: (Optional) Customize a Notebook Instance</a>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeNotebookInstanceLifecycleConfigCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeNotebookInstanceLifecycleConfigCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DescribeNotebookInstanceLifecycleConfigInput
 *   NotebookInstanceLifecycleConfigName: "STRING_VALUE", // required
 * };
 * const command = new DescribeNotebookInstanceLifecycleConfigCommand(input);
 * const response = await client.send(command);
 * // { // DescribeNotebookInstanceLifecycleConfigOutput
 * //   NotebookInstanceLifecycleConfigArn: "STRING_VALUE",
 * //   NotebookInstanceLifecycleConfigName: "STRING_VALUE",
 * //   OnCreate: [ // NotebookInstanceLifecycleConfigList
 * //     { // NotebookInstanceLifecycleHook
 * //       Content: "STRING_VALUE",
 * //     },
 * //   ],
 * //   OnStart: [
 * //     {
 * //       Content: "STRING_VALUE",
 * //     },
 * //   ],
 * //   LastModifiedTime: new Date("TIMESTAMP"),
 * //   CreationTime: new Date("TIMESTAMP"),
 * // };
 *
 * ```
 *
 * @param DescribeNotebookInstanceLifecycleConfigCommandInput - {@link DescribeNotebookInstanceLifecycleConfigCommandInput}
 * @returns {@link DescribeNotebookInstanceLifecycleConfigCommandOutput}
 * @see {@link DescribeNotebookInstanceLifecycleConfigCommandInput} for command's `input` shape.
 * @see {@link DescribeNotebookInstanceLifecycleConfigCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class DescribeNotebookInstanceLifecycleConfigCommand extends DescribeNotebookInstanceLifecycleConfigCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeNotebookInstanceLifecycleConfigInput;
            output: DescribeNotebookInstanceLifecycleConfigOutput;
        };
        sdk: {
            input: DescribeNotebookInstanceLifecycleConfigCommandInput;
            output: DescribeNotebookInstanceLifecycleConfigCommandOutput;
        };
    };
}
