import type { ResponseHeaders } from "@octokit/types";
import type { GraphQlEndpointOptions, GraphQlQueryResponse } from "./types";
type ServerResponseData<T> = Required<GraphQlQueryResponse<T>>;
export declare class GraphqlResponseError<ResponseData> extends Error {
    readonly request: GraphQlEndpointOptions;
    readonly headers: ResponseHeaders;
    readonly response: ServerResponseData<ResponseData>;
    name: string;
    readonly errors: GraphQlQueryResponse<never>["errors"];
    readonly data: ResponseData;
    constructor(request: GraphQlEndpointOptions, headers: ResponseHeaders, response: ServerResponseData<ResponseData>);
}
export {};
