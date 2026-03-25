import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutEmailIdentityDkimAttributesRequest, PutEmailIdentityDkimAttributesResponse } from "../models/models_1";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutEmailIdentityDkimAttributesCommand}.
 */
export interface PutEmailIdentityDkimAttributesCommandInput extends PutEmailIdentityDkimAttributesRequest {
}
/**
 * @public
 *
 * The output of {@link PutEmailIdentityDkimAttributesCommand}.
 */
export interface PutEmailIdentityDkimAttributesCommandOutput extends PutEmailIdentityDkimAttributesResponse, __MetadataBearer {
}
declare const PutEmailIdentityDkimAttributesCommand_base: {
    new (input: PutEmailIdentityDkimAttributesCommandInput): import("@smithy/smithy-client").CommandImpl<PutEmailIdentityDkimAttributesCommandInput, PutEmailIdentityDkimAttributesCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: PutEmailIdentityDkimAttributesCommandInput): import("@smithy/smithy-client").CommandImpl<PutEmailIdentityDkimAttributesCommandInput, PutEmailIdentityDkimAttributesCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Used to enable or disable DKIM authentication for an email identity.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, PutEmailIdentityDkimAttributesCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, PutEmailIdentityDkimAttributesCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // PutEmailIdentityDkimAttributesRequest
 *   EmailIdentity: "STRING_VALUE", // required
 *   SigningEnabled: true || false,
 * };
 * const command = new PutEmailIdentityDkimAttributesCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param PutEmailIdentityDkimAttributesCommandInput - {@link PutEmailIdentityDkimAttributesCommandInput}
 * @returns {@link PutEmailIdentityDkimAttributesCommandOutput}
 * @see {@link PutEmailIdentityDkimAttributesCommandInput} for command's `input` shape.
 * @see {@link PutEmailIdentityDkimAttributesCommandOutput} for command's `response` shape.
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
export declare class PutEmailIdentityDkimAttributesCommand extends PutEmailIdentityDkimAttributesCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutEmailIdentityDkimAttributesRequest;
            output: {};
        };
        sdk: {
            input: PutEmailIdentityDkimAttributesCommandInput;
            output: PutEmailIdentityDkimAttributesCommandOutput;
        };
    };
}
