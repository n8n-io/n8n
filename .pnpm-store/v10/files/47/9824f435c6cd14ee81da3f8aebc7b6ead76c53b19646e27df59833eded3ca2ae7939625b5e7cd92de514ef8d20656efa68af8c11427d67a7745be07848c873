import { createExportMetricsServiceRequest } from '../internal';
import { JSON_ENCODER } from '../../common/utils';
export const JsonMetricsSerializer = {
    serializeRequest: (arg) => {
        const request = createExportMetricsServiceRequest([arg], JSON_ENCODER);
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