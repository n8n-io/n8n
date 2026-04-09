import {
  EmbeddingModelV3,
  ImageModelV3,
  LanguageModelV3,
  NoSuchModelError,
  ProviderV3,
  SpeechModelV3,
  TranscriptionModelV3,
  RerankingModelV3,
} from '@ai-sdk/provider';

export class MockProviderV3 implements ProviderV3 {
  readonly specificationVersion = 'v3' as const;

  languageModel: ProviderV3['languageModel'];
  embeddingModel: ProviderV3['embeddingModel'];
  imageModel: ProviderV3['imageModel'];
  transcriptionModel: ProviderV3['transcriptionModel'];
  speechModel: ProviderV3['speechModel'];
  rerankingModel: ProviderV3['rerankingModel'];

  constructor({
    languageModels,
    embeddingModels,
    imageModels,
    transcriptionModels,
    speechModels,
    rerankingModels,
  }: {
    languageModels?: Record<string, LanguageModelV3>;
    embeddingModels?: Record<string, EmbeddingModelV3>;
    imageModels?: Record<string, ImageModelV3>;
    transcriptionModels?: Record<string, TranscriptionModelV3>;
    speechModels?: Record<string, SpeechModelV3>;
    rerankingModels?: Record<string, RerankingModelV3>;
  } = {}) {
    this.languageModel = (modelId: string) => {
      if (!languageModels?.[modelId]) {
        throw new NoSuchModelError({ modelId, modelType: 'languageModel' });
      }
      return languageModels[modelId];
    };
    this.embeddingModel = (modelId: string) => {
      if (!embeddingModels?.[modelId]) {
        throw new NoSuchModelError({
          modelId,
          modelType: 'embeddingModel',
        });
      }
      return embeddingModels[modelId];
    };
    this.imageModel = (modelId: string) => {
      if (!imageModels?.[modelId]) {
        throw new NoSuchModelError({ modelId, modelType: 'imageModel' });
      }
      return imageModels[modelId];
    };
    this.transcriptionModel = (modelId: string) => {
      if (!transcriptionModels?.[modelId]) {
        throw new NoSuchModelError({
          modelId,
          modelType: 'transcriptionModel',
        });
      }
      return transcriptionModels[modelId];
    };
    this.speechModel = (modelId: string): SpeechModelV3 => {
      if (!speechModels?.[modelId]) {
        throw new NoSuchModelError({ modelId, modelType: 'speechModel' });
      }
      return speechModels[modelId];
    };
    this.rerankingModel = (modelId: string) => {
      if (!rerankingModels?.[modelId]) {
        throw new NoSuchModelError({ modelId, modelType: 'rerankingModel' });
      }
      return rerankingModels[modelId];
    };
  }
}
