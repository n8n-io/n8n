import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListTenantsRequest, ListTenantsResponse } from "../models/models_1";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListTenantsCommand}.
 */
export interface ListTenantsCommandInput extends ListTenantsRequest {
}
/**
 * @public
 *
 * The output of {@link ListTenantsCommand}.
 */
export interface ListTenantsCommandOutput extends ListTenantsResponse, __MetadataBearer {
}
declare const ListTenantsCommand_base: {
    new (input: ListTenantsCommandInput): import("@smithy/smithy-client").CommandImpl<ListTenantsCommandInput, ListTenantsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListTenantsCommandInput]): import("@smithy/smithy-client").CommandImpl<ListTenantsCommandInput, ListTenantsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>List all tenants associated with your account in the current Amazon Web Services Region.</p>
 *          <p>This operation returns basic information about each tenant,
 *             such as tenant name, ID, ARN, and creation timestamp.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, ListTenantsCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, ListTenantsCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // ListTenantsRequest
 *   NextToken: "STRING_VALUE",
 *   PageSize: Number("int"),
 * };
 * const command = new ListTenantsCommand(input);
 * const response = await client.send(command);
 * // { // ListTenantsResponse
 * //   Tenants: [ // TenantInfoList
 * //     { // TenantInfo
 * //       TenantName: "STRING_VALUE",
 * //       TenantId: "STRING_VALUE",
 * //       TenantArn: "STRING_VALUE",
 * //       CreatedTimestamp: new Date("TIMESTAMP"),
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListTenantsCommandInput - {@link ListTenantsCommandInput}
 * @returns {@link ListTenantsCommandOutput}
 * @see {@link ListTenantsCommandInput} for command's `input` shape.
 * @see {@link ListTenantsCommandOutput} for command's `response` shape.
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
export declare class ListTenantsCommand extends ListTenantsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListTenantsRequest;
            output: ListTenantsResponse;
        };
        sdk: {
            input: ListTenantsCommandInput;
            output: ListTenantsCommandOutput;
        };
    };
}
