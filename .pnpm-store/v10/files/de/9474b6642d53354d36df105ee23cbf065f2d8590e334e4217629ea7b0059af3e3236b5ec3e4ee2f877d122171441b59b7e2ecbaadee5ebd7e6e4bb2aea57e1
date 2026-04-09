import { AISDKError } from './ai-sdk-error';

const name = 'AI_InvalidArgumentError';
const marker = `vercel.ai.error.${name}`;
const symbol = Symbol.for(marker);

/**
 * A function argument is invalid.
 */
export class InvalidArgumentError extends AISDKError {
  private readonly [symbol] = true; // used in isInstance

  readonly argument: string;

  constructor({
    message,
    cause,
    argument,
  }: {
    argument: string;
    message: string;
    cause?: unknown;
  }) {
    super({ name, message, cause });

    this.argument = argument;
  }

  static isInstance(error: unknown): error is InvalidArgumentError {
    return AISDKError.hasMarker(error, marker);
  }
}
