import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetCustomVerificationEmailTemplateRequest, GetCustomVerificationEmailTemplateResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetCustomVerificationEmailTemplateCommand}.
 */
export interface GetCustomVerificationEmailTemplateCommandInput extends GetCustomVerificationEmailTemplateRequest {
}
/**
 * @public
 *
 * The output of {@link GetCustomVerificationEmailTemplateCommand}.
 */
export interface GetCustomVerificationEmailTemplateCommandOutput extends GetCustomVerificationEmailTemplateResponse, __MetadataBearer {
}
declare const GetCustomVerificationEmailTemplateCommand_base: {
    new (input: GetCustomVerificationEmailTemplateCommandInput): import("@smithy/smithy-client").CommandImpl<GetCustomVerificationEmailTemplateCommandInput, GetCustomVerificationEmailTemplateCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetCustomVerificationEmailTemplateCommandInput): import("@smithy/smithy-client").CommandImpl<GetCustomVerificationEmailTemplateCommandInput, GetCustomVerificationEmailTemplateCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Returns the custom email verification template for the template name you
 *             specify.</p>
 *          <p>For more information about custom verification email templates, see <a href="https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html#send-email-verify-address-custom">Using
 *                 custom verification email templates</a> in the <i>Amazon SES Developer
 *                 Guide</i>.</p>
 *          <p>You can execute this operation no more than once per second.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, GetCustomVerificationEmailTemplateCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, GetCustomVerificationEmailTemplateCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // GetCustomVerificationEmailTemplateRequest
 *   TemplateName: "STRING_VALUE", // required
 * };
 * const command = new GetCustomVerificationEmailTemplateCommand(input);
 * const response = await client.send(command);
 * // { // GetCustomVerificationEmailTemplateResponse
 * //   TemplateName: "STRING_VALUE",
 * //   FromEmailAddress: "STRING_VALUE",
 * //   TemplateSubject: "STRING_VALUE",
 * //   TemplateContent: "STRING_VALUE",
 * //   SuccessRedirectionURL: "STRING_VALUE",
 * //   FailureRedirectionURL: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param GetCustomVerificationEmailTemplateCommandInput - {@link GetCustomVerificationEmailTemplateCommandInput}
 * @returns {@link GetCustomVerificationEmailTemplateCommandOutput}
 * @see {@link GetCustomVerificationEmailTemplateCommandInput} for command's `input` shape.
 * @see {@link GetCustomVerificationEmailTemplateCommandOutput} for command's `response` shape.
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
export declare class GetCustomVerificationEmailTemplateCommand extends GetCustomVerificationEmailTemplateCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetCustomVerificationEmailTemplateRequest;
            output: GetCustomVerificationEmailTemplateResponse;
        };
        sdk: {
            input: GetCustomVerificationEmailTemplateCommandInput;
            output: GetCustomVerificationEmailTemplateCommandOutput;
        };
    };
}
