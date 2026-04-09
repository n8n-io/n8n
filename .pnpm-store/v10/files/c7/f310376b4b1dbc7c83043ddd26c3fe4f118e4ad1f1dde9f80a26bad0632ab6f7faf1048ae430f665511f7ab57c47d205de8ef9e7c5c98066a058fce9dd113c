import { JSONObject, JSONSchema7, JSONValue } from '@ai-sdk/provider';
import { InferSchema, lazySchema, zodSchema } from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

const jsonValueSchema: z.ZodType<JSONValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema.optional()),
  ]),
);

export type OpenAIResponsesInput = Array<OpenAIResponsesInputItem>;

export type OpenAIResponsesInputItem =
  | OpenAIResponsesSystemMessage
  | OpenAIResponsesUserMessage
  | OpenAIResponsesAssistantMessage
  | OpenAIResponsesFunctionCall
  | OpenAIResponsesFunctionCallOutput
  | OpenAIResponsesCustomToolCall
  | OpenAIResponsesCustomToolCallOutput
  | OpenAIResponsesMcpApprovalResponse
  | OpenAIResponsesComputerCall
  | OpenAIResponsesLocalShellCall
  | OpenAIResponsesLocalShellCallOutput
  | OpenAIResponsesShellCall
  | OpenAIResponsesShellCallOutput
  | OpenAIResponsesApplyPatchCall
  | OpenAIResponsesApplyPatchCallOutput
  | OpenAIResponsesToolSearchCall
  | OpenAIResponsesToolSearchOutput
  | OpenAIResponsesReasoning
  | OpenAIResponsesItemReference;

export type OpenAIResponsesIncludeValue =
  | 'web_search_call.action.sources'
  | 'code_interpreter_call.outputs'
  | 'computer_call_output.output.image_url'
  | 'file_search_call.results'
  | 'message.input_image.image_url'
  | 'message.output_text.logprobs'
  | 'reasoning.encrypted_content';

export type OpenAIResponsesIncludeOptions =
  | Array<OpenAIResponsesIncludeValue>
  | undefined
  | null;

export type OpenAIResponsesApplyPatchOperationDiffDeltaChunk = {
  type: 'response.apply_patch_call_operation_diff.delta';
  item_id: string;
  output_index: number;
  delta: string;
  obfuscation?: string | null;
};

export type OpenAIResponsesApplyPatchOperationDiffDoneChunk = {
  type: 'response.apply_patch_call_operation_diff.done';
  item_id: string;
  output_index: number;
  diff: string;
};

export type OpenAIResponsesSystemMessage = {
  role: 'system' | 'developer';
  content: string;
};

export type OpenAIResponsesUserMessage = {
  role: 'user';
  content: Array<
    | { type: 'input_text'; text: string }
    | { type: 'input_image'; image_url: string }
    | { type: 'input_image'; file_id: string }
    | { type: 'input_file'; file_url: string }
    | { type: 'input_file'; filename: string; file_data: string }
    | { type: 'input_file'; file_id: string }
  >;
};

export type OpenAIResponsesAssistantMessage = {
  role: 'assistant';
  content: Array<{ type: 'output_text'; text: string }>;
  id?: string;
  phase?: 'commentary' | 'final_answer' | null;
};

export type OpenAIResponsesFunctionCall = {
  type: 'function_call';
  call_id: string;
  name: string;
  arguments: string;
  id?: string;
};

export type OpenAIResponsesFunctionCallOutput = {
  type: 'function_call_output';
  call_id: string;
  output:
    | string
    | Array<
        | { type: 'input_text'; text: string }
        | { type: 'input_image'; image_url: string }
        | { type: 'input_file'; filename: string; file_data: string }
      >;
};

export type OpenAIResponsesCustomToolCall = {
  type: 'custom_tool_call';
  id?: string;
  call_id: string;
  name: string;
  input: string;
};

export type OpenAIResponsesCustomToolCallOutput = {
  type: 'custom_tool_call_output';
  call_id: string;
  output: OpenAIResponsesFunctionCallOutput['output'];
};

export type OpenAIResponsesMcpApprovalResponse = {
  type: 'mcp_approval_response';
  approval_request_id: string;
  approve: boolean;
};

export type OpenAIResponsesComputerCall = {
  type: 'computer_call';
  id: string;
  status?: string;
};

