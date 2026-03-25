import { ExceptionOptionType as __ExceptionOptionType } from "@smithy/smithy-client";
import { KendraServiceException as __BaseException } from "./KendraServiceException";
import { AdditionalResultAttribute, AttributeSuggestionsUpdateConfig, CapacityUnitsConfiguration, CollapseConfiguration, CollapsedResultDetail, CustomDocumentEnrichmentConfiguration, DataSourceConfiguration, DataSourceVpcConfiguration, DocumentAttribute, DocumentAttributeValue, DocumentAttributeValueType, DocumentMetadataConfiguration, DocumentRelevanceConfiguration, ExperienceConfiguration, FeaturedDocument, FeaturedResultsItem, FeaturedResultsSet, FeaturedResultsSetStatus, HierarchicalPrincipal, Mode, Principal, QueryResultFormat, QueryResultType, S3Path, SortingConfiguration, SpellCorrectionConfiguration, SuggestionType, Tag, TextWithHighlights, UserContext, UserContextPolicy, UserGroupResolutionConfiguration, UserTokenConfiguration } from "./models_0";
/**
 * @public
 * @enum
 */
export declare const ScoreConfidence: {
    readonly HIGH: "HIGH";
    readonly LOW: "LOW";
    readonly MEDIUM: "MEDIUM";
    readonly NOT_AVAILABLE: "NOT_AVAILABLE";
    readonly VERY_HIGH: "VERY_HIGH";
};
/**
 * @public
 */
export type ScoreConfidence = (typeof ScoreConfidence)[keyof typeof ScoreConfidence];
/**
 * <p>Provides a relative ranking that indicates how confident Amazon Kendra is that the
 *          response is relevant to the query.</p>
 * @public
 */
export interface ScoreAttributes {
    /**
     * <p>A relative ranking for how relevant the response is to the query.</p>
     * @public
     */
    ScoreConfidence?: ScoreConfidence | undefined;
}
/**
 * <p>Provides information about a table cell in a table excerpt.</p>
 * @public
 */
export interface TableCell {
    /**
     * <p>The actual value or content within a table cell. A table cell could contain a date
     *             value of a year, or a string value of text, for example.</p>
     * @public
     */
    Value?: string | undefined;
    /**
     * <p>
     *             <code>TRUE</code> if the response of the table cell is the top answer. This is the
     *             cell value or content with the highest confidence score or is the most relevant to the
     *             query.</p>
     * @public
     */
    TopAnswer?: boolean | undefined;
    /**
     * <p>
     *             <code>TRUE</code> means that the table cell has a high enough confidence and is
     *             relevant to the query, so the value or content should be highlighted.</p>
     * @public
     */
    Highlighted?: boolean | undefined;
    /**
     * <p>
     *             <code>TRUE</code> means that the table cell should be treated as a header.</p>
     * @public
     */
    Header?: boolean | undefined;
}
/**
 * <p>Information about a row in a table excerpt.</p>
 * @public
 */
export interface TableRow {
    /**
     * <p>A list of table cells in a row.</p>
     * @public
     */
    Cells?: TableCell[] | undefined;
}
/**
 * <p>An excerpt from a table within a document. The table excerpt displays up to five
 *             columns and three rows, depending on how many table cells are relevant to the query and
 *             how many columns are available in the original table. The top most relevant cell is
 *             displayed in the table excerpt, along with the next most relevant cells.</p>
 * @public
 */
export interface TableExcerpt {
    /**
     * <p>A list of rows in the table excerpt.</p>
     * @public
     */
    Rows?: TableRow[] | undefined;
    /**
     * <p>A count of the number of rows in the original table within the document.</p>
     * @public
     */
    TotalNumberOfRows?: number | undefined;
}
/**
 * <p>A single query result.</p>
 *          <p>A query result contains information about a document returned by the query. This
 *          includes the original location of the document, a list of attributes assigned to the
 *          document, and relevant text from the document that satisfies the query.</p>
 * @public
 */
export interface QueryResultItem {
    /**
     * <p>The unique identifier for the query result item id (<code>Id</code>) and the query
     *          result item document id (<code>DocumentId</code>) combined. The value of this field changes
     *          with every request, even when you have the same documents.</p>
     * @public
     */
    Id?: string | undefined;
    /**
     * <p>The type of document within the response. For example, a response could include a
     *          question-answer that's relevant to the query.</p>
     * @public
     */
    Type?: QueryResultType | undefined;
    /**
     * <p>If the <code>Type</code> of document within the response is <code>ANSWER</code>, then it
     *          is either a <code>TABLE</code> answer or <code>TEXT</code> answer. If it's a table answer,
     *          a table excerpt is returned in <code>TableExcerpt</code>. If it's a text answer, a text
     *          excerpt is returned in <code>DocumentExcerpt</code>.</p>
     * @public
     */
    Format?: QueryResultFormat | undefined;
    /**
     * <p>One or more additional fields/attributes associated with the query result.</p>
     * @public
     */
    AdditionalAttributes?: AdditionalResultAttribute[] | undefined;
    /**
     * <p>The identifier for the document.</p>
     * @public
     */
    DocumentId?: string | undefined;
    /**
     * <p>The title of the document. Contains the text of the title and information for
     *          highlighting the relevant terms in the title.</p>
     * @public
     */
    DocumentTitle?: TextWithHighlights | undefined;
    /**
     * <p>An extract of the text in the document. Contains information about highlighting the
     *          relevant terms in the excerpt.</p>
     * @public
     */
    DocumentExcerpt?: TextWithHighlights | undefined;
    /**
     * <p>The URI of the original location of the document.</p>
     * @public
     */
    DocumentURI?: string | undefined;
    /**
     * <p>An array of document fields/attributes assigned to a document in the search results. For
     *          example, the document author (<code>_author</code>) or the source URI
     *             (<code>_source_uri</code>) of the document.</p>
     * @public
     */
    DocumentAttributes?: DocumentAttribute[] | undefined;
    /**
     * <p>Indicates the confidence level of Amazon Kendra providing a relevant result for the
     *          query. Each result is placed into a bin that indicates the confidence,
     *             <code>VERY_HIGH</code>, <code>HIGH</code>, <code>MEDIUM</code> and <code>LOW</code>. You
     *          can use the score to determine if a response meets the confidence needed for your
     *          application.</p>
     *          <p>The field is only set to <code>LOW</code> when the <code>Type</code> field is set to
     *             <code>DOCUMENT</code> and Amazon Kendra is not confident that the result is
     *          relevant to the query.</p>
     * @public
     */
    ScoreAttributes?: ScoreAttributes | undefined;
    /**
     * <p>A token that identifies a particular result from a particular query. Use this token to
     *          provide click-through feedback for the result. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/submitting-feedback.html">Submitting
     *             feedback</a>.</p>
     * @public
     */
    FeedbackToken?: string | undefined;
    /**
     * <p>An excerpt from a table within a document.</p>
     * @public
     */
    TableExcerpt?: TableExcerpt | undefined;
    /**
     * <p>Provides details about a collapsed group of search results.</p>
     * @public
     */
    CollapsedResultDetail?: CollapsedResultDetail | undefined;
}
/**
 * <p>A corrected misspelled word in a query.</p>
 * @public
 */
