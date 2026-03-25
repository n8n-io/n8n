import type { ResponseHeaders } from "./ResponseHeaders";
import type { Url } from "./Url";
export interface OctokitResponse<T, S extends number = number> {
    headers: ResponseHeaders;
    /**
     * http response code
     */
    status: S;
    /**
     * URL of response after all redirects
     */
    url: Url;
    /**
     * Response data as documented in the REST API reference documentation at https://docs.github.com/rest/reference
     */
    data: T;
}
