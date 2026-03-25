import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteCustomVerificationEmailTemplateRequest, DeleteCustomVerificationEmailTemplateResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteCustomVerificationEmailTemplateCommand}.
 */
export interface DeleteCustomVerificationEmailTemplateCommandInput extends DeleteCustomVerificationEmailTemplateRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteCustomVerificationEmailTemplateCommand}.
 */
export interface DeleteCustomVerificationEmailTemplateCommandOutput extends DeleteCustomVerificationEmailTemplateResponse, __MetadataBearer {
}
declare const DeleteCustomVerificationEmailTemplateCommand_base: {
    new (input: DeleteCustomVerificationEmailTemplateCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteCustomVerificationEmailTemplateCommandInput, DeleteCustomVerificationEmailTemplateCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteCustomVerificationEmailTemplateCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteCustomVerificationEmailTemplateCommandInput, DeleteCustomVerificationEmailTemplateCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes an existing custom verification email template.</p>
 *          <p>For more information about custom verification email templates, see <a href="https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html#send-email-verify-address-custom">Using
 *                 custom verification email templates</a> in the <i>Amazon SES Developer
 *                 Guide</i>.</p>
 *          <p>You can execute this operation no more than once per second.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, DeleteCustomVerificationEmailTemplateCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, DeleteCustomVerificationEmailTemplateCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // DeleteCustomVerificationEmailTemplateRequest
 *   TemplateName: "STRING_VALUE", // required
 * };
 * const command = new DeleteCustomVerificationEmailTemplateCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteCustomVerificationEmailTemplateCommandInput - {@link DeleteCustomVerificationEmailTemplateCommandInput}
 * @returns {@link DeleteCustomVerificationEmailTemplateCommandOutput}
 * @see {@link DeleteCustomVerificationEmailTemplateCommandInput} for command's `input` shape.
 * @see {@link DeleteCustomVerificationEmailTemplateCommandOutput} for command's `response` shape.
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
export declare class DeleteCustomVerificationEmailTemplateCommand extends DeleteCustomVerificationEmailTemplateCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteCustomVerificationEmailTemplateRequest;
            output: {};
        };
        sdk: {
            input: DeleteCustomVerificationEmailTemplateCommandInput;
            output: DeleteCustomVerificationEmailTemplateCommandOutput;
        };
    };
}
