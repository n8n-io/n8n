import type { ProtocolVersion, ProtocolEncoding } from "../client.js";
import { Client } from "../client.js";
import { HttpStream } from "./stream.js";
export type Endpoint = {
    versionPath: string;
    pipelinePath: string;
    cursorPath: string | undefined;
    version: ProtocolVersion;
    encoding: ProtocolEncoding;
};
export declare const checkEndpoints: Array<Endpoint>;
/** A client for the Hrana protocol over HTTP. */
export declare class HttpClient extends Client {
    #private;
    /** @private */
    _endpointPromise: Promise<Endpoint>;
    /** @private */
    _endpoint: Endpoint | undefined;
    /** @private */
    constructor(url: URL, jwt: string | undefined, customFetch: unknown | undefined, remoteEncryptionKey?: string, protocolVersion?: ProtocolVersion);
    /** Get the protocol version supported by the server. */
    getVersion(): Promise<ProtocolVersion>;
    /** @private */
    _ensureVersion(minVersion: ProtocolVersion, feature: string): void;
    /** Open a {@link HttpStream}, a stream for executing SQL statements. */
    openStream(): HttpStream;
    /** @private */
    _streamClosed(stream: HttpStream): void;
    /** Close the client and all its streams. */
    close(): void;
    /** True if the client is closed. */
    get closed(): boolean;
}
