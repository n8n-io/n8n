import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { UpdateReputationEntityPolicyRequest, UpdateReputationEntityPolicyResponse } from "../models/models_1";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateReputationEntityPolicyCommand}.
 */
export interface UpdateReputationEntityPolicyCommandInput extends UpdateReputationEntityPolicyRequest {
}
/**
 * @public
 *
 * The output of {@link UpdateReputationEntityPolicyCommand}.
 */
export interface UpdateReputationEntityPolicyCommandOutput extends UpdateReputationEntityPolicyResponse, __MetadataBearer {
}
declare const UpdateReputationEntityPolicyCommand_base: {
    new (input: UpdateReputationEntityPolicyCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateReputationEntityPolicyCommandInput, UpdateReputationEntityPolicyCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateReputationEntityPolicyCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateReputationEntityPolicyCommandInput, UpdateReputationEntityPolicyCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Update the reputation management policy for a reputation entity. The policy
 *             determines how the entity responds to reputation findings, such as automatically
 *             pausing sending when certain thresholds are exceeded.</p>
 *          <p>Reputation management policies are Amazon Web Services Amazon SES-managed (predefined policies).
 *         You can select from none, standard, and strict policies.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, UpdateReputationEntityPolicyCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, UpdateReputationEntityPolicyCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // UpdateReputationEntityPolicyRequest
 *   ReputationEntityType: "RESOURCE", // required
 *   ReputationEntityReference: "STRING_VALUE", // required
 *   ReputationEntityPolicy: "STRING_VALUE", // required
 * };
 * const command = new UpdateReputationEntityPolicyCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param UpdateReputationEntityPolicyCommandInput - {@link UpdateReputationEntityPolicyCommandInput}
 * @returns {@link UpdateReputationEntityPolicyCommandOutput}
 * @see {@link UpdateReputationEntityPolicyCommandInput} for command's `input` shape.
 * @see {@link UpdateReputationEntityPolicyCommandOutput} for command's `response` shape.
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
export declare class UpdateReputationEntityPolicyCommand extends UpdateReputationEntityPolicyCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateReputationEntityPolicyRequest;
            output: {};
        };
        sdk: {
            input: UpdateReputationEntityPolicyCommandInput;
            output: UpdateReputationEntityPolicyCommandOutput;
        };
    };
}
