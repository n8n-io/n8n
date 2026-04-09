"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CursorReqBody = exports.PipelineReqBody = void 0;
const json_encode_js_1 = require("../shared/json_encode.js");
const util_js_1 = require("../util.js");
function PipelineReqBody(w, msg) {
    if (msg.baton !== undefined) {
        w.string("baton", msg.baton);
    }
    w.arrayObjects("requests", msg.requests, StreamRequest);
}
exports.PipelineReqBody = PipelineReqBody;
function StreamRequest(w, msg) {
    w.stringRaw("type", msg.type);
    if (msg.type === "close") {
        // do nothing
    }
    else if (msg.type === "execute") {
        w.object("stmt", msg.stmt, json_encode_js_1.Stmt);
    }
    else if (msg.type === "batch") {
        w.object("batch", msg.batch, json_encode_js_1.Batch);
    }
    else if (msg.type === "sequence") {
        if (msg.sql !== undefined) {
            w.string("sql", msg.sql);
        }
        if (msg.sqlId !== undefined) {
            w.number("sql_id", msg.sqlId);
        }
    }
    else if (msg.type === "describe") {
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
        // do nothing
    }
    else {
        throw (0, util_js_1.impossible)(msg, "Impossible type of StreamRequest");
    }
}
function CursorReqBody(w, msg) {
    if (msg.baton !== undefined) {
        w.string("baton", msg.baton);
    }
    w.object("batch", msg.batch, json_encode_js_1.Batch);
}
exports.CursorReqBody = CursorReqBody;
