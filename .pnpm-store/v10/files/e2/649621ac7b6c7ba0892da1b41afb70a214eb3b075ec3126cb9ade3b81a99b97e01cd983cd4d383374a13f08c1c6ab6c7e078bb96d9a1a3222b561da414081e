"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientMsg = void 0;
const json_encode_js_1 = require("../shared/json_encode.js");
const util_js_1 = require("../util.js");
function ClientMsg(w, msg) {
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
        throw (0, util_js_1.impossible)(msg, "Impossible type of ClientMsg");
    }
}
exports.ClientMsg = ClientMsg;
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
        w.object("stmt", msg.stmt, json_encode_js_1.Stmt);
    }
    else if (msg.type === "batch") {
        w.number("stream_id", msg.streamId);
        w.object("batch", msg.batch, json_encode_js_1.Batch);
    }
    else if (msg.type === "open_cursor") {
        w.number("stream_id", msg.streamId);
        w.number("cursor_id", msg.cursorId);
        w.object("batch", msg.batch, json_encode_js_1.Batch);
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
        throw (0, util_js_1.impossible)(msg, "Impossible type of Request");
    }
}
