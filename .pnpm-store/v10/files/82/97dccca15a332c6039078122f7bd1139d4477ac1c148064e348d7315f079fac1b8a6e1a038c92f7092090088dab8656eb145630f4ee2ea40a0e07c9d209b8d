import { IHttpClient, RequestBody } from "./IHttpClient.js";
import { Logger } from "@azure/msal-common/browser";
/**
 * Implementation of IHttpClient using fetch.
 */
export declare class FetchHttpClient implements IHttpClient {
    private logger;
    constructor(logger: Logger);
    sendAsync(url: string | URL, options: RequestInit): Promise<Response>;
    post(url: string | URL, body: RequestBody, headers?: Record<string, string>): Promise<Response>;
    get(url: string | URL, headers?: Record<string, string>): Promise<Response>;
}
//# sourceMappingURL=FetchHttpClient.d.ts.map