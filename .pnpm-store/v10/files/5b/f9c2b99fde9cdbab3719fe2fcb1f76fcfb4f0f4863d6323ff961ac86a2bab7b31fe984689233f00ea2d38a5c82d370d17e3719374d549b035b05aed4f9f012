import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetBlacklistReportsRequest, GetBlacklistReportsResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetBlacklistReportsCommand}.
 */
export interface GetBlacklistReportsCommandInput extends GetBlacklistReportsRequest {
}
/**
 * @public
 *
 * The output of {@link GetBlacklistReportsCommand}.
 */
export interface GetBlacklistReportsCommandOutput extends GetBlacklistReportsResponse, __MetadataBearer {
}
declare const GetBlacklistReportsCommand_base: {
    new (input: GetBlacklistReportsCommandInput): import("@smithy/smithy-client").CommandImpl<GetBlacklistReportsCommandInput, GetBlacklistReportsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetBlacklistReportsCommandInput): import("@smithy/smithy-client").CommandImpl<GetBlacklistReportsCommandInput, GetBlacklistReportsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Retrieve a list of the blacklists that your dedicated IP addresses appear on.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, GetBlacklistReportsCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, GetBlacklistReportsCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // GetBlacklistReportsRequest
 *   BlacklistItemNames: [ // BlacklistItemNames // required
 *     "STRING_VALUE",
 *   ],
 * };
 * const command = new GetBlacklistReportsCommand(input);
 * const response = await client.send(command);
 * // { // GetBlacklistReportsResponse
 * //   BlacklistReport: { // BlacklistReport // required
 * //     "<keys>": [ // BlacklistEntries
 * //       { // BlacklistEntry
 * //         RblName: "STRING_VALUE",
 * //         ListingTime: new Date("TIMESTAMP"),
 * //         Description: "STRING_VALUE",
 * //       },
 * //     ],
 * //   },
 * // };
 *
 * ```
 *
 * @param GetBlacklistReportsCommandInput - {@link GetBlacklistReportsCommandInput}
 * @returns {@link GetBlacklistReportsCommandOutput}
 * @see {@link GetBlacklistReportsCommandInput} for command's `input` shape.
 * @see {@link GetBlacklistReportsCommandOutput} for command's `response` shape.
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
export declare class GetBlacklistReportsCommand extends GetBlacklistReportsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetBlacklistReportsRequest;
            output: GetBlacklistReportsResponse;
        };
        sdk: {
            input: GetBlacklistReportsCommandInput;
            output: GetBlacklistReportsCommandOutput;
        };
    };
}
