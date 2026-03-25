/// <reference lib="esnext.asynciterable" />

import { AzureKeyCredential } from '@azure/core-auth';
import { ExtendedCommonClientOptions } from '@azure/core-http-compat';
import { KeyCredential } from '@azure/core-auth';
import { OperationOptions } from '@azure/core-client';
import { PagedAsyncIterableIterator } from '@azure/core-paging';
import { RestError } from '@azure/core-rest-pipeline';
import { TokenCredential } from '@azure/core-auth';

/** Information about a token returned by an analyzer. */
export declare interface AnalyzedTokenInfo {
    /**
     * The token returned by the analyzer.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly token: string;
    /**
     * The index of the first character of the token in the input text.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly startOffset: number;
    /**
     * The index of the last character of the token in the input text.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly endOffset: number;
    /**
     * The position of the token in the input text relative to other tokens. The first token in the input text has position 0, the next has position 1, and so on. Depending on the analyzer used, some tokens might have the same position, for example if they are synonyms of each other.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly position: number;
}

/**
 * Specifies some text and analysis components used to break that text into tokens.
 */
export declare interface AnalyzeRequest {
    /**
     * The text to break into tokens.
     */
    text: string;
    /**
     * The name of the analyzer to use to break the given text. If this parameter is not specified,
     * you must specify a tokenizer instead. The tokenizer and analyzer parameters are mutually
     * exclusive. {@link KnownAnalyzerNames} is an enum containing built-in analyzer names.
     * NOTE: Either analyzerName or tokenizerName is required in an AnalyzeRequest.
     */
    analyzerName?: LexicalAnalyzerName;
    /**
     * The name of the tokenizer to use to break the given text. If this parameter is not specified,
     * you must specify an analyzer instead. The tokenizer and analyzer parameters are mutually
     * exclusive. {@link KnownTokenizerNames} is an enum containing built-in tokenizer names.
     * NOTE: Either analyzerName or tokenizerName is required in an AnalyzeRequest.
     */
    tokenizerName?: LexicalTokenizerName;
    /**
     * An optional list of token filters to use when breaking the given text. This parameter can only
     * be set when using the tokenizer parameter.
     */
    tokenFilters?: TokenFilterName[];
    /**
     * An optional list of character filters to use when breaking the given text. This parameter can
     * only be set when using the tokenizer parameter.
     */
    charFilters?: CharFilterName[];
}

/** The result of testing an analyzer on text. */
export declare interface AnalyzeResult {
    /** The list of tokens returned by the analyzer specified in the request. */
    tokens: AnalyzedTokenInfo[];
}

/**
 * Options for analyze text operation.
 */
export declare type AnalyzeTextOptions = OperationOptions & AnalyzeRequest;

/** Converts alphabetic, numeric, and symbolic Unicode characters which are not in the first 127 ASCII characters (the "Basic Latin" Unicode block) into their ASCII equivalents, if such equivalents exist. This token filter is implemented using Apache Lucene. */
export declare interface AsciiFoldingTokenFilter extends BaseTokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.AsciiFoldingTokenFilter";
    /** A value indicating whether the original token will be kept. Default is false. */
    preserveOriginal?: boolean;
}

/** The result of Autocomplete requests. */
export declare interface AutocompleteItem {
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

/** Defines values for AutocompleteMode. */
export declare type AutocompleteMode = "oneTerm" | "twoTerms" | "oneTermWithContext";

/**
 * Options for retrieving completion text for a partial searchText.
 */
export declare type AutocompleteOptions<TModel extends object> = OperationOptions & AutocompleteRequest<TModel>;

/**
 * Parameters for fuzzy matching, and other autocomplete query behaviors.
 */
export declare interface AutocompleteRequest<TModel extends object> {
    /**
     * Specifies the mode for Autocomplete. The default is 'oneTerm'. Use 'twoTerms' to get shingles
     * and 'oneTermWithContext' to use the current context while producing auto-completed terms.
     * Possible values include: 'oneTerm', 'twoTerms', 'oneTermWithContext'
     */
    autocompleteMode?: AutocompleteMode;
    /**
     * An OData expression that filters the documents used to produce completed terms for the
     * Autocomplete result.
     */
    filter?: string;
    /**
     * A value indicating whether to use fuzzy matching for the autocomplete query. Default is false.
     * When set to true, the query will autocomplete terms even if there's a substituted or missing
     * character in the search text. While this provides a better experience in some scenarios, it
     * comes at a performance cost as fuzzy autocomplete queries are slower and consume more
     * resources.
     */
    useFuzzyMatching?: boolean;
    /**
     * A string tag that is appended to hit highlights. Must be set with highlightPreTag. If omitted,
     * hit highlighting is disabled.
     */
    highlightPostTag?: string;
    /**
     * A string tag that is prepended to hit highlights. Must be set with highlightPostTag. If
     * omitted, hit highlighting is disabled.
     */
    highlightPreTag?: string;
    /**
     * A number between 0 and 100 indicating the percentage of the index that must be covered by an
     * autocomplete query in order for the query to be reported as a success. This parameter can be
     * useful for ensuring search availability even for services with only one replica. The default
     * is 80.
     */
    minimumCoverage?: number;
    /**
     * The comma-separated list of field names to consider when querying for auto-completed terms.
     * Target fields must be included in the specified suggester.
     */
    searchFields?: SearchFieldArray<TModel>;
    /**
     * The number of auto-completed terms to retrieve. This must be a value between 1 and 100. The
     * default is 5.
     */
    top?: number;
}

/** The result of Autocomplete query. */
export declare interface AutocompleteResult {
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

/** Credentials of a registered application created for your search service, used for authenticated access to the encryption keys stored in Azure Key Vault. */
export declare interface AzureActiveDirectoryApplicationCredentials {
    /** An AAD Application ID that was granted the required access permissions to the Azure Key Vault that is to be used when encrypting your data at rest. The Application ID should not be confused with the Object ID for your AAD Application. */
    applicationId: string;
    /** The authentication key of the specified AAD application. */
    applicationSecret?: string;
}

export { AzureKeyCredential }

/** Allows you to generate a vector embedding for a given text input using the Azure OpenAI resource. */
export declare interface AzureOpenAIEmbeddingSkill extends BaseSearchIndexerSkill, AzureOpenAIParameters {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Text.AzureOpenAIEmbeddingSkill";
    /** The number of dimensions the resulting output embeddings should have. Only supported in text-embedding-3 and later models. */
    dimensions?: number;
}

/**
 * Defines values for AzureOpenAIModelName. \
 * {@link KnownAzureOpenAIModelName} can be used interchangeably with AzureOpenAIModelName,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **text-embedding-ada-002** \
 * **text-embedding-3-large** \
 * **text-embedding-3-small**
 */
export declare type AzureOpenAIModelName = string;

/** Contains the parameters specific to using an Azure Open AI service for vectorization at query time. */
export declare interface AzureOpenAIParameters {
    /** The resource uri for your Azure Open AI resource. */
    resourceUrl?: string;
    /** ID of your Azure Open AI model deployment on the designated resource. */
    deploymentId?: string;
    /** API key for the designated Azure Open AI resource. */
    apiKey?: string;
    /** The user-assigned managed identity used for outbound connections. */
    authIdentity?: SearchIndexerDataIdentity;
    /** The name of the embedding model that is deployed at the provided deploymentId path. */
    modelName?: AzureOpenAIModelName;
}

/** Contains the parameters specific to using an Azure Open AI service for vectorization at query time. */
export declare interface AzureOpenAIVectorizer extends BaseVectorSearchVectorizer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    kind: "azureOpenAI";
    /** Contains the parameters specific to Azure Open AI embedding vectorization. */
    parameters?: AzureOpenAIParameters;
}

/** Base type for character filters. */
export declare interface BaseCharFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.MappingCharFilter" | "#Microsoft.Azure.Search.PatternReplaceCharFilter";
    /** The name of the char filter. It must only contain letters, digits, spaces, dashes or underscores, can only start and end with alphanumeric characters, and is limited to 128 characters. */
    name: string;
}

/** Base type for describing any Azure AI service resource attached to a skillset. */
export declare interface BaseCognitiveServicesAccount {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.DefaultCognitiveServices" | "#Microsoft.Azure.Search.CognitiveServicesByKey";
    /** Description of the Azure AI service resource attached to a skillset. */
    description?: string;
}

/** Base type for data change detection policies. */
export declare interface BaseDataChangeDetectionPolicy {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.HighWaterMarkChangeDetectionPolicy" | "#Microsoft.Azure.Search.SqlIntegratedChangeTrackingPolicy";
}

/** Base type for data deletion detection policies. */
export declare interface BaseDataDeletionDetectionPolicy {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.SoftDeleteColumnDeletionDetectionPolicy";
}

/** Base type for analyzers. */
export declare interface BaseLexicalAnalyzer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.CustomAnalyzer" | "#Microsoft.Azure.Search.PatternAnalyzer" | "#Microsoft.Azure.Search.StandardAnalyzer" | "#Microsoft.Azure.Search.StopAnalyzer";
    /** The name of the analyzer. It must only contain letters, digits, spaces, dashes or underscores, can only start and end with alphanumeric characters, and is limited to 128 characters. */
    name: string;
}

/** Base type for tokenizers. */
export declare interface BaseLexicalTokenizer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.ClassicTokenizer" | "#Microsoft.Azure.Search.EdgeNGramTokenizer" | "#Microsoft.Azure.Search.KeywordTokenizer" | "#Microsoft.Azure.Search.KeywordTokenizerV2" | "#Microsoft.Azure.Search.MicrosoftLanguageTokenizer" | "#Microsoft.Azure.Search.MicrosoftLanguageStemmingTokenizer" | "#Microsoft.Azure.Search.NGramTokenizer" | "#Microsoft.Azure.Search.PathHierarchyTokenizerV2" | "#Microsoft.Azure.Search.PatternTokenizer" | "#Microsoft.Azure.Search.StandardTokenizer" | "#Microsoft.Azure.Search.StandardTokenizerV2" | "#Microsoft.Azure.Search.UaxUrlEmailTokenizer";
    /** The name of the tokenizer. It must only contain letters, digits, spaces, dashes or underscores, can only start and end with alphanumeric characters, and is limited to 128 characters. */
    name: string;
}

/** Base type for functions that can modify document scores during ranking. */
export declare interface BaseScoringFunction {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    type: "distance" | "freshness" | "magnitude" | "tag";
    /** The name of the field used as input to the scoring function. */
    fieldName: string;
    /** A multiplier for the raw score. Must be a positive number not equal to 1.0. */
    boost: number;
    /** A value indicating how boosting will be interpolated across document scores; defaults to "Linear". */
    interpolation?: ScoringFunctionInterpolation;
}

/** Abstract base type for data identities. */
export declare interface BaseSearchIndexerDataIdentity {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.DataNoneIdentity" | "#Microsoft.Azure.Search.DataUserAssignedIdentity";
}

/** Base type for skills. */
export declare interface BaseSearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Util.ConditionalSkill" | "#Microsoft.Skills.Text.KeyPhraseExtractionSkill" | "#Microsoft.Skills.Vision.OcrSkill" | "#Microsoft.Skills.Vision.ImageAnalysisSkill" | "#Microsoft.Skills.Text.LanguageDetectionSkill" | "#Microsoft.Skills.Util.ShaperSkill" | "#Microsoft.Skills.Text.MergeSkill" | "#Microsoft.Skills.Text.EntityRecognitionSkill" | "#Microsoft.Skills.Text.SentimentSkill" | "#Microsoft.Skills.Text.V3.SentimentSkill" | "#Microsoft.Skills.Text.V3.EntityLinkingSkill" | "#Microsoft.Skills.Text.V3.EntityRecognitionSkill" | "#Microsoft.Skills.Text.PIIDetectionSkill" | "#Microsoft.Skills.Text.SplitSkill" | "#Microsoft.Skills.Text.CustomEntityLookupSkill" | "#Microsoft.Skills.Text.TranslationSkill" | "#Microsoft.Skills.Util.DocumentExtractionSkill" | "#Microsoft.Skills.Custom.WebApiSkill" | "#Microsoft.Skills.Text.AzureOpenAIEmbeddingSkill";
    /** The name of the skill which uniquely identifies it within the skillset. A skill with no name defined will be given a default name of its 1-based index in the skills array, prefixed with the character '#'. */
    name?: string;
    /** The description of the skill which describes the inputs, outputs, and usage of the skill. */
    description?: string;
    /** Represents the level at which operations take place, such as the document root or document content (for example, /document or /document/content). The default is /document. */
    context?: string;
    /** Inputs of the skills could be a column in the source data set, or the output of an upstream skill. */
    inputs: InputFieldMappingEntry[];
    /** The output of a skill is either a field in a search index, or a value that can be consumed as an input by another skill. */
    outputs: OutputFieldMappingEntry[];
}

/**
 * Parameters for filtering, sorting, faceting, paging, and other search query behaviors.
 */
export declare interface BaseSearchRequestOptions<TModel extends object, TFields extends SelectFields<TModel> = SelectFields<TModel>> {
    /**
     * A value that specifies whether to fetch the total count of results. Default is false. Setting
     * this value to true may have a performance impact. Note that the count returned is an
     * approximation.
     */
    includeTotalCount?: boolean;
    /**
     * The list of facet expressions to apply to the search query. Each facet expression contains a
     * field name, optionally followed by a comma-separated list of name:value pairs.
     */
    facets?: string[];
    /**
     * The OData $filter expression to apply to the search query.
     */
    filter?: string;
    /**
     * The comma-separated list of field names to use for hit highlights. Only searchable fields can
     * be used for hit highlighting.
     */
    highlightFields?: string;
    /**
     * A string tag that is appended to hit highlights. Must be set with highlightPreTag. Default is
     * &lt;/em&gt;.
     */
    highlightPostTag?: string;
    /**
     * A string tag that is prepended to hit highlights. Must be set with highlightPostTag. Default
     * is &lt;em&gt;.
     */
    highlightPreTag?: string;
    /**
     * A number between 0 and 100 indicating the percentage of the index that must be covered by a
     * search query in order for the query to be reported as a success. This parameter can be useful
     * for ensuring search availability even for services with only one replica. The default is 100.
     */
    minimumCoverage?: number;
    /**
     * The list of OData $orderby expressions by which to sort the results. Each
     * expression can be either a field name or a call to either the geo.distance() or the
     * search.score() functions. Each expression can be followed by asc to indicate ascending, or
     * desc to indicate descending. The default is ascending order. Ties will be broken by the match
     * scores of documents. If no $orderby is specified, the default sort order is descending by
     * document match score. There can be at most 32 $orderby clauses.
     */
    orderBy?: string[];
    /**
     * A value that specifies the syntax of the search query. The default is 'simple'. Use 'full' if
     * your query uses the Lucene query syntax. Possible values include: 'simple', 'full', 'semantic'
     */
    queryType?: QueryType;
    /**
     * The list of parameter values to be used in scoring functions (for example,
     * referencePointParameter) using the format name-values. For example, if the scoring profile
     * defines a function with a parameter called 'mylocation' the parameter string would be
     * "mylocation--122.2,44.8" (without the quotes).
     */
    scoringParameters?: string[];
    /**
     * The name of a scoring profile to evaluate match scores for matching documents in order to sort
     * the results.
     */
    scoringProfile?: string;
    /**
     * The comma-separated list of field names to which to scope the full-text search. When using
     * fielded search (fieldName:searchExpression) in a full Lucene query, the field names of each
     * fielded search expression take precedence over any field names listed in this parameter.
     */
    searchFields?: SearchFieldArray<TModel>;
    /**
     * A value that specifies whether any or all of the search terms must be matched in order to
     * count the document as a match. Possible values include: 'any', 'all'
     */
    searchMode?: SearchMode;
    /**
     * A value that specifies whether we want to calculate scoring statistics (such as document
     * frequency) globally for more consistent scoring, or locally, for lower latency. Possible
     * values include: 'Local', 'Global'
     */
    scoringStatistics?: ScoringStatistics;
    /**
     * A value to be used to create a sticky session, which can help to get more consistent results.
     * As long as the same sessionId is used, a best-effort attempt will be made to target the same
     * replica set. Be wary that reusing the same sessionID values repeatedly can interfere with the
     * load balancing of the requests across replicas and adversely affect the performance of the
     * search service. The value used as sessionId cannot start with a '_' character.
     */
    sessionId?: string;
    /**
     * The list of fields to retrieve. If unspecified, all fields marked as
     * retrievable in the schema are included.
     */
    select?: SelectArray<TFields>;
    /**
     * The number of search results to skip. This value cannot be greater than 100,000. If you need
     * to scan documents in sequence, but cannot use skip due to this limitation, consider using
     * orderby on a totally-ordered key and filter with a range query instead.
     */
    skip?: number;
    /**
     * The number of search results to retrieve. This can be used in conjunction with $skip to
     * implement client-side paging of search results. If results are truncated due to server-side
     * paging, the response will include a continuation token that can be used to issue another
     * Search request for the next page of results.
     */
    top?: number;
    /**
     * Defines options for vector search queries
     */
    vectorSearchOptions?: VectorSearchOptions<TModel>;
}

/** Base type for token filters. */
export declare interface BaseTokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.AsciiFoldingTokenFilter" | "#Microsoft.Azure.Search.CjkBigramTokenFilter" | "#Microsoft.Azure.Search.CommonGramTokenFilter" | "#Microsoft.Azure.Search.DictionaryDecompounderTokenFilter" | "#Microsoft.Azure.Search.EdgeNGramTokenFilter" | "#Microsoft.Azure.Search.EdgeNGramTokenFilterV2" | "#Microsoft.Azure.Search.ElisionTokenFilter" | "#Microsoft.Azure.Search.KeepTokenFilter" | "#Microsoft.Azure.Search.KeywordMarkerTokenFilter" | "#Microsoft.Azure.Search.LengthTokenFilter" | "#Microsoft.Azure.Search.LimitTokenFilter" | "#Microsoft.Azure.Search.NGramTokenFilter" | "#Microsoft.Azure.Search.NGramTokenFilterV2" | "#Microsoft.Azure.Search.PatternCaptureTokenFilter" | "#Microsoft.Azure.Search.PatternReplaceTokenFilter" | "#Microsoft.Azure.Search.PhoneticTokenFilter" | "#Microsoft.Azure.Search.ShingleTokenFilter" | "#Microsoft.Azure.Search.SnowballTokenFilter" | "#Microsoft.Azure.Search.StemmerTokenFilter" | "#Microsoft.Azure.Search.StemmerOverrideTokenFilter" | "#Microsoft.Azure.Search.StopwordsTokenFilter" | "#Microsoft.Azure.Search.SynonymTokenFilter" | "#Microsoft.Azure.Search.TruncateTokenFilter" | "#Microsoft.Azure.Search.UniqueTokenFilter" | "#Microsoft.Azure.Search.WordDelimiterTokenFilter";
    /** The name of the token filter. It must only contain letters, digits, spaces, dashes or underscores, can only start and end with alphanumeric characters, and is limited to 128 characters. */
    name: string;
}

/** The query parameters for vector and hybrid search queries. */
export declare interface BaseVectorQuery<TModel extends object> {
    /**
     * ### Known values supported by the service
     * **vector**: Vector query where a raw vector value is provided.
     * **text**: Vector query where a text value that needs to be vectorized is provided.
     */
    kind: VectorQueryKind;
    /** Number of nearest neighbors to return as top hits. */
    kNearestNeighborsCount?: number;
    /** Vector Fields of type Collection(Edm.Single) to be included in the vector searched. */
    fields?: SearchFieldArray<TModel>;
    /**
     * When true, triggers an exhaustive k-nearest neighbor search across all vectors within the
     * vector index. Useful for scenarios where exact matches are critical, such as determining ground
     * truth values.
     */
    exhaustive?: boolean;
    /**
     * Oversampling factor. Minimum value is 1. It overrides the 'defaultOversampling' parameter
     * configured in the index definition. It can be set only when 'rerankWithOriginalVectors' is
     * true. This parameter is only permitted when a compression method is used on the underlying
     * vector field.
     */
    oversampling?: number;
    /** Relative weight of the vector query when compared to other vector query and/or the text query within the same search request. This value is used when combining the results of multiple ranking lists produced by the different vector queries and/or the results retrieved through the text query. The higher the weight, the higher the documents that matched that query will be in the final ranking. Default is 1.0 and the value needs to be a positive number larger than zero. */
    weight?: number;
}

/** Contains configuration options specific to the algorithm used during indexing and/or querying. */
export declare interface BaseVectorSearchAlgorithmConfiguration {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    kind: VectorSearchAlgorithmKind;
    /** The name to associate with this particular configuration. */
    name: string;
}

/** Contains configuration options specific to the compression method used during indexing or querying. */
export declare interface BaseVectorSearchCompression {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    kind: "scalarQuantization" | "binaryQuantization";
    /** The name to associate with this particular configuration. */
    compressionName: string;
    /** If set to true, once the ordered set of results calculated using compressed vectors are obtained, they will be reranked again by recalculating the full-precision similarity scores. This will improve recall at the expense of latency. */
    rerankWithOriginalVectors?: boolean;
    /** Default oversampling factor. Oversampling will internally request more documents (specified by this multiplier) in the initial search. This increases the set of results that will be reranked using recomputed similarity scores from full-precision vectors. Minimum value is 1, meaning no oversampling (1x). This parameter can only be set when rerankWithOriginalVectors is true. Higher values improve recall at the expense of latency. */
    defaultOversampling?: number;
}

/** Contains specific details for a vectorization method to be used during query time. */
export declare interface BaseVectorSearchVectorizer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    kind: VectorSearchVectorizerKind;
    /** The name to associate with this particular vectorization method. */
    vectorizerName: string;
}

/** Contains configuration options specific to the binary quantization compression method used during indexing and querying. */
export declare interface BinaryQuantizationCompression extends BaseVectorSearchCompression {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    kind: "binaryQuantization";
}

export declare type BlobIndexerDataToExtract = `${KnownBlobIndexerDataToExtract}`;

export declare type BlobIndexerImageAction = `${KnownBlobIndexerImageAction}`;

export declare type BlobIndexerParsingMode = `${KnownBlobIndexerParsingMode}`;

export declare type BlobIndexerPDFTextRotationAlgorithm = `${KnownBlobIndexerPDFTextRotationAlgorithm}`;

/** Ranking function based on the Okapi BM25 similarity algorithm. BM25 is a TF-IDF-like algorithm that includes length normalization (controlled by the 'b' parameter) as well as term frequency saturation (controlled by the 'k1' parameter). */
export declare interface BM25Similarity extends Similarity {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.BM25Similarity";
    /** This property controls the scaling function between the term frequency of each matching terms and the final relevance score of a document-query pair. By default, a value of 1.2 is used. A value of 0.0 means the score does not scale with an increase in term frequency. */
    k1?: number;
    /** This property controls how the length of a document affects the relevance score. By default, a value of 0.75 is used. A value of 0.0 means no length normalization is applied, while a value of 1.0 means the score is fully normalized by the length of the document. */
    b?: number;
}

/**
 * Contains the possible cases for CharFilter.
 */
export declare type CharFilter = MappingCharFilter | PatternReplaceCharFilter;

/**
 * Defines values for CharFilterName. \
 * {@link KnownCharFilterName} can be used interchangeably with CharFilterName,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **html_strip**: A character filter that attempts to strip out HTML constructs. See https:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/charfilter\/HTMLStripCharFilter.html
 */
export declare type CharFilterName = string;

/** Forms bigrams of CJK terms that are generated from the standard tokenizer. This token filter is implemented using Apache Lucene. */
export declare interface CjkBigramTokenFilter extends BaseTokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.CjkBigramTokenFilter";
    /** The scripts to ignore. */
    ignoreScripts?: CjkBigramTokenFilterScripts[];
    /** A value indicating whether to output both unigrams and bigrams (if true), or just bigrams (if false). Default is false. */
    outputUnigrams?: boolean;
}

/** Defines values for CjkBigramTokenFilterScripts. */
export declare type CjkBigramTokenFilterScripts = "han" | "hiragana" | "katakana" | "hangul";

/** Legacy similarity algorithm which uses the Lucene TFIDFSimilarity implementation of TF-IDF. This variation of TF-IDF introduces static document length normalization as well as coordinating factors that penalize documents that only partially match the searched queries. */
export declare interface ClassicSimilarity extends Similarity {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.ClassicSimilarity";
}

/** Grammar-based tokenizer that is suitable for processing most European-language documents. This tokenizer is implemented using Apache Lucene. */
export declare interface ClassicTokenizer extends BaseLexicalTokenizer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.ClassicTokenizer";
    /** The maximum token length. Default is 255. Tokens longer than the maximum length are split. The maximum token length that can be used is 300 characters. */
    maxTokenLength?: number;
}

/**
 * Contains the possible cases for CognitiveServicesAccount.
 */
export declare type CognitiveServicesAccount = DefaultCognitiveServicesAccount | CognitiveServicesAccountKey;

/** The multi-region account key of an Azure AI service resource that's attached to a skillset. */
export declare interface CognitiveServicesAccountKey extends BaseCognitiveServicesAccount {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.CognitiveServicesByKey";
    /** The key used to provision the Azure AI service resource attached to a skillset. */
    key: string;
}

/** Construct bigrams for frequently occurring terms while indexing. Single terms are still indexed too, with bigrams overlaid. This token filter is implemented using Apache Lucene. */
export declare interface CommonGramTokenFilter extends BaseTokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.CommonGramTokenFilter";
    /** The set of common words. */
    commonWords: string[];
    /** A value indicating whether common words matching will be case insensitive. Default is false. */
    ignoreCase?: boolean;
    /** A value that indicates whether the token filter is in query mode. When in query mode, the token filter generates bigrams and then removes common words and single terms followed by a common word. Default is false. */
    useQueryMode?: boolean;
}

/**
 * Defines values for ComplexDataType.
 * Possible values include: 'Edm.ComplexType', 'Collection(Edm.ComplexType)'
 * @readonly
 */
export declare type ComplexDataType = "Edm.ComplexType" | "Collection(Edm.ComplexType)";

/**
 * Represents a field in an index definition, which describes the name, data type, and search
 * behavior of a field.
 */
export declare interface ComplexField {
    /**
     * The name of the field, which must be unique within the fields collection of the index or
     * parent field.
     */
    name: string;
    /**
     * The data type of the field.
     * Possible values include: 'Edm.ComplexType','Collection(Edm.ComplexType)'
     */
    type: ComplexDataType;
    /**
     * A list of sub-fields.
     */
    fields?: SearchField[];
}

/** A skill that enables scenarios that require a Boolean operation to determine the data to assign to an output. */
export declare interface ConditionalSkill extends BaseSearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Util.ConditionalSkill";
}

/** Defines options to control Cross-Origin Resource Sharing (CORS) for an index. */
export declare interface CorsOptions {
    /** The list of origins from which JavaScript code will be granted access to your index. Can contain a list of hosts of the form {protocol}://{fully-qualified-domain-name}[:{port#}], or a single '*' to allow all origins (not recommended). */
    allowedOrigins: string[];
    /** The duration for which browsers should cache CORS preflight responses. Defaults to 5 minutes. */
    maxAgeInSeconds?: number;
}

/**
 * Options for performing the count operation on the index.
 */
export declare type CountDocumentsOptions = OperationOptions;

/**
 * Options for create datasource operation.
 */
export declare type CreateDataSourceConnectionOptions = OperationOptions;

/**
 * Options for create indexer operation.
 */
export declare type CreateIndexerOptions = OperationOptions;

/**
 * Options for create index operation.
 */
export declare type CreateIndexOptions = OperationOptions;

/**
 * Options for create/update datasource operation.
 */
export declare interface CreateorUpdateDataSourceConnectionOptions extends OperationOptions {
    /**
     * If set to true, Resource will be updated only if the etag matches.
     */
    onlyIfUnchanged?: boolean;
}

/**
 * Options for create/update indexer operation.
 */
export declare interface CreateorUpdateIndexerOptions extends OperationOptions {
    /**
     * If set to true, Resource will be updated only if the etag matches.
     */
    onlyIfUnchanged?: boolean;
}

/**
 * Options for create/update index operation.
 */
export declare interface CreateOrUpdateIndexOptions extends OperationOptions {
    /**
     * Allows new analyzers, tokenizers, token filters, or char filters to be added to an index by
     * taking the index offline for at least a few seconds. This temporarily causes indexing and
     * query requests to fail. Performance and write availability of the index can be impaired for
     * several minutes after the index is updated, or longer for very large indexes.
     */
    allowIndexDowntime?: boolean;
    /**
     * If set to true, Resource will be deleted only if the etag matches.
     */
    onlyIfUnchanged?: boolean;
}

/**
 * Options for create/update skillset operation.
 */
export declare interface CreateOrUpdateSkillsetOptions extends OperationOptions {
    /**
     * If set to true, Resource will be updated only if the etag matches.
     */
    onlyIfUnchanged?: boolean;
}

/**
 * Options for create/update synonymmap operation.
 */
export declare interface CreateOrUpdateSynonymMapOptions extends OperationOptions {
    /**
     * If set to true, Resource will be updated only if the etag matches.
     */
    onlyIfUnchanged?: boolean;
}

/**
 * Options for create skillset operation.
 */
export declare type CreateSkillsetOptions = OperationOptions;

/**
 * Helper method to create a SynonymMap object. This is a NodeJS only method.
 *
 * @param name - Name of the SynonymMap.
 * @param filePath - Path of the file that contains the Synonyms (seperated by new lines)
 * @returns SynonymMap object
 */
export declare function createSynonymMapFromFile(name: string, filePath: string): Promise<SynonymMap>;

/**
 * Options for create synonymmap operation.
 */
export declare type CreateSynonymMapOptions = OperationOptions;

/**
 * Allows you to take control over the process of converting text into indexable/searchable tokens.
 * It's a user-defined configuration consisting of a single predefined tokenizer and one or more
 * filters. The tokenizer is responsible for breaking text into tokens, and the filters for
 * modifying tokens emitted by the tokenizer.
 */
