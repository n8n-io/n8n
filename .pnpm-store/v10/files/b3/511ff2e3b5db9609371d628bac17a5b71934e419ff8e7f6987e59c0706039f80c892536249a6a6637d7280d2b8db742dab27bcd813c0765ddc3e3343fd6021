import { AISDKError } from './ai-sdk-error';

const name = 'AI_InvalidPromptError';
const marker = `vercel.ai.error.${name}`;
const symbol = Symbol.for(marker);

/**
 * A prompt is invalid. This error should be thrown by providers when they cannot
 * process a prompt.
 */
export class InvalidPromptError extends AISDKError {
  private readonly [symbol] = true; // used in isInstance

  readonly prompt: unknown;

  constructor({
    prompt,
    message,
    cause,
  }: {
    prompt: unknown;
    message: string;
    cause?: unknown;
  }) {
    super({ name, message: `Invalid prompt: ${message}`, cause });

    this.prompt = prompt;
  }

  static isInstance(error: unknown): error is InvalidPromptError {
    return AISDKError.hasMarker(error, marker);
  }
}
