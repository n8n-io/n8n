import * as coreClient from "@azure/core-client";
import * as coreHttpCompat from "@azure/core-http-compat";
export type DataChangeDetectionPolicyUnion = DataChangeDetectionPolicy | HighWaterMarkChangeDetectionPolicy | SqlIntegratedChangeTrackingPolicy;
export type DataDeletionDetectionPolicyUnion = DataDeletionDetectionPolicy | SoftDeleteColumnDeletionDetectionPolicy;
export type SearchIndexerSkillUnion = SearchIndexerSkill | ConditionalSkill | KeyPhraseExtractionSkill | OcrSkill | ImageAnalysisSkill | LanguageDetectionSkill | ShaperSkill | MergeSkill | EntityRecognitionSkill | SentimentSkill | SentimentSkillV3 | EntityLinkingSkill | EntityRecognitionSkillV3 | PIIDetectionSkill | SplitSkill | CustomEntityLookupSkill | TextTranslationSkill | DocumentExtractionSkill | DocumentIntelligenceLayoutSkill | WebApiSkill | AzureOpenAIEmbeddingSkill;
export type CognitiveServicesAccountUnion = CognitiveServicesAccount | DefaultCognitiveServicesAccount | CognitiveServicesAccountKey;
export type ScoringFunctionUnion = ScoringFunction | DistanceScoringFunction | FreshnessScoringFunction | MagnitudeScoringFunction | TagScoringFunction;
export type LexicalAnalyzerUnion = LexicalAnalyzer | CustomAnalyzer | PatternAnalyzer | LuceneStandardAnalyzer | StopAnalyzer;
export type LexicalTokenizerUnion = LexicalTokenizer | ClassicTokenizer | EdgeNGramTokenizer | KeywordTokenizer | KeywordTokenizerV2 | MicrosoftLanguageTokenizer | MicrosoftLanguageStemmingTokenizer | NGramTokenizer | PathHierarchyTokenizerV2 | PatternTokenizer | LuceneStandardTokenizer | LuceneStandardTokenizerV2 | UaxUrlEmailTokenizer;
export type TokenFilterUnion = TokenFilter | AsciiFoldingTokenFilter | CjkBigramTokenFilter | CommonGramTokenFilter | DictionaryDecompounderTokenFilter | EdgeNGramTokenFilter | EdgeNGramTokenFilterV2 | ElisionTokenFilter | KeepTokenFilter | KeywordMarkerTokenFilter | LengthTokenFilter | LimitTokenFilter | NGramTokenFilter | NGramTokenFilterV2 | PatternCaptureTokenFilter | PatternReplaceTokenFilter | PhoneticTokenFilter | ShingleTokenFilter | SnowballTokenFilter | StemmerTokenFilter | StemmerOverrideTokenFilter | StopwordsTokenFilter | SynonymTokenFilter | TruncateTokenFilter | UniqueTokenFilter | WordDelimiterTokenFilter;
export type CharFilterUnion = CharFilter | MappingCharFilter | PatternReplaceCharFilter;
export type BaseLexicalNormalizerUnion = BaseLexicalNormalizer | CustomLexicalNormalizer;
export type SimilarityUnion = Similarity | ClassicSimilarity | BM25Similarity;
export type VectorSearchAlgorithmConfigurationUnion = VectorSearchAlgorithmConfiguration | HnswAlgorithmConfiguration | ExhaustiveKnnAlgorithmConfiguration;
export type VectorSearchVectorizerUnion = VectorSearchVectorizer | AzureOpenAIVectorizer | WebApiVectorizer;
export type VectorSearchCompressionUnion = VectorSearchCompression | ScalarQuantizationCompression | BinaryQuantizationCompression;
export type SearchIndexerDataIdentityUnion = SearchIndexerDataIdentity | SearchIndexerDataNoneIdentity | SearchIndexerDataUserAssignedIdentity;
/** Represents a datasource definition, which can be used to configure an indexer. */
export interface SearchIndexerDataSource {
    /** The name of the datasource. */
    name: string;
    /** The description of the datasource. */
    description?: string;
    /** The type of the datasource. */
    type: SearchIndexerDataSourceType;
    /** Credentials for the datasource. */
    credentials: DataSourceCredentials;
    /** The data container for the datasource. */
    container: SearchIndexerDataContainer;
    /** The data change detection policy for the datasource. */
    dataChangeDetectionPolicy?: DataChangeDetectionPolicyUnion;
    /** The data deletion detection policy for the datasource. */
    dataDeletionDetectionPolicy?: DataDeletionDetectionPolicyUnion;
    /** The ETag of the data source. */
    etag?: string;
    /** A description of an encryption key that you create in Azure Key Vault. This key is used to provide an additional level of encryption-at-rest for your datasource definition when you want full assurance that no one, not even Microsoft, can decrypt your data source definition. Once you have encrypted your data source definition, it will always remain encrypted. The search service will ignore attempts to set this property to null. You can change this property as needed if you want to rotate your encryption key; Your datasource definition will be unaffected. Encryption with customer-managed keys is not available for free search services, and is only available for paid services created on or after January 1, 2019. */
    encryptionKey?: SearchResourceEncryptionKey;
}
/** Represents credentials that can be used to connect to a datasource. */
export interface DataSourceCredentials {
    /** The connection string for the datasource. For Azure SQL, Azure Blob, ADLS Gen 2 and Azure Table, this would be the connection string or resource ID if using managed identity. For CosmosDB this would be a formatted connection string specifying ApiKind or resource ID for managed identity. For Onelake files, connection string would be either the workspace guid or workspace FQDN; Onelake only supports managed identity connections. Set to `<unchanged>` (with brackets) if you don't want the connection string updated. Set to `<redacted>` if you want to remove the connection string value from the datasource. */
    connectionString?: string;
}
/** Represents information about the entity (such as Azure SQL table or CosmosDB collection) that will be indexed. */
export interface SearchIndexerDataContainer {
    /** The name of the table or view (for Azure SQL datasource), collection (for CosmosDB datasource), container (for Azure Blob and ADLS Gen 2 datasources), Azure Table (for Azure Table datasource), or lakehouse (for Onelake datasource) that will be indexed. */
    name: string;
    /** A query that is applied to this data container. For CosmosDB datasource query can flatten and filter data. For Azure Blob and ADLS Gen 2 query can filter by folders. For Azure Table query can filter by row data. For Onelake query can filter by folder or shortcut. Not supported by Azure SQL datasources. */
    query?: string;
}
/** Base type for data change detection policies. */
export interface DataChangeDetectionPolicy {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.HighWaterMarkChangeDetectionPolicy" | "#Microsoft.Azure.Search.SqlIntegratedChangeTrackingPolicy";
}
/** Base type for data deletion detection policies. */
export interface DataDeletionDetectionPolicy {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.SoftDeleteColumnDeletionDetectionPolicy";
}
/** A customer-managed encryption key in Azure Key Vault. Keys that you create and manage can be used to encrypt or decrypt data-at-rest, such as indexes and synonym maps. */
export interface SearchResourceEncryptionKey {
    /** The name of your Azure Key Vault key to be used to encrypt your data at rest. */
    keyName: string;
    /** The version of your Azure Key Vault key to be used to encrypt your data at rest. */
    keyVersion: string;
    /** The URI of your Azure Key Vault, also referred to as DNS name, that contains the key to be used to encrypt your data at rest. An example URI might be `https://my-keyvault-name.vault.azure.net`. */
    vaultUri: string;
    /** Optional Azure Active Directory credentials used for accessing your Azure Key Vault. Not required if using managed identity instead. */
    accessCredentials?: AzureActiveDirectoryApplicationCredentials;
}
/** Credentials of a registered application created for your search service, used for authenticated access to the encryption keys stored in Azure Key Vault. */
export interface AzureActiveDirectoryApplicationCredentials {
    /** An AAD Application ID that was granted the required access permissions to the Azure Key Vault that is to be used when encrypting your data at rest. The Application ID should not be confused with the Object ID for your AAD Application. */
    applicationId: string;
    /** The authentication key of the specified AAD application. */
    applicationSecret?: string;
}
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
/** Response from a List Datasources request. If successful, it includes the full definitions of all datasources. */
export interface ListDataSourcesResult {
    /**
     * The datasources in the Search service.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly dataSources: SearchIndexerDataSource[];
}
/** Represents an indexer. */
export interface SearchIndexer {
    /** The name of the indexer. */
    name: string;
    /** The description of the indexer. */
    description?: string;
    /** The name of the datasource from which this indexer reads data. */
    dataSourceName: string;
    /** The name of the skillset executing with this indexer. */
    skillsetName?: string;
    /** The name of the index to which this indexer writes data. */
    targetIndexName: string;
    /** The schedule for this indexer. */
    schedule?: IndexingSchedule;
    /** Parameters for indexer execution. */
    parameters?: IndexingParameters;
    /** Defines mappings between fields in the data source and corresponding target fields in the index. */
    fieldMappings?: FieldMapping[];
    /** Output field mappings are applied after enrichment and immediately before indexing. */
    outputFieldMappings?: FieldMapping[];
    /** A value indicating whether the indexer is disabled. Default is false. */
    isDisabled?: boolean;
    /** The ETag of the indexer. */
    etag?: string;
    /** A description of an encryption key that you create in Azure Key Vault. This key is used to provide an additional level of encryption-at-rest for your indexer definition (as well as indexer execution status) when you want full assurance that no one, not even Microsoft, can decrypt them. Once you have encrypted your indexer definition, it will always remain encrypted. The search service will ignore attempts to set this property to null. You can change this property as needed if you want to rotate your encryption key; Your indexer definition (and indexer execution status) will be unaffected. Encryption with customer-managed keys is not available for free search services, and is only available for paid services created on or after January 1, 2019. */
    encryptionKey?: SearchResourceEncryptionKey;
}
/** Represents a schedule for indexer execution. */
export interface IndexingSchedule {
    /** The interval of time between indexer executions. */
    interval: string;
    /** The time when an indexer should start running. */
    startTime?: Date;
}
/** Represents parameters for indexer execution. */
export interface IndexingParameters {
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
export interface IndexingParametersConfiguration {
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
    /** For Azure blobs, set this property to true to still index storage metadata for blob content that is too large to process. Oversized blobs are treated as errors by default. For limits on blob size, see https://learn.microsoft.com/azure/search/search-limits-quotas-capacity. */
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
/** Defines a mapping between a field in a data source and a target field in an index. */
export interface FieldMapping {
    /** The name of the field in the data source. */
    sourceFieldName: string;
    /** The name of the target field in the index. Same as the source field name by default. */
    targetFieldName?: string;
    /** A function to apply to each source field value before indexing. */
    mappingFunction?: FieldMappingFunction;
}
/** Represents a function that transforms a value from a data source before indexing. */
export interface FieldMappingFunction {
    /** The name of the field mapping function. */
    name: string;
    /** A dictionary of parameter name/value pairs to pass to the function. Each value must be of a primitive type. */
    parameters?: {
        [propertyName: string]: any;
    };
}
/** Response from a List Indexers request. If successful, it includes the full definitions of all indexers. */
export interface ListIndexersResult {
    /**
     * The indexers in the Search service.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly indexers: SearchIndexer[];
}
/** Represents the current status and execution history of an indexer. */
export interface SearchIndexerStatus {
    /**
     * The name of the indexer.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly name: string;
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
/** Represents the result of an individual indexer execution. */
export interface IndexerExecutionResult {
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
/** Represents an item- or document-level indexing error. */
export interface SearchIndexerError {
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
/** Represents an item-level warning. */
export interface SearchIndexerWarning {
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
export interface SearchIndexerLimits {
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
/** A list of skills. */
export interface SearchIndexerSkillset {
    /** The name of the skillset. */
    name: string;
    /** The description of the skillset. */
    description?: string;
    /** A list of skills in the skillset. */
    skills: SearchIndexerSkillUnion[];
    /** Details about the Azure AI service to be used when running skills. */
    cognitiveServicesAccount?: CognitiveServicesAccountUnion;
    /** Definition of additional projections to Azure blob, table, or files, of enriched data. */
    knowledgeStore?: SearchIndexerKnowledgeStore;
    /** Definition of additional projections to secondary search index(es). */
    indexProjection?: SearchIndexerIndexProjection;
    /** The ETag of the skillset. */
    etag?: string;
    /** A description of an encryption key that you create in Azure Key Vault. This key is used to provide an additional level of encryption-at-rest for your skillset definition when you want full assurance that no one, not even Microsoft, can decrypt your skillset definition. Once you have encrypted your skillset definition, it will always remain encrypted. The search service will ignore attempts to set this property to null. You can change this property as needed if you want to rotate your encryption key; Your skillset definition will be unaffected. Encryption with customer-managed keys is not available for free search services, and is only available for paid services created on or after January 1, 2019. */
    encryptionKey?: SearchResourceEncryptionKey;
}
/** Base type for skills. */
export interface SearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Util.ConditionalSkill" | "#Microsoft.Skills.Text.KeyPhraseExtractionSkill" | "#Microsoft.Skills.Vision.OcrSkill" | "#Microsoft.Skills.Vision.ImageAnalysisSkill" | "#Microsoft.Skills.Text.LanguageDetectionSkill" | "#Microsoft.Skills.Util.ShaperSkill" | "#Microsoft.Skills.Text.MergeSkill" | "#Microsoft.Skills.Text.EntityRecognitionSkill" | "#Microsoft.Skills.Text.SentimentSkill" | "#Microsoft.Skills.Text.V3.SentimentSkill" | "#Microsoft.Skills.Text.V3.EntityLinkingSkill" | "#Microsoft.Skills.Text.V3.EntityRecognitionSkill" | "#Microsoft.Skills.Text.PIIDetectionSkill" | "#Microsoft.Skills.Text.SplitSkill" | "#Microsoft.Skills.Text.CustomEntityLookupSkill" | "#Microsoft.Skills.Text.TranslationSkill" | "#Microsoft.Skills.Util.DocumentExtractionSkill" | "#Microsoft.Skills.Util.DocumentIntelligenceLayoutSkill" | "#Microsoft.Skills.Custom.WebApiSkill" | "#Microsoft.Skills.Text.AzureOpenAIEmbeddingSkill";
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
/** Input field mapping for a skill. */
export interface InputFieldMappingEntry {
    /** The name of the input. */
    name: string;
    /** The source of the input. */
    source?: string;
    /** The source context used for selecting recursive inputs. */
    sourceContext?: string;
    /** The recursive inputs used when creating a complex type. */
    inputs?: InputFieldMappingEntry[];
}
/** Output field mapping for a skill. */
export interface OutputFieldMappingEntry {
    /** The name of the output defined by the skill. */
    name: string;
    /** The target name of the output. It is optional and default to name. */
    targetName?: string;
}
/** Base type for describing any Azure AI service resource attached to a skillset. */
export interface CognitiveServicesAccount {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.DefaultCognitiveServices" | "#Microsoft.Azure.Search.CognitiveServicesByKey";
    /** Description of the Azure AI service resource attached to a skillset. */
    description?: string;
}
/** Definition of additional projections to azure blob, table, or files, of enriched data. */
export interface SearchIndexerKnowledgeStore {
    /** The connection string to the storage account projections will be stored in. */
    storageConnectionString: string;
    /** A list of additional projections to perform during indexing. */
    projections: SearchIndexerKnowledgeStoreProjection[];
}
/** Container object for various projection selectors. */
export interface SearchIndexerKnowledgeStoreProjection {
    /** Projections to Azure Table storage. */
    tables?: SearchIndexerKnowledgeStoreTableProjectionSelector[];
    /** Projections to Azure Blob storage. */
    objects?: SearchIndexerKnowledgeStoreObjectProjectionSelector[];
    /** Projections to Azure File storage. */
    files?: SearchIndexerKnowledgeStoreFileProjectionSelector[];
}
/** Abstract class to share properties between concrete selectors. */
export interface SearchIndexerKnowledgeStoreProjectionSelector {
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
/** Definition of additional projections to secondary search indexes. */
export interface SearchIndexerIndexProjection {
    /** A list of projections to be performed to secondary search indexes. */
    selectors: SearchIndexerIndexProjectionSelector[];
    /** A dictionary of index projection-specific configuration properties. Each name is the name of a specific property. Each value must be of a primitive type. */
    parameters?: SearchIndexerIndexProjectionParameters;
}
/** Description for what data to store in the designated search index. */
export interface SearchIndexerIndexProjectionSelector {
    /** Name of the search index to project to. Must have a key field with the 'keyword' analyzer set. */
    targetIndexName: string;
    /** Name of the field in the search index to map the parent document's key value to. Must be a string field that is filterable and not the key field. */
    parentKeyFieldName: string;
    /** Source context for the projections. Represents the cardinality at which the document will be split into multiple sub documents. */
    sourceContext: string;
    /** Mappings for the projection, or which source should be mapped to which field in the target index. */
    mappings: InputFieldMappingEntry[];
}
/** A dictionary of index projection-specific configuration properties. Each name is the name of a specific property. Each value must be of a primitive type. */
export interface SearchIndexerIndexProjectionParameters {
    /** Describes unknown properties. The value of an unknown property can be of "any" type. */
    [property: string]: any;
    /** Defines behavior of the index projections in relation to the rest of the indexer. */
    projectionMode?: IndexProjectionMode;
}
/** Response from a list skillset request. If successful, it includes the full definitions of all skillsets. */
export interface ListSkillsetsResult {
    /**
     * The skillsets defined in the Search service.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly skillsets: SearchIndexerSkillset[];
}
/** Represents a synonym map definition. */
export interface SynonymMap {
    /** The name of the synonym map. */
    name: string;
    /** The format of the synonym map. Only the 'solr' format is currently supported. */
    format: "solr";
    /** A series of synonym rules in the specified synonym map format. The rules must be separated by newlines. */
    synonyms: string;
    /** A description of an encryption key that you create in Azure Key Vault. This key is used to provide an additional level of encryption-at-rest for your data when you want full assurance that no one, not even Microsoft, can decrypt your data. Once you have encrypted your data, it will always remain encrypted. The search service will ignore attempts to set this property to null. You can change this property as needed if you want to rotate your encryption key; Your data will be unaffected. Encryption with customer-managed keys is not available for free search services, and is only available for paid services created on or after January 1, 2019. */
    encryptionKey?: SearchResourceEncryptionKey;
    /** The ETag of the synonym map. */
    etag?: string;
}
/** Response from a List SynonymMaps request. If successful, it includes the full definitions of all synonym maps. */
export interface ListSynonymMapsResult {
    /**
     * The synonym maps in the Search service.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly synonymMaps: SynonymMap[];
}
/** Represents a search index definition, which describes the fields and search behavior of an index. */
export interface SearchIndex {
    /** The name of the index. */
    name: string;
    /** The description of the index. */
    description?: string;
    /** The fields of the index. */
    fields: SearchField[];
    /** The scoring profiles for the index. */
    scoringProfiles?: ScoringProfile[];
    /** The name of the scoring profile to use if none is specified in the query. If this property is not set and no scoring profile is specified in the query, then default scoring (tf-idf) will be used. */
    defaultScoringProfile?: string;
    /** Options to control Cross-Origin Resource Sharing (CORS) for the index. */
    corsOptions?: CorsOptions;
    /** The suggesters for the index. */
    suggesters?: Suggester[];
    /** The analyzers for the index. */
    analyzers?: LexicalAnalyzerUnion[];
    /** The tokenizers for the index. */
    tokenizers?: LexicalTokenizerUnion[];
    /** The token filters for the index. */
    tokenFilters?: TokenFilterUnion[];
    /** The character filters for the index. */
    charFilters?: CharFilterUnion[];
    /** The normalizers for the index. */
    normalizers?: BaseLexicalNormalizerUnion[];
    /** A description of an encryption key that you create in Azure Key Vault. This key is used to provide an additional level of encryption-at-rest for your data when you want full assurance that no one, not even Microsoft, can decrypt your data. Once you have encrypted your data, it will always remain encrypted. The search service will ignore attempts to set this property to null. You can change this property as needed if you want to rotate your encryption key; Your data will be unaffected. Encryption with customer-managed keys is not available for free search services, and is only available for paid services created on or after January 1, 2019. */
    encryptionKey?: SearchResourceEncryptionKey;
    /** The type of similarity algorithm to be used when scoring and ranking the documents matching a search query. The similarity algorithm can only be defined at index creation time and cannot be modified on existing indexes. If null, the ClassicSimilarity algorithm is used. */
    similarity?: SimilarityUnion;
    /** Defines parameters for a search index that influence semantic capabilities. */
    semanticSearch?: SemanticSearch;
    /** Contains configuration options related to vector search. */
    vectorSearch?: VectorSearch;
    /** The ETag of the index. */
    etag?: string;
}
/** Represents a field in an index definition, which describes the name, data type, and search behavior of a field. */
export interface SearchField {
    /** The name of the field, which must be unique within the fields collection of the index or parent field. */
    name: string;
    /** The data type of the field. */
    type: SearchFieldDataType;
    /** A value indicating whether the field uniquely identifies documents in the index. Exactly one top-level field in each index must be chosen as the key field and it must be of type Edm.String. Key fields can be used to look up documents directly and update or delete specific documents. Default is false for simple fields and null for complex fields. */
    key?: boolean;
    /** A value indicating whether the field can be returned in a search result. You can disable this option if you want to use a field (for example, margin) as a filter, sorting, or scoring mechanism but do not want the field to be visible to the end user. This property must be true for key fields, and it must be null for complex fields. This property can be changed on existing fields. Enabling this property does not cause any increase in index storage requirements. Default is true for simple fields, false for vector fields, and null for complex fields. */
    retrievable?: boolean;
    /** An immutable value indicating whether the field will be persisted separately on disk to be returned in a search result. You can disable this option if you don't plan to return the field contents in a search response to save on storage overhead. This can only be set during index creation and only for vector fields. This property cannot be changed for existing fields or set as false for new fields. If this property is set as false, the property 'retrievable' must also be set to false. This property must be true or unset for key fields, for new fields, and for non-vector fields, and it must be null for complex fields. Disabling this property will reduce index storage requirements. The default is true for vector fields. */
    stored?: boolean;
    /** A value indicating whether the field is full-text searchable. This means it will undergo analysis such as word-breaking during indexing. If you set a searchable field to a value like "sunny day", internally it will be split into the individual tokens "sunny" and "day". This enables full-text searches for these terms. Fields of type Edm.String or Collection(Edm.String) are searchable by default. This property must be false for simple fields of other non-string data types, and it must be null for complex fields. Note: searchable fields consume extra space in your index to accommodate additional tokenized versions of the field value for full-text searches. If you want to save space in your index and you don't need a field to be included in searches, set searchable to false. */
    searchable?: boolean;
    /** A value indicating whether to enable the field to be referenced in $filter queries. filterable differs from searchable in how strings are handled. Fields of type Edm.String or Collection(Edm.String) that are filterable do not undergo word-breaking, so comparisons are for exact matches only. For example, if you set such a field f to "sunny day", $filter=f eq 'sunny' will find no matches, but $filter=f eq 'sunny day' will. This property must be null for complex fields. Default is true for simple fields and null for complex fields. */
    filterable?: boolean;
    /** A value indicating whether to enable the field to be referenced in $orderby expressions. By default, the search engine sorts results by score, but in many experiences users will want to sort by fields in the documents. A simple field can be sortable only if it is single-valued (it has a single value in the scope of the parent document). Simple collection fields cannot be sortable, since they are multi-valued. Simple sub-fields of complex collections are also multi-valued, and therefore cannot be sortable. This is true whether it's an immediate parent field, or an ancestor field, that's the complex collection. Complex fields cannot be sortable and the sortable property must be null for such fields. The default for sortable is true for single-valued simple fields, false for multi-valued simple fields, and null for complex fields. */
    sortable?: boolean;
    /** A value indicating whether to enable the field to be referenced in facet queries. Typically used in a presentation of search results that includes hit count by category (for example, search for digital cameras and see hits by brand, by megapixels, by price, and so on). This property must be null for complex fields. Fields of type Edm.GeographyPoint or Collection(Edm.GeographyPoint) cannot be facetable. Default is true for all other simple fields. */
    facetable?: boolean;
    /** The name of the analyzer to use for the field. This option can be used only with searchable fields and it can't be set together with either searchAnalyzer or indexAnalyzer. Once the analyzer is chosen, it cannot be changed for the field. Must be null for complex fields. */
    analyzer?: LexicalAnalyzerName;
    /** The name of the analyzer used at search time for the field. This option can be used only with searchable fields. It must be set together with indexAnalyzer and it cannot be set together with the analyzer option. This property cannot be set to the name of a language analyzer; use the analyzer property instead if you need a language analyzer. This analyzer can be updated on an existing field. Must be null for complex fields. */
    searchAnalyzer?: LexicalAnalyzerName;
    /** The name of the analyzer used at indexing time for the field. This option can be used only with searchable fields. It must be set together with searchAnalyzer and it cannot be set together with the analyzer option.  This property cannot be set to the name of a language analyzer; use the analyzer property instead if you need a language analyzer. Once the analyzer is chosen, it cannot be changed for the field. Must be null for complex fields. */
    indexAnalyzer?: LexicalAnalyzerName;
    /** The name of the normalizer to use for the field. This option can be used only with fields with filterable, sortable, or facetable enabled. Once the normalizer is chosen, it cannot be changed for the field. Must be null for complex fields. */
    normalizer?: LexicalNormalizerName;
    /** The dimensionality of the vector field. */
    vectorSearchDimensions?: number;
    /** The name of the vector search profile that specifies the algorithm and vectorizer to use when searching the vector field. */
    vectorSearchProfileName?: string;
    /** The encoding format to interpret the field contents. */
    vectorEncodingFormat?: VectorEncodingFormat;
    /** A list of the names of synonym maps to associate with this field. This option can be used only with searchable fields. Currently only one synonym map per field is supported. Assigning a synonym map to a field ensures that query terms targeting that field are expanded at query-time using the rules in the synonym map. This attribute can be changed on existing fields. Must be null or an empty collection for complex fields. */
    synonymMaps?: string[];
    /** A list of sub-fields if this is a field of type Edm.ComplexType or Collection(Edm.ComplexType). Must be null or empty for simple fields. */
    fields?: SearchField[];
}
/** Defines parameters for a search index that influence scoring in search queries. */
export interface ScoringProfile {
    /** The name of the scoring profile. */
    name: string;
    /** Parameters that boost scoring based on text matches in certain index fields. */
    textWeights?: TextWeights;
    /** The collection of functions that influence the scoring of documents. */
    functions?: ScoringFunctionUnion[];
    /** A value indicating how the results of individual scoring functions should be combined. Defaults to "Sum". Ignored if there are no scoring functions. */
    functionAggregation?: ScoringFunctionAggregation;
}
/** Defines weights on index fields for which matches should boost scoring in search queries. */
export interface TextWeights {
    /** The dictionary of per-field weights to boost document scoring. The keys are field names and the values are the weights for each field. */
    weights: {
        [propertyName: string]: number;
    };
}
/** Base type for functions that can modify document scores during ranking. */
export interface ScoringFunction {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    type: "distance" | "freshness" | "magnitude" | "tag";
    /** The name of the field used as input to the scoring function. */
    fieldName: string;
    /** A multiplier for the raw score. Must be a positive number not equal to 1.0. */
    boost: number;
    /** A value indicating how boosting will be interpolated across document scores; defaults to "Linear". */
    interpolation?: ScoringFunctionInterpolation;
}
/** Defines options to control Cross-Origin Resource Sharing (CORS) for an index. */
export interface CorsOptions {
    /** The list of origins from which JavaScript code will be granted access to your index. Can contain a list of hosts of the form {protocol}://{fully-qualified-domain-name}[:{port#}], or a single '*' to allow all origins (not recommended). */
    allowedOrigins: string[];
    /** The duration for which browsers should cache CORS preflight responses. Defaults to 5 minutes. */
    maxAgeInSeconds?: number;
}
/** Defines how the Suggest API should apply to a group of fields in the index. */
export interface Suggester {
    /** The name of the suggester. */
    name: string;
    /** A value indicating the capabilities of the suggester. */
    searchMode: "analyzingInfixMatching";
    /** The list of field names to which the suggester applies. Each field must be searchable. */
    sourceFields: string[];
}
/** Base type for analyzers. */
export interface LexicalAnalyzer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.CustomAnalyzer" | "#Microsoft.Azure.Search.PatternAnalyzer" | "#Microsoft.Azure.Search.StandardAnalyzer" | "#Microsoft.Azure.Search.StopAnalyzer";
    /** The name of the analyzer. It must only contain letters, digits, spaces, dashes or underscores, can only start and end with alphanumeric characters, and is limited to 128 characters. */
    name: string;
}
/** Base type for tokenizers. */
export interface LexicalTokenizer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.ClassicTokenizer" | "#Microsoft.Azure.Search.EdgeNGramTokenizer" | "#Microsoft.Azure.Search.KeywordTokenizer" | "#Microsoft.Azure.Search.KeywordTokenizerV2" | "#Microsoft.Azure.Search.MicrosoftLanguageTokenizer" | "#Microsoft.Azure.Search.MicrosoftLanguageStemmingTokenizer" | "#Microsoft.Azure.Search.NGramTokenizer" | "#Microsoft.Azure.Search.PathHierarchyTokenizerV2" | "#Microsoft.Azure.Search.PatternTokenizer" | "#Microsoft.Azure.Search.StandardTokenizer" | "#Microsoft.Azure.Search.StandardTokenizerV2" | "#Microsoft.Azure.Search.UaxUrlEmailTokenizer";
    /** The name of the tokenizer. It must only contain letters, digits, spaces, dashes or underscores, can only start and end with alphanumeric characters, and is limited to 128 characters. */
    name: string;
}
/** Base type for token filters. */
export interface TokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.AsciiFoldingTokenFilter" | "#Microsoft.Azure.Search.CjkBigramTokenFilter" | "#Microsoft.Azure.Search.CommonGramTokenFilter" | "#Microsoft.Azure.Search.DictionaryDecompounderTokenFilter" | "#Microsoft.Azure.Search.EdgeNGramTokenFilter" | "#Microsoft.Azure.Search.EdgeNGramTokenFilterV2" | "#Microsoft.Azure.Search.ElisionTokenFilter" | "#Microsoft.Azure.Search.KeepTokenFilter" | "#Microsoft.Azure.Search.KeywordMarkerTokenFilter" | "#Microsoft.Azure.Search.LengthTokenFilter" | "#Microsoft.Azure.Search.LimitTokenFilter" | "#Microsoft.Azure.Search.NGramTokenFilter" | "#Microsoft.Azure.Search.NGramTokenFilterV2" | "#Microsoft.Azure.Search.PatternCaptureTokenFilter" | "#Microsoft.Azure.Search.PatternReplaceTokenFilter" | "#Microsoft.Azure.Search.PhoneticTokenFilter" | "#Microsoft.Azure.Search.ShingleTokenFilter" | "#Microsoft.Azure.Search.SnowballTokenFilter" | "#Microsoft.Azure.Search.StemmerTokenFilter" | "#Microsoft.Azure.Search.StemmerOverrideTokenFilter" | "#Microsoft.Azure.Search.StopwordsTokenFilter" | "#Microsoft.Azure.Search.SynonymTokenFilter" | "#Microsoft.Azure.Search.TruncateTokenFilter" | "#Microsoft.Azure.Search.UniqueTokenFilter" | "#Microsoft.Azure.Search.WordDelimiterTokenFilter";
    /** The name of the token filter. It must only contain letters, digits, spaces, dashes or underscores, can only start and end with alphanumeric characters, and is limited to 128 characters. */
    name: string;
}
/** Base type for character filters. */
export interface CharFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.MappingCharFilter" | "#Microsoft.Azure.Search.PatternReplaceCharFilter";
    /** The name of the char filter. It must only contain letters, digits, spaces, dashes or underscores, can only start and end with alphanumeric characters, and is limited to 128 characters. */
    name: string;
}
/** Base type for normalizers. */
export interface BaseLexicalNormalizer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.CustomNormalizer";
    /** The name of the normalizer. It must only contain letters, digits, spaces, dashes or underscores, can only start and end with alphanumeric characters, and is limited to 128 characters. It cannot end in '.microsoft' nor '.lucene', nor be named 'asciifolding', 'standard', 'lowercase', 'uppercase', or 'elision'. */
    name: string;
}
/** Base type for similarity algorithms. Similarity algorithms are used to calculate scores that tie queries to documents. The higher the score, the more relevant the document is to that specific query. Those scores are used to rank the search results. */
export interface Similarity {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.ClassicSimilarity" | "#Microsoft.Azure.Search.BM25Similarity";
}
/** Defines parameters for a search index that influence semantic capabilities. */
export interface SemanticSearch {
    /** Allows you to set the name of a default semantic configuration in your index, making it optional to pass it on as a query parameter every time. */
    defaultConfigurationName?: string;
    /** The semantic configurations for the index. */
    configurations?: SemanticConfiguration[];
}
/** Defines a specific configuration to be used in the context of semantic capabilities. */
export interface SemanticConfiguration {
    /** The name of the semantic configuration. */
    name: string;
    /** Describes the title, content, and keyword fields to be used for semantic ranking, captions, highlights, and answers. At least one of the three sub properties (titleField, prioritizedKeywordsFields and prioritizedContentFields) need to be set. */
    prioritizedFields: SemanticPrioritizedFields;
    /** Specifies the score type to be used for the sort order of the search results. */
    rankingOrder?: RankingOrder;
}
/** Describes the title, content, and keywords fields to be used for semantic ranking, captions, highlights, and answers. */
export interface SemanticPrioritizedFields {
    /** Defines the title field to be used for semantic ranking, captions, highlights, and answers. If you don't have a title field in your index, leave this blank. */
    titleField?: SemanticField;
    /** Defines the content fields to be used for semantic ranking, captions, highlights, and answers. For the best result, the selected fields should contain text in natural language form. The order of the fields in the array represents their priority. Fields with lower priority may get truncated if the content is long. */
    contentFields?: SemanticField[];
    /** Defines the keyword fields to be used for semantic ranking, captions, highlights, and answers. For the best result, the selected fields should contain a list of keywords. The order of the fields in the array represents their priority. Fields with lower priority may get truncated if the content is long. */
    keywordsFields?: SemanticField[];
}
/** A field that is used as part of the semantic configuration. */
export interface SemanticField {
    name: string;
}
/** Contains configuration options related to vector search. */
export interface VectorSearch {
    /** Defines combinations of configurations to use with vector search. */
    profiles?: VectorSearchProfile[];
    /** Contains configuration options specific to the algorithm used during indexing or querying. */
    algorithms?: VectorSearchAlgorithmConfigurationUnion[];
    /** Contains configuration options on how to vectorize text vector queries. */
    vectorizers?: VectorSearchVectorizerUnion[];
    /** Contains configuration options specific to the compression method used during indexing or querying. */
    compressions?: VectorSearchCompressionUnion[];
}
/** Defines a combination of configurations to use with vector search. */
export interface VectorSearchProfile {
    /** The name to associate with this particular vector search profile. */
    name: string;
    /** The name of the vector search algorithm configuration that specifies the algorithm and optional parameters. */
    algorithmConfigurationName: string;
    /** The name of the vectorization being configured for use with vector search. */
    vectorizerName?: string;
    /** The name of the compression method configuration that specifies the compression method and optional parameters. */
    compressionName?: string;
}
/** Contains configuration options specific to the algorithm used during indexing or querying. */
export interface VectorSearchAlgorithmConfiguration {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    kind: "hnsw" | "exhaustiveKnn";
    /** The name to associate with this particular configuration. */
    name: string;
}
/** Specifies the vectorization method to be used during query time. */
export interface VectorSearchVectorizer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    kind: "azureOpenAI" | "customWebApi";
    /** The name to associate with this particular vectorization method. */
    vectorizerName: string;
}
/** Contains configuration options specific to the compression method used during indexing or querying. */
export interface VectorSearchCompression {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    kind: "scalarQuantization" | "binaryQuantization";
    /** The name to associate with this particular configuration. */
    compressionName: string;
    /** Contains the options for rescoring. */
    rescoringOptions?: RescoringOptions;
    /** The number of dimensions to truncate the vectors to. Truncating the vectors reduces the size of the vectors and the amount of data that needs to be transferred during search. This can save storage cost and improve search performance at the expense of recall. It should be only used for embeddings trained with Matryoshka Representation Learning (MRL) such as OpenAI text-embedding-3-large (small). The default value is null, which means no truncation. */
    truncationDimension?: number;
    /** If set to true, once the ordered set of results calculated using compressed vectors are obtained, they will be reranked again by recalculating the full-precision similarity scores. This will improve recall at the expense of latency. */
    rerankWithOriginalVectors?: boolean;
    /** Default oversampling factor. Oversampling will internally request more documents (specified by this multiplier) in the initial search. This increases the set of results that will be reranked using recomputed similarity scores from full-precision vectors. Minimum value is 1, meaning no oversampling (1x). This parameter can only be set when rerankWithOriginalVectors is true. Higher values improve recall at the expense of latency. */
    defaultOversampling?: number;
}
/** Contains the options for rescoring. */
export interface RescoringOptions {
    /** If set to true, after the initial search on the compressed vectors, the similarity scores are recalculated using the full-precision vectors. This will improve recall at the expense of latency. */
    enableRescoring?: boolean;
    /** Default oversampling factor. Oversampling retrieves a greater set of potential documents to offset the resolution loss due to quantization. This increases the set of results that will be rescored on full-precision vectors. Minimum value is 1, meaning no oversampling (1x). This parameter can only be set when 'enableRescoring' is true. Higher values improve recall at the expense of latency. */
    defaultOversampling?: number;
    /** Controls the storage method for original vectors. This setting is immutable. */
    rescoreStorageMethod?: VectorSearchCompressionRescoreStorageMethod;
}
/** Response from a List Indexes request. If successful, it includes the full definitions of all indexes. */
export interface ListIndexesResult {
    /**
     * The indexes in the Search service.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly indexes: SearchIndex[];
}
/** Statistics for a given index. Statistics are collected periodically and are not guaranteed to always be up-to-date. */
export interface GetIndexStatisticsResult {
    /**
     * The number of documents in the index.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly documentCount: number;
    /**
     * The amount of storage in bytes consumed by the index.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly storageSize: number;
    /**
     * The amount of memory in bytes consumed by vectors in the index.
     * NOTE: This property will not be serialized. It can only be populated by the server.
     */
    readonly vectorIndexSize: number;
}
/** Specifies some text and analysis components used to break that text into tokens. */
export interface AnalyzeRequest {
    /** The text to break into tokens. */
    text: string;
    /** The name of the analyzer to use to break the given text. If this parameter is not specified, you must specify a tokenizer instead. The tokenizer and analyzer parameters are mutually exclusive. KnownAnalyzerNames is an enum containing known values. */
    analyzer?: string;
    /** The name of the tokenizer to use to break the given text. If this parameter is not specified, you must specify an analyzer instead. The tokenizer and analyzer parameters are mutually exclusive. KnownTokenizerNames is an enum containing known values. */
    tokenizer?: string;
    /** The name of the normalizer to use to normalize the given text. */
    normalizer?: LexicalNormalizerName;
    /** An optional list of token filters to use when breaking the given text. This parameter can only be set when using the tokenizer parameter. */
    tokenFilters?: string[];
    /** An optional list of character filters to use when breaking the given text. This parameter can only be set when using the tokenizer parameter. */
    charFilters?: string[];
}
/** The result of testing an analyzer on text. */
export interface AnalyzeResult {
    /** The list of tokens returned by the analyzer specified in the request. */
    tokens: AnalyzedTokenInfo[];
}
/** Information about a token returned by an analyzer. */
export interface AnalyzedTokenInfo {
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
/** Response from a get service statistics request. If successful, it includes service level counters and limits. */
export interface ServiceStatistics {
    /** Service level resource counters. */
    counters: ServiceCounters;
    /** Service level general limits. */
    limits: ServiceLimits;
}
/** Represents service-level resource counters and quotas. */
export interface ServiceCounters {
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
/** Represents a resource's usage and quota. */
export interface ResourceCounter {
    /** The resource usage amount. */
    usage: number;
    /** The resource amount quota. */
    quota?: number;
}
/** Represents various service level limits. */
export interface ServiceLimits {
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
/** Contains the parameters specific to the HNSW algorithm. */
export interface HnswParameters {
    /** The number of bi-directional links created for every new element during construction. Increasing this parameter value may improve recall and reduce retrieval times for datasets with high intrinsic dimensionality at the expense of increased memory consumption and longer indexing time. */
    m?: number;
    /** The size of the dynamic list containing the nearest neighbors, which is used during index time. Increasing this parameter may improve index quality, at the expense of increased indexing time. At a certain point, increasing this parameter leads to diminishing returns. */
    efConstruction?: number;
    /** The size of the dynamic list containing the nearest neighbors, which is used during search time. Increasing this parameter may improve search results, at the expense of slower search. At a certain point, increasing this parameter leads to diminishing returns. */
    efSearch?: number;
    /** The similarity metric to use for vector comparisons. */
    metric?: VectorSearchAlgorithmMetric;
}
/** Contains the parameters specific to exhaustive KNN algorithm. */
export interface ExhaustiveKnnParameters {
    /** The similarity metric to use for vector comparisons. */
    metric?: VectorSearchAlgorithmMetric;
}
/** Contains the parameters specific to Scalar Quantization. */
export interface ScalarQuantizationParameters {
    /** The quantized data type of compressed vector values. */
    quantizedDataType?: VectorSearchCompressionTarget;
}
/** Specifies the parameters for connecting to the Azure OpenAI resource. */
export interface AzureOpenAIParameters {
    /** The resource URI of the Azure OpenAI resource. */
    resourceUrl?: string;
    /** ID of the Azure OpenAI model deployment on the designated resource. */
    deploymentId?: string;
    /** API key of the designated Azure OpenAI resource. */
    apiKey?: string;
    /** The user-assigned managed identity used for outbound connections. */
    authIdentity?: SearchIndexerDataIdentityUnion;
    /** The name of the embedding model that is deployed at the provided deploymentId path. */
    modelName?: AzureOpenAIModelName;
}
/** Abstract base type for data identities. */
export interface SearchIndexerDataIdentity {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.DataNoneIdentity" | "#Microsoft.Azure.Search.DataUserAssignedIdentity";
}
/** Specifies the properties for connecting to a user-defined vectorizer. */
export interface WebApiParameters {
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
    authIdentity?: SearchIndexerDataIdentityUnion;
}
/** Provides parameter values to a distance scoring function. */
export interface DistanceScoringParameters {
    /** The name of the parameter passed in search queries to specify the reference location. */
    referencePointParameter: string;
    /** The distance in kilometers from the reference location where the boosting range ends. */
    boostingDistance: number;
}
/** Provides parameter values to a freshness scoring function. */
export interface FreshnessScoringParameters {
    /** The expiration period after which boosting will stop for a particular document. */
    boostingDuration: string;
}
/** Provides parameter values to a magnitude scoring function. */
export interface MagnitudeScoringParameters {
    /** The field value at which boosting starts. */
    boostingRangeStart: number;
    /** The field value at which boosting ends. */
    boostingRangeEnd: number;
    /** A value indicating whether to apply a constant boost for field values beyond the range end value; default is false. */
    shouldBoostBeyondRangeByConstant?: boolean;
}
/** Provides parameter values to a tag scoring function. */
export interface TagScoringParameters {
    /** The name of the parameter passed in search queries to specify the list of tags to compare against the target field. */
    tagsParameter: string;
}
/** A dictionary of knowledge store-specific configuration properties. Each name is the name of a specific property. Each value must be of a primitive type. */
export interface SearchIndexerKnowledgeStoreParameters {
    /** Describes unknown properties. The value of an unknown property can be of "any" type. */
    [property: string]: any;
    /** Whether or not projections should synthesize a generated key name if one isn't already present. */
    synthesizeGeneratedKeyName?: boolean;
}
/** An object that contains information about the matches that were found, and related metadata. */
export interface CustomEntity {
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
export interface CustomEntityAlias {
    /** The text of the alias. */
    text: string;
    /** Determine if the alias is case sensitive. */
    caseSensitive?: boolean;
    /** Determine if the alias is accent sensitive. */
    accentSensitive?: boolean;
    /** Determine the fuzzy edit distance of the alias. */
    fuzzyEditDistance?: number;
}
/** Controls the cardinality for chunking the content. */
export interface DocumentIntelligenceLayoutSkillChunkingProperties {
    /** The unit of the chunk. */
    unit?: DocumentIntelligenceLayoutSkillChunkingUnit;
    /** The maximum chunk length in characters. Default is 500. */
    maximumLength?: number;
    /** The length of overlap provided between two text chunks. Default is 0. */
    overlapLength?: number;
}
/** Defines a data change detection policy that captures changes based on the value of a high water mark column. */
export interface HighWaterMarkChangeDetectionPolicy extends DataChangeDetectionPolicy {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.HighWaterMarkChangeDetectionPolicy";
    /** The name of the high water mark column. */
    highWaterMarkColumnName: string;
}
/** Defines a data change detection policy that captures changes using the Integrated Change Tracking feature of Azure SQL Database. */
export interface SqlIntegratedChangeTrackingPolicy extends DataChangeDetectionPolicy {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.SqlIntegratedChangeTrackingPolicy";
}
/** Defines a data deletion detection policy that implements a soft-deletion strategy. It determines whether an item should be deleted based on the value of a designated 'soft delete' column. */
export interface SoftDeleteColumnDeletionDetectionPolicy extends DataDeletionDetectionPolicy {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.SoftDeleteColumnDeletionDetectionPolicy";
    /** The name of the column to use for soft-deletion detection. */
    softDeleteColumnName?: string;
    /** The marker value that identifies an item as deleted. */
    softDeleteMarkerValue?: string;
}
/** A skill that enables scenarios that require a Boolean operation to determine the data to assign to an output. */
export interface ConditionalSkill extends SearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Util.ConditionalSkill";
}
/** A skill that uses text analytics for key phrase extraction. */
export interface KeyPhraseExtractionSkill extends SearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Text.KeyPhraseExtractionSkill";
    /** A value indicating which language code to use. Default is `en`. */
    defaultLanguageCode?: KeyPhraseExtractionSkillLanguage;
    /** A number indicating how many key phrases to return. If absent, all identified key phrases will be returned. */
    maxKeyPhraseCount?: number;
    /** The version of the model to use when calling the Text Analytics service. It will default to the latest available when not specified. We recommend you do not specify this value unless absolutely necessary. */
    modelVersion?: string;
}
/** A skill that extracts text from image files. */
export interface OcrSkill extends SearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Vision.OcrSkill";
    /** A value indicating which language code to use. Default is `en`. */
    defaultLanguageCode?: OcrSkillLanguage;
    /** A value indicating to turn orientation detection on or not. Default is false. */
    shouldDetectOrientation?: boolean;
    /** Defines the sequence of characters to use between the lines of text recognized by the OCR skill. The default value is "space". */
    lineEnding?: OcrLineEnding;
}
/** A skill that analyzes image files. It extracts a rich set of visual features based on the image content. */
export interface ImageAnalysisSkill extends SearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Vision.ImageAnalysisSkill";
    /** A value indicating which language code to use. Default is `en`. */
    defaultLanguageCode?: ImageAnalysisSkillLanguage;
    /** A list of visual features. */
    visualFeatures?: VisualFeature[];
    /** A string indicating which domain-specific details to return. */
    details?: ImageDetail[];
}
/** A skill that detects the language of input text and reports a single language code for every document submitted on the request. The language code is paired with a score indicating the confidence of the analysis. */
export interface LanguageDetectionSkill extends SearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Text.LanguageDetectionSkill";
    /** A country code to use as a hint to the language detection model if it cannot disambiguate the language. */
    defaultCountryHint?: string;
    /** The version of the model to use when calling the Text Analytics service. It will default to the latest available when not specified. We recommend you do not specify this value unless absolutely necessary. */
    modelVersion?: string;
}
/** A skill for reshaping the outputs. It creates a complex type to support composite fields (also known as multipart fields). */
export interface ShaperSkill extends SearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Util.ShaperSkill";
}
/** A skill for merging two or more strings into a single unified string, with an optional user-defined delimiter separating each component part. */
export interface MergeSkill extends SearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Text.MergeSkill";
    /** The tag indicates the start of the merged text. By default, the tag is an empty space. */
    insertPreTag?: string;
    /** The tag indicates the end of the merged text. By default, the tag is an empty space. */
    insertPostTag?: string;
}
/**
 * This skill is deprecated. Use the V3.EntityRecognitionSkill instead.
 *
 * @deprecated
 */
export interface EntityRecognitionSkill extends SearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Text.EntityRecognitionSkill";
    /** A list of entity categories that should be extracted. */
    categories?: EntityCategory[];
    /** A value indicating which language code to use. Default is `en`. */
    defaultLanguageCode?: EntityRecognitionSkillLanguage;
    /** Determines whether or not to include entities which are well known but don't conform to a pre-defined type. If this configuration is not set (default), set to null or set to false, entities which don't conform to one of the pre-defined types will not be surfaced. */
    includeTypelessEntities?: boolean;
    /** A value between 0 and 1 that be used to only include entities whose confidence score is greater than the value specified. If not set (default), or if explicitly set to null, all entities will be included. */
    minimumPrecision?: number;
}
/**
 * This skill is deprecated. Use the V3.SentimentSkill instead.
 *
 * @deprecated
 */
export interface SentimentSkill extends SearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Text.SentimentSkill";
    /** A value indicating which language code to use. Default is `en`. */
    defaultLanguageCode?: SentimentSkillLanguage;
}
/** Using the Text Analytics API, evaluates unstructured text and for each record, provides sentiment labels (such as "negative", "neutral" and "positive") based on the highest confidence score found by the service at a sentence and document-level. */
export interface SentimentSkillV3 extends SearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Text.V3.SentimentSkill";
    /** A value indicating which language code to use. Default is `en`. */
    defaultLanguageCode?: string;
    /** If set to true, the skill output will include information from Text Analytics for opinion mining, namely targets (nouns or verbs) and their associated assessment (adjective) in the text. Default is false. */
    includeOpinionMining?: boolean;
    /** The version of the model to use when calling the Text Analytics service. It will default to the latest available when not specified. We recommend you do not specify this value unless absolutely necessary. */
    modelVersion?: string;
}
/** Using the Text Analytics API, extracts linked entities from text. */
export interface EntityLinkingSkill extends SearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Text.V3.EntityLinkingSkill";
    /** A value indicating which language code to use. Default is `en`. */
    defaultLanguageCode?: string;
    /** A value between 0 and 1 that be used to only include entities whose confidence score is greater than the value specified. If not set (default), or if explicitly set to null, all entities will be included. */
    minimumPrecision?: number;
    /** The version of the model to use when calling the Text Analytics service. It will default to the latest available when not specified. We recommend you do not specify this value unless absolutely necessary. */
    modelVersion?: string;
}
/** Using the Text Analytics API, extracts entities of different types from text. */
export interface EntityRecognitionSkillV3 extends SearchIndexerSkill {
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
/** Using the Text Analytics API, extracts personal information from an input text and gives you the option of masking it. */
export interface PIIDetectionSkill extends SearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Text.PIIDetectionSkill";
    /** A value indicating which language code to use. Default is `en`. */
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
/** A skill to split a string into chunks of text. */
export interface SplitSkill extends SearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Text.SplitSkill";
    /** A value indicating which language code to use. Default is `en`. */
    defaultLanguageCode?: SplitSkillLanguage;
    /** A value indicating which split mode to perform. */
    textSplitMode?: TextSplitMode;
    /** The desired maximum page length. Default is 10000. */
    maxPageLength?: number;
    /** Only applicable when textSplitMode is set to 'pages'. If specified, n+1th chunk will start with this number of characters/tokens from the end of the nth chunk. */
    pageOverlapLength?: number;
    /** Only applicable when textSplitMode is set to 'pages'. If specified, the SplitSkill will discontinue splitting after processing the first 'maximumPagesToTake' pages, in order to improve performance when only a few initial pages are needed from each document. */
    maximumPagesToTake?: number;
}
/** A skill looks for text from a custom, user-defined list of words and phrases. */
export interface CustomEntityLookupSkill extends SearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Text.CustomEntityLookupSkill";
    /** A value indicating which language code to use. Default is `en`. */
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
/** A skill to translate text from one language to another. */
export interface TextTranslationSkill extends SearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Text.TranslationSkill";
    /** The language code to translate documents into for documents that don't specify the to language explicitly. */
    defaultToLanguageCode: TextTranslationSkillLanguage;
    /** The language code to translate documents from for documents that don't specify the from language explicitly. */
    defaultFromLanguageCode?: TextTranslationSkillLanguage;
    /** The language code to translate documents from when neither the fromLanguageCode input nor the defaultFromLanguageCode parameter are provided, and the automatic language detection is unsuccessful. Default is `en`. */
    suggestedFrom?: TextTranslationSkillLanguage;
}
/** A skill that extracts content from a file within the enrichment pipeline. */
export interface DocumentExtractionSkill extends SearchIndexerSkill {
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
/** A skill that extracts content and layout information, via Azure AI Services, from files within the enrichment pipeline. */
export interface DocumentIntelligenceLayoutSkill extends SearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Util.DocumentIntelligenceLayoutSkill";
    /** Controls the cardinality of the output format. Default is 'markdown'. */
    outputFormat?: DocumentIntelligenceLayoutSkillOutputFormat;
    /** Controls the cardinality of the output produced by the skill. Default is 'oneToMany'. */
    outputMode?: DocumentIntelligenceLayoutSkillOutputMode;
    /** The depth of headers in the markdown output. Default is h6. */
    markdownHeaderDepth?: DocumentIntelligenceLayoutSkillMarkdownHeaderDepth;
    /** Controls the cardinality of the content extracted from the document by the skill */
    extractionOptions?: DocumentIntelligenceLayoutSkillExtractionOptions[];
    /** Controls the cardinality for chunking the content. */
    chunkingProperties?: DocumentIntelligenceLayoutSkillChunkingProperties;
}
/** A skill that can call a Web API endpoint, allowing you to extend a skillset by having it call your custom code. */
export interface WebApiSkill extends SearchIndexerSkill {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Custom.WebApiSkill";
    /** The url for the Web API. */
    uri: string;
    /** The headers required to make the http request. */
    httpHeaders?: {
        [propertyName: string]: string;
    };
    /** The method for the http request. */
    httpMethod?: string;
    /** The desired timeout for the request. Default is 30 seconds. */
    timeout?: string;
    /** The desired batch size which indicates number of documents. */
    batchSize?: number;
    /** If set, the number of parallel calls that can be made to the Web API. */
    degreeOfParallelism?: number;
    /** Applies to custom skills that connect to external code in an Azure function or some other application that provides the transformations. This value should be the application ID created for the function or app when it was registered with Azure Active Directory. When specified, the custom skill connects to the function or app using a managed ID (either system or user-assigned) of the search service and the access token of the function or app, using this value as the resource id for creating the scope of the access token. */
    authResourceId?: string;
    /** The user-assigned managed identity used for outbound connections. If an authResourceId is provided and it's not specified, the system-assigned managed identity is used. On updates to the indexer, if the identity is unspecified, the value remains unchanged. If set to "none", the value of this property is cleared. */
    authIdentity?: SearchIndexerDataIdentityUnion;
}
/** Allows you to generate a vector embedding for a given text input using the Azure OpenAI resource. */
export interface AzureOpenAIEmbeddingSkill extends SearchIndexerSkill, AzureOpenAIParameters {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Skills.Text.AzureOpenAIEmbeddingSkill";
    /** The number of dimensions the resulting output embeddings should have. Only supported in text-embedding-3 and later models. */
    dimensions?: number;
}
/** An empty object that represents the default Azure AI service resource for a skillset. */
export interface DefaultCognitiveServicesAccount extends CognitiveServicesAccount {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.DefaultCognitiveServices";
}
/** The multi-region account key of an Azure AI service resource that's attached to a skillset. */
export interface CognitiveServicesAccountKey extends CognitiveServicesAccount {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.CognitiveServicesByKey";
    /** The key used to provision the Azure AI service resource attached to a skillset. */
    key: string;
}
/** Description for what data to store in Azure Tables. */
export interface SearchIndexerKnowledgeStoreTableProjectionSelector extends SearchIndexerKnowledgeStoreProjectionSelector {
    /** Name of the Azure table to store projected data in. */
    tableName: string;
}
/** Abstract class to share properties between concrete selectors. */
export interface SearchIndexerKnowledgeStoreBlobProjectionSelector extends SearchIndexerKnowledgeStoreProjectionSelector {
    /** Blob container to store projections in. */
    storageContainer: string;
}
/** Defines a function that boosts scores based on distance from a geographic location. */
export interface DistanceScoringFunction extends ScoringFunction {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    type: "distance";
    /** Parameter values for the distance scoring function. */
    parameters: DistanceScoringParameters;
}
/** Defines a function that boosts scores based on the value of a date-time field. */
export interface FreshnessScoringFunction extends ScoringFunction {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    type: "freshness";
    /** Parameter values for the freshness scoring function. */
    parameters: FreshnessScoringParameters;
}
/** Defines a function that boosts scores based on the magnitude of a numeric field. */
export interface MagnitudeScoringFunction extends ScoringFunction {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    type: "magnitude";
    /** Parameter values for the magnitude scoring function. */
    parameters: MagnitudeScoringParameters;
}
/** Defines a function that boosts scores of documents with string values matching a given list of tags. */
export interface TagScoringFunction extends ScoringFunction {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    type: "tag";
    /** Parameter values for the tag scoring function. */
    parameters: TagScoringParameters;
}
/** Allows you to take control over the process of converting text into indexable/searchable tokens. It's a user-defined configuration consisting of a single predefined tokenizer and one or more filters. The tokenizer is responsible for breaking text into tokens, and the filters for modifying tokens emitted by the tokenizer. */
export interface CustomAnalyzer extends LexicalAnalyzer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.CustomAnalyzer";
    /** The name of the tokenizer to use to divide continuous text into a sequence of tokens, such as breaking a sentence into words. KnownTokenizerNames is an enum containing known values. */
    tokenizerName: string;
    /** A list of token filters used to filter out or modify the tokens generated by a tokenizer. For example, you can specify a lowercase filter that converts all characters to lowercase. The filters are run in the order in which they are listed. */
    tokenFilters?: string[];
    /** A list of character filters used to prepare input text before it is processed by the tokenizer. For instance, they can replace certain characters or symbols. The filters are run in the order in which they are listed. */
    charFilters?: string[];
}
/** Flexibly separates text into terms via a regular expression pattern. This analyzer is implemented using Apache Lucene. */
export interface PatternAnalyzer extends LexicalAnalyzer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.PatternAnalyzer";
    /** A value indicating whether terms should be lower-cased. Default is true. */
    lowerCaseTerms?: boolean;
    /** A regular expression pattern to match token separators. Default is an expression that matches one or more non-word characters. */
    pattern?: string;
    /** Regular expression flags. */
    flags?: string;
    /** A list of stopwords. */
    stopwords?: string[];
}
/** Standard Apache Lucene analyzer; Composed of the standard tokenizer, lowercase filter and stop filter. */
export interface LuceneStandardAnalyzer extends LexicalAnalyzer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.StandardAnalyzer";
    /** The maximum token length. Default is 255. Tokens longer than the maximum length are split. The maximum token length that can be used is 300 characters. */
    maxTokenLength?: number;
    /** A list of stopwords. */
    stopwords?: string[];
}
/** Divides text at non-letters; Applies the lowercase and stopword token filters. This analyzer is implemented using Apache Lucene. */
export interface StopAnalyzer extends LexicalAnalyzer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.StopAnalyzer";
    /** A list of stopwords. */
    stopwords?: string[];
}
/** Grammar-based tokenizer that is suitable for processing most European-language documents. This tokenizer is implemented using Apache Lucene. */
export interface ClassicTokenizer extends LexicalTokenizer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.ClassicTokenizer";
    /** The maximum token length. Default is 255. Tokens longer than the maximum length are split. The maximum token length that can be used is 300 characters. */
    maxTokenLength?: number;
}
/** Tokenizes the input from an edge into n-grams of the given size(s). This tokenizer is implemented using Apache Lucene. */
export interface EdgeNGramTokenizer extends LexicalTokenizer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.EdgeNGramTokenizer";
    /** The minimum n-gram length. Default is 1. Maximum is 300. Must be less than the value of maxGram. */
    minGram?: number;
    /** The maximum n-gram length. Default is 2. Maximum is 300. */
    maxGram?: number;
    /** Character classes to keep in the tokens. */
    tokenChars?: TokenCharacterKind[];
}
/** Emits the entire input as a single token. This tokenizer is implemented using Apache Lucene. */
export interface KeywordTokenizer extends LexicalTokenizer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.KeywordTokenizer";
    /** The read buffer size in bytes. Default is 256. */
    bufferSize?: number;
}
/** Emits the entire input as a single token. This tokenizer is implemented using Apache Lucene. */
export interface KeywordTokenizerV2 extends LexicalTokenizer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.KeywordTokenizerV2";
    /** The maximum token length. Default is 256. Tokens longer than the maximum length are split. The maximum token length that can be used is 300 characters. */
    maxTokenLength?: number;
}
/** Divides text using language-specific rules. */
export interface MicrosoftLanguageTokenizer extends LexicalTokenizer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.MicrosoftLanguageTokenizer";
    /** The maximum token length. Tokens longer than the maximum length are split. Maximum token length that can be used is 300 characters. Tokens longer than 300 characters are first split into tokens of length 300 and then each of those tokens is split based on the max token length set. Default is 255. */
    maxTokenLength?: number;
    /** A value indicating how the tokenizer is used. Set to true if used as the search tokenizer, set to false if used as the indexing tokenizer. Default is false. */
    isSearchTokenizer?: boolean;
    /** The language to use. The default is English. */
    language?: MicrosoftTokenizerLanguage;
}
/** Divides text using language-specific rules and reduces words to their base forms. */
export interface MicrosoftLanguageStemmingTokenizer extends LexicalTokenizer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.MicrosoftLanguageStemmingTokenizer";
    /** The maximum token length. Tokens longer than the maximum length are split. Maximum token length that can be used is 300 characters. Tokens longer than 300 characters are first split into tokens of length 300 and then each of those tokens is split based on the max token length set. Default is 255. */
    maxTokenLength?: number;
    /** A value indicating how the tokenizer is used. Set to true if used as the search tokenizer, set to false if used as the indexing tokenizer. Default is false. */
    isSearchTokenizer?: boolean;
    /** The language to use. The default is English. */
    language?: MicrosoftStemmingTokenizerLanguage;
}
/** Tokenizes the input into n-grams of the given size(s). This tokenizer is implemented using Apache Lucene. */
export interface NGramTokenizer extends LexicalTokenizer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.NGramTokenizer";
    /** The minimum n-gram length. Default is 1. Maximum is 300. Must be less than the value of maxGram. */
    minGram?: number;
    /** The maximum n-gram length. Default is 2. Maximum is 300. */
    maxGram?: number;
    /** Character classes to keep in the tokens. */
    tokenChars?: TokenCharacterKind[];
}
/** Tokenizer for path-like hierarchies. This tokenizer is implemented using Apache Lucene. */
export interface PathHierarchyTokenizerV2 extends LexicalTokenizer {
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
/** Tokenizer that uses regex pattern matching to construct distinct tokens. This tokenizer is implemented using Apache Lucene. */
export interface PatternTokenizer extends LexicalTokenizer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.PatternTokenizer";
    /** A regular expression pattern to match token separators. Default is an expression that matches one or more non-word characters. */
    pattern?: string;
    /** Regular expression flags. */
    flags?: string;
    /** The zero-based ordinal of the matching group in the regular expression pattern to extract into tokens. Use -1 if you want to use the entire pattern to split the input into tokens, irrespective of matching groups. Default is -1. */
    group?: number;
}
/** Breaks text following the Unicode Text Segmentation rules. This tokenizer is implemented using Apache Lucene. */
export interface LuceneStandardTokenizer extends LexicalTokenizer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.StandardTokenizer";
    /** The maximum token length. Default is 255. Tokens longer than the maximum length are split. */
    maxTokenLength?: number;
}
/** Breaks text following the Unicode Text Segmentation rules. This tokenizer is implemented using Apache Lucene. */
export interface LuceneStandardTokenizerV2 extends LexicalTokenizer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.StandardTokenizerV2";
    /** The maximum token length. Default is 255. Tokens longer than the maximum length are split. The maximum token length that can be used is 300 characters. */
    maxTokenLength?: number;
}
/** Tokenizes urls and emails as one token. This tokenizer is implemented using Apache Lucene. */
export interface UaxUrlEmailTokenizer extends LexicalTokenizer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.UaxUrlEmailTokenizer";
    /** The maximum token length. Default is 255. Tokens longer than the maximum length are split. The maximum token length that can be used is 300 characters. */
    maxTokenLength?: number;
}
/** Converts alphabetic, numeric, and symbolic Unicode characters which are not in the first 127 ASCII characters (the "Basic Latin" Unicode block) into their ASCII equivalents, if such equivalents exist. This token filter is implemented using Apache Lucene. */
export interface AsciiFoldingTokenFilter extends TokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.AsciiFoldingTokenFilter";
    /** A value indicating whether the original token will be kept. Default is false. */
    preserveOriginal?: boolean;
}
/** Forms bigrams of CJK terms that are generated from the standard tokenizer. This token filter is implemented using Apache Lucene. */
export interface CjkBigramTokenFilter extends TokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.CjkBigramTokenFilter";
    /** The scripts to ignore. */
    ignoreScripts?: CjkBigramTokenFilterScripts[];
    /** A value indicating whether to output both unigrams and bigrams (if true), or just bigrams (if false). Default is false. */
    outputUnigrams?: boolean;
}
/** Construct bigrams for frequently occurring terms while indexing. Single terms are still indexed too, with bigrams overlaid. This token filter is implemented using Apache Lucene. */
export interface CommonGramTokenFilter extends TokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.CommonGramTokenFilter";
    /** The set of common words. */
    commonWords: string[];
    /** A value indicating whether common words matching will be case insensitive. Default is false. */
    ignoreCase?: boolean;
    /** A value that indicates whether the token filter is in query mode. When in query mode, the token filter generates bigrams and then removes common words and single terms followed by a common word. Default is false. */
    useQueryMode?: boolean;
}
/** Decomposes compound words found in many Germanic languages. This token filter is implemented using Apache Lucene. */
export interface DictionaryDecompounderTokenFilter extends TokenFilter {
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
/** Generates n-grams of the given size(s) starting from the front or the back of an input token. This token filter is implemented using Apache Lucene. */
export interface EdgeNGramTokenFilter extends TokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.EdgeNGramTokenFilter";
    /** The minimum n-gram length. Default is 1. Must be less than the value of maxGram. */
    minGram?: number;
    /** The maximum n-gram length. Default is 2. */
    maxGram?: number;
    /** Specifies which side of the input the n-gram should be generated from. Default is "front". */
    side?: EdgeNGramTokenFilterSide;
}
/** Generates n-grams of the given size(s) starting from the front or the back of an input token. This token filter is implemented using Apache Lucene. */
export interface EdgeNGramTokenFilterV2 extends TokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.EdgeNGramTokenFilterV2";
    /** The minimum n-gram length. Default is 1. Maximum is 300. Must be less than the value of maxGram. */
    minGram?: number;
    /** The maximum n-gram length. Default is 2. Maximum is 300. */
    maxGram?: number;
    /** Specifies which side of the input the n-gram should be generated from. Default is "front". */
    side?: EdgeNGramTokenFilterSide;
}
/** Removes elisions. For example, "l'avion" (the plane) will be converted to "avion" (plane). This token filter is implemented using Apache Lucene. */
export interface ElisionTokenFilter extends TokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.ElisionTokenFilter";
    /** The set of articles to remove. */
    articles?: string[];
}
/** A token filter that only keeps tokens with text contained in a specified list of words. This token filter is implemented using Apache Lucene. */
export interface KeepTokenFilter extends TokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.KeepTokenFilter";
    /** The list of words to keep. */
    keepWords: string[];
    /** A value indicating whether to lower case all words first. Default is false. */
    lowerCaseKeepWords?: boolean;
}
/** Marks terms as keywords. This token filter is implemented using Apache Lucene. */
export interface KeywordMarkerTokenFilter extends TokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.KeywordMarkerTokenFilter";
    /** A list of words to mark as keywords. */
    keywords: string[];
    /** A value indicating whether to ignore case. If true, all words are converted to lower case first. Default is false. */
    ignoreCase?: boolean;
}
/** Removes words that are too long or too short. This token filter is implemented using Apache Lucene. */
export interface LengthTokenFilter extends TokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.LengthTokenFilter";
    /** The minimum length in characters. Default is 0. Maximum is 300. Must be less than the value of max. */
    minLength?: number;
    /** The maximum length in characters. Default and maximum is 300. */
    maxLength?: number;
}
/** Limits the number of tokens while indexing. This token filter is implemented using Apache Lucene. */
export interface LimitTokenFilter extends TokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.LimitTokenFilter";
    /** The maximum number of tokens to produce. Default is 1. */
    maxTokenCount?: number;
    /** A value indicating whether all tokens from the input must be consumed even if maxTokenCount is reached. Default is false. */
    consumeAllTokens?: boolean;
}
/** Generates n-grams of the given size(s). This token filter is implemented using Apache Lucene. */
export interface NGramTokenFilter extends TokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.NGramTokenFilter";
    /** The minimum n-gram length. Default is 1. Must be less than the value of maxGram. */
    minGram?: number;
    /** The maximum n-gram length. Default is 2. */
    maxGram?: number;
}
/** Generates n-grams of the given size(s). This token filter is implemented using Apache Lucene. */
export interface NGramTokenFilterV2 extends TokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.NGramTokenFilterV2";
    /** The minimum n-gram length. Default is 1. Maximum is 300. Must be less than the value of maxGram. */
    minGram?: number;
    /** The maximum n-gram length. Default is 2. Maximum is 300. */
    maxGram?: number;
}
/** Uses Java regexes to emit multiple tokens - one for each capture group in one or more patterns. This token filter is implemented using Apache Lucene. */
export interface PatternCaptureTokenFilter extends TokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.PatternCaptureTokenFilter";
    /** A list of patterns to match against each token. */
    patterns: string[];
    /** A value indicating whether to return the original token even if one of the patterns matches. Default is true. */
    preserveOriginal?: boolean;
}
/** A character filter that replaces characters in the input string. It uses a regular expression to identify character sequences to preserve and a replacement pattern to identify characters to replace. For example, given the input text "aa bb aa bb", pattern "(aa)\s+(bb)", and replacement "$1#$2", the result would be "aa#bb aa#bb". This token filter is implemented using Apache Lucene. */
export interface PatternReplaceTokenFilter extends TokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.PatternReplaceTokenFilter";
    /** A regular expression pattern. */
    pattern: string;
    /** The replacement text. */
    replacement: string;
}
/** Create tokens for phonetic matches. This token filter is implemented using Apache Lucene. */
export interface PhoneticTokenFilter extends TokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.PhoneticTokenFilter";
    /** The phonetic encoder to use. Default is "metaphone". */
    encoder?: PhoneticEncoder;
    /** A value indicating whether encoded tokens should replace original tokens. If false, encoded tokens are added as synonyms. Default is true. */
    replaceOriginalTokens?: boolean;
}
/** Creates combinations of tokens as a single token. This token filter is implemented using Apache Lucene. */
export interface ShingleTokenFilter extends TokenFilter {
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
/** A filter that stems words using a Snowball-generated stemmer. This token filter is implemented using Apache Lucene. */
export interface SnowballTokenFilter extends TokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.SnowballTokenFilter";
    /** The language to use. */
    language: SnowballTokenFilterLanguage;
}
/** Language specific stemming filter. This token filter is implemented using Apache Lucene. */
export interface StemmerTokenFilter extends TokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.StemmerTokenFilter";
    /** The language to use. */
    language: StemmerTokenFilterLanguage;
}
/** Provides the ability to override other stemming filters with custom dictionary-based stemming. Any dictionary-stemmed terms will be marked as keywords so that they will not be stemmed with stemmers down the chain. Must be placed before any stemming filters. This token filter is implemented using Apache Lucene. */
export interface StemmerOverrideTokenFilter extends TokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.StemmerOverrideTokenFilter";
    /** A list of stemming rules in the following format: "word => stem", for example: "ran => run". */
    rules: string[];
}
/** Removes stop words from a token stream. This token filter is implemented using Apache Lucene. */
export interface StopwordsTokenFilter extends TokenFilter {
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
/** Matches single or multi-word synonyms in a token stream. This token filter is implemented using Apache Lucene. */
export interface SynonymTokenFilter extends TokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.SynonymTokenFilter";
    /** A list of synonyms in following one of two formats: 1. incredible, unbelievable, fabulous => amazing - all terms on the left side of => symbol will be replaced with all terms on its right side; 2. incredible, unbelievable, fabulous, amazing - comma separated list of equivalent words. Set the expand option to change how this list is interpreted. */
    synonyms: string[];
    /** A value indicating whether to case-fold input for matching. Default is false. */
    ignoreCase?: boolean;
    /** A value indicating whether all words in the list of synonyms (if => notation is not used) will map to one another. If true, all words in the list of synonyms (if => notation is not used) will map to one another. The following list: incredible, unbelievable, fabulous, amazing is equivalent to: incredible, unbelievable, fabulous, amazing => incredible, unbelievable, fabulous, amazing. If false, the following list: incredible, unbelievable, fabulous, amazing will be equivalent to: incredible, unbelievable, fabulous, amazing => incredible. Default is true. */
    expand?: boolean;
}
/** Truncates the terms to a specific length. This token filter is implemented using Apache Lucene. */
export interface TruncateTokenFilter extends TokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.TruncateTokenFilter";
    /** The length at which terms will be truncated. Default and maximum is 300. */
    length?: number;
}
/** Filters out tokens with same text as the previous token. This token filter is implemented using Apache Lucene. */
export interface UniqueTokenFilter extends TokenFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.UniqueTokenFilter";
    /** A value indicating whether to remove duplicates only at the same position. Default is false. */
    onlyOnSamePosition?: boolean;
}
/** Splits words into subwords and performs optional transformations on subword groups. This token filter is implemented using Apache Lucene. */
export interface WordDelimiterTokenFilter extends TokenFilter {
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
/** A character filter that applies mappings defined with the mappings option. Matching is greedy (longest pattern matching at a given point wins). Replacement is allowed to be the empty string. This character filter is implemented using Apache Lucene. */
export interface MappingCharFilter extends CharFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.MappingCharFilter";
    /** A list of mappings of the following format: "a=>b" (all occurrences of the character "a" will be replaced with character "b"). */
    mappings: string[];
}
/** A character filter that replaces characters in the input string. It uses a regular expression to identify character sequences to preserve and a replacement pattern to identify characters to replace. For example, given the input text "aa bb aa bb", pattern "(aa)\s+(bb)", and replacement "$1#$2", the result would be "aa#bb aa#bb". This character filter is implemented using Apache Lucene. */
export interface PatternReplaceCharFilter extends CharFilter {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.PatternReplaceCharFilter";
    /** A regular expression pattern. */
    pattern: string;
    /** The replacement text. */
    replacement: string;
}
/** Allows you to configure normalization for filterable, sortable, and facetable fields, which by default operate with strict matching. This is a user-defined configuration consisting of at least one or more filters, which modify the token that is stored. */
export interface CustomLexicalNormalizer extends BaseLexicalNormalizer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.CustomNormalizer";
    /** A list of token filters used to filter out or modify the input token. For example, you can specify a lowercase filter that converts all characters to lowercase. The filters are run in the order in which they are listed. */
    tokenFilters?: TokenFilterName[];
    /** A list of character filters used to prepare input text before it is processed. For instance, they can replace certain characters or symbols. The filters are run in the order in which they are listed. */
    charFilters?: CharFilterName[];
}
/** Legacy similarity algorithm which uses the Lucene TFIDFSimilarity implementation of TF-IDF. This variation of TF-IDF introduces static document length normalization as well as coordinating factors that penalize documents that only partially match the searched queries. */
export interface ClassicSimilarity extends Similarity {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.ClassicSimilarity";
}
/** Ranking function based on the Okapi BM25 similarity algorithm. BM25 is a TF-IDF-like algorithm that includes length normalization (controlled by the 'b' parameter) as well as term frequency saturation (controlled by the 'k1' parameter). */
export interface BM25Similarity extends Similarity {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.BM25Similarity";
    /** This property controls the scaling function between the term frequency of each matching terms and the final relevance score of a document-query pair. By default, a value of 1.2 is used. A value of 0.0 means the score does not scale with an increase in term frequency. */
    k1?: number;
    /** This property controls how the length of a document affects the relevance score. By default, a value of 0.75 is used. A value of 0.0 means no length normalization is applied, while a value of 1.0 means the score is fully normalized by the length of the document. */
    b?: number;
}
/** Contains configuration options specific to the HNSW approximate nearest neighbors algorithm used during indexing and querying. The HNSW algorithm offers a tunable trade-off between search speed and accuracy. */
export interface HnswAlgorithmConfiguration extends VectorSearchAlgorithmConfiguration {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    kind: "hnsw";
    /** Contains the parameters specific to HNSW algorithm. */
    parameters?: HnswParameters;
}
/** Contains configuration options specific to the exhaustive KNN algorithm used during querying, which will perform brute-force search across the entire vector index. */
export interface ExhaustiveKnnAlgorithmConfiguration extends VectorSearchAlgorithmConfiguration {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    kind: "exhaustiveKnn";
    /** Contains the parameters specific to exhaustive KNN algorithm. */
    parameters?: ExhaustiveKnnParameters;
}
/** Specifies the Azure OpenAI resource used to vectorize a query string. */
export interface AzureOpenAIVectorizer extends VectorSearchVectorizer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    kind: "azureOpenAI";
    /** Contains the parameters specific to Azure OpenAI embedding vectorization. */
    parameters?: AzureOpenAIParameters;
}
/** Specifies a user-defined vectorizer for generating the vector embedding of a query string. Integration of an external vectorizer is achieved using the custom Web API interface of a skillset. */
export interface WebApiVectorizer extends VectorSearchVectorizer {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    kind: "customWebApi";
    /** Specifies the properties of the user-defined vectorizer. */
    parameters?: WebApiParameters;
}
/** Contains configuration options specific to the scalar quantization compression method used during indexing and querying. */
export interface ScalarQuantizationCompression extends VectorSearchCompression {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    kind: "scalarQuantization";
    /** Contains the parameters specific to Scalar Quantization. */
    parameters?: ScalarQuantizationParameters;
}
/** Contains configuration options specific to the binary quantization compression method used during indexing and querying. */
export interface BinaryQuantizationCompression extends VectorSearchCompression {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    kind: "binaryQuantization";
}
/** Clears the identity property of a datasource. */
export interface SearchIndexerDataNoneIdentity extends SearchIndexerDataIdentity {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.DataNoneIdentity";
}
/** Specifies the identity for a datasource to use. */
export interface SearchIndexerDataUserAssignedIdentity extends SearchIndexerDataIdentity {
    /** Polymorphic discriminator, which specifies the different types this object can be */
    odatatype: "#Microsoft.Azure.Search.DataUserAssignedIdentity";
    /** The fully qualified Azure resource Id of a user assigned managed identity typically in the form "/subscriptions/12345678-1234-1234-1234-1234567890ab/resourceGroups/rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/myId" that should have been assigned to the search service. */
    resourceId: string;
}
/** Projection definition for what data to store in Azure Blob. */
export interface SearchIndexerKnowledgeStoreObjectProjectionSelector extends SearchIndexerKnowledgeStoreBlobProjectionSelector {
}
/** Projection definition for what data to store in Azure Files. */
export interface SearchIndexerKnowledgeStoreFileProjectionSelector extends SearchIndexerKnowledgeStoreBlobProjectionSelector {
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
/** Known values of {@link SearchIndexerDataSourceType} that the service accepts. */
export declare enum KnownSearchIndexerDataSourceType {
    /** Definition of an Azure SQL datasource whose credentials can either be a standard SQL connection string or the ResourceId of the SQL resource. The container property refers to the table or view to be indexed. Query parameter is not supported for this datasource. */
    AzureSql = "azuresql",
    /** Definition of an CosmosDB datasource whose credentials can either be a formatted connection string containing details for AccountEndpoint, AccountKey, and Database for a key based connection or details for ResourceID and ApiKind for keyless connection. The container property refers to cosmosdb collection to be indexed and the optional query property refers to a SQL query on the collection. */
    CosmosDb = "cosmosdb",
    /** Definition of an Azure Blob datasource whose credentials can either be a storage connection string or the ResourceId of the storage account. The container property refers to the blob container to be indexed and the optional query property refers to a specific sub-folder in the container. */
    AzureBlob = "azureblob",
    /** Definition of an Azure Table datasource whose credentials can either be a table connection string or the ResourceId of the storage account. The container property refers to the blob container to be indexed and the optional query property can be used to filter rows. */
    AzureTable = "azuretable",
    /** Definition of an Azure SQL datasource whose credentials can either be a standard ADO.NET formatted SQL connection string or the ResourceId of the SQL resource. The container property refers to the table or view to be indexed. Query parameter is not supported for this datasource. */
    MySql = "mysql",
    /** Definition of an Azure ADLS Gen 2 datasource whose credentials can either be a storage connection string or the ResourceId of the storage account. The container property refers to the blob container to be indexed and the optional query property refers to a specific sub-folder in the container. */
    AdlsGen2 = "adlsgen2",
    /** Definition of an Microsoft Fabric Onelake datasource whose credentials can either be the Fabric workspace GUID or a workspace FQDN. The container property refers to the lakehouse GUID and the optional query property refers to folders or shortcuts in the lakehouse. */
    OneLake = "onelake"
}
/**
 * Defines values for SearchIndexerDataSourceType. \
 * {@link KnownSearchIndexerDataSourceType} can be used interchangeably with SearchIndexerDataSourceType,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **azuresql**: Definition of an Azure SQL datasource whose credentials can either be a standard SQL connection string or the ResourceId of the SQL resource. The container property refers to the table or view to be indexed. Query parameter is not supported for this datasource. \
 * **cosmosdb**: Definition of an CosmosDB datasource whose credentials can either be a formatted connection string containing details for AccountEndpoint, AccountKey, and Database for a key based connection or details for ResourceID and ApiKind for keyless connection. The container property refers to cosmosdb collection to be indexed and the optional query property refers to a SQL query on the collection. \
 * **azureblob**: Definition of an Azure Blob datasource whose credentials can either be a storage connection string or the ResourceId of the storage account. The container property refers to the blob container to be indexed and the optional query property refers to a specific sub-folder in the container. \
 * **azuretable**: Definition of an Azure Table datasource whose credentials can either be a table connection string or the ResourceId of the storage account. The container property refers to the blob container to be indexed and the optional query property can be used to filter rows. \
 * **mysql**: Definition of an Azure SQL datasource whose credentials can either be a standard ADO.NET formatted SQL connection string or the ResourceId of the SQL resource. The container property refers to the table or view to be indexed. Query parameter is not supported for this datasource. \
 * **adlsgen2**: Definition of an Azure ADLS Gen 2 datasource whose credentials can either be a storage connection string or the ResourceId of the storage account. The container property refers to the blob container to be indexed and the optional query property refers to a specific sub-folder in the container. \
 * **onelake**: Definition of an Microsoft Fabric Onelake datasource whose credentials can either be the Fabric workspace GUID or a workspace FQDN. The container property refers to the lakehouse GUID and the optional query property refers to folders or shortcuts in the lakehouse.
 */
export type SearchIndexerDataSourceType = string;
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
/**
 * Defines values for BlobIndexerParsingMode. \
 * {@link KnownBlobIndexerParsingMode} can be used interchangeably with BlobIndexerParsingMode,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **default**: Set to default for normal file processing. \
 * **text**: Set to text to improve indexing performance on plain text files in blob storage. \
 * **delimitedText**: Set to delimitedText when blobs are plain CSV files. \
 * **json**: Set to json to extract structured content from JSON files. \
 * **jsonArray**: Set to jsonArray to extract individual elements of a JSON array as separate documents. \
 * **jsonLines**: Set to jsonLines to extract individual JSON entities, separated by a new line, as separate documents.
 */
export type BlobIndexerParsingMode = string;
/** Known values of {@link BlobIndexerDataToExtract} that the service accepts. */
export declare enum KnownBlobIndexerDataToExtract {
    /** Indexes just the standard blob properties and user-specified metadata. */
    StorageMetadata = "storageMetadata",
    /** Extracts metadata provided by the Azure blob storage subsystem and the content-type specific metadata (for example, metadata unique to just .png files are indexed). */
    AllMetadata = "allMetadata",
    /** Extracts all metadata and textual content from each blob. */
    ContentAndMetadata = "contentAndMetadata"
}
/**
 * Defines values for BlobIndexerDataToExtract. \
 * {@link KnownBlobIndexerDataToExtract} can be used interchangeably with BlobIndexerDataToExtract,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **storageMetadata**: Indexes just the standard blob properties and user-specified metadata. \
 * **allMetadata**: Extracts metadata provided by the Azure blob storage subsystem and the content-type specific metadata (for example, metadata unique to just .png files are indexed). \
 * **contentAndMetadata**: Extracts all metadata and textual content from each blob.
 */
export type BlobIndexerDataToExtract = string;
/** Known values of {@link BlobIndexerImageAction} that the service accepts. */
export declare enum KnownBlobIndexerImageAction {
    /** Ignores embedded images or image files in the data set.  This is the default. */
    None = "none",
    /** Extracts text from images (for example, the word "STOP" from a traffic stop sign), and embeds it into the content field.  This action requires that "dataToExtract" is set to "contentAndMetadata".  A normalized image refers to additional processing resulting in uniform image output, sized and rotated to promote consistent rendering when you include images in visual search results. This information is generated for each image when you use this option. */
    GenerateNormalizedImages = "generateNormalizedImages",
    /** Extracts text from images (for example, the word "STOP" from a traffic stop sign), and embeds it into the content field, but treats PDF files differently in that each page will be rendered as an image and normalized accordingly, instead of extracting embedded images.  Non-PDF file types will be treated the same as if "generateNormalizedImages" was set. */
    GenerateNormalizedImagePerPage = "generateNormalizedImagePerPage"
}
/**
 * Defines values for BlobIndexerImageAction. \
 * {@link KnownBlobIndexerImageAction} can be used interchangeably with BlobIndexerImageAction,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **none**: Ignores embedded images or image files in the data set.  This is the default. \
 * **generateNormalizedImages**: Extracts text from images (for example, the word "STOP" from a traffic stop sign), and embeds it into the content field.  This action requires that "dataToExtract" is set to "contentAndMetadata".  A normalized image refers to additional processing resulting in uniform image output, sized and rotated to promote consistent rendering when you include images in visual search results. This information is generated for each image when you use this option. \
 * **generateNormalizedImagePerPage**: Extracts text from images (for example, the word "STOP" from a traffic stop sign), and embeds it into the content field, but treats PDF files differently in that each page will be rendered as an image and normalized accordingly, instead of extracting embedded images.  Non-PDF file types will be treated the same as if "generateNormalizedImages" was set.
 */
export type BlobIndexerImageAction = string;
/** Known values of {@link BlobIndexerPDFTextRotationAlgorithm} that the service accepts. */
export declare enum KnownBlobIndexerPDFTextRotationAlgorithm {
    /** Leverages normal text extraction.  This is the default. */
    None = "none",
    /** May produce better and more readable text extraction from PDF files that have rotated text within them.  Note that there may be a small performance speed impact when this parameter is used.  This parameter only applies to PDF files, and only to PDFs with embedded text.  If the rotated text appears within an embedded image in the PDF, this parameter does not apply. */
    DetectAngles = "detectAngles"
}
/**
 * Defines values for BlobIndexerPDFTextRotationAlgorithm. \
 * {@link KnownBlobIndexerPDFTextRotationAlgorithm} can be used interchangeably with BlobIndexerPDFTextRotationAlgorithm,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **none**: Leverages normal text extraction.  This is the default. \
 * **detectAngles**: May produce better and more readable text extraction from PDF files that have rotated text within them.  Note that there may be a small performance speed impact when this parameter is used.  This parameter only applies to PDF files, and only to PDFs with embedded text.  If the rotated text appears within an embedded image in the PDF, this parameter does not apply.
 */
export type BlobIndexerPDFTextRotationAlgorithm = string;
/** Known values of {@link IndexerExecutionEnvironment} that the service accepts. */
export declare enum KnownIndexerExecutionEnvironment {
    /** Indicates that the search service can determine where the indexer should execute. This is the default environment when nothing is specified and is the recommended value. */
    Standard = "standard",
    /** Indicates that the indexer should run with the environment provisioned specifically for the search service. This should only be specified as the execution environment if the indexer needs to access resources securely over shared private link resources. */
    Private = "private"
}
/**
 * Defines values for IndexerExecutionEnvironment. \
 * {@link KnownIndexerExecutionEnvironment} can be used interchangeably with IndexerExecutionEnvironment,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **standard**: Indicates that the search service can determine where the indexer should execute. This is the default environment when nothing is specified and is the recommended value. \
 * **private**: Indicates that the indexer should run with the environment provisioned specifically for the search service. This should only be specified as the execution environment if the indexer needs to access resources securely over shared private link resources.
 */
export type IndexerExecutionEnvironment = string;
/** Known values of {@link IndexProjectionMode} that the service accepts. */
export declare enum KnownIndexProjectionMode {
    /** The source document will be skipped from writing into the indexer's target index. */
    SkipIndexingParentDocuments = "skipIndexingParentDocuments",
    /** The source document will be written into the indexer's target index. This is the default pattern. */
    IncludeIndexingParentDocuments = "includeIndexingParentDocuments"
}
/**
 * Defines values for IndexProjectionMode. \
 * {@link KnownIndexProjectionMode} can be used interchangeably with IndexProjectionMode,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **skipIndexingParentDocuments**: The source document will be skipped from writing into the indexer's target index. \
 * **includeIndexingParentDocuments**: The source document will be written into the indexer's target index. This is the default pattern.
 */
export type IndexProjectionMode = string;
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
/**
 * Defines values for SearchFieldDataType. \
 * {@link KnownSearchFieldDataType} can be used interchangeably with SearchFieldDataType,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **Edm.String**: Indicates that a field contains a string. \
 * **Edm.Int32**: Indicates that a field contains a 32-bit signed integer. \
 * **Edm.Int64**: Indicates that a field contains a 64-bit signed integer. \
 * **Edm.Double**: Indicates that a field contains an IEEE double-precision floating point number. \
 * **Edm.Boolean**: Indicates that a field contains a Boolean value (true or false). \
 * **Edm.DateTimeOffset**: Indicates that a field contains a date\/time value, including timezone information. \
 * **Edm.GeographyPoint**: Indicates that a field contains a geo-location in terms of longitude and latitude. \
 * **Edm.ComplexType**: Indicates that a field contains one or more complex objects that in turn have sub-fields of other types. \
 * **Edm.Single**: Indicates that a field contains a single-precision floating point number. This is only valid when used with Collection(Edm.Single). \
 * **Edm.Half**: Indicates that a field contains a half-precision floating point number. This is only valid when used with Collection(Edm.Half). \
 * **Edm.Int16**: Indicates that a field contains a 16-bit signed integer. This is only valid when used with Collection(Edm.Int16). \
 * **Edm.SByte**: Indicates that a field contains a 8-bit signed integer. This is only valid when used with Collection(Edm.SByte). \
 * **Edm.Byte**: Indicates that a field contains a 8-bit unsigned integer. This is only valid when used with Collection(Edm.Byte).
 */
export type SearchFieldDataType = string;
/** Known values of {@link LexicalAnalyzerName} that the service accepts. */
export declare enum KnownLexicalAnalyzerName {
    /** Microsoft analyzer for Arabic. */
    ArMicrosoft = "ar.microsoft",
    /** Lucene analyzer for Arabic. */
    ArLucene = "ar.lucene",
    /** Lucene analyzer for Armenian. */
    HyLucene = "hy.lucene",
    /** Microsoft analyzer for Bangla. */
    BnMicrosoft = "bn.microsoft",
    /** Lucene analyzer for Basque. */
    EuLucene = "eu.lucene",
    /** Microsoft analyzer for Bulgarian. */
    BgMicrosoft = "bg.microsoft",
    /** Lucene analyzer for Bulgarian. */
    BgLucene = "bg.lucene",
    /** Microsoft analyzer for Catalan. */
    CaMicrosoft = "ca.microsoft",
    /** Lucene analyzer for Catalan. */
    CaLucene = "ca.lucene",
    /** Microsoft analyzer for Chinese (Simplified). */
    ZhHansMicrosoft = "zh-Hans.microsoft",
    /** Lucene analyzer for Chinese (Simplified). */
    ZhHansLucene = "zh-Hans.lucene",
    /** Microsoft analyzer for Chinese (Traditional). */
    ZhHantMicrosoft = "zh-Hant.microsoft",
    /** Lucene analyzer for Chinese (Traditional). */
    ZhHantLucene = "zh-Hant.lucene",
    /** Microsoft analyzer for Croatian. */
    HrMicrosoft = "hr.microsoft",
    /** Microsoft analyzer for Czech. */
    CsMicrosoft = "cs.microsoft",
    /** Lucene analyzer for Czech. */
    CsLucene = "cs.lucene",
    /** Microsoft analyzer for Danish. */
    DaMicrosoft = "da.microsoft",
    /** Lucene analyzer for Danish. */
    DaLucene = "da.lucene",
    /** Microsoft analyzer for Dutch. */
    NlMicrosoft = "nl.microsoft",
    /** Lucene analyzer for Dutch. */
    NlLucene = "nl.lucene",
    /** Microsoft analyzer for English. */
    EnMicrosoft = "en.microsoft",
    /** Lucene analyzer for English. */
    EnLucene = "en.lucene",
    /** Microsoft analyzer for Estonian. */
    EtMicrosoft = "et.microsoft",
    /** Microsoft analyzer for Finnish. */
    FiMicrosoft = "fi.microsoft",
    /** Lucene analyzer for Finnish. */
    FiLucene = "fi.lucene",
    /** Microsoft analyzer for French. */
    FrMicrosoft = "fr.microsoft",
    /** Lucene analyzer for French. */
    FrLucene = "fr.lucene",
    /** Lucene analyzer for Galician. */
    GlLucene = "gl.lucene",
    /** Microsoft analyzer for German. */
    DeMicrosoft = "de.microsoft",
    /** Lucene analyzer for German. */
    DeLucene = "de.lucene",
    /** Microsoft analyzer for Greek. */
    ElMicrosoft = "el.microsoft",
    /** Lucene analyzer for Greek. */
    ElLucene = "el.lucene",
    /** Microsoft analyzer for Gujarati. */
    GuMicrosoft = "gu.microsoft",
    /** Microsoft analyzer for Hebrew. */
    HeMicrosoft = "he.microsoft",
    /** Microsoft analyzer for Hindi. */
    HiMicrosoft = "hi.microsoft",
    /** Lucene analyzer for Hindi. */
    HiLucene = "hi.lucene",
    /** Microsoft analyzer for Hungarian. */
    HuMicrosoft = "hu.microsoft",
    /** Lucene analyzer for Hungarian. */
    HuLucene = "hu.lucene",
    /** Microsoft analyzer for Icelandic. */
    IsMicrosoft = "is.microsoft",
    /** Microsoft analyzer for Indonesian (Bahasa). */
    IdMicrosoft = "id.microsoft",
    /** Lucene analyzer for Indonesian. */
    IdLucene = "id.lucene",
    /** Lucene analyzer for Irish. */
    GaLucene = "ga.lucene",
    /** Microsoft analyzer for Italian. */
    ItMicrosoft = "it.microsoft",
    /** Lucene analyzer for Italian. */
    ItLucene = "it.lucene",
    /** Microsoft analyzer for Japanese. */
    JaMicrosoft = "ja.microsoft",
    /** Lucene analyzer for Japanese. */
    JaLucene = "ja.lucene",
    /** Microsoft analyzer for Kannada. */
    KnMicrosoft = "kn.microsoft",
    /** Microsoft analyzer for Korean. */
    KoMicrosoft = "ko.microsoft",
    /** Lucene analyzer for Korean. */
    KoLucene = "ko.lucene",
    /** Microsoft analyzer for Latvian. */
    LvMicrosoft = "lv.microsoft",
    /** Lucene analyzer for Latvian. */
    LvLucene = "lv.lucene",
    /** Microsoft analyzer for Lithuanian. */
    LtMicrosoft = "lt.microsoft",
    /** Microsoft analyzer for Malayalam. */
    MlMicrosoft = "ml.microsoft",
    /** Microsoft analyzer for Malay (Latin). */
    MsMicrosoft = "ms.microsoft",
    /** Microsoft analyzer for Marathi. */
    MrMicrosoft = "mr.microsoft",
    /** Microsoft analyzer for Norwegian (Bokmål). */
    NbMicrosoft = "nb.microsoft",
    /** Lucene analyzer for Norwegian. */
    NoLucene = "no.lucene",
    /** Lucene analyzer for Persian. */
    FaLucene = "fa.lucene",
    /** Microsoft analyzer for Polish. */
    PlMicrosoft = "pl.microsoft",
    /** Lucene analyzer for Polish. */
    PlLucene = "pl.lucene",
    /** Microsoft analyzer for Portuguese (Brazil). */
    PtBrMicrosoft = "pt-BR.microsoft",
    /** Lucene analyzer for Portuguese (Brazil). */
    PtBrLucene = "pt-BR.lucene",
    /** Microsoft analyzer for Portuguese (Portugal). */
    PtPtMicrosoft = "pt-PT.microsoft",
    /** Lucene analyzer for Portuguese (Portugal). */
    PtPtLucene = "pt-PT.lucene",
    /** Microsoft analyzer for Punjabi. */
    PaMicrosoft = "pa.microsoft",
    /** Microsoft analyzer for Romanian. */
    RoMicrosoft = "ro.microsoft",
    /** Lucene analyzer for Romanian. */
    RoLucene = "ro.lucene",
    /** Microsoft analyzer for Russian. */
    RuMicrosoft = "ru.microsoft",
    /** Lucene analyzer for Russian. */
    RuLucene = "ru.lucene",
    /** Microsoft analyzer for Serbian (Cyrillic). */
    SrCyrillicMicrosoft = "sr-cyrillic.microsoft",
    /** Microsoft analyzer for Serbian (Latin). */
    SrLatinMicrosoft = "sr-latin.microsoft",
    /** Microsoft analyzer for Slovak. */
    SkMicrosoft = "sk.microsoft",
    /** Microsoft analyzer for Slovenian. */
    SlMicrosoft = "sl.microsoft",
    /** Microsoft analyzer for Spanish. */
    EsMicrosoft = "es.microsoft",
    /** Lucene analyzer for Spanish. */
    EsLucene = "es.lucene",
    /** Microsoft analyzer for Swedish. */
    SvMicrosoft = "sv.microsoft",
    /** Lucene analyzer for Swedish. */
    SvLucene = "sv.lucene",
    /** Microsoft analyzer for Tamil. */
    TaMicrosoft = "ta.microsoft",
    /** Microsoft analyzer for Telugu. */
    TeMicrosoft = "te.microsoft",
    /** Microsoft analyzer for Thai. */
    ThMicrosoft = "th.microsoft",
    /** Lucene analyzer for Thai. */
    ThLucene = "th.lucene",
    /** Microsoft analyzer for Turkish. */
    TrMicrosoft = "tr.microsoft",
    /** Lucene analyzer for Turkish. */
    TrLucene = "tr.lucene",
    /** Microsoft analyzer for Ukrainian. */
    UkMicrosoft = "uk.microsoft",
    /** Microsoft analyzer for Urdu. */
    UrMicrosoft = "ur.microsoft",
    /** Microsoft analyzer for Vietnamese. */
    ViMicrosoft = "vi.microsoft",
    /** Standard Lucene analyzer. */
    StandardLucene = "standard.lucene",
    /** Standard ASCII Folding Lucene analyzer. See https:\//learn.microsoft.com\/rest\/api\/searchservice\/Custom-analyzers-in-Azure-Search#Analyzers */
    StandardAsciiFoldingLucene = "standardasciifolding.lucene",
    /** Treats the entire content of a field as a single token. This is useful for data like zip codes, ids, and some product names. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/core\/KeywordAnalyzer.html */
    Keyword = "keyword",
    /** Flexibly separates text into terms via a regular expression pattern. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/miscellaneous\/PatternAnalyzer.html */
    Pattern = "pattern",
    /** Divides text at non-letters and converts them to lower case. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/core\/SimpleAnalyzer.html */
    Simple = "simple",
    /** Divides text at non-letters; Applies the lowercase and stopword token filters. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/core\/StopAnalyzer.html */
    Stop = "stop",
    /** An analyzer that uses the whitespace tokenizer. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/core\/WhitespaceAnalyzer.html */
    Whitespace = "whitespace"
}
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
export type LexicalAnalyzerName = string;
/** Known values of {@link LexicalNormalizerName} that the service accepts. */
export declare enum KnownLexicalNormalizerName {
    /** Converts alphabetic, numeric, and symbolic Unicode characters which are not in the first 127 ASCII characters (the "Basic Latin" Unicode block) into their ASCII equivalents, if such equivalents exist. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/miscellaneous\/ASCIIFoldingFilter.html */
    AsciiFolding = "asciifolding",
    /** Removes elisions. For example, "l'avion" (the plane) will be converted to "avion" (plane). See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/util\/ElisionFilter.html */
    Elision = "elision",
    /** Normalizes token text to lowercase. See https:\//lucene.apache.org\/core\/6_6_1\/analyzers-common\/org\/apache\/lucene\/analysis\/core\/LowerCaseFilter.html */
    Lowercase = "lowercase",
    /** Standard normalizer, which consists of lowercase and asciifolding. See http:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/reverse\/ReverseStringFilter.html */
    Standard = "standard",
    /** Normalizes token text to uppercase. See https:\//lucene.apache.org\/core\/6_6_1\/analyzers-common\/org\/apache\/lucene\/analysis\/core\/UpperCaseFilter.html */
    Uppercase = "uppercase"
}
/**
 * Defines values for LexicalNormalizerName. \
 * {@link KnownLexicalNormalizerName} can be used interchangeably with LexicalNormalizerName,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **asciifolding**: Converts alphabetic, numeric, and symbolic Unicode characters which are not in the first 127 ASCII characters (the "Basic Latin" Unicode block) into their ASCII equivalents, if such equivalents exist. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/miscellaneous\/ASCIIFoldingFilter.html \
 * **elision**: Removes elisions. For example, "l'avion" (the plane) will be converted to "avion" (plane). See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/util\/ElisionFilter.html \
 * **lowercase**: Normalizes token text to lowercase. See https:\/\/lucene.apache.org\/core\/6_6_1\/analyzers-common\/org\/apache\/lucene\/analysis\/core\/LowerCaseFilter.html \
 * **standard**: Standard normalizer, which consists of lowercase and asciifolding. See http:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/reverse\/ReverseStringFilter.html \
 * **uppercase**: Normalizes token text to uppercase. See https:\/\/lucene.apache.org\/core\/6_6_1\/analyzers-common\/org\/apache\/lucene\/analysis\/core\/UpperCaseFilter.html
 */
export type LexicalNormalizerName = string;
/** Known values of {@link VectorEncodingFormat} that the service accepts. */
export declare enum KnownVectorEncodingFormat {
    /** Encoding format representing bits packed into a wider data type. */
    PackedBit = "packedBit"
}
/**
 * Defines values for VectorEncodingFormat. \
 * {@link KnownVectorEncodingFormat} can be used interchangeably with VectorEncodingFormat,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **packedBit**: Encoding format representing bits packed into a wider data type.
 */
export type VectorEncodingFormat = string;
/** Known values of {@link RankingOrder} that the service accepts. */
export declare enum KnownRankingOrder {
    /** Sets sort order as BoostedRerankerScore */
    BoostedRerankerScore = "BoostedRerankerScore",
    /** Sets sort order as ReRankerScore */
    RerankerScore = "RerankerScore"
}
/**
 * Defines values for RankingOrder. \
 * {@link KnownRankingOrder} can be used interchangeably with RankingOrder,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **BoostedRerankerScore**: Sets sort order as BoostedRerankerScore \
 * **RerankerScore**: Sets sort order as ReRankerScore
 */
export type RankingOrder = string;
/** Known values of {@link VectorSearchAlgorithmKind} that the service accepts. */
export declare enum KnownVectorSearchAlgorithmKind {
    /** HNSW (Hierarchical Navigable Small World), a type of approximate nearest neighbors algorithm. */
    Hnsw = "hnsw",
    /** Exhaustive KNN algorithm which will perform brute-force search. */
    ExhaustiveKnn = "exhaustiveKnn"
}
/**
 * Defines values for VectorSearchAlgorithmKind. \
 * {@link KnownVectorSearchAlgorithmKind} can be used interchangeably with VectorSearchAlgorithmKind,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **hnsw**: HNSW (Hierarchical Navigable Small World), a type of approximate nearest neighbors algorithm. \
 * **exhaustiveKnn**: Exhaustive KNN algorithm which will perform brute-force search.
 */
export type VectorSearchAlgorithmKind = string;
/** Known values of {@link VectorSearchVectorizerKind} that the service accepts. */
export declare enum KnownVectorSearchVectorizerKind {
    /** Generate embeddings using an Azure OpenAI resource at query time. */
    AzureOpenAI = "azureOpenAI",
    /** Generate embeddings using a custom web endpoint at query time. */
    CustomWebApi = "customWebApi"
}
/**
 * Defines values for VectorSearchVectorizerKind. \
 * {@link KnownVectorSearchVectorizerKind} can be used interchangeably with VectorSearchVectorizerKind,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **azureOpenAI**: Generate embeddings using an Azure OpenAI resource at query time. \
 * **customWebApi**: Generate embeddings using a custom web endpoint at query time.
 */
export type VectorSearchVectorizerKind = string;
/** Known values of {@link VectorSearchCompressionKind} that the service accepts. */
export declare enum KnownVectorSearchCompressionKind {
    /** Scalar Quantization, a type of compression method. In scalar quantization, the original vectors values are compressed to a narrower type by discretizing and representing each component of a vector using a reduced set of quantized values, thereby reducing the overall data size. */
    ScalarQuantization = "scalarQuantization",
    /** Binary Quantization, a type of compression method. In binary quantization, the original vectors values are compressed to the narrower binary type by discretizing and representing each component of a vector using binary values, thereby reducing the overall data size. */
    BinaryQuantization = "binaryQuantization"
}
/**
 * Defines values for VectorSearchCompressionKind. \
 * {@link KnownVectorSearchCompressionKind} can be used interchangeably with VectorSearchCompressionKind,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **scalarQuantization**: Scalar Quantization, a type of compression method. In scalar quantization, the original vectors values are compressed to a narrower type by discretizing and representing each component of a vector using a reduced set of quantized values, thereby reducing the overall data size. \
 * **binaryQuantization**: Binary Quantization, a type of compression method. In binary quantization, the original vectors values are compressed to the narrower binary type by discretizing and representing each component of a vector using binary values, thereby reducing the overall data size.
 */
export type VectorSearchCompressionKind = string;
/** Known values of {@link VectorSearchCompressionRescoreStorageMethod} that the service accepts. */
export declare enum KnownVectorSearchCompressionRescoreStorageMethod {
    /** This option preserves the original full-precision vectors. Choose this option for maximum flexibility and highest quality of compressed search results. This consumes more storage but allows for rescoring and oversampling. */
    PreserveOriginals = "preserveOriginals",
    /** This option discards the original full-precision vectors. Choose this option for maximum storage savings. Since this option does not allow for rescoring and oversampling, it will often cause slight to moderate reductions in quality. */
    DiscardOriginals = "discardOriginals"
}
/**
 * Defines values for VectorSearchCompressionRescoreStorageMethod. \
 * {@link KnownVectorSearchCompressionRescoreStorageMethod} can be used interchangeably with VectorSearchCompressionRescoreStorageMethod,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **preserveOriginals**: This option preserves the original full-precision vectors. Choose this option for maximum flexibility and highest quality of compressed search results. This consumes more storage but allows for rescoring and oversampling. \
 * **discardOriginals**: This option discards the original full-precision vectors. Choose this option for maximum storage savings. Since this option does not allow for rescoring and oversampling, it will often cause slight to moderate reductions in quality.
 */
export type VectorSearchCompressionRescoreStorageMethod = string;
/** Known values of {@link TokenFilterName} that the service accepts. */
export declare enum KnownTokenFilterName {
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
export type TokenFilterName = string;
/** Known values of {@link CharFilterName} that the service accepts. */
export declare enum KnownCharFilterName {
    /** A character filter that attempts to strip out HTML constructs. See https:\//lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/charfilter\/HTMLStripCharFilter.html */
    HtmlStrip = "html_strip"
}
/**
 * Defines values for CharFilterName. \
 * {@link KnownCharFilterName} can be used interchangeably with CharFilterName,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **html_strip**: A character filter that attempts to strip out HTML constructs. See https:\/\/lucene.apache.org\/core\/4_10_3\/analyzers-common\/org\/apache\/lucene\/analysis\/charfilter\/HTMLStripCharFilter.html
 */
export type CharFilterName = string;
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
/**
 * Defines values for VectorSearchAlgorithmMetric. \
 * {@link KnownVectorSearchAlgorithmMetric} can be used interchangeably with VectorSearchAlgorithmMetric,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **cosine**: Measures the angle between vectors to quantify their similarity, disregarding magnitude. The smaller the angle, the closer the similarity. \
 * **euclidean**: Computes the straight-line distance between vectors in a multi-dimensional space. The smaller the distance, the closer the similarity. \
 * **dotProduct**: Calculates the sum of element-wise products to gauge alignment and magnitude similarity. The larger and more positive, the closer the similarity. \
 * **hamming**: Only applicable to bit-packed binary data types. Determines dissimilarity by counting differing positions in binary vectors. The fewer differences, the closer the similarity.
 */
export type VectorSearchAlgorithmMetric = string;
/** Known values of {@link VectorSearchCompressionTarget} that the service accepts. */
export declare enum KnownVectorSearchCompressionTarget {
    /** Int8 */
    Int8 = "int8"
}
/**
 * Defines values for VectorSearchCompressionTarget. \
 * {@link KnownVectorSearchCompressionTarget} can be used interchangeably with VectorSearchCompressionTarget,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **int8**
 */
export type VectorSearchCompressionTarget = string;
/** Known values of {@link AzureOpenAIModelName} that the service accepts. */
export declare enum KnownAzureOpenAIModelName {
    /** TextEmbeddingAda002 */
    TextEmbeddingAda002 = "text-embedding-ada-002",
    /** TextEmbedding3Large */
    TextEmbedding3Large = "text-embedding-3-large",
    /** TextEmbedding3Small */
    TextEmbedding3Small = "text-embedding-3-small"
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
export type AzureOpenAIModelName = string;
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
/**
 * Defines values for KeyPhraseExtractionSkillLanguage. \
 * {@link KnownKeyPhraseExtractionSkillLanguage} can be used interchangeably with KeyPhraseExtractionSkillLanguage,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **da**: Danish \
 * **nl**: Dutch \
 * **en**: English \
 * **fi**: Finnish \
 * **fr**: French \
 * **de**: German \
 * **it**: Italian \
 * **ja**: Japanese \
 * **ko**: Korean \
 * **no**: Norwegian (Bokmaal) \
 * **pl**: Polish \
 * **pt-PT**: Portuguese (Portugal) \
 * **pt-BR**: Portuguese (Brazil) \
 * **ru**: Russian \
 * **es**: Spanish \
 * **sv**: Swedish
 */
export type KeyPhraseExtractionSkillLanguage = string;
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
/**
 * Defines values for OcrSkillLanguage. \
 * {@link KnownOcrSkillLanguage} can be used interchangeably with OcrSkillLanguage,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **af**: Afrikaans \
 * **sq**: Albanian \
 * **anp**: Angika (Devanagiri) \
 * **ar**: Arabic \
 * **ast**: Asturian \
 * **awa**: Awadhi-Hindi (Devanagiri) \
 * **az**: Azerbaijani (Latin) \
 * **bfy**: Bagheli \
 * **eu**: Basque \
 * **be**: Belarusian (Cyrillic and Latin) \
 * **be-cyrl**: Belarusian (Cyrillic) \
 * **be-latn**: Belarusian (Latin) \
 * **bho**: Bhojpuri-Hindi (Devanagiri) \
 * **bi**: Bislama \
 * **brx**: Bodo (Devanagiri) \
 * **bs**: Bosnian Latin \
 * **bra**: Brajbha \
 * **br**: Breton \
 * **bg**: Bulgarian \
 * **bns**: Bundeli \
 * **bua**: Buryat (Cyrillic) \
 * **ca**: Catalan \
 * **ceb**: Cebuano \
 * **rab**: Chamling \
 * **ch**: Chamorro \
 * **hne**: Chhattisgarhi (Devanagiri) \
 * **zh-Hans**: Chinese Simplified \
 * **zh-Hant**: Chinese Traditional \
 * **kw**: Cornish \
 * **co**: Corsican \
 * **crh**: Crimean Tatar (Latin) \
 * **hr**: Croatian \
 * **cs**: Czech \
 * **da**: Danish \
 * **prs**: Dari \
 * **dhi**: Dhimal (Devanagiri) \
 * **doi**: Dogri (Devanagiri) \
 * **nl**: Dutch \
 * **en**: English \
 * **myv**: Erzya (Cyrillic) \
 * **et**: Estonian \
 * **fo**: Faroese \
 * **fj**: Fijian \
 * **fil**: Filipino \
 * **fi**: Finnish \
 * **fr**: French \
 * **fur**: Frulian \
 * **gag**: Gagauz (Latin) \
 * **gl**: Galician \
 * **de**: German \
 * **gil**: Gilbertese \
 * **gon**: Gondi (Devanagiri) \
 * **el**: Greek \
 * **kl**: Greenlandic \
 * **gvr**: Gurung (Devanagiri) \
 * **ht**: Haitian Creole \
 * **hlb**: Halbi (Devanagiri) \
 * **hni**: Hani \
 * **bgc**: Haryanvi \
 * **haw**: Hawaiian \
 * **hi**: Hindi \
 * **mww**: Hmong Daw (Latin) \
 * **hoc**: Ho (Devanagiri) \
 * **hu**: Hungarian \
 * **is**: Icelandic \
 * **smn**: Inari Sami \
 * **id**: Indonesian \
 * **ia**: Interlingua \
 * **iu**: Inuktitut (Latin) \
 * **ga**: Irish \
 * **it**: Italian \
 * **ja**: Japanese \
 * **Jns**: Jaunsari (Devanagiri) \
 * **jv**: Javanese \
 * **kea**: Kabuverdianu \
 * **kac**: Kachin (Latin) \
 * **xnr**: Kangri (Devanagiri) \
 * **krc**: Karachay-Balkar \
 * **kaa-cyrl**: Kara-Kalpak (Cyrillic) \
 * **kaa**: Kara-Kalpak (Latin) \
 * **csb**: Kashubian \
 * **kk-cyrl**: Kazakh (Cyrillic) \
 * **kk-latn**: Kazakh (Latin) \
 * **klr**: Khaling \
 * **kha**: Khasi \
 * **quc**: K'iche' \
 * **ko**: Korean \
 * **kfq**: Korku \
 * **kpy**: Koryak \
 * **kos**: Kosraean \
 * **kum**: Kumyk (Cyrillic) \
 * **ku-arab**: Kurdish (Arabic) \
 * **ku-latn**: Kurdish (Latin) \
 * **kru**: Kurukh (Devanagiri) \
 * **ky**: Kyrgyz (Cyrillic) \
 * **lkt**: Lakota \
 * **la**: Latin \
 * **lt**: Lithuanian \
 * **dsb**: Lower Sorbian \
 * **smj**: Lule Sami \
 * **lb**: Luxembourgish \
 * **bfz**: Mahasu Pahari (Devanagiri) \
 * **ms**: Malay (Latin) \
 * **mt**: Maltese \
 * **kmj**: Malto (Devanagiri) \
 * **gv**: Manx \
 * **mi**: Maori \
 * **mr**: Marathi \
 * **mn**: Mongolian (Cyrillic) \
 * **cnr-cyrl**: Montenegrin (Cyrillic) \
 * **cnr-latn**: Montenegrin (Latin) \
 * **nap**: Neapolitan \
 * **ne**: Nepali \
 * **niu**: Niuean \
 * **nog**: Nogay \
 * **sme**: Northern Sami (Latin) \
 * **nb**: Norwegian \
 * **no**: Norwegian \
 * **oc**: Occitan \
 * **os**: Ossetic \
 * **ps**: Pashto \
 * **fa**: Persian \
 * **pl**: Polish \
 * **pt**: Portuguese \
 * **pa**: Punjabi (Arabic) \
 * **ksh**: Ripuarian \
 * **ro**: Romanian \
 * **rm**: Romansh \
 * **ru**: Russian \
 * **sck**: Sadri (Devanagiri) \
 * **sm**: Samoan (Latin) \
 * **sa**: Sanskrit (Devanagiri) \
 * **sat**: Santali (Devanagiri) \
 * **sco**: Scots \
 * **gd**: Scottish Gaelic \
 * **sr**: Serbian (Latin) \
 * **sr-Cyrl**: Serbian (Cyrillic) \
 * **sr-Latn**: Serbian (Latin) \
 * **xsr**: Sherpa (Devanagiri) \
 * **srx**: Sirmauri (Devanagiri) \
 * **sms**: Skolt Sami \
 * **sk**: Slovak \
 * **sl**: Slovenian \
 * **so**: Somali (Arabic) \
 * **sma**: Southern Sami \
 * **es**: Spanish \
 * **sw**: Swahili (Latin) \
 * **sv**: Swedish \
 * **tg**: Tajik (Cyrillic) \
 * **tt**: Tatar (Latin) \
 * **tet**: Tetum \
 * **thf**: Thangmi \
 * **to**: Tongan \
 * **tr**: Turkish \
 * **tk**: Turkmen (Latin) \
 * **tyv**: Tuvan \
 * **hsb**: Upper Sorbian \
 * **ur**: Urdu \
 * **ug**: Uyghur (Arabic) \
 * **uz-arab**: Uzbek (Arabic) \
 * **uz-cyrl**: Uzbek (Cyrillic) \
 * **uz**: Uzbek (Latin) \
 * **vo**: Volapük \
 * **wae**: Walser \
 * **cy**: Welsh \
 * **fy**: Western Frisian \
 * **yua**: Yucatec Maya \
 * **za**: Zhuang \
 * **zu**: Zulu \
 * **unk**: Unknown (All)
 */
export type OcrSkillLanguage = string;
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
export type OcrLineEnding = string;
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
/**
 * Defines values for ImageAnalysisSkillLanguage. \
 * {@link KnownImageAnalysisSkillLanguage} can be used interchangeably with ImageAnalysisSkillLanguage,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **ar**: Arabic \
 * **az**: Azerbaijani \
 * **bg**: Bulgarian \
 * **bs**: Bosnian Latin \
 * **ca**: Catalan \
 * **cs**: Czech \
 * **cy**: Welsh \
 * **da**: Danish \
 * **de**: German \
 * **el**: Greek \
 * **en**: English \
 * **es**: Spanish \
 * **et**: Estonian \
 * **eu**: Basque \
 * **fi**: Finnish \
 * **fr**: French \
 * **ga**: Irish \
 * **gl**: Galician \
 * **he**: Hebrew \
 * **hi**: Hindi \
 * **hr**: Croatian \
 * **hu**: Hungarian \
 * **id**: Indonesian \
 * **it**: Italian \
 * **ja**: Japanese \
 * **kk**: Kazakh \
 * **ko**: Korean \
 * **lt**: Lithuanian \
 * **lv**: Latvian \
 * **mk**: Macedonian \
 * **ms**: Malay Malaysia \
 * **nb**: Norwegian (Bokmal) \
 * **nl**: Dutch \
 * **pl**: Polish \
 * **prs**: Dari \
 * **pt-BR**: Portuguese-Brazil \
 * **pt**: Portuguese-Portugal \
 * **pt-PT**: Portuguese-Portugal \
 * **ro**: Romanian \
 * **ru**: Russian \
 * **sk**: Slovak \
 * **sl**: Slovenian \
 * **sr-Cyrl**: Serbian - Cyrillic RS \
 * **sr-Latn**: Serbian - Latin RS \
 * **sv**: Swedish \
 * **th**: Thai \
 * **tr**: Turkish \
 * **uk**: Ukrainian \
 * **vi**: Vietnamese \
 * **zh**: Chinese Simplified \
 * **zh-Hans**: Chinese Simplified \
 * **zh-Hant**: Chinese Traditional
 */
export type ImageAnalysisSkillLanguage = string;
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
/**
 * Defines values for VisualFeature. \
 * {@link KnownVisualFeature} can be used interchangeably with VisualFeature,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **adult**: Visual features recognized as adult persons. \
 * **brands**: Visual features recognized as commercial brands. \
 * **categories**: Categories. \
 * **description**: Description. \
 * **faces**: Visual features recognized as people faces. \
 * **objects**: Visual features recognized as objects. \
 * **tags**: Tags.
 */
export type VisualFeature = string;
/** Known values of {@link ImageDetail} that the service accepts. */
export declare enum KnownImageDetail {
    /** Details recognized as celebrities. */
    Celebrities = "celebrities",
    /** Details recognized as landmarks. */
    Landmarks = "landmarks"
}
/**
 * Defines values for ImageDetail. \
 * {@link KnownImageDetail} can be used interchangeably with ImageDetail,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **celebrities**: Details recognized as celebrities. \
 * **landmarks**: Details recognized as landmarks.
 */
export type ImageDetail = string;
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
/**
 * Defines values for EntityCategory. \
 * {@link KnownEntityCategory} can be used interchangeably with EntityCategory,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **location**: Entities describing a physical location. \
 * **organization**: Entities describing an organization. \
 * **person**: Entities describing a person. \
 * **quantity**: Entities describing a quantity. \
 * **datetime**: Entities describing a date and time. \
 * **url**: Entities describing a URL. \
 * **email**: Entities describing an email address.
 */
export type EntityCategory = string;
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
/**
 * Defines values for EntityRecognitionSkillLanguage. \
 * {@link KnownEntityRecognitionSkillLanguage} can be used interchangeably with EntityRecognitionSkillLanguage,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **ar**: Arabic \
 * **cs**: Czech \
 * **zh-Hans**: Chinese-Simplified \
 * **zh-Hant**: Chinese-Traditional \
 * **da**: Danish \
 * **nl**: Dutch \
 * **en**: English \
 * **fi**: Finnish \
 * **fr**: French \
 * **de**: German \
 * **el**: Greek \
 * **hu**: Hungarian \
 * **it**: Italian \
 * **ja**: Japanese \
 * **ko**: Korean \
 * **no**: Norwegian (Bokmaal) \
 * **pl**: Polish \
 * **pt-PT**: Portuguese (Portugal) \
 * **pt-BR**: Portuguese (Brazil) \
 * **ru**: Russian \
 * **es**: Spanish \
 * **sv**: Swedish \
 * **tr**: Turkish
 */
export type EntityRecognitionSkillLanguage = string;
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
/**
 * Defines values for SentimentSkillLanguage. \
 * {@link KnownSentimentSkillLanguage} can be used interchangeably with SentimentSkillLanguage,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **da**: Danish \
 * **nl**: Dutch \
 * **en**: English \
 * **fi**: Finnish \
 * **fr**: French \
 * **de**: German \
 * **el**: Greek \
 * **it**: Italian \
 * **no**: Norwegian (Bokmaal) \
 * **pl**: Polish \
 * **pt-PT**: Portuguese (Portugal) \
 * **ru**: Russian \
 * **es**: Spanish \
 * **sv**: Swedish \
 * **tr**: Turkish
 */
export type SentimentSkillLanguage = string;
/** Known values of {@link PIIDetectionSkillMaskingMode} that the service accepts. */
export declare enum KnownPIIDetectionSkillMaskingMode {
    /** No masking occurs and the maskedText output will not be returned. */
    None = "none",
    /** Replaces the detected entities with the character given in the maskingCharacter parameter. The character will be repeated to the length of the detected entity so that the offsets will correctly correspond to both the input text as well as the output maskedText. */
    Replace = "replace"
}
/**
 * Defines values for PIIDetectionSkillMaskingMode. \
 * {@link KnownPIIDetectionSkillMaskingMode} can be used interchangeably with PIIDetectionSkillMaskingMode,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **none**: No masking occurs and the maskedText output will not be returned. \
 * **replace**: Replaces the detected entities with the character given in the maskingCharacter parameter. The character will be repeated to the length of the detected entity so that the offsets will correctly correspond to both the input text as well as the output maskedText.
 */
export type PIIDetectionSkillMaskingMode = string;
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
/**
 * Defines values for SplitSkillLanguage. \
 * {@link KnownSplitSkillLanguage} can be used interchangeably with SplitSkillLanguage,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **am**: Amharic \
 * **bs**: Bosnian \
 * **cs**: Czech \
 * **da**: Danish \
 * **de**: German \
 * **en**: English \
 * **es**: Spanish \
 * **et**: Estonian \
 * **fi**: Finnish \
 * **fr**: French \
 * **he**: Hebrew \
 * **hi**: Hindi \
 * **hr**: Croatian \
 * **hu**: Hungarian \
 * **id**: Indonesian \
 * **is**: Icelandic \
 * **it**: Italian \
 * **ja**: Japanese \
 * **ko**: Korean \
 * **lv**: Latvian \
 * **nb**: Norwegian \
 * **nl**: Dutch \
 * **pl**: Polish \
 * **pt**: Portuguese (Portugal) \
 * **pt-br**: Portuguese (Brazil) \
 * **ru**: Russian \
 * **sk**: Slovak \
 * **sl**: Slovenian \
 * **sr**: Serbian \
 * **sv**: Swedish \
 * **tr**: Turkish \
 * **ur**: Urdu \
 * **zh**: Chinese (Simplified)
 */
export type SplitSkillLanguage = string;
/** Known values of {@link TextSplitMode} that the service accepts. */
export declare enum KnownTextSplitMode {
    /** Split the text into individual pages. */
    Pages = "pages",
    /** Split the text into individual sentences. */
    Sentences = "sentences"
}
/**
 * Defines values for TextSplitMode. \
 * {@link KnownTextSplitMode} can be used interchangeably with TextSplitMode,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **pages**: Split the text into individual pages. \
 * **sentences**: Split the text into individual sentences.
 */
export type TextSplitMode = string;
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
/**
 * Defines values for CustomEntityLookupSkillLanguage. \
 * {@link KnownCustomEntityLookupSkillLanguage} can be used interchangeably with CustomEntityLookupSkillLanguage,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **da**: Danish \
 * **de**: German \
 * **en**: English \
 * **es**: Spanish \
 * **fi**: Finnish \
 * **fr**: French \
 * **it**: Italian \
 * **ko**: Korean \
 * **pt**: Portuguese
 */
export type CustomEntityLookupSkillLanguage = string;
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
/**
 * Defines values for TextTranslationSkillLanguage. \
 * {@link KnownTextTranslationSkillLanguage} can be used interchangeably with TextTranslationSkillLanguage,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **af**: Afrikaans \
 * **ar**: Arabic \
 * **bn**: Bangla \
 * **bs**: Bosnian (Latin) \
 * **bg**: Bulgarian \
 * **yue**: Cantonese (Traditional) \
 * **ca**: Catalan \
 * **zh-Hans**: Chinese Simplified \
 * **zh-Hant**: Chinese Traditional \
 * **hr**: Croatian \
 * **cs**: Czech \
 * **da**: Danish \
 * **nl**: Dutch \
 * **en**: English \
 * **et**: Estonian \
 * **fj**: Fijian \
 * **fil**: Filipino \
 * **fi**: Finnish \
 * **fr**: French \
 * **de**: German \
 * **el**: Greek \
 * **ht**: Haitian Creole \
 * **he**: Hebrew \
 * **hi**: Hindi \
 * **mww**: Hmong Daw \
 * **hu**: Hungarian \
 * **is**: Icelandic \
 * **id**: Indonesian \
 * **it**: Italian \
 * **ja**: Japanese \
 * **sw**: Kiswahili \
 * **tlh**: Klingon \
 * **tlh-Latn**: Klingon (Latin script) \
 * **tlh-Piqd**: Klingon (Klingon script) \
 * **ko**: Korean \
 * **lv**: Latvian \
 * **lt**: Lithuanian \
 * **mg**: Malagasy \
 * **ms**: Malay \
 * **mt**: Maltese \
 * **nb**: Norwegian \
 * **fa**: Persian \
 * **pl**: Polish \
 * **pt**: Portuguese \
 * **pt-br**: Portuguese (Brazil) \
 * **pt-PT**: Portuguese (Portugal) \
 * **otq**: Queretaro Otomi \
 * **ro**: Romanian \
 * **ru**: Russian \
 * **sm**: Samoan \
 * **sr-Cyrl**: Serbian (Cyrillic) \
 * **sr-Latn**: Serbian (Latin) \
 * **sk**: Slovak \
 * **sl**: Slovenian \
 * **es**: Spanish \
 * **sv**: Swedish \
 * **ty**: Tahitian \
 * **ta**: Tamil \
 * **te**: Telugu \
 * **th**: Thai \
 * **to**: Tongan \
 * **tr**: Turkish \
 * **uk**: Ukrainian \
 * **ur**: Urdu \
 * **vi**: Vietnamese \
 * **cy**: Welsh \
 * **yua**: Yucatec Maya \
 * **ga**: Irish \
 * **kn**: Kannada \
 * **mi**: Maori \
 * **ml**: Malayalam \
 * **pa**: Punjabi
 */
export type TextTranslationSkillLanguage = string;
/** Known values of {@link DocumentIntelligenceLayoutSkillOutputFormat} that the service accepts. */
export declare enum KnownDocumentIntelligenceLayoutSkillOutputFormat {
    /** Specify the format of the output as text. */
    Text = "text",
    /** Specify the format of the output as markdown. */
    Markdown = "markdown"
}
/**
 * Defines values for DocumentIntelligenceLayoutSkillOutputFormat. \
 * {@link KnownDocumentIntelligenceLayoutSkillOutputFormat} can be used interchangeably with DocumentIntelligenceLayoutSkillOutputFormat,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **text**: Specify the format of the output as text. \
 * **markdown**: Specify the format of the output as markdown.
 */
export type DocumentIntelligenceLayoutSkillOutputFormat = string;
/** Known values of {@link DocumentIntelligenceLayoutSkillOutputMode} that the service accepts. */
export declare enum KnownDocumentIntelligenceLayoutSkillOutputMode {
    /** Specify that the output should be parsed as 'oneToMany'. */
    OneToMany = "oneToMany"
}
/**
 * Defines values for DocumentIntelligenceLayoutSkillOutputMode. \
 * {@link KnownDocumentIntelligenceLayoutSkillOutputMode} can be used interchangeably with DocumentIntelligenceLayoutSkillOutputMode,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **oneToMany**: Specify that the output should be parsed as 'oneToMany'.
 */
export type DocumentIntelligenceLayoutSkillOutputMode = string;
/** Known values of {@link DocumentIntelligenceLayoutSkillMarkdownHeaderDepth} that the service accepts. */
export declare enum KnownDocumentIntelligenceLayoutSkillMarkdownHeaderDepth {
    /** Header level 1. */
    H1 = "h1",
    /** Header level 2. */
    H2 = "h2",
    /** Header level 3. */
    H3 = "h3",
    /** Header level 4. */
    H4 = "h4",
    /** Header level 5. */
    H5 = "h5",
    /** Header level 6. */
    H6 = "h6"
}
/**
 * Defines values for DocumentIntelligenceLayoutSkillMarkdownHeaderDepth. \
 * {@link KnownDocumentIntelligenceLayoutSkillMarkdownHeaderDepth} can be used interchangeably with DocumentIntelligenceLayoutSkillMarkdownHeaderDepth,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **h1**: Header level 1. \
 * **h2**: Header level 2. \
 * **h3**: Header level 3. \
 * **h4**: Header level 4. \
 * **h5**: Header level 5. \
 * **h6**: Header level 6.
 */
export type DocumentIntelligenceLayoutSkillMarkdownHeaderDepth = string;
/** Known values of {@link DocumentIntelligenceLayoutSkillExtractionOptions} that the service accepts. */
export declare enum KnownDocumentIntelligenceLayoutSkillExtractionOptions {
    /** Specify that image content should be extracted from the document. */
    Images = "images",
    /** Specify that location metadata should be extracted from the document. */
    LocationMetadata = "locationMetadata"
}
/**
 * Defines values for DocumentIntelligenceLayoutSkillExtractionOptions. \
 * {@link KnownDocumentIntelligenceLayoutSkillExtractionOptions} can be used interchangeably with DocumentIntelligenceLayoutSkillExtractionOptions,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **images**: Specify that image content should be extracted from the document. \
 * **locationMetadata**: Specify that location metadata should be extracted from the document.
 */
export type DocumentIntelligenceLayoutSkillExtractionOptions = string;
/** Known values of {@link DocumentIntelligenceLayoutSkillChunkingUnit} that the service accepts. */
export declare enum KnownDocumentIntelligenceLayoutSkillChunkingUnit {
    /** Specifies chunk by characters. */
    Characters = "characters"
}
/**
 * Defines values for DocumentIntelligenceLayoutSkillChunkingUnit. \
 * {@link KnownDocumentIntelligenceLayoutSkillChunkingUnit} can be used interchangeably with DocumentIntelligenceLayoutSkillChunkingUnit,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **characters**: Specifies chunk by characters.
 */
export type DocumentIntelligenceLayoutSkillChunkingUnit = string;
/** Known values of {@link LexicalTokenizerName} that the service accepts. */
export declare enum KnownLexicalTokenizerName {
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
export type LexicalTokenizerName = string;
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
 * Defines values for RegexFlags. \
 * {@link KnownRegexFlags} can be used interchangeably with RegexFlags,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **CANON_EQ**: Enables canonical equivalence. \
 * **CASE_INSENSITIVE**: Enables case-insensitive matching. \
 * **COMMENTS**: Permits whitespace and comments in the pattern. \
 * **DOTALL**: Enables dotall mode. \
 * **LITERAL**: Enables literal parsing of the pattern. \
 * **MULTILINE**: Enables multiline mode. \
 * **UNICODE_CASE**: Enables Unicode-aware case folding. \
 * **UNIX_LINES**: Enables Unix lines mode.
 */
export type RegexFlags = string;
/** Defines values for IndexerStatus. */
export type IndexerStatus = "unknown" | "error" | "running";
/** Defines values for IndexerExecutionStatus. */
export type IndexerExecutionStatus = "transientFailure" | "success" | "inProgress" | "reset";
/** Defines values for ScoringFunctionInterpolation. */
export type ScoringFunctionInterpolation = "linear" | "constant" | "quadratic" | "logarithmic";
/** Defines values for ScoringFunctionAggregation. */
export type ScoringFunctionAggregation = "sum" | "average" | "minimum" | "maximum" | "firstMatching";
/** Defines values for TokenCharacterKind. */
export type TokenCharacterKind = "letter" | "digit" | "whitespace" | "punctuation" | "symbol";
/** Defines values for MicrosoftTokenizerLanguage. */
export type MicrosoftTokenizerLanguage = "bangla" | "bulgarian" | "catalan" | "chineseSimplified" | "chineseTraditional" | "croatian" | "czech" | "danish" | "dutch" | "english" | "french" | "german" | "greek" | "gujarati" | "hindi" | "icelandic" | "indonesian" | "italian" | "japanese" | "kannada" | "korean" | "malay" | "malayalam" | "marathi" | "norwegianBokmaal" | "polish" | "portuguese" | "portugueseBrazilian" | "punjabi" | "romanian" | "russian" | "serbianCyrillic" | "serbianLatin" | "slovenian" | "spanish" | "swedish" | "tamil" | "telugu" | "thai" | "ukrainian" | "urdu" | "vietnamese";
/** Defines values for MicrosoftStemmingTokenizerLanguage. */
export type MicrosoftStemmingTokenizerLanguage = "arabic" | "bangla" | "bulgarian" | "catalan" | "croatian" | "czech" | "danish" | "dutch" | "english" | "estonian" | "finnish" | "french" | "german" | "greek" | "gujarati" | "hebrew" | "hindi" | "hungarian" | "icelandic" | "indonesian" | "italian" | "kannada" | "latvian" | "lithuanian" | "malay" | "malayalam" | "marathi" | "norwegianBokmaal" | "polish" | "portuguese" | "portugueseBrazilian" | "punjabi" | "romanian" | "russian" | "serbianCyrillic" | "serbianLatin" | "slovak" | "slovenian" | "spanish" | "swedish" | "tamil" | "telugu" | "turkish" | "ukrainian" | "urdu";
/** Defines values for CjkBigramTokenFilterScripts. */
export type CjkBigramTokenFilterScripts = "han" | "hiragana" | "katakana" | "hangul";
/** Defines values for EdgeNGramTokenFilterSide. */
export type EdgeNGramTokenFilterSide = "front" | "back";
/** Defines values for PhoneticEncoder. */
export type PhoneticEncoder = "metaphone" | "doubleMetaphone" | "soundex" | "refinedSoundex" | "caverphone1" | "caverphone2" | "cologne" | "nysiis" | "koelnerPhonetik" | "haasePhonetik" | "beiderMorse";
/** Defines values for SnowballTokenFilterLanguage. */
export type SnowballTokenFilterLanguage = "armenian" | "basque" | "catalan" | "danish" | "dutch" | "english" | "finnish" | "french" | "german" | "german2" | "hungarian" | "italian" | "kp" | "lovins" | "norwegian" | "porter" | "portuguese" | "romanian" | "russian" | "spanish" | "swedish" | "turkish";
/** Defines values for StemmerTokenFilterLanguage. */
export type StemmerTokenFilterLanguage = "arabic" | "armenian" | "basque" | "brazilian" | "bulgarian" | "catalan" | "czech" | "danish" | "dutch" | "dutchKp" | "english" | "lightEnglish" | "minimalEnglish" | "possessiveEnglish" | "porter2" | "lovins" | "finnish" | "lightFinnish" | "french" | "lightFrench" | "minimalFrench" | "galician" | "minimalGalician" | "german" | "german2" | "lightGerman" | "minimalGerman" | "greek" | "hindi" | "hungarian" | "lightHungarian" | "indonesian" | "irish" | "italian" | "lightItalian" | "sorani" | "latvian" | "norwegian" | "lightNorwegian" | "minimalNorwegian" | "lightNynorsk" | "minimalNynorsk" | "portuguese" | "lightPortuguese" | "minimalPortuguese" | "portugueseRslp" | "romanian" | "russian" | "lightRussian" | "spanish" | "lightSpanish" | "swedish" | "lightSwedish" | "turkish";
/** Defines values for StopwordsList. */
export type StopwordsList = "arabic" | "armenian" | "basque" | "brazilian" | "bulgarian" | "catalan" | "czech" | "danish" | "dutch" | "english" | "finnish" | "french" | "galician" | "german" | "greek" | "hindi" | "hungarian" | "indonesian" | "irish" | "italian" | "latvian" | "norwegian" | "persian" | "portuguese" | "romanian" | "russian" | "sorani" | "spanish" | "swedish" | "thai" | "turkish";
/** Optional parameters. */
export interface DataSourcesCreateOrUpdateOptionalParams extends coreClient.OperationOptions {
    /** Defines the If-Match condition. The operation will be performed only if the ETag on the server matches this value. */
    ifMatch?: string;
    /** Defines the If-None-Match condition. The operation will be performed only if the ETag on the server does not match this value. */
    ifNoneMatch?: string;
}
/** Contains response data for the createOrUpdate operation. */
export type DataSourcesCreateOrUpdateResponse = SearchIndexerDataSource;
/** Optional parameters. */
export interface DataSourcesDeleteOptionalParams extends coreClient.OperationOptions {
    /** Defines the If-Match condition. The operation will be performed only if the ETag on the server matches this value. */
    ifMatch?: string;
    /** Defines the If-None-Match condition. The operation will be performed only if the ETag on the server does not match this value. */
    ifNoneMatch?: string;
}
/** Optional parameters. */
export interface DataSourcesGetOptionalParams extends coreClient.OperationOptions {
}
/** Contains response data for the get operation. */
export type DataSourcesGetResponse = SearchIndexerDataSource;
/** Optional parameters. */
export interface DataSourcesListOptionalParams extends coreClient.OperationOptions {
    /** Selects which top-level properties of the data sources to retrieve. Specified as a comma-separated list of JSON property names, or '*' for all properties. The default is all properties. */
    select?: string;
}
/** Contains response data for the list operation. */
export type DataSourcesListResponse = ListDataSourcesResult;
/** Optional parameters. */
export interface DataSourcesCreateOptionalParams extends coreClient.OperationOptions {
}
/** Contains response data for the create operation. */
export type DataSourcesCreateResponse = SearchIndexerDataSource;
/** Optional parameters. */
export interface IndexersResetOptionalParams extends coreClient.OperationOptions {
}
/** Optional parameters. */
export interface IndexersRunOptionalParams extends coreClient.OperationOptions {
}
/** Optional parameters. */
export interface IndexersCreateOrUpdateOptionalParams extends coreClient.OperationOptions {
    /** Defines the If-Match condition. The operation will be performed only if the ETag on the server matches this value. */
    ifMatch?: string;
    /** Defines the If-None-Match condition. The operation will be performed only if the ETag on the server does not match this value. */
    ifNoneMatch?: string;
}
/** Contains response data for the createOrUpdate operation. */
export type IndexersCreateOrUpdateResponse = SearchIndexer;
/** Optional parameters. */
export interface IndexersDeleteOptionalParams extends coreClient.OperationOptions {
    /** Defines the If-Match condition. The operation will be performed only if the ETag on the server matches this value. */
    ifMatch?: string;
    /** Defines the If-None-Match condition. The operation will be performed only if the ETag on the server does not match this value. */
    ifNoneMatch?: string;
}
/** Optional parameters. */
export interface IndexersGetOptionalParams extends coreClient.OperationOptions {
}
/** Contains response data for the get operation. */
export type IndexersGetResponse = SearchIndexer;
/** Optional parameters. */
export interface IndexersListOptionalParams extends coreClient.OperationOptions {
    /** Selects which top-level properties of the indexers to retrieve. Specified as a comma-separated list of JSON property names, or '*' for all properties. The default is all properties. */
    select?: string;
}
/** Contains response data for the list operation. */
export type IndexersListResponse = ListIndexersResult;
/** Optional parameters. */
export interface IndexersCreateOptionalParams extends coreClient.OperationOptions {
}
/** Contains response data for the create operation. */
export type IndexersCreateResponse = SearchIndexer;
/** Optional parameters. */
export interface IndexersGetStatusOptionalParams extends coreClient.OperationOptions {
}
/** Contains response data for the getStatus operation. */
export type IndexersGetStatusResponse = SearchIndexerStatus;
/** Optional parameters. */
export interface SkillsetsCreateOrUpdateOptionalParams extends coreClient.OperationOptions {
    /** Defines the If-Match condition. The operation will be performed only if the ETag on the server matches this value. */
    ifMatch?: string;
    /** Defines the If-None-Match condition. The operation will be performed only if the ETag on the server does not match this value. */
    ifNoneMatch?: string;
}
/** Contains response data for the createOrUpdate operation. */
export type SkillsetsCreateOrUpdateResponse = SearchIndexerSkillset;
/** Optional parameters. */
export interface SkillsetsDeleteOptionalParams extends coreClient.OperationOptions {
    /** Defines the If-Match condition. The operation will be performed only if the ETag on the server matches this value. */
    ifMatch?: string;
    /** Defines the If-None-Match condition. The operation will be performed only if the ETag on the server does not match this value. */
    ifNoneMatch?: string;
}
/** Optional parameters. */
export interface SkillsetsGetOptionalParams extends coreClient.OperationOptions {
}
/** Contains response data for the get operation. */
export type SkillsetsGetResponse = SearchIndexerSkillset;
/** Optional parameters. */
export interface SkillsetsListOptionalParams extends coreClient.OperationOptions {
    /** Selects which top-level properties of the skillsets to retrieve. Specified as a comma-separated list of JSON property names, or '*' for all properties. The default is all properties. */
    select?: string;
}
/** Contains response data for the list operation. */
export type SkillsetsListResponse = ListSkillsetsResult;
/** Optional parameters. */
export interface SkillsetsCreateOptionalParams extends coreClient.OperationOptions {
}
/** Contains response data for the create operation. */
export type SkillsetsCreateResponse = SearchIndexerSkillset;
/** Optional parameters. */
export interface SynonymMapsCreateOrUpdateOptionalParams extends coreClient.OperationOptions {
    /** Defines the If-Match condition. The operation will be performed only if the ETag on the server matches this value. */
    ifMatch?: string;
    /** Defines the If-None-Match condition. The operation will be performed only if the ETag on the server does not match this value. */
    ifNoneMatch?: string;
}
/** Contains response data for the createOrUpdate operation. */
export type SynonymMapsCreateOrUpdateResponse = SynonymMap;
/** Optional parameters. */
export interface SynonymMapsDeleteOptionalParams extends coreClient.OperationOptions {
    /** Defines the If-Match condition. The operation will be performed only if the ETag on the server matches this value. */
    ifMatch?: string;
    /** Defines the If-None-Match condition. The operation will be performed only if the ETag on the server does not match this value. */
    ifNoneMatch?: string;
}
/** Optional parameters. */
export interface SynonymMapsGetOptionalParams extends coreClient.OperationOptions {
}
/** Contains response data for the get operation. */
export type SynonymMapsGetResponse = SynonymMap;
/** Optional parameters. */
export interface SynonymMapsListOptionalParams extends coreClient.OperationOptions {
    /** Selects which top-level properties of the synonym maps to retrieve. Specified as a comma-separated list of JSON property names, or '*' for all properties. The default is all properties. */
    select?: string;
}
/** Contains response data for the list operation. */
export type SynonymMapsListResponse = ListSynonymMapsResult;
/** Optional parameters. */
export interface SynonymMapsCreateOptionalParams extends coreClient.OperationOptions {
}
/** Contains response data for the create operation. */
export type SynonymMapsCreateResponse = SynonymMap;
/** Optional parameters. */
export interface IndexesCreateOptionalParams extends coreClient.OperationOptions {
}
/** Contains response data for the create operation. */
export type IndexesCreateResponse = SearchIndex;
/** Optional parameters. */
export interface IndexesListOptionalParams extends coreClient.OperationOptions {
    /** Selects which top-level properties of the index definitions to retrieve. Specified as a comma-separated list of JSON property names, or '*' for all properties. The default is all properties. */
    select?: string;
}
/** Contains response data for the list operation. */
export type IndexesListResponse = ListIndexesResult;
/** Optional parameters. */
export interface IndexesCreateOrUpdateOptionalParams extends coreClient.OperationOptions {
    /** Defines the If-Match condition. The operation will be performed only if the ETag on the server matches this value. */
    ifMatch?: string;
    /** Defines the If-None-Match condition. The operation will be performed only if the ETag on the server does not match this value. */
    ifNoneMatch?: string;
    /** Allows new analyzers, tokenizers, token filters, or char filters to be added to an index by taking the index offline for at least a few seconds. This temporarily causes indexing and query requests to fail. Performance and write availability of the index can be impaired for several minutes after the index is updated, or longer for very large indexes. */
    allowIndexDowntime?: boolean;
}
/** Contains response data for the createOrUpdate operation. */
export type IndexesCreateOrUpdateResponse = SearchIndex;
/** Optional parameters. */
export interface IndexesDeleteOptionalParams extends coreClient.OperationOptions {
    /** Defines the If-Match condition. The operation will be performed only if the ETag on the server matches this value. */
    ifMatch?: string;
    /** Defines the If-None-Match condition. The operation will be performed only if the ETag on the server does not match this value. */
    ifNoneMatch?: string;
}
/** Optional parameters. */
export interface IndexesGetOptionalParams extends coreClient.OperationOptions {
}
/** Contains response data for the get operation. */
export type IndexesGetResponse = SearchIndex;
/** Optional parameters. */
export interface IndexesGetStatisticsOptionalParams extends coreClient.OperationOptions {
}
/** Contains response data for the getStatistics operation. */
export type IndexesGetStatisticsResponse = GetIndexStatisticsResult;
/** Optional parameters. */
export interface IndexesAnalyzeOptionalParams extends coreClient.OperationOptions {
}
/** Contains response data for the analyze operation. */
export type IndexesAnalyzeResponse = AnalyzeResult;
/** Optional parameters. */
export interface GetServiceStatisticsOptionalParams extends coreClient.OperationOptions {
}
/** Contains response data for the getServiceStatistics operation. */
export type GetServiceStatisticsResponse = ServiceStatistics;
/** Optional parameters. */
export interface SearchServiceClientOptionalParams extends coreHttpCompat.ExtendedServiceClientOptions {
    /** Overrides client endpoint. */
    endpoint?: string;
}
//# sourceMappingURL=index.d.ts.map