export declare interface CustomAnalyzer {
    /**
     * Polymorphic Discriminator
     */
    odatatype: "#Microsoft.Azure.Search.CustomAnalyzer";
    /**
     * The name of the analyzer. It must only contain letters, digits, spaces, dashes or underscores,
     * can only start and end with alphanumeric characters, and is limited to 128 characters.
     */
    name: string;
    /**
     * The name of the tokenizer to use to divide continuous text into a sequence of tokens, such as
     * breaking a sentence into words. {@link KnownTokenizerNames} is an enum containing built-in tokenizer names.
     */
    tokenizerName: LexicalTokenizerName;
    /**
     * A list of token filters used to filter out or modify the tokens generated by a tokenizer. For
     * example, you can specify a lowercase filter that converts all characters to lowercase. The
     * filters are run in the order in which they are listed.
     */
    tokenFilters?: TokenFilterName[];
    /**
     * A list of character filters used to prepare input text before it is processed by the
     * tokenizer. For instance, they can replace certain characters or symbols. The filters are run
     * in the order in which they are listed.
     */
    charFilters?: CharFilterName[];
}

/** An object that contains information about the matches that were found, and related metadata. */
export declare interface CustomEntity {
    /** The top-level entity descriptor. Matches in the skill output will be grouped by this name, and it should represent the "normalized" form of the text being found. */
    name: string;
    /** This field can be used as a passthrough for custom metadata about the matched text(s). The value of this field will appear with every match of its entity in the skill output. */
    description?: string;
    /** This field can be used as a passthrough for custom metadata about the matched text(s). The value of this field will appear with every match of its entity in the skill output. */
    type?: string;
    /** This field can be used as a passthrough for custom metadata about the matched text(s). The value of this field will appear with every match of its entity in the skill output. */
    subtype?: string;
    /** This field can be used as a passthrough for custom metadata about the matched text(s). The value of this field will appear with every match of its entity in the skill output. */
    id?: string;
    /** Defaults to false. Boolean value denoting whether comparisons with the entity name should be sensitive to character casing. Sample case insensitive matches of "Microsoft" could be: microsoft, microSoft, MICROSOFT. */
    caseSensitive?: boolean;
    /** Defaults to false. Boolean value denoting whether comparisons with the entity name should be sensitive to accent. */
    accentSensitive?: boolean;
    /** Defaults to 0. Maximum value of 5. Denotes the acceptable number of divergent characters that would still constitute a match with the entity name. The smallest possible fuzziness for any given match is returned. For instance, if the edit distance is set to 3, "Windows10" would still match "Windows", "Windows10" and "Windows 7". When case sensitivity is set to false, case differences do NOT count towards fuzziness tolerance, but otherwise do. */
    fuzzyEditDistance?: number;
    /** Changes the default case sensitivity value for this entity. It be used to change the default value of all aliases caseSensitive values. */
    defaultCaseSensitive?: boolean;
    /** Changes the default accent sensitivity value for this entity. It be used to change the default value of all aliases accentSensitive values. */
    defaultAccentSensitive?: boolean;
    /** Changes the default fuzzy edit distance value for this entity. It can be used to change the default value of all aliases fuzzyEditDistance values. */
    defaultFuzzyEditDistance?: number;
    /** An array of complex objects that can be used to specify alternative spellings or synonyms to the root entity name. */
    aliases?: CustomEntityAlias[];
}

/** A complex object that can be used to specify alternative spellings or synonyms to the root entity name. */
export declare interface CustomEntityAlias {
    /** The text of the alias. */
    text: string;
    /** Determine if the alias is case sensitive. */
    caseSensitive?: boolean;
    /** Determine if the alias is accent sensitive. */
    accentSensitive?: boolean;
    /** Determine the fuzzy edit distance of the alias. */
    fuzzyEditDistance?: number;
}

/** A skill looks for text from a custom, user-defined list of words and phrases. */
export declare interface CustomEntityLookupSkill extends BaseSearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Text.CustomEntityLookupSkill";
    /** A value indicating which language code to use. Default is en. */
    defaultLanguageCode?: CustomEntityLookupSkillLanguage;
    /** Path to a JSON or CSV file containing all the target text to match against. This entity definition is read at the beginning of an indexer run. Any updates to this file during an indexer run will not take effect until subsequent runs. This config must be accessible over HTTPS. */
    entitiesDefinitionUri?: string;
    /** The inline CustomEntity definition. */
    inlineEntitiesDefinition?: CustomEntity[];
    /** A global flag for CaseSensitive. If CaseSensitive is not set in CustomEntity, this value will be the default value. */
    globalDefaultCaseSensitive?: boolean;
    /** A global flag for AccentSensitive. If AccentSensitive is not set in CustomEntity, this value will be the default value. */
    globalDefaultAccentSensitive?: boolean;
    /** A global flag for FuzzyEditDistance. If FuzzyEditDistance is not set in CustomEntity, this value will be the default value. */
    globalDefaultFuzzyEditDistance?: number;
}

export declare type CustomEntityLookupSkillLanguage = `${KnownCustomEntityLookupSkillLanguage}`;

/**
 * Contains the possible cases for DataChangeDetectionPolicy.
 */
export declare type DataChangeDetectionPolicy = HighWaterMarkChangeDetectionPolicy | SqlIntegratedChangeTrackingPolicy;

/**
 * Contains the possible cases for DataDeletionDetectionPolicy.
 */
export declare type DataDeletionDetectionPolicy = SoftDeleteColumnDeletionDetectionPolicy;

/**
 * Default Batch Size
 */
export declare const DEFAULT_BATCH_SIZE: number;

/**
 * Default window flush interval
 */
export declare const DEFAULT_FLUSH_WINDOW: number;

/**
 * Default number of times to retry.
 */
export declare const DEFAULT_RETRY_COUNT: number;

/** An empty object that represents the default Azure AI service resource for a skillset. */
export declare interface DefaultCognitiveServicesAccount extends BaseCognitiveServicesAccount {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.DefaultCognitiveServices";
}

/**
 * Options for delete datasource operation.
 */
export declare interface DeleteDataSourceConnectionOptions extends OperationOptions {
    /**
     * If set to true, Resource will be deleted only if the etag matches.
     */
    onlyIfUnchanged?: boolean;
}

/**
 * Options for the delete documents operation.
 */
export declare type DeleteDocumentsOptions = IndexDocumentsOptions;

/**
 * Options for delete indexer operation.
 */
export declare interface DeleteIndexerOptions extends OperationOptions {
    /**
     * If set to true, Resource will be deleted only if the etag matches.
     */
    onlyIfUnchanged?: boolean;
}

/**
 * Options for delete index operation.
 */
export declare interface DeleteIndexOptions extends OperationOptions {
    /**
     * If set to true, Resource will be deleted only if the etag matches.
     */
    onlyIfUnchanged?: boolean;
}

/**
 * Options for delete skillset operaion.
 */
export declare interface DeleteSkillsetOptions extends OperationOptions {
    /**
     * If set to true, Resource will be deleted only if the etag matches.
     */
    onlyIfUnchanged?: boolean;
}

/**
 * Options for delete synonymmap operation.
 */
export declare interface DeleteSynonymMapOptions extends OperationOptions {
    /**
     * If set to true, Resource will be deleted only if the etag matches.
     */
    onlyIfUnchanged?: boolean;
}

/** Decomposes compound words found in many Germanic languages. This token filter is implemented using Apache Lucene. */
export declare interface DictionaryDecompounderTokenFilter extends BaseTokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.DictionaryDecompounderTokenFilter";
    /** The list of words to match against. */
    wordList: string[];
    /** The minimum word size. Only words longer than this get processed. Default is 5. Maximum is 300. */
    minWordSize?: number;
    /** The minimum subword size. Only subwords longer than this are outputted. Default is 2. Maximum is 300. */
    minSubwordSize?: number;
    /** The maximum subword size. Only subwords shorter than this are outputted. Default is 15. Maximum is 300. */
    maxSubwordSize?: number;
    /** A value indicating whether to add only the longest matching subword to the output. Default is false. */
    onlyLongestMatch?: boolean;
}

/** Defines a function that boosts scores based on distance from a geographic location. */
export declare interface DistanceScoringFunction extends BaseScoringFunction {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    type: "distance";
    /** Parameter values for the distance scoring function. */
    parameters: DistanceScoringParameters;
}

/** Provides parameter values to a distance scoring function. */
export declare interface DistanceScoringParameters {
    /** The name of the parameter passed in search queries to specify the reference location. */
    referencePointParameter: string;
    /** The distance in kilometers from the reference location where the boosting range ends. */
    boostingDistance: number;
}

/** A skill that extracts content from a file within the enrichment pipeline. */
export declare interface DocumentExtractionSkill extends BaseSearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Util.DocumentExtractionSkill";
    /** The parsingMode for the skill. Will be set to 'default' if not defined. */
    parsingMode?: string;
    /** The type of data to be extracted for the skill. Will be set to 'contentAndMetadata' if not defined. */
    dataToExtract?: string;
    /** A dictionary of configurations for the skill. */
    configuration?: {
        [propertyName: string]: any;
    };
}

/**
 * Generates n-grams of the given size(s) starting from the front or the back of an input token.
 * This token filter is implemented using Apache Lucene.
 */
export declare interface EdgeNGramTokenFilter {
    /**
     * Polymorphic Discriminator
     */
    odatatype: "#Microsoft.Azure.Search.EdgeNGramTokenFilterV2" | "#Microsoft.Azure.Search.EdgeNGramTokenFilter";
    /**
     * The name of the token filter. It must only contain letters, digits, spaces, dashes or
     * underscores, can only start and end with alphanumeric characters, and is limited to 128
     * characters.
     */
    name: string;
    /**
     * The minimum n-gram length. Default is 1. Maximum is 300. Must be less than the value of
     * maxGram. Default value: 1.
     */
    minGram?: number;
    /**
     * The maximum n-gram length. Default is 2. Maximum is 300. Default value: 2.
     */
    maxGram?: number;
    /**
     * Specifies which side of the input the n-gram should be generated from. Default is "front".
     * Possible values include: 'Front', 'Back'
     */
    side?: EdgeNGramTokenFilterSide;
}

/** Defines values for EdgeNGramTokenFilterSide. */
export declare type EdgeNGramTokenFilterSide = "front" | "back";

/** Tokenizes the input from an edge into n-grams of the given size(s). This tokenizer is implemented using Apache Lucene. */
export declare interface EdgeNGramTokenizer extends BaseLexicalTokenizer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.EdgeNGramTokenizer";
    /** The minimum n-gram length. Default is 1. Maximum is 300. Must be less than the value of maxGram. */
    minGram?: number;
    /** The maximum n-gram length. Default is 2. Maximum is 300. */
    maxGram?: number;
    /** Character classes to keep in the tokens. */
    tokenChars?: TokenCharacterKind[];
}

/** Removes elisions. For example, "l'avion" (the plane) will be converted to "avion" (plane). This token filter is implemented using Apache Lucene. */
export declare interface ElisionTokenFilter extends BaseTokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.ElisionTokenFilter";
    /** The set of articles to remove. */
    articles?: string[];
}

export declare type EntityCategory = `${KnownEntityCategory}`;

/** Using the Text Analytics API, extracts linked entities from text. */
export declare interface EntityLinkingSkill extends BaseSearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Text.V3.EntityLinkingSkill";
    /** A value indicating which language code to use. Default is `en`. */
    defaultLanguageCode?: string;
    /** A value between 0 and 1 that be used to only include entities whose confidence score is greater than the value specified. If not set (default), or if explicitly set to null, all entities will be included. */
    minimumPrecision?: number;
    /** The version of the model to use when calling the Text Analytics service. It will default to the latest available when not specified. We recommend you do not specify this value unless absolutely necessary. */
    modelVersion?: string;
}

/**
 * Text analytics entity recognition.
 *
 * @deprecated This skill has been deprecated.
 */
export declare interface EntityRecognitionSkill extends BaseSearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Text.EntityRecognitionSkill";
    /** A list of entity categories that should be extracted. */
    categories?: EntityCategory[];
    /** A value indicating which language code to use. Default is en. */
    defaultLanguageCode?: EntityRecognitionSkillLanguage;
    /** Determines whether or not to include entities which are well known but don't conform to a pre-defined type. If this configuration is not set (default), set to null or set to false, entities which don't conform to one of the pre-defined types will not be surfaced. */
    includeTypelessEntities?: boolean;
    /** A value between 0 and 1 that be used to only include entities whose confidence score is greater than the value specified. If not set (default), or if explicitly set to null, all entities will be included. */
    minimumPrecision?: number;
}

export declare type EntityRecognitionSkillLanguage = `${KnownEntityRecognitionSkillLanguage}`;

/** Using the Text Analytics API, extracts entities of different types from text. */
export declare interface EntityRecognitionSkillV3 extends BaseSearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Text.V3.EntityRecognitionSkill";
    /** A list of entity categories that should be extracted. */
    categories?: string[];
    /** A value indicating which language code to use. Default is `en`. */
    defaultLanguageCode?: string;
    /** A value between 0 and 1 that be used to only include entities whose confidence score is greater than the value specified. If not set (default), or if explicitly set to null, all entities will be included. */
    minimumPrecision?: number;
    /** The version of the model to use when calling the Text Analytics API. It will default to the latest available when not specified. We recommend you do not specify this value unless absolutely necessary. */
    modelVersion?: string;
}

export declare type ExcludedODataTypes = Date | GeographyPoint;

/** Contains configuration options specific to the exhaustive KNN algorithm used during querying, which will perform brute-force search across the entire vector index. */
export declare type ExhaustiveKnnAlgorithmConfiguration = BaseVectorSearchAlgorithmConfiguration & {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    kind: "exhaustiveKnn";
    /** Contains the parameters specific to exhaustive KNN algorithm. */
    parameters?: ExhaustiveKnnParameters;
};

/** Contains the parameters specific to exhaustive KNN algorithm. */
export declare interface ExhaustiveKnnParameters {
    /** The similarity metric to use for vector comparisons. */
    metric?: VectorSearchAlgorithmMetric;
}

export declare type ExtractDocumentKey<TModel> = {
    [K in keyof TModel as TModel[K] extends string | undefined ? K : never]: TModel[K];
};

/**
 * Extracts answer candidates from the contents of the documents returned in response to a query
 * expressed as a question in natural language.
 */
export declare interface ExtractiveQueryAnswer {
    answerType: "extractive";
    /**
     * The number of answers returned. Default count is 1
     */
    count?: number;
    /**
     * The confidence threshold. Default threshold is 0.7
     */
    threshold?: number;
}

/** Extracts captions from the matching documents that contain passages relevant to the search query. */
export declare interface ExtractiveQueryCaption {
    captionType: "extractive";
    highlight?: boolean;
}

/** A single bucket of a facet query result. Reports the number of documents with a field value falling within a particular range or having a particular value or interval. */
export declare interface FacetResult {
    /** Describes unknown properties. The value of an unknown property can be of "any" type. */
    [property: string]: any;
    /**
     * The approximate count of documents falling within the bucket described by this facet.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly count?: number;
}

/** Defines a mapping between a field in a data source and a target field in an index. */
export declare interface FieldMapping {
    /** The name of the field in the data source. */
    sourceFieldName: string;
    /** The name of the target field in the index. Same as the source field name by default. */
    targetFieldName?: string;
    /** A function to apply to each source field value before indexing. */
    mappingFunction?: FieldMappingFunction;
}

/** Represents a function that transforms a value from a data source before indexing. */
export declare interface FieldMappingFunction {
    /** The name of the field mapping function. */
    name: string;
    /** A dictionary of parameter name/value pairs to pass to the function. Each value must be of a primitive type. */
    parameters?: {
        [propertyName: string]: any;
    };
}

/** Defines a function that boosts scores based on the value of a date-time field. */
export declare interface FreshnessScoringFunction extends BaseScoringFunction {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    type: "freshness";
    /** Parameter values for the freshness scoring function. */
    parameters: FreshnessScoringParameters;
}

/** Provides parameter values to a freshness scoring function. */
export declare interface FreshnessScoringParameters {
    /** The expiration period after which boosting will stop for a particular document. */
    boostingDuration: string;
}

/**
 * Represents a geographic point in global coordinates.
 */
export declare class GeographyPoint {
    /**
     * The latitude in decimal.
     */
    latitude: number;
    /**
     * The longitude in decimal.
     */
    longitude: number;
    /**
     * Constructs a new instance of GeographyPoint given
     * the specified coordinates.
     * @param geographyPoint - object with longitude and latitude values in decimal
     */
    constructor(geographyPoint: {
        longitude: number;
        latitude: number;
    });
    /**
     * Used to serialize to a GeoJSON Point.
     */
    toJSON(): Record<string, unknown>;
}

/**
 * Options for get datasource operation.
 */
export declare type GetDataSourceConnectionOptions = OperationOptions;

/**
 * Options for retrieving a single document.
 */
export declare interface GetDocumentOptions<TModel extends object, TFields extends SelectFields<TModel> = SelectFields<TModel>> extends OperationOptions {
    /**
     * List of field names to retrieve for the document; Any field not retrieved will be missing from
     * the returned document.
     */
    selectedFields?: SelectArray<TFields>;
}

/**
 * Options for get indexer operation.
 */
export declare type GetIndexerOptions = OperationOptions;

/**
 * Options for get indexer status operation.
 */
export declare type GetIndexerStatusOptions = OperationOptions;

/**
 * Options for get index operation.
 */
export declare type GetIndexOptions = OperationOptions;

/**
 * Options for get index statistics operation.
 */
export declare type GetIndexStatisticsOptions = OperationOptions;

/**
 * Options for get service statistics operation.
 */
export declare type GetServiceStatisticsOptions = OperationOptions;

/**
 * Options for get skillset operation.
 */
export declare type GetSkillSetOptions = OperationOptions;

/**
 * Options for get synonymmaps operation.
 */
export declare type GetSynonymMapsOptions = OperationOptions;

/** Defines a data change detection policy that captures changes based on the value of a high water mark column. */
export declare interface HighWaterMarkChangeDetectionPolicy extends BaseDataChangeDetectionPolicy {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.HighWaterMarkChangeDetectionPolicy";
    /** The name of the high water mark column. */
    highWaterMarkColumnName: string;
}

/**
 * Contains configuration options specific to the hnsw approximate nearest neighbors algorithm
 * used during indexing time.
 */
export declare type HnswAlgorithmConfiguration = BaseVectorSearchAlgorithmConfiguration & {
    /**
     * Polymorphic discriminator, which specifies the different types this object can be
     */
    kind: "hnsw";
    /**
     * Contains the parameters specific to hnsw algorithm.
     *
     */
    parameters?: HnswParameters;
};

/**
 * Contains the parameters specific to hnsw algorithm.
 */
export declare interface HnswParameters {
    /**
     * The number of bi-directional links created for every new element during construction.
     * Increasing this parameter value may improve recall and reduce retrieval times for datasets
     * with high intrinsic dimensionality at the expense of increased memory consumption and longer
     * indexing time.
     */
    m?: number;
    /**
     * The size of the dynamic list containing the nearest neighbors, which is used during index
     * time. Increasing this parameter may improve index quality, at the expense of increased
     * indexing time. At a certain point, increasing this parameter leads to diminishing returns.
     */
    efConstruction?: number;
    /**
     * The size of the dynamic list containing the nearest neighbors, which is used during search
     * time. Increasing this parameter may improve search results, at the expense of slower search.
     * Increasing this parameter leads to diminishing returns.
     */
    efSearch?: number;
    /**
     * The similarity metric to use for vector comparisons.
     */
    metric?: VectorSearchAlgorithmMetric;
}

/** A skill that analyzes image files. It extracts a rich set of visual features based on the image content. */
export declare interface ImageAnalysisSkill extends BaseSearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Vision.ImageAnalysisSkill";
    /** A value indicating which language code to use. Default is en. */
    defaultLanguageCode?: ImageAnalysisSkillLanguage;
    /** A list of visual features. */
    visualFeatures?: VisualFeature[];
    /** A string indicating which domain-specific details to return. */
    details?: ImageDetail[];
}

/** A skill that analyzes image files. It extracts a rich set of visual features based on the image content. */
export declare interface ImageAnalysisSkill extends BaseSearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Vision.ImageAnalysisSkill";
    /** A value indicating which language code to use. Default is en. */
    defaultLanguageCode?: ImageAnalysisSkillLanguage;
    /** A list of visual features. */
    visualFeatures?: VisualFeature[];
    /** A string indicating which domain-specific details to return. */
    details?: ImageDetail[];
}

export declare type ImageAnalysisSkillLanguage = `${KnownImageAnalysisSkillLanguage}`;

export declare type ImageDetail = `${KnownImageDetail}`;

/** Defines values for IndexActionType. */
export declare type IndexActionType = "upload" | "merge" | "mergeOrUpload" | "delete";

/**
 * Represents an index action that operates on a document.
 */
export declare type IndexDocumentsAction<TModel> = {
    /**
     * The operation to perform on a document in an indexing batch. Possible values include:
     * 'upload', 'merge', 'mergeOrUpload', 'delete'
     */
    __actionType: IndexActionType;
} & Partial<TModel>;

/**
 * Class used to perform batch operations
 * with multiple documents to the index.
 */
export declare class IndexDocumentsBatch<TModel> {
    /**
     * The set of actions taken in this batch.
     */
    readonly actions: IndexDocumentsAction<TModel>[];
    constructor(actions?: IndexDocumentsAction<TModel>[]);
    /**
     * Upload an array of documents to the index.
     * @param documents - The documents to upload.
     */
    upload(documents: TModel[]): void;
    /**
     * Update a set of documents in the index.
     * For more details about how merging works, see https://docs.microsoft.com/en-us/rest/api/searchservice/AddUpdate-or-Delete-Documents
     * @param documents - The updated documents.
     */
    merge(documents: TModel[]): void;
    /**
     * Update a set of documents in the index or uploads them if they don't exist.
     * For more details about how merging works, see https://docs.microsoft.com/en-us/rest/api/searchservice/AddUpdate-or-Delete-Documents
     * @param documents - The new/updated documents.
     */
    mergeOrUpload(documents: TModel[]): void;
    /**
     * Delete a set of documents.
     * @param keyName - The name of their primary key in the index.
     * @param keyValues - The primary key values of documents to delete.
     */
    delete(keyName: keyof TModel, keyValues: string[]): void;
    /**
     * Delete a set of documents.
     * @param documents - Documents to be deleted.
     */
    delete(documents: TModel[]): void;
}

/**
 * Index Documents Client
 */
export declare interface IndexDocumentsClient<TModel extends object> {
    /**
     * Perform a set of index modifications (upload, merge, mergeOrUpload, delete)
     * for the given set of documents.
     *
     * @param batch - An array of actions to perform on the index.
     * @param options - Additional options.
     */
    indexDocuments(batch: IndexDocumentsBatch<TModel>, options: IndexDocumentsOptions): Promise<IndexDocumentsResult>;
}

/**
 * Options for the modify index batch operation.
 */
export declare interface IndexDocumentsOptions extends OperationOptions {
    /**
     * If true, will cause this operation to throw if any document operation
     * in the batch did not succeed.
     */
    throwOnAnyFailure?: boolean;
}

/** Response containing the status of operations for all documents in the indexing request. */
export declare interface IndexDocumentsResult {
    /**
     * The list of status information for each document in the indexing request.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly results: IndexingResult[];
}

export declare type IndexerExecutionEnvironment = `${KnownIndexerExecutionEnvironment}`;

/** Represents the result of an individual indexer execution. */
export declare interface IndexerExecutionResult {
    /**
     * The outcome of this indexer execution.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly status: IndexerExecutionStatus;
    /**
     * The error message indicating the top-level error, if any.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly errorMessage?: string;
    /**
     * The start time of this indexer execution.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly startTime?: Date;
    /**
     * The end time of this indexer execution, if the execution has already completed.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly endTime?: Date;
    /**
     * The item-level indexing errors.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly errors: SearchIndexerError[];
    /**
     * The item-level indexing warnings.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly warnings: SearchIndexerWarning[];
    /**
     * The number of items that were processed during this indexer execution. This includes both successfully processed items and items where indexing was attempted but failed.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly itemCount: number;
    /**
     * The number of items that failed to be indexed during this indexer execution.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly failedItemCount: number;
    /**
     * Change tracking state with which an indexer execution started.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly initialTrackingState?: string;
    /**
     * Change tracking state with which an indexer execution finished.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly finalTrackingState?: string;
}

/** Defines values for IndexerExecutionStatus. */
export declare type IndexerExecutionStatus = "transientFailure" | "success" | "inProgress" | "reset";

/** Defines values for IndexerStatus. */
export declare type IndexerStatus = "unknown" | "error" | "running";

/** Represents parameters for indexer execution. */
export declare interface IndexingParameters {
    /** The number of items that are read from the data source and indexed as a single batch in order to improve performance. The default depends on the data source type. */
    batchSize?: number;
    /** The maximum number of items that can fail indexing for indexer execution to still be considered successful. -1 means no limit. Default is 0. */
    maxFailedItems?: number;
    /** The maximum number of items in a single batch that can fail indexing for the batch to still be considered successful. -1 means no limit. Default is 0. */
    maxFailedItemsPerBatch?: number;
    /** A dictionary of indexer-specific configuration properties. Each name is the name of a specific property. Each value must be of a primitive type. */
    configuration?: IndexingParametersConfiguration;
}

/** A dictionary of indexer-specific configuration properties. Each name is the name of a specific property. Each value must be of a primitive type. */
export declare interface IndexingParametersConfiguration {
    /** Describes unknown properties. The value of an unknown property can be of "any" type. */
    [property: string]: any;
    /** Represents the parsing mode for indexing from an Azure blob data source. */
    parsingMode?: BlobIndexerParsingMode;
    /** Comma-delimited list of filename extensions to ignore when processing from Azure blob storage.  For example, you could exclude ".png, .mp4" to skip over those files during indexing. */
    excludedFileNameExtensions?: string;
    /** Comma-delimited list of filename extensions to select when processing from Azure blob storage.  For example, you could focus indexing on specific application files ".docx, .pptx, .msg" to specifically include those file types. */
    indexedFileNameExtensions?: string;
    /** For Azure blobs, set to false if you want to continue indexing when an unsupported content type is encountered, and you don't know all the content types (file extensions) in advance. */
    failOnUnsupportedContentType?: boolean;
    /** For Azure blobs, set to false if you want to continue indexing if a document fails indexing. */
    failOnUnprocessableDocument?: boolean;
    /** For Azure blobs, set this property to true to still index storage metadata for blob content that is too large to process. Oversized blobs are treated as errors by default. For limits on blob size, see https://docs.microsoft.com/azure/search/search-limits-quotas-capacity. */
    indexStorageMetadataOnlyForOversizedDocuments?: boolean;
    /** For CSV blobs, specifies a comma-delimited list of column headers, useful for mapping source fields to destination fields in an index. */
    delimitedTextHeaders?: string;
    /** For CSV blobs, specifies the end-of-line single-character delimiter for CSV files where each line starts a new document (for example, "|"). */
    delimitedTextDelimiter?: string;
    /** For CSV blobs, indicates that the first (non-blank) line of each blob contains headers. */
    firstLineContainsHeaders?: boolean;
    /** For JSON arrays, given a structured or semi-structured document, you can specify a path to the array using this property. */
    documentRoot?: string;
    /** Specifies the data to extract from Azure blob storage and tells the indexer which data to extract from image content when "imageAction" is set to a value other than "none".  This applies to embedded image content in a .PDF or other application, or image files such as .jpg and .png, in Azure blobs. */
    dataToExtract?: BlobIndexerDataToExtract;
    /** Determines how to process embedded images and image files in Azure blob storage.  Setting the "imageAction" configuration to any value other than "none" requires that a skillset also be attached to that indexer. */
    imageAction?: BlobIndexerImageAction;
    /** If true, will create a path //document//file_data that is an object representing the original file data downloaded from your blob data source.  This allows you to pass the original file data to a custom skill for processing within the enrichment pipeline, or to the Document Extraction skill. */
    allowSkillsetToReadFileData?: boolean;
    /** Determines algorithm for text extraction from PDF files in Azure blob storage. */
    pdfTextRotationAlgorithm?: BlobIndexerPDFTextRotationAlgorithm;
    /** Specifies the environment in which the indexer should execute. */
    executionEnvironment?: IndexerExecutionEnvironment;
    /** Increases the timeout beyond the 5-minute default for Azure SQL database data sources, specified in the format "hh:mm:ss". */
    queryTimeout?: string;
}

/** Status of an indexing operation for a single document. */
export declare interface IndexingResult {
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

/** Represents a schedule for indexer execution. */
export declare interface IndexingSchedule {
    /** The interval of time between indexer executions. */
    interval: string;
    /** The time when an indexer should start running. */
    startTime?: Date;
}

/**
 * An iterator for listing the indexes that exist in the Search service. Will make requests
 * as needed during iteration. Use .byPage() to make one request to the server
 * per iteration.
 */
export declare type IndexIterator = PagedAsyncIterableIterator<SearchIndex, SearchIndex[], {}>;

/**
 * An iterator for listing the indexes that exist in the Search service. Will make requests
 * as needed during iteration. Use .byPage() to make one request to the server
 * per iteration.
 */
export declare type IndexNameIterator = PagedAsyncIterableIterator<string, string[], {}>;

/**
 * Defines values for IndexProjectionMode. \
 * {@link KnownIndexProjectionMode} can be used interchangeably with IndexProjectionMode,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **skipIndexingParentDocuments**: The source document will be skipped from writing into the indexer's target index. \
 * **includeIndexingParentDocuments**: The source document will be written into the indexer's target index. This is the default pattern.
 */
export declare type IndexProjectionMode = string;

/** Input field mapping for a skill. */
export declare interface InputFieldMappingEntry {
    /** The name of the input. */
    name: string;
    /** The source of the input. */
    source?: string;
    /** The source context used for selecting recursive inputs. */
    sourceContext?: string;
    /** The recursive inputs used when creating a complex type. */
    inputs?: InputFieldMappingEntry[];
}

/** A token filter that only keeps tokens with text contained in a specified list of words. This token filter is implemented using Apache Lucene. */
export declare interface KeepTokenFilter extends BaseTokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.KeepTokenFilter";
    /** The list of words to keep. */
    keepWords: string[];
    /** A value indicating whether to lower case all words first. Default is false. */
    lowerCaseKeepWords?: boolean;
}

/** A skill that uses text analytics for key phrase extraction. */
export declare interface KeyPhraseExtractionSkill extends BaseSearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Text.KeyPhraseExtractionSkill";
    /** A value indicating which language code to use. Default is en. */
    defaultLanguageCode?: KeyPhraseExtractionSkillLanguage;
    /** A number indicating how many key phrases to return. If absent, all identified key phrases will be returned. */
    maxKeyPhraseCount?: number;
    /** The version of the model to use when calling the Text Analytics service. It will default to the latest available when not specified. We recommend you do not specify this value unless absolutely necessary. */
    modelVersion?: string;
}

export declare type KeyPhraseExtractionSkillLanguage = `${KnownKeyPhraseExtractionSkillLanguage}`;

/** Marks terms as keywords. This token filter is implemented using Apache Lucene. */
export declare interface KeywordMarkerTokenFilter extends BaseTokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.KeywordMarkerTokenFilter";
    /** A list of words to mark as keywords. */
    keywords: string[];
    /** A value indicating whether to ignore case. If true, all words are converted to lower case first. Default is false. */
    ignoreCase?: boolean;
}

