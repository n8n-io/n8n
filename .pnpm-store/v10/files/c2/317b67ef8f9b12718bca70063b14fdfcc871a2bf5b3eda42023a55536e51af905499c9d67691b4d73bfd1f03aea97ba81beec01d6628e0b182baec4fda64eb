import { HttpBaseClient } from '../HttpClient';
import { Constructor, FetchOptions, HttpBaseReq, HttpBaseResponse, HttpPartitionBaseReq, HttpPartitionListReq, HttpPartitionHasResponse, HttpPartitionStatisticsResponse } from '../types';
/**
 *
 * @param {Constructor<HttpBaseClient>} Base - The base class to be extended.
 * @returns {class} - The extended class with additional methods for collection management.
 *
 * @method listPartitions - Lists all partitions in a collection.
 * @method createPartition - Creates a new partition in a collection.
 * @method dropPartition - Deletes a partition from a collection.
 * @method loadPartitions - Loads partitions into memory.
 * @method releasePartitions - Releases partitions from memory.
 * @method hasPartition - Checks if a partition exists in a collection.
 * @method getPartitionStatistics - Retrieves statistics about a partition.
 */
export declare function Partition<T extends Constructor<HttpBaseClient>>(Base: T): {
    new (...args: any[]): {
        readonly partitionPrefix: string;
        listPartitions(params: HttpBaseReq, options?: FetchOptions): Promise<HttpBaseResponse<string[]>>;
        createPartition(params: HttpPartitionBaseReq, options?: FetchOptions): Promise<HttpBaseResponse<{}>>;
        dropPartition(params: HttpPartitionBaseReq, options?: FetchOptions): Promise<HttpBaseResponse<{}>>;
        loadPartitions(params: HttpPartitionListReq, options?: FetchOptions): Promise<HttpBaseResponse<{}>>;
        releasePartitions(params: HttpPartitionListReq, options?: FetchOptions): Promise<HttpBaseResponse<{}>>;
        hasPartition(params: HttpPartitionBaseReq, options?: FetchOptions): Promise<HttpPartitionHasResponse>;
        getPartitionStatistics(params: HttpPartitionBaseReq, options?: FetchOptions): Promise<HttpPartitionStatisticsResponse>;
        config: import("../types").HttpClientConfig;
        readonly baseURL: string;
        readonly authorization: string;
        readonly database: string;
        readonly timeout: number;
        readonly headers: {
            Authorization: string;
            Accept: string;
            ContentType: string;
            'Accept-Type-Allow-Int64': string;
        };
        readonly fetch: ((input: any, init?: any) => Promise<any>) | typeof fetch;
        POST<T>(url: string, data?: Record<string, any>, options?: FetchOptions | undefined): Promise<T>;
        GET<T_1>(url: string, params?: Record<string, any>, options?: FetchOptions | undefined): Promise<T_1>;
    };
} & T;
