// Type definitions for promise-ftp-common 1.1
// Project: https://github.com/realtymaps/promise-ftp-common
// Definitions by: coolreader18 <https://github.com/coolreader18>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 2.4

export enum STATUSES {
    NOT_YET_CONNECTED = "not yet connected",
    CONNECTING = "connecting",
    CONNECTED = "connected",
    LOGGING_OUT = "logging out",
    DISCONNECTING = "disconnecting",
    DISCONNECTED = "disconnected",
    RECONNECTING = "reconnecting"
}
export class FtpConnectionError extends Error {}
export class FtpReconnectError extends Error {
    constructor(
        disconnectError?: string | Error,
        connectError?: string | Error,
        onCwd?: boolean
    );
    connectError: string | Error;
    disconnectError: string | Error;
}
