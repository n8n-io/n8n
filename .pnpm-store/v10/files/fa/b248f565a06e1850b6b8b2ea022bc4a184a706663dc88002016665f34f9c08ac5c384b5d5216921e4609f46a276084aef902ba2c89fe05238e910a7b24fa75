import { HttpBaseClient } from '../HttpClient';
import { Constructor, FetchOptions, HttpDatabaseAlterPropertiesReq, HttpDatabaseAlterPropertiesResponse, HttpDatabaseDropPropertiesReq, HttpDatabaseDropPropertiesResponse, HttpDatabaseCreateReq, HttpBaseResponse, HttpDatabaseDropReq, HttpDatabaseDescribeReq, HttpDatabaseDescribeResponse } from '../types';
/**
 * Database is a mixin function that extends the functionality of a base class.
 * It provides methods to interact with databases in a Milvus cluster.
 *
 * @param {Constructor<HttpBaseClient>} Base - The base class to be extended.
 * @returns {class} - The extended class with additional methods for database management.
 *
 * @method createDatabase - Creates a new database.
 * @method dropDatabase - Drops a database.
 * @method describeDatabase - Describes a database.
 * @method listDatabases - Lists all databases.
 * @method alterDatabaseProperties - Alters properties of a database.
 * @method dropDatabaseProperties - Drops properties of a database.
 */
export declare function Database<T extends Constructor<HttpBaseClient>>(Base: T): {
    new (...args: any[]): {
        readonly databasePrefix: string;
        createDatabase(params: HttpDatabaseCreateReq, options?: FetchOptions): Promise<HttpBaseResponse>;
        dropDatabase(params: HttpDatabaseDropReq, options?: FetchOptions): Promise<HttpBaseResponse>;
        describeDatabase(params: HttpDatabaseDescribeReq, options?: FetchOptions): Promise<HttpDatabaseDescribeResponse>;
        listDatabases(options?: FetchOptions): Promise<HttpBaseResponse<string[]>>;
        alterDatabaseProperties(params: HttpDatabaseAlterPropertiesReq, options?: FetchOptions): Promise<HttpDatabaseAlterPropertiesResponse>;
        dropDatabaseProperties(params: HttpDatabaseDropPropertiesReq, options?: FetchOptions): Promise<HttpDatabaseDropPropertiesResponse>;
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
