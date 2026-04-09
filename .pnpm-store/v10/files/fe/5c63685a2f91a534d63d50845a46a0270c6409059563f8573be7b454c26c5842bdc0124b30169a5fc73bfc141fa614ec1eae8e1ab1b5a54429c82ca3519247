import { InferSchema, lazySchema, zodSchema } from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

/**
 * `top_logprobs` request body argument can be set to an integer between
 * 0 and 20 specifying the number of most likely tokens to return at each
 * token position, each with an associated log probability.
 *
 * @see https://platform.openai.com/docs/api-reference/responses/create#responses_create-top_logprobs
 */
export const TOP_LOGPROBS_MAX = 20;

export const openaiResponsesReasoningModelIds = [
  'o1',
  'o1-2024-12-17',
  'o3',
  'o3-2025-04-16',
  'o3-mini',
  'o3-mini-2025-01-31',
  'o4-mini',
  'o4-mini-2025-04-16',
  'gpt-5',
  'gpt-5-2025-08-07',
  'gpt-5-codex',
  'gpt-5-mini',
  'gpt-5-mini-2025-08-07',
  'gpt-5-nano',
  'gpt-5-nano-2025-08-07',
  'gpt-5-pro',
  'gpt-5-pro-2025-10-06',
  'gpt-5.1',
  'gpt-5.1-chat-latest',
  'gpt-5.1-codex-mini',
  'gpt-5.1-codex',
  'gpt-5.1-codex-max',
  'gpt-5.2',
  'gpt-5.2-chat-latest',
  'gpt-5.2-pro',
  'gpt-5.2-codex',
  'gpt-5.3-chat-latest',
  'gpt-5.3-codex',
  'gpt-5.4',
  'gpt-5.4-2026-03-05',
  'gpt-5.4-mini',
  'gpt-5.4-mini-2026-03-17',
  'gpt-5.4-nano',
  'gpt-5.4-nano-2026-03-17',
  'gpt-5.4-pro',
  'gpt-5.4-pro-2026-03-05',
] as const;

export const openaiResponsesModelIds = [
  'gpt-4.1',
  'gpt-4.1-2025-04-14',
  'gpt-4.1-mini',
  'gpt-4.1-mini-2025-04-14',
  'gpt-4.1-nano',
  'gpt-4.1-nano-2025-04-14',
  'gpt-4o',
  'gpt-4o-2024-05-13',
  'gpt-4o-2024-08-06',
  'gpt-4o-2024-11-20',
  'gpt-4o-audio-preview',
  'gpt-4o-audio-preview-2024-12-17',
  'gpt-4o-search-preview',
  'gpt-4o-search-preview-2025-03-11',
  'gpt-4o-mini-search-preview',
  'gpt-4o-mini-search-preview-2025-03-11',
  'gpt-4o-mini',
  'gpt-4o-mini-2024-07-18',
  'gpt-3.5-turbo-0125',
  'gpt-3.5-turbo',
  'gpt-3.5-turbo-1106',
  'gpt-5-chat-latest',
  ...openaiResponsesReasoningModelIds,
] as const;

export type OpenAIResponsesModelId =
  | 'gpt-3.5-turbo-0125'
  | 'gpt-3.5-turbo-1106'
  | 'gpt-3.5-turbo'
  | 'gpt-4.1-2025-04-14'
  | 'gpt-4.1-mini-2025-04-14'
  | 'gpt-4.1-mini'
  | 'gpt-4.1-nano-2025-04-14'
  | 'gpt-4.1-nano'
  | 'gpt-4.1'
  | 'gpt-4o-2024-05-13'
  | 'gpt-4o-2024-08-06'
  | 'gpt-4o-2024-11-20'
  | 'gpt-4o-mini-2024-07-18'
  | 'gpt-4o-mini'
  | 'gpt-4o'
  | 'gpt-5.1'
  | 'gpt-5.1-2025-11-13'
  | 'gpt-5.1-chat-latest'
  | 'gpt-5.1-codex-mini'
  | 'gpt-5.1-codex'
  | 'gpt-5.1-codex-max'
  | 'gpt-5.2'
  | 'gpt-5.2-2025-12-11'
  | 'gpt-5.2-chat-latest'
  | 'gpt-5.2-pro'
  | 'gpt-5.2-pro-2025-12-11'
  | 'gpt-5.2-codex'
  | 'gpt-5.3-chat-latest'
  | 'gpt-5.3-codex'
  | 'gpt-5.4'
  | 'gpt-5.4-2026-03-05'
  | 'gpt-5.4-mini'
  | 'gpt-5.4-mini-2026-03-17'
  | 'gpt-5.4-nano'
  | 'gpt-5.4-nano-2026-03-17'
  | 'gpt-5.4-pro'
  | 'gpt-5.4-pro-2026-03-05'
  | 'gpt-5-2025-08-07'
  | 'gpt-5-chat-latest'
  | 'gpt-5-codex'
  | 'gpt-5-mini-2025-08-07'
  | 'gpt-5-mini'
  | 'gpt-5-nano-2025-08-07'
  | 'gpt-5-nano'
  | 'gpt-5-pro-2025-10-06'
  | 'gpt-5-pro'
  | 'gpt-5'
  | 'o1-2024-12-17'
  | 'o1'
  | 'o3-2025-04-16'
  | 'o3-mini-2025-01-31'
  | 'o3-mini'
  | 'o3'
  | 'o4-mini'
  | 'o4-mini-2025-04-16'
  | (string & {});

