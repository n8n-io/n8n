"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadBuffer = void 0;
exports.deserializeMessage = deserializeMessage;
exports.serializeMessage = serializeMessage;
const types_js_1 = require("../types.js");
/**
 * Buffers a continuous stdio stream into discrete JSON-RPC messages.
 */
class ReadBuffer {
    append(chunk) {
        this._buffer = this._buffer ? Buffer.concat([this._buffer, chunk]) : chunk;
    }
    readMessage() {
        if (!this._buffer) {
            return null;
        }
        const index = this._buffer.indexOf('\n');
        if (index === -1) {
            return null;
        }
        const line = this._buffer.toString('utf8', 0, index).replace(/\r$/, '');
        this._buffer = this._buffer.subarray(index + 1);
        return deserializeMessage(line);
    }
    clear() {
        this._buffer = undefined;
    }
}
exports.ReadBuffer = ReadBuffer;
function deserializeMessage(line) {
    return types_js_1.JSONRPCMessageSchema.parse(JSON.parse(line));
}
function serializeMessage(message) {
    return JSON.stringify(message) + '\n';
}
//# sourceMappingURL=stdio.js.map