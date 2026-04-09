import type {
  RealtimeTranscriptionError,
} from "../../models/components/realtimetranscriptionerror.js";

export class RealtimeTranscriptionException extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "RealtimeTranscriptionException";
  }
}

export class RealtimeTranscriptionWSError extends RealtimeTranscriptionException {
  readonly payload?: RealtimeTranscriptionError | undefined;
  readonly rawPayload?: unknown;
  readonly code?: number | undefined;

  constructor(
    message: string,
    options?: {
      payload?: RealtimeTranscriptionError;
      rawPayload?: unknown;
      code?: number;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = "RealtimeTranscriptionWSError";
    this.payload = options?.payload;
    this.rawPayload = options?.rawPayload;
    this.code = options?.code ?? options?.payload?.error?.code;
  }
}
