// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { __asyncDelegator, __asyncGenerator, __asyncValues, __await, __rest } from "tslib";
/// <reference lib="esnext.asynciterable" />
import { isTokenCredential } from "@azure/core-auth";
import { bearerTokenAuthenticationPolicy } from "@azure/core-rest-pipeline";
import { SearchServiceClient as GeneratedClient } from "./generated/service/searchServiceClient";
import { logger } from "./logger";
import { createOdataMetadataPolicy } from "./odataMetadataPolicy";
import { createSearchApiKeyCredentialPolicy } from "./searchApiKeyCredentialPolicy";
import { KnownSearchAudience } from "./searchAudience";
import { SearchClient } from "./searchClient";
import * as utils from "./serviceUtils";
import { createSpan } from "./tracing";
/**
 * Class to perform operations to manage
 * (create, update, list/delete)
 * indexes, & synonymmaps.
 */
export class SearchIndexClient {
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
        var _a, _b;
        /**
         * The API version to use when communicating with the service.
         */
        this.serviceVersion = utils.defaultServiceVersion;
        /**
         * The API version to use when communicating with the service.
         * @deprecated use {@Link serviceVersion} instead
         */
        this.apiVersion = utils.defaultServiceVersion;
        this.endpoint = endpoint;
        this.credential = credential;
        this.options = options;
        const internalClientPipelineOptions = Object.assign(Object.assign({}, this.options), {
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
        });
        this.serviceVersion =
            (_b = (_a = this.options.serviceVersion) !== null && _a !== void 0 ? _a : this.options.apiVersion) !== null && _b !== void 0 ? _b : utils.defaultServiceVersion;
        this.apiVersion = this.serviceVersion;
        this.client = new GeneratedClient(this.endpoint, this.serviceVersion, internalClientPipelineOptions);
        if (isTokenCredential(credential)) {
            const scope = this.options.audience
                ? `${this.options.audience}/.default`
                : `${KnownSearchAudience.AzurePublicCloud}/.default`;
            this.client.pipeline.addPolicy(bearerTokenAuthenticationPolicy({ credential, scopes: scope }));
        }
        else {
            this.client.pipeline.addPolicy(createSearchApiKeyCredentialPolicy(credential));
        }
        this.client.pipeline.addPolicy(createOdataMetadataPolicy("minimal"));
    }
    listIndexesPage(options = {}) {
        return __asyncGenerator(this, arguments, function* listIndexesPage_1() {
            const { span, updatedOptions } = createSpan("SearchIndexClient-listIndexesPage", options);
            try {
                const result = yield __await(this.client.indexes.list(updatedOptions));
                const mapped = result.indexes.map(utils.generatedIndexToPublicIndex);
                yield yield __await(mapped);
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
        });
    }
    listIndexesAll(options = {}) {
        return __asyncGenerator(this, arguments, function* listIndexesAll_1() {
            var _a, e_1, _b, _c;
            try {
                for (var _d = true, _e = __asyncValues(this.listIndexesPage(options)), _f; _f = yield __await(_e.next()), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const page = _c;
                    yield __await(yield* __asyncDelegator(__asyncValues(page)));
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield __await(_b.call(_e));
                }
                finally { if (e_1) throw e_1.error; }
            }
        });
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
    listIndexesNamesPage(options = {}) {
        return __asyncGenerator(this, arguments, function* listIndexesNamesPage_1() {
            const { span, updatedOptions } = createSpan("SearchIndexClient-listIndexesNamesPage", options);
            try {
                const result = yield __await(this.client.indexes.list(Object.assign(Object.assign({}, updatedOptions), { select: "name" })));
                const mapped = result.indexes.map((idx) => idx.name);
                yield yield __await(mapped);
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
        });
    }
    listIndexesNamesAll(options = {}) {
        return __asyncGenerator(this, arguments, function* listIndexesNamesAll_1() {
            var _a, e_2, _b, _c;
            try {
                for (var _d = true, _e = __asyncValues(this.listIndexesNamesPage(options)), _f; _f = yield __await(_e.next()), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const page = _c;
                    yield __await(yield* __asyncDelegator(__asyncValues(page)));
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield __await(_b.call(_e));
                }
                finally { if (e_2) throw e_2.error; }
            }
        });
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
        const { span, updatedOptions } = createSpan("SearchIndexClient-listSynonymMaps", options);
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
        const { span, updatedOptions } = createSpan("SearchIndexClient-listSynonymMapsNames", options);
        try {
            const result = await this.client.synonymMaps.list(Object.assign(Object.assign({}, updatedOptions), { select: "name" }));
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
        const { span, updatedOptions } = createSpan("SearchIndexClient-getIndex", options);
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
        const { span, updatedOptions } = createSpan("SearchIndexClient-getSynonymMaps", options);
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
        const { span, updatedOptions } = createSpan("SearchIndexClient-createIndex", options);
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
        const { span, updatedOptions } = createSpan("SearchIndexClient-createSynonymMaps", options);
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
        const { span, updatedOptions } = createSpan("SearchIndexClient-createOrUpdateIndex", options);
        try {
            const etag = options.onlyIfUnchanged ? index.etag : undefined;
            const result = await this.client.indexes.createOrUpdate(index.name, utils.publicIndexToGeneratedIndex(index), Object.assign(Object.assign({}, updatedOptions), { ifMatch: etag }));
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
        const { span, updatedOptions } = createSpan("SearchIndexClient-createOrUpdateSynonymMap", options);
        try {
            const etag = options.onlyIfUnchanged ? synonymMap.etag : undefined;
            const result = await this.client.synonymMaps.createOrUpdate(synonymMap.name, utils.publicSynonymMapToGeneratedSynonymMap(synonymMap), Object.assign(Object.assign({}, updatedOptions), { ifMatch: etag }));
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
        const { span, updatedOptions } = createSpan("SearchIndexClient-deleteIndex", options);
        try {
            const indexName = typeof index === "string" ? index : index.name;
            const etag = typeof index === "string" ? undefined : options.onlyIfUnchanged ? index.etag : undefined;
            await this.client.indexes.delete(indexName, Object.assign(Object.assign({}, updatedOptions), { ifMatch: etag }));
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
        const { span, updatedOptions } = createSpan("SearchIndexClient-deleteSynonymMap", options);
        try {
            const synonymMapName = typeof synonymMap === "string" ? synonymMap : synonymMap.name;
            const etag = typeof synonymMap === "string"
                ? undefined
                : options.onlyIfUnchanged
                    ? synonymMap.etag
                    : undefined;
            await this.client.synonymMaps.delete(synonymMapName, Object.assign(Object.assign({}, updatedOptions), { ifMatch: etag }));
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
        const { span, updatedOptions } = createSpan("SearchIndexClient-getIndexStatistics", options);
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
        const { abortSignal, requestOptions, tracingOptions, analyzerName: analyzer, tokenizerName: tokenizer } = options, restOptions = __rest(options, ["abortSignal", "requestOptions", "tracingOptions", "analyzerName", "tokenizerName"]);
        const operationOptions = {
            abortSignal,
            requestOptions,
            tracingOptions,
        };
        const { span, updatedOptions } = createSpan("SearchIndexClient-analyzeText", operationOptions);
        try {
            const result = await this.client.indexes.analyze(indexName, Object.assign(Object.assign({}, restOptions), { analyzer, tokenizer }), updatedOptions);
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
        const { span, updatedOptions } = createSpan("SearchIndexClient-getServiceStatistics", options);
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
        return new SearchClient(this.endpoint, indexName, this.credential, options || this.options);
    }
}
//# sourceMappingURL=searchIndexClient.js.map