import type { Route, RequestParameters } from "@octokit/types";
import type { RestEndpointMethods } from "./generated/method-types.js";
export type Api = {
    rest: RestEndpointMethods;
};
export type EndpointDecorations = {
    mapToData?: string;
    deprecated?: string;
    renamed?: [string, string];
    renamedParameters?: {
        [name: string]: string;
    };
};
export type EndpointsDefaultsAndDecorations = {
    [scope: string]: {
        [methodName: string]: [Route, RequestParameters?, EndpointDecorations?];
    };
};
