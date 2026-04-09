import { Indexers } from "../operationsInterfaces/index.js";
import { SearchServiceClient } from "../searchServiceClient.js";
import { IndexersResetOptionalParams, IndexersRunOptionalParams, SearchIndexer, IndexersCreateOrUpdateOptionalParams, IndexersCreateOrUpdateResponse, IndexersDeleteOptionalParams, IndexersGetOptionalParams, IndexersGetResponse, IndexersListOptionalParams, IndexersListResponse, IndexersCreateOptionalParams, IndexersCreateResponse, IndexersGetStatusOptionalParams, IndexersGetStatusResponse } from "../models/index.js";
/** Class containing Indexers operations. */
export declare class IndexersImpl implements Indexers {
    private readonly client;
    /**
     * Initialize a new instance of the class Indexers class.
     * @param client Reference to the service client
     */
    constructor(client: SearchServiceClient);
    /**
     * Resets the change tracking state associated with an indexer.
     * @param indexerName The name of the indexer to reset.
     * @param options The options parameters.
     */
    reset(indexerName: string, options?: IndexersResetOptionalParams): Promise<void>;
    /**
     * Runs an indexer on-demand.
     * @param indexerName The name of the indexer to run.
     * @param options The options parameters.
     */
    run(indexerName: string, options?: IndexersRunOptionalParams): Promise<void>;
    /**
     * Creates a new indexer or updates an indexer if it already exists.
     * @param indexerName The name of the indexer to create or update.
     * @param indexer The definition of the indexer to create or update.
     * @param options The options parameters.
     */
    createOrUpdate(indexerName: string, indexer: SearchIndexer, options?: IndexersCreateOrUpdateOptionalParams): Promise<IndexersCreateOrUpdateResponse>;
    /**
     * Deletes an indexer.
     * @param indexerName The name of the indexer to delete.
     * @param options The options parameters.
     */
    delete(indexerName: string, options?: IndexersDeleteOptionalParams): Promise<void>;
    /**
     * Retrieves an indexer definition.
     * @param indexerName The name of the indexer to retrieve.
     * @param options The options parameters.
     */
    get(indexerName: string, options?: IndexersGetOptionalParams): Promise<IndexersGetResponse>;
    /**
     * Lists all indexers available for a search service.
     * @param options The options parameters.
     */
    list(options?: IndexersListOptionalParams): Promise<IndexersListResponse>;
    /**
     * Creates a new indexer.
     * @param indexer The definition of the indexer to create.
     * @param options The options parameters.
     */
    create(indexer: SearchIndexer, options?: IndexersCreateOptionalParams): Promise<IndexersCreateResponse>;
    /**
     * Returns the current status and execution history of an indexer.
     * @param indexerName The name of the indexer for which to retrieve status.
     * @param options The options parameters.
     */
    getStatus(indexerName: string, options?: IndexersGetStatusOptionalParams): Promise<IndexersGetStatusResponse>;
}
//# sourceMappingURL=indexers.d.ts.map