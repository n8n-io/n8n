import {
  LanguageModelV3Prompt,
  LanguageModelV3ToolApprovalResponsePart,
  SharedV3Warning,
  UnsupportedFunctionalityError,
} from '@ai-sdk/provider';
import {
  convertToBase64,
  isNonNullable,
  parseJSON,
  parseProviderOptions,
  ToolNameMapping,
  validateTypes,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';
import {
  applyPatchInputSchema,
  applyPatchOutputSchema,
} from '../tool/apply-patch';
import {
  localShellInputSchema,
  localShellOutputSchema,
} from '../tool/local-shell';
import { shellInputSchema, shellOutputSchema } from '../tool/shell';
import {
  toolSearchInputSchema,
  toolSearchOutputSchema,
} from '../tool/tool-search';
import {
  OpenAIResponsesCustomToolCallOutput,
  OpenAIResponsesFunctionCallOutput,
  OpenAIResponsesInput,
  OpenAIResponsesReasoning,
} from './openai-responses-api';

/**
 * Check if a string is a file ID based on the given prefixes
 * Returns false if prefixes is undefined (disables file ID detection)
 */
function isFileId(data: string, prefixes?: readonly string[]): boolean {
  if (!prefixes) return false;
  return prefixes.some(prefix => data.startsWith(prefix));
}

export async function convertToOpenAIResponsesInput({
  prompt,
  toolNameMapping,
  systemMessageMode,
  providerOptionsName,
  fileIdPrefixes,
  store,
  hasConversation = false,
  hasLocalShellTool = false,
  hasShellTool = false,
  hasApplyPatchTool = false,
  customProviderToolNames,
}: {
  prompt: LanguageModelV3Prompt;
  toolNameMapping: ToolNameMapping;
  systemMessageMode: 'system' | 'developer' | 'remove';
  providerOptionsName: string;
  fileIdPrefixes?: readonly string[];
  store: boolean;
  hasConversation?: boolean; // when true, skip assistant messages that already have item IDs
  hasLocalShellTool?: boolean;
  hasShellTool?: boolean;
  hasApplyPatchTool?: boolean;
  customProviderToolNames?: Set<string>;
}): Promise<{
  input: OpenAIResponsesInput;
  warnings: Array<SharedV3Warning>;
}> {
  let input: OpenAIResponsesInput = [];
  const warnings: Array<SharedV3Warning> = [];
  const processedApprovalIds = new Set<string>();

  for (const { role, content } of prompt) {
    switch (role) {
      case 'system': {
        switch (systemMessageMode) {
          case 'system': {
            input.push({ role: 'system', content });
            break;
          }
          case 'developer': {
            input.push({ role: 'developer', content });
            break;
          }
          case 'remove': {
            warnings.push({
              type: 'other',
              message: 'system messages are removed for this model',
            });
            break;
          }
          default: {
            const _exhaustiveCheck: never = systemMessageMode;
            throw new Error(
              `Unsupported system message mode: ${_exhaustiveCheck}`,
            );
          }
        }
        break;
      }

      case 'user': {
        input.push({
          role: 'user',
          content: content.map((part, index) => {
            switch (part.type) {
              case 'text': {
                return { type: 'input_text', text: part.text };
              }
              case 'file': {
                if (part.mediaType.startsWith('image/')) {
                  const mediaType =
                    part.mediaType === 'image/*'
                      ? 'image/jpeg'
                      : part.mediaType;

                  return {
                    type: 'input_image',
                    ...(part.data instanceof URL
                      ? { image_url: part.data.toString() }
                      : typeof part.data === 'string' &&
                          isFileId(part.data, fileIdPrefixes)
                        ? { file_id: part.data }
                        : {
                            image_url: `data:${mediaType};base64,${convertToBase64(part.data)}`,
                          }),
                    detail:
                      part.providerOptions?.[providerOptionsName]?.imageDetail,
                  };
                } else if (part.mediaType === 'application/pdf') {
                  if (part.data instanceof URL) {
                    return {
                      type: 'input_file',
                      file_url: part.data.toString(),
                    };
                  }
                  return {
                    type: 'input_file',
                    ...(typeof part.data === 'string' &&
                    isFileId(part.data, fileIdPrefixes)
                      ? { file_id: part.data }
                      : {
                          filename: part.filename ?? `part-${index}.pdf`,
                          file_data: `data:application/pdf;base64,${convertToBase64(part.data)}`,
                        }),
                  };
                } else {
                  throw new UnsupportedFunctionalityError({
                    functionality: `file part media type ${part.mediaType}`,
                  });
                }
              }
            }
          }),
        });

        break;
      }

      case 'assistant': {
        const reasoningMessages: Record<string, OpenAIResponsesReasoning> = {};

        for (const part of content) {
          switch (part.type) {
            case 'text': {
              const providerOpts = part.providerOptions?.[providerOptionsName];
              const id = providerOpts?.itemId as string | undefined;
              const phase = providerOpts?.phase as
                | 'commentary'
                | 'final_answer'
                | null
                | undefined;

              // when using conversation, skip items that already exist in the conversation context to avoid "Duplicate item found" errors
              if (hasConversation && id != null) {
                break;
              }

              // item references reduce the payload size
              if (store && id != null) {
                input.push({ type: 'item_reference', id });
                break;
              }

              input.push({
                role: 'assistant',
                content: [{ type: 'output_text', text: part.text }],
                id,
                ...(phase != null && { phase }),
              });

              break;
            }
            case 'tool-call': {
              const id = (part.providerOptions?.[providerOptionsName]?.itemId ??
                (
                  part as {
                    providerMetadata?: {
                      [providerOptionsName]?: { itemId?: string };
                    };
                  }
                ).providerMetadata?.[providerOptionsName]?.itemId) as
                | string
                | undefined;

              if (hasConversation && id != null) {
                break;
              }

              const resolvedToolName = toolNameMapping.toProviderToolName(
                part.toolName,
              );

              if (resolvedToolName === 'tool_search') {
                if (store && id != null) {
                  input.push({ type: 'item_reference', id });
                  break;
                }

                const parsedInput =
                  typeof part.input === 'string'
                    ? await parseJSON({
                        text: part.input,
                        schema: toolSearchInputSchema,
                      })
                    : await validateTypes({
                        value: part.input,
                        schema: toolSearchInputSchema,
                      });

                const execution =
                  parsedInput.call_id != null ? 'client' : 'server';

                input.push({
                  type: 'tool_search_call',
                  id: id ?? part.toolCallId,
                  execution,
                  call_id: parsedInput.call_id ?? null,
                  status: 'completed',
                  arguments: parsedInput.arguments,
                });
                break;
              }

              if (part.providerExecuted) {
                if (store && id != null) {
                  input.push({ type: 'item_reference', id });
                }
                break;
              }

              if (store && id != null) {
                input.push({ type: 'item_reference', id });
                break;
              }

              if (hasLocalShellTool && resolvedToolName === 'local_shell') {
                const parsedInput = await validateTypes({
                  value: part.input,
                  schema: localShellInputSchema,
                });
                input.push({
                  type: 'local_shell_call',
                  call_id: part.toolCallId,
                  id: id!,
                  action: {
                    type: 'exec',
                    command: parsedInput.action.command,
                    timeout_ms: parsedInput.action.timeoutMs,
                    user: parsedInput.action.user,
                    working_directory: parsedInput.action.workingDirectory,
                    env: parsedInput.action.env,
                  },
                });

                break;
              }

              if (hasShellTool && resolvedToolName === 'shell') {
                const parsedInput = await validateTypes({
                  value: part.input,
                  schema: shellInputSchema,
                });
                input.push({
                  type: 'shell_call',
                  call_id: part.toolCallId,
                  id: id!,
                  status: 'completed',
                  action: {
                    commands: parsedInput.action.commands,
                    timeout_ms: parsedInput.action.timeoutMs,
                    max_output_length: parsedInput.action.maxOutputLength,
                  },
                });

                break;
              }

              if (hasApplyPatchTool && resolvedToolName === 'apply_patch') {
                const parsedInput = await validateTypes({
                  value: part.input,
                  schema: applyPatchInputSchema,
                });
                input.push({
                  type: 'apply_patch_call',
                  call_id: parsedInput.callId,
                  id: id!,
                  status: 'completed',
                  operation: parsedInput.operation,
                });

                break;
              }

              if (customProviderToolNames?.has(resolvedToolName)) {
                input.push({
                  type: 'custom_tool_call',
                  call_id: part.toolCallId,
                  name: resolvedToolName,
                  input:
                    typeof part.input === 'string'
                      ? part.input
                      : JSON.stringify(part.input),
                  id,
                });
                break;
              }

              input.push({
                type: 'function_call',
                call_id: part.toolCallId,
                name: resolvedToolName,
                arguments: JSON.stringify(part.input),
                id,
              });
              break;
            }

            // assistant tool result parts are from provider-executed tools:
            case 'tool-result': {
              // Skip execution-denied results - these are synthetic results from denied
              // approvals and have no corresponding item in OpenAI's store.
              // Check both the direct type and if it was transformed to json with execution-denied inside
              if (
                part.output.type === 'execution-denied' ||
                (part.output.type === 'json' &&
                  typeof part.output.value === 'object' &&
                  part.output.value != null &&
                  'type' in part.output.value &&
                  part.output.value.type === 'execution-denied')
              ) {
                break;
              }

              if (hasConversation) {
                break;
              }

              const resolvedResultToolName = toolNameMapping.toProviderToolName(
                part.toolName,
              );

              if (resolvedResultToolName === 'tool_search') {
                const itemId =
                  (
                    part.providerOptions?.[providerOptionsName] as
                      | { itemId?: string }
                      | undefined
                  )?.itemId ?? part.toolCallId;

                if (store) {
                  input.push({ type: 'item_reference', id: itemId });
                } else if (part.output.type === 'json') {
                  const parsedOutput = await validateTypes({
                    value: part.output.value,
                    schema: toolSearchOutputSchema,
                  });

                  input.push({
                    type: 'tool_search_output',
                    id: itemId,
                    execution: 'server',
                    call_id: null,
                    status: 'completed',
                    tools: parsedOutput.tools,
                  });
                }

                break;
              }

              /*
               * Shell tool results are separate output items (shell_call_output)
               * with their own item IDs distinct from the shell_call's item ID.
               * Since the pipeline only preserves the shell_call's item ID in
               * callProviderMetadata, we reconstruct the full shell_call_output
               * instead of using an item_reference with the wrong ID.
               */
              if (hasShellTool && resolvedResultToolName === 'shell') {
                if (part.output.type === 'json') {
                  const parsedOutput = await validateTypes({
                    value: part.output.value,
                    schema: shellOutputSchema,
                  });
                  input.push({
                    type: 'shell_call_output',
                    call_id: part.toolCallId,
                    output: parsedOutput.output.map(item => ({
                      stdout: item.stdout,
                      stderr: item.stderr,
                      outcome:
                        item.outcome.type === 'timeout'
                          ? { type: 'timeout' as const }
                          : {
                              type: 'exit' as const,
                              exit_code: item.outcome.exitCode,
                            },
                    })),
                  });
                }
                break;
              }

              if (store) {
                const itemId =
                  (
                    part.providerOptions?.[providerOptionsName] as
                      | { itemId?: string }
                      | undefined
                  )?.itemId ?? part.toolCallId;
                input.push({ type: 'item_reference', id: itemId });
              } else {
                warnings.push({
                  type: 'other',
                  message: `Results for OpenAI tool ${part.toolName} are not sent to the API when store is false`,
                });
              }

              break;
            }

            case 'reasoning': {
              const providerOptions = await parseProviderOptions({
                provider: providerOptionsName,
                providerOptions: part.providerOptions,
                schema: openaiResponsesReasoningProviderOptionsSchema,
              });

              const reasoningId = providerOptions?.itemId;

              if (hasConversation && reasoningId != null) {
                break;
              }

              if (reasoningId != null) {
                const reasoningMessage = reasoningMessages[reasoningId];

                if (store) {
                  // use item references to refer to reasoning (single reference)
                  // when the first part is encountered
                  if (reasoningMessage === undefined) {
                    input.push({ type: 'item_reference', id: reasoningId });

                    // store unused reasoning message to mark id as used
                    reasoningMessages[reasoningId] = {
                      type: 'reasoning',
                      id: reasoningId,
                      summary: [],
                    };
                  }
                } else {
                  const summaryParts: Array<{
                    type: 'summary_text';
                    text: string;
                  }> = [];

                  if (part.text.length > 0) {
                    summaryParts.push({
                      type: 'summary_text',
                      text: part.text,
                    });
                  } else if (reasoningMessage !== undefined) {
                    warnings.push({
                      type: 'other',
                      message: `Cannot append empty reasoning part to existing reasoning sequence. Skipping reasoning part: ${JSON.stringify(part)}.`,
                    });
                  }

                  if (reasoningMessage === undefined) {
                    reasoningMessages[reasoningId] = {
                      type: 'reasoning',
                      id: reasoningId,
                      encrypted_content:
                        providerOptions?.reasoningEncryptedContent,
                      summary: summaryParts,
                    };
                    input.push(reasoningMessages[reasoningId]);
                  } else {
                    reasoningMessage.summary.push(...summaryParts);

                    // updated encrypted content to enable setting it in the last summary part:
                    if (providerOptions?.reasoningEncryptedContent != null) {
                      reasoningMessage.encrypted_content =
                        providerOptions.reasoningEncryptedContent;
                    }
                  }
                }
              } else {
                // No itemId — fall back to encrypted_content if available.
                // The OpenAI Responses API accepts reasoning items without an
                // id when encrypted_content is provided, enabling multi-turn
                // reasoning even when server-side item persistence is not used
                // or when itemId has been stripped from providerOptions.
                const encryptedContent =
                  providerOptions?.reasoningEncryptedContent;

                if (encryptedContent != null) {
                  const summaryParts: Array<{
                    type: 'summary_text';
                    text: string;
                  }> = [];
                  if (part.text.length > 0) {
                    summaryParts.push({
                      type: 'summary_text',
                      text: part.text,
                    });
                  }
                  input.push({
                    type: 'reasoning',
                    encrypted_content: encryptedContent,
                    summary: summaryParts,
                  });
                } else {
                  warnings.push({
                    type: 'other',
                    message: `Non-OpenAI reasoning parts are not supported. Skipping reasoning part: ${JSON.stringify(part)}.`,
                  });
                }
              }
              break;
            }
          }
        }

        break;
      }

      case 'tool': {
        for (const part of content) {
          if (part.type === 'tool-approval-response') {
            const approvalResponse =
              part as LanguageModelV3ToolApprovalResponsePart;

            if (processedApprovalIds.has(approvalResponse.approvalId)) {
              continue;
            }
            processedApprovalIds.add(approvalResponse.approvalId);

            if (store) {
              input.push({
                type: 'item_reference',
                id: approvalResponse.approvalId,
              });
            }

            input.push({
              type: 'mcp_approval_response',
              approval_request_id: approvalResponse.approvalId,
              approve: approvalResponse.approved,
            });
            continue;
          }

          const output = part.output;

          // Skip execution-denied with approvalId - already handled via tool-approval-response
          if (output.type === 'execution-denied') {
            const approvalId = (
              output.providerOptions?.openai as { approvalId?: string }
            )?.approvalId;

            if (approvalId) {
              continue;
            }
          }

          const resolvedToolName = toolNameMapping.toProviderToolName(
            part.toolName,
          );

          if (resolvedToolName === 'tool_search' && output.type === 'json') {
            const parsedOutput = await validateTypes({
              value: output.value,
              schema: toolSearchOutputSchema,
            });

            input.push({
              type: 'tool_search_output',
              execution: 'client',
              call_id: part.toolCallId,
              status: 'completed',
              tools: parsedOutput.tools,
            });
            continue;
          }

          if (
            hasLocalShellTool &&
            resolvedToolName === 'local_shell' &&
            output.type === 'json'
          ) {
            const parsedOutput = await validateTypes({
              value: output.value,
              schema: localShellOutputSchema,
            });

            input.push({
              type: 'local_shell_call_output',
              call_id: part.toolCallId,
              output: parsedOutput.output,
            });
            continue;
          }

          if (
            hasShellTool &&
            resolvedToolName === 'shell' &&
            output.type === 'json'
          ) {
            const parsedOutput = await validateTypes({
              value: output.value,
              schema: shellOutputSchema,
            });

            input.push({
              type: 'shell_call_output',
              call_id: part.toolCallId,
              output: parsedOutput.output.map(item => ({
                stdout: item.stdout,
                stderr: item.stderr,
                outcome:
                  item.outcome.type === 'timeout'
                    ? { type: 'timeout' as const }
                    : {
                        type: 'exit' as const,
                        exit_code: item.outcome.exitCode,
                      },
              })),
            });
            continue;
          }

          if (
            hasApplyPatchTool &&
            part.toolName === 'apply_patch' &&
            output.type === 'json'
          ) {
            const parsedOutput = await validateTypes({
              value: output.value,
              schema: applyPatchOutputSchema,
            });

            input.push({
              type: 'apply_patch_call_output',
              call_id: part.toolCallId,
              status: parsedOutput.status,
              output: parsedOutput.output,
            });
            continue;
          }

          if (customProviderToolNames?.has(resolvedToolName)) {
            let outputValue: OpenAIResponsesCustomToolCallOutput['output'];
            switch (output.type) {
              case 'text':
              case 'error-text':
                outputValue = output.value;
                break;
              case 'execution-denied':
                outputValue = output.reason ?? 'Tool execution denied.';
                break;
              case 'json':
              case 'error-json':
                outputValue = JSON.stringify(output.value);
                break;
              case 'content':
                outputValue = output.value
                  .map(item => {
                    switch (item.type) {
                      case 'text':
                        return { type: 'input_text' as const, text: item.text };
                      case 'image-data':
                        return {
                          type: 'input_image' as const,
                          image_url: `data:${item.mediaType};base64,${item.data}`,
                        };
                      case 'image-url':
                        return {
                          type: 'input_image' as const,
                          image_url: item.url,
                        };
                      case 'file-data':
                        return {
                          type: 'input_file' as const,
                          filename: item.filename ?? 'data',
                          file_data: `data:${item.mediaType};base64,${item.data}`,
                        };
                      default:
                        warnings.push({
                          type: 'other',
                          message: `unsupported custom tool content part type: ${item.type}`,
                        });
                        return undefined;
                    }
                  })
                  .filter(isNonNullable);
                break;
              default:
                outputValue = '';
            }
            input.push({
              type: 'custom_tool_call_output',
              call_id: part.toolCallId,
              output: outputValue,
            } satisfies OpenAIResponsesCustomToolCallOutput);
            continue;
          }

          let contentValue: OpenAIResponsesFunctionCallOutput['output'];
          switch (output.type) {
            case 'text':
            case 'error-text':
              contentValue = output.value;
              break;
            case 'execution-denied':
              contentValue = output.reason ?? 'Tool execution denied.';
              break;
            case 'json':
            case 'error-json':
              contentValue = JSON.stringify(output.value);
              break;
            case 'content':
              contentValue = output.value
                .map(item => {
                  switch (item.type) {
                    case 'text': {
                      return { type: 'input_text' as const, text: item.text };
                    }

                    case 'image-data': {
                      return {
                        type: 'input_image' as const,
                        image_url: `data:${item.mediaType};base64,${item.data}`,
                      };
                    }

                    case 'image-url': {
                      return {
                        type: 'input_image' as const,
                        image_url: item.url,
                      };
                    }

                    case 'file-data': {
                      return {
                        type: 'input_file' as const,
                        filename: item.filename ?? 'data',
                        file_data: `data:${item.mediaType};base64,${item.data}`,
                      };
                    }

                    default: {
                      warnings.push({
                        type: 'other',
                        message: `unsupported tool content part type: ${item.type}`,
                      });
                      return undefined;
                    }
                  }
                })
                .filter(isNonNullable);
              break;
          }

          input.push({
            type: 'function_call_output',
            call_id: part.toolCallId,
            output: contentValue,
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

  // when store is false, remove reasoning parts without encrypted content
  if (
    !store &&
    input.some(
      item =>
        'type' in item &&
        item.type === 'reasoning' &&
        item.encrypted_content == null,
    )
  ) {
    warnings.push({
      type: 'other',
      message:
        'Reasoning parts without encrypted content are not supported when store is false. Skipping reasoning parts.',
    });
    input = input.filter(
      item =>
        !('type' in item) ||
        item.type !== 'reasoning' ||
        item.encrypted_content != null,
    );
  }

  return { input, warnings };
}

const openaiResponsesReasoningProviderOptionsSchema = z.object({
  itemId: z.string().nullish(),
  reasoningEncryptedContent: z.string().nullish(),
});

export type OpenAIResponsesReasoningProviderOptions = z.infer<
  typeof openaiResponsesReasoningProviderOptionsSchema
>;
