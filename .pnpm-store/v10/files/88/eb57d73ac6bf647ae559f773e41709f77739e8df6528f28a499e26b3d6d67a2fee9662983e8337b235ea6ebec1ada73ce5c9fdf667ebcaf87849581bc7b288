import { Data } from './Data';
import { DescribeIndexReq, DropIndexReq, CreateIndexesReq, CreateIndexRequest, GetIndexBuildProgressReq, GetIndexStateReq, AlterIndexReq, DropIndexPropertiesReq, ResStatus, DescribeIndexResponse, GetIndexStateResponse, ListIndexResponse, GetIndexBuildProgressResponse } from '../';
export declare class Index extends Data {
    /**
     * Asynchronously creates an index on a field. Note that index building is an asynchronous process.
     *
     * @param {CreateIndexesReq | CreateIndexesReq[]} data - The data for creating the index. Can be an object or an array of objects.
     * @param {string} data.collection_name - The name of the collection.
     * @param {string} data.field_name - The name of the field.
     * @param {string} data.index_name - The name of the index. It must be unique within a collection.
     * @param {string} data.index_type - The type of the index.
     * @param {string} data.metric_type - The type of the metric.
     * @param {Object} data.params - The parameters for the index. For example, `{ nlist: number }`.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or an error occurs. Default is undefined.
     * @returns {Promise<ResStatus>} - A promise that resolves to a response status object.
     *
     * @example
     * ```
     * const milvusClient = new MilvusClient(MILUVS_ADDRESS);
     * const createIndexReq = {
     *   collection_name: 'my_collection',
     *   field_name: 'vector_01',
     *   index_name: 'my_index',
     *   index_type: 'IVF_FLAT',
     *   metric_type: 'IP',
     *   params: { nlist: 10 },
     * };
     * const res = await milvusClient.createIndex(createIndexReq);
     * console.log(res);
     *
     * // or
     * const createIndexesReq = [
     * {
     *   collection_name: 'my_collection',
     *   field_name: 'vector_01',
     *   index_name: 'my_index',
     *   index_type: 'IVF_FLAT',
     *   metric_type: 'IP',
     *   params: { nlist: 10 },
     * },
     * {
     *   collection_name: 'my_collection',
     *   field_name: 'int16',
     *   index_name: 'number_index',
     *   index_type: 'STL_SORT',
     * },
     * {
     *   collection_name: 'my_collection',
     *   field_name: 'varChar',
     *   index_name: 'varchar_index',
     *   index_type: 'TRIE',
     * },
     * ];
     * const res = await milvusClient.createIndex(createIndexReq);
     * console.log(res);
     * ```
     */
    createIndex(data: CreateIndexesReq): Promise<ResStatus>;
    _createIndex(data: CreateIndexRequest): Promise<ResStatus>;
    /**
     * Displays index information. The current release of Milvus only supports displaying the most recently built index.
     *
     * @param {Object} data - An object with the following properties:
     * @param {string} data.collection_name - The name of the collection.
     * @param {string} [data.field_name] - The name of the field (optional).
     * @param {string} [data.index_name] - The name of the index (optional).
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client will continue to wait until the server responds or an error occurs. The default is undefined.
     *
     * @returns {Promise<DescribeIndexResponse>} A Promise that resolves to an object with the following properties:
     * @returns {Object} return.status - An object with properties 'error_code' (number) and 'reason' (string).
     * @returns {Array<Object>} return.index_descriptions - Information about the index.
     *
     * @example
     * ```
     * const milvusClient = new MilvusClient(MILUVS_ADDRESS);
     * const describeIndexReq = {
     *   collection_name: 'my_collection',
     * };
     * const res = await milvusClient.describeIndex(describeIndexReq);
     * console.log(res);
     * ```
     */
    describeIndex(data: DescribeIndexReq): Promise<DescribeIndexResponse>;
    /**
     * Retrieves a list of index names for a given collection. The current release of Milvus only supports listing indexes for the most recently built index.
     *
     * @param {Object} data - An object with the following properties:
     * @param {string} data.collection_name - The name of the collection.
     * @param {string} [data.field_name] - The name of the field (optional).
     * @param {string} [data.index_name] - The name of the index (optional).
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client will continue to wait until the server responds or an error occurs. The default is undefined.
     *
     * @returns {Promise<ListIndexResponse>} A Promise that resolves to an array of strings representing the names of indexes associated with the specified collection.
     * @returns {Object} return.status - An object with properties 'error_code' (number) and 'reason' (string).
     * @returns {Array<string>} return.string - index names
     *
     * @example
     * ```
     * const milvusClient = new MilvusClient(MILUVS_ADDRESS);
     * const listIndexReq = {
     *   collection_name: 'my_collection',
     * };
     * const indexNames = await milvusClient.listIndex(listIndexReq);
     * console.log(indexNames);
     * ```
     */
    listIndexes(data: DescribeIndexReq): Promise<ListIndexResponse>;
    /**
     * Get the index building state.
     * @deprecated
     *
     * @param {Object} data - An object with the following properties:
     * @param {string} data.collection_name - The name of the collection for which the index state is to be retrieved.
     * @param {string} [data.field_name] - The name of the field for which the index state is to be retrieved.
     * @param {string} [data.index_name] - The name of the index for which the state is to be retrieved.
     *
     * @returns {Promise<GetIndexStateResponse>} A Promise that resolves to an object with the following properties:
     * @returns {Object} return.status - An object with properties 'error_code' (number) and 'reason' (string) indicating the status of the request.
     * @returns {string} return.state - The state of the index building process.
     *
     * @example
     * ```
     * const milvusClient = new MilvusClient(MILUVS_ADDRESS);
     * const getIndexStateReq = {
     *   collection_name: 'my_collection',
     *   index_name: 'my_index',
     * };
     * const res = await milvusClient.getIndexState(getIndexStateReq);
     * console.log(res);
     * ```
     */
    getIndexState(data: GetIndexStateReq): Promise<GetIndexStateResponse>;
    /**
     * Get index building progress.
     *
     * @param {Object} data - The data for retrieving the index building progress.
     * @param {string} data.collection_name - The name of the collection.
     * @param {string} [data.field_name] - The name of the field for which the index building progress is to be retrieved.
     * @param {string} [data.index_name] - The name of the index for which the building progress is to be retrieved.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<Object>} A promise that resolves to an object with properties 'status', 'indexed_rows', and 'total_rows'.
     * @returns {Object} return.status - An object with properties 'error_code' (number) and 'reason' (string) indicating the status of the request.
     * @returns {number} return.indexed_rows - The number of rows that have been successfully indexed.
     * @returns {number} return.total_rows - The total number of rows.
     *
     * @example
     * ```
     * const milvusClient = new MilvusClient(MILUVS_ADDRESS);
     * const getIndexBuildProgressReq = {
     *   collection_name: 'my_collection',
     *   index_name: 'my_index',
     * };
     * const res = await milvusClient.getIndexBuildProgress(getIndexBuildProgressReq);
     * console.log(res);
     * ```
     */
    getIndexBuildProgress(data: GetIndexBuildProgressReq): Promise<GetIndexBuildProgressResponse>;
    /**
     * Drop an index.
     *
     * @param {Object} data - The data for dropping the index.
     * @param {string} data.collection_name - The name of the collection.
     * @param {string} [data.field_name] - The name of the field for which the index is to be dropped.
     * @param {string} [data.index_name] - The name of the index to be dropped.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<Object>} A promise that resolves to an object with properties 'error_code' and 'reason'.
     * @returns {number} return.error_code - The error code number.
     * @returns {string} return.reason - The cause of the error.
     *
     * @example
     * ```
     * const milvusClient = new MilvusClient(MILUVS_ADDRESS);
     * const dropIndexReq = {
     *   collection_name: 'my_collection',
     *   index_name: 'my_index',
     * };
     * const res = await milvusClient.dropIndex(dropIndexReq);
     * console.log(res);
     * ```
     */
    dropIndex(data: DropIndexReq): Promise<ResStatus>;
    /**
     * Alters an existing index.
     *
     * @param {Object} data - The data for altering the index.
     * @param {string} data.collection_name - The name of the collection.
     * @param {Object} data.params - The new parameters for the index. For example, `{ nlist: number }`.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or an error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} - A promise that resolves to a response status object.
     * @returns {number} return.error_code - The error code number.
     * @returns {string} return.reason - The cause of the error.
     *
     * @example
     * ```
     * const milvusClient = new MilvusClient(MILUVS_ADDRESS);
     * const alterIndexReq = {
     *   collection_name: 'my_collection',
     *   params: { nlist: 20 },
     * };
     * const res = await milvusClient.alterIndex(alterIndexReq);
     * console.log(res);
     * ```
     */
    alterIndexProperties(data: AlterIndexReq): Promise<ResStatus>;
    /**
     * @deprecated
     */
    alterIndex: (data: AlterIndexReq) => Promise<ResStatus>;
    /**
     * Drop index properties.
     * @param {DropIndexPropertiesReq} data - The data for dropping the index properties.
     * @param {string} data.collection_name - The name of the collection.
     * @param {string} data.index_name - The name of the index.
     * @param {string[]} data.properties - The properties to be dropped.
     * @param {string} [data.db_name] - The name of the database.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or an error occurs. Default is undefined.
     * @returns {Promise<ResStatus>} - A promise that resolves to a response status object.
     *
     * @example
     * ```
     * const milvusClient = new MilvusClient(MILUVS_ADDRESS);
     * const dropIndexPropertiesReq = {
     *  collection_name: 'my_collection',
     *  index_name: 'my_index',
     *  properties: ['mmap.enabled'],
     * };
     * const res = await milvusClient.dropIndexProperties(dropIndexPropertiesReq);
     * console.log(res);
     * ```
     */
    dropIndexProperties(data: DropIndexPropertiesReq): Promise<ResStatus>;
}
