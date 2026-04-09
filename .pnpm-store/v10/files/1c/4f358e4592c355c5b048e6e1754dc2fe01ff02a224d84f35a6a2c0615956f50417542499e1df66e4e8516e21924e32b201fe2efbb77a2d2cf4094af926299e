import { JSONSchema7 } from '@ai-sdk/provider';
import { InferSchema, lazySchema, zodSchema } from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

export type AnthropicMessagesPrompt = {
  system: Array<AnthropicTextContent> | undefined;
  messages: AnthropicMessage[];
};

export type AnthropicMessage = AnthropicUserMessage | AnthropicAssistantMessage;

export type AnthropicCacheControl = {
  type: 'ephemeral';
  ttl?: '5m' | '1h';
};

export interface AnthropicUserMessage {
  role: 'user';
  content: Array<
    | AnthropicTextContent
    | AnthropicImageContent
    | AnthropicDocumentContent
    | AnthropicToolResultContent
  >;
}

export interface AnthropicAssistantMessage {
  role: 'assistant';
  content: Array<
    | AnthropicTextContent
    | AnthropicThinkingContent
    | AnthropicRedactedThinkingContent
    | AnthropicToolCallContent
    | AnthropicServerToolUseContent
    | AnthropicCodeExecutionToolResultContent
    | AnthropicWebFetchToolResultContent
    | AnthropicWebSearchToolResultContent
    | AnthropicToolSearchToolResultContent
    | AnthropicBashCodeExecutionToolResultContent
    | AnthropicTextEditorCodeExecutionToolResultContent
    | AnthropicMcpToolUseContent
    | AnthropicMcpToolResultContent
    | AnthropicCompactionContent
  >;
}

export interface AnthropicCompactionContent {
  type: 'compaction';
  content: string;
  cache_control?: AnthropicCacheControl;
}

export interface AnthropicTextContent {
  type: 'text';
  text: string;
  cache_control: AnthropicCacheControl | undefined;
}

export interface AnthropicThinkingContent {
  type: 'thinking';
  thinking: string;
  signature: string;
  // Note: thinking blocks cannot be directly cached with cache_control.
  // They are cached implicitly when appearing in previous assistant turns.
  cache_control?: never;
}

export interface AnthropicRedactedThinkingContent {
  type: 'redacted_thinking';
  data: string;
  // Note: redacted thinking blocks cannot be directly cached with cache_control.
  // They are cached implicitly when appearing in previous assistant turns.
  cache_control?: never;
}

type AnthropicContentSource =
  | {
      type: 'base64';
      media_type: string;
      data: string;
    }
  | {
      type: 'url';
      url: string;
    }
  | {
      type: 'text';
      media_type: 'text/plain';
      data: string;
    };

export interface AnthropicImageContent {
  type: 'image';
  source: AnthropicContentSource;
  cache_control: AnthropicCacheControl | undefined;
}

export interface AnthropicDocumentContent {
  type: 'document';
  source: AnthropicContentSource;
  title?: string;
  context?: string;
  citations?: { enabled: boolean };
  cache_control: AnthropicCacheControl | undefined;
}

/**
 * The caller information for programmatic tool calling.
 * Present when a tool is called from within code execution.
 */
export type AnthropicToolCallCaller =
  | {
      type: 'code_execution_20250825';
      tool_id: string;
    }
  | {
      type: 'code_execution_20260120';
      tool_id: string;
    }
  | {
      type: 'direct';
    };

export interface AnthropicToolCallContent {
  type: 'tool_use';
  id: string;
  name: string;
  input: unknown;
  /**
   * Present when this tool call was triggered by a server-executed tool
   * (e.g., code execution calling a user-defined tool programmatically).
   */
  caller?: AnthropicToolCallCaller;
  cache_control: AnthropicCacheControl | undefined;
}

export interface AnthropicServerToolUseContent {
  type: 'server_tool_use';
  id: string;
  name:
    | 'web_fetch'
    | 'web_search'
    // code execution 20250522:
    | 'code_execution'
    // code execution 20250825:
    | 'bash_code_execution'
    | 'text_editor_code_execution'
    // tool search:
    | 'tool_search_tool_regex'
    | 'tool_search_tool_bm25';
  input: unknown;
  cache_control: AnthropicCacheControl | undefined;
}

// Nested content types for tool results (without cache_control)
// Sub-content blocks cannot be cached directly according to Anthropic docs
type AnthropicNestedTextContent = Omit<
  AnthropicTextContent,
  'cache_control'
