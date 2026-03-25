import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutEmailIdentityDkimSigningAttributesRequest, PutEmailIdentityDkimSigningAttributesResponse } from "../models/models_1";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutEmailIdentityDkimSigningAttributesCommand}.
 */
export interface PutEmailIdentityDkimSigningAttributesCommandInput extends PutEmailIdentityDkimSigningAttributesRequest {
}
/**
 * @public
 *
 * The output of {@link PutEmailIdentityDkimSigningAttributesCommand}.
 */
export interface PutEmailIdentityDkimSigningAttributesCommandOutput extends PutEmailIdentityDkimSigningAttributesResponse, __MetadataBearer {
}
declare const PutEmailIdentityDkimSigningAttributesCommand_base: {
    new (input: PutEmailIdentityDkimSigningAttributesCommandInput): import("@smithy/smithy-client").CommandImpl<PutEmailIdentityDkimSigningAttributesCommandInput, PutEmailIdentityDkimSigningAttributesCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: PutEmailIdentityDkimSigningAttributesCommandInput): import("@smithy/smithy-client").CommandImpl<PutEmailIdentityDkimSigningAttributesCommandInput, PutEmailIdentityDkimSigningAttributesCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Used to configure or change the DKIM authentication settings for an email domain
 *             identity. You can use this operation to do any of the following:</p>
 *          <ul>
 *             <li>
 *                <p>Update the signing attributes for an identity that uses Bring Your Own DKIM
 *                     (BYODKIM).</p>
 *             </li>
 *             <li>
 *                <p>Update the key length that should be used for Easy DKIM.</p>
 *             </li>
 *             <li>
 *                <p>Change from using no DKIM authentication to using Easy DKIM.</p>
 *             </li>
 *             <li>
 *                <p>Change from using no DKIM authentication to using BYODKIM.</p>
 *             </li>
 *             <li>
 *                <p>Change from using Easy DKIM to using BYODKIM.</p>
 *             </li>
 *             <li>
 *                <p>Change from using BYODKIM to using Easy DKIM.</p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, PutEmailIdentityDkimSigningAttributesCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, PutEmailIdentityDkimSigningAttributesCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // PutEmailIdentityDkimSigningAttributesRequest
 *   EmailIdentity: "STRING_VALUE", // required
 *   SigningAttributesOrigin: "AWS_SES" || "EXTERNAL" || "AWS_SES_AF_SOUTH_1" || "AWS_SES_EU_NORTH_1" || "AWS_SES_AP_SOUTH_1" || "AWS_SES_EU_WEST_3" || "AWS_SES_EU_WEST_2" || "AWS_SES_EU_SOUTH_1" || "AWS_SES_EU_WEST_1" || "AWS_SES_AP_NORTHEAST_3" || "AWS_SES_AP_NORTHEAST_2" || "AWS_SES_ME_SOUTH_1" || "AWS_SES_AP_NORTHEAST_1" || "AWS_SES_IL_CENTRAL_1" || "AWS_SES_SA_EAST_1" || "AWS_SES_CA_CENTRAL_1" || "AWS_SES_AP_SOUTHEAST_1" || "AWS_SES_AP_SOUTHEAST_2" || "AWS_SES_AP_SOUTHEAST_3" || "AWS_SES_EU_CENTRAL_1" || "AWS_SES_US_EAST_1" || "AWS_SES_US_EAST_2" || "AWS_SES_US_WEST_1" || "AWS_SES_US_WEST_2" || "AWS_SES_ME_CENTRAL_1" || "AWS_SES_AP_SOUTH_2" || "AWS_SES_EU_CENTRAL_2", // required
 *   SigningAttributes: { // DkimSigningAttributes
 *     DomainSigningSelector: "STRING_VALUE",
 *     DomainSigningPrivateKey: "STRING_VALUE",
 *     NextSigningKeyLength: "RSA_1024_BIT" || "RSA_2048_BIT",
 *     DomainSigningAttributesOrigin: "AWS_SES" || "EXTERNAL" || "AWS_SES_AF_SOUTH_1" || "AWS_SES_EU_NORTH_1" || "AWS_SES_AP_SOUTH_1" || "AWS_SES_EU_WEST_3" || "AWS_SES_EU_WEST_2" || "AWS_SES_EU_SOUTH_1" || "AWS_SES_EU_WEST_1" || "AWS_SES_AP_NORTHEAST_3" || "AWS_SES_AP_NORTHEAST_2" || "AWS_SES_ME_SOUTH_1" || "AWS_SES_AP_NORTHEAST_1" || "AWS_SES_IL_CENTRAL_1" || "AWS_SES_SA_EAST_1" || "AWS_SES_CA_CENTRAL_1" || "AWS_SES_AP_SOUTHEAST_1" || "AWS_SES_AP_SOUTHEAST_2" || "AWS_SES_AP_SOUTHEAST_3" || "AWS_SES_EU_CENTRAL_1" || "AWS_SES_US_EAST_1" || "AWS_SES_US_EAST_2" || "AWS_SES_US_WEST_1" || "AWS_SES_US_WEST_2" || "AWS_SES_ME_CENTRAL_1" || "AWS_SES_AP_SOUTH_2" || "AWS_SES_EU_CENTRAL_2",
 *   },
 * };
 * const command = new PutEmailIdentityDkimSigningAttributesCommand(input);
 * const response = await client.send(command);
 * // { // PutEmailIdentityDkimSigningAttributesResponse
 * //   DkimStatus: "PENDING" || "SUCCESS" || "FAILED" || "TEMPORARY_FAILURE" || "NOT_STARTED",
 * //   DkimTokens: [ // DnsTokenList
 * //     "STRING_VALUE",
 * //   ],
 * // };
 *
 * ```
 *
 * @param PutEmailIdentityDkimSigningAttributesCommandInput - {@link PutEmailIdentityDkimSigningAttributesCommandInput}
 * @returns {@link PutEmailIdentityDkimSigningAttributesCommandOutput}
 * @see {@link PutEmailIdentityDkimSigningAttributesCommandInput} for command's `input` shape.
 * @see {@link PutEmailIdentityDkimSigningAttributesCommandOutput} for command's `response` shape.
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
export declare class PutEmailIdentityDkimSigningAttributesCommand extends PutEmailIdentityDkimSigningAttributesCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutEmailIdentityDkimSigningAttributesRequest;
            output: PutEmailIdentityDkimSigningAttributesResponse;
        };
        sdk: {
            input: PutEmailIdentityDkimSigningAttributesCommandInput;
            output: PutEmailIdentityDkimSigningAttributesCommandOutput;
        };
    };
}
