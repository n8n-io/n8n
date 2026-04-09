import type { ProviderV2, ProviderV3 } from '@ai-sdk/provider';
import { ImageModelMiddleware } from '../types/image-model-middleware';
import { LanguageModelMiddleware } from '../types/language-model-middleware';
import { wrapImageModel } from './wrap-image-model';
import { wrapLanguageModel } from './wrap-language-model';
import { asProviderV3 } from '../model/as-provider-v3';

/**
 * Wraps a ProviderV3 instance with middleware functionality.
 * This function allows you to apply middleware to all language models
 * from the provider, enabling you to transform parameters, wrap generate
 * operations, and wrap stream operations for every language model.
 *
 * @param options - Configuration options for wrapping the provider.
 * @param options.provider - The original ProviderV3 instance to be wrapped.
 * @param options.languageModelMiddleware - The middleware to be applied to all language models from the provider. When multiple middlewares are provided, the first middleware will transform the input first, and the last middleware will be wrapped directly around the model.
 * @param options.imageModelMiddleware - Optional middleware to be applied to all image models from the provider. When multiple middlewares are provided, the first middleware will transform the input first, and the last middleware will be wrapped directly around the model.
 * @returns A new ProviderV3 instance with middleware applied to all language models.
 */
export function wrapProvider({
  provider,
  languageModelMiddleware,
  imageModelMiddleware,
}: {
  provider: ProviderV3 | ProviderV2;
  languageModelMiddleware: LanguageModelMiddleware | LanguageModelMiddleware[];
  imageModelMiddleware?: ImageModelMiddleware | ImageModelMiddleware[];
}): ProviderV3 {
  const providerV3 = asProviderV3(provider);
  return {
    specificationVersion: 'v3',
    languageModel: (modelId: string) =>
      wrapLanguageModel({
        model: providerV3.languageModel(modelId),
        middleware: languageModelMiddleware,
      }),
    embeddingModel: providerV3.embeddingModel,
    imageModel: (modelId: string) => {
      let model = providerV3.imageModel(modelId);

      if (imageModelMiddleware != null) {
        model = wrapImageModel({ model, middleware: imageModelMiddleware });
      }

      return model;
    },
    transcriptionModel: providerV3.transcriptionModel,
    speechModel: providerV3.speechModel,
    rerankingModel: providerV3.rerankingModel,
  };
}
