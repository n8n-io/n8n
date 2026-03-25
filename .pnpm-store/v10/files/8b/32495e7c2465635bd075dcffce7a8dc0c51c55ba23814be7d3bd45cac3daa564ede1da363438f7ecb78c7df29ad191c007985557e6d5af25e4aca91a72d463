import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetContactListRequest, GetContactListResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetContactListCommand}.
 */
export interface GetContactListCommandInput extends GetContactListRequest {
}
/**
 * @public
 *
 * The output of {@link GetContactListCommand}.
 */
export interface GetContactListCommandOutput extends GetContactListResponse, __MetadataBearer {
}
declare const GetContactListCommand_base: {
    new (input: GetContactListCommandInput): import("@smithy/smithy-client").CommandImpl<GetContactListCommandInput, GetContactListCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetContactListCommandInput): import("@smithy/smithy-client").CommandImpl<GetContactListCommandInput, GetContactListCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Returns contact list metadata. It does not return any information about the contacts
 *             present in the list.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, GetContactListCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, GetContactListCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // GetContactListRequest
 *   ContactListName: "STRING_VALUE", // required
 * };
 * const command = new GetContactListCommand(input);
 * const response = await client.send(command);
 * // { // GetContactListResponse
 * //   ContactListName: "STRING_VALUE",
 * //   Topics: [ // Topics
 * //     { // Topic
 * //       TopicName: "STRING_VALUE", // required
 * //       DisplayName: "STRING_VALUE", // required
 * //       Description: "STRING_VALUE",
 * //       DefaultSubscriptionStatus: "OPT_IN" || "OPT_OUT", // required
 * //     },
 * //   ],
 * //   Description: "STRING_VALUE",
 * //   CreatedTimestamp: new Date("TIMESTAMP"),
 * //   LastUpdatedTimestamp: new Date("TIMESTAMP"),
 * //   Tags: [ // TagList
 * //     { // Tag
 * //       Key: "STRING_VALUE", // required
 * //       Value: "STRING_VALUE", // required
 * //     },
 * //   ],
 * // };
 *
 * ```
 *
 * @param GetContactListCommandInput - {@link GetContactListCommandInput}
 * @returns {@link GetContactListCommandOutput}
 * @see {@link GetContactListCommandInput} for command's `input` shape.
 * @see {@link GetContactListCommandOutput} for command's `response` shape.
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
export declare class GetContactListCommand extends GetContactListCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetContactListRequest;
            output: GetContactListResponse;
        };
        sdk: {
            input: GetContactListCommandInput;
            output: GetContactListCommandOutput;
        };
    };
}
