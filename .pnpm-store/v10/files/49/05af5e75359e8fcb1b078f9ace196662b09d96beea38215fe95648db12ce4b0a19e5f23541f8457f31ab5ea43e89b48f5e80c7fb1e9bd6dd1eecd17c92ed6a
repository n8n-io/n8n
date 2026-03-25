import type { HeaderBag, HttpMessage, QueryParameterBag, URI } from "@smithy/types";
import { HttpRequest as IHttpRequest } from "@smithy/types";
type HttpRequestOptions = Partial<HttpMessage> & Partial<URI> & {
    method?: string;
};
/**
 * Use the distinct IHttpRequest interface from \@smithy/types instead.
 * This should not be used due to
 * overlapping with the concrete class' name.
 *
 * This is not marked deprecated since that would mark the concrete class
 * deprecated as well.
 *
 * @internal
 */
export interface HttpRequest extends IHttpRequest {
}
/**
 * @public
 */
export { IHttpRequest };
/**
 * @public
 */
export declare class HttpRequest implements HttpMessage, URI {
    method: string;
    protocol: string;
    hostname: string;
    port?: number;
    path: string;
    query: QueryParameterBag;
    headers: HeaderBag;
    username?: string;
    password?: string;
    fragment?: string;
    body?: any;
    constructor(options: HttpRequestOptions);
    /**
     * Note: this does not deep-clone the body.
     */
    static clone(request: IHttpRequest): HttpRequest;
    /**
     * This method only actually asserts that request is the interface {@link IHttpRequest},
     * and not necessarily this concrete class. Left in place for API stability.
     *
     * Do not call instance methods on the input of this function, and
     * do not assume it has the HttpRequest prototype.
     */
    static isInstance(request: unknown): request is HttpRequest;
    /**
     * @deprecated use static HttpRequest.clone(request) instead. It's not safe to call
     * this method because {@link HttpRequest.isInstance} incorrectly
     * asserts that IHttpRequest (interface) objects are of type HttpRequest (class).
     */
    clone(): HttpRequest;
}
