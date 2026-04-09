import {
  EmbeddingModelV3,
  ImageModelV3,
  LanguageModelV3,
  ProviderV3,
  SpeechModelV3,
  TranscriptionModelV3,
} from '@ai-sdk/provider';
import {
  FetchFunction,
  loadApiKey,
  loadOptionalSetting,
  withoutTrailingSlash,
  withUserAgentSuffix,
} from '@ai-sdk/provider-utils';
import { OpenAIChatLanguageModel } from './chat/openai-chat-language-model';
import { OpenAIChatModelId } from './chat/openai-chat-options';
import { OpenAICompletionLanguageModel } from './completion/openai-completion-language-model';
import { OpenAICompletionModelId } from './completion/openai-completion-options';
import { OpenAIEmbeddingModel } from './embedding/openai-embedding-model';
import { OpenAIEmbeddingModelId } from './embedding/openai-embedding-options';
import { OpenAIImageModel } from './image/openai-image-model';
import { OpenAIImageModelId } from './image/openai-image-options';
import { openaiTools } from './openai-tools';
import { OpenAIResponsesLanguageModel } from './responses/openai-responses-language-model';
import { OpenAIResponsesModelId } from './responses/openai-responses-options';
import { OpenAISpeechModel } from './speech/openai-speech-model';
import { OpenAISpeechModelId } from './speech/openai-speech-options';
import { OpenAITranscriptionModel } from './transcription/openai-transcription-model';
import { OpenAITranscriptionModelId } from './transcription/openai-transcription-options';
import { VERSION } from './version';

export interface OpenAIProvider extends ProviderV3 {
  (modelId: OpenAIResponsesModelId): LanguageModelV3;

  /**
   * Creates an OpenAI model for text generation.
   */
  languageModel(modelId: OpenAIResponsesModelId): LanguageModelV3;

  /**
   * Creates an OpenAI chat model for text generation.
   */
  chat(modelId: OpenAIChatModelId): LanguageModelV3;

  /**
   * Creates an OpenAI responses API model for text generation.
   */
  responses(modelId: OpenAIResponsesModelId): LanguageModelV3;

  /**
   * Creates an OpenAI completion model for text generation.
   */
  completion(modelId: OpenAICompletionModelId): LanguageModelV3;

  /**
   * Creates a model for text embeddings.
   */
  embedding(modelId: OpenAIEmbeddingModelId): EmbeddingModelV3;

  /**
   * Creates a model for text embeddings.
   */
  embeddingModel(modelId: OpenAIEmbeddingModelId): EmbeddingModelV3;

  /**
   * @deprecated Use `embedding` instead.
   */
  textEmbedding(modelId: OpenAIEmbeddingModelId): EmbeddingModelV3;

  /**
   * @deprecated Use `embeddingModel` instead.
   */
  textEmbeddingModel(modelId: OpenAIEmbeddingModelId): EmbeddingModelV3;

  /**
   * Creates a model for image generation.
   */
  image(modelId: OpenAIImageModelId): ImageModelV3;

  /**
   * Creates a model for image generation.
   */
  imageModel(modelId: OpenAIImageModelId): ImageModelV3;

  /**
   * Creates a model for transcription.
   */
  transcription(modelId: OpenAITranscriptionModelId): TranscriptionModelV3;

  /**
   * Creates a model for speech generation.
   */
  speech(modelId: OpenAISpeechModelId): SpeechModelV3;

  /**
   * OpenAI-specific tools.
   */
  tools: typeof openaiTools;
}

export interface OpenAIProviderSettings {
  /**
   * Base URL for the OpenAI API calls.
   */
  baseURL?: string;

  /**
   * API key for authenticating requests.
   */
  apiKey?: string;

  /**
   * OpenAI Organization.
   */
  organization?: string;

  /**
   * OpenAI project.
   */
  project?: string;

  /**
   * Custom headers to include in the requests.
   */
  headers?: Record<string, string>;

  /**
   * Provider name. Overrides the `openai` default name for 3rd party providers.
   */
  name?: string;

  /**
   * Custom fetch implementation. You can use it as a middleware to intercept requests,
   * or to provide a custom fetch implementation for e.g. testing.
   */
  fetch?: FetchFunction;
}

