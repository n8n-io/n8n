import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutConfigurationSetArchivingOptionsRequest, PutConfigurationSetArchivingOptionsResponse } from "../models/models_1";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutConfigurationSetArchivingOptionsCommand}.
 */
export interface PutConfigurationSetArchivingOptionsCommandInput extends PutConfigurationSetArchivingOptionsRequest {
}
/**
 * @public
 *
 * The output of {@link PutConfigurationSetArchivingOptionsCommand}.
 */
export interface PutConfigurationSetArchivingOptionsCommandOutput extends PutConfigurationSetArchivingOptionsResponse, __MetadataBearer {
}
declare const PutConfigurationSetArchivingOptionsCommand_base: {
    new (input: PutConfigurationSetArchivingOptionsCommandInput): import("@smithy/smithy-client").CommandImpl<PutConfigurationSetArchivingOptionsCommandInput, PutConfigurationSetArchivingOptionsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: PutConfigurationSetArchivingOptionsCommandInput): import("@smithy/smithy-client").CommandImpl<PutConfigurationSetArchivingOptionsCommandInput, PutConfigurationSetArchivingOptionsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Associate the configuration set with a MailManager archive. When you send email using the
 *         <code>SendEmail</code> or <code>SendBulkEmail</code> operations the message as it will be given
 *         to the receiving SMTP server will be archived, along with the recipient information.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, PutConfigurationSetArchivingOptionsCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, PutConfigurationSetArchivingOptionsCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // PutConfigurationSetArchivingOptionsRequest
 *   ConfigurationSetName: "STRING_VALUE", // required
 *   ArchiveArn: "STRING_VALUE",
 * };
 * const command = new PutConfigurationSetArchivingOptionsCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param PutConfigurationSetArchivingOptionsCommandInput - {@link PutConfigurationSetArchivingOptionsCommandInput}
 * @returns {@link PutConfigurationSetArchivingOptionsCommandOutput}
 * @see {@link PutConfigurationSetArchivingOptionsCommandInput} for command's `input` shape.
 * @see {@link PutConfigurationSetArchivingOptionsCommandOutput} for command's `response` shape.
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
 * @example Used to associate an MailManager archive with a ConfigurationSet.
 * ```javascript
 * // This example associates an archive arn with a configuration set.
 * const input = {
 *   ArchiveArn: "arn:aws:ses:us-west-2:123456789012:mailmanager-archive/a-abcdefghijklmnopqrstuvwxyz",
 *   ConfigurationSetName: "sample-configuration-name"
 * };
 * const command = new PutConfigurationSetArchivingOptionsCommand(input);
 * const response = await client.send(command);
 * /* response is
 * { /* empty *\/ }
 * *\/
 * ```
 *
 * @public
 */
export declare class PutConfigurationSetArchivingOptionsCommand extends PutConfigurationSetArchivingOptionsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutConfigurationSetArchivingOptionsRequest;
            output: {};
        };
        sdk: {
            input: PutConfigurationSetArchivingOptionsCommandInput;
            output: PutConfigurationSetArchivingOptionsCommandOutput;
        };
    };
}
