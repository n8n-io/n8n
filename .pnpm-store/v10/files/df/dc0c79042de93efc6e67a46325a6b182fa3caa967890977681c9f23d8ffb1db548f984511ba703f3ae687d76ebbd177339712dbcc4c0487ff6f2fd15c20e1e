import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { UpdateCustomVerificationEmailTemplateRequest, UpdateCustomVerificationEmailTemplateResponse } from "../models/models_1";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateCustomVerificationEmailTemplateCommand}.
 */
export interface UpdateCustomVerificationEmailTemplateCommandInput extends UpdateCustomVerificationEmailTemplateRequest {
}
/**
 * @public
 *
 * The output of {@link UpdateCustomVerificationEmailTemplateCommand}.
 */
export interface UpdateCustomVerificationEmailTemplateCommandOutput extends UpdateCustomVerificationEmailTemplateResponse, __MetadataBearer {
}
declare const UpdateCustomVerificationEmailTemplateCommand_base: {
    new (input: UpdateCustomVerificationEmailTemplateCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateCustomVerificationEmailTemplateCommandInput, UpdateCustomVerificationEmailTemplateCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateCustomVerificationEmailTemplateCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateCustomVerificationEmailTemplateCommandInput, UpdateCustomVerificationEmailTemplateCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Updates an existing custom verification email template.</p>
 *          <p>For more information about custom verification email templates, see <a href="https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html#send-email-verify-address-custom">Using
 *                 custom verification email templates</a> in the <i>Amazon SES Developer
 *                 Guide</i>.</p>
 *          <p>You can execute this operation no more than once per second.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, UpdateCustomVerificationEmailTemplateCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, UpdateCustomVerificationEmailTemplateCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // UpdateCustomVerificationEmailTemplateRequest
 *   TemplateName: "STRING_VALUE", // required
 *   FromEmailAddress: "STRING_VALUE", // required
 *   TemplateSubject: "STRING_VALUE", // required
 *   TemplateContent: "STRING_VALUE", // required
 *   SuccessRedirectionURL: "STRING_VALUE", // required
 *   FailureRedirectionURL: "STRING_VALUE", // required
 * };
 * const command = new UpdateCustomVerificationEmailTemplateCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param UpdateCustomVerificationEmailTemplateCommandInput - {@link UpdateCustomVerificationEmailTemplateCommandInput}
 * @returns {@link UpdateCustomVerificationEmailTemplateCommandOutput}
 * @see {@link UpdateCustomVerificationEmailTemplateCommandInput} for command's `input` shape.
 * @see {@link UpdateCustomVerificationEmailTemplateCommandOutput} for command's `response` shape.
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
export declare class UpdateCustomVerificationEmailTemplateCommand extends UpdateCustomVerificationEmailTemplateCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateCustomVerificationEmailTemplateRequest;
            output: {};
        };
        sdk: {
            input: UpdateCustomVerificationEmailTemplateCommandInput;
            output: UpdateCustomVerificationEmailTemplateCommandOutput;
        };
    };
}
