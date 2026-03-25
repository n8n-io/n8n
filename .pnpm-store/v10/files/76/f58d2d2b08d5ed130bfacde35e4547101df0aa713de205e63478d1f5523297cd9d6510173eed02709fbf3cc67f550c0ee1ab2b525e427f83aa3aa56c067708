import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListDedicatedIpPoolsRequest, ListDedicatedIpPoolsResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListDedicatedIpPoolsCommand}.
 */
export interface ListDedicatedIpPoolsCommandInput extends ListDedicatedIpPoolsRequest {
}
/**
 * @public
 *
 * The output of {@link ListDedicatedIpPoolsCommand}.
 */
export interface ListDedicatedIpPoolsCommandOutput extends ListDedicatedIpPoolsResponse, __MetadataBearer {
}
declare const ListDedicatedIpPoolsCommand_base: {
    new (input: ListDedicatedIpPoolsCommandInput): import("@smithy/smithy-client").CommandImpl<ListDedicatedIpPoolsCommandInput, ListDedicatedIpPoolsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListDedicatedIpPoolsCommandInput]): import("@smithy/smithy-client").CommandImpl<ListDedicatedIpPoolsCommandInput, ListDedicatedIpPoolsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>List all of the dedicated IP pools that exist in your Amazon Web Services account in the current
 *             Region.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, ListDedicatedIpPoolsCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, ListDedicatedIpPoolsCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // ListDedicatedIpPoolsRequest
 *   NextToken: "STRING_VALUE",
 *   PageSize: Number("int"),
 * };
 * const command = new ListDedicatedIpPoolsCommand(input);
 * const response = await client.send(command);
 * // { // ListDedicatedIpPoolsResponse
 * //   DedicatedIpPools: [ // ListOfDedicatedIpPools
 * //     "STRING_VALUE",
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListDedicatedIpPoolsCommandInput - {@link ListDedicatedIpPoolsCommandInput}
 * @returns {@link ListDedicatedIpPoolsCommandOutput}
 * @see {@link ListDedicatedIpPoolsCommandInput} for command's `input` shape.
 * @see {@link ListDedicatedIpPoolsCommandOutput} for command's `response` shape.
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
export declare class ListDedicatedIpPoolsCommand extends ListDedicatedIpPoolsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListDedicatedIpPoolsRequest;
            output: ListDedicatedIpPoolsResponse;
        };
        sdk: {
            input: ListDedicatedIpPoolsCommandInput;
            output: ListDedicatedIpPoolsCommandOutput;
        };
    };
}
