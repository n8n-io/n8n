import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetDeliverabilityTestReportRequest, GetDeliverabilityTestReportResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetDeliverabilityTestReportCommand}.
 */
export interface GetDeliverabilityTestReportCommandInput extends GetDeliverabilityTestReportRequest {
}
/**
 * @public
 *
 * The output of {@link GetDeliverabilityTestReportCommand}.
 */
export interface GetDeliverabilityTestReportCommandOutput extends GetDeliverabilityTestReportResponse, __MetadataBearer {
}
declare const GetDeliverabilityTestReportCommand_base: {
    new (input: GetDeliverabilityTestReportCommandInput): import("@smithy/smithy-client").CommandImpl<GetDeliverabilityTestReportCommandInput, GetDeliverabilityTestReportCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetDeliverabilityTestReportCommandInput): import("@smithy/smithy-client").CommandImpl<GetDeliverabilityTestReportCommandInput, GetDeliverabilityTestReportCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Retrieve the results of a predictive inbox placement test.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, GetDeliverabilityTestReportCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, GetDeliverabilityTestReportCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // GetDeliverabilityTestReportRequest
 *   ReportId: "STRING_VALUE", // required
 * };
 * const command = new GetDeliverabilityTestReportCommand(input);
 * const response = await client.send(command);
 * // { // GetDeliverabilityTestReportResponse
 * //   DeliverabilityTestReport: { // DeliverabilityTestReport
 * //     ReportId: "STRING_VALUE",
 * //     ReportName: "STRING_VALUE",
 * //     Subject: "STRING_VALUE",
 * //     FromEmailAddress: "STRING_VALUE",
 * //     CreateDate: new Date("TIMESTAMP"),
 * //     DeliverabilityTestStatus: "IN_PROGRESS" || "COMPLETED",
 * //   },
 * //   OverallPlacement: { // PlacementStatistics
 * //     InboxPercentage: Number("double"),
 * //     SpamPercentage: Number("double"),
 * //     MissingPercentage: Number("double"),
 * //     SpfPercentage: Number("double"),
 * //     DkimPercentage: Number("double"),
 * //   },
 * //   IspPlacements: [ // IspPlacements // required
 * //     { // IspPlacement
 * //       IspName: "STRING_VALUE",
 * //       PlacementStatistics: {
 * //         InboxPercentage: Number("double"),
 * //         SpamPercentage: Number("double"),
 * //         MissingPercentage: Number("double"),
 * //         SpfPercentage: Number("double"),
 * //         DkimPercentage: Number("double"),
 * //       },
 * //     },
 * //   ],
 * //   Message: "STRING_VALUE",
 * //   Tags: [ // TagList
 * //     { // Tag
 * //       Key: "STRING_VALUE", // required
 * //       Value: "STRING_VALUE", // required
 * //     },
 * //   ],
 * // };
 *
 * ```
 *
 * @param GetDeliverabilityTestReportCommandInput - {@link GetDeliverabilityTestReportCommandInput}
 * @returns {@link GetDeliverabilityTestReportCommandOutput}
 * @see {@link GetDeliverabilityTestReportCommandInput} for command's `input` shape.
 * @see {@link GetDeliverabilityTestReportCommandOutput} for command's `response` shape.
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
export declare class GetDeliverabilityTestReportCommand extends GetDeliverabilityTestReportCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetDeliverabilityTestReportRequest;
            output: GetDeliverabilityTestReportResponse;
        };
        sdk: {
            input: GetDeliverabilityTestReportCommandInput;
            output: GetDeliverabilityTestReportCommandOutput;
        };
    };
}
