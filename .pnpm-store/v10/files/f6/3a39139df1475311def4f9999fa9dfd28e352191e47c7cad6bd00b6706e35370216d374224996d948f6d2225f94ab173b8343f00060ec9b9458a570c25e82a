import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateTenantResourceAssociationRequest, CreateTenantResourceAssociationResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateTenantResourceAssociationCommand}.
 */
export interface CreateTenantResourceAssociationCommandInput extends CreateTenantResourceAssociationRequest {
}
/**
 * @public
 *
 * The output of {@link CreateTenantResourceAssociationCommand}.
 */
export interface CreateTenantResourceAssociationCommandOutput extends CreateTenantResourceAssociationResponse, __MetadataBearer {
}
declare const CreateTenantResourceAssociationCommand_base: {
    new (input: CreateTenantResourceAssociationCommandInput): import("@smithy/smithy-client").CommandImpl<CreateTenantResourceAssociationCommandInput, CreateTenantResourceAssociationCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateTenantResourceAssociationCommandInput): import("@smithy/smithy-client").CommandImpl<CreateTenantResourceAssociationCommandInput, CreateTenantResourceAssociationCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Associate a resource with a tenant.</p>
 *          <p>
 *             <i>Resources</i> can be email identities, configuration sets, or email templates.
 *             When you associate a resource with a tenant, you can use that resource when sending emails
 *             on behalf of that tenant.</p>
 *          <p>A single resource can be associated with multiple tenants, allowing for resource sharing
 *             across different tenants while maintaining isolation in email sending operations.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, CreateTenantResourceAssociationCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, CreateTenantResourceAssociationCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // CreateTenantResourceAssociationRequest
 *   TenantName: "STRING_VALUE", // required
 *   ResourceArn: "STRING_VALUE", // required
 * };
 * const command = new CreateTenantResourceAssociationCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param CreateTenantResourceAssociationCommandInput - {@link CreateTenantResourceAssociationCommandInput}
 * @returns {@link CreateTenantResourceAssociationCommandOutput}
 * @see {@link CreateTenantResourceAssociationCommandInput} for command's `input` shape.
 * @see {@link CreateTenantResourceAssociationCommandOutput} for command's `response` shape.
 * @see {@link SESv2ClientResolvedConfig | config} for SESv2Client's `config` shape.
 *
 * @throws {@link AlreadyExistsException} (client fault)
 *  <p>The resource specified in your request already exists.</p>
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
export declare class CreateTenantResourceAssociationCommand extends CreateTenantResourceAssociationCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateTenantResourceAssociationRequest;
            output: {};
        };
        sdk: {
            input: CreateTenantResourceAssociationCommandInput;
            output: CreateTenantResourceAssociationCommandOutput;
        };
    };
}
