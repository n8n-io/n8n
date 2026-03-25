import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListAlgorithmsInput, ListAlgorithmsOutput } from "../models/models_3";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListAlgorithmsCommand}.
 */
export interface ListAlgorithmsCommandInput extends ListAlgorithmsInput {
}
/**
 * @public
 *
 * The output of {@link ListAlgorithmsCommand}.
 */
export interface ListAlgorithmsCommandOutput extends ListAlgorithmsOutput, __MetadataBearer {
}
declare const ListAlgorithmsCommand_base: {
    new (input: ListAlgorithmsCommandInput): import("@smithy/smithy-client").CommandImpl<ListAlgorithmsCommandInput, ListAlgorithmsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListAlgorithmsCommandInput]): import("@smithy/smithy-client").CommandImpl<ListAlgorithmsCommandInput, ListAlgorithmsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists the machine learning algorithms that have been created.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListAlgorithmsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListAlgorithmsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // ListAlgorithmsInput
 *   CreationTimeAfter: new Date("TIMESTAMP"),
 *   CreationTimeBefore: new Date("TIMESTAMP"),
 *   MaxResults: Number("int"),
 *   NameContains: "STRING_VALUE",
 *   NextToken: "STRING_VALUE",
 *   SortBy: "Name" || "CreationTime",
 *   SortOrder: "Ascending" || "Descending",
 * };
 * const command = new ListAlgorithmsCommand(input);
 * const response = await client.send(command);
 * // { // ListAlgorithmsOutput
 * //   AlgorithmSummaryList: [ // AlgorithmSummaryList // required
 * //     { // AlgorithmSummary
 * //       AlgorithmName: "STRING_VALUE", // required
 * //       AlgorithmArn: "STRING_VALUE", // required
 * //       AlgorithmDescription: "STRING_VALUE",
 * //       CreationTime: new Date("TIMESTAMP"), // required
 * //       AlgorithmStatus: "Pending" || "InProgress" || "Completed" || "Failed" || "Deleting", // required
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListAlgorithmsCommandInput - {@link ListAlgorithmsCommandInput}
 * @returns {@link ListAlgorithmsCommandOutput}
 * @see {@link ListAlgorithmsCommandInput} for command's `input` shape.
 * @see {@link ListAlgorithmsCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListAlgorithmsCommand extends ListAlgorithmsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListAlgorithmsInput;
            output: ListAlgorithmsOutput;
        };
        sdk: {
            input: ListAlgorithmsCommandInput;
            output: ListAlgorithmsCommandOutput;
        };
    };
}
