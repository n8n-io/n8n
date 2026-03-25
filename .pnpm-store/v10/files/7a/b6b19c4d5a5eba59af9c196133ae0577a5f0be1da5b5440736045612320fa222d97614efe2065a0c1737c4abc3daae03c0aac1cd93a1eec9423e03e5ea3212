import { HTTPMethod, RequestOptions, Response } from "./requests";
/**
 * The default Request Client used by the SDK if customer does not
 * provide their own client.
 */
export declare class HTTPClient implements IRequestClient {
    defaultTimeout: number;
    readonly defaultHeaders: {
        "content-type": string;
        "user-agent": string;
    };
    private axios;
    constructor(conf?: ClientConfig);
    request(method: any, url: any, opts: ClientRequestOptions): Promise<Response>;
    /**
     * Factory helper that sets up axios with settings relevant to the connector.
     *
     * @param {ClientConfig} conf
     */
    private initAxios;
}
export interface IRequestClient {
    defaultTimeout: number;
    /**
     * Instructs client to send an HTTP request with provided configuration.
     *
     * @param {HTTPMethod} method
     * @param {string} url Full url, including path, of request destination
     * @param {ClientRequestOptions} opts
     * @returns {Promise<Response>}
     */
    request(method: HTTPMethod, url: string, opts: ClientRequestOptions): Promise<Response>;
}
export interface ClientConfig {
    keepAlive?: boolean;
    timeout?: number;
}
export interface ClientRequestOptions extends RequestOptions {
    authToken: string;
}
