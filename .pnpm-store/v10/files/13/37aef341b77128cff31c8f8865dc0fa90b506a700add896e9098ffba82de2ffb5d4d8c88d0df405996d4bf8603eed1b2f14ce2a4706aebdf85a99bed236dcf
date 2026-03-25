import { Index } from './MilvusIndex';
import { CreatePartitionReq, DropPartitionReq, GetPartitionStatisticsReq, HasPartitionReq, LoadPartitionsReq, ReleasePartitionsReq, ShowPartitionsReq, ResStatus, BoolResponse, ShowPartitionsResponse, StatisticsResponse } from '../';
export declare class Partition extends Index {
    /**
     * Create a partition in a collection.
     *
     * @param {Object} data - The data for the partition.
     * @param {string} data.collection_name - The name of the collection.
     * @param {string} data.partition_name - The name of the partition.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or an error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} A promise that resolves to the response status.
     * @returns {number} status.error_code - The error code.
     * @returns {string} status.reason - The error reason.
     *
     * @example
     * ```
     *  new milvusClient(MILUVS_ADDRESS).createPartition({
     *     collection_name: 'my_collection',
     *     partition_name: 'my_partition',
     *  });
     * ```
     */
    createPartition(data: CreatePartitionReq): Promise<ResStatus>;
    /**
     * Check if a partition exists in a collection.
     *
     * @param {Object} data - The data for the partition.
     * @param {string} data.collection_name - The name of the collection.
     * @param {string} data.partition_name - The name of the partition.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or an error occurs. Default is undefined.
     *
     * @returns {Promise<BoolResponse>} A promise that resolves to the response status.
     * @returns {number} status.error_code - The error code.
     * @returns {string} status.reason - The error reason.
     * @returns {boolean} value - `true` if the partition exists, `false` otherwise.
     *
     * @example
     * ```
     *  new milvusClient(MILUVS_ADDRESS).hasPartition({
     *     collection_name: 'my_collection',
     *     partition_name: 'my_partition',
     *  });
     * ```
     */
    hasPartition(data: HasPartitionReq): Promise<BoolResponse>;
    /**
     * Show all partitions in a collection.
     *
     * @param {Object} data - The data for the partition.
     * @param {string} data.collection_name - The name of the collection.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or an error occurs. Default is undefined.
     *
     * @returns {Promise<ShowPartitionsResponse>} A promise that resolves to the response status.
     * @returns {number} status.error_code - The error code.
     * @returns {string} status.reason - The error reason.
     * @returns {string[]} partition_names - An array of partition names.
     * @returns {number[]} partitionIDs - An array of partition IDs.
     *
     * @example
     * ```
     *  new milvusClient(MILUVS_ADDRESS).listPartitions({
     *     collection_name: 'my_collection',
     *  });
     * ```
     */
    listPartitions(data: ShowPartitionsReq): Promise<ShowPartitionsResponse>;
    showPartitions: (data: ShowPartitionsReq) => Promise<ShowPartitionsResponse>;
    /**
     * Show the statistics information of a partition.
     *
     * @param {Object} data - The data for the partition.
     * @param {string} data.collection_name - The name of the collection.
     * @param {string} data.partition_name - The name of the partition.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or an error occurs. Default is undefined.
     *
     * @returns {Promise<StatisticsResponse>} A promise that resolves to the response status.
     * @returns {number} status.error_code - The error code.
     * @returns {string} status.reason - The error reason.
     * @returns {{key: string, value: string}[]} stats - An array of key-value pairs.
     * @returns {Object} data - An object with a `row_count` property, transformed from **stats**.
     *
     * @example
     * ```
     *  new milvusClient(MILUVS_ADDRESS).getPartitionStatistics({
     *     collection_name: 'my_collection',
     *     partition_name: "_default",
     *  });
     * ```
     */
    getPartitionStatistics(data: GetPartitionStatisticsReq): Promise<StatisticsResponse>;
    getPartitionStats: (data: GetPartitionStatisticsReq) => Promise<StatisticsResponse>;
    /**
     * This method is used to load multiple partitions into query nodes.
     *
     * @param {Object} data - The data for the operation.
     * @param {string} data.collection_name - The name of the collection.
     * @param {string[]} data.partition_names - An array of partition names to be loaded.
     * @param {number} [data.replica_number] - The number of replicas. Optional.
     * @param {string[]} data.resource_groups - An array of resource group names.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or an error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} A promise that resolves to the response status.
     * @returns {number} status.error_code - The error code.
     * @returns {string} status.reason - The error reason.
     *
     * @example
     * ```
     *  new milvusClient(MILUVS_ADDRESS).loadPartitions({
     *     collection_name: 'my_collection',
     *     partition_names: ['my_partition'],
     *  });
     * ```
     */
    loadPartitions(data: LoadPartitionsReq): Promise<ResStatus>;
    /**
     * Loads partitions synchronously.
     *
     * @param data - The LoadPartitionsReq object containing the necessary data for loading partitions.
     * @returns A Promise that resolves to a ResStatus object representing the status of the operation.
     * @throws An error if the operation fails.
     */
    loadPartitionsSync(data: LoadPartitionsReq): Promise<ResStatus>;
    /**
     * This method is used to release a partition from cache. This operation is useful when you want to free up memory resources.
     *
     * @param {Object} data - The data for the operation.
     * @param {string} data.collection_name - The name of the collection from which the partition will be released.
     * @param {string[]} data.partition_names - An array of partition names to be released.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or an error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} A promise that resolves to the response status.
     * @returns {number} status.error_code - The error code. If the operation is successful, the error code will be 0.
     * @returns {string} status.reason - The error reason. If the operation is successful, the reason will be an empty string.
     *
     * @example
     * ```
     *  new milvusClient(MILUVS_ADDRESS).releasePartitions({
     *     collection_name: 'my_collection',
     *     partition_names: ['my_partition'],
     *  });
     * ```
     */
    releasePartitions(data: ReleasePartitionsReq): Promise<ResStatus>;
    /**
     * This method is used to drop a partition from a collection. Note that this operation will delete all data in the partition.
     * The default partition cannot be dropped.
     *
     * @param {Object} data - The data for the operation.
     * @param {string} data.collection_name - The name of the collection from which the partition will be dropped.
     * @param {string} data.partition_name - The name of the partition to be dropped.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or an error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} A promise that resolves to the response status.
     * @returns {number} status.error_code - The error code. If the operation is successful, the error code will be 0.
     * @returns {string} status.reason - The error reason. If the operation is successful, the reason will be an empty string.
     *
     * @example
     * ```
     *  new milvusClient(MILUVS_ADDRESS).dropPartition({
     *     collection_name: 'my_collection',
     *     partition_name: 'my_partition',
     *  });
     * ```
     */
    dropPartition(data: DropPartitionReq): Promise<ResStatus>;
}
