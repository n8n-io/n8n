import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { SendCustomVerificationEmailRequest, SendCustomVerificationEmailResponse } from "../models/models_1";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link SendCustomVerificationEmailCommand}.
 */
export interface SendCustomVerificationEmailCommandInput extends SendCustomVerificationEmailRequest {
}
/**
 * @public
 *
 * The output of {@link SendCustomVerificationEmailCommand}.
 */
export interface SendCustomVerificationEmailCommandOutput extends SendCustomVerificationEmailResponse, __MetadataBearer {
}
declare const SendCustomVerificationEmailCommand_base: {
    new (input: SendCustomVerificationEmailCommandInput): import("@smithy/smithy-client").CommandImpl<SendCustomVerificationEmailCommandInput, SendCustomVerificationEmailCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: SendCustomVerificationEmailCommandInput): import("@smithy/smithy-client").CommandImpl<SendCustomVerificationEmailCommandInput, SendCustomVerificationEmailCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Adds an email address to the list of identities for your Amazon SES account in the current
 *                 Amazon Web Services Region and attempts to verify it. As a result of executing this
 *             operation, a customized verification email is sent to the specified address.</p>
 *          <p>To use this operation, you must first create a custom verification email template. For
 *             more information about creating and using custom verification email templates, see
 *                 <a href="https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html#send-email-verify-address-custom">Using
 *                 custom verification email templates</a> in the <i>Amazon SES Developer
 *                 Guide</i>.</p>
 *          <p>You can execute this operation no more than once per second.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, SendCustomVerificationEmailCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, SendCustomVerificationEmailCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // SendCustomVerificationEmailRequest
 *   EmailAddress: "STRING_VALUE", // required
 *   TemplateName: "STRING_VALUE", // required
 *   ConfigurationSetName: "STRING_VALUE",
 * };
 * const command = new SendCustomVerificationEmailCommand(input);
 * const response = await client.send(command);
 * // { // SendCustomVerificationEmailResponse
 * //   MessageId: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param SendCustomVerificationEmailCommandInput - {@link SendCustomVerificationEmailCommandInput}
 * @returns {@link SendCustomVerificationEmailCommandOutput}
 * @see {@link SendCustomVerificationEmailCommandInput} for command's `input` shape.
 * @see {@link SendCustomVerificationEmailCommandOutput} for command's `response` shape.
 * @see {@link SESv2ClientResolvedConfig | config} for SESv2Client's `config` shape.
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
export declare class SendCustomVerificationEmailCommand extends SendCustomVerificationEmailCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: SendCustomVerificationEmailRequest;
            output: SendCustomVerificationEmailResponse;
        };
        sdk: {
            input: SendCustomVerificationEmailCommandInput;
            output: SendCustomVerificationEmailCommandOutput;
        };
    };
}
