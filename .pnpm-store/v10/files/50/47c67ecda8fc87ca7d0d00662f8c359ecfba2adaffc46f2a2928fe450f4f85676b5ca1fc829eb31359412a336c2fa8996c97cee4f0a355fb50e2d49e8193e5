import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../KendraClient";
import type { CreateQuerySuggestionsBlockListRequest, CreateQuerySuggestionsBlockListResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateQuerySuggestionsBlockListCommand}.
 */
export interface CreateQuerySuggestionsBlockListCommandInput extends CreateQuerySuggestionsBlockListRequest {
}
/**
 * @public
 *
 * The output of {@link CreateQuerySuggestionsBlockListCommand}.
 */
export interface CreateQuerySuggestionsBlockListCommandOutput extends CreateQuerySuggestionsBlockListResponse, __MetadataBearer {
}
declare const CreateQuerySuggestionsBlockListCommand_base: {
    new (input: CreateQuerySuggestionsBlockListCommandInput): import("@smithy/smithy-client").CommandImpl<CreateQuerySuggestionsBlockListCommandInput, CreateQuerySuggestionsBlockListCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateQuerySuggestionsBlockListCommandInput): import("@smithy/smithy-client").CommandImpl<CreateQuerySuggestionsBlockListCommandInput, CreateQuerySuggestionsBlockListCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates a block list to exlcude certain queries from suggestions.</p>
 *          <p>Any query that contains words or phrases specified in the block
 *             list is blocked or filtered out from being shown as a suggestion.</p>
 *          <p>You need to provide the file location of your block list text file
 *             in your S3 bucket. In your text file, enter each block word or phrase
 *             on a separate line.</p>
 *          <p>For information on the current quota limits for block lists, see
 *             <a href="https://docs.aws.amazon.com/kendra/latest/dg/quotas.html">Quotas
 *                 for Amazon Kendra</a>.</p>
 *          <p>
 *             <code>CreateQuerySuggestionsBlockList</code> is currently not supported in the
 *             Amazon Web Services GovCloud (US-West) region.</p>
 *          <p>For an example of creating a block list for query suggestions using the
 *             Python SDK, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/query-suggestions.html#query-suggestions-blocklist">Query
 *                 suggestions block list</a>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { KendraClient, CreateQuerySuggestionsBlockListCommand } from "@aws-sdk/client-kendra"; // ES Modules import
 * // const { KendraClient, CreateQuerySuggestionsBlockListCommand } = require("@aws-sdk/client-kendra"); // CommonJS import
 * // import type { KendraClientConfig } from "@aws-sdk/client-kendra";
 * const config = {}; // type is KendraClientConfig
 * const client = new KendraClient(config);
 * const input = { // CreateQuerySuggestionsBlockListRequest
 *   IndexId: "STRING_VALUE", // required
 *   Name: "STRING_VALUE", // required
 *   Description: "STRING_VALUE",
 *   SourceS3Path: { // S3Path
 *     Bucket: "STRING_VALUE", // required
 *     Key: "STRING_VALUE", // required
 *   },
 *   ClientToken: "STRING_VALUE",
 *   RoleArn: "STRING_VALUE", // required
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 * };
 * const command = new CreateQuerySuggestionsBlockListCommand(input);
 * const response = await client.send(command);
 * // { // CreateQuerySuggestionsBlockListResponse
 * //   Id: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param CreateQuerySuggestionsBlockListCommandInput - {@link CreateQuerySuggestionsBlockListCommandInput}
 * @returns {@link CreateQuerySuggestionsBlockListCommandOutput}
 * @see {@link CreateQuerySuggestionsBlockListCommandInput} for command's `input` shape.
 * @see {@link CreateQuerySuggestionsBlockListCommandOutput} for command's `response` shape.
 * @see {@link KendraClientResolvedConfig | config} for KendraClient's `config` shape.
 *
 * @throws {@link AccessDeniedException} (client fault)
 *  <p>You don't have sufficient access to perform this action. Please ensure you have the
 *             required permission policies and user accounts and try again.</p>
 *
 * @throws {@link ConflictException} (client fault)
 *  <p>A conflict occurred with the request. Please fix any inconsistences with your
 *             resources and try again.</p>
 *
 * @throws {@link InternalServerException} (server fault)
 *  <p>An issue occurred with the internal server used for your Amazon Kendra service.
 *             Please wait a few minutes and try again, or contact <a href="http://aws.amazon.com/contact-us/">Support</a> for help.</p>
 *
 * @throws {@link ResourceNotFoundException} (client fault)
 *  <p>The resource you want to use doesn’t exist. Please check you have provided the correct
 *             resource and try again.</p>
 *
 * @throws {@link ServiceQuotaExceededException} (client fault)
 *  <p>You have exceeded the set limits for your Amazon Kendra service. Please see
 *             <a href="https://docs.aws.amazon.com/kendra/latest/dg/quotas.html">Quotas</a> for
 *             more information, or contact <a href="http://aws.amazon.com/contact-us/">Support</a> to inquire about
 *             an increase of limits.</p>
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
export declare class CreateQuerySuggestionsBlockListCommand extends CreateQuerySuggestionsBlockListCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateQuerySuggestionsBlockListRequest;
            output: CreateQuerySuggestionsBlockListResponse;
        };
        sdk: {
            input: CreateQuerySuggestionsBlockListCommandInput;
            output: CreateQuerySuggestionsBlockListCommandOutput;
        };
    };
}
