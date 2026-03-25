import { RedisCommandRawReply } from './commands';
export declare class AbortError extends Error {
    constructor();
}
export declare class WatchError extends Error {
    constructor();
}
export declare class ConnectionTimeoutError extends Error {
    constructor();
}
export declare class ClientClosedError extends Error {
    constructor();
}
export declare class ClientOfflineError extends Error {
    constructor();
}
export declare class DisconnectsClientError extends Error {
    constructor();
}
export declare class SocketClosedUnexpectedlyError extends Error {
    constructor();
}
export declare class RootNodesUnavailableError extends Error {
    constructor();
}
export declare class ReconnectStrategyError extends Error {
    originalError: Error;
    socketError: unknown;
    constructor(originalError: Error, socketError: unknown);
}
export declare class ErrorReply extends Error {
    constructor(message: string);
}
export declare class MultiErrorReply extends ErrorReply {
    replies: (RedisCommandRawReply | ErrorReply)[];
    errorIndexes: number[];
    constructor(replies: Array<RedisCommandRawReply | ErrorReply>, errorIndexes: Array<number>);
    errors(): Generator<RedisCommandRawReply | ErrorReply, void, unknown>;
}
