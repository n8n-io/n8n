import {
  SharedV3Warning,
  LanguageModelV3DataContent,
  LanguageModelV3Message,
  LanguageModelV3Prompt,
  SharedV3ProviderMetadata,
  UnsupportedFunctionalityError,
} from '@ai-sdk/provider';
import {
  convertBase64ToUint8Array,
  convertToBase64,
  parseProviderOptions,
  validateTypes,
  isNonNullable,
  ToolNameMapping,
} from '@ai-sdk/provider-utils';
import {
  AnthropicAssistantMessage,
  AnthropicMessagesPrompt,
  anthropicReasoningMetadataSchema,
  AnthropicToolResultContent,
  AnthropicUserMessage,
  AnthropicWebFetchToolResultContent,
} from './anthropic-messages-api';
import { anthropicFilePartProviderOptions } from './anthropic-messages-options';
import { CacheControlValidator } from './get-cache-control';
import { codeExecution_20250522OutputSchema } from './tool/code-execution_20250522';
import { codeExecution_20250825OutputSchema } from './tool/code-execution_20250825';
import { codeExecution_20260120OutputSchema } from './tool/code-execution_20260120';
import { toolSearchRegex_20251119OutputSchema as toolSearchOutputSchema } from './tool/tool-search-regex_20251119';
import { webFetch_20250910OutputSchema } from './tool/web-fetch-20250910';
import { webSearch_20250305OutputSchema } from './tool/web-search_20250305';

function convertToString(data: LanguageModelV3DataContent): string {
  if (typeof data === 'string') {
    return new TextDecoder().decode(convertBase64ToUint8Array(data));
  }

  if (data instanceof Uint8Array) {
    return new TextDecoder().decode(data);
  }

  if (data instanceof URL) {
    throw new UnsupportedFunctionalityError({
      functionality: 'URL-based text documents are not supported for citations',
    });
  }

  throw new UnsupportedFunctionalityError({
    functionality: `unsupported data type for text documents: ${typeof data}`,
  });
}

/**
 * Checks if data is a URL (either a URL object or a URL string).
 */
function isUrlData(
  data: LanguageModelV3DataContent,
): data is URL | (string & { __brand: 'url-string' }) {
  return data instanceof URL || isUrlString(data);
}

function isUrlString(data: LanguageModelV3DataContent): boolean {
  return typeof data === 'string' && /^https?:\/\//i.test(data);
}

function getUrlString(data: LanguageModelV3DataContent): string {
  return data instanceof URL ? data.toString() : (data as string);
}

