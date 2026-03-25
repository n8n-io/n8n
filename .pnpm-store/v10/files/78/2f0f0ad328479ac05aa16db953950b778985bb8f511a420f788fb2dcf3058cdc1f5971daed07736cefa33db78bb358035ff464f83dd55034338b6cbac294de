import { createExportLogsServiceRequest } from '../internal';
/*
 * @experimental this serializer may receive breaking changes in minor versions, pin this package's version when using this constant
 */
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
        if (arg.length === 0) {
            return {};
        }
        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(arg));
    },
};
//# sourceMappingURL=logs.js.map