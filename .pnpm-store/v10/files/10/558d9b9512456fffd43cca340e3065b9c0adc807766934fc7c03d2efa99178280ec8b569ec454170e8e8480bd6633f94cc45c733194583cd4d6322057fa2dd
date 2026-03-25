import { Headers } from "./core.js";
export declare class AnthropicError extends Error {
}
export declare class APIError extends AnthropicError {
    readonly status: number | undefined;
    readonly headers: Headers | undefined;
    readonly error: Object | undefined;
    readonly request_id: string | null | undefined;
    constructor(status: number | undefined, error: Object | undefined, message: string | undefined, headers: Headers | undefined);
    private static makeMessage;
    static generate(status: number | undefined, errorResponse: Object | undefined, message: string | undefined, headers: Headers | undefined): APIError;
}
export declare class APIUserAbortError extends APIError {
    readonly status: undefined;
    constructor({ message }?: {
        message?: string;
    });
}
export declare class APIConnectionError extends APIError {
    readonly status: undefined;
    constructor({ message, cause }: {
        message?: string | undefined;
        cause?: Error | undefined;
    });
}
export declare class APIConnectionTimeoutError extends APIConnectionError {
    constructor({ message }?: {
        message?: string;
    });
}
export declare class BadRequestError extends APIError {
    readonly status: 400;
}
export declare class AuthenticationError extends APIError {
    readonly status: 401;
}
export declare class PermissionDeniedError extends APIError {
    readonly status: 403;
}
export declare class NotFoundError extends APIError {
    readonly status: 404;
}
export declare class ConflictError extends APIError {
    readonly status: 409;
}
export declare class UnprocessableEntityError extends APIError {
    readonly status: 422;
}
export declare class RateLimitError extends APIError {
    readonly status: 429;
}
export declare class InternalServerError extends APIError {
}
//# sourceMappingURL=error.d.ts.map