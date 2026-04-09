"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CursorRespBody = exports.PipelineRespBody = void 0;
const protobuf_decode_js_1 = require("../shared/protobuf_decode.js");
exports.PipelineRespBody = {
    default() { return { baton: undefined, baseUrl: undefined, results: [] }; },
    1(r, msg) { msg.baton = r.string(); },
    2(r, msg) { msg.baseUrl = r.string(); },
    3(r, msg) { msg.results.push(r.message(StreamResult)); },
};
const StreamResult = {
    default() { return { type: "none" }; },
    1(r) { return { type: "ok", response: r.message(StreamResponse) }; },
    2(r) { return { type: "error", error: r.message(protobuf_decode_js_1.Error) }; },
};
const StreamResponse = {
    default() { return { type: "none" }; },
    1(r) { return { type: "close" }; },
    2(r) { return r.message(ExecuteStreamResp); },
    3(r) { return r.message(BatchStreamResp); },
    4(r) { return { type: "sequence" }; },
    5(r) { return r.message(DescribeStreamResp); },
    6(r) { return { type: "store_sql" }; },
    7(r) { return { type: "close_sql" }; },
    8(r) { return r.message(GetAutocommitStreamResp); },
};
const ExecuteStreamResp = {
    default() { return { type: "execute", result: protobuf_decode_js_1.StmtResult.default() }; },
    1(r, msg) { msg.result = r.message(protobuf_decode_js_1.StmtResult); },
};
const BatchStreamResp = {
    default() { return { type: "batch", result: protobuf_decode_js_1.BatchResult.default() }; },
    1(r, msg) { msg.result = r.message(protobuf_decode_js_1.BatchResult); },
};
const DescribeStreamResp = {
    default() { return { type: "describe", result: protobuf_decode_js_1.DescribeResult.default() }; },
    1(r, msg) { msg.result = r.message(protobuf_decode_js_1.DescribeResult); },
};
const GetAutocommitStreamResp = {
    default() { return { type: "get_autocommit", isAutocommit: false }; },
    1(r, msg) { msg.isAutocommit = r.bool(); },
};
exports.CursorRespBody = {
    default() { return { baton: undefined, baseUrl: undefined }; },
    1(r, msg) { msg.baton = r.string(); },
    2(r, msg) { msg.baseUrl = r.string(); },
};
