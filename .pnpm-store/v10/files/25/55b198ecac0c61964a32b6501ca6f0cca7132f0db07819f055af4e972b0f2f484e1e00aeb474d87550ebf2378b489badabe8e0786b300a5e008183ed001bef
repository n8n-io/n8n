import { InvalidArgumentError } from '../error/invalid-argument-error';
import { CallSettings } from './call-settings';

/**
 * Validates call settings and returns a new object with limited values.
 */
export function prepareCallSettings({
  maxOutputTokens,
  temperature,
  topP,
  topK,
  presencePenalty,
  frequencyPenalty,
  seed,
  stopSequences,
}: Omit<CallSettings, 'abortSignal' | 'headers' | 'maxRetries'>): Omit<
  CallSettings,
  'abortSignal' | 'headers' | 'maxRetries'
> {
  if (maxOutputTokens != null) {
    if (!Number.isInteger(maxOutputTokens)) {
      throw new InvalidArgumentError({
        parameter: 'maxOutputTokens',
        value: maxOutputTokens,
        message: 'maxOutputTokens must be an integer',
      });
    }

    if (maxOutputTokens < 1) {
      throw new InvalidArgumentError({
        parameter: 'maxOutputTokens',
        value: maxOutputTokens,
        message: 'maxOutputTokens must be >= 1',
      });
    }
  }

  if (temperature != null) {
    if (typeof temperature !== 'number') {
      throw new InvalidArgumentError({
        parameter: 'temperature',
        value: temperature,
        message: 'temperature must be a number',
      });
    }
  }

  if (topP != null) {
    if (typeof topP !== 'number') {
      throw new InvalidArgumentError({
        parameter: 'topP',
        value: topP,
        message: 'topP must be a number',
      });
    }
  }

  if (topK != null) {
    if (typeof topK !== 'number') {
      throw new InvalidArgumentError({
        parameter: 'topK',
        value: topK,
        message: 'topK must be a number',
      });
    }
  }

  if (presencePenalty != null) {
    if (typeof presencePenalty !== 'number') {
      throw new InvalidArgumentError({
        parameter: 'presencePenalty',
        value: presencePenalty,
        message: 'presencePenalty must be a number',
      });
    }
  }

  if (frequencyPenalty != null) {
    if (typeof frequencyPenalty !== 'number') {
      throw new InvalidArgumentError({
        parameter: 'frequencyPenalty',
        value: frequencyPenalty,
        message: 'frequencyPenalty must be a number',
      });
    }
  }

  if (seed != null) {
    if (!Number.isInteger(seed)) {
      throw new InvalidArgumentError({
        parameter: 'seed',
        value: seed,
        message: 'seed must be an integer',
      });
    }
  }

  return {
    maxOutputTokens,
    temperature,
    topP,
    topK,
    presencePenalty,
    frequencyPenalty,
    stopSequences,
    seed,
  };
}
