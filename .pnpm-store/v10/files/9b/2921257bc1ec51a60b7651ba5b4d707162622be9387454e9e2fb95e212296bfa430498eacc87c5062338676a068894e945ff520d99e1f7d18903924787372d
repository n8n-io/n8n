import { AISDKError } from '@ai-sdk/provider';
import { VideoModelResponseMetadata } from '../types/video-model-response-metadata';

const name = 'AI_NoVideoGeneratedError';
const marker = `vercel.ai.error.${name}`;
const symbol = Symbol.for(marker);

export class NoVideoGeneratedError extends AISDKError {
  private readonly [symbol] = true; // used in isInstance

  readonly responses: Array<VideoModelResponseMetadata>;

  constructor({
    message = 'No video generated.',
    cause,
    responses,
  }: {
    message?: string;
    cause?: unknown;
    responses: Array<VideoModelResponseMetadata>;
  }) {
    super({ name, message, cause });

    this.responses = responses;
  }

  static isInstance(error: unknown): error is NoVideoGeneratedError {
    return AISDKError.hasMarker(error, marker);
  }

  /**
   * @deprecated use `isInstance` instead
   */
  static isNoVideoGeneratedError(
    error: unknown,
  ): error is NoVideoGeneratedError {
    return error instanceof Error &&
      error.name === name &&
      typeof (error as NoVideoGeneratedError).responses !== 'undefined'
      ? true
      : false;
  }

  /**
   * @deprecated Do not use this method. It will be removed in the next major version.
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      stack: this.stack,

      cause: this.cause,
      responses: this.responses,
    };
  }
}
