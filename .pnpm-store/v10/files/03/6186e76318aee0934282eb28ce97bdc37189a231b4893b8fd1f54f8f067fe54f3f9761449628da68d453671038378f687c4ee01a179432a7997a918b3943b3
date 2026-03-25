import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteEmailIdentityPolicyRequest, DeleteEmailIdentityPolicyResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteEmailIdentityPolicyCommand}.
 */
export interface DeleteEmailIdentityPolicyCommandInput extends DeleteEmailIdentityPolicyRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteEmailIdentityPolicyCommand}.
 */
export interface DeleteEmailIdentityPolicyCommandOutput extends DeleteEmailIdentityPolicyResponse, __MetadataBearer {
}
declare const DeleteEmailIdentityPolicyCommand_base: {
    new (input: DeleteEmailIdentityPolicyCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteEmailIdentityPolicyCommandInput, DeleteEmailIdentityPolicyCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteEmailIdentityPolicyCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteEmailIdentityPolicyCommandInput, DeleteEmailIdentityPolicyCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes the specified sending authorization policy for the given identity (an email
 *             address or a domain). This API returns successfully even if a policy with the specified
 *             name does not exist.</p>
 *          <note>
 *             <p>This API is for the identity owner only. If you have not verified the identity,
 *                 this API will return an error.</p>
 *          </note>
 *          <p>Sending authorization is a feature that enables an identity owner to authorize other
 *             senders to use its identities. For information about using sending authorization, see
 *             the <a href="https://docs.aws.amazon.com/ses/latest/DeveloperGuide/sending-authorization.html">Amazon SES Developer
 *                 Guide</a>.</p>
 *          <p>You can execute this operation no more than once per second.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, DeleteEmailIdentityPolicyCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, DeleteEmailIdentityPolicyCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // DeleteEmailIdentityPolicyRequest
 *   EmailIdentity: "STRING_VALUE", // required
 *   PolicyName: "STRING_VALUE", // required
 * };
 * const command = new DeleteEmailIdentityPolicyCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteEmailIdentityPolicyCommandInput - {@link DeleteEmailIdentityPolicyCommandInput}
 * @returns {@link DeleteEmailIdentityPolicyCommandOutput}
 * @see {@link DeleteEmailIdentityPolicyCommandInput} for command's `input` shape.
 * @see {@link DeleteEmailIdentityPolicyCommandOutput} for command's `response` shape.
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
export declare class DeleteEmailIdentityPolicyCommand extends DeleteEmailIdentityPolicyCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteEmailIdentityPolicyRequest;
            output: {};
        };
        sdk: {
            input: DeleteEmailIdentityPolicyCommandInput;
            output: DeleteEmailIdentityPolicyCommandOutput;
        };
    };
}