/**
 * Emits the entire input as a single token. This tokenizer is implemented using Apache Lucene.
 */
export declare interface KeywordTokenizer {
    /**
     * Polymorphic Discriminator
     */
    odatatype: "#Microsoft.Azure.Search.KeywordTokenizerV2" | "#Microsoft.Azure.Search.KeywordTokenizer";
    /**
     * The name of the tokenizer. It must only contain letters, digits, spaces, dashes or
     * underscores, can only start and end with alphanumeric characters, and is limited to 128
     * characters.
     */
    name: string;
    /**
     * The maximum token length. Default is 256. Tokens longer than the maximum length are split. The
     * maximum token length that can be used is 300 characters. Default value: 256.
     */
    maxTokenLength?: number;
}

/**
 * Defines values for AnalyzerName.
 * See https://docs.microsoft.com/rest/api/searchservice/Language-support
 * @readonly
 */
export declare enum KnownAnalyzerNames {
    /**
     * Arabic
     */
    ArMicrosoft = "ar.microsoft",
    /**
     * Arabic
     */
    ArLucene = "ar.lucene",
    /**
     * Armenian
     */
    HyLucene = "hy.lucene",
    /**
     * Bangla
     */
    BnMicrosoft = "bn.microsoft",
    /**
     * Basque
     */
    EuLucene = "eu.lucene",
    /**
     * Bulgarian
     */
    BgMicrosoft = "bg.microsoft",
    /**
     * Bulgarian
     */
    BgLucene = "bg.lucene",
    /**
     * Catalan
     */
    CaMicrosoft = "ca.microsoft",
    /**
     * Catalan
     */
    CaLucene = "ca.lucene",
    /**
     * Chinese Simplified
     */
    ZhHansMicrosoft = "zh-Hans.microsoft",
    /**
     * Chinese Simplified
     */
    ZhHansLucene = "zh-Hans.lucene",
    /**
     * Chinese Traditional
     */
    ZhHantMicrosoft = "zh-Hant.microsoft",
    /**
     * Chinese Traditional
     */
    ZhHantLucene = "zh-Hant.lucene",
    /**
     * Croatian
     */
    HrMicrosoft = "hr.microsoft",
    /**
     * Czech
     */
    CsMicrosoft = "cs.microsoft",
    /**
     * Czech
     */
    CsLucene = "cs.lucene",
    /**
     * Danish
     */
    DaMicrosoft = "da.microsoft",
    /**
     * Danish
     */
    DaLucene = "da.lucene",
    /**
     * Dutch
     */
    NlMicrosoft = "nl.microsoft",
    /**
     * Dutch
     */
    NlLucene = "nl.lucene",
    /**
     * English
     */
    EnMicrosoft = "en.microsoft",
    /**
     * English
     */
    EnLucene = "en.lucene",
    /**
     * Estonian
     */
    EtMicrosoft = "et.microsoft",
    /**
     * Finnish
     */
    FiMicrosoft = "fi.microsoft",
    /**
     * Finnish
     */
    FiLucene = "fi.lucene",
    /**
     * French
     */
    FrMicrosoft = "fr.microsoft",
    /**
     * French
     */
    FrLucene = "fr.lucene",
    /**
     * Galician
     */
    GlLucene = "gl.lucene",
    /**
     * German
     */
    DeMicrosoft = "de.microsoft",
    /**
     * German
     */
    DeLucene = "de.lucene",
    /**
     * Greek
     */
    ElMicrosoft = "el.microsoft",
    /**
     * Greek
     */
    ElLucene = "el.lucene",
    /**
     * Gujarati
     */
    GuMicrosoft = "gu.microsoft",
    /**
     * Hebrew
     */
    HeMicrosoft = "he.microsoft",
    /**
     * Hindi
     */
    HiMicrosoft = "hi.microsoft",
    /**
     * Hindi
     */
    HiLucene = "hi.lucene",
    /**
     * Hungarian
     */
    HuMicrosoft = "hu.microsoft",
    /**
     * Hungarian
     */
    HuLucene = "hu.lucene",
    /**
     * Icelandic
     */
    IsMicrosoft = "is.microsoft",
    /**
     * Indonesian (Bahasa)
     */
    IdMicrosoft = "id.microsoft",
    /**
     * Indonesian (Bahasa)
     */
    IdLucene = "id.lucene",
    /**
     * Irish
     */
    GaLucene = "ga.lucene",
    /**
     * Italian
     */
    ItMicrosoft = "it.microsoft",
    /**
     * Italian
     */
    ItLucene = "it.lucene",
    /**
     * Japanese
     */
    JaMicrosoft = "ja.microsoft",
    /**
     * Japanese
     */
    JaLucene = "ja.lucene",
    /**
     * Kannada
     */
    KnMicrosoft = "kn.microsoft",
    /**
     * Korean
     */
    KoMicrosoft = "ko.microsoft",
    /**
     * Korean
     */
    KoLucene = "ko.lucene",
    /**
     * Latvian
     */
    LvMicrosoft = "lv.microsoft",
    /**
     * Latvian
     */
    LvLucene = "lv.lucene",
    /**
     * Lithuanian
     */
    LtMicrosoft = "lt.microsoft",
    /**
     * Malayalam
     */
    MlMicrosoft = "ml.microsoft",
    /**
     * Malay (Latin)
     */
    MsMicrosoft = "ms.microsoft",
    /**
     * Marathi
     */
    MrMicrosoft = "mr.microsoft",
    /**
     * Norwegian
     */
    NbMicrosoft = "nb.microsoft",
    /**
     * Norwegian
     */
    NoLucene = "no.lucene",
    /**
     * Persian
     */
    FaLucene = "fa.lucene",
    /**
     * Polish
     */
    PlMicrosoft = "pl.microsoft",
    /**
     * Polish
     */
    PlLucene = "pl.lucene",
    /**
     * Portuguese (Brazil)
     */
    PtBRMicrosoft = "pt-BR.microsoft",
    /**
     * Portuguese (Brazil)
     */
    PtBRLucene = "pt-BR.lucene",
    /**
     * Portuguese (Portugal)
     */
    PtPTMicrosoft = "pt-PT.microsoft",
    /**
     * Portuguese (Portugal)
     */
    PtPTLucene = "pt-PT.lucene",
    /**
     * Punjabi
     */ PaMicrosoft = "pa.microsoft",
    /**
     * Romanian
     */
    RoMicrosoft = "ro.microsoft",
    /**
     * Romanian
     */
    RoLucene = "ro.lucene",
    /**
     * Russian
     */
    RuMicrosoft = "ru.microsoft",
    /**
     * Russian
     */
    RuLucene = "ru.lucene",
    /**
     * Serbian (Cyrillic)
     */
    SrCyrillicMicrosoft = "sr-cyrillic.microsoft",
    /**
     * Serbian (Latin)
     */
    SrLatinMicrosoft = "sr-latin.microsoft",
    /**
     * Slovak
     */
    SkMicrosoft = "sk.microsoft",
    /**
     * Slovenian
     */
    SlMicrosoft = "sl.microsoft",
    /**
     * Spanish
     */
    EsMicrosoft = "es.microsoft",
    /**
     * Spanish
     */
    EsLucene = "es.lucene",
    /**
     * Swedish
     */
    SvMicrosoft = "sv.microsoft",
    /**
     * Swedish
     */
    SvLucene = "sv.lucene",
    /**
     * Tamil
     */
    TaMicrosoft = "ta.microsoft",
    /**
     * Telugu
     */
    TeMicrosoft = "te.microsoft",
    /**
     * Thai
     */
    ThMicrosoft = "th.microsoft",
    /**
     * Thai
     */
    ThLucene = "th.lucene",
    /**
     * Turkish
     */
    TrMicrosoft = "tr.microsoft",
    /**
     * Turkish
     */
    TrLucene = "tr.lucene",
    /**
     * Ukrainian
     */
    UkMicrosoft = "uk.microsoft",
    /**
     * Urdu
     */
    UrMicrosoft = "ur.microsoft",
    /**
     * Vietnamese
     */
    ViMicrosoft = "vi.microsoft",
    /**
     * See: https://lucene.apache.org/core/6_6_1/core/org/apache/lucene/analysis/standard/StandardAnalyzer.html
     */
    StandardLucene = "standard.lucene",
    /**
     * See https://lucene.apache.org/core/6_6_1/analyzers-common/org/apache/lucene/analysis/miscellaneous/ASCIIFoldingFilter.html
     */
    StandardAsciiFoldingLucene = "standardasciifolding.lucene",
    /**
     * Treats the entire content of a field as a single token. This is useful for data like zip codes, ids, and some product names.
     */
    Keyword = "keyword",
    /**
     * Flexibly separates text into terms via a regular expression pattern.
     */
    Pattern = "pattern",
    /**
     * Divides text at non-letters and converts them to lower case.
     */
    Simple = "simple",
    /**
     * Divides text at non-letters; Applies the lowercase and stopword token filters.
     */
    Stop = "stop",
    /**
     * An analyzer that uses the whitespace tokenizer.
     */
    Whitespace = "whitespace"
}

/** Known values of {@link AzureOpenAIModelName} that the service accepts. */
export declare enum KnownAzureOpenAIModelName {
    /** TextEmbeddingAda002 */
    TextEmbeddingAda002 = "text-embedding-ada-002",
    /** TextEmbedding3Large */
    TextEmbedding3Large = "text-embedding-3-large",
    /** TextEmbedding3Small */
    TextEmbedding3Small = "text-embedding-3-small"
}

/** Known values of {@link BlobIndexerDataToExtract} that the service accepts. */
export declare enum KnownBlobIndexerDataToExtract {
    /** Indexes just the standard blob properties and user-specified metadata. */
    StorageMetadata = "storageMetadata",
    /** Extracts metadata provided by the Azure blob storage subsystem and the content-type specific metadata (for example, metadata unique to just .png files are indexed). */
    AllMetadata = "allMetadata",
    /** Extracts all metadata and textual content from each blob. */
    ContentAndMetadata = "contentAndMetadata"
}

/** Known values of {@link BlobIndexerImageAction} that the service accepts. */
export declare enum KnownBlobIndexerImageAction {
    /** Ignores embedded images or image files in the data set.  This is the default. */
    None = "none",
    /** Extracts text from images (for example, the word "STOP" from a traffic stop sign), and embeds it into the content field.  This action requires that "dataToExtract" is set to "contentAndMetadata".  A normalized image refers to additional processing resulting in uniform image output, sized and rotated to promote consistent rendering when you include images in visual search results. This information is generated for each image when you use this option. */
    GenerateNormalizedImages = "generateNormalizedImages",
    /** Extracts text from images (for example, the word "STOP" from a traffic stop sign), and embeds it into the content field, but treats PDF files differently in that each page will be rendered as an image and normalized accordingly, instead of extracting embedded images.  Non-PDF file types will be treated the same as if "generateNormalizedImages" was set. */
    GenerateNormalizedImagePerPage = "generateNormalizedImagePerPage"
}

/** Known values of {@link BlobIndexerParsingMode} that the service accepts. */
export declare enum KnownBlobIndexerParsingMode {
    /** Set to default for normal file processing. */
    Default = "default",
    /** Set to text to improve indexing performance on plain text files in blob storage. */
    Text = "text",
    /** Set to delimitedText when blobs are plain CSV files. */
    DelimitedText = "delimitedText",
    /** Set to json to extract structured content from JSON files. */
    Json = "json",
    /** Set to jsonArray to extract individual elements of a JSON array as separate documents. */
    JsonArray = "jsonArray",
    /** Set to jsonLines to extract individual JSON entities, separated by a new line, as separate documents. */
    JsonLines = "jsonLines"
}

/** Known values of {@link BlobIndexerPDFTextRotationAlgorithm} that the service accepts. */
export declare enum KnownBlobIndexerPDFTextRotationAlgorithm {
    /** Leverages normal text extraction.  This is the default. */
    None = "none",
    /** May produce better and more readable text extraction from PDF files that have rotated text within them.  Note that there may be a small performance speed impact when this parameter is used.  This parameter only applies to PDF files, and only to PDFs with embedded text.  If the rotated text appears within an embedded image in the PDF, this parameter does not apply. */
    DetectAngles = "detectAngles"
}

/** Known values of {@link CharFilterName} that the service accepts. */
export declare enum KnownCharFilterNames {
    /** A character filter that attempts to strip out HTML constructs. See https:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/charfilter\/HTMLStripCharFilter.html */
    HtmlStrip = "html_strip"
}

/** Known values of {@link CustomEntityLookupSkillLanguage} that the service accepts. */
export declare enum KnownCustomEntityLookupSkillLanguage {
    /** Danish */
    Da = "da",
    /** German */
    De = "de",
    /** English */
    En = "en",
    /** Spanish */
    Es = "es",
    /** Finnish */
    Fi = "fi",
    /** French */
    Fr = "fr",
    /** Italian */
    It = "it",
    /** Korean */
    Ko = "ko",
    /** Portuguese */
    Pt = "pt"
}

/** Known values of {@link EntityCategory} that the service accepts. */
export declare enum KnownEntityCategory {
    /** Entities describing a physical location. */
    Location = "location",
    /** Entities describing an organization. */
    Organization = "organization",
    /** Entities describing a person. */
    Person = "person",
    /** Entities describing a quantity. */
    Quantity = "quantity",
    /** Entities describing a date and time. */
    Datetime = "datetime",
    /** Entities describing a URL. */
    Url = "url",
    /** Entities describing an email address. */
    Email = "email"
}

/** Known values of {@link EntityRecognitionSkillLanguage} that the service accepts. */
export declare enum KnownEntityRecognitionSkillLanguage {
    /** Arabic */
    Ar = "ar",
    /** Czech */
    Cs = "cs",
    /** Chinese-Simplified */
    ZhHans = "zh-Hans",
    /** Chinese-Traditional */
    ZhHant = "zh-Hant",
    /** Danish */
    Da = "da",
    /** Dutch */
    Nl = "nl",
    /** English */
    En = "en",
    /** Finnish */
    Fi = "fi",
    /** French */
    Fr = "fr",
    /** German */
    De = "de",
    /** Greek */
    El = "el",
    /** Hungarian */
    Hu = "hu",
    /** Italian */
    It = "it",
    /** Japanese */
    Ja = "ja",
    /** Korean */
    Ko = "ko",
    /** Norwegian (Bokmaal) */
    No = "no",
    /** Polish */
    Pl = "pl",
    /** Portuguese (Portugal) */
    PtPT = "pt-PT",
    /** Portuguese (Brazil) */
    PtBR = "pt-BR",
    /** Russian */
    Ru = "ru",
    /** Spanish */
    Es = "es",
    /** Swedish */
    Sv = "sv",
    /** Turkish */
    Tr = "tr"
}

/** Known values of {@link ImageAnalysisSkillLanguage} that the service accepts. */
export declare enum KnownImageAnalysisSkillLanguage {
    /** Arabic */
    Ar = "ar",
    /** Azerbaijani */
    Az = "az",
    /** Bulgarian */
    Bg = "bg",
    /** Bosnian Latin */
    Bs = "bs",
    /** Catalan */
    Ca = "ca",
    /** Czech */
    Cs = "cs",
    /** Welsh */
    Cy = "cy",
    /** Danish */
    Da = "da",
    /** German */
    De = "de",
    /** Greek */
    El = "el",
    /** English */
    En = "en",
    /** Spanish */
    Es = "es",
    /** Estonian */
    Et = "et",
    /** Basque */
    Eu = "eu",
    /** Finnish */
    Fi = "fi",
    /** French */
    Fr = "fr",
    /** Irish */
    Ga = "ga",
    /** Galician */
    Gl = "gl",
    /** Hebrew */
    He = "he",
    /** Hindi */
    Hi = "hi",
    /** Croatian */
    Hr = "hr",
    /** Hungarian */
    Hu = "hu",
    /** Indonesian */
    Id = "id",
    /** Italian */
    It = "it",
    /** Japanese */
    Ja = "ja",
    /** Kazakh */
    Kk = "kk",
    /** Korean */
    Ko = "ko",
    /** Lithuanian */
    Lt = "lt",
    /** Latvian */
    Lv = "lv",
    /** Macedonian */
    Mk = "mk",
    /** Malay Malaysia */
    Ms = "ms",
    /** Norwegian (Bokmal) */
    Nb = "nb",
    /** Dutch */
    Nl = "nl",
    /** Polish */
    Pl = "pl",
    /** Dari */
    Prs = "prs",
    /** Portuguese-Brazil */
    PtBR = "pt-BR",
    /** Portuguese-Portugal */
    Pt = "pt",
    /** Portuguese-Portugal */
    PtPT = "pt-PT",
    /** Romanian */
    Ro = "ro",
    /** Russian */
    Ru = "ru",
    /** Slovak */
    Sk = "sk",
    /** Slovenian */
    Sl = "sl",
    /** Serbian - Cyrillic RS */
    SrCyrl = "sr-Cyrl",
    /** Serbian - Latin RS */
    SrLatn = "sr-Latn",
    /** Swedish */
    Sv = "sv",
    /** Thai */
    Th = "th",
    /** Turkish */
    Tr = "tr",
    /** Ukrainian */
    Uk = "uk",
    /** Vietnamese */
    Vi = "vi",
    /** Chinese Simplified */
    Zh = "zh",
    /** Chinese Simplified */
    ZhHans = "zh-Hans",
    /** Chinese Traditional */
    ZhHant = "zh-Hant"
}

/** Known values of {@link ImageDetail} that the service accepts. */
export declare enum KnownImageDetail {
    /** Details recognized as celebrities. */
    Celebrities = "celebrities",
    /** Details recognized as landmarks. */
    Landmarks = "landmarks"
}

/** Known values of {@link IndexerExecutionEnvironment} that the service accepts. */
export declare enum KnownIndexerExecutionEnvironment {
    /** Indicates that the search service can determine where the indexer should execute. This is the default environment when nothing is specified and is the recommended value. */
    Standard = "standard",
    /** Indicates that the indexer should run with the environment provisioned specifically for the search service. This should only be specified as the execution environment if the indexer needs to access resources securely over shared private link resources. */
    Private = "private"
}

/** Known values of {@link IndexProjectionMode} that the service accepts. */
export declare enum KnownIndexProjectionMode {
    /** The source document will be skipped from writing into the indexer's target index. */
    SkipIndexingParentDocuments = "skipIndexingParentDocuments",
    /** The source document will be written into the indexer's target index. This is the default pattern. */
    IncludeIndexingParentDocuments = "includeIndexingParentDocuments"
}

/** Known values of {@link KeyPhraseExtractionSkillLanguage} that the service accepts. */
export declare enum KnownKeyPhraseExtractionSkillLanguage {
    /** Danish */
    Da = "da",
    /** Dutch */
    Nl = "nl",
    /** English */
    En = "en",
    /** Finnish */
    Fi = "fi",
    /** French */
    Fr = "fr",
    /** German */
    De = "de",
    /** Italian */
    It = "it",
    /** Japanese */
    Ja = "ja",
    /** Korean */
    Ko = "ko",
    /** Norwegian (Bokmaal) */
    No = "no",
    /** Polish */
    Pl = "pl",
    /** Portuguese (Portugal) */
    PtPT = "pt-PT",
    /** Portuguese (Brazil) */
    PtBR = "pt-BR",
    /** Russian */
    Ru = "ru",
    /** Spanish */
    Es = "es",
    /** Swedish */
    Sv = "sv"
}

/** Known values of {@link OcrLineEnding} that the service accepts. */
export declare enum KnownOcrLineEnding {
    /** Lines are separated by a single space character. */
    Space = "space",
    /** Lines are separated by a carriage return ('\r') character. */
    CarriageReturn = "carriageReturn",
    /** Lines are separated by a single line feed ('\n') character. */
    LineFeed = "lineFeed",
    /** Lines are separated by a carriage return and a line feed ('\r\n') character. */
    CarriageReturnLineFeed = "carriageReturnLineFeed"
}

/** Known values of {@link OcrSkillLanguage} that the service accepts. */
export declare enum KnownOcrSkillLanguage {
    /** Afrikaans */
    Af = "af",
    /** Albanian */
    Sq = "sq",
    /** Angika (Devanagiri) */
    Anp = "anp",
    /** Arabic */
    Ar = "ar",
    /** Asturian */
    Ast = "ast",
    /** Awadhi-Hindi (Devanagiri) */
    Awa = "awa",
    /** Azerbaijani (Latin) */
    Az = "az",
    /** Bagheli */
    Bfy = "bfy",
    /** Basque */
    Eu = "eu",
    /** Belarusian (Cyrillic and Latin) */
    Be = "be",
    /** Belarusian (Cyrillic) */
    BeCyrl = "be-cyrl",
    /** Belarusian (Latin) */
    BeLatn = "be-latn",
    /** Bhojpuri-Hindi (Devanagiri) */
    Bho = "bho",
    /** Bislama */
    Bi = "bi",
    /** Bodo (Devanagiri) */
    Brx = "brx",
    /** Bosnian Latin */
    Bs = "bs",
    /** Brajbha */
    Bra = "bra",
    /** Breton */
    Br = "br",
    /** Bulgarian */
    Bg = "bg",
    /** Bundeli */
    Bns = "bns",
    /** Buryat (Cyrillic) */
    Bua = "bua",
    /** Catalan */
    Ca = "ca",
    /** Cebuano */
    Ceb = "ceb",
    /** Chamling */
    Rab = "rab",
    /** Chamorro */
    Ch = "ch",
    /** Chhattisgarhi (Devanagiri) */
    Hne = "hne",
    /** Chinese Simplified */
    ZhHans = "zh-Hans",
    /** Chinese Traditional */
    ZhHant = "zh-Hant",
    /** Cornish */
    Kw = "kw",
    /** Corsican */
    Co = "co",
    /** Crimean Tatar (Latin) */
    Crh = "crh",
    /** Croatian */
    Hr = "hr",
    /** Czech */
    Cs = "cs",
    /** Danish */
    Da = "da",
    /** Dari */
    Prs = "prs",
    /** Dhimal (Devanagiri) */
    Dhi = "dhi",
    /** Dogri (Devanagiri) */
    Doi = "doi",
    /** Dutch */
    Nl = "nl",
    /** English */
    En = "en",
    /** Erzya (Cyrillic) */
    Myv = "myv",
    /** Estonian */
    Et = "et",
    /** Faroese */
    Fo = "fo",
    /** Fijian */
    Fj = "fj",
    /** Filipino */
    Fil = "fil",
    /** Finnish */
    Fi = "fi",
    /** French */
    Fr = "fr",
    /** Frulian */
    Fur = "fur",
    /** Gagauz (Latin) */
    Gag = "gag",
    /** Galician */
    Gl = "gl",
    /** German */
    De = "de",
    /** Gilbertese */
    Gil = "gil",
    /** Gondi (Devanagiri) */
    Gon = "gon",
    /** Greek */
    El = "el",
    /** Greenlandic */
    Kl = "kl",
    /** Gurung (Devanagiri) */
    Gvr = "gvr",
    /** Haitian Creole */
    Ht = "ht",
    /** Halbi (Devanagiri) */
    Hlb = "hlb",
    /** Hani */
    Hni = "hni",
    /** Haryanvi */
    Bgc = "bgc",
    /** Hawaiian */
    Haw = "haw",
    /** Hindi */
    Hi = "hi",
    /** Hmong Daw (Latin) */
    Mww = "mww",
    /** Ho (Devanagiri) */
    Hoc = "hoc",
    /** Hungarian */
    Hu = "hu",
    /** Icelandic */
    Is = "is",
    /** Inari Sami */
    Smn = "smn",
    /** Indonesian */
    Id = "id",
    /** Interlingua */
    Ia = "ia",
    /** Inuktitut (Latin) */
    Iu = "iu",
    /** Irish */
    Ga = "ga",
    /** Italian */
    It = "it",
    /** Japanese */
    Ja = "ja",
    /** Jaunsari (Devanagiri) */
    Jns = "Jns",
    /** Javanese */
    Jv = "jv",
    /** Kabuverdianu */
    Kea = "kea",
    /** Kachin (Latin) */
    Kac = "kac",
    /** Kangri (Devanagiri) */
    Xnr = "xnr",
    /** Karachay-Balkar */
    Krc = "krc",
    /** Kara-Kalpak (Cyrillic) */
    KaaCyrl = "kaa-cyrl",
    /** Kara-Kalpak (Latin) */
    Kaa = "kaa",
    /** Kashubian */
    Csb = "csb",
    /** Kazakh (Cyrillic) */
    KkCyrl = "kk-cyrl",
    /** Kazakh (Latin) */
    KkLatn = "kk-latn",
    /** Khaling */
    Klr = "klr",
    /** Khasi */
    Kha = "kha",
    /** K'iche' */
    Quc = "quc",
    /** Korean */
    Ko = "ko",
    /** Korku */
    Kfq = "kfq",
    /** Koryak */
    Kpy = "kpy",
    /** Kosraean */
    Kos = "kos",
    /** Kumyk (Cyrillic) */
    Kum = "kum",
    /** Kurdish (Arabic) */
    KuArab = "ku-arab",
    /** Kurdish (Latin) */
    KuLatn = "ku-latn",
    /** Kurukh (Devanagiri) */
    Kru = "kru",
    /** Kyrgyz (Cyrillic) */
    Ky = "ky",
    /** Lakota */
    Lkt = "lkt",
    /** Latin */
    La = "la",
    /** Lithuanian */
    Lt = "lt",
    /** Lower Sorbian */
    Dsb = "dsb",
    /** Lule Sami */
    Smj = "smj",
    /** Luxembourgish */
    Lb = "lb",
    /** Mahasu Pahari (Devanagiri) */
    Bfz = "bfz",
    /** Malay (Latin) */
    Ms = "ms",
    /** Maltese */
    Mt = "mt",
    /** Malto (Devanagiri) */
    Kmj = "kmj",
    /** Manx */
    Gv = "gv",
    /** Maori */
    Mi = "mi",
    /** Marathi */
    Mr = "mr",
    /** Mongolian (Cyrillic) */
    Mn = "mn",
    /** Montenegrin (Cyrillic) */
    CnrCyrl = "cnr-cyrl",
    /** Montenegrin (Latin) */
    CnrLatn = "cnr-latn",
    /** Neapolitan */
    Nap = "nap",
    /** Nepali */
    Ne = "ne",
    /** Niuean */
    Niu = "niu",
    /** Nogay */
    Nog = "nog",
    /** Northern Sami (Latin) */
    Sme = "sme",
    /** Norwegian */
    Nb = "nb",
    /** Norwegian */
    No = "no",
    /** Occitan */
    Oc = "oc",
    /** Ossetic */
    Os = "os",
    /** Pashto */
    Ps = "ps",
    /** Persian */
    Fa = "fa",
    /** Polish */
    Pl = "pl",
    /** Portuguese */
    Pt = "pt",
    /** Punjabi (Arabic) */
    Pa = "pa",
    /** Ripuarian */
    Ksh = "ksh",
    /** Romanian */
    Ro = "ro",
    /** Romansh */
    Rm = "rm",
    /** Russian */
    Ru = "ru",
    /** Sadri (Devanagiri) */
    Sck = "sck",
    /** Samoan (Latin) */
    Sm = "sm",
    /** Sanskrit (Devanagiri) */
    Sa = "sa",
    /** Santali (Devanagiri) */
    Sat = "sat",
    /** Scots */
    Sco = "sco",
    /** Scottish Gaelic */
    Gd = "gd",
    /** Serbian (Latin) */
    Sr = "sr",
    /** Serbian (Cyrillic) */
    SrCyrl = "sr-Cyrl",
    /** Serbian (Latin) */
    SrLatn = "sr-Latn",
    /** Sherpa (Devanagiri) */
    Xsr = "xsr",
    /** Sirmauri (Devanagiri) */
    Srx = "srx",
    /** Skolt Sami */
    Sms = "sms",
    /** Slovak */
    Sk = "sk",
    /** Slovenian */
    Sl = "sl",
    /** Somali (Arabic) */
    So = "so",
    /** Southern Sami */
    Sma = "sma",
    /** Spanish */
    Es = "es",
    /** Swahili (Latin) */
    Sw = "sw",
    /** Swedish */
    Sv = "sv",
    /** Tajik (Cyrillic) */
    Tg = "tg",
    /** Tatar (Latin) */
    Tt = "tt",
    /** Tetum */
    Tet = "tet",
    /** Thangmi */
    Thf = "thf",
    /** Tongan */
    To = "to",
    /** Turkish */
    Tr = "tr",
    /** Turkmen (Latin) */
    Tk = "tk",
    /** Tuvan */
    Tyv = "tyv",
    /** Upper Sorbian */
    Hsb = "hsb",
    /** Urdu */
    Ur = "ur",
    /** Uyghur (Arabic) */
    Ug = "ug",
    /** Uzbek (Arabic) */
    UzArab = "uz-arab",
    /** Uzbek (Cyrillic) */
    UzCyrl = "uz-cyrl",
    /** Uzbek (Latin) */
    Uz = "uz",
    /** Volapük */
    Vo = "vo",
    /** Walser */
    Wae = "wae",
    /** Welsh */
    Cy = "cy",
    /** Western Frisian */
    Fy = "fy",
    /** Yucatec Maya */
    Yua = "yua",
    /** Zhuang */
    Za = "za",
    /** Zulu */
    Zu = "zu",
    /** Unknown (All) */
    Unk = "unk"
}

/** Known values of {@link PIIDetectionSkillMaskingMode} that the service accepts. */
export declare enum KnownPIIDetectionSkillMaskingMode {
    /** No masking occurs and the maskedText output will not be returned. */
    None = "none",
    /** Replaces the detected entities with the character given in the maskingCharacter parameter. The character will be repeated to the length of the detected entity so that the offsets will correctly correspond to both the input text as well as the output maskedText. */
    Replace = "replace"
}

