import type { SqlOwner, ProtoSql } from "../sql.js";
import { Stream } from "../stream.js";
import type { WsClient } from "./client.js";
import { WsCursor } from "./cursor.js";
import type * as proto from "./proto.js";
export declare class WsStream extends Stream {
    #private;
    /** @private */
    static open(client: WsClient): WsStream;
    /** @private */
    constructor(client: WsClient, streamId: number);
    /** Get the {@link WsClient} object that this stream belongs to. */
    client(): WsClient;
    /** @private */
    _sqlOwner(): SqlOwner;
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
    _openCursor(batch: proto.Batch): Promise<WsCursor>;
    /** @private */
    _sendCursorRequest(cursor: WsCursor, request: proto.Request): Promise<proto.Response>;
    /** @private */
    _cursorClosed(cursor: WsCursor): void;
    /** Immediately close the stream. */
    close(): void;
    /** Gracefully close the stream. */
    closeGracefully(): void;
    /** True if the stream is closed or closing. */
    get closed(): boolean;
}
