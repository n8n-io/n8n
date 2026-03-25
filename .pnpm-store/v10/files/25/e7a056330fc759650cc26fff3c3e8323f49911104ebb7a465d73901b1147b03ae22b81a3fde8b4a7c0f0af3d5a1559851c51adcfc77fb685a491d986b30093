import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { UpdateConfigurationSetEventDestinationRequest, UpdateConfigurationSetEventDestinationResponse } from "../models/models_1";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateConfigurationSetEventDestinationCommand}.
 */
export interface UpdateConfigurationSetEventDestinationCommandInput extends UpdateConfigurationSetEventDestinationRequest {
}
/**
 * @public
 *
 * The output of {@link UpdateConfigurationSetEventDestinationCommand}.
 */
export interface UpdateConfigurationSetEventDestinationCommandOutput extends UpdateConfigurationSetEventDestinationResponse, __MetadataBearer {
}
declare const UpdateConfigurationSetEventDestinationCommand_base: {
    new (input: UpdateConfigurationSetEventDestinationCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateConfigurationSetEventDestinationCommandInput, UpdateConfigurationSetEventDestinationCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateConfigurationSetEventDestinationCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateConfigurationSetEventDestinationCommandInput, UpdateConfigurationSetEventDestinationCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Update the configuration of an event destination for a configuration set.</p>
 *          <p>
 *             <i>Events</i> include message sends, deliveries, opens, clicks, bounces,
 *             and complaints. <i>Event destinations</i> are places that you can send
 *             information about these events to. For example, you can send event data to Amazon EventBridge and
 *             associate a rule to send the event to the specified target.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, UpdateConfigurationSetEventDestinationCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, UpdateConfigurationSetEventDestinationCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // UpdateConfigurationSetEventDestinationRequest
 *   ConfigurationSetName: "STRING_VALUE", // required
 *   EventDestinationName: "STRING_VALUE", // required
 *   EventDestination: { // EventDestinationDefinition
 *     Enabled: true || false,
 *     MatchingEventTypes: [ // EventTypes
 *       "SEND" || "REJECT" || "BOUNCE" || "COMPLAINT" || "DELIVERY" || "OPEN" || "CLICK" || "RENDERING_FAILURE" || "DELIVERY_DELAY" || "SUBSCRIPTION",
 *     ],
 *     KinesisFirehoseDestination: { // KinesisFirehoseDestination
 *       IamRoleArn: "STRING_VALUE", // required
 *       DeliveryStreamArn: "STRING_VALUE", // required
 *     },
 *     CloudWatchDestination: { // CloudWatchDestination
 *       DimensionConfigurations: [ // CloudWatchDimensionConfigurations // required
 *         { // CloudWatchDimensionConfiguration
 *           DimensionName: "STRING_VALUE", // required
 *           DimensionValueSource: "MESSAGE_TAG" || "EMAIL_HEADER" || "LINK_TAG", // required
 *           DefaultDimensionValue: "STRING_VALUE", // required
 *         },
 *       ],
 *     },
 *     SnsDestination: { // SnsDestination
 *       TopicArn: "STRING_VALUE", // required
 *     },
 *     EventBridgeDestination: { // EventBridgeDestination
 *       EventBusArn: "STRING_VALUE", // required
 *     },
 *     PinpointDestination: { // PinpointDestination
 *       ApplicationArn: "STRING_VALUE",
 *     },
 *   },
 * };
 * const command = new UpdateConfigurationSetEventDestinationCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param UpdateConfigurationSetEventDestinationCommandInput - {@link UpdateConfigurationSetEventDestinationCommandInput}
 * @returns {@link UpdateConfigurationSetEventDestinationCommandOutput}
 * @see {@link UpdateConfigurationSetEventDestinationCommandInput} for command's `input` shape.
 * @see {@link UpdateConfigurationSetEventDestinationCommandOutput} for command's `response` shape.
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
export declare class UpdateConfigurationSetEventDestinationCommand extends UpdateConfigurationSetEventDestinationCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateConfigurationSetEventDestinationRequest;
            output: {};
        };
        sdk: {
            input: UpdateConfigurationSetEventDestinationCommandInput;
            output: UpdateConfigurationSetEventDestinationCommandOutput;
        };
    };
}
