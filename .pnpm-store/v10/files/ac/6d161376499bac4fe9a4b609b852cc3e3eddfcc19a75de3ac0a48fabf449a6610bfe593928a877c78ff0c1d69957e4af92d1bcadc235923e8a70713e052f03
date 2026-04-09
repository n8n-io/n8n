import {
  loadOptionalSetting,
  withoutTrailingSlash,
  type FetchFunction,
} from '@ai-sdk/provider-utils';
import { asGatewayError, GatewayAuthenticationError } from './errors';
import {
  GATEWAY_AUTH_METHOD_HEADER,
  parseAuthMethod,
} from './errors/parse-auth-method';
import {
  GatewayFetchMetadata,
  type GatewayFetchMetadataResponse,
  type GatewayCreditsResponse,
} from './gateway-fetch-metadata';
import {
  GatewaySpendReport,
  type GatewaySpendReportParams,
  type GatewaySpendReportResponse,
} from './gateway-spend-report';
import {
  GatewayGenerationInfoFetcher,
  type GatewayGenerationInfoParams,
  type GatewayGenerationInfo,
} from './gateway-generation-info';
import { GatewayLanguageModel } from './gateway-language-model';
import { GatewayEmbeddingModel } from './gateway-embedding-model';
import { GatewayImageModel } from './gateway-image-model';
import { GatewayVideoModel } from './gateway-video-model';
import type { GatewayEmbeddingModelId } from './gateway-embedding-model-settings';
import type { GatewayImageModelId } from './gateway-image-model-settings';
import type { GatewayVideoModelId } from './gateway-video-model-settings';
import { gatewayTools } from './gateway-tools';
import { getVercelOidcToken, getVercelRequestId } from './vercel-environment';
import type { GatewayModelId } from './gateway-language-model-settings';
import type {
  LanguageModelV3,
  EmbeddingModelV3,
  ImageModelV3,
  Experimental_VideoModelV3,
  ProviderV3,
} from '@ai-sdk/provider';
import { withUserAgentSuffix } from '@ai-sdk/provider-utils';
import { VERSION } from './version';

export interface GatewayProvider extends ProviderV3 {
  (modelId: GatewayModelId): LanguageModelV3;

  /**
   * Creates a model for text generation.
   */
  chat(modelId: GatewayModelId): LanguageModelV3;

  /**
   * Creates a model for text generation.
   */
  languageModel(modelId: GatewayModelId): LanguageModelV3;

  /**
   * Returns available providers and models for use with the remote provider.
   */
  getAvailableModels(): Promise<GatewayFetchMetadataResponse>;

  /**
   * Returns credit information for the authenticated user.
   */
  getCredits(): Promise<GatewayCreditsResponse>;

  /**
   * Returns a spend report with cost, token, and request count data,
   * aggregated by the specified dimension.
   */
  getSpendReport(
    params: GatewaySpendReportParams,
  ): Promise<GatewaySpendReportResponse>;

  /**
   * Returns detailed information about a specific generation by its ID,
   * including cost, token usage, latency, and provider details.
   */
  getGenerationInfo(
    params: GatewayGenerationInfoParams,
  ): Promise<GatewayGenerationInfo>;

  /**
   * Creates a model for generating text embeddings.
   */
  embedding(modelId: GatewayEmbeddingModelId): EmbeddingModelV3;

  /**
   * Creates a model for generating text embeddings.
   */
  embeddingModel(modelId: GatewayEmbeddingModelId): EmbeddingModelV3;

  /**
   * @deprecated Use `embeddingModel` instead.
   */
  textEmbeddingModel(modelId: GatewayEmbeddingModelId): EmbeddingModelV3;

  /**
   * Creates a model for generating images.
   */
  image(modelId: GatewayImageModelId): ImageModelV3;

  /**
   * Creates a model for generating images.
   */
  imageModel(modelId: GatewayImageModelId): ImageModelV3;

  /**
   * Creates a model for generating videos.
   */
  video(modelId: GatewayVideoModelId): Experimental_VideoModelV3;

  /**
   * Creates a model for generating videos.
   */
  videoModel(modelId: GatewayVideoModelId): Experimental_VideoModelV3;

  /**
   * Gateway-specific tools executed server-side.
   */
  tools: typeof gatewayTools;
}

export interface GatewayProviderSettings {
  /**
   * The base URL prefix for API calls. Defaults to `https://ai-gateway.vercel.sh/v1/ai`.
   */
  baseURL?: string;

  /**
   * API key that is being sent using the `Authorization` header.
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

  /**
   * How frequently to refresh the metadata cache in milliseconds.
   */
  metadataCacheRefreshMillis?: number;

  /**
   * @internal For testing purposes only
   */
  _internal?: {
    currentDate?: () => Date;
  };
}

const AI_GATEWAY_PROTOCOL_VERSION = '0.0.1';

/**
 * Create a remote provider instance.
 */
