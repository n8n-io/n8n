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

export interface GatewaySpendReportParams {
  /** Start date in YYYY-MM-DD format (inclusive) */
  startDate: string;
  /** End date in YYYY-MM-DD format (inclusive) */
  endDate: string;
  /** Primary aggregation dimension. Defaults to 'day'. */
  groupBy?: 'day' | 'user' | 'model' | 'tag' | 'provider' | 'credential_type';
  /** Time granularity when groupBy is 'day'. */
  datePart?: 'day' | 'hour';
  /** Filter to a specific user's spend. */
  userId?: string;
  /** Filter to a specific model (e.g. 'anthropic/claude-sonnet-4.5'). */
  model?: string;
  /** Filter to a specific provider (e.g. 'anthropic'). */
  provider?: string;
  /** Filter to BYOK or system credentials. */
  credentialType?: 'byok' | 'system';
  /** Filter to requests with these tags. */
  tags?: string[];
}

export interface GatewaySpendReportRow {
  /** Date string (present when groupBy is 'day') */
  day?: string;
  /** Hour timestamp (present when groupBy is 'day' and datePart is 'hour') */
  hour?: string;
  /** User identifier (present when groupBy is 'user') */
  user?: string;
  /** Model identifier (present when groupBy is 'model') */
  model?: string;
  /** Tag value (present when groupBy is 'tag') */
  tag?: string;
  /** Provider name (present when groupBy is 'provider') */
  provider?: string;
  /** Credential type (present when groupBy is 'credential_type') */
  credentialType?: 'byok' | 'system';

  /** Total cost in USD */
  totalCost: number;
  /** Market cost in USD */
  marketCost?: number;
  /** Number of input tokens */
  inputTokens?: number;
  /** Number of output tokens */
  outputTokens?: number;
  /** Number of cached input tokens */
  cachedInputTokens?: number;
  /** Number of cache creation input tokens */
  cacheCreationInputTokens?: number;
  /** Number of reasoning tokens */
  reasoningTokens?: number;
  /** Number of requests */
  requestCount?: number;
}

export interface GatewaySpendReportResponse {
  results: GatewaySpendReportRow[];
}

export class GatewaySpendReport {
  constructor(private readonly config: GatewayConfig) {}

  async getSpendReport(
    params: GatewaySpendReportParams,
  ): Promise<GatewaySpendReportResponse> {
    try {
      const baseUrl = new URL(this.config.baseURL);

      const searchParams = new URLSearchParams();
      searchParams.set('start_date', params.startDate);
      searchParams.set('end_date', params.endDate);

      if (params.groupBy) {
        searchParams.set('group_by', params.groupBy);
      }
      if (params.datePart) {
        searchParams.set('date_part', params.datePart);
      }
      if (params.userId) {
        searchParams.set('user_id', params.userId);
      }
      if (params.model) {
        searchParams.set('model', params.model);
      }
      if (params.provider) {
        searchParams.set('provider', params.provider);
      }
      if (params.credentialType) {
        searchParams.set('credential_type', params.credentialType);
      }
      if (params.tags && params.tags.length > 0) {
        searchParams.set('tags', params.tags.join(','));
      }

      const { value } = await getFromApi({
        url: `${baseUrl.origin}/v1/report?${searchParams.toString()}`,
        headers: await resolve(this.config.headers()),
        successfulResponseHandler: createJsonResponseHandler(
          gatewaySpendReportResponseSchema,
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

const gatewaySpendReportResponseSchema = lazySchema(() =>
  zodSchema(
    z.object({
      results: z.array(
        z
          .object({
            day: z.string().optional(),
            hour: z.string().optional(),
            user: z.string().optional(),
            model: z.string().optional(),
            tag: z.string().optional(),
            provider: z.string().optional(),
            credential_type: z.enum(['byok', 'system']).optional(),
            total_cost: z.number(),
            market_cost: z.number().optional(),
            input_tokens: z.number().optional(),
            output_tokens: z.number().optional(),
            cached_input_tokens: z.number().optional(),
            cache_creation_input_tokens: z.number().optional(),
            reasoning_tokens: z.number().optional(),
            request_count: z.number().optional(),
          })
          .transform(
            ({
              credential_type,
              total_cost,
              market_cost,
              input_tokens,
              output_tokens,
              cached_input_tokens,
              cache_creation_input_tokens,
              reasoning_tokens,
              request_count,
              ...rest
            }) => ({
              ...rest,
              ...(credential_type !== undefined
                ? { credentialType: credential_type }
                : {}),
              totalCost: total_cost,
              ...(market_cost !== undefined ? { marketCost: market_cost } : {}),
              ...(input_tokens !== undefined
                ? { inputTokens: input_tokens }
                : {}),
              ...(output_tokens !== undefined
                ? { outputTokens: output_tokens }
                : {}),
              ...(cached_input_tokens !== undefined
                ? { cachedInputTokens: cached_input_tokens }
                : {}),
              ...(cache_creation_input_tokens !== undefined
                ? { cacheCreationInputTokens: cache_creation_input_tokens }
                : {}),
              ...(reasoning_tokens !== undefined
                ? { reasoningTokens: reasoning_tokens }
                : {}),
              ...(request_count !== undefined
                ? { requestCount: request_count }
                : {}),
            }),
          ),
      ),
    }),
  ),
);
