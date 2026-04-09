import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../KendraClient";
import type { RetrieveRequest, RetrieveResult } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link RetrieveCommand}.
 */
export interface RetrieveCommandInput extends RetrieveRequest {
}
/**
 * @public
 *
 * The output of {@link RetrieveCommand}.
 */
export interface RetrieveCommandOutput extends RetrieveResult, __MetadataBearer {
}
declare const RetrieveCommand_base: {
    new (input: RetrieveCommandInput): import("@smithy/smithy-client").CommandImpl<RetrieveCommandInput, RetrieveCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: RetrieveCommandInput): import("@smithy/smithy-client").CommandImpl<RetrieveCommandInput, RetrieveCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Retrieves relevant passages or text excerpts given an input query.</p>
 *          <p>This API is similar to the <a href="https://docs.aws.amazon.com/kendra/latest/APIReference/API_Query.html">Query</a> API. However, by
 *             default, the <code>Query</code> API only returns excerpt passages of up to 100 token
 *             words. With the <code>Retrieve</code> API, you can retrieve longer passages of up to 200
 *             token words and up to 100 semantically relevant passages. This doesn't include
 *             question-answer or FAQ type responses from your index. The passages are text excerpts
 *             that can be semantically extracted from multiple documents and multiple parts of the
 *             same document. If in extreme cases your documents produce zero passages using the
 *                 <code>Retrieve</code> API, you can alternatively use the <code>Query</code> API and
 *             its types of responses.</p>
 *          <p>You can also do the following:</p>
 *          <ul>
 *             <li>
 *                <p>Override boosting at the index level</p>
 *             </li>
 *             <li>
 *                <p>Filter based on document fields or attributes</p>
 *             </li>
 *             <li>
 *                <p>Filter based on the user or their group access to documents</p>
 *             </li>
 *             <li>
 *                <p>View the confidence score bucket for a retrieved passage result. The
 *                     confidence bucket provides a relative ranking that indicates how confident
 *                         Amazon Kendra is that the response is relevant to the query.</p>
 *                <note>
 *                   <p>Confidence score buckets are currently available only for English.</p>
 *                </note>
 *             </li>
 *          </ul>
 *          <p>You can also include certain fields in the response that might provide useful
 *             additional information.</p>
 *          <p>The <code>Retrieve</code> API shares the number of <a href="https://docs.aws.amazon.com/kendra/latest/APIReference/API_CapacityUnitsConfiguration.html">query capacity
 *                 units</a> that you set for your index. For more information on what's included
 *             in a single capacity unit and the default base capacity for an index, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/adjusting-capacity.html">Adjusting
 *                 capacity</a>.</p>
 *          <important>
 *             <p>If you're using an Amazon Kendra Gen AI Enterprise Edition index, you can only use
 *                     <code>ATTRIBUTE_FILTER</code> to filter search results by user context. If
 *                 you're using an Amazon Kendra Gen AI Enterprise Edition index and you try to use
 *                     <code>USER_TOKEN</code> to configure user context policy, Amazon Kendra returns a
 *                     <code>ValidationException</code> error.</p>
 *          </important>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { KendraClient, RetrieveCommand } from "@aws-sdk/client-kendra"; // ES Modules import
 * // const { KendraClient, RetrieveCommand } = require("@aws-sdk/client-kendra"); // CommonJS import
 * // import type { KendraClientConfig } from "@aws-sdk/client-kendra";
 * const config = {}; // type is KendraClientConfig
 * const client = new KendraClient(config);
 * const input = { // RetrieveRequest
 *   IndexId: "STRING_VALUE", // required
 *   QueryText: "STRING_VALUE", // required
 *   AttributeFilter: { // AttributeFilter
 *     AndAllFilters: [ // AttributeFilterList
 *       {
 *         AndAllFilters: [
 *           "<AttributeFilter>",
 *         ],
 *         OrAllFilters: [
 *           "<AttributeFilter>",
 *         ],
 *         NotFilter: "<AttributeFilter>",
 *         EqualsTo: { // DocumentAttribute
 *           Key: "STRING_VALUE", // required
 *           Value: { // DocumentAttributeValue
 *             StringValue: "STRING_VALUE",
 *             StringListValue: [ // DocumentAttributeStringListValue
 *               "STRING_VALUE",
 *             ],
 *             LongValue: Number("long"),
 *             DateValue: new Date("TIMESTAMP"),
 *           },
 *         },
 *         ContainsAll: {
 *           Key: "STRING_VALUE", // required
 *           Value: {
 *             StringValue: "STRING_VALUE",
 *             StringListValue: [
 *               "STRING_VALUE",
 *             ],
 *             LongValue: Number("long"),
 *             DateValue: new Date("TIMESTAMP"),
 *           },
 *         },
 *         ContainsAny: {
 *           Key: "STRING_VALUE", // required
 *           Value: {
 *             StringValue: "STRING_VALUE",
 *             StringListValue: [
 *               "STRING_VALUE",
 *             ],
 *             LongValue: Number("long"),
 *             DateValue: new Date("TIMESTAMP"),
 *           },
 *         },
 *         GreaterThan: {
 *           Key: "STRING_VALUE", // required
 *           Value: {
 *             StringValue: "STRING_VALUE",
 *             StringListValue: [
 *               "STRING_VALUE",
 *             ],
 *             LongValue: Number("long"),
 *             DateValue: new Date("TIMESTAMP"),
 *           },
 *         },
 *         GreaterThanOrEquals: {
 *           Key: "STRING_VALUE", // required
 *           Value: {
 *             StringValue: "STRING_VALUE",
 *             StringListValue: [
 *               "STRING_VALUE",
 *             ],
 *             LongValue: Number("long"),
 *             DateValue: new Date("TIMESTAMP"),
 *           },
 *         },
 *         LessThan: "<DocumentAttribute>",
 *         LessThanOrEquals: "<DocumentAttribute>",
 *       },
 *     ],
 *     OrAllFilters: [
 *       "<AttributeFilter>",
 *     ],
 *     NotFilter: "<AttributeFilter>",
 *     EqualsTo: "<DocumentAttribute>",
 *     ContainsAll: "<DocumentAttribute>",
 *     ContainsAny: "<DocumentAttribute>",
 *     GreaterThan: "<DocumentAttribute>",
 *     GreaterThanOrEquals: "<DocumentAttribute>",
 *     LessThan: "<DocumentAttribute>",
 *     LessThanOrEquals: "<DocumentAttribute>",
 *   },
 *   RequestedDocumentAttributes: [ // DocumentAttributeKeyList
 *     "STRING_VALUE",
 *   ],
 *   DocumentRelevanceOverrideConfigurations: [ // DocumentRelevanceOverrideConfigurationList
 *     { // DocumentRelevanceConfiguration
 *       Name: "STRING_VALUE", // required
 *       Relevance: { // Relevance
 *         Freshness: true || false,
 *         Importance: Number("int"),
 *         Duration: "STRING_VALUE",
 *         RankOrder: "ASCENDING" || "DESCENDING",
 *         ValueImportanceMap: { // ValueImportanceMap
 *           "<keys>": Number("int"),
 *         },
 *       },
 *     },
 *   ],
 *   PageNumber: Number("int"),
 *   PageSize: Number("int"),
 *   UserContext: { // UserContext
 *     Token: "STRING_VALUE",
 *     UserId: "STRING_VALUE",
 *     Groups: [ // Groups
 *       "STRING_VALUE",
 *     ],
 *     DataSourceGroups: [ // DataSourceGroups
 *       { // DataSourceGroup
 *         GroupId: "STRING_VALUE", // required
 *         DataSourceId: "STRING_VALUE", // required
 *       },
 *     ],
 *   },
 * };
 * const command = new RetrieveCommand(input);
 * const response = await client.send(command);
 * // { // RetrieveResult
 * //   QueryId: "STRING_VALUE",
 * //   ResultItems: [ // RetrieveResultItemList
 * //     { // RetrieveResultItem
 * //       Id: "STRING_VALUE",
 * //       DocumentId: "STRING_VALUE",
 * //       DocumentTitle: "STRING_VALUE",
 * //       Content: "STRING_VALUE",
 * //       DocumentURI: "STRING_VALUE",
 * //       DocumentAttributes: [ // DocumentAttributeList
 * //         { // DocumentAttribute
 * //           Key: "STRING_VALUE", // required
 * //           Value: { // DocumentAttributeValue
 * //             StringValue: "STRING_VALUE",
 * //             StringListValue: [ // DocumentAttributeStringListValue
 * //               "STRING_VALUE",
 * //             ],
 * //             LongValue: Number("long"),
 * //             DateValue: new Date("TIMESTAMP"),
 * //           },
 * //         },
 * //       ],
 * //       ScoreAttributes: { // ScoreAttributes
 * //         ScoreConfidence: "VERY_HIGH" || "HIGH" || "MEDIUM" || "LOW" || "NOT_AVAILABLE",
 * //       },
 * //     },
 * //   ],
 * // };
 *
 * ```
 *
 * @param RetrieveCommandInput - {@link RetrieveCommandInput}
 * @returns {@link RetrieveCommandOutput}
 * @see {@link RetrieveCommandInput} for command's `input` shape.
 * @see {@link RetrieveCommandOutput} for command's `response` shape.
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
export declare class RetrieveCommand extends RetrieveCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: RetrieveRequest;
            output: RetrieveResult;
        };
        sdk: {
            input: RetrieveCommandInput;
            output: RetrieveCommandOutput;
        };
    };
}
