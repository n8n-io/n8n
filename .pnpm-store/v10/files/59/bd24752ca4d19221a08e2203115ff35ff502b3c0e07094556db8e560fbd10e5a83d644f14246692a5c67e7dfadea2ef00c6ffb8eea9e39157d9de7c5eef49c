import { EmbeddingModelV3CallOptions } from '@ai-sdk/provider';
import { EmbeddingModelMiddleware } from '../types';
import { mergeObjects } from '../util/merge-objects';

/**
 * Applies default settings for an embedding model.
 */
export function defaultEmbeddingSettingsMiddleware({
  settings,
}: {
  settings: Partial<{
    headers?: EmbeddingModelV3CallOptions['headers'];
    providerOptions?: EmbeddingModelV3CallOptions['providerOptions'];
  }>;
}): EmbeddingModelMiddleware {
  return {
    specificationVersion: 'v3',
    transformParams: async ({ params }) => {
      return mergeObjects(settings, params) as EmbeddingModelV3CallOptions;
    },
  };
}
