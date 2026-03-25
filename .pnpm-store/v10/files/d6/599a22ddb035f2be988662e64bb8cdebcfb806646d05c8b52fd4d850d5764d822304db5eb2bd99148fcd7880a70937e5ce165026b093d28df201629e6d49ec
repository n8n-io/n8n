import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteConfigurationSetEventDestinationRequest, DeleteConfigurationSetEventDestinationResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteConfigurationSetEventDestinationCommand}.
 */
export interface DeleteConfigurationSetEventDestinationCommandInput extends DeleteConfigurationSetEventDestinationRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteConfigurationSetEventDestinationCommand}.
 */
export interface DeleteConfigurationSetEventDestinationCommandOutput extends DeleteConfigurationSetEventDestinationResponse, __MetadataBearer {
}
declare const DeleteConfigurationSetEventDestinationCommand_base: {
    new (input: DeleteConfigurationSetEventDestinationCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteConfigurationSetEventDestinationCommandInput, DeleteConfigurationSetEventDestinationCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteConfigurationSetEventDestinationCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteConfigurationSetEventDestinationCommandInput, DeleteConfigurationSetEventDestinationCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Delete an event destination.</p>
 *          <p>
 *             <i>Events</i> include message sends, deliveries, opens, clicks, bounces,
 *             and complaints. <i>Event destinations</i> are places that you can send
 *             information about these events to. For example, you can send event data to Amazon EventBridge and
 *             associate a rule to send the event to the specified target.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, DeleteConfigurationSetEventDestinationCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, DeleteConfigurationSetEventDestinationCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // DeleteConfigurationSetEventDestinationRequest
 *   ConfigurationSetName: "STRING_VALUE", // required
 *   EventDestinationName: "STRING_VALUE", // required
 * };
 * const command = new DeleteConfigurationSetEventDestinationCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteConfigurationSetEventDestinationCommandInput - {@link DeleteConfigurationSetEventDestinationCommandInput}
 * @returns {@link DeleteConfigurationSetEventDestinationCommandOutput}
 * @see {@link DeleteConfigurationSetEventDestinationCommandInput} for command's `input` shape.
 * @see {@link DeleteConfigurationSetEventDestinationCommandOutput} for command's `response` shape.
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
export declare class DeleteConfigurationSetEventDestinationCommand extends DeleteConfigurationSetEventDestinationCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteConfigurationSetEventDestinationRequest;
            output: {};
        };
        sdk: {
            input: DeleteConfigurationSetEventDestinationCommandInput;
            output: DeleteConfigurationSetEventDestinationCommandOutput;
        };
    };
}