> & {
  cache_control?: never;
};

type AnthropicNestedImageContent = Omit<
  AnthropicImageContent,
  'cache_control'
> & {
  cache_control?: never;
};

type AnthropicNestedDocumentContent = Omit<
  AnthropicDocumentContent,
  'cache_control'
> & {
  cache_control?: never;
};

export interface AnthropicToolReferenceContent {
  type: 'tool_reference';
  tool_name: string;
}

export interface AnthropicToolResultContent {
  type: 'tool_result';
  tool_use_id: string;
  content:
    | string
    | Array<
        | AnthropicNestedTextContent
        | AnthropicNestedImageContent
        | AnthropicNestedDocumentContent
        | AnthropicToolReferenceContent
      >;
  is_error: boolean | undefined;
  cache_control: AnthropicCacheControl | undefined;
}

export interface AnthropicWebSearchToolResultContent {
  type: 'web_search_tool_result';
  tool_use_id: string;
  content: Array<{
    url: string;
    title: string | null;
    page_age: string | null;
    encrypted_content: string;
    type: string;
  }>;
  cache_control: AnthropicCacheControl | undefined;
}

export interface AnthropicToolSearchToolResultContent {
  type: 'tool_search_tool_result';
  tool_use_id: string;
  content:
    | {
        type: 'tool_search_tool_search_result';
        tool_references: Array<{
          type: 'tool_reference';
          tool_name: string;
        }>;
      }
    | {
        type: 'tool_search_tool_result_error';
        error_code: string;
      };
  cache_control: AnthropicCacheControl | undefined;
}

// code execution results for code_execution_20250522 tool:
export interface AnthropicCodeExecutionToolResultContent {
  type: 'code_execution_tool_result';
  tool_use_id: string;
  content:
    | {
        type: 'code_execution_result';
        stdout: string;
        stderr: string;
        return_code: number;
        content: Array<{ type: 'code_execution_output'; file_id: string }>;
      }
    | {
        type: 'encrypted_code_execution_result';
        encrypted_stdout: string;
        stderr: string;
        return_code: number;
        content: Array<{ type: 'code_execution_output'; file_id: string }>;
      }
    | {
        type: 'code_execution_tool_result_error';
        error_code: string;
      };
  cache_control: AnthropicCacheControl | undefined;
}

// text editor code execution results for code_execution_20250825 tool:
export interface AnthropicTextEditorCodeExecutionToolResultContent {
  type: 'text_editor_code_execution_tool_result';
  tool_use_id: string;
  content:
    | {
        type: 'text_editor_code_execution_tool_result_error';
        error_code: string;
      }
    | {
        type: 'text_editor_code_execution_create_result';
        is_file_update: boolean;
      }
    | {
        type: 'text_editor_code_execution_view_result';
        content: string;
        file_type: string;
        num_lines: number | null;
        start_line: number | null;
        total_lines: number | null;
      }
    | {
        type: 'text_editor_code_execution_str_replace_result';
        lines: string[] | null;
        new_lines: number | null;
        new_start: number | null;
        old_lines: number | null;
        old_start: number | null;
      };
  cache_control: AnthropicCacheControl | undefined;
}

// bash code execution results for code_execution_20250825 tool:
export interface AnthropicBashCodeExecutionToolResultContent {
  type: 'bash_code_execution_tool_result';
  tool_use_id: string;
  content:
    | {
        type: 'bash_code_execution_result';
        stdout: string;
        stderr: string;
        return_code: number;
        content: {
          type: 'bash_code_execution_output';
          file_id: string;
        }[];
      }
    | {
        type: 'bash_code_execution_tool_result_error';
        error_code: string;
      };
  cache_control: AnthropicCacheControl | undefined;
}

export interface AnthropicWebFetchToolResultContent {
  type: 'web_fetch_tool_result';
  tool_use_id: string;
  content:
    | {
        type: 'web_fetch_result';
        url: string;
        retrieved_at: string | null;
        content: {
          type: 'document';
          title: string | null;
          citations?: { enabled: boolean };
          source:
            | { type: 'base64'; media_type: 'application/pdf'; data: string }
            | { type: 'text'; media_type: 'text/plain'; data: string };
        };
      }
    | {
        type: 'web_fetch_tool_result_error';
        error_code: string;
      };
  cache_control: AnthropicCacheControl | undefined;
}
export interface AnthropicMcpToolUseContent {
  type: 'mcp_tool_use';
  id: string;
  name: string;
  server_name: string;
  input: unknown;
  cache_control: AnthropicCacheControl | undefined;
}

