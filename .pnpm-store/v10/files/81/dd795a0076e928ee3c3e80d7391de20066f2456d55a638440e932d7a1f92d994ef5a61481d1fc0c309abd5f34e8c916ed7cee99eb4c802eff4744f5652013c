import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetConfigurationSetRequest, GetConfigurationSetResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetConfigurationSetCommand}.
 */
export interface GetConfigurationSetCommandInput extends GetConfigurationSetRequest {
}
/**
 * @public
 *
 * The output of {@link GetConfigurationSetCommand}.
 */
export interface GetConfigurationSetCommandOutput extends GetConfigurationSetResponse, __MetadataBearer {
}
declare const GetConfigurationSetCommand_base: {
    new (input: GetConfigurationSetCommandInput): import("@smithy/smithy-client").CommandImpl<GetConfigurationSetCommandInput, GetConfigurationSetCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetConfigurationSetCommandInput): import("@smithy/smithy-client").CommandImpl<GetConfigurationSetCommandInput, GetConfigurationSetCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Get information about an existing configuration set, including the dedicated IP pool
 *             that it's associated with, whether or not it's enabled for sending email, and
 *             more.</p>
 *          <p>
 *             <i>Configuration sets</i> are groups of rules that you can apply to the
 *             emails you send. You apply a configuration set to an email by including a reference to
 *             the configuration set in the headers of the email. When you apply a configuration set to
 *             an email, all of the rules in that configuration set are applied to the email.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, GetConfigurationSetCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, GetConfigurationSetCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // GetConfigurationSetRequest
 *   ConfigurationSetName: "STRING_VALUE", // required
 * };
 * const command = new GetConfigurationSetCommand(input);
 * const response = await client.send(command);
 * // { // GetConfigurationSetResponse
 * //   ConfigurationSetName: "STRING_VALUE",
 * //   TrackingOptions: { // TrackingOptions
 * //     CustomRedirectDomain: "STRING_VALUE", // required
 * //     HttpsPolicy: "REQUIRE" || "REQUIRE_OPEN_ONLY" || "OPTIONAL",
 * //   },
 * //   DeliveryOptions: { // DeliveryOptions
 * //     TlsPolicy: "REQUIRE" || "OPTIONAL",
 * //     SendingPoolName: "STRING_VALUE",
 * //     MaxDeliverySeconds: Number("long"),
 * //   },
 * //   ReputationOptions: { // ReputationOptions
 * //     ReputationMetricsEnabled: true || false,
 * //     LastFreshStart: new Date("TIMESTAMP"),
 * //   },
 * //   SendingOptions: { // SendingOptions
 * //     SendingEnabled: true || false,
 * //   },
 * //   Tags: [ // TagList
 * //     { // Tag
 * //       Key: "STRING_VALUE", // required
 * //       Value: "STRING_VALUE", // required
 * //     },
 * //   ],
 * //   SuppressionOptions: { // SuppressionOptions
 * //     SuppressedReasons: [ // SuppressionListReasons
 * //       "BOUNCE" || "COMPLAINT",
 * //     ],
 * //   },
 * //   VdmOptions: { // VdmOptions
 * //     DashboardOptions: { // DashboardOptions
 * //       EngagementMetrics: "ENABLED" || "DISABLED",
 * //     },
 * //     GuardianOptions: { // GuardianOptions
 * //       OptimizedSharedDelivery: "ENABLED" || "DISABLED",
 * //     },
 * //   },
 * //   ArchivingOptions: { // ArchivingOptions
 * //     ArchiveArn: "STRING_VALUE",
 * //   },
 * // };
 *
 * ```
 *
 * @param GetConfigurationSetCommandInput - {@link GetConfigurationSetCommandInput}
 * @returns {@link GetConfigurationSetCommandOutput}
 * @see {@link GetConfigurationSetCommandInput} for command's `input` shape.
 * @see {@link GetConfigurationSetCommandOutput} for command's `response` shape.
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
export declare class GetConfigurationSetCommand extends GetConfigurationSetCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetConfigurationSetRequest;
            output: GetConfigurationSetResponse;
        };
        sdk: {
            input: GetConfigurationSetCommandInput;
            output: GetConfigurationSetCommandOutput;
        };
    };
}
