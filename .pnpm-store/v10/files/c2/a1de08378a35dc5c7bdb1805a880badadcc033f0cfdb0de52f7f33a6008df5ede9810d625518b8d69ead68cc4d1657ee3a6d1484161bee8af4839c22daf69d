import { z } from 'zod/v4';

// https://docs.claude.com/en/docs/about-claude/models/overview
export type AnthropicMessagesModelId =
  | 'claude-3-haiku-20240307'
  | 'claude-haiku-4-5-20251001'
  | 'claude-haiku-4-5'
  | 'claude-opus-4-0'
  | 'claude-opus-4-20250514'
  | 'claude-opus-4-1-20250805'
  | 'claude-opus-4-1'
  | 'claude-opus-4-5'
  | 'claude-opus-4-5-20251101'
  | 'claude-sonnet-4-0'
  | 'claude-sonnet-4-20250514'
  | 'claude-sonnet-4-5-20250929'
  | 'claude-sonnet-4-5'
  | 'claude-sonnet-4-6'
  | 'claude-opus-4-6'
  | (string & {});

/**
 * Anthropic file part provider options for document-specific features.
 * These options apply to individual file parts (documents).
 */
export const anthropicFilePartProviderOptions = z.object({
  /**
   * Citation configuration for this document.
   * When enabled, this document will generate citations in the response.
   */
  citations: z
    .object({
      /**
       * Enable citations for this document
       */
      enabled: z.boolean(),
    })
    .optional(),

  /**
   * Custom title for the document.
   * If not provided, the filename will be used.
   */
  title: z.string().optional(),

  /**
   * Context about the document that will be passed to the model
   * but not used towards cited content.
   * Useful for storing document metadata as text or stringified JSON.
   */
  context: z.string().optional(),
});

export type AnthropicFilePartProviderOptions = z.infer<
  typeof anthropicFilePartProviderOptions
>;

export const anthropicLanguageModelOptions = z.object({
  /**
   * Whether to send reasoning to the model.
   *
   * This allows you to deactivate reasoning inputs for models that do not support them.
   */
  sendReasoning: z.boolean().optional(),

  /**
   * Determines how structured outputs are generated.
   *
   * - `outputFormat`: Use the `output_config.format` parameter to specify the structured output format.
   * - `jsonTool`: Use a special 'json' tool to specify the structured output format.
   * - `auto`: Use 'outputFormat' when supported, otherwise use 'jsonTool' (default).
   */
  structuredOutputMode: z.enum(['outputFormat', 'jsonTool', 'auto']).optional(),

  /**
   * Configuration for enabling Claude's extended thinking.
   *
   * When enabled, responses include thinking content blocks showing Claude's thinking process before the final answer.
   * Requires a minimum budget of 1,024 tokens and counts towards the `max_tokens` limit.
   */
  thinking: z
    .discriminatedUnion('type', [
      z.object({
        /** for Sonnet 4.6, Opus 4.6, and newer models */
        type: z.literal('adaptive'),
      }),
      z.object({
        /** for models before Opus 4.6, except Sonnet 4.6 still supports it */
        type: z.literal('enabled'),
        budgetTokens: z.number().optional(),
      }),
      z.object({
        type: z.literal('disabled'),
      }),
    ])
    .optional(),

  /**
   * Whether to disable parallel function calling during tool use. Default is false.
   * When set to true, Claude will use at most one tool per response.
   */
  disableParallelToolUse: z.boolean().optional(),

  /**
   * Cache control settings for this message.
   * See https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
   */
  cacheControl: z
    .object({
      type: z.literal('ephemeral'),
      ttl: z.union([z.literal('5m'), z.literal('1h')]).optional(),
    })
    .optional(),

  /**
   * Metadata to include with the request.
   *
   * See https://platform.claude.com/docs/en/api/messages/create for details.
   */
  metadata: z
    .object({
      /**
       * An external identifier for the user associated with the request.
       *
       * Should be a UUID, hash value, or other opaque identifier.
       * Must not contain PII (name, email, phone number, etc.).
       */
      userId: z.string().optional(),
    })
    .optional(),

  /**
   * MCP servers to be utilized in this request.
   */
  mcpServers: z
    .array(
      z.object({
        type: z.literal('url'),
        name: z.string(),
        url: z.string(),
        authorizationToken: z.string().nullish(),
        toolConfiguration: z
          .object({
            enabled: z.boolean().nullish(),
            allowedTools: z.array(z.string()).nullish(),
          })
          .nullish(),
      }),
    )
    .optional(),

  /**
   * Agent Skills configuration. Skills enable Claude to perform specialized tasks
   * like document processing (PPTX, DOCX, PDF, XLSX) and data analysis.
   * Requires code execution tool to be enabled.
   */
  container: z
    .object({
      id: z.string().optional(),
      skills: z
        .array(
          z.object({
            type: z.union([z.literal('anthropic'), z.literal('custom')]),
            skillId: z.string(),
            version: z.string().optional(),
          }),
        )
        .optional(),
    })
    .optional(),

  /**
   * Whether to enable tool streaming (and structured output streaming).
   *
   * When set to false, the model will return all tool calls and results
   * at once after a delay.
   *
   * @default true
   */
  toolStreaming: z.boolean().optional(),

  /**
   * @default 'high'
   */
  effort: z.enum(['low', 'medium', 'high', 'max']).optional(),

  /**
   * Enable fast mode for faster inference (2.5x faster output token speeds).
   * Only supported with claude-opus-4-6.
   */
  speed: z.enum(['fast', 'standard']).optional(),

  /**
   * A set of beta features to enable.
   * Allow a provider to receive the full `betas` set if it needs it.
   */
  anthropicBeta: z.array(z.string()).optional(),

  contextManagement: z
    .object({
      edits: z.array(
        z.discriminatedUnion('type', [
          z.object({
            type: z.literal('clear_tool_uses_20250919'),
            trigger: z
              .discriminatedUnion('type', [
                z.object({
                  type: z.literal('input_tokens'),
                  value: z.number(),
                }),
                z.object({
                  type: z.literal('tool_uses'),
                  value: z.number(),
                }),
              ])
              .optional(),
            keep: z
              .object({
                type: z.literal('tool_uses'),
                value: z.number(),
              })
              .optional(),
            clearAtLeast: z
              .object({
                type: z.literal('input_tokens'),
                value: z.number(),
              })
              .optional(),
            clearToolInputs: z.boolean().optional(),
            excludeTools: z.array(z.string()).optional(),
          }),
          z.object({
            type: z.literal('clear_thinking_20251015'),
            keep: z
              .union([
                z.literal('all'),
                z.object({
                  type: z.literal('thinking_turns'),
                  value: z.number(),
                }),
              ])
              .optional(),
          }),
          z.object({
            type: z.literal('compact_20260112'),
            trigger: z
              .object({
                type: z.literal('input_tokens'),
                value: z.number(),
              })
              .optional(),
            pauseAfterCompaction: z.boolean().optional(),
            instructions: z.string().optional(),
          }),
        ]),
      ),
    })
    .optional(),
});

export type AnthropicLanguageModelOptions = z.infer<
  typeof anthropicLanguageModelOptions
>;
