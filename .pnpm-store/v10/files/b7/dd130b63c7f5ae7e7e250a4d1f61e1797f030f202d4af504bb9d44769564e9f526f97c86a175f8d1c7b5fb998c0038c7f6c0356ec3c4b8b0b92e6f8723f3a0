import type { Octokit } from "@octokit/core";
import type { RequestInterface, RequestParameters, Route } from "./types.js";
export declare function iterator(octokit: Octokit, route: Route | RequestInterface, parameters?: RequestParameters): {
    [Symbol.asyncIterator]: () => {
        next(): Promise<{
            done: boolean;
            value?: undefined;
        } | {
            value: import("@octokit/types/dist-types/OctokitResponse.js").OctokitResponse<any, number>;
            done?: undefined;
        } | {
            value: {
                status: number;
                headers: {};
                data: never[];
            };
            done?: undefined;
        }>;
    };
};
