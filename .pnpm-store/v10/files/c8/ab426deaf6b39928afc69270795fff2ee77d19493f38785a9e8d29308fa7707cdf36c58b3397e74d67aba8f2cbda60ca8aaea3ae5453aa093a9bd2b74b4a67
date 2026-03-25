import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetDomainDeliverabilityCampaignRequest, GetDomainDeliverabilityCampaignResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetDomainDeliverabilityCampaignCommand}.
 */
export interface GetDomainDeliverabilityCampaignCommandInput extends GetDomainDeliverabilityCampaignRequest {
}
/**
 * @public
 *
 * The output of {@link GetDomainDeliverabilityCampaignCommand}.
 */
export interface GetDomainDeliverabilityCampaignCommandOutput extends GetDomainDeliverabilityCampaignResponse, __MetadataBearer {
}
declare const GetDomainDeliverabilityCampaignCommand_base: {
    new (input: GetDomainDeliverabilityCampaignCommandInput): import("@smithy/smithy-client").CommandImpl<GetDomainDeliverabilityCampaignCommandInput, GetDomainDeliverabilityCampaignCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetDomainDeliverabilityCampaignCommandInput): import("@smithy/smithy-client").CommandImpl<GetDomainDeliverabilityCampaignCommandInput, GetDomainDeliverabilityCampaignCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Retrieve all the deliverability data for a specific campaign. This data is available
 *             for a campaign only if the campaign sent email by using a domain that the
 *             Deliverability dashboard is enabled for.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, GetDomainDeliverabilityCampaignCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, GetDomainDeliverabilityCampaignCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // GetDomainDeliverabilityCampaignRequest
 *   CampaignId: "STRING_VALUE", // required
 * };
 * const command = new GetDomainDeliverabilityCampaignCommand(input);
 * const response = await client.send(command);
 * // { // GetDomainDeliverabilityCampaignResponse
 * //   DomainDeliverabilityCampaign: { // DomainDeliverabilityCampaign
 * //     CampaignId: "STRING_VALUE",
 * //     ImageUrl: "STRING_VALUE",
 * //     Subject: "STRING_VALUE",
 * //     FromAddress: "STRING_VALUE",
 * //     SendingIps: [ // IpList
 * //       "STRING_VALUE",
 * //     ],
 * //     FirstSeenDateTime: new Date("TIMESTAMP"),
 * //     LastSeenDateTime: new Date("TIMESTAMP"),
 * //     InboxCount: Number("long"),
 * //     SpamCount: Number("long"),
 * //     ReadRate: Number("double"),
 * //     DeleteRate: Number("double"),
 * //     ReadDeleteRate: Number("double"),
 * //     ProjectedVolume: Number("long"),
 * //     Esps: [ // Esps
 * //       "STRING_VALUE",
 * //     ],
 * //   },
 * // };
 *
 * ```
 *
 * @param GetDomainDeliverabilityCampaignCommandInput - {@link GetDomainDeliverabilityCampaignCommandInput}
 * @returns {@link GetDomainDeliverabilityCampaignCommandOutput}
 * @see {@link GetDomainDeliverabilityCampaignCommandInput} for command's `input` shape.
 * @see {@link GetDomainDeliverabilityCampaignCommandOutput} for command's `response` shape.
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
export declare class GetDomainDeliverabilityCampaignCommand extends GetDomainDeliverabilityCampaignCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetDomainDeliverabilityCampaignRequest;
            output: GetDomainDeliverabilityCampaignResponse;
        };
        sdk: {
            input: GetDomainDeliverabilityCampaignCommandInput;
            output: GetDomainDeliverabilityCampaignCommandOutput;
        };
    };
}