/** Known values of {@link RegexFlags} that the service accepts. */
export declare enum KnownRegexFlags {
    /** Enables canonical equivalence. */
    CanonEq = "CANON_EQ",
    /** Enables case-insensitive matching. */
    CaseInsensitive = "CASE_INSENSITIVE",
    /** Permits whitespace and comments in the pattern. */
    Comments = "COMMENTS",
    /** Enables dotall mode. */
    DotAll = "DOTALL",
    /** Enables literal parsing of the pattern. */
    Literal = "LITERAL",
    /** Enables multiline mode. */
    Multiline = "MULTILINE",
    /** Enables Unicode-aware case folding. */
    UnicodeCase = "UNICODE_CASE",
    /** Enables Unix lines mode. */
    UnixLines = "UNIX_LINES"
}

/**
 * Known values for Search Audience
 */
export declare enum KnownSearchAudience {
    /**
     * Audience for Azure China
     */
    AzureChina = "https://search.azure.cn",
    /**
     * Audience for Azure Government
     */
    AzureGovernment = "https://search.azure.us",
    /**
     * Audience for Azure Public
     */
    AzurePublicCloud = "https://search.azure.com"
}

/** Known values of {@link SearchFieldDataType} that the service accepts. */
export declare enum KnownSearchFieldDataType {
    /** Indicates that a field contains a string. */
    String = "Edm.String",
    /** Indicates that a field contains a 32-bit signed integer. */
    Int32 = "Edm.Int32",
    /** Indicates that a field contains a 64-bit signed integer. */
    Int64 = "Edm.Int64",
    /** Indicates that a field contains an IEEE double-precision floating point number. */
    Double = "Edm.Double",
    /** Indicates that a field contains a Boolean value (true or false). */
    Boolean = "Edm.Boolean",
    /** Indicates that a field contains a date\/time value, including timezone information. */
    DateTimeOffset = "Edm.DateTimeOffset",
    /** Indicates that a field contains a geo-location in terms of longitude and latitude. */
    GeographyPoint = "Edm.GeographyPoint",
    /** Indicates that a field contains one or more complex objects that in turn have sub-fields of other types. */
    Complex = "Edm.ComplexType",
    /** Indicates that a field contains a single-precision floating point number. This is only valid when used with Collection(Edm.Single). */
    Single = "Edm.Single",
    /** Indicates that a field contains a half-precision floating point number. This is only valid when used with Collection(Edm.Half). */
    Half = "Edm.Half",
    /** Indicates that a field contains a 16-bit signed integer. This is only valid when used with Collection(Edm.Int16). */
    Int16 = "Edm.Int16",
    /** Indicates that a field contains a 8-bit signed integer. This is only valid when used with Collection(Edm.SByte). */
    SByte = "Edm.SByte",
    /** Indicates that a field contains a 8-bit unsigned integer. This is only valid when used with Collection(Edm.Byte). */
    Byte = "Edm.Byte"
}

/** Known values of {@link SearchIndexerDataSourceType} that the service accepts. */
export declare enum KnownSearchIndexerDataSourceType {
    /** Indicates an Azure SQL datasource. */
    AzureSql = "azuresql",
    /** Indicates a CosmosDB datasource. */
    CosmosDb = "cosmosdb",
    /** Indicates an Azure Blob datasource. */
    AzureBlob = "azureblob",
    /** Indicates an Azure Table datasource. */
    AzureTable = "azuretable",
    /** Indicates a MySql datasource. */
    MySql = "mysql",
    /** Indicates an ADLS Gen2 datasource. */
    AdlsGen2 = "adlsgen2"
}

/** Known values of {@link SemanticErrorMode} that the service accepts. */
export declare enum KnownSemanticErrorMode {
    /** If the semantic processing fails, partial results still return. The definition of partial results depends on what semantic step failed and what was the reason for failure. */
    Partial = "partial",
    /** If there is an exception during the semantic processing step, the query will fail and return the appropriate HTTP code depending on the error. */
    Fail = "fail"
}

/** Known values of {@link SemanticErrorReason} that the service accepts. */
export declare enum KnownSemanticErrorReason {
    /** If `semanticMaxWaitInMilliseconds` was set and the semantic processing duration exceeded that value. Only the base results were returned. */
    MaxWaitExceeded = "maxWaitExceeded",
    /** The request was throttled. Only the base results were returned. */
    CapacityOverloaded = "capacityOverloaded",
    /** At least one step of the semantic process failed. */
    Transient = "transient"
}

/** Known values of {@link SemanticSearchResultsType} that the service accepts. */
export declare enum KnownSemanticSearchResultsType {
    /** Results without any semantic enrichment or reranking. */
    BaseResults = "baseResults",
    /** Results have been reranked with the reranker model and will include semantic captions. They will not include any answers, answers highlights or caption highlights. */
    RerankedResults = "rerankedResults"
}

/** Known values of {@link SentimentSkillLanguage} that the service accepts. */
export declare enum KnownSentimentSkillLanguage {
    /** Danish */
    Da = "da",
    /** Dutch */
    Nl = "nl",
    /** English */
    En = "en",
    /** Finnish */
    Fi = "fi",
    /** French */
    Fr = "fr",
    /** German */
    De = "de",
    /** Greek */
    El = "el",
    /** Italian */
    It = "it",
    /** Norwegian (Bokmaal) */
    No = "no",
    /** Polish */
    Pl = "pl",
    /** Portuguese (Portugal) */
    PtPT = "pt-PT",
    /** Russian */
    Ru = "ru",
    /** Spanish */
    Es = "es",
    /** Swedish */
    Sv = "sv",
    /** Turkish */
    Tr = "tr"
}

/** Known values of {@link SplitSkillLanguage} that the service accepts. */
export declare enum KnownSplitSkillLanguage {
    /** Amharic */
    Am = "am",
    /** Bosnian */
    Bs = "bs",
    /** Czech */
    Cs = "cs",
    /** Danish */
    Da = "da",
    /** German */
    De = "de",
    /** English */
    En = "en",
    /** Spanish */
    Es = "es",
    /** Estonian */
    Et = "et",
    /** Finnish */
    Fi = "fi",
    /** French */
    Fr = "fr",
    /** Hebrew */
    He = "he",
    /** Hindi */
    Hi = "hi",
    /** Croatian */
    Hr = "hr",
    /** Hungarian */
    Hu = "hu",
    /** Indonesian */
    Id = "id",
    /** Icelandic */
    Is = "is",
    /** Italian */
    It = "it",
    /** Japanese */
    Ja = "ja",
    /** Korean */
    Ko = "ko",
    /** Latvian */
    Lv = "lv",
    /** Norwegian */
    Nb = "nb",
    /** Dutch */
    Nl = "nl",
    /** Polish */
    Pl = "pl",
    /** Portuguese (Portugal) */
    Pt = "pt",
    /** Portuguese (Brazil) */
    PtBr = "pt-br",
    /** Russian */
    Ru = "ru",
    /** Slovak */
    Sk = "sk",
    /** Slovenian */
    Sl = "sl",
    /** Serbian */
    Sr = "sr",
    /** Swedish */
    Sv = "sv",
    /** Turkish */
    Tr = "tr",
    /** Urdu */
    Ur = "ur",
    /** Chinese (Simplified) */
    Zh = "zh"
}

/** Known values of {@link TextSplitMode} that the service accepts. */
export declare enum KnownTextSplitMode {
    /** Split the text into individual pages. */
    Pages = "pages",
    /** Split the text into individual sentences. */
    Sentences = "sentences"
}

/** Known values of {@link TextTranslationSkillLanguage} that the service accepts. */
export declare enum KnownTextTranslationSkillLanguage {
    /** Afrikaans */
    Af = "af",
    /** Arabic */
    Ar = "ar",
    /** Bangla */
    Bn = "bn",
    /** Bosnian (Latin) */
    Bs = "bs",
    /** Bulgarian */
    Bg = "bg",
    /** Cantonese (Traditional) */
    Yue = "yue",
    /** Catalan */
    Ca = "ca",
    /** Chinese Simplified */
    ZhHans = "zh-Hans",
    /** Chinese Traditional */
    ZhHant = "zh-Hant",
    /** Croatian */
    Hr = "hr",
    /** Czech */
    Cs = "cs",
    /** Danish */
    Da = "da",
    /** Dutch */
    Nl = "nl",
    /** English */
    En = "en",
    /** Estonian */
    Et = "et",
    /** Fijian */
    Fj = "fj",
    /** Filipino */
    Fil = "fil",
    /** Finnish */
    Fi = "fi",
    /** French */
    Fr = "fr",
    /** German */
    De = "de",
    /** Greek */
    El = "el",
    /** Haitian Creole */
    Ht = "ht",
    /** Hebrew */
    He = "he",
    /** Hindi */
    Hi = "hi",
    /** Hmong Daw */
    Mww = "mww",
    /** Hungarian */
    Hu = "hu",
    /** Icelandic */
    Is = "is",
    /** Indonesian */
    Id = "id",
    /** Italian */
    It = "it",
    /** Japanese */
    Ja = "ja",
    /** Kiswahili */
    Sw = "sw",
    /** Klingon */
    Tlh = "tlh",
    /** Klingon (Latin script) */
    TlhLatn = "tlh-Latn",
    /** Klingon (Klingon script) */
    TlhPiqd = "tlh-Piqd",
    /** Korean */
    Ko = "ko",
    /** Latvian */
    Lv = "lv",
    /** Lithuanian */
    Lt = "lt",
    /** Malagasy */
    Mg = "mg",
    /** Malay */
    Ms = "ms",
    /** Maltese */
    Mt = "mt",
    /** Norwegian */
    Nb = "nb",
    /** Persian */
    Fa = "fa",
    /** Polish */
    Pl = "pl",
    /** Portuguese */
    Pt = "pt",
    /** Portuguese (Brazil) */
    PtBr = "pt-br",
    /** Portuguese (Portugal) */
    PtPT = "pt-PT",
    /** Queretaro Otomi */
    Otq = "otq",
    /** Romanian */
    Ro = "ro",
    /** Russian */
    Ru = "ru",
    /** Samoan */
    Sm = "sm",
    /** Serbian (Cyrillic) */
    SrCyrl = "sr-Cyrl",
    /** Serbian (Latin) */
    SrLatn = "sr-Latn",
    /** Slovak */
    Sk = "sk",
    /** Slovenian */
    Sl = "sl",
    /** Spanish */
    Es = "es",
    /** Swedish */
    Sv = "sv",
    /** Tahitian */
    Ty = "ty",
    /** Tamil */
    Ta = "ta",
    /** Telugu */
    Te = "te",
    /** Thai */
    Th = "th",
    /** Tongan */
    To = "to",
    /** Turkish */
    Tr = "tr",
    /** Ukrainian */
    Uk = "uk",
    /** Urdu */
    Ur = "ur",
    /** Vietnamese */
    Vi = "vi",
    /** Welsh */
    Cy = "cy",
    /** Yucatec Maya */
    Yua = "yua",
    /** Irish */
    Ga = "ga",
    /** Kannada */
    Kn = "kn",
    /** Maori */
    Mi = "mi",
    /** Malayalam */
    Ml = "ml",
    /** Punjabi */
    Pa = "pa"
}

/** Known values of {@link TokenFilterName} that the service accepts. */
export declare enum KnownTokenFilterNames {
    /** A token filter that applies the Arabic normalizer to normalize the orthography. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/ar\/ArabicNormalizationFilter.html */
    ArabicNormalization = "arabic_normalization",
    /** Strips all characters after an apostrophe (including the apostrophe itself). See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/tr\/ApostropheFilter.html */
    Apostrophe = "apostrophe",
    /** Converts alphabetic, numeric, and symbolic Unicode characters which are not in the first 127 ASCII characters (the "Basic Latin" Unicode block) into their ASCII equivalents, if such equivalents exist. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/miscellaneous\/ASCIIFoldingFilter.html */
    AsciiFolding = "asciifolding",
    /** Forms bigrams of CJK terms that are generated from the standard tokenizer. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/cjk\/CJKBigramFilter.html */
    CjkBigram = "cjk_bigram",
    /** Normalizes CJK width differences. Folds fullwidth ASCII variants into the equivalent basic Latin, and half-width Katakana variants into the equivalent Kana. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/cjk\/CJKWidthFilter.html */
    CjkWidth = "cjk_width",
    /** Removes English possessives, and dots from acronyms. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/standard\/ClassicFilter.html */
    Classic = "classic",
    /** Construct bigrams for frequently occurring terms while indexing. Single terms are still indexed too, with bigrams overlaid. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/commongrams\/CommonGramsFilter.html */
    CommonGram = "common_grams",
    /** Generates n-grams of the given size(s) starting from the front or the back of an input token. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/ngram\/EdgeNGramTokenFilter.html */
    EdgeNGram = "edgeNGram_v2",
    /** Removes elisions. For example, "l'avion" (the plane) will be converted to "avion" (plane). See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/util\/ElisionFilter.html */
    Elision = "elision",
    /** Normalizes German characters according to the heuristics of the German2 snowball algorithm. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/de\/GermanNormalizationFilter.html */
    GermanNormalization = "german_normalization",
    /** Normalizes text in Hindi to remove some differences in spelling variations. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/hi\/HindiNormalizationFilter.html */
    HindiNormalization = "hindi_normalization",
    /** Normalizes the Unicode representation of text in Indian languages. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/in\/IndicNormalizationFilter.html */
    IndicNormalization = "indic_normalization",
    /** Emits each incoming token twice, once as keyword and once as non-keyword. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/miscellaneous\/KeywordRepeatFilter.html */
    KeywordRepeat = "keyword_repeat",
    /** A high-performance kstem filter for English. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/en\/KStemFilter.html */
    KStem = "kstem",
    /** Removes words that are too long or too short. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/miscellaneous\/LengthFilter.html */
    Length = "length",
    /** Limits the number of tokens while indexing. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/miscellaneous\/LimitTokenCountFilter.html */
    Limit = "limit",
    /** Normalizes token text to lower case. See https:\//lucene.apache.org\/core\/6_6_1\/analyzers-common\/org\/apache\/lucene\/analysis\/core\/LowerCaseFilter.html */
    Lowercase = "lowercase",
    /** Generates n-grams of the given size(s). See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/ngram\/NGramTokenFilter.html */
    NGram = "nGram_v2",
    /** Applies normalization for Persian. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/fa\/PersianNormalizationFilter.html */
    PersianNormalization = "persian_normalization",
    /** Create tokens for phonetic matches. See https:\//lucene.apache.org\/core\/4_10_3\/analyzers-phonetic\/org\/apache\/lucene\/analysis\/phonetic\/package-tree.html */
    Phonetic = "phonetic",
    /** Uses the Porter stemming algorithm to transform the token stream. See http:\//tartarus.org\/~martin\/PorterStemmer */
    PorterStem = "porter_stem",
    /** Reverses the token string. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/reverse\/ReverseStringFilter.html */
    Reverse = "reverse",
    /** Normalizes use of the interchangeable Scandinavian characters. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/miscellaneous\/ScandinavianNormalizationFilter.html */
    ScandinavianNormalization = "scandinavian_normalization",
    /** Folds Scandinavian characters åÅäæÄÆ-&gt;a and öÖøØ-&gt;o. It also discriminates against use of double vowels aa, ae, ao, oe and oo, leaving just the first one. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/miscellaneous\/ScandinavianFoldingFilter.html */
    ScandinavianFoldingNormalization = "scandinavian_folding",
    /** Creates combinations of tokens as a single token. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/shingle\/ShingleFilter.html */
    Shingle = "shingle",
    /** A filter that stems words using a Snowball-generated stemmer. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/snowball\/SnowballFilter.html */
    Snowball = "snowball",
    /** Normalizes the Unicode representation of Sorani text. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/ckb\/SoraniNormalizationFilter.html */
    SoraniNormalization = "sorani_normalization",
    /** Language specific stemming filter. See https:\//learn.microsoft.com\/rest\/api\/searchservice\/Custom-analyzers-in-Azure-Search#TokenFilters */
    Stemmer = "stemmer",
    /** Removes stop words from a token stream. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/core\/StopFilter.html */
    Stopwords = "stopwords",
    /** Trims leading and trailing whitespace from tokens. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/miscellaneous\/TrimFilter.html */
    Trim = "trim",
    /** Truncates the terms to a specific length. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/miscellaneous\/TruncateTokenFilter.html */
    Truncate = "truncate",
    /** Filters out tokens with same text as the previous token. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/miscellaneous\/RemoveDuplicatesTokenFilter.html */
    Unique = "unique",
    /** Normalizes token text to upper case. See https:\//lucene.apache.org\/core\/6_6_1\/analyzers-common\/org\/apache\/lucene\/analysis\/core\/UpperCaseFilter.html */
    Uppercase = "uppercase",
    /** Splits words into subwords and performs optional transformations on subword groups. */
    WordDelimiter = "word_delimiter"
}

/** Known values of {@link LexicalTokenizerName} that the service accepts. */
export declare enum KnownTokenizerNames {
    /** Grammar-based tokenizer that is suitable for processing most European-language documents. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/standard\/ClassicTokenizer.html */
    Classic = "classic",
    /** Tokenizes the input from an edge into n-grams of the given size(s). See https:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/ngram\/EdgeNGramTokenizer.html */
    EdgeNGram = "edgeNGram",
    /** Emits the entire input as a single token. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/core\/KeywordTokenizer.html */
    Keyword = "keyword_v2",
    /** Divides text at non-letters. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/core\/LetterTokenizer.html */
    Letter = "letter",
    /** Divides text at non-letters and converts them to lower case. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/core\/LowerCaseTokenizer.html */
    Lowercase = "lowercase",
    /** Divides text using language-specific rules. */
    MicrosoftLanguageTokenizer = "microsoft_language_tokenizer",
    /** Divides text using language-specific rules and reduces words to their base forms. */
    MicrosoftLanguageStemmingTokenizer = "microsoft_language_stemming_tokenizer",
    /** Tokenizes the input into n-grams of the given size(s). See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/ngram\/NGramTokenizer.html */
    NGram = "nGram",
    /** Tokenizer for path-like hierarchies. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/path\/PathHierarchyTokenizer.html */
    PathHierarchy = "path_hierarchy_v2",
    /** Tokenizer that uses regex pattern matching to construct distinct tokens. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/pattern\/PatternTokenizer.html */
    Pattern = "pattern",
    /** Standard Lucene analyzer; Composed of the standard tokenizer, lowercase filter and stop filter. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/standard\/StandardTokenizer.html */
    Standard = "standard_v2",
    /** Tokenizes urls and emails as one token. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/standard\/UAX29URLEmailTokenizer.html */
    UaxUrlEmail = "uax_url_email",
    /** Divides text at whitespace. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/core\/WhitespaceTokenizer.html */
    Whitespace = "whitespace"
}

/** Known values of {@link VectorEncodingFormat} that the service accepts. */
export declare enum KnownVectorEncodingFormat {
    /** Encoding format representing bits packed into a wider data type. */
    PackedBit = "packedBit"
}

/** Known values of {@link VectorFilterMode} that the service accepts. */
export declare enum KnownVectorFilterMode {
    /** The filter will be applied after the candidate set of vector results is returned. Depending on the filter selectivity, this can result in fewer results than requested by the parameter 'k'. */
    PostFilter = "postFilter",
    /** The filter will be applied before the search query. */
    PreFilter = "preFilter"
}

/** Known values of {@link VectorQueryKind} that the service accepts. */
export declare enum KnownVectorQueryKind {
    /** Vector query where a raw vector value is provided. */
    Vector = "vector",
    /** Vector query where a text value that needs to be vectorized is provided. */
    Text = "text"
}

/** Known values of {@link VectorSearchAlgorithmKind} that the service accepts. */
export declare enum KnownVectorSearchAlgorithmKind {
    /** HNSW (Hierarchical Navigable Small World), a type of approximate nearest neighbors algorithm. */
    Hnsw = "hnsw",
    /** Exhaustive KNN algorithm which will perform brute-force search. */
    ExhaustiveKnn = "exhaustiveKnn"
}

/** Known values of {@link VectorSearchAlgorithmMetric} that the service accepts. */
export declare enum KnownVectorSearchAlgorithmMetric {
    /** Measures the angle between vectors to quantify their similarity, disregarding magnitude. The smaller the angle, the closer the similarity. */
    Cosine = "cosine",
    /** Computes the straight-line distance between vectors in a multi-dimensional space. The smaller the distance, the closer the similarity. */
    Euclidean = "euclidean",
    /** Calculates the sum of element-wise products to gauge alignment and magnitude similarity. The larger and more positive, the closer the similarity. */
    DotProduct = "dotProduct",
    /** Only applicable to bit-packed binary data types. Determines dissimilarity by counting differing positions in binary vectors. The fewer differences, the closer the similarity. */
    Hamming = "hamming"
}

/** Known values of {@link VectorSearchCompressionKind} that the service accepts. */
export declare enum KnownVectorSearchCompressionKind {
    /** Scalar Quantization, a type of compression method. In scalar quantization, the original vectors values are compressed to a narrower type by discretizing and representing each component of a vector using a reduced set of quantized values, thereby reducing the overall data size. */
    ScalarQuantization = "scalarQuantization",
    /** Binary Quantization, a type of compression method. In binary quantization, the original vectors values are compressed to the narrower binary type by discretizing and representing each component of a vector using binary values, thereby reducing the overall data size. */
    BinaryQuantization = "binaryQuantization"
}

/** Known values of {@link VectorSearchCompressionTarget} that the service accepts. */
export declare enum KnownVectorSearchCompressionTarget {
    /** Int8 */
    Int8 = "int8"
}

/** Known values of {@link VectorSearchVectorizerKind} that the service accepts. */
export declare enum KnownVectorSearchVectorizerKind {
    /** Generate embeddings using an Azure OpenAI resource at query time. */
    AzureOpenAI = "azureOpenAI",
    /** Generate embeddings using a custom web endpoint at query time. */
    CustomWebApi = "customWebApi"
}

/** Known values of {@link VisualFeature} that the service accepts. */
export declare enum KnownVisualFeature {
    /** Visual features recognized as adult persons. */
    Adult = "adult",
    /** Visual features recognized as commercial brands. */
    Brands = "brands",
    /** Categories. */
    Categories = "categories",
    /** Description. */
    Description = "description",
    /** Visual features recognized as people faces. */
    Faces = "faces",
    /** Visual features recognized as objects. */
    Objects = "objects",
    /** Tags. */
    Tags = "tags"
}

/** A skill that detects the language of input text and reports a single language code for every document submitted on the request. The language code is paired with a score indicating the confidence of the analysis. */
export declare interface LanguageDetectionSkill extends BaseSearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Text.LanguageDetectionSkill";
    /** A country code to use as a hint to the language detection model if it cannot disambiguate the language. */
    defaultCountryHint?: string;
    /** The version of the model to use when calling the Text Analytics service. It will default to the latest available when not specified. We recommend you do not specify this value unless absolutely necessary. */
    modelVersion?: string;
}

/** Removes words that are too long or too short. This token filter is implemented using Apache Lucene. */
export declare interface LengthTokenFilter extends BaseTokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.LengthTokenFilter";
    /** The minimum length in characters. Default is 0. Maximum is 300. Must be less than the value of max. */
    minLength?: number;
    /** The maximum length in characters. Default and maximum is 300. */
    maxLength?: number;
}

/**
 * Contains the possible cases for Analyzer.
 */
export declare type LexicalAnalyzer = CustomAnalyzer | PatternAnalyzer | LuceneStandardAnalyzer | StopAnalyzer;

/**
 * Defines values for LexicalAnalyzerName. \
 * {@link KnownLexicalAnalyzerName} can be used interchangeably with LexicalAnalyzerName,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **ar.microsoft**: Microsoft analyzer for Arabic. \
 * **ar.lucene**: Lucene analyzer for Arabic. \
 * **hy.lucene**: Lucene analyzer for Armenian. \
 * **bn.microsoft**: Microsoft analyzer for Bangla. \
 * **eu.lucene**: Lucene analyzer for Basque. \
 * **bg.microsoft**: Microsoft analyzer for Bulgarian. \
 * **bg.lucene**: Lucene analyzer for Bulgarian. \
 * **ca.microsoft**: Microsoft analyzer for Catalan. \
 * **ca.lucene**: Lucene analyzer for Catalan. \
 * **zh-Hans.microsoft**: Microsoft analyzer for Chinese (Simplified). \
 * **zh-Hans.lucene**: Lucene analyzer for Chinese (Simplified). \
 * **zh-Hant.microsoft**: Microsoft analyzer for Chinese (Traditional). \
 * **zh-Hant.lucene**: Lucene analyzer for Chinese (Traditional). \
 * **hr.microsoft**: Microsoft analyzer for Croatian. \
 * **cs.microsoft**: Microsoft analyzer for Czech. \
 * **cs.lucene**: Lucene analyzer for Czech. \
 * **da.microsoft**: Microsoft analyzer for Danish. \
 * **da.lucene**: Lucene analyzer for Danish. \
 * **nl.microsoft**: Microsoft analyzer for Dutch. \
 * **nl.lucene**: Lucene analyzer for Dutch. \
 * **en.microsoft**: Microsoft analyzer for English. \
 * **en.lucene**: Lucene analyzer for English. \
 * **et.microsoft**: Microsoft analyzer for Estonian. \
 * **fi.microsoft**: Microsoft analyzer for Finnish. \
 * **fi.lucene**: Lucene analyzer for Finnish. \
 * **fr.microsoft**: Microsoft analyzer for French. \
 * **fr.lucene**: Lucene analyzer for French. \
 * **gl.lucene**: Lucene analyzer for Galician. \
 * **de.microsoft**: Microsoft analyzer for German. \
 * **de.lucene**: Lucene analyzer for German. \
 * **el.microsoft**: Microsoft analyzer for Greek. \
 * **el.lucene**: Lucene analyzer for Greek. \
 * **gu.microsoft**: Microsoft analyzer for Gujarati. \
 * **he.microsoft**: Microsoft analyzer for Hebrew. \
 * **hi.microsoft**: Microsoft analyzer for Hindi. \
 * **hi.lucene**: Lucene analyzer for Hindi. \
 * **hu.microsoft**: Microsoft analyzer for Hungarian. \
 * **hu.lucene**: Lucene analyzer for Hungarian. \
 * **is.microsoft**: Microsoft analyzer for Icelandic. \
 * **id.microsoft**: Microsoft analyzer for Indonesian (Bahasa). \
 * **id.lucene**: Lucene analyzer for Indonesian. \
 * **ga.lucene**: Lucene analyzer for Irish. \
 * **it.microsoft**: Microsoft analyzer for Italian. \
 * **it.lucene**: Lucene analyzer for Italian. \
 * **ja.microsoft**: Microsoft analyzer for Japanese. \
 * **ja.lucene**: Lucene analyzer for Japanese. \
 * **kn.microsoft**: Microsoft analyzer for Kannada. \
 * **ko.microsoft**: Microsoft analyzer for Korean. \
 * **ko.lucene**: Lucene analyzer for Korean. \
 * **lv.microsoft**: Microsoft analyzer for Latvian. \
 * **lv.lucene**: Lucene analyzer for Latvian. \
 * **lt.microsoft**: Microsoft analyzer for Lithuanian. \
 * **ml.microsoft**: Microsoft analyzer for Malayalam. \
 * **ms.microsoft**: Microsoft analyzer for Malay (Latin). \
 * **mr.microsoft**: Microsoft analyzer for Marathi. \
 * **nb.microsoft**: Microsoft analyzer for Norwegian (Bokmål). \
 * **no.lucene**: Lucene analyzer for Norwegian. \
 * **fa.lucene**: Lucene analyzer for Persian. \
 * **pl.microsoft**: Microsoft analyzer for Polish. \
 * **pl.lucene**: Lucene analyzer for Polish. \
 * **pt-BR.microsoft**: Microsoft analyzer for Portuguese (Brazil). \
 * **pt-BR.lucene**: Lucene analyzer for Portuguese (Brazil). \
 * **pt-PT.microsoft**: Microsoft analyzer for Portuguese (Portugal). \
 * **pt-PT.lucene**: Lucene analyzer for Portuguese (Portugal). \
 * **pa.microsoft**: Microsoft analyzer for Punjabi. \
 * **ro.microsoft**: Microsoft analyzer for Romanian. \
 * **ro.lucene**: Lucene analyzer for Romanian. \
 * **ru.microsoft**: Microsoft analyzer for Russian. \
 * **ru.lucene**: Lucene analyzer for Russian. \
 * **sr-cyrillic.microsoft**: Microsoft analyzer for Serbian (Cyrillic). \
 * **sr-latin.microsoft**: Microsoft analyzer for Serbian (Latin). \
 * **sk.microsoft**: Microsoft analyzer for Slovak. \
 * **sl.microsoft**: Microsoft analyzer for Slovenian. \
 * **es.microsoft**: Microsoft analyzer for Spanish. \
 * **es.lucene**: Lucene analyzer for Spanish. \
 * **sv.microsoft**: Microsoft analyzer for Swedish. \
 * **sv.lucene**: Lucene analyzer for Swedish. \
 * **ta.microsoft**: Microsoft analyzer for Tamil. \
 * **te.microsoft**: Microsoft analyzer for Telugu. \
 * **th.microsoft**: Microsoft analyzer for Thai. \
 * **th.lucene**: Lucene analyzer for Thai. \
 * **tr.microsoft**: Microsoft analyzer for Turkish. \
 * **tr.lucene**: Lucene analyzer for Turkish. \
 * **uk.microsoft**: Microsoft analyzer for Ukrainian. \
 * **ur.microsoft**: Microsoft analyzer for Urdu. \
 * **vi.microsoft**: Microsoft analyzer for Vietnamese. \
 * **standard.lucene**: Standard Lucene analyzer. \
 * **standardasciifolding.lucene**: Standard ASCII Folding Lucene analyzer. See https:\/\/learn.microsoft.com\/rest\/api\/searchservice\/Custom-analyzers-in-Azure-Search#Analyzers \
 * **keyword**: Treats the entire content of a field as a single token. This is useful for data like zip codes, ids, and some product names. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/core\/KeywordAnalyzer.html \
 * **pattern**: Flexibly separates text into terms via a regular expression pattern. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/miscellaneous\/PatternAnalyzer.html \
 * **simple**: Divides text at non-letters and converts them to lower case. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/core\/SimpleAnalyzer.html \
 * **stop**: Divides text at non-letters; Applies the lowercase and stopword token filters. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/core\/StopAnalyzer.html \
 * **whitespace**: An analyzer that uses the whitespace tokenizer. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/core\/WhitespaceAnalyzer.html
 */
