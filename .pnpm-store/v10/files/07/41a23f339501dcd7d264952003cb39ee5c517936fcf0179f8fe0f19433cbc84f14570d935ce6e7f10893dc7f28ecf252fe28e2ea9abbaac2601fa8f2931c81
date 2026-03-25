import { Database } from './Database';
import { LRUCache } from 'lru-cache';
import { CreateCollectionReq, DescribeCollectionReq, DropCollectionReq, GetCollectionStatisticsReq, LoadCollectionReq, ReleaseLoadCollectionReq, ShowCollectionsReq, HasCollectionReq, CreateAliasReq, DescribeAliasReq, ListAliasesReq, DropAliasReq, AlterAliasReq, CompactReq, GetCompactionStateReq, GetCompactionPlansReq, GetReplicaReq, RenameCollectionReq, GetLoadingProgressReq, GetLoadStateReq, BoolResponse, ResStatus, CompactionResponse, DescribeCollectionResponse, GetCompactionPlansResponse, GetCompactionStateResponse, ShowCollectionsResponse, StatisticsResponse, ReplicasResponse, GetLoadingProgressResponse, GetLoadStateResponse, DescribeAliasResponse, ListAliasesResponse, AlterCollectionReq, DataType, FieldSchema, DropCollectionPropertiesReq, AlterCollectionFieldPropertiesReq, RefreshLoadReq } from '../';
/**
 * @see [collection operation examples](https://github.com/milvus-io/milvus-sdk-node/blob/main/example/Collection.ts)
 */
