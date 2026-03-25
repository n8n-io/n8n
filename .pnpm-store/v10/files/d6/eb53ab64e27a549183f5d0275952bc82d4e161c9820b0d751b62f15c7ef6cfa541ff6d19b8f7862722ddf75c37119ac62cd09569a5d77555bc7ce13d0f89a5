import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListCustomVerificationEmailTemplatesRequest, ListCustomVerificationEmailTemplatesResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListCustomVerificationEmailTemplatesCommand}.
 */
export interface ListCustomVerificationEmailTemplatesCommandInput extends ListCustomVerificationEmailTemplatesRequest {
}
/**
 * @public
 *
 * The output of {@link ListCustomVerificationEmailTemplatesCommand}.
 */
export interface ListCustomVerificationEmailTemplatesCommandOutput extends ListCustomVerificationEmailTemplatesResponse, __MetadataBearer {
}
declare const ListCustomVerificationEmailTemplatesCommand_base: {
    new (input: ListCustomVerificationEmailTemplatesCommandInput): import("@smithy/smithy-client").CommandImpl<ListCustomVerificationEmailTemplatesCommandInput, ListCustomVerificationEmailTemplatesCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListCustomVerificationEmailTemplatesCommandInput]): import("@smithy/smithy-client").CommandImpl<ListCustomVerificationEmailTemplatesCommandInput, ListCustomVerificationEmailTemplatesCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists the existing custom verification email templates for your account in the current
 *                 Amazon Web Services Region.</p>
 *          <p>For more information about custom verification email templates, see <a href="https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html#send-email-verify-address-custom">Using
 *                 custom verification email templates</a> in the <i>Amazon SES Developer
 *                 Guide</i>.</p>
 *          <p>You can execute this operation no more than once per second.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, ListCustomVerificationEmailTemplatesCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, ListCustomVerificationEmailTemplatesCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // ListCustomVerificationEmailTemplatesRequest
 *   NextToken: "STRING_VALUE",
 *   PageSize: Number("int"),
 * };
 * const command = new ListCustomVerificationEmailTemplatesCommand(input);
 * const response = await client.send(command);
 * // { // ListCustomVerificationEmailTemplatesResponse
 * //   CustomVerificationEmailTemplates: [ // CustomVerificationEmailTemplatesList
 * //     { // CustomVerificationEmailTemplateMetadata
 * //       TemplateName: "STRING_VALUE",
 * //       FromEmailAddress: "STRING_VALUE",
 * //       TemplateSubject: "STRING_VALUE",
 * //       SuccessRedirectionURL: "STRING_VALUE",
 * //       FailureRedirectionURL: "STRING_VALUE",
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListCustomVerificationEmailTemplatesCommandInput - {@link ListCustomVerificationEmailTemplatesCommandInput}
 * @returns {@link ListCustomVerificationEmailTemplatesCommandOutput}
 * @see {@link ListCustomVerificationEmailTemplatesCommandInput} for command's `input` shape.
 * @see {@link ListCustomVerificationEmailTemplatesCommandOutput} for command's `response` shape.
 * @see {@link SESv2ClientResolvedConfig | config} for SESv2Client's `config` shape.
 *
 * @throws {@link BadRequestException} (client fault)
 *  <p>The input you provided is invalid.</p>
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
export declare class ListCustomVerificationEmailTemplatesCommand extends ListCustomVerificationEmailTemplatesCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListCustomVerificationEmailTemplatesRequest;
            output: ListCustomVerificationEmailTemplatesResponse;
        };
        sdk: {
            input: ListCustomVerificationEmailTemplatesCommandInput;
            output: ListCustomVerificationEmailTemplatesCommandOutput;
        };
    };
}
