import { HttpBaseClient } from '../HttpClient';
import { Constructor, FetchOptions, HttpAliasBaseReq, HttpBaseResponse, HttpAliasCreateReq, HttpAliasAlterReq, HttpAliasDescribeReq, HttpAliasDropReq, HttpAliasDescribeResponse } from '../types';
/**
 *
 * @param {Constructor<HttpBaseClient>} Base - The base class to be extended.
 * @returns {class} - The extended class with additional methods for collection management.
 *
 * @method listAliases - Lists all aliases in a collection.
 * @method createAlias - Creates a new alias in a collection.
 * @method describeAlias - Describes an alias.
 * @method dropAlias - Deletes an alias.
 * @method alterAlias - Modifies an alias to another collection.
 */
export declare function Alias<T extends Constructor<HttpBaseClient>>(Base: T): {
    new (...args: any[]): {
        readonly aliasPrefix: string;
        listAliases(params: HttpAliasBaseReq, options?: FetchOptions): Promise<HttpBaseResponse<string[]>>;
        createAlias(params: HttpAliasCreateReq, options?: FetchOptions): Promise<HttpBaseResponse<{}>>;
        describeAlias(params: HttpAliasDescribeReq, options?: FetchOptions): Promise<HttpAliasDescribeResponse>;
        dropAlias(params: HttpAliasDropReq, options?: FetchOptions): Promise<HttpBaseResponse<{}>>;
        alterAlias(params: HttpAliasAlterReq, options?: FetchOptions): Promise<HttpBaseResponse<{}>>;
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
