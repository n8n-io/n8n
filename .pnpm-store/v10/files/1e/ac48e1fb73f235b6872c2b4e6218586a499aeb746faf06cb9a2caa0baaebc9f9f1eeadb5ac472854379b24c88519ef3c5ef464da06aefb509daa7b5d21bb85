import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListResourceTenantsRequest, ListResourceTenantsResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListResourceTenantsCommand}.
 */
export interface ListResourceTenantsCommandInput extends ListResourceTenantsRequest {
}
/**
 * @public
 *
 * The output of {@link ListResourceTenantsCommand}.
 */
export interface ListResourceTenantsCommandOutput extends ListResourceTenantsResponse, __MetadataBearer {
}
declare const ListResourceTenantsCommand_base: {
    new (input: ListResourceTenantsCommandInput): import("@smithy/smithy-client").CommandImpl<ListResourceTenantsCommandInput, ListResourceTenantsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListResourceTenantsCommandInput): import("@smithy/smithy-client").CommandImpl<ListResourceTenantsCommandInput, ListResourceTenantsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>List all tenants associated with a specific resource.</p>
 *          <p>This operation returns a list of tenants that are associated with the specified
 *             resource. This is useful for understanding which tenants are currently using a particular
 *             resource such as an email identity, configuration set, or email template.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, ListResourceTenantsCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, ListResourceTenantsCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // ListResourceTenantsRequest
 *   ResourceArn: "STRING_VALUE", // required
 *   PageSize: Number("int"),
 *   NextToken: "STRING_VALUE",
 * };
 * const command = new ListResourceTenantsCommand(input);
 * const response = await client.send(command);
 * // { // ListResourceTenantsResponse
 * //   ResourceTenants: [ // ResourceTenantMetadataList
 * //     { // ResourceTenantMetadata
 * //       TenantName: "STRING_VALUE",
 * //       TenantId: "STRING_VALUE",
 * //       ResourceArn: "STRING_VALUE",
 * //       AssociatedTimestamp: new Date("TIMESTAMP"),
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListResourceTenantsCommandInput - {@link ListResourceTenantsCommandInput}
 * @returns {@link ListResourceTenantsCommandOutput}
 * @see {@link ListResourceTenantsCommandInput} for command's `input` shape.
 * @see {@link ListResourceTenantsCommandOutput} for command's `response` shape.
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
export declare class ListResourceTenantsCommand extends ListResourceTenantsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListResourceTenantsRequest;
            output: ListResourceTenantsResponse;
        };
        sdk: {
            input: ListResourceTenantsCommandInput;
            output: ListResourceTenantsCommandOutput;
        };
    };
}
