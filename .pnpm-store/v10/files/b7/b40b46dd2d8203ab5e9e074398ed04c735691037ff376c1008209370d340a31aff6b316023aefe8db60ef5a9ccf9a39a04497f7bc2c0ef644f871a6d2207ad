"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonLogsSerializer = exports.JsonMetricsSerializer = exports.JsonTraceSerializer = void 0;
const trace_1 = require("../trace");
const metrics_1 = require("../metrics");
const logs_1 = require("../logs");
exports.JsonTraceSerializer = {
    serializeRequest: (arg) => {
        const request = (0, trace_1.createExportTraceServiceRequest)(arg, {
            useHex: true,
            useLongBits: false,
        });
        const encoder = new TextEncoder();
        return encoder.encode(JSON.stringify(request));
    },
    deserializeResponse: (arg) => {
        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(arg));
    },
};
exports.JsonMetricsSerializer = {
    serializeRequest: (arg) => {
        const request = (0, metrics_1.createExportMetricsServiceRequest)(arg, {
            useLongBits: false,
        });
        const encoder = new TextEncoder();
        return encoder.encode(JSON.stringify(request));
    },
    deserializeResponse: (arg) => {
        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(arg));
    },
};
exports.JsonLogsSerializer = {
    serializeRequest: (arg) => {
        const request = (0, logs_1.createExportLogsServiceRequest)(arg, {
            useHex: true,
            useLongBits: false,
        });
        const encoder = new TextEncoder();
        return encoder.encode(JSON.stringify(request));
    },
    deserializeResponse: (arg) => {
        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(arg));
    },
};
//# sourceMappingURL=serializers.js.map