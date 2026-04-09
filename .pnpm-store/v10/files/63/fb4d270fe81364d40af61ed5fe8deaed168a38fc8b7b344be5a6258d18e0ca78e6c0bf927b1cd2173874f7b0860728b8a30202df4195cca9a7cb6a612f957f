"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MisuseError = exports.InternalError = exports.ProtocolVersionError = exports.LibsqlUrlParseError = exports.HttpServerError = exports.WebSocketError = exports.WebSocketUnsupportedError = exports.ClosedError = exports.ResponseError = exports.ProtoError = exports.ClientError = void 0;
/** Generic error produced by the Hrana client. */
class ClientError extends Error {
    /** @private */
    constructor(message) {
        super(message);
        this.name = "ClientError";
    }
}
exports.ClientError = ClientError;
/** Error thrown when the server violates the protocol. */
class ProtoError extends ClientError {
    /** @private */
    constructor(message) {
        super(message);
        this.name = "ProtoError";
    }
}
exports.ProtoError = ProtoError;
/** Error thrown when the server returns an error response. */
class ResponseError extends ClientError {
    code;
    /** @internal */
    proto;
    /** @private */
    constructor(message, protoError) {
        super(message);
        this.name = "ResponseError";
        this.code = protoError.code;
        this.proto = protoError;
        this.stack = undefined;
    }
}
exports.ResponseError = ResponseError;
/** Error thrown when the client or stream is closed. */
class ClosedError extends ClientError {
    /** @private */
    constructor(message, cause) {
        if (cause !== undefined) {
            super(`${message}: ${cause}`);
            this.cause = cause;
        }
        else {
            super(message);
        }
        this.name = "ClosedError";
    }
}
exports.ClosedError = ClosedError;
/** Error thrown when the environment does not seem to support WebSockets. */
class WebSocketUnsupportedError extends ClientError {
    /** @private */
    constructor(message) {
        super(message);
        this.name = "WebSocketUnsupportedError";
    }
}
exports.WebSocketUnsupportedError = WebSocketUnsupportedError;
/** Error thrown when we encounter a WebSocket error. */
class WebSocketError extends ClientError {
    /** @private */
    constructor(message) {
        super(message);
        this.name = "WebSocketError";
    }
}
exports.WebSocketError = WebSocketError;
/** Error thrown when the HTTP server returns an error response. */
class HttpServerError extends ClientError {
    status;
    /** @private */
    constructor(message, status) {
        super(message);
        this.status = status;
        this.name = "HttpServerError";
    }
}
exports.HttpServerError = HttpServerError;
/** Error thrown when a libsql URL is not valid. */
class LibsqlUrlParseError extends ClientError {
    /** @private */
    constructor(message) {
        super(message);
        this.name = "LibsqlUrlParseError";
    }
}
exports.LibsqlUrlParseError = LibsqlUrlParseError;
/** Error thrown when the protocol version is too low to support a feature. */
class ProtocolVersionError extends ClientError {
    /** @private */
    constructor(message) {
        super(message);
        this.name = "ProtocolVersionError";
    }
}
exports.ProtocolVersionError = ProtocolVersionError;
/** Error thrown when an internal client error happens. */
class InternalError extends ClientError {
    /** @private */
    constructor(message) {
        super(message);
        this.name = "InternalError";
    }
}
exports.InternalError = InternalError;
/** Error thrown when the API is misused. */
class MisuseError extends ClientError {
    /** @private */
    constructor(message) {
        super(message);
        this.name = "MisuseError";
    }
}
exports.MisuseError = MisuseError;
