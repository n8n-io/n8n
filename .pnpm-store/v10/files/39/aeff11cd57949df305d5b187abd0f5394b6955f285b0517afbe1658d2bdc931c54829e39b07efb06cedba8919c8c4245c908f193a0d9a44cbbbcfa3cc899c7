import {
  APICallError,
  JSONObject,
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3Content,
  LanguageModelV3FinishReason,
  LanguageModelV3FunctionTool,
  LanguageModelV3GenerateResult,
  LanguageModelV3Prompt,
  LanguageModelV3Source,
  LanguageModelV3StreamPart,
  LanguageModelV3StreamResult,
  LanguageModelV3ToolCall,
  SharedV3ProviderMetadata,
  SharedV3Warning,
} from '@ai-sdk/provider';
import {
  combineHeaders,
  createEventSourceResponseHandler,
  createJsonResponseHandler,
  createToolNameMapping,
  FetchFunction,
  generateId,
  InferSchema,
  parseProviderOptions,
  ParseResult,
  postJsonToApi,
  Resolvable,
  resolve,
} from '@ai-sdk/provider-utils';
import { anthropicFailedResponseHandler } from './anthropic-error';
import { AnthropicMessageMetadata } from './anthropic-message-metadata';
import {
  AnthropicContainer,
  anthropicMessagesChunkSchema,
  anthropicMessagesResponseSchema,
  AnthropicReasoningMetadata,
  AnthropicResponseContextManagement,
  AnthropicTool,
  Citation,
} from './anthropic-messages-api';
import {
  AnthropicMessagesModelId,
  anthropicLanguageModelOptions,
} from './anthropic-messages-options';
import { prepareTools } from './anthropic-prepare-tools';
import {
  AnthropicMessagesUsage,
  convertAnthropicMessagesUsage,
} from './convert-anthropic-messages-usage';
import { convertToAnthropicMessagesPrompt } from './convert-to-anthropic-messages-prompt';
import { CacheControlValidator } from './get-cache-control';
import { mapAnthropicStopReason } from './map-anthropic-stop-reason';

function createCitationSource(
  citation: Citation,
  citationDocuments: Array<{
    title: string;
    filename?: string;
    mediaType: string;
  }>,
  generateId: () => string,
): LanguageModelV3Source | undefined {
  if (citation.type === 'web_search_result_location') {
    return {
      type: 'source' as const,
      sourceType: 'url' as const,
      id: generateId(),
      url: citation.url,
      title: citation.title,
      providerMetadata: {
        anthropic: {
          citedText: citation.cited_text,
          encryptedIndex: citation.encrypted_index,
        },
      } satisfies SharedV3ProviderMetadata,
    };
  }

  if (citation.type !== 'page_location' && citation.type !== 'char_location') {
    return;
  }

  const documentInfo = citationDocuments[citation.document_index];

  if (!documentInfo) {
    return;
  }

  return {
    type: 'source' as const,
    sourceType: 'document' as const,
    id: generateId(),
    mediaType: documentInfo.mediaType,
    title: citation.document_title ?? documentInfo.title,
    filename: documentInfo.filename,
    providerMetadata: {
      anthropic:
        citation.type === 'page_location'
          ? {
              citedText: citation.cited_text,
              startPageNumber: citation.start_page_number,
              endPageNumber: citation.end_page_number,
            }
          : {
              citedText: citation.cited_text,
              startCharIndex: citation.start_char_index,
              endCharIndex: citation.end_char_index,
            },
    } satisfies SharedV3ProviderMetadata,
  };
}

type AnthropicMessagesConfig = {
  provider: string;
  baseURL: string;
  headers: Resolvable<Record<string, string | undefined>>;
  fetch?: FetchFunction;
  buildRequestUrl?: (baseURL: string, isStreaming: boolean) => string;
  transformRequestBody?: (
    args: Record<string, any>,
    betas: Set<string>,
  ) => Record<string, any>;
  supportedUrls?: () => LanguageModelV3['supportedUrls'];
  generateId?: () => string;

  /**
   * When false, the model will use JSON tool fallback for structured outputs.
   */
  supportsNativeStructuredOutput?: boolean;

  /**
   * When false, `strict` on tool definitions will be ignored and a warning emitted.
   * Defaults to true.
   */
  supportsStrictTools?: boolean;
};

export class AnthropicMessagesLanguageModel implements LanguageModelV3 {
  readonly specificationVersion = 'v3';

  readonly modelId: AnthropicMessagesModelId;

  private readonly config: AnthropicMessagesConfig;
  private readonly generateId: () => string;

  constructor(
    modelId: AnthropicMessagesModelId,
    config: AnthropicMessagesConfig,
  ) {
    this.modelId = modelId;
    this.config = config;
    this.generateId = config.generateId ?? generateId;
  }

  supportsUrl(url: URL): boolean {
    return url.protocol === 'https:';
  }

  get provider(): string {
    return this.config.provider;
  }

  /**
   * Extracts the dynamic provider name from the config.provider string.
   * e.g., 'my-custom-anthropic.messages' -> 'my-custom-anthropic'
   */
  private get providerOptionsName(): string {
    const provider = this.config.provider;
    const dotIndex = provider.indexOf('.');
    return dotIndex === -1 ? provider : provider.substring(0, dotIndex);
  }

  get supportedUrls() {
    return this.config.supportedUrls?.() ?? {};
  }

