import { HttpBaseClient } from '../HttpClient';
import { Constructor } from '../types/index';
import { HttpCollectionCreateReq, HttpCollectionListReq, HttpCollectionListResponse, HttpCollectionDescribeResponse, HttpBaseResponse, HttpBaseReq, FetchOptions, HttpCollectionRenameReq, HttpCollectionHasResponse, HttpCollectionStatisticsResponse, HttpCollectionFlushResponse, HttpCollectionLoadStateReq, HttpCollectionLoadStateResponse, HttpCollectionAddFieldReq, HttpCollectionAddFieldResponse, HttpCollectionAlterPropertiesReq, HttpCollectionAlterPropertiesResponse, HttpCollectionAlterFieldPropertiesReq, HttpCollectionAlterFieldPropertiesResponse, HttpCollectionDropPropertiesReq, HttpCollectionDropPropertiesResponse, HttpCollectionCompactReq, HttpCollectionCompactResponse, HttpCollectionGetCompactionStateReq, HttpCollectionGetCompactionStateResponse, HttpCollectionRefreshLoadReq } from '../types';
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
        addCollectionField(params: HttpCollectionAddFieldReq, options?: FetchOptions): Promise<HttpCollectionAddFieldResponse>;
        alterCollectionProperties(params: HttpCollectionAlterPropertiesReq, options?: FetchOptions): Promise<HttpCollectionAlterPropertiesResponse>;
        alterCollectionFieldProperties(params: HttpCollectionAlterFieldPropertiesReq, options?: FetchOptions): Promise<HttpCollectionAlterFieldPropertiesResponse>;
        dropCollectionProperties(params: HttpCollectionDropPropertiesReq, options?: FetchOptions): Promise<HttpCollectionDropPropertiesResponse>;
        listCollections(params?: HttpCollectionListReq, options?: FetchOptions): Promise<HttpCollectionListResponse>;
        hasCollection(params: Required<HttpBaseReq>, options?: FetchOptions): Promise<HttpCollectionHasResponse>;
        renameCollection(params: HttpCollectionRenameReq, options?: FetchOptions): Promise<HttpBaseResponse<{}>>;
        getCollectionStatistics(params: HttpBaseReq, options?: FetchOptions): Promise<HttpCollectionStatisticsResponse>;
        flushCollection(params: HttpBaseReq, options?: FetchOptions): Promise<HttpCollectionFlushResponse>;
        loadCollection(params: HttpBaseReq, options?: FetchOptions): Promise<HttpBaseResponse<{}>>;
        releaseCollection(params: HttpBaseReq, options?: FetchOptions): Promise<HttpBaseResponse<{}>>;
        getCollectionLoadState(params: HttpCollectionLoadStateReq, options?: FetchOptions): Promise<HttpCollectionLoadStateResponse>;
        compactCollection(params: HttpCollectionCompactReq, options?: FetchOptions): Promise<HttpCollectionCompactResponse>;
        getCompactionState(params: HttpCollectionGetCompactionStateReq, options?: FetchOptions): Promise<HttpCollectionGetCompactionStateResponse>;
        refreshLoad(params: HttpCollectionRefreshLoadReq, options?: FetchOptions): Promise<HttpBaseResponse<{}>>;
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
        readonly fetch: typeof fetch | ((input: any, init?: any) => Promise<any>);
        _handleResponse<T>(response: Response, url: string): Promise<T>;
        POST<T_1>(url: string, data?: Record<string, any>, options?: FetchOptions | undefined): Promise<T_1>;
        GET<T_2>(url: string, params?: Record<string, any>, options?: FetchOptions | undefined): Promise<T_2>;
    };
} & T;