/**
 * Create an OpenAI provider instance.
 */
export function createOpenAI(
  options: OpenAIProviderSettings = {},
): OpenAIProvider {
  const baseURL =
    withoutTrailingSlash(
      loadOptionalSetting({
        settingValue: options.baseURL,
        environmentVariableName: 'OPENAI_BASE_URL',
      }),
    ) ?? 'https://api.openai.com/v1';

  const providerName = options.name ?? 'openai';

  const getHeaders = () =>
    withUserAgentSuffix(
      {
        Authorization: `Bearer ${loadApiKey({
          apiKey: options.apiKey,
          environmentVariableName: 'OPENAI_API_KEY',
          description: 'OpenAI',
        })}`,
        'OpenAI-Organization': options.organization,
        'OpenAI-Project': options.project,
        ...options.headers,
      },
      `ai-sdk/openai/${VERSION}`,
    );

  const createChatModel = (modelId: OpenAIChatModelId) =>
    new OpenAIChatLanguageModel(modelId, {
      provider: `${providerName}.chat`,
      url: ({ path }) => `${baseURL}${path}`,
      headers: getHeaders,
      fetch: options.fetch,
    });

  const createCompletionModel = (modelId: OpenAICompletionModelId) =>
    new OpenAICompletionLanguageModel(modelId, {
      provider: `${providerName}.completion`,
      url: ({ path }) => `${baseURL}${path}`,
      headers: getHeaders,
      fetch: options.fetch,
    });

  const createEmbeddingModel = (modelId: OpenAIEmbeddingModelId) =>
    new OpenAIEmbeddingModel(modelId, {
      provider: `${providerName}.embedding`,
      url: ({ path }) => `${baseURL}${path}`,
      headers: getHeaders,
      fetch: options.fetch,
    });

  const createImageModel = (modelId: OpenAIImageModelId) =>
    new OpenAIImageModel(modelId, {
      provider: `${providerName}.image`,
      url: ({ path }) => `${baseURL}${path}`,
      headers: getHeaders,
      fetch: options.fetch,
    });

  const createTranscriptionModel = (modelId: OpenAITranscriptionModelId) =>
    new OpenAITranscriptionModel(modelId, {
      provider: `${providerName}.transcription`,
      url: ({ path }) => `${baseURL}${path}`,
      headers: getHeaders,
      fetch: options.fetch,
    });

  const createSpeechModel = (modelId: OpenAISpeechModelId) =>
    new OpenAISpeechModel(modelId, {
      provider: `${providerName}.speech`,
      url: ({ path }) => `${baseURL}${path}`,
      headers: getHeaders,
      fetch: options.fetch,
    });

  const createLanguageModel = (modelId: OpenAIResponsesModelId) => {
    if (new.target) {
      throw new Error(
        'The OpenAI model function cannot be called with the new keyword.',
      );
    }

    return createResponsesModel(modelId);
  };

  const createResponsesModel = (modelId: OpenAIResponsesModelId) => {
    return new OpenAIResponsesLanguageModel(modelId, {
      provider: `${providerName}.responses`,
      url: ({ path }) => `${baseURL}${path}`,
      headers: getHeaders,
      fetch: options.fetch,
      fileIdPrefixes: ['file-'],
    });
  };

  const provider = function (modelId: OpenAIResponsesModelId) {
    return createLanguageModel(modelId);
  };

  provider.specificationVersion = 'v3' as const;
  provider.languageModel = createLanguageModel;
  provider.chat = createChatModel;
  provider.completion = createCompletionModel;
  provider.responses = createResponsesModel;
  provider.embedding = createEmbeddingModel;
  provider.embeddingModel = createEmbeddingModel;
  provider.textEmbedding = createEmbeddingModel;
  provider.textEmbeddingModel = createEmbeddingModel;

  provider.image = createImageModel;
  provider.imageModel = createImageModel;

  provider.transcription = createTranscriptionModel;
  provider.transcriptionModel = createTranscriptionModel;

  provider.speech = createSpeechModel;
  provider.speechModel = createSpeechModel;

  provider.tools = openaiTools;

  return provider as OpenAIProvider;
}

/**
 * Default OpenAI provider instance.
 */
export const openai = createOpenAI();