export async function convertToAnthropicMessagesPrompt({
  prompt,
  sendReasoning,
  warnings,
  cacheControlValidator,
  toolNameMapping,
}: {
  prompt: LanguageModelV3Prompt;
  sendReasoning: boolean;
  warnings: SharedV3Warning[];
  cacheControlValidator?: CacheControlValidator;
  toolNameMapping: ToolNameMapping;
}): Promise<{
  prompt: AnthropicMessagesPrompt;
  betas: Set<string>;
}> {
  const betas = new Set<string>();
  const blocks = groupIntoBlocks(prompt);
  const validator = cacheControlValidator || new CacheControlValidator();

  let system: AnthropicMessagesPrompt['system'] = undefined;
  const messages: AnthropicMessagesPrompt['messages'] = [];

  async function shouldEnableCitations(
    providerMetadata: SharedV3ProviderMetadata | undefined,
  ): Promise<boolean> {
    const anthropicOptions = await parseProviderOptions({
      provider: 'anthropic',
      providerOptions: providerMetadata,
      schema: anthropicFilePartProviderOptions,
    });

    return anthropicOptions?.citations?.enabled ?? false;
  }

  async function getDocumentMetadata(
    providerMetadata: SharedV3ProviderMetadata | undefined,
  ): Promise<{ title?: string; context?: string }> {
    const anthropicOptions = await parseProviderOptions({
      provider: 'anthropic',
      providerOptions: providerMetadata,
      schema: anthropicFilePartProviderOptions,
    });

    return {
      title: anthropicOptions?.title,
      context: anthropicOptions?.context,
    };
  }

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const isLastBlock = i === blocks.length - 1;
    const type = block.type;

    switch (type) {
      case 'system': {
        if (system != null) {
          throw new UnsupportedFunctionalityError({
            functionality:
              'Multiple system messages that are separated by user/assistant messages',
          });
        }

        system = block.messages.map(({ content, providerOptions }) => ({
          type: 'text',
          text: content,
          cache_control: validator.getCacheControl(providerOptions, {
            type: 'system message',
            canCache: true,
          }),
        }));

        break;
      }

      case 'user': {
        // combines all user and tool messages in this block into a single message:
        const anthropicContent: AnthropicUserMessage['content'] = [];

        for (const message of block.messages) {
          const { role, content } = message;
          switch (role) {
            case 'user': {
              for (let j = 0; j < content.length; j++) {
                const part = content[j];

                // cache control: first add cache control from part.
                // for the last part of a message,
                // check also if the message has cache control.
                const isLastPart = j === content.length - 1;

                const cacheControl =
                  validator.getCacheControl(part.providerOptions, {
                    type: 'user message part',
                    canCache: true,
                  }) ??
                  (isLastPart
                    ? validator.getCacheControl(message.providerOptions, {
                        type: 'user message',
                        canCache: true,
                      })
                    : undefined);

                switch (part.type) {
                  case 'text': {
                    anthropicContent.push({
                      type: 'text',
                      text: part.text,
                      cache_control: cacheControl,
                    });
                    break;
                  }

                  case 'file': {
                    if (part.mediaType.startsWith('image/')) {
                      anthropicContent.push({
                        type: 'image',
                        source: isUrlData(part.data)
                          ? {
                              type: 'url',
                              url: getUrlString(part.data),
                            }
                          : {
                              type: 'base64',
                              media_type:
                                part.mediaType === 'image/*'
                                  ? 'image/jpeg'
                                  : part.mediaType,
                              data: convertToBase64(part.data),
                            },
                        cache_control: cacheControl,
                      });
                    } else if (part.mediaType === 'application/pdf') {
                      betas.add('pdfs-2024-09-25');

                      const enableCitations = await shouldEnableCitations(
                        part.providerOptions,
                      );

                      const metadata = await getDocumentMetadata(
                        part.providerOptions,
                      );

                      anthropicContent.push({
                        type: 'document',
                        source: isUrlData(part.data)
                          ? {
                              type: 'url',
                              url: getUrlString(part.data),
                            }
                          : {
                              type: 'base64',
                              media_type: 'application/pdf',
                              data: convertToBase64(part.data),
                            },
                        title: metadata.title ?? part.filename,
                        ...(metadata.context && { context: metadata.context }),
                        ...(enableCitations && {
                          citations: { enabled: true },
                        }),
                        cache_control: cacheControl,
                      });
                    } else if (part.mediaType === 'text/plain') {
                      const enableCitations = await shouldEnableCitations(
                        part.providerOptions,
                      );

                      const metadata = await getDocumentMetadata(
                        part.providerOptions,
                      );

                      anthropicContent.push({
                        type: 'document',
                        source: isUrlData(part.data)
                          ? {
                              type: 'url',
                              url: getUrlString(part.data),
                            }
                          : {
                              type: 'text',
                              media_type: 'text/plain',
                              data: convertToString(part.data),
                            },
                        title: metadata.title ?? part.filename,
                        ...(metadata.context && { context: metadata.context }),
                        ...(enableCitations && {
                          citations: { enabled: true },
                        }),
                        cache_control: cacheControl,
                      });
                    } else {
                      throw new UnsupportedFunctionalityError({
                        functionality: `media type: ${part.mediaType}`,
                      });
                    }

                    break;
                  }
                }
              }

              break;
            }
            case 'tool': {
              for (let i = 0; i < content.length; i++) {
                const part = content[i];

                if (part.type === 'tool-approval-response') {
                  continue;
                }

                // cache control: first add cache control from part.
                // for the last part of a message,
                // check also if the message has cache control.
                const isLastPart = i === content.length - 1;

                const cacheControl =
                  validator.getCacheControl(part.providerOptions, {
                    type: 'tool result part',
                    canCache: true,
                  }) ??
                  (isLastPart
                    ? validator.getCacheControl(message.providerOptions, {
                        type: 'tool result message',
                        canCache: true,
                      })
                    : undefined);

                const output = part.output;
                let contentValue: AnthropicToolResultContent['content'];
                switch (output.type) {
                  case 'content':
                    contentValue = output.value
                      .map(contentPart => {
                        switch (contentPart.type) {
                          case 'text':
                            return {
                              type: 'text' as const,
                              text: contentPart.text,
                            };
                          case 'image-data': {
                            return {
                              type: 'image' as const,
                              source: {
                                type: 'base64' as const,
                                media_type: contentPart.mediaType,
                                data: contentPart.data,
                              },
                            };
                          }
                          case 'image-url': {
                            return {
                              type: 'image' as const,
                              source: {
                                type: 'url' as const,
                                url: contentPart.url,
                              },
                            };
                          }
                          case 'file-url': {
                            return {
                              type: 'document' as const,
                              source: {
                                type: 'url' as const,
                                url: contentPart.url,
                              },
                            };
                          }
                          case 'file-data': {
                            if (contentPart.mediaType === 'application/pdf') {
                              betas.add('pdfs-2024-09-25');
                              return {
                                type: 'document' as const,
                                source: {
                                  type: 'base64' as const,
                                  media_type: contentPart.mediaType,
                                  data: contentPart.data,
                                },
                              };
                            }

                            warnings.push({
                              type: 'other',
                              message: `unsupported tool content part type: ${contentPart.type} with media type: ${contentPart.mediaType}`,
                            });

                            return undefined;
                          }
                          case 'custom': {
                            const anthropicOptions = contentPart.providerOptions
                              ?.anthropic as
                              | { type: string; toolName?: string }
                              | undefined;
                            if (anthropicOptions?.type === 'tool-reference') {
                              return {
                                type: 'tool_reference' as const,
                                tool_name: anthropicOptions.toolName!,
                              };
                            }
                            warnings.push({
                              type: 'other',
                              message: `unsupported custom tool content part`,
                            });
                            return undefined;
                          }
                          default: {
                            warnings.push({
                              type: 'other',
                              message: `unsupported tool content part type: ${contentPart.type}`,
                            });

                            return undefined;
                          }
                        }
                      })
                      .filter(isNonNullable);
                    break;
                  case 'text':
                  case 'error-text':
                    contentValue = output.value;
                    break;
                  case 'execution-denied':
                    contentValue = output.reason ?? 'Tool execution denied.';
                    break;
                  case 'json':
                  case 'error-json':
                  default:
                    contentValue = JSON.stringify(output.value);
                    break;
                }

                anthropicContent.push({
                  type: 'tool_result',
                  tool_use_id: part.toolCallId,
                  content: contentValue,
                  is_error:
                    output.type === 'error-text' || output.type === 'error-json'
                      ? true
                      : undefined,
                  cache_control: cacheControl,
                });
              }

              break;
            }
            default: {
              const _exhaustiveCheck: never = role;
              throw new Error(`Unsupported role: ${_exhaustiveCheck}`);
            }
          }
        }

        messages.push({ role: 'user', content: anthropicContent });

        break;
      }

      case 'assistant': {
        // combines multiple assistant messages in this block into a single message:
        const anthropicContent: AnthropicAssistantMessage['content'] = [];

        const mcpToolUseIds = new Set<string>();

        for (let j = 0; j < block.messages.length; j++) {
          const message = block.messages[j];
          const isLastMessage = j === block.messages.length - 1;
          const { content } = message;

          for (let k = 0; k < content.length; k++) {
            const part = content[k];
            const isLastContentPart = k === content.length - 1;

            // cache control: first add cache control from part.
            // for the last part of a message,
            // check also if the message has cache control.
            const cacheControl =
              validator.getCacheControl(part.providerOptions, {
                type: 'assistant message part',
                canCache: true,
              }) ??
              (isLastContentPart
                ? validator.getCacheControl(message.providerOptions, {
                    type: 'assistant message',
                    canCache: true,
                  })
                : undefined);

            switch (part.type) {
              case 'text': {
                // Check if this is a compaction block (via providerMetadata)
                const textMetadata = part.providerOptions?.anthropic as
                  | { type?: string }
                  | undefined;

                if (textMetadata?.type === 'compaction') {
                  anthropicContent.push({
                    type: 'compaction',
                    content: part.text,
                    cache_control: cacheControl,
                  });
                } else {
                  anthropicContent.push({
                    type: 'text',
                    text:
                      // trim the last text part if it's the last message in the block
                      // because Anthropic does not allow trailing whitespace
                      // in pre-filled assistant responses
                      isLastBlock && isLastMessage && isLastContentPart
                        ? part.text.trim()
                        : part.text,

                    cache_control: cacheControl,
                  });
                }
                break;
              }

              case 'reasoning': {
                if (sendReasoning) {
                  const reasoningMetadata = await parseProviderOptions({
                    provider: 'anthropic',
                    providerOptions: part.providerOptions,
                    schema: anthropicReasoningMetadataSchema,
                  });

                  if (reasoningMetadata != null) {
                    if (reasoningMetadata.signature != null) {
                      // Note: thinking blocks cannot have cache_control directly
                      // They are cached implicitly when in previous assistant turns
                      // Validate to provide helpful error message
                      validator.getCacheControl(part.providerOptions, {
                        type: 'thinking block',
                        canCache: false,
                      });
                      anthropicContent.push({
                        type: 'thinking',
                        thinking: part.text,
                        signature: reasoningMetadata.signature,
                      });
                    } else if (reasoningMetadata.redactedData != null) {
                      // Note: redacted thinking blocks cannot have cache_control directly
                      // They are cached implicitly when in previous assistant turns
                      // Validate to provide helpful error message
                      validator.getCacheControl(part.providerOptions, {
                        type: 'redacted thinking block',
                        canCache: false,
                      });
                      anthropicContent.push({
                        type: 'redacted_thinking',
                        data: reasoningMetadata.redactedData,
                      });
                    } else {
                      warnings.push({
                        type: 'other',
                        message: 'unsupported reasoning metadata',
                      });
                    }
                  } else {
                    warnings.push({
                      type: 'other',
                      message: 'unsupported reasoning metadata',
                    });
                  }
                } else {
                  warnings.push({
                    type: 'other',
                    message:
                      'sending reasoning content is disabled for this model',
                  });
                }
                break;
              }

              case 'tool-call': {
                if (part.providerExecuted) {
                  const providerToolName = toolNameMapping.toProviderToolName(
                    part.toolName,
                  );
                  const isMcpToolUse =
                    part.providerOptions?.anthropic?.type === 'mcp-tool-use';

                  if (isMcpToolUse) {
                    mcpToolUseIds.add(part.toolCallId);

                    const serverName =
                      part.providerOptions?.anthropic?.serverName;

                    if (serverName == null || typeof serverName !== 'string') {
                      warnings.push({
                        type: 'other',
                        message:
                          'mcp tool use server name is required and must be a string',
                      });
                      break;
                    }

                    anthropicContent.push({
                      type: 'mcp_tool_use',
                      id: part.toolCallId,
                      name: part.toolName,
                      input: part.input,
                      server_name: serverName,
                      cache_control: cacheControl,
                    });
                  } else if (
                    // code execution 20250825:
                    providerToolName === 'code_execution' &&
                    part.input != null &&
                    typeof part.input === 'object' &&
                    'type' in part.input &&
                    typeof part.input.type === 'string' &&
                    (part.input.type === 'bash_code_execution' ||
                      part.input.type === 'text_editor_code_execution')
                  ) {
                    anthropicContent.push({
                      type: 'server_tool_use',
                      id: part.toolCallId,
                      name: part.input.type, // map back to subtool name
                      input: part.input,
                      cache_control: cacheControl,
                    });
                  } else if (
                    // code execution 20250825 programmatic tool calling:
                    // Strip the fake 'programmatic-tool-call' type before sending to Anthropic
                    providerToolName === 'code_execution' &&
                    part.input != null &&
                    typeof part.input === 'object' &&
                    'type' in part.input &&
                    part.input.type === 'programmatic-tool-call'
                  ) {
                    const { type: _, ...inputWithoutType } = part.input as {
                      type: string;
                      code: string;
                    };
                    anthropicContent.push({
                      type: 'server_tool_use',
                      id: part.toolCallId,
                      name: 'code_execution',
                      input: inputWithoutType,
                      cache_control: cacheControl,
                    });
                  } else {
                    if (
                      providerToolName === 'code_execution' || // code execution 20250522
                      providerToolName === 'web_fetch' ||
                      providerToolName === 'web_search'
                    ) {
                      anthropicContent.push({
                        type: 'server_tool_use',
                        id: part.toolCallId,
                        name: providerToolName,
                        input: part.input,
                        cache_control: cacheControl,
                      });
                    } else if (
                      providerToolName === 'tool_search_tool_regex' ||
                      providerToolName === 'tool_search_tool_bm25'
                    ) {
                      anthropicContent.push({
                        type: 'server_tool_use',
                        id: part.toolCallId,
                        name: providerToolName,
                        input: part.input,
                        cache_control: cacheControl,
                      });
                    } else {
                      warnings.push({
                        type: 'other',
                        message: `provider executed tool call for tool ${part.toolName} is not supported`,
                      });
                    }
                  }

                  break;
                }

                // Extract caller info from provider options for programmatic tool calling
                const callerOptions = part.providerOptions?.anthropic as
                  | { caller?: { type: string; toolId?: string } }
                  | undefined;
                const caller = callerOptions?.caller
                  ? (callerOptions.caller.type === 'code_execution_20250825' ||
                      callerOptions.caller.type ===
                        'code_execution_20260120') &&
                    callerOptions.caller.toolId
                    ? {
                        type: callerOptions.caller.type as
                          | 'code_execution_20250825'
                          | 'code_execution_20260120',
                        tool_id: callerOptions.caller.toolId,
                      }
                    : callerOptions.caller.type === 'direct'
                      ? { type: 'direct' as const }
                      : undefined
                  : undefined;

                anthropicContent.push({
                  type: 'tool_use',
                  id: part.toolCallId,
                  name: part.toolName,
                  input: part.input,
                  ...(caller && { caller }),
                  cache_control: cacheControl,
                });
                break;
              }

              case 'tool-result': {
                const providerToolName = toolNameMapping.toProviderToolName(
                  part.toolName,
                );

                if (mcpToolUseIds.has(part.toolCallId)) {
                  const output = part.output;

                  if (output.type !== 'json' && output.type !== 'error-json') {
                    warnings.push({
                      type: 'other',
                      message: `provider executed tool result output type ${output.type} for tool ${part.toolName} is not supported`,
                    });

                    break;
                  }

                  anthropicContent.push({
                    type: 'mcp_tool_result',
                    tool_use_id: part.toolCallId,
                    is_error: output.type === 'error-json',
                    content: output.value as unknown as
                      | string
                      | Array<{ type: 'text'; text: string }>,
                    cache_control: cacheControl,
                  });
                } else if (providerToolName === 'code_execution') {
                  const output = part.output;

                  // Handle error types for code_execution tools (e.g., from programmatic tool calling)
                  if (
                    output.type === 'error-text' ||
                    output.type === 'error-json'
                  ) {
                    let errorInfo: { type?: string; errorCode?: string } = {};
                    try {
                      if (typeof output.value === 'string') {
                        errorInfo = JSON.parse(output.value);
                      } else if (
                        typeof output.value === 'object' &&
                        output.value !== null
                      ) {
                        errorInfo = output.value as typeof errorInfo;
                      }
                    } catch {}

                    if (errorInfo.type === 'code_execution_tool_result_error') {
                      anthropicContent.push({
                        type: 'code_execution_tool_result',
                        tool_use_id: part.toolCallId,
                        content: {
                          type: 'code_execution_tool_result_error' as const,
                          error_code: errorInfo.errorCode ?? 'unknown',
                        },
                        cache_control: cacheControl,
                      });
                    } else {
                      anthropicContent.push({
                        type: 'bash_code_execution_tool_result',
                        tool_use_id: part.toolCallId,
                        cache_control: cacheControl,
                        content: {
                          type: 'bash_code_execution_tool_result_error' as const,
                          error_code: errorInfo.errorCode ?? 'unknown',
                        },
                      });
                    }
                    break;
                  }

                  if (output.type !== 'json') {
                    warnings.push({
                      type: 'other',
                      message: `provider executed tool result output type ${output.type} for tool ${part.toolName} is not supported`,
                    });

                    break;
                  }

                  if (
                    output.value == null ||
                    typeof output.value !== 'object' ||
                    !('type' in output.value) ||
                    typeof output.value.type !== 'string'
                  ) {
                    warnings.push({
                      type: 'other',
                      message: `provider executed tool result output value is not a valid code execution result for tool ${part.toolName}`,
                    });
                    break;
                  }

                  // to distinguish between code execution 20250522, 20250825,
                  // and encrypted results (from web_fetch_20260209/web_search_20260209 injection),
                  // we check the type property in output.value
                  if (output.value.type === 'code_execution_result') {
                    // code execution 20250522
                    const codeExecutionOutput = await validateTypes({
                      value: output.value,
                      schema: codeExecution_20250522OutputSchema,
                    });

                    anthropicContent.push({
                      type: 'code_execution_tool_result',
                      tool_use_id: part.toolCallId,
                      content: {
                        type: codeExecutionOutput.type,
                        stdout: codeExecutionOutput.stdout,
                        stderr: codeExecutionOutput.stderr,
                        return_code: codeExecutionOutput.return_code,
                        content: codeExecutionOutput.content ?? [],
                      },
                      cache_control: cacheControl,
                    });
                  } else if (
                    output.value.type === 'encrypted_code_execution_result'
                  ) {
                    // code execution 20260120 encrypted result
                    const codeExecutionOutput = await validateTypes({
                      value: output.value,
                      schema: codeExecution_20260120OutputSchema,
                    });

                    if (
                      codeExecutionOutput.type ===
                      'encrypted_code_execution_result'
                    ) {
                      anthropicContent.push({
                        type: 'code_execution_tool_result',
                        tool_use_id: part.toolCallId,
                        content: {
                          type: codeExecutionOutput.type,
                          encrypted_stdout:
                            codeExecutionOutput.encrypted_stdout,
                          stderr: codeExecutionOutput.stderr,
                          return_code: codeExecutionOutput.return_code,
                          content: codeExecutionOutput.content ?? [],
                        },
                        cache_control: cacheControl,
                      });
                    }
                  } else {
                    // code execution 20250825
                    const codeExecutionOutput = await validateTypes({
                      value: output.value,
                      schema: codeExecution_20250825OutputSchema,
                    });

                    if (codeExecutionOutput.type === 'code_execution_result') {
                      anthropicContent.push({
                        type: 'code_execution_tool_result',
                        tool_use_id: part.toolCallId,
                        content: {
                          type: codeExecutionOutput.type,
                          stdout: codeExecutionOutput.stdout,
                          stderr: codeExecutionOutput.stderr,
                          return_code: codeExecutionOutput.return_code,
                          content: codeExecutionOutput.content ?? [],
                        },
                        cache_control: cacheControl,
                      });
                    } else if (
                      codeExecutionOutput.type ===
                        'bash_code_execution_result' ||
                      codeExecutionOutput.type ===
                        'bash_code_execution_tool_result_error'
                    ) {
                      anthropicContent.push({
                        type: 'bash_code_execution_tool_result',
                        tool_use_id: part.toolCallId,
                        cache_control: cacheControl,
                        content: codeExecutionOutput,
                      });
                    } else {
                      anthropicContent.push({
                        type: 'text_editor_code_execution_tool_result',
                        tool_use_id: part.toolCallId,
                        cache_control: cacheControl,
                        content: codeExecutionOutput,
                      });
                    }
                  }
                  break;
                }

                if (providerToolName === 'web_fetch') {
                  const output = part.output;

                  if (output.type === 'error-json') {
                    let errorValue: { errorCode?: string } = {};
                    try {
                      if (typeof output.value === 'string') {
                        errorValue = JSON.parse(output.value);
                      } else if (
                        typeof output.value === 'object' &&
                        output.value !== null
                      ) {
                        errorValue = output.value as typeof errorValue;
                      }
                    } catch {
                      // If parsing fails, treat the value as-is
                      const extractedErrorCode = (
                        output.value as Record<string, unknown>
                      )?.errorCode;
                      errorValue = {
                        errorCode:
                          typeof extractedErrorCode === 'string'
                            ? extractedErrorCode
                            : 'unavailable',
                      };
                    }

                    anthropicContent.push({
                      type: 'web_fetch_tool_result',
                      tool_use_id: part.toolCallId,
                      content: {
                        type: 'web_fetch_tool_result_error',
                        error_code: errorValue.errorCode ?? 'unavailable',
                      },
                      cache_control: cacheControl,
                    });

                    break;
                  }

                  if (output.type !== 'json') {
                    warnings.push({
                      type: 'other',
                      message: `provider executed tool result output type ${output.type} for tool ${part.toolName} is not supported`,
                    });

                    break;
                  }

                  // ideally we'd switch schema based on the tool version (e.g.
                  // web_fetch_20260209 vs web_fetch_20250910), but since both
                  // versions share an identical output schema, we use one here.
                  const webFetchOutput = await validateTypes({
                    value: output.value,
                    schema: webFetch_20250910OutputSchema,
                  });

                  anthropicContent.push({
                    type: 'web_fetch_tool_result',
                    tool_use_id: part.toolCallId,
                    content: {
                      type: 'web_fetch_result',
                      url: webFetchOutput.url,
                      retrieved_at: webFetchOutput.retrievedAt,
                      content: {
                        type: 'document',
                        title: webFetchOutput.content.title,
                        citations: webFetchOutput.content.citations,
                        source: {
                          type: webFetchOutput.content.source.type,
                          media_type: webFetchOutput.content.source.mediaType,
                          data: webFetchOutput.content.source.data,
                        } as Extract<
                          AnthropicWebFetchToolResultContent['content'],
                          { type: 'web_fetch_result' }
                        >['content']['source'],
                      },
                    },
                    cache_control: cacheControl,
                  });

                  break;
                }

                if (providerToolName === 'web_search') {
                  const output = part.output;

                  if (output.type !== 'json') {
                    warnings.push({
                      type: 'other',
                      message: `provider executed tool result output type ${output.type} for tool ${part.toolName} is not supported`,
                    });

                    break;
                  }

                  // ideally we'd switch schema based on the tool version (e.g.
                  // web_search_20260209 vs web_search_20250305), but since both
                  // versions share an identical output schema, we use one here.
                  const webSearchOutput = await validateTypes({
                    value: output.value,
                    schema: webSearch_20250305OutputSchema,
                  });

                  anthropicContent.push({
                    type: 'web_search_tool_result',
                    tool_use_id: part.toolCallId,
                    content: webSearchOutput.map(result => ({
                      url: result.url,
                      title: result.title,
                      page_age: result.pageAge,
                      encrypted_content: result.encryptedContent,
                      type: result.type,
                    })),
                    cache_control: cacheControl,
                  });

                  break;
                }

                if (
                  providerToolName === 'tool_search_tool_regex' ||
                  providerToolName === 'tool_search_tool_bm25'
                ) {
                  const output = part.output;

                  if (output.type !== 'json') {
                    warnings.push({
                      type: 'other',
                      message: `provider executed tool result output type ${output.type} for tool ${part.toolName} is not supported`,
                    });

                    break;
                  }

                  const toolSearchOutput = await validateTypes({
                    value: output.value,
                    schema: toolSearchOutputSchema,
                  });

                  // Convert tool references back to API format
                  const toolReferences = toolSearchOutput.map(ref => ({
                    type: 'tool_reference' as const,
                    tool_name: ref.toolName,
                  }));

                  anthropicContent.push({
                    type: 'tool_search_tool_result',
                    tool_use_id: part.toolCallId,
                    content: {
                      type: 'tool_search_tool_search_result',
                      tool_references: toolReferences,
                    },
                    cache_control: cacheControl,
                  });

                  break;
                }

                warnings.push({
                  type: 'other',
                  message: `provider executed tool result for tool ${part.toolName} is not supported`,
                });

                break;
              }
            }
          }
        }

        messages.push({ role: 'assistant', content: anthropicContent });

        break;
      }

      default: {
        const _exhaustiveCheck: never = type;
        throw new Error(`content type: ${_exhaustiveCheck}`);
      }
    }
  }

  return {
    prompt: { system, messages },
    betas,
  };
}

