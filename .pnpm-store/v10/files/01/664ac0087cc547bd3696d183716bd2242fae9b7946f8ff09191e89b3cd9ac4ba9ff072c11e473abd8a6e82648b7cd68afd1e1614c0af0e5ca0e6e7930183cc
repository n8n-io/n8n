"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStreamingPayload = void 0;
const stream_1 = require("stream");
const isStreamingPayload = (request) => request?.body instanceof stream_1.Readable ||
    (typeof ReadableStream !== "undefined" && request?.body instanceof ReadableStream);
exports.isStreamingPayload = isStreamingPayload;
