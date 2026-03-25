// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { __rest } from "tslib";
import { isTokenCredential } from "@azure/core-auth";
import { bearerTokenAuthenticationPolicy } from "@azure/core-rest-pipeline";
import { SearchServiceClient as GeneratedClient } from "./generated/service/searchServiceClient";
import { logger } from "./logger";
import { createOdataMetadataPolicy } from "./odataMetadataPolicy";
import { createSearchApiKeyCredentialPolicy } from "./searchApiKeyCredentialPolicy";
import { KnownSearchAudience } from "./searchAudience";
import * as utils from "./serviceUtils";
import { createSpan } from "./tracing";
/**
 * Class to perform operations to manage
 * (create, update, list/delete)
 * indexers, datasources & skillsets.
 */
export class SearchIndexerClient {
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
        const internalClientPipelineOptions = Object.assign(Object.assign({}, options), {
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
            (_b = (_a = options.serviceVersion) !== null && _a !== void 0 ? _a : options.apiVersion) !== null && _b !== void 0 ? _b : utils.defaultServiceVersion;
        this.apiVersion = this.serviceVersion;
        this.client = new GeneratedClient(this.endpoint, this.serviceVersion, internalClientPipelineOptions);
        if (isTokenCredential(credential)) {
            const scope = options.audience
                ? `${options.audience}/.default`
                : `${KnownSearchAudience.AzurePublicCloud}/.default`;
            this.client.pipeline.addPolicy(bearerTokenAuthenticationPolicy({ credential, scopes: scope }));
        }
        else {
            this.client.pipeline.addPolicy(createSearchApiKeyCredentialPolicy(credential));
        }
        this.client.pipeline.addPolicy(createOdataMetadataPolicy("minimal"));
    }
    /**
     * Retrieves a list of existing indexers in the service.
     * @param options - Options to the list indexers operation.
     */
    async listIndexers(options = {}) {
        const { span, updatedOptions } = createSpan("SearchIndexerClient-listIndexers", options);
        try {
            const result = await this.client.indexers.list(updatedOptions);
            return result.indexers.map(utils.generatedSearchIndexerToPublicSearchIndexer);
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
     * Retrieves a list of names of existing indexers in the service.
     * @param options - Options to the list indexers operation.
     */
    async listIndexersNames(options = {}) {
        const { span, updatedOptions } = createSpan("SearchIndexerClient-listIndexersNames", options);
        try {
            const result = await this.client.indexers.list(Object.assign(Object.assign({}, updatedOptions), { select: "name" }));
            return result.indexers.map((idx) => idx.name);
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
     * Retrieves a list of existing data sources in the service.
     * @param options - Options to the list indexers operation.
     */
    async listDataSourceConnections(options = {}) {
        const { span, updatedOptions } = createSpan("SearchIndexerClient-listDataSourceConnections", options);
        try {
            const result = await this.client.dataSources.list(updatedOptions);
            return result.dataSources.map(utils.generatedDataSourceToPublicDataSource);
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
     * Retrieves a list of names of existing data sources in the service.
     * @param options - Options to the list indexers operation.
     */
    async listDataSourceConnectionsNames(options = {}) {
        const { span, updatedOptions } = createSpan("SearchIndexerClient-listDataSourceConnectionsNames", options);
        try {
            const result = await this.client.dataSources.list(Object.assign(Object.assign({}, updatedOptions), { select: "name" }));
            return result.dataSources.map((ds) => ds.name);
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
     * Retrieves a list of existing Skillsets in the service.
     * @param options - Options to the list Skillsets operation.
     */
    async listSkillsets(options = {}) {
        const { span, updatedOptions } = createSpan("SearchIndexerClient-listSkillsets", options);
        try {
            const result = await this.client.skillsets.list(updatedOptions);
            return result.skillsets.map(utils.generatedSkillsetToPublicSkillset);
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
     * Retrieves a list of names of existing Skillsets in the service.
     * @param options - Options to the list Skillsets operation.
     */
    async listSkillsetsNames(options = {}) {
        const { span, updatedOptions } = createSpan("SearchIndexerClient-listSkillsetsNames", options);
        try {
            const result = await this.client.skillsets.list(Object.assign(Object.assign({}, updatedOptions), { select: "name" }));
            return result.skillsets.map((sks) => sks.name);
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
     * Retrieves information about an Indexer.
     * @param indexerName - The name of the Indexer.
     * @param options - Additional optional arguments.
     */
    async getIndexer(indexerName, options = {}) {
        const { span, updatedOptions } = createSpan("SearchIndexerClient-getIndexer", options);
        try {
            const result = await this.client.indexers.get(indexerName, updatedOptions);
            return utils.generatedSearchIndexerToPublicSearchIndexer(result);
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
     * Retrieves information about a DataSource
     * @param dataSourceName - The name of the DataSource
     * @param options - Additional optional arguments
     */
    async getDataSourceConnection(dataSourceConnectionName, options = {}) {
        const { span, updatedOptions } = createSpan("SearchIndexerClient-getDataSourceConnection", options);
        try {
            const result = await this.client.dataSources.get(dataSourceConnectionName, updatedOptions);
            return utils.generatedDataSourceToPublicDataSource(result);
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
     * Retrieves information about an Skillset.
     * @param indexName - The name of the Skillset.
     * @param options - Additional optional arguments.
     */
    async getSkillset(skillsetName, options = {}) {
        const { span, updatedOptions } = createSpan("SearchIndexerClient-getSkillset", options);
        try {
            const result = await this.client.skillsets.get(skillsetName, updatedOptions);
            return utils.generatedSkillsetToPublicSkillset(result);
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
     * Creates a new indexer in a search service.
     * @param indexer - The indexer definition to create in a search service.
     * @param options - Additional optional arguments.
     */
    async createIndexer(indexer, options = {}) {
        const { span, updatedOptions } = createSpan("SearchIndexerClient-createIndexer", options);
        try {
            const result = await this.client.indexers.create(utils.publicSearchIndexerToGeneratedSearchIndexer(indexer), updatedOptions);
            return utils.generatedSearchIndexerToPublicSearchIndexer(result);
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
     * Creates a new dataSource in a search service.
     * @param dataSourceConnection - The dataSource definition to create in a search service.
     * @param options - Additional optional arguments.
     */
    async createDataSourceConnection(dataSourceConnection, options = {}) {
        const { span, updatedOptions } = createSpan("SearchIndexerClient-createDataSourceConnection", options);
        try {
            const result = await this.client.dataSources.create(utils.publicDataSourceToGeneratedDataSource(dataSourceConnection), updatedOptions);
            return utils.generatedDataSourceToPublicDataSource(result);
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
     * Creates a new skillset in a search service.
     * @param skillset - The skillset containing one or more skills to create in a search service.
     * @param options - Additional optional arguments.
     */
    async createSkillset(skillset, options = {}) {
        const { span, updatedOptions } = createSpan("SearchIndexerClient-createSkillset", options);
        try {
            const result = await this.client.skillsets.create(utils.publicSkillsetToGeneratedSkillset(skillset), updatedOptions);
            return utils.generatedSkillsetToPublicSkillset(result);
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
     * Creates a new indexer or modifies an existing one.
     * @param indexer - The information describing the indexer to be created/updated.
     * @param options - Additional optional arguments.
     */
    async createOrUpdateIndexer(indexer, options = {}) {
        const { span, updatedOptions } = createSpan("SearchIndexerClient-createOrUpdateIndexer", options);
        const { onlyIfUnchanged } = updatedOptions, restOptions = __rest(updatedOptions, ["onlyIfUnchanged"]);
        try {
            const etag = onlyIfUnchanged ? indexer.etag : undefined;
            const result = await this.client.indexers.createOrUpdate(indexer.name, utils.publicSearchIndexerToGeneratedSearchIndexer(indexer), Object.assign(Object.assign({}, restOptions), { ifMatch: etag }));
            return utils.generatedSearchIndexerToPublicSearchIndexer(result);
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
     * Creates a new datasource or modifies an existing one.
     * @param dataSourceConnection - The information describing the datasource to be created/updated.
     * @param options - Additional optional arguments.
     */
    async createOrUpdateDataSourceConnection(dataSourceConnection, options = {}) {
        const { span, updatedOptions } = createSpan("SearchIndexerClient-createOrUpdateDataSourceConnection", options);
        try {
            const etag = options.onlyIfUnchanged ? dataSourceConnection.etag : undefined;
            const result = await this.client.dataSources.createOrUpdate(dataSourceConnection.name, utils.publicDataSourceToGeneratedDataSource(dataSourceConnection), Object.assign(Object.assign({}, updatedOptions), { ifMatch: etag }));
            return utils.generatedDataSourceToPublicDataSource(result);
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
     * Creates a new Skillset or modifies an existing one.
     * @param skillset - The information describing the index to be created.
     * @param options - Additional optional arguments.
     */
    async createOrUpdateSkillset(skillset, options = {}) {
        const { span, updatedOptions } = createSpan("SearchIndexerClient-createOrUpdateSkillset", options);
        try {
            const etag = options.onlyIfUnchanged ? skillset.etag : undefined;
            const result = await this.client.skillsets.createOrUpdate(skillset.name, utils.publicSkillsetToGeneratedSkillset(skillset), Object.assign(Object.assign({}, updatedOptions), { ifMatch: etag }));
            return utils.generatedSkillsetToPublicSkillset(result);
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
     * Deletes an existing indexer.
     * @param indexer - Indexer/Name of the indexer to delete.
     * @param options - Additional optional arguments.
     */
    async deleteIndexer(indexer, options = {}) {
        const { span, updatedOptions } = createSpan("SearchIndexerClient-deleteIndexer", options);
        try {
            const indexerName = typeof indexer === "string" ? indexer : indexer.name;
            const etag = typeof indexer === "string"
                ? undefined
                : options.onlyIfUnchanged
                    ? indexer.etag
                    : undefined;
            await this.client.indexers.delete(indexerName, Object.assign(Object.assign({}, updatedOptions), { ifMatch: etag }));
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
     * Deletes an existing datasource.
     * @param dataSource - Datasource/Name of the datasource to delete.
     * @param options - Additional optional arguments.
     */
    async deleteDataSourceConnection(dataSourceConnection, options = {}) {
        const { span, updatedOptions } = createSpan("SearchIndexerClient-deleteDataSourceConnection", options);
        try {
            const dataSourceConnectionName = typeof dataSourceConnection === "string" ? dataSourceConnection : dataSourceConnection.name;
            const etag = typeof dataSourceConnection === "string"
                ? undefined
                : options.onlyIfUnchanged
                    ? dataSourceConnection.etag
                    : undefined;
            await this.client.dataSources.delete(dataSourceConnectionName, Object.assign(Object.assign({}, updatedOptions), { ifMatch: etag }));
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
     * Deletes an existing Skillset.
     * @param skillset - Skillset/Name of the Skillset to delete.
     * @param options - Additional optional arguments.
     */
    async deleteSkillset(skillset, options = {}) {
        const { span, updatedOptions } = createSpan("SearchIndexerClient-deleteSkillset", options);
        try {
            const skillsetName = typeof skillset === "string" ? skillset : skillset.name;
            const etag = typeof skillset === "string"
                ? undefined
                : options.onlyIfUnchanged
                    ? skillset.etag
                    : undefined;
            await this.client.skillsets.delete(skillsetName, Object.assign(Object.assign({}, updatedOptions), { ifMatch: etag }));
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
     * Returns the current status and execution history of an indexer.
     * @param indexerName - The name of the indexer.
     * @param options - Additional optional arguments.
     */
    async getIndexerStatus(indexerName, options = {}) {
        const { span, updatedOptions } = createSpan("SearchIndexerClient-getIndexerStatus", options);
        try {
            const result = await this.client.indexers.getStatus(indexerName, updatedOptions);
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
     * Resets the change tracking state associated with an indexer.
     * @param indexerName - The name of the indexer to reset.
     * @param options - Additional optional arguments.
     */
    async resetIndexer(indexerName, options = {}) {
        const { span, updatedOptions } = createSpan("SearchIndexerClient-resetIndexer", options);
        try {
            await this.client.indexers.reset(indexerName, updatedOptions);
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
     * Runs an indexer on-demand.
     * @param indexerName - The name of the indexer to run.
     * @param options - Additional optional arguments.
     */
    async runIndexer(indexerName, options = {}) {
        const { span, updatedOptions } = createSpan("SearchIndexerClient-runIndexer", options);
        try {
            await this.client.indexers.run(indexerName, updatedOptions);
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
}
//# sourceMappingURL=searchIndexerClient.js.map