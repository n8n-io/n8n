import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteSuppressedDestinationRequest, DeleteSuppressedDestinationResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteSuppressedDestinationCommand}.
 */
export interface DeleteSuppressedDestinationCommandInput extends DeleteSuppressedDestinationRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteSuppressedDestinationCommand}.
 */
export interface DeleteSuppressedDestinationCommandOutput extends DeleteSuppressedDestinationResponse, __MetadataBearer {
}
declare const DeleteSuppressedDestinationCommand_base: {
    new (input: DeleteSuppressedDestinationCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteSuppressedDestinationCommandInput, DeleteSuppressedDestinationCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteSuppressedDestinationCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteSuppressedDestinationCommandInput, DeleteSuppressedDestinationCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Removes an email address from the suppression list for your account.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, DeleteSuppressedDestinationCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, DeleteSuppressedDestinationCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // DeleteSuppressedDestinationRequest
 *   EmailAddress: "STRING_VALUE", // required
 * };
 * const command = new DeleteSuppressedDestinationCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteSuppressedDestinationCommandInput - {@link DeleteSuppressedDestinationCommandInput}
 * @returns {@link DeleteSuppressedDestinationCommandOutput}
 * @see {@link DeleteSuppressedDestinationCommandInput} for command's `input` shape.
 * @see {@link DeleteSuppressedDestinationCommandOutput} for command's `response` shape.
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
export declare class DeleteSuppressedDestinationCommand extends DeleteSuppressedDestinationCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteSuppressedDestinationRequest;
            output: {};
        };
        sdk: {
            input: DeleteSuppressedDestinationCommandInput;
            output: DeleteSuppressedDestinationCommandOutput;
        };
    };
}
