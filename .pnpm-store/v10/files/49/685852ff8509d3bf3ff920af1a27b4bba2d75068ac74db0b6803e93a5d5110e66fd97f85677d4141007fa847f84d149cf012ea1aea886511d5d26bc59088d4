"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonTraceSerializer = void 0;
const internal_1 = require("../internal");
const utils_1 = require("../../common/utils");
exports.JsonTraceSerializer = {
    serializeRequest: (arg) => {
        const request = (0, internal_1.createExportTraceServiceRequest)(arg, utils_1.JSON_ENCODER);
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
//# sourceMappingURL=trace.js.map