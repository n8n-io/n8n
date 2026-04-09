import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../KendraClient";
import type { GetSnapshotsRequest, GetSnapshotsResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetSnapshotsCommand}.
 */
export interface GetSnapshotsCommandInput extends GetSnapshotsRequest {
}
/**
 * @public
 *
 * The output of {@link GetSnapshotsCommand}.
 */
export interface GetSnapshotsCommandOutput extends GetSnapshotsResponse, __MetadataBearer {
}
declare const GetSnapshotsCommand_base: {
    new (input: GetSnapshotsCommandInput): import("@smithy/smithy-client").CommandImpl<GetSnapshotsCommandInput, GetSnapshotsCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetSnapshotsCommandInput): import("@smithy/smithy-client").CommandImpl<GetSnapshotsCommandInput, GetSnapshotsCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Retrieves search metrics data. The data provides a snapshot of how your users interact
 *             with your search application and how effective the application is.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { KendraClient, GetSnapshotsCommand } from "@aws-sdk/client-kendra"; // ES Modules import
 * // const { KendraClient, GetSnapshotsCommand } = require("@aws-sdk/client-kendra"); // CommonJS import
 * // import type { KendraClientConfig } from "@aws-sdk/client-kendra";
 * const config = {}; // type is KendraClientConfig
 * const client = new KendraClient(config);
 * const input = { // GetSnapshotsRequest
 *   IndexId: "STRING_VALUE", // required
 *   Interval: "THIS_MONTH" || "THIS_WEEK" || "ONE_WEEK_AGO" || "TWO_WEEKS_AGO" || "ONE_MONTH_AGO" || "TWO_MONTHS_AGO", // required
 *   MetricType: "QUERIES_BY_COUNT" || "QUERIES_BY_ZERO_CLICK_RATE" || "QUERIES_BY_ZERO_RESULT_RATE" || "DOCS_BY_CLICK_COUNT" || "AGG_QUERY_DOC_METRICS" || "TREND_QUERY_DOC_METRICS", // required
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 * };
 * const command = new GetSnapshotsCommand(input);
 * const response = await client.send(command);
 * // { // GetSnapshotsResponse
 * //   SnapShotTimeFilter: { // TimeRange
 * //     StartTime: new Date("TIMESTAMP"),
 * //     EndTime: new Date("TIMESTAMP"),
 * //   },
 * //   SnapshotsDataHeader: [ // SnapshotsDataHeaderFields
 * //     "STRING_VALUE",
 * //   ],
 * //   SnapshotsData: [ // SnapshotsDataRecords
 * //     [ // SnapshotsDataRecord
 * //       "STRING_VALUE",
 * //     ],
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param GetSnapshotsCommandInput - {@link GetSnapshotsCommandInput}
 * @returns {@link GetSnapshotsCommandOutput}
 * @see {@link GetSnapshotsCommandInput} for command's `input` shape.
 * @see {@link GetSnapshotsCommandOutput} for command's `response` shape.
 * @see {@link KendraClientResolvedConfig | config} for KendraClient's `config` shape.
 *
 * @throws {@link AccessDeniedException} (client fault)
 *  <p>You don't have sufficient access to perform this action. Please ensure you have the
 *             required permission policies and user accounts and try again.</p>
 *
 * @throws {@link InternalServerException} (server fault)
 *  <p>An issue occurred with the internal server used for your Amazon Kendra service.
 *             Please wait a few minutes and try again, or contact <a href="http://aws.amazon.com/contact-us/">Support</a> for help.</p>
 *
 * @throws {@link InvalidRequestException} (client fault)
 *  <p>The input to the request is not valid. Please provide the correct input and try
 *             again.</p>
 *
 * @throws {@link ResourceNotFoundException} (client fault)
 *  <p>The resource you want to use doesn’t exist. Please check you have provided the correct
 *             resource and try again.</p>
 *
 * @throws {@link KendraServiceException}
 * <p>Base exception class for all service exceptions from Kendra service.</p>
 *
 *
 * @public
 */
export declare class GetSnapshotsCommand extends GetSnapshotsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetSnapshotsRequest;
            output: GetSnapshotsResponse;
        };
        sdk: {
            input: GetSnapshotsCommandInput;
            output: GetSnapshotsCommandOutput;
        };
    };
}