export type OpenAIResponsesLocalShellCall = {
  type: 'local_shell_call';
  id: string;
  call_id: string;
  action: {
    type: 'exec';
    command: string[];
    timeout_ms?: number;
    user?: string;
    working_directory?: string;
    env?: Record<string, string>;
  };
};

export type OpenAIResponsesLocalShellCallOutput = {
  type: 'local_shell_call_output';
  call_id: string;
  output: string;
};

/**
 * Official OpenAI API Specifications: https://platform.openai.com/docs/api-reference/responses/object#responses-object-output-shell_tool_call
 */
export type OpenAIResponsesShellCall = {
  type: 'shell_call';
  id: string;
  call_id: string;
  status: 'in_progress' | 'completed' | 'incomplete';
  action: {
    commands: string[];
    timeout_ms?: number;
    max_output_length?: number;
  };
};

export type OpenAIResponsesShellCallOutput = {
  type: 'shell_call_output';
  id?: string;
  call_id: string;
  status?: 'in_progress' | 'completed' | 'incomplete';
  max_output_length?: number | null;
  output: Array<{
    stdout: string;
    stderr: string;
    outcome: { type: 'timeout' } | { type: 'exit'; exit_code: number };
  }>;
};

export type OpenAIResponsesApplyPatchCall = {
  type: 'apply_patch_call';
  id?: string;
  call_id: string;
  status: 'in_progress' | 'completed';
  operation:
    | {
        type: 'create_file';
        path: string;
        diff: string;
      }
    | {
        type: 'delete_file';
        path: string;
      }
    | {
        type: 'update_file';
        path: string;
        diff: string;
      };
};

export type OpenAIResponsesApplyPatchCallOutput = {
  type: 'apply_patch_call_output';
  call_id: string;
  status: 'completed' | 'failed';
  output?: string;
};

export type OpenAIResponsesToolSearchCall = {
  type: 'tool_search_call';
  id: string;
  execution: 'server' | 'client';
  call_id: string | null;
  status: 'in_progress' | 'completed' | 'incomplete';
  arguments: unknown;
};

export type OpenAIResponsesToolSearchOutput = {
  type: 'tool_search_output';
  id?: string;
  execution: 'server' | 'client';
  call_id: string | null;
  status: 'in_progress' | 'completed' | 'incomplete';
  tools: Array<JSONObject>;
};

export type OpenAIResponsesItemReference = {
  type: 'item_reference';
  id: string;
};

/**
 * A filter used to compare a specified attribute key to a given value using a defined comparison operation.
 */
export type OpenAIResponsesFileSearchToolComparisonFilter = {
  /**
   * The key to compare against the value.
   */
  key: string;

  /**
   * Specifies the comparison operator: eq, ne, gt, gte, lt, lte, in, nin.
   */
  type: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin';

  /**
   * The value to compare against the attribute key; supports string, number, boolean, or array of string types.
   */
  value: string | number | boolean | string[];
};

/**
 * Combine multiple filters using and or or.
 */
export type OpenAIResponsesFileSearchToolCompoundFilter = {
  /**
   * Type of operation: and or or.
   */
  type: 'and' | 'or';

  /**
   * Array of filters to combine. Items can be ComparisonFilter or CompoundFilter.
   */
  filters: Array<
    | OpenAIResponsesFileSearchToolComparisonFilter
    | OpenAIResponsesFileSearchToolCompoundFilter
  >;
};