export declare type LexicalAnalyzerName = string;

/**
 * Contains the possible cases for Tokenizer.
 */
export declare type LexicalTokenizer = ClassicTokenizer | EdgeNGramTokenizer | KeywordTokenizer | MicrosoftLanguageTokenizer | MicrosoftLanguageStemmingTokenizer | NGramTokenizer | PathHierarchyTokenizer | PatternTokenizer | LuceneStandardTokenizer | UaxUrlEmailTokenizer;

/**
 * Defines values for LexicalTokenizerName. \
 * {@link KnownLexicalTokenizerName} can be used interchangeably with LexicalTokenizerName,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **classic**: Grammar-based tokenizer that is suitable for processing most European-language documents. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/standard\/ClassicTokenizer.html \
 * **edgeNGram**: Tokenizes the input from an edge into n-grams of the given size(s). See https:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/ngram\/EdgeNGramTokenizer.html \
 * **keyword_v2**: Emits the entire input as a single token. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/core\/KeywordTokenizer.html \
 * **letter**: Divides text at non-letters. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/core\/LetterTokenizer.html \
 * **lowercase**: Divides text at non-letters and converts them to lower case. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/core\/LowerCaseTokenizer.html \
 * **microsoft_language_tokenizer**: Divides text using language-specific rules. \
 * **microsoft_language_stemming_tokenizer**: Divides text using language-specific rules and reduces words to their base forms. \
 * **nGram**: Tokenizes the input into n-grams of the given size(s). See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/ngram\/NGramTokenizer.html \
 * **path_hierarchy_v2**: Tokenizer for path-like hierarchies. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/path\/PathHierarchyTokenizer.html \
 * **pattern**: Tokenizer that uses regex pattern matching to construct distinct tokens. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/pattern\/PatternTokenizer.html \
 * **standard_v2**: Standard Lucene analyzer; Composed of the standard tokenizer, lowercase filter and stop filter. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/standard\/StandardTokenizer.html \
 * **uax_url_email**: Tokenizes urls and emails as one token. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/standard\/UAX29URLEmailTokenizer.html \
 * **whitespace**: Divides text at whitespace. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/core\/WhitespaceTokenizer.html
 */
export declare type LexicalTokenizerName = string;

/** Limits the number of tokens while indexing. This token filter is implemented using Apache Lucene. */
export declare interface LimitTokenFilter extends BaseTokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.LimitTokenFilter";
    /** The maximum number of tokens to produce. Default is 1. */
    maxTokenCount?: number;
    /** A value indicating whether all tokens from the input must be consumed even if maxTokenCount is reached. Default is false. */
    consumeAllTokens?: boolean;
}

/**
 * Options for a list data sources operation.
 */
export declare type ListDataSourceConnectionsOptions = OperationOptions;

/**
 * Options for a list indexers operation.
 */
export declare type ListIndexersOptions = OperationOptions;

/**
 * Options for a list indexes operation.
 */
export declare type ListIndexesOptions = OperationOptions;

/**
 * Arguments for retrieving the next page of search results.
 */
export declare interface ListSearchResultsPageSettings {
    /**
     * A token used for retrieving the next page of results when the server
     * enforces pagination.
     */
    continuationToken?: string;
}

/**
 * Options for a list skillsets operation.
 */
export declare type ListSkillsetsOptions = OperationOptions;

/**
 * Options for a list synonymMaps operation.
 */
export declare type ListSynonymMapsOptions = OperationOptions;

/** Standard Apache Lucene analyzer; Composed of the standard tokenizer, lowercase filter and stop filter. */
export declare interface LuceneStandardAnalyzer extends BaseLexicalAnalyzer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.StandardAnalyzer";
    /** The maximum token length. Default is 255. Tokens longer than the maximum length are split. The maximum token length that can be used is 300 characters. */
    maxTokenLength?: number;
    /** A list of stopwords. */
    stopwords?: string[];
}

/**
 * Breaks text following the Unicode Text Segmentation rules. This tokenizer is implemented using
 * Apache Lucene.
 */
export declare interface LuceneStandardTokenizer {
    /**
     * Polymorphic Discriminator
     */
    odatatype: "#Microsoft.Azure.Search.StandardTokenizerV2" | "#Microsoft.Azure.Search.StandardTokenizer";
    /**
     * The name of the tokenizer. It must only contain letters, digits, spaces, dashes or
     * underscores, can only start and end with alphanumeric characters, and is limited to 128
     * characters.
     */
    name: string;
    /**
     * The maximum token length. Default is 255. Tokens longer than the maximum length are split. The
     * maximum token length that can be used is 300 characters. Default value: 255.
     */
    maxTokenLength?: number;
}

/** Defines a function that boosts scores based on the magnitude of a numeric field. */
export declare interface MagnitudeScoringFunction extends BaseScoringFunction {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    type: "magnitude";
    /** Parameter values for the magnitude scoring function. */
    parameters: MagnitudeScoringParameters;
}

/** Provides parameter values to a magnitude scoring function. */
export declare interface MagnitudeScoringParameters {
    /** The field value at which boosting starts. */
    boostingRangeStart: number;
    /** The field value at which boosting ends. */
    boostingRangeEnd: number;
    /** A value indicating whether to apply a constant boost for field values beyond the range end value; default is false. */
    shouldBoostBeyondRangeByConstant?: boolean;
}

/** A character filter that applies mappings defined with the mappings option. Matching is greedy (longest pattern matching at a given point wins). Replacement is allowed to be the empty string. This character filter is implemented using Apache Lucene. */
export declare interface MappingCharFilter extends BaseCharFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.MappingCharFilter";
    /** A list of mappings of the following format: "a=>b" (all occurrences of the character "a" will be replaced with character "b"). */
    mappings: string[];
}

/**
 * Options for the merge documents operation.
 */
export declare type MergeDocumentsOptions = IndexDocumentsOptions;

/**
 * Options for the merge or upload documents operation.
 */
export declare type MergeOrUploadDocumentsOptions = IndexDocumentsOptions;

/** A skill for merging two or more strings into a single unified string, with an optional user-defined delimiter separating each component part. */
export declare interface MergeSkill extends BaseSearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Text.MergeSkill";
    /** The tag indicates the start of the merged text. By default, the tag is an empty space. */
    insertPreTag?: string;
    /** The tag indicates the end of the merged text. By default, the tag is an empty space. */
    insertPostTag?: string;
}

/** Divides text using language-specific rules and reduces words to their base forms. */
export declare interface MicrosoftLanguageStemmingTokenizer extends BaseLexicalTokenizer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.MicrosoftLanguageStemmingTokenizer";
    /** The maximum token length. Tokens longer than the maximum length are split. Maximum token length that can be used is 300 characters. Tokens longer than 300 characters are first split into tokens of length 300 and then each of those tokens is split based on the max token length set. Default is 255. */
    maxTokenLength?: number;
    /** A value indicating how the tokenizer is used. Set to true if used as the search tokenizer, set to false if used as the indexing tokenizer. Default is false. */
    isSearchTokenizer?: boolean;
    /** The language to use. The default is English. */
    language?: MicrosoftStemmingTokenizerLanguage;
}

/** Divides text using language-specific rules. */
export declare interface MicrosoftLanguageTokenizer extends BaseLexicalTokenizer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.MicrosoftLanguageTokenizer";
    /** The maximum token length. Tokens longer than the maximum length are split. Maximum token length that can be used is 300 characters. Tokens longer than 300 characters are first split into tokens of length 300 and then each of those tokens is split based on the max token length set. Default is 255. */
    maxTokenLength?: number;
    /** A value indicating how the tokenizer is used. Set to true if used as the search tokenizer, set to false if used as the indexing tokenizer. Default is false. */
    isSearchTokenizer?: boolean;
    /** The language to use. The default is English. */
    language?: MicrosoftTokenizerLanguage;
}

/** Defines values for MicrosoftStemmingTokenizerLanguage. */
export declare type MicrosoftStemmingTokenizerLanguage = "arabic" | "bangla" | "bulgarian" | "catalan" | "croatian" | "czech" | "danish" | "dutch" | "english" | "estonian" | "finnish" | "french" | "german" | "greek" | "gujarati" | "hebrew" | "hindi" | "hungarian" | "icelandic" | "indonesian" | "italian" | "kannada" | "latvian" | "lithuanian" | "malay" | "malayalam" | "marathi" | "norwegianBokmaal" | "polish" | "portuguese" | "portugueseBrazilian" | "punjabi" | "romanian" | "russian" | "serbianCyrillic" | "serbianLatin" | "slovak" | "slovenian" | "spanish" | "swedish" | "tamil" | "telugu" | "turkish" | "ukrainian" | "urdu";

/** Defines values for MicrosoftTokenizerLanguage. */
export declare type MicrosoftTokenizerLanguage = "bangla" | "bulgarian" | "catalan" | "chineseSimplified" | "chineseTraditional" | "croatian" | "czech" | "danish" | "dutch" | "english" | "french" | "german" | "greek" | "gujarati" | "hindi" | "icelandic" | "indonesian" | "italian" | "japanese" | "kannada" | "korean" | "malay" | "malayalam" | "marathi" | "norwegianBokmaal" | "polish" | "portuguese" | "portugueseBrazilian" | "punjabi" | "romanian" | "russian" | "serbianCyrillic" | "serbianLatin" | "slovenian" | "spanish" | "swedish" | "tamil" | "telugu" | "thai" | "ukrainian" | "urdu" | "vietnamese";

/**
 * Narrows the Model type to include only the selected Fields
 */
export declare type NarrowedModel<TModel extends object, TFields extends SelectFields<TModel> = SelectFields<TModel>> = (<T>() => T extends TModel ? true : false) extends <T>() => T extends never ? true : false ? TModel : (<T>() => T extends TModel ? true : false) extends <T>() => T extends object ? true : false ? TModel : (<T>() => T extends TModel ? true : false) extends <T>() => T extends any ? true : false ? TModel : (<T>() => T extends TModel ? true : false) extends <T>() => T extends unknown ? true : false ? TModel : (<T>() => T extends TFields ? true : false) extends <T>() => T extends never ? true : false ? never : (<T>() => T extends TFields ? true : false) extends <T>() => T extends SelectFields<TModel> ? true : false ? TModel : SearchPick<TModel, TFields>;

/**
 * Generates n-grams of the given size(s). This token filter is implemented using Apache Lucene.
 */
export declare interface NGramTokenFilter {
    /**
     * Polymorphic Discriminator
     */
    odatatype: "#Microsoft.Azure.Search.NGramTokenFilterV2" | "#Microsoft.Azure.Search.NGramTokenFilter";
    /**
     * The name of the token filter. It must only contain letters, digits, spaces, dashes or
     * underscores, can only start and end with alphanumeric characters, and is limited to 128
     * characters.
     */
    name: string;
    /**
     * The minimum n-gram length. Default is 1. Maximum is 300. Must be less than the value of
     * maxGram. Default value: 1.
     */
    minGram?: number;
    /**
     * The maximum n-gram length. Default is 2. Maximum is 300. Default value: 2.
     */
    maxGram?: number;
}

/** Tokenizes the input into n-grams of the given size(s). This tokenizer is implemented using Apache Lucene. */
export declare interface NGramTokenizer extends BaseLexicalTokenizer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.NGramTokenizer";
    /** The minimum n-gram length. Default is 1. Maximum is 300. Must be less than the value of maxGram. */
    minGram?: number;
    /** The maximum n-gram length. Default is 2. Maximum is 300. */
    maxGram?: number;
    /** Character classes to keep in the tokens. */
    tokenChars?: TokenCharacterKind[];
}

/**
 * Defines values for OcrLineEnding. \
 * {@link KnownOcrLineEnding} can be used interchangeably with OcrLineEnding,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **space**: Lines are separated by a single space character. \
 * **carriageReturn**: Lines are separated by a carriage return ('\r') character. \
 * **lineFeed**: Lines are separated by a single line feed ('\n') character. \
 * **carriageReturnLineFeed**: Lines are separated by a carriage return and a line feed ('\r\n') character.
 */
export declare type OcrLineEnding = string;

/** A skill that extracts text from image files. */
export declare interface OcrSkill extends BaseSearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Vision.OcrSkill";
    /** A value indicating which language code to use. Default is en. */
    defaultLanguageCode?: OcrSkillLanguage;
    /** A value indicating to turn orientation detection on or not. Default is false. */
    shouldDetectOrientation?: boolean;
}

export declare type OcrSkillLanguage = `${KnownOcrSkillLanguage}`;

/**
 * Escapes an odata filter expression to avoid errors with quoting string literals.
 * Example usage:
 * ```ts
 * const baseRateMax = 200;
 * const ratingMin = 4;
 * const filter = odata`Rooms/any(room: room/BaseRate lt ${baseRateMax}) and Rating ge ${ratingMin}`;
 * ```
 * For more information on supported syntax see: https://docs.microsoft.com/en-us/azure/search/search-query-odata-filter
 * @param strings - Array of strings for the expression
 * @param values - Array of values for the expression
 */
export declare function odata(strings: TemplateStringsArray, ...values: unknown[]): string;

/** Output field mapping for a skill. */
export declare interface OutputFieldMappingEntry {
    /** The name of the output defined by the skill. */
    name: string;
    /** The target name of the output. It is optional and default to name. */
    targetName?: string;
}

/** Tokenizer for path-like hierarchies. This tokenizer is implemented using Apache Lucene. */
export declare interface PathHierarchyTokenizer extends BaseLexicalTokenizer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.PathHierarchyTokenizerV2";
    /** The delimiter character to use. Default is "/". */
    delimiter?: string;
    /** A value that, if set, replaces the delimiter character. Default is "/". */
    replacement?: string;
    /** The maximum token length. Default and maximum is 300. */
    maxTokenLength?: number;
    /** A value indicating whether to generate tokens in reverse order. Default is false. */
    reverseTokenOrder?: boolean;
    /** The number of initial tokens to skip. Default is 0. */
    numberOfTokensToSkip?: number;
}

/**
 * Flexibly separates text into terms via a regular expression pattern. This analyzer is
 * implemented using Apache Lucene.
 */
export declare interface PatternAnalyzer {
    /**
     * Polymorphic Discriminator
     */
    odatatype: "#Microsoft.Azure.Search.PatternAnalyzer";
    /**
     * The name of the analyzer. It must only contain letters, digits, spaces, dashes or underscores,
     * can only start and end with alphanumeric characters, and is limited to 128 characters.
     */
    name: string;
    /**
     * A value indicating whether terms should be lower-cased. Default is true. Default value: true.
     */
    lowerCaseTerms?: boolean;
    /**
     * A regular expression pattern to match token separators. Default is an expression that matches
     * one or more whitespace characters. Default value: `\W+`.
     */
    pattern?: string;
    /**
     * Regular expression flags. Possible values include: 'CANON_EQ', 'CASE_INSENSITIVE', 'COMMENTS',
     * 'DOTALL', 'LITERAL', 'MULTILINE', 'UNICODE_CASE', 'UNIX_LINES'
     */
    flags?: RegexFlags[];
    /**
     * A list of stopwords.
     */
    stopwords?: string[];
}

/** Uses Java regexes to emit multiple tokens - one for each capture group in one or more patterns. This token filter is implemented using Apache Lucene. */
export declare interface PatternCaptureTokenFilter extends BaseTokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.PatternCaptureTokenFilter";
    /** A list of patterns to match against each token. */
    patterns: string[];
    /** A value indicating whether to return the original token even if one of the patterns matches. Default is true. */
    preserveOriginal?: boolean;
}

/** A character filter that replaces characters in the input string. It uses a regular expression to identify character sequences to preserve and a replacement pattern to identify characters to replace. For example, given the input text "aa bb aa bb", pattern "(aa)\s+(bb)", and replacement "$1#$2", the result would be "aa#bb aa#bb". This character filter is implemented using Apache Lucene. */
export declare interface PatternReplaceCharFilter extends BaseCharFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.PatternReplaceCharFilter";
    /** A regular expression pattern. */
    pattern: string;
    /** The replacement text. */
    replacement: string;
}

/** A character filter that replaces characters in the input string. It uses a regular expression to identify character sequences to preserve and a replacement pattern to identify characters to replace. For example, given the input text "aa bb aa bb", pattern "(aa)\s+(bb)", and replacement "$1#$2", the result would be "aa#bb aa#bb". This token filter is implemented using Apache Lucene. */
export declare interface PatternReplaceTokenFilter extends BaseTokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.PatternReplaceTokenFilter";
    /** A regular expression pattern. */
    pattern: string;
    /** The replacement text. */
    replacement: string;
}

/**
 * Tokenizer that uses regex pattern matching to construct distinct tokens. This tokenizer is
 * implemented using Apache Lucene.
 */
export declare interface PatternTokenizer {
    /**
     * Polymorphic Discriminator
     */
    odatatype: "#Microsoft.Azure.Search.PatternTokenizer";
    /**
     * The name of the tokenizer. It must only contain letters, digits, spaces, dashes or
     * underscores, can only start and end with alphanumeric characters, and is limited to 128
     * characters.
     */
    name: string;
    /**
     * A regular expression pattern to match token separators. Default is an expression that matches
     * one or more whitespace characters. Default value: `\W+`.
     */
    pattern?: string;
    /**
     * Regular expression flags. Possible values include: 'CANON_EQ', 'CASE_INSENSITIVE', 'COMMENTS',
     * 'DOTALL', 'LITERAL', 'MULTILINE', 'UNICODE_CASE', 'UNIX_LINES'
     */
    flags?: RegexFlags[];
    /**
     * The zero-based ordinal of the matching group in the regular expression pattern to extract into
     * tokens. Use -1 if you want to use the entire pattern to split the input into tokens,
     * irrespective of matching groups. Default is -1. Default value: -1.
     */
    group?: number;
}

/** Defines values for PhoneticEncoder. */
export declare type PhoneticEncoder = "metaphone" | "doubleMetaphone" | "soundex" | "refinedSoundex" | "caverphone1" | "caverphone2" | "cologne" | "nysiis" | "koelnerPhonetik" | "haasePhonetik" | "beiderMorse";

/** Create tokens for phonetic matches. This token filter is implemented using Apache Lucene. */
export declare interface PhoneticTokenFilter extends BaseTokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.PhoneticTokenFilter";
    /** The phonetic encoder to use. Default is "metaphone". */
    encoder?: PhoneticEncoder;
    /** A value indicating whether encoded tokens should replace original tokens. If false, encoded tokens are added as synonyms. Default is true. */
    replaceOriginalTokens?: boolean;
}

/** Using the Text Analytics API, extracts personal information from an input text and gives you the option of masking it. */
export declare interface PIIDetectionSkill extends BaseSearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Text.PIIDetectionSkill";
    /** A value indicating which language code to use. Default is en. */
    defaultLanguageCode?: string;
    /** A value between 0 and 1 that be used to only include entities whose confidence score is greater than the value specified. If not set (default), or if explicitly set to null, all entities will be included. */
    minimumPrecision?: number;
    /** A parameter that provides various ways to mask the personal information detected in the input text. Default is 'none'. */
    maskingMode?: PIIDetectionSkillMaskingMode;
    /** The character used to mask the text if the maskingMode parameter is set to replace. Default is '*'. */
    maskingCharacter?: string;
    /** The version of the model to use when calling the Text Analytics service. It will default to the latest available when not specified. We recommend you do not specify this value unless absolutely necessary. */
    modelVersion?: string;
    /** A list of PII entity categories that should be extracted and masked. */
    categories?: string[];
    /** If specified, will set the PII domain to include only a subset of the entity categories. Possible values include: 'phi', 'none'. Default is 'none'. */
    domain?: string;
}

export declare type PIIDetectionSkillMaskingMode = `${KnownPIIDetectionSkillMaskingMode}`;

/**
 * A value that specifies whether answers should be returned as part of the search response.
 * This parameter is only valid if the query type is 'semantic'. If set to `extractive`, the query
 * returns answers extracted from key passages in the highest ranked documents.
 */
export declare type QueryAnswer = ExtractiveQueryAnswer;

