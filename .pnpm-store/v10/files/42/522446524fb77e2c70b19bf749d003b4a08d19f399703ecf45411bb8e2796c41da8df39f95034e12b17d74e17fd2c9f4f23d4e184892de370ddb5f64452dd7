import type * as proto from "./shared/proto.js";
/** Generic error produced by the Hrana client. */
export declare class ClientError extends Error {
    /** @private */
    constructor(message: string);
}
/** Error thrown when the server violates the protocol. */
export declare class ProtoError extends ClientError {
    /** @private */
    constructor(message: string);
}
/** Error thrown when the server returns an error response. */
export declare class ResponseError extends ClientError {
    code: string | undefined;
    /** @internal */
    proto: proto.Error;
    /** @private */
    constructor(message: string, protoError: proto.Error);
}
/** Error thrown when the client or stream is closed. */
export declare class ClosedError extends ClientError {
    /** @private */
    constructor(message: string, cause: Error | undefined);
}
/** Error thrown when the environment does not seem to support WebSockets. */
export declare class WebSocketUnsupportedError extends ClientError {
    /** @private */
    constructor(message: string);
}
/** Error thrown when we encounter a WebSocket error. */
export declare class WebSocketError extends ClientError {
    /** @private */
    constructor(message: string);
}
/** Error thrown when the HTTP server returns an error response. */
export declare class HttpServerError extends ClientError {
    status: number;
    /** @private */
    constructor(message: string, status: number);
}
/** Error thrown when a libsql URL is not valid. */
export declare class LibsqlUrlParseError extends ClientError {
    /** @private */
    constructor(message: string);
}
/** Error thrown when the protocol version is too low to support a feature. */
export declare class ProtocolVersionError extends ClientError {
    /** @private */
    constructor(message: string);
}
/** Error thrown when an internal client error happens. */
export declare class InternalError extends ClientError {
    /** @private */
    constructor(message: string);
}
/** Error thrown when the API is misused. */
export declare class MisuseError extends ClientError {
    /** @private */
    constructor(message: string);
}
