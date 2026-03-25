export type RequestBody = string | ArrayBuffer | DataView | Blob | File | URLSearchParams | FormData | ReadableStream;
/**
 * Interface for HTTP client.
 */
export interface IHttpClient {
    /**
     * Sends a request.
     * @param url The URL to send the request to.
     * @param options Additional fetch options.
     */
    sendAsync(url: string | URL, options: RequestInit): Promise<Response>;
    /**
     * Sends a POST request.
     * @param url The URL to send the request to.
     * @param body The body of the request.
     * @param headers Optional headers for the request.
     */
    post(url: string | URL, body: RequestBody, headers?: Record<string, string>): Promise<Response>;
    /**
     * Sends a GET request.
     * @param url The URL to send the request to.
     * @param headers Optional headers for the request.
     */
    get(url: string | URL, headers?: Record<string, string>): Promise<Response>;
}
/**
 * Represents an HTTP method type.
 */
export declare const HttpMethod: {
    readonly GET: "GET";
    readonly POST: "POST";
    readonly PUT: "PUT";
    readonly DELETE: "DELETE";
};
//# sourceMappingURL=IHttpClient.d.ts.map