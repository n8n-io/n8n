import { createExportTraceServiceRequest } from '../trace';
import { createExportMetricsServiceRequest } from '../metrics';
import { createExportLogsServiceRequest } from '../logs';
export const JsonTraceSerializer = {
    serializeRequest: (arg) => {
        const request = createExportTraceServiceRequest(arg, {
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
export const JsonMetricsSerializer = {
    serializeRequest: (arg) => {
        const request = createExportMetricsServiceRequest(arg, {
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
export const JsonLogsSerializer = {
    serializeRequest: (arg) => {
        const request = createExportLogsServiceRequest(arg, {
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