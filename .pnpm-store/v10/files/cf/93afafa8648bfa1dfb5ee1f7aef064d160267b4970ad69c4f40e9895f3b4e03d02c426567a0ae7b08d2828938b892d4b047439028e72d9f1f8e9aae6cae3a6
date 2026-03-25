import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateEmailIdentityRequest, CreateEmailIdentityResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateEmailIdentityCommand}.
 */
export interface CreateEmailIdentityCommandInput extends CreateEmailIdentityRequest {
}
/**
 * @public
 *
 * The output of {@link CreateEmailIdentityCommand}.
 */
export interface CreateEmailIdentityCommandOutput extends CreateEmailIdentityResponse, __MetadataBearer {
}
declare const CreateEmailIdentityCommand_base: {
    new (input: CreateEmailIdentityCommandInput): import("@smithy/smithy-client").CommandImpl<CreateEmailIdentityCommandInput, CreateEmailIdentityCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateEmailIdentityCommandInput): import("@smithy/smithy-client").CommandImpl<CreateEmailIdentityCommandInput, CreateEmailIdentityCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Starts the process of verifying an email identity. An <i>identity</i> is
 *             an email address or domain that you use when you send email. Before you can use an
 *             identity to send email, you first have to verify it. By verifying an identity, you
 *             demonstrate that you're the owner of the identity, and that you've given Amazon SES API v2
 *             permission to send email from the identity.</p>
 *          <p>When you verify an email address, Amazon SES sends an email to the address. Your email
 *             address is verified as soon as you follow the link in the verification email.
 *
 *         </p>
 *          <p>When you verify a domain without specifying the <code>DkimSigningAttributes</code>
 *             object, this operation provides a set of DKIM tokens. You can convert these tokens into
 *             CNAME records, which you then add to the DNS configuration for your domain. Your domain
 *             is verified when Amazon SES detects these records in the DNS configuration for your domain.
 *             This verification method is known as <a href="https://docs.aws.amazon.com/ses/latest/DeveloperGuide/easy-dkim.html">Easy DKIM</a>.</p>
 *          <p>Alternatively, you can perform the verification process by providing your own
 *             public-private key pair. This verification method is known as Bring Your Own DKIM
 *             (BYODKIM). To use BYODKIM, your call to the <code>CreateEmailIdentity</code> operation
 *             has to include the <code>DkimSigningAttributes</code> object. When you specify this
 *             object, you provide a selector (a component of the DNS record name that identifies the
 *             public key to use for DKIM authentication) and a private key.</p>
 *          <p>When you verify a domain, this operation provides a set of DKIM tokens, which you can
 *             convert into CNAME tokens. You add these CNAME tokens to the DNS configuration for your
 *             domain. Your domain is verified when Amazon SES detects these records in the DNS
 *             configuration for your domain. For some DNS providers, it can take 72 hours or more to
 *             complete the domain verification process.</p>
 *          <p>Additionally, you can associate an existing configuration set with the email identity that you're verifying.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, CreateEmailIdentityCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, CreateEmailIdentityCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // CreateEmailIdentityRequest
 *   EmailIdentity: "STRING_VALUE", // required
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 *   DkimSigningAttributes: { // DkimSigningAttributes
 *     DomainSigningSelector: "STRING_VALUE",
 *     DomainSigningPrivateKey: "STRING_VALUE",
 *     NextSigningKeyLength: "RSA_1024_BIT" || "RSA_2048_BIT",
 *     DomainSigningAttributesOrigin: "AWS_SES" || "EXTERNAL" || "AWS_SES_AF_SOUTH_1" || "AWS_SES_EU_NORTH_1" || "AWS_SES_AP_SOUTH_1" || "AWS_SES_EU_WEST_3" || "AWS_SES_EU_WEST_2" || "AWS_SES_EU_SOUTH_1" || "AWS_SES_EU_WEST_1" || "AWS_SES_AP_NORTHEAST_3" || "AWS_SES_AP_NORTHEAST_2" || "AWS_SES_ME_SOUTH_1" || "AWS_SES_AP_NORTHEAST_1" || "AWS_SES_IL_CENTRAL_1" || "AWS_SES_SA_EAST_1" || "AWS_SES_CA_CENTRAL_1" || "AWS_SES_AP_SOUTHEAST_1" || "AWS_SES_AP_SOUTHEAST_2" || "AWS_SES_AP_SOUTHEAST_3" || "AWS_SES_EU_CENTRAL_1" || "AWS_SES_US_EAST_1" || "AWS_SES_US_EAST_2" || "AWS_SES_US_WEST_1" || "AWS_SES_US_WEST_2" || "AWS_SES_ME_CENTRAL_1" || "AWS_SES_AP_SOUTH_2" || "AWS_SES_EU_CENTRAL_2",
 *   },
 *   ConfigurationSetName: "STRING_VALUE",
 * };
 * const command = new CreateEmailIdentityCommand(input);
 * const response = await client.send(command);
 * // { // CreateEmailIdentityResponse
 * //   IdentityType: "EMAIL_ADDRESS" || "DOMAIN" || "MANAGED_DOMAIN",
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
 * // };
 *
 * ```
 *
 * @param CreateEmailIdentityCommandInput - {@link CreateEmailIdentityCommandInput}
 * @returns {@link CreateEmailIdentityCommandOutput}
 * @see {@link CreateEmailIdentityCommandInput} for command's `input` shape.
 * @see {@link CreateEmailIdentityCommandOutput} for command's `response` shape.
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
export declare class CreateEmailIdentityCommand extends CreateEmailIdentityCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateEmailIdentityRequest;
            output: CreateEmailIdentityResponse;
        };
        sdk: {
            input: CreateEmailIdentityCommandInput;
            output: CreateEmailIdentityCommandOutput;
        };
    };
}
