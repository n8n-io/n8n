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
exports.ServerMsg = void 0;
const errors_js_1 = require("../errors.js");
const d = __importStar(require("../encoding/json/decode.js"));
const json_decode_js_1 = require("../shared/json_decode.js");
function ServerMsg(obj) {
    const type = d.string(obj["type"]);
    if (type === "hello_ok") {
        return { type: "hello_ok" };
    }
    else if (type === "hello_error") {
        const error = (0, json_decode_js_1.Error)(d.object(obj["error"]));
        return { type: "hello_error", error };
    }
    else if (type === "response_ok") {
        const requestId = d.number(obj["request_id"]);
        const response = Response(d.object(obj["response"]));
        return { type: "response_ok", requestId, response };
    }
    else if (type === "response_error") {
        const requestId = d.number(obj["request_id"]);
        const error = (0, json_decode_js_1.Error)(d.object(obj["error"]));
        return { type: "response_error", requestId, error };
    }
    else {
        throw new errors_js_1.ProtoError("Unexpected type of ServerMsg");
    }
}
exports.ServerMsg = ServerMsg;
function Response(obj) {
    const type = d.string(obj["type"]);
    if (type === "open_stream") {
        return { type: "open_stream" };
    }
    else if (type === "close_stream") {
        return { type: "close_stream" };
    }
    else if (type === "execute") {
        const result = (0, json_decode_js_1.StmtResult)(d.object(obj["result"]));
        return { type: "execute", result };
    }
    else if (type === "batch") {
        const result = (0, json_decode_js_1.BatchResult)(d.object(obj["result"]));
        return { type: "batch", result };
    }
    else if (type === "open_cursor") {
        return { type: "open_cursor" };
    }
    else if (type === "close_cursor") {
        return { type: "close_cursor" };
    }
    else if (type === "fetch_cursor") {
        const entries = d.arrayObjectsMap(obj["entries"], json_decode_js_1.CursorEntry);
        const done = d.boolean(obj["done"]);
        return { type: "fetch_cursor", entries, done };
    }
    else if (type === "sequence") {
        return { type: "sequence" };
    }
    else if (type === "describe") {
        const result = (0, json_decode_js_1.DescribeResult)(d.object(obj["result"]));
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
        throw new errors_js_1.ProtoError("Unexpected type of Response");
    }
}