export function createGatewayProvider(
  options: GatewayProviderSettings = {},
): GatewayProvider {
  let pendingMetadata: Promise<GatewayFetchMetadataResponse> | null = null;
  let metadataCache: GatewayFetchMetadataResponse | null = null;
  const cacheRefreshMillis =
    options.metadataCacheRefreshMillis ?? 1000 * 60 * 5;
  let lastFetchTime = 0;

  const baseURL =
    withoutTrailingSlash(options.baseURL) ??
    'https://ai-gateway.vercel.sh/v3/ai';

  const getHeaders = async () => {
    try {
      const auth = await getGatewayAuthToken(options);
      return withUserAgentSuffix(
        {
          Authorization: `Bearer ${auth.token}`,
          'ai-gateway-protocol-version': AI_GATEWAY_PROTOCOL_VERSION,
          [GATEWAY_AUTH_METHOD_HEADER]: auth.authMethod,
          ...options.headers,
        },
        `ai-sdk/gateway/${VERSION}`,
      );
    } catch (error) {
      throw GatewayAuthenticationError.createContextualError({
        apiKeyProvided: false,
        oidcTokenProvided: false,
        statusCode: 401,
        cause: error,
      });
    }
  };

  const createO11yHeaders = () => {
    const deploymentId = loadOptionalSetting({
      settingValue: undefined,
      environmentVariableName: 'VERCEL_DEPLOYMENT_ID',
    });
    const environment = loadOptionalSetting({
      settingValue: undefined,
      environmentVariableName: 'VERCEL_ENV',
    });
    const region = loadOptionalSetting({
      settingValue: undefined,
      environmentVariableName: 'VERCEL_REGION',
    });
    const projectId = loadOptionalSetting({
      settingValue: undefined,
      environmentVariableName: 'VERCEL_PROJECT_ID',
    });

    return async () => {
      const requestId = await getVercelRequestId();
      return {
        ...(deploymentId && { 'ai-o11y-deployment-id': deploymentId }),
        ...(environment && { 'ai-o11y-environment': environment }),
        ...(region && { 'ai-o11y-region': region }),
        ...(requestId && { 'ai-o11y-request-id': requestId }),
        ...(projectId && { 'ai-o11y-project-id': projectId }),
      };
    };
  };

  const createLanguageModel = (modelId: GatewayModelId) => {
    return new GatewayLanguageModel(modelId, {
      provider: 'gateway',
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
      o11yHeaders: createO11yHeaders(),
    });
  };

  const getAvailableModels = async () => {
    const now = options._internal?.currentDate?.().getTime() ?? Date.now();
    if (!pendingMetadata || now - lastFetchTime > cacheRefreshMillis) {
      lastFetchTime = now;

      pendingMetadata = new GatewayFetchMetadata({
        baseURL,
        headers: getHeaders,
        fetch: options.fetch,
      })
        .getAvailableModels()
        .then(metadata => {
          metadataCache = metadata;
          return metadata;
        })
        .catch(async (error: unknown) => {
          throw await asGatewayError(
            error,
            await parseAuthMethod(await getHeaders()),
          );
        });
    }

    return metadataCache ? Promise.resolve(metadataCache) : pendingMetadata;
  };

  const getCredits = async () => {
    return new GatewayFetchMetadata({
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
    })
      .getCredits()
      .catch(async (error: unknown) => {
        throw await asGatewayError(
          error,
          await parseAuthMethod(await getHeaders()),
        );
      });
  };

  const getSpendReport = async (params: GatewaySpendReportParams) => {
    return new GatewaySpendReport({
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
    })
      .getSpendReport(params)
      .catch(async (error: unknown) => {
        throw await asGatewayError(
          error,
          await parseAuthMethod(await getHeaders()),
        );
      });
  };

  const getGenerationInfo = async (params: GatewayGenerationInfoParams) => {
    return new GatewayGenerationInfoFetcher({
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
    })
      .getGenerationInfo(params)
      .catch(async (error: unknown) => {
        throw await asGatewayError(
          error,
          await parseAuthMethod(await getHeaders()),
        );
      });
  };

  const provider = function (modelId: GatewayModelId) {
    if (new.target) {
      throw new Error(
        'The Gateway Provider model function cannot be called with the new keyword.',
      );
    }

    return createLanguageModel(modelId);
  };

  provider.specificationVersion = 'v3' as const;
  provider.getAvailableModels = getAvailableModels;
  provider.getCredits = getCredits;
  provider.getSpendReport = getSpendReport;
  provider.getGenerationInfo = getGenerationInfo;
  provider.imageModel = (modelId: GatewayImageModelId) => {
    return new GatewayImageModel(modelId, {
      provider: 'gateway',
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
      o11yHeaders: createO11yHeaders(),
    });
  };
  provider.languageModel = createLanguageModel;
  const createEmbeddingModel = (modelId: GatewayEmbeddingModelId) => {
    return new GatewayEmbeddingModel(modelId, {
      provider: 'gateway',
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
      o11yHeaders: createO11yHeaders(),
    });
  };
  provider.embeddingModel = createEmbeddingModel;
  provider.textEmbeddingModel = createEmbeddingModel;
  provider.videoModel = (modelId: GatewayVideoModelId) => {
    return new GatewayVideoModel(modelId, {
      provider: 'gateway',
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
      o11yHeaders: createO11yHeaders(),
    });
  };
  provider.chat = provider.languageModel;
  provider.embedding = provider.embeddingModel;
  provider.image = provider.imageModel;
  provider.video = provider.videoModel;
  provider.tools = gatewayTools;
  return provider;
}

export const gateway = createGatewayProvider();

export async function getGatewayAuthToken(
  options: GatewayProviderSettings,
): Promise<{ token: string; authMethod: 'api-key' | 'oidc' }> {
  const apiKey = loadOptionalSetting({
    settingValue: options.apiKey,
    environmentVariableName: 'AI_GATEWAY_API_KEY',
  });

  if (apiKey) {
    return {
      token: apiKey,
      authMethod: 'api-key',
    };
  }

  const oidcToken = await getVercelOidcToken();
  return {
    token: oidcToken,
    authMethod: 'oidc',
  };
}
