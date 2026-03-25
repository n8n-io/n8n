import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteTenantRequest, DeleteTenantResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteTenantCommand}.
 */
export interface DeleteTenantCommandInput extends DeleteTenantRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteTenantCommand}.
 */
export interface DeleteTenantCommandOutput extends DeleteTenantResponse, __MetadataBearer {
}
declare const DeleteTenantCommand_base: {
    new (input: DeleteTenantCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteTenantCommandInput, DeleteTenantCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteTenantCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteTenantCommandInput, DeleteTenantCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Delete an existing tenant.</p>
 *          <p>When you delete a tenant, its associations with resources
 *             are removed, but the resources themselves are not deleted.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, DeleteTenantCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, DeleteTenantCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // DeleteTenantRequest
 *   TenantName: "STRING_VALUE", // required
 * };
 * const command = new DeleteTenantCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteTenantCommandInput - {@link DeleteTenantCommandInput}
 * @returns {@link DeleteTenantCommandOutput}
 * @see {@link DeleteTenantCommandInput} for command's `input` shape.
 * @see {@link DeleteTenantCommandOutput} for command's `response` shape.
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
export declare class DeleteTenantCommand extends DeleteTenantCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteTenantRequest;
            output: {};
        };
        sdk: {
            input: DeleteTenantCommandInput;
            output: DeleteTenantCommandOutput;
        };
    };
}
