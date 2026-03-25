import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetConfigurationSetEventDestinationsRequest, GetConfigurationSetEventDestinationsResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetConfigurationSetEventDestinationsCommand}.
 */
export interface GetConfigurationSetEventDestinationsCommandInput extends GetConfigurationSetEventDestinationsRequest {
}
/**
 * @public
 *
 * The output of {@link GetConfigurationSetEventDestinationsCommand}.
 */
export interface GetConfigurationSetEventDestinationsCommandOutput extends GetConfigurationSetEventDestinationsResponse, __MetadataBearer {
}
declare const GetConfigurationSetEventDestinationsCommand_base: {
    new (input: GetConfigurationSetEventDestinationsCommandInput): import("@smithy/smithy-client").CommandImpl<GetConfigurationSetEventDestinationsCommandInput, GetConfigurationSetEventDestinationsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetConfigurationSetEventDestinationsCommandInput): import("@smithy/smithy-client").CommandImpl<GetConfigurationSetEventDestinationsCommandInput, GetConfigurationSetEventDestinationsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Retrieve a list of event destinations that are associated with a configuration
 *             set.</p>
 *          <p>
 *             <i>Events</i> include message sends, deliveries, opens, clicks, bounces,
 *             and complaints. <i>Event destinations</i> are places that you can send
 *             information about these events to. For example, you can send event data to Amazon EventBridge and
 *             associate a rule to send the event to the specified target.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, GetConfigurationSetEventDestinationsCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, GetConfigurationSetEventDestinationsCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // GetConfigurationSetEventDestinationsRequest
 *   ConfigurationSetName: "STRING_VALUE", // required
 * };
 * const command = new GetConfigurationSetEventDestinationsCommand(input);
 * const response = await client.send(command);
 * // { // GetConfigurationSetEventDestinationsResponse
 * //   EventDestinations: [ // EventDestinations
 * //     { // EventDestination
 * //       Name: "STRING_VALUE", // required
 * //       Enabled: true || false,
 * //       MatchingEventTypes: [ // EventTypes // required
 * //         "SEND" || "REJECT" || "BOUNCE" || "COMPLAINT" || "DELIVERY" || "OPEN" || "CLICK" || "RENDERING_FAILURE" || "DELIVERY_DELAY" || "SUBSCRIPTION",
 * //       ],
 * //       KinesisFirehoseDestination: { // KinesisFirehoseDestination
 * //         IamRoleArn: "STRING_VALUE", // required
 * //         DeliveryStreamArn: "STRING_VALUE", // required
 * //       },
 * //       CloudWatchDestination: { // CloudWatchDestination
 * //         DimensionConfigurations: [ // CloudWatchDimensionConfigurations // required
 * //           { // CloudWatchDimensionConfiguration
 * //             DimensionName: "STRING_VALUE", // required
 * //             DimensionValueSource: "MESSAGE_TAG" || "EMAIL_HEADER" || "LINK_TAG", // required
 * //             DefaultDimensionValue: "STRING_VALUE", // required
 * //           },
 * //         ],
 * //       },
 * //       SnsDestination: { // SnsDestination
 * //         TopicArn: "STRING_VALUE", // required
 * //       },
 * //       EventBridgeDestination: { // EventBridgeDestination
 * //         EventBusArn: "STRING_VALUE", // required
 * //       },
 * //       PinpointDestination: { // PinpointDestination
 * //         ApplicationArn: "STRING_VALUE",
 * //       },
 * //     },
 * //   ],
 * // };
 *
 * ```
 *
 * @param GetConfigurationSetEventDestinationsCommandInput - {@link GetConfigurationSetEventDestinationsCommandInput}
 * @returns {@link GetConfigurationSetEventDestinationsCommandOutput}
 * @see {@link GetConfigurationSetEventDestinationsCommandInput} for command's `input` shape.
 * @see {@link GetConfigurationSetEventDestinationsCommandOutput} for command's `response` shape.
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
export declare class GetConfigurationSetEventDestinationsCommand extends GetConfigurationSetEventDestinationsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetConfigurationSetEventDestinationsRequest;
            output: GetConfigurationSetEventDestinationsResponse;
        };
        sdk: {
            input: GetConfigurationSetEventDestinationsCommandInput;
            output: GetConfigurationSetEventDestinationsCommandOutput;
        };
    };
}
