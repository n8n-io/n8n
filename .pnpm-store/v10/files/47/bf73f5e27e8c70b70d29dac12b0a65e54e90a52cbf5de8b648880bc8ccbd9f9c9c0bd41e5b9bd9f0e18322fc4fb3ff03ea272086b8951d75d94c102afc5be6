// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/// <reference lib="esnext.asynciterable" />
import { isTokenCredential } from "@azure/core-auth";
import { bearerTokenAuthenticationPolicy } from "@azure/core-rest-pipeline";
import { decode, encode } from "./base64.js";
import { SearchClient as GeneratedClient } from "./generated/data/searchClient.js";
import { IndexDocumentsBatch } from "./indexDocumentsBatch.js";
import { logger } from "./logger.js";
import { createOdataMetadataPolicy } from "./odataMetadataPolicy.js";
import { createSearchApiKeyCredentialPolicy } from "./searchApiKeyCredentialPolicy.js";
import { KnownSearchAudience } from "./searchAudience.js";
import { deserialize, serialize } from "./serialization.js";
import * as utils from "./serviceUtils.js";
import { createSpan } from "./tracing.js";
/**
 * Class used to perform operations against a search index,
 * including querying documents in the index as well as
 * adding, updating, and removing them.
 */
export class SearchClient {
    /// Maintenance note: when updating supported API versions,
    /// the ContinuationToken logic will need to be updated below.
    /**
     *  The service version to use when communicating with the service.
     */
    serviceVersion = utils.defaultServiceVersion;
    /**
     * The API version to use when communicating with the service.
     * @deprecated use {@Link serviceVersion} instead
     */
    apiVersion = utils.defaultServiceVersion;
    /**
     * The endpoint of the search service
     */
    endpoint;
    /**
     * The name of the index
     */
    indexName;
    /**
     * @hidden
     * A reference to the auto-generated SearchClient
     */
    client;
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
    constructor(endpoint, indexName, credential, options = {}) {
        this.endpoint = endpoint;
        this.indexName = indexName;
        const internalClientPipelineOptions = {
            ...options,
            ...{
                loggingOptions: {
                    logger: logger.info,
                    additionalAllowedHeaderNames: [
                        "elapsed-time",
                        "Location",
                        "OData-MaxVersion",
                        "OData-Version",
                        "Prefer",
                        "throttle-reason",
                    ],
                },
            },
        };
        this.serviceVersion =
            options.serviceVersion ?? options.apiVersion ?? utils.defaultServiceVersion;
        this.apiVersion = this.serviceVersion;
        this.client = new GeneratedClient(this.endpoint, this.indexName, this.serviceVersion, internalClientPipelineOptions);
        if (isTokenCredential(credential)) {
            const scope = options.audience
                ? `${options.audience}/.default`
                : `${KnownSearchAudience.AzurePublicCloud}/.default`;
            this.client.pipeline.addPolicy(bearerTokenAuthenticationPolicy({ credential, scopes: scope }));
        }
        else {
            this.client.pipeline.addPolicy(createSearchApiKeyCredentialPolicy(credential));
        }
        this.client.pipeline.addPolicy(createOdataMetadataPolicy("none"));
    }
    /**
     * Retrieves the number of documents in the index.
     * @param options - Options to the count operation.
     */
    async getDocumentsCount(options = {}) {
        const { span, updatedOptions } = createSpan("SearchClient-getDocumentsCount", options);
        try {
            let documentsCount = 0;
            await this.client.documents.count({
                ...updatedOptions,
                onResponse: (rawResponse, flatResponse) => {
                    documentsCount = Number(rawResponse.bodyAsText);
                    if (updatedOptions.onResponse) {
                        updatedOptions.onResponse(rawResponse, flatResponse);
                    }
                },
            });
            return documentsCount;
        }
        catch (e) {
            span.setStatus({
                status: "error",
                error: e.message,
            });
            throw e;
        }
        finally {
            span.end();
        }
    }
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
    async autocomplete(searchText, suggesterName, options = {}) {
        const { searchFields, ...nonFieldOptions } = options;
        const fullOptions = {
            searchText: searchText,
            suggesterName: suggesterName,
            searchFields: this.convertSearchFields(searchFields),
            ...nonFieldOptions,
        };
        if (!fullOptions.searchText) {
            throw new RangeError("searchText must be provided.");
        }
        if (!fullOptions.suggesterName) {
            throw new RangeError("suggesterName must be provided.");
        }
        const { span, updatedOptions } = createSpan("SearchClient-autocomplete", options);
        try {
            const result = await this.client.documents.autocompletePost(fullOptions, updatedOptions);
            return result;
        }
        catch (e) {
            span.setStatus({
                status: "error",
                error: e.message,
            });
            throw e;
        }
        finally {
            span.end();
        }
    }
    async searchDocuments(searchText, options = {}, nextPageParameters = {}) {
        const { includeTotalCount, orderBy, searchFields, select, vectorSearchOptions, semanticSearchOptions, ...restOptions } = options;
        const { configurationName, errorMode, answers, captions, ...restSemanticOptions } = semanticSearchOptions ?? {};
        const { queries, filterMode, ...restVectorOptions } = vectorSearchOptions ?? {};
        const fullOptions = {
            ...restSemanticOptions,
            ...restVectorOptions,
            ...restOptions,
            ...nextPageParameters,
            searchFields: this.convertSearchFields(searchFields),
            select: this.convertSelect(select) || "*",
            orderBy: this.convertOrderBy(orderBy),
            includeTotalResultCount: includeTotalCount,
            vectorQueries: queries?.map(this.convertVectorQuery.bind(this)),
            answers: this.convertQueryAnswers(answers),
            captions: this.convertQueryCaptions(captions),
            semanticErrorHandling: errorMode,
            semanticConfigurationName: configurationName,
            vectorFilterMode: filterMode,
        };
        const { span, updatedOptions } = createSpan("SearchClient-searchDocuments", options);
        try {
            const result = await this.client.documents.searchPost({
                ...fullOptions,
                searchText: searchText,
            }, updatedOptions);
            const { results, nextLink, nextPageParameters: resultNextPageParameters, semanticPartialResponseReason: semanticErrorReason, semanticPartialResponseType: semanticSearchResultsType, ...restResult } = result;
            const modifiedResults = utils.generatedSearchResultToPublicSearchResult(results);
            const converted = {
                ...restResult,
                results: modifiedResults,
                semanticErrorReason,
                semanticSearchResultsType,
                continuationToken: this.encodeContinuationToken(nextLink, resultNextPageParameters),
            };
            return deserialize(converted);
        }
        catch (e) {
            span.setStatus({
                status: "error",
                error: e.message,
            });
            throw e;
        }
        finally {
            span.end();
        }
    }
    async *listSearchResultsPage(searchText, options = {}, settings = {}) {
        let decodedContinuation = this.decodeContinuationToken(settings.continuationToken);
        let result = await this.searchDocuments(searchText, options, decodedContinuation?.nextPageParameters);
        yield result;
        // Technically, we should also leverage nextLink, but the generated code
        // doesn't support this yet.
        while (result.continuationToken) {
            decodedContinuation = this.decodeContinuationToken(result.continuationToken);
            result = await this.searchDocuments(searchText, options, decodedContinuation?.nextPageParameters);
            yield result;
        }
    }
    async *listSearchResultsAll(firstPage, searchText, options = {}) {
        yield* firstPage.results;
        if (firstPage.continuationToken) {
            for await (const page of this.listSearchResultsPage(searchText, options, {
                continuationToken: firstPage.continuationToken,
            })) {
                yield* page.results;
            }
        }
    }
    listSearchResults(firstPage, searchText, options = {}) {
        const iter = this.listSearchResultsAll(firstPage, searchText, options);
        return {
            next() {
                return iter.next();
            },
            [Symbol.asyncIterator]() {
                return this;
            },
            byPage: (settings = {}) => {
                return this.listSearchResultsPage(searchText, options, settings);
            },
        };
    }
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
    async search(searchText, options) {
        const { span, updatedOptions } = createSpan("SearchClient-search", options);
        try {
            const pageResult = await this.searchDocuments(searchText, updatedOptions);
            return {
                ...pageResult,
                results: this.listSearchResults(pageResult, searchText, updatedOptions),
            };
        }
        catch (e) {
            span.setStatus({
                status: "error",
                error: e.message,
            });
            throw e;
        }
        finally {
            span.end();
        }
    }
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
    async suggest(searchText, suggesterName, options = {}) {
        const { select, searchFields, orderBy, ...nonFieldOptions } = options;
        const fullOptions = {
            searchText: searchText,
            suggesterName: suggesterName,
            searchFields: this.convertSearchFields(searchFields),
            select: this.convertSelect(select),
            orderBy: this.convertOrderBy(orderBy),
            ...nonFieldOptions,
        };
        if (!fullOptions.searchText) {
            throw new RangeError("searchText must be provided.");
        }
        if (!fullOptions.suggesterName) {
            throw new RangeError("suggesterName must be provided.");
        }
        const { span, updatedOptions } = createSpan("SearchClient-suggest", options);
        try {
            const result = await this.client.documents.suggestPost(fullOptions, updatedOptions);
            const modifiedResult = utils.generatedSuggestDocumentsResultToPublicSuggestDocumentsResult(result);
            return deserialize(modifiedResult);
        }
        catch (e) {
            span.setStatus({
                status: "error",
                error: e.message,
            });
            throw e;
        }
        finally {
            span.end();
        }
    }
    /**
     * Retrieve a particular document from the index by key.
     * @param key - The primary key value of the document
     * @param options - Additional options
     */
    async getDocument(key, options = {}) {
        const { span, updatedOptions } = createSpan("SearchClient-getDocument", options);
        try {
            const result = await this.client.documents.get(key, {
                ...updatedOptions,
                selectedFields: updatedOptions.selectedFields,
            });
            return deserialize(result);
        }
        catch (e) {
            span.setStatus({
                status: "error",
                error: e.message,
            });
            throw e;
        }
        finally {
            span.end();
        }
    }
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
    async indexDocuments(
    // eslint-disable-next-line @azure/azure-sdk/ts-use-interface-parameters
    batch, options = {}) {
        const { span, updatedOptions } = createSpan("SearchClient-indexDocuments", options);
        try {
            let status = 0;
            const result = await this.client.documents.index({ actions: serialize(batch.actions) }, {
                ...updatedOptions,
                onResponse: (rawResponse, flatResponse) => {
                    status = rawResponse.status;
                    if (updatedOptions.onResponse) {
                        updatedOptions.onResponse(rawResponse, flatResponse);
                    }
                },
            });
            if (options.throwOnAnyFailure && status === 207) {
                throw result;
            }
            return result;
        }
        catch (e) {
            span.setStatus({
                status: "error",
                error: e.message,
            });
            throw e;
        }
        finally {
            span.end();
        }
    }
    /**
     * Upload an array of documents to the index.
     * @param documents - The documents to upload.
     * @param options - Additional options.
     */
    async uploadDocuments(documents, options = {}) {
        const { span, updatedOptions } = createSpan("SearchClient-uploadDocuments", options);
        const batch = new IndexDocumentsBatch();
        batch.upload(documents);
        try {
            return await this.indexDocuments(batch, updatedOptions);
        }
        catch (e) {
            span.setStatus({
                status: "error",
                error: e.message,
            });
            throw e;
        }
        finally {
            span.end();
        }
    }
    /**
     * Update a set of documents in the index.
     * For more details about how merging works, see https://docs.microsoft.com/en-us/rest/api/searchservice/AddUpdate-or-Delete-Documents
     * @param documents - The updated documents.
     * @param options - Additional options.
     */
    async mergeDocuments(documents, options = {}) {
        const { span, updatedOptions } = createSpan("SearchClient-mergeDocuments", options);
        const batch = new IndexDocumentsBatch();
        batch.merge(documents);
        try {
            return await this.indexDocuments(batch, updatedOptions);
        }
        catch (e) {
            span.setStatus({
                status: "error",
                error: e.message,
            });
            throw e;
        }
        finally {
            span.end();
        }
    }
    /**
     * Update a set of documents in the index or upload them if they don't exist.
     * For more details about how merging works, see https://docs.microsoft.com/en-us/rest/api/searchservice/AddUpdate-or-Delete-Documents
     * @param documents - The updated documents.
     * @param options - Additional options.
     */
    async mergeOrUploadDocuments(documents, options = {}) {
        const { span, updatedOptions } = createSpan("SearchClient-mergeDocuments", options);
        const batch = new IndexDocumentsBatch();
        batch.mergeOrUpload(documents);
        try {
            return await this.indexDocuments(batch, updatedOptions);
        }
        catch (e) {
            span.setStatus({
                status: "error",
                error: e.message,
            });
            throw e;
        }
        finally {
            span.end();
        }
    }
    async deleteDocuments(keyNameOrDocuments, keyValuesOrOptions, options = {}) {
        const { span, updatedOptions } = createSpan("SearchClient-deleteDocuments", options);
        const batch = new IndexDocumentsBatch();
        if (typeof keyNameOrDocuments === "string") {
            batch.delete(keyNameOrDocuments, keyValuesOrOptions);
        }
        else {
            batch.delete(keyNameOrDocuments);
        }
        try {
            return await this.indexDocuments(batch, updatedOptions);
        }
        catch (e) {
            span.setStatus({
                status: "error",
                error: e.message,
            });
            throw e;
        }
        finally {
            span.end();
        }
    }
    encodeContinuationToken(nextLink, nextPageParameters) {
        if (!nextLink || !nextPageParameters) {
            return undefined;
        }
        const payload = JSON.stringify({
            apiVersion: this.apiVersion,
            nextLink,
            nextPageParameters,
        });
        return encode(payload);
    }
    decodeContinuationToken(token) {
        if (!token) {
            return undefined;
        }
        const decodedToken = decode(token);
        try {
            const result = JSON.parse(decodedToken);
            if (result.apiVersion !== this.apiVersion) {
                throw new RangeError(`Continuation token uses unsupported apiVersion "${this.apiVersion}"`);
            }
            return {
                nextLink: result.nextLink,
                nextPageParameters: result.nextPageParameters,
            };
        }
        catch (e) {
            throw new Error(`Corrupted or invalid continuation token: ${decodedToken}`);
        }
    }
    convertSelect(select) {
        if (select) {
            return select.join(",");
        }
        return select;
    }
    convertVectorQueryFields(fields) {
        if (fields) {
            return fields.join(",");
        }
        return fields;
    }
    convertSearchFields(searchFields) {
        if (searchFields) {
            return searchFields.join(",");
        }
        return searchFields;
    }
    convertOrderBy(orderBy) {
        if (orderBy) {
            return orderBy.join(",");
        }
        return orderBy;
    }
    convertQueryAnswers(answers) {
        if (!answers) {
            return answers;
        }
        const config = [];
        const { answerType: output, count, threshold } = answers;
        if (count) {
            config.push(`count-${count}`);
        }
        if (threshold) {
            config.push(`threshold-${threshold}`);
        }
        if (config.length) {
            return output + `|${config.join(",")}`;
        }
        return output;
    }
    convertQueryCaptions(captions) {
        if (!captions) {
            return captions;
        }
        const config = [];
        const { captionType: output, highlight } = captions;
        if (highlight !== undefined) {
            config.push(`highlight-${highlight}`);
        }
        if (config.length) {
            return output + `|${config.join(",")}`;
        }
        return output;
    }
    convertVectorQuery(vectorQuery) {
        return { ...vectorQuery, fields: this.convertVectorQueryFields(vectorQuery?.fields) };
    }
}
//# sourceMappingURL=searchClient.js.map