import { AISDKError } from './ai-sdk-error';

const name = 'AI_NoContentGeneratedError';
const marker = `vercel.ai.error.${name}`;
const symbol = Symbol.for(marker);

/**
 * Thrown when the AI provider fails to generate any content.
 */
export class NoContentGeneratedError extends AISDKError {
  private readonly [symbol] = true; // used in isInstance

  constructor({
    message = 'No content generated.',
  }: { message?: string } = {}) {
    super({ name, message });
  }

  static isInstance(error: unknown): error is NoContentGeneratedError {
    return AISDKError.hasMarker(error, marker);
  }
}
