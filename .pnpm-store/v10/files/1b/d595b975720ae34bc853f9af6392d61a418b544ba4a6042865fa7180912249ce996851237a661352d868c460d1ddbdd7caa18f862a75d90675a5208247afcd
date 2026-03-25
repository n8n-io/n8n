import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListContactsRequest, ListContactsResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListContactsCommand}.
 */
export interface ListContactsCommandInput extends ListContactsRequest {
}
/**
 * @public
 *
 * The output of {@link ListContactsCommand}.
 */
export interface ListContactsCommandOutput extends ListContactsResponse, __MetadataBearer {
}
declare const ListContactsCommand_base: {
    new (input: ListContactsCommandInput): import("@smithy/smithy-client").CommandImpl<ListContactsCommandInput, ListContactsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListContactsCommandInput): import("@smithy/smithy-client").CommandImpl<ListContactsCommandInput, ListContactsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists the contacts present in a specific contact list.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, ListContactsCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, ListContactsCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // ListContactsRequest
 *   ContactListName: "STRING_VALUE", // required
 *   Filter: { // ListContactsFilter
 *     FilteredStatus: "OPT_IN" || "OPT_OUT",
 *     TopicFilter: { // TopicFilter
 *       TopicName: "STRING_VALUE",
 *       UseDefaultIfPreferenceUnavailable: true || false,
 *     },
 *   },
 *   PageSize: Number("int"),
 *   NextToken: "STRING_VALUE",
 * };
 * const command = new ListContactsCommand(input);
 * const response = await client.send(command);
 * // { // ListContactsResponse
 * //   Contacts: [ // ListOfContacts
 * //     { // Contact
 * //       EmailAddress: "STRING_VALUE",
 * //       TopicPreferences: [ // TopicPreferenceList
 * //         { // TopicPreference
 * //           TopicName: "STRING_VALUE", // required
 * //           SubscriptionStatus: "OPT_IN" || "OPT_OUT", // required
 * //         },
 * //       ],
 * //       TopicDefaultPreferences: [
 * //         {
 * //           TopicName: "STRING_VALUE", // required
 * //           SubscriptionStatus: "OPT_IN" || "OPT_OUT", // required
 * //         },
 * //       ],
 * //       UnsubscribeAll: true || false,
 * //       LastUpdatedTimestamp: new Date("TIMESTAMP"),
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListContactsCommandInput - {@link ListContactsCommandInput}
 * @returns {@link ListContactsCommandOutput}
 * @see {@link ListContactsCommandInput} for command's `input` shape.
 * @see {@link ListContactsCommandOutput} for command's `response` shape.
 * @see {@link SESv2ClientResolvedConfig | config} for SESv2Client's `config` shape.
 *
 * @throws {@link BadRequestException} (client fault)
 *  <p>The input you provided is invalid.</p>
 *
 * @throws {@link NotFoundException} (client fault)
 *  <p>The resource you attempted to access doesn't exist.</p>
 *
 * @throws {@link TooManyRequestsException} (client fault)
 *  <p>Too many requests have been made to the operation.</p>
 *
 * @throws {@link SESv2ServiceException}
 * <p>Base exception class for all service exceptions from SESv2 service.</p>
 *
 *
 * @public
 */
export declare class ListContactsCommand extends ListContactsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListContactsRequest;
            output: ListContactsResponse;
        };
        sdk: {
            input: ListContactsCommandInput;
            output: ListContactsCommandOutput;
        };
    };
}