/** An answer is a text passage extracted from the contents of the most relevant documents that matched the query. Answers are extracted from the top search results. Answer candidates are scored and the top answers are selected. */
export declare interface QueryAnswerResult {
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

/**
 * A value that specifies whether captions should be returned as part of the search response.
 * This parameter is only valid if the query type is 'semantic'. If set, the query returns captions
 * extracted from key passages in the highest ranked documents. When Captions is 'extractive',
 * highlighting is enabled by default. Defaults to 'none'.
 */
export declare type QueryCaption = ExtractiveQueryCaption;

/** Captions are the most representative passages from the document relatively to the search query. They are often used as document summary. Captions are only returned for queries of type `semantic`. */
export declare interface QueryCaptionResult {
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

/** Defines values for QueryType. */
export declare type QueryType = "simple" | "full" | "semantic";

export declare type RegexFlags = `${KnownRegexFlags}`;

/**
 * Options for reset indexer operation.
 */
export declare type ResetIndexerOptions = OperationOptions;

/** Represents a resource's usage and quota. */
export declare interface ResourceCounter {
    /** The resource usage amount. */
    usage: number;
    /** The resource amount quota. */
    quota?: number;
}

/**
 * Options for run indexer operation.
 */
export declare type RunIndexerOptions = OperationOptions;

/** Contains configuration options specific to the scalar quantization compression method used during indexing and querying. */
export declare interface ScalarQuantizationCompression extends BaseVectorSearchCompression {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    kind: "scalarQuantization";
    /** Contains the parameters specific to Scalar Quantization. */
    parameters?: ScalarQuantizationParameters;
}

/** Contains the parameters specific to Scalar Quantization. */
export declare interface ScalarQuantizationParameters {
    /** The quantized data type of compressed vector values. */
    quantizedDataType?: VectorSearchCompressionTarget;
}

/**
 * Contains the possible cases for ScoringFunction.
 */
export declare type ScoringFunction = DistanceScoringFunction | FreshnessScoringFunction | MagnitudeScoringFunction | TagScoringFunction;

/** Defines values for ScoringFunctionAggregation. */
export declare type ScoringFunctionAggregation = "sum" | "average" | "minimum" | "maximum" | "firstMatching";

/** Defines values for ScoringFunctionInterpolation. */
export declare type ScoringFunctionInterpolation = "linear" | "constant" | "quadratic" | "logarithmic";

/**
 * Defines parameters for a search index that influence scoring in search queries.
 */
export declare interface ScoringProfile {
    /**
     * The name of the scoring profile.
     */
    name: string;
    /**
     * Parameters that boost scoring based on text matches in certain index fields.
     */
    textWeights?: TextWeights;
    /**
     * The collection of functions that influence the scoring of documents.
     */
    functions?: ScoringFunction[];
    /**
     * A value indicating how the results of individual scoring functions should be combined.
     * Defaults to "Sum". Ignored if there are no scoring functions. Possible values include: 'sum',
     * 'average', 'minimum', 'maximum', 'firstMatching'
     */
    functionAggregation?: ScoringFunctionAggregation;
}

/** Defines values for ScoringStatistics. */
export declare type ScoringStatistics = "local" | "global";

/**
 * Class used to perform operations against a search index,
 * including querying documents in the index as well as
 * adding, updating, and removing them.
 */
export declare class SearchClient<TModel extends object> implements IndexDocumentsClient<TModel> {
    /**
     *  The service version to use when communicating with the service.
     */
    readonly serviceVersion: string;
    /**
     * The API version to use when communicating with the service.
     * @deprecated use {@Link serviceVersion} instead
     */
    readonly apiVersion: string;
    /**
     * The endpoint of the search service
     */
    readonly endpoint: string;
    /**
     * The name of the index
     */
    readonly indexName: string;
    /**
     * @hidden
     * A reference to the auto-generated SearchClient
     */
    private readonly client;
    /**
     * Creates an instance of SearchClient.
     *
     * Example usage:
     * ```ts
     * const { SearchClient, AzureKeyCredential } = require("@azure/search-documents");
     *
     * const client = new SearchClient(
     *   "<endpoint>",
     *   "<indexName>",
     *   new AzureKeyCredential("<Admin Key>")
     * );
     * ```
     *
     * Optionally, the type of the model can be used to enable strong typing and type hints:
     * ```ts
     * type TModel = {
     *   keyName: string;
     *   field1?: string | null;
     *   field2?: { anotherField?: string | null } | null;
     * };
     *
     * const client = new SearchClient<TModel>(
     *   ...
     * );
     * ```
     *
     * @param endpoint - The endpoint of the search service
     * @param indexName - The name of the index
     * @param credential - Used to authenticate requests to the service.
     * @param options - Used to configure the Search client.
     *
     * @typeParam TModel - An optional type that represents the documents stored in
     * the search index. For the best typing experience, all non-key fields should
     * be marked optional and nullable, and the key property should have the
     * non-nullable type `string`.
     */
    constructor(endpoint: string, indexName: string, credential: KeyCredential | TokenCredential, options?: SearchClientOptions);
    /**
     * Retrieves the number of documents in the index.
     * @param options - Options to the count operation.
     */
    getDocumentsCount(options?: CountDocumentsOptions): Promise<number>;
    /**
     * Based on a partial searchText from the user, return a list
     * of potential completion strings based on a specified suggester.
     * @param searchText - The search text on which to base autocomplete results.
     * @param suggesterName - The name of the suggester as specified in the suggesters collection that's part of the index definition.
     * @param options - Options to the autocomplete operation.
     * @example
     * ```ts
     * import {
     *   AzureKeyCredential,
     *   SearchClient,
     *   SearchFieldArray,
     * } from "@azure/search-documents";
     *
     * type TModel = {
     *   key: string;
     *   azure?: { sdk: string | null } | null;
     * };
     *
     * const client = new SearchClient<TModel>(
     *   "endpoint.azure",
     *   "indexName",
     *   new AzureKeyCredential("key")
     * );
     *
     * const searchFields: SearchFieldArray<TModel> = ["azure/sdk"];
     *
     * const autocompleteResult = await client.autocomplete(
     *   "searchText",
     *   "suggesterName",
     *   { searchFields }
     * );
     * ```
     */
    autocomplete(searchText: string, suggesterName: string, options?: AutocompleteOptions<TModel>): Promise<AutocompleteResult>;
    private searchDocuments;
    private listSearchResultsPage;
    private listSearchResultsAll;
    private listSearchResults;
    /**
     * Performs a search on the current index given
     * the specified arguments.
     * @param searchText - Text to search
     * @param options - Options for the search operation.
     * @example
     * ```ts
     * import {
     *   AzureKeyCredential,
     *   SearchClient,
     *   SearchFieldArray,
     * } from "@azure/search-documents";
     *
     * type TModel = {
     *   key: string;
     *   azure?: { sdk: string | null } | null;
     * };
     *
     * const client = new SearchClient<TModel>(
     *   "endpoint.azure",
     *   "indexName",
     *   new AzureKeyCredential("key")
     * );
     *
     * const select = ["azure/sdk"] as const;
     * const searchFields: SearchFieldArray<TModel> = ["azure/sdk"];
     *
     * const searchResult = await client.search("searchText", {
     *   select,
     *   searchFields,
     * });
     * ```
     */
    search<TFields extends SelectFields<TModel>>(searchText?: string, options?: SearchOptions<TModel, TFields>): Promise<SearchDocumentsResult<TModel, TFields>>;
    /**
     * Returns a short list of suggestions based on the searchText
     * and specified suggester.
     * @param searchText - The search text to use to suggest documents. Must be at least 1 character, and no more than 100 characters.
     * @param suggesterName - The name of the suggester as specified in the suggesters collection that's part of the index definition.
     * @param options - Options for the suggest operation
     * @example
     * ```ts
     * import {
     *   AzureKeyCredential,
     *   SearchClient,
     *   SearchFieldArray,
     * } from "@azure/search-documents";
     *
     * type TModel = {
     *   key: string;
     *   azure?: { sdk: string | null } | null;
     * };
     *
     * const client = new SearchClient<TModel>(
     *   "endpoint.azure",
     *   "indexName",
     *   new AzureKeyCredential("key")
     * );
     *
     * const select = ["azure/sdk"] as const;
     * const searchFields: SearchFieldArray<TModel> = ["azure/sdk"];
     *
     * const suggestResult = await client.suggest("searchText", "suggesterName", {
     *   select,
     *   searchFields,
     * });
     * ```
     */
    suggest<TFields extends SelectFields<TModel> = never>(searchText: string, suggesterName: string, options?: SuggestOptions<TModel, TFields>): Promise<SuggestDocumentsResult<TModel, TFields>>;
    /**
     * Retrieve a particular document from the index by key.
     * @param key - The primary key value of the document
     * @param options - Additional options
     */
    getDocument<TFields extends SelectFields<TModel>>(key: string, options?: GetDocumentOptions<TModel, TFields>): Promise<NarrowedModel<TModel, TFields>>;
    /**
     * Perform a set of index modifications (upload, merge, mergeOrUpload, delete)
     * for the given set of documents.
     * This operation may partially succeed and not all document operations will
     * be reflected in the index. If you would like to treat this as an exception,
     * set the `throwOnAnyFailure` option to true.
     * For more details about how merging works, see: https://docs.microsoft.com/en-us/rest/api/searchservice/AddUpdate-or-Delete-Documents
     * @param batch - An array of actions to perform on the index.
     * @param options - Additional options.
     */
    indexDocuments(batch: IndexDocumentsBatch<TModel>, options?: IndexDocumentsOptions): Promise<IndexDocumentsResult>;
    /**
     * Upload an array of documents to the index.
     * @param documents - The documents to upload.
     * @param options - Additional options.
     */
    uploadDocuments(documents: TModel[], options?: UploadDocumentsOptions): Promise<IndexDocumentsResult>;
    /**
     * Update a set of documents in the index.
     * For more details about how merging works, see https://docs.microsoft.com/en-us/rest/api/searchservice/AddUpdate-or-Delete-Documents
     * @param documents - The updated documents.
     * @param options - Additional options.
     */
    mergeDocuments(documents: TModel[], options?: MergeDocumentsOptions): Promise<IndexDocumentsResult>;
    /**
     * Update a set of documents in the index or upload them if they don't exist.
     * For more details about how merging works, see https://docs.microsoft.com/en-us/rest/api/searchservice/AddUpdate-or-Delete-Documents
     * @param documents - The updated documents.
     * @param options - Additional options.
     */
    mergeOrUploadDocuments(documents: TModel[], options?: MergeOrUploadDocumentsOptions): Promise<IndexDocumentsResult>;
    /**
     * Delete a set of documents.
     * @param documents - Documents to be deleted.
     * @param options - Additional options.
     */
    deleteDocuments(documents: TModel[], options?: DeleteDocumentsOptions): Promise<IndexDocumentsResult>;
    /**
     * Delete a set of documents.
     * @param keyName - The name of their primary key in the index.
     * @param keyValues - The primary key values of documents to delete.
     * @param options - Additional options.
     */
    deleteDocuments(keyName: keyof TModel, keyValues: string[], options?: DeleteDocumentsOptions): Promise<IndexDocumentsResult>;
    private encodeContinuationToken;
    private decodeContinuationToken;
    private convertSelect;
    private convertVectorQueryFields;
    private convertSearchFields;
    private convertOrderBy;
    private convertQueryAnswers;
    private convertQueryCaptions;
    private convertVectorQuery;
}

/**
 * Client options used to configure Cognitive Search API requests.
 */
export declare interface SearchClientOptions extends ExtendedCommonClientOptions {
    /**
     * The API version to use when communicating with the service.
     * @deprecated use {@link serviceVersion} instead
     */
    apiVersion?: string;
    /**
     * The service version to use when communicating with the service.
     */
    serviceVersion?: string;
    /**
     * The Audience to use for authentication with Azure Active Directory (AAD). The
     * audience is not considered when using a shared key.
     * {@link KnownSearchAudience} can be used interchangeably with audience
     */
    audience?: string;
}

/**
 * Response containing search page results from an index.
 */
export declare interface SearchDocumentsPageResult<TModel extends object, TFields extends SelectFields<TModel> = SelectFields<TModel>> extends SearchDocumentsResultBase {
    /**
     * The sequence of results returned by the query.
     * **NOTE: This property will not be serialized. It can only be populated by the server.**
     */
    readonly results: SearchResult<TModel, TFields>[];
    /**
     * A token used for retrieving the next page of results when the server
     * enforces pagination.
     */
    continuationToken?: string;
}

/**
 * Response containing search results from an index.
 */
export declare interface SearchDocumentsResult<TModel extends object, TFields extends SelectFields<TModel> = SelectFields<TModel>> extends SearchDocumentsResultBase {
    /**
     * The sequence of results returned by the query.
     * **NOTE: This property will not be serialized. It can only be populated by the server.**
     */
    readonly results: SearchIterator<TModel, TFields>;
}

/**
 * Response containing search results from an index.
 */
export declare interface SearchDocumentsResultBase {
    /**
     * The total count of results found by the search operation, or null if the count was not
     * requested. If present, the count may be greater than the number of results in this response.
     * This can happen if you use the $top or $skip parameters, or if Azure Cognitive Search can't
     * return all the requested documents in a single Search response.
     * **NOTE: This property will not be serialized. It can only be populated by the server.**
     */
    readonly count?: number;
    /**
     * A value indicating the percentage of the index that was included in the query, or null if
     * minimumCoverage was not specified in the request.
     * **NOTE: This property will not be serialized. It can only be populated by the server.**
     */
    readonly coverage?: number;
    /**
     * The facet query results for the search operation, organized as a collection of buckets for
     * each faceted field; null if the query did not include any facet expressions.
     * **NOTE: This property will not be serialized. It can only be populated by the server.**
     */
    readonly facets?: {
        [propertyName: string]: FacetResult[];
    };
    /**
     * The answers query results for the search operation; null if the answers query parameter was
     * not specified or set to 'none'.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly answers?: QueryAnswerResult[];
    /**
     * Reason that a partial response was returned for a semantic search request.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly semanticErrorReason?: SemanticErrorReason;
    /**
     * Type of partial response that was returned for a semantic search request.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly semanticSearchResultsType?: SemanticSearchResultsType;
}

/**
 * Represents a field in an index definition, which describes the name, data type, and search
 * behavior of a field.
 */
export declare type SearchField = SimpleField | ComplexField;

/**
 * If `TModel` is an untyped object, an untyped string array
 * Otherwise, the slash-delimited fields of `TModel`.
 */
export declare type SearchFieldArray<TModel extends object = object> = (<T>() => T extends TModel ? true : false) extends <T>() => T extends object ? true : false ? readonly string[] : readonly SelectFields<TModel>[];

/**
 * Defines values for SearchFieldDataType.
 *
 * ### Known values supported by the service:
 *
 * **Edm.String**: Indicates that a field contains a string.
 *
 * **Edm.Int32**: Indicates that a field contains a 32-bit signed integer.
 *
 * **Edm.Int64**: Indicates that a field contains a 64-bit signed integer.
 *
 * **Edm.Double**: Indicates that a field contains an IEEE double-precision floating point number.
 *
 * **Edm.Boolean**: Indicates that a field contains a Boolean value (true or false).
 *
 * **Edm.DateTimeOffset**: Indicates that a field contains a date/time value, including timezone
 * information.
 *
 * **Edm.GeographyPoint**: Indicates that a field contains a geo-location in terms of longitude and
 * latitude.
 *
 * **Edm.ComplexType**: Indicates that a field contains one or more complex objects that in turn
 * have sub-fields of other types.
 *
 * **Edm.Single**: Indicates that a field contains a single-precision floating point number. This is
 * only valid when used as part of a collection type, i.e. Collection(Edm.Single).
 *
 * **Edm.Half**: Indicates that a field contains a half-precision floating point number. This is
 * only valid when used as part of a collection type, i.e. Collection(Edm.Half).
 *
 * **Edm.Int16**: Indicates that a field contains a 16-bit signed integer. This is only valid when
 * used as part of a collection type, i.e. Collection(Edm.Int16).
 *
 * **Edm.SByte**: Indicates that a field contains a 8-bit signed integer. This is only valid when
 * used as part of a collection type, i.e. Collection(Edm.SByte).
 *
 * **Edm.Byte**: Indicates that a field contains a 8-bit unsigned integer. This is only valid when
 * used as part of a collection type, i.e. Collection(Edm.Byte).
 */
export declare type SearchFieldDataType = Exclude<`${KnownSearchFieldDataType}` | `Collection(${KnownSearchFieldDataType})`, "Edm.ComplexType" | "Edm.Byte" | "Edm.Half" | "Edm.Int16" | "Edm.SByte" | "Edm.Single">;

/**
 * Represents a search index definition, which describes the fields and search behavior of an
 * index.
 */
export declare interface SearchIndex {
    /**
     * The name of the index.
     */
    name: string;
    /**
     * The fields of the index.
     */
    fields: SearchField[];
    /**
     * The scoring profiles for the index.
     */
    scoringProfiles?: ScoringProfile[];
    /**
     * The name of the scoring profile to use if none is specified in the query. If this property is
     * not set and no scoring profile is specified in the query, then default scoring (tf-idf) will
     * be used.
     */
    defaultScoringProfile?: string;
    /**
     * Options to control Cross-Origin Resource Sharing (CORS) for the index.
     */
    corsOptions?: CorsOptions;
    /**
     * The suggesters for the index.
     */
    suggesters?: SearchSuggester[];
    /**
     * The analyzers for the index.
     */
    analyzers?: LexicalAnalyzer[];
    /**
     * The tokenizers for the index.
     */
    tokenizers?: LexicalTokenizer[];
    /**
     * The token filters for the index.
     */
    tokenFilters?: TokenFilter[];
    /**
     * The character filters for the index.
     */
    charFilters?: CharFilter[];
    /**
     * A description of an encryption key that you create in Azure Key Vault. This key is used to
     * provide an additional level of encryption-at-rest for your data when you want full assurance
     * that no one, not even Microsoft, can decrypt your data in Azure Cognitive Search. Once you
     * have encrypted your data, it will always remain encrypted. Azure Cognitive Search will ignore
     * attempts to set this property to null. You can change this property as needed if you want to
     * rotate your encryption key; Your data will be unaffected. Encryption with customer-managed
     * keys is not available for free search services, and is only available for paid services
     * created on or after January 1, 2019.
     */
    encryptionKey?: SearchResourceEncryptionKey;
    /**
     * The type of similarity algorithm to be used when scoring and ranking the documents matching a
     * search query. The similarity algorithm can only be defined at index creation time and cannot
     * be modified on existing indexes. If null, the ClassicSimilarity algorithm is used.
     */
    similarity?: SimilarityAlgorithm;
    /**
     * Defines parameters for a search index that influence semantic capabilities.
     */
    semanticSearch?: SemanticSearch;
    /**
     * Contains configuration options related to vector search.
     */
    vectorSearch?: VectorSearch;
    /**
     * The ETag of the index.
     */
    etag?: string;
}

/**
 * Class to perform operations to manage
 * (create, update, list/delete)
 * indexes, & synonymmaps.
 */
export declare class SearchIndexClient {
    /**
     * The API version to use when communicating with the service.
     */
    readonly serviceVersion: string;
    /**
     * The API version to use when communicating with the service.
     * @deprecated use {@Link serviceVersion} instead
     */
    readonly apiVersion: string;
    /**
     * The endpoint of the search service
     */
    readonly endpoint: string;
    /**
     * @hidden
     * A reference to the auto-generated SearchServiceClient
     */
    private readonly client;
    /**
     * Used to authenticate requests to the service.
     */
    private readonly credential;
    /**
     * Used to configure the Search Index client.
     */
    private readonly options;
    /**
     * Creates an instance of SearchIndexClient.
     *
     * Example usage:
     * ```ts
     * const { SearchIndexClient, AzureKeyCredential } = require("@azure/search-documents");
     *
     * const client = new SearchIndexClient(
     *   "<endpoint>",
     *   new AzureKeyCredential("<Admin Key>");
     * );
     * ```
     * @param endpoint - The endpoint of the search service
     * @param credential - Used to authenticate requests to the service.
     * @param options - Used to configure the Search Index client.
     */
    constructor(endpoint: string, credential: KeyCredential | TokenCredential, options?: SearchIndexClientOptions);
    private listIndexesPage;
    private listIndexesAll;
    /**
     * Retrieves a list of existing indexes in the service.
     * @param options - Options to the list index operation.
     */
    listIndexes(options?: ListIndexesOptions): IndexIterator;
    private listIndexesNamesPage;
    private listIndexesNamesAll;
    /**
     * Retrieves a list of names of existing indexes in the service.
     * @param options - Options to the list index operation.
     */
    listIndexesNames(options?: ListIndexesOptions): IndexNameIterator;
    /**
     * Retrieves a list of existing SynonymMaps in the service.
     * @param options - Options to the list SynonymMaps operation.
     */
    listSynonymMaps(options?: ListSynonymMapsOptions): Promise<Array<SynonymMap>>;
    /**
     * Retrieves a list of names of existing SynonymMaps in the service.
     * @param options - Options to the list SynonymMaps operation.
     */
    listSynonymMapsNames(options?: ListSynonymMapsOptions): Promise<Array<string>>;
    /**
     * Retrieves information about an index.
     * @param indexName - The name of the index.
     * @param options - Additional optional arguments.
     */
    getIndex(indexName: string, options?: GetIndexOptions): Promise<SearchIndex>;
    /**
     * Retrieves information about a SynonymMap.
     * @param synonymMapName - The name of the SynonymMap.
     * @param options - Additional optional arguments.
     */
    getSynonymMap(synonymMapName: string, options?: GetSynonymMapsOptions): Promise<SynonymMap>;
    /**
     * Creates a new index.
     * @param index - The information describing the index to be created.
     * @param options - Additional optional arguments.
     */
    createIndex(index: SearchIndex, options?: CreateIndexOptions): Promise<SearchIndex>;
    /**
     * Creates a new SynonymMap in a search service.
     * @param synonymMap - The synonymMap definition to create in a search service.
     * @param options - Additional optional arguments.
     */
    createSynonymMap(synonymMap: SynonymMap, options?: CreateSynonymMapOptions): Promise<SynonymMap>;
    /**
     * Creates a new index or modifies an existing one.
     * @param index - The information describing the index to be created.
     * @param options - Additional optional arguments.
     */
    createOrUpdateIndex(index: SearchIndex, options?: CreateOrUpdateIndexOptions): Promise<SearchIndex>;
    /**
     * Creates a new SynonymMap or modifies an existing one.
     * @param synonymMap - The information describing the SynonymMap to be created.
     * @param options - Additional optional arguments.
     */
    createOrUpdateSynonymMap(synonymMap: SynonymMap, options?: CreateOrUpdateSynonymMapOptions): Promise<SynonymMap>;
    /**
     * Deletes an existing index.
     * @param indexName - Index/Name of the index to delete.
     * @param options - Additional optional arguments.
     */
    deleteIndex(index: string | SearchIndex, options?: DeleteIndexOptions): Promise<void>;
    /**
     * Deletes an existing SynonymMap.
     * @param synonymMapName - SynonymMap/Name of the synonymMap to delete.
     * @param options - Additional optional arguments.
     */
    deleteSynonymMap(synonymMap: string | SynonymMap, options?: DeleteSynonymMapOptions): Promise<void>;
    /**
     * Retrieves statistics about an index, such as the count of documents and the size
     * of index storage.
     * @param indexName - The name of the index.
     * @param options - Additional optional arguments.
     */
    getIndexStatistics(indexName: string, options?: GetIndexStatisticsOptions): Promise<SearchIndexStatistics>;
    /**
     * Calls an analyzer or tokenizer manually on provided text.
     * @param indexName - The name of the index that contains the field to analyze
     * @param text - The text to break into tokens.
     * @param options - Additional arguments
     */
    analyzeText(indexName: string, options: AnalyzeTextOptions): Promise<AnalyzeResult>;
    /**
     * Retrieves statistics about the service, such as the count of documents, index, etc.
     * @param options - Additional optional arguments.
     */
    getServiceStatistics(options?: GetServiceStatisticsOptions): Promise<SearchServiceStatistics>;
    /**
     * Retrieves the SearchClient corresponding to this SearchIndexClient
     * @param indexName - Name of the index
     * @param options - SearchClient Options
     * @typeParam TModel - An optional type that represents the documents stored in
     * the search index. For the best typing experience, all non-key fields should
     * be marked optional and nullable, and the key property should have the
     * non-nullable type `string`.
     */
    getSearchClient<TModel extends object>(indexName: string, options?: SearchClientOptions): SearchClient<TModel>;
}

/**
 * Client options used to configure Cognitive Search API requests.
 */
export declare interface SearchIndexClientOptions extends ExtendedCommonClientOptions {
    /**
     * The API version to use when communicating with the service.
     * @deprecated use {@Link serviceVersion} instead
     */
    apiVersion?: string;
    /**
     * The service version to use when communicating with the service.
     */
    serviceVersion?: string;
    /**
     * The Audience to use for authentication with Azure Active Directory (AAD). The
     * audience is not considered when using a shared key.
     * {@link KnownSearchAudience} can be used interchangeably with audience
     */
    audience?: string;
}

/**
 * Represents an indexer.
 */
export declare interface SearchIndexer {
    /**
     * The name of the indexer.
     */
    name: string;
    /**
     * The description of the indexer.
     */
    description?: string;
    /**
     * The name of the datasource from which this indexer reads data.
     */
    dataSourceName: string;
    /**
     * The name of the skillset executing with this indexer.
     */
    skillsetName?: string;
    /**
     * The name of the index to which this indexer writes data.
     */
    targetIndexName: string;
    /**
     * The schedule for this indexer.
     */
    schedule?: IndexingSchedule;
    /**
     * Parameters for indexer execution.
     */
    parameters?: IndexingParameters;
    /**
     * Defines mappings between fields in the data source and corresponding target fields in the
     * index.
     */
    fieldMappings?: FieldMapping[];
    /**
     * Output field mappings are applied after enrichment and immediately before indexing.
     */
    outputFieldMappings?: FieldMapping[];
    /**
     * A value indicating whether the indexer is disabled. Default is false. Default value: false.
     */
    isDisabled?: boolean;
    /**
     * The ETag of the indexer.
     */
    etag?: string;
    /**
     * A description of an encryption key that you create in Azure Key Vault. This key is used to
     * provide an additional level of encryption-at-rest for your indexer definition (as well as
     * indexer execution status) when you want full assurance that no one, not even Microsoft, can
     * decrypt them in Azure Cognitive Search. Once you have encrypted your indexer definition, it
     * will always remain encrypted. Azure Cognitive Search will ignore attempts to set this property
     * to null. You can change this property as needed if you want to rotate your encryption key;
     * Your indexer definition (and indexer execution status) will be unaffected. Encryption with
     * customer-managed keys is not available for free search services, and is only available for
     * paid services created on or after January 1, 2019.
     */
    encryptionKey?: SearchResourceEncryptionKey;
}

/**
 * Class to perform operations to manage
 * (create, update, list/delete)
 * indexers, datasources & skillsets.
 */
export declare class SearchIndexerClient {
    /**
     * The API version to use when communicating with the service.
     */
    readonly serviceVersion: string;
    /**
     * The API version to use when communicating with the service.
     * @deprecated use {@Link serviceVersion} instead
     */
    readonly apiVersion: string;
    /**
     * The endpoint of the search service
     */
    readonly endpoint: string;
    /**
     * @hidden
     * A reference to the auto-generated SearchServiceClient
     */
    private readonly client;
    /**
     * Creates an instance of SearchIndexerClient.
     *
     * Example usage:
     * ```ts
     * const { SearchIndexerClient, AzureKeyCredential } = require("@azure/search-documents");
     *
     * const client = new SearchIndexerClient(
     *   "<endpoint>",
     *   new AzureKeyCredential("<Admin Key>");
     * );
     * ```
     * @param endpoint - The endpoint of the search service
     * @param credential - Used to authenticate requests to the service.
     * @param options - Used to configure the Search client.
     */
    constructor(endpoint: string, credential: KeyCredential | TokenCredential, options?: SearchIndexerClientOptions);
    /**
     * Retrieves a list of existing indexers in the service.
     * @param options - Options to the list indexers operation.
     */
    listIndexers(options?: ListIndexersOptions): Promise<Array<SearchIndexer>>;
    /**
     * Retrieves a list of names of existing indexers in the service.
     * @param options - Options to the list indexers operation.
     */
    listIndexersNames(options?: ListIndexersOptions): Promise<Array<string>>;
    /**
     * Retrieves a list of existing data sources in the service.
     * @param options - Options to the list indexers operation.
     */
    listDataSourceConnections(options?: ListDataSourceConnectionsOptions): Promise<Array<SearchIndexerDataSourceConnection>>;
    /**
     * Retrieves a list of names of existing data sources in the service.
     * @param options - Options to the list indexers operation.
     */
    listDataSourceConnectionsNames(options?: ListDataSourceConnectionsOptions): Promise<Array<string>>;
    /**
     * Retrieves a list of existing Skillsets in the service.
     * @param options - Options to the list Skillsets operation.
     */
    listSkillsets(options?: ListSkillsetsOptions): Promise<Array<SearchIndexerSkillset>>;
    /**
     * Retrieves a list of names of existing Skillsets in the service.
     * @param options - Options to the list Skillsets operation.
     */
    listSkillsetsNames(options?: ListSkillsetsOptions): Promise<Array<string>>;
    /**
     * Retrieves information about an Indexer.
     * @param indexerName - The name of the Indexer.
     * @param options - Additional optional arguments.
     */
    getIndexer(indexerName: string, options?: GetIndexerOptions): Promise<SearchIndexer>;
    /**
     * Retrieves information about a DataSource
     * @param dataSourceName - The name of the DataSource
     * @param options - Additional optional arguments
     */
    getDataSourceConnection(dataSourceConnectionName: string, options?: GetDataSourceConnectionOptions): Promise<SearchIndexerDataSourceConnection>;
    /**
     * Retrieves information about an Skillset.
     * @param indexName - The name of the Skillset.
     * @param options - Additional optional arguments.
     */
    getSkillset(skillsetName: string, options?: GetSkillSetOptions): Promise<SearchIndexerSkillset>;
    /**
     * Creates a new indexer in a search service.
     * @param indexer - The indexer definition to create in a search service.
     * @param options - Additional optional arguments.
     */
    createIndexer(indexer: SearchIndexer, options?: CreateIndexerOptions): Promise<SearchIndexer>;
    /**
     * Creates a new dataSource in a search service.
     * @param dataSourceConnection - The dataSource definition to create in a search service.
     * @param options - Additional optional arguments.
     */
    createDataSourceConnection(dataSourceConnection: SearchIndexerDataSourceConnection, options?: CreateDataSourceConnectionOptions): Promise<SearchIndexerDataSourceConnection>;
    /**
     * Creates a new skillset in a search service.
     * @param skillset - The skillset containing one or more skills to create in a search service.
     * @param options - Additional optional arguments.
     */
    createSkillset(skillset: SearchIndexerSkillset, options?: CreateSkillsetOptions): Promise<SearchIndexerSkillset>;
    /**
     * Creates a new indexer or modifies an existing one.
     * @param indexer - The information describing the indexer to be created/updated.
     * @param options - Additional optional arguments.
     */
    createOrUpdateIndexer(indexer: SearchIndexer, options?: CreateorUpdateIndexerOptions): Promise<SearchIndexer>;
    /**
     * Creates a new datasource or modifies an existing one.
     * @param dataSourceConnection - The information describing the datasource to be created/updated.
     * @param options - Additional optional arguments.
     */
    createOrUpdateDataSourceConnection(dataSourceConnection: SearchIndexerDataSourceConnection, options?: CreateorUpdateDataSourceConnectionOptions): Promise<SearchIndexerDataSourceConnection>;
    /**
     * Creates a new Skillset or modifies an existing one.
     * @param skillset - The information describing the index to be created.
     * @param options - Additional optional arguments.
     */
    createOrUpdateSkillset(skillset: SearchIndexerSkillset, options?: CreateOrUpdateSkillsetOptions): Promise<SearchIndexerSkillset>;
    /**
     * Deletes an existing indexer.
     * @param indexer - Indexer/Name of the indexer to delete.
     * @param options - Additional optional arguments.
     */
    deleteIndexer(indexer: string | SearchIndexer, options?: DeleteIndexerOptions): Promise<void>;
    /**
     * Deletes an existing datasource.
     * @param dataSource - Datasource/Name of the datasource to delete.
     * @param options - Additional optional arguments.
     */
    deleteDataSourceConnection(dataSourceConnection: string | SearchIndexerDataSourceConnection, options?: DeleteDataSourceConnectionOptions): Promise<void>;
    /**
     * Deletes an existing Skillset.
     * @param skillset - Skillset/Name of the Skillset to delete.
     * @param options - Additional optional arguments.
     */
    deleteSkillset(skillset: string | SearchIndexerSkillset, options?: DeleteSkillsetOptions): Promise<void>;
    /**
     * Returns the current status and execution history of an indexer.
     * @param indexerName - The name of the indexer.
     * @param options - Additional optional arguments.
     */
    getIndexerStatus(indexerName: string, options?: GetIndexerStatusOptions): Promise<SearchIndexerStatus>;
    /**
     * Resets the change tracking state associated with an indexer.
     * @param indexerName - The name of the indexer to reset.
     * @param options - Additional optional arguments.
     */
    resetIndexer(indexerName: string, options?: ResetIndexerOptions): Promise<void>;
    /**
     * Runs an indexer on-demand.
     * @param indexerName - The name of the indexer to run.
     * @param options - Additional optional arguments.
     */
    runIndexer(indexerName: string, options?: RunIndexerOptions): Promise<void>;
}

/**
 * Client options used to configure Cognitive Search API requests.
 */
export declare interface SearchIndexerClientOptions extends ExtendedCommonClientOptions {
    /**
     * The API version to use when communicating with the service.
     * @deprecated use {@Link serviceVersion} instead
     */
    apiVersion?: string;
    /**
     * The service version to use when communicating with the service.
     */
    serviceVersion?: string;
    /**
     * The Audience to use for authentication with Azure Active Directory (AAD). The
     * audience is not considered when using a shared key.
     * {@link KnownSearchAudience} can be used interchangeably with audience
     */
    audience?: string;
}

/** Represents information about the entity (such as Azure SQL table or CosmosDB collection) that will be indexed. */
export declare interface SearchIndexerDataContainer {
    /** The name of the table or view (for Azure SQL data source) or collection (for CosmosDB data source) that will be indexed. */
    name: string;
    /** A query that is applied to this data container. The syntax and meaning of this parameter is datasource-specific. Not supported by Azure SQL datasources. */
    query?: string;
}

/**
 * Contains the possible cases for SearchIndexerDataIdentity.
 */
export declare type SearchIndexerDataIdentity = SearchIndexerDataNoneIdentity | SearchIndexerDataUserAssignedIdentity;

/** Clears the identity property of a datasource. */
export declare interface SearchIndexerDataNoneIdentity extends BaseSearchIndexerDataIdentity {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.DataNoneIdentity";
}

/**
 * Represents a datasource definition, which can be used to configure an indexer.
 */
export declare interface SearchIndexerDataSourceConnection {
    /**
     * The name of the datasource.
     */
    name: string;
    /**
     * The description of the datasource.
     */
    description?: string;
    /**
     * The type of the datasource. Possible values include: 'AzureSql', 'CosmosDb', 'AzureBlob',
     * 'AzureTable', 'MySql', 'AdlsGen2'
     */
    type: SearchIndexerDataSourceType;
    /**
     * The connection string for the datasource.
     */
    connectionString?: string;
    /**
     * The data container for the datasource.
     */
    container: SearchIndexerDataContainer;
    /**
     * An explicit managed identity to use for this datasource. If not specified and the connection
     * string is a managed identity, the system-assigned managed identity is used. If not specified,
     * the value remains unchanged. If "none" is specified, the value of this property is cleared.
     */
    identity?: SearchIndexerDataIdentity;
    /**
     * The data change detection policy for the datasource.
     */
    dataChangeDetectionPolicy?: DataChangeDetectionPolicy;
    /**
     * The data deletion detection policy for the datasource.
     */
    dataDeletionDetectionPolicy?: DataDeletionDetectionPolicy;
    /**
     * The ETag of the DataSource.
     */
    etag?: string;
    /**
     * A description of an encryption key that you create in Azure Key Vault. This key is used to
     * provide an additional level of encryption-at-rest for your datasource definition when you want
     * full assurance that no one, not even Microsoft, can decrypt your data source definition in
     * Azure Cognitive Search. Once you have encrypted your data source definition, it will always
     * remain encrypted. Azure Cognitive Search will ignore attempts to set this property to null.
     * You can change this property as needed if you want to rotate your encryption key; Your
     * datasource definition will be unaffected. Encryption with customer-managed keys is not
     * available for free search services, and is only available for paid services created on or
     * after January 1, 2019.
     */
    encryptionKey?: SearchResourceEncryptionKey;
}

export declare type SearchIndexerDataSourceType = `${KnownSearchIndexerDataSourceType}`;

/** Specifies the identity for a datasource to use. */
export declare interface SearchIndexerDataUserAssignedIdentity extends BaseSearchIndexerDataIdentity {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.DataUserAssignedIdentity";
    /** The fully qualified Azure resource Id of a user assigned managed identity typically in the form "/subscriptions/12345678-1234-1234-1234-1234567890ab/resourceGroups/rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/myId" that should have been assigned to the search service. */
    resourceId: string;
}

/** Represents an item- or document-level indexing error. */
export declare interface SearchIndexerError {
    /**
     * The key of the item for which indexing failed.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly key?: string;
    /**
     * The message describing the error that occurred while processing the item.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly errorMessage: string;
    /**
     * The status code indicating why the indexing operation failed. Possible values include: 400 for a malformed input document, 404 for document not found, 409 for a version conflict, 422 when the index is temporarily unavailable, or 503 for when the service is too busy.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly statusCode: number;
    /**
     * The name of the source at which the error originated. For example, this could refer to a particular skill in the attached skillset. This may not be always available.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly name?: string;
    /**
     * Additional, verbose details about the error to assist in debugging the indexer. This may not be always available.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly details?: string;
    /**
     * A link to a troubleshooting guide for these classes of errors. This may not be always available.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly documentationLink?: string;
}

/** Definition of additional projections to secondary search indexes. */
export declare interface SearchIndexerIndexProjection {
    /** A list of projections to be performed to secondary search indexes. */
    selectors: SearchIndexerIndexProjectionSelector[];
    /** A dictionary of index projection-specific configuration properties. Each name is the name of a specific property. Each value must be of a primitive type. */
    parameters?: SearchIndexerIndexProjectionParameters;
}

/** A dictionary of index projection-specific configuration properties. Each name is the name of a specific property. Each value must be of a primitive type. */
export declare interface SearchIndexerIndexProjectionParameters {
    /** Describes unknown properties.*/
    [property: string]: unknown;
    /** Defines behavior of the index projections in relation to the rest of the indexer. */
    projectionMode?: IndexProjectionMode;
}

/** Description for what data to store in the designated search index. */
export declare interface SearchIndexerIndexProjectionSelector {
    /** Name of the search index to project to. Must have a key field with the 'keyword' analyzer set. */
    targetIndexName: string;
    /** Name of the field in the search index to map the parent document's key value to. Must be a string field that is filterable and not the key field. */
    parentKeyFieldName: string;
    /** Source context for the projections. Represents the cardinality at which the document will be split into multiple sub documents. */
    sourceContext: string;
    /** Mappings for the projection, or which source should be mapped to which field in the target index. */
    mappings: InputFieldMappingEntry[];
}

/**
 *  Definition of additional projections to azure blob, table, or files, of enriched data.
 */
export declare interface SearchIndexerKnowledgeStore {
    /**
     * The connection string to the storage account projections will be stored in.
     */
    storageConnectionString: string;
    /**
     * A list of additional projections to perform during indexing.
     */
    projections: SearchIndexerKnowledgeStoreProjection[];
    /**
     * The user-assigned managed identity used for connections to Azure Storage when writing
     * knowledge store projections. If the connection string indicates an identity (ResourceId) and
     * it's not specified, the system-assigned managed identity is used. On updates to the indexer,
     * if the identity is unspecified, the value remains unchanged. If set to "none", the value of
     * this property is cleared.
     */
    identity?: SearchIndexerDataIdentity;
}

/** Abstract class to share properties between concrete selectors. */
export declare interface SearchIndexerKnowledgeStoreBlobProjectionSelector extends SearchIndexerKnowledgeStoreProjectionSelector {
    /** Blob container to store projections in. */
    storageContainer: string;
}

/** Projection definition for what data to store in Azure Files. */
export declare interface SearchIndexerKnowledgeStoreFileProjectionSelector extends SearchIndexerKnowledgeStoreBlobProjectionSelector {
}

/** Projection definition for what data to store in Azure Blob. */
export declare interface SearchIndexerKnowledgeStoreObjectProjectionSelector extends SearchIndexerKnowledgeStoreBlobProjectionSelector {
}

/** A dictionary of knowledge store-specific configuration properties. Each name is the name of a specific property. Each value must be of a primitive type. */
export declare interface SearchIndexerKnowledgeStoreParameters {
    /** Describes unknown properties. The value of an unknown property can be of "any" type. */
    [property: string]: unknown;
    /** Whether or not projections should synthesize a generated key name if one isn't already present. */
    synthesizeGeneratedKeyName?: boolean;
}

/** Container object for various projection selectors. */
export declare interface SearchIndexerKnowledgeStoreProjection {
    /** Projections to Azure Table storage. */
    tables?: SearchIndexerKnowledgeStoreTableProjectionSelector[];
    /** Projections to Azure Blob storage. */
    objects?: SearchIndexerKnowledgeStoreObjectProjectionSelector[];
    /** Projections to Azure File storage. */
    files?: SearchIndexerKnowledgeStoreFileProjectionSelector[];
}

/** Abstract class to share properties between concrete selectors. */
export declare interface SearchIndexerKnowledgeStoreProjectionSelector {
    /** Name of reference key to different projection. */
    referenceKeyName?: string;
    /** Name of generated key to store projection under. */
    generatedKeyName?: string;
    /** Source data to project. */
    source?: string;
    /** Source context for complex projections. */
    sourceContext?: string;
    /** Nested inputs for complex projections. */
    inputs?: InputFieldMappingEntry[];
}

/** Description for what data to store in Azure Tables. */
export declare interface SearchIndexerKnowledgeStoreTableProjectionSelector extends SearchIndexerKnowledgeStoreProjectionSelector {
    /** Name of the Azure table to store projected data in. */
    tableName: string;
}

export declare interface SearchIndexerLimits {
    /**
     * The maximum duration that the indexer is permitted to run for one execution.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly maxRunTime?: string;
    /**
     * The maximum size of a document, in bytes, which will be considered valid for indexing.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly maxDocumentExtractionSize?: number;
    /**
     * The maximum number of characters that will be extracted from a document picked up for indexing.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly maxDocumentContentCharactersToExtract?: number;
}

/**
 * Contains the possible cases for Skill.
 */
export declare type SearchIndexerSkill = AzureOpenAIEmbeddingSkill | ConditionalSkill | CustomEntityLookupSkill | DocumentExtractionSkill | EntityLinkingSkill | EntityRecognitionSkill | EntityRecognitionSkillV3 | ImageAnalysisSkill | KeyPhraseExtractionSkill | LanguageDetectionSkill | MergeSkill | OcrSkill | PIIDetectionSkill | SentimentSkill | SentimentSkillV3 | ShaperSkill | SplitSkill | TextTranslationSkill | WebApiSkill;

/**
 * A list of skills.
 */
export declare interface SearchIndexerSkillset {
    /**
     * The name of the skillset.
     */
    name: string;
    /**
     * The description of the skillset.
     */
    description?: string;
    /**
     * A list of skills in the skillset.
     */
    skills: SearchIndexerSkill[];
    /**
     * Details about cognitive services to be used when running skills.
     */
    cognitiveServicesAccount?: CognitiveServicesAccount;
    /**
     * Definition of additional projections to azure blob, table, or files, of enriched data.
     */
    knowledgeStore?: SearchIndexerKnowledgeStore;
    /**
     *  Definition of additional projections to secondary search index(es).
     */
    indexProjection?: SearchIndexerIndexProjection;
    /**
     * The ETag of the skillset.
     */
    etag?: string;
    /**
     * A description of an encryption key that you create in Azure Key Vault. This key is used to
     * provide an additional level of encryption-at-rest for your skillset definition when you want
     * full assurance that no one, not even Microsoft, can decrypt your skillset definition in Azure
     * Cognitive Search. Once you have encrypted your skillset definition, it will always remain
     * encrypted. Azure Cognitive Search will ignore attempts to set this property to null. You can
     * change this property as needed if you want to rotate your encryption key; Your skillset
     * definition will be unaffected. Encryption with customer-managed keys is not available for free
     * search services, and is only available for paid services created on or after January 1, 2019.
     */
    encryptionKey?: SearchResourceEncryptionKey;
}

/** Represents the current status and execution history of an indexer. */
export declare interface SearchIndexerStatus {
    /**
     * Overall indexer status.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly status: IndexerStatus;
    /**
     * The result of the most recent or an in-progress indexer execution.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly lastResult?: IndexerExecutionResult;
    /**
     * History of the recent indexer executions, sorted in reverse chronological order.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly executionHistory: IndexerExecutionResult[];
    /**
     * The execution limits for the indexer.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly limits: SearchIndexerLimits;
}

/** Represents an item-level warning. */
export declare interface SearchIndexerWarning {
    /**
     * The key of the item which generated a warning.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly key?: string;
    /**
     * The message describing the warning that occurred while processing the item.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly message: string;
    /**
     * The name of the source at which the warning originated. For example, this could refer to a particular skill in the attached skillset. This may not be always available.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly name?: string;
    /**
     * Additional, verbose details about the warning to assist in debugging the indexer. This may not be always available.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly details?: string;
    /**
     * A link to a troubleshooting guide for these classes of warnings. This may not be always available.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly documentationLink?: string;
}

/**
 * Class used to perform buffered operations against a search index,
 * including adding, updating, and removing them.
 */
export declare class SearchIndexingBufferedSender<TModel extends object> {
    /**
     * Search Client used to call the underlying IndexBatch operations.
     */
    private client;
    /**
     * Indicates if autoFlush is enabled.
     */
    private autoFlush;
    /**
     * Interval between flushes (in milliseconds).
     */
    private flushWindowInMs;
    /**
     * Delay between retries
     */
    private throttlingDelayInMs;
    /**
     * Maximum number of Retries
     */
    private maxRetriesPerAction;
    /**
     * Max Delay between retries
     */
    private maxThrottlingDelayInMs;
    /**
     * Size of the batch.
     */
    private initialBatchActionCount;
    /**
     * Batch object used to complete the service call.
     */
    private batchObject;
    /**
     * Clean up for the timer
     */
    private cleanupTimer?;
    /**
     * Event emitter/publisher used in the Buffered Sender
     */
    private readonly emitter;
    /**
     * Method to retrieve the document key
     */
    private documentKeyRetriever;
    /**
     * Creates a new instance of SearchIndexingBufferedSender.
     *
     * @param client - Search Client used to call the underlying IndexBatch operations.
     * @param options - Options to modify auto flush.
     *
     */
    constructor(client: IndexDocumentsClient<TModel>, documentKeyRetriever: (document: TModel) => string, options?: SearchIndexingBufferedSenderOptions);
    /**
     * Uploads the documents/Adds the documents to the upload queue.
     *
     * @param documents - Documents to be uploaded.
     * @param options - Upload options.
     */
    uploadDocuments(documents: TModel[], options?: SearchIndexingBufferedSenderUploadDocumentsOptions): Promise<void>;
    /**
     * Merges the documents/Adds the documents to the merge queue.
     *
     * @param documents - Documents to be merged.
     * @param options - Upload options.
     */
    mergeDocuments(documents: TModel[], options?: SearchIndexingBufferedSenderMergeDocumentsOptions): Promise<void>;
    /**
     * Merges/Uploads the documents/Adds the documents to the merge/upload queue.
     *
     * @param documents - Documents to be merged/uploaded.
     * @param options - Upload options.
     */
    mergeOrUploadDocuments(documents: TModel[], options?: SearchIndexingBufferedSenderMergeOrUploadDocumentsOptions): Promise<void>;
    /**
     * Deletes the documents/Adds the documents to the delete queue.
     *
     * @param documents - Documents to be deleted.
     * @param options - Upload options.
     */
    deleteDocuments(documents: TModel[], options?: SearchIndexingBufferedSenderDeleteDocumentsOptions): Promise<void>;
    /**
     * Flushes the queue manually.
     *
     * @param options - Flush options.
     */
    flush(options?: SearchIndexingBufferedSenderFlushDocumentsOptions): Promise<void>;
    /**
     * If using autoFlush: true, call this to cleanup the autoflush timer.
     */
    dispose(): Promise<void>;
    /**
     * Attach Batch Added Event
     *
     * @param event - Event to be emitted
     * @param listener - Event Listener
     */
    on(event: "batchAdded", listener: (e: {
        action: string;
        documents: TModel[];
    }) => void): void;
    /**
     * Attach Batch Sent Event
     *
     * @param event - Event to be emitted
     * @param listener - Event Listener
     */
    on(event: "beforeDocumentSent", listener: (e: IndexDocumentsAction<TModel>) => void): void;
    /**
     * Attach Batch Succeeded Event
     *
     * @param event - Event to be emitted
     * @param listener - Event Listener
     */
    on(event: "batchSucceeded", listener: (e: IndexDocumentsResult) => void): void;
    /**
     * Attach Batch Failed Event
     *
     * @param event - Event to be emitted
     * @param listener - Event Listener
     */
    on(event: "batchFailed", listener: (e: RestError) => void): void;
    /**
     * Detach Batch Added Event
     *
     * @param event - Event to be emitted
     * @param listener - Event Listener
     */
    off(event: "batchAdded", listener: (e: {
        action: string;
        documents: TModel[];
    }) => void): void;
    /**
     * Detach Batch Sent Event
     *
     * @param event - Event to be emitted
     * @param listener - Event Listener
     */
    off(event: "beforeDocumentSent", listener: (e: IndexDocumentsAction<TModel>) => void): void;
    /**
     * Detach Batch Succeeded Event
     *
     * @param event - Event to be emitted
     * @param listener - Event Listener
     */
    off(event: "batchSucceeded", listener: (e: IndexDocumentsResult) => void): void;
    /**
     * Detach Batch Failed Event
     *
     * @param event - Event to be emitted
     * @param listener - Event Listener
     */
    off(event: "batchFailed", listener: (e: RestError) => void): void;
    private isBatchReady;
    private internalFlush;
    private pruneActions;
    private submitDocuments;
    private isRetryAbleError;
}

/**
 * Options for SearchIndexingBufferedSenderDeleteDocuments.
 */
export declare type SearchIndexingBufferedSenderDeleteDocumentsOptions = OperationOptions;

/**
 * Options for SearchIndexingBufferedSenderFlushDocuments.
 */
export declare type SearchIndexingBufferedSenderFlushDocumentsOptions = OperationOptions;

/**
 * Options for SearchIndexingBufferedSenderMergeDocuments.
 */
export declare type SearchIndexingBufferedSenderMergeDocumentsOptions = OperationOptions;

/**
 * Options for SearchIndexingBufferedSenderMergeOrUploadDocuments.
 */
export declare type SearchIndexingBufferedSenderMergeOrUploadDocumentsOptions = OperationOptions;

/**
 * Options for SearchIndexingBufferedSender.
 */
export declare interface SearchIndexingBufferedSenderOptions {
    /**
     * Indicates if autoFlush is enabled.
     */
    autoFlush?: boolean;
    /**
     * Initial Batch Action Count.
     *
     * A batch request will be sent once the documents
     * reach the initialBatchActionCount.
     */
    initialBatchActionCount?: number;
    /**
     * Flush Window.
     *
     * A batch request will be sent after flushWindowInMs is
     * reached.
     */
    flushWindowInMs?: number;
    /**
     * Maximum number of Retries
     */
    maxRetriesPerAction?: number;
    /**
     * Delay between retries
     */
    throttlingDelayInMs?: number;
    /**
     * Max Delay between retries
     */
    maxThrottlingDelayInMs?: number;
}

/**
 * Options for SearchIndexingBufferedSenderUploadDocuments.
 */
export declare type SearchIndexingBufferedSenderUploadDocumentsOptions = OperationOptions;

/**
 * Statistics for a given index. Statistics are collected periodically and are not guaranteed to
 * always be up-to-date.
 */
export declare interface SearchIndexStatistics {
    /**
     * The number of documents in the index.
     * **NOTE: This property will not be serialized. It can only be populated by the server.**
     */
    readonly documentCount: number;
    /**
     * The amount of storage in bytes consumed by the index.
     * **NOTE: This property will not be serialized. It can only be populated by the server.**
     */
    readonly storageSize: number;
    /**
     * The amount of memory in bytes consumed by vectors in the index.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly vectorIndexSize: number;
}

/**
 * An iterator for search results of a paticular query. Will make requests
 * as needed during iteration. Use .byPage() to make one request to the server
 * per iteration.
 */
export declare type SearchIterator<TModel extends object, TFields extends SelectFields<TModel> = SelectFields<TModel>> = PagedAsyncIterableIterator<SearchResult<TModel, TFields>, SearchDocumentsPageResult<TModel, TFields>, ListSearchResultsPageSettings>;

/** Defines values for SearchMode. */
export declare type SearchMode = "any" | "all";

/**
 * Options for committing a full search request.
 */
export declare type SearchOptions<TModel extends object, TFields extends SelectFields<TModel> = SelectFields<TModel>> = OperationOptions & SearchRequestOptions<TModel, TFields>;

/**
 * Deeply pick fields of T using valid Cognitive Search OData $select
 * paths.
 */
export declare type SearchPick<TModel extends object, TFields extends SelectFields<TModel>> = (<T>() => T extends TModel ? true : false) extends <T>() => T extends object ? true : false ? TModel : (<T>() => T extends TFields ? true : false) extends <T>() => T extends any ? true : false ? TModel : (<T>() => T extends TFields ? true : false) extends <T>() => T extends never ? true : false ? TModel : // We're going to get a union of individual interfaces for each field in T that's selected, so convert that to an intersection.
UnionToIntersection<TFields extends `${infer FieldName}/${infer RestPaths}` ? FieldName extends keyof TModel & string ? NonNullable<TModel[FieldName]> extends Array<infer Elem> ? Elem extends object ? RestPaths extends SelectFields<Elem> ? {
    [Key in keyof TModel as Key & FieldName]: Array<SearchPick<Elem, RestPaths>>;
} : never : never : NonNullable<TModel[FieldName]> extends object ? {
    [Key in keyof TModel as Key & FieldName]: RestPaths extends SelectFields<TModel[Key] & {}> ? SearchPick<TModel[Key] & {}, RestPaths> | Extract<TModel[Key], null> : never;
} : never : never : TFields extends keyof TModel ? Pick<TModel, TFields> | Extract<TModel, null> : never> & {};

/**
 * Parameters for filtering, sorting, faceting, paging, and other search query behaviors.
 */
export declare type SearchRequestOptions<TModel extends object, TFields extends SelectFields<TModel> = SelectFields<TModel>> = BaseSearchRequestOptions<TModel, TFields> & SearchRequestQueryTypeOptions;

export declare type SearchRequestQueryTypeOptions = {
    queryType: "semantic";
    /**
     * Defines options for semantic search queries
     */
    semanticSearchOptions: SemanticSearchOptions;
} | {
    queryType?: "simple" | "full";
};

/**
 * A customer-managed encryption key in Azure Key Vault. Keys that you create and manage can be
 * used to encrypt or decrypt data-at-rest in Azure Cognitive Search, such as indexes and synonym
 * maps.
 */
export declare interface SearchResourceEncryptionKey {
    /**
     * The name of your Azure Key Vault key to be used to encrypt your data at rest.
     */
    keyName: string;
    /**
     * The version of your Azure Key Vault key to be used to encrypt your data at rest.
     */
    keyVersion: string;
    /**
     * The URI of your Azure Key Vault, also referred to as DNS name, that contains the key to be
     * used to encrypt your data at rest. An example URI might be
     * https://my-keyvault-name.vault.azure.net.
     */
    vaultUrl: string;
    /**
     * An AAD Application ID that was granted the required access permissions to the Azure Key Vault
     * that is to be used when encrypting your data at rest. The Application ID should not be
     * confused with the Object ID for your AAD Application.
     */
    applicationId?: string;
    /**
     * The authentication key of the specified AAD application.
     */
    applicationSecret?: string;
    /**
     * An explicit managed identity to use for this encryption key. If not specified and the access
     * credentials property is null, the system-assigned managed identity is used. On update to the
     * resource, if the explicit identity is unspecified, it remains unchanged. If "none" is specified,
     * the value of this property is cleared.
     */
    identity?: SearchIndexerDataIdentity;
}

/**
 * Contains a document found by a search query, plus associated metadata.
 */
export declare type SearchResult<TModel extends object, TFields extends SelectFields<TModel> = SelectFields<TModel>> = {
    /**
     * The relevance score of the document compared to other documents returned by the query.
     * **NOTE: This property will not be serialized. It can only be populated by the server.**
     */
    readonly score: number;
    /**
     * The relevance score computed by the semantic ranker for the top search results. Search results are sorted by the RerankerScore first and then by the Score. RerankerScore is only returned for queries of type 'semantic'.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly rerankerScore?: number;
    /**
     * Text fragments from the document that indicate the matching search terms, organized by each
     * applicable field; null if hit highlighting was not enabled for the query.
     * **NOTE: This property will not be serialized. It can only be populated by the server.**
     */
    readonly highlights?: {
        [k in SelectFields<TModel>]?: string[];
    };
    /**
     * Captions are the most representative passages from the document relatively to the search query. They are often used as document summary. Captions are only returned for queries of type 'semantic'.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly captions?: QueryCaptionResult[];
    document: NarrowedModel<TModel, TFields>;
};

/**
 * Response from a get service statistics request. If successful, it includes service level
 * counters and limits.
 */
export declare interface SearchServiceStatistics {
    /**
     * Service level resource counters.
     */
    counters: ServiceCounters;
    /**
     * Service level general limits.
     */
    limits: ServiceLimits;
}

/** Defines how the Suggest API should apply to a group of fields in the index. */
export declare interface SearchSuggester {
    /** The name of the suggester. */
    name: string;
    /** A value indicating the capabilities of the suggester. */
    searchMode: "analyzingInfixMatching";
    /** The list of field names to which the suggester applies. Each field must be searchable. */
    sourceFields: string[];
}

/**
 * If `TFields` is never, an untyped string array
 * Otherwise, a narrowed `Fields[]` type to be used elsewhere in the consuming type.
 */
export declare type SelectArray<TFields = never> = [string] extends [TFields] ? readonly TFields[] : (<T>() => T extends TFields ? true : false) extends <T>() => T extends never ? true : false ? readonly string[] : readonly TFields[];

/**
 * Produces a union of valid Cognitive Search OData $select paths for T
 * using a post-order traversal of the field tree rooted at T.
 */
export declare type SelectFields<TModel extends object> = (<T>() => T extends TModel ? true : false) extends <T>() => T extends never ? true : false ? string : (<T>() => T extends TModel ? true : false) extends <T>() => T extends any ? true : false ? string : (<T>() => T extends TModel ? true : false) extends <T>() => T extends object ? true : false ? string : TModel extends Array<infer Elem> ? Elem extends object ? SelectFields<Elem> : never : {
    [Key in keyof TModel]: Key extends string ? NonNullable<TModel[Key]> extends object ? NonNullable<TModel[Key]> extends ExcludedODataTypes ? Key : SelectFields<NonNullable<TModel[Key]>> extends infer NextPaths ? (<T>() => T extends NextPaths ? true : false) extends <T>() => T extends never ? true : false ? Key : NextPaths extends string ? Key | `${Key}/${NextPaths}` : Key : never : Key : never;
}[keyof TModel & string] & string;

/** Defines a specific configuration to be used in the context of semantic capabilities. */
export declare interface SemanticConfiguration {
    /** The name of the semantic configuration. */
    name: string;
    /** Describes the title, content, and keyword fields to be used for semantic ranking, captions, highlights, and answers. At least one of the three sub properties (titleField, prioritizedKeywordsFields and prioritizedContentFields) need to be set. */
    prioritizedFields: SemanticPrioritizedFields;
}

export declare type SemanticErrorMode = `${KnownSemanticErrorMode}`;

export declare type SemanticErrorReason = `${KnownSemanticErrorReason}`;

/** A field that is used as part of the semantic configuration. */
export declare interface SemanticField {
    name: string;
}

/** Describes the title, content, and keywords fields to be used for semantic ranking, captions, highlights, and answers. */
export declare interface SemanticPrioritizedFields {
    /** Defines the title field to be used for semantic ranking, captions, highlights, and answers. If you don't have a title field in your index, leave this blank. */
    titleField?: SemanticField;
    /** Defines the content fields to be used for semantic ranking, captions, highlights, and answers. For the best result, the selected fields should contain text in natural language form. The order of the fields in the array represents their priority. Fields with lower priority may get truncated if the content is long. */
    contentFields?: SemanticField[];
    /** Defines the keyword fields to be used for semantic ranking, captions, highlights, and answers. For the best result, the selected fields should contain a list of keywords. The order of the fields in the array represents their priority. Fields with lower priority may get truncated if the content is long. */
    keywordsFields?: SemanticField[];
}

/** Defines parameters for a search index that influence semantic capabilities. */
export declare interface SemanticSearch {
    /** Allows you to set the name of a default semantic configuration in your index, making it optional to pass it on as a query parameter every time. */
    defaultConfigurationName?: string;
    /** The semantic configurations for the index. */
    configurations?: SemanticConfiguration[];
}

/**
 * Defines options for semantic search queries
 */
export declare interface SemanticSearchOptions {
    /**
     * The name of a semantic configuration that will be used when processing documents for queries of
     * type semantic.
     */
    configurationName?: string;
    /**
     * Allows the user to choose whether a semantic call should fail completely, or to return partial
     * results (default).
     */
    errorMode?: SemanticErrorMode;
    /**
     * Allows the user to set an upper bound on the amount of time it takes for semantic enrichment
     * to finish processing before the request fails.
     */
    maxWaitInMilliseconds?: number;
    /**
     * If set, the query returns answers extracted from key passages in the highest ranked documents.
     */
    answers?: QueryAnswer;
    /**
     * If set, the query returns captions extracted from key passages in the highest ranked
     * documents. When Captions is set to 'extractive', highlighting is enabled by default. Defaults
     * to 'None'.
     */
    captions?: QueryCaption;
    /**
     * Allows setting a separate search query that will be solely used for semantic reranking,
     * semantic captions and semantic answers. Is useful for scenarios where there is a need to use
     * different queries between the base retrieval and ranking phase, and the L2 semantic phase.
     */
    semanticQuery?: string;
}

export declare type SemanticSearchResultsType = `${KnownSemanticSearchResultsType}`;

/**
 * Text analytics positive-negative sentiment analysis, scored as a floating point value in a range of zero to 1.
 *
 * @deprecated This skill has been deprecated.
 */
export declare interface SentimentSkill extends BaseSearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Text.SentimentSkill";
    /** A value indicating which language code to use. Default is en. */
    defaultLanguageCode?: SentimentSkillLanguage;
}

export declare type SentimentSkillLanguage = `${KnownSentimentSkillLanguage}`;

/** Using the Text Analytics API, evaluates unstructured text and for each record, provides sentiment labels (such as "negative", "neutral" and "positive") based on the highest confidence score found by the service at a sentence and document-level. */
export declare interface SentimentSkillV3 extends BaseSearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Text.V3.SentimentSkill";
    /** A value indicating which language code to use. Default is `en`. */
    defaultLanguageCode?: string;
    /** If set to true, the skill output will include information from Text Analytics for opinion mining, namely targets (nouns or verbs) and their associated assessment (adjective) in the text. Default is false. */
    includeOpinionMining?: boolean;
    /** The version of the model to use when calling the Text Analytics service. It will default to the latest available when not specified. We recommend you do not specify this value unless absolutely necessary. */
    modelVersion?: string;
}

/** Represents service-level resource counters and quotas. */
export declare interface ServiceCounters {
    /** Total number of documents across all indexes in the service. */
    documentCounter: ResourceCounter;
    /** Total number of indexes. */
    indexCounter: ResourceCounter;
    /** Total number of indexers. */
    indexerCounter: ResourceCounter;
    /** Total number of data sources. */
    dataSourceCounter: ResourceCounter;
    /** Total size of used storage in bytes. */
    storageSizeCounter: ResourceCounter;
    /** Total number of synonym maps. */
    synonymMapCounter: ResourceCounter;
    /** Total number of skillsets. */
    skillsetCounter: ResourceCounter;
    /** Total memory consumption of all vector indexes within the service, in bytes. */
    vectorIndexSizeCounter: ResourceCounter;
}

/** Represents various service level limits. */
export declare interface ServiceLimits {
    /** The maximum allowed fields per index. */
    maxFieldsPerIndex?: number;
    /** The maximum depth which you can nest sub-fields in an index, including the top-level complex field. For example, a/b/c has a nesting depth of 3. */
    maxFieldNestingDepthPerIndex?: number;
    /** The maximum number of fields of type Collection(Edm.ComplexType) allowed in an index. */
    maxComplexCollectionFieldsPerIndex?: number;
    /** The maximum number of objects in complex collections allowed per document. */
    maxComplexObjectsInCollectionsPerDocument?: number;
    /** The maximum amount of storage in bytes allowed per index. */
    maxStoragePerIndexInBytes?: number;
}

/** A skill for reshaping the outputs. It creates a complex type to support composite fields (also known as multipart fields). */
export declare interface ShaperSkill extends BaseSearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Util.ShaperSkill";
}

/** Creates combinations of tokens as a single token. This token filter is implemented using Apache Lucene. */
export declare interface ShingleTokenFilter extends BaseTokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.ShingleTokenFilter";
    /** The maximum shingle size. Default and minimum value is 2. */
    maxShingleSize?: number;
    /** The minimum shingle size. Default and minimum value is 2. Must be less than the value of maxShingleSize. */
    minShingleSize?: number;
    /** A value indicating whether the output stream will contain the input tokens (unigrams) as well as shingles. Default is true. */
    outputUnigrams?: boolean;
    /** A value indicating whether to output unigrams for those times when no shingles are available. This property takes precedence when outputUnigrams is set to false. Default is false. */
    outputUnigramsIfNoShingles?: boolean;
    /** The string to use when joining adjacent tokens to form a shingle. Default is a single space (" "). */
    tokenSeparator?: string;
    /** The string to insert for each position at which there is no token. Default is an underscore ("_"). */
    filterToken?: string;
}

/** Base type for similarity algorithms. Similarity algorithms are used to calculate scores that tie queries to documents. The higher the score, the more relevant the document is to that specific query. Those scores are used to rank the search results. */
export declare interface Similarity {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.ClassicSimilarity" | "#Microsoft.Azure.Search.BM25Similarity";
}

/**
 * Contains the possible cases for Similarity.
 */
export declare type SimilarityAlgorithm = ClassicSimilarity | BM25Similarity;

/**
 * Represents a field in an index definition, which describes the name, data type, and search
 * behavior of a field.
 */
export declare interface SimpleField {
    /**
     * The name of the field, which must be unique within the fields collection of the index or
     * parent field.
     */
    name: string;
    /**
     * The data type of the field.
     */
    type: SearchFieldDataType;
    /**
     * A value indicating whether the field uniquely identifies documents in the index. Exactly one
     * top-level field in each index must be chosen as the key field and it must be of type
     * Edm.String. Key fields can be used to look up documents directly and update or delete specific
     * documents. Default is false.
     */
    key?: boolean;
    /**
     * A value indicating whether the field can be returned in a search result. You can disable this
     * option if you want to use a field (for example, margin) as a filter, sorting, or scoring
     * mechanism but do not want the field to be visible to the end user. This property must be false
     * for key fields. This property can be changed on existing fields. Enabling this property does
     * not cause any increase in index storage requirements. Default is true for vector fields, false
     * otherwise.
     */
    hidden?: boolean;
    /**
     * An immutable value indicating whether the field will be persisted separately on disk to be
     * returned in a search result. You can disable this option if you don't plan to return the field
     * contents in a search response to save on storage overhead. This can only be set during index
     * creation and only for vector fields. This property cannot be changed for existing fields or set
     * as false for new fields. If this property is set as false, the property 'hidden' must be set to
     * 'true'. This property must be false or unset for key fields, for new fields, and for non-vector
     * fields. Disabling this property will reduce index storage requirements.
     */
    stored?: boolean;
    /**
     * A value indicating whether the field is full-text searchable. This means it will undergo
     * analysis such as word-breaking during indexing. If you set a searchable field to a value like
     * "sunny day", internally it will be split into the individual tokens "sunny" and "day". This
     * enables full-text searches for these terms. Fields of type Edm.String or Collection(Edm.String)
     * are searchable by default. This property must be false for simple fields of other non-string
     * data types. Note: searchable fields consume extra space
     * in your index to accommodate additional tokenized versions of the field value for full-text
     * searches. If you want to save space in your index and you don't need a field to be included in
     * searches, set searchable to false. Default is false.
     */
    searchable?: boolean;
    /**
     * A value indicating whether to enable the field to be referenced in $filter queries. filterable
     * differs from searchable in how strings are handled. Fields of type Edm.String or
     * Collection(Edm.String) that are filterable do not undergo word-breaking, so comparisons are for
     * exact matches only. For example, if you set such a field f to "sunny day", $filter=f eq 'sunny'
     * will find no matches, but $filter=f eq 'sunny day' will. Default is false.
     */
    filterable?: boolean;
    /**
     * A value indicating whether to enable the field to be referenced in $orderby expressions. By
     * default, the search engine sorts results by score, but in many experiences users will want to
     * sort by fields in the documents. A simple field can be sortable only if it is single-valued (it
     * has a single value in the scope of the parent document). Simple collection fields cannot be
     * sortable, since they are multi-valued. Simple sub-fields of complex collections are also
     * multi-valued, and therefore cannot be sortable. This is true whether it's an immediate parent
     * field, or an ancestor field, that's the complex collection. The default is false.
     *
     */
    sortable?: boolean;
    /**
     * A value indicating whether to enable the field to be referenced in facet queries. Typically
     * used in a presentation of search results that includes hit count by category (for example,
     * search for digital cameras and see hits by brand, by megapixels, by price, and so on). Fields
     * of type Edm.GeographyPoint or Collection(Edm.GeographyPoint) cannot be facetable. Default is
     * false.
     */
    facetable?: boolean;
    /**
     * The name of the analyzer to use for the field. This option can be used only with searchable
     * fields and it can't be set together with either searchAnalyzer or indexAnalyzer. Once the
     * analyzer is chosen, it cannot be changed for the field.
     */
    analyzerName?: LexicalAnalyzerName;
    /**
     * The name of the analyzer used at search time for the field. This option can be used only with
     * searchable fields. It must be set together with `indexAnalyzerName` and it cannot be set
     * together with the `analyzerName` option. This property cannot be set to the name of a language
     * analyzer; use the `analyzerName` property instead if you need a language analyzer. This
     * analyzer can be updated on an existing field.
     */
    searchAnalyzerName?: LexicalAnalyzerName;
    /**
     * The name of the analyzer used at indexing time for the field. This option can be used only
     * with searchable fields. It must be set together with searchAnalyzer and it cannot be set
     * together with the analyzer option.  This property cannot be set to the name of a language
     * analyzer; use the analyzer property instead if you need a language analyzer. Once the analyzer
     * is chosen, it cannot be changed for the field.
     */
    indexAnalyzerName?: LexicalAnalyzerName;
    /**
     * A list of the names of synonym maps to associate with this field. This option can be used only
     * with searchable fields. Currently only one synonym map per field is supported. Assigning a
     * synonym map to a field ensures that query terms targeting that field are expanded at query-time
     * using the rules in the synonym map. This attribute can be changed on existing fields.
     */
    synonymMapNames?: string[];
    /**
     * The dimensionality of the vector field.
     */
    vectorSearchDimensions?: number;
    /**
     * The name of the vector search profile that specifies the algorithm and vectorizer to use when
     * searching the vector field.
     */
    vectorSearchProfileName?: string;
    /**
     * The encoding format to interpret the field contents.
     */
    vectorEncodingFormat?: VectorEncodingFormat;
}

/** A filter that stems words using a Snowball-generated stemmer. This token filter is implemented using Apache Lucene. */
export declare interface SnowballTokenFilter extends BaseTokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.SnowballTokenFilter";
    /** The language to use. */
    language: SnowballTokenFilterLanguage;
}

/** Defines values for SnowballTokenFilterLanguage. */
export declare type SnowballTokenFilterLanguage = "armenian" | "basque" | "catalan" | "danish" | "dutch" | "english" | "finnish" | "french" | "german" | "german2" | "hungarian" | "italian" | "kp" | "lovins" | "norwegian" | "porter" | "portuguese" | "romanian" | "russian" | "spanish" | "swedish" | "turkish";

/** Defines a data deletion detection policy that implements a soft-deletion strategy. It determines whether an item should be deleted based on the value of a designated 'soft delete' column. */
export declare interface SoftDeleteColumnDeletionDetectionPolicy extends BaseDataDeletionDetectionPolicy {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.SoftDeleteColumnDeletionDetectionPolicy";
    /** The name of the column to use for soft-deletion detection. */
    softDeleteColumnName?: string;
    /** The marker value that identifies an item as deleted. */
    softDeleteMarkerValue?: string;
}

/** A skill to split a string into chunks of text. */
export declare interface SplitSkill extends BaseSearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Text.SplitSkill";
    /** A value indicating which language code to use. Default is en. */
    defaultLanguageCode?: SplitSkillLanguage;
    /** A value indicating which split mode to perform. */
    textSplitMode?: TextSplitMode;
    /** The desired maximum page length. Default is 10000. */
    maxPageLength?: number;
}

export declare type SplitSkillLanguage = `${KnownSplitSkillLanguage}`;

/** Defines a data change detection policy that captures changes using the Integrated Change Tracking feature of Azure SQL Database. */
export declare interface SqlIntegratedChangeTrackingPolicy extends BaseDataChangeDetectionPolicy {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.SqlIntegratedChangeTrackingPolicy";
}

/** Provides the ability to override other stemming filters with custom dictionary-based stemming. Any dictionary-stemmed terms will be marked as keywords so that they will not be stemmed with stemmers down the chain. Must be placed before any stemming filters. This token filter is implemented using Apache Lucene. */
export declare interface StemmerOverrideTokenFilter extends BaseTokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.StemmerOverrideTokenFilter";
    /** A list of stemming rules in the following format: "word => stem", for example: "ran => run". */
    rules: string[];
}

/** Language specific stemming filter. This token filter is implemented using Apache Lucene. */
export declare interface StemmerTokenFilter extends BaseTokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.StemmerTokenFilter";
    /** The language to use. */
    language: StemmerTokenFilterLanguage;
}

/** Defines values for StemmerTokenFilterLanguage. */
export declare type StemmerTokenFilterLanguage = "arabic" | "armenian" | "basque" | "brazilian" | "bulgarian" | "catalan" | "czech" | "danish" | "dutch" | "dutchKp" | "english" | "lightEnglish" | "minimalEnglish" | "possessiveEnglish" | "porter2" | "lovins" | "finnish" | "lightFinnish" | "french" | "lightFrench" | "minimalFrench" | "galician" | "minimalGalician" | "german" | "german2" | "lightGerman" | "minimalGerman" | "greek" | "hindi" | "hungarian" | "lightHungarian" | "indonesian" | "irish" | "italian" | "lightItalian" | "sorani" | "latvian" | "norwegian" | "lightNorwegian" | "minimalNorwegian" | "lightNynorsk" | "minimalNynorsk" | "portuguese" | "lightPortuguese" | "minimalPortuguese" | "portugueseRslp" | "romanian" | "russian" | "lightRussian" | "spanish" | "lightSpanish" | "swedish" | "lightSwedish" | "turkish";

/** Divides text at non-letters; Applies the lowercase and stopword token filters. This analyzer is implemented using Apache Lucene. */
export declare interface StopAnalyzer extends BaseLexicalAnalyzer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.StopAnalyzer";
    /** A list of stopwords. */
    stopwords?: string[];
}

