import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { SendEmailRequest, SendEmailResponse } from "../models/models_1";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link SendEmailCommand}.
 */
export interface SendEmailCommandInput extends SendEmailRequest {
}
/**
 * @public
 *
 * The output of {@link SendEmailCommand}.
 */
export interface SendEmailCommandOutput extends SendEmailResponse, __MetadataBearer {
}
declare const SendEmailCommand_base: {
    new (input: SendEmailCommandInput): import("@smithy/smithy-client").CommandImpl<SendEmailCommandInput, SendEmailCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: SendEmailCommandInput): import("@smithy/smithy-client").CommandImpl<SendEmailCommandInput, SendEmailCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Sends an email message. You can use the Amazon SES API v2 to send the following types of
 *             messages:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <b>Simple</b> – A standard email message. When
 *                     you create this type of message, you specify the sender, the recipient, and the
 *                     message body, and Amazon SES assembles the message for you.</p>
 *             </li>
 *             <li>
 *                <p>
 *                   <b>Raw</b> – A raw, MIME-formatted email
 *                     message. When you send this type of email, you have to specify all of the
 *                     message headers, as well as the message body. You can use this message type to
 *                     send messages that contain attachments. The message that you specify has to be a
 *                     valid MIME message.</p>
 *             </li>
 *             <li>
 *                <p>
 *                   <b>Templated</b> – A message that contains
 *                     personalization tags. When you send this type of email, Amazon SES API v2 automatically
 *                     replaces the tags with values that you specify.</p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, SendEmailCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // SendEmailRequest
 *   FromEmailAddress: "STRING_VALUE",
 *   FromEmailAddressIdentityArn: "STRING_VALUE",
 *   Destination: { // Destination
 *     ToAddresses: [ // EmailAddressList
 *       "STRING_VALUE",
 *     ],
 *     CcAddresses: [
 *       "STRING_VALUE",
 *     ],
 *     BccAddresses: [
 *       "STRING_VALUE",
 *     ],
 *   },
 *   ReplyToAddresses: [
 *     "STRING_VALUE",
 *   ],
 *   FeedbackForwardingEmailAddress: "STRING_VALUE",
 *   FeedbackForwardingEmailAddressIdentityArn: "STRING_VALUE",
 *   Content: { // EmailContent
 *     Simple: { // Message
 *       Subject: { // Content
 *         Data: "STRING_VALUE", // required
 *         Charset: "STRING_VALUE",
 *       },
 *       Body: { // Body
 *         Text: {
 *           Data: "STRING_VALUE", // required
 *           Charset: "STRING_VALUE",
 *         },
 *         Html: {
 *           Data: "STRING_VALUE", // required
 *           Charset: "STRING_VALUE",
 *         },
 *       },
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
 *     Raw: { // RawMessage
 *       Data: new Uint8Array(), // e.g. Buffer.from("") or new TextEncoder().encode("")       // required
 *     },
 *     Template: { // Template
 *       TemplateName: "STRING_VALUE",
 *       TemplateArn: "STRING_VALUE",
 *       TemplateContent: { // EmailTemplateContent
 *         Subject: "STRING_VALUE",
 *         Text: "STRING_VALUE",
 *         Html: "STRING_VALUE",
 *       },
 *       TemplateData: "STRING_VALUE",
 *       Headers: [
 *         {
 *           Name: "STRING_VALUE", // required
 *           Value: "STRING_VALUE", // required
 *         },
 *       ],
 *       Attachments: [
 *         {
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
 *   EmailTags: [ // MessageTagList
 *     { // MessageTag
 *       Name: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 *   ConfigurationSetName: "STRING_VALUE",
 *   EndpointId: "STRING_VALUE",
 *   TenantName: "STRING_VALUE",
 *   ListManagementOptions: { // ListManagementOptions
 *     ContactListName: "STRING_VALUE", // required
 *     TopicName: "STRING_VALUE",
 *   },
 * };
 * const command = new SendEmailCommand(input);
 * const response = await client.send(command);
 * // { // SendEmailResponse
 * //   MessageId: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param SendEmailCommandInput - {@link SendEmailCommandInput}
 * @returns {@link SendEmailCommandOutput}
 * @see {@link SendEmailCommandInput} for command's `input` shape.
 * @see {@link SendEmailCommandOutput} for command's `response` shape.
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
export declare class SendEmailCommand extends SendEmailCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: SendEmailRequest;
            output: SendEmailResponse;
        };
        sdk: {
            input: SendEmailCommandInput;
            output: SendEmailCommandOutput;
        };
    };
}
