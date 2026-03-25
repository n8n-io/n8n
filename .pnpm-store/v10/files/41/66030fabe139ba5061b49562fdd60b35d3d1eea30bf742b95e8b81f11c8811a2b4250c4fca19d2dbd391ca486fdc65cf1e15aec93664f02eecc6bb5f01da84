import type { RequestHeaders } from "./RequestHeaders.js";
import type { RequestMethod } from "./RequestMethod.js";
import type { RequestParameters } from "./RequestParameters.js";
import type { Url } from "./Url.js";
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
