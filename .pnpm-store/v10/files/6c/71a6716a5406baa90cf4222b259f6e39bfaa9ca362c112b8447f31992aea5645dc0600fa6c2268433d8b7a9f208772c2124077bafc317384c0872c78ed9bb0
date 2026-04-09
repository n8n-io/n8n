import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../KendraClient";
import type { QueryRequest, QueryResult } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link QueryCommand}.
 */
export interface QueryCommandInput extends QueryRequest {
}
/**
 * @public
 *
 * The output of {@link QueryCommand}.
 */
export interface QueryCommandOutput extends QueryResult, __MetadataBearer {
}
declare const QueryCommand_base: {
    new (input: QueryCommandInput): import("@smithy/smithy-client").CommandImpl<QueryCommandInput, QueryCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: QueryCommandInput): import("@smithy/smithy-client").CommandImpl<QueryCommandInput, QueryCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Searches an index given an input query.</p>
 *          <note>
 *             <p>If you are working with large language models (LLMs) or implementing retrieval
 *             augmented generation (RAG) systems, you can use Amazon Kendra's <a href="https://docs.aws.amazon.com/kendra/latest/APIReference/API_Retrieve.html">Retrieve</a> API, which can return longer semantically relevant passages. We
 *             recommend using the <code>Retrieve</code> API instead of filing a service limit increase
 *             to increase the <code>Query</code> API document excerpt length.</p>
 *          </note>
 *          <p>You can configure boosting or relevance tuning at the query level to override boosting
 *          at the index level, filter based on document fields/attributes and faceted search, and
 *          filter based on the user or their group access to documents. You can also include certain
 *          fields in the response that might provide useful additional information.</p>
 *          <p>A query response contains three types of results.</p>
 *          <ul>
 *             <li>
 *                <p>Relevant suggested answers. The answers can be either a text excerpt or table
 *                excerpt. The answer can be highlighted in the excerpt.</p>
 *             </li>
 *             <li>
 *                <p>Matching FAQs or questions-answer from your FAQ file.</p>
 *             </li>
 *             <li>
 *                <p>Relevant documents. This result type includes an excerpt of the document with the
 *                document title. The searched terms can be highlighted in the excerpt.</p>
 *             </li>
 *          </ul>
 *          <p>You can specify that the query return only one type of result using the
 *             <code>QueryResultTypeFilter</code> parameter. Each query returns the 100 most relevant
 *          results. If you filter result type to only question-answers, a maximum of four results are
 *          returned. If you filter result type to only answers, a maximum of three results are
 *          returned.</p>
 *          <important>
 *             <p>If you're using an Amazon Kendra Gen AI Enterprise Edition index, you can only use
 *                <code>ATTRIBUTE_FILTER</code> to filter search results by user context. If you're
 *             using an Amazon Kendra Gen AI Enterprise Edition index and you try to use
 *                <code>USER_TOKEN</code> to configure user context policy, Amazon Kendra returns a
 *                <code>ValidationException</code> error.</p>
 *          </important>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { KendraClient, QueryCommand } from "@aws-sdk/client-kendra"; // ES Modules import
 * // const { KendraClient, QueryCommand } = require("@aws-sdk/client-kendra"); // CommonJS import
 * // import type { KendraClientConfig } from "@aws-sdk/client-kendra";
 * const config = {}; // type is KendraClientConfig
 * const client = new KendraClient(config);
 * const input = { // QueryRequest
 *   IndexId: "STRING_VALUE", // required
 *   QueryText: "STRING_VALUE",
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
 *   Facets: [ // FacetList
 *     { // Facet
 *       DocumentAttributeKey: "STRING_VALUE",
 *       Facets: [
 *         {
 *           DocumentAttributeKey: "STRING_VALUE",
 *           Facets: "<FacetList>",
 *           MaxResults: Number("int"),
 *         },
 *       ],
 *       MaxResults: Number("int"),
 *     },
 *   ],
 *   RequestedDocumentAttributes: [ // DocumentAttributeKeyList
 *     "STRING_VALUE",
 *   ],
 *   QueryResultTypeFilter: "DOCUMENT" || "QUESTION_ANSWER" || "ANSWER",
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
 *   SortingConfiguration: { // SortingConfiguration
 *     DocumentAttributeKey: "STRING_VALUE", // required
 *     SortOrder: "DESC" || "ASC", // required
 *   },
 *   SortingConfigurations: [ // SortingConfigurationList
 *     {
 *       DocumentAttributeKey: "STRING_VALUE", // required
 *       SortOrder: "DESC" || "ASC", // required
 *     },
 *   ],
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
 *   VisitorId: "STRING_VALUE",
 *   SpellCorrectionConfiguration: { // SpellCorrectionConfiguration
 *     IncludeQuerySpellCheckSuggestions: true || false, // required
 *   },
 *   CollapseConfiguration: { // CollapseConfiguration
 *     DocumentAttributeKey: "STRING_VALUE", // required
 *     SortingConfigurations: [
 *       "<SortingConfiguration>",
 *     ],
 *     MissingAttributeKeyStrategy: "IGNORE" || "COLLAPSE" || "EXPAND",
 *     Expand: true || false,
 *     ExpandConfiguration: { // ExpandConfiguration
 *       MaxResultItemsToExpand: Number("int"),
 *       MaxExpandedResultsPerItem: Number("int"),
 *     },
 *   },
 * };
 * const command = new QueryCommand(input);
 * const response = await client.send(command);
 * // { // QueryResult
 * //   QueryId: "STRING_VALUE",
 * //   ResultItems: [ // QueryResultItemList
 * //     { // QueryResultItem
 * //       Id: "STRING_VALUE",
 * //       Type: "DOCUMENT" || "QUESTION_ANSWER" || "ANSWER",
 * //       Format: "TABLE" || "TEXT",
 * //       AdditionalAttributes: [ // AdditionalResultAttributeList
 * //         { // AdditionalResultAttribute
 * //           Key: "STRING_VALUE", // required
 * //           ValueType: "TEXT_WITH_HIGHLIGHTS_VALUE", // required
 * //           Value: { // AdditionalResultAttributeValue
 * //             TextWithHighlightsValue: { // TextWithHighlights
 * //               Text: "STRING_VALUE",
 * //               Highlights: [ // HighlightList
 * //                 { // Highlight
 * //                   BeginOffset: Number("int"), // required
 * //                   EndOffset: Number("int"), // required
 * //                   TopAnswer: true || false,
 * //                   Type: "STANDARD" || "THESAURUS_SYNONYM",
 * //                 },
 * //               ],
 * //             },
 * //           },
 * //         },
 * //       ],
 * //       DocumentId: "STRING_VALUE",
 * //       DocumentTitle: {
 * //         Text: "STRING_VALUE",
 * //         Highlights: [
 * //           {
 * //             BeginOffset: Number("int"), // required
 * //             EndOffset: Number("int"), // required
 * //             TopAnswer: true || false,
 * //             Type: "STANDARD" || "THESAURUS_SYNONYM",
 * //           },
 * //         ],
 * //       },
 * //       DocumentExcerpt: {
 * //         Text: "STRING_VALUE",
 * //         Highlights: [
 * //           {
 * //             BeginOffset: Number("int"), // required
 * //             EndOffset: Number("int"), // required
 * //             TopAnswer: true || false,
 * //             Type: "STANDARD" || "THESAURUS_SYNONYM",
 * //           },
 * //         ],
 * //       },
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
 * //       FeedbackToken: "STRING_VALUE",
 * //       TableExcerpt: { // TableExcerpt
 * //         Rows: [ // TableRowList
 * //           { // TableRow
 * //             Cells: [ // TableCellList
 * //               { // TableCell
 * //                 Value: "STRING_VALUE",
 * //                 TopAnswer: true || false,
 * //                 Highlighted: true || false,
 * //                 Header: true || false,
 * //               },
 * //             ],
 * //           },
 * //         ],
 * //         TotalNumberOfRows: Number("int"),
 * //       },
 * //       CollapsedResultDetail: { // CollapsedResultDetail
 * //         DocumentAttribute: {
 * //           Key: "STRING_VALUE", // required
 * //           Value: {
 * //             StringValue: "STRING_VALUE",
 * //             StringListValue: [
 * //               "STRING_VALUE",
 * //             ],
 * //             LongValue: Number("long"),
 * //             DateValue: new Date("TIMESTAMP"),
 * //           },
 * //         },
 * //         ExpandedResults: [ // ExpandedResultList
 * //           { // ExpandedResultItem
 * //             Id: "STRING_VALUE",
 * //             DocumentId: "STRING_VALUE",
 * //             DocumentTitle: {
 * //               Text: "STRING_VALUE",
 * //               Highlights: [
 * //                 {
 * //                   BeginOffset: Number("int"), // required
 * //                   EndOffset: Number("int"), // required
 * //                   TopAnswer: true || false,
 * //                   Type: "STANDARD" || "THESAURUS_SYNONYM",
 * //                 },
 * //               ],
 * //             },
 * //             DocumentExcerpt: {
 * //               Text: "STRING_VALUE",
 * //               Highlights: [
 * //                 {
 * //                   BeginOffset: Number("int"), // required
 * //                   EndOffset: Number("int"), // required
 * //                   TopAnswer: true || false,
 * //                   Type: "STANDARD" || "THESAURUS_SYNONYM",
 * //                 },
 * //               ],
 * //             },
 * //             DocumentURI: "STRING_VALUE",
 * //             DocumentAttributes: [
 * //               {
 * //                 Key: "STRING_VALUE", // required
 * //                 Value: {
 * //                   StringValue: "STRING_VALUE",
 * //                   StringListValue: [
 * //                     "STRING_VALUE",
 * //                   ],
 * //                   LongValue: Number("long"),
 * //                   DateValue: new Date("TIMESTAMP"),
 * //                 },
 * //               },
 * //             ],
 * //           },
 * //         ],
 * //       },
 * //     },
 * //   ],
 * //   FacetResults: [ // FacetResultList
 * //     { // FacetResult
 * //       DocumentAttributeKey: "STRING_VALUE",
 * //       DocumentAttributeValueType: "STRING_VALUE" || "STRING_LIST_VALUE" || "LONG_VALUE" || "DATE_VALUE",
 * //       DocumentAttributeValueCountPairs: [ // DocumentAttributeValueCountPairList
 * //         { // DocumentAttributeValueCountPair
 * //           DocumentAttributeValue: {
 * //             StringValue: "STRING_VALUE",
 * //             StringListValue: [
 * //               "STRING_VALUE",
 * //             ],
 * //             LongValue: Number("long"),
 * //             DateValue: new Date("TIMESTAMP"),
 * //           },
 * //           Count: Number("int"),
 * //           FacetResults: [
 * //             {
 * //               DocumentAttributeKey: "STRING_VALUE",
 * //               DocumentAttributeValueType: "STRING_VALUE" || "STRING_LIST_VALUE" || "LONG_VALUE" || "DATE_VALUE",
 * //               DocumentAttributeValueCountPairs: [
 * //                 {
 * //                   DocumentAttributeValue: "<DocumentAttributeValue>",
 * //                   Count: Number("int"),
 * //                   FacetResults: "<FacetResultList>",
 * //                 },
 * //               ],
 * //             },
 * //           ],
 * //         },
 * //       ],
 * //     },
 * //   ],
 * //   TotalNumberOfResults: Number("int"),
 * //   Warnings: [ // WarningList
 * //     { // Warning
 * //       Message: "STRING_VALUE",
 * //       Code: "QUERY_LANGUAGE_INVALID_SYNTAX",
 * //     },
 * //   ],
 * //   SpellCorrectedQueries: [ // SpellCorrectedQueryList
 * //     { // SpellCorrectedQuery
 * //       SuggestedQueryText: "STRING_VALUE",
 * //       Corrections: [ // CorrectionList
 * //         { // Correction
 * //           BeginOffset: Number("int"),
 * //           EndOffset: Number("int"),
 * //           Term: "STRING_VALUE",
 * //           CorrectedTerm: "STRING_VALUE",
 * //         },
 * //       ],
 * //     },
 * //   ],
 * //   FeaturedResultsItems: [ // FeaturedResultsItemList
 * //     { // FeaturedResultsItem
 * //       Id: "STRING_VALUE",
 * //       Type: "DOCUMENT" || "QUESTION_ANSWER" || "ANSWER",
 * //       AdditionalAttributes: [
 * //         {
 * //           Key: "STRING_VALUE", // required
 * //           ValueType: "TEXT_WITH_HIGHLIGHTS_VALUE", // required
 * //           Value: {
 * //             TextWithHighlightsValue: "<TextWithHighlights>",
 * //           },
 * //         },
 * //       ],
 * //       DocumentId: "STRING_VALUE",
 * //       DocumentTitle: "<TextWithHighlights>",
 * //       DocumentExcerpt: "<TextWithHighlights>",
 * //       DocumentURI: "STRING_VALUE",
 * //       DocumentAttributes: [
 * //         {
 * //           Key: "STRING_VALUE", // required
 * //           Value: "<DocumentAttributeValue>", // required
 * //         },
 * //       ],
 * //       FeedbackToken: "STRING_VALUE",
 * //     },
 * //   ],
 * // };
 *
 * ```
 *
 * @param QueryCommandInput - {@link QueryCommandInput}
 * @returns {@link QueryCommandOutput}
 * @see {@link QueryCommandInput} for command's `input` shape.
 * @see {@link QueryCommandOutput} for command's `response` shape.
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
export declare class QueryCommand extends QueryCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: QueryRequest;
            output: QueryResult;
        };
        sdk: {
            input: QueryCommandInput;
            output: QueryCommandOutput;
        };
    };
}
