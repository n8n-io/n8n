import { AISDKError } from '@ai-sdk/provider';

const name = 'AI_NoOutputGeneratedError';
const marker = `vercel.ai.error.${name}`;
const symbol = Symbol.for(marker);

/**
 * Thrown when no LLM output was generated, e.g. because of errors.
 */
export class NoOutputGeneratedError extends AISDKError {
  private readonly [symbol] = true; // used in isInstance

  constructor({
    message = 'No output generated.',
    cause,
  }: {
    message?: string;
    cause?: Error;
  } = {}) {
    super({ name, message, cause });
  }

  static isInstance(error: unknown): error is NoOutputGeneratedError {
    return AISDKError.hasMarker(error, marker);
  }
}
