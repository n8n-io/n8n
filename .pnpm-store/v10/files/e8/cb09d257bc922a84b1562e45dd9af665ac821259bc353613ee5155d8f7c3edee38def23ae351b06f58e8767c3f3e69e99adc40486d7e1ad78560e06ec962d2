import { ProtoError } from "../errors.js";
import * as d from "../encoding/json/decode.js";
import { Error, StmtResult, BatchResult, CursorEntry, DescribeResult } from "../shared/json_decode.js";
export function ServerMsg(obj) {
    const type = d.string(obj["type"]);
    if (type === "hello_ok") {
        return { type: "hello_ok" };
    }
    else if (type === "hello_error") {
        const error = Error(d.object(obj["error"]));
        return { type: "hello_error", error };
    }
    else if (type === "response_ok") {
        const requestId = d.number(obj["request_id"]);
        const response = Response(d.object(obj["response"]));
        return { type: "response_ok", requestId, response };
    }
    else if (type === "response_error") {
        const requestId = d.number(obj["request_id"]);
        const error = Error(d.object(obj["error"]));
        return { type: "response_error", requestId, error };
    }
    else {
        throw new ProtoError("Unexpected type of ServerMsg");
    }
}
function Response(obj) {
    const type = d.string(obj["type"]);
    if (type === "open_stream") {
        return { type: "open_stream" };
    }
    else if (type === "close_stream") {
        return { type: "close_stream" };
    }
    else if (type === "execute") {
        const result = StmtResult(d.object(obj["result"]));
        return { type: "execute", result };
    }
    else if (type === "batch") {
        const result = BatchResult(d.object(obj["result"]));
        return { type: "batch", result };
    }
    else if (type === "open_cursor") {
        return { type: "open_cursor" };
    }
    else if (type === "close_cursor") {
        return { type: "close_cursor" };
    }
    else if (type === "fetch_cursor") {
        const entries = d.arrayObjectsMap(obj["entries"], CursorEntry);
        const done = d.boolean(obj["done"]);
        return { type: "fetch_cursor", entries, done };
    }
    else if (type === "sequence") {
        return { type: "sequence" };
    }
    else if (type === "describe") {
        const result = DescribeResult(d.object(obj["result"]));
        return { type: "describe", result };
    }
    else if (type === "store_sql") {
        return { type: "store_sql" };
    }
    else if (type === "close_sql") {
        return { type: "close_sql" };
    }
    else if (type === "get_autocommit") {
        const isAutocommit = d.boolean(obj["is_autocommit"]);
        return { type: "get_autocommit", isAutocommit };
    }
    else {
        throw new ProtoError("Unexpected type of Response");
    }
}
