import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListReputationEntitiesRequest, ListReputationEntitiesResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListReputationEntitiesCommand}.
 */
export interface ListReputationEntitiesCommandInput extends ListReputationEntitiesRequest {
}
/**
 * @public
 *
 * The output of {@link ListReputationEntitiesCommand}.
 */
export interface ListReputationEntitiesCommandOutput extends ListReputationEntitiesResponse, __MetadataBearer {
}
declare const ListReputationEntitiesCommand_base: {
    new (input: ListReputationEntitiesCommandInput): import("@smithy/smithy-client").CommandImpl<ListReputationEntitiesCommandInput, ListReputationEntitiesCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListReputationEntitiesCommandInput]): import("@smithy/smithy-client").CommandImpl<ListReputationEntitiesCommandInput, ListReputationEntitiesCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>List reputation entities in your Amazon SES account in the current Amazon Web Services Region.
 *             You can filter the results by entity type, reputation impact, sending status,
 *             or entity reference prefix.</p>
 *          <p>
 *             <i>Reputation entities</i> represent resources in your account that have reputation
 *             tracking and management capabilities. Use this operation to get an overview of
 *             all entities and their current reputation status.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, ListReputationEntitiesCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, ListReputationEntitiesCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // ListReputationEntitiesRequest
 *   Filter: { // ReputationEntityFilter
 *     "<keys>": "STRING_VALUE",
 *   },
 *   NextToken: "STRING_VALUE",
 *   PageSize: Number("int"),
 * };
 * const command = new ListReputationEntitiesCommand(input);
 * const response = await client.send(command);
 * // { // ListReputationEntitiesResponse
 * //   ReputationEntities: [ // ReputationEntitiesList
 * //     { // ReputationEntity
 * //       ReputationEntityReference: "STRING_VALUE",
 * //       ReputationEntityType: "RESOURCE",
 * //       ReputationManagementPolicy: "STRING_VALUE",
 * //       CustomerManagedStatus: { // StatusRecord
 * //         Status: "ENABLED" || "REINSTATED" || "DISABLED",
 * //         Cause: "STRING_VALUE",
 * //         LastUpdatedTimestamp: new Date("TIMESTAMP"),
 * //       },
 * //       AwsSesManagedStatus: {
 * //         Status: "ENABLED" || "REINSTATED" || "DISABLED",
 * //         Cause: "STRING_VALUE",
 * //         LastUpdatedTimestamp: new Date("TIMESTAMP"),
 * //       },
 * //       SendingStatusAggregate: "ENABLED" || "REINSTATED" || "DISABLED",
 * //       ReputationImpact: "LOW" || "HIGH",
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListReputationEntitiesCommandInput - {@link ListReputationEntitiesCommandInput}
 * @returns {@link ListReputationEntitiesCommandOutput}
 * @see {@link ListReputationEntitiesCommandInput} for command's `input` shape.
 * @see {@link ListReputationEntitiesCommandOutput} for command's `response` shape.
 * @see {@link SESv2ClientResolvedConfig | config} for SESv2Client's `config` shape.
 *
 * @throws {@link BadRequestException} (client fault)
 *  <p>The input you provided is invalid.</p>
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
export declare class ListReputationEntitiesCommand extends ListReputationEntitiesCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListReputationEntitiesRequest;
            output: ListReputationEntitiesResponse;
        };
        sdk: {
            input: ListReputationEntitiesCommandInput;
            output: ListReputationEntitiesCommandOutput;
        };
    };
}