type SystemBlock = {
  type: 'system';
  messages: Array<LanguageModelV3Message & { role: 'system' }>;
};
type AssistantBlock = {
  type: 'assistant';
  messages: Array<LanguageModelV3Message & { role: 'assistant' }>;
};
type UserBlock = {
  type: 'user';
  messages: Array<LanguageModelV3Message & { role: 'user' | 'tool' }>;
};

function groupIntoBlocks(
  prompt: LanguageModelV3Prompt,
): Array<SystemBlock | AssistantBlock | UserBlock> {
  const blocks: Array<SystemBlock | AssistantBlock | UserBlock> = [];
  let currentBlock: SystemBlock | AssistantBlock | UserBlock | undefined =
    undefined;

  for (const message of prompt) {
    const { role } = message;
    switch (role) {
      case 'system': {
        if (currentBlock?.type !== 'system') {
          currentBlock = { type: 'system', messages: [] };
          blocks.push(currentBlock);
        }

        currentBlock.messages.push(message);
        break;
      }
      case 'assistant': {
        if (currentBlock?.type !== 'assistant') {
          currentBlock = { type: 'assistant', messages: [] };
          blocks.push(currentBlock);
        }

        currentBlock.messages.push(message);
        break;
      }
      case 'user': {
        if (currentBlock?.type !== 'user') {
          currentBlock = { type: 'user', messages: [] };
          blocks.push(currentBlock);
        }

        currentBlock.messages.push(message);
        break;
      }
      case 'tool': {
        if (currentBlock?.type !== 'user') {
          currentBlock = { type: 'user', messages: [] };
          blocks.push(currentBlock);
        }

        currentBlock.messages.push(message);
        break;
      }
      default: {
        const _exhaustiveCheck: never = role;
        throw new Error(`Unsupported role: ${_exhaustiveCheck}`);
      }
    }
  }

  return blocks;
}
