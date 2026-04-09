import { AISDKError } from './ai-sdk-error';

const name = 'AI_InvalidResponseDataError';
const marker = `vercel.ai.error.${name}`;
const symbol = Symbol.for(marker);

/**
 * Server returned a response with invalid data content.
 * This should be thrown by providers when they cannot parse the response from the API.
 */
export class InvalidResponseDataError extends AISDKError {
  private readonly [symbol] = true; // used in isInstance

  readonly data: unknown;

  constructor({
    data,
    message = `Invalid response data: ${JSON.stringify(data)}.`,
  }: {
    data: unknown;
    message?: string;
  }) {
    super({ name, message });

    this.data = data;
  }

  static isInstance(error: unknown): error is InvalidResponseDataError {
    return AISDKError.hasMarker(error, marker);
  }
}
