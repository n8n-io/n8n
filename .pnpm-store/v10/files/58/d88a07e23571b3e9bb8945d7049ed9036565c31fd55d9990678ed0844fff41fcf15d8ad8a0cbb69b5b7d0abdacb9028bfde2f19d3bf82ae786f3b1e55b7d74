import { Stmt, Batch } from "../shared/json_encode.js";
import { impossible } from "../util.js";
export function PipelineReqBody(w, msg) {
    if (msg.baton !== undefined) {
        w.string("baton", msg.baton);
    }
    w.arrayObjects("requests", msg.requests, StreamRequest);
}
function StreamRequest(w, msg) {
    w.stringRaw("type", msg.type);
    if (msg.type === "close") {
        // do nothing
    }
    else if (msg.type === "execute") {
        w.object("stmt", msg.stmt, Stmt);
    }
    else if (msg.type === "batch") {
        w.object("batch", msg.batch, Batch);
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
        throw impossible(msg, "Impossible type of StreamRequest");
    }
}
export function CursorReqBody(w, msg) {
    if (msg.baton !== undefined) {
        w.string("baton", msg.baton);
    }
    w.object("batch", msg.batch, Batch);
}
