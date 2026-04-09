import * as coreClient from "@azure/core-client";
import * as coreHttpCompat from "@azure/core-http-compat";
export type VectorQueryUnion = VectorQuery | VectorizedQuery | VectorizableTextQuery;
/** Common error response for all Azure Resource Manager APIs to return error details for failed operations. (This also follows the OData error response format.). */
export interface ErrorResponse {
    /** The error object. */
    error?: ErrorDetail;
}
/** The error detail. */
export interface ErrorDetail {
    /**
     * The error code.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly code?: string;
    /**
     * The error message.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly message?: string;
    /**
     * The error target.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly target?: string;
    /**
     * The error details.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly details?: ErrorDetail[];
    /**
     * The error additional info.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly additionalInfo?: ErrorAdditionalInfo[];
}
/** The resource management error additional info. */
export interface ErrorAdditionalInfo {
    /**
     * The additional info type.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly type?: string;
    /**
     * The additional info.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly info?: Record<string, unknown>;
}
/** Response containing search results from an index. */
export interface SearchDocumentsResult {
    /**
     * The total count of results found by the search operation, or null if the count was not requested. If present, the count may be greater than the number of results in this response. This can happen if you use the $top or $skip parameters, or if the query can't return all the requested documents in a single response.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly count?: number;
    /**
     * A value indicating the percentage of the index that was included in the query, or null if minimumCoverage was not specified in the request.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly coverage?: number;
    /**
     * The facet query results for the search operation, organized as a collection of buckets for each faceted field; null if the query did not include any facet expressions.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly facets?: {
        [propertyName: string]: FacetResult[];
    };
    /**
     * The answers query results for the search operation; null if the answers query parameter was not specified or set to 'none'.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly answers?: QueryAnswerResult[];
    /**
     * Continuation JSON payload returned when the query can't return all the requested results in a single response. You can use this JSON along with @odata.nextLink to formulate another POST Search request to get the next part of the search response.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly nextPageParameters?: SearchRequest;
    /**
     * The sequence of results returned by the query.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly results: SearchResult[];
    /**
     * Continuation URL returned when the query can't return all the requested results in a single response. You can use this URL to formulate another GET or POST Search request to get the next part of the search response. Make sure to use the same verb (GET or POST) as the request that produced this response.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly nextLink?: string;
    /**
     * Reason that a partial response was returned for a semantic ranking request.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly semanticPartialResponseReason?: SemanticErrorReason;
    /**
     * Type of partial response that was returned for a semantic ranking request.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly semanticPartialResponseType?: SemanticSearchResultsType;
}
/** A single bucket of a facet query result. Reports the number of documents with a field value falling within a particular range or having a particular value or interval. */
export interface FacetResult {
    /** Describes unknown properties. The value of an unknown property can be of "any" type. */
    [property: string]: any;
    /**
     * The approximate count of documents falling within the bucket described by this facet.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly count?: number;
}
/** An answer is a text passage extracted from the contents of the most relevant documents that matched the query. Answers are extracted from the top search results. Answer candidates are scored and the top answers are selected. */
export interface QueryAnswerResult {
    /** Describes unknown properties. The value of an unknown property can be of "any" type. */
    [property: string]: any;
    /**
     * The score value represents how relevant the answer is to the query relative to other answers returned for the query.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly score: number;
    /**
     * The key of the document the answer was extracted from.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly key: string;
    /**
     * The text passage extracted from the document contents as the answer.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly text: string;
    /**
     * Same text passage as in the Text property with highlighted text phrases most relevant to the query.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly highlights?: string;
}
/** Parameters for filtering, sorting, faceting, paging, and other search query behaviors. */
export interface SearchRequest {
    /** A value that specifies whether to fetch the total count of results. Default is false. Setting this value to true may have a performance impact. Note that the count returned is an approximation. */
    includeTotalResultCount?: boolean;
    /** The list of facet expressions to apply to the search query. Each facet expression contains a field name, optionally followed by a comma-separated list of name:value pairs. */
    facets?: string[];
    /** The OData $filter expression to apply to the search query. */
    filter?: string;
    /** The comma-separated list of field names to use for hit highlights. Only searchable fields can be used for hit highlighting. */
    highlightFields?: string;
    /** A string tag that is appended to hit highlights. Must be set with highlightPreTag. Default is &lt;/em&gt;. */
    highlightPostTag?: string;
    /** A string tag that is prepended to hit highlights. Must be set with highlightPostTag. Default is &lt;em&gt;. */
    highlightPreTag?: string;
    /** A number between 0 and 100 indicating the percentage of the index that must be covered by a search query in order for the query to be reported as a success. This parameter can be useful for ensuring search availability even for services with only one replica. The default is 100. */
    minimumCoverage?: number;
    /** The comma-separated list of OData $orderby expressions by which to sort the results. Each expression can be either a field name or a call to either the geo.distance() or the search.score() functions. Each expression can be followed by asc to indicate ascending, or desc to indicate descending. The default is ascending order. Ties will be broken by the match scores of documents. If no $orderby is specified, the default sort order is descending by document match score. There can be at most 32 $orderby clauses. */
    orderBy?: string;
    /** A value that specifies the syntax of the search query. The default is 'simple'. Use 'full' if your query uses the Lucene query syntax. */
    queryType?: QueryType;
    /** A value that specifies whether we want to calculate scoring statistics (such as document frequency) globally for more consistent scoring, or locally, for lower latency. The default is 'local'. Use 'global' to aggregate scoring statistics globally before scoring. Using global scoring statistics can increase latency of search queries. */
    scoringStatistics?: ScoringStatistics;
    /** A value to be used to create a sticky session, which can help getting more consistent results. As long as the same sessionId is used, a best-effort attempt will be made to target the same replica set. Be wary that reusing the same sessionID values repeatedly can interfere with the load balancing of the requests across replicas and adversely affect the performance of the search service. The value used as sessionId cannot start with a '_' character. */
    sessionId?: string;
    /** The list of parameter values to be used in scoring functions (for example, referencePointParameter) using the format name-values. For example, if the scoring profile defines a function with a parameter called 'mylocation' the parameter string would be "mylocation--122.2,44.8" (without the quotes). */
    scoringParameters?: string[];
    /** The name of a scoring profile to evaluate match scores for matching documents in order to sort the results. */
    scoringProfile?: string;
    /** Enables a debugging tool that can be used to further explore your reranked results. */
    debug?: QueryDebugMode;
    /** A full-text search query expression; Use "*" or omit this parameter to match all documents. */
    searchText?: string;
    /** The comma-separated list of field names to which to scope the full-text search. When using fielded search (fieldName:searchExpression) in a full Lucene query, the field names of each fielded search expression take precedence over any field names listed in this parameter. */
    searchFields?: string;
    /** A value that specifies whether any or all of the search terms must be matched in order to count the document as a match. */
    searchMode?: SearchMode;
    /** The comma-separated list of fields to retrieve. If unspecified, all fields marked as retrievable in the schema are included. */
    select?: string;
    /** The number of search results to skip. This value cannot be greater than 100,000. If you need to scan documents in sequence, but cannot use skip due to this limitation, consider using orderby on a totally-ordered key and filter with a range query instead. */
    skip?: number;
    /** The number of search results to retrieve. This can be used in conjunction with $skip to implement client-side paging of search results. If results are truncated due to server-side paging, the response will include a continuation token that can be used to issue another Search request for the next page of results. */
    top?: number;
    /** The name of a semantic configuration that will be used when processing documents for queries of type semantic. */
    semanticConfigurationName?: string;
    /** Allows the user to choose whether a semantic call should fail completely (default / current behavior), or to return partial results. */
    semanticErrorHandling?: SemanticErrorMode;
    /** Allows the user to set an upper bound on the amount of time it takes for semantic enrichment to finish processing before the request fails. */
    semanticMaxWaitInMilliseconds?: number;
    /** Allows setting a separate search query that will be solely used for semantic reranking, semantic captions and semantic answers. Is useful for scenarios where there is a need to use different queries between the base retrieval and ranking phase, and the L2 semantic phase. */
    semanticQuery?: string;
    /** A value that specifies whether answers should be returned as part of the search response. */
    answers?: QueryAnswerType;
    /** A value that specifies whether captions should be returned as part of the search response. */
    captions?: QueryCaptionType;
    /** The query parameters for vector and hybrid search queries. */
    vectorQueries?: VectorQueryUnion[];
    /** Determines whether or not filters are applied before or after the vector search is performed. Default is 'preFilter' for new indexes. */
    vectorFilterMode?: VectorFilterMode;
}
/** The query parameters for vector and hybrid search queries. */
export interface VectorQuery {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    kind: "vector" | "text";
    /** Number of nearest neighbors to return as top hits. */
    kNearestNeighborsCount?: number;
    /** Vector Fields of type Collection(Edm.Single) to be included in the vector searched. */
    fields?: string;
    /** When true, triggers an exhaustive k-nearest neighbor search across all vectors within the vector index. Useful for scenarios where exact matches are critical, such as determining ground truth values. */
    exhaustive?: boolean;
    /** Oversampling factor. Minimum value is 1. It overrides the 'defaultOversampling' parameter configured in the index definition. It can be set only when 'rerankWithOriginalVectors' is true. This parameter is only permitted when a compression method is used on the underlying vector field. */
    oversampling?: number;
    /** Relative weight of the vector query when compared to other vector query and/or the text query within the same search request. This value is used when combining the results of multiple ranking lists produced by the different vector queries and/or the results retrieved through the text query. The higher the weight, the higher the documents that matched that query will be in the final ranking. Default is 1.0 and the value needs to be a positive number larger than zero. */
    weight?: number;
}
/** Contains a document found by a search query, plus associated metadata. */
export interface SearchResult {
    /** Describes unknown properties. The value of an unknown property can be of "any" type. */
    [property: string]: any;
    /**
     * The relevance score of the document compared to other documents returned by the query.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly _score: number;
    /**
     * The relevance score computed by the semantic ranker for the top search results. Search results are sorted by the RerankerScore first and then by the Score. RerankerScore is only returned for queries of type 'semantic'.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly _rerankerScore?: number;
    /**
     * The relevance score computed by boosting the Reranker Score. Search results are sorted by the RerankerScore/RerankerBoostedScore based on useScoringProfileBoostedRanking in the Semantic Config. RerankerBoostedScore is only returned for queries of type 'semantic'
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly rerankerBoostedScore?: number;
    /**
     * Text fragments from the document that indicate the matching search terms, organized by each applicable field; null if hit highlighting was not enabled for the query.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly _highlights?: {
        [propertyName: string]: string[];
    };
    /**
     * Captions are the most representative passages from the document relatively to the search query. They are often used as document summary. Captions are only returned for queries of type 'semantic'.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly _captions?: QueryCaptionResult[];
    /**
     * Contains debugging information that can be used to further explore your search results.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly documentDebugInfo?: DocumentDebugInfo;
}
/** Captions are the most representative passages from the document relatively to the search query. They are often used as document summary. Captions are only returned for queries of type `semantic`. */
export interface QueryCaptionResult {
    /** Describes unknown properties. The value of an unknown property can be of "any" type. */
    [property: string]: any;
    /**
     * A representative text passage extracted from the document most relevant to the search query.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly text?: string;
    /**
     * Same text passage as in the Text property with highlighted phrases most relevant to the query.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly highlights?: string;
}
/** Contains debugging information that can be used to further explore your search results. */
export interface DocumentDebugInfo {
    /**
     * Contains debugging information specific to vector and hybrid search.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly vectors?: VectorsDebugInfo;
}
export interface VectorsDebugInfo {
    /**
     * The breakdown of subscores of the document prior to the chosen result set fusion/combination method such as RRF.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly subscores?: QueryResultDocumentSubscores;
}
/** The breakdown of subscores between the text and vector query components of the search query for this document. Each vector query is shown as a separate object in the same order they were received. */
export interface QueryResultDocumentSubscores {
    /**
     * The BM25 or Classic score for the text portion of the query.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly text?: TextResult;
    /**
     * The vector similarity and @search.score values for each vector query.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly vectors?: {
        [propertyName: string]: SingleVectorFieldResult;
    }[];
    /**
     * The BM25 or Classic score for the text portion of the query.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly documentBoost?: number;
}
/** The BM25 or Classic score for the text portion of the query. */
export interface TextResult {
    /**
     * The BM25 or Classic score for the text portion of the query.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly searchScore?: number;
}
/** A single vector field result. Both @search.score and vector similarity values are returned. Vector similarity is related to @search.score by an equation. */
export interface SingleVectorFieldResult {
    /**
     * The @search.score value that is calculated from the vector similarity score. This is the score that's visible in a pure single-field single-vector query.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly searchScore?: number;
    /**
     * The vector similarity score for this document. Note this is the canonical definition of similarity metric, not the 'distance' version. For example, cosine similarity instead of cosine distance.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly vectorSimilarity?: number;
}
/** Response containing suggestion query results from an index. */
export interface SuggestDocumentsResult {
    /**
     * The sequence of results returned by the query.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly results: SuggestResult[];
    /**
     * A value indicating the percentage of the index that was included in the query, or null if minimumCoverage was not set in the request.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly coverage?: number;
}
/** A result containing a document found by a suggestion query, plus associated metadata. */
export interface SuggestResult {
    /** Describes unknown properties. The value of an unknown property can be of "any" type. */
    [property: string]: any;
    /**
     * The text of the suggestion result.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly _text: string;
}
/** Parameters for filtering, sorting, fuzzy matching, and other suggestions query behaviors. */
export interface SuggestRequest {
    /** An OData expression that filters the documents considered for suggestions. */
    filter?: string;
    /** A value indicating whether to use fuzzy matching for the suggestion query. Default is false. When set to true, the query will find suggestions even if there's a substituted or missing character in the search text. While this provides a better experience in some scenarios, it comes at a performance cost as fuzzy suggestion searches are slower and consume more resources. */
    useFuzzyMatching?: boolean;
    /** A string tag that is appended to hit highlights. Must be set with highlightPreTag. If omitted, hit highlighting of suggestions is disabled. */
    highlightPostTag?: string;
    /** A string tag that is prepended to hit highlights. Must be set with highlightPostTag. If omitted, hit highlighting of suggestions is disabled. */
    highlightPreTag?: string;
    /** A number between 0 and 100 indicating the percentage of the index that must be covered by a suggestion query in order for the query to be reported as a success. This parameter can be useful for ensuring search availability even for services with only one replica. The default is 80. */
    minimumCoverage?: number;
    /** The comma-separated list of OData $orderby expressions by which to sort the results. Each expression can be either a field name or a call to either the geo.distance() or the search.score() functions. Each expression can be followed by asc to indicate ascending, or desc to indicate descending. The default is ascending order. Ties will be broken by the match scores of documents. If no $orderby is specified, the default sort order is descending by document match score. There can be at most 32 $orderby clauses. */
    orderBy?: string;
    /** The search text to use to suggest documents. Must be at least 1 character, and no more than 100 characters. */
    searchText: string;
    /** The comma-separated list of field names to search for the specified search text. Target fields must be included in the specified suggester. */
    searchFields?: string;
    /** The comma-separated list of fields to retrieve. If unspecified, only the key field will be included in the results. */
    select?: string;
    /** The name of the suggester as specified in the suggesters collection that's part of the index definition. */
    suggesterName: string;
    /** The number of suggestions to retrieve. This must be a value between 1 and 100. The default is 5. */
    top?: number;
}
/** Contains a batch of document write actions to send to the index. */
export interface IndexBatch {
    /** The actions in the batch. */
    actions: IndexAction[];
}
/** Represents an index action that operates on a document. */
export interface IndexAction {
    /** Describes unknown properties. The value of an unknown property can be of "any" type. */
    [property: string]: any;
    /** The operation to perform on a document in an indexing batch. */
    __actionType: IndexActionType;
}
/** Response containing the status of operations for all documents in the indexing request. */
export interface IndexDocumentsResult {
    /**
     * The list of status information for each document in the indexing request.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly results: IndexingResult[];
}
/** Status of an indexing operation for a single document. */
export interface IndexingResult {
    /**
     * The key of a document that was in the indexing request.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly key: string;
    /**
     * The error message explaining why the indexing operation failed for the document identified by the key; null if indexing succeeded.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly errorMessage?: string;
    /**
     * A value indicating whether the indexing operation succeeded for the document identified by the key.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly succeeded: boolean;
    /**
     * The status code of the indexing operation. Possible values include: 200 for a successful update or delete, 201 for successful document creation, 400 for a malformed input document, 404 for document not found, 409 for a version conflict, 422 when the index is temporarily unavailable, or 503 for when the service is too busy.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly statusCode: number;
}
/** The result of Autocomplete query. */
export interface AutocompleteResult {
    /**
     * A value indicating the percentage of the index that was considered by the autocomplete request, or null if minimumCoverage was not specified in the request.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly coverage?: number;
    /**
     * The list of returned Autocompleted items.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly results: AutocompleteItem[];
}
/** The result of Autocomplete requests. */
export interface AutocompleteItem {
    /**
     * The completed term.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly text: string;
    /**
     * The query along with the completed term.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly queryPlusText: string;
}
/** Parameters for fuzzy matching, and other autocomplete query behaviors. */
export interface AutocompleteRequest {
    /** The search text on which to base autocomplete results. */
    searchText: string;
    /** Specifies the mode for Autocomplete. The default is 'oneTerm'. Use 'twoTerms' to get shingles and 'oneTermWithContext' to use the current context while producing auto-completed terms. */
    autocompleteMode?: AutocompleteMode;
    /** An OData expression that filters the documents used to produce completed terms for the Autocomplete result. */
    filter?: string;
    /** A value indicating whether to use fuzzy matching for the autocomplete query. Default is false. When set to true, the query will autocomplete terms even if there's a substituted or missing character in the search text. While this provides a better experience in some scenarios, it comes at a performance cost as fuzzy autocomplete queries are slower and consume more resources. */
    useFuzzyMatching?: boolean;
    /** A string tag that is appended to hit highlights. Must be set with highlightPreTag. If omitted, hit highlighting is disabled. */
    highlightPostTag?: string;
    /** A string tag that is prepended to hit highlights. Must be set with highlightPostTag. If omitted, hit highlighting is disabled. */
    highlightPreTag?: string;
    /** A number between 0 and 100 indicating the percentage of the index that must be covered by an autocomplete query in order for the query to be reported as a success. This parameter can be useful for ensuring search availability even for services with only one replica. The default is 80. */
    minimumCoverage?: number;
    /** The comma-separated list of field names to consider when querying for auto-completed terms. Target fields must be included in the specified suggester. */
    searchFields?: string;
    /** The name of the suggester as specified in the suggesters collection that's part of the index definition. */
    suggesterName: string;
    /** The number of auto-completed terms to retrieve. This must be a value between 1 and 100. The default is 5. */
    top?: number;
}
/** The query parameters to use for vector search when a raw vector value is provided. */
export interface VectorizedQuery extends VectorQuery {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    kind: "vector";
    /** The vector representation of a search query. */
    vector: number[];
}
/** The query parameters to use for vector search when a text value that needs to be vectorized is provided. */
export interface VectorizableTextQuery extends VectorQuery {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    kind: "text";
    /** The text to be vectorized to perform a vector search query. */
    text: string;
}
/** Parameter group */
export interface SearchOptions {
    /** A value that specifies whether to fetch the total count of results. Default is false. Setting this value to true may have a performance impact. Note that the count returned is an approximation. */
    includeTotalResultCount?: boolean;
    /** The list of facet expressions to apply to the search query. Each facet expression contains a field name, optionally followed by a comma-separated list of name:value pairs. */
    facets?: string[];
    /** The OData $filter expression to apply to the search query. */
    filter?: string;
    /** The list of field names to use for hit highlights. Only searchable fields can be used for hit highlighting. */
    highlightFields?: string[];
    /** A string tag that is appended to hit highlights. Must be set with highlightPreTag. Default is &lt;/em&gt;. */
    highlightPostTag?: string;
    /** A string tag that is prepended to hit highlights. Must be set with highlightPostTag. Default is &lt;em&gt;. */
    highlightPreTag?: string;
    /** A number between 0 and 100 indicating the percentage of the index that must be covered by a search query in order for the query to be reported as a success. This parameter can be useful for ensuring search availability even for services with only one replica. The default is 100. */
    minimumCoverage?: number;
    /** The list of OData $orderby expressions by which to sort the results. Each expression can be either a field name or a call to either the geo.distance() or the search.score() functions. Each expression can be followed by asc to indicate ascending, and desc to indicate descending. The default is ascending order. Ties will be broken by the match scores of documents. If no OrderBy is specified, the default sort order is descending by document match score. There can be at most 32 $orderby clauses. */
    orderBy?: string[];
    /** A value that specifies the syntax of the search query. The default is 'simple'. Use 'full' if your query uses the Lucene query syntax. */
    queryType?: QueryType;
    /** The list of parameter values to be used in scoring functions (for example, referencePointParameter) using the format name-values. For example, if the scoring profile defines a function with a parameter called 'mylocation' the parameter string would be "mylocation--122.2,44.8" (without the quotes). */
    scoringParameters?: string[];
    /** The name of a scoring profile to evaluate match scores for matching documents in order to sort the results. */
    scoringProfile?: string;
    /** The list of field names to which to scope the full-text search. When using fielded search (fieldName:searchExpression) in a full Lucene query, the field names of each fielded search expression take precedence over any field names listed in this parameter. */
    searchFields?: string[];
    /** A value that specifies whether any or all of the search terms must be matched in order to count the document as a match. */
    searchMode?: SearchMode;
    /** A value that specifies whether we want to calculate scoring statistics (such as document frequency) globally for more consistent scoring, or locally, for lower latency. */
    scoringStatistics?: ScoringStatistics;
    /** A value to be used to create a sticky session, which can help to get more consistent results. As long as the same sessionId is used, a best-effort attempt will be made to target the same replica set. Be wary that reusing the same sessionID values repeatedly can interfere with the load balancing of the requests across replicas and adversely affect the performance of the search service. The value used as sessionId cannot start with a '_' character. */
    sessionId?: string;
    /** The list of fields to retrieve. If unspecified, all fields marked as retrievable in the schema are included. */
    select?: string[];
    /** The number of search results to skip. This value cannot be greater than 100,000. If you need to scan documents in sequence, but cannot use $skip due to this limitation, consider using $orderby on a totally-ordered key and $filter with a range query instead. */
    skip?: number;
    /** The number of search results to retrieve. This can be used in conjunction with $skip to implement client-side paging of search results. If results are truncated due to server-side paging, the response will include a continuation token that can be used to issue another Search request for the next page of results. */
    top?: number;
    /** The name of the semantic configuration that lists which fields should be used for semantic ranking, captions, highlights, and answers */
    semanticConfiguration?: string;
    /** Allows the user to choose whether a semantic call should fail completely, or to return partial results (default). */
    semanticErrorHandling?: SemanticErrorMode;
    /** Allows the user to set an upper bound on the amount of time it takes for semantic enrichment to finish processing before the request fails. */
    semanticMaxWaitInMilliseconds?: number;
    /** This parameter is only valid if the query type is `semantic`. If set, the query returns answers extracted from key passages in the highest ranked documents. The number of answers returned can be configured by appending the pipe character `|` followed by the `count-<number of answers>` option after the answers parameter value, such as `extractive|count-3`. Default count is 1. The confidence threshold can be configured by appending the pipe character `|` followed by the `threshold-<confidence threshold>` option after the answers parameter value, such as `extractive|threshold-0.9`. Default threshold is 0.7. */
    answers?: QueryAnswerType;
    /** This parameter is only valid if the query type is `semantic`. If set, the query returns captions extracted from key passages in the highest ranked documents. When Captions is set to `extractive`, highlighting is enabled by default, and can be configured by appending the pipe character `|` followed by the `highlight-<true/false>` option, such as `extractive|highlight-true`. Defaults to `None`. */
    captions?: QueryCaptionType;
    /** Allows setting a separate search query that will be solely used for semantic reranking, semantic captions and semantic answers. Is useful for scenarios where there is a need to use different queries between the base retrieval and ranking phase, and the L2 semantic phase. */
    semanticQuery?: string;
    /** Enables a debugging tool that can be used to further explore your search results. */
    debug?: QueryDebugMode;
}
/** Parameter group */
export interface SuggestOptions {
    /** An OData expression that filters the documents considered for suggestions. */
    filter?: string;
    /** A value indicating whether to use fuzzy matching for the suggestions query. Default is false. When set to true, the query will find terms even if there's a substituted or missing character in the search text. While this provides a better experience in some scenarios, it comes at a performance cost as fuzzy suggestions queries are slower and consume more resources. */
    useFuzzyMatching?: boolean;
    /** A string tag that is appended to hit highlights. Must be set with highlightPreTag. If omitted, hit highlighting of suggestions is disabled. */
    highlightPostTag?: string;
    /** A string tag that is prepended to hit highlights. Must be set with highlightPostTag. If omitted, hit highlighting of suggestions is disabled. */
    highlightPreTag?: string;
    /** A number between 0 and 100 indicating the percentage of the index that must be covered by a suggestions query in order for the query to be reported as a success. This parameter can be useful for ensuring search availability even for services with only one replica. The default is 80. */
    minimumCoverage?: number;
    /** The list of OData $orderby expressions by which to sort the results. Each expression can be either a field name or a call to either the geo.distance() or the search.score() functions. Each expression can be followed by asc to indicate ascending, or desc to indicate descending. The default is ascending order. Ties will be broken by the match scores of documents. If no $orderby is specified, the default sort order is descending by document match score. There can be at most 32 $orderby clauses. */
    orderBy?: string[];
    /** The list of field names to search for the specified search text. Target fields must be included in the specified suggester. */
    searchFields?: string[];
    /** The list of fields to retrieve. If unspecified, only the key field will be included in the results. */
    select?: string[];
    /** The number of suggestions to retrieve. The value must be a number between 1 and 100. The default is 5. */
    top?: number;
}
/** Parameter group */
export interface AutocompleteOptions {
    /** Specifies the mode for Autocomplete. The default is 'oneTerm'. Use 'twoTerms' to get shingles and 'oneTermWithContext' to use the current context while producing auto-completed terms. */
    autocompleteMode?: AutocompleteMode;
    /** An OData expression that filters the documents used to produce completed terms for the Autocomplete result. */
    filter?: string;
    /** A value indicating whether to use fuzzy matching for the autocomplete query. Default is false. When set to true, the query will find terms even if there's a substituted or missing character in the search text. While this provides a better experience in some scenarios, it comes at a performance cost as fuzzy autocomplete queries are slower and consume more resources. */
    useFuzzyMatching?: boolean;
    /** A string tag that is appended to hit highlights. Must be set with highlightPreTag. If omitted, hit highlighting is disabled. */
    highlightPostTag?: string;
    /** A string tag that is prepended to hit highlights. Must be set with highlightPostTag. If omitted, hit highlighting is disabled. */
    highlightPreTag?: string;
    /** A number between 0 and 100 indicating the percentage of the index that must be covered by an autocomplete query in order for the query to be reported as a success. This parameter can be useful for ensuring search availability even for services with only one replica. The default is 80. */
    minimumCoverage?: number;
    /** The list of field names to consider when querying for auto-completed terms. Target fields must be included in the specified suggester. */
    searchFields?: string[];
    /** The number of auto-completed terms to retrieve. This must be a value between 1 and 100. The default is 5. */
    top?: number;
}
/** Known values of {@link ApiVersion20250901} that the service accepts. */
export declare enum KnownApiVersion20250901 {
    /** Api Version '2025-09-01' */
    TwoThousandTwentyFive0901 = "2025-09-01"
}
/**
 * Defines values for ApiVersion20250901. \
 * {@link KnownApiVersion20250901} can be used interchangeably with ApiVersion20250901,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **2025-09-01**: Api Version '2025-09-01'
 */
export type ApiVersion20250901 = string;
/** Known values of {@link SemanticErrorMode} that the service accepts. */
export declare enum KnownSemanticErrorMode {
    /** If the semantic processing fails, partial results still return. The definition of partial results depends on what semantic step failed and what was the reason for failure. */
    Partial = "partial",
    /** If there is an exception during the semantic processing step, the query will fail and return the appropriate HTTP code depending on the error. */
    Fail = "fail"
}
/**
 * Defines values for SemanticErrorMode. \
 * {@link KnownSemanticErrorMode} can be used interchangeably with SemanticErrorMode,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **partial**: If the semantic processing fails, partial results still return. The definition of partial results depends on what semantic step failed and what was the reason for failure. \
 * **fail**: If there is an exception during the semantic processing step, the query will fail and return the appropriate HTTP code depending on the error.
 */
export type SemanticErrorMode = string;
/** Known values of {@link QueryAnswerType} that the service accepts. */
export declare enum KnownQueryAnswerType {
    /** Do not return answers for the query. */
    None = "none",
    /** Extracts answer candidates from the contents of the documents returned in response to a query expressed as a question in natural language. */
    Extractive = "extractive"
}
/**
 * Defines values for QueryAnswerType. \
 * {@link KnownQueryAnswerType} can be used interchangeably with QueryAnswerType,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **none**: Do not return answers for the query. \
 * **extractive**: Extracts answer candidates from the contents of the documents returned in response to a query expressed as a question in natural language.
 */
export type QueryAnswerType = string;
/** Known values of {@link QueryCaptionType} that the service accepts. */
export declare enum KnownQueryCaptionType {
    /** Do not return captions for the query. */
    None = "none",
    /** Extracts captions from the matching documents that contain passages relevant to the search query. */
    Extractive = "extractive"
}
/**
 * Defines values for QueryCaptionType. \
 * {@link KnownQueryCaptionType} can be used interchangeably with QueryCaptionType,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **none**: Do not return captions for the query. \
 * **extractive**: Extracts captions from the matching documents that contain passages relevant to the search query.
 */
export type QueryCaptionType = string;
/** Known values of {@link QueryDebugMode} that the service accepts. */
export declare enum KnownQueryDebugMode {
    /** No query debugging information will be returned. */
    Disabled = "disabled",
    /** Allows the user to further explore their hybrid and vector query results. */
    Vector = "vector"
}
/**
 * Defines values for QueryDebugMode. \
 * {@link KnownQueryDebugMode} can be used interchangeably with QueryDebugMode,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **disabled**: No query debugging information will be returned. \
 * **vector**: Allows the user to further explore their hybrid and vector query results.
 */
export type QueryDebugMode = string;
/** Known values of {@link VectorQueryKind} that the service accepts. */
export declare enum KnownVectorQueryKind {
    /** Vector query where a raw vector value is provided. */
    Vector = "vector",
    /** Vector query where a text value that needs to be vectorized is provided. */
    Text = "text"
}
/**
 * Defines values for VectorQueryKind. \
 * {@link KnownVectorQueryKind} can be used interchangeably with VectorQueryKind,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **vector**: Vector query where a raw vector value is provided. \
 * **text**: Vector query where a text value that needs to be vectorized is provided.
 */
export type VectorQueryKind = string;
/** Known values of {@link VectorFilterMode} that the service accepts. */
export declare enum KnownVectorFilterMode {
    /** The filter will be applied after the candidate set of vector results is returned. Depending on the filter selectivity, this can result in fewer results than requested by the parameter 'k'. */
    PostFilter = "postFilter",
    /** The filter will be applied before the search query. */
    PreFilter = "preFilter"
}
/**
 * Defines values for VectorFilterMode. \
 * {@link KnownVectorFilterMode} can be used interchangeably with VectorFilterMode,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **postFilter**: The filter will be applied after the candidate set of vector results is returned. Depending on the filter selectivity, this can result in fewer results than requested by the parameter 'k'. \
 * **preFilter**: The filter will be applied before the search query.
 */
export type VectorFilterMode = string;
/** Known values of {@link SemanticErrorReason} that the service accepts. */
export declare enum KnownSemanticErrorReason {
    /** If `semanticMaxWaitInMilliseconds` was set and the semantic processing duration exceeded that value. Only the base results were returned. */
    MaxWaitExceeded = "maxWaitExceeded",
    /** The request was throttled. Only the base results were returned. */
    CapacityOverloaded = "capacityOverloaded",
    /** At least one step of the semantic process failed. */
    Transient = "transient"
}
/**
 * Defines values for SemanticErrorReason. \
 * {@link KnownSemanticErrorReason} can be used interchangeably with SemanticErrorReason,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **maxWaitExceeded**: If `semanticMaxWaitInMilliseconds` was set and the semantic processing duration exceeded that value. Only the base results were returned. \
 * **capacityOverloaded**: The request was throttled. Only the base results were returned. \
 * **transient**: At least one step of the semantic process failed.
 */
export type SemanticErrorReason = string;
/** Known values of {@link SemanticSearchResultsType} that the service accepts. */
export declare enum KnownSemanticSearchResultsType {
    /** Results without any semantic enrichment or reranking. */
    BaseResults = "baseResults",
    /** Results have been reranked with the reranker model and will include semantic captions. They will not include any answers, answers highlights or caption highlights. */
    RerankedResults = "rerankedResults"
}
/**
 * Defines values for SemanticSearchResultsType. \
 * {@link KnownSemanticSearchResultsType} can be used interchangeably with SemanticSearchResultsType,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **baseResults**: Results without any semantic enrichment or reranking. \
 * **rerankedResults**: Results have been reranked with the reranker model and will include semantic captions. They will not include any answers, answers highlights or caption highlights.
 */
export type SemanticSearchResultsType = string;
/** Defines values for QueryType. */
export type QueryType = "simple" | "full" | "semantic";
/** Defines values for SearchMode. */
export type SearchMode = "any" | "all";
/** Defines values for ScoringStatistics. */
export type ScoringStatistics = "local" | "global";
/** Defines values for IndexActionType. */
export type IndexActionType = "upload" | "merge" | "mergeOrUpload" | "delete";
/** Defines values for AutocompleteMode. */
export type AutocompleteMode = "oneTerm" | "twoTerms" | "oneTermWithContext";
/** Optional parameters. */
export interface DocumentsCountOptionalParams extends coreClient.OperationOptions {
}
/** Contains response data for the count operation. */
export type DocumentsCountResponse = {
    /** The parsed response body. */
    body: number;
};
/** Optional parameters. */
export interface DocumentsSearchGetOptionalParams extends coreClient.OperationOptions {
    /** Parameter group */
    searchOptions?: SearchOptions;
    /** A full-text search query expression; Use "*" or omit this parameter to match all documents. */
    searchText?: string;
}
/** Contains response data for the searchGet operation. */
export type DocumentsSearchGetResponse = SearchDocumentsResult;
/** Optional parameters. */
export interface DocumentsSearchPostOptionalParams extends coreClient.OperationOptions {
}
/** Contains response data for the searchPost operation. */
export type DocumentsSearchPostResponse = SearchDocumentsResult;
/** Optional parameters. */
export interface DocumentsGetOptionalParams extends coreClient.OperationOptions {
    /** List of field names to retrieve for the document; Any field not retrieved will be missing from the returned document. */
    selectedFields?: string[];
}
/** Contains response data for the get operation. */
export type DocumentsGetResponse = {
    [propertyName: string]: any;
};
/** Optional parameters. */
export interface DocumentsSuggestGetOptionalParams extends coreClient.OperationOptions {
    /** Parameter group */
    suggestOptions?: SuggestOptions;
}
/** Contains response data for the suggestGet operation. */
export type DocumentsSuggestGetResponse = SuggestDocumentsResult;
/** Optional parameters. */
export interface DocumentsSuggestPostOptionalParams extends coreClient.OperationOptions {
}
/** Contains response data for the suggestPost operation. */
export type DocumentsSuggestPostResponse = SuggestDocumentsResult;
/** Optional parameters. */
export interface DocumentsIndexOptionalParams extends coreClient.OperationOptions {
}
/** Contains response data for the index operation. */
export type DocumentsIndexResponse = IndexDocumentsResult;
/** Optional parameters. */
export interface DocumentsAutocompleteGetOptionalParams extends coreClient.OperationOptions {
    /** Parameter group */
    autocompleteOptions?: AutocompleteOptions;
}
/** Contains response data for the autocompleteGet operation. */
export type DocumentsAutocompleteGetResponse = AutocompleteResult;
/** Optional parameters. */
export interface DocumentsAutocompletePostOptionalParams extends coreClient.OperationOptions {
}
/** Contains response data for the autocompletePost operation. */
export type DocumentsAutocompletePostResponse = AutocompleteResult;
/** Optional parameters. */
export interface SearchClientOptionalParams extends coreHttpCompat.ExtendedServiceClientOptions {
    /** Overrides client endpoint. */
    endpoint?: string;
}
//# sourceMappingURL=index.d.ts.map