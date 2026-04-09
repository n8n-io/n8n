import { gateway } from '@ai-sdk/gateway';
import {
  EmbeddingModelV3,
  Experimental_VideoModelV3,
  ImageModelV3,
  LanguageModelV3,
  ProviderV3,
  SpeechModelV3,
  TranscriptionModelV3,
} from '@ai-sdk/provider';
import { UnsupportedModelVersionError } from '../error';
import { EmbeddingModel } from '../types/embedding-model';
import { LanguageModel } from '../types/language-model';
import { SpeechModel } from '../types/speech-model';
import { TranscriptionModel } from '../types/transcription-model';
import { asEmbeddingModelV3 } from './as-embedding-model-v3';
import { asImageModelV3 } from './as-image-model-v3';
import { asLanguageModelV3 } from './as-language-model-v3';
import { asSpeechModelV3 } from './as-speech-model-v3';
import { asTranscriptionModelV3 } from './as-transcription-model-v3';
import { ImageModel } from '../types/image-model';
import { VideoModel } from '../types/video-model';

export function resolveLanguageModel(model: LanguageModel): LanguageModelV3 {
  if (typeof model !== 'string') {
    if (
      model.specificationVersion !== 'v3' &&
      model.specificationVersion !== 'v2'
    ) {
      const unsupportedModel: any = model;
      throw new UnsupportedModelVersionError({
        version: unsupportedModel.specificationVersion,
        provider: unsupportedModel.provider,
        modelId: unsupportedModel.modelId,
      });
    }

    return asLanguageModelV3(model);
  }

  return getGlobalProvider().languageModel(model);
}

export function resolveEmbeddingModel(model: EmbeddingModel): EmbeddingModelV3 {
  if (typeof model !== 'string') {
    if (
      model.specificationVersion !== 'v3' &&
      model.specificationVersion !== 'v2'
    ) {
      const unsupportedModel: any = model;
      throw new UnsupportedModelVersionError({
        version: unsupportedModel.specificationVersion,
        provider: unsupportedModel.provider,
        modelId: unsupportedModel.modelId,
      });
    }

    return asEmbeddingModelV3(model);
  }

  return getGlobalProvider().embeddingModel(model);
}

export function resolveTranscriptionModel(
  model: TranscriptionModel,
): TranscriptionModelV3 | undefined {
  if (typeof model !== 'string') {
    if (
      model.specificationVersion !== 'v3' &&
      model.specificationVersion !== 'v2'
    ) {
      const unsupportedModel: any = model;
      throw new UnsupportedModelVersionError({
        version: unsupportedModel.specificationVersion,
        provider: unsupportedModel.provider,
        modelId: unsupportedModel.modelId,
      });
    }
    return asTranscriptionModelV3(model);
  }

  return getGlobalProvider().transcriptionModel?.(model);
}

export function resolveSpeechModel(
  model: SpeechModel,
): SpeechModelV3 | undefined {
  if (typeof model !== 'string') {
    if (
      model.specificationVersion !== 'v3' &&
      model.specificationVersion !== 'v2'
    ) {
      const unsupportedModel: any = model;
      throw new UnsupportedModelVersionError({
        version: unsupportedModel.specificationVersion,
        provider: unsupportedModel.provider,
        modelId: unsupportedModel.modelId,
      });
    }
    return asSpeechModelV3(model);
  }

  return getGlobalProvider().speechModel?.(model);
}

export function resolveImageModel(model: ImageModel): ImageModelV3 {
  if (typeof model !== 'string') {
    if (
      model.specificationVersion !== 'v3' &&
      model.specificationVersion !== 'v2'
    ) {
      const unsupportedModel: any = model;
      throw new UnsupportedModelVersionError({
        version: unsupportedModel.specificationVersion,
        provider: unsupportedModel.provider,
        modelId: unsupportedModel.modelId,
      });
    }

    return asImageModelV3(model);
  }

  return getGlobalProvider().imageModel(model);
}

export function resolveVideoModel(
  model: VideoModel,
): Experimental_VideoModelV3 {
  if (typeof model === 'string') {
    const provider = getGlobalProvider();
    // TODO AI SDK v7
    // @ts-expect-error - videoModel support is experimental
    const videoModel = provider.videoModel;

    if (!videoModel) {
      throw new Error(
        'The default provider does not support video models. ' +
          'Please use a Experimental_VideoModelV3 object from a provider (e.g., vertex.video("model-id")).',
      );
    }

    return videoModel(model);
  }

  if (model.specificationVersion !== 'v3') {
    const unsupportedModel: any = model;
    throw new UnsupportedModelVersionError({
      version: unsupportedModel.specificationVersion,
      provider: unsupportedModel.provider,
      modelId: unsupportedModel.modelId,
    });
  }

  return model;
}

function getGlobalProvider(): ProviderV3 {
  return globalThis.AI_SDK_DEFAULT_PROVIDER ?? gateway;
}