  private async getArgs({
    userSuppliedBetas,
    prompt,
    maxOutputTokens,
    temperature,
    topP,
    topK,
    frequencyPenalty,
    presencePenalty,
    stopSequences,
    responseFormat,
    seed,
    tools,
    toolChoice,
    providerOptions,
    stream,
  }: LanguageModelV3CallOptions & {
    stream: boolean;
    userSuppliedBetas: Set<string>;
  }) {
    const warnings: SharedV3Warning[] = [];

    if (frequencyPenalty != null) {
      warnings.push({ type: 'unsupported', feature: 'frequencyPenalty' });
    }

    if (presencePenalty != null) {
      warnings.push({ type: 'unsupported', feature: 'presencePenalty' });
    }

    if (seed != null) {
      warnings.push({ type: 'unsupported', feature: 'seed' });
    }

    if (temperature != null && temperature > 1) {
      warnings.push({
        type: 'unsupported',
        feature: 'temperature',
        details: `${temperature} exceeds anthropic maximum of 1.0. clamped to 1.0`,
      });
      temperature = 1;
    } else if (temperature != null && temperature < 0) {
      warnings.push({
        type: 'unsupported',
        feature: 'temperature',
        details: `${temperature} is below anthropic minimum of 0. clamped to 0`,
      });
      temperature = 0;
    }

    if (responseFormat?.type === 'json') {
      if (responseFormat.schema == null) {
        warnings.push({
          type: 'unsupported',
          feature: 'responseFormat',
          details:
            'JSON response format requires a schema. ' +
            'The response format is ignored.',
        });
      }
    }

    const providerOptionsName = this.providerOptionsName;

    // Parse provider options from both canonical 'anthropic' key and custom key
    const canonicalOptions = await parseProviderOptions({
      provider: 'anthropic',
      providerOptions,
      schema: anthropicLanguageModelOptions,
    });

    const customProviderOptions =
      providerOptionsName !== 'anthropic'
        ? await parseProviderOptions({
            provider: providerOptionsName,
            providerOptions,
            schema: anthropicLanguageModelOptions,
          })
        : null;

    // Track if custom key was explicitly used
    const usedCustomProviderKey = customProviderOptions != null;

    // Merge options
    const anthropicOptions = Object.assign(
      {},
      canonicalOptions ?? {},
      customProviderOptions ?? {},
    );

    const {
      maxOutputTokens: maxOutputTokensForModel,
      supportsStructuredOutput: modelSupportsStructuredOutput,
      isKnownModel,
    } = getModelCapabilities(this.modelId);

    const supportsStructuredOutput =
      (this.config.supportsNativeStructuredOutput ?? true) &&
      modelSupportsStructuredOutput;

    const supportsStrictTools =
      (this.config.supportsStrictTools ?? true) &&
      modelSupportsStructuredOutput;

    const structureOutputMode =
      anthropicOptions?.structuredOutputMode ?? 'auto';
    const useStructuredOutput =
      structureOutputMode === 'outputFormat' ||
      (structureOutputMode === 'auto' && supportsStructuredOutput);

    const jsonResponseTool: LanguageModelV3FunctionTool | undefined =
      responseFormat?.type === 'json' &&
      responseFormat.schema != null &&
      !useStructuredOutput
        ? {
            type: 'function',
            name: 'json',
            description: 'Respond with a JSON object.',
            inputSchema: responseFormat.schema,
          }
        : undefined;

    const contextManagement = anthropicOptions?.contextManagement;

    // Create a shared cache control validator to track breakpoints across tools and messages
    const cacheControlValidator = new CacheControlValidator();

    const toolNameMapping = createToolNameMapping({
      tools,
      providerToolNames: {
        'anthropic.code_execution_20250522': 'code_execution',
        'anthropic.code_execution_20250825': 'code_execution',
        'anthropic.code_execution_20260120': 'code_execution',
        'anthropic.computer_20241022': 'computer',
        'anthropic.computer_20250124': 'computer',
        'anthropic.text_editor_20241022': 'str_replace_editor',
        'anthropic.text_editor_20250124': 'str_replace_editor',
        'anthropic.text_editor_20250429': 'str_replace_based_edit_tool',
        'anthropic.text_editor_20250728': 'str_replace_based_edit_tool',
        'anthropic.bash_20241022': 'bash',
        'anthropic.bash_20250124': 'bash',
        'anthropic.memory_20250818': 'memory',
        'anthropic.web_search_20250305': 'web_search',
        'anthropic.web_search_20260209': 'web_search',
        'anthropic.web_fetch_20250910': 'web_fetch',
        'anthropic.web_fetch_20260209': 'web_fetch',
        'anthropic.tool_search_regex_20251119': 'tool_search_tool_regex',
        'anthropic.tool_search_bm25_20251119': 'tool_search_tool_bm25',
      },
    });

    const { prompt: messagesPrompt, betas } =
      await convertToAnthropicMessagesPrompt({
        prompt,
        sendReasoning: anthropicOptions?.sendReasoning ?? true,
        warnings,
        cacheControlValidator,
        toolNameMapping,
      });

    const thinkingType = anthropicOptions?.thinking?.type;
    const isThinking =
      thinkingType === 'enabled' || thinkingType === 'adaptive';
    let thinkingBudget =
      thinkingType === 'enabled'
        ? anthropicOptions?.thinking?.budgetTokens
        : undefined;

    const maxTokens = maxOutputTokens ?? maxOutputTokensForModel;

    const baseArgs = {
      // model id:
      model: this.modelId,

      // standardized settings:
      max_tokens: maxTokens,
      temperature,
      top_k: topK,
      top_p: topP,
      stop_sequences: stopSequences,

      // provider specific settings:
      ...(isThinking && {
        thinking: {
          type: thinkingType,
          ...(thinkingBudget != null && { budget_tokens: thinkingBudget }),
        },
      }),
      ...((anthropicOptions?.effort ||
        (useStructuredOutput &&
          responseFormat?.type === 'json' &&
          responseFormat.schema != null)) && {
        output_config: {
          ...(anthropicOptions?.effort && {
            effort: anthropicOptions.effort,
          }),
          ...(useStructuredOutput &&
            responseFormat?.type === 'json' &&
            responseFormat.schema != null && {
              format: {
                type: 'json_schema',
                schema: responseFormat.schema,
              },
            }),
        },
      }),
      ...(anthropicOptions?.speed && {
        speed: anthropicOptions.speed,
      }),
      ...(anthropicOptions?.cacheControl && {
        cache_control: anthropicOptions.cacheControl,
      }),
      ...(anthropicOptions?.metadata?.userId != null && {
        metadata: { user_id: anthropicOptions.metadata.userId },
      }),

      // mcp servers:
      ...(anthropicOptions?.mcpServers &&
        anthropicOptions.mcpServers.length > 0 && {
          mcp_servers: anthropicOptions.mcpServers.map(server => ({
            type: server.type,
            name: server.name,
            url: server.url,
            authorization_token: server.authorizationToken,
            tool_configuration: server.toolConfiguration
              ? {
                  allowed_tools: server.toolConfiguration.allowedTools,
                  enabled: server.toolConfiguration.enabled,
                }
              : undefined,
          })),
        }),

      // container: For programmatic tool calling (just an ID string) or agent skills (object with id and skills)
      ...(anthropicOptions?.container && {
        container:
          anthropicOptions.container.skills &&
          anthropicOptions.container.skills.length > 0
            ? // Object format when skills are provided (agent skills feature)
              ({
                id: anthropicOptions.container.id,
                skills: anthropicOptions.container.skills.map(skill => ({
                  type: skill.type,
                  skill_id: skill.skillId,
                  version: skill.version,
                })),
              } satisfies AnthropicContainer)
            : // String format for container ID only (programmatic tool calling)
              anthropicOptions.container.id,
      }),

      // prompt:
      system: messagesPrompt.system,
      messages: messagesPrompt.messages,

      ...(contextManagement && {
        context_management: {
          edits: contextManagement.edits
            .map(edit => {
              const strategy = edit.type;
              switch (strategy) {
                case 'clear_tool_uses_20250919':
                  return {
                    type: edit.type,
                    ...(edit.trigger !== undefined && {
                      trigger: edit.trigger,
                    }),
                    ...(edit.keep !== undefined && { keep: edit.keep }),
                    ...(edit.clearAtLeast !== undefined && {
                      clear_at_least: edit.clearAtLeast,
                    }),
                    ...(edit.clearToolInputs !== undefined && {
                      clear_tool_inputs: edit.clearToolInputs,
                    }),
                    ...(edit.excludeTools !== undefined && {
                      exclude_tools: edit.excludeTools,
                    }),
                  };

                case 'clear_thinking_20251015':
                  return {
                    type: edit.type,
                    ...(edit.keep !== undefined && { keep: edit.keep }),
                  };

                case 'compact_20260112':
                  return {
                    type: edit.type,
                    ...(edit.trigger !== undefined && {
                      trigger: edit.trigger,
                    }),
                    ...(edit.pauseAfterCompaction !== undefined && {
                      pause_after_compaction: edit.pauseAfterCompaction,
                    }),
                    ...(edit.instructions !== undefined && {
                      instructions: edit.instructions,
                    }),
                  };

                default:
                  warnings.push({
                    type: 'other',
                    message: `Unknown context management strategy: ${strategy}`,
                  });
                  return undefined;
              }
            })
            .filter(edit => edit !== undefined),
        },
      }),
    };

    if (isThinking) {
      if (thinkingType === 'enabled' && thinkingBudget == null) {
        warnings.push({
          type: 'compatibility',
          feature: 'extended thinking',
          details:
            'thinking budget is required when thinking is enabled. using default budget of 1024 tokens.',
        });

        baseArgs.thinking = {
          type: 'enabled',
          budget_tokens: 1024,
        };

        thinkingBudget = 1024;
      }

      if (baseArgs.temperature != null) {
        baseArgs.temperature = undefined;
        warnings.push({
          type: 'unsupported',
          feature: 'temperature',
          details: 'temperature is not supported when thinking is enabled',
        });
      }

      if (topK != null) {
        baseArgs.top_k = undefined;
        warnings.push({
          type: 'unsupported',
          feature: 'topK',
          details: 'topK is not supported when thinking is enabled',
        });
      }

      if (topP != null) {
        baseArgs.top_p = undefined;
        warnings.push({
          type: 'unsupported',
          feature: 'topP',
          details: 'topP is not supported when thinking is enabled',
        });
      }

      // adjust max tokens to account for thinking:
      baseArgs.max_tokens = maxTokens + (thinkingBudget ?? 0);
    } else {
      // Only check temperature/topP mutual exclusivity when thinking is not enabled
      if (topP != null && temperature != null) {
        warnings.push({
          type: 'unsupported',
          feature: 'topP',
          details: `topP is not supported when temperature is set. topP is ignored.`,
        });
        baseArgs.top_p = undefined;
      }
    }

    // limit to max output tokens for known models to enable model switching without breaking it:
    if (isKnownModel && baseArgs.max_tokens > maxOutputTokensForModel) {
      // only warn if max output tokens is provided as input:
      if (maxOutputTokens != null) {
        warnings.push({
          type: 'unsupported',
          feature: 'maxOutputTokens',
          details:
            `${baseArgs.max_tokens} (maxOutputTokens + thinkingBudget) is greater than ${this.modelId} ${maxOutputTokensForModel} max output tokens. ` +
            `The max output tokens have been limited to ${maxOutputTokensForModel}.`,
        });
      }
      baseArgs.max_tokens = maxOutputTokensForModel;
    }

    if (
      anthropicOptions?.mcpServers &&
      anthropicOptions.mcpServers.length > 0
    ) {
      betas.add('mcp-client-2025-04-04');
    }

    if (contextManagement) {
      betas.add('context-management-2025-06-27');

      // Add compaction beta if compact edit is present
      if (contextManagement.edits.some(e => e.type === 'compact_20260112')) {
        betas.add('compact-2026-01-12');
      }
    }

    if (
      anthropicOptions?.container &&
      anthropicOptions.container.skills &&
      anthropicOptions.container.skills.length > 0
    ) {
      betas.add('code-execution-2025-08-25');
      betas.add('skills-2025-10-02');
      betas.add('files-api-2025-04-14');

      if (
        !tools?.some(
          tool =>
            tool.type === 'provider' &&
            (tool.id === 'anthropic.code_execution_20250825' ||
              tool.id === 'anthropic.code_execution_20260120'),
        )
      ) {
        warnings.push({
          type: 'other',
          message: 'code execution tool is required when using skills',
        });
      }
    }

    if (anthropicOptions?.effort) {
      betas.add('effort-2025-11-24');
    }

    if (anthropicOptions?.speed === 'fast') {
      betas.add('fast-mode-2026-02-01');
    }

    // only when streaming: enable fine-grained tool streaming
    if (stream && (anthropicOptions?.toolStreaming ?? true)) {
      betas.add('fine-grained-tool-streaming-2025-05-14');
    }

    const {
      tools: anthropicTools,
      toolChoice: anthropicToolChoice,
      toolWarnings,
      betas: toolsBetas,
    } = await prepareTools(
      jsonResponseTool != null
        ? {
            tools: [...(tools ?? []), jsonResponseTool],
            toolChoice: { type: 'required' },
            disableParallelToolUse: true,
            cacheControlValidator,
            supportsStructuredOutput: false,
            supportsStrictTools,
          }
        : {
            tools: tools ?? [],
            toolChoice,
            disableParallelToolUse: anthropicOptions?.disableParallelToolUse,
            cacheControlValidator,
            supportsStructuredOutput,
            supportsStrictTools,
          },
    );

    // Extract cache control warnings once at the end
    const cacheWarnings = cacheControlValidator.getWarnings();

    return {
      args: {
        ...baseArgs,
        tools: anthropicTools,
        tool_choice: anthropicToolChoice,
        stream: stream === true ? true : undefined, // do not send when not streaming
      },
      warnings: [...warnings, ...toolWarnings, ...cacheWarnings],
      betas: new Set([
        ...betas,
        ...toolsBetas,
        ...userSuppliedBetas,
        ...(anthropicOptions?.anthropicBeta ?? []),
      ]),
      usesJsonResponseTool: jsonResponseTool != null,
      toolNameMapping,
      providerOptionsName,
      usedCustomProviderKey,
    };
  }

