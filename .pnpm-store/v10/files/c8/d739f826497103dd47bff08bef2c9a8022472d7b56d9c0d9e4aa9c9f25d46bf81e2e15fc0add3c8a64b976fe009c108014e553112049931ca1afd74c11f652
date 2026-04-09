import {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3GenerateResult,
  LanguageModelV3StreamResult,
} from '@ai-sdk/provider';
import { LanguageModelMiddleware } from '../types';
import { asArray } from '../util/as-array';

/**
 * Wraps a LanguageModelV3 instance with middleware functionality.
 * This function allows you to apply middleware to transform parameters,
 * wrap generate operations, and wrap stream operations of a language model.
 *
 * @param options - Configuration options for wrapping the language model.
 * @param options.model - The original LanguageModelV3 instance to be wrapped.
 * @param options.middleware - The middleware to be applied to the language model. When multiple middlewares are provided, the first middleware will transform the input first, and the last middleware will be wrapped directly around the model.
 * @param options.modelId - Optional custom model ID to override the original model's ID.
 * @param options.providerId - Optional custom provider ID to override the original model's provider ID.
 * @returns A new LanguageModelV3 instance with middleware applied.
 */
export const wrapLanguageModel = ({
  model,
  middleware: middlewareArg,
  modelId,
  providerId,
}: {
  model: LanguageModelV3;
  middleware: LanguageModelMiddleware | LanguageModelMiddleware[];
  modelId?: string;
  providerId?: string;
}): LanguageModelV3 => {
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
    wrapGenerate,
    wrapStream,
    overrideProvider,
    overrideModelId,
    overrideSupportedUrls,
  },
  modelId,
  providerId,
}: {
  model: LanguageModelV3;
  middleware: LanguageModelMiddleware;
  modelId?: string;
  providerId?: string;
}): LanguageModelV3 => {
  async function doTransform({
    params,
    type,
  }: {
    params: LanguageModelV3CallOptions;
    type: 'generate' | 'stream';
  }) {
    return transformParams
      ? await transformParams({ params, type, model })
      : params;
  }

  return {
    specificationVersion: 'v3',

    provider: providerId ?? overrideProvider?.({ model }) ?? model.provider,
    modelId: modelId ?? overrideModelId?.({ model }) ?? model.modelId,
    supportedUrls: overrideSupportedUrls?.({ model }) ?? model.supportedUrls,

    async doGenerate(
      params: LanguageModelV3CallOptions,
    ): Promise<LanguageModelV3GenerateResult> {
      const transformedParams = await doTransform({ params, type: 'generate' });
      const doGenerate = async () => model.doGenerate(transformedParams);
      const doStream = async () => model.doStream(transformedParams);
      return wrapGenerate
        ? wrapGenerate({
            doGenerate,
            doStream,
            params: transformedParams,
            model,
          })
        : doGenerate();
    },

    async doStream(
      params: LanguageModelV3CallOptions,
    ): Promise<LanguageModelV3StreamResult> {
      const transformedParams = await doTransform({ params, type: 'stream' });
      const doGenerate = async () => model.doGenerate(transformedParams);
      const doStream = async () => model.doStream(transformedParams);
      return wrapStream
        ? wrapStream({ doGenerate, doStream, params: transformedParams, model })
        : doStream();
    },
  };
};
