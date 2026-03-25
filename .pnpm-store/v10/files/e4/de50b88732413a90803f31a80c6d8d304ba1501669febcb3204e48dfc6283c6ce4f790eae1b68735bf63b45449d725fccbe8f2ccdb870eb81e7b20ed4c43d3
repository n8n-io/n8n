import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetReputationEntityRequest, GetReputationEntityResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetReputationEntityCommand}.
 */
export interface GetReputationEntityCommandInput extends GetReputationEntityRequest {
}
/**
 * @public
 *
 * The output of {@link GetReputationEntityCommand}.
 */
export interface GetReputationEntityCommandOutput extends GetReputationEntityResponse, __MetadataBearer {
}
declare const GetReputationEntityCommand_base: {
    new (input: GetReputationEntityCommandInput): import("@smithy/smithy-client").CommandImpl<GetReputationEntityCommandInput, GetReputationEntityCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetReputationEntityCommandInput): import("@smithy/smithy-client").CommandImpl<GetReputationEntityCommandInput, GetReputationEntityCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Retrieve information about a specific reputation entity, including its reputation
 *             management policy, customer-managed status, Amazon Web Services Amazon SES-managed status, and aggregate
 *             sending status.</p>
 *          <p>
 *             <i>Reputation entities</i> represent resources in your Amazon SES account that have reputation
 *             tracking and management capabilities. The reputation impact reflects the highest
 *             impact reputation finding for the entity. Reputation findings can be retrieved
 *             using the <code>ListRecommendations</code> operation.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, GetReputationEntityCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, GetReputationEntityCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // GetReputationEntityRequest
 *   ReputationEntityReference: "STRING_VALUE", // required
 *   ReputationEntityType: "RESOURCE", // required
 * };
 * const command = new GetReputationEntityCommand(input);
 * const response = await client.send(command);
 * // { // GetReputationEntityResponse
 * //   ReputationEntity: { // ReputationEntity
 * //     ReputationEntityReference: "STRING_VALUE",
 * //     ReputationEntityType: "RESOURCE",
 * //     ReputationManagementPolicy: "STRING_VALUE",
 * //     CustomerManagedStatus: { // StatusRecord
 * //       Status: "ENABLED" || "REINSTATED" || "DISABLED",
 * //       Cause: "STRING_VALUE",
 * //       LastUpdatedTimestamp: new Date("TIMESTAMP"),
 * //     },
 * //     AwsSesManagedStatus: {
 * //       Status: "ENABLED" || "REINSTATED" || "DISABLED",
 * //       Cause: "STRING_VALUE",
 * //       LastUpdatedTimestamp: new Date("TIMESTAMP"),
 * //     },
 * //     SendingStatusAggregate: "ENABLED" || "REINSTATED" || "DISABLED",
 * //     ReputationImpact: "LOW" || "HIGH",
 * //   },
 * // };
 *
 * ```
 *
 * @param GetReputationEntityCommandInput - {@link GetReputationEntityCommandInput}
 * @returns {@link GetReputationEntityCommandOutput}
 * @see {@link GetReputationEntityCommandInput} for command's `input` shape.
 * @see {@link GetReputationEntityCommandOutput} for command's `response` shape.
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
export declare class GetReputationEntityCommand extends GetReputationEntityCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetReputationEntityRequest;
            output: GetReputationEntityResponse;
        };
        sdk: {
            input: GetReputationEntityCommandInput;
            output: GetReputationEntityCommandOutput;
        };
    };
}
