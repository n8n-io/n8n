import {
  EmbeddingModelV3,
  EmbeddingModelV3CallOptions,
} from '@ai-sdk/provider';
import { EmbeddingModelMiddleware } from '../types';
import { asArray } from '../util/as-array';

/**
 * Wraps an EmbeddingModelV3 instance with middleware functionality.
 * This function allows you to apply middleware to transform parameters,
 * wrap embed operations of an embedding model.
 *
 * @param options - Configuration options for wrapping the embedding model.
 * @param options.model - The original EmbeddingModelV3 instance to be wrapped.
 * @param options.middleware - The middleware to be applied to the embedding model. When multiple middlewares are provided, the first middleware will transform the input first, and the last middleware will be wrapped directly around the model.
 * @param options.modelId - Optional custom model ID to override the original model's ID.
 * @param options.providerId - Optional custom provider ID to override the original model's provider ID.
 * @returns A new EmbeddingModelV3 instance with middleware applied.
 */
export const wrapEmbeddingModel = ({
  model,
  middleware: middlewareArg,
  modelId,
  providerId,
}: {
  model: EmbeddingModelV3;
  middleware: EmbeddingModelMiddleware | EmbeddingModelMiddleware[];
  modelId?: string;
  providerId?: string;
}): EmbeddingModelV3 => {
  return [...asArray(middlewareArg)]
    .reverse()
    .reduce((wrappedModel, middleware) => {
      return doWrap({ model: wrappedModel, middleware, modelId, providerId });
    }, model);
};

const doWrap = ({
  model,
  middleware: {
    transformParams,
    wrapEmbed,
    overrideProvider,
    overrideModelId,
    overrideMaxEmbeddingsPerCall,
    overrideSupportsParallelCalls,
  },
  modelId,
  providerId,
}: {
  model: EmbeddingModelV3;
  middleware: EmbeddingModelMiddleware;
  modelId?: string;
  providerId?: string;
}): EmbeddingModelV3 => {
  async function doTransform({
    params,
  }: {
    params: EmbeddingModelV3CallOptions;
  }) {
    return transformParams ? await transformParams({ params, model }) : params;
  }

  return {
    specificationVersion: 'v3',
    provider: providerId ?? overrideProvider?.({ model }) ?? model.provider,
    modelId: modelId ?? overrideModelId?.({ model }) ?? model.modelId,
    maxEmbeddingsPerCall:
      overrideMaxEmbeddingsPerCall?.({ model }) ?? model.maxEmbeddingsPerCall,
    supportsParallelCalls:
      overrideSupportsParallelCalls?.({ model }) ?? model.supportsParallelCalls,
    async doEmbed(
      params: EmbeddingModelV3CallOptions,
    ): Promise<Awaited<ReturnType<EmbeddingModelV3['doEmbed']>>> {
      const transformedParams = await doTransform({ params });
      const doEmbed = async () => model.doEmbed(transformedParams);
      return wrapEmbed
        ? wrapEmbed({
            doEmbed,
            params: transformedParams,
            model,
          })
        : doEmbed();
    },
  };
};
