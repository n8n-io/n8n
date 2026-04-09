import { Indexes } from "../operationsInterfaces/index.js";
import { SearchServiceClient } from "../searchServiceClient.js";
import { SearchIndex, IndexesCreateOptionalParams, IndexesCreateResponse, IndexesListOptionalParams, IndexesListResponse, IndexesCreateOrUpdateOptionalParams, IndexesCreateOrUpdateResponse, IndexesDeleteOptionalParams, IndexesGetOptionalParams, IndexesGetResponse, IndexesGetStatisticsOptionalParams, IndexesGetStatisticsResponse, AnalyzeRequest, IndexesAnalyzeOptionalParams, IndexesAnalyzeResponse } from "../models/index.js";
/** Class containing Indexes operations. */
export declare class IndexesImpl implements Indexes {
    private readonly client;
    /**
     * Initialize a new instance of the class Indexes class.
     * @param client Reference to the service client
     */
    constructor(client: SearchServiceClient);
    /**
     * Creates a new search index.
     * @param index The definition of the index to create.
     * @param options The options parameters.
     */
    create(index: SearchIndex, options?: IndexesCreateOptionalParams): Promise<IndexesCreateResponse>;
    /**
     * Lists all indexes available for a search service.
     * @param options The options parameters.
     */
    list(options?: IndexesListOptionalParams): Promise<IndexesListResponse>;
    /**
     * Creates a new search index or updates an index if it already exists.
     * @param indexName The definition of the index to create or update.
     * @param index The definition of the index to create or update.
     * @param options The options parameters.
     */
    createOrUpdate(indexName: string, index: SearchIndex, options?: IndexesCreateOrUpdateOptionalParams): Promise<IndexesCreateOrUpdateResponse>;
    /**
     * Deletes a search index and all the documents it contains. This operation is permanent, with no
     * recovery option. Make sure you have a master copy of your index definition, data ingestion code, and
     * a backup of the primary data source in case you need to re-build the index.
     * @param indexName The name of the index to delete.
     * @param options The options parameters.
     */
    delete(indexName: string, options?: IndexesDeleteOptionalParams): Promise<void>;
    /**
     * Retrieves an index definition.
     * @param indexName The name of the index to retrieve.
     * @param options The options parameters.
     */
    get(indexName: string, options?: IndexesGetOptionalParams): Promise<IndexesGetResponse>;
    /**
     * Returns statistics for the given index, including a document count and storage usage.
     * @param indexName The name of the index for which to retrieve statistics.
     * @param options The options parameters.
     */
    getStatistics(indexName: string, options?: IndexesGetStatisticsOptionalParams): Promise<IndexesGetStatisticsResponse>;
    /**
     * Shows how an analyzer breaks text into tokens.
     * @param indexName The name of the index for which to test an analyzer.
     * @param request The text and analyzer or analysis components to test.
     * @param options The options parameters.
     */
    analyze(indexName: string, request: AnalyzeRequest, options?: IndexesAnalyzeOptionalParams): Promise<IndexesAnalyzeResponse>;
}
//# sourceMappingURL=indexes.d.ts.map