  private async getHeaders({
    betas,
    headers,
  }: {
    betas: Set<string>;
    headers: Record<string, string | undefined> | undefined;
  }) {
    return combineHeaders(
      await resolve(this.config.headers),
      headers,
      betas.size > 0 ? { 'anthropic-beta': Array.from(betas).join(',') } : {},
    );
  }

  private async getBetasFromHeaders(
    requestHeaders: Record<string, string | undefined> | undefined,
  ) {
    const configHeaders = await resolve(this.config.headers);

    const configBetaHeader = configHeaders['anthropic-beta'] ?? '';
    const requestBetaHeader = requestHeaders?.['anthropic-beta'] ?? '';

    return new Set(
      [
        ...configBetaHeader.toLowerCase().split(','),
        ...requestBetaHeader.toLowerCase().split(','),
      ]
        .map(beta => beta.trim())
        .filter(beta => beta !== ''),
    );
  }

  private buildRequestUrl(isStreaming: boolean): string {
    return (
      this.config.buildRequestUrl?.(this.config.baseURL, isStreaming) ??
      `${this.config.baseURL}/messages`
    );
  }

  private transformRequestBody(
    args: Record<string, any>,
    betas: Set<string>,
  ): Record<string, any> {
    return this.config.transformRequestBody?.(args, betas) ?? args;
  }

  private extractCitationDocuments(prompt: LanguageModelV3Prompt): Array<{
    title: string;
    filename?: string;
    mediaType: string;
  }> {
    const isCitationPart = (part: {
      type: string;
      mediaType?: string;
      providerOptions?: { anthropic?: { citations?: { enabled?: boolean } } };
    }) => {
      if (part.type !== 'file') {
        return false;
      }

      if (
        part.mediaType !== 'application/pdf' &&
        part.mediaType !== 'text/plain'
      ) {
        return false;
      }

      const anthropic = part.providerOptions?.anthropic;
      const citationsConfig = anthropic?.citations as
        | { enabled?: boolean }
        | undefined;
      return citationsConfig?.enabled ?? false;
    };

    return prompt
      .filter(message => message.role === 'user')
      .flatMap(message => message.content)
      .filter(isCitationPart)
      .map(part => {
        // TypeScript knows this is a file part due to our filter
        const filePart = part as Extract<typeof part, { type: 'file' }>;
        return {
          title: filePart.filename ?? 'Untitled Document',
          filename: filePart.filename,
          mediaType: filePart.mediaType,
        };
      });
  }

