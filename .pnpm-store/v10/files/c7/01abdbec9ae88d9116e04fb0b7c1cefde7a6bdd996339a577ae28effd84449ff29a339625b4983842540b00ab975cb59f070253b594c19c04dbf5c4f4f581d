import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { UpdateReputationEntityCustomerManagedStatusRequest, UpdateReputationEntityCustomerManagedStatusResponse } from "../models/models_1";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateReputationEntityCustomerManagedStatusCommand}.
 */
export interface UpdateReputationEntityCustomerManagedStatusCommandInput extends UpdateReputationEntityCustomerManagedStatusRequest {
}
/**
 * @public
 *
 * The output of {@link UpdateReputationEntityCustomerManagedStatusCommand}.
 */
export interface UpdateReputationEntityCustomerManagedStatusCommandOutput extends UpdateReputationEntityCustomerManagedStatusResponse, __MetadataBearer {
}
declare const UpdateReputationEntityCustomerManagedStatusCommand_base: {
    new (input: UpdateReputationEntityCustomerManagedStatusCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateReputationEntityCustomerManagedStatusCommandInput, UpdateReputationEntityCustomerManagedStatusCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateReputationEntityCustomerManagedStatusCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateReputationEntityCustomerManagedStatusCommandInput, UpdateReputationEntityCustomerManagedStatusCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Update the customer-managed sending status for a reputation entity. This allows
 *             you to enable, disable, or reinstate sending for the entity.</p>
 *          <p>The customer-managed status works in conjunction with the Amazon Web Services Amazon SES-managed status
 *         to determine the overall sending capability. When you update the customer-managed status,
 *         the Amazon Web Services Amazon SES-managed status remains unchanged. If Amazon Web Services Amazon SES has disabled the entity,
 *         it will not be allowed to send regardless of the customer-managed status setting. When you
 *         reinstate an entity through the customer-managed status, it can continue sending only if
 *         the Amazon Web Services Amazon SES-managed status also permits sending, even if there are active reputation
 *         findings, until the findings are resolved or new violations occur.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, UpdateReputationEntityCustomerManagedStatusCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, UpdateReputationEntityCustomerManagedStatusCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // UpdateReputationEntityCustomerManagedStatusRequest
 *   ReputationEntityType: "RESOURCE", // required
 *   ReputationEntityReference: "STRING_VALUE", // required
 *   SendingStatus: "ENABLED" || "REINSTATED" || "DISABLED", // required
 * };
 * const command = new UpdateReputationEntityCustomerManagedStatusCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param UpdateReputationEntityCustomerManagedStatusCommandInput - {@link UpdateReputationEntityCustomerManagedStatusCommandInput}
 * @returns {@link UpdateReputationEntityCustomerManagedStatusCommandOutput}
 * @see {@link UpdateReputationEntityCustomerManagedStatusCommandInput} for command's `input` shape.
 * @see {@link UpdateReputationEntityCustomerManagedStatusCommandOutput} for command's `response` shape.
 * @see {@link SESv2ClientResolvedConfig | config} for SESv2Client's `config` shape.
 *
 * @throws {@link BadRequestException} (client fault)
 *  <p>The input you provided is invalid.</p>
 *
 * @throws {@link ConflictException} (client fault)
 *  <p>If there is already an ongoing account details update under review.</p>
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
export declare class UpdateReputationEntityCustomerManagedStatusCommand extends UpdateReputationEntityCustomerManagedStatusCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateReputationEntityCustomerManagedStatusRequest;
            output: {};
        };
        sdk: {
            input: UpdateReputationEntityCustomerManagedStatusCommandInput;
            output: UpdateReputationEntityCustomerManagedStatusCommandOutput;
        };
    };
}
