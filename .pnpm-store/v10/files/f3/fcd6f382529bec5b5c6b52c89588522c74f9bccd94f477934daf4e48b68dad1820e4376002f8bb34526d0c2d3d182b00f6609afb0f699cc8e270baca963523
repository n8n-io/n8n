import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListEmailIdentitiesRequest, ListEmailIdentitiesResponse } from "../models/models_0";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListEmailIdentitiesCommand}.
 */
export interface ListEmailIdentitiesCommandInput extends ListEmailIdentitiesRequest {
}
/**
 * @public
 *
 * The output of {@link ListEmailIdentitiesCommand}.
 */
export interface ListEmailIdentitiesCommandOutput extends ListEmailIdentitiesResponse, __MetadataBearer {
}
declare const ListEmailIdentitiesCommand_base: {
    new (input: ListEmailIdentitiesCommandInput): import("@smithy/smithy-client").CommandImpl<ListEmailIdentitiesCommandInput, ListEmailIdentitiesCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListEmailIdentitiesCommandInput]): import("@smithy/smithy-client").CommandImpl<ListEmailIdentitiesCommandInput, ListEmailIdentitiesCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Returns a list of all of the email identities that are associated with your Amazon Web Services
 *             account. An identity can be either an email address or a domain. This operation returns
 *             identities that are verified as well as those that aren't. This operation returns
 *             identities that are associated with Amazon SES and Amazon Pinpoint.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, ListEmailIdentitiesCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, ListEmailIdentitiesCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // ListEmailIdentitiesRequest
 *   NextToken: "STRING_VALUE",
 *   PageSize: Number("int"),
 * };
 * const command = new ListEmailIdentitiesCommand(input);
 * const response = await client.send(command);
 * // { // ListEmailIdentitiesResponse
 * //   EmailIdentities: [ // IdentityInfoList
 * //     { // IdentityInfo
 * //       IdentityType: "EMAIL_ADDRESS" || "DOMAIN" || "MANAGED_DOMAIN",
 * //       IdentityName: "STRING_VALUE",
 * //       SendingEnabled: true || false,
 * //       VerificationStatus: "PENDING" || "SUCCESS" || "FAILED" || "TEMPORARY_FAILURE" || "NOT_STARTED",
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListEmailIdentitiesCommandInput - {@link ListEmailIdentitiesCommandInput}
 * @returns {@link ListEmailIdentitiesCommandOutput}
 * @see {@link ListEmailIdentitiesCommandInput} for command's `input` shape.
 * @see {@link ListEmailIdentitiesCommandOutput} for command's `response` shape.
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
export declare class ListEmailIdentitiesCommand extends ListEmailIdentitiesCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListEmailIdentitiesRequest;
            output: ListEmailIdentitiesResponse;
        };
        sdk: {
            input: ListEmailIdentitiesCommandInput;
            output: ListEmailIdentitiesCommandOutput;
        };
    };
}
