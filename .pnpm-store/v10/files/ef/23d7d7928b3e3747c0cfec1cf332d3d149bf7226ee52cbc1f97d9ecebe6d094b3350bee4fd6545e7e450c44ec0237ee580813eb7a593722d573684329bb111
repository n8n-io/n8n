import { HttpBaseClient } from '../HttpClient';
import { Constructor, HttpVectorGetReq, HttpVectorInsertReq, HttpVectorInsertResponse, HttpVectorQueryReq, HttpVectorQueryResponse, HttpVectorSearchReq, HttpVectorDeleteReq, HttpVectorSearchResponse, HttpBaseResponse, FetchOptions, HttpVectorUpsertResponse, HttpVectorHybridSearchReq } from '../types';
/**
 * Vector is a mixin function that extends the functionality of a base class.
 * It provides methods to interact with vectors in a Milvus cluster.
 *
 * @param {Constructor<HttpBaseClient>} Base - The base class to be extended.
 * @returns {class} - The extended class with additional methods for vector management.
 *
 * @method get - Retrieves a specific vector from Milvus.
 * @method insert - Inserts a new vector into Milvus.
 * @method upsert - Inserts a new vector into Milvus, or updates it if it already exists.
 * @method query - Queries for vectors in Milvus.
 * @method search - Searches for vectors in Milvus.
 * @method delete - Deletes a specific vector from Milvus.
 */
export declare function Vector<T extends Constructor<HttpBaseClient>>(Base: T): {
    new (...args: any[]): {
        readonly vectorPrefix: string;
        get(params: HttpVectorGetReq, options?: FetchOptions): Promise<HttpVectorQueryResponse>;
        insert(data: HttpVectorInsertReq, options?: FetchOptions): Promise<HttpVectorInsertResponse>;
        upsert(data: HttpVectorInsertReq, options?: FetchOptions): Promise<HttpVectorUpsertResponse>;
        query(data: HttpVectorQueryReq, options?: FetchOptions): Promise<HttpVectorQueryResponse>;
        search(data: HttpVectorSearchReq, options?: FetchOptions): Promise<HttpVectorSearchResponse>;
        hybridSearch(data: HttpVectorHybridSearchReq, options?: FetchOptions): Promise<HttpVectorSearchResponse>;
        delete(data: HttpVectorDeleteReq, options?: FetchOptions): Promise<HttpBaseResponse>;
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
