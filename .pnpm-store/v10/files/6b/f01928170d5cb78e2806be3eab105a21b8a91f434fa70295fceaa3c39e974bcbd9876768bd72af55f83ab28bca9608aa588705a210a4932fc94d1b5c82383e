import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutAccountSendingAttributesRequest, PutAccountSendingAttributesResponse } from "../models/models_1";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutAccountSendingAttributesCommand}.
 */
export interface PutAccountSendingAttributesCommandInput extends PutAccountSendingAttributesRequest {
}
/**
 * @public
 *
 * The output of {@link PutAccountSendingAttributesCommand}.
 */
export interface PutAccountSendingAttributesCommandOutput extends PutAccountSendingAttributesResponse, __MetadataBearer {
}
declare const PutAccountSendingAttributesCommand_base: {
    new (input: PutAccountSendingAttributesCommandInput): import("@smithy/smithy-client").CommandImpl<PutAccountSendingAttributesCommandInput, PutAccountSendingAttributesCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [PutAccountSendingAttributesCommandInput]): import("@smithy/smithy-client").CommandImpl<PutAccountSendingAttributesCommandInput, PutAccountSendingAttributesCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Enable or disable the ability of your account to send email.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, PutAccountSendingAttributesCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, PutAccountSendingAttributesCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // PutAccountSendingAttributesRequest
 *   SendingEnabled: true || false,
 * };
 * const command = new PutAccountSendingAttributesCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param PutAccountSendingAttributesCommandInput - {@link PutAccountSendingAttributesCommandInput}
 * @returns {@link PutAccountSendingAttributesCommandOutput}
 * @see {@link PutAccountSendingAttributesCommandInput} for command's `input` shape.
 * @see {@link PutAccountSendingAttributesCommandOutput} for command's `response` shape.
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
export declare class PutAccountSendingAttributesCommand extends PutAccountSendingAttributesCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutAccountSendingAttributesRequest;
            output: {};
        };
        sdk: {
            input: PutAccountSendingAttributesCommandInput;
            output: PutAccountSendingAttributesCommandOutput;
        };
    };
}
