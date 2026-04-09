import {
  type Experimental_VideoModelV3,
  ImageModelV3,
  LanguageModelV3,
  NoSuchModelError,
  ProviderV3,
} from '@ai-sdk/provider';
import {
  FetchFunction,
  generateId,
  loadApiKey,
  withoutTrailingSlash,
  withUserAgentSuffix,
} from '@ai-sdk/provider-utils';
import { XaiChatLanguageModel } from './xai-chat-language-model';
import { XaiChatModelId } from './xai-chat-options';
import { XaiImageModel } from './xai-image-model';
import { XaiImageModelId } from './xai-image-settings';
import { XaiResponsesLanguageModel } from './responses/xai-responses-language-model';
import { XaiResponsesModelId } from './responses/xai-responses-options';
import { xaiTools } from './tool';
import { VERSION } from './version';
import { XaiVideoModel } from './xai-video-model';
import { XaiVideoModelId } from './xai-video-settings';

export interface XaiProvider extends ProviderV3 {
  /**
   * Creates an Xai chat model for text generation.
   */
  (modelId: XaiChatModelId): LanguageModelV3;

  /**
   * Creates an Xai language model for text generation.
   */
  languageModel(modelId: XaiChatModelId): LanguageModelV3;

  /**
   * Creates an Xai chat model for text generation.
   */
  chat: (modelId: XaiChatModelId) => LanguageModelV3;

  /**
   * Creates an Xai responses model for agentic tool calling.
   */
  responses: (modelId: XaiResponsesModelId) => LanguageModelV3;

  /**
   * Creates an Xai image model for image generation.
   */
  image(modelId: XaiImageModelId): ImageModelV3;

  /**
   * Creates an Xai image model for image generation.
   */
  imageModel(modelId: XaiImageModelId): ImageModelV3;

  /**
   * Creates an Xai video model for video generation.
   */
  video(modelId: XaiVideoModelId): Experimental_VideoModelV3;

  /**
   * Creates an Xai video model for video generation.
   */
  videoModel(modelId: XaiVideoModelId): Experimental_VideoModelV3;

  /**
   * Server-side agentic tools for use with the responses API.
   */
  tools: typeof xaiTools;

  /**
   * @deprecated Use `embeddingModel` instead.
   */
  textEmbeddingModel(modelId: string): never;
}

export interface XaiProviderSettings {
  /**
   * Base URL for the xAI API calls.
   */
  baseURL?: string;

  /**
   * API key for authenticating requests.
   */
  apiKey?: string;

  /**
   * Custom headers to include in the requests.
   */
  headers?: Record<string, string>;

  /**
   * Custom fetch implementation. You can use it as a middleware to intercept requests,
   * or to provide a custom fetch implementation for e.g. testing.
   */
  fetch?: FetchFunction;
}

export function createXai(options: XaiProviderSettings = {}): XaiProvider {
  const baseURL = withoutTrailingSlash(
    options.baseURL ?? 'https://api.x.ai/v1',
  );
  const getHeaders = () =>
    withUserAgentSuffix(
      {
        Authorization: `Bearer ${loadApiKey({
          apiKey: options.apiKey,
          environmentVariableName: 'XAI_API_KEY',
          description: 'xAI API key',
        })}`,
        ...options.headers,
      },
      `ai-sdk/xai/${VERSION}`,
    );

  const createChatLanguageModel = (modelId: XaiChatModelId) => {
    return new XaiChatLanguageModel(modelId, {
      provider: 'xai.chat',
      baseURL,
      headers: getHeaders,
      generateId,
      fetch: options.fetch,
    });
  };

  const createResponsesLanguageModel = (modelId: XaiResponsesModelId) => {
    return new XaiResponsesLanguageModel(modelId, {
      provider: 'xai.responses',
      baseURL,
      headers: getHeaders,
      generateId,
      fetch: options.fetch,
    });
  };

  const createImageModel = (modelId: XaiImageModelId) => {
    return new XaiImageModel(modelId, {
      provider: 'xai.image',
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
    });
  };

  const createVideoModel = (modelId: XaiVideoModelId) => {
    return new XaiVideoModel(modelId, {
      provider: 'xai.video',
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
    });
  };

  const provider = (modelId: XaiChatModelId) =>
    createChatLanguageModel(modelId);

  provider.specificationVersion = 'v3' as const;
  provider.languageModel = createChatLanguageModel;
  provider.chat = createChatLanguageModel;
  provider.responses = createResponsesLanguageModel;
  provider.embeddingModel = (modelId: string) => {
    throw new NoSuchModelError({ modelId, modelType: 'embeddingModel' });
  };
  provider.textEmbeddingModel = provider.embeddingModel;
  provider.imageModel = createImageModel;
  provider.image = createImageModel;
  provider.videoModel = createVideoModel;
  provider.video = createVideoModel;
  provider.tools = xaiTools;

  return provider;
}

export const xai = createXai();
