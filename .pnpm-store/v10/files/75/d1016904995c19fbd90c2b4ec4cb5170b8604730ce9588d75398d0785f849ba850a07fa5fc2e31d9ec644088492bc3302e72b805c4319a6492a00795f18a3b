import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetTenantRequest, GetTenantResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetTenantCommand}.
 */
export interface GetTenantCommandInput extends GetTenantRequest {
}
/**
 * @public
 *
 * The output of {@link GetTenantCommand}.
 */
export interface GetTenantCommandOutput extends GetTenantResponse, __MetadataBearer {
}
declare const GetTenantCommand_base: {
    new (input: GetTenantCommandInput): import("@smithy/smithy-client").CommandImpl<GetTenantCommandInput, GetTenantCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetTenantCommandInput): import("@smithy/smithy-client").CommandImpl<GetTenantCommandInput, GetTenantCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Get information about a specific tenant, including the tenant's name, ID, ARN,
 *             creation timestamp, tags, and sending status.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, GetTenantCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, GetTenantCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // GetTenantRequest
 *   TenantName: "STRING_VALUE", // required
 * };
 * const command = new GetTenantCommand(input);
 * const response = await client.send(command);
 * // { // GetTenantResponse
 * //   Tenant: { // Tenant
 * //     TenantName: "STRING_VALUE",
 * //     TenantId: "STRING_VALUE",
 * //     TenantArn: "STRING_VALUE",
 * //     CreatedTimestamp: new Date("TIMESTAMP"),
 * //     Tags: [ // TagList
 * //       { // Tag
 * //         Key: "STRING_VALUE", // required
 * //         Value: "STRING_VALUE", // required
 * //       },
 * //     ],
 * //     SendingStatus: "ENABLED" || "REINSTATED" || "DISABLED",
 * //   },
 * // };
 *
 * ```
 *
 * @param GetTenantCommandInput - {@link GetTenantCommandInput}
 * @returns {@link GetTenantCommandOutput}
 * @see {@link GetTenantCommandInput} for command's `input` shape.
 * @see {@link GetTenantCommandOutput} for command's `response` shape.
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
export declare class GetTenantCommand extends GetTenantCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetTenantRequest;
            output: GetTenantResponse;
        };
        sdk: {
            input: GetTenantCommandInput;
            output: GetTenantCommandOutput;
        };
    };
}
