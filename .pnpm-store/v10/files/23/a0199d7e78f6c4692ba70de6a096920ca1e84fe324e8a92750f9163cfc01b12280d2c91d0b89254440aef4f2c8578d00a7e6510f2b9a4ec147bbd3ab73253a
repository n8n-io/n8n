import {
  createJsonErrorResponseHandler,
  createJsonResponseHandler,
  getFromApi,
  lazySchema,
  resolve,
  zodSchema,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';
import { asGatewayError } from './errors';
import type { GatewayConfig } from './gateway-config';
import type { GatewayLanguageModelEntry } from './gateway-model-entry';

type GatewayFetchMetadataConfig = GatewayConfig;

export interface GatewayFetchMetadataResponse {
  models: GatewayLanguageModelEntry[];
}

export interface GatewayCreditsResponse {
  /** The remaining gateway credit balance available for API usage */
  balance: string;
  /** The total amount of gateway credits that have been consumed */
  totalUsed: string;
}

export class GatewayFetchMetadata {
  constructor(private readonly config: GatewayFetchMetadataConfig) {}

  async getAvailableModels(): Promise<GatewayFetchMetadataResponse> {
    try {
      const { value } = await getFromApi({
        url: `${this.config.baseURL}/config`,
        headers: await resolve(this.config.headers()),
        successfulResponseHandler: createJsonResponseHandler(
          gatewayAvailableModelsResponseSchema,
        ),
        failedResponseHandler: createJsonErrorResponseHandler({
          errorSchema: z.any(),
          errorToMessage: data => data,
        }),
        fetch: this.config.fetch,
      });

      return value;
    } catch (error) {
      throw await asGatewayError(error);
    }
  }

  async getCredits(): Promise<GatewayCreditsResponse> {
    try {
      const baseUrl = new URL(this.config.baseURL);

      const { value } = await getFromApi({
        url: `${baseUrl.origin}/v1/credits`,
        headers: await resolve(this.config.headers()),
        successfulResponseHandler: createJsonResponseHandler(
          gatewayCreditsResponseSchema,
        ),
        failedResponseHandler: createJsonErrorResponseHandler({
          errorSchema: z.any(),
          errorToMessage: data => data,
        }),
        fetch: this.config.fetch,
      });

      return value;
    } catch (error) {
      throw await asGatewayError(error);
    }
  }
}

const gatewayAvailableModelsResponseSchema = lazySchema(() =>
  zodSchema(
    z.object({
      models: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          description: z.string().nullish(),
          pricing: z
            .object({
              input: z.string(),
              output: z.string(),
              input_cache_read: z.string().nullish(),
              input_cache_write: z.string().nullish(),
            })
            .transform(
              ({ input, output, input_cache_read, input_cache_write }) => ({
                input,
                output,
                ...(input_cache_read
                  ? { cachedInputTokens: input_cache_read }
                  : {}),
                ...(input_cache_write
                  ? { cacheCreationInputTokens: input_cache_write }
                  : {}),
              }),
            )
            .nullish(),
          specification: z.object({
            specificationVersion: z.literal('v3'),
            provider: z.string(),
            modelId: z.string(),
          }),
          modelType: z
            .enum(['embedding', 'image', 'language', 'video'])
            .nullish(),
        }),
      ),
    }),
  ),
);

const gatewayCreditsResponseSchema = lazySchema(() =>
  zodSchema(
    z
      .object({
        balance: z.string(),
        total_used: z.string(),
      })
      .transform(({ balance, total_used }) => ({
        balance,
        totalUsed: total_used,
      })),
  ),
);
