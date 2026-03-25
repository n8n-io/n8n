import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { UpdateEmailTemplateRequest, UpdateEmailTemplateResponse } from "../models/models_1";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateEmailTemplateCommand}.
 */
export interface UpdateEmailTemplateCommandInput extends UpdateEmailTemplateRequest {
}
/**
 * @public
 *
 * The output of {@link UpdateEmailTemplateCommand}.
 */
export interface UpdateEmailTemplateCommandOutput extends UpdateEmailTemplateResponse, __MetadataBearer {
}
declare const UpdateEmailTemplateCommand_base: {
    new (input: UpdateEmailTemplateCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateEmailTemplateCommandInput, UpdateEmailTemplateCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateEmailTemplateCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateEmailTemplateCommandInput, UpdateEmailTemplateCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Updates an email template. Email templates enable you to send personalized email to
 *             one or more destinations in a single API operation. For more information, see the <a href="https://docs.aws.amazon.com/ses/latest/DeveloperGuide/send-personalized-email-api.html">Amazon SES Developer
 *                 Guide</a>.</p>
 *          <p>You can execute this operation no more than once per second.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, UpdateEmailTemplateCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, UpdateEmailTemplateCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // UpdateEmailTemplateRequest
 *   TemplateName: "STRING_VALUE", // required
 *   TemplateContent: { // EmailTemplateContent
 *     Subject: "STRING_VALUE",
 *     Text: "STRING_VALUE",
 *     Html: "STRING_VALUE",
 *   },
 * };
 * const command = new UpdateEmailTemplateCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param UpdateEmailTemplateCommandInput - {@link UpdateEmailTemplateCommandInput}
 * @returns {@link UpdateEmailTemplateCommandOutput}
 * @see {@link UpdateEmailTemplateCommandInput} for command's `input` shape.
 * @see {@link UpdateEmailTemplateCommandOutput} for command's `response` shape.
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
export declare class UpdateEmailTemplateCommand extends UpdateEmailTemplateCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateEmailTemplateRequest;
            output: {};
        };
        sdk: {
            input: UpdateEmailTemplateCommandInput;
            output: UpdateEmailTemplateCommandOutput;
        };
    };
}
