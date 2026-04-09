import { HttpClientConfig, FetchOptions } from './types';
/**
 * HttpError is a custom error class for HTTP-related errors.
 * It extends the standard Error class and includes HTTP status information.
 */
export declare class HttpError extends Error {
    status: number;
    statusText: string;
    url: string;
    constructor(message: string, status: number, statusText: string, url: string);
}
/**
 * HttpBaseClient is a base class for making HTTP requests to a Milvus server.
 * It provides basic functionality for making GET and POST requests, and handles
 * configuration, headers, and timeouts.
 *
 * The HttpClientConfig object should contain the following properties:
 * - endpoint: The URL of the Milvus server.
 * - username: (Optional) The username for authentication.
 * - password: (Optional) The password for authentication.
 * - token: (Optional) The token for authentication.
 * - fetch: (Optional) An alternative fetch API implementation, e.g., node-fetch for Node.js environments.
 * - baseURL: (Optional) The base URL for the API endpoints.
 * - version: (Optional) The version of the API endpoints.
 * - database: (Optional) The default database to use for requests.
 * - timeout: (Optional) The timeout for requests in milliseconds.
 *
 * Note: This is a base class and does not provide specific methods for interacting
 * with Milvus entities like collections or vectors. For that, use the HttpClient class
 * which extends this class and mixes in the Collection and Vector APIs.
 */
