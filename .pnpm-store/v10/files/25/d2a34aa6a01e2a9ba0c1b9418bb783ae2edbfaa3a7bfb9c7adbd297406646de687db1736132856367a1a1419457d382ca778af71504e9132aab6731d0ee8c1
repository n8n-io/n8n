import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../KendraClient";
import type { ListGroupsOlderThanOrderingIdRequest, ListGroupsOlderThanOrderingIdResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListGroupsOlderThanOrderingIdCommand}.
 */
export interface ListGroupsOlderThanOrderingIdCommandInput extends ListGroupsOlderThanOrderingIdRequest {
}
/**
 * @public
 *
 * The output of {@link ListGroupsOlderThanOrderingIdCommand}.
 */
export interface ListGroupsOlderThanOrderingIdCommandOutput extends ListGroupsOlderThanOrderingIdResponse, __MetadataBearer {
}
declare const ListGroupsOlderThanOrderingIdCommand_base: {
    new (input: ListGroupsOlderThanOrderingIdCommandInput): import("@smithy/smithy-client").CommandImpl<ListGroupsOlderThanOrderingIdCommandInput, ListGroupsOlderThanOrderingIdCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListGroupsOlderThanOrderingIdCommandInput): import("@smithy/smithy-client").CommandImpl<ListGroupsOlderThanOrderingIdCommandInput, ListGroupsOlderThanOrderingIdCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Provides a list of groups that are mapped to users before a given ordering or
 *             timestamp identifier.</p>
 *          <p>
 *             <code>ListGroupsOlderThanOrderingId</code> is currently not supported in the Amazon Web Services GovCloud (US-West) region.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { KendraClient, ListGroupsOlderThanOrderingIdCommand } from "@aws-sdk/client-kendra"; // ES Modules import
 * // const { KendraClient, ListGroupsOlderThanOrderingIdCommand } = require("@aws-sdk/client-kendra"); // CommonJS import
 * // import type { KendraClientConfig } from "@aws-sdk/client-kendra";
 * const config = {}; // type is KendraClientConfig
 * const client = new KendraClient(config);
 * const input = { // ListGroupsOlderThanOrderingIdRequest
 *   IndexId: "STRING_VALUE", // required
 *   DataSourceId: "STRING_VALUE",
 *   OrderingId: Number("long"), // required
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 * };
 * const command = new ListGroupsOlderThanOrderingIdCommand(input);
 * const response = await client.send(command);
 * // { // ListGroupsOlderThanOrderingIdResponse
 * //   GroupsSummaries: [ // ListOfGroupSummaries
 * //     { // GroupSummary
 * //       GroupId: "STRING_VALUE",
 * //       OrderingId: Number("long"),
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListGroupsOlderThanOrderingIdCommandInput - {@link ListGroupsOlderThanOrderingIdCommandInput}
 * @returns {@link ListGroupsOlderThanOrderingIdCommandOutput}
 * @see {@link ListGroupsOlderThanOrderingIdCommandInput} for command's `input` shape.
 * @see {@link ListGroupsOlderThanOrderingIdCommandOutput} for command's `response` shape.
 * @see {@link KendraClientResolvedConfig | config} for KendraClient's `config` shape.
 *
 * @throws {@link AccessDeniedException} (client fault)
 *  <p>You don't have sufficient access to perform this action. Please ensure you have the
 *             required permission policies and user accounts and try again.</p>
 *
 * @throws {@link ConflictException} (client fault)
 *  <p>A conflict occurred with the request. Please fix any inconsistences with your
 *             resources and try again.</p>
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
export declare class ListGroupsOlderThanOrderingIdCommand extends ListGroupsOlderThanOrderingIdCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListGroupsOlderThanOrderingIdRequest;
            output: ListGroupsOlderThanOrderingIdResponse;
        };
        sdk: {
            input: ListGroupsOlderThanOrderingIdCommandInput;
            output: ListGroupsOlderThanOrderingIdCommandOutput;
        };
    };
}
