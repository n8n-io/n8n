import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListTenantResourcesRequest, ListTenantResourcesResponse } from "../models/models_1";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListTenantResourcesCommand}.
 */
export interface ListTenantResourcesCommandInput extends ListTenantResourcesRequest {
}
/**
 * @public
 *
 * The output of {@link ListTenantResourcesCommand}.
 */
export interface ListTenantResourcesCommandOutput extends ListTenantResourcesResponse, __MetadataBearer {
}
declare const ListTenantResourcesCommand_base: {
    new (input: ListTenantResourcesCommandInput): import("@smithy/smithy-client").CommandImpl<ListTenantResourcesCommandInput, ListTenantResourcesCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListTenantResourcesCommandInput): import("@smithy/smithy-client").CommandImpl<ListTenantResourcesCommandInput, ListTenantResourcesCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>List all resources associated with a specific tenant.</p>
 *          <p>This operation returns a list of resources (email identities, configuration sets,
 *             or email templates) that are associated with the specified tenant. You can optionally
 *             filter the results by resource type.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, ListTenantResourcesCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, ListTenantResourcesCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // ListTenantResourcesRequest
 *   TenantName: "STRING_VALUE", // required
 *   Filter: { // ListTenantResourcesFilter
 *     "<keys>": "STRING_VALUE",
 *   },
 *   PageSize: Number("int"),
 *   NextToken: "STRING_VALUE",
 * };
 * const command = new ListTenantResourcesCommand(input);
 * const response = await client.send(command);
 * // { // ListTenantResourcesResponse
 * //   TenantResources: [ // TenantResourceList
 * //     { // TenantResource
 * //       ResourceType: "EMAIL_IDENTITY" || "CONFIGURATION_SET" || "EMAIL_TEMPLATE",
 * //       ResourceArn: "STRING_VALUE",
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListTenantResourcesCommandInput - {@link ListTenantResourcesCommandInput}
 * @returns {@link ListTenantResourcesCommandOutput}
 * @see {@link ListTenantResourcesCommandInput} for command's `input` shape.
 * @see {@link ListTenantResourcesCommandOutput} for command's `response` shape.
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
export declare class ListTenantResourcesCommand extends ListTenantResourcesCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListTenantResourcesRequest;
            output: ListTenantResourcesResponse;
        };
        sdk: {
            input: ListTenantResourcesCommandInput;
            output: ListTenantResourcesCommandOutput;
        };
    };
}
