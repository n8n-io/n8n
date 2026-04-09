import type {
  EmbeddingModelV3,
  SharedV3ProviderMetadata,
} from '@ai-sdk/provider';
import {
  combineHeaders,
  createJsonErrorResponseHandler,
  createJsonResponseHandler,
  lazySchema,
  postJsonToApi,
  resolve,
  zodSchema,
  type Resolvable,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';
import { asGatewayError } from './errors';
import { parseAuthMethod } from './errors/parse-auth-method';
import type { GatewayConfig } from './gateway-config';

export class GatewayEmbeddingModel implements EmbeddingModelV3 {
  readonly specificationVersion = 'v3';
  readonly maxEmbeddingsPerCall = 2048;
  readonly supportsParallelCalls = true;

  constructor(
    readonly modelId: string,
    private readonly config: GatewayConfig & {
      provider: string;
      o11yHeaders: Resolvable<Record<string, string>>;
    },
  ) {}

  get provider(): string {
    return this.config.provider;
  }

  async doEmbed({
    values,
    headers,
    abortSignal,
    providerOptions,
  }: Parameters<EmbeddingModelV3['doEmbed']>[0]): Promise<
    Awaited<ReturnType<EmbeddingModelV3['doEmbed']>>
  > {
    const resolvedHeaders = await resolve(this.config.headers());
    try {
      const {
        responseHeaders,
        value: responseBody,
        rawValue,
      } = await postJsonToApi({
        url: this.getUrl(),
        headers: combineHeaders(
          resolvedHeaders,
          headers ?? {},
          this.getModelConfigHeaders(),
          await resolve(this.config.o11yHeaders),
        ),
        body: {
          values,
          ...(providerOptions ? { providerOptions } : {}),
        },
        successfulResponseHandler: createJsonResponseHandler(
          gatewayEmbeddingResponseSchema,
        ),
        failedResponseHandler: createJsonErrorResponseHandler({
          errorSchema: z.any(),
          errorToMessage: data => data,
        }),
        ...(abortSignal && { abortSignal }),
        fetch: this.config.fetch,
      });

      return {
        embeddings: responseBody.embeddings,
        usage: responseBody.usage ?? undefined,
        providerMetadata:
          responseBody.providerMetadata as unknown as SharedV3ProviderMetadata,
        response: { headers: responseHeaders, body: rawValue },
        warnings: [],
      };
    } catch (error) {
      throw await asGatewayError(error, await parseAuthMethod(resolvedHeaders));
    }
  }

  private getUrl() {
    return `${this.config.baseURL}/embedding-model`;
  }

  private getModelConfigHeaders() {
    return {
      'ai-embedding-model-specification-version': '3',
      'ai-model-id': this.modelId,
    };
  }
}

const gatewayEmbeddingResponseSchema = lazySchema(() =>
  zodSchema(
    z.object({
      embeddings: z.array(z.array(z.number())),
      usage: z.object({ tokens: z.number() }).nullish(),
      providerMetadata: z
        .record(z.string(), z.record(z.string(), z.unknown()))
        .optional(),
    }),
  ),
);