export type OpenAIResponsesTool =
  | {
      type: 'function';
      name: string;
      description: string | undefined;
      parameters: JSONSchema7;
      strict?: boolean;
      defer_loading?: boolean;
    }
  | {
      type: 'apply_patch';
    }
  | {
      type: 'web_search';
      external_web_access: boolean | undefined;
      filters: { allowed_domains: string[] | undefined } | undefined;
      search_context_size: 'low' | 'medium' | 'high' | undefined;
      user_location:
        | {
            type: 'approximate';
            city?: string;
            country?: string;
            region?: string;
            timezone?: string;
          }
        | undefined;
    }
  | {
      type: 'web_search_preview';
      search_context_size: 'low' | 'medium' | 'high' | undefined;
      user_location:
        | {
            type: 'approximate';
            city?: string;
            country?: string;
            region?: string;
            timezone?: string;
          }
        | undefined;
    }
  | {
      type: 'code_interpreter';
      container: string | { type: 'auto'; file_ids: string[] | undefined };
    }
  | {
      type: 'file_search';
      vector_store_ids: string[];
      max_num_results: number | undefined;
      ranking_options:
        | { ranker?: string; score_threshold?: number }
        | undefined;
      filters:
        | OpenAIResponsesFileSearchToolComparisonFilter
        | OpenAIResponsesFileSearchToolCompoundFilter
        | undefined;
    }
  | {
      type: 'image_generation';
      background: 'auto' | 'opaque' | 'transparent' | undefined;
      input_fidelity: 'low' | 'high' | undefined;
      input_image_mask:
        | {
            file_id: string | undefined;
            image_url: string | undefined;
          }
        | undefined;
      model: string | undefined;
      moderation: 'auto' | undefined;
      output_compression: number | undefined;
      output_format: 'png' | 'jpeg' | 'webp' | undefined;
      partial_images: number | undefined;
      quality: 'auto' | 'low' | 'medium' | 'high' | undefined;
      size: 'auto' | '1024x1024' | '1024x1536' | '1536x1024' | undefined;
    }

  /**
   * Official OpenAI API Specifications: https://platform.openai.com/docs/api-reference/responses/create#responses_create-tools-mcp_tool
   */
  | {
      type: 'mcp';
      server_label: string;
      allowed_tools:
        | string[]
        | {
            read_only?: boolean;
            tool_names?: string[];
          }
        | undefined;
      authorization: string | undefined;
      connector_id: string | undefined;
      headers: Record<string, string> | undefined;
      require_approval:
        | 'always'
        | 'never'
        | {
            never?: { tool_names?: string[] };
          }
        | undefined;
      server_description: string | undefined;
      server_url: string | undefined;
    }
  | {
      type: 'custom';
      name: string;
      description?: string;
      format?:
        | {
            type: 'grammar';
            syntax: 'regex' | 'lark';
            definition: string;
          }
        | {
            type: 'text';
          };
    }
  | {
      type: 'local_shell';
    }
  | {
      type: 'shell';
      environment?:
        | {
            type: 'container_auto';
            file_ids?: string[];
            memory_limit?: '1g' | '4g' | '16g' | '64g';
            network_policy?:
              | { type: 'disabled' }
              | {
                  type: 'allowlist';
                  allowed_domains: string[];
                  domain_secrets?: Array<{
                    domain: string;
                    name: string;
                    value: string;
                  }>;
                };
            skills?: Array<
              | {
                  type: 'skill_reference';
                  skill_id: string;
                  version?: string;
                }
              | {
                  type: 'inline';
                  name: string;
                  description: string;
                  source: {
                    type: 'base64';
                    media_type: 'application/zip';
                    data: string;
                  };
                }
            >;
          }
        | {
            type: 'container_reference';
            container_id: string;
          }
        | {
            type: 'local';
            skills?: Array<{
              name: string;
              description: string;
              path: string;
            }>;
          };
    }
  | {
      type: 'tool_search';
      execution?: 'server' | 'client';
      description?: string;
      parameters?: Record<string, unknown>;
    };

export type OpenAIResponsesReasoning = {
  type: 'reasoning';
  id?: string;
  encrypted_content?: string | null;
  summary: Array<{
    type: 'summary_text';
    text: string;
  }>;
};

