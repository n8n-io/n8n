import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../KendraClient";
import type { GetQuerySuggestionsRequest, GetQuerySuggestionsResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetQuerySuggestionsCommand}.
 */
export interface GetQuerySuggestionsCommandInput extends GetQuerySuggestionsRequest {
}
/**
 * @public
 *
 * The output of {@link GetQuerySuggestionsCommand}.
 */
export interface GetQuerySuggestionsCommandOutput extends GetQuerySuggestionsResponse, __MetadataBearer {
}
declare const GetQuerySuggestionsCommand_base: {
    new (input: GetQuerySuggestionsCommandInput): import("@smithy/smithy-client").CommandImpl<GetQuerySuggestionsCommandInput, GetQuerySuggestionsCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetQuerySuggestionsCommandInput): import("@smithy/smithy-client").CommandImpl<GetQuerySuggestionsCommandInput, GetQuerySuggestionsCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Fetches the queries that are suggested to your users.</p>
 *          <p>
 *             <code>GetQuerySuggestions</code> is currently not supported in the
 *             Amazon Web Services GovCloud (US-West) region.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { KendraClient, GetQuerySuggestionsCommand } from "@aws-sdk/client-kendra"; // ES Modules import
 * // const { KendraClient, GetQuerySuggestionsCommand } = require("@aws-sdk/client-kendra"); // CommonJS import
 * // import type { KendraClientConfig } from "@aws-sdk/client-kendra";
 * const config = {}; // type is KendraClientConfig
 * const client = new KendraClient(config);
 * const input = { // GetQuerySuggestionsRequest
 *   IndexId: "STRING_VALUE", // required
 *   QueryText: "STRING_VALUE", // required
 *   MaxSuggestionsCount: Number("int"),
 *   SuggestionTypes: [ // SuggestionTypes
 *     "QUERY" || "DOCUMENT_ATTRIBUTES",
 *   ],
 *   AttributeSuggestionsConfig: { // AttributeSuggestionsGetConfig
 *     SuggestionAttributes: [ // DocumentAttributeKeyList
 *       "STRING_VALUE",
 *     ],
 *     AdditionalResponseAttributes: [
 *       "STRING_VALUE",
 *     ],
 *     AttributeFilter: { // AttributeFilter
 *       AndAllFilters: [ // AttributeFilterList
 *         {
 *           AndAllFilters: [
 *             "<AttributeFilter>",
 *           ],
 *           OrAllFilters: [
 *             "<AttributeFilter>",
 *           ],
 *           NotFilter: "<AttributeFilter>",
 *           EqualsTo: { // DocumentAttribute
 *             Key: "STRING_VALUE", // required
 *             Value: { // DocumentAttributeValue
 *               StringValue: "STRING_VALUE",
 *               StringListValue: [ // DocumentAttributeStringListValue
 *                 "STRING_VALUE",
 *               ],
 *               LongValue: Number("long"),
 *               DateValue: new Date("TIMESTAMP"),
 *             },
 *           },
 *           ContainsAll: {
 *             Key: "STRING_VALUE", // required
 *             Value: {
 *               StringValue: "STRING_VALUE",
 *               StringListValue: [
 *                 "STRING_VALUE",
 *               ],
 *               LongValue: Number("long"),
 *               DateValue: new Date("TIMESTAMP"),
 *             },
 *           },
 *           ContainsAny: {
 *             Key: "STRING_VALUE", // required
 *             Value: {
 *               StringValue: "STRING_VALUE",
 *               StringListValue: [
 *                 "STRING_VALUE",
 *               ],
 *               LongValue: Number("long"),
 *               DateValue: new Date("TIMESTAMP"),
 *             },
 *           },
 *           GreaterThan: {
 *             Key: "STRING_VALUE", // required
 *             Value: {
 *               StringValue: "STRING_VALUE",
 *               StringListValue: [
 *                 "STRING_VALUE",
 *               ],
 *               LongValue: Number("long"),
 *               DateValue: new Date("TIMESTAMP"),
 *             },
 *           },
 *           GreaterThanOrEquals: {
 *             Key: "STRING_VALUE", // required
 *             Value: {
 *               StringValue: "STRING_VALUE",
 *               StringListValue: [
 *                 "STRING_VALUE",
 *               ],
 *               LongValue: Number("long"),
 *               DateValue: new Date("TIMESTAMP"),
 *             },
 *           },
 *           LessThan: "<DocumentAttribute>",
 *           LessThanOrEquals: "<DocumentAttribute>",
 *         },
 *       ],
 *       OrAllFilters: [
 *         "<AttributeFilter>",
 *       ],
 *       NotFilter: "<AttributeFilter>",
 *       EqualsTo: "<DocumentAttribute>",
 *       ContainsAll: "<DocumentAttribute>",
 *       ContainsAny: "<DocumentAttribute>",
 *       GreaterThan: "<DocumentAttribute>",
 *       GreaterThanOrEquals: "<DocumentAttribute>",
 *       LessThan: "<DocumentAttribute>",
 *       LessThanOrEquals: "<DocumentAttribute>",
 *     },
 *     UserContext: { // UserContext
 *       Token: "STRING_VALUE",
 *       UserId: "STRING_VALUE",
 *       Groups: [ // Groups
 *         "STRING_VALUE",
 *       ],
 *       DataSourceGroups: [ // DataSourceGroups
 *         { // DataSourceGroup
 *           GroupId: "STRING_VALUE", // required
 *           DataSourceId: "STRING_VALUE", // required
 *         },
 *       ],
 *     },
 *   },
 * };
 * const command = new GetQuerySuggestionsCommand(input);
 * const response = await client.send(command);
 * // { // GetQuerySuggestionsResponse
 * //   QuerySuggestionsId: "STRING_VALUE",
 * //   Suggestions: [ // SuggestionList
 * //     { // Suggestion
 * //       Id: "STRING_VALUE",
 * //       Value: { // SuggestionValue
 * //         Text: { // SuggestionTextWithHighlights
 * //           Text: "STRING_VALUE",
 * //           Highlights: [ // SuggestionHighlightList
 * //             { // SuggestionHighlight
 * //               BeginOffset: Number("int"),
 * //               EndOffset: Number("int"),
 * //             },
 * //           ],
 * //         },
 * //       },
 * //       SourceDocuments: [ // SourceDocuments
 * //         { // SourceDocument
 * //           DocumentId: "STRING_VALUE",
 * //           SuggestionAttributes: [ // DocumentAttributeKeyList
 * //             "STRING_VALUE",
 * //           ],
 * //           AdditionalAttributes: [ // DocumentAttributeList
 * //             { // DocumentAttribute
 * //               Key: "STRING_VALUE", // required
 * //               Value: { // DocumentAttributeValue
 * //                 StringValue: "STRING_VALUE",
 * //                 StringListValue: [ // DocumentAttributeStringListValue
 * //                   "STRING_VALUE",
 * //                 ],
 * //                 LongValue: Number("long"),
 * //                 DateValue: new Date("TIMESTAMP"),
 * //               },
 * //             },
 * //           ],
 * //         },
 * //       ],
 * //     },
 * //   ],
 * // };
 *
 * ```
 *
 * @param GetQuerySuggestionsCommandInput - {@link GetQuerySuggestionsCommandInput}
 * @returns {@link GetQuerySuggestionsCommandOutput}
 * @see {@link GetQuerySuggestionsCommandInput} for command's `input` shape.
 * @see {@link GetQuerySuggestionsCommandOutput} for command's `response` shape.
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
export declare class GetQuerySuggestionsCommand extends GetQuerySuggestionsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetQuerySuggestionsRequest;
            output: GetQuerySuggestionsResponse;
        };
        sdk: {
            input: GetQuerySuggestionsCommandInput;
            output: GetQuerySuggestionsCommandOutput;
        };
    };
}
