import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListExportJobsRequest, ListExportJobsResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListExportJobsCommand}.
 */
export interface ListExportJobsCommandInput extends ListExportJobsRequest {
}
/**
 * @public
 *
 * The output of {@link ListExportJobsCommand}.
 */
export interface ListExportJobsCommandOutput extends ListExportJobsResponse, __MetadataBearer {
}
declare const ListExportJobsCommand_base: {
    new (input: ListExportJobsCommandInput): import("@smithy/smithy-client").CommandImpl<ListExportJobsCommandInput, ListExportJobsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListExportJobsCommandInput]): import("@smithy/smithy-client").CommandImpl<ListExportJobsCommandInput, ListExportJobsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists all of the export jobs.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, ListExportJobsCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, ListExportJobsCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // ListExportJobsRequest
 *   NextToken: "STRING_VALUE",
 *   PageSize: Number("int"),
 *   ExportSourceType: "METRICS_DATA" || "MESSAGE_INSIGHTS",
 *   JobStatus: "CREATED" || "PROCESSING" || "COMPLETED" || "FAILED" || "CANCELLED",
 * };
 * const command = new ListExportJobsCommand(input);
 * const response = await client.send(command);
 * // { // ListExportJobsResponse
 * //   ExportJobs: [ // ExportJobSummaryList
 * //     { // ExportJobSummary
 * //       JobId: "STRING_VALUE",
 * //       ExportSourceType: "METRICS_DATA" || "MESSAGE_INSIGHTS",
 * //       JobStatus: "CREATED" || "PROCESSING" || "COMPLETED" || "FAILED" || "CANCELLED",
 * //       CreatedTimestamp: new Date("TIMESTAMP"),
 * //       CompletedTimestamp: new Date("TIMESTAMP"),
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListExportJobsCommandInput - {@link ListExportJobsCommandInput}
 * @returns {@link ListExportJobsCommandOutput}
 * @see {@link ListExportJobsCommandInput} for command's `input` shape.
 * @see {@link ListExportJobsCommandOutput} for command's `response` shape.
 * @see {@link SESv2ClientResolvedConfig | config} for SESv2Client's `config` shape.
 *
 * @throws {@link BadRequestException} (client fault)
 *  <p>The input you provided is invalid.</p>
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
export declare class ListExportJobsCommand extends ListExportJobsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListExportJobsRequest;
            output: ListExportJobsResponse;
        };
        sdk: {
            input: ListExportJobsCommandInput;
            output: ListExportJobsCommandOutput;
        };
    };
}
