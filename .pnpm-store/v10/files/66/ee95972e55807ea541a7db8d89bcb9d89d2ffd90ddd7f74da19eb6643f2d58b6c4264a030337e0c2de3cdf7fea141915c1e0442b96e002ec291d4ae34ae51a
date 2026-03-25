import { HttpBaseClient } from '../HttpClient';
import { Constructor, FetchOptions, HttpBaseReq, HttpImportListResponse, HttpImportCreateReq, HttpImportCreateResponse, HttpImportProgressReq } from '../types';
/**
 *
 * @param {Constructor<HttpBaseClient>} Base - The base class to be extended.
 * @returns {class} - The extended class with additional methods for collection management.
 *
 * @method listImportJobs - Lists all import jobs.
 * @method createImportJobs - Creates new import jobs.
 * @method getImportJobProgress - Retrieves the progress of an import job.
 */
export declare function Import<T extends Constructor<HttpBaseClient>>(Base: T): {
    new (...args: any[]): {
        readonly importPrefix: string;
        listImportJobs(params: HttpBaseReq, options?: FetchOptions): Promise<HttpImportListResponse>;
        createImportJobs(params: HttpImportCreateReq, options?: FetchOptions): Promise<HttpImportCreateResponse>;
        getImportJobProgress(params: HttpImportProgressReq, options?: FetchOptions): Promise<HttpImportCreateResponse>;
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
