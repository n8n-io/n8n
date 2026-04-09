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

export interface GatewayGenerationInfoParams {
  /** The generation ID to look up (format: gen_<ulid>) */
  id: string;
}

export interface GatewayGenerationInfo {
  /** The generation ID */
  id: string;
  /** Total cost in USD */
  totalCost: number;
  /** Upstream inference cost in USD (BYOK only) */
  upstreamInferenceCost: number;
  /** Usage cost in USD (same as totalCost) */
  usage: number;
  /** ISO 8601 timestamp when the generation was created */
  createdAt: string;
  /** Model identifier */
  model: string;
  /** Whether BYOK credentials were used */
  isByok: boolean;
  /** Provider that served this generation */
  providerName: string;
  /** Whether streaming was used */
  streamed: boolean;
  /** Finish reason (e.g. 'stop') */
  finishReason: string;
  /** Time to first token in milliseconds */
  latency: number;
  /** Total generation time in milliseconds */
  generationTime: number;
  /** Number of prompt tokens */
  promptTokens: number;
  /** Number of completion tokens */
  completionTokens: number;
  /** Reasoning tokens used */
  reasoningTokens: number;
  /** Cached tokens used */
  cachedTokens: number;
  /** Cache creation input tokens */
  cacheCreationTokens: number;
  /** Billable web search calls */
  billableWebSearchCalls: number;
}

export class GatewayGenerationInfoFetcher {
  constructor(private readonly config: GatewayConfig) {}

  async getGenerationInfo(
    params: GatewayGenerationInfoParams,
  ): Promise<GatewayGenerationInfo> {
    try {
      const baseUrl = new URL(this.config.baseURL);

      const { value } = await getFromApi({
        url: `${baseUrl.origin}/v1/generation?id=${encodeURIComponent(params.id)}`,
        headers: await resolve(this.config.headers()),
        successfulResponseHandler: createJsonResponseHandler(
          gatewayGenerationInfoResponseSchema,
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

const gatewayGenerationInfoResponseSchema = lazySchema(() =>
  zodSchema(
    z
      .object({
        data: z
          .object({
            id: z.string(),
            total_cost: z.number(),
            upstream_inference_cost: z.number(),
            usage: z.number(),
            created_at: z.string(),
            model: z.string(),
            is_byok: z.boolean(),
            provider_name: z.string(),
            streamed: z.boolean(),
            finish_reason: z.string(),
            latency: z.number(),
            generation_time: z.number(),
            native_tokens_prompt: z.number(),
            native_tokens_completion: z.number(),
            native_tokens_reasoning: z.number(),
            native_tokens_cached: z.number(),
            native_tokens_cache_creation: z.number(),
            billable_web_search_calls: z.number(),
          })
          .transform(
            ({
              total_cost,
              upstream_inference_cost,
              created_at,
              is_byok,
              provider_name,
              finish_reason,
              generation_time,
              native_tokens_prompt,
              native_tokens_completion,
              native_tokens_reasoning,
              native_tokens_cached,
              native_tokens_cache_creation,
              billable_web_search_calls,
              ...rest
            }) => ({
              ...rest,
              totalCost: total_cost,
              upstreamInferenceCost: upstream_inference_cost,
              createdAt: created_at,
              isByok: is_byok,
              providerName: provider_name,
              finishReason: finish_reason,
              generationTime: generation_time,
              promptTokens: native_tokens_prompt,
              completionTokens: native_tokens_completion,
              reasoningTokens: native_tokens_reasoning,
              cachedTokens: native_tokens_cached,
              cacheCreationTokens: native_tokens_cache_creation,
              billableWebSearchCalls: billable_web_search_calls,
            }),
          ),
      })
      .transform(({ data }) => data),
  ),
);
