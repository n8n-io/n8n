export enum STATUSES {
    NOT_YET_CONNECTED = "not yet connected",
    CONNECTING = "connecting",
    CONNECTED = "connected",
    LOGGING_OUT = "logging out",
    DISCONNECTING = "disconnecting",
    DISCONNECTED = "disconnected",
    RECONNECTING = "reconnecting",
}
export class FtpConnectionError extends Error {}
export class FtpReconnectError extends Error {
    constructor(
        disconnectError?: string | Error,
        connectError?: string | Error,
        onCwd?: boolean,
    );
    connectError: string | Error;
    disconnectError: string | Error;
}
