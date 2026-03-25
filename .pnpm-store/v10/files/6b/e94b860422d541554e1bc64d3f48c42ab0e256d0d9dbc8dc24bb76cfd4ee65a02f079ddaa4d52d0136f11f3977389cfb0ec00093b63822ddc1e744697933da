import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutConfigurationSetSendingOptionsRequest, PutConfigurationSetSendingOptionsResponse } from "../models/models_1";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutConfigurationSetSendingOptionsCommand}.
 */
export interface PutConfigurationSetSendingOptionsCommandInput extends PutConfigurationSetSendingOptionsRequest {
}
/**
 * @public
 *
 * The output of {@link PutConfigurationSetSendingOptionsCommand}.
 */
export interface PutConfigurationSetSendingOptionsCommandOutput extends PutConfigurationSetSendingOptionsResponse, __MetadataBearer {
}
declare const PutConfigurationSetSendingOptionsCommand_base: {
    new (input: PutConfigurationSetSendingOptionsCommandInput): import("@smithy/smithy-client").CommandImpl<PutConfigurationSetSendingOptionsCommandInput, PutConfigurationSetSendingOptionsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: PutConfigurationSetSendingOptionsCommandInput): import("@smithy/smithy-client").CommandImpl<PutConfigurationSetSendingOptionsCommandInput, PutConfigurationSetSendingOptionsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Enable or disable email sending for messages that use a particular configuration set
 *             in a specific Amazon Web Services Region.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, PutConfigurationSetSendingOptionsCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, PutConfigurationSetSendingOptionsCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // PutConfigurationSetSendingOptionsRequest
 *   ConfigurationSetName: "STRING_VALUE", // required
 *   SendingEnabled: true || false,
 * };
 * const command = new PutConfigurationSetSendingOptionsCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param PutConfigurationSetSendingOptionsCommandInput - {@link PutConfigurationSetSendingOptionsCommandInput}
 * @returns {@link PutConfigurationSetSendingOptionsCommandOutput}
 * @see {@link PutConfigurationSetSendingOptionsCommandInput} for command's `input` shape.
 * @see {@link PutConfigurationSetSendingOptionsCommandOutput} for command's `response` shape.
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
export declare class PutConfigurationSetSendingOptionsCommand extends PutConfigurationSetSendingOptionsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutConfigurationSetSendingOptionsRequest;
            output: {};
        };
        sdk: {
            input: PutConfigurationSetSendingOptionsCommandInput;
            output: PutConfigurationSetSendingOptionsCommandOutput;
        };
    };
}