export const openaiResponsesChunkSchema = lazySchema(() =>
  zodSchema(
    z.union([
      z.object({
        type: z.literal('response.output_text.delta'),
        item_id: z.string(),
        delta: z.string(),
        logprobs: z
          .array(
            z.object({
              token: z.string(),
              logprob: z.number(),
              top_logprobs: z.array(
                z.object({
                  token: z.string(),
                  logprob: z.number(),
                }),
              ),
            }),
          )
          .nullish(),
      }),
      z.object({
        type: z.enum(['response.completed', 'response.incomplete']),
        response: z.object({
          incomplete_details: z.object({ reason: z.string() }).nullish(),
          usage: z.object({
            input_tokens: z.number(),
            input_tokens_details: z
              .object({ cached_tokens: z.number().nullish() })
              .nullish(),
            output_tokens: z.number(),
            output_tokens_details: z
              .object({ reasoning_tokens: z.number().nullish() })
              .nullish(),
          }),
          service_tier: z.string().nullish(),
        }),
      }),
      z.object({
        type: z.literal('response.failed'),
        response: z.object({
          error: z
            .object({
              code: z.string().nullish(),
              message: z.string(),
            })
            .nullish(),
          incomplete_details: z.object({ reason: z.string() }).nullish(),
          usage: z
            .object({
              input_tokens: z.number(),
              input_tokens_details: z
                .object({ cached_tokens: z.number().nullish() })
                .nullish(),
              output_tokens: z.number(),
              output_tokens_details: z
                .object({ reasoning_tokens: z.number().nullish() })
                .nullish(),
            })
            .nullish(),
          service_tier: z.string().nullish(),
        }),
      }),
      z.object({
        type: z.literal('response.created'),
        response: z.object({
          id: z.string(),
          created_at: z.number(),
          model: z.string(),
          service_tier: z.string().nullish(),
        }),
      }),
      z.object({
        type: z.literal('response.output_item.added'),
        output_index: z.number(),
        item: z.discriminatedUnion('type', [
          z.object({
            type: z.literal('message'),
            id: z.string(),
            phase: z.enum(['commentary', 'final_answer']).nullish(),
          }),
          z.object({
            type: z.literal('reasoning'),
            id: z.string(),
            encrypted_content: z.string().nullish(),
          }),
          z.object({
            type: z.literal('function_call'),
            id: z.string(),
            call_id: z.string(),
            name: z.string(),
            arguments: z.string(),
          }),
          z.object({
            type: z.literal('web_search_call'),
            id: z.string(),
            status: z.string(),
          }),
          z.object({
            type: z.literal('computer_call'),
            id: z.string(),
            status: z.string(),
          }),
          z.object({
            type: z.literal('file_search_call'),
            id: z.string(),
          }),
          z.object({
            type: z.literal('image_generation_call'),
            id: z.string(),
          }),
          z.object({
            type: z.literal('code_interpreter_call'),
            id: z.string(),
            container_id: z.string(),
            code: z.string().nullable(),
            outputs: z
              .array(
                z.discriminatedUnion('type', [
                  z.object({ type: z.literal('logs'), logs: z.string() }),
                  z.object({ type: z.literal('image'), url: z.string() }),
                ]),
              )
              .nullable(),
            status: z.string(),
          }),
          z.object({
            type: z.literal('mcp_call'),
            id: z.string(),
            status: z.string(),
            approval_request_id: z.string().nullish(),
          }),
          z.object({
            type: z.literal('mcp_list_tools'),
            id: z.string(),
          }),
          z.object({
            type: z.literal('mcp_approval_request'),
            id: z.string(),
          }),
          z.object({
            type: z.literal('apply_patch_call'),
            id: z.string(),
            call_id: z.string(),
            status: z.enum(['in_progress', 'completed']),
            operation: z.discriminatedUnion('type', [
              z.object({
                type: z.literal('create_file'),
                path: z.string(),
                diff: z.string(),
              }),
              z.object({
                type: z.literal('delete_file'),
                path: z.string(),
              }),
              z.object({
                type: z.literal('update_file'),
                path: z.string(),
                diff: z.string(),
              }),
            ]),
          }),
          z.object({
            type: z.literal('custom_tool_call'),
            id: z.string(),
            call_id: z.string(),
            name: z.string(),
            input: z.string(),
          }),
          z.object({
            type: z.literal('shell_call'),
            id: z.string(),
            call_id: z.string(),
            status: z.enum(['in_progress', 'completed', 'incomplete']),
            action: z.object({
              commands: z.array(z.string()),
            }),
          }),
          z.object({
            type: z.literal('shell_call_output'),
            id: z.string(),
            call_id: z.string(),
            status: z.enum(['in_progress', 'completed', 'incomplete']),
            output: z.array(
              z.object({
                stdout: z.string(),
                stderr: z.string(),
                outcome: z.discriminatedUnion('type', [
                  z.object({ type: z.literal('timeout') }),
                  z.object({
                    type: z.literal('exit'),
                    exit_code: z.number(),
                  }),
                ]),
              }),
            ),
          }),
          z.object({
            type: z.literal('tool_search_call'),
            id: z.string(),
            execution: z.enum(['server', 'client']),
            call_id: z.string().nullable(),
            status: z.enum(['in_progress', 'completed', 'incomplete']),
            arguments: z.unknown(),
          }),
          z.object({
            type: z.literal('tool_search_output'),
            id: z.string(),
            execution: z.enum(['server', 'client']),
            call_id: z.string().nullable(),
            status: z.enum(['in_progress', 'completed', 'incomplete']),
            tools: z.array(z.record(z.string(), jsonValueSchema.optional())),
          }),
        ]),
      }),
      z.object({
        type: z.literal('response.output_item.done'),
        output_index: z.number(),
        item: z.discriminatedUnion('type', [
          z.object({
            type: z.literal('message'),
            id: z.string(),
            phase: z.enum(['commentary', 'final_answer']).nullish(),
          }),
          z.object({
            type: z.literal('reasoning'),
            id: z.string(),
            encrypted_content: z.string().nullish(),
          }),
          z.object({
            type: z.literal('function_call'),
            id: z.string(),
            call_id: z.string(),
            name: z.string(),
            arguments: z.string(),
            status: z.literal('completed'),
          }),
          z.object({
            type: z.literal('custom_tool_call'),
            id: z.string(),
            call_id: z.string(),
            name: z.string(),
            input: z.string(),
            status: z.literal('completed'),
          }),
          z.object({
            type: z.literal('code_interpreter_call'),
            id: z.string(),
            code: z.string().nullable(),
            container_id: z.string(),
            outputs: z
              .array(
                z.discriminatedUnion('type', [
                  z.object({ type: z.literal('logs'), logs: z.string() }),
                  z.object({ type: z.literal('image'), url: z.string() }),
                ]),
              )
              .nullable(),
          }),
          z.object({
            type: z.literal('image_generation_call'),
            id: z.string(),
            result: z.string(),
          }),
          z.object({
            type: z.literal('web_search_call'),
            id: z.string(),
            status: z.string(),
            action: z
              .discriminatedUnion('type', [
                z.object({
                  type: z.literal('search'),
                  query: z.string().nullish(),
                  sources: z
                    .array(
                      z.discriminatedUnion('type', [
                        z.object({ type: z.literal('url'), url: z.string() }),
                        z.object({ type: z.literal('api'), name: z.string() }),
                      ]),
                    )
                    .nullish(),
                }),
                z.object({
                  type: z.literal('open_page'),
                  url: z.string().nullish(),
                }),
                z.object({
                  type: z.literal('find_in_page'),
                  url: z.string().nullish(),
                  pattern: z.string().nullish(),
                }),
              ])
              .nullish(),
          }),
          z.object({
            type: z.literal('file_search_call'),
            id: z.string(),
            queries: z.array(z.string()),
            results: z
              .array(
                z.object({
                  attributes: z.record(
                    z.string(),
                    z.union([z.string(), z.number(), z.boolean()]),
                  ),
                  file_id: z.string(),
                  filename: z.string(),
                  score: z.number(),
                  text: z.string(),
                }),
              )
              .nullish(),
          }),
          z.object({
            type: z.literal('local_shell_call'),
            id: z.string(),
            call_id: z.string(),
            action: z.object({
              type: z.literal('exec'),
              command: z.array(z.string()),
              timeout_ms: z.number().optional(),
              user: z.string().optional(),
              working_directory: z.string().optional(),
              env: z.record(z.string(), z.string()).optional(),
            }),
          }),
          z.object({
            type: z.literal('computer_call'),
            id: z.string(),
            status: z.literal('completed'),
          }),
          z.object({
            type: z.literal('mcp_call'),
            id: z.string(),
            status: z.string(),
            arguments: z.string(),
            name: z.string(),
            server_label: z.string(),
            output: z.string().nullish(),
            error: z
              .union([
                z.string(),
                z
                  .object({
                    type: z.string().optional(),
                    code: z.union([z.number(), z.string()]).optional(),
                    message: z.string().optional(),
                  })
                  .loose(),
              ])
              .nullish(),
            approval_request_id: z.string().nullish(),
          }),
          z.object({
            type: z.literal('mcp_list_tools'),
            id: z.string(),
            server_label: z.string(),
            tools: z.array(
              z.object({
                name: z.string(),
                description: z.string().optional(),
                input_schema: z.any(),
                annotations: z.record(z.string(), z.unknown()).optional(),
              }),
            ),
            error: z
              .union([
                z.string(),
                z
                  .object({
                    type: z.string().optional(),
                    code: z.union([z.number(), z.string()]).optional(),
                    message: z.string().optional(),
                  })
                  .loose(),
              ])
              .optional(),
          }),
          z.object({
            type: z.literal('mcp_approval_request'),
            id: z.string(),
            server_label: z.string(),
            name: z.string(),
            arguments: z.string(),
            approval_request_id: z.string().optional(),
          }),
          z.object({
            type: z.literal('apply_patch_call'),
            id: z.string(),
            call_id: z.string(),
            status: z.enum(['in_progress', 'completed']),
            operation: z.discriminatedUnion('type', [
              z.object({
                type: z.literal('create_file'),
                path: z.string(),
                diff: z.string(),
              }),
              z.object({
                type: z.literal('delete_file'),
                path: z.string(),
              }),
              z.object({
                type: z.literal('update_file'),
                path: z.string(),
                diff: z.string(),
              }),
            ]),
          }),
          z.object({
            type: z.literal('shell_call'),
            id: z.string(),
            call_id: z.string(),
            status: z.enum(['in_progress', 'completed', 'incomplete']),
            action: z.object({
              commands: z.array(z.string()),
            }),
          }),
          z.object({
            type: z.literal('shell_call_output'),
            id: z.string(),
            call_id: z.string(),
            status: z.enum(['in_progress', 'completed', 'incomplete']),
            output: z.array(
              z.object({
                stdout: z.string(),
                stderr: z.string(),
                outcome: z.discriminatedUnion('type', [
                  z.object({ type: z.literal('timeout') }),
                  z.object({
                    type: z.literal('exit'),
                    exit_code: z.number(),
                  }),
                ]),
              }),
            ),
          }),
          z.object({
            type: z.literal('tool_search_call'),
            id: z.string(),
            execution: z.enum(['server', 'client']),
            call_id: z.string().nullable(),
            status: z.enum(['in_progress', 'completed', 'incomplete']),
            arguments: z.unknown(),
          }),
          z.object({
            type: z.literal('tool_search_output'),
            id: z.string(),
            execution: z.enum(['server', 'client']),
            call_id: z.string().nullable(),
            status: z.enum(['in_progress', 'completed', 'incomplete']),
            tools: z.array(z.record(z.string(), jsonValueSchema.optional())),
          }),
        ]),
      }),
      z.object({
        type: z.literal('response.function_call_arguments.delta'),
        item_id: z.string(),
        output_index: z.number(),
        delta: z.string(),
      }),
      z.object({
        type: z.literal('response.custom_tool_call_input.delta'),
        item_id: z.string(),
        output_index: z.number(),
        delta: z.string(),
      }),
      z.object({
        type: z.literal('response.image_generation_call.partial_image'),
        item_id: z.string(),
        output_index: z.number(),
        partial_image_b64: z.string(),
      }),
      z.object({
        type: z.literal('response.code_interpreter_call_code.delta'),
        item_id: z.string(),
        output_index: z.number(),
        delta: z.string(),
      }),
      z.object({
        type: z.literal('response.code_interpreter_call_code.done'),
        item_id: z.string(),
        output_index: z.number(),
        code: z.string(),
      }),
      z.object({
        type: z.literal('response.output_text.annotation.added'),
        annotation: z.discriminatedUnion('type', [
          z.object({
            type: z.literal('url_citation'),
            start_index: z.number(),
            end_index: z.number(),
            url: z.string(),
            title: z.string(),
          }),
          z.object({
            type: z.literal('file_citation'),
            file_id: z.string(),
            filename: z.string(),
            index: z.number(),
          }),
          z.object({
            type: z.literal('container_file_citation'),
            container_id: z.string(),
            file_id: z.string(),
            filename: z.string(),
            start_index: z.number(),
            end_index: z.number(),
          }),
          z.object({
            type: z.literal('file_path'),
            file_id: z.string(),
            index: z.number(),
          }),
        ]),
      }),
      z.object({
        type: z.literal('response.reasoning_summary_part.added'),
        item_id: z.string(),
        summary_index: z.number(),
      }),
      z.object({
        type: z.literal('response.reasoning_summary_text.delta'),
        item_id: z.string(),
        summary_index: z.number(),
        delta: z.string(),
      }),
      z.object({
        type: z.literal('response.reasoning_summary_part.done'),
        item_id: z.string(),
        summary_index: z.number(),
      }),
      z.object({
        type: z.literal('response.apply_patch_call_operation_diff.delta'),
        item_id: z.string(),
        output_index: z.number(),
        delta: z.string(),
        obfuscation: z.string().nullish(),
      }),
      z.object({
        type: z.literal('response.apply_patch_call_operation_diff.done'),
        item_id: z.string(),
        output_index: z.number(),
        diff: z.string(),
      }),
      z.object({
        type: z.literal('error'),
        sequence_number: z.number(),
        error: z.object({
          type: z.string(),
          code: z.string(),
          message: z.string(),
          param: z.string().nullish(),
        }),
      }),
      z
        .object({ type: z.string() })
        .loose()
        .transform(value => ({
          type: 'unknown_chunk' as const,
          message: value.type,
        })), // fallback for unknown chunks
    ]),
  ),
);