// TODO AI SDK 6: use optional here instead of nullish
export const openaiLanguageModelResponsesOptionsSchema = lazySchema(() =>
  zodSchema(
    z.object({
      /**
       * The ID of the OpenAI Conversation to continue.
       * You must create a conversation first via the OpenAI API.
       * Cannot be used in conjunction with `previousResponseId`.
       * Defaults to `undefined`.
       * @see https://platform.openai.com/docs/api-reference/conversations/create
       */
      conversation: z.string().nullish(),

      /**
       * The set of extra fields to include in the response (advanced, usually not needed).
       * Example values: 'reasoning.encrypted_content', 'file_search_call.results', 'message.output_text.logprobs'.
       */
      include: z
        .array(
          z.enum([
            'reasoning.encrypted_content', // handled internally by default, only needed for unknown reasoning models
            'file_search_call.results',
            'message.output_text.logprobs',
          ]),
        )
        .nullish(),

      /**
       * Instructions for the model.
       * They can be used to change the system or developer message when continuing a conversation using the `previousResponseId` option.
       * Defaults to `undefined`.
       */
      instructions: z.string().nullish(),

      /**
       * Return the log probabilities of the tokens. Including logprobs will increase
       * the response size and can slow down response times. However, it can
       * be useful to better understand how the model is behaving.
       *
       * Setting to true will return the log probabilities of the tokens that
       * were generated.
       *
       * Setting to a number will return the log probabilities of the top n
       * tokens that were generated.
       *
       * @see https://platform.openai.com/docs/api-reference/responses/create
       * @see https://cookbook.openai.com/examples/using_logprobs
       */
      logprobs: z
        .union([z.boolean(), z.number().min(1).max(TOP_LOGPROBS_MAX)])
        .optional(),

      /**
       * The maximum number of total calls to built-in tools that can be processed in a response.
       * This maximum number applies across all built-in tool calls, not per individual tool.
       * Any further attempts to call a tool by the model will be ignored.
       */
      maxToolCalls: z.number().nullish(),

      /**
       * Additional metadata to store with the generation.
       */
      metadata: z.any().nullish(),

      /**
       * Whether to use parallel tool calls. Defaults to `true`.
       */
      parallelToolCalls: z.boolean().nullish(),

      /**
       * The ID of the previous response. You can use it to continue a conversation.
       * Defaults to `undefined`.
       */
      previousResponseId: z.string().nullish(),

      /**
       * Sets a cache key to tie this prompt to cached prefixes for better caching performance.
       */
      promptCacheKey: z.string().nullish(),

      /**
       * The retention policy for the prompt cache.
       * - 'in_memory': Default. Standard prompt caching behavior.
       * - '24h': Extended prompt caching that keeps cached prefixes active for up to 24 hours.
       *          Currently only available for 5.1 series models.
       *
       * @default 'in_memory'
       */
      promptCacheRetention: z.enum(['in_memory', '24h']).nullish(),

      /**
       * Reasoning effort for reasoning models. Defaults to `medium`. If you use
       * `providerOptions` to set the `reasoningEffort` option, this model setting will be ignored.
       * Valid values: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'
       *
       * The 'none' type for `reasoningEffort` is only available for OpenAI's GPT-5.1
       * models. Also, the 'xhigh' type for `reasoningEffort` is only available for
       * OpenAI's GPT-5.1-Codex-Max model. Setting `reasoningEffort` to 'none' or 'xhigh' with unsupported models will result in
       * an error.
       */
      reasoningEffort: z.string().nullish(),

      /**
       * Controls reasoning summary output from the model.
       * Set to "auto" to automatically receive the richest level available,
       * or "detailed" for comprehensive summaries.
       */
      reasoningSummary: z.string().nullish(),

      /**
       * The identifier for safety monitoring and tracking.
       */
      safetyIdentifier: z.string().nullish(),

      /**
       * Service tier for the request.
       * Set to 'flex' for 50% cheaper processing at the cost of increased latency (available for o3, o4-mini, and gpt-5 models).
       * Set to 'priority' for faster processing with Enterprise access (available for gpt-4, gpt-5, gpt-5-mini, o3, o4-mini; gpt-5-nano is not supported).
       *
       * Defaults to 'auto'.
       */
      serviceTier: z.enum(['auto', 'flex', 'priority', 'default']).nullish(),

      /**
       * Whether to store the generation. Defaults to `true`.
       */
      store: z.boolean().nullish(),

      /**
       * Whether to use strict JSON schema validation.
       * Defaults to `true`.
       */
      strictJsonSchema: z.boolean().nullish(),

      /**
       * Controls the verbosity of the model's responses. Lower values ('low') will result
       * in more concise responses, while higher values ('high') will result in more verbose responses.
       * Valid values: 'low', 'medium', 'high'.
       */
      textVerbosity: z.enum(['low', 'medium', 'high']).nullish(),

      /**
       * Controls output truncation. 'auto' (default) performs truncation automatically;
       * 'disabled' turns truncation off.
       */
      truncation: z.enum(['auto', 'disabled']).nullish(),

      /**
       * A unique identifier representing your end-user, which can help OpenAI to
       * monitor and detect abuse.
       * Defaults to `undefined`.
       * @see https://platform.openai.com/docs/guides/safety-best-practices/end-user-ids
       */
      user: z.string().nullish(),

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

export type OpenAILanguageModelResponsesOptions = InferSchema<
  typeof openaiLanguageModelResponsesOptionsSchema
>;
