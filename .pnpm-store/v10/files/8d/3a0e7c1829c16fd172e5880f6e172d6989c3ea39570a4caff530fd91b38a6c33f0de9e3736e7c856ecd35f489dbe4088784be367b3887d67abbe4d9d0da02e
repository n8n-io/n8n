import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutAccountDetailsRequest, PutAccountDetailsResponse } from "../models/models_1";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutAccountDetailsCommand}.
 */
export interface PutAccountDetailsCommandInput extends PutAccountDetailsRequest {
}
/**
 * @public
 *
 * The output of {@link PutAccountDetailsCommand}.
 */
export interface PutAccountDetailsCommandOutput extends PutAccountDetailsResponse, __MetadataBearer {
}
declare const PutAccountDetailsCommand_base: {
    new (input: PutAccountDetailsCommandInput): import("@smithy/smithy-client").CommandImpl<PutAccountDetailsCommandInput, PutAccountDetailsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: PutAccountDetailsCommandInput): import("@smithy/smithy-client").CommandImpl<PutAccountDetailsCommandInput, PutAccountDetailsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Update your Amazon SES account details.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, PutAccountDetailsCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, PutAccountDetailsCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // PutAccountDetailsRequest
 *   MailType: "MARKETING" || "TRANSACTIONAL", // required
 *   WebsiteURL: "STRING_VALUE", // required
 *   ContactLanguage: "EN" || "JA",
 *   UseCaseDescription: "STRING_VALUE",
 *   AdditionalContactEmailAddresses: [ // AdditionalContactEmailAddresses
 *     "STRING_VALUE",
 *   ],
 *   ProductionAccessEnabled: true || false,
 * };
 * const command = new PutAccountDetailsCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param PutAccountDetailsCommandInput - {@link PutAccountDetailsCommandInput}
 * @returns {@link PutAccountDetailsCommandOutput}
 * @see {@link PutAccountDetailsCommandInput} for command's `input` shape.
 * @see {@link PutAccountDetailsCommandOutput} for command's `response` shape.
 * @see {@link SESv2ClientResolvedConfig | config} for SESv2Client's `config` shape.
 *
 * @throws {@link BadRequestException} (client fault)
 *  <p>The input you provided is invalid.</p>
 *
 * @throws {@link ConflictException} (client fault)
 *  <p>If there is already an ongoing account details update under review.</p>
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
export declare class PutAccountDetailsCommand extends PutAccountDetailsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutAccountDetailsRequest;
            output: {};
        };
        sdk: {
            input: PutAccountDetailsCommandInput;
            output: PutAccountDetailsCommandOutput;
        };
    };
}
