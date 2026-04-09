import { ProviderV2, ProviderV3 } from '@ai-sdk/provider';
import { asEmbeddingModelV3 } from './as-embedding-model-v3';
import { asImageModelV3 } from './as-image-model-v3';
import { asLanguageModelV3 } from './as-language-model-v3';
import { asTranscriptionModelV3 } from './as-transcription-model-v3';
import { asSpeechModelV3 } from './as-speech-model-v3';

export function asProviderV3(provider: ProviderV2 | ProviderV3): ProviderV3 {
  if (
    'specificationVersion' in provider &&
    provider.specificationVersion === 'v3'
  ) {
    return provider;
  }

  // v3 providers have already been returned
  const v2Provider: ProviderV2 = provider as ProviderV2;

  return {
    specificationVersion: 'v3',
    languageModel: (modelId: string) =>
      asLanguageModelV3(v2Provider.languageModel(modelId)),
    embeddingModel: (modelId: string) =>
      asEmbeddingModelV3(v2Provider.textEmbeddingModel(modelId)),
    imageModel: (modelId: string) =>
      asImageModelV3(v2Provider.imageModel(modelId)),
    transcriptionModel: v2Provider.transcriptionModel
      ? (modelId: string) =>
          asTranscriptionModelV3(v2Provider.transcriptionModel!(modelId))
      : undefined,
    speechModel: v2Provider.speechModel
      ? (modelId: string) => asSpeechModelV3(v2Provider.speechModel!(modelId))
      : undefined,
    rerankingModel: undefined, // v2 providers don't have reranking models
  };
}
