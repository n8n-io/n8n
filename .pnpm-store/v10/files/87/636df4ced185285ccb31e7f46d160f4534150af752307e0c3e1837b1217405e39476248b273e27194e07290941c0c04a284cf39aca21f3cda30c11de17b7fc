import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../KendraClient";
import type { ListQuerySuggestionsBlockListsRequest, ListQuerySuggestionsBlockListsResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListQuerySuggestionsBlockListsCommand}.
 */
export interface ListQuerySuggestionsBlockListsCommandInput extends ListQuerySuggestionsBlockListsRequest {
}
/**
 * @public
 *
 * The output of {@link ListQuerySuggestionsBlockListsCommand}.
 */
export interface ListQuerySuggestionsBlockListsCommandOutput extends ListQuerySuggestionsBlockListsResponse, __MetadataBearer {
}
declare const ListQuerySuggestionsBlockListsCommand_base: {
    new (input: ListQuerySuggestionsBlockListsCommandInput): import("@smithy/smithy-client").CommandImpl<ListQuerySuggestionsBlockListsCommandInput, ListQuerySuggestionsBlockListsCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListQuerySuggestionsBlockListsCommandInput): import("@smithy/smithy-client").CommandImpl<ListQuerySuggestionsBlockListsCommandInput, ListQuerySuggestionsBlockListsCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists the block lists used for query suggestions for an index.</p>
 *          <p>For information on the current quota limits for block lists, see
 *             <a href="https://docs.aws.amazon.com/kendra/latest/dg/quotas.html">Quotas
 *                 for Amazon Kendra</a>.</p>
 *          <p>
 *             <code>ListQuerySuggestionsBlockLists</code> is currently not supported in the
 *             Amazon Web Services GovCloud (US-West) region.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { KendraClient, ListQuerySuggestionsBlockListsCommand } from "@aws-sdk/client-kendra"; // ES Modules import
 * // const { KendraClient, ListQuerySuggestionsBlockListsCommand } = require("@aws-sdk/client-kendra"); // CommonJS import
 * // import type { KendraClientConfig } from "@aws-sdk/client-kendra";
 * const config = {}; // type is KendraClientConfig
 * const client = new KendraClient(config);
 * const input = { // ListQuerySuggestionsBlockListsRequest
 *   IndexId: "STRING_VALUE", // required
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 * };
 * const command = new ListQuerySuggestionsBlockListsCommand(input);
 * const response = await client.send(command);
 * // { // ListQuerySuggestionsBlockListsResponse
 * //   BlockListSummaryItems: [ // QuerySuggestionsBlockListSummaryItems
 * //     { // QuerySuggestionsBlockListSummary
 * //       Id: "STRING_VALUE",
 * //       Name: "STRING_VALUE",
 * //       Status: "ACTIVE" || "CREATING" || "DELETING" || "UPDATING" || "ACTIVE_BUT_UPDATE_FAILED" || "FAILED",
 * //       CreatedAt: new Date("TIMESTAMP"),
 * //       UpdatedAt: new Date("TIMESTAMP"),
 * //       ItemCount: Number("int"),
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListQuerySuggestionsBlockListsCommandInput - {@link ListQuerySuggestionsBlockListsCommandInput}
 * @returns {@link ListQuerySuggestionsBlockListsCommandOutput}
 * @see {@link ListQuerySuggestionsBlockListsCommandInput} for command's `input` shape.
 * @see {@link ListQuerySuggestionsBlockListsCommandOutput} for command's `response` shape.
 * @see {@link KendraClientResolvedConfig | config} for KendraClient's `config` shape.
 *
 * @throws {@link AccessDeniedException} (client fault)
 *  <p>You don't have sufficient access to perform this action. Please ensure you have the
 *             required permission policies and user accounts and try again.</p>
 *
 * @throws {@link InternalServerException} (server fault)
 *  <p>An issue occurred with the internal server used for your Amazon Kendra service.
 *             Please wait a few minutes and try again, or contact <a href="http://aws.amazon.com/contact-us/">Support</a> for help.</p>
 *
 * @throws {@link ResourceNotFoundException} (client fault)
 *  <p>The resource you want to use doesn’t exist. Please check you have provided the correct
 *             resource and try again.</p>
 *
 * @throws {@link ThrottlingException} (client fault)
 *  <p>The request was denied due to request throttling. Please reduce the number of requests
 *             and try again.</p>
 *
 * @throws {@link ValidationException} (client fault)
 *  <p>The input fails to satisfy the constraints set by the Amazon Kendra service.
 *             Please provide the correct input and try again.</p>
 *
 * @throws {@link KendraServiceException}
 * <p>Base exception class for all service exceptions from Kendra service.</p>
 *
 *
 * @public
 */
export declare class ListQuerySuggestionsBlockListsCommand extends ListQuerySuggestionsBlockListsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListQuerySuggestionsBlockListsRequest;
            output: ListQuerySuggestionsBlockListsResponse;
        };
        sdk: {
            input: ListQuerySuggestionsBlockListsCommandInput;
            output: ListQuerySuggestionsBlockListsCommandOutput;
        };
    };
}
