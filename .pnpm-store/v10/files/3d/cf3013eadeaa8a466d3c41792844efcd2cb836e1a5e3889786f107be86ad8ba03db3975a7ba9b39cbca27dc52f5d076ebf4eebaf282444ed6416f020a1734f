/// <reference types="ws" />
import { WebSocket } from "@libsql/isomorphic-ws";
import type { ProtocolVersion, ProtocolEncoding } from "../client.js";
import { Client } from "../client.js";
import { IdAlloc } from "../id_alloc.js";
import { Sql, SqlOwner } from "../sql.js";
import type * as proto from "./proto.js";
import { WsStream } from "./stream.js";
export type Subprotocol = {
    version: ProtocolVersion;
    encoding: ProtocolEncoding;
};
export declare const subprotocolsV2: Map<string, Subprotocol>;
export declare const subprotocolsV3: Map<string, Subprotocol>;
/** A client for the Hrana protocol over a WebSocket. */
export declare class WsClient extends Client implements SqlOwner {
    #private;
    /** @private */
    _streamIdAlloc: IdAlloc;
    /** @private */
    _cursorIdAlloc: IdAlloc;
    /** @private */
    constructor(socket: WebSocket, jwt: string | undefined);
    /** Get the protocol version negotiated with the server, possibly waiting until the socket is open. */
    getVersion(): Promise<ProtocolVersion>;
    /** @private */
    _ensureVersion(minVersion: ProtocolVersion, feature: string): void;
    /** @private */
    _sendRequest(request: proto.Request, callbacks: ResponseCallbacks): void;
    /** Open a {@link WsStream}, a stream for executing SQL statements. */
    openStream(): WsStream;
    /** Cache a SQL text on the server. This requires protocol version 2 or higher. */
    storeSql(sql: string): Sql;
    /** @private */
    _closeSql(sqlId: number): void;
    /** Close the client and the WebSocket. */
    close(): void;
    /** True if the client is closed. */
    get closed(): boolean;
}
export interface OpenCallbacks {
    openCallback: () => void;
    errorCallback: (_: Error) => void;
}
export interface ResponseCallbacks {
    responseCallback: (_: proto.Response) => void;
    errorCallback: (_: Error) => void;
}
