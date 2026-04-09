import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../KendraClient";
import type { ListExperienceEntitiesRequest, ListExperienceEntitiesResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListExperienceEntitiesCommand}.
 */
export interface ListExperienceEntitiesCommandInput extends ListExperienceEntitiesRequest {
}
/**
 * @public
 *
 * The output of {@link ListExperienceEntitiesCommand}.
 */
export interface ListExperienceEntitiesCommandOutput extends ListExperienceEntitiesResponse, __MetadataBearer {
}
declare const ListExperienceEntitiesCommand_base: {
    new (input: ListExperienceEntitiesCommandInput): import("@smithy/smithy-client").CommandImpl<ListExperienceEntitiesCommandInput, ListExperienceEntitiesCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListExperienceEntitiesCommandInput): import("@smithy/smithy-client").CommandImpl<ListExperienceEntitiesCommandInput, ListExperienceEntitiesCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists users or groups in your IAM Identity Center identity source that are
 *             granted access to your Amazon Kendra experience. You can create an Amazon Kendra experience
 *             such as a search application. For more information on creating a search
 *             application experience, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/deploying-search-experience-no-code.html">Building
 *                 a search experience with no code</a>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { KendraClient, ListExperienceEntitiesCommand } from "@aws-sdk/client-kendra"; // ES Modules import
 * // const { KendraClient, ListExperienceEntitiesCommand } = require("@aws-sdk/client-kendra"); // CommonJS import
 * // import type { KendraClientConfig } from "@aws-sdk/client-kendra";
 * const config = {}; // type is KendraClientConfig
 * const client = new KendraClient(config);
 * const input = { // ListExperienceEntitiesRequest
 *   Id: "STRING_VALUE", // required
 *   IndexId: "STRING_VALUE", // required
 *   NextToken: "STRING_VALUE",
 * };
 * const command = new ListExperienceEntitiesCommand(input);
 * const response = await client.send(command);
 * // { // ListExperienceEntitiesResponse
 * //   SummaryItems: [ // ExperienceEntitiesSummaryList
 * //     { // ExperienceEntitiesSummary
 * //       EntityId: "STRING_VALUE",
 * //       EntityType: "USER" || "GROUP",
 * //       DisplayData: { // EntityDisplayData
 * //         UserName: "STRING_VALUE",
 * //         GroupName: "STRING_VALUE",
 * //         IdentifiedUserName: "STRING_VALUE",
 * //         FirstName: "STRING_VALUE",
 * //         LastName: "STRING_VALUE",
 * //       },
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListExperienceEntitiesCommandInput - {@link ListExperienceEntitiesCommandInput}
 * @returns {@link ListExperienceEntitiesCommandOutput}
 * @see {@link ListExperienceEntitiesCommandInput} for command's `input` shape.
 * @see {@link ListExperienceEntitiesCommandOutput} for command's `response` shape.
 * @see {@link KendraClientResolvedConfig | config} for KendraClient's `config` shape.
 *
 * @throws {@link AccessDeniedException} (client fault)
 *  <p>You don't have sufficient access to perform this action. Please ensure you have the
 *             required permission policies and user accounts and try again.</p>
 *
 * @throws {@link InternalServerException} (server fault)
 *  <p>An issue occurred with the internal server used for your Amazon Kendra service.
 *             Please wait a few minutes and try again, or contact <a href="http://aws.amazon.com/contact-us/">Support</a> for help.</p>
 *
 * @throws {@link ResourceNotFoundException} (client fault)
 *  <p>The resource you want to use doesn’t exist. Please check you have provided the correct
 *             resource and try again.</p>
 *
 * @throws {@link ThrottlingException} (client fault)
 *  <p>The request was denied due to request throttling. Please reduce the number of requests
 *             and try again.</p>
 *
 * @throws {@link ValidationException} (client fault)
 *  <p>The input fails to satisfy the constraints set by the Amazon Kendra service.
 *             Please provide the correct input and try again.</p>
 *
 * @throws {@link KendraServiceException}
 * <p>Base exception class for all service exceptions from Kendra service.</p>
 *
 *
 * @public
 */
export declare class ListExperienceEntitiesCommand extends ListExperienceEntitiesCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListExperienceEntitiesRequest;
            output: ListExperienceEntitiesResponse;
        };
        sdk: {
            input: ListExperienceEntitiesCommandInput;
            output: ListExperienceEntitiesCommandOutput;
        };
    };
}
