import { createExportTraceServiceRequest } from '../trace';
import { createExportMetricsServiceRequest } from '../metrics';
import { createExportLogsServiceRequest } from '../logs';
export var JsonTraceSerializer = {
    serializeRequest: function (arg) {
        var request = createExportTraceServiceRequest(arg, {
            useHex: true,
            useLongBits: false,
        });
        var encoder = new TextEncoder();
        return encoder.encode(JSON.stringify(request));
    },
    deserializeResponse: function (arg) {
        var decoder = new TextDecoder();
        return JSON.parse(decoder.decode(arg));
    },
};
export var JsonMetricsSerializer = {
    serializeRequest: function (arg) {
        var request = createExportMetricsServiceRequest(arg, {
            useLongBits: false,
        });
        var encoder = new TextEncoder();
        return encoder.encode(JSON.stringify(request));
    },
    deserializeResponse: function (arg) {
        var decoder = new TextDecoder();
        return JSON.parse(decoder.decode(arg));
    },
};
export var JsonLogsSerializer = {
    serializeRequest: function (arg) {
        var request = createExportLogsServiceRequest(arg, {
            useHex: true,
            useLongBits: false,
        });
        var encoder = new TextEncoder();
        return encoder.encode(JSON.stringify(request));
    },
    deserializeResponse: function (arg) {
        var decoder = new TextDecoder();
        return JSON.parse(decoder.decode(arg));
    },
};
//# sourceMappingURL=serializers.js.map