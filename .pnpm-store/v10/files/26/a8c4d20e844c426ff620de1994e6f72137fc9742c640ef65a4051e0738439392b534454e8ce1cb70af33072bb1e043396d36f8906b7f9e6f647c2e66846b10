"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Batch = exports.Stmt = void 0;
const js_base64_1 = require("js-base64");
const util_js_1 = require("../util.js");
function Stmt(w, msg) {
    if (msg.sql !== undefined) {
        w.string("sql", msg.sql);
    }
    if (msg.sqlId !== undefined) {
        w.number("sql_id", msg.sqlId);
    }
    w.arrayObjects("args", msg.args, Value);
    w.arrayObjects("named_args", msg.namedArgs, NamedArg);
    w.boolean("want_rows", msg.wantRows);
}
exports.Stmt = Stmt;
function NamedArg(w, msg) {
    w.string("name", msg.name);
    w.object("value", msg.value, Value);
}
function Batch(w, msg) {
    w.arrayObjects("steps", msg.steps, BatchStep);
}
exports.Batch = Batch;
function BatchStep(w, msg) {
    if (msg.condition !== undefined) {
        w.object("condition", msg.condition, BatchCond);
    }
    w.object("stmt", msg.stmt, Stmt);
}
function BatchCond(w, msg) {
    w.stringRaw("type", msg.type);
    if (msg.type === "ok" || msg.type === "error") {
        w.number("step", msg.step);
    }
    else if (msg.type === "not") {
        w.object("cond", msg.cond, BatchCond);
    }
    else if (msg.type === "and" || msg.type === "or") {
        w.arrayObjects("conds", msg.conds, BatchCond);
    }
    else if (msg.type === "is_autocommit") {
        // do nothing
    }
    else {
        throw (0, util_js_1.impossible)(msg, "Impossible type of BatchCond");
    }
}
function Value(w, msg) {
    if (msg === null) {
        w.stringRaw("type", "null");
    }
    else if (typeof msg === "bigint") {
        w.stringRaw("type", "integer");
        w.stringRaw("value", "" + msg);
    }
    else if (typeof msg === "number") {
        w.stringRaw("type", "float");
        w.number("value", msg);
    }
    else if (typeof msg === "string") {
        w.stringRaw("type", "text");
        w.string("value", msg);
    }
    else if (msg instanceof Uint8Array) {
        w.stringRaw("type", "blob");
        w.stringRaw("base64", js_base64_1.Base64.fromUint8Array(msg));
    }
    else if (msg === undefined) {
        // do nothing
    }
    else {
        throw (0, util_js_1.impossible)(msg, "Impossible type of Value");
    }
}
