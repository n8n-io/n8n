import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListMultiRegionEndpointsRequest, ListMultiRegionEndpointsResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListMultiRegionEndpointsCommand}.
 */
export interface ListMultiRegionEndpointsCommandInput extends ListMultiRegionEndpointsRequest {
}
/**
 * @public
 *
 * The output of {@link ListMultiRegionEndpointsCommand}.
 */
export interface ListMultiRegionEndpointsCommandOutput extends ListMultiRegionEndpointsResponse, __MetadataBearer {
}
declare const ListMultiRegionEndpointsCommand_base: {
    new (input: ListMultiRegionEndpointsCommandInput): import("@smithy/smithy-client").CommandImpl<ListMultiRegionEndpointsCommandInput, ListMultiRegionEndpointsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListMultiRegionEndpointsCommandInput]): import("@smithy/smithy-client").CommandImpl<ListMultiRegionEndpointsCommandInput, ListMultiRegionEndpointsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>List the multi-region endpoints (global-endpoints).</p>
 *          <p>Only multi-region endpoints (global-endpoints) whose primary region is the AWS-Region
 *             where operation is executed will be listed.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, ListMultiRegionEndpointsCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, ListMultiRegionEndpointsCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // ListMultiRegionEndpointsRequest
 *   NextToken: "STRING_VALUE",
 *   PageSize: Number("int"),
 * };
 * const command = new ListMultiRegionEndpointsCommand(input);
 * const response = await client.send(command);
 * // { // ListMultiRegionEndpointsResponse
 * //   MultiRegionEndpoints: [ // MultiRegionEndpoints
 * //     { // MultiRegionEndpoint
 * //       EndpointName: "STRING_VALUE",
 * //       Status: "CREATING" || "READY" || "FAILED" || "DELETING",
 * //       EndpointId: "STRING_VALUE",
 * //       Regions: [ // Regions
 * //         "STRING_VALUE",
 * //       ],
 * //       CreatedTimestamp: new Date("TIMESTAMP"),
 * //       LastUpdatedTimestamp: new Date("TIMESTAMP"),
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListMultiRegionEndpointsCommandInput - {@link ListMultiRegionEndpointsCommandInput}
 * @returns {@link ListMultiRegionEndpointsCommandOutput}
 * @see {@link ListMultiRegionEndpointsCommandInput} for command's `input` shape.
 * @see {@link ListMultiRegionEndpointsCommandOutput} for command's `response` shape.
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
export declare class ListMultiRegionEndpointsCommand extends ListMultiRegionEndpointsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListMultiRegionEndpointsRequest;
            output: ListMultiRegionEndpointsResponse;
        };
        sdk: {
            input: ListMultiRegionEndpointsCommandInput;
            output: ListMultiRegionEndpointsCommandOutput;
        };
    };
}
