import { FullOperationResponse } from "@azure/core-client";
import { PipelineResponse } from "@azure/core-rest-pipeline";
import { HttpHeadersLike, WebResourceLike } from "./util.js";
/**
 * Http Response that is compatible with the core-v1(core-http).
 */
export interface CompatResponse extends Omit<FullOperationResponse, "request" | "headers"> {
    /**
     * A description of a HTTP request to be made to a remote server.
     */
    request: WebResourceLike;
    /**
     * A collection of HTTP header key/value pairs.
     */
    headers: HttpHeadersLike;
}
/**
 * A helper to convert response objects from the new pipeline back to the old one.
 * @param response - A response object from core-client.
 * @returns A response compatible with `HttpOperationResponse` from core-http.
 */
export declare function toCompatResponse(response: FullOperationResponse, options?: {
    createProxy?: boolean;
}): CompatResponse;
/**
 * A helper to convert back to a PipelineResponse
 * @param compatResponse - A response compatible with `HttpOperationResponse` from core-http.
 */
export declare function toPipelineResponse(compatResponse: CompatResponse): PipelineResponse;
//# sourceMappingURL=response.d.ts.map