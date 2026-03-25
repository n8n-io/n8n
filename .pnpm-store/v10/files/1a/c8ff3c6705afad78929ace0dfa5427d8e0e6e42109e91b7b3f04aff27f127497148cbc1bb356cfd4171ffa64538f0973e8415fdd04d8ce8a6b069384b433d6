import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutEmailIdentityMailFromAttributesRequest, PutEmailIdentityMailFromAttributesResponse } from "../models/models_1";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutEmailIdentityMailFromAttributesCommand}.
 */
export interface PutEmailIdentityMailFromAttributesCommandInput extends PutEmailIdentityMailFromAttributesRequest {
}
/**
 * @public
 *
 * The output of {@link PutEmailIdentityMailFromAttributesCommand}.
 */
export interface PutEmailIdentityMailFromAttributesCommandOutput extends PutEmailIdentityMailFromAttributesResponse, __MetadataBearer {
}
declare const PutEmailIdentityMailFromAttributesCommand_base: {
    new (input: PutEmailIdentityMailFromAttributesCommandInput): import("@smithy/smithy-client").CommandImpl<PutEmailIdentityMailFromAttributesCommandInput, PutEmailIdentityMailFromAttributesCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: PutEmailIdentityMailFromAttributesCommandInput): import("@smithy/smithy-client").CommandImpl<PutEmailIdentityMailFromAttributesCommandInput, PutEmailIdentityMailFromAttributesCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Used to enable or disable the custom Mail-From domain configuration for an email
 *             identity.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, PutEmailIdentityMailFromAttributesCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, PutEmailIdentityMailFromAttributesCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // PutEmailIdentityMailFromAttributesRequest
 *   EmailIdentity: "STRING_VALUE", // required
 *   MailFromDomain: "STRING_VALUE",
 *   BehaviorOnMxFailure: "USE_DEFAULT_VALUE" || "REJECT_MESSAGE",
 * };
 * const command = new PutEmailIdentityMailFromAttributesCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param PutEmailIdentityMailFromAttributesCommandInput - {@link PutEmailIdentityMailFromAttributesCommandInput}
 * @returns {@link PutEmailIdentityMailFromAttributesCommandOutput}
 * @see {@link PutEmailIdentityMailFromAttributesCommandInput} for command's `input` shape.
 * @see {@link PutEmailIdentityMailFromAttributesCommandOutput} for command's `response` shape.
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
export declare class PutEmailIdentityMailFromAttributesCommand extends PutEmailIdentityMailFromAttributesCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutEmailIdentityMailFromAttributesRequest;
            output: {};
        };
        sdk: {
            input: PutEmailIdentityMailFromAttributesCommandInput;
            output: PutEmailIdentityMailFromAttributesCommandOutput;
        };
    };
}
