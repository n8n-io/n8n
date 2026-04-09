import { KeyCredential, TokenCredential } from "@azure/core-auth";
import { ExtendedCommonClientOptions } from "@azure/core-http-compat";
import { AutocompleteResult, IndexDocumentsResult } from "./generated/data/models/index.js";
import { IndexDocumentsBatch } from "./indexDocumentsBatch.js";
import { AutocompleteOptions, CountDocumentsOptions, DeleteDocumentsOptions, GetDocumentOptions, IndexDocumentsOptions, MergeDocumentsOptions, MergeOrUploadDocumentsOptions, NarrowedModel, SearchDocumentsResult, SearchOptions, SelectFields, SuggestDocumentsResult, SuggestOptions, UploadDocumentsOptions } from "./indexModels.js";
import { IndexDocumentsClient } from "./searchIndexingBufferedSender.js";
/**
 * Client options used to configure Cognitive Search API requests.
 */
export interface SearchClientOptions extends ExtendedCommonClientOptions {
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
//# sourceMappingURL=searchClient.d.ts.map