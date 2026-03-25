import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateConfigurationSetRequest, CreateConfigurationSetResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateConfigurationSetCommand}.
 */
export interface CreateConfigurationSetCommandInput extends CreateConfigurationSetRequest {
}
/**
 * @public
 *
 * The output of {@link CreateConfigurationSetCommand}.
 */
export interface CreateConfigurationSetCommandOutput extends CreateConfigurationSetResponse, __MetadataBearer {
}
declare const CreateConfigurationSetCommand_base: {
    new (input: CreateConfigurationSetCommandInput): import("@smithy/smithy-client").CommandImpl<CreateConfigurationSetCommandInput, CreateConfigurationSetCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateConfigurationSetCommandInput): import("@smithy/smithy-client").CommandImpl<CreateConfigurationSetCommandInput, CreateConfigurationSetCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Create a configuration set. <i>Configuration sets</i> are groups of
 *             rules that you can apply to the emails that you send. You apply a configuration set to
 *             an email by specifying the name of the configuration set when you call the Amazon SES API v2. When
 *             you apply a configuration set to an email, all of the rules in that configuration set
 *             are applied to the email. </p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, CreateConfigurationSetCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, CreateConfigurationSetCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // CreateConfigurationSetRequest
 *   ConfigurationSetName: "STRING_VALUE", // required
 *   TrackingOptions: { // TrackingOptions
 *     CustomRedirectDomain: "STRING_VALUE", // required
 *     HttpsPolicy: "REQUIRE" || "REQUIRE_OPEN_ONLY" || "OPTIONAL",
 *   },
 *   DeliveryOptions: { // DeliveryOptions
 *     TlsPolicy: "REQUIRE" || "OPTIONAL",
 *     SendingPoolName: "STRING_VALUE",
 *     MaxDeliverySeconds: Number("long"),
 *   },
 *   ReputationOptions: { // ReputationOptions
 *     ReputationMetricsEnabled: true || false,
 *     LastFreshStart: new Date("TIMESTAMP"),
 *   },
 *   SendingOptions: { // SendingOptions
 *     SendingEnabled: true || false,
 *   },
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 *   SuppressionOptions: { // SuppressionOptions
 *     SuppressedReasons: [ // SuppressionListReasons
 *       "BOUNCE" || "COMPLAINT",
 *     ],
 *   },
 *   VdmOptions: { // VdmOptions
 *     DashboardOptions: { // DashboardOptions
 *       EngagementMetrics: "ENABLED" || "DISABLED",
 *     },
 *     GuardianOptions: { // GuardianOptions
 *       OptimizedSharedDelivery: "ENABLED" || "DISABLED",
 *     },
 *   },
 *   ArchivingOptions: { // ArchivingOptions
 *     ArchiveArn: "STRING_VALUE",
 *   },
 * };
 * const command = new CreateConfigurationSetCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param CreateConfigurationSetCommandInput - {@link CreateConfigurationSetCommandInput}
 * @returns {@link CreateConfigurationSetCommandOutput}
 * @see {@link CreateConfigurationSetCommandInput} for command's `input` shape.
 * @see {@link CreateConfigurationSetCommandOutput} for command's `response` shape.
 * @see {@link SESv2ClientResolvedConfig | config} for SESv2Client's `config` shape.
 *
 * @throws {@link AlreadyExistsException} (client fault)
 *  <p>The resource specified in your request already exists.</p>
 *
 * @throws {@link BadRequestException} (client fault)
 *  <p>The input you provided is invalid.</p>
 *
 * @throws {@link ConcurrentModificationException} (server fault)
 *  <p>The resource is being modified by another operation or thread.</p>
 *
 * @throws {@link LimitExceededException} (client fault)
 *  <p>There are too many instances of the specified resource type.</p>
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
export declare class CreateConfigurationSetCommand extends CreateConfigurationSetCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateConfigurationSetRequest;
            output: {};
        };
        sdk: {
            input: CreateConfigurationSetCommandInput;
            output: CreateConfigurationSetCommandOutput;
        };
    };
}
