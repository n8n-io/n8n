import type { FinalRequestOptions } from "./request-options.mjs";
import { type BaseAnthropic } from "../client.mjs";
import type { AbstractPage } from "../core/pagination.mjs";
export type APIResponseProps = {
    response: Response;
    options: FinalRequestOptions;
    controller: AbortController;
    requestLogID: string;
    retryOfRequestLogID: string | undefined;
    startTime: number;
};
export declare function defaultParseResponse<T>(client: BaseAnthropic, props: APIResponseProps): Promise<WithRequestID<T>>;
export type WithRequestID<T> = T extends Array<any> | Response | AbstractPage<any> ? T : T extends Record<string, any> ? T & {
    _request_id?: string | null;
} : T;
export declare function addRequestID<T>(value: T, response: Response): WithRequestID<T>;
//# sourceMappingURL=parse.d.mts.map