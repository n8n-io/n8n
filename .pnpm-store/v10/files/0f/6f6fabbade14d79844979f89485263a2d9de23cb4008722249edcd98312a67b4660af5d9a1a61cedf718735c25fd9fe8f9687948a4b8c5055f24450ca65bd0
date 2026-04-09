import { Stmt, Batch } from "../shared/json_encode.js";
import { impossible } from "../util.js";
export function ClientMsg(w, msg) {
    w.stringRaw("type", msg.type);
    if (msg.type === "hello") {
        if (msg.jwt !== undefined) {
            w.string("jwt", msg.jwt);
        }
    }
    else if (msg.type === "request") {
        w.number("request_id", msg.requestId);
        w.object("request", msg.request, Request);
    }
    else {
        throw impossible(msg, "Impossible type of ClientMsg");
    }
}
function Request(w, msg) {
    w.stringRaw("type", msg.type);
    if (msg.type === "open_stream") {
        w.number("stream_id", msg.streamId);
    }
    else if (msg.type === "close_stream") {
        w.number("stream_id", msg.streamId);
    }
    else if (msg.type === "execute") {
        w.number("stream_id", msg.streamId);
        w.object("stmt", msg.stmt, Stmt);
    }
    else if (msg.type === "batch") {
        w.number("stream_id", msg.streamId);
        w.object("batch", msg.batch, Batch);
    }
    else if (msg.type === "open_cursor") {
        w.number("stream_id", msg.streamId);
        w.number("cursor_id", msg.cursorId);
        w.object("batch", msg.batch, Batch);
    }
    else if (msg.type === "close_cursor") {
        w.number("cursor_id", msg.cursorId);
    }
    else if (msg.type === "fetch_cursor") {
        w.number("cursor_id", msg.cursorId);
        w.number("max_count", msg.maxCount);
    }
    else if (msg.type === "sequence") {
        w.number("stream_id", msg.streamId);
        if (msg.sql !== undefined) {
            w.string("sql", msg.sql);
        }
        if (msg.sqlId !== undefined) {
            w.number("sql_id", msg.sqlId);
        }
    }
    else if (msg.type === "describe") {
        w.number("stream_id", msg.streamId);
        if (msg.sql !== undefined) {
            w.string("sql", msg.sql);
        }
        if (msg.sqlId !== undefined) {
            w.number("sql_id", msg.sqlId);
        }
    }
    else if (msg.type === "store_sql") {
        w.number("sql_id", msg.sqlId);
        w.string("sql", msg.sql);
    }
    else if (msg.type === "close_sql") {
        w.number("sql_id", msg.sqlId);
    }
    else if (msg.type === "get_autocommit") {
        w.number("stream_id", msg.streamId);
    }
    else {
        throw impossible(msg, "Impossible type of Request");
    }
}
