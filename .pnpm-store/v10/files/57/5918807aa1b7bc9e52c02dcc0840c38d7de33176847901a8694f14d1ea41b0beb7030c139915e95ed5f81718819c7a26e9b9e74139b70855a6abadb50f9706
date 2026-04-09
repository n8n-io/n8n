"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Value = exports.DescribeResult = exports.CursorEntry = exports.BatchResult = exports.StmtResult = exports.Error = void 0;
const js_base64_1 = require("js-base64");
const errors_js_1 = require("../errors.js");
const d = __importStar(require("../encoding/json/decode.js"));
function Error(obj) {
    const message = d.string(obj["message"]);
    const code = d.stringOpt(obj["code"]);
    return { message, code };
}
exports.Error = Error;
function StmtResult(obj) {
    const cols = d.arrayObjectsMap(obj["cols"], Col);
    const rows = d.array(obj["rows"]).map((rowObj) => d.arrayObjectsMap(rowObj, Value));
    const affectedRowCount = d.number(obj["affected_row_count"]);
    const lastInsertRowidStr = d.stringOpt(obj["last_insert_rowid"]);
    const lastInsertRowid = lastInsertRowidStr !== undefined
        ? BigInt(lastInsertRowidStr) : undefined;
    return { cols, rows, affectedRowCount, lastInsertRowid };
}
exports.StmtResult = StmtResult;
function Col(obj) {
    const name = d.stringOpt(obj["name"]);
    const decltype = d.stringOpt(obj["decltype"]);
    return { name, decltype };
}
function BatchResult(obj) {
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
exports.BatchResult = BatchResult;
function CursorEntry(obj) {
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
        throw new errors_js_1.ProtoError("Unexpected type of CursorEntry");
    }
}
exports.CursorEntry = CursorEntry;
function DescribeResult(obj) {
    const params = d.arrayObjectsMap(obj["params"], DescribeParam);
    const cols = d.arrayObjectsMap(obj["cols"], DescribeCol);
    const isExplain = d.boolean(obj["is_explain"]);
    const isReadonly = d.boolean(obj["is_readonly"]);
    return { params, cols, isExplain, isReadonly };
}
exports.DescribeResult = DescribeResult;
function DescribeParam(obj) {
    const name = d.stringOpt(obj["name"]);
    return { name };
}
function DescribeCol(obj) {
    const name = d.string(obj["name"]);
    const decltype = d.stringOpt(obj["decltype"]);
    return { name, decltype };
}
function Value(obj) {
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
        return js_base64_1.Base64.toUint8Array(d.string(obj["base64"]));
    }
    else {
        throw new errors_js_1.ProtoError("Unexpected type of Value");
    }
}
exports.Value = Value;
