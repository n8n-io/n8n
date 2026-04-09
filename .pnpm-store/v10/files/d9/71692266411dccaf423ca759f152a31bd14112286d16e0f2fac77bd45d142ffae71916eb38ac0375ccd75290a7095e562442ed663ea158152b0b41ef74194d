import { Base64 } from "js-base64";
import { ProtoError } from "../errors.js";
import * as d from "../encoding/json/decode.js";
export function Error(obj) {
    const message = d.string(obj["message"]);
    const code = d.stringOpt(obj["code"]);
    return { message, code };
}
export function StmtResult(obj) {
    const cols = d.arrayObjectsMap(obj["cols"], Col);
    const rows = d.array(obj["rows"]).map((rowObj) => d.arrayObjectsMap(rowObj, Value));
    const affectedRowCount = d.number(obj["affected_row_count"]);
    const lastInsertRowidStr = d.stringOpt(obj["last_insert_rowid"]);
    const lastInsertRowid = lastInsertRowidStr !== undefined
        ? BigInt(lastInsertRowidStr) : undefined;
    return { cols, rows, affectedRowCount, lastInsertRowid };
}
function Col(obj) {
    const name = d.stringOpt(obj["name"]);
    const decltype = d.stringOpt(obj["decltype"]);
    return { name, decltype };
}
export function BatchResult(obj) {
    const stepResults = new Map();
    d.array(obj["step_results"]).forEach((value, i) => {
        if (value !== null) {
            stepResults.set(i, StmtResult(d.object(value)));
        }
    });
    const stepErrors = new Map();
    d.array(obj["step_errors"]).forEach((value, i) => {
        if (value !== null) {
            stepErrors.set(i, Error(d.object(value)));
        }
    });
    return { stepResults, stepErrors };
}
export function CursorEntry(obj) {
    const type = d.string(obj["type"]);
    if (type === "step_begin") {
        const step = d.number(obj["step"]);
        const cols = d.arrayObjectsMap(obj["cols"], Col);
        return { type: "step_begin", step, cols };
    }
    else if (type === "step_end") {
        const affectedRowCount = d.number(obj["affected_row_count"]);
        const lastInsertRowidStr = d.stringOpt(obj["last_insert_rowid"]);
        const lastInsertRowid = lastInsertRowidStr !== undefined
            ? BigInt(lastInsertRowidStr) : undefined;
        return { type: "step_end", affectedRowCount, lastInsertRowid };
    }
    else if (type === "step_error") {
        const step = d.number(obj["step"]);
        const error = Error(d.object(obj["error"]));
        return { type: "step_error", step, error };
    }
    else if (type === "row") {
        const row = d.arrayObjectsMap(obj["row"], Value);
        return { type: "row", row };
    }
    else if (type === "error") {
        const error = Error(d.object(obj["error"]));
        return { type: "error", error };
    }
    else {
        throw new ProtoError("Unexpected type of CursorEntry");
    }
}
export function DescribeResult(obj) {
    const params = d.arrayObjectsMap(obj["params"], DescribeParam);
    const cols = d.arrayObjectsMap(obj["cols"], DescribeCol);
    const isExplain = d.boolean(obj["is_explain"]);
    const isReadonly = d.boolean(obj["is_readonly"]);
    return { params, cols, isExplain, isReadonly };
}
function DescribeParam(obj) {
    const name = d.stringOpt(obj["name"]);
    return { name };
}
function DescribeCol(obj) {
    const name = d.string(obj["name"]);
    const decltype = d.stringOpt(obj["decltype"]);
    return { name, decltype };
}
export function Value(obj) {
    const type = d.string(obj["type"]);
    if (type === "null") {
        return null;
    }
    else if (type === "integer") {
        const value = d.string(obj["value"]);
        return BigInt(value);
    }
    else if (type === "float") {
        return d.number(obj["value"]);
    }
    else if (type === "text") {
        return d.string(obj["value"]);
    }
    else if (type === "blob") {
        return Base64.toUint8Array(d.string(obj["base64"]));
    }
    else {
        throw new ProtoError("Unexpected type of Value");
    }
}
