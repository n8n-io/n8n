"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerMsg = void 0;
const protobuf_decode_js_1 = require("../shared/protobuf_decode.js");
exports.ServerMsg = {
    default() { return { type: "none" }; },
    1(r) { return { type: "hello_ok" }; },
    2(r) { return r.message(HelloErrorMsg); },
    3(r) { return r.message(ResponseOkMsg); },
    4(r) { return r.message(ResponseErrorMsg); },
};
const HelloErrorMsg = {
    default() { return { type: "hello_error", error: protobuf_decode_js_1.Error.default() }; },
    1(r, msg) { msg.error = r.message(protobuf_decode_js_1.Error); },
};
const ResponseErrorMsg = {
    default() { return { type: "response_error", requestId: 0, error: protobuf_decode_js_1.Error.default() }; },
    1(r, msg) { msg.requestId = r.int32(); },
    2(r, msg) { msg.error = r.message(protobuf_decode_js_1.Error); },
};
const ResponseOkMsg = {
    default() {
        return {
            type: "response_ok",
            requestId: 0,
            response: { type: "none" },
        };
    },
    1(r, msg) { msg.requestId = r.int32(); },
    2(r, msg) { msg.response = { type: "open_stream" }; },
    3(r, msg) { msg.response = { type: "close_stream" }; },
    4(r, msg) { msg.response = r.message(ExecuteResp); },
    5(r, msg) { msg.response = r.message(BatchResp); },
    6(r, msg) { msg.response = { type: "open_cursor" }; },
    7(r, msg) { msg.response = { type: "close_cursor" }; },
    8(r, msg) { msg.response = r.message(FetchCursorResp); },
    9(r, msg) { msg.response = { type: "sequence" }; },
    10(r, msg) { msg.response = r.message(DescribeResp); },
    11(r, msg) { msg.response = { type: "store_sql" }; },
    12(r, msg) { msg.response = { type: "close_sql" }; },
    13(r, msg) { msg.response = r.message(GetAutocommitResp); },
};
const ExecuteResp = {
    default() { return { type: "execute", result: protobuf_decode_js_1.StmtResult.default() }; },
    1(r, msg) { msg.result = r.message(protobuf_decode_js_1.StmtResult); },
};
const BatchResp = {
    default() { return { type: "batch", result: protobuf_decode_js_1.BatchResult.default() }; },
    1(r, msg) { msg.result = r.message(protobuf_decode_js_1.BatchResult); },
};
const FetchCursorResp = {
    default() { return { type: "fetch_cursor", entries: [], done: false }; },
    1(r, msg) { msg.entries.push(r.message(protobuf_decode_js_1.CursorEntry)); },
    2(r, msg) { msg.done = r.bool(); },
};
const DescribeResp = {
    default() { return { type: "describe", result: protobuf_decode_js_1.DescribeResult.default() }; },
    1(r, msg) { msg.result = r.message(protobuf_decode_js_1.DescribeResult); },
};
const GetAutocommitResp = {
    default() { return { type: "get_autocommit", isAutocommit: false }; },
    1(r, msg) { msg.isAutocommit = r.bool(); },
};