export interface Correction {
    /**
     * <p>The zero-based location in the response string or text where
     *             the corrected word starts.</p>
     * @public
     */
    BeginOffset?: number | undefined;
    /**
     * <p>The zero-based location in the response string or text where
     *             the corrected word ends.</p>
     * @public
     */
    EndOffset?: number | undefined;
    /**
     * <p>The string or text of a misspelled word in a query.</p>
     * @public
     */
    Term?: string | undefined;
    /**
     * <p>The string or text of a corrected misspelled word in a query.</p>
     * @public
     */
    CorrectedTerm?: string | undefined;
}
/**
 * <p>A query with suggested spell corrections. </p>
 * @public
 */
export interface SpellCorrectedQuery {
    /**
     * <p>The query with the suggested spell corrections.</p>
     * @public
     */
    SuggestedQueryText?: string | undefined;
    /**
     * <p>The corrected misspelled word or words in a query.</p>
     * @public
     */
    Corrections?: Correction[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const WarningCode: {
    readonly QUERY_LANGUAGE_INVALID_SYNTAX: "QUERY_LANGUAGE_INVALID_SYNTAX";
};
/**
 * @public
 */
export type WarningCode = (typeof WarningCode)[keyof typeof WarningCode];
/**
 * <p>The warning code and message that explains a problem with a query.</p>
 * @public
 */
export interface Warning {
    /**
     * <p>The message that explains the problem with the query.</p>
     * @public
     */
    Message?: string | undefined;
    /**
     * <p>The code used to show the type of warning for the query.</p>
     * @public
     */
    Code?: WarningCode | undefined;
}
/**
 * <p>A single retrieved relevant passage result.</p>
 * @public
 */
export interface RetrieveResultItem {
    /**
     * <p>The identifier of the relevant passage result.</p>
     * @public
     */
    Id?: string | undefined;
    /**
     * <p>The identifier of the document.</p>
     * @public
     */
    DocumentId?: string | undefined;
    /**
     * <p>The title of the document.</p>
     * @public
     */
    DocumentTitle?: string | undefined;
    /**
     * <p>The contents of the relevant passage.</p>
     * @public
     */
    Content?: string | undefined;
    /**
     * <p>The URI of the original location of the document.</p>
     * @public
     */
    DocumentURI?: string | undefined;
    /**
     * <p>An array of document fields/attributes assigned to a document in the search results.
     *             For example, the document author (<code>_author</code>) or the source URI
     *                 (<code>_source_uri</code>) of the document.</p>
     * @public
     */
    DocumentAttributes?: DocumentAttribute[] | undefined;
    /**
     * <p>The confidence score bucket for a retrieved passage result. The confidence bucket
     *             provides a relative ranking that indicates how confident Amazon Kendra is that the
     *             response is relevant to the query.</p>
     * @public
     */
    ScoreAttributes?: ScoreAttributes | undefined;
}
/**
 * @public
 */
export interface RetrieveResult {
    /**
     * <p>The identifier of query used for the search. You also use <code>QueryId</code> to
     *             identify the search when using the <a href="https://docs.aws.amazon.com/kendra/latest/APIReference/API_SubmitFeedback.html">Submitfeedback</a>
     *             API.</p>
     * @public
     */
    QueryId?: string | undefined;
    /**
     * <p>The results of the retrieved relevant passages for the search.</p>
     * @public
     */
    ResultItems?: RetrieveResultItem[] | undefined;
}
/**
 * <p>The resource you want to use is currently in use. Please check you have provided the
 *             correct resource and try again.</p>
 * @public
 */
export declare class ResourceInUseException extends __BaseException {
    readonly name: "ResourceInUseException";
    readonly $fault: "client";
    Message?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ResourceInUseException, __BaseException>);
}
/**
 * @public
 */
export interface StartDataSourceSyncJobRequest {
    /**
     * <p>The identifier of the data source connector to synchronize.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>The identifier of the index used with the data source connector.</p>
     * @public
     */
    IndexId: string | undefined;
}
/**
 * @public
 */
export interface StartDataSourceSyncJobResponse {
    /**
     * <p>Identifies a particular synchronization job.</p>
     * @public
     */
    ExecutionId?: string | undefined;
}
/**
 * @public
 */
export interface StopDataSourceSyncJobRequest {
    /**
     * <p>The identifier of the data source connector for which to stop the synchronization
     *       jobs.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>The identifier of the index used with the data source connector.</p>
     * @public
     */
    IndexId: string | undefined;
}
/**
 * <p>Gathers information about when a particular result was clicked by a user. Your
 *             application uses the <code>SubmitFeedback</code> API to provide click
 *             information.</p>
 * @public
 */
export interface ClickFeedback {
    /**
     * <p>The identifier of the search result that was clicked.</p>
     * @public
     */
    ResultId: string | undefined;
    /**
     * <p>The Unix timestamp when the result was clicked.</p>
     * @public
     */
    ClickTime: Date | undefined;
}
/**
 * @public
 * @enum
 */
export declare const RelevanceType: {
    readonly NOT_RELEVANT: "NOT_RELEVANT";
    readonly RELEVANT: "RELEVANT";
};
/**
 * @public
 */
export type RelevanceType = (typeof RelevanceType)[keyof typeof RelevanceType];
/**
 * <p>Provides feedback on how relevant a document is to a search. Your application uses the
 *             <code>SubmitFeedback</code> API to provide relevance information.</p>
 * @public
 */
export interface RelevanceFeedback {
    /**
     * <p>The identifier of the search result that the user provided relevance feedback
     *             for.</p>
     * @public
     */
    ResultId: string | undefined;
    /**
     * <p>Whether the document was relevant or not relevant to the search.</p>
     * @public
     */
    RelevanceValue: RelevanceType | undefined;
}
/**
 * @public
 */
export interface SubmitFeedbackRequest {
    /**
     * <p>The identifier of the index that was queried.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>The identifier of the specific query for which you are submitting
     *             feedback. The query ID is returned in the response to the
     *                 <code>Query</code> API.</p>
     * @public
     */
    QueryId: string | undefined;
    /**
     * <p>Tells Amazon Kendra that a particular search result link was chosen
     *             by the user. </p>
     * @public
     */
    ClickFeedbackItems?: ClickFeedback[] | undefined;
    /**
     * <p>Provides Amazon Kendra with relevant or not relevant feedback for
     *             whether a particular item was relevant to the search.</p>
     * @public
     */
    RelevanceFeedbackItems?: RelevanceFeedback[] | undefined;
}
/**
 * @public
 */
export interface TagResourceRequest {
    /**
     * <p>The Amazon Resource Name (ARN) of the index, FAQ, data source, or other resource to add a tag.
     *       For example, the ARN of an index is constructed as follows:
     *       <i>arn:aws:kendra:your-region:your-account-id:index/index-id</i>
     *       For information on how to construct an ARN for all types of Amazon Kendra resources, see
     *       <a href="https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonkendra.html#amazonkendra-resources-for-iam-policies">Resource
     *         types</a>.</p>
     * @public
     */
    ResourceARN: string | undefined;
    /**
     * <p>A list of tag keys to add to the index, FAQ, data source, or other resource. If a tag already
     *       exists, the existing value is replaced with the new value.</p>
     * @public
     */
    Tags: Tag[] | undefined;
}
/**
 * @public
 */
export interface TagResourceResponse {
}
/**
 * @public
 */
export interface UntagResourceRequest {
    /**
     * <p>The Amazon Resource Name (ARN) of the index, FAQ, data source, or other resource to remove a tag.
     *       For example, the ARN of an index is constructed as follows:
     *       <i>arn:aws:kendra:your-region:your-account-id:index/index-id</i>
     *       For information on how to construct an ARN for all types of Amazon Kendra resources, see
     *       <a href="https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonkendra.html#amazonkendra-resources-for-iam-policies">Resource
     *         types</a>.</p>
     * @public
     */
    ResourceARN: string | undefined;
    /**
     * <p>A list of tag keys to remove from the index, FAQ, data source, or other resource. If a tag
     *       key doesn't exist for the resource, it is ignored.</p>
     * @public
     */
    TagKeys: string[] | undefined;
}
/**
 * @public
 */
export interface UntagResourceResponse {
}
/**
 * @public
 */
export interface UpdateAccessControlConfigurationRequest {
    /**
     * <p>The identifier of the index for an access control configuration.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>The identifier of the access control configuration you want to update.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>A new name for the access control configuration.</p>
     * @public
     */
    Name?: string | undefined;
    /**
     * <p>A new description for the access control configuration.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>Information you want to update on principals (users and/or groups) and which documents
     *             they should have access to. This is useful for user context filtering, where search
     *             results are filtered based on the user or their group access to documents.</p>
     * @public
     */
    AccessControlList?: Principal[] | undefined;
    /**
     * <p>The updated list of <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_Principal.html">principal</a> lists that define the
     *             hierarchy for which documents users should have access to.</p>
     * @public
     */
    HierarchicalAccessControlList?: HierarchicalPrincipal[] | undefined;
}
/**
 * @public
 */
export interface UpdateAccessControlConfigurationResponse {
}
/**
 * @public
 */
export interface UpdateDataSourceRequest {
    /**
     * <p>The identifier of the data source connector you want to update.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>A new name for the data source connector.</p>
     * @public
     */
    Name?: string | undefined;
    /**
     * <p>The identifier of the index used with the data source connector.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>Configuration information you want to update for the data source connector.</p>
     * @public
     */
    Configuration?: DataSourceConfiguration | undefined;
    /**
     * <p>Configuration information for an Amazon Virtual Private Cloud to connect to your data source.
     *       For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/vpc-configuration.html">Configuring a VPC</a>.</p>
     * @public
     */
    VpcConfiguration?: DataSourceVpcConfiguration | undefined;
    /**
     * <p>A new description for the data source connector.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>The sync schedule you want to update for the data source connector.</p>
     * @public
     */
    Schedule?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an IAM role with permission to access
     *       the data source and required resources. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/iam-roles.html">IAM roles for Amazon Kendra</a>.</p>
     * @public
     */
    RoleArn?: string | undefined;
    /**
     * <p>The code for a language you want to update for the data source connector.
     *             This allows you to support a language for all
     *             documents when updating the data source. English is supported
     *             by default. For more information on supported languages, including their codes,
     *             see <a href="https://docs.aws.amazon.com/kendra/latest/dg/in-adding-languages.html">Adding
     *                 documents in languages other than English</a>.</p>
     * @public
     */
    LanguageCode?: string | undefined;
    /**
     * <p>Configuration information you want to update for altering document metadata and
     *             content during the document ingestion process.</p>
     *          <p>For more information on how to create, modify and delete document metadata, or make
     *             other content alterations when you ingest documents into Amazon Kendra, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/custom-document-enrichment.html">Customizing document metadata during the ingestion process</a>.</p>
     * @public
     */
    CustomDocumentEnrichmentConfiguration?: CustomDocumentEnrichmentConfiguration | undefined;
}
/**
 * @public
 */
export interface UpdateExperienceRequest {
    /**
     * <p>The identifier of your Amazon Kendra experience you want to update.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>A new name for your Amazon Kendra experience.</p>
     * @public
     */
    Name?: string | undefined;
    /**
     * <p>The identifier of the index for your Amazon Kendra experience.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of an IAM role with permission to access
     *             the <code>Query</code> API, <code>QuerySuggestions</code> API, <code>SubmitFeedback</code>
     *             API, and IAM Identity Center that stores your users and groups information.
     *             For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/iam-roles.html">IAM roles for Amazon Kendra</a>.</p>
     * @public
     */
    RoleArn?: string | undefined;
    /**
     * <p>Configuration information you want to update for your Amazon Kendra experience.</p>
     * @public
     */
    Configuration?: ExperienceConfiguration | undefined;
    /**
     * <p>A new description for your Amazon Kendra experience.</p>
     * @public
     */
    Description?: string | undefined;
}
/**
 * @public
 */
export interface UpdateFeaturedResultsSetRequest {
    /**
     * <p>The identifier of the index used for featuring results.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>The identifier of the set of featured results that you want to update.</p>
     * @public
     */
    FeaturedResultsSetId: string | undefined;
    /**
     * <p>A new name for the set of featured results.</p>
     * @public
     */
    FeaturedResultsSetName?: string | undefined;
    /**
     * <p>A new description for the set of featured results.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>You can set the status to <code>ACTIVE</code> or <code>INACTIVE</code>.
     *             When the value is <code>ACTIVE</code>, featured results are ready for
     *             use. You can still configure your settings before setting the status
     *             to <code>ACTIVE</code>. The queries you specify for featured results
     *             must be unique per featured results set for each index, whether the
     *             status is <code>ACTIVE</code> or <code>INACTIVE</code>.</p>
     * @public
     */
    Status?: FeaturedResultsSetStatus | undefined;
    /**
     * <p>A list of queries for featuring results. For more information on the
     *             list of queries, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_FeaturedResultsSet.html">FeaturedResultsSet</a>.</p>
     * @public
     */
    QueryTexts?: string[] | undefined;
    /**
     * <p>A list of document IDs for the documents you want to feature at the
     *             top of the search results page. For more information on the list of
     *             featured documents, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_FeaturedResultsSet.html">FeaturedResultsSet</a>.</p>
     * @public
     */
    FeaturedDocuments?: FeaturedDocument[] | undefined;
}
/**
 * @public
 */
export interface UpdateFeaturedResultsSetResponse {
    /**
     * <p>Information on the set of featured results. This includes the identifier
     *             of the featured results set, whether the featured results set is active
     *             or inactive, when the featured results set was last updated, and more.</p>
     * @public
     */
    FeaturedResultsSet?: FeaturedResultsSet | undefined;
}
/**
 * @public
 */
export interface UpdateIndexRequest {
    /**
     * <p>The identifier of the index you want to update.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>A new name for the index.</p>
     * @public
     */
    Name?: string | undefined;
    /**
     * <p>An Identity and Access Management (IAM) role that gives Amazon Kendra
     *       permission to access Amazon CloudWatch logs and metrics.</p>
     * @public
     */
    RoleArn?: string | undefined;
    /**
     * <p>A new description for the index.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>The document metadata configuration you want to update for the index. Document metadata
     *       are fields or attributes associated with your documents. For example, the company department
     *       name associated with each document.</p>
     * @public
     */
    DocumentMetadataConfigurationUpdates?: DocumentMetadataConfiguration[] | undefined;
    /**
     * <p>Sets the number of additional document storage and query capacity units that should be
     *       used by the index. You can change the capacity of the index up to 5 times per day, or make 5
     *       API calls.</p>
     *          <p>If you are using extra storage units, you can't reduce the storage capacity below what is
     *       required to meet the storage needs for your index.</p>
     * @public
     */
    CapacityUnits?: CapacityUnitsConfiguration | undefined;
    /**
     * <p>The user token configuration.</p>
     *          <important>
     *             <p>If you're using an Amazon Kendra Gen AI Enterprise Edition index and you try to use
     *                <code>UserTokenConfigurations</code> to configure user context policy, Amazon Kendra returns
     *             a <code>ValidationException</code> error.</p>
     *          </important>
     * @public
     */
    UserTokenConfigurations?: UserTokenConfiguration[] | undefined;
    /**
     * <p>The user context policy.</p>
     *          <important>
     *             <p>If you're using an Amazon Kendra Gen AI Enterprise Edition index, you can only use
     *                <code>ATTRIBUTE_FILTER</code> to filter search results by user context. If you're
     *             using an Amazon Kendra Gen AI Enterprise Edition index and you try to use
     *                <code>USER_TOKEN</code> to configure user context policy, Amazon Kendra returns a
     *                <code>ValidationException</code> error.</p>
     *          </important>
     * @public
     */
    UserContextPolicy?: UserContextPolicy | undefined;
    /**
     * <p>Gets users and groups from IAM Identity Center identity source. To configure this,
     *          see <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_UserGroupResolutionConfiguration.html">UserGroupResolutionConfiguration</a>. This is useful for user context filtering,
     *          where search results are filtered based on the user or their group access to
     *          documents.</p>
     *          <important>
     *             <p>If you're using an Amazon Kendra Gen AI Enterprise Edition index,
     *                <code>UserGroupResolutionConfiguration</code> isn't supported.</p>
     *          </important>
     * @public
     */
    UserGroupResolutionConfiguration?: UserGroupResolutionConfiguration | undefined;
}
/**
 * @public
 */
export interface UpdateQuerySuggestionsBlockListRequest {
    /**
     * <p>The identifier of the index for the block list.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>The identifier of the block list you want to update.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>A new name for the block list.</p>
     * @public
     */
    Name?: string | undefined;
    /**
     * <p>A new description for the block list.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>The S3 path where your block list text file sits in S3.</p>
     *          <p>If you update your block list and provide the same path to the
     *             block list text file in S3, then Amazon Kendra reloads the file to refresh
     *             the block list. Amazon Kendra does not automatically refresh your block list.
     *             You need to call the <code>UpdateQuerySuggestionsBlockList</code> API
     *             to refresh you block list.</p>
     *          <p>If you update your block list, then Amazon Kendra asynchronously refreshes
     *             all query suggestions with the latest content in the S3 file. This
     *             means changes might not take effect immediately.</p>
     * @public
     */
    SourceS3Path?: S3Path | undefined;
    /**
     * <p>The IAM (Identity and Access Management) role used to access the
     *             block list text file in S3.</p>
     * @public
     */
    RoleArn?: string | undefined;
}
/**
 * @public
 */
export interface UpdateQuerySuggestionsConfigRequest {
    /**
     * <p> The identifier of the index with query suggestions you want to update.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>Set the mode to <code>ENABLED</code> or <code>LEARN_ONLY</code>.</p>
     *          <p>By default, Amazon Kendra enables query suggestions.
     *             <code>LEARN_ONLY</code> mode allows you to turn off query suggestions.
     *             You can to update this at any time.</p>
     *          <p>In <code>LEARN_ONLY</code> mode, Amazon Kendra continues to learn from new
     *             queries to keep suggestions up to date for when you are ready to
     *             switch to ENABLED mode again.</p>
     * @public
     */
    Mode?: Mode | undefined;
    /**
     * <p>How recent your queries are in your query log time window.</p>
     *          <p>The time window is the number of days from current day to past days.</p>
     *          <p>By default, Amazon Kendra sets this to 180.</p>
     * @public
     */
    QueryLogLookBackWindowInDays?: number | undefined;
    /**
     * <p>
     *             <code>TRUE</code> to include queries without user information (i.e. all queries,
     *             irrespective of the user), otherwise <code>FALSE</code> to only include queries
     *             with user information.</p>
     *          <p>If you pass user information to Amazon Kendra along with the queries, you can set this
     *             flag to <code>FALSE</code> and instruct Amazon Kendra to only consider queries with user
     *             information.</p>
     *          <p>If you set to <code>FALSE</code>, Amazon Kendra only considers queries searched at least
     *             <code>MinimumQueryCount</code> times across <code>MinimumNumberOfQueryingUsers</code>
     *             unique users for suggestions.</p>
     *          <p>If you set to <code>TRUE</code>, Amazon Kendra ignores all user information and learns
     *             from all queries.</p>
     * @public
     */
    IncludeQueriesWithoutUserInformation?: boolean | undefined;
    /**
     * <p>The minimum number of unique users who must search a query in order for the query
     *             to be eligible to suggest to your users.</p>
     *          <p>Increasing this number might decrease the number of suggestions. However, this
     *             ensures a query is searched by many users and is truly popular to suggest to users.</p>
     *          <p>How you tune this setting depends on your specific needs.</p>
     * @public
     */
    MinimumNumberOfQueryingUsers?: number | undefined;
    /**
     * <p>The the minimum number of times a query must be searched in order to be
     *             eligible to suggest to your users.</p>
     *          <p>Decreasing this number increases the number of suggestions. However, this
     *             affects the quality of suggestions as it sets a low bar for a query to be
     *             considered popular to suggest to users.</p>
     *          <p>How you tune this setting depends on your specific needs.</p>
     * @public
     */
    MinimumQueryCount?: number | undefined;
    /**
     * <p>Configuration information for the document fields/attributes that you want to base
     *             query suggestions on.</p>
     * @public
     */
    AttributeSuggestionsConfig?: AttributeSuggestionsUpdateConfig | undefined;
}
/**
 * @public
 */
export interface UpdateThesaurusRequest {
    /**
     * <p>The identifier of the thesaurus you want to update.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>A new name for the thesaurus.</p>
     * @public
     */
    Name?: string | undefined;
    /**
     * <p>The identifier of the index for the thesaurus.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>A new description for the thesaurus.</p>
     * @public
     */
    Description?: string | undefined;
    /**
     * <p>An IAM role that gives Amazon Kendra permissions to
     *          access thesaurus file specified in <code>SourceS3Path</code>.</p>
     * @public
     */
    RoleArn?: string | undefined;
    /**
     * <p>Information required to find a specific file in an Amazon S3 bucket.</p>
     * @public
     */
    SourceS3Path?: S3Path | undefined;
}
/**
 * <p>Information about a document attribute or field. You can use document attributes as
 *          facets.</p>
 *          <p>For example, the document attribute or facet "Department" includes the values "HR",
 *          "Engineering", and "Accounting". You can display these values in the search results so that
 *          documents can be searched by department.</p>
 *          <p>You can display up to 10 facet values per facet for a query. If you want to increase
 *          this limit, contact <a href="http://aws.amazon.com/contact-us/">Support</a>.</p>
 * @public
 */
export interface Facet {
    /**
     * <p>The unique key for the document attribute.</p>
     * @public
     */
    DocumentAttributeKey?: string | undefined;
    /**
     * <p>An array of document attributes that are nested facets within a facet.</p>
     *          <p>For example, the document attribute or facet "Department" includes a value called
     *          "Engineering". In addition, the document attribute or facet "SubDepartment" includes the
     *          values "Frontend" and "Backend" for documents assigned to "Engineering". You can display
     *          nested facets in the search results so that documents can be searched not only by
     *          department but also by a sub department within a department. This helps your users further
     *          narrow their search.</p>
     *          <p>You can only have one nested facet within a facet. If you want to increase this limit,
     *          contact <a href="http://aws.amazon.com/contact-us/">Support</a>.</p>
     * @public
     */
    Facets?: Facet[] | undefined;
    /**
     * <p>Maximum number of facet values per facet. The default is 10. You can use this to limit
     *          the number of facet values to less than 10. If you want to increase the default, contact
     *             <a href="http://aws.amazon.com/contact-us/">Support</a>.</p>
     * @public
     */
    MaxResults?: number | undefined;
}
/**
 * <p>Provides the count of documents that match a particular document attribute or field when
 *          doing a faceted search.</p>
 * @public
 */
export interface DocumentAttributeValueCountPair {
    /**
     * <p>The value of the attribute/field. For example, "HR".</p>
     * @public
     */
    DocumentAttributeValue?: DocumentAttributeValue | undefined;
    /**
     * <p>The number of documents in the response that have the attribute/field value for the
     *          key.</p>
     * @public
     */
    Count?: number | undefined;
    /**
     * <p>Contains the results of a document attribute/field that is a nested facet. A
     *             <code>FacetResult</code> contains the counts for each facet nested within a
     *          facet.</p>
     *          <p>For example, the document attribute or facet "Department" includes a value called
     *          "Engineering". In addition, the document attribute or facet "SubDepartment" includes the
     *          values "Frontend" and "Backend" for documents assigned to "Engineering". You can display
     *          nested facets in the search results so that documents can be searched not only by
     *          department but also by a sub department within a department. The counts for documents that
     *          belong to "Frontend" and "Backend" within "Engineering" are returned for a query.</p>
     *          <p></p>
     *          <p></p>
     * @public
     */
    FacetResults?: FacetResult[] | undefined;
}
/**
 * <p>The facet values for the documents in the response.</p>
 * @public
 */
export interface FacetResult {
    /**
     * <p>The key for the facet values. This is the same as the <code>DocumentAttributeKey</code>
     *          provided in the query.</p>
     * @public
     */
    DocumentAttributeKey?: string | undefined;
    /**
     * <p>The data type of the facet value. This is the same as the type defined for the index
     *          field when it was created.</p>
     * @public
     */
    DocumentAttributeValueType?: DocumentAttributeValueType | undefined;
    /**
     * <p>An array of key/value pairs, where the key is the value of the attribute and the count
     *          is the number of documents that share the key value.</p>
     * @public
     */
    DocumentAttributeValueCountPairs?: DocumentAttributeValueCountPair[] | undefined;
}
/**
 * <p>Filters the search results based on document attributes or fields.</p>
 *          <p>You can filter results using attributes for your particular documents. The attributes
 *          must exist in your index. For example, if your documents include the custom attribute
 *          "Department", you can filter documents that belong to the "HR" department. You would use
 *          the <code>EqualsTo</code> operation to filter results or documents with "Department" equals
 *          to "HR".</p>
 *          <p>You can use <code>AndAllFilters</code> and <code>OrAllFilters</code> in combination with
 *          each other or with other operations such as <code>EqualsTo</code>. For example:</p>
 *          <p>
 *             <code>AndAllFilters</code>
 *          </p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <code>EqualsTo</code>: "Department", "HR"</p>
 *             </li>
 *             <li>
 *                <p>
 *                   <code>OrAllFilters</code>
 *                </p>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <code>ContainsAny</code>: "Project Name", ["new hires", "new hiring"]</p>
 *                   </li>
 *                </ul>
 *             </li>
 *          </ul>
 *          <p>This example filters results or documents that belong to the HR department
 *             <code>AND</code> belong to projects that contain "new hires"
 *             <code>OR</code> "new hiring" in the project name (must use
 *             <code>ContainAny</code> with <code>StringListValue</code>). This example is filtering
 *          with a depth of 2.</p>
 *          <p>You cannot filter more than a depth of 2, otherwise you receive a
 *             <code>ValidationException</code> exception with the message "AttributeFilter cannot have
 *          a depth of more than 2." Also, if you use more than 10 attribute filters in a given list
 *          for <code>AndAllFilters</code> or <code>OrAllFilters</code>, you receive a
 *             <code>ValidationException</code> with the message "AttributeFilter cannot have a length
 *          of more than 10".</p>
 *          <p>For examples of using <code>AttributeFilter</code>, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/filtering.html#search-filtering">Using document attributes to
 *             filter search results</a>.</p>
 * @public
 */
export interface AttributeFilter {
    /**
     * <p>Performs a logical <code>AND</code> operation on all filters that you specify.</p>
     * @public
     */
    AndAllFilters?: AttributeFilter[] | undefined;
    /**
     * <p>Performs a logical <code>OR</code> operation on all filters that you specify.</p>
     * @public
     */
    OrAllFilters?: AttributeFilter[] | undefined;
    /**
     * <p>Performs a logical <code>NOT</code> operation on all filters that you specify.</p>
     * @public
     */
    NotFilter?: AttributeFilter | undefined;
    /**
     * <p>Performs an equals operation on document attributes/fields and their values.</p>
     * @public
     */
    EqualsTo?: DocumentAttribute | undefined;
    /**
     * <p>Returns true when a document contains all of the specified document attributes/fields.
     *          This filter is only applicable to <a href="https://docs.aws.amazon.com/kendra/latest/APIReference/API_DocumentAttributeValue.html">StringListValue</a>.</p>
     * @public
     */
    ContainsAll?: DocumentAttribute | undefined;
    /**
     * <p>Returns true when a document contains any of the specified document attributes/fields.
     *          This filter is only applicable to <a href="https://docs.aws.amazon.com/kendra/latest/APIReference/API_DocumentAttributeValue.html">StringListValue</a>.</p>
     * @public
     */
    ContainsAny?: DocumentAttribute | undefined;
    /**
     * <p>Performs a greater than operation on document attributes/fields and their values. Use
     *          with the <a href="https://docs.aws.amazon.com/kendra/latest/APIReference/API_DocumentAttributeValue.html">document attribute
     *             type</a>
     *             <code>Date</code> or <code>Long</code>.</p>
     * @public
     */
    GreaterThan?: DocumentAttribute | undefined;
    /**
     * <p>Performs a greater or equals than operation on document attributes/fields and their
     *          values. Use with the <a href="https://docs.aws.amazon.com/kendra/latest/APIReference/API_DocumentAttributeValue.html">document attribute
     *             type</a>
     *             <code>Date</code> or <code>Long</code>.</p>
     * @public
     */
    GreaterThanOrEquals?: DocumentAttribute | undefined;
    /**
     * <p>Performs a less than operation on document attributes/fields and their values. Use with
     *          the <a href="https://docs.aws.amazon.com/kendra/latest/APIReference/API_DocumentAttributeValue.html">document attribute
     *             type</a>
     *             <code>Date</code> or <code>Long</code>.</p>
     * @public
     */
    LessThan?: DocumentAttribute | undefined;
    /**
     * <p>Performs a less than or equals operation on document attributes/fields and their values.
     *          Use with the <a href="https://docs.aws.amazon.com/kendra/latest/APIReference/API_DocumentAttributeValue.html">document attribute
     *             type</a>
     *             <code>Date</code> or <code>Long</code>.</p>
     * @public
     */
    LessThanOrEquals?: DocumentAttribute | undefined;
}
/**
 * @public
 */
export interface QueryResult {
    /**
     * <p>The identifier for the search. You also use <code>QueryId</code> to identify the search
     *          when using the <a href="https://docs.aws.amazon.com/kendra/latest/APIReference/API_SubmitFeedback.html">SubmitFeedback</a>
     *          API.</p>
     * @public
     */
    QueryId?: string | undefined;
    /**
     * <p>The results of the search.</p>
     * @public
     */
    ResultItems?: QueryResultItem[] | undefined;
    /**
     * <p>Contains the facet results. A <code>FacetResult</code> contains the counts for each
     *          field/attribute key that was specified in the <code>Facets</code> input parameter.</p>
     * @public
     */
    FacetResults?: FacetResult[] | undefined;
    /**
     * <p>The total number of items found by the search. However, you can only retrieve up to 100
     *          items. For example, if the search found 192 items, you can only retrieve the first 100 of
     *          the items.</p>
     * @public
     */
    TotalNumberOfResults?: number | undefined;
    /**
     * <p>A list of warning codes and their messages on problems with your query.</p>
     *          <p>Amazon Kendra currently only supports one type of warning, which is a warning on
     *          invalid syntax used in the query. For examples of invalid query syntax, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/searching-example.html#searching-index-query-syntax">Searching
     *             with advanced query syntax</a>.</p>
     * @public
     */
    Warnings?: Warning[] | undefined;
    /**
     * <p>A list of information related to suggested spell corrections for a query.</p>
     * @public
     */
    SpellCorrectedQueries?: SpellCorrectedQuery[] | undefined;
    /**
     * <p>The list of featured result items. Featured results are displayed at the top of the
     *          search results page, placed above all other results for certain queries. If there's an
     *          exact match of a query, then certain documents are featured in the search results.</p>
     * @public
     */
    FeaturedResultsItems?: FeaturedResultsItem[] | undefined;
}
/**
 * <p>Provides the configuration information for the document fields/attributes that you want
 *             to base query suggestions on.</p>
 * @public
 */
export interface AttributeSuggestionsGetConfig {
    /**
     * <p>The list of document field/attribute keys or field names to use for query suggestions.
     *             If the content within any of the fields match what your user starts typing as their query,
     *             then the field content is returned as a query suggestion.</p>
     * @public
     */
    SuggestionAttributes?: string[] | undefined;
    /**
     * <p>The list of additional document field/attribute keys or field names to include in the
     *             response. You can use additional fields to provide extra information in the response.
     *             Additional fields are not used to based suggestions on.</p>
     * @public
     */
    AdditionalResponseAttributes?: string[] | undefined;
    /**
     * <p>Filters the search results based on document fields/attributes.</p>
     * @public
     */
    AttributeFilter?: AttributeFilter | undefined;
    /**
     * <p>Applies user context filtering so that only users who are given access to certain
     *             documents see these document in their search results.</p>
     * @public
     */
    UserContext?: UserContext | undefined;
}
/**
 * @public
 */
export interface RetrieveRequest {
    /**
     * <p>The identifier of the index to retrieve relevant passages for the search.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>The input query text to retrieve relevant passages for the search. Amazon Kendra
     *             truncates queries at 30 token words, which excludes punctuation and stop words.
     *             Truncation still applies if you use Boolean or more advanced, complex queries. For
     *             example, <code>Timeoff AND October AND Category:HR</code> is counted as 3 tokens:
     *                 <code>timeoff</code>, <code>october</code>, <code>hr</code>. For more information,
     *             see <a href="https://docs.aws.amazon.com/kendra/latest/dg/searching-example.html#searching-index-query-syntax">Searching with advanced query syntax</a> in the Amazon Kendra Developer Guide. </p>
     * @public
     */
    QueryText: string | undefined;
    /**
     * <p>Filters search results by document fields/attributes. You can only provide one
     *             attribute filter; however, the <code>AndAllFilters</code>, <code>NotFilter</code>, and
     *                 <code>OrAllFilters</code> parameters contain a list of other filters.</p>
     *          <p>The <code>AttributeFilter</code> parameter means you can create a set of filtering
     *             rules that a document must satisfy to be included in the query results.</p>
     *          <note>
     *             <p>For Amazon Kendra Gen AI Enterprise Edition indices use <code>AttributeFilter</code> to
     *                 enable document filtering for end users using <code>_email_id</code> or include
     *                 public documents (<code>_email_id=null</code>).</p>
     *          </note>
     * @public
     */
    AttributeFilter?: AttributeFilter | undefined;
    /**
     * <p>A list of document fields/attributes to include in the response. You can limit the
     *             response to include certain document fields. By default, all document fields are
     *             included in the response.</p>
     * @public
     */
    RequestedDocumentAttributes?: string[] | undefined;
    /**
     * <p>Overrides relevance tuning configurations of fields/attributes set at the index
     *             level.</p>
     *          <p>If you use this API to override the relevance tuning configured at the index level,
     *             but there is no relevance tuning configured at the index level, then Amazon Kendra
     *             does not apply any relevance tuning.</p>
     *          <p>If there is relevance tuning configured for fields at the index level, and you use
     *             this API to override only some of these fields, then for the fields you did not
     *             override, the importance is set to 1.</p>
     * @public
     */
    DocumentRelevanceOverrideConfigurations?: DocumentRelevanceConfiguration[] | undefined;
    /**
     * <p>Retrieved relevant passages are returned in pages the size of the
     *                 <code>PageSize</code> parameter. By default, Amazon Kendra returns the first
     *             page of results. Use this parameter to get result pages after the first one.</p>
     * @public
     */
    PageNumber?: number | undefined;
    /**
     * <p>Sets the number of retrieved relevant passages that are returned in each page of
     *             results. The default page size is 10. The maximum number of results returned is 100. If
     *             you ask for more than 100 results, only 100 are returned.</p>
     * @public
     */
    PageSize?: number | undefined;
    /**
     * <p>The user context token or user and group information.</p>
     * @public
     */
    UserContext?: UserContext | undefined;
}
/**
 * @public
 */
export interface GetQuerySuggestionsRequest {
    /**
     * <p>The identifier of the index you want to get query suggestions from.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>The text of a user's query to generate query suggestions.</p>
     *          <p>A query is suggested if the query prefix matches
     *             what a user starts to type as their query.</p>
     *          <p>Amazon Kendra does not show any suggestions if a user
     *             types fewer than two characters or more than 60 characters.
     *             A query must also have at least one search result and contain
     *             at least one word of more than four characters.</p>
     * @public
     */
    QueryText: string | undefined;
    /**
     * <p>The maximum number of query suggestions you want to show
     *             to your users.</p>
     * @public
     */
    MaxSuggestionsCount?: number | undefined;
    /**
     * <p>The suggestions type to base query suggestions on. The suggestion
     *             types are query history or document fields/attributes. You can set
     *             one type or the other.</p>
     *          <p>If you set query history as your suggestions type, Amazon Kendra
     *             suggests queries relevant to your users based on popular queries in
     *             the query history.</p>
     *          <p>If you set document fields/attributes as your suggestions type,
     *             Amazon Kendra suggests queries relevant to your users based on the
     *             contents of document fields.</p>
     * @public
     */
    SuggestionTypes?: SuggestionType[] | undefined;
    /**
     * <p>Configuration information for the document fields/attributes that you
     *             want to base query suggestions on.</p>
     * @public
     */
    AttributeSuggestionsConfig?: AttributeSuggestionsGetConfig | undefined;
}
/**
 * @public
 */
export interface QueryRequest {
    /**
     * <p>The identifier of the index for the search.</p>
     * @public
     */
    IndexId: string | undefined;
    /**
     * <p>The input query text for the search. Amazon Kendra truncates queries at 30 token
     *          words, which excludes punctuation and stop words. Truncation still applies if you use
     *          Boolean or more advanced, complex queries. For example, <code>Timeoff AND October AND
     *             Category:HR</code> is counted as 3 tokens: <code>timeoff</code>, <code>october</code>,
     *             <code>hr</code>. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/searching-example.html#searching-index-query-syntax">Searching with advanced query syntax</a> in the Amazon Kendra Developer Guide. </p>
     * @public
     */
    QueryText?: string | undefined;
    /**
     * <p>Filters search results by document fields/attributes. You can only provide one attribute
     *          filter; however, the <code>AndAllFilters</code>, <code>NotFilter</code>, and
     *             <code>OrAllFilters</code> parameters contain a list of other filters.</p>
     *          <p>The <code>AttributeFilter</code> parameter means you can create a set of filtering rules
     *          that a document must satisfy to be included in the query results.</p>
     *          <note>
     *             <p>For Amazon Kendra Gen AI Enterprise Edition indices use <code>AttributeFilter</code> to
     *             enable document filtering for end users using <code>_email_id</code> or include public
     *             documents (<code>_email_id=null</code>).</p>
     *          </note>
     * @public
     */
    AttributeFilter?: AttributeFilter | undefined;
    /**
     * <p>An array of documents fields/attributes for faceted search. Amazon Kendra returns a
     *          count for each field key specified. This helps your users narrow their search.</p>
     * @public
     */
    Facets?: Facet[] | undefined;
    /**
     * <p>An array of document fields/attributes to include in the response. You can limit the
     *          response to include certain document fields. By default, all document attributes are
     *          included in the response.</p>
     * @public
     */
    RequestedDocumentAttributes?: string[] | undefined;
    /**
     * <p>Sets the type of query result or response. Only results for the specified type are
     *          returned.</p>
     * @public
     */
    QueryResultTypeFilter?: QueryResultType | undefined;
    /**
     * <p>Overrides relevance tuning configurations of fields/attributes set at the index
     *          level.</p>
     *          <p>If you use this API to override the relevance tuning configured at the index level, but
     *          there is no relevance tuning configured at the index level, then Amazon Kendra does
     *          not apply any relevance tuning.</p>
     *          <p>If there is relevance tuning configured for fields at the index level, and you use this
     *          API to override only some of these fields, then for the fields you did not override, the
     *          importance is set to 1.</p>
     * @public
     */
    DocumentRelevanceOverrideConfigurations?: DocumentRelevanceConfiguration[] | undefined;
    /**
     * <p>Query results are returned in pages the size of the <code>PageSize</code> parameter. By
     *          default, Amazon Kendra returns the first page of results. Use this parameter to get
     *          result pages after the first one.</p>
     * @public
     */
    PageNumber?: number | undefined;
    /**
     * <p>Sets the number of results that are returned in each page of results. The default page
     *          size is 10. The maximum number of results returned is 100. If you ask for more than 100
     *          results, only 100 are returned.</p>
     * @public
     */
    PageSize?: number | undefined;
    /**
     * <p>Provides information that determines how the results of the query are sorted. You can
     *          set the field that Amazon Kendra should sort the results on, and specify whether the
     *          results should be sorted in ascending or descending order. In the case of ties in sorting
     *          the results, the results are sorted by relevance.</p>
     *          <p>If you don't provide sorting configuration, the results are sorted by the relevance that
     *             Amazon Kendra determines for the result.</p>
     * @public
     */
    SortingConfiguration?: SortingConfiguration | undefined;
    /**
     * <p>Provides configuration information to determine how the results of a query are
     *          sorted.</p>
     *          <p>You can set upto 3 fields that Amazon Kendra should sort the results on, and
     *          specify whether the results should be sorted in ascending or descending order. The sort
     *          field quota can be increased.</p>
     *          <p>If you don't provide a sorting configuration, the results are sorted by the relevance
     *          that Amazon Kendra determines for the result. In the case of ties in sorting the
     *          results, the results are sorted by relevance. </p>
     * @public
     */
    SortingConfigurations?: SortingConfiguration[] | undefined;
    /**
     * <p>The user context token or user and group information.</p>
     * @public
     */
    UserContext?: UserContext | undefined;
    /**
     * <p>Provides an identifier for a specific user. The <code>VisitorId</code> should be a
     *          unique identifier, such as a GUID. Don't use personally identifiable information, such as
     *          the user's email address, as the <code>VisitorId</code>.</p>
     * @public
     */
    VisitorId?: string | undefined;
    /**
     * <p>Enables suggested spell corrections for queries.</p>
     * @public
     */
    SpellCorrectionConfiguration?: SpellCorrectionConfiguration | undefined;
    /**
     * <p>Provides configuration to determine how to group results by document attribute value,
     *          and how to display them (collapsed or expanded) under a designated primary document for
     *          each group.</p>
     * @public
     */
    CollapseConfiguration?: CollapseConfiguration | undefined;
}
