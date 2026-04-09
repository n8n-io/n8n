import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { ListModelCardsRequest, ListModelCardsResponse } from "../models/models_3";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListModelCardsCommand}.
 */
export interface ListModelCardsCommandInput extends ListModelCardsRequest {
}
/**
 * @public
 *
 * The output of {@link ListModelCardsCommand}.
 */
export interface ListModelCardsCommandOutput extends ListModelCardsResponse, __MetadataBearer {
}
declare const ListModelCardsCommand_base: {
    new (input: ListModelCardsCommandInput): import("@smithy/smithy-client").CommandImpl<ListModelCardsCommandInput, ListModelCardsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListModelCardsCommandInput]): import("@smithy/smithy-client").CommandImpl<ListModelCardsCommandInput, ListModelCardsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>List existing model cards.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListModelCardsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListModelCardsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // ListModelCardsRequest
 *   CreationTimeAfter: new Date("TIMESTAMP"),
 *   CreationTimeBefore: new Date("TIMESTAMP"),
 *   MaxResults: Number("int"),
 *   NameContains: "STRING_VALUE",
 *   ModelCardStatus: "Draft" || "PendingReview" || "Approved" || "Archived",
 *   NextToken: "STRING_VALUE",
 *   SortBy: "Name" || "CreationTime",
 *   SortOrder: "Ascending" || "Descending",
 * };
 * const command = new ListModelCardsCommand(input);
 * const response = await client.send(command);
 * // { // ListModelCardsResponse
 * //   ModelCardSummaries: [ // ModelCardSummaryList // required
 * //     { // ModelCardSummary
 * //       ModelCardName: "STRING_VALUE", // required
 * //       ModelCardArn: "STRING_VALUE", // required
 * //       ModelCardStatus: "Draft" || "PendingReview" || "Approved" || "Archived", // required
 * //       CreationTime: new Date("TIMESTAMP"), // required
 * //       LastModifiedTime: new Date("TIMESTAMP"),
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListModelCardsCommandInput - {@link ListModelCardsCommandInput}
 * @returns {@link ListModelCardsCommandOutput}
 * @see {@link ListModelCardsCommandInput} for command's `input` shape.
 * @see {@link ListModelCardsCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListModelCardsCommand extends ListModelCardsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListModelCardsRequest;
            output: ListModelCardsResponse;
        };
        sdk: {
            input: ListModelCardsCommandInput;
            output: ListModelCardsCommandOutput;
        };
    };
}
