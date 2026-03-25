import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetEmailIdentityRequest, GetEmailIdentityResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetEmailIdentityCommand}.
 */
export interface GetEmailIdentityCommandInput extends GetEmailIdentityRequest {
}
/**
 * @public
 *
 * The output of {@link GetEmailIdentityCommand}.
 */
export interface GetEmailIdentityCommandOutput extends GetEmailIdentityResponse, __MetadataBearer {
}
declare const GetEmailIdentityCommand_base: {
    new (input: GetEmailIdentityCommandInput): import("@smithy/smithy-client").CommandImpl<GetEmailIdentityCommandInput, GetEmailIdentityCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetEmailIdentityCommandInput): import("@smithy/smithy-client").CommandImpl<GetEmailIdentityCommandInput, GetEmailIdentityCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Provides information about a specific identity, including the identity's verification
 *             status, sending authorization policies, its DKIM authentication status, and its custom
 *             Mail-From settings.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, GetEmailIdentityCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, GetEmailIdentityCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // GetEmailIdentityRequest
 *   EmailIdentity: "STRING_VALUE", // required
 * };
 * const command = new GetEmailIdentityCommand(input);
 * const response = await client.send(command);
 * // { // GetEmailIdentityResponse
 * //   IdentityType: "EMAIL_ADDRESS" || "DOMAIN" || "MANAGED_DOMAIN",
 * //   FeedbackForwardingStatus: true || false,
 * //   VerifiedForSendingStatus: true || false,
 * //   DkimAttributes: { // DkimAttributes
 * //     SigningEnabled: true || false,
 * //     Status: "PENDING" || "SUCCESS" || "FAILED" || "TEMPORARY_FAILURE" || "NOT_STARTED",
 * //     Tokens: [ // DnsTokenList
 * //       "STRING_VALUE",
 * //     ],
 * //     SigningAttributesOrigin: "AWS_SES" || "EXTERNAL" || "AWS_SES_AF_SOUTH_1" || "AWS_SES_EU_NORTH_1" || "AWS_SES_AP_SOUTH_1" || "AWS_SES_EU_WEST_3" || "AWS_SES_EU_WEST_2" || "AWS_SES_EU_SOUTH_1" || "AWS_SES_EU_WEST_1" || "AWS_SES_AP_NORTHEAST_3" || "AWS_SES_AP_NORTHEAST_2" || "AWS_SES_ME_SOUTH_1" || "AWS_SES_AP_NORTHEAST_1" || "AWS_SES_IL_CENTRAL_1" || "AWS_SES_SA_EAST_1" || "AWS_SES_CA_CENTRAL_1" || "AWS_SES_AP_SOUTHEAST_1" || "AWS_SES_AP_SOUTHEAST_2" || "AWS_SES_AP_SOUTHEAST_3" || "AWS_SES_EU_CENTRAL_1" || "AWS_SES_US_EAST_1" || "AWS_SES_US_EAST_2" || "AWS_SES_US_WEST_1" || "AWS_SES_US_WEST_2" || "AWS_SES_ME_CENTRAL_1" || "AWS_SES_AP_SOUTH_2" || "AWS_SES_EU_CENTRAL_2",
 * //     NextSigningKeyLength: "RSA_1024_BIT" || "RSA_2048_BIT",
 * //     CurrentSigningKeyLength: "RSA_1024_BIT" || "RSA_2048_BIT",
 * //     LastKeyGenerationTimestamp: new Date("TIMESTAMP"),
 * //   },
 * //   MailFromAttributes: { // MailFromAttributes
 * //     MailFromDomain: "STRING_VALUE", // required
 * //     MailFromDomainStatus: "PENDING" || "SUCCESS" || "FAILED" || "TEMPORARY_FAILURE", // required
 * //     BehaviorOnMxFailure: "USE_DEFAULT_VALUE" || "REJECT_MESSAGE", // required
 * //   },
 * //   Policies: { // PolicyMap
 * //     "<keys>": "STRING_VALUE",
 * //   },
 * //   Tags: [ // TagList
 * //     { // Tag
 * //       Key: "STRING_VALUE", // required
 * //       Value: "STRING_VALUE", // required
 * //     },
 * //   ],
 * //   ConfigurationSetName: "STRING_VALUE",
 * //   VerificationStatus: "PENDING" || "SUCCESS" || "FAILED" || "TEMPORARY_FAILURE" || "NOT_STARTED",
 * //   VerificationInfo: { // VerificationInfo
 * //     LastCheckedTimestamp: new Date("TIMESTAMP"),
 * //     LastSuccessTimestamp: new Date("TIMESTAMP"),
 * //     ErrorType: "SERVICE_ERROR" || "DNS_SERVER_ERROR" || "HOST_NOT_FOUND" || "TYPE_NOT_FOUND" || "INVALID_VALUE" || "REPLICATION_ACCESS_DENIED" || "REPLICATION_PRIMARY_NOT_FOUND" || "REPLICATION_PRIMARY_BYO_DKIM_NOT_SUPPORTED" || "REPLICATION_REPLICA_AS_PRIMARY_NOT_SUPPORTED" || "REPLICATION_PRIMARY_INVALID_REGION",
 * //     SOARecord: { // SOARecord
 * //       PrimaryNameServer: "STRING_VALUE",
 * //       AdminEmail: "STRING_VALUE",
 * //       SerialNumber: Number("long"),
 * //     },
 * //   },
 * // };
 *
 * ```
 *
 * @param GetEmailIdentityCommandInput - {@link GetEmailIdentityCommandInput}
 * @returns {@link GetEmailIdentityCommandOutput}
 * @see {@link GetEmailIdentityCommandInput} for command's `input` shape.
 * @see {@link GetEmailIdentityCommandOutput} for command's `response` shape.
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
export declare class GetEmailIdentityCommand extends GetEmailIdentityCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetEmailIdentityRequest;
            output: GetEmailIdentityResponse;
        };
        sdk: {
            input: GetEmailIdentityCommandInput;
            output: GetEmailIdentityCommandOutput;
        };
    };
}
