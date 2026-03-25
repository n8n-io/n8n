import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListModelsInput, ListModelsOutput } from "../models/models_4";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListModelsCommand}.
 */
export interface ListModelsCommandInput extends ListModelsInput {
}
/**
 * @public
 *
 * The output of {@link ListModelsCommand}.
 */
export interface ListModelsCommandOutput extends ListModelsOutput, __MetadataBearer {
}
declare const ListModelsCommand_base: {
    new (input: ListModelsCommandInput): import("@smithy/smithy-client").CommandImpl<ListModelsCommandInput, ListModelsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListModelsCommandInput]): import("@smithy/smithy-client").CommandImpl<ListModelsCommandInput, ListModelsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists models created with the <code>CreateModel</code> API.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListModelsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListModelsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // ListModelsInput
 *   SortBy: "Name" || "CreationTime",
 *   SortOrder: "Ascending" || "Descending",
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 *   NameContains: "STRING_VALUE",
 *   CreationTimeBefore: new Date("TIMESTAMP"),
 *   CreationTimeAfter: new Date("TIMESTAMP"),
 * };
 * const command = new ListModelsCommand(input);
 * const response = await client.send(command);
 * // { // ListModelsOutput
 * //   Models: [ // ModelSummaryList // required
 * //     { // ModelSummary
 * //       ModelName: "STRING_VALUE", // required
 * //       ModelArn: "STRING_VALUE", // required
 * //       CreationTime: new Date("TIMESTAMP"), // required
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListModelsCommandInput - {@link ListModelsCommandInput}
 * @returns {@link ListModelsCommandOutput}
 * @see {@link ListModelsCommandInput} for command's `input` shape.
 * @see {@link ListModelsCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListModelsCommand extends ListModelsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListModelsInput;
            output: ListModelsOutput;
        };
        sdk: {
            input: ListModelsCommandInput;
            output: ListModelsCommandOutput;
        };
    };
}
