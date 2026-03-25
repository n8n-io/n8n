"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (buffer) => ({
    magicByte: buffer.slice(0, 1),
    registryId: buffer.slice(1, 5).readInt32BE(0),
    payload: buffer.slice(5, buffer.length),
});
//# sourceMappingURL=wireDecoder.js.map