import { APIResponse } from "./APIResponse";
export declare type FetchFunction = <R = unknown>(args: Fetcher.Args) => Promise<APIResponse<R, Fetcher.Error>>;
export declare namespace Fetcher {
    interface Args {
        url: string;
        method: string;
        contentType?: string;
        headers?: Record<string, string | undefined>;
        queryParameters?: Record<string, string | string[] | object | object[]>;
        body?: unknown;
        timeoutMs?: number;
        maxRetries?: number;
        withCredentials?: boolean;
        abortSignal?: AbortSignal;
        responseType?: "json" | "blob" | "streaming" | "text";
    }
    type Error = FailedStatusCodeError | NonJsonError | TimeoutError | UnknownError;
    interface FailedStatusCodeError {
        reason: "status-code";
        statusCode: number;
        body: unknown;
    }
    interface NonJsonError {
        reason: "non-json";
        statusCode: number;
        rawBody: string;
    }
    interface TimeoutError {
        reason: "timeout";
    }
    interface UnknownError {
        reason: "unknown";
        errorMessage: string;
    }
}
export declare const fetcher: FetchFunction;