  async doGenerate(
    options: LanguageModelV3CallOptions,
  ): Promise<LanguageModelV3GenerateResult> {
    const {
      args,
      warnings,
      betas,
      usesJsonResponseTool,
      toolNameMapping,
      providerOptionsName,
      usedCustomProviderKey,
    } = await this.getArgs({
      ...options,
      stream: false,
      userSuppliedBetas: await this.getBetasFromHeaders(options.headers),
    });

    // Extract citation documents for response processing
    const citationDocuments = [
      ...this.extractCitationDocuments(options.prompt),
    ];

    const markCodeExecutionDynamic = hasWebTool20260209WithoutCodeExecution(
      args.tools,
    );

    const {
      responseHeaders,
      value: response,
      rawValue: rawResponse,
    } = await postJsonToApi({
      url: this.buildRequestUrl(false),
      headers: await this.getHeaders({ betas, headers: options.headers }),
      body: this.transformRequestBody(args, betas),
      failedResponseHandler: anthropicFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        anthropicMessagesResponseSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const content: Array<LanguageModelV3Content> = [];
    const mcpToolCalls: Record<string, LanguageModelV3ToolCall> = {};
    const serverToolCalls: Record<string, string> = {}; // tool_use_id -> provider tool name
    let isJsonResponseFromTool = false;

    // map response content to content array
    for (const part of response.content) {
      switch (part.type) {
        case 'text': {
          if (!usesJsonResponseTool) {
            content.push({ type: 'text', text: part.text });

            // Process citations if present
            if (part.citations) {
              for (const citation of part.citations) {
                const source = createCitationSource(
                  citation,
                  citationDocuments,
                  this.generateId,
                );

                if (source) {
                  content.push(source);
                }
              }
            }
          }
          break;
        }
        case 'thinking': {
          content.push({
            type: 'reasoning',
            text: part.thinking,
            providerMetadata: {
              anthropic: {
                signature: part.signature,
              } satisfies AnthropicReasoningMetadata,
            },
          });
          break;
        }
        case 'redacted_thinking': {
          content.push({
            type: 'reasoning',
            text: '',
            providerMetadata: {
              anthropic: {
                redactedData: part.data,
              } satisfies AnthropicReasoningMetadata,
            },
          });
          break;
        }
        case 'compaction': {
          content.push({
            type: 'text',
            text: part.content,
            providerMetadata: {
              anthropic: {
                type: 'compaction',
              },
            },
          });
          break;
        }
        case 'tool_use': {
          const isJsonResponseTool =
            usesJsonResponseTool && part.name === 'json';

          if (isJsonResponseTool) {
            isJsonResponseFromTool = true;

            // when a json response tool is used, the tool call becomes the text:
            content.push({
              type: 'text',
              text: JSON.stringify(part.input),
            });
          } else {
            const caller = part.caller;
            const callerInfo = caller
              ? {
                  type: caller.type,
                  toolId: 'tool_id' in caller ? caller.tool_id : undefined,
                }
              : undefined;

            content.push({
              type: 'tool-call',
              toolCallId: part.id,
              toolName: part.name,
              input: JSON.stringify(part.input),
              ...(callerInfo && {
                providerMetadata: {
                  anthropic: {
                    caller: callerInfo,
                  },
                },
              }),
            });
          }

          break;
        }
        case 'server_tool_use': {
          // code execution 20250825 needs mapping:
          if (
            part.name === 'text_editor_code_execution' ||
            part.name === 'bash_code_execution'
          ) {
            content.push({
              type: 'tool-call',
              toolCallId: part.id,
              toolName: toolNameMapping.toCustomToolName('code_execution'),
              input: JSON.stringify({ type: part.name, ...part.input }),
              providerExecuted: true,
            });
          } else if (
            part.name === 'web_search' ||
            part.name === 'code_execution' ||
            part.name === 'web_fetch'
          ) {
            // For code_execution, inject 'programmatic-tool-call' type when input has { code } format
            const inputToSerialize =
              part.name === 'code_execution' &&
              part.input != null &&
              typeof part.input === 'object' &&
              'code' in part.input &&
              !('type' in part.input)
                ? { type: 'programmatic-tool-call', ...part.input }
                : part.input;

            content.push({
              type: 'tool-call',
              toolCallId: part.id,
              toolName: toolNameMapping.toCustomToolName(part.name),
              input: JSON.stringify(inputToSerialize),
              providerExecuted: true,
              // We want this 'code_execution' tool call to be allowed even if the tool is not explicitly provided.
              // Since the validation generally bypasses dynamic tools, we mark this specific tool as dynamic.
              ...(markCodeExecutionDynamic && part.name === 'code_execution'
                ? { dynamic: true }
                : {}),
            });
          } else if (
            part.name === 'tool_search_tool_regex' ||
            part.name === 'tool_search_tool_bm25'
          ) {
            serverToolCalls[part.id] = part.name;
            content.push({
              type: 'tool-call',
              toolCallId: part.id,
              toolName: toolNameMapping.toCustomToolName(part.name),
              input: JSON.stringify(part.input),
              providerExecuted: true,
            });
          }

          break;
        }
        case 'mcp_tool_use': {
          mcpToolCalls[part.id] = {
            type: 'tool-call',
            toolCallId: part.id,
            toolName: part.name,
            input: JSON.stringify(part.input),
            providerExecuted: true,
            dynamic: true,
            providerMetadata: {
              anthropic: {
                type: 'mcp-tool-use',
                serverName: part.server_name,
              },
            },
          };
          content.push(mcpToolCalls[part.id]);
          break;
        }
        case 'mcp_tool_result': {
          content.push({
            type: 'tool-result',
            toolCallId: part.tool_use_id,
            toolName: mcpToolCalls[part.tool_use_id].toolName,
            isError: part.is_error,
            result: part.content,
            dynamic: true,
            providerMetadata: mcpToolCalls[part.tool_use_id].providerMetadata,
          });
          break;
        }
        case 'web_fetch_tool_result': {
          if (part.content.type === 'web_fetch_result') {
            citationDocuments.push({
              title: part.content.content.title ?? part.content.url,
              mediaType: part.content.content.source.media_type,
            });
            content.push({
              type: 'tool-result',
              toolCallId: part.tool_use_id,
              toolName: toolNameMapping.toCustomToolName('web_fetch'),
              result: {
                type: 'web_fetch_result',
                url: part.content.url,
                retrievedAt: part.content.retrieved_at,
                content: {
                  type: part.content.content.type,
                  title: part.content.content.title,
                  citations: part.content.content.citations,
                  source: {
                    type: part.content.content.source.type,
                    mediaType: part.content.content.source.media_type,
                    data: part.content.content.source.data,
                  },
                },
              },
            });
          } else if (part.content.type === 'web_fetch_tool_result_error') {
            content.push({
              type: 'tool-result',
              toolCallId: part.tool_use_id,
              toolName: toolNameMapping.toCustomToolName('web_fetch'),
              isError: true,
              result: {
                type: 'web_fetch_tool_result_error',
                errorCode: part.content.error_code,
              },
            });
          }
          break;
        }
        case 'web_search_tool_result': {
          if (Array.isArray(part.content)) {
            content.push({
              type: 'tool-result',
              toolCallId: part.tool_use_id,
              toolName: toolNameMapping.toCustomToolName('web_search'),
              result: part.content.map(result => ({
                url: result.url,
                title: result.title,
                pageAge: result.page_age ?? null,
                encryptedContent: result.encrypted_content,
                type: result.type,
              })),
            });

            for (const result of part.content) {
              content.push({
                type: 'source',
                sourceType: 'url',
                id: this.generateId(),
                url: result.url,
                title: result.title,
                providerMetadata: {
                  anthropic: {
                    pageAge: result.page_age ?? null,
                  },
                },
              });
            }
          } else {
            content.push({
              type: 'tool-result',
              toolCallId: part.tool_use_id,
              toolName: toolNameMapping.toCustomToolName('web_search'),
              isError: true,
              result: {
                type: 'web_search_tool_result_error',
                errorCode: part.content.error_code,
              },
            });
          }
          break;
        }

        // code execution 20250522:
        case 'code_execution_tool_result': {
          if (part.content.type === 'code_execution_result') {
            content.push({
              type: 'tool-result',
              toolCallId: part.tool_use_id,
              toolName: toolNameMapping.toCustomToolName('code_execution'),
              result: {
                type: part.content.type,
                stdout: part.content.stdout,
                stderr: part.content.stderr,
                return_code: part.content.return_code,
                content: part.content.content ?? [],
              },
            });
          } else if (part.content.type === 'encrypted_code_execution_result') {
            content.push({
              type: 'tool-result',
              toolCallId: part.tool_use_id,
              toolName: toolNameMapping.toCustomToolName('code_execution'),
              result: {
                type: part.content.type,
                encrypted_stdout: part.content.encrypted_stdout,
                stderr: part.content.stderr,
                return_code: part.content.return_code,
                content: part.content.content ?? [],
              },
            });
          } else if (part.content.type === 'code_execution_tool_result_error') {
            content.push({
              type: 'tool-result',
              toolCallId: part.tool_use_id,
              toolName: toolNameMapping.toCustomToolName('code_execution'),
              isError: true,
              result: {
                type: 'code_execution_tool_result_error',
                errorCode: part.content.error_code,
              },
            });
          }
          break;
        }

        // code execution 20250825:
        case 'bash_code_execution_tool_result':
        case 'text_editor_code_execution_tool_result': {
          content.push({
            type: 'tool-result',
            toolCallId: part.tool_use_id,
            toolName: toolNameMapping.toCustomToolName('code_execution'),
            result: part.content,
          });
          break;
        }

        // tool search tool results:
        case 'tool_search_tool_result': {
          let providerToolName = serverToolCalls[part.tool_use_id];

          if (providerToolName == null) {
            const bm25CustomName = toolNameMapping.toCustomToolName(
              'tool_search_tool_bm25',
            );
            const regexCustomName = toolNameMapping.toCustomToolName(
              'tool_search_tool_regex',
            );

            if (bm25CustomName !== 'tool_search_tool_bm25') {
              providerToolName = 'tool_search_tool_bm25';
            } else if (regexCustomName !== 'tool_search_tool_regex') {
              providerToolName = 'tool_search_tool_regex';
            } else {
              providerToolName = 'tool_search_tool_regex';
            }
          }

          if (part.content.type === 'tool_search_tool_search_result') {
            content.push({
              type: 'tool-result',
              toolCallId: part.tool_use_id,
              toolName: toolNameMapping.toCustomToolName(providerToolName),
              result: part.content.tool_references.map(ref => ({
                type: ref.type,
                toolName: ref.tool_name,
              })),
            });
          } else {
            content.push({
              type: 'tool-result',
              toolCallId: part.tool_use_id,
              toolName: toolNameMapping.toCustomToolName(providerToolName),
              isError: true,
              result: {
                type: 'tool_search_tool_result_error',
                errorCode: part.content.error_code,
              },
            });
          }
          break;
        }
      }
    }

    return {
      content,
      finishReason: {
        unified: mapAnthropicStopReason({
          finishReason: response.stop_reason,
          isJsonResponseFromTool,
        }),
        raw: response.stop_reason ?? undefined,
      },
      usage: convertAnthropicMessagesUsage({ usage: response.usage }),
      request: { body: args },
      response: {
        id: response.id ?? undefined,
        modelId: response.model ?? undefined,
        headers: responseHeaders,
        body: rawResponse,
      },
      warnings,
      providerMetadata: (() => {
        const anthropicMetadata = {
          usage: response.usage as JSONObject,
          cacheCreationInputTokens:
            response.usage.cache_creation_input_tokens ?? null,
          stopSequence: response.stop_sequence ?? null,

          iterations: response.usage.iterations
            ? response.usage.iterations.map(iter => ({
                type: iter.type,
                inputTokens: iter.input_tokens,
                outputTokens: iter.output_tokens,
              }))
            : null,
          container: response.container
            ? {
                expiresAt: response.container.expires_at,
                id: response.container.id,
                skills:
                  response.container.skills?.map(skill => ({
                    type: skill.type,
                    skillId: skill.skill_id,
                    version: skill.version,
                  })) ?? null,
              }
            : null,
          contextManagement:
            mapAnthropicResponseContextManagement(
              response.context_management,
            ) ?? null,
        } satisfies AnthropicMessageMetadata;

        const providerMetadata: SharedV3ProviderMetadata = {
          anthropic: anthropicMetadata,
        };

        if (usedCustomProviderKey && providerOptionsName !== 'anthropic') {
          providerMetadata[providerOptionsName] = anthropicMetadata;
        }

        return providerMetadata;
      })(),
    };
  }

  async doStream(
    options: LanguageModelV3CallOptions,
  ): Promise<LanguageModelV3StreamResult> {
    const {
      args: body,
      warnings,
      betas,
      usesJsonResponseTool,
      toolNameMapping,
      providerOptionsName,
      usedCustomProviderKey,
    } = await this.getArgs({
      ...options,
      stream: true,
      userSuppliedBetas: await this.getBetasFromHeaders(options.headers),
    });

    // Extract citation documents for response processing
    const citationDocuments = [
      ...this.extractCitationDocuments(options.prompt),
    ];

    const markCodeExecutionDynamic = hasWebTool20260209WithoutCodeExecution(
      body.tools,
    );

    const url = this.buildRequestUrl(true);
    const { responseHeaders, value: response } = await postJsonToApi({
      url,
      headers: await this.getHeaders({ betas, headers: options.headers }),
      body: this.transformRequestBody(body, betas),
      failedResponseHandler: anthropicFailedResponseHandler,
      successfulResponseHandler: createEventSourceResponseHandler(
        anthropicMessagesChunkSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    let finishReason: LanguageModelV3FinishReason = {
      unified: 'other',
      raw: undefined,
    };
    const usage: AnthropicMessagesUsage = {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      iterations: null,
    };

    const contentBlocks: Record<
      number,
      | {
          type: 'tool-call';
          toolCallId: string;
          toolName: string;
          input: string;
          providerExecuted?: boolean;
          firstDelta: boolean;
          providerToolName?: string;
          caller?: {
            type:
              | 'code_execution_20250825'
              | 'code_execution_20260120'
              | 'direct';
            toolId?: string;
          };
        }
      | { type: 'text' | 'reasoning' }
    > = {};
    const mcpToolCalls: Record<string, LanguageModelV3ToolCall> = {};
    const serverToolCalls: Record<string, string> = {}; // tool_use_id -> provider tool name

    let contextManagement:
      | AnthropicMessageMetadata['contextManagement']
      | null = null;
    let rawUsage: JSONObject | undefined = undefined;
    let cacheCreationInputTokens: number | null = null;
    let stopSequence: string | null = null;
    let container: AnthropicMessageMetadata['container'] | null = null;
    let isJsonResponseFromTool = false;

    let blockType:
      | 'text'
      | 'thinking'
      | 'tool_use'
      | 'redacted_thinking'
      | 'server_tool_use'
      | 'web_fetch_tool_result'
      | 'web_search_tool_result'
      | 'code_execution_tool_result'
      | 'text_editor_code_execution_tool_result'
      | 'bash_code_execution_tool_result'
      | 'tool_search_tool_result'
      | 'mcp_tool_use'
      | 'mcp_tool_result'
      | 'compaction'
      | undefined = undefined;

    const generateId = this.generateId;

    const transformedStream = response.pipeThrough(
      new TransformStream<
        ParseResult<InferSchema<typeof anthropicMessagesChunkSchema>>,
        LanguageModelV3StreamPart
      >({
        start(controller) {
          controller.enqueue({ type: 'stream-start', warnings });
        },

        transform(chunk, controller) {
          if (options.includeRawChunks) {
            controller.enqueue({ type: 'raw', rawValue: chunk.rawValue });
          }

          if (!chunk.success) {
            controller.enqueue({ type: 'error', error: chunk.error });
            return;
          }

          const value = chunk.value;

          switch (value.type) {
            case 'ping': {
              return; // ignored
            }

            case 'content_block_start': {
              const part = value.content_block;
              const contentBlockType = part.type;
              blockType = contentBlockType;

              switch (contentBlockType) {
                case 'text': {
                  // when a json response tool is used, the tool call is returned as text,
                  // so we ignore the text content:
                  if (usesJsonResponseTool) {
                    return;
                  }

                  contentBlocks[value.index] = { type: 'text' };
                  controller.enqueue({
                    type: 'text-start',
                    id: String(value.index),
                  });
                  return;
                }

                case 'thinking': {
                  contentBlocks[value.index] = { type: 'reasoning' };
                  controller.enqueue({
                    type: 'reasoning-start',
                    id: String(value.index),
                  });
                  return;
                }

                case 'redacted_thinking': {
                  contentBlocks[value.index] = { type: 'reasoning' };
                  controller.enqueue({
                    type: 'reasoning-start',
                    id: String(value.index),
                    providerMetadata: {
                      anthropic: {
                        redactedData: part.data,
                      } satisfies AnthropicReasoningMetadata,
                    },
                  });
                  return;
                }

                case 'compaction': {
                  contentBlocks[value.index] = { type: 'text' };
                  controller.enqueue({
                    type: 'text-start',
                    id: String(value.index),
                    providerMetadata: {
                      anthropic: {
                        type: 'compaction',
                      },
                    },
                  });
                  return;
                }

                case 'tool_use': {
                  const isJsonResponseTool =
                    usesJsonResponseTool && part.name === 'json';

                  if (isJsonResponseTool) {
                    isJsonResponseFromTool = true;

                    contentBlocks[value.index] = { type: 'text' };

                    controller.enqueue({
                      type: 'text-start',
                      id: String(value.index),
                    });
                  } else {
                    // Extract caller info for type-safe access
                    const caller = part.caller;
                    const callerInfo = caller
                      ? {
                          type: caller.type,
                          toolId:
                            'tool_id' in caller ? caller.tool_id : undefined,
                        }
                      : undefined;

                    // Programmatic tool calling: for deferred tool calls from code_execution,
                    // input may be present directly in content_block_start.
                    // Only use if non-empty (empty {} means input comes via deltas)
                    const hasNonEmptyInput =
                      part.input && Object.keys(part.input).length > 0;
                    const initialInput = hasNonEmptyInput
                      ? JSON.stringify(part.input)
                      : '';

                    contentBlocks[value.index] = {
                      type: 'tool-call',
                      toolCallId: part.id,
                      toolName: part.name,
                      input: initialInput,
                      firstDelta: initialInput.length === 0,
                      ...(callerInfo && { caller: callerInfo }),
                    };

                    controller.enqueue({
                      type: 'tool-input-start',
                      id: part.id,
                      toolName: part.name,
                    });
                  }
                  return;
                }

                case 'server_tool_use': {
                  if (
                    [
                      'web_fetch',
                      'web_search',
                      // code execution 20250825:
                      'code_execution',
                      // code execution 20250825 text editor:
                      'text_editor_code_execution',
                      // code execution 20250825 bash:
                      'bash_code_execution',
                    ].includes(part.name)
                  ) {
                    // map tool names for the code execution 20250825 tool:
                    const providerToolName =
                      part.name === 'text_editor_code_execution' ||
                      part.name === 'bash_code_execution'
                        ? 'code_execution'
                        : part.name;

                    const customToolName =
                      toolNameMapping.toCustomToolName(providerToolName);

                    // Tools like 'web_fetch_20260209' provide input data here.
                    // Other tools like 'code_execution_20260120' provide input data via deltas.
                    // So we only use this if it's non-empty to avoid conflicts.
                    const finalInput =
                      part.input != null &&
                      typeof part.input === 'object' &&
                      Object.keys(part.input).length > 0
                        ? JSON.stringify(part.input)
                        : '';

                    contentBlocks[value.index] = {
                      type: 'tool-call',
                      toolCallId: part.id,
                      toolName: customToolName,
                      input: finalInput,
                      providerExecuted: true,
                      ...(markCodeExecutionDynamic &&
                      providerToolName === 'code_execution'
                        ? { dynamic: true }
                        : {}),
                      firstDelta: true,
                      providerToolName: part.name,
                    };

                    controller.enqueue({
                      type: 'tool-input-start',
                      id: part.id,
                      toolName: customToolName,
                      providerExecuted: true,
                      ...(markCodeExecutionDynamic &&
                      providerToolName === 'code_execution'
                        ? { dynamic: true }
                        : {}),
                    });
                  } else if (
                    part.name === 'tool_search_tool_regex' ||
                    part.name === 'tool_search_tool_bm25'
                  ) {
                    serverToolCalls[part.id] = part.name;
                    const customToolName = toolNameMapping.toCustomToolName(
                      part.name,
                    );

                    contentBlocks[value.index] = {
                      type: 'tool-call',
                      toolCallId: part.id,
                      toolName: customToolName,
                      input: '',
                      providerExecuted: true,
                      firstDelta: true,
                      providerToolName: part.name,
                    };

                    controller.enqueue({
                      type: 'tool-input-start',
                      id: part.id,
                      toolName: customToolName,
                      providerExecuted: true,
                    });
                  }

                  return;
                }

                case 'web_fetch_tool_result': {
                  if (part.content.type === 'web_fetch_result') {
                    citationDocuments.push({
                      title: part.content.content.title ?? part.content.url,
                      mediaType: part.content.content.source.media_type,
                    });
                    controller.enqueue({
                      type: 'tool-result',
                      toolCallId: part.tool_use_id,
                      toolName: toolNameMapping.toCustomToolName('web_fetch'),
                      result: {
                        type: 'web_fetch_result',
                        url: part.content.url,
                        retrievedAt: part.content.retrieved_at,
                        content: {
                          type: part.content.content.type,
                          title: part.content.content.title,
                          citations: part.content.content.citations,
                          source: {
                            type: part.content.content.source.type,
                            mediaType: part.content.content.source.media_type,
                            data: part.content.content.source.data,
                          },
                        },
                      },
                    });
                  } else if (
                    part.content.type === 'web_fetch_tool_result_error'
                  ) {
                    controller.enqueue({
                      type: 'tool-result',
                      toolCallId: part.tool_use_id,
                      toolName: toolNameMapping.toCustomToolName('web_fetch'),
                      isError: true,
                      result: {
                        type: 'web_fetch_tool_result_error',
                        errorCode: part.content.error_code,
                      },
                    });
                  }

                  return;
                }

                case 'web_search_tool_result': {
                  if (Array.isArray(part.content)) {
                    controller.enqueue({
                      type: 'tool-result',
                      toolCallId: part.tool_use_id,
                      toolName: toolNameMapping.toCustomToolName('web_search'),
                      result: part.content.map(result => ({
                        url: result.url,
                        title: result.title,
                        pageAge: result.page_age ?? null,
                        encryptedContent: result.encrypted_content,
                        type: result.type,
                      })),
                    });

                    for (const result of part.content) {
                      controller.enqueue({
                        type: 'source',
                        sourceType: 'url',
                        id: generateId(),
                        url: result.url,
                        title: result.title,
                        providerMetadata: {
                          anthropic: {
                            pageAge: result.page_age ?? null,
                          },
                        },
                      });
                    }
                  } else {
                    controller.enqueue({
                      type: 'tool-result',
                      toolCallId: part.tool_use_id,
                      toolName: toolNameMapping.toCustomToolName('web_search'),
                      isError: true,
                      result: {
                        type: 'web_search_tool_result_error',
                        errorCode: part.content.error_code,
                      },
                    });
                  }
                  return;
                }

                // code execution 20250522:
                case 'code_execution_tool_result': {
                  if (part.content.type === 'code_execution_result') {
                    controller.enqueue({
                      type: 'tool-result',
                      toolCallId: part.tool_use_id,
                      toolName:
                        toolNameMapping.toCustomToolName('code_execution'),
                      result: {
                        type: part.content.type,
                        stdout: part.content.stdout,
                        stderr: part.content.stderr,
                        return_code: part.content.return_code,
                        content: part.content.content ?? [],
                      },
                    });
                  } else if (
                    part.content.type === 'encrypted_code_execution_result'
                  ) {
                    controller.enqueue({
                      type: 'tool-result',
                      toolCallId: part.tool_use_id,
                      toolName:
                        toolNameMapping.toCustomToolName('code_execution'),
                      result: {
                        type: part.content.type,
                        encrypted_stdout: part.content.encrypted_stdout,
                        stderr: part.content.stderr,
                        return_code: part.content.return_code,
                        content: part.content.content ?? [],
                      },
                    });
                  } else if (
                    part.content.type === 'code_execution_tool_result_error'
                  ) {
                    controller.enqueue({
                      type: 'tool-result',
                      toolCallId: part.tool_use_id,
                      toolName:
                        toolNameMapping.toCustomToolName('code_execution'),
                      isError: true,
                      result: {
                        type: 'code_execution_tool_result_error',
                        errorCode: part.content.error_code,
                      },
                    });
                  }

                  return;
                }

                // code execution 20250825:
                case 'bash_code_execution_tool_result':
                case 'text_editor_code_execution_tool_result': {
                  controller.enqueue({
                    type: 'tool-result',
                    toolCallId: part.tool_use_id,
                    toolName:
                      toolNameMapping.toCustomToolName('code_execution'),
                    result: part.content,
                  });
                  return;
                }

                // tool search tool results:
                case 'tool_search_tool_result': {
                  let providerToolName = serverToolCalls[part.tool_use_id];

                  if (providerToolName == null) {
                    const bm25CustomName = toolNameMapping.toCustomToolName(
                      'tool_search_tool_bm25',
                    );
                    const regexCustomName = toolNameMapping.toCustomToolName(
                      'tool_search_tool_regex',
                    );

                    if (bm25CustomName !== 'tool_search_tool_bm25') {
                      providerToolName = 'tool_search_tool_bm25';
                    } else if (regexCustomName !== 'tool_search_tool_regex') {
                      providerToolName = 'tool_search_tool_regex';
                    } else {
                      providerToolName = 'tool_search_tool_regex';
                    }
                  }

                  if (part.content.type === 'tool_search_tool_search_result') {
                    controller.enqueue({
                      type: 'tool-result',
                      toolCallId: part.tool_use_id,
                      toolName:
                        toolNameMapping.toCustomToolName(providerToolName),
                      result: part.content.tool_references.map(ref => ({
                        type: ref.type,
                        toolName: ref.tool_name,
                      })),
                    });
                  } else {
                    controller.enqueue({
                      type: 'tool-result',
                      toolCallId: part.tool_use_id,
                      toolName:
                        toolNameMapping.toCustomToolName(providerToolName),
                      isError: true,
                      result: {
                        type: 'tool_search_tool_result_error',
                        errorCode: part.content.error_code,
                      },
                    });
                  }
                  return;
                }

                case 'mcp_tool_use': {
                  mcpToolCalls[part.id] = {
                    type: 'tool-call',
                    toolCallId: part.id,
                    toolName: part.name,
                    input: JSON.stringify(part.input),
                    providerExecuted: true,
                    dynamic: true,
                    providerMetadata: {
                      anthropic: {
                        type: 'mcp-tool-use',
                        serverName: part.server_name,
                      },
                    },
                  };
                  controller.enqueue(mcpToolCalls[part.id]);
                  return;
                }

                case 'mcp_tool_result': {
                  controller.enqueue({
                    type: 'tool-result',
                    toolCallId: part.tool_use_id,
                    toolName: mcpToolCalls[part.tool_use_id].toolName,
                    isError: part.is_error,
                    result: part.content,
                    dynamic: true,
                    providerMetadata:
                      mcpToolCalls[part.tool_use_id].providerMetadata,
                  });
                  return;
                }

                default: {
                  const _exhaustiveCheck: never = contentBlockType;
                  throw new Error(
                    `Unsupported content block type: ${_exhaustiveCheck}`,
                  );
                }
              }
            }

            case 'content_block_stop': {
              // when finishing a tool call block, send the full tool call:
              if (contentBlocks[value.index] != null) {
                const contentBlock = contentBlocks[value.index];

                switch (contentBlock.type) {
                  case 'text': {
                    controller.enqueue({
                      type: 'text-end',
                      id: String(value.index),
                    });
                    break;
                  }

                  case 'reasoning': {
                    controller.enqueue({
                      type: 'reasoning-end',
                      id: String(value.index),
                    });
                    break;
                  }

                  case 'tool-call':
                    // when a json response tool is used, the tool call is returned as text,
                    // so we ignore the tool call content:
                    const isJsonResponseTool =
                      usesJsonResponseTool && contentBlock.toolName === 'json';

                    if (!isJsonResponseTool) {
                      controller.enqueue({
                        type: 'tool-input-end',
                        id: contentBlock.toolCallId,
                      });

                      // For code_execution, inject 'programmatic-tool-call' type
                      // when input has { code } format (programmatic tool calling)
                      let finalInput =
                        contentBlock.input === '' ? '{}' : contentBlock.input;
                      if (contentBlock.providerToolName === 'code_execution') {
                        try {
                          const parsed = JSON.parse(finalInput);
                          if (
                            parsed != null &&
                            typeof parsed === 'object' &&
                            'code' in parsed &&
                            !('type' in parsed)
                          ) {
                            finalInput = JSON.stringify({
                              type: 'programmatic-tool-call',
                              ...parsed,
                            });
                          }
                        } catch {
                          // ignore parse errors, use original input
                        }
                      }

                      controller.enqueue({
                        type: 'tool-call',
                        toolCallId: contentBlock.toolCallId,
                        toolName: contentBlock.toolName,
                        input: finalInput,
                        providerExecuted: contentBlock.providerExecuted,
                        ...(markCodeExecutionDynamic &&
                        contentBlock.providerToolName === 'code_execution'
                          ? { dynamic: true }
                          : {}),
                        ...(contentBlock.caller && {
                          providerMetadata: {
                            anthropic: {
                              caller: contentBlock.caller,
                            },
                          },
                        }),
                      });
                    }
                    break;
                }

                delete contentBlocks[value.index];
              }

              blockType = undefined; // reset block type

              return;
            }

            case 'content_block_delta': {
              const deltaType = value.delta.type;

              switch (deltaType) {
                case 'text_delta': {
                  // when a json response tool is used, the tool call is returned as text,
                  // so we ignore the text content:
                  if (usesJsonResponseTool) {
                    return; // excluding the text-start will also exclude the text-end
                  }

                  controller.enqueue({
                    type: 'text-delta',
                    id: String(value.index),
                    delta: value.delta.text,
                  });

                  return;
                }

                case 'thinking_delta': {
                  controller.enqueue({
                    type: 'reasoning-delta',
                    id: String(value.index),
                    delta: value.delta.thinking,
                  });

                  return;
                }

                case 'signature_delta': {
                  // signature are only supported on thinking blocks:
                  if (blockType === 'thinking') {
                    controller.enqueue({
                      type: 'reasoning-delta',
                      id: String(value.index),
                      delta: '',
                      providerMetadata: {
                        anthropic: {
                          signature: value.delta.signature,
                        } satisfies AnthropicReasoningMetadata,
                      },
                    });
                  }

                  return;
                }

                case 'compaction_delta': {
                  if (value.delta.content != null) {
                    controller.enqueue({
                      type: 'text-delta',
                      id: String(value.index),
                      delta: value.delta.content,
                    });
                  }

                  return;
                }

                case 'input_json_delta': {
                  const contentBlock = contentBlocks[value.index];
                  let delta = value.delta.partial_json;

                  // skip empty deltas to enable replacing the first character
                  // in the code execution 20250825 tool.
                  if (delta.length === 0) {
                    return;
                  }

                  if (isJsonResponseFromTool) {
                    if (contentBlock?.type !== 'text') {
                      return; // exclude reasoning
                    }

                    controller.enqueue({
                      type: 'text-delta',
                      id: String(value.index),
                      delta,
                    });
                  } else {
                    if (contentBlock?.type !== 'tool-call') {
                      return;
                    }

                    // for the code execution 20250825, we need to add
                    // the type to the delta and change the tool name.
                    if (
                      contentBlock.firstDelta &&
                      (contentBlock.providerToolName ===
                        'bash_code_execution' ||
                        contentBlock.providerToolName ===
                          'text_editor_code_execution')
                    ) {
                      delta = `{"type": "${contentBlock.providerToolName}",${delta.substring(1)}`;
                    }

                    controller.enqueue({
                      type: 'tool-input-delta',
                      id: contentBlock.toolCallId,
                      delta,
                    });

                    contentBlock.input += delta;
                    contentBlock.firstDelta = false;
                  }

                  return;
                }

                case 'citations_delta': {
                  const citation = value.delta.citation;
                  const source = createCitationSource(
                    citation,
                    citationDocuments,
                    generateId,
                  );

                  if (source) {
                    controller.enqueue(source);
                  }

                  return;
                }

                default: {
                  const _exhaustiveCheck: never = deltaType;
                  throw new Error(
                    `Unsupported delta type: ${_exhaustiveCheck}`,
                  );
                }
              }
            }

            case 'message_start': {
              usage.input_tokens = value.message.usage.input_tokens;
              usage.cache_read_input_tokens =
                value.message.usage.cache_read_input_tokens ?? 0;
              usage.cache_creation_input_tokens =
                value.message.usage.cache_creation_input_tokens ?? 0;

              rawUsage = {
                ...(value.message.usage as JSONObject),
              };

              cacheCreationInputTokens =
                value.message.usage.cache_creation_input_tokens ?? null;

              if (value.message.container != null) {
                container = {
                  expiresAt: value.message.container.expires_at,
                  id: value.message.container.id,
                  skills: null,
                };
              }

              if (value.message.stop_reason != null) {
                finishReason = {
                  unified: mapAnthropicStopReason({
                    finishReason: value.message.stop_reason,
                    isJsonResponseFromTool,
                  }),
                  raw: value.message.stop_reason,
                };
              }

              controller.enqueue({
                type: 'response-metadata',
                id: value.message.id ?? undefined,
                modelId: value.message.model ?? undefined,
              });

              // Programmatic tool calling: process pre-populated content blocks
              // (for deferred tool calls, content may be in message_start)
              if (value.message.content != null) {
                for (
                  let contentIndex = 0;
                  contentIndex < value.message.content.length;
                  contentIndex++
                ) {
                  const part = value.message.content[contentIndex];
                  if (part.type === 'tool_use') {
                    const caller = part.caller;
                    const callerInfo = caller
                      ? {
                          type: caller.type,
                          toolId:
                            'tool_id' in caller ? caller.tool_id : undefined,
                        }
                      : undefined;

                    controller.enqueue({
                      type: 'tool-input-start',
                      id: part.id,
                      toolName: part.name,
                    });

                    const inputStr = JSON.stringify(part.input ?? {});
                    controller.enqueue({
                      type: 'tool-input-delta',
                      id: part.id,
                      delta: inputStr,
                    });

                    controller.enqueue({
                      type: 'tool-input-end',
                      id: part.id,
                    });

                    controller.enqueue({
                      type: 'tool-call',
                      toolCallId: part.id,
                      toolName: part.name,
                      input: inputStr,
                      ...(callerInfo && {
                        providerMetadata: {
                          anthropic: {
                            caller: callerInfo,
                          },
                        },
                      }),
                    });
                  }
                }
              }

              return;
            }

            case 'message_delta': {
              if (
                value.usage.input_tokens != null &&
                usage.input_tokens !== value.usage.input_tokens
              ) {
                usage.input_tokens = value.usage.input_tokens;
              }
              usage.output_tokens = value.usage.output_tokens;

              if (value.usage.cache_read_input_tokens != null) {
                usage.cache_read_input_tokens =
                  value.usage.cache_read_input_tokens;
              }
              if (value.usage.cache_creation_input_tokens != null) {
                usage.cache_creation_input_tokens =
                  value.usage.cache_creation_input_tokens;
                cacheCreationInputTokens =
                  value.usage.cache_creation_input_tokens;
              }
              if (value.usage.iterations != null) {
                usage.iterations = value.usage.iterations;
              }

              finishReason = {
                unified: mapAnthropicStopReason({
                  finishReason: value.delta.stop_reason,
                  isJsonResponseFromTool,
                }),
                raw: value.delta.stop_reason ?? undefined,
              };

              stopSequence = value.delta.stop_sequence ?? null;
              container =
                value.delta.container != null
                  ? {
                      expiresAt: value.delta.container.expires_at,
                      id: value.delta.container.id,
                      skills:
                        value.delta.container.skills?.map(skill => ({
                          type: skill.type,
                          skillId: skill.skill_id,
                          version: skill.version,
                        })) ?? null,
                    }
                  : null;

              if (value.context_management) {
                contextManagement = mapAnthropicResponseContextManagement(
                  value.context_management,
                );
              }

              rawUsage = {
                ...rawUsage,
                ...(value.usage as JSONObject),
              };

              return;
            }

            case 'message_stop': {
              const anthropicMetadata = {
                usage: (rawUsage as JSONObject) ?? null,
                cacheCreationInputTokens,
                stopSequence,
                iterations: usage.iterations
                  ? usage.iterations.map(iter => ({
                      type: iter.type,
                      inputTokens: iter.input_tokens,
                      outputTokens: iter.output_tokens,
                    }))
                  : null,
                container,
                contextManagement,
              } satisfies AnthropicMessageMetadata;

              const providerMetadata: SharedV3ProviderMetadata = {
                anthropic: anthropicMetadata,
              };

              if (
                usedCustomProviderKey &&
                providerOptionsName !== 'anthropic'
              ) {
                providerMetadata[providerOptionsName] = anthropicMetadata;
              }

              controller.enqueue({
                type: 'finish',
                finishReason,
                usage: convertAnthropicMessagesUsage({ usage, rawUsage }),
                providerMetadata,
              });
              return;
            }

            case 'error': {
              controller.enqueue({ type: 'error', error: value.error });
              return;
            }

            default: {
              const _exhaustiveCheck: never = value;
              throw new Error(`Unsupported chunk type: ${_exhaustiveCheck}`);
            }
          }
        },
      }),
    );

    // The first chunk needs to be pulled immediately to check if it is an error
    const [streamForFirstChunk, streamForConsumer] = transformedStream.tee();

    const firstChunkReader = streamForFirstChunk.getReader();
    try {
      await firstChunkReader.read(); // streamStart comes first, ignored

      let result = await firstChunkReader.read();

      // when raw chunks are enabled, the first chunk is a raw chunk, so we need to read the next chunk
      if (result.value?.type === 'raw') {
        result = await firstChunkReader.read();
      }

      // The Anthropic API returns 200 responses when there are overloaded errors.
      // We handle the case where the first chunk is an error here and transform
      // it into an APICallError.
      if (result.value?.type === 'error') {
        const error = result.value.error as { message: string; type: string };

        throw new APICallError({
          message: error.message,
          url,
          requestBodyValues: body,
          statusCode: error.type === 'overloaded_error' ? 529 : 500,
          responseHeaders,
          responseBody: JSON.stringify(error),
          isRetryable: error.type === 'overloaded_error',
        });
      }
    } finally {
      firstChunkReader.cancel().catch(() => {});
      firstChunkReader.releaseLock();
    }

    return {
      stream: streamForConsumer,
      request: { body },
      response: { headers: responseHeaders },
    };
  }
}

/**
 * Returns the capabilities of a Claude model that are used for defaults and feature selection.
 *
 * @see https://docs.claude.com/en/docs/about-claude/models/overview#model-comparison-table
 * @see https://platform.claude.com/docs/en/build-with-claude/structured-outputs
 */
function getModelCapabilities(modelId: string): {
  maxOutputTokens: number;
  supportsStructuredOutput: boolean;
  isKnownModel: boolean;
} {
  if (
    modelId.includes('claude-sonnet-4-6') ||
    modelId.includes('claude-opus-4-6')
  ) {
    return {
      maxOutputTokens: 128000,
      supportsStructuredOutput: true,
      isKnownModel: true,
    };
  } else if (
    modelId.includes('claude-sonnet-4-5') ||
    modelId.includes('claude-opus-4-5') ||
    modelId.includes('claude-haiku-4-5')
  ) {
    return {
      maxOutputTokens: 64000,
      supportsStructuredOutput: true,
      isKnownModel: true,
    };
  } else if (modelId.includes('claude-opus-4-1')) {
    return {
      maxOutputTokens: 32000,
      supportsStructuredOutput: true,
      isKnownModel: true,
    };
  } else if (modelId.includes('claude-sonnet-4-')) {
    return {
      maxOutputTokens: 64000,
      supportsStructuredOutput: false,
      isKnownModel: true,
    };
  } else if (modelId.includes('claude-opus-4-')) {
    return {
      maxOutputTokens: 32000,
      supportsStructuredOutput: false,
      isKnownModel: true,
    };
  } else if (modelId.includes('claude-3-haiku')) {
    return {
      maxOutputTokens: 4096,
      supportsStructuredOutput: false,
      isKnownModel: true,
    };
  } else {
    return {
      maxOutputTokens: 4096,
      supportsStructuredOutput: false,
      isKnownModel: false,
    };
  }
}

function hasWebTool20260209WithoutCodeExecution(
  tools: AnthropicTool[] | undefined,
): boolean {
  if (!tools) {
    return false;
  }
  let hasWebTool20260209 = false;
  let hasCodeExecutionTool = false;
  for (const tool of tools) {
    if (
      'type' in tool &&
      (tool.type === 'web_fetch_20260209' ||
        tool.type === 'web_search_20260209')
    ) {
      hasWebTool20260209 = true;
      continue;
    }
    if (tool.name === 'code_execution') {
      hasCodeExecutionTool = true;
      break;
    }
  }
  return hasWebTool20260209 && !hasCodeExecutionTool;
}

function mapAnthropicResponseContextManagement(
  contextManagement: AnthropicResponseContextManagement | null | undefined,
): AnthropicMessageMetadata['contextManagement'] | null {
  return contextManagement
    ? {
        appliedEdits: contextManagement.applied_edits
          .map(edit => {
            const strategy = edit.type;

            switch (strategy) {
              case 'clear_tool_uses_20250919':
                return {
                  type: edit.type,
                  clearedToolUses: edit.cleared_tool_uses,
                  clearedInputTokens: edit.cleared_input_tokens,
                };

              case 'clear_thinking_20251015':
                return {
                  type: edit.type,
                  clearedThinkingTurns: edit.cleared_thinking_turns,
                  clearedInputTokens: edit.cleared_input_tokens,
                };

              case 'compact_20260112':
                return {
                  type: edit.type,
                };
            }
          })
          .filter(edit => edit !== undefined),
      }
    : null;
}
