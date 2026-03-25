import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetDomainStatisticsReportRequest, GetDomainStatisticsReportResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetDomainStatisticsReportCommand}.
 */
export interface GetDomainStatisticsReportCommandInput extends GetDomainStatisticsReportRequest {
}
/**
 * @public
 *
 * The output of {@link GetDomainStatisticsReportCommand}.
 */
export interface GetDomainStatisticsReportCommandOutput extends GetDomainStatisticsReportResponse, __MetadataBearer {
}
declare const GetDomainStatisticsReportCommand_base: {
    new (input: GetDomainStatisticsReportCommandInput): import("@smithy/smithy-client").CommandImpl<GetDomainStatisticsReportCommandInput, GetDomainStatisticsReportCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetDomainStatisticsReportCommandInput): import("@smithy/smithy-client").CommandImpl<GetDomainStatisticsReportCommandInput, GetDomainStatisticsReportCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Retrieve inbox placement and engagement rates for the domains that you use to send
 *             email.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, GetDomainStatisticsReportCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, GetDomainStatisticsReportCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // GetDomainStatisticsReportRequest
 *   Domain: "STRING_VALUE", // required
 *   StartDate: new Date("TIMESTAMP"), // required
 *   EndDate: new Date("TIMESTAMP"), // required
 * };
 * const command = new GetDomainStatisticsReportCommand(input);
 * const response = await client.send(command);
 * // { // GetDomainStatisticsReportResponse
 * //   OverallVolume: { // OverallVolume
 * //     VolumeStatistics: { // VolumeStatistics
 * //       InboxRawCount: Number("long"),
 * //       SpamRawCount: Number("long"),
 * //       ProjectedInbox: Number("long"),
 * //       ProjectedSpam: Number("long"),
 * //     },
 * //     ReadRatePercent: Number("double"),
 * //     DomainIspPlacements: [ // DomainIspPlacements
 * //       { // DomainIspPlacement
 * //         IspName: "STRING_VALUE",
 * //         InboxRawCount: Number("long"),
 * //         SpamRawCount: Number("long"),
 * //         InboxPercentage: Number("double"),
 * //         SpamPercentage: Number("double"),
 * //       },
 * //     ],
 * //   },
 * //   DailyVolumes: [ // DailyVolumes // required
 * //     { // DailyVolume
 * //       StartDate: new Date("TIMESTAMP"),
 * //       VolumeStatistics: {
 * //         InboxRawCount: Number("long"),
 * //         SpamRawCount: Number("long"),
 * //         ProjectedInbox: Number("long"),
 * //         ProjectedSpam: Number("long"),
 * //       },
 * //       DomainIspPlacements: [
 * //         {
 * //           IspName: "STRING_VALUE",
 * //           InboxRawCount: Number("long"),
 * //           SpamRawCount: Number("long"),
 * //           InboxPercentage: Number("double"),
 * //           SpamPercentage: Number("double"),
 * //         },
 * //       ],
 * //     },
 * //   ],
 * // };
 *
 * ```
 *
 * @param GetDomainStatisticsReportCommandInput - {@link GetDomainStatisticsReportCommandInput}
 * @returns {@link GetDomainStatisticsReportCommandOutput}
 * @see {@link GetDomainStatisticsReportCommandInput} for command's `input` shape.
 * @see {@link GetDomainStatisticsReportCommandOutput} for command's `response` shape.
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
export declare class GetDomainStatisticsReportCommand extends GetDomainStatisticsReportCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetDomainStatisticsReportRequest;
            output: GetDomainStatisticsReportResponse;
        };
        sdk: {
            input: GetDomainStatisticsReportCommandInput;
            output: GetDomainStatisticsReportCommandOutput;
        };
    };
}
