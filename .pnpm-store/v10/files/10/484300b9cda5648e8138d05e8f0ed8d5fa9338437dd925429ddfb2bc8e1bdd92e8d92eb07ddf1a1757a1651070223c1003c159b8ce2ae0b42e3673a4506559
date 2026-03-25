import type { RequestHeaders } from "./RequestHeaders";
import type { RequestMethod } from "./RequestMethod";
import type { RequestParameters } from "./RequestParameters";
import type { Url } from "./Url";
/**
 * The `.endpoint()` method is guaranteed to set all keys defined by RequestParameters
 * as well as the method property.
 */
export type EndpointDefaults = RequestParameters & {
    baseUrl: Url;
    method: RequestMethod;
    url?: Url;
    headers: RequestHeaders & {
        accept: string;
        "user-agent": string;
    };
    mediaType: {
        format: string;
        previews?: string[];
    };
};
