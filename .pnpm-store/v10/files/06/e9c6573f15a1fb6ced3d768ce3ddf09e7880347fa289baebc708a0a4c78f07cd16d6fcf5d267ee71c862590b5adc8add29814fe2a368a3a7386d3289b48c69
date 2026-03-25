"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBlob = exports.isReadableStream = void 0;
const isReadableStream = (stream) => {
    var _a;
    return typeof ReadableStream === "function" &&
        (((_a = stream === null || stream === void 0 ? void 0 : stream.constructor) === null || _a === void 0 ? void 0 : _a.name) === ReadableStream.name || stream instanceof ReadableStream);
};
exports.isReadableStream = isReadableStream;
const isBlob = (blob) => {
    var _a;
    return typeof Blob === "function" && (((_a = blob === null || blob === void 0 ? void 0 : blob.constructor) === null || _a === void 0 ? void 0 : _a.name) === Blob.name || blob instanceof Blob);
};
exports.isBlob = isBlob;
