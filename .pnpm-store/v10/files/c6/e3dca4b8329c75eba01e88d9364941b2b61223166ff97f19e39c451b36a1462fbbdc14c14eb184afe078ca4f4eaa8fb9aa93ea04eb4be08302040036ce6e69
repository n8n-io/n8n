import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { UpdateContactListRequest, UpdateContactListResponse } from "../models/models_1";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateContactListCommand}.
 */
export interface UpdateContactListCommandInput extends UpdateContactListRequest {
}
/**
 * @public
 *
 * The output of {@link UpdateContactListCommand}.
 */
export interface UpdateContactListCommandOutput extends UpdateContactListResponse, __MetadataBearer {
}
declare const UpdateContactListCommand_base: {
    new (input: UpdateContactListCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateContactListCommandInput, UpdateContactListCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateContactListCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateContactListCommandInput, UpdateContactListCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Updates contact list metadata. This operation does a complete replacement.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, UpdateContactListCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, UpdateContactListCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // UpdateContactListRequest
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
 * };
 * const command = new UpdateContactListCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param UpdateContactListCommandInput - {@link UpdateContactListCommandInput}
 * @returns {@link UpdateContactListCommandOutput}
 * @see {@link UpdateContactListCommandInput} for command's `input` shape.
 * @see {@link UpdateContactListCommandOutput} for command's `response` shape.
 * @see {@link SESv2ClientResolvedConfig | config} for SESv2Client's `config` shape.
 *
 * @throws {@link BadRequestException} (client fault)
 *  <p>The input you provided is invalid.</p>
 *
 * @throws {@link ConcurrentModificationException} (server fault)
 *  <p>The resource is being modified by another operation or thread.</p>
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
export declare class UpdateContactListCommand extends UpdateContactListCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateContactListRequest;
            output: {};
        };
        sdk: {
            input: UpdateContactListCommandInput;
            output: UpdateContactListCommandOutput;
        };
    };
}
