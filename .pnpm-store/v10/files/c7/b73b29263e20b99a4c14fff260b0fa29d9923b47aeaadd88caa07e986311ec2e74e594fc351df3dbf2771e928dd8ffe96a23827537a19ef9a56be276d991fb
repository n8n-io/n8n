import { AISDKError } from '@ai-sdk/provider';
import { SpeechModelResponseMetadata } from '../types/speech-model-response-metadata';

const name = 'AI_NoSpeechGeneratedError';
const marker = `vercel.ai.error.${name}`;
const symbol = Symbol.for(marker);

/**
 * Error that is thrown when no speech audio was generated.
 */
export class NoSpeechGeneratedError extends AISDKError {
  private readonly [symbol] = true; // used in isInstance

  readonly responses: Array<SpeechModelResponseMetadata>;

  constructor(options: { responses: Array<SpeechModelResponseMetadata> }) {
    super({
      name,
      message: 'No speech audio generated.',
    });

    this.responses = options.responses;
  }

  static isInstance(error: unknown): error is NoSpeechGeneratedError {
    return AISDKError.hasMarker(error, marker);
  }
}
