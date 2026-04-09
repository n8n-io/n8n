"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeTranscriptionWSError = exports.RealtimeTranscriptionException = void 0;
class RealtimeTranscriptionException extends Error {
    constructor(message, options) {
        super(message, options);
        this.name = "RealtimeTranscriptionException";
    }
}
exports.RealtimeTranscriptionException = RealtimeTranscriptionException;
class RealtimeTranscriptionWSError extends RealtimeTranscriptionException {
    constructor(message, options) {
        super(message, { cause: options?.cause });
        this.name = "RealtimeTranscriptionWSError";
        this.payload = options?.payload;
        this.rawPayload = options?.rawPayload;
        this.code = options?.code ?? options?.payload?.error?.code;
    }
}
exports.RealtimeTranscriptionWSError = RealtimeTranscriptionWSError;
//# sourceMappingURL=errors.js.map