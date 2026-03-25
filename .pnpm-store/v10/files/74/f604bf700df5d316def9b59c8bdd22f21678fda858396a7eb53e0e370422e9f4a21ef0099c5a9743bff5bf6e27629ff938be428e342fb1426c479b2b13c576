import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteEmailTemplateRequest, DeleteEmailTemplateResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteEmailTemplateCommand}.
 */
export interface DeleteEmailTemplateCommandInput extends DeleteEmailTemplateRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteEmailTemplateCommand}.
 */
export interface DeleteEmailTemplateCommandOutput extends DeleteEmailTemplateResponse, __MetadataBearer {
}
declare const DeleteEmailTemplateCommand_base: {
    new (input: DeleteEmailTemplateCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteEmailTemplateCommandInput, DeleteEmailTemplateCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteEmailTemplateCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteEmailTemplateCommandInput, DeleteEmailTemplateCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes an email template.</p>
 *          <p>You can execute this operation no more than once per second.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, DeleteEmailTemplateCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, DeleteEmailTemplateCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // DeleteEmailTemplateRequest
 *   TemplateName: "STRING_VALUE", // required
 * };
 * const command = new DeleteEmailTemplateCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteEmailTemplateCommandInput - {@link DeleteEmailTemplateCommandInput}
 * @returns {@link DeleteEmailTemplateCommandOutput}
 * @see {@link DeleteEmailTemplateCommandInput} for command's `input` shape.
 * @see {@link DeleteEmailTemplateCommandOutput} for command's `response` shape.
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
export declare class DeleteEmailTemplateCommand extends DeleteEmailTemplateCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteEmailTemplateRequest;
            output: {};
        };
        sdk: {
            input: DeleteEmailTemplateCommandInput;
            output: DeleteEmailTemplateCommandOutput;
        };
    };
}
