import { ClientError, ClosedError, InternalError } from "../errors.js";
import { Queue } from "../queue.js";
import { Stream } from "../stream.js";
import { WsCursor } from "./cursor.js";
export class WsStream extends Stream {
    #client;
    #streamId;
    #queue;
    #cursor;
    #closing;
    #closed;
    /** @private */
    static open(client) {
        const streamId = client._streamIdAlloc.alloc();
        const stream = new WsStream(client, streamId);
        const responseCallback = () => undefined;
        const errorCallback = (e) => stream.#setClosed(e);
        const request = { type: "open_stream", streamId };
        client._sendRequest(request, { responseCallback, errorCallback });
        return stream;
    }
    /** @private */
    constructor(client, streamId) {
        super(client.intMode);
        this.#client = client;
        this.#streamId = streamId;
        this.#queue = new Queue();
        this.#cursor = undefined;
        this.#closing = false;
        this.#closed = undefined;
    }
    /** Get the {@link WsClient} object that this stream belongs to. */
    client() {
        return this.#client;
    }
    /** @private */
    _sqlOwner() {
        return this.#client;
    }
    /** @private */
    _execute(stmt) {
        return this.#sendStreamRequest({
            type: "execute",
            streamId: this.#streamId,
            stmt,
        }).then((response) => {
            return response.result;
        });
    }
    /** @private */
    _batch(batch) {
        return this.#sendStreamRequest({
            type: "batch",
            streamId: this.#streamId,
            batch,
        }).then((response) => {
            return response.result;
        });
    }
    /** @private */
    _describe(protoSql) {
        this.#client._ensureVersion(2, "describe()");
        return this.#sendStreamRequest({
            type: "describe",
            streamId: this.#streamId,
            sql: protoSql.sql,
            sqlId: protoSql.sqlId,
        }).then((response) => {
            return response.result;
        });
    }
    /** @private */
    _sequence(protoSql) {
        this.#client._ensureVersion(2, "sequence()");
        return this.#sendStreamRequest({
            type: "sequence",
            streamId: this.#streamId,
            sql: protoSql.sql,
            sqlId: protoSql.sqlId,
        }).then((_response) => {
            return undefined;
        });
    }
    /** Check whether the SQL connection underlying this stream is in autocommit state (i.e., outside of an
     * explicit transaction). This requires protocol version 3 or higher.
     */
    getAutocommit() {
        this.#client._ensureVersion(3, "getAutocommit()");
        return this.#sendStreamRequest({
            type: "get_autocommit",
            streamId: this.#streamId,
        }).then((response) => {
            return response.isAutocommit;
        });
    }
    #sendStreamRequest(request) {
        return new Promise((responseCallback, errorCallback) => {
            this.#pushToQueue({ type: "request", request, responseCallback, errorCallback });
        });
    }
    /** @private */
    _openCursor(batch) {
        this.#client._ensureVersion(3, "cursor");
        return new Promise((cursorCallback, errorCallback) => {
            this.#pushToQueue({ type: "cursor", batch, cursorCallback, errorCallback });
        });
    }
    /** @private */
    _sendCursorRequest(cursor, request) {
        if (cursor !== this.#cursor) {
            throw new InternalError("Cursor not associated with the stream attempted to execute a request");
        }
        return new Promise((responseCallback, errorCallback) => {
            if (this.#closed !== undefined) {
                errorCallback(new ClosedError("Stream is closed", this.#closed));
            }
            else {
                this.#client._sendRequest(request, { responseCallback, errorCallback });
            }
        });
    }
    /** @private */
    _cursorClosed(cursor) {
        if (cursor !== this.#cursor) {
            throw new InternalError("Cursor was closed, but it was not associated with the stream");
        }
        this.#cursor = undefined;
        this.#flushQueue();
    }
    #pushToQueue(entry) {
        if (this.#closed !== undefined) {
            entry.errorCallback(new ClosedError("Stream is closed", this.#closed));
        }
        else if (this.#closing) {
            entry.errorCallback(new ClosedError("Stream is closing", undefined));
        }
        else {
            this.#queue.push(entry);
            this.#flushQueue();
        }
    }
    #flushQueue() {
        for (;;) {
            const entry = this.#queue.first();
            if (entry === undefined && this.#cursor === undefined && this.#closing) {
                this.#setClosed(new ClientError("Stream was gracefully closed"));
                break;
            }
            else if (entry?.type === "request" && this.#cursor === undefined) {
                const { request, responseCallback, errorCallback } = entry;
                this.#queue.shift();
                this.#client._sendRequest(request, { responseCallback, errorCallback });
            }
            else if (entry?.type === "cursor" && this.#cursor === undefined) {
                const { batch, cursorCallback } = entry;
                this.#queue.shift();
                const cursorId = this.#client._cursorIdAlloc.alloc();
                const cursor = new WsCursor(this.#client, this, cursorId);
                const request = {
                    type: "open_cursor",
                    streamId: this.#streamId,
                    cursorId,
                    batch,
                };
                const responseCallback = () => undefined;
                const errorCallback = (e) => cursor._setClosed(e);
                this.#client._sendRequest(request, { responseCallback, errorCallback });
                this.#cursor = cursor;
                cursorCallback(cursor);
            }
            else {
                break;
            }
        }
    }
    #setClosed(error) {
        if (this.#closed !== undefined) {
            return;
        }
        this.#closed = error;
        if (this.#cursor !== undefined) {
            this.#cursor._setClosed(error);
        }
        for (;;) {
            const entry = this.#queue.shift();
            if (entry !== undefined) {
                entry.errorCallback(error);
            }
            else {
                break;
            }
        }
        const request = { type: "close_stream", streamId: this.#streamId };
        const responseCallback = () => this.#client._streamIdAlloc.free(this.#streamId);
        const errorCallback = () => undefined;
        this.#client._sendRequest(request, { responseCallback, errorCallback });
    }
    /** Immediately close the stream. */
    close() {
        this.#setClosed(new ClientError("Stream was manually closed"));
    }
    /** Gracefully close the stream. */
    closeGracefully() {
        this.#closing = true;
        this.#flushQueue();
    }
    /** True if the stream is closed or closing. */
    get closed() {
        return this.#closed !== undefined || this.#closing;
    }
}
