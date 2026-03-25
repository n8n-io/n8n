import { ResponseType } from "axios";
export declare class RequestAdapter {
    private client;
    private readonly baseURL;
    private readonly token;
    constructor(client: any, opts: RequestAdapterOptions);
    /**
     * Delegate request call to client implementation.
     *
     * In the future this function may apply middleware.
     *
     * @param method
     * @param path
     * @param {RequestOptions} opts
     * @returns {Promise<Response>}
     */
    sendRequest(method: HTTPMethod, path: string, opts?: RequestOptions): Promise<Response<any>>;
    /**
     * Prevent double slash (//) and other mishaps
     *
     * @param {string} path
     * @returns {string}
     * @private
     */
    private normalizeURL;
}
export interface RequestAdapterOptions {
    serverURL: string;
    token: string;
}
export interface RequestOptions {
    params?: {
        [key: string]: string | string[] | number[];
    };
    data?: {
        [key: string]: any;
    } | string;
    headers?: {
        [key: string]: string | number;
    };
    timeout?: number;
    responseType?: ResponseType;
}
export interface Response<T = any> {
    status: number;
    data: T;
}
export type HTTPMethod = "get" | "GET" | "delete" | "DELETE" | "head" | "HEAD" | "options" | "OPTIONS" | "post" | "POST" | "put" | "PUT" | "patch" | "PATCH";
