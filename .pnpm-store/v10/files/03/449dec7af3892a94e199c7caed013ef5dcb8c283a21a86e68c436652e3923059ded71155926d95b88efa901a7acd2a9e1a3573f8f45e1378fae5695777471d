import type { fetch } from "cross-fetch";
import type { SqlOwner, ProtoSql } from "../sql.js";
import { Sql } from "../sql.js";
import { Stream } from "../stream.js";
import type { HttpClient } from "./client.js";
import { HttpCursor } from "./cursor.js";
import type * as proto from "./proto.js";
export declare class HttpStream extends Stream implements SqlOwner {
    #private;
    /** @private */
    constructor(client: HttpClient, baseUrl: URL, jwt: string | undefined, customFetch: typeof fetch, remoteEncryptionKey?: string);
    /** Get the {@link HttpClient} object that this stream belongs to. */
    client(): HttpClient;
    /** @private */
    _sqlOwner(): SqlOwner;
    /** Cache a SQL text on the server. */
    storeSql(sql: string): Sql;
    /** @private */
    _closeSql(sqlId: number): void;
    /** @private */
    _execute(stmt: proto.Stmt): Promise<proto.StmtResult>;
    /** @private */
    _batch(batch: proto.Batch): Promise<proto.BatchResult>;
    /** @private */
    _describe(protoSql: ProtoSql): Promise<proto.DescribeResult>;
    /** @private */
    _sequence(protoSql: ProtoSql): Promise<void>;
    /** Check whether the SQL connection underlying this stream is in autocommit state (i.e., outside of an
     * explicit transaction). This requires protocol version 3 or higher.
     */
    getAutocommit(): Promise<boolean>;
    /** @private */
    _openCursor(batch: proto.Batch): Promise<HttpCursor>;
    /** @private */
    _cursorClosed(cursor: HttpCursor): void;
    /** Immediately close the stream. */
    close(): void;
    /** Gracefully close the stream. */
    closeGracefully(): void;
    /** True if the stream is closed. */
    get closed(): boolean;
    /** @private */
    _setClosed(error: Error): void;
}