export interface AnthropicMcpToolResultContent {
  type: 'mcp_tool_result';
  tool_use_id: string;
  is_error: boolean;
  content: string | Array<{ type: 'text'; text: string }>;
  cache_control: AnthropicCacheControl | undefined;
}

export type AnthropicTool =
  | {
      name: string;
      description: string | undefined;
      input_schema: JSONSchema7;
      cache_control: AnthropicCacheControl | undefined;
      eager_input_streaming?: boolean;
      strict?: boolean;
      /**
       * When true, this tool is deferred and will only be loaded when
       * discovered via the tool search tool.
       */
      defer_loading?: boolean;
      /**
       * Programmatic tool calling: specifies which server-executed tools
       * are allowed to call this tool. When set, only the specified callers
       * can invoke this tool programmatically.
       *
       * @example ['code_execution_20250825']
       */
      allowed_callers?: Array<
        'direct' | 'code_execution_20250825' | 'code_execution_20260120'
      >;
    }
  | {
      type: 'code_execution_20250522';
      name: string;
      cache_control: AnthropicCacheControl | undefined;
    }
  | {
      type: 'code_execution_20250825';
      name: string;
    }
  | {
      type: 'code_execution_20260120';
      name: string;
    }
  | {
      name: string;
      type: 'computer_20250124' | 'computer_20241022';
      display_width_px: number;
      display_height_px: number;
      display_number: number;
      cache_control: AnthropicCacheControl | undefined;
    }
  | {
      name: string;
      type: 'computer_20251124';
      display_width_px: number;
      display_height_px: number;
      display_number: number;
      enable_zoom?: boolean;
      cache_control: AnthropicCacheControl | undefined;
    }
  | {
      name: string;
      type:
        | 'text_editor_20250124'
        | 'text_editor_20241022'
        | 'text_editor_20250429';
      cache_control: AnthropicCacheControl | undefined;
    }
  | {
      name: string;
      type: 'text_editor_20250728';
      max_characters?: number;
      cache_control: AnthropicCacheControl | undefined;
    }
  | {
      name: string;
      type: 'bash_20250124' | 'bash_20241022';
      cache_control: AnthropicCacheControl | undefined;
    }
  | {
      name: string;
      type: 'memory_20250818';
    }
  | {
      type: 'web_fetch_20250910' | 'web_fetch_20260209';
      name: string;
      max_uses?: number;
      allowed_domains?: string[];
      blocked_domains?: string[];
      citations?: { enabled: boolean };
      max_content_tokens?: number;
      cache_control: AnthropicCacheControl | undefined;
    }
  | {
      type: 'web_search_20250305' | 'web_search_20260209';
      name: string;
      max_uses?: number;
      allowed_domains?: string[];
      blocked_domains?: string[];
      user_location?: {
        type: 'approximate';
        city?: string;
        region?: string;
        country?: string;
        timezone?: string;
      };
      cache_control: AnthropicCacheControl | undefined;
    }
  | {
      type: 'tool_search_tool_regex_20251119';
      name: string;
    }
  | {
      type: 'tool_search_tool_bm25_20251119';
      name: string;
    };

export type AnthropicSpeed = 'fast' | 'standard';

export type AnthropicToolChoice =
  | { type: 'auto' | 'any'; disable_parallel_tool_use?: boolean }
  | { type: 'tool'; name: string; disable_parallel_tool_use?: boolean };

export type AnthropicContainer = {
  id?: string | null;
  skills?: Array<{
    type: 'anthropic' | 'custom';
    skill_id: string;
    version?: string;
  }> | null;
};

export type AnthropicInputTokensTrigger = {
  type: 'input_tokens';
  value: number;
};

export type AnthropicToolUsesTrigger = {
  type: 'tool_uses';
  value: number;
};

export type AnthropicContextManagementTrigger =
  | AnthropicInputTokensTrigger
  | AnthropicToolUsesTrigger;

export type AnthropicClearToolUsesEdit = {
  type: 'clear_tool_uses_20250919';
  trigger?: AnthropicContextManagementTrigger;
  keep?: {
    type: 'tool_uses';
    value: number;
  };
  clear_at_least?: {
    type: 'input_tokens';
    value: number;
  };
  clear_tool_inputs?: boolean;
  exclude_tools?: string[];
};