/** Defines values for StopwordsList. */
export declare type StopwordsList = "arabic" | "armenian" | "basque" | "brazilian" | "bulgarian" | "catalan" | "czech" | "danish" | "dutch" | "english" | "finnish" | "french" | "galician" | "german" | "greek" | "hindi" | "hungarian" | "indonesian" | "irish" | "italian" | "latvian" | "norwegian" | "persian" | "portuguese" | "romanian" | "russian" | "sorani" | "spanish" | "swedish" | "thai" | "turkish";

/** Removes stop words from a token stream. This token filter is implemented using Apache Lucene. */
export declare interface StopwordsTokenFilter extends BaseTokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.StopwordsTokenFilter";
    /** The list of stopwords. This property and the stopwords list property cannot both be set. */
    stopwords?: string[];
    /** A predefined list of stopwords to use. This property and the stopwords property cannot both be set. Default is English. */
    stopwordsList?: StopwordsList;
    /** A value indicating whether to ignore case. If true, all words are converted to lower case first. Default is false. */
    ignoreCase?: boolean;
    /** A value indicating whether to ignore the last search term if it's a stop word. Default is true. */
    removeTrailingStopWords?: boolean;
}

/**
 * Response containing suggestion query results from an index.
 */
export declare interface SuggestDocumentsResult<TModel extends object, TFields extends SelectFields<TModel> = SelectFields<TModel>> {
    /**
     * The sequence of results returned by the query.
     * **NOTE: This property will not be serialized. It can only be populated by the server.**
     */
    readonly results: SuggestResult<TModel, TFields>[];
    /**
     * A value indicating the percentage of the index that was included in the query, or null if
     * minimumCoverage was not set in the request.
     * **NOTE: This property will not be serialized. It can only be populated by the server.**
     */
    readonly coverage?: number;
}

