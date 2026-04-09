import { LanguageModelV3CallOptions } from '@ai-sdk/provider';
import { LanguageModelMiddleware } from '../types';
import { mergeObjects } from '../util/merge-objects';

/**
 * Applies default settings for a language model.
 */
export function defaultSettingsMiddleware({
  settings,
}: {
  settings: Partial<{
    maxOutputTokens?: LanguageModelV3CallOptions['maxOutputTokens'];
    temperature?: LanguageModelV3CallOptions['temperature'];
    stopSequences?: LanguageModelV3CallOptions['stopSequences'];
    topP?: LanguageModelV3CallOptions['topP'];
    topK?: LanguageModelV3CallOptions['topK'];
    presencePenalty?: LanguageModelV3CallOptions['presencePenalty'];
    frequencyPenalty?: LanguageModelV3CallOptions['frequencyPenalty'];
    responseFormat?: LanguageModelV3CallOptions['responseFormat'];
    seed?: LanguageModelV3CallOptions['seed'];
    tools?: LanguageModelV3CallOptions['tools'];
    toolChoice?: LanguageModelV3CallOptions['toolChoice'];
    headers?: LanguageModelV3CallOptions['headers'];
    providerOptions?: LanguageModelV3CallOptions['providerOptions'];
  }>;
}): LanguageModelMiddleware {
  return {
    specificationVersion: 'v3',
    transformParams: async ({ params }) => {
      return mergeObjects(settings, params) as LanguageModelV3CallOptions;
    },
  };
}
