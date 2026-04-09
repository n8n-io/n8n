import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../KendraClient";
import type { ListEntityPersonasRequest, ListEntityPersonasResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListEntityPersonasCommand}.
 */
export interface ListEntityPersonasCommandInput extends ListEntityPersonasRequest {
}
/**
 * @public
 *
 * The output of {@link ListEntityPersonasCommand}.
 */
export interface ListEntityPersonasCommandOutput extends ListEntityPersonasResponse, __MetadataBearer {
}
declare const ListEntityPersonasCommand_base: {
    new (input: ListEntityPersonasCommandInput): import("@smithy/smithy-client").CommandImpl<ListEntityPersonasCommandInput, ListEntityPersonasCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListEntityPersonasCommandInput): import("@smithy/smithy-client").CommandImpl<ListEntityPersonasCommandInput, ListEntityPersonasCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists specific permissions of users and groups with access to your
 *             Amazon Kendra experience.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { KendraClient, ListEntityPersonasCommand } from "@aws-sdk/client-kendra"; // ES Modules import
 * // const { KendraClient, ListEntityPersonasCommand } = require("@aws-sdk/client-kendra"); // CommonJS import
 * // import type { KendraClientConfig } from "@aws-sdk/client-kendra";
 * const config = {}; // type is KendraClientConfig
 * const client = new KendraClient(config);
 * const input = { // ListEntityPersonasRequest
 *   Id: "STRING_VALUE", // required
 *   IndexId: "STRING_VALUE", // required
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 * };
 * const command = new ListEntityPersonasCommand(input);
 * const response = await client.send(command);
 * // { // ListEntityPersonasResponse
 * //   SummaryItems: [ // PersonasSummaryList
 * //     { // PersonasSummary
 * //       EntityId: "STRING_VALUE",
 * //       Persona: "OWNER" || "VIEWER",
 * //       CreatedAt: new Date("TIMESTAMP"),
 * //       UpdatedAt: new Date("TIMESTAMP"),
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListEntityPersonasCommandInput - {@link ListEntityPersonasCommandInput}
 * @returns {@link ListEntityPersonasCommandOutput}
 * @see {@link ListEntityPersonasCommandInput} for command's `input` shape.
 * @see {@link ListEntityPersonasCommandOutput} for command's `response` shape.
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
export declare class ListEntityPersonasCommand extends ListEntityPersonasCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListEntityPersonasRequest;
            output: ListEntityPersonasResponse;
        };
        sdk: {
            input: ListEntityPersonasCommandInput;
            output: ListEntityPersonasCommandOutput;
        };
    };
}
