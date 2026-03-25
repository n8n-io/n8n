import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetContactRequest, GetContactResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetContactCommand}.
 */
export interface GetContactCommandInput extends GetContactRequest {
}
/**
 * @public
 *
 * The output of {@link GetContactCommand}.
 */
export interface GetContactCommandOutput extends GetContactResponse, __MetadataBearer {
}
declare const GetContactCommand_base: {
    new (input: GetContactCommandInput): import("@smithy/smithy-client").CommandImpl<GetContactCommandInput, GetContactCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetContactCommandInput): import("@smithy/smithy-client").CommandImpl<GetContactCommandInput, GetContactCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Returns a contact from a contact list.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, GetContactCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, GetContactCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // GetContactRequest
 *   ContactListName: "STRING_VALUE", // required
 *   EmailAddress: "STRING_VALUE", // required
 * };
 * const command = new GetContactCommand(input);
 * const response = await client.send(command);
 * // { // GetContactResponse
 * //   ContactListName: "STRING_VALUE",
 * //   EmailAddress: "STRING_VALUE",
 * //   TopicPreferences: [ // TopicPreferenceList
 * //     { // TopicPreference
 * //       TopicName: "STRING_VALUE", // required
 * //       SubscriptionStatus: "OPT_IN" || "OPT_OUT", // required
 * //     },
 * //   ],
 * //   TopicDefaultPreferences: [
 * //     {
 * //       TopicName: "STRING_VALUE", // required
 * //       SubscriptionStatus: "OPT_IN" || "OPT_OUT", // required
 * //     },
 * //   ],
 * //   UnsubscribeAll: true || false,
 * //   AttributesData: "STRING_VALUE",
 * //   CreatedTimestamp: new Date("TIMESTAMP"),
 * //   LastUpdatedTimestamp: new Date("TIMESTAMP"),
 * // };
 *
 * ```
 *
 * @param GetContactCommandInput - {@link GetContactCommandInput}
 * @returns {@link GetContactCommandOutput}
 * @see {@link GetContactCommandInput} for command's `input` shape.
 * @see {@link GetContactCommandOutput} for command's `response` shape.
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
export declare class GetContactCommand extends GetContactCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetContactRequest;
            output: GetContactResponse;
        };
        sdk: {
            input: GetContactCommandInput;
            output: GetContactCommandOutput;
        };
    };
}
