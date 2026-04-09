import { expect } from 'vitest';

import {
  FinishReason,
  LanguageModelResponseMetadata,
  LanguageModelUsage,
} from '../types';
import { NoObjectGeneratedError } from './no-object-generated-error';

export function verifyNoObjectGeneratedError(
  error: unknown,
  expected: {
    message: string;
    response: LanguageModelResponseMetadata & {
      body?: string;
    };
    usage: LanguageModelUsage;
    finishReason: FinishReason;
  },
) {
  expect(NoObjectGeneratedError.isInstance(error)).toBeTruthy();
  const noObjectGeneratedError = error as NoObjectGeneratedError;
  expect(noObjectGeneratedError.message).toEqual(expected.message);
  expect(noObjectGeneratedError.response).toEqual(expected.response);
  expect(noObjectGeneratedError.usage).toEqual(expected.usage);
  expect(noObjectGeneratedError.finishReason).toEqual(expected.finishReason);
}
