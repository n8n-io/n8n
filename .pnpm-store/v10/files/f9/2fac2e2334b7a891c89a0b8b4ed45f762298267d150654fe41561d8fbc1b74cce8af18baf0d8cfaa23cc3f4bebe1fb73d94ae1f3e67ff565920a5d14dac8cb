import { DeleteEntitiesReq, FlushReq, GetFlushStateReq, GetQuerySegmentInfoReq, GePersistentSegmentInfoReq, InsertReq, LoadBalanceReq, ImportReq, ListImportTasksReq, FlushResult, GetFlushStateResponse, GetMetricsResponse, GetQuerySegmentInfoResponse, GePersistentSegmentInfoResponse, MutationResult, QueryResults, ResStatus, SearchResults, ImportResponse, ListImportTasksResponse, GetMetricsRequest, QueryReq, GetReq, DeleteReq, SearchReq, SearchSimpleReq, SearchIteratorReq, HybridSearchReq, CountReq, CountResult, QueryIteratorReq } from '../';
import { Collection } from './Collection';
export declare class Data extends Collection {
    /**
     * Upsert data into Milvus, view _insert for detail
     */
    upsert(data: InsertReq): Promise<MutationResult>;
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
     * @param {SearchReq | SearchSimpleReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection.
     * @param {Number[]} data.vector - Original vector to search with.
     * @param {string[]} [data.partition_names] - Array of partition names (optional).
     * @param {number} [data.topk] - Topk (optional).
     * @param {number} [data.limit] - Alias for topk (optional).
     * @param {number} [data.offset] - Offset (optional).
     * @param {string} [data.filter] - Scalar field filter expression (optional).
     * @param {string[]} [data.output_fields] - Support scalar field (optional).
     * @param {object} [data.params] - Search params (optional).
     * @param {OutputTransformers} data.transformers - The transformers for bf16 or f16 data, it accept bytes or sparse dic vector, it can ouput f32 array or other format(optional)
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<SearchResults>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {{score:number,id:string, [outputfield]: value}[]} results - Array of search results.
     * @returns {number} session_ts - The timestamp of the search session.
     * @returns {string} collection_name - The name of the collection.
     * @returns {number} all_search_count - The total number of search operations.
     * @returns {string[]} recalls - The recalls of the search operation.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const searchResults = await milvusClient.search({
     *    collection_name: 'my_collection',
     *    vector: [1, 2, 3, 4],
     *  });
     * ```
     */
    search(params: SearchReq | SearchSimpleReq | HybridSearchReq): Promise<SearchResults>;
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
    hybridSearch: (params: SearchReq | SearchSimpleReq | HybridSearchReq) => Promise<SearchResults>;
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
     * Get the flush state of specified segment IDs in Milvus.
     *
     * @param {GetFlushStateReq} data - The request parameters.
     * @param {number[]} data.segmentIDs - The segment IDs.
     * @param {number} [data.timeout] - An optional duration of time in millisecond to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<GetFlushStateResponse>} The result of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {boolean[]} flushed - Array indicating whether each segment is flushed or not.
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
     * Perform a load balancing operation from a source query node to destination query nodes.
     * This function only works in a Milvus cluster.
     *
     * @param {LoadBalanceReq} data - The request parameters.
     * @param {number} data.src_nodeID - The source query node id to balance.
     * @param {number[]} [data.dst_nodeIDs] - The destination query node ids to balance (optional).
     * @param {number[]} [data.sealed_segmentIDs] - Sealed segment ids to balance (optional).
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
}