export declare class Collection extends Database {
    protected collectionInfoCache: LRUCache<string, DescribeCollectionResponse, unknown>;
    /**
     * Creates a new collection in Milvus.
     *
     * @param {CreateCollectionReq} data - The data for the new collection.
     * @param {string} data.collection_name - The name of the new collection.
     * @param {string} [data.description] - The description of the new collection.
     * @param {number} [data.num_partitions] - The number of partitions allowed in the new collection.
     * @param {string} [data.consistency_level] - The consistency level of the new collection. Can be "Strong" (Milvus default), "Session", "Bounded", "Eventually", or "Customized".
     * @param {FieldType[]} data.fields - The fields of the new collection. See [FieldType](https://github.com/milvus-io/milvus-sdk-node/blob/main/milvus/types/Collection.ts#L8) for more details.
     * @param {properties} [data.properties] - An optional object containing key-value pairs of properties for the collection.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.createCollection({
     *    collection_name: 'my_collection',
     *    fields: [
     *      {
     *        name: "vector_01",
     *        description: "vector field",
     *        data_type: DataType.FloatVect,
     *        type_params: {
     *          dim: "8"
     *        }
     *      },
     *      {
     *        name: "age",
     *        data_type: DataType.Int64,
     *        autoID: true,
     *        is_primary_key: true,
     *        description: "",
     *      },
     *    ],
     *  });
     * ```
     */
    _createCollection(data: CreateCollectionReq): Promise<ResStatus>;
    /**
     * Checks if a collection exists.
     *
     * @param {HasCollectionReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection to check.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<BoolResponse>} The response from the server.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {boolean} value - `true` if the collection exists, `false` otherwise.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const res = await milvusClient.hasCollection({ collection_name: 'my_collection' });
     * ```
     */
    hasCollection(data: HasCollectionReq): Promise<BoolResponse>;
    /**
     * Lists all collections or gets the loading status of a collection.
     *
     * @param {ShowCollectionsReq} data - The request parameters.
     * @param {ShowCollectionsType} [data.type] - The type of collections to show. Can be "All" (default) or "Loaded".
     * @param {string[]} [data.collection_names] - If `type` is "Loaded", Milvus will return `collection_names` along with their in-memory percentages.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ShowCollectionsResponse>} The response from the server.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {CollectionData[]} data - An array containing information about each collection, including its name, ID, creation timestamp (UTC), and loaded percentage (100 means fully loaded).
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const res = await milvusClient.showCollections();
     * ```
     */
    showCollections(data?: ShowCollectionsReq): Promise<ShowCollectionsResponse>;
    /**
     * Modifies collection properties.
     *
     * @param {AlterCollectionReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection to modify.
     * @param {Object} data.properties - The properties to modify. For example, to change the TTL, use {"collection.ttl.seconds": 18000}.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.alterCollection({
     *    collection_name: 'my-collection',
     *    properties: {"collection.ttl.seconds": 18000}
     *  });
     * ```
     */
    alterCollectionProperties(data: AlterCollectionReq): Promise<ResStatus>;
    /**
     * @deprecated Use alterCollectionProperties instead.
     */
    alterCollection: (data: AlterCollectionReq) => Promise<ResStatus>;
    /**
     * Drops collection properties.
     * Note that this operation only deletes the properties of the collection, not the collection itself.
     * If you want to delete the collection, use the dropCollection method.
     *
     * @param {DropCollectionPropertiesReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection to modify.
     * @param {string[]} data.properties - The properties to delete. For example, to delete the TTL, use ["collection.ttl.seconds"].
     * @param {string} [data.db_name] - The name of the database where the collection is located.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     * const milvusClient = new milvusClient(MILUVS_ADDRESS);
     * const resStatus = await milvusClient.dropCollectionProperties({
     *  collection_name: 'my-collection',
     *  delete_keys: ["collection.ttl.seconds"]
     * });
     * ```
     *
     */
    dropCollectionProperties(data: DropCollectionPropertiesReq): Promise<ResStatus>;
    /**
     * Modifies a collection field's properties.
     * Note that this operation only modifies the properties of the field, not the field itself.
     *
     * @param {AlterCollectionFieldPropertiesReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection to modify.
     * @param {string} data.field_name - The name of the field to modify.
     * @param {Object} data.properties - The properties to modify. For example, to change field mmap setting and max_length, use { 'mmap.enabled', true, max_length: 128}.
     * @param {string} [data.db_name] - The name of the database where the collection is located.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     * const milvusClient = new milvusClient(MILUVS_ADDRESS);
     * const resStatus = await milvusClient.alterCollectionField({
     *   collection_name: 'my-collection',
     *   field_name: 'my-field',
     *   properties: {"mmap.enabled": true}
     * });
     * ```
     */
    alterCollectionFieldProperties(data: AlterCollectionFieldPropertiesReq): Promise<ResStatus>;
    list_collections: (data?: ShowCollectionsReq) => Promise<ShowCollectionsResponse>;
    listCollections: (data?: ShowCollectionsReq) => Promise<ShowCollectionsResponse>;
    /**
     * Shows the details of a collection, such as its name and schema.
     *
     * @param {DescribeCollectionReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection to describe.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<DescribeCollectionResponse>} The response from the server.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {FieldSchema[]} schema - Information of all fields in this collection.
     * @returns {string} collectionID - The ID of the collection.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const res = await milvusClient.describeCollection({ collection_name: 'my_collection' });
     * ```
     */
    describeCollection(data: DescribeCollectionReq): Promise<DescribeCollectionResponse>;
    /**
     * Show the statistics information of a collection.
     *
     * @param {GetCollectionStatisticsReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection to get statistics for.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<StatisticsResponse>} The response from the server.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {Object[]} stats - An array of objects, each containing a key-value pair representing a statistic.
     * @returns {Object} data - Transforms **stats** to an object with properties representing statistics (e.g., { row_count: 0 }).
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const res = await milvusClient.getCollectionStatistics({ collection_name: 'my_collection' });
     * ```
     */
    getCollectionStatistics(data: GetCollectionStatisticsReq): Promise<StatisticsResponse>;
    getCollectionStats: (data: GetCollectionStatisticsReq) => Promise<StatisticsResponse>;
    /**
     * Load collection data into query nodes, then you can do vector search on this collection.
     * It's an async function, but you can use showCollections to check loading status.
     *
     * @param {LoadCollectionReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection to load.
     * @param {number} [data.replica_number] - The number of replicas.
     * @param {string[]} [data.resource_groups] - The names of the resource groups.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.loadCollection({ collection_name: 'my_collection' });
     * ```
     */
    loadCollectionAsync(data: LoadCollectionReq): Promise<ResStatus>;
    /**
     * Refresh the loading status of a collection.
     *
     * @param {RefreshLoadReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection to refresh.
     * @param {string} [data.db_name] - The name of the database where the collection is located.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.refreshLoad({ collection_name: 'my_collection' });
     * ```
     */
    refreshLoad(data: RefreshLoadReq): Promise<ResStatus>;
    /**
     * Same function as loadCollection, but it's a synchronous function.
     * Helps to ensure this collection is loaded.
     *
     * @param {LoadCollectionReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection to load.
     * @param {number} [data.replica_number] - The number of replicas.
     * @param {string[]} [data.resource_groups] - The names of the resource groups.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.loadCollectionSync({ collection_name: 'my_collection' });
     * ```
     */
    loadCollection(data: LoadCollectionReq): Promise<ResStatus>;
    loadCollectionSync: (data: LoadCollectionReq) => Promise<ResStatus>;
    /**
     * Release a collection from cache to reduce cache usage.
     * Note that you cannot search while the corresponding collection is unloaded.
     *
     * @param {ReleaseLoadCollectionReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection to release.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.releaseCollection({ collection_name: 'my_collection' });
     * ```
     */
    releaseCollection(data: ReleaseLoadCollectionReq): Promise<ResStatus>;
    /**
     * Rename a collection.
     *
     * @param {RenameCollectionReq} data - The request parameters.
     * @param {string} data.collection_name - The current name of the collection.
     * @param {string} data.new_collection_name - The new name for the collection.
     * @param {string} data.db_name - Optional, the name of the database where the collection is located.
     * @param {string} data.new_db_name - Optional, the name of the database where the new collection will be located.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.renameCollection({
     *    collection_name: 'my_collection',
     *    new_collection_name: 'my_new_collection'
     *  });
     * ```
     */
    renameCollection(data: RenameCollectionReq): Promise<ResStatus>;
    /**
     * Drop a collection. Note that this drops all data in the collection.
     *
     * @param {DropCollectionReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection to drop.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.dropCollection({ collection_name: 'my_collection' });
     * ```
     */
    dropCollection(data: DropCollectionReq): Promise<ResStatus>;
    drop_collection: (data: DropCollectionReq) => Promise<ResStatus>;
    /**
     * Create a collection alias, then you can use the alias instead of the collection_name when you perform a vector search.
     *
     * @param {CreateAliasReq} data - The request parameters.
     * @param {string} data.alias - The alias name.
     * @param {string} data.collection_name - The name of the collection.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.createAlias({
     *    alias: 'my_collection_alias',
     *    collection_name: 'my_collection',
     *  });
     * ```
     */
    createAlias(data: CreateAliasReq): Promise<ResStatus>;
    /**
     * Describe a collection alias.
     *
     * @param {DescribeAliasReq} data - The request parameters.
     * @param {string} data.alias - The alias name.
     * @param {string} data.collection_name - The name of the collection.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<DescribeAliasResponse>} The response from the server.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {string} collection - The name of the collection that the alias points to.
     * @returns {string} alias - The alias of the collection.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const res = await milvusClient.describeAlias({
     *    alias: 'my_collection_alias',
     *    collection_name: 'my_collection',
     *  });
     * ```
     */
    describeAlias(data: DescribeAliasReq): Promise<DescribeAliasResponse>;
    /**
     * List all aliases of a collection.
     *
     * @param {ListAliasesReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ListAliasesResponse>} The response from the server.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {string[]} aliases - The list of aliases of the collection.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const res = await milvusClient.listAliases({
     *    collection_name: 'my_collection',
     *  });
     * ```
     */
    listAliases(data: ListAliasesReq): Promise<ListAliasesResponse>;
    /**
     * Drop a collection alias.
     *
     * @param {DropAliasReq} data - The request parameters.
     * @param {string} data.alias - The alias name.
     * @param {string} data.collection_name - The name of the collection.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.dropAlias({
     *    alias: 'my_collection_alias',
     *    collection_name: 'my_collection',
     *  });
     * ```
     */
    dropAlias(data: DropAliasReq): Promise<ResStatus>;
    /**
     * Alter a collection alias.
     *
     * @param {AlterAliasReq} data - The request parameters.
     * @param {string} data.alias - The alias name.
     * @param {string} data.collection_name - The name of the collection.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.alterAlias({
     *    alias: 'my_collection_alias',
     *    collection_name: 'my_collection',
     *  });
     * ```
     */
    alterAlias(data: AlterAliasReq): Promise<ResStatus>;
    /**
     * Perform compaction on a collection. This operation reduces the storage space used by the collection by removing deleted data and optimizing the data layout.
     *
     * @param {CompactReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection to compact.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<CompactionResponse>} The response of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {string} compactionID - The ID of the compaction operation.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.compact({
     *    collection_name: 'my_collection',
     *  });
     * ```
     */
    compact(data: CompactReq): Promise<CompactionResponse>;
    /**
     * Get the compaction state of a targeted compaction id.
     *
     * @param {GetCompactionStateReq} data - The request parameters.
     * @param {number|string} data.compactionID - The ID of the compaction operation, returned by the compact method.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<GetCompactionStateResponse>} The response of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {string} state - The state of the compaction operation.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.getCompactionState({
     *    compactionID: 'your_compaction_id',
     *  });
     * ```
     */
    getCompactionState(data: GetCompactionStateReq): Promise<GetCompactionStateResponse>;
    /**
     * Get the compaction states of a targeted compaction id.
     *
     * @param {GetCompactionPlansReq} data - The request parameters.
     * @param {number|string} data.compactionID - The ID of the compaction operation, returned by the compact method.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<GetCompactionPlansResponse>} The response of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {string} state - The state of the compaction operation.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.getCompactionStateWithPlans({
     *    compactionID: 'your_compaction_id',
     *  });
     * ```
     */
    getCompactionStateWithPlans(data: GetCompactionPlansReq): Promise<GetCompactionPlansResponse>;
    /**
     * Get replicas of a collection.
     *
     * @param {GetReplicaReq} data - The request parameters.
     * @param {number|string} data.collectionID - The ID of the collection, returned by the compact method.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ReplicasResponse>} The response of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {ReplicaInfo[]} replicas - An array of replica information.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.getReplicas({
     *    collectionID: 'your_collection_id',
     *  });
     * ```
     *
     * @returns
     * ```
     * {
     *  replicas: [
     *     {
     *      partition_ids: [Array],
     *      shard_replicas: [Array],
     *      node_ids: [Array],
     *      replicaID: '436724291187770258',
     *      collectionID: '436777253933154305'
     *    }
     *  ],
     *  status: { error_code: 'Success', reason: '' }
     * }
     * ```
     */
    getReplicas(data: GetReplicaReq): Promise<ReplicasResponse>;
    describeReplicas: (data: GetReplicaReq) => Promise<ReplicasResponse>;
    /**
     * Get the loading progress of a collection.
     *
     * @param {GetLoadingProgressReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<GetLoadingProgressResponse>} The response of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {number} total_row_num - The total number of rows in the collection.
     * @returns {number} total_loaded_row_num - The total number of loaded rows in the collection.
     *
     * @throws {Error} if `collection_name` property is not present in `data`.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.getLoadingProgress({
     *    collection_name: 'my_collection',
     *  });
     * ```
     */
    getLoadingProgress(data: GetLoadingProgressReq): Promise<GetLoadingProgressResponse>;
    /**
     * Get the loading state of a collection.
     *
     * @param {GetLoadStateReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<GetLoadStateResponse>} The response of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     * @returns {string} state - The loading state of the collection.
     *
     * @throws {Error} if `collection_name` property is not present in `data`.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.getLoadState({
     *    collection_name: 'my_collection',
     *  });
     * ```
     */
    getLoadState(data: GetLoadStateReq): Promise<GetLoadStateResponse>;
    /**
     * Get the primary key field name of a collection.
     *
     * @param {DescribeCollectionReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<string>} The primary key field name of the collection.
     *
     * @throws {Error} if `collection_name` property is not present in `data`.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const pkFieldName = await milvusClient.getPkFieldName({
     *    collection_name: 'my_collection',
     *  });
     * ```
     */
    getPkFieldName(data: DescribeCollectionReq, desc?: DescribeCollectionResponse): Promise<string>;
    /**
     * Get the primary key field type.
     *
     * @param {DescribeCollectionReq} data - The request parameters.
     * @param {string} data.collection_name - The name of the collection.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<keyof typeof DataType>} The primary key field type.
     *
     * @throws {Error} if `collection_name` property is not present in `data`.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const pkFieldType = await milvusClient.getPkFieldType({
     *    collection_name: 'my_collection',
     *  });
     * ```
     */
    getPkFieldType(data: DescribeCollectionReq, desc?: DescribeCollectionResponse): Promise<keyof typeof DataType>;
    /**
     * Get the primary field
     */
    getPkField(data: DescribeCollectionReq): Promise<FieldSchema>;
}
