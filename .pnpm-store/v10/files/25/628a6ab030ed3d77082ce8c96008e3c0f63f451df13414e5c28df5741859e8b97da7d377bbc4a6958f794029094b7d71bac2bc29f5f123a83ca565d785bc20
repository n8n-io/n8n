import { InferSchema, lazySchema, zodSchema } from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

// https://platform.openai.com/docs/models
export type OpenAIChatModelId =
  | 'o1'
  | 'o1-2024-12-17'
  | 'o3-mini'
  | 'o3-mini-2025-01-31'
  | 'o3'
  | 'o3-2025-04-16'
  | 'o4-mini'
  | 'o4-mini-2025-04-16'
  | 'gpt-4.1'
  | 'gpt-4.1-2025-04-14'
  | 'gpt-4.1-mini'
  | 'gpt-4.1-mini-2025-04-14'
  | 'gpt-4.1-nano'
  | 'gpt-4.1-nano-2025-04-14'
  | 'gpt-4o'
  | 'gpt-4o-2024-05-13'
  | 'gpt-4o-2024-08-06'
  | 'gpt-4o-2024-11-20'
  | 'gpt-4o-audio-preview'
  | 'gpt-4o-audio-preview-2024-12-17'
  | 'gpt-4o-audio-preview-2025-06-03'
  | 'gpt-4o-mini'
  | 'gpt-4o-mini-2024-07-18'
  | 'gpt-4o-mini-audio-preview'
  | 'gpt-4o-mini-audio-preview-2024-12-17'
  | 'gpt-4o-search-preview'
  | 'gpt-4o-search-preview-2025-03-11'
  | 'gpt-4o-mini-search-preview'
  | 'gpt-4o-mini-search-preview-2025-03-11'
  | 'gpt-3.5-turbo-0125'
  | 'gpt-3.5-turbo'
  | 'gpt-3.5-turbo-1106'
  | 'gpt-3.5-turbo-16k'
  | 'gpt-5'
  | 'gpt-5-2025-08-07'
  | 'gpt-5-mini'
  | 'gpt-5-mini-2025-08-07'
  | 'gpt-5-nano'
  | 'gpt-5-nano-2025-08-07'
  | 'gpt-5-chat-latest'
  | 'gpt-5.1'
  | 'gpt-5.1-2025-11-13'
  | 'gpt-5.1-chat-latest'
  | 'gpt-5.2'
  | 'gpt-5.2-2025-12-11'
  | 'gpt-5.2-chat-latest'
  | 'gpt-5.2-pro'
  | 'gpt-5.2-pro-2025-12-11'
  | 'gpt-5.3-chat-latest'
  | 'gpt-5.4'
  | 'gpt-5.4-2026-03-05'
  | 'gpt-5.4-mini'
  | 'gpt-5.4-mini-2026-03-17'
  | 'gpt-5.4-nano'
  | 'gpt-5.4-nano-2026-03-17'
  | 'gpt-5.4-pro'
  | 'gpt-5.4-pro-2026-03-05'
  | (string & {});

export const openaiLanguageModelChatOptions = lazySchema(() =>
  zodSchema(
    z.object({
      /**
       * Modify the likelihood of specified tokens appearing in the completion.
       *
       * Accepts a JSON object that maps tokens (specified by their token ID in
       * the GPT tokenizer) to an associated bias value from -100 to 100.
       */
      logitBias: z.record(z.coerce.number<string>(), z.number()).optional(),

      /**
       * Return the log probabilities of the tokens.
       *
       * Setting to true will return the log probabilities of the tokens that
       * were generated.
       *
       * Setting to a number will return the log probabilities of the top n
       * tokens that were generated.
       */
      logprobs: z.union([z.boolean(), z.number()]).optional(),

      /**
       * Whether to enable parallel function calling during tool use. Default to true.
       */
      parallelToolCalls: z.boolean().optional(),

      /**
       * A unique identifier representing your end-user, which can help OpenAI to
       * monitor and detect abuse.
       */
      user: z.string().optional(),

      /**
       * Reasoning effort for reasoning models. Defaults to `medium`.
       */
      reasoningEffort: z
        .enum(['none', 'minimal', 'low', 'medium', 'high', 'xhigh'])
        .optional(),

      /**
       * Maximum number of completion tokens to generate. Useful for reasoning models.
       */
      maxCompletionTokens: z.number().optional(),

      /**
       * Whether to enable persistence in responses API.
       */
      store: z.boolean().optional(),

      /**
       * Metadata to associate with the request.
       */
      metadata: z.record(z.string().max(64), z.string().max(512)).optional(),

      /**
       * Parameters for prediction mode.
       */
      prediction: z.record(z.string(), z.any()).optional(),

      /**
       * Service tier for the request.
       * - 'auto': Default service tier. The request will be processed with the service tier configured in the
       *           Project settings. Unless otherwise configured, the Project will use 'default'.
       * - 'flex': 50% cheaper processing at the cost of increased latency. Only available for o3 and o4-mini models.
       * - 'priority': Higher-speed processing with predictably low latency at premium cost. Available for Enterprise customers.
       * - 'default': The request will be processed with the standard pricing and performance for the selected model.
       *
       * @default 'auto'
       */
      serviceTier: z.enum(['auto', 'flex', 'priority', 'default']).optional(),

      /**
       * Whether to use strict JSON schema validation.
       *
       * @default true
       */
      strictJsonSchema: z.boolean().optional(),

      /**
       * Controls the verbosity of the model's responses.
       * Lower values will result in more concise responses, while higher values will result in more verbose responses.
       */
      textVerbosity: z.enum(['low', 'medium', 'high']).optional(),

      /**
       * A cache key for prompt caching. Allows manual control over prompt caching behavior.
       * Useful for improving cache hit rates and working around automatic caching issues.
       */
      promptCacheKey: z.string().optional(),

      /**
       * The retention policy for the prompt cache.
       * - 'in_memory': Default. Standard prompt caching behavior.
       * - '24h': Extended prompt caching that keeps cached prefixes active for up to 24 hours.
       *          Currently only available for 5.1 series models.
       *
       * @default 'in_memory'
       */
      promptCacheRetention: z.enum(['in_memory', '24h']).optional(),

      /**
       * A stable identifier used to help detect users of your application
       * that may be violating OpenAI's usage policies. The IDs should be a
       * string that uniquely identifies each user. We recommend hashing their
       * username or email address, in order to avoid sending us any identifying
       * information.
       */
      safetyIdentifier: z.string().optional(),

      /**
       * Override the system message mode for this model.
       * - 'system': Use the 'system' role for system messages (default for most models)
       * - 'developer': Use the 'developer' role for system messages (used by reasoning models)
       * - 'remove': Remove system messages entirely
       *
       * If not specified, the mode is automatically determined based on the model.
       */
      systemMessageMode: z.enum(['system', 'developer', 'remove']).optional(),

      /**
       * Force treating this model as a reasoning model.
       *
       * This is useful for "stealth" reasoning models (e.g. via a custom baseURL)
       * where the model ID is not recognized by the SDK's allowlist.
       *
       * When enabled, the SDK applies reasoning-model parameter compatibility rules
       * and defaults `systemMessageMode` to `developer` unless overridden.
       */
      forceReasoning: z.boolean().optional(),
    }),
  ),
);

export type OpenAILanguageModelChatOptions = InferSchema<
  typeof openaiLanguageModelChatOptions
>;
