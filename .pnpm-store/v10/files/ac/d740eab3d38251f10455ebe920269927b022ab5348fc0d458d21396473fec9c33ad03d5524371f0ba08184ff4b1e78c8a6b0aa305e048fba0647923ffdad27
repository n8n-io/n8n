import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { ListNotebookInstanceLifecycleConfigsInput, ListNotebookInstanceLifecycleConfigsOutput } from "../models/models_3";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListNotebookInstanceLifecycleConfigsCommand}.
 */
export interface ListNotebookInstanceLifecycleConfigsCommandInput extends ListNotebookInstanceLifecycleConfigsInput {
}
/**
 * @public
 *
 * The output of {@link ListNotebookInstanceLifecycleConfigsCommand}.
 */
export interface ListNotebookInstanceLifecycleConfigsCommandOutput extends ListNotebookInstanceLifecycleConfigsOutput, __MetadataBearer {
}
declare const ListNotebookInstanceLifecycleConfigsCommand_base: {
    new (input: ListNotebookInstanceLifecycleConfigsCommandInput): import("@smithy/smithy-client").CommandImpl<ListNotebookInstanceLifecycleConfigsCommandInput, ListNotebookInstanceLifecycleConfigsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListNotebookInstanceLifecycleConfigsCommandInput]): import("@smithy/smithy-client").CommandImpl<ListNotebookInstanceLifecycleConfigsCommandInput, ListNotebookInstanceLifecycleConfigsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists notebook instance lifestyle configurations created with the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateNotebookInstanceLifecycleConfig.html">CreateNotebookInstanceLifecycleConfig</a> API.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListNotebookInstanceLifecycleConfigsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListNotebookInstanceLifecycleConfigsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // ListNotebookInstanceLifecycleConfigsInput
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 *   SortBy: "Name" || "CreationTime" || "LastModifiedTime",
 *   SortOrder: "Ascending" || "Descending",
 *   NameContains: "STRING_VALUE",
 *   CreationTimeBefore: new Date("TIMESTAMP"),
 *   CreationTimeAfter: new Date("TIMESTAMP"),
 *   LastModifiedTimeBefore: new Date("TIMESTAMP"),
 *   LastModifiedTimeAfter: new Date("TIMESTAMP"),
 * };
 * const command = new ListNotebookInstanceLifecycleConfigsCommand(input);
 * const response = await client.send(command);
 * // { // ListNotebookInstanceLifecycleConfigsOutput
 * //   NextToken: "STRING_VALUE",
 * //   NotebookInstanceLifecycleConfigs: [ // NotebookInstanceLifecycleConfigSummaryList
 * //     { // NotebookInstanceLifecycleConfigSummary
 * //       NotebookInstanceLifecycleConfigName: "STRING_VALUE", // required
 * //       NotebookInstanceLifecycleConfigArn: "STRING_VALUE", // required
 * //       CreationTime: new Date("TIMESTAMP"),
 * //       LastModifiedTime: new Date("TIMESTAMP"),
 * //     },
 * //   ],
 * // };
 *
 * ```
 *
 * @param ListNotebookInstanceLifecycleConfigsCommandInput - {@link ListNotebookInstanceLifecycleConfigsCommandInput}
 * @returns {@link ListNotebookInstanceLifecycleConfigsCommandOutput}
 * @see {@link ListNotebookInstanceLifecycleConfigsCommandInput} for command's `input` shape.
 * @see {@link ListNotebookInstanceLifecycleConfigsCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListNotebookInstanceLifecycleConfigsCommand extends ListNotebookInstanceLifecycleConfigsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListNotebookInstanceLifecycleConfigsInput;
            output: ListNotebookInstanceLifecycleConfigsOutput;
        };
        sdk: {
            input: ListNotebookInstanceLifecycleConfigsCommandInput;
            output: ListNotebookInstanceLifecycleConfigsCommandOutput;
        };
    };
}