export type OpenAIResponsesChunk = InferSchema<
  typeof openaiResponsesChunkSchema
>;

export type OpenAIResponsesLogprobs = NonNullable<
  (OpenAIResponsesChunk & {
    type: 'response.output_text.delta';
  })['logprobs']
> | null;

export type OpenAIResponsesWebSearchAction = NonNullable<
  ((OpenAIResponsesChunk & {
    type: 'response.output_item.done';
  })['item'] & {
    type: 'web_search_call';
  })['action']
>;

export const openaiResponsesResponseSchema = lazySchema(() =>
  zodSchema(
    z.object({
      id: z.string().optional(),
      created_at: z.number().optional(),
      error: z
        .object({
          message: z.string(),
          type: z.string(),
          param: z.string().nullish(),
          code: z.string(),
        })
        .nullish(),
      model: z.string().optional(),
      output: z
        .array(
          z.discriminatedUnion('type', [
            z.object({
              type: z.literal('message'),
              role: z.literal('assistant'),
              id: z.string(),
              phase: z.enum(['commentary', 'final_answer']).nullish(),
              content: z.array(
                z.object({
                  type: z.literal('output_text'),
                  text: z.string(),
                  logprobs: z
                    .array(
                      z.object({
                        token: z.string(),
                        logprob: z.number(),
                        top_logprobs: z.array(
                          z.object({
                            token: z.string(),
                            logprob: z.number(),
                          }),
                        ),
                      }),
                    )
                    .nullish(),
                  annotations: z.array(
                    z.discriminatedUnion('type', [
                      z.object({
                        type: z.literal('url_citation'),
                        start_index: z.number(),
                        end_index: z.number(),
                        url: z.string(),
                        title: z.string(),
                      }),
                      z.object({
                        type: z.literal('file_citation'),
                        file_id: z.string(),
                        filename: z.string(),
                        index: z.number(),
                      }),
                      z.object({
                        type: z.literal('container_file_citation'),
                        container_id: z.string(),
                        file_id: z.string(),
                        filename: z.string(),
                        start_index: z.number(),
                        end_index: z.number(),
                      }),
                      z.object({
                        type: z.literal('file_path'),
                        file_id: z.string(),
                        index: z.number(),
                      }),
                    ]),
                  ),
                }),
              ),
            }),
            z.object({
              type: z.literal('web_search_call'),
              id: z.string(),
              status: z.string(),
              action: z
                .discriminatedUnion('type', [
                  z.object({
                    type: z.literal('search'),
                    query: z.string().nullish(),
                    sources: z
                      .array(
                        z.discriminatedUnion('type', [
                          z.object({ type: z.literal('url'), url: z.string() }),
                          z.object({
                            type: z.literal('api'),
                            name: z.string(),
                          }),
                        ]),
                      )
                      .nullish(),
                  }),
                  z.object({
                    type: z.literal('open_page'),
                    url: z.string().nullish(),
                  }),
                  z.object({
                    type: z.literal('find_in_page'),
                    url: z.string().nullish(),
                    pattern: z.string().nullish(),
                  }),
                ])
                .nullish(),
            }),
            z.object({
              type: z.literal('file_search_call'),
              id: z.string(),
              queries: z.array(z.string()),
              results: z
                .array(
                  z.object({
                    attributes: z.record(
                      z.string(),
                      z.union([z.string(), z.number(), z.boolean()]),
                    ),
                    file_id: z.string(),
                    filename: z.string(),
                    score: z.number(),
                    text: z.string(),
                  }),
                )
                .nullish(),
            }),
            z.object({
              type: z.literal('code_interpreter_call'),
              id: z.string(),
              code: z.string().nullable(),
              container_id: z.string(),
              outputs: z
                .array(
                  z.discriminatedUnion('type', [
                    z.object({ type: z.literal('logs'), logs: z.string() }),
                    z.object({ type: z.literal('image'), url: z.string() }),
                  ]),
                )
                .nullable(),
            }),
            z.object({
              type: z.literal('image_generation_call'),
              id: z.string(),
              result: z.string(),
            }),
            z.object({
              type: z.literal('local_shell_call'),
              id: z.string(),
              call_id: z.string(),
              action: z.object({
                type: z.literal('exec'),
                command: z.array(z.string()),
                timeout_ms: z.number().optional(),
                user: z.string().optional(),
                working_directory: z.string().optional(),
                env: z.record(z.string(), z.string()).optional(),
              }),
            }),
            z.object({
              type: z.literal('function_call'),
              call_id: z.string(),
              name: z.string(),
              arguments: z.string(),
              id: z.string(),
            }),
            z.object({
              type: z.literal('custom_tool_call'),
              call_id: z.string(),
              name: z.string(),
              input: z.string(),
              id: z.string(),
            }),
            z.object({
              type: z.literal('computer_call'),
              id: z.string(),
              status: z.string().optional(),
            }),
            z.object({
              type: z.literal('reasoning'),
              id: z.string(),
              encrypted_content: z.string().nullish(),
              summary: z.array(
                z.object({
                  type: z.literal('summary_text'),
                  text: z.string(),
                }),
              ),
            }),
            z.object({
              type: z.literal('mcp_call'),
              id: z.string(),
              status: z.string(),
              arguments: z.string(),
              name: z.string(),
              server_label: z.string(),
              output: z.string().nullish(),
              error: z
                .union([
                  z.string(),
                  z
                    .object({
                      type: z.string().optional(),
                      code: z.union([z.number(), z.string()]).optional(),
                      message: z.string().optional(),
                    })
                    .loose(),
                ])
                .nullish(),
              approval_request_id: z.string().nullish(),
            }),
            z.object({
              type: z.literal('mcp_list_tools'),
              id: z.string(),
              server_label: z.string(),
              tools: z.array(
                z.object({
                  name: z.string(),
                  description: z.string().optional(),
                  input_schema: z.any(),
                  annotations: z.record(z.string(), z.unknown()).optional(),
                }),
              ),
              error: z
                .union([
                  z.string(),
                  z
                    .object({
                      type: z.string().optional(),
                      code: z.union([z.number(), z.string()]).optional(),
                      message: z.string().optional(),
                    })
                    .loose(),
                ])
                .optional(),
            }),
            z.object({
              type: z.literal('mcp_approval_request'),
              id: z.string(),
              server_label: z.string(),
              name: z.string(),
              arguments: z.string(),
              approval_request_id: z.string().optional(),
            }),
            z.object({
              type: z.literal('apply_patch_call'),
              id: z.string(),
              call_id: z.string(),
              status: z.enum(['in_progress', 'completed']),
              operation: z.discriminatedUnion('type', [
                z.object({
                  type: z.literal('create_file'),
                  path: z.string(),
                  diff: z.string(),
                }),
                z.object({
                  type: z.literal('delete_file'),
                  path: z.string(),
                }),
                z.object({
                  type: z.literal('update_file'),
                  path: z.string(),
                  diff: z.string(),
                }),
              ]),
            }),
            z.object({
              type: z.literal('shell_call'),
              id: z.string(),
              call_id: z.string(),
              status: z.enum(['in_progress', 'completed', 'incomplete']),
              action: z.object({
                commands: z.array(z.string()),
              }),
            }),
            z.object({
              type: z.literal('shell_call_output'),
              id: z.string(),
              call_id: z.string(),
              status: z.enum(['in_progress', 'completed', 'incomplete']),
              output: z.array(
                z.object({
                  stdout: z.string(),
                  stderr: z.string(),
                  outcome: z.discriminatedUnion('type', [
                    z.object({ type: z.literal('timeout') }),
                    z.object({
                      type: z.literal('exit'),
                      exit_code: z.number(),
                    }),
                  ]),
                }),
              ),
            }),
            z.object({
              type: z.literal('tool_search_call'),
              id: z.string(),
              execution: z.enum(['server', 'client']),
              call_id: z.string().nullable(),
              status: z.enum(['in_progress', 'completed', 'incomplete']),
              arguments: z.unknown(),
            }),
            z.object({
              type: z.literal('tool_search_output'),
              id: z.string(),
              execution: z.enum(['server', 'client']),
              call_id: z.string().nullable(),
              status: z.enum(['in_progress', 'completed', 'incomplete']),
              tools: z.array(z.record(z.string(), jsonValueSchema.optional())),
            }),
          ]),
        )
        .optional(),
      service_tier: z.string().nullish(),
      incomplete_details: z.object({ reason: z.string() }).nullish(),
      usage: z
        .object({
          input_tokens: z.number(),
          input_tokens_details: z
            .object({ cached_tokens: z.number().nullish() })
            .nullish(),
          output_tokens: z.number(),
          output_tokens_details: z
            .object({ reasoning_tokens: z.number().nullish() })
            .nullish(),
        })
        .optional(),
    }),
  ),
);
