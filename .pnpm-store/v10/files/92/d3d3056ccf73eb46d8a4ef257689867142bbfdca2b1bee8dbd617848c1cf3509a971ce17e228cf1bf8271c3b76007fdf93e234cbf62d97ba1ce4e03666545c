import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateExportJobRequest, CreateExportJobResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateExportJobCommand}.
 */
export interface CreateExportJobCommandInput extends CreateExportJobRequest {
}
/**
 * @public
 *
 * The output of {@link CreateExportJobCommand}.
 */
export interface CreateExportJobCommandOutput extends CreateExportJobResponse, __MetadataBearer {
}
declare const CreateExportJobCommand_base: {
    new (input: CreateExportJobCommandInput): import("@smithy/smithy-client").CommandImpl<CreateExportJobCommandInput, CreateExportJobCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateExportJobCommandInput): import("@smithy/smithy-client").CommandImpl<CreateExportJobCommandInput, CreateExportJobCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates an export job for a data source and destination.</p>
 *          <p>You can execute this operation no more than once per second.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, CreateExportJobCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, CreateExportJobCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // CreateExportJobRequest
 *   ExportDataSource: { // ExportDataSource
 *     MetricsDataSource: { // MetricsDataSource
 *       Dimensions: { // ExportDimensions // required
 *         "<keys>": [ // ExportDimensionValue
 *           "STRING_VALUE",
 *         ],
 *       },
 *       Namespace: "VDM", // required
 *       Metrics: [ // ExportMetrics // required
 *         { // ExportMetric
 *           Name: "SEND" || "COMPLAINT" || "PERMANENT_BOUNCE" || "TRANSIENT_BOUNCE" || "OPEN" || "CLICK" || "DELIVERY" || "DELIVERY_OPEN" || "DELIVERY_CLICK" || "DELIVERY_COMPLAINT",
 *           Aggregation: "RATE" || "VOLUME",
 *         },
 *       ],
 *       StartDate: new Date("TIMESTAMP"), // required
 *       EndDate: new Date("TIMESTAMP"), // required
 *     },
 *     MessageInsightsDataSource: { // MessageInsightsDataSource
 *       StartDate: new Date("TIMESTAMP"), // required
 *       EndDate: new Date("TIMESTAMP"), // required
 *       Include: { // MessageInsightsFilters
 *         FromEmailAddress: [ // EmailAddressFilterList
 *           "STRING_VALUE",
 *         ],
 *         Destination: [
 *           "STRING_VALUE",
 *         ],
 *         Subject: [ // EmailSubjectFilterList
 *           "STRING_VALUE",
 *         ],
 *         Isp: [ // IspFilterList
 *           "STRING_VALUE",
 *         ],
 *         LastDeliveryEvent: [ // LastDeliveryEventList
 *           "SEND" || "DELIVERY" || "TRANSIENT_BOUNCE" || "PERMANENT_BOUNCE" || "UNDETERMINED_BOUNCE" || "COMPLAINT",
 *         ],
 *         LastEngagementEvent: [ // LastEngagementEventList
 *           "OPEN" || "CLICK",
 *         ],
 *       },
 *       Exclude: {
 *         FromEmailAddress: [
 *           "STRING_VALUE",
 *         ],
 *         Destination: [
 *           "STRING_VALUE",
 *         ],
 *         Subject: [
 *           "STRING_VALUE",
 *         ],
 *         Isp: [
 *           "STRING_VALUE",
 *         ],
 *         LastDeliveryEvent: [
 *           "SEND" || "DELIVERY" || "TRANSIENT_BOUNCE" || "PERMANENT_BOUNCE" || "UNDETERMINED_BOUNCE" || "COMPLAINT",
 *         ],
 *         LastEngagementEvent: [
 *           "OPEN" || "CLICK",
 *         ],
 *       },
 *       MaxResults: Number("int"),
 *     },
 *   },
 *   ExportDestination: { // ExportDestination
 *     DataFormat: "CSV" || "JSON", // required
 *     S3Url: "STRING_VALUE",
 *   },
 * };
 * const command = new CreateExportJobCommand(input);
 * const response = await client.send(command);
 * // { // CreateExportJobResponse
 * //   JobId: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param CreateExportJobCommandInput - {@link CreateExportJobCommandInput}
 * @returns {@link CreateExportJobCommandOutput}
 * @see {@link CreateExportJobCommandInput} for command's `input` shape.
 * @see {@link CreateExportJobCommandOutput} for command's `response` shape.
 * @see {@link SESv2ClientResolvedConfig | config} for SESv2Client's `config` shape.
 *
 * @throws {@link BadRequestException} (client fault)
 *  <p>The input you provided is invalid.</p>
 *
 * @throws {@link LimitExceededException} (client fault)
 *  <p>There are too many instances of the specified resource type.</p>
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
export declare class CreateExportJobCommand extends CreateExportJobCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateExportJobRequest;
            output: CreateExportJobResponse;
        };
        sdk: {
            input: CreateExportJobCommandInput;
            output: CreateExportJobCommandOutput;
        };
    };
}