export declare type SuggestNarrowedModel<TModel extends object, TFields extends SelectFields<TModel> = SelectFields<TModel>> = (<T>() => T extends TModel ? true : false) extends <T>() => T extends never ? true : false ? TModel : (<T>() => T extends TModel ? true : false) extends <T>() => T extends object ? true : false ? TModel : (<T>() => T extends TFields ? true : false) extends <T>() => T extends never ? true : false ? keyof ExtractDocumentKey<TModel> extends never ? TModel : ExtractDocumentKey<TModel> : TFields extends SelectFields<TModel> ? NarrowedModel<TModel, TFields> : never;

/**
 * Options for retrieving suggestions based on the searchText.
 */
export declare type SuggestOptions<TModel extends object, TFields extends SelectFields<TModel> = SelectFields<TModel>> = OperationOptions & SuggestRequest<TModel, TFields>;

/**
 * Parameters for filtering, sorting, fuzzy matching, and other suggestions query behaviors.
 */
export declare interface SuggestRequest<TModel extends object, TFields extends SelectFields<TModel> = SelectFields<TModel>> {
    /**
     * An OData expression that filters the documents considered for suggestions.
     */
    filter?: string;
    /**
     * A value indicating whether to use fuzzy matching for the suggestion query. Default is false.
     * When set to true, the query will find suggestions even if there's a substituted or missing
     * character in the search text. While this provides a better experience in some scenarios, it
     * comes at a performance cost as fuzzy suggestion searches are slower and consume more
     * resources.
     */
    useFuzzyMatching?: boolean;
    /**
     * A string tag that is appended to hit highlights. Must be set with highlightPreTag. If omitted,
     * hit highlighting of suggestions is disabled.
     */
    highlightPostTag?: string;
    /**
     * A string tag that is prepended to hit highlights. Must be set with highlightPostTag. If
     * omitted, hit highlighting of suggestions is disabled.
     */
    highlightPreTag?: string;
    /**
     * A number between 0 and 100 indicating the percentage of the index that must be covered by a
     * suggestion query in order for the query to be reported as a success. This parameter can be
     * useful for ensuring search availability even for services with only one replica. The default
     * is 80.
     */
    minimumCoverage?: number;
    /**
     * The list of OData $orderby expressions by which to sort the results. Each
     * expression can be either a field name or a call to either the geo.distance() or the
     * search.score() functions. Each expression can be followed by asc to indicate ascending, or
     * desc to indicate descending. The default is ascending order. Ties will be broken by the match
     * scores of documents. If no $orderby is specified, the default sort order is descending by
     * document match score. There can be at most 32 $orderby clauses.
     */
    orderBy?: string[];
    /**
     * The comma-separated list of field names to search for the specified search text. Target fields
     * must be included in the specified suggester.
     */
    searchFields?: SearchFieldArray<TModel>;
    /**
     * The list of fields to retrieve. If unspecified, only the key field will be
     * included in the results.
     */
    select?: SelectArray<TFields>;
    /**
     /**
     * The number of suggestions to retrieve. This must be a value between 1 and 100. The default is
     * 5.
     */
    top?: number;
}

/**
 * A result containing a document found by a suggestion query, plus associated metadata.
 */
export declare type SuggestResult<TModel extends object, TFields extends SelectFields<TModel> = SelectFields<TModel>> = {
    /**
     * The text of the suggestion result.
     * **NOTE: This property will not be serialized. It can only be populated by the server.**
     */
    readonly text: string;
    document: SuggestNarrowedModel<TModel, TFields>;
};

/**
 * Represents a synonym map definition.
 */
export declare interface SynonymMap {
    /**
     * The name of the synonym map.
     */
    name: string;
    /**
     * An array of synonym rules in the specified synonym map format.
     */
    synonyms: string[];
    /**
     * A description of an encryption key that you create in Azure Key Vault. This key is used to
     * provide an additional level of encryption-at-rest for your data when you want full assurance
     * that no one, not even Microsoft, can decrypt your data in Azure Cognitive Search. Once you
     * have encrypted your data, it will always remain encrypted. Azure Cognitive Search will ignore
     * attempts to set this property to null. You can change this property as needed if you want to
     * rotate your encryption key; Your data will be unaffected. Encryption with customer-managed
     * keys is not available for free search services, and is only available for paid services
     * created on or after January 1, 2019.
     */
    encryptionKey?: SearchResourceEncryptionKey;
    /**
     * The ETag of the synonym map.
     */
    etag?: string;
}

/** Matches single or multi-word synonyms in a token stream. This token filter is implemented using Apache Lucene. */
export declare interface SynonymTokenFilter extends BaseTokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.SynonymTokenFilter";
    /** A list of synonyms in following one of two formats: 1. incredible, unbelievable, fabulous => amazing - all terms on the left side of => symbol will be replaced with all terms on its right side; 2. incredible, unbelievable, fabulous, amazing - comma separated list of equivalent words. Set the expand option to change how this list is interpreted. */
    synonyms: string[];
    /** A value indicating whether to case-fold input for matching. Default is false. */
    ignoreCase?: boolean;
    /** A value indicating whether all words in the list of synonyms (if => notation is not used) will map to one another. If true, all words in the list of synonyms (if => notation is not used) will map to one another. The following list: incredible, unbelievable, fabulous, amazing is equivalent to: incredible, unbelievable, fabulous, amazing => incredible, unbelievable, fabulous, amazing. If false, the following list: incredible, unbelievable, fabulous, amazing will be equivalent to: incredible, unbelievable, fabulous, amazing => incredible. Default is true. */
    expand?: boolean;
}

/** Defines a function that boosts scores of documents with string values matching a given list of tags. */
export declare interface TagScoringFunction extends BaseScoringFunction {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    type: "tag";
    /** Parameter values for the tag scoring function. */
    parameters: TagScoringParameters;
}

/** Provides parameter values to a tag scoring function. */
export declare interface TagScoringParameters {
    /** The name of the parameter passed in search queries to specify the list of tags to compare against the target field. */
    tagsParameter: string;
}

export declare type TextSplitMode = `${KnownTextSplitMode}`;

/** A skill to translate text from one language to another. */
export declare interface TextTranslationSkill extends BaseSearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Text.TranslationSkill";
    /** The language code to translate documents into for documents that don't specify the to language explicitly. */
    defaultToLanguageCode: TextTranslationSkillLanguage;
    /** The language code to translate documents from for documents that don't specify the from language explicitly. */
    defaultFromLanguageCode?: TextTranslationSkillLanguage;
    /** The language code to translate documents from when neither the fromLanguageCode input nor the defaultFromLanguageCode parameter are provided, and the automatic language detection is unsuccessful. Default is en. */
    suggestedFrom?: TextTranslationSkillLanguage;
}

export declare type TextTranslationSkillLanguage = `${KnownTextTranslationSkillLanguage}`;

/** Defines weights on index fields for which matches should boost scoring in search queries. */
export declare interface TextWeights {
    /** The dictionary of per-field weights to boost document scoring. The keys are field names and the values are the weights for each field. */
    weights: {
        [propertyName: string]: number;
    };
}

/** Defines values for TokenCharacterKind. */
export declare type TokenCharacterKind = "letter" | "digit" | "whitespace" | "punctuation" | "symbol";

/**
 * Contains the possible cases for TokenFilter.
 */
export declare type TokenFilter = AsciiFoldingTokenFilter | CjkBigramTokenFilter | CommonGramTokenFilter | DictionaryDecompounderTokenFilter | EdgeNGramTokenFilter | ElisionTokenFilter | KeepTokenFilter | KeywordMarkerTokenFilter | LengthTokenFilter | LimitTokenFilter | NGramTokenFilter | PatternCaptureTokenFilter | PatternReplaceTokenFilter | PhoneticTokenFilter | ShingleTokenFilter | SnowballTokenFilter | StemmerTokenFilter | StemmerOverrideTokenFilter | StopwordsTokenFilter | SynonymTokenFilter | TruncateTokenFilter | UniqueTokenFilter | WordDelimiterTokenFilter;

/**
 * Defines values for TokenFilterName. \
 * {@link KnownTokenFilterName} can be used interchangeably with TokenFilterName,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **arabic_normalization**: A token filter that applies the Arabic normalizer to normalize the orthography. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/ar\/ArabicNormalizationFilter.html \
 * **apostrophe**: Strips all characters after an apostrophe (including the apostrophe itself). See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/tr\/ApostropheFilter.html \
 * **asciifolding**: Converts alphabetic, numeric, and symbolic Unicode characters which are not in the first 127 ASCII characters (the "Basic Latin" Unicode block) into their ASCII equivalents, if such equivalents exist. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/miscellaneous\/ASCIIFoldingFilter.html \
 * **cjk_bigram**: Forms bigrams of CJK terms that are generated from the standard tokenizer. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/cjk\/CJKBigramFilter.html \
 * **cjk_width**: Normalizes CJK width differences. Folds fullwidth ASCII variants into the equivalent basic Latin, and half-width Katakana variants into the equivalent Kana. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/cjk\/CJKWidthFilter.html \
 * **classic**: Removes English possessives, and dots from acronyms. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/standard\/ClassicFilter.html \
 * **common_grams**: Construct bigrams for frequently occurring terms while indexing. Single terms are still indexed too, with bigrams overlaid. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/commongrams\/CommonGramsFilter.html \
 * **edgeNGram_v2**: Generates n-grams of the given size(s) starting from the front or the back of an input token. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/ngram\/EdgeNGramTokenFilter.html \
 * **elision**: Removes elisions. For example, "l'avion" (the plane) will be converted to "avion" (plane). See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/util\/ElisionFilter.html \
 * **german_normalization**: Normalizes German characters according to the heuristics of the German2 snowball algorithm. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/de\/GermanNormalizationFilter.html \
 * **hindi_normalization**: Normalizes text in Hindi to remove some differences in spelling variations. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/hi\/HindiNormalizationFilter.html \
 * **indic_normalization**: Normalizes the Unicode representation of text in Indian languages. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/in\/IndicNormalizationFilter.html \
 * **keyword_repeat**: Emits each incoming token twice, once as keyword and once as non-keyword. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/miscellaneous\/KeywordRepeatFilter.html \
 * **kstem**: A high-performance kstem filter for English. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/en\/KStemFilter.html \
 * **length**: Removes words that are too long or too short. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/miscellaneous\/LengthFilter.html \
 * **limit**: Limits the number of tokens while indexing. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/miscellaneous\/LimitTokenCountFilter.html \
 * **lowercase**: Normalizes token text to lower case. See https:\/\/lucene.apache.org\/core\/6_6_1\/analyzers-common\/org\/apache\/lucene\/analysis\/core\/LowerCaseFilter.html \
 * **nGram_v2**: Generates n-grams of the given size(s). See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/ngram\/NGramTokenFilter.html \
 * **persian_normalization**: Applies normalization for Persian. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/fa\/PersianNormalizationFilter.html \
 * **phonetic**: Create tokens for phonetic matches. See https:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-phonetic\/org\/apache\/lucene\/analysis\/phonetic\/package-tree.html \
 * **porter_stem**: Uses the Porter stemming algorithm to transform the token stream. See http:\/\/tartarus.org\/~martin\/PorterStemmer \
 * **reverse**: Reverses the token string. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/reverse\/ReverseStringFilter.html \
 * **scandinavian_normalization**: Normalizes use of the interchangeable Scandinavian characters. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/miscellaneous\/ScandinavianNormalizationFilter.html \
 * **scandinavian_folding**: Folds Scandinavian characters åÅäæÄÆ-&gt;a and öÖøØ-&gt;o. It also discriminates against use of double vowels aa, ae, ao, oe and oo, leaving just the first one. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/miscellaneous\/ScandinavianFoldingFilter.html \
 * **shingle**: Creates combinations of tokens as a single token. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/shingle\/ShingleFilter.html \
 * **snowball**: A filter that stems words using a Snowball-generated stemmer. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/snowball\/SnowballFilter.html \
 * **sorani_normalization**: Normalizes the Unicode representation of Sorani text. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/ckb\/SoraniNormalizationFilter.html \
 * **stemmer**: Language specific stemming filter. See https:\/\/learn.microsoft.com\/rest\/api\/searchservice\/Custom-analyzers-in-Azure-Search#TokenFilters \
 * **stopwords**: Removes stop words from a token stream. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/core\/StopFilter.html \
 * **trim**: Trims leading and trailing whitespace from tokens. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/miscellaneous\/TrimFilter.html \
 * **truncate**: Truncates the terms to a specific length. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/miscellaneous\/TruncateTokenFilter.html \
 * **unique**: Filters out tokens with same text as the previous token. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/miscellaneous\/RemoveDuplicatesTokenFilter.html \
 * **uppercase**: Normalizes token text to upper case. See https:\/\/lucene.apache.org\/core\/6_6_1\/analyzers-common\/org\/apache\/lucene\/analysis\/core\/UpperCaseFilter.html \
 * **word_delimiter**: Splits words into subwords and performs optional transformations on subword groups.
 */
export declare type TokenFilterName = string;

/** Truncates the terms to a specific length. This token filter is implemented using Apache Lucene. */
export declare interface TruncateTokenFilter extends BaseTokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.TruncateTokenFilter";
    /** The length at which terms will be truncated. Default and maximum is 300. */
    length?: number;
}

/** Tokenizes urls and emails as one token. This tokenizer is implemented using Apache Lucene. */
export declare interface UaxUrlEmailTokenizer extends BaseLexicalTokenizer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.UaxUrlEmailTokenizer";
    /** The maximum token length. Default is 255. Tokens longer than the maximum length are split. The maximum token length that can be used is 300 characters. */
    maxTokenLength?: number;
}

export declare type UnionToIntersection<Union> = (Union extends unknown ? (_: Union) => unknown : never) extends (_: infer I) => unknown ? I : never;

/** Filters out tokens with same text as the previous token. This token filter is implemented using Apache Lucene. */
export declare interface UniqueTokenFilter extends BaseTokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.UniqueTokenFilter";
    /** A value indicating whether to remove duplicates only at the same position. Default is false. */
    onlyOnSamePosition?: boolean;
}

/**
 * Options for the upload documents operation.
 */
export declare type UploadDocumentsOptions = IndexDocumentsOptions;

/**
 * Defines values for VectorEncodingFormat. \
 * {@link KnownVectorEncodingFormat} can be used interchangeably with VectorEncodingFormat,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **packedBit**: Encoding format representing bits packed into a wider data type.
 */
export declare type VectorEncodingFormat = string;

export declare type VectorFilterMode = `${KnownVectorFilterMode}`;

/** The query parameters to use for vector search when a text value that needs to be vectorized is provided. */
export declare interface VectorizableTextQuery<TModel extends object> extends BaseVectorQuery<TModel> {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    kind: "text";
    /** The text to be vectorized to perform a vector search query. */
    text: string;
}

/** The query parameters to use for vector search when a raw vector value is provided. */
export declare interface VectorizedQuery<TModel extends object> extends BaseVectorQuery<TModel> {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    kind: "vector";
    /** The vector representation of a search query. */
    vector: number[];
}

/** The query parameters for vector and hybrid search queries. */
export declare type VectorQuery<TModel extends object> = VectorizedQuery<TModel> | VectorizableTextQuery<TModel>;

export declare type VectorQueryKind = `${KnownVectorQueryKind}`;

/** Contains configuration options related to vector search. */
export declare interface VectorSearch {
    /** Defines combinations of configurations to use with vector search. */
    profiles?: VectorSearchProfile[];
    /** Contains configuration options specific to the algorithm used during indexing or querying. */
    algorithms?: VectorSearchAlgorithmConfiguration[];
    /** Contains configuration options on how to vectorize text vector queries. */
    vectorizers?: VectorSearchVectorizer[];
    /** Contains configuration options specific to the compression method used during indexing or querying. */
    compressions?: VectorSearchCompression[];
}

/** Contains configuration options specific to the algorithm used during indexing and/or querying. */
export declare type VectorSearchAlgorithmConfiguration = HnswAlgorithmConfiguration | ExhaustiveKnnAlgorithmConfiguration;

export declare type VectorSearchAlgorithmKind = `${KnownVectorSearchAlgorithmKind}`;

export declare type VectorSearchAlgorithmMetric = `${KnownVectorSearchAlgorithmMetric}`;

/** Contains configuration options specific to the compression method used during indexing or querying. */
export declare type VectorSearchCompression = BinaryQuantizationCompression | ScalarQuantizationCompression;

/**
 * Defines values for VectorSearchCompressionKind. \
 * {@link KnownVectorSearchCompressionKind} can be used interchangeably with VectorSearchCompressionKind,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **scalarQuantization**: Scalar Quantization, a type of compression method. In scalar quantization, the original vectors values are compressed to a narrower type by discretizing and representing each component of a vector using a reduced set of quantized values, thereby reducing the overall data size. \
 * **binaryQuantization**: Binary Quantization, a type of compression method. In binary quantization, the original vectors values are compressed to the narrower binary type by discretizing and representing each component of a vector using binary values, thereby reducing the overall data size.
 */
export declare type VectorSearchCompressionKind = string;

/**
 * Defines values for VectorSearchCompressionTarget. \
 * {@link KnownVectorSearchCompressionTarget} can be used interchangeably with VectorSearchCompressionTarget,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **int8**
 */
export declare type VectorSearchCompressionTarget = string;

/**
 * Defines options for vector search queries
 */
export declare interface VectorSearchOptions<TModel extends object> {
    /**
     * The query parameters for vector, hybrid, and multi-vector search queries.
     */
    queries: VectorQuery<TModel>[];
    /**
     * Determines whether or not filters are applied before or after the vector search is performed.
     * Default is 'preFilter'.
     */
    filterMode?: VectorFilterMode;
}

/** Defines a combination of configurations to use with vector search. */
export declare interface VectorSearchProfile {
    /** The name to associate with this particular vector search profile. */
    name: string;
    /** The name of the vector search algorithm configuration that specifies the algorithm and optional parameters. */
    algorithmConfigurationName: string;
    /** The name of the vectorization being configured for use with vector search. */
    vectorizerName?: string;
    /** The name of the compression method configuration that specifies the compression method and optional parameters. */
    compressionName?: string;
}

/** Contains configuration options on how to vectorize text vector queries. */
export declare type VectorSearchVectorizer = AzureOpenAIVectorizer | WebApiVectorizer;

/**
 * Defines values for VectorSearchVectorizerKind. \
 * {@link KnownVectorSearchVectorizerKind} can be used interchangeably with VectorSearchVectorizerKind,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **azureOpenAI**: Generate embeddings using an Azure OpenAI resource at query time. \
 * **customWebApi**: Generate embeddings using a custom web endpoint at query time.
 */
export declare type VectorSearchVectorizerKind = string;

export declare type VisualFeature = `${KnownVisualFeature}`;

/** Specifies the properties for connecting to a user-defined vectorizer. */
export declare interface WebApiParameters {
    /** The URI of the Web API providing the vectorizer. */
    uri?: string;
    /** The headers required to make the HTTP request. */
    httpHeaders?: {
        [propertyName: string]: string;
    };
    /** The method for the HTTP request. */
    httpMethod?: string;
    /** The desired timeout for the request. Default is 30 seconds. */
    timeout?: string;
    /** Applies to custom endpoints that connect to external code in an Azure function or some other application that provides the transformations. This value should be the application ID created for the function or app when it was registered with Azure Active Directory. When specified, the vectorization connects to the function or app using a managed ID (either system or user-assigned) of the search service and the access token of the function or app, using this value as the resource id for creating the scope of the access token. */
    authResourceId?: string;
    /** The user-assigned managed identity used for outbound connections. If an authResourceId is provided and it's not specified, the system-assigned managed identity is used. On updates to the indexer, if the identity is unspecified, the value remains unchanged. If set to "none", the value of this property is cleared. */
    authIdentity?: SearchIndexerDataIdentity;
}

/**
 * A skill that can call a Web API endpoint, allowing you to extend a skillset by having it call
 * your custom code.
 */
export declare interface WebApiSkill extends BaseSearchIndexerSkill {
    /**
     * Polymorphic discriminator, which specifies the different types this object can be
     */
    odatatype: "#Microsoft.Skills.Custom.WebApiSkill";
    /**
     * The url for the Web API.
     */
    uri: string;
    /**
     * The headers required to make the http request.
     */
    httpHeaders?: {
        [propertyName: string]: string;
    };
    /**
     * The method for the http request.
     */
    httpMethod?: string;
    /**
     * The desired timeout for the request. Default is 30 seconds.
     */
    timeout?: string;
    /**
     * The desired batch size which indicates number of documents.
     */
    batchSize?: number;
    /**
     * If set, the number of parallel calls that can be made to the Web API.
     */
    degreeOfParallelism?: number;
    /**
     * Applies to custom skills that connect to external code in an Azure function or some other
     * application that provides the transformations. This value should be the application ID
     * created for the function or app when it was registered with Azure Active Directory. When
     * specified, the custom skill connects to the function or app using a managed ID (either system
     * or user-assigned) of the search service and the access token of the function or app, using
     * this value as the resource id for creating the scope of the access token.
     */
    authResourceId?: string;
    /**
     * The user-assigned managed identity used for outbound connections. If an authResourceId is
     * provided and it's not specified, the system-assigned managed identity is used. On updates to
     * the indexer, if the identity is unspecified, the value remains unchanged. If undefined, the
     * value of this property is cleared.
     */
    authIdentity?: SearchIndexerDataIdentity;
}

/** Specifies a user-defined vectorizer for generating the vector embedding of a query string. Integration of an external vectorizer is achieved using the custom Web API interface of a skillset. */
export declare interface WebApiVectorizer extends BaseVectorSearchVectorizer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    kind: "customWebApi";
    /** Specifies the properties of the user-defined vectorizer. */
    parameters?: WebApiParameters;
}

/** Splits words into subwords and performs optional transformations on subword groups. This token filter is implemented using Apache Lucene. */
export declare interface WordDelimiterTokenFilter extends BaseTokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.WordDelimiterTokenFilter";
    /** A value indicating whether to generate part words. If set, causes parts of words to be generated; for example "AzureSearch" becomes "Azure" "Search". Default is true. */
    generateWordParts?: boolean;
    /** A value indicating whether to generate number subwords. Default is true. */
    generateNumberParts?: boolean;
    /** A value indicating whether maximum runs of word parts will be catenated. For example, if this is set to true, "Azure-Search" becomes "AzureSearch". Default is false. */
    catenateWords?: boolean;
    /** A value indicating whether maximum runs of number parts will be catenated. For example, if this is set to true, "1-2" becomes "12". Default is false. */
    catenateNumbers?: boolean;
    /** A value indicating whether all subword parts will be catenated. For example, if this is set to true, "Azure-Search-1" becomes "AzureSearch1". Default is false. */
    catenateAll?: boolean;
    /** A value indicating whether to split words on caseChange. For example, if this is set to true, "AzureSearch" becomes "Azure" "Search". Default is true. */
    splitOnCaseChange?: boolean;
    /** A value indicating whether original words will be preserved and added to the subword list. Default is false. */
    preserveOriginal?: boolean;
    /** A value indicating whether to split on numbers. For example, if this is set to true, "Azure1Search" becomes "Azure" "1" "Search". Default is true. */
    splitOnNumerics?: boolean;
    /** A value indicating whether to remove trailing "'s" for each subword. Default is true. */
    stemEnglishPossessive?: boolean;
    /** A list of tokens to protect from being delimited. */
    protectedWords?: string[];
}

export { }