export type AnthropicClearThinkingBlockEdit = {
  type: 'clear_thinking_20251015';
  keep?: 'all' | { type: 'thinking_turns'; value: number };
};

export type AnthropicCompactEdit = {
  type: 'compact_20260112';
  trigger?: AnthropicInputTokensTrigger;
  pause_after_compaction?: boolean;
  instructions?: string;
};

export type AnthropicContextManagementEdit =
  | AnthropicClearToolUsesEdit
  | AnthropicClearThinkingBlockEdit
  | AnthropicCompactEdit;

export type AnthropicContextManagementConfig = {
  edits: AnthropicContextManagementEdit[];
};

export type AnthropicResponseClearToolUsesEdit = {
  type: 'clear_tool_uses_20250919';
  cleared_tool_uses: number;
  cleared_input_tokens: number;
};

export type AnthropicResponseClearThinkingBlockEdit = {
  type: 'clear_thinking_20251015';
  cleared_thinking_turns: number;
  cleared_input_tokens: number;
};

export type AnthropicResponseCompactEdit = {
  type: 'compact_20260112';
};

export type AnthropicResponseContextManagementEdit =
  | AnthropicResponseClearToolUsesEdit
  | AnthropicResponseClearThinkingBlockEdit
  | AnthropicResponseCompactEdit;

export type AnthropicResponseContextManagement = {
  applied_edits: AnthropicResponseContextManagementEdit[];
};

