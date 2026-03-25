import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutConfigurationSetReputationOptionsRequest, PutConfigurationSetReputationOptionsResponse } from "../models/models_1";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutConfigurationSetReputationOptionsCommand}.
 */
export interface PutConfigurationSetReputationOptionsCommandInput extends PutConfigurationSetReputationOptionsRequest {
}
/**
 * @public
 *
 * The output of {@link PutConfigurationSetReputationOptionsCommand}.
 */
export interface PutConfigurationSetReputationOptionsCommandOutput extends PutConfigurationSetReputationOptionsResponse, __MetadataBearer {
}
declare const PutConfigurationSetReputationOptionsCommand_base: {
    new (input: PutConfigurationSetReputationOptionsCommandInput): import("@smithy/smithy-client").CommandImpl<PutConfigurationSetReputationOptionsCommandInput, PutConfigurationSetReputationOptionsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: PutConfigurationSetReputationOptionsCommandInput): import("@smithy/smithy-client").CommandImpl<PutConfigurationSetReputationOptionsCommandInput, PutConfigurationSetReputationOptionsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Enable or disable collection of reputation metrics for emails that you send using a
 *             particular configuration set in a specific Amazon Web Services Region.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, PutConfigurationSetReputationOptionsCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, PutConfigurationSetReputationOptionsCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // PutConfigurationSetReputationOptionsRequest
 *   ConfigurationSetName: "STRING_VALUE", // required
 *   ReputationMetricsEnabled: true || false,
 * };
 * const command = new PutConfigurationSetReputationOptionsCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param PutConfigurationSetReputationOptionsCommandInput - {@link PutConfigurationSetReputationOptionsCommandInput}
 * @returns {@link PutConfigurationSetReputationOptionsCommandOutput}
 * @see {@link PutConfigurationSetReputationOptionsCommandInput} for command's `input` shape.
 * @see {@link PutConfigurationSetReputationOptionsCommandOutput} for command's `response` shape.
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
export declare class PutConfigurationSetReputationOptionsCommand extends PutConfigurationSetReputationOptionsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutConfigurationSetReputationOptionsRequest;
            output: {};
        };
        sdk: {
            input: PutConfigurationSetReputationOptionsCommandInput;
            output: PutConfigurationSetReputationOptionsCommandOutput;
        };
    };
}
