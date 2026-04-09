import {
  EmbeddingModelV3,
  SharedV3Warning,
  TooManyEmbeddingValuesForCallError,
} from '@ai-sdk/provider';
import {
  combineHeaders,
  createJsonErrorResponseHandler,
  createJsonResponseHandler,
  FetchFunction,
  parseProviderOptions,
  postJsonToApi,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';
import {
  OpenAICompatibleEmbeddingModelId,
  openaiCompatibleEmbeddingModelOptions,
} from './openai-compatible-embedding-options';
import {
  defaultOpenAICompatibleErrorStructure,
  ProviderErrorStructure,
} from '../openai-compatible-error';

type OpenAICompatibleEmbeddingConfig = {
  /**
   * Override the maximum number of embeddings per call.
   */
  maxEmbeddingsPerCall?: number;

  /**
   * Override the parallelism of embedding calls.
   */
  supportsParallelCalls?: boolean;

  provider: string;
  url: (options: { modelId: string; path: string }) => string;
  headers: () => Record<string, string | undefined>;
  fetch?: FetchFunction;
  errorStructure?: ProviderErrorStructure<any>;
};

export class OpenAICompatibleEmbeddingModel implements EmbeddingModelV3 {
  readonly specificationVersion = 'v3';
  readonly modelId: OpenAICompatibleEmbeddingModelId;

  private readonly config: OpenAICompatibleEmbeddingConfig;

  get provider(): string {
    return this.config.provider;
  }

  get maxEmbeddingsPerCall(): number {
    return this.config.maxEmbeddingsPerCall ?? 2048;
  }

  get supportsParallelCalls(): boolean {
    return this.config.supportsParallelCalls ?? true;
  }

  constructor(
    modelId: OpenAICompatibleEmbeddingModelId,
    config: OpenAICompatibleEmbeddingConfig,
  ) {
    this.modelId = modelId;
    this.config = config;
  }

  private get providerOptionsName(): string {
    return this.config.provider.split('.')[0].trim();
  }

  async doEmbed({
    values,
    headers,
    abortSignal,
    providerOptions,
  }: Parameters<EmbeddingModelV3['doEmbed']>[0]): Promise<
    Awaited<ReturnType<EmbeddingModelV3['doEmbed']>>
  > {
    const warnings: SharedV3Warning[] = [];

    // Parse provider options - check for deprecated 'openai-compatible' key
    const deprecatedOptions = await parseProviderOptions({
      provider: 'openai-compatible',
      providerOptions,
      schema: openaiCompatibleEmbeddingModelOptions,
    });

    if (deprecatedOptions != null) {
      warnings.push({
        type: 'other',
        message: `The 'openai-compatible' key in providerOptions is deprecated. Use 'openaiCompatible' instead.`,
      });
    }

    const compatibleOptions = Object.assign(
      deprecatedOptions ?? {},
      (await parseProviderOptions({
        provider: 'openaiCompatible',
        providerOptions,
        schema: openaiCompatibleEmbeddingModelOptions,
      })) ?? {},
      (await parseProviderOptions({
        provider: this.providerOptionsName,
        providerOptions,
        schema: openaiCompatibleEmbeddingModelOptions,
      })) ?? {},
    );

    if (values.length > this.maxEmbeddingsPerCall) {
      throw new TooManyEmbeddingValuesForCallError({
        provider: this.provider,
        modelId: this.modelId,
        maxEmbeddingsPerCall: this.maxEmbeddingsPerCall,
        values,
      });
    }

    const {
      responseHeaders,
      value: response,
      rawValue,
    } = await postJsonToApi({
      url: this.config.url({
        path: '/embeddings',
        modelId: this.modelId,
      }),
      headers: combineHeaders(this.config.headers(), headers),
      body: {
        model: this.modelId,
        input: values,
        encoding_format: 'float',
        dimensions: compatibleOptions.dimensions,
        user: compatibleOptions.user,
      },
      failedResponseHandler: createJsonErrorResponseHandler(
        this.config.errorStructure ?? defaultOpenAICompatibleErrorStructure,
      ),
      successfulResponseHandler: createJsonResponseHandler(
        openaiTextEmbeddingResponseSchema,
      ),
      abortSignal,
      fetch: this.config.fetch,
    });

    return {
      warnings,
      embeddings: response.data.map(item => item.embedding),
      usage: response.usage
        ? { tokens: response.usage.prompt_tokens }
        : undefined,
      providerMetadata: response.providerMetadata,
      response: { headers: responseHeaders, body: rawValue },
    };
  }
}

// minimal version of the schema, focussed on what is needed for the implementation
// this approach limits breakages when the API changes and increases efficiency
const openaiTextEmbeddingResponseSchema = z.object({
  data: z.array(z.object({ embedding: z.array(z.number()) })),
  usage: z.object({ prompt_tokens: z.number() }).nullish(),
  providerMetadata: z
    .record(z.string(), z.record(z.string(), z.any()))
    .optional(),
});
