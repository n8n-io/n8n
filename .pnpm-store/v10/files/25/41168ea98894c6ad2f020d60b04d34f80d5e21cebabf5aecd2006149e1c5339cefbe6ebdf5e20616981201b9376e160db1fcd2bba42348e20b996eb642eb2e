import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../KendraClient";
import type { ListIndicesRequest, ListIndicesResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListIndicesCommand}.
 */
export interface ListIndicesCommandInput extends ListIndicesRequest {
}
/**
 * @public
 *
 * The output of {@link ListIndicesCommand}.
 */
export interface ListIndicesCommandOutput extends ListIndicesResponse, __MetadataBearer {
}
declare const ListIndicesCommand_base: {
    new (input: ListIndicesCommandInput): import("@smithy/smithy-client").CommandImpl<ListIndicesCommandInput, ListIndicesCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListIndicesCommandInput]): import("@smithy/smithy-client").CommandImpl<ListIndicesCommandInput, ListIndicesCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists the Amazon Kendra indexes that you created.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { KendraClient, ListIndicesCommand } from "@aws-sdk/client-kendra"; // ES Modules import
 * // const { KendraClient, ListIndicesCommand } = require("@aws-sdk/client-kendra"); // CommonJS import
 * // import type { KendraClientConfig } from "@aws-sdk/client-kendra";
 * const config = {}; // type is KendraClientConfig
 * const client = new KendraClient(config);
 * const input = { // ListIndicesRequest
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 * };
 * const command = new ListIndicesCommand(input);
 * const response = await client.send(command);
 * // { // ListIndicesResponse
 * //   IndexConfigurationSummaryItems: [ // IndexConfigurationSummaryList
 * //     { // IndexConfigurationSummary
 * //       Name: "STRING_VALUE",
 * //       Id: "STRING_VALUE",
 * //       Edition: "DEVELOPER_EDITION" || "ENTERPRISE_EDITION" || "GEN_AI_ENTERPRISE_EDITION",
 * //       CreatedAt: new Date("TIMESTAMP"), // required
 * //       UpdatedAt: new Date("TIMESTAMP"), // required
 * //       Status: "CREATING" || "ACTIVE" || "DELETING" || "FAILED" || "UPDATING" || "SYSTEM_UPDATING", // required
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListIndicesCommandInput - {@link ListIndicesCommandInput}
 * @returns {@link ListIndicesCommandOutput}
 * @see {@link ListIndicesCommandInput} for command's `input` shape.
 * @see {@link ListIndicesCommandOutput} for command's `response` shape.
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
export declare class ListIndicesCommand extends ListIndicesCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListIndicesRequest;
            output: ListIndicesResponse;
        };
        sdk: {
            input: ListIndicesCommandInput;
            output: ListIndicesCommandOutput;
        };
    };
}
