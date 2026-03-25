import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { SendBulkEmailRequest, SendBulkEmailResponse } from "../models/models_1";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link SendBulkEmailCommand}.
 */
export interface SendBulkEmailCommandInput extends SendBulkEmailRequest {
}
/**
 * @public
 *
 * The output of {@link SendBulkEmailCommand}.
 */
export interface SendBulkEmailCommandOutput extends SendBulkEmailResponse, __MetadataBearer {
}
declare const SendBulkEmailCommand_base: {
    new (input: SendBulkEmailCommandInput): import("@smithy/smithy-client").CommandImpl<SendBulkEmailCommandInput, SendBulkEmailCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: SendBulkEmailCommandInput): import("@smithy/smithy-client").CommandImpl<SendBulkEmailCommandInput, SendBulkEmailCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Composes an email message to multiple destinations.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, SendBulkEmailCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, SendBulkEmailCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // SendBulkEmailRequest
 *   FromEmailAddress: "STRING_VALUE",
 *   FromEmailAddressIdentityArn: "STRING_VALUE",
 *   ReplyToAddresses: [ // EmailAddressList
 *     "STRING_VALUE",
 *   ],
 *   FeedbackForwardingEmailAddress: "STRING_VALUE",
 *   FeedbackForwardingEmailAddressIdentityArn: "STRING_VALUE",
 *   DefaultEmailTags: [ // MessageTagList
 *     { // MessageTag
 *       Name: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 *   DefaultContent: { // BulkEmailContent
 *     Template: { // Template
 *       TemplateName: "STRING_VALUE",
 *       TemplateArn: "STRING_VALUE",
 *       TemplateContent: { // EmailTemplateContent
 *         Subject: "STRING_VALUE",
 *         Text: "STRING_VALUE",
 *         Html: "STRING_VALUE",
 *       },
 *       TemplateData: "STRING_VALUE",
 *       Headers: [ // MessageHeaderList
 *         { // MessageHeader
 *           Name: "STRING_VALUE", // required
 *           Value: "STRING_VALUE", // required
 *         },
 *       ],
 *       Attachments: [ // AttachmentList
 *         { // Attachment
 *           RawContent: new Uint8Array(), // e.g. Buffer.from("") or new TextEncoder().encode("")           // required
 *           ContentDisposition: "ATTACHMENT" || "INLINE",
 *           FileName: "STRING_VALUE", // required
 *           ContentDescription: "STRING_VALUE",
 *           ContentId: "STRING_VALUE",
 *           ContentTransferEncoding: "BASE64" || "QUOTED_PRINTABLE" || "SEVEN_BIT",
 *           ContentType: "STRING_VALUE",
 *         },
 *       ],
 *     },
 *   },
 *   BulkEmailEntries: [ // BulkEmailEntryList // required
 *     { // BulkEmailEntry
 *       Destination: { // Destination
 *         ToAddresses: [
 *           "STRING_VALUE",
 *         ],
 *         CcAddresses: [
 *           "STRING_VALUE",
 *         ],
 *         BccAddresses: [
 *           "STRING_VALUE",
 *         ],
 *       },
 *       ReplacementTags: [
 *         {
 *           Name: "STRING_VALUE", // required
 *           Value: "STRING_VALUE", // required
 *         },
 *       ],
 *       ReplacementEmailContent: { // ReplacementEmailContent
 *         ReplacementTemplate: { // ReplacementTemplate
 *           ReplacementTemplateData: "STRING_VALUE",
 *         },
 *       },
 *       ReplacementHeaders: [
 *         {
 *           Name: "STRING_VALUE", // required
 *           Value: "STRING_VALUE", // required
 *         },
 *       ],
 *     },
 *   ],
 *   ConfigurationSetName: "STRING_VALUE",
 *   EndpointId: "STRING_VALUE",
 *   TenantName: "STRING_VALUE",
 * };
 * const command = new SendBulkEmailCommand(input);
 * const response = await client.send(command);
 * // { // SendBulkEmailResponse
 * //   BulkEmailEntryResults: [ // BulkEmailEntryResultList // required
 * //     { // BulkEmailEntryResult
 * //       Status: "SUCCESS" || "MESSAGE_REJECTED" || "MAIL_FROM_DOMAIN_NOT_VERIFIED" || "CONFIGURATION_SET_NOT_FOUND" || "TEMPLATE_NOT_FOUND" || "ACCOUNT_SUSPENDED" || "ACCOUNT_THROTTLED" || "ACCOUNT_DAILY_QUOTA_EXCEEDED" || "INVALID_SENDING_POOL_NAME" || "ACCOUNT_SENDING_PAUSED" || "CONFIGURATION_SET_SENDING_PAUSED" || "INVALID_PARAMETER" || "TRANSIENT_FAILURE" || "FAILED",
 * //       Error: "STRING_VALUE",
 * //       MessageId: "STRING_VALUE",
 * //     },
 * //   ],
 * // };
 *
 * ```
 *
 * @param SendBulkEmailCommandInput - {@link SendBulkEmailCommandInput}
 * @returns {@link SendBulkEmailCommandOutput}
 * @see {@link SendBulkEmailCommandInput} for command's `input` shape.
 * @see {@link SendBulkEmailCommandOutput} for command's `response` shape.
 * @see {@link SESv2ClientResolvedConfig | config} for SESv2Client's `config` shape.
 *
 * @throws {@link AccountSuspendedException} (client fault)
 *  <p>The message can't be sent because the account's ability to send email has been
 *             permanently restricted.</p>
 *
 * @throws {@link BadRequestException} (client fault)
 *  <p>The input you provided is invalid.</p>
 *
 * @throws {@link LimitExceededException} (client fault)
 *  <p>There are too many instances of the specified resource type.</p>
 *
 * @throws {@link MailFromDomainNotVerifiedException} (client fault)
 *  <p>The message can't be sent because the sending domain isn't verified.</p>
 *
 * @throws {@link MessageRejected} (client fault)
 *  <p>The message can't be sent because it contains invalid content.</p>
 *
 * @throws {@link NotFoundException} (client fault)
 *  <p>The resource you attempted to access doesn't exist.</p>
 *
 * @throws {@link SendingPausedException} (client fault)
 *  <p>The message can't be sent because the account's ability to send email is currently
 *             paused.</p>
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
export declare class SendBulkEmailCommand extends SendBulkEmailCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: SendBulkEmailRequest;
            output: SendBulkEmailResponse;
        };
        sdk: {
            input: SendBulkEmailCommandInput;
            output: SendBulkEmailCommandOutput;
        };
    };
}
