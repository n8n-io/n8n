import type { HeaderBag, HttpMessage, HttpResponse as IHttpResponse } from "@smithy/types";
type HttpResponseOptions = Partial<HttpMessage> & {
    statusCode: number;
    reason?: string;
};
/**
 * Use the distinct IHttpResponse interface from \@smithy/types instead.
 * This should not be used due to
 * overlapping with the concrete class' name.
 *
 * This is not marked deprecated since that would mark the concrete class
 * deprecated as well.
 *
 * @internal
 */
export interface HttpResponse extends IHttpResponse {
}
/**
 * @public
 */
export declare class HttpResponse {
    statusCode: number;
    reason?: string;
    headers: HeaderBag;
    body?: any;
    constructor(options: HttpResponseOptions);
    static isInstance(response: unknown): response is HttpResponse;
}
export {};
