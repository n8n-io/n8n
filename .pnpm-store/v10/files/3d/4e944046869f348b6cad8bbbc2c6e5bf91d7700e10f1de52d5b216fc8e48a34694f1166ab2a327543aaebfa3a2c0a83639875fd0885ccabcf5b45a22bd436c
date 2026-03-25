import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutEmailIdentityConfigurationSetAttributesRequest, PutEmailIdentityConfigurationSetAttributesResponse } from "../models/models_1";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutEmailIdentityConfigurationSetAttributesCommand}.
 */
export interface PutEmailIdentityConfigurationSetAttributesCommandInput extends PutEmailIdentityConfigurationSetAttributesRequest {
}
/**
 * @public
 *
 * The output of {@link PutEmailIdentityConfigurationSetAttributesCommand}.
 */
export interface PutEmailIdentityConfigurationSetAttributesCommandOutput extends PutEmailIdentityConfigurationSetAttributesResponse, __MetadataBearer {
}
declare const PutEmailIdentityConfigurationSetAttributesCommand_base: {
    new (input: PutEmailIdentityConfigurationSetAttributesCommandInput): import("@smithy/smithy-client").CommandImpl<PutEmailIdentityConfigurationSetAttributesCommandInput, PutEmailIdentityConfigurationSetAttributesCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: PutEmailIdentityConfigurationSetAttributesCommandInput): import("@smithy/smithy-client").CommandImpl<PutEmailIdentityConfigurationSetAttributesCommandInput, PutEmailIdentityConfigurationSetAttributesCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Used to associate a configuration set with an email identity.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, PutEmailIdentityConfigurationSetAttributesCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, PutEmailIdentityConfigurationSetAttributesCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // PutEmailIdentityConfigurationSetAttributesRequest
 *   EmailIdentity: "STRING_VALUE", // required
 *   ConfigurationSetName: "STRING_VALUE",
 * };
 * const command = new PutEmailIdentityConfigurationSetAttributesCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param PutEmailIdentityConfigurationSetAttributesCommandInput - {@link PutEmailIdentityConfigurationSetAttributesCommandInput}
 * @returns {@link PutEmailIdentityConfigurationSetAttributesCommandOutput}
 * @see {@link PutEmailIdentityConfigurationSetAttributesCommandInput} for command's `input` shape.
 * @see {@link PutEmailIdentityConfigurationSetAttributesCommandOutput} for command's `response` shape.
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
export declare class PutEmailIdentityConfigurationSetAttributesCommand extends PutEmailIdentityConfigurationSetAttributesCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutEmailIdentityConfigurationSetAttributesRequest;
            output: {};
        };
        sdk: {
            input: PutEmailIdentityConfigurationSetAttributesCommandInput;
            output: PutEmailIdentityConfigurationSetAttributesCommandOutput;
        };
    };
}
