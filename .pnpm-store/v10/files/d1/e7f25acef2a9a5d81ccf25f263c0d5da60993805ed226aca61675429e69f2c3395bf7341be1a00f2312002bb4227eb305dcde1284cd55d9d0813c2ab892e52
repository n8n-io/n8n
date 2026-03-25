"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonLogsSerializer = void 0;
const internal_1 = require("../internal");
/*
 * @experimental this serializer may receive breaking changes in minor versions, pin this package's version when using this constant
 */
exports.JsonLogsSerializer = {
    serializeRequest: (arg) => {
        const request = (0, internal_1.createExportLogsServiceRequest)(arg, {
            useHex: true,
            useLongBits: false,
        });
        const encoder = new TextEncoder();
        return encoder.encode(JSON.stringify(request));
    },
    deserializeResponse: (arg) => {
        if (arg.length === 0) {
            return {};
        }
        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(arg));
    },
};
//# sourceMappingURL=logs.js.map