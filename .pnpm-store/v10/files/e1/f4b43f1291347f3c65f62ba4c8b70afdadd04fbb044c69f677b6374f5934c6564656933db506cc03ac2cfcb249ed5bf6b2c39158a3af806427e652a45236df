import { SDKHooks } from "../hooks/hooks.js";
import { HookContext } from "../hooks/types.js";
import { ConnectionError, InvalidRequestError, RequestAbortedError, RequestTimeoutError, UnexpectedClientError } from "../models/errors/httpclienterrors.js";
import { Result } from "../types/fp.js";
import { SDKOptions } from "./config.js";
import { RetryConfig } from "./retries.js";
import { SecurityState } from "./security.js";
export type RequestOptions = {
    /**
     * Sets a timeout, in milliseconds, on HTTP requests made by an SDK method. If
     * `fetchOptions.signal` is set then it will take precedence over this option.
     */
    timeoutMs?: number;
    /**
     * Set or override a retry policy on HTTP calls.
     */
    retries?: RetryConfig;
    /**
     * Specifies the status codes which should be retried using the given retry policy.
     */
    retryCodes?: string[];
    /**
     * Overrides the base server URL that will be used by an operation.
     */
    serverURL?: string | URL;
    /**
     * @deprecated `fetchOptions` has been flattened into `RequestOptions`.
     *
     * Sets various request options on the `fetch` call made by an SDK method.
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options|Request}
     */
    fetchOptions?: Omit<RequestInit, "method" | "body">;
} & Omit<RequestInit, "method" | "body">;
type RequestConfig = {
    method: string;
    path: string;
    baseURL?: string | URL | undefined;
    query?: string;
    body?: RequestInit["body"];
    headers?: HeadersInit;
    security?: SecurityState | null;
    uaHeader?: string;
    userAgent?: string | undefined;
    timeoutMs?: number;
};
export declare class ClientSDK {
    #private;
    readonly _baseURL: URL | null;
    readonly _options: SDKOptions & {
        hooks?: SDKHooks;
    };
    constructor(options?: SDKOptions);
    _createRequest(context: HookContext, conf: RequestConfig, options?: RequestOptions): Result<Request, InvalidRequestError | UnexpectedClientError>;
    _do(request: Request, options: {
        context: HookContext;
        errorCodes: number | string | (number | string)[];
        retryConfig: RetryConfig;
        retryCodes: string[];
    }): Promise<Result<Response, RequestAbortedError | RequestTimeoutError | ConnectionError | UnexpectedClientError>>;
}
export {};
//# sourceMappingURL=sdks.d.ts.map