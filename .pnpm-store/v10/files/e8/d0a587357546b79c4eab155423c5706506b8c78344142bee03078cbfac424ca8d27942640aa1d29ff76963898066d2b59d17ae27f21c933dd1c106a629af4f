import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetDeliverabilityDashboardOptionsRequest, GetDeliverabilityDashboardOptionsResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetDeliverabilityDashboardOptionsCommand}.
 */
export interface GetDeliverabilityDashboardOptionsCommandInput extends GetDeliverabilityDashboardOptionsRequest {
}
/**
 * @public
 *
 * The output of {@link GetDeliverabilityDashboardOptionsCommand}.
 */
export interface GetDeliverabilityDashboardOptionsCommandOutput extends GetDeliverabilityDashboardOptionsResponse, __MetadataBearer {
}
declare const GetDeliverabilityDashboardOptionsCommand_base: {
    new (input: GetDeliverabilityDashboardOptionsCommandInput): import("@smithy/smithy-client").CommandImpl<GetDeliverabilityDashboardOptionsCommandInput, GetDeliverabilityDashboardOptionsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [GetDeliverabilityDashboardOptionsCommandInput]): import("@smithy/smithy-client").CommandImpl<GetDeliverabilityDashboardOptionsCommandInput, GetDeliverabilityDashboardOptionsCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Retrieve information about the status of the Deliverability dashboard for your account. When
 *             the Deliverability dashboard is enabled, you gain access to reputation, deliverability, and other
 *             metrics for the domains that you use to send email. You also gain the ability to perform
 *             predictive inbox placement tests.</p>
 *          <p>When you use the Deliverability dashboard, you pay a monthly subscription charge, in addition
 *             to any other fees that you accrue by using Amazon SES and other Amazon Web Services services. For more
 *             information about the features and cost of a Deliverability dashboard subscription, see <a href="http://aws.amazon.com/ses/pricing/">Amazon SES Pricing</a>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, GetDeliverabilityDashboardOptionsCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, GetDeliverabilityDashboardOptionsCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = {};
 * const command = new GetDeliverabilityDashboardOptionsCommand(input);
 * const response = await client.send(command);
 * // { // GetDeliverabilityDashboardOptionsResponse
 * //   DashboardEnabled: true || false, // required
 * //   SubscriptionExpiryDate: new Date("TIMESTAMP"),
 * //   AccountStatus: "ACTIVE" || "PENDING_EXPIRATION" || "DISABLED",
 * //   ActiveSubscribedDomains: [ // DomainDeliverabilityTrackingOptions
 * //     { // DomainDeliverabilityTrackingOption
 * //       Domain: "STRING_VALUE",
 * //       SubscriptionStartDate: new Date("TIMESTAMP"),
 * //       InboxPlacementTrackingOption: { // InboxPlacementTrackingOption
 * //         Global: true || false,
 * //         TrackedIsps: [ // IspNameList
 * //           "STRING_VALUE",
 * //         ],
 * //       },
 * //     },
 * //   ],
 * //   PendingExpirationSubscribedDomains: [
 * //     {
 * //       Domain: "STRING_VALUE",
 * //       SubscriptionStartDate: new Date("TIMESTAMP"),
 * //       InboxPlacementTrackingOption: {
 * //         Global: true || false,
 * //         TrackedIsps: [
 * //           "STRING_VALUE",
 * //         ],
 * //       },
 * //     },
 * //   ],
 * // };
 *
 * ```
 *
 * @param GetDeliverabilityDashboardOptionsCommandInput - {@link GetDeliverabilityDashboardOptionsCommandInput}
 * @returns {@link GetDeliverabilityDashboardOptionsCommandOutput}
 * @see {@link GetDeliverabilityDashboardOptionsCommandInput} for command's `input` shape.
 * @see {@link GetDeliverabilityDashboardOptionsCommandOutput} for command's `response` shape.
 * @see {@link SESv2ClientResolvedConfig | config} for SESv2Client's `config` shape.
 *
 * @throws {@link BadRequestException} (client fault)
 *  <p>The input you provided is invalid.</p>
 *
 * @throws {@link LimitExceededException} (client fault)
 *  <p>There are too many instances of the specified resource type.</p>
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
export declare class GetDeliverabilityDashboardOptionsCommand extends GetDeliverabilityDashboardOptionsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: {};
            output: GetDeliverabilityDashboardOptionsResponse;
        };
        sdk: {
            input: GetDeliverabilityDashboardOptionsCommandInput;
            output: GetDeliverabilityDashboardOptionsCommandOutput;
        };
    };
}
