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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRuntime = getRuntime;
/**
 * Disclaimer: modules in _shims aren't intended to be imported by SDK users.
 */
const nf = __importStar(require("node-fetch"));
const fd = __importStar(require("formdata-node"));
const agentkeepalive_1 = __importDefault(require("agentkeepalive"));
const abort_controller_1 = require("abort-controller");
const node_fs_1 = require("node:fs");
const form_data_encoder_1 = require("form-data-encoder");
const node_stream_1 = require("node:stream");
const MultipartBody_1 = require("./MultipartBody.js");
const web_1 = require("node:stream/web");
let fileFromPathWarned = false;
async function fileFromPath(path, ...args) {
    // this import fails in environments that don't handle export maps correctly, like old versions of Jest
    const { fileFromPath: _fileFromPath } = await Promise.resolve().then(() => __importStar(require('formdata-node/file-from-path')));
    if (!fileFromPathWarned) {
        console.warn(`fileFromPath is deprecated; use fs.createReadStream(${JSON.stringify(path)}) instead`);
        fileFromPathWarned = true;
    }
    // @ts-ignore
    return await _fileFromPath(path, ...args);
}
const defaultHttpAgent = new agentkeepalive_1.default({ keepAlive: true, timeout: 5 * 60 * 1000 });
const defaultHttpsAgent = new agentkeepalive_1.default.HttpsAgent({ keepAlive: true, timeout: 5 * 60 * 1000 });
async function getMultipartRequestOptions(form, opts) {
    const encoder = new form_data_encoder_1.FormDataEncoder(form);
    const readable = node_stream_1.Readable.from(encoder);
    const body = new MultipartBody_1.MultipartBody(readable);
    const headers = {
        ...opts.headers,
        ...encoder.headers,
        'Content-Length': encoder.contentLength,
    };
    return { ...opts, body: body, headers };
}
function getRuntime() {
    // Polyfill global object if needed.
    if (typeof AbortController === 'undefined') {
        // @ts-expect-error (the types are subtly different, but compatible in practice)
        globalThis.AbortController = abort_controller_1.AbortController;
    }
    return {
        kind: 'node',
        fetch: nf.default,
        Request: nf.Request,
        Response: nf.Response,
        Headers: nf.Headers,
        FormData: fd.FormData,
        Blob: fd.Blob,
        File: fd.File,
        ReadableStream: web_1.ReadableStream,
        getMultipartRequestOptions,
        getDefaultAgent: (url) => (url.startsWith('https') ? defaultHttpsAgent : defaultHttpAgent),
        fileFromPath,
        isFsReadStream: (value) => value instanceof node_fs_1.ReadStream,
    };
}
//# sourceMappingURL=node-runtime.js.map