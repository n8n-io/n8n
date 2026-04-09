/// <reference types="node" />

import { EventEmitter } from "events";

export enum Transport {
    Tcp = 1,
    Udp = 2,
}

export enum Facility {
    Kernel = 0,
    User = 1,
    System = 3,
    Audit = 13,
    Alert = 14,
    Local0 = 16,
    Local1 = 17,
    Local2 = 18,
    Local3 = 19,
    Local4 = 20,
    Local5 = 21,
    Local6 = 22,
    Local7 = 23,
}

export enum Severity {
    Emergency = 0,
    Alert = 1,
    Critical = 2,
    Error = 3,
    Warning = 4,
    Notice = 5,
    Informational = 6,
    Debug = 7,
}

export interface ClientOptions {
    syslogHostname?: string | undefined;
    port?: number | undefined;
    tcpTimeout?: number | undefined;
    facility?: Facility | undefined;
    severity?: Severity | undefined;
    rfc3164?: boolean | undefined;
    appName?: string | undefined;
    dateFormatter?: (() => string) | undefined;
    transport?: Transport | undefined;
    timestamp?: Date | undefined;
    msgid?: string | undefined;
}

export interface MessageOptions {
    syslogHostname?: string | undefined;
    facility?: Facility | undefined;
    severity?: Severity | undefined;
    rfc3164?: boolean | undefined;
    appName?: string | undefined;
    timestamp?: Date | undefined;
    msgid?: string | undefined;
}

export class Client extends EventEmitter {
    constructor(target?: string, options?: ClientOptions);
    buildFormattedMessage(message: string, options: MessageOptions): Buffer;
    close(): Client;
    log(message: string, options?: MessageOptions, cb?: (error: Error | null) => void): Client;
    getTransport(cb: (error: Error | null, transport: Transport) => void): void;
    onClose(): Client;
    onError(error: Error): Client;
}

export function createClient(target: string, options: ClientOptions): Client;
