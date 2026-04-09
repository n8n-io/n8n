import {
  InvalidArgumentError,
  LanguageModelV3,
  NoSuchModelError,
  ProviderV3,
} from '@ai-sdk/provider';
import {
  FetchFunction,
  generateId,
  loadApiKey,
  loadOptionalSetting,
  withoutTrailingSlash,
  withUserAgentSuffix,
} from '@ai-sdk/provider-utils';
import { VERSION } from './version';
import { AnthropicMessagesLanguageModel } from './anthropic-messages-language-model';
import { AnthropicMessagesModelId } from './anthropic-messages-options';
import { anthropicTools } from './anthropic-tools';

export interface AnthropicProvider extends ProviderV3 {
  /**
   * Creates a model for text generation.
   */
  (modelId: AnthropicMessagesModelId): LanguageModelV3;

  /**
   * Creates a model for text generation.
   */
  languageModel(modelId: AnthropicMessagesModelId): LanguageModelV3;

  chat(modelId: AnthropicMessagesModelId): LanguageModelV3;

  messages(modelId: AnthropicMessagesModelId): LanguageModelV3;

  /**
   * @deprecated Use `embeddingModel` instead.
   */
  textEmbeddingModel(modelId: string): never;

  /**
   * Anthropic-specific computer use tool.
   */
  tools: typeof anthropicTools;
}

export interface AnthropicProviderSettings {
  /**
   * Use a different URL prefix for API calls, e.g. to use proxy servers.
   * The default prefix is `https://api.anthropic.com/v1`.
   */
  baseURL?: string;

  /**
   * API key that is being send using the `x-api-key` header.
   * It defaults to the `ANTHROPIC_API_KEY` environment variable.
   * Only one of `apiKey` or `authToken` is required.
   */
  apiKey?: string;

  /**
   * Auth token that is being sent using the `Authorization: Bearer` header.
   * It defaults to the `ANTHROPIC_AUTH_TOKEN` environment variable.
   * Only one of `apiKey` or `authToken` is required.
   */
  authToken?: string;

  /**
   * Custom headers to include in the requests.
   */
  headers?: Record<string, string>;

  /**
   * Custom fetch implementation. You can use it as a middleware to intercept requests,
   * or to provide a custom fetch implementation for e.g. testing.
   */
  fetch?: FetchFunction;

  generateId?: () => string;

  /**
   * Custom provider name
   * Defaults to 'anthropic.messages'.
   */
  name?: string;
}

/**
 * Create an Anthropic provider instance.
 */
export function createAnthropic(
  options: AnthropicProviderSettings = {},
): AnthropicProvider {
  const baseURL =
    withoutTrailingSlash(
      loadOptionalSetting({
        settingValue: options.baseURL,
        environmentVariableName: 'ANTHROPIC_BASE_URL',
      }),
    ) ?? 'https://api.anthropic.com/v1';

  const providerName = options.name ?? 'anthropic.messages';

  // Only error if both are explicitly provided in options
  if (options.apiKey && options.authToken) {
    throw new InvalidArgumentError({
      argument: 'apiKey/authToken',
      message:
        'Both apiKey and authToken were provided. Please use only one authentication method.',
    });
  }

  const getHeaders = () => {
    const authHeaders: Record<string, string> = options.authToken
      ? { Authorization: `Bearer ${options.authToken}` }
      : {
          'x-api-key': loadApiKey({
            apiKey: options.apiKey,
            environmentVariableName: 'ANTHROPIC_API_KEY',
            description: 'Anthropic',
          }),
        };

    return withUserAgentSuffix(
      {
        'anthropic-version': '2023-06-01',
        ...authHeaders,
        ...options.headers,
      },
      `ai-sdk/anthropic/${VERSION}`,
    );
  };

  const createChatModel = (modelId: AnthropicMessagesModelId) =>
    new AnthropicMessagesLanguageModel(modelId, {
      provider: providerName,
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
      generateId: options.generateId ?? generateId,
      supportedUrls: () => ({
        'image/*': [/^https?:\/\/.*$/],
        'application/pdf': [/^https?:\/\/.*$/],
      }),
    });

  const provider = function (modelId: AnthropicMessagesModelId) {
    if (new.target) {
      throw new Error(
        'The Anthropic model function cannot be called with the new keyword.',
      );
    }

    return createChatModel(modelId);
  };

  provider.specificationVersion = 'v3' as const;
  provider.languageModel = createChatModel;
  provider.chat = createChatModel;
  provider.messages = createChatModel;

  provider.embeddingModel = (modelId: string) => {
    throw new NoSuchModelError({ modelId, modelType: 'embeddingModel' });
  };
  provider.textEmbeddingModel = provider.embeddingModel;
  provider.imageModel = (modelId: string) => {
    throw new NoSuchModelError({ modelId, modelType: 'imageModel' });
  };

  provider.tools = anthropicTools;

  return provider;
}

/**
 * Default Anthropic provider instance.
 */
export const anthropic = createAnthropic();