export declare class HttpBaseClient {
    config: HttpClientConfig;
    constructor(config: HttpClientConfig);
    get baseURL(): string;
    get authorization(): string;
    get database(): string;
    get timeout(): number;
    get headers(): {
        Authorization: string;
        Accept: string;
        ContentType: string;
        'Accept-Type-Allow-Int64': string;
    };
    get fetch(): typeof fetch | ((input: any, init?: any) => Promise<any>);
    /**
     * Handles HTTP response and throws HttpError if response is not ok.
     * @internal
     */
    _handleResponse<T>(response: Response, url: string): Promise<T>;
    POST<T>(url: string, data?: Record<string, any>, options?: FetchOptions): Promise<T>;
    GET<T>(url: string, params?: Record<string, any>, options?: FetchOptions): Promise<T>;
}
declare const HttpClient_base: {
    new (...args: any[]): {
        readonly userPrefix: string;
        createUser(params: import("./types").HttpUserCreateReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<{}>>;
        updateUserPassword(params: import("./types").HttpUserUpdatePasswordReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<{}>>;
        dropUser(param: import("./types").HttpUserBaseReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<{}>>;
        describeUser(param: import("./types").HttpUserBaseReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<string[]>>;
        listUsers(options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<string[]>>;
        grantRoleToUser(params: import("./types").HttpUserRoleReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<{}>>;
        revokeRoleFromUser(params: import("./types").HttpUserRoleReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<{}>>;
        config: HttpClientConfig;
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
        /**
         * Handles HTTP response and throws HttpError if response is not ok.
         * @internal
         */
        _handleResponse<T>(response: Response, url: string): Promise<T>;
        POST<T_1>(url: string, data?: Record<string, any>, options?: FetchOptions | undefined): Promise<T_1>;
        GET<T_2>(url: string, params?: Record<string, any>, options?: FetchOptions | undefined): Promise<T_2>;
    };
} & {
    new (...args: any[]): {
        readonly rolePrefix: string;
        listRoles(options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<string[]>>;
        describeRole(params: import("./types").HttpRoleBaseReq, options?: FetchOptions | undefined): Promise<import("./types").HttpRoleDescribeResponse>;
        createRole(params: import("./types").HttpRoleBaseReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<{}>>;
        dropRole(params: import("./types").HttpRoleBaseReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<{}>>;
        grantPrivilegeToRole(params: import("./types").HttpRolePrivilegeReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<{}>>;
        revokePrivilegeFromRole(params: import("./types").HttpRolePrivilegeReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<{}>>;
        config: HttpClientConfig;
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
        /**
         * Handles HTTP response and throws HttpError if response is not ok.
         * @internal
         */
        _handleResponse<T>(response: Response, url: string): Promise<T>;
        POST<T_1>(url: string, data?: Record<string, any>, options?: FetchOptions | undefined): Promise<T_1>;
        GET<T_2>(url: string, params?: Record<string, any>, options?: FetchOptions | undefined): Promise<T_2>;
    };
} & {
    new (...args: any[]): {
        readonly indexPrefix: string;
        createIndex(params: import("./types").HttpIndexCreateReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<{}>>;
        dropIndex(params: import("./types").HttpIndexBaseReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<{}>>;
        describeIndex(params: import("./types").HttpIndexBaseReq, options?: FetchOptions | undefined): Promise<import("./types").HttpIndexDescribeResponse>;
        listIndexes(params: import("./types").HttpBaseReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<string[]>>;
        alterIndexProperties(params: import("./types").HttpIndexAlterPropertiesReq, options?: FetchOptions | undefined): Promise<import("./types").HttpIndexAlterPropertiesResponse>;
        dropIndexProperties(params: import("./types").HttpIndexDropPropertiesReq, options?: FetchOptions | undefined): Promise<import("./types").HttpIndexDropPropertiesResponse>;
        config: HttpClientConfig;
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
        /**
         * Handles HTTP response and throws HttpError if response is not ok.
         * @internal
         */
        _handleResponse<T>(response: Response, url: string): Promise<T>;
        POST<T_1>(url: string, data?: Record<string, any>, options?: FetchOptions | undefined): Promise<T_1>;
        GET<T_2>(url: string, params?: Record<string, any>, options?: FetchOptions | undefined): Promise<T_2>;
    };
} & {
    new (...args: any[]): {
        readonly importPrefix: string;
        listImportJobs(params: import("./types").HttpBaseReq, options?: FetchOptions | undefined): Promise<import("./types").HttpImportListResponse>;
        createImportJobs(params: import("./types").HttpImportCreateReq, options?: FetchOptions | undefined): Promise<import("./types").HttpImportCreateResponse>;
        getImportJobProgress(params: import("./types").HttpImportProgressReq, options?: FetchOptions | undefined): Promise<import("./types").HttpImportCreateResponse>;
        config: HttpClientConfig;
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
        /**
         * Handles HTTP response and throws HttpError if response is not ok.
         * @internal
         */
        _handleResponse<T>(response: Response, url: string): Promise<T>;
        POST<T_1>(url: string, data?: Record<string, any>, options?: FetchOptions | undefined): Promise<T_1>;
        GET<T_2>(url: string, params?: Record<string, any>, options?: FetchOptions | undefined): Promise<T_2>;
    };
} & {
    new (...args: any[]): {
        readonly aliasPrefix: string;
        listAliases(params: import("./types").HttpAliasBaseReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<string[]>>;
        createAlias(params: import("./types").HttpAliasCreateReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<{}>>;
        describeAlias(params: import("./types").HttpAliasDescribeReq, options?: FetchOptions | undefined): Promise<import("./types").HttpAliasDescribeResponse>;
        dropAlias(params: import("./types").HttpAliasDropReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<{}>>;
        alterAlias(params: import("./types").HttpAliasCreateReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<{}>>;
        config: HttpClientConfig;
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
        /**
         * Handles HTTP response and throws HttpError if response is not ok.
         * @internal
         */
        _handleResponse<T>(response: Response, url: string): Promise<T>;
        POST<T_1>(url: string, data?: Record<string, any>, options?: FetchOptions | undefined): Promise<T_1>;
        GET<T_2>(url: string, params?: Record<string, any>, options?: FetchOptions | undefined): Promise<T_2>;
    };
} & {
    new (...args: any[]): {
        readonly partitionPrefix: string;
        listPartitions(params: import("./types").HttpBaseReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<string[]>>;
        createPartition(params: import("./types").HttpPartitionBaseReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<{}>>;
        dropPartition(params: import("./types").HttpPartitionBaseReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<{}>>;
        loadPartitions(params: import("./types").HttpPartitionListReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<{}>>;
        releasePartitions(params: import("./types").HttpPartitionListReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<{}>>;
        hasPartition(params: import("./types").HttpPartitionBaseReq, options?: FetchOptions | undefined): Promise<import("./types").HttpPartitionHasResponse>;
        getPartitionStatistics(params: import("./types").HttpPartitionBaseReq, options?: FetchOptions | undefined): Promise<import("./types").HttpPartitionStatisticsResponse>;
        config: HttpClientConfig;
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
        /**
         * Handles HTTP response and throws HttpError if response is not ok.
         * @internal
         */
        _handleResponse<T>(response: Response, url: string): Promise<T>;
        POST<T_1>(url: string, data?: Record<string, any>, options?: FetchOptions | undefined): Promise<T_1>;
        GET<T_2>(url: string, params?: Record<string, any>, options?: FetchOptions | undefined): Promise<T_2>;
    };
} & {
    new (...args: any[]): {
        readonly collectionPrefix: string;
        createCollection(data: import("./types").HttpCollectionCreateReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<{}>>;
        describeCollection(params: import("./types").HttpBaseReq, options?: FetchOptions | undefined): Promise<import("./types").HttpCollectionDescribeResponse>;
        dropCollection(data: import("./types").HttpBaseReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<{}>>;
        addCollectionField(params: import("./types").HttpCollectionAddFieldReq, options?: FetchOptions | undefined): Promise<import("./types").HttpCollectionAddFieldResponse>;
        alterCollectionProperties(params: import("./types").HttpCollectionAlterPropertiesReq, options?: FetchOptions | undefined): Promise<import("./types").HttpCollectionAlterPropertiesResponse>;
        alterCollectionFieldProperties(params: import("./types").HttpCollectionAlterFieldPropertiesReq, options?: FetchOptions | undefined): Promise<import("./types").HttpCollectionAlterFieldPropertiesResponse>;
        dropCollectionProperties(params: import("./types").HttpCollectionDropPropertiesReq, options?: FetchOptions | undefined): Promise<import("./types").HttpCollectionDropPropertiesResponse>;
        listCollections(params?: import("./types").HttpCollectionListReq, options?: FetchOptions | undefined): Promise<import("./types").HttpCollectionListResponse>;
        hasCollection(params: Required<import("./types").HttpBaseReq>, options?: FetchOptions | undefined): Promise<import("./types").HttpCollectionHasResponse>;
        renameCollection(params: import("./types").HttpCollectionRenameReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<{}>>;
        getCollectionStatistics(params: import("./types").HttpBaseReq, options?: FetchOptions | undefined): Promise<import("./types").HttpCollectionStatisticsResponse>;
        flushCollection(params: import("./types").HttpBaseReq, options?: FetchOptions | undefined): Promise<import("./types").HttpCollectionFlushResponse>;
        loadCollection(params: import("./types").HttpBaseReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<{}>>;
        releaseCollection(params: import("./types").HttpBaseReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<{}>>;
        getCollectionLoadState(params: import("./types").HttpCollectionLoadStateReq, options?: FetchOptions | undefined): Promise<import("./types").HttpCollectionLoadStateResponse>;
        compactCollection(params: import("./types").HttpCollectionCompactReq, options?: FetchOptions | undefined): Promise<import("./types").HttpCollectionCompactResponse>;
        getCompactionState(params: import("./types").HttpCollectionGetCompactionStateReq, options?: FetchOptions | undefined): Promise<import("./types").HttpCollectionGetCompactionStateResponse>;
        refreshLoad(params: import("./types").HttpCollectionRefreshLoadReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<{}>>;
        config: HttpClientConfig;
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
        /**
         * Handles HTTP response and throws HttpError if response is not ok.
         * @internal
         */
        _handleResponse<T>(response: Response, url: string): Promise<T>;
        POST<T_1>(url: string, data?: Record<string, any>, options?: FetchOptions | undefined): Promise<T_1>;
        GET<T_2>(url: string, params?: Record<string, any>, options?: FetchOptions | undefined): Promise<T_2>;
    };
} & {
    new (...args: any[]): {
        readonly databasePrefix: string;
        createDatabase(params: import("./types").HttpDatabaseCreateReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<{}>>;
        dropDatabase(params: import("./types").HttpDatabaseDropReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<{}>>;
        describeDatabase(params: import("./types").HttpDatabaseDescribeReq, options?: FetchOptions | undefined): Promise<import("./types").HttpDatabaseDescribeResponse>;
        listDatabases(options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<string[]>>;
        alterDatabaseProperties(params: import("./types").HttpDatabaseAlterPropertiesReq, options?: FetchOptions | undefined): Promise<import("./types").HttpDatabaseAlterPropertiesResponse>;
        dropDatabaseProperties(params: import("./types").HttpDatabaseDropPropertiesReq, options?: FetchOptions | undefined): Promise<import("./types").HttpDatabaseDropPropertiesResponse>;
        config: HttpClientConfig;
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
        /**
         * Handles HTTP response and throws HttpError if response is not ok.
         * @internal
         */
        _handleResponse<T>(response: Response, url: string): Promise<T>;
        POST<T_1>(url: string, data?: Record<string, any>, options?: FetchOptions | undefined): Promise<T_1>;
        GET<T_2>(url: string, params?: Record<string, any>, options?: FetchOptions | undefined): Promise<T_2>;
    };
} & {
    new (...args: any[]): {
        readonly vectorPrefix: string;
        get(params: import("./types").HttpVectorGetReq, options?: FetchOptions | undefined): Promise<import("./types").HttpVectorQueryResponse>;
        insert(data: import("./types").HttpVectorInsertReq, options?: FetchOptions | undefined): Promise<import("./types").HttpVectorInsertResponse>;
        upsert(data: import("./types").HttpVectorInsertReq, options?: FetchOptions | undefined): Promise<import("./types").HttpVectorUpsertResponse>;
        query(data: import("./types").HttpVectorQueryReq, options?: FetchOptions | undefined): Promise<import("./types").HttpVectorQueryResponse>;
        search(data: import("./types").HttpVectorSearchReq, options?: FetchOptions | undefined): Promise<import("./types").HttpVectorSearchResponse>;
        hybridSearch(data: import("./types").HttpVectorHybridSearchReq, options?: FetchOptions | undefined): Promise<import("./types").HttpVectorSearchResponse>;
        delete(data: import("./types").HttpVectorDeleteReq, options?: FetchOptions | undefined): Promise<import("./types").HttpBaseResponse<{}>>;
        config: HttpClientConfig;
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
        /**
         * Handles HTTP response and throws HttpError if response is not ok.
         * @internal
         */
        _handleResponse<T>(response: Response, url: string): Promise<T>;
        POST<T_1>(url: string, data?: Record<string, any>, options?: FetchOptions | undefined): Promise<T_1>;
        GET<T_2>(url: string, params?: Record<string, any>, options?: FetchOptions | undefined): Promise<T_2>;
    };
} & typeof HttpBaseClient;
/**
 * The HttpClient class extends the functionality
 * of the HttpBaseClient class by mixing in the
 * - Collection
 * - Vector
 * - Alias
 * - Partition
 * - MilvusIndex
 * - Import
 * - Role
 * - User APIs.
 */
export declare class HttpClient extends HttpClient_base {
}
export {};
