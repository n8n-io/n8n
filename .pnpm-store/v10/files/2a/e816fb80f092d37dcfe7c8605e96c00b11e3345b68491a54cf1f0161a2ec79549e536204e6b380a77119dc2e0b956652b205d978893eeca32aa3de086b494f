"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiErrorReply = exports.ErrorReply = exports.ReconnectStrategyError = exports.RootNodesUnavailableError = exports.SocketClosedUnexpectedlyError = exports.DisconnectsClientError = exports.ClientOfflineError = exports.ClientClosedError = exports.ConnectionTimeoutError = exports.WatchError = exports.AbortError = void 0;
class AbortError extends Error {
    constructor() {
        super('The command was aborted');
    }
}
exports.AbortError = AbortError;
class WatchError extends Error {
    constructor() {
        super('One (or more) of the watched keys has been changed');
    }
}
exports.WatchError = WatchError;
class ConnectionTimeoutError extends Error {
    constructor() {
        super('Connection timeout');
    }
}
exports.ConnectionTimeoutError = ConnectionTimeoutError;
class ClientClosedError extends Error {
    constructor() {
        super('The client is closed');
    }
}
exports.ClientClosedError = ClientClosedError;
class ClientOfflineError extends Error {
    constructor() {
        super('The client is offline');
    }
}
exports.ClientOfflineError = ClientOfflineError;
class DisconnectsClientError extends Error {
    constructor() {
        super('Disconnects client');
    }
}
exports.DisconnectsClientError = DisconnectsClientError;
class SocketClosedUnexpectedlyError extends Error {
    constructor() {
        super('Socket closed unexpectedly');
    }
}
exports.SocketClosedUnexpectedlyError = SocketClosedUnexpectedlyError;
class RootNodesUnavailableError extends Error {
    constructor() {
        super('All the root nodes are unavailable');
    }
}
exports.RootNodesUnavailableError = RootNodesUnavailableError;
class ReconnectStrategyError extends Error {
    constructor(originalError, socketError) {
        super(originalError.message);
        Object.defineProperty(this, "originalError", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "socketError", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.originalError = originalError;
        this.socketError = socketError;
    }
}
exports.ReconnectStrategyError = ReconnectStrategyError;
class ErrorReply extends Error {
    constructor(message) {
        super(message);
        this.stack = undefined;
    }
}
exports.ErrorReply = ErrorReply;
class MultiErrorReply extends ErrorReply {
    constructor(replies, errorIndexes) {
        super(`${errorIndexes.length} commands failed, see .replies and .errorIndexes for more information`);
        Object.defineProperty(this, "replies", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "errorIndexes", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.replies = replies;
        this.errorIndexes = errorIndexes;
    }
    *errors() {
        for (const index of this.errorIndexes) {
            yield this.replies[index];
        }
    }
}
exports.MultiErrorReply = MultiErrorReply;
