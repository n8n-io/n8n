"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonMetricsSerializer = void 0;
const internal_1 = require("../internal");
exports.JsonMetricsSerializer = {
    serializeRequest: (arg) => {
        const request = (0, internal_1.createExportMetricsServiceRequest)([arg], {
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
//# sourceMappingURL=metrics.js.map