// limited version of the schema, focussed on what is needed for the implementation
// this approach limits breakages when the API changes and increases efficiency
export const anthropicMessagesResponseSchema = lazySchema(() =>
  zodSchema(
    z.object({
      type: z.literal('message'),
      id: z.string().nullish(),
      model: z.string().nullish(),
      content: z.array(
        z.discriminatedUnion('type', [
          z.object({
            type: z.literal('text'),
            text: z.string(),
            citations: z
              .array(
                z.discriminatedUnion('type', [
                  z.object({
                    type: z.literal('web_search_result_location'),
                    cited_text: z.string(),
                    url: z.string(),
                    title: z.string(),
                    encrypted_index: z.string(),
                  }),
                  z.object({
                    type: z.literal('page_location'),
                    cited_text: z.string(),
                    document_index: z.number(),
                    document_title: z.string().nullable(),
                    start_page_number: z.number(),
                    end_page_number: z.number(),
                  }),
                  z.object({
                    type: z.literal('char_location'),
                    cited_text: z.string(),
                    document_index: z.number(),
                    document_title: z.string().nullable(),
                    start_char_index: z.number(),
                    end_char_index: z.number(),
                  }),
                ]),
              )
              .optional(),
          }),
          z.object({
            type: z.literal('thinking'),
            thinking: z.string(),
            signature: z.string(),
          }),
          z.object({
            type: z.literal('redacted_thinking'),
            data: z.string(),
          }),
          z.object({
            type: z.literal('compaction'),
            content: z.string(),
          }),
          z.object({
            type: z.literal('tool_use'),
            id: z.string(),
            name: z.string(),
            input: z.unknown(),
            // Programmatic tool calling: caller info when triggered from code execution
            caller: z
              .union([
                z.object({
                  type: z.literal('code_execution_20250825'),
                  tool_id: z.string(),
                }),
                z.object({
                  type: z.literal('code_execution_20260120'),
                  tool_id: z.string(),
                }),
                z.object({
                  type: z.literal('direct'),
                }),
              ])
              .optional(),
          }),
          z.object({
            type: z.literal('server_tool_use'),
            id: z.string(),
            name: z.string(),
            input: z.record(z.string(), z.unknown()).nullish(),
            caller: z
              .union([
                z.object({
                  type: z.literal('code_execution_20260120'),
                  tool_id: z.string(),
                }),
                z.object({
                  type: z.literal('direct'),
                }),
              ])
              .optional(),
          }),
          z.object({
            type: z.literal('mcp_tool_use'),
            id: z.string(),
            name: z.string(),
            input: z.unknown(),
            server_name: z.string(),
          }),
          z.object({
            type: z.literal('mcp_tool_result'),
            tool_use_id: z.string(),
            is_error: z.boolean(),
            content: z.array(
              z.union([
                z.string(),
                z.object({ type: z.literal('text'), text: z.string() }),
              ]),
            ),
          }),
          z.object({
            type: z.literal('web_fetch_tool_result'),
            tool_use_id: z.string(),
            content: z.union([
              z.object({
                type: z.literal('web_fetch_result'),
                url: z.string(),
                retrieved_at: z.string(),
                content: z.object({
                  type: z.literal('document'),
                  title: z.string().nullable(),
                  citations: z.object({ enabled: z.boolean() }).optional(),
                  source: z.union([
                    z.object({
                      type: z.literal('base64'),
                      media_type: z.literal('application/pdf'),
                      data: z.string(),
                    }),
                    z.object({
                      type: z.literal('text'),
                      media_type: z.literal('text/plain'),
                      data: z.string(),
                    }),
                  ]),
                }),
              }),
              z.object({
                type: z.literal('web_fetch_tool_result_error'),
                error_code: z.string(),
              }),
            ]),
          }),
          z.object({
            type: z.literal('web_search_tool_result'),
            tool_use_id: z.string(),
            content: z.union([
              z.array(
                z.object({
                  type: z.literal('web_search_result'),
                  url: z.string(),
                  title: z.string(),
                  encrypted_content: z.string(),
                  page_age: z.string().nullish(),
                }),
              ),
              z.object({
                type: z.literal('web_search_tool_result_error'),
                error_code: z.string(),
              }),
            ]),
          }),
          // code execution results for code_execution_20250522 tool:
          z.object({
            type: z.literal('code_execution_tool_result'),
            tool_use_id: z.string(),
            content: z.union([
              z.object({
                type: z.literal('code_execution_result'),
                stdout: z.string(),
                stderr: z.string(),
                return_code: z.number(),
                content: z
                  .array(
                    z.object({
                      type: z.literal('code_execution_output'),
                      file_id: z.string(),
                    }),
                  )
                  .optional()
                  .default([]),
              }),
              z.object({
                type: z.literal('encrypted_code_execution_result'),
                encrypted_stdout: z.string(),
                stderr: z.string(),
                return_code: z.number(),
                content: z
                  .array(
                    z.object({
                      type: z.literal('code_execution_output'),
                      file_id: z.string(),
                    }),
                  )
                  .optional()
                  .default([]),
              }),
              z.object({
                type: z.literal('code_execution_tool_result_error'),
                error_code: z.string(),
              }),
            ]),
          }),
          // bash code execution results for code_execution_20250825 tool:
          z.object({
            type: z.literal('bash_code_execution_tool_result'),
            tool_use_id: z.string(),
            content: z.discriminatedUnion('type', [
              z.object({
                type: z.literal('bash_code_execution_result'),
                content: z.array(
                  z.object({
                    type: z.literal('bash_code_execution_output'),
                    file_id: z.string(),
                  }),
                ),
                stdout: z.string(),
                stderr: z.string(),
                return_code: z.number(),
              }),
              z.object({
                type: z.literal('bash_code_execution_tool_result_error'),
                error_code: z.string(),
              }),
            ]),
          }),
          // text editor code execution results for code_execution_20250825 tool:
          z.object({
            type: z.literal('text_editor_code_execution_tool_result'),
            tool_use_id: z.string(),
            content: z.discriminatedUnion('type', [
              z.object({
                type: z.literal('text_editor_code_execution_tool_result_error'),
                error_code: z.string(),
              }),
              z.object({
                type: z.literal('text_editor_code_execution_view_result'),
                content: z.string(),
                file_type: z.string(),
                num_lines: z.number().nullable(),
                start_line: z.number().nullable(),
                total_lines: z.number().nullable(),
              }),
              z.object({
                type: z.literal('text_editor_code_execution_create_result'),
                is_file_update: z.boolean(),
              }),
              z.object({
                type: z.literal(
                  'text_editor_code_execution_str_replace_result',
                ),
                lines: z.array(z.string()).nullable(),
                new_lines: z.number().nullable(),
                new_start: z.number().nullable(),
                old_lines: z.number().nullable(),
                old_start: z.number().nullable(),
              }),
            ]),
          }),
          // tool search tool results for tool_search_tool_regex_20251119 and tool_search_tool_bm25_20251119:
          z.object({
            type: z.literal('tool_search_tool_result'),
            tool_use_id: z.string(),
            content: z.union([
              z.object({
                type: z.literal('tool_search_tool_search_result'),
                tool_references: z.array(
                  z.object({
                    type: z.literal('tool_reference'),
                    tool_name: z.string(),
                  }),
                ),
              }),
              z.object({
                type: z.literal('tool_search_tool_result_error'),
                error_code: z.string(),
              }),
            ]),
          }),
        ]),
      ),
      stop_reason: z.string().nullish(),
      stop_sequence: z.string().nullish(),
      usage: z.looseObject({
        input_tokens: z.number(),
        output_tokens: z.number(),
        cache_creation_input_tokens: z.number().nullish(),
        cache_read_input_tokens: z.number().nullish(),
        iterations: z
          .array(
            z.object({
              type: z.union([z.literal('compaction'), z.literal('message')]),
              input_tokens: z.number(),
              output_tokens: z.number(),
            }),
          )
          .nullish(),
      }),
      container: z
        .object({
          expires_at: z.string(),
          id: z.string(),
          skills: z
            .array(
              z.object({
                type: z.union([z.literal('anthropic'), z.literal('custom')]),
                skill_id: z.string(),
                version: z.string(),
              }),
            )
            .nullish(),
        })
        .nullish(),
      context_management: z
        .object({
          applied_edits: z.array(
            z.union([
              z.object({
                type: z.literal('clear_tool_uses_20250919'),
                cleared_tool_uses: z.number(),
                cleared_input_tokens: z.number(),
              }),
              z.object({
                type: z.literal('clear_thinking_20251015'),
                cleared_thinking_turns: z.number(),
                cleared_input_tokens: z.number(),
              }),
              z.object({
                type: z.literal('compact_20260112'),
              }),
            ]),
          ),
        })
        .nullish(),
    }),
  ),
);

