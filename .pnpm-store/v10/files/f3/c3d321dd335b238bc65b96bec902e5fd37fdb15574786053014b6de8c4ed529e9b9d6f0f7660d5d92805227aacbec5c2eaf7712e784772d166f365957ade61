import type { RealtimeTranscriptionError } from "../../models/components/realtimetranscriptionerror.js";
export declare class RealtimeTranscriptionException extends Error {
    constructor(message: string, options?: {
        cause?: unknown;
    });
}
export declare class RealtimeTranscriptionWSError extends RealtimeTranscriptionException {
    readonly payload?: RealtimeTranscriptionError | undefined;
    readonly rawPayload?: unknown;
    readonly code?: number | undefined;
    constructor(message: string, options?: {
        payload?: RealtimeTranscriptionError;
        rawPayload?: unknown;
        code?: number;
        cause?: unknown;
    });
}
//# sourceMappingURL=errors.d.ts.map