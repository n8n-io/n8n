import { AISDKError } from '@ai-sdk/provider';

const name = 'AI_RetryError';
const marker = `vercel.ai.error.${name}`;
const symbol = Symbol.for(marker);

export type RetryErrorReason =
  | 'maxRetriesExceeded'
  | 'errorNotRetryable'
  | 'abort';

export class RetryError extends AISDKError {
  private readonly [symbol] = true; // used in isInstance

  // note: property order determines debugging output
  readonly reason: RetryErrorReason;
  readonly lastError: unknown;
  readonly errors: Array<unknown>;

  constructor({
    message,
    reason,
    errors,
  }: {
    message: string;
    reason: RetryErrorReason;
    errors: Array<unknown>;
  }) {
    super({ name, message });

    this.reason = reason;
    this.errors = errors;

    // separate our last error to make debugging via log easier:
    this.lastError = errors[errors.length - 1];
  }

  static isInstance(error: unknown): error is RetryError {
    return AISDKError.hasMarker(error, marker);
  }
}
