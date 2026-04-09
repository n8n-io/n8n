import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../KendraClient";
import type { ListExperiencesRequest, ListExperiencesResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListExperiencesCommand}.
 */
export interface ListExperiencesCommandInput extends ListExperiencesRequest {
}
/**
 * @public
 *
 * The output of {@link ListExperiencesCommand}.
 */
export interface ListExperiencesCommandOutput extends ListExperiencesResponse, __MetadataBearer {
}
declare const ListExperiencesCommand_base: {
    new (input: ListExperiencesCommandInput): import("@smithy/smithy-client").CommandImpl<ListExperiencesCommandInput, ListExperiencesCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListExperiencesCommandInput): import("@smithy/smithy-client").CommandImpl<ListExperiencesCommandInput, ListExperiencesCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists one or more Amazon Kendra experiences. You can create an Amazon Kendra experience such
 *             as a search application. For more information on creating a search application
 *             experience, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/deploying-search-experience-no-code.html">Building a
 *                 search experience with no code</a>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { KendraClient, ListExperiencesCommand } from "@aws-sdk/client-kendra"; // ES Modules import
 * // const { KendraClient, ListExperiencesCommand } = require("@aws-sdk/client-kendra"); // CommonJS import
 * // import type { KendraClientConfig } from "@aws-sdk/client-kendra";
 * const config = {}; // type is KendraClientConfig
 * const client = new KendraClient(config);
 * const input = { // ListExperiencesRequest
 *   IndexId: "STRING_VALUE", // required
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 * };
 * const command = new ListExperiencesCommand(input);
 * const response = await client.send(command);
 * // { // ListExperiencesResponse
 * //   SummaryItems: [ // ExperiencesSummaryList
 * //     { // ExperiencesSummary
 * //       Name: "STRING_VALUE",
 * //       Id: "STRING_VALUE",
 * //       CreatedAt: new Date("TIMESTAMP"),
 * //       Status: "CREATING" || "ACTIVE" || "DELETING" || "FAILED",
 * //       Endpoints: [ // ExperienceEndpoints
 * //         { // ExperienceEndpoint
 * //           EndpointType: "HOME",
 * //           Endpoint: "STRING_VALUE",
 * //         },
 * //       ],
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListExperiencesCommandInput - {@link ListExperiencesCommandInput}
 * @returns {@link ListExperiencesCommandOutput}
 * @see {@link ListExperiencesCommandInput} for command's `input` shape.
 * @see {@link ListExperiencesCommandOutput} for command's `response` shape.
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
export declare class ListExperiencesCommand extends ListExperiencesCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListExperiencesRequest;
            output: ListExperiencesResponse;
        };
        sdk: {
            input: ListExperiencesCommandInput;
            output: ListExperiencesCommandOutput;
        };
    };
}
