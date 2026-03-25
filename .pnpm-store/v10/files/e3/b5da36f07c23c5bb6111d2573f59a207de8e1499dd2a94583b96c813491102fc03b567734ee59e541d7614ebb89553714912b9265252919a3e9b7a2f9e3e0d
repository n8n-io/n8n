import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteEmailIdentityRequest, DeleteEmailIdentityResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteEmailIdentityCommand}.
 */
export interface DeleteEmailIdentityCommandInput extends DeleteEmailIdentityRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteEmailIdentityCommand}.
 */
export interface DeleteEmailIdentityCommandOutput extends DeleteEmailIdentityResponse, __MetadataBearer {
}
declare const DeleteEmailIdentityCommand_base: {
    new (input: DeleteEmailIdentityCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteEmailIdentityCommandInput, DeleteEmailIdentityCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteEmailIdentityCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteEmailIdentityCommandInput, DeleteEmailIdentityCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes an email identity. An identity can be either an email address or a domain
 *             name.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, DeleteEmailIdentityCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, DeleteEmailIdentityCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // DeleteEmailIdentityRequest
 *   EmailIdentity: "STRING_VALUE", // required
 * };
 * const command = new DeleteEmailIdentityCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteEmailIdentityCommandInput - {@link DeleteEmailIdentityCommandInput}
 * @returns {@link DeleteEmailIdentityCommandOutput}
 * @see {@link DeleteEmailIdentityCommandInput} for command's `input` shape.
 * @see {@link DeleteEmailIdentityCommandOutput} for command's `response` shape.
 * @see {@link SESv2ClientResolvedConfig | config} for SESv2Client's `config` shape.
 *
 * @throws {@link BadRequestException} (client fault)
 *  <p>The input you provided is invalid.</p>
 *
 * @throws {@link ConcurrentModificationException} (server fault)
 *  <p>The resource is being modified by another operation or thread.</p>
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
export declare class DeleteEmailIdentityCommand extends DeleteEmailIdentityCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteEmailIdentityRequest;
            output: {};
        };
        sdk: {
            input: DeleteEmailIdentityCommandInput;
            output: DeleteEmailIdentityCommandOutput;
        };
    };
}
