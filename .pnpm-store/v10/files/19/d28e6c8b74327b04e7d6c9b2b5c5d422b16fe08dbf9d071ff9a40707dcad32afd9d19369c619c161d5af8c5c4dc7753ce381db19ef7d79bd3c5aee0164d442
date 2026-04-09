import {
  EmbeddingModelV3,
  ImageModelV3,
  LanguageModelV3,
  ProviderV3,
} from '@ai-sdk/provider';
import {
  FetchFunction,
  withoutTrailingSlash,
  withUserAgentSuffix,
} from '@ai-sdk/provider-utils';
import {
  OpenAICompatibleChatConfig,
  OpenAICompatibleChatLanguageModel,
} from './chat/openai-compatible-chat-language-model';
import { MetadataExtractor } from './chat/openai-compatible-metadata-extractor';
import { OpenAICompatibleCompletionLanguageModel } from './completion/openai-compatible-completion-language-model';
import { OpenAICompatibleEmbeddingModel } from './embedding/openai-compatible-embedding-model';
import { OpenAICompatibleImageModel } from './image/openai-compatible-image-model';
import { VERSION } from './version';

export interface OpenAICompatibleProvider<
  CHAT_MODEL_IDS extends string = string,
  COMPLETION_MODEL_IDS extends string = string,
  EMBEDDING_MODEL_IDS extends string = string,
  IMAGE_MODEL_IDS extends string = string,
> extends Omit<ProviderV3, 'imageModel'> {
  (modelId: CHAT_MODEL_IDS): LanguageModelV3;

  languageModel(
    modelId: CHAT_MODEL_IDS,
    config?: Partial<OpenAICompatibleChatConfig>,
  ): LanguageModelV3;

  chatModel(modelId: CHAT_MODEL_IDS): LanguageModelV3;

  completionModel(modelId: COMPLETION_MODEL_IDS): LanguageModelV3;

  embeddingModel(modelId: EMBEDDING_MODEL_IDS): EmbeddingModelV3;

  /**
   * @deprecated Use `embeddingModel` instead.
   */
  textEmbeddingModel(modelId: EMBEDDING_MODEL_IDS): EmbeddingModelV3;

  imageModel(modelId: IMAGE_MODEL_IDS): ImageModelV3;
}

export interface OpenAICompatibleProviderSettings {
  /**
   * Base URL for the API calls.
   */
  baseURL: string;

  /**
   * Provider name.
   */
  name: string;

  /**
   * API key for authenticating requests. If specified, adds an `Authorization`
   * header to request headers with the value `Bearer <apiKey>`. This will be added
   * before any headers potentially specified in the `headers` option.
   */
  apiKey?: string;

  /**
   * Optional custom headers to include in requests. These will be added to request headers
   * after any headers potentially added by use of the `apiKey` option.
   */
  headers?: Record<string, string>;

  /**
   * Optional custom url query parameters to include in request urls.
   */
  queryParams?: Record<string, string>;

  /**
   * Custom fetch implementation. You can use it as a middleware to intercept requests,
   * or to provide a custom fetch implementation for e.g. testing.
   */
  fetch?: FetchFunction;

  /**
   * Include usage information in streaming responses.
   */
  includeUsage?: boolean;

  /**
   * Whether the provider supports structured outputs in chat models.
   */
  supportsStructuredOutputs?: boolean;

  /**
   * Optional function to transform the request body before sending it to the API.
   * This is useful for proxy providers that may require a different request format
   * than the official OpenAI API.
   */
  transformRequestBody?: (args: Record<string, any>) => Record<string, any>;

  /**
   * Optional metadata extractor to capture provider-specific metadata from API responses.
   * This is useful for extracting non-standard fields, experimental features,
   * or provider-specific metrics from both streaming and non-streaming responses.
   */
  metadataExtractor?: MetadataExtractor;
}

/**
 * Create an OpenAICompatible provider instance.
 */
export function createOpenAICompatible<
  CHAT_MODEL_IDS extends string,
  COMPLETION_MODEL_IDS extends string,
  EMBEDDING_MODEL_IDS extends string,
  IMAGE_MODEL_IDS extends string,
>(
  options: OpenAICompatibleProviderSettings,
): OpenAICompatibleProvider<
  CHAT_MODEL_IDS,
  COMPLETION_MODEL_IDS,
  EMBEDDING_MODEL_IDS,
  IMAGE_MODEL_IDS
> {
  const baseURL = withoutTrailingSlash(options.baseURL);
  const providerName = options.name;

  interface CommonModelConfig {
    provider: string;
    url: ({ path }: { path: string }) => string;
    headers: () => Record<string, string>;
    fetch?: FetchFunction;
  }

  const headers = {
    ...(options.apiKey && { Authorization: `Bearer ${options.apiKey}` }),
    ...options.headers,
  };

  const getHeaders = () =>
    withUserAgentSuffix(headers, `ai-sdk/openai-compatible/${VERSION}`);

  const getCommonModelConfig = (modelType: string): CommonModelConfig => ({
    provider: `${providerName}.${modelType}`,
    url: ({ path }) => {
      const url = new URL(`${baseURL}${path}`);
      if (options.queryParams) {
        url.search = new URLSearchParams(options.queryParams).toString();
      }
      return url.toString();
    },
    headers: getHeaders,
    fetch: options.fetch,
  });

  const createLanguageModel = (modelId: CHAT_MODEL_IDS) =>
    createChatModel(modelId);

  const createChatModel = (modelId: CHAT_MODEL_IDS) =>
    new OpenAICompatibleChatLanguageModel(modelId, {
      ...getCommonModelConfig('chat'),
      includeUsage: options.includeUsage,
      supportsStructuredOutputs: options.supportsStructuredOutputs,
      transformRequestBody: options.transformRequestBody,
      metadataExtractor: options.metadataExtractor,
    });

  const createCompletionModel = (modelId: COMPLETION_MODEL_IDS) =>
    new OpenAICompatibleCompletionLanguageModel(modelId, {
      ...getCommonModelConfig('completion'),
      includeUsage: options.includeUsage,
    });

  const createEmbeddingModel = (modelId: EMBEDDING_MODEL_IDS) =>
    new OpenAICompatibleEmbeddingModel(modelId, {
      ...getCommonModelConfig('embedding'),
    });

  const createImageModel = (modelId: IMAGE_MODEL_IDS) =>
    new OpenAICompatibleImageModel(modelId, getCommonModelConfig('image'));

  const provider = (modelId: CHAT_MODEL_IDS) => createLanguageModel(modelId);

  provider.specificationVersion = 'v3' as const;
  provider.languageModel = createLanguageModel;
  provider.chatModel = createChatModel;
  provider.completionModel = createCompletionModel;
  provider.embeddingModel = createEmbeddingModel;
  provider.textEmbeddingModel = createEmbeddingModel;
  provider.imageModel = createImageModel;

  return provider as OpenAICompatibleProvider<
    CHAT_MODEL_IDS,
    COMPLETION_MODEL_IDS,
    EMBEDDING_MODEL_IDS,
    IMAGE_MODEL_IDS
  >;
}
