import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateContactRequest, CreateContactResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateContactCommand}.
 */
export interface CreateContactCommandInput extends CreateContactRequest {
}
/**
 * @public
 *
 * The output of {@link CreateContactCommand}.
 */
export interface CreateContactCommandOutput extends CreateContactResponse, __MetadataBearer {
}
declare const CreateContactCommand_base: {
    new (input: CreateContactCommandInput): import("@smithy/smithy-client").CommandImpl<CreateContactCommandInput, CreateContactCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateContactCommandInput): import("@smithy/smithy-client").CommandImpl<CreateContactCommandInput, CreateContactCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates a contact, which is an end-user who is receiving the email, and adds them to a
 *             contact list.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, CreateContactCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, CreateContactCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // CreateContactRequest
 *   ContactListName: "STRING_VALUE", // required
 *   EmailAddress: "STRING_VALUE", // required
 *   TopicPreferences: [ // TopicPreferenceList
 *     { // TopicPreference
 *       TopicName: "STRING_VALUE", // required
 *       SubscriptionStatus: "OPT_IN" || "OPT_OUT", // required
 *     },
 *   ],
 *   UnsubscribeAll: true || false,
 *   AttributesData: "STRING_VALUE",
 * };
 * const command = new CreateContactCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param CreateContactCommandInput - {@link CreateContactCommandInput}
 * @returns {@link CreateContactCommandOutput}
 * @see {@link CreateContactCommandInput} for command's `input` shape.
 * @see {@link CreateContactCommandOutput} for command's `response` shape.
 * @see {@link SESv2ClientResolvedConfig | config} for SESv2Client's `config` shape.
 *
 * @throws {@link AlreadyExistsException} (client fault)
 *  <p>The resource specified in your request already exists.</p>
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
export declare class CreateContactCommand extends CreateContactCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateContactRequest;
            output: {};
        };
        sdk: {
            input: CreateContactCommandInput;
            output: CreateContactCommandOutput;
        };
    };
}
