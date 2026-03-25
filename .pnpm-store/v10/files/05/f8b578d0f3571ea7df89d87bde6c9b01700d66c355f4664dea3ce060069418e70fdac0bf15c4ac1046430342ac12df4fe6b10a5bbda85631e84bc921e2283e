import { HttpBaseClient } from '../HttpClient';
import { Constructor } from '../types/index';
import { HttpCollectionCreateReq, HttpCollectionListReq, HttpCollectionListResponse, HttpCollectionDescribeResponse, HttpBaseResponse, HttpBaseReq, FetchOptions, HttpCollectionRenameReq, HttpCollectionHasResponse, HttpCollectionStatisticsResponse, HttpCollectionLoadStateReq, HttpCollectionLoadStateResponse } from '../types';
/**
 * Collection is a mixin function that extends the functionality of a base class.
 * It provides methods to interact with collections in a Milvus cluster.
 *
 * @param {Constructor<HttpBaseClient>} Base - The base class to be extended.
 * @returns {class} - The extended class with additional methods for collection management.
 *
 * @method createCollection - Creates a new collection in Milvus.
 * @method describeCollection - Retrieves the description of a specific collection.
 * @method dropCollection - Deletes a specific collection from Milvus.
 * @method listCollections - Lists all collections in the Milvus cluster.
 * @method hasCollection - Checks if a collection exists in the Milvus cluster.
 * @method renameCollection - Renames a collection in the Milvus cluster.
 * @method getCollectionStatistics - Retrieves statistics about a collection.
 * @method loadCollection - Loads a collection into memory.
 * @method releaseCollection - Releases a collection from memory.
 * @method getCollectionLoadState - Retrieves the load state of a collection.
 */
export declare function Collection<T extends Constructor<HttpBaseClient>>(Base: T): {
    new (...args: any[]): {
        readonly collectionPrefix: string;
        createCollection(data: HttpCollectionCreateReq, options?: FetchOptions): Promise<HttpBaseResponse>;
        describeCollection(params: HttpBaseReq, options?: FetchOptions): Promise<HttpCollectionDescribeResponse>;
        dropCollection(data: HttpBaseReq, options?: FetchOptions): Promise<HttpBaseResponse>;
        listCollections(params?: HttpCollectionListReq, options?: FetchOptions): Promise<HttpCollectionListResponse>;
        hasCollection(params: Required<HttpBaseReq>, options?: FetchOptions): Promise<HttpCollectionHasResponse>;
        renameCollection(params: HttpCollectionRenameReq, options?: FetchOptions): Promise<HttpBaseResponse<{}>>;
        getCollectionStatistics(params: HttpBaseReq, options?: FetchOptions): Promise<HttpCollectionStatisticsResponse>;
        loadCollection(params: HttpBaseReq, options?: FetchOptions): Promise<HttpBaseResponse<{}>>;
        releaseCollection(params: HttpBaseReq, options?: FetchOptions): Promise<HttpBaseResponse<{}>>;
        getCollectionLoadState(params: HttpCollectionLoadStateReq, options?: FetchOptions): Promise<HttpCollectionLoadStateResponse>;
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
