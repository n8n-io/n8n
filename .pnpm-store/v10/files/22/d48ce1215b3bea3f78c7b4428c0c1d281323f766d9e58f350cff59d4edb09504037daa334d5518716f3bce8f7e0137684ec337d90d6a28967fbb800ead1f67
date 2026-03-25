/// <reference types="node" resolution-mode="require"/>
/// <reference types="node" resolution-mode="require"/>
import { INetworkModule, NetworkRequestOptions, NetworkResponse, LoggerOptions } from "@azure/msal-common/node";
import http from "http";
import https from "https";
/**
 * This class implements the API for network requests.
 */
export declare class HttpClient implements INetworkModule {
    private proxyUrl;
    private customAgentOptions;
    private logger;
    private isPiiEnabled;
    constructor(proxyUrl?: string, customAgentOptions?: http.AgentOptions | https.AgentOptions, loggerOptions?: LoggerOptions);
    /**
     * Http Get request
     * @param url
     * @param options
     */
    sendGetRequestAsync<T>(url: string, options?: NetworkRequestOptions, timeout?: number): Promise<NetworkResponse<T>>;
    /**
     * Http Post request
     * @param url
     * @param options
     */
    sendPostRequestAsync<T>(url: string, options?: NetworkRequestOptions): Promise<NetworkResponse<T>>;
    private networkRequestViaProxy;
    private networkRequestViaHttps;
    /**
     * Check if extra parsing is needed on the repsonse from the server
     * @param statusCode {number} the status code of the response from the server
     * @param statusMessage {string | undefined} the status message of the response from the server
     * @param headers {Record<string, string>} the headers of the response from the server
     * @param body {string} the body from the response of the server
     * @returns {Object} JSON parsed body or error object
     */
    private parseBody;
    /**
     * Helper function to log a formatted message containing URLs, with PII-aware sanitization
     * @param label {string} the label for the log message
     * @param urlString {string} the URL to log
     */
    private logUrlWithPiiAwareness;
    /**
     * Helper function to determine if a request should be destroyed based on status code and response body.
     * Checks if the response is an error and not part of the device code flow (authorization_pending).
     * @param statusCode {number} the status code of the response
     * @param networkResponse {NetworkResponse<T>} the network response object
     * @returns {boolean} true if the request should be destroyed, false otherwise
     */
    private shouldDestroyRequest;
}
//# sourceMappingURL=HttpClient.d.ts.map