// limited version of the schema, focused on what is needed for the implementation
// this approach limits breakages when the API changes and increases efficiency
export const anthropicMessagesChunkSchema = lazySchema(() =>
  zodSchema(
    z.discriminatedUnion('type', [
      z.object({
        type: z.literal('message_start'),
        message: z.object({
          id: z.string().nullish(),
          model: z.string().nullish(),
          role: z.string().nullish(),
          usage: z.looseObject({
            input_tokens: z.number(),
            cache_creation_input_tokens: z.number().nullish(),
            cache_read_input_tokens: z.number().nullish(),
          }),
          // Programmatic tool calling: content may be pre-populated for deferred tool calls
          content: z
            .array(
              z.discriminatedUnion('type', [
                z.object({
                  type: z.literal('tool_use'),
                  id: z.string(),
                  name: z.string(),
                  input: z.unknown(),
                  caller: z
                    .union([
                      z.object({
                        type: z.literal('code_execution_20250825'),
                        tool_id: z.string(),
                      }),
                      z.object({
                        type: z.literal('code_execution_20260120'),
                        tool_id: z.string(),
                      }),
                      z.object({
                        type: z.literal('direct'),
                      }),
                    ])
                    .optional(),
                }),
              ]),
            )
            .nullish(),
          stop_reason: z.string().nullish(),
          container: z
            .object({
              expires_at: z.string(),
              id: z.string(),
            })
            .nullish(),
        }),
      }),
      z.object({
        type: z.literal('content_block_start'),
        index: z.number(),
        content_block: z.discriminatedUnion('type', [
          z.object({
            type: z.literal('text'),
            text: z.string(),
          }),
          z.object({
            type: z.literal('thinking'),
            thinking: z.string(),
          }),
          z.object({
            type: z.literal('tool_use'),
            id: z.string(),
            name: z.string(),
            // Programmatic tool calling: input may be present directly for deferred tool calls
            input: z.record(z.string(), z.unknown()).optional(),
            // Programmatic tool calling: caller info when triggered from code execution
            caller: z
              .union([
                z.object({
                  type: z.literal('code_execution_20250825'),
                  tool_id: z.string(),
                }),
                z.object({
                  type: z.literal('code_execution_20260120'),
                  tool_id: z.string(),
                }),
                z.object({
                  type: z.literal('direct'),
                }),
              ])
              .optional(),
          }),
          z.object({
            type: z.literal('redacted_thinking'),
            data: z.string(),
          }),
          z.object({
            type: z.literal('compaction'),
            content: z.string().nullish(),
          }),
          z.object({
            type: z.literal('server_tool_use'),
            id: z.string(),
            name: z.string(),
            input: z.record(z.string(), z.unknown()).nullish(),
            caller: z
              .union([
                z.object({
                  type: z.literal('code_execution_20260120'),
                  tool_id: z.string(),
                }),
                z.object({
                  type: z.literal('direct'),
                }),
              ])
              .optional(),
          }),
          z.object({
            type: z.literal('mcp_tool_use'),
            id: z.string(),
            name: z.string(),
            input: z.unknown(),
            server_name: z.string(),
          }),
          z.object({
            type: z.literal('mcp_tool_result'),
            tool_use_id: z.string(),
            is_error: z.boolean(),
            content: z.array(
              z.union([
                z.string(),
                z.object({ type: z.literal('text'), text: z.string() }),
              ]),
            ),
          }),
          z.object({
            type: z.literal('web_fetch_tool_result'),
            tool_use_id: z.string(),
            content: z.union([
              z.object({
                type: z.literal('web_fetch_result'),
                url: z.string(),
                retrieved_at: z.string(),
                content: z.object({
                  type: z.literal('document'),
                  title: z.string().nullable(),
                  citations: z.object({ enabled: z.boolean() }).optional(),
                  source: z.union([
                    z.object({
                      type: z.literal('base64'),
                      media_type: z.literal('application/pdf'),
                      data: z.string(),
                    }),
                    z.object({
                      type: z.literal('text'),
                      media_type: z.literal('text/plain'),
                      data: z.string(),
                    }),
                  ]),
                }),
              }),
              z.object({
                type: z.literal('web_fetch_tool_result_error'),
                error_code: z.string(),
              }),
            ]),
          }),
          z.object({
            type: z.literal('web_search_tool_result'),
            tool_use_id: z.string(),
            content: z.union([
              z.array(
                z.object({
                  type: z.literal('web_search_result'),
                  url: z.string(),
                  title: z.string(),
                  encrypted_content: z.string(),
                  page_age: z.string().nullish(),
                }),
              ),
              z.object({
                type: z.literal('web_search_tool_result_error'),
                error_code: z.string(),
              }),
            ]),
          }),
          // code execution results for code_execution_20250522 tool:
          z.object({
            type: z.literal('code_execution_tool_result'),
            tool_use_id: z.string(),
            content: z.union([
              z.object({
                type: z.literal('code_execution_result'),
                stdout: z.string(),
                stderr: z.string(),
                return_code: z.number(),
                content: z
                  .array(
                    z.object({
                      type: z.literal('code_execution_output'),
                      file_id: z.string(),
                    }),
                  )
                  .optional()
                  .default([]),
              }),
              z.object({
                type: z.literal('encrypted_code_execution_result'),
                encrypted_stdout: z.string(),
                stderr: z.string(),
                return_code: z.number(),
                content: z
                  .array(
                    z.object({
                      type: z.literal('code_execution_output'),
                      file_id: z.string(),
                    }),
                  )
                  .optional()
                  .default([]),
              }),
              z.object({
                type: z.literal('code_execution_tool_result_error'),
                error_code: z.string(),
              }),
            ]),
          }),
          // bash code execution results for code_execution_20250825 tool:
          z.object({
            type: z.literal('bash_code_execution_tool_result'),
            tool_use_id: z.string(),
            content: z.discriminatedUnion('type', [
              z.object({
                type: z.literal('bash_code_execution_result'),
                content: z.array(
                  z.object({
                    type: z.literal('bash_code_execution_output'),
                    file_id: z.string(),
                  }),
                ),
                stdout: z.string(),
                stderr: z.string(),
                return_code: z.number(),
              }),
              z.object({
                type: z.literal('bash_code_execution_tool_result_error'),
                error_code: z.string(),
              }),
            ]),
          }),
          // text editor code execution results for code_execution_20250825 tool:
          z.object({
            type: z.literal('text_editor_code_execution_tool_result'),
            tool_use_id: z.string(),
            content: z.discriminatedUnion('type', [
              z.object({
                type: z.literal('text_editor_code_execution_tool_result_error'),
                error_code: z.string(),
              }),
              z.object({
                type: z.literal('text_editor_code_execution_view_result'),
                content: z.string(),
                file_type: z.string(),
                num_lines: z.number().nullable(),
                start_line: z.number().nullable(),
                total_lines: z.number().nullable(),
              }),
              z.object({
                type: z.literal('text_editor_code_execution_create_result'),
                is_file_update: z.boolean(),
              }),
              z.object({
                type: z.literal(
                  'text_editor_code_execution_str_replace_result',
                ),
                lines: z.array(z.string()).nullable(),
                new_lines: z.number().nullable(),
                new_start: z.number().nullable(),
                old_lines: z.number().nullable(),
                old_start: z.number().nullable(),
              }),
            ]),
          }),
          // tool search tool results for tool_search_tool_regex_20251119 and tool_search_tool_bm25_20251119:
          z.object({
            type: z.literal('tool_search_tool_result'),
            tool_use_id: z.string(),
            content: z.union([
              z.object({
                type: z.literal('tool_search_tool_search_result'),
                tool_references: z.array(
                  z.object({
                    type: z.literal('tool_reference'),
                    tool_name: z.string(),
                  }),
                ),
              }),
              z.object({
                type: z.literal('tool_search_tool_result_error'),
                error_code: z.string(),
              }),
            ]),
          }),
        ]),
      }),
      z.object({
        type: z.literal('content_block_delta'),
        index: z.number(),
        delta: z.discriminatedUnion('type', [
          z.object({
            type: z.literal('input_json_delta'),
            partial_json: z.string(),
          }),
          z.object({
            type: z.literal('text_delta'),
            text: z.string(),
          }),
          z.object({
            type: z.literal('thinking_delta'),
            thinking: z.string(),
          }),
          z.object({
            type: z.literal('signature_delta'),
            signature: z.string(),
          }),
          z.object({
            type: z.literal('compaction_delta'),
            content: z.string().nullish(),
          }),
          z.object({
            type: z.literal('citations_delta'),
            citation: z.discriminatedUnion('type', [
              z.object({
                type: z.literal('web_search_result_location'),
                cited_text: z.string(),
                url: z.string(),
                title: z.string(),
                encrypted_index: z.string(),
              }),
              z.object({
                type: z.literal('page_location'),
                cited_text: z.string(),
                document_index: z.number(),
                document_title: z.string().nullable(),
                start_page_number: z.number(),
                end_page_number: z.number(),
              }),
              z.object({
                type: z.literal('char_location'),
                cited_text: z.string(),
                document_index: z.number(),
                document_title: z.string().nullable(),
                start_char_index: z.number(),
                end_char_index: z.number(),
              }),
            ]),
          }),
        ]),
      }),
      z.object({
        type: z.literal('content_block_stop'),
        index: z.number(),
      }),
      z.object({
        type: z.literal('error'),
        error: z.object({
          type: z.string(),
          message: z.string(),
        }),
      }),
      z.object({
        type: z.literal('message_delta'),
        delta: z.object({
          stop_reason: z.string().nullish(),
          stop_sequence: z.string().nullish(),
          container: z
            .object({
              expires_at: z.string(),
              id: z.string(),
              skills: z
                .array(
                  z.object({
                    type: z.union([
                      z.literal('anthropic'),
                      z.literal('custom'),
                    ]),
                    skill_id: z.string(),
                    version: z.string(),
                  }),
                )
                .nullish(),
            })
            .nullish(),
        }),
        usage: z.looseObject({
          input_tokens: z.number().nullish(),
          output_tokens: z.number(),
          cache_creation_input_tokens: z.number().nullish(),
          cache_read_input_tokens: z.number().nullish(),
          iterations: z
            .array(
              z.object({
                type: z.union([z.literal('compaction'), z.literal('message')]),
                input_tokens: z.number(),
                output_tokens: z.number(),
              }),
            )
            .nullish(),
        }),
        context_management: z
          .object({
            applied_edits: z.array(
              z.union([
                z.object({
                  type: z.literal('clear_tool_uses_20250919'),
                  cleared_tool_uses: z.number(),
                  cleared_input_tokens: z.number(),
                }),
                z.object({
                  type: z.literal('clear_thinking_20251015'),
                  cleared_thinking_turns: z.number(),
                  cleared_input_tokens: z.number(),
                }),
                z.object({
                  type: z.literal('compact_20260112'),
                }),
              ]),
            ),
          })
          .nullish(),
      }),
      z.object({
        type: z.literal('message_stop'),
      }),
      z.object({
        type: z.literal('ping'),
      }),
    ]),
  ),
);

export const anthropicReasoningMetadataSchema = lazySchema(() =>
  zodSchema(
    z.object({
      signature: z.string().optional(),
      redactedData: z.string().optional(),
    }),
  ),
);

export type AnthropicReasoningMetadata = InferSchema<
  typeof anthropicReasoningMetadataSchema
>;

export type Citation = NonNullable<
  (InferSchema<typeof anthropicMessagesResponseSchema>['content'][number] & {
    type: 'text';
  })['citations']
>[number];
