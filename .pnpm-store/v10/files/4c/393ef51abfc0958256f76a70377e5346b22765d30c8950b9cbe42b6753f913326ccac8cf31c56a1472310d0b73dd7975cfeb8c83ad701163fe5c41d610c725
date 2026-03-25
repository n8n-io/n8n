import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutConfigurationSetDeliveryOptionsRequest, PutConfigurationSetDeliveryOptionsResponse } from "../models/models_1";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutConfigurationSetDeliveryOptionsCommand}.
 */
export interface PutConfigurationSetDeliveryOptionsCommandInput extends PutConfigurationSetDeliveryOptionsRequest {
}
/**
 * @public
 *
 * The output of {@link PutConfigurationSetDeliveryOptionsCommand}.
 */
export interface PutConfigurationSetDeliveryOptionsCommandOutput extends PutConfigurationSetDeliveryOptionsResponse, __MetadataBearer {
}
declare const PutConfigurationSetDeliveryOptionsCommand_base: {
    new (input: PutConfigurationSetDeliveryOptionsCommandInput): import("@smithy/smithy-client").CommandImpl<PutConfigurationSetDeliveryOptionsCommandInput, PutConfigurationSetDeliveryOptionsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: PutConfigurationSetDeliveryOptionsCommandInput): import("@smithy/smithy-client").CommandImpl<PutConfigurationSetDeliveryOptionsCommandInput, PutConfigurationSetDeliveryOptionsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Associate a configuration set with a dedicated IP pool. You can use dedicated IP pools
 *             to create groups of dedicated IP addresses for sending specific types of email.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, PutConfigurationSetDeliveryOptionsCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, PutConfigurationSetDeliveryOptionsCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // PutConfigurationSetDeliveryOptionsRequest
 *   ConfigurationSetName: "STRING_VALUE", // required
 *   TlsPolicy: "REQUIRE" || "OPTIONAL",
 *   SendingPoolName: "STRING_VALUE",
 *   MaxDeliverySeconds: Number("long"),
 * };
 * const command = new PutConfigurationSetDeliveryOptionsCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param PutConfigurationSetDeliveryOptionsCommandInput - {@link PutConfigurationSetDeliveryOptionsCommandInput}
 * @returns {@link PutConfigurationSetDeliveryOptionsCommandOutput}
 * @see {@link PutConfigurationSetDeliveryOptionsCommandInput} for command's `input` shape.
 * @see {@link PutConfigurationSetDeliveryOptionsCommandOutput} for command's `response` shape.
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
export declare class PutConfigurationSetDeliveryOptionsCommand extends PutConfigurationSetDeliveryOptionsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutConfigurationSetDeliveryOptionsRequest;
            output: {};
        };
        sdk: {
            input: PutConfigurationSetDeliveryOptionsCommandInput;
            output: PutConfigurationSetDeliveryOptionsCommandOutput;
        };
    };
}
