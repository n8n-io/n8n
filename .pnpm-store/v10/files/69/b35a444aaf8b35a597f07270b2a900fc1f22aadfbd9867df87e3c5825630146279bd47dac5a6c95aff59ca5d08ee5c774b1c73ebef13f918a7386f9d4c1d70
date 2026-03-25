"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamToString = void 0;
const streamToString = async (stream, options = { trim: false }) => {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
    }
    const str = Buffer.concat(chunks).toString("utf-8");
    return options.trim ? str.trim() : str;
};
exports.streamToString = streamToString;
//# sourceMappingURL=streams.js.map