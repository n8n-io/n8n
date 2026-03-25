/**
 * Base class for all HTTP errors.
 */
export declare class HTTPClientError extends Error {
    /** The underlying cause of the error. */
    readonly cause: unknown;
    name: string;
    constructor(message: string, opts?: {
        cause?: unknown;
    });
}
/**
 * An error to capture unrecognised or unexpected errors when making HTTP calls.
 */
export declare class UnexpectedClientError extends HTTPClientError {
    name: string;
}
/**
 * An error that is raised when any inputs used to create a request are invalid.
 */
export declare class InvalidRequestError extends HTTPClientError {
    name: string;
}
/**
 * An error that is raised when a HTTP request was aborted by the client error.
 */
export declare class RequestAbortedError extends HTTPClientError {
    readonly name = "RequestAbortedError";
}
/**
 * An error that is raised when a HTTP request timed out due to an AbortSignal
 * signal timeout.
 */
export declare class RequestTimeoutError extends HTTPClientError {
    readonly name = "RequestTimeoutError";
}
/**
 * An error that is raised when a HTTP client is unable to make a request to
 * a server.
 */
export declare class ConnectionError extends HTTPClientError {
    readonly name = "ConnectionError";
}
//# sourceMappingURL=httpclienterrors.d.ts.map