"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchIndexClient = void 0;
const tslib_1 = require("tslib");
/// <reference lib="esnext.asynciterable" />
const core_auth_1 = require("@azure/core-auth");
const core_rest_pipeline_1 = require("@azure/core-rest-pipeline");
const searchServiceClient_js_1 = require("./generated/service/searchServiceClient.js");
const logger_js_1 = require("./logger.js");
const odataMetadataPolicy_js_1 = require("./odataMetadataPolicy.js");
const searchApiKeyCredentialPolicy_js_1 = require("./searchApiKeyCredentialPolicy.js");
const searchAudience_js_1 = require("./searchAudience.js");
const searchClient_js_1 = require("./searchClient.js");
const utils = tslib_1.__importStar(require("./serviceUtils.js"));
const tracing_js_1 = require("./tracing.js");
/**
 * Class to perform operations to manage
 * (create, update, list/delete)
 * indexes, & synonymmaps.
 */
class SearchIndexClient {
    /**
     * The API version to use when communicating with the service.
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
     * @hidden
     * A reference to the auto-generated SearchServiceClient
     */
    client;
    /**
     * Used to authenticate requests to the service.
     */
    credential;
    /**
     * Used to configure the Search Index client.
     */
    options;
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
    constructor(endpoint, credential, options = {}) {
        this.endpoint = endpoint;
        this.credential = credential;
        this.options = options;
        const internalClientPipelineOptions = {
            ...this.options,
            ...{
                loggingOptions: {
                    logger: logger_js_1.logger.info,
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
            this.options.serviceVersion ?? this.options.apiVersion ?? utils.defaultServiceVersion;
        this.apiVersion = this.serviceVersion;
        this.client = new searchServiceClient_js_1.SearchServiceClient(this.endpoint, this.serviceVersion, internalClientPipelineOptions);
        if ((0, core_auth_1.isTokenCredential)(credential)) {
            const scope = this.options.audience
                ? `${this.options.audience}/.default`
                : `${searchAudience_js_1.KnownSearchAudience.AzurePublicCloud}/.default`;
            this.client.pipeline.addPolicy((0, core_rest_pipeline_1.bearerTokenAuthenticationPolicy)({ credential, scopes: scope }));
        }
        else {
            this.client.pipeline.addPolicy((0, searchApiKeyCredentialPolicy_js_1.createSearchApiKeyCredentialPolicy)(credential));
        }
        this.client.pipeline.addPolicy((0, odataMetadataPolicy_js_1.createOdataMetadataPolicy)("minimal"));
    }
    async *listIndexesPage(options = {}) {
        const { span, updatedOptions } = (0, tracing_js_1.createSpan)("SearchIndexClient-listIndexesPage", options);
        try {
            const result = await this.client.indexes.list(updatedOptions);
            const mapped = result.indexes.map(utils.generatedIndexToPublicIndex);
            yield mapped;
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
    async *listIndexesAll(options = {}) {
        for await (const page of this.listIndexesPage(options)) {
            yield* page;
        }
    }
    /**
     * Retrieves a list of existing indexes in the service.
     * @param options - Options to the list index operation.
     */
    listIndexes(options = {}) {
        const iter = this.listIndexesAll(options);
        return {
            next() {
                return iter.next();
            },
            [Symbol.asyncIterator]() {
                return this;
            },
            byPage: () => {
                return this.listIndexesPage(options);
            },
        };
    }
    async *listIndexesNamesPage(options = {}) {
        const { span, updatedOptions } = (0, tracing_js_1.createSpan)("SearchIndexClient-listIndexesNamesPage", options);
        try {
            const result = await this.client.indexes.list({
                ...updatedOptions,
                select: "name",
            });
            const mapped = result.indexes.map((idx) => idx.name);
            yield mapped;
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
    async *listIndexesNamesAll(options = {}) {
        for await (const page of this.listIndexesNamesPage(options)) {
            yield* page;
        }
    }
    /**
     * Retrieves a list of names of existing indexes in the service.
     * @param options - Options to the list index operation.
     */
    listIndexesNames(options = {}) {
        const iter = this.listIndexesNamesAll(options);
        return {
            next() {
                return iter.next();
            },
            [Symbol.asyncIterator]() {
                return this;
            },
            byPage: () => {
                return this.listIndexesNamesPage(options);
            },
        };
    }
    /**
     * Retrieves a list of existing SynonymMaps in the service.
     * @param options - Options to the list SynonymMaps operation.
     */
    async listSynonymMaps(options = {}) {
        const { span, updatedOptions } = (0, tracing_js_1.createSpan)("SearchIndexClient-listSynonymMaps", options);
        try {
            const result = await this.client.synonymMaps.list(updatedOptions);
            return result.synonymMaps.map(utils.generatedSynonymMapToPublicSynonymMap);
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
     * Retrieves a list of names of existing SynonymMaps in the service.
     * @param options - Options to the list SynonymMaps operation.
     */
    async listSynonymMapsNames(options = {}) {
        const { span, updatedOptions } = (0, tracing_js_1.createSpan)("SearchIndexClient-listSynonymMapsNames", options);
        try {
            const result = await this.client.synonymMaps.list({
                ...updatedOptions,
                select: "name",
            });
            return result.synonymMaps.map((sm) => sm.name);
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
     * Retrieves information about an index.
     * @param indexName - The name of the index.
     * @param options - Additional optional arguments.
     */
    async getIndex(indexName, options = {}) {
        const { span, updatedOptions } = (0, tracing_js_1.createSpan)("SearchIndexClient-getIndex", options);
        try {
            const result = await this.client.indexes.get(indexName, updatedOptions);
            return utils.generatedIndexToPublicIndex(result);
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
     * Retrieves information about a SynonymMap.
     * @param synonymMapName - The name of the SynonymMap.
     * @param options - Additional optional arguments.
     */
    async getSynonymMap(synonymMapName, options = {}) {
        const { span, updatedOptions } = (0, tracing_js_1.createSpan)("SearchIndexClient-getSynonymMaps", options);
        try {
            const result = await this.client.synonymMaps.get(synonymMapName, updatedOptions);
            return utils.generatedSynonymMapToPublicSynonymMap(result);
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
     * Creates a new index.
     * @param index - The information describing the index to be created.
     * @param options - Additional optional arguments.
     */
    async createIndex(index, options = {}) {
        const { span, updatedOptions } = (0, tracing_js_1.createSpan)("SearchIndexClient-createIndex", options);
        try {
            const result = await this.client.indexes.create(utils.publicIndexToGeneratedIndex(index), updatedOptions);
            return utils.generatedIndexToPublicIndex(result);
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
     * Creates a new SynonymMap in a search service.
     * @param synonymMap - The synonymMap definition to create in a search service.
     * @param options - Additional optional arguments.
     */
    async createSynonymMap(synonymMap, options = {}) {
        const { span, updatedOptions } = (0, tracing_js_1.createSpan)("SearchIndexClient-createSynonymMaps", options);
        try {
            const result = await this.client.synonymMaps.create(utils.publicSynonymMapToGeneratedSynonymMap(synonymMap), updatedOptions);
            return utils.generatedSynonymMapToPublicSynonymMap(result);
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
     * Creates a new index or modifies an existing one.
     * @param index - The information describing the index to be created.
     * @param options - Additional optional arguments.
     */
    async createOrUpdateIndex(index, options = {}) {
        const { span, updatedOptions } = (0, tracing_js_1.createSpan)("SearchIndexClient-createOrUpdateIndex", options);
        try {
            const etag = options.onlyIfUnchanged ? index.etag : undefined;
            const result = await this.client.indexes.createOrUpdate(index.name, utils.publicIndexToGeneratedIndex(index), {
                ...updatedOptions,
                ifMatch: etag,
            });
            return utils.generatedIndexToPublicIndex(result);
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
     * Creates a new SynonymMap or modifies an existing one.
     * @param synonymMap - The information describing the SynonymMap to be created.
     * @param options - Additional optional arguments.
     */
    async createOrUpdateSynonymMap(synonymMap, options = {}) {
        const { span, updatedOptions } = (0, tracing_js_1.createSpan)("SearchIndexClient-createOrUpdateSynonymMap", options);
        try {
            const etag = options.onlyIfUnchanged ? synonymMap.etag : undefined;
            const result = await this.client.synonymMaps.createOrUpdate(synonymMap.name, utils.publicSynonymMapToGeneratedSynonymMap(synonymMap), {
                ...updatedOptions,
                ifMatch: etag,
            });
            return utils.generatedSynonymMapToPublicSynonymMap(result);
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
     * Deletes an existing index.
     * @param indexName - Index/Name of the index to delete.
     * @param options - Additional optional arguments.
     */
    async deleteIndex(index, options = {}) {
        const { span, updatedOptions } = (0, tracing_js_1.createSpan)("SearchIndexClient-deleteIndex", options);
        try {
            const indexName = typeof index === "string" ? index : index.name;
            const etag = typeof index === "string" ? undefined : options.onlyIfUnchanged ? index.etag : undefined;
            await this.client.indexes.delete(indexName, {
                ...updatedOptions,
                ifMatch: etag,
            });
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
     * Deletes an existing SynonymMap.
     * @param synonymMapName - SynonymMap/Name of the synonymMap to delete.
     * @param options - Additional optional arguments.
     */
    async deleteSynonymMap(synonymMap, options = {}) {
        const { span, updatedOptions } = (0, tracing_js_1.createSpan)("SearchIndexClient-deleteSynonymMap", options);
        try {
            const synonymMapName = typeof synonymMap === "string" ? synonymMap : synonymMap.name;
            const etag = typeof synonymMap === "string"
                ? undefined
                : options.onlyIfUnchanged
                    ? synonymMap.etag
                    : undefined;
            await this.client.synonymMaps.delete(synonymMapName, {
                ...updatedOptions,
                ifMatch: etag,
            });
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
     * Retrieves statistics about an index, such as the count of documents and the size
     * of index storage.
     * @param indexName - The name of the index.
     * @param options - Additional optional arguments.
     */
    async getIndexStatistics(indexName, options = {}) {
        const { span, updatedOptions } = (0, tracing_js_1.createSpan)("SearchIndexClient-getIndexStatistics", options);
        try {
            const result = await this.client.indexes.getStatistics(indexName, updatedOptions);
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
     * Calls an analyzer or tokenizer manually on provided text.
     * @param indexName - The name of the index that contains the field to analyze
     * @param text - The text to break into tokens.
     * @param options - Additional arguments
     */
    async analyzeText(indexName, options) {
        const { abortSignal, requestOptions, tracingOptions, analyzerName: analyzer, tokenizerName: tokenizer, ...restOptions } = options;
        const operationOptions = {
            abortSignal,
            requestOptions,
            tracingOptions,
        };
        const { span, updatedOptions } = (0, tracing_js_1.createSpan)("SearchIndexClient-analyzeText", operationOptions);
        try {
            const result = await this.client.indexes.analyze(indexName, { ...restOptions, analyzer, tokenizer }, updatedOptions);
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
     * Retrieves statistics about the service, such as the count of documents, index, etc.
     * @param options - Additional optional arguments.
     */
    async getServiceStatistics(options = {}) {
        const { span, updatedOptions } = (0, tracing_js_1.createSpan)("SearchIndexClient-getServiceStatistics", options);
        try {
            const result = await this.client.getServiceStatistics(updatedOptions);
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
     * Retrieves the SearchClient corresponding to this SearchIndexClient
     * @param indexName - Name of the index
     * @param options - SearchClient Options
     * @typeParam TModel - An optional type that represents the documents stored in
     * the search index. For the best typing experience, all non-key fields should
     * be marked optional and nullable, and the key property should have the
     * non-nullable type `string`.
     */
    getSearchClient(indexName, options) {
        return new searchClient_js_1.SearchClient(this.endpoint, indexName, this.credential, options || this.options);
    }
}
exports.SearchIndexClient = SearchIndexClient;
//# sourceMappingURL=searchIndexClient.js.map