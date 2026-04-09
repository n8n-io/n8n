import { InferSchema, lazySchema, zodSchema } from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

// https://vercel.com/docs/ai-gateway/provider-options
const gatewayProviderOptions = lazySchema(() =>
  zodSchema(
    z.object({
      /**
       * Array of provider slugs that are the only ones allowed to be used.
       *
       * Example: `['azure', 'openai']` will only allow Azure and OpenAI to be used.
       */
      only: z.array(z.string()).optional(),
      /**
       * Array of provider slugs that specifies the sequence in which providers should be attempted.
       *
       * Example: `['bedrock', 'anthropic']` will try Amazon Bedrock first, then Anthropic as fallback.
       */
      order: z.array(z.string()).optional(),
      /**
       * The unique identifier for the end user on behalf of whom the request was made.
       *
       * Used for spend tracking and attribution purposes.
       */
      user: z.string().optional(),
      /**
       * User-specified tags for use in reporting and filtering usage.
       *
       * For example, spend tracking reporting by feature or prompt version.
       *
       * Example: `['chat', 'v2']`
       */
      tags: z.array(z.string()).optional(),
      /**
       * Array of model slugs specifying fallback models to use in order.
       *
       * Example: `['openai/gpt-5-nano', 'zai/glm-4.6']` will try `openai/gpt-5-nano` first, then `zai/glm-4.6` as fallback.
       */
      models: z.array(z.string()).optional(),
      /**
       * Request-scoped BYOK credentials to use instead of cached credentials.
       *
       * When provided, cached BYOK credentials are ignored entirely.
       *
       * Each provider can have multiple credentials (tried in order).
       *
       * Examples:
       * - Simple: `{ 'anthropic': [{ apiKey: 'sk-ant-...' }] }`
       * - Multiple: `{ 'vertex': [{ projectId: 'proj-1', privateKey: '...' }, { projectId: 'proj-2', privateKey: '...' }] }`
       * - Multi-provider: `{ 'anthropic': [{ apiKey: '...' }], 'bedrock': [{ accessKeyId: '...', secretAccessKey: '...' }] }`
       */
      byok: z
        .record(z.string(), z.array(z.record(z.string(), z.unknown())))
        .optional(),
      /**
       * Whether to filter by only providers that state they have zero data
       * retention with Vercel AI Gateway. When enabled, only providers that
       * have agreements with Vercel AI Gateway for zero data retention will be
       * used.
       */
      zeroDataRetention: z.boolean().optional(),
      /**
       * Per-provider timeouts for BYOK credentials in milliseconds.
       * Controls how long to wait for a provider to start responding
       * before falling back to the next available provider.
       *
       * Example: `{ byok: { openai: 5000, anthropic: 2000 } }`
       */
      providerTimeouts: z
        .object({
          byok: z.record(z.string(), z.number().int().min(1000)).optional(),
        })
        .optional(),
    }),
  ),
);

export type GatewayProviderOptions = InferSchema<typeof gatewayProviderOptions>;
