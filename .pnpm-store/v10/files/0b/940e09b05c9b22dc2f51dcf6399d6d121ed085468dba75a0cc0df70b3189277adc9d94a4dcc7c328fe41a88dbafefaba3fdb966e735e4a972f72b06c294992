import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutSuppressedDestinationRequest, PutSuppressedDestinationResponse } from "../models/models_1";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutSuppressedDestinationCommand}.
 */
export interface PutSuppressedDestinationCommandInput extends PutSuppressedDestinationRequest {
}
/**
 * @public
 *
 * The output of {@link PutSuppressedDestinationCommand}.
 */
export interface PutSuppressedDestinationCommandOutput extends PutSuppressedDestinationResponse, __MetadataBearer {
}
declare const PutSuppressedDestinationCommand_base: {
    new (input: PutSuppressedDestinationCommandInput): import("@smithy/smithy-client").CommandImpl<PutSuppressedDestinationCommandInput, PutSuppressedDestinationCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: PutSuppressedDestinationCommandInput): import("@smithy/smithy-client").CommandImpl<PutSuppressedDestinationCommandInput, PutSuppressedDestinationCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Adds an email address to the suppression list for your account.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, PutSuppressedDestinationCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, PutSuppressedDestinationCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // PutSuppressedDestinationRequest
 *   EmailAddress: "STRING_VALUE", // required
 *   Reason: "BOUNCE" || "COMPLAINT", // required
 * };
 * const command = new PutSuppressedDestinationCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param PutSuppressedDestinationCommandInput - {@link PutSuppressedDestinationCommandInput}
 * @returns {@link PutSuppressedDestinationCommandOutput}
 * @see {@link PutSuppressedDestinationCommandInput} for command's `input` shape.
 * @see {@link PutSuppressedDestinationCommandOutput} for command's `response` shape.
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
export declare class PutSuppressedDestinationCommand extends PutSuppressedDestinationCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutSuppressedDestinationRequest;
            output: {};
        };
        sdk: {
            input: PutSuppressedDestinationCommandInput;
            output: PutSuppressedDestinationCommandOutput;
        };
    };
}
