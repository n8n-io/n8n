import { KeyCredential, TokenCredential } from "@azure/core-auth";
import { ExtendedCommonClientOptions } from "@azure/core-http-compat";
import { SearchIndexerStatus } from "./generated/service/models/index.js";
import { CreateDataSourceConnectionOptions, CreateIndexerOptions, CreateorUpdateDataSourceConnectionOptions, CreateorUpdateIndexerOptions, CreateOrUpdateSkillsetOptions, CreateSkillsetOptions, DeleteDataSourceConnectionOptions, DeleteIndexerOptions, DeleteSkillsetOptions, GetDataSourceConnectionOptions, GetIndexerOptions, GetIndexerStatusOptions, GetSkillSetOptions, ListDataSourceConnectionsOptions, ListIndexersOptions, ListSkillsetsOptions, ResetIndexerOptions, RunIndexerOptions, SearchIndexer, SearchIndexerDataSourceConnection, SearchIndexerSkillset } from "./serviceModels.js";
/**
 * Client options used to configure Cognitive Search API requests.
 */
export interface SearchIndexerClientOptions extends ExtendedCommonClientOptions {
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
//# sourceMappingURL=searchIndexerClient.d.ts.map