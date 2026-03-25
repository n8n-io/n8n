"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encode = exports.MAGIC_BYTE = void 0;
const DEFAULT_OFFSET = 0;
exports.MAGIC_BYTE = Buffer.alloc(1);
const encode = (registryId, payload) => {
    const registryIdBuffer = Buffer.alloc(4);
    registryIdBuffer.writeInt32BE(registryId, DEFAULT_OFFSET);
    return Buffer.concat([exports.MAGIC_BYTE, registryIdBuffer, payload]);
};
exports.encode = encode;
//# sourceMappingURL=wireEncoder.js.map