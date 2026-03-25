import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutConfigurationSetTrackingOptionsRequest, PutConfigurationSetTrackingOptionsResponse } from "../models/models_1";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutConfigurationSetTrackingOptionsCommand}.
 */
export interface PutConfigurationSetTrackingOptionsCommandInput extends PutConfigurationSetTrackingOptionsRequest {
}
/**
 * @public
 *
 * The output of {@link PutConfigurationSetTrackingOptionsCommand}.
 */
export interface PutConfigurationSetTrackingOptionsCommandOutput extends PutConfigurationSetTrackingOptionsResponse, __MetadataBearer {
}
declare const PutConfigurationSetTrackingOptionsCommand_base: {
    new (input: PutConfigurationSetTrackingOptionsCommandInput): import("@smithy/smithy-client").CommandImpl<PutConfigurationSetTrackingOptionsCommandInput, PutConfigurationSetTrackingOptionsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: PutConfigurationSetTrackingOptionsCommandInput): import("@smithy/smithy-client").CommandImpl<PutConfigurationSetTrackingOptionsCommandInput, PutConfigurationSetTrackingOptionsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Specify a custom domain to use for open and click tracking elements in email that you
 *             send.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, PutConfigurationSetTrackingOptionsCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, PutConfigurationSetTrackingOptionsCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // PutConfigurationSetTrackingOptionsRequest
 *   ConfigurationSetName: "STRING_VALUE", // required
 *   CustomRedirectDomain: "STRING_VALUE",
 *   HttpsPolicy: "REQUIRE" || "REQUIRE_OPEN_ONLY" || "OPTIONAL",
 * };
 * const command = new PutConfigurationSetTrackingOptionsCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param PutConfigurationSetTrackingOptionsCommandInput - {@link PutConfigurationSetTrackingOptionsCommandInput}
 * @returns {@link PutConfigurationSetTrackingOptionsCommandOutput}
 * @see {@link PutConfigurationSetTrackingOptionsCommandInput} for command's `input` shape.
 * @see {@link PutConfigurationSetTrackingOptionsCommandOutput} for command's `response` shape.
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
export declare class PutConfigurationSetTrackingOptionsCommand extends PutConfigurationSetTrackingOptionsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutConfigurationSetTrackingOptionsRequest;
            output: {};
        };
        sdk: {
            input: PutConfigurationSetTrackingOptionsCommandInput;
            output: PutConfigurationSetTrackingOptionsCommandOutput;
        };
    };
}
