import { AISDKError } from './ai-sdk-error';

const name = 'AI_EmptyResponseBodyError';
const marker = `vercel.ai.error.${name}`;
const symbol = Symbol.for(marker);

export class EmptyResponseBodyError extends AISDKError {
  private readonly [symbol] = true; // used in isInstance

  constructor({ message = 'Empty response body' }: { message?: string } = {}) {
    super({ name, message });
  }

  static isInstance(error: unknown): error is EmptyResponseBodyError {
    return AISDKError.hasMarker(error, marker);
  }
}
