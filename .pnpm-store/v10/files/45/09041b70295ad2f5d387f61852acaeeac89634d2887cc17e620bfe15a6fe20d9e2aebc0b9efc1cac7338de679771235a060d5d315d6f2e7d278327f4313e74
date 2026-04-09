import { DeleteEntitiesReq, FlushReq, FlushAllReq, FlushAllResponse, GetFlushStateReq, GetFlushAllStateReq, GetFlushAllStateResponse, GetQuerySegmentInfoReq, GePersistentSegmentInfoReq, InsertReq, UpsertReq, LoadBalanceReq, ImportReq, ListImportTasksReq, GetImportStateReq, FlushResult, GetFlushStateResponse, GetMetricsResponse, GePersistentSegmentInfoResponse, MutationResult, QueryResults, ResStatus, SearchResults, ImportResponse, ListImportTasksResponse, GetImportStateResponse, GetMetricsRequest, QueryReq, GetReq, DeleteReq, SearchReq, SearchSimpleReq, SearchIteratorReq, HybridSearchReq, CountReq, CountResult, QueryIteratorReq, GetQuerySegmentInfoResponse } from '../';
import { Collection } from './Collection';
export declare class Data extends Collection {
    /**
     * Upsert data into Milvus, view _insert for detail
     */
    upsert(data: UpsertReq): Promise<MutationResult>;
    /**
     * Insert data into Milvus, view _insert for detail
     */
    insert(data: InsertReq): Promise<MutationResult>;
    /**
     * Insert or upsert data into a Milvus collection.
     *
     * @param {InsertReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection.
     * @param {string} [data.partition_name] - The name of the partition (optional).
     * @param {{ [x: string]: any }[]} data.data - The data to be inserted. If the field type is binary, the vector data length needs to be dimension / 8.
     * @param {InsertTransformers} data.transformers - The transformers for bf16 or f16 data, it accept an f32 array, it should output f16 or bf16 bytes (optional)
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     * @param upsert - Whether to perform an upsert operation. Default is false (insert).
     * @param enable_cache - Whether to use collection cache. Default is true.
     *
     * @returns {Promise<MutationResult>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {number[]} succ_index - Index array of the successfully inserted data.
     * @returns {number[]} err_index - Index array of the unsuccessfully inserted data.
     * @returns {number[]} IDs - ID array of the successfully inserted data.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.insert({
     *    collection_name: 'my_collection',
     *    fields_data: [{
     *      vector_field: [1,2,2,4],
     *      scalar_field: 1
     *    }]
     *  });
     * ```
     */
    private _insert;
    /**
     * Delete entities in a Milvus collection.
     *
     * @param {DeleteEntitiesReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection.
     * @param {string} [data.partition_name] - The name of the partition (optional).
     * @param {string} data.expr - Boolean expression used to filter entities for deletion.
     * @param {string} [data.consistency_level] - The consistency level of the new collection. Can be "Strong" (Milvus default), "Session", "Bounded", "Eventually", or "Customized".
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<MutationResult>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {number[]} IDs - ID array of the successfully deleted data.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.deleteEntities({
     *    collection_name: 'my_collection',
     *    expr: 'id in [1,2,3,4]'
     *  });
     * ```
     */
    deleteEntities(data: DeleteEntitiesReq): Promise<MutationResult>;
    /**
     * Delete entities in a Milvus collection.
     *
     * @param {DeleteReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection.
     * @param {string} [data.partition_name] - The name of the partition (optional).
     * @param {(string[] | number[])} [data.ids] - IDs of the entities to delete.
     * @param {string} [data.filter] - Filter expression, takes precedence over ids.
     * @param {string} [data.consistency_level] - The consistency level of the new collection. Can be "Strong" (Milvus default), "Session", "Bounded", "Eventually", or "Customized".
     * @param {string} [data.expr] - equals to data.filter.
     * @param {number} [data.timeout] - Optional duration of time in milliseconds to allow for the RPC. If undefined, the client keeps waiting until the server responds or an error occurs. Default is undefined.
     *
     * @returns {Promise<MutationResult>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {number[]} IDs - Array of IDs of the successfully deleted entities.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.delete({
     *    collection_name: 'my_collection',
     *    filter: 'id in [1,2,3,4]'
     *  });
     * ```
     *
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.delete({
     *    collection_name: 'my_collection',
     *    ids: [1,2,3,4]
     *  });
     * ```
     */
    delete(data: DeleteReq): Promise<MutationResult>;
    /**
     * Perform vector similarity search in a Milvus collection.
     *
     * @param {SearchReq | SearchSimpleReq | HybridSearchReq} params - The request parameters.
     * @param {string} params.collection_name - The name of the collection.
     * @param {string} [params.db_name] - The name of the database (optional).
     *
     * For SearchSimpleReq:
     * @param {SearchData | SearchData[]} params.data - Vector or text to search.
     * @param {SearchData | SearchData[]} [params.vector] - Alias for data (optional).
     * @param {string[]} [params.partition_names] - Array of partition names (optional).
     * @param {string} [params.anns_field] - Vector field name, required for multi-vector collections (optional).
     * @param {string[]} [params.output_fields] - Fields to return (optional).
     * @param {number} [params.limit] - Number of results to return (optional).
     * @param {number} [params.topk] - Alias for limit (optional).
     * @param {number} [params.offset] - Number of results to skip (optional).
     * @param {string} [params.filter] - Filter expression (optional).
     * @param {string} [params.expr] - Alias for filter (optional).
     * @param {keyValueObj} [params.exprValues] - Template values for filter expression (optional).
     * @param {keyValueObj} [params.params] - Extra search parameters (optional).
     * @param {string} [params.metric_type] - Distance metric type (optional).
     * @param {ConsistencyLevelEnum} [params.consistency_level] - Consistency level (optional).
     * @param {boolean} [params.ignore_growing] - Whether to ignore growing segments (optional).
     * @param {string} [params.group_by_field] - Field to group results by (optional).
     * @param {number} [params.group_size] - Size of each group (optional).
     * @param {boolean} [params.strict_group_size] - Whether to enforce strict group size (optional).
     * @param {string} [params.hints] - Hints to improve search performance (optional).
     * @param {number} [params.round_decimal] - Number of decimal places to round scores (optional).
     * @param {OutputTransformers} [params.transformers] - Custom data transformers for bf16/f16 vectors (optional).
     * @param {RerankerObj | FunctionObject} [params.rerank] - Reranker configuration (optional).
     * @param {number} [params.nq] - Number of query vectors (optional).
     *
     * For HybridSearchReq:
     * @param {HybridSearchSingleReq[]} params.data - Array of search requests.
     * @param {keyValueObj} [params.params] - Search parameters (optional).
     * @param {RerankerObj | FunctionObject} [params.rerank] - Reranker configuration (optional).
     * @param {string[]} [params.partition_names] - Array of partition names (optional).
     * @param {string[]} [params.output_fields] - Fields to return (optional).
     * @param {ConsistencyLevelEnum} [params.consistency_level] - Consistency level (optional).
     * @param {boolean} [params.ignore_growing] - Whether to ignore growing segments (optional).
     * @param {string} [params.group_by_field] - Field to group results by (optional).
     * @param {number} [params.group_size] - Size of each group (optional).
     * @param {boolean} [params.strict_group_size] - Whether to enforce strict group size (optional).
     * @param {string} [params.hints] - Hints to improve search performance (optional).
     * @param {number} [params.round_decimal] - Number of decimal places to round scores (optional).
     * @param {OutputTransformers} [params.transformers] - Custom data transformers (optional).
     * @param {number} [params.nq] - Number of query vectors (optional).
     *
     * @param {number} [params.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<SearchResults<T>>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {DetermineResultsType<T>} results - Array of search results, type depends on input parameters.
     * @returns {number[]} recalls - The recalls of the search operation.
     * @returns {number} session_ts - The timestamp of the search session.
     * @returns {string} collection_name - The name of the collection.
     * @returns {number} [all_search_count] - The total number of search operations (optional).
     * @returns {Record<string, any>} [search_iterator_v2_results] - Search iterator v2 results (optional).
     * @returns {string} [_search_iterator_v2_results] - Search iterator v2 results as string (optional).
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const searchResults = await milvusClient.search({
     *    collection_name: 'my_collection',
     *    data: [1, 2, 3, 4],
     *    limit: 10
     *  });
     * ```
     */
    search<T extends SearchReq | SearchSimpleReq | HybridSearchReq>(params: T): Promise<SearchResults<T>>;
    searchIterator(param: SearchIteratorReq): Promise<any>;
    /**
     * Executes a query and returns an async iterator that allows iterating over the results in batches.
     *
     * @param {QueryIteratorReq} data - The query iterator request data.
     * @returns {Promise<any>} - An async iterator that yields batches of query results.
     * @throws {Error} - If an error occurs during the query execution.
     *
     * @example
     * const queryData = {
     *   collection_name: 'my_collection',
     *   expr: 'age > 30',
     *   limit: 100,
     *   pageSize: 10
     * };
     *
     * const iterator = await queryIterator(queryData);
     *
     * for await (const batch of iterator) {
     *   console.log(batch); // Process each batch of query results
     * }
     */
    queryIterator(data: QueryIteratorReq): Promise<any>;
    hybridSearch: <T extends SearchSimpleReq | SearchReq | HybridSearchReq>(params: T) => Promise<SearchResults<T>>;
    /**
     * Flushes the newly inserted vectors that are temporarily buffered in the cache to the object storage.
     * This is an asynchronous function and may take some time to execute deponds on your data size.
     *
     * @param {FlushReq} data - The request parameters.
     * @param {string[]} data.collection_names - Array of collection names.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<FlushResult>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const flushStatus = await milvusClient.flush({
     *    collection_names: ['my_collection'],
     *  });
     * ```
     */
    flush(data: FlushReq): Promise<FlushResult>;
    /**
     * This function is similar to the `flush` function, but it is synchronous.
     * This ensures that the flush operation is completed before the function returns.
     *
     * @param {FlushReq} data - The request parameters.
     * @param {string[]} data.collection_names - Array of collection names.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<GetFlushStateResponse>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const flushSyncStatus = await milvusClient.flushSync({
     *    collection_names: ['my_collection'],
     *  });
     * ```
     */
    flushSync(data: FlushReq): Promise<GetFlushStateResponse>;
    /**
     * Query vector data in Milvus. Current release of Milvus only supports expression as fieldname in [id1,id2,id3].
     *
     * @param {QueryReq} data - The request parameters.
     * @param {string} data.collection_name - Collection name.
     * @param {string[]} [data.ids] - IDs to get.
     * @param {string} [data.expr] - Scalar field filter expression.
     * @param {string} [data.filter] - Equals to data.expr.
     * @param {string[]} [data.partitions_names] - Array of partition names (optional).
     * @param {string[]} data.output_fields - Vector or scalar field to be returned.
     * @param {number} [data.timeout] - An optional duration of time in millisecond to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     * @param {{key: value}[]} [data.params] - An optional key pair json array of search parameters.
     * @param {OutputTransformers} data.transformers - The transformers for bf16 or f16 data, it accept bytes or sparse dic vector, it can ouput f32 array or other format(optional)
     *
     * @returns {Promise<QueryResults>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {{field_name: value}[]} data - Data of all fields that you defined in `output_fields`.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const queryResults = await milvusClient.query({
     *    collection_name: 'my_collection',
     *    filter: "age in [1,2,3,4,5,6,7,8]",
     *    output_fields: ["age"],
     *  });
     * ```
     */
    query(data: QueryReq): Promise<QueryResults>;
    count(data: CountReq): Promise<CountResult>;
    /**
     * Retrieve vector data by providing IDs in Milvus.
     *
     * @param {GetReq} data - The request parameters.
     * @param {string} data.collection_name - Collection name.
     * @param {string[]} data.ids - IDs to get.
     * @param {string[]} [data.partitions_names] - Array of partition names (optional).
     * @param {string[]} data.output_fields - Vector or scalar field to be returned.
     * @param {number} [data.timeout] - An optional duration of time in millisecond to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     * @param {{key: value}[]} [data.params] - An optional key pair json array.
     *
     * @returns {Promise<QueryResults>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {{field_name: value}[]} data - Data of all fields that you defined in `output_fields`.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const getResults = await milvusClient.get({
     *    collection_name: 'my_collection',
     *    ids: ['1','2','3','4','5','6','7','8'],
     *    output_fields: ["age"],
     *  });
     * ```
     */
    get(data: GetReq): Promise<QueryResults>;
    /**
     * @ignore
     * @param data
     *  | Property | Type | Description |
     *  | :--- | :-- | :-- |
     *  | request | object | Only allow "system_info" for now |
     */
    getMetric(data: GetMetricsRequest): Promise<GetMetricsResponse>;
    /**
     * Get the flush state in Milvus. You can query by segment IDs or by collection name with flush timestamp.
     *
     * @param {GetFlushStateReq} data - The request parameters.
     * @param {number[]} [data.segmentIDs] - The segment IDs.
     * @param {number} [data.flush_ts] - The flush timestamp.
     * @param {string} [data.db_name] - The database name.
     * @param {string} [data.collection_name] - The collection name.
     * @param {number} [data.timeout] - An optional duration of time in millisecond to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<GetFlushStateResponse>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {boolean} flushed - Whether the flush operation is completed.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const flushState = await milvusClient.getFlushState({
     *    segmentIDs: [1,2,3,4],
     *  });
     * ```
     */
    getFlushState(data: GetFlushStateReq): Promise<GetFlushStateResponse>;
    /**
     * Flushes all collections in the database. This is an asynchronous function.
     *
     * @param {FlushAllReq} [data] - The request parameters.
     * @param {string} [data.db_name] - The database name (optional).
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<FlushAllResponse>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {number} flush_all_ts - The flush all timestamp.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const res = await milvusClient.flushAll();
     * ```
     */
    flushAll(data?: FlushAllReq): Promise<FlushAllResponse>;
    /**
     * Flushes all collections synchronously, waiting until the flush operation is completed.
     *
     * @param {FlushAllReq} [data] - The request parameters.
     * @param {string} [data.db_name] - The database name (optional).
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<GetFlushAllStateResponse>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {boolean} flushed - Whether the flush operation is completed.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const res = await milvusClient.flushAllSync();
     * ```
     */
    flushAllSync(data?: FlushAllReq): Promise<GetFlushAllStateResponse>;
    /**
     * Get the flush all state.
     *
     * @param {GetFlushAllStateReq} data - The request parameters.
     * @param {Record<string, number>} [data.flush_all_tss] - The flush all timestamps.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<GetFlushAllStateResponse>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {boolean} flushed - Whether the flush operation is completed.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const res = await milvusClient.getFlushAllState({
     *    flush_all_tss: { db1: 123456789 },
     *  });
     * ```
     */
    getFlushAllState(data: GetFlushAllStateReq): Promise<GetFlushAllStateResponse>;
    /**
     * Perform a load balancing operation from a source query node to destination query nodes.
     * This function only works in a Milvus cluster.
     *
     * @param {LoadBalanceReq} data - The request parameters.
     * @param {number} data.src_nodeID - The source query node id to balance.
     * @param {number[]} [data.dst_nodeIDs] - The destination query node ids to balance (optional).
     * @param {number[]} [data.sealed_segmentIDs] - Sealed segment ids to balance (optional).
     * @param {string} [data.collectionName] - The collection name (optional).
     * @param {string} [data.db_name] - The database name (optional).
     * @param {number} [data.timeout] - An optional duration of time in millisecond to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {SegmentInfo[]} infos - Information about the segments.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const loadBalanceStatus = await milvusClient.loadBalance({
     *    src_nodeID: 31,
     *  });
     * ```
     */
    loadBalance(data: LoadBalanceReq): Promise<ResStatus>;
    /**
     * Notifies Proxy to return segments information from query nodes.
     *
     * @param {GetQuerySegmentInfoReq} data - The request parameters.
     * @param {string} data.collectionName - The name of the collection to get segments info.
     * @param {number} [data.timeout] - An optional duration of time in millisecond to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<GetQuerySegmentInfoResponse>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {QuerySegmentInfo[]} infos - The growing segments' information in query cluster.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const querySegmentInfo = await milvusClient.getQuerySegmentInfo({
     *    collectionName: 'my_collection',
     *  });
     * ```
     */
    getQuerySegmentInfo(data: GetQuerySegmentInfoReq): Promise<GetQuerySegmentInfoResponse>;
    /**
     * Notifies Proxy to return segments information from data nodes.
     *
     * @param {GetPersistentSegmentInfoReq} data - The request parameters.
     * @param {string} data.collectionName - The name of the collection to get segments info.
     * @param {number} [data.timeout] - An optional duration of time in millisecond to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<GetPersistentSegmentInfoResponse>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {PersistentSegmentInfo[]} infos - The growing segments' information in data cluster.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const persistentSegmentInfo = await milvusClient.getPersistentSegmentInfo({
     *    collectionName: 'my_collection',
     *  });
     * ```
     */
    getPersistentSegmentInfo(data: GePersistentSegmentInfoReq): Promise<GePersistentSegmentInfoResponse>;
    /**
     * Import data from files.
     *
     * @param {ImportReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection.
     * @param {string[]} data.files - Array of file paths.
     * @param {number} [data.timeout] - An optional duration of time in millisecond to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ImportResponse>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {string[]} tasks - Array of task IDs.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const importResponse = await milvusClient.bulkInsert({
     *    collection_name: 'my_collection',
     *    files: ['path-to-data-file.json'],
     *  });
     * ```
     */
    bulkInsert(data: ImportReq): Promise<ImportResponse>;
    /**
     * List import tasks.
     *
     * @param {ListImportTasksReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection.
     * @param {number} [data.limit] - Optional, maximum number of tasks returned, list all tasks if the value is 0.
     * @param {number} [data.timeout] - An optional duration of time in millisecond to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ListImportTasksResponse>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {string} state - Import state.
     * @returns {number} row_count - How many rows to import.
     * @returns {string[]} id_list - ID lists.
     * @returns {string} collection_id - Collection to be imported to.
     * @returns {string[]} tasks - TaskId array.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const listImportTasksResponse = await milvusClient.listImportTasks({
     *    collection_name: 'my_collection',
     *  });
     * ```
     */
    listImportTasks(data: ListImportTasksReq): Promise<ListImportTasksResponse>;
    /**
     * Get the state of an import task.
     *
     * @param {GetImportStateReq} data - The request parameters.
     * @param {number} data.task - The ID of the import task.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC.
     *
     * @returns {Promise<GetImportStateResponse>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {ImportState} state - The state of the import task.
     * @returns {number} row_count - How many rows have been imported/parsed.
     * @returns {number[]} id_list - Auto generated IDs if the primary key is autoID.
     * @returns {KeyValuePair[]} infos - Additional information (progress, file path, failed reason, etc.).
     * @returns {number} id - The ID of the import task.
     * @returns {number} collection_id - The collection ID of the import task.
     * @returns {number[]} segment_ids - Segment IDs created by the import task.
     * @returns {number} create_ts - Timestamp when the import task was created.
     *
     * @example
     * ```
     *  const milvusClient = new MilvusClient(MILVUS_ADDRESS);
     *  const res = await milvusClient.getImportState({ task: 123456 });
     * ```
     */
    getImportState(data: GetImportStateReq): Promise<GetImportStateResponse>;
}
