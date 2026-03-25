import type { HttpClient, HttpMethods } from "../interfaces.js";
import type { Pipeline } from "../pipeline.js";
import type { HttpResponse, RequestParameters } from "./common.js";
/**
 * Helper function to send request used by the client
 * @param method - method to use to send the request
 * @param url - url to send the request to
 * @param pipeline - pipeline with the policies to run when sending the request
 * @param options - request options
 * @param customHttpClient - a custom HttpClient to use when making the request
 * @returns returns and HttpResponse
 */
export declare function sendRequest(method: HttpMethods, url: string, pipeline: Pipeline, options?: InternalRequestParameters, customHttpClient?: HttpClient): Promise<HttpResponse>;
export interface InternalRequestParameters extends RequestParameters {
    responseAsStream?: boolean;
}
//# sourceMappingURL=sendRequest.d.ts.map