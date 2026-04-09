import {
  LanguageModelV3CallOptions,
  SharedV3Warning,
  UnsupportedFunctionalityError,
} from '@ai-sdk/provider';
import { AnthropicTool, AnthropicToolChoice } from './anthropic-messages-api';
import { CacheControlValidator } from './get-cache-control';
import { textEditor_20250728ArgsSchema } from './tool/text-editor_20250728';
import { webSearch_20260209ArgsSchema } from './tool/web-search_20260209';
import { webSearch_20250305ArgsSchema } from './tool/web-search_20250305';
import { webFetch_20260209ArgsSchema } from './tool/web-fetch-20260209';
import { webFetch_20250910ArgsSchema } from './tool/web-fetch-20250910';
import { validateTypes } from '@ai-sdk/provider-utils';

export interface AnthropicToolOptions {
  deferLoading?: boolean;
  allowedCallers?: Array<
    'direct' | 'code_execution_20250825' | 'code_execution_20260120'
  >;
  eagerInputStreaming?: boolean;
}

export async function prepareTools({
  tools,
  toolChoice,
  disableParallelToolUse,
  cacheControlValidator,
  supportsStructuredOutput,
  supportsStrictTools,
}: {
  tools: LanguageModelV3CallOptions['tools'];
  toolChoice: LanguageModelV3CallOptions['toolChoice'] | undefined;
  disableParallelToolUse?: boolean;
  cacheControlValidator?: CacheControlValidator;

  /**
   * Whether the model supports native structured output response format.
   */
  supportsStructuredOutput: boolean;

  /**
   * Whether the model supports strict mode on tool definitions.
   */
  supportsStrictTools: boolean;
}): Promise<{
  tools: Array<AnthropicTool> | undefined;
  toolChoice: AnthropicToolChoice | undefined;
  toolWarnings: SharedV3Warning[];
  betas: Set<string>;
}> {
  // when the tools array is empty, change it to undefined to prevent errors:
  tools = tools?.length ? tools : undefined;

  const toolWarnings: SharedV3Warning[] = [];
  const betas = new Set<string>();
  const validator = cacheControlValidator || new CacheControlValidator();

  if (tools == null) {
    return { tools: undefined, toolChoice: undefined, toolWarnings, betas };
  }

  const anthropicTools: AnthropicTool[] = [];

  for (const tool of tools) {
    switch (tool.type) {
      case 'function': {
        const cacheControl = validator.getCacheControl(tool.providerOptions, {
          type: 'tool definition',
          canCache: true,
        });

        // Read Anthropic-specific provider options
        const anthropicOptions = tool.providerOptions?.anthropic as
          | AnthropicToolOptions
          | undefined;
        // eager_input_streaming is only supported on custom (function) tools
        const eagerInputStreaming = anthropicOptions?.eagerInputStreaming;
        const deferLoading = anthropicOptions?.deferLoading;
        const allowedCallers = anthropicOptions?.allowedCallers;

        if (!supportsStrictTools && tool.strict != null) {
          toolWarnings.push({
            type: 'unsupported',
            feature: 'strict',
            details: `Tool '${tool.name}' has strict: ${tool.strict}, but strict mode is not supported by this provider. The strict property will be ignored.`,
          });
        }

        anthropicTools.push({
          name: tool.name,
          description: tool.description,
          input_schema: tool.inputSchema,
          cache_control: cacheControl,
          ...(eagerInputStreaming ? { eager_input_streaming: true } : {}),
          ...(supportsStrictTools === true && tool.strict != null
            ? { strict: tool.strict }
            : {}),
          ...(deferLoading != null ? { defer_loading: deferLoading } : {}),
          ...(allowedCallers != null
            ? { allowed_callers: allowedCallers }
            : {}),
          ...(tool.inputExamples != null
            ? {
                input_examples: tool.inputExamples.map(
                  example => example.input,
                ),
              }
            : {}),
        });

        if (supportsStructuredOutput === true) {
          betas.add('structured-outputs-2025-11-13');
        }

        if (tool.inputExamples != null || allowedCallers != null) {
          betas.add('advanced-tool-use-2025-11-20');
        }

        break;
      }

      case 'provider': {
        // Note: Provider-defined tools don't currently support providerOptions in the SDK,
        // so cache_control cannot be set on them. The Anthropic API supports caching all tools,
        // but the SDK would need to be updated to expose providerOptions on provider-defined tools.
        switch (tool.id) {
          case 'anthropic.code_execution_20250522': {
            betas.add('code-execution-2025-05-22');
            anthropicTools.push({
              type: 'code_execution_20250522',
              name: 'code_execution',
              cache_control: undefined,
            });
            break;
          }
          case 'anthropic.code_execution_20250825': {
            betas.add('code-execution-2025-08-25');
            anthropicTools.push({
              type: 'code_execution_20250825',
              name: 'code_execution',
            });
            break;
          }
          case 'anthropic.code_execution_20260120': {
            anthropicTools.push({
              type: 'code_execution_20260120',
              name: 'code_execution',
            });
            break;
          }
          case 'anthropic.computer_20250124': {
            betas.add('computer-use-2025-01-24');
            anthropicTools.push({
              name: 'computer',
              type: 'computer_20250124',
              display_width_px: tool.args.displayWidthPx as number,
              display_height_px: tool.args.displayHeightPx as number,
              display_number: tool.args.displayNumber as number,
              cache_control: undefined,
            });
            break;
          }
          case 'anthropic.computer_20251124': {
            betas.add('computer-use-2025-11-24');
            anthropicTools.push({
              name: 'computer',
              type: 'computer_20251124',
              display_width_px: tool.args.displayWidthPx as number,
              display_height_px: tool.args.displayHeightPx as number,
              display_number: tool.args.displayNumber as number,
              enable_zoom: tool.args.enableZoom as boolean,
              cache_control: undefined,
            });
            break;
          }
          case 'anthropic.computer_20241022': {
            betas.add('computer-use-2024-10-22');
            anthropicTools.push({
              name: 'computer',
              type: 'computer_20241022',
              display_width_px: tool.args.displayWidthPx as number,
              display_height_px: tool.args.displayHeightPx as number,
              display_number: tool.args.displayNumber as number,
              cache_control: undefined,
            });
            break;
          }
          case 'anthropic.text_editor_20250124': {
            betas.add('computer-use-2025-01-24');
            anthropicTools.push({
              name: 'str_replace_editor',
              type: 'text_editor_20250124',
              cache_control: undefined,
            });
            break;
          }
          case 'anthropic.text_editor_20241022': {
            betas.add('computer-use-2024-10-22');
            anthropicTools.push({
              name: 'str_replace_editor',
              type: 'text_editor_20241022',
              cache_control: undefined,
            });
            break;
          }
          case 'anthropic.text_editor_20250429': {
            betas.add('computer-use-2025-01-24');
            anthropicTools.push({
              name: 'str_replace_based_edit_tool',
              type: 'text_editor_20250429',
              cache_control: undefined,
            });
            break;
          }
          case 'anthropic.text_editor_20250728': {
            const args = await validateTypes({
              value: tool.args,
              schema: textEditor_20250728ArgsSchema,
            });
            anthropicTools.push({
              name: 'str_replace_based_edit_tool',
              type: 'text_editor_20250728',
              max_characters: args.maxCharacters,
              cache_control: undefined,
            });
            break;
          }
          case 'anthropic.bash_20250124': {
            betas.add('computer-use-2025-01-24');
            anthropicTools.push({
              name: 'bash',
              type: 'bash_20250124',
              cache_control: undefined,
            });
            break;
          }
          case 'anthropic.bash_20241022': {
            betas.add('computer-use-2024-10-22');
            anthropicTools.push({
              name: 'bash',
              type: 'bash_20241022',
              cache_control: undefined,
            });
            break;
          }
          case 'anthropic.memory_20250818': {
            betas.add('context-management-2025-06-27');
            anthropicTools.push({
              name: 'memory',
              type: 'memory_20250818',
            });
            break;
          }
          case 'anthropic.web_fetch_20250910': {
            betas.add('web-fetch-2025-09-10');
            const args = await validateTypes({
              value: tool.args,
              schema: webFetch_20250910ArgsSchema,
            });
            anthropicTools.push({
              type: 'web_fetch_20250910',
              name: 'web_fetch',
              max_uses: args.maxUses,
              allowed_domains: args.allowedDomains,
              blocked_domains: args.blockedDomains,
              citations: args.citations,
              max_content_tokens: args.maxContentTokens,
              cache_control: undefined,
            });
            break;
          }
          case 'anthropic.web_fetch_20260209': {
            betas.add('code-execution-web-tools-2026-02-09');
            const args = await validateTypes({
              value: tool.args,
              schema: webFetch_20260209ArgsSchema,
            });
            anthropicTools.push({
              type: 'web_fetch_20260209',
              name: 'web_fetch',
              max_uses: args.maxUses,
              allowed_domains: args.allowedDomains,
              blocked_domains: args.blockedDomains,
              citations: args.citations,
              max_content_tokens: args.maxContentTokens,
              cache_control: undefined,
            });
            break;
          }
          case 'anthropic.web_search_20250305': {
            const args = await validateTypes({
              value: tool.args,
              schema: webSearch_20250305ArgsSchema,
            });
            anthropicTools.push({
              type: 'web_search_20250305',
              name: 'web_search',
              max_uses: args.maxUses,
              allowed_domains: args.allowedDomains,
              blocked_domains: args.blockedDomains,
              user_location: args.userLocation,
              cache_control: undefined,
            });
            break;
          }
          case 'anthropic.web_search_20260209': {
            betas.add('code-execution-web-tools-2026-02-09');
            const args = await validateTypes({
              value: tool.args,
              schema: webSearch_20260209ArgsSchema,
            });
            anthropicTools.push({
              type: 'web_search_20260209',
              name: 'web_search',
              max_uses: args.maxUses,
              allowed_domains: args.allowedDomains,
              blocked_domains: args.blockedDomains,
              user_location: args.userLocation,
              cache_control: undefined,
            });
            break;
          }

          case 'anthropic.tool_search_regex_20251119': {
            anthropicTools.push({
              type: 'tool_search_tool_regex_20251119',
              name: 'tool_search_tool_regex',
            });
            break;
          }

          case 'anthropic.tool_search_bm25_20251119': {
            anthropicTools.push({
              type: 'tool_search_tool_bm25_20251119',
              name: 'tool_search_tool_bm25',
            });
            break;
          }

          default: {
            toolWarnings.push({
              type: 'unsupported',
              feature: `provider-defined tool ${tool.id}`,
            });
            break;
          }
        }
        break;
      }

      default: {
        toolWarnings.push({
          type: 'unsupported',
          feature: `tool ${tool}`,
        });
        break;
      }
    }
  }

  if (toolChoice == null) {
    return {
      tools: anthropicTools,
      toolChoice: disableParallelToolUse
        ? { type: 'auto', disable_parallel_tool_use: disableParallelToolUse }
        : undefined,
      toolWarnings,
      betas,
    };
  }

  const type = toolChoice.type;

  switch (type) {
    case 'auto':
      return {
        tools: anthropicTools,
        toolChoice: {
          type: 'auto',
          disable_parallel_tool_use: disableParallelToolUse,
        },
        toolWarnings,
        betas,
      };
    case 'required':
      return {
        tools: anthropicTools,
        toolChoice: {
          type: 'any',
          disable_parallel_tool_use: disableParallelToolUse,
        },
        toolWarnings,
        betas,
      };
    case 'none':
      // Anthropic does not support 'none' tool choice, so we remove the tools:
      return { tools: undefined, toolChoice: undefined, toolWarnings, betas };
    case 'tool':
      return {
        tools: anthropicTools,
        toolChoice: {
          type: 'tool',
          name: toolChoice.toolName,
          disable_parallel_tool_use: disableParallelToolUse,
        },
        toolWarnings,
        betas,
      };
    default: {
      const _exhaustiveCheck: never = type;
      throw new UnsupportedFunctionalityError({
        functionality: `tool choice type: ${_exhaustiveCheck}`,
      });
    }
  }
}
