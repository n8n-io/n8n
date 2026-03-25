import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutEmailIdentityFeedbackAttributesRequest, PutEmailIdentityFeedbackAttributesResponse } from "../models/models_1";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutEmailIdentityFeedbackAttributesCommand}.
 */
export interface PutEmailIdentityFeedbackAttributesCommandInput extends PutEmailIdentityFeedbackAttributesRequest {
}
/**
 * @public
 *
 * The output of {@link PutEmailIdentityFeedbackAttributesCommand}.
 */
export interface PutEmailIdentityFeedbackAttributesCommandOutput extends PutEmailIdentityFeedbackAttributesResponse, __MetadataBearer {
}
declare const PutEmailIdentityFeedbackAttributesCommand_base: {
    new (input: PutEmailIdentityFeedbackAttributesCommandInput): import("@smithy/smithy-client").CommandImpl<PutEmailIdentityFeedbackAttributesCommandInput, PutEmailIdentityFeedbackAttributesCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: PutEmailIdentityFeedbackAttributesCommandInput): import("@smithy/smithy-client").CommandImpl<PutEmailIdentityFeedbackAttributesCommandInput, PutEmailIdentityFeedbackAttributesCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Used to enable or disable feedback forwarding for an identity. This setting determines
 *             what happens when an identity is used to send an email that results in a bounce or
 *             complaint event.</p>
 *          <p>If the value is <code>true</code>, you receive email notifications when bounce or
 *             complaint events occur. These notifications are sent to the address that you specified
 *             in the <code>Return-Path</code> header of the original email.</p>
 *          <p>You're required to have a method of tracking bounces and complaints. If you haven't
 *             set up another mechanism for receiving bounce or complaint notifications (for example,
 *             by setting up an event destination), you receive an email notification when these events
 *             occur (even if this setting is disabled).</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, PutEmailIdentityFeedbackAttributesCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, PutEmailIdentityFeedbackAttributesCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // PutEmailIdentityFeedbackAttributesRequest
 *   EmailIdentity: "STRING_VALUE", // required
 *   EmailForwardingEnabled: true || false,
 * };
 * const command = new PutEmailIdentityFeedbackAttributesCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param PutEmailIdentityFeedbackAttributesCommandInput - {@link PutEmailIdentityFeedbackAttributesCommandInput}
 * @returns {@link PutEmailIdentityFeedbackAttributesCommandOutput}
 * @see {@link PutEmailIdentityFeedbackAttributesCommandInput} for command's `input` shape.
 * @see {@link PutEmailIdentityFeedbackAttributesCommandOutput} for command's `response` shape.
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
export declare class PutEmailIdentityFeedbackAttributesCommand extends PutEmailIdentityFeedbackAttributesCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutEmailIdentityFeedbackAttributesRequest;
            output: {};
        };
        sdk: {
            input: PutEmailIdentityFeedbackAttributesCommandInput;
            output: PutEmailIdentityFeedbackAttributesCommandOutput;
        };
    };
}
