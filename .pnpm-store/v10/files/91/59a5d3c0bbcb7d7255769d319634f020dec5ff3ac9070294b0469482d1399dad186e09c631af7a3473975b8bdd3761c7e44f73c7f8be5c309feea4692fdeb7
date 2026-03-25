import { HttpBaseClient } from '../HttpClient';
import { Constructor, FetchOptions, HttpBaseReq, HttpBaseResponse, HttpIndexCreateReq, HttpIndexBaseReq, HttpIndexDescribeResponse } from '../types';
/**
 *
 * @param {Constructor<HttpBaseClient>} Base - The base class to be extended.
 * @returns {class} - The extended class with additional methods for collection management.
 *
 *@method createIndex - Creates an index.
 *@method dropIndex - Deletes an index.
 *@method describeIndex - Describes an index.
 *@method listIndexes - Lists all indexes.
 */
export declare function MilvusIndex<T extends Constructor<HttpBaseClient>>(Base: T): {
    new (...args: any[]): {
        readonly indexPrefix: string;
        createIndex(params: HttpIndexCreateReq, options?: FetchOptions): Promise<HttpBaseResponse<{}>>;
        dropIndex(params: HttpIndexBaseReq, options?: FetchOptions): Promise<HttpBaseResponse<{}>>;
        describeIndex(params: HttpIndexBaseReq, options?: FetchOptions): Promise<HttpIndexDescribeResponse>;
        listIndexes(params: HttpBaseReq, options?: FetchOptions): Promise<HttpBaseResponse<string[]>>;
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
