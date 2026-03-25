import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteTenantResourceAssociationRequest, DeleteTenantResourceAssociationResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteTenantResourceAssociationCommand}.
 */
export interface DeleteTenantResourceAssociationCommandInput extends DeleteTenantResourceAssociationRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteTenantResourceAssociationCommand}.
 */
export interface DeleteTenantResourceAssociationCommandOutput extends DeleteTenantResourceAssociationResponse, __MetadataBearer {
}
declare const DeleteTenantResourceAssociationCommand_base: {
    new (input: DeleteTenantResourceAssociationCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteTenantResourceAssociationCommandInput, DeleteTenantResourceAssociationCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteTenantResourceAssociationCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteTenantResourceAssociationCommandInput, DeleteTenantResourceAssociationCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Delete an association between a tenant and a resource.</p>
 *          <p>When you delete a tenant-resource association, the resource itself is not deleted,
 *             only its association with the specific tenant is removed. After removal, the resource
 *             will no longer be available for use with that tenant's email sending operations.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, DeleteTenantResourceAssociationCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, DeleteTenantResourceAssociationCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // DeleteTenantResourceAssociationRequest
 *   TenantName: "STRING_VALUE", // required
 *   ResourceArn: "STRING_VALUE", // required
 * };
 * const command = new DeleteTenantResourceAssociationCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteTenantResourceAssociationCommandInput - {@link DeleteTenantResourceAssociationCommandInput}
 * @returns {@link DeleteTenantResourceAssociationCommandOutput}
 * @see {@link DeleteTenantResourceAssociationCommandInput} for command's `input` shape.
 * @see {@link DeleteTenantResourceAssociationCommandOutput} for command's `response` shape.
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
export declare class DeleteTenantResourceAssociationCommand extends DeleteTenantResourceAssociationCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteTenantResourceAssociationRequest;
            output: {};
        };
        sdk: {
            input: DeleteTenantResourceAssociationCommandInput;
            output: DeleteTenantResourceAssociationCommandOutput;
        };
    };
}
