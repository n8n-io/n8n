import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateContactListRequest, CreateContactListResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateContactListCommand}.
 */
export interface CreateContactListCommandInput extends CreateContactListRequest {
}
/**
 * @public
 *
 * The output of {@link CreateContactListCommand}.
 */
export interface CreateContactListCommandOutput extends CreateContactListResponse, __MetadataBearer {
}
declare const CreateContactListCommand_base: {
    new (input: CreateContactListCommandInput): import("@smithy/smithy-client").CommandImpl<CreateContactListCommandInput, CreateContactListCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateContactListCommandInput): import("@smithy/smithy-client").CommandImpl<CreateContactListCommandInput, CreateContactListCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates a contact list.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, CreateContactListCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, CreateContactListCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // CreateContactListRequest
 *   ContactListName: "STRING_VALUE", // required
 *   Topics: [ // Topics
 *     { // Topic
 *       TopicName: "STRING_VALUE", // required
 *       DisplayName: "STRING_VALUE", // required
 *       Description: "STRING_VALUE",
 *       DefaultSubscriptionStatus: "OPT_IN" || "OPT_OUT", // required
 *     },
 *   ],
 *   Description: "STRING_VALUE",
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 * };
 * const command = new CreateContactListCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param CreateContactListCommandInput - {@link CreateContactListCommandInput}
 * @returns {@link CreateContactListCommandOutput}
 * @see {@link CreateContactListCommandInput} for command's `input` shape.
 * @see {@link CreateContactListCommandOutput} for command's `response` shape.
 * @see {@link SESv2ClientResolvedConfig | config} for SESv2Client's `config` shape.
 *
 * @throws {@link AlreadyExistsException} (client fault)
 *  <p>The resource specified in your request already exists.</p>
 *
 * @throws {@link BadRequestException} (client fault)
 *  <p>The input you provided is invalid.</p>
 *
 * @throws {@link LimitExceededException} (client fault)
 *  <p>There are too many instances of the specified resource type.</p>
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
export declare class CreateContactListCommand extends CreateContactListCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateContactListRequest;
            output: {};
        };
        sdk: {
            input: CreateContactListCommandInput;
            output: CreateContactListCommandOutput;
        };
    };
}
