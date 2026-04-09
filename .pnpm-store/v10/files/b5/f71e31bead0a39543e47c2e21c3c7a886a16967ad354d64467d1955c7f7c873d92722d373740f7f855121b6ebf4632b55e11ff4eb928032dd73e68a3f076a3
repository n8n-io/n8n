import { TypeValidationContext } from '@ai-sdk/provider';
import { FlexibleSchema, validateTypes } from '@ai-sdk/provider-utils';
import { UIMessageStreamError } from '../error/ui-message-stream-error';
import { ProviderMetadata } from '../types';
import { FinishReason } from '../types/language-model';
import {
  DataUIMessageChunk,
  InferUIMessageChunk,
  isDataUIMessageChunk,
  UIMessageChunk,
} from '../ui-message-stream/ui-message-chunks';
import { ErrorHandler } from '../util/error-handler';
import { mergeObjects } from '../util/merge-objects';
import { parsePartialJson } from '../util/parse-partial-json';
import { UIDataTypesToSchemas } from './chat';
import {
  DataUIPart,
  DynamicToolUIPart,
  getStaticToolName,
  InferUIMessageData,
  InferUIMessageMetadata,
  InferUIMessageToolCall,
  InferUIMessageTools,
  isStaticToolUIPart,
  isToolUIPart,
  ReasoningUIPart,
  TextUIPart,
  ToolUIPart,
  UIMessage,
  UIMessagePart,
} from './ui-messages';

export type StreamingUIMessageState<UI_MESSAGE extends UIMessage> = {
  message: UI_MESSAGE;
  activeTextParts: Record<string, TextUIPart>;
  activeReasoningParts: Record<string, ReasoningUIPart>;
  partialToolCalls: Record<
    string,
    {
      text: string;
      index: number;
      toolName: string;
      dynamic?: boolean;
      title?: string;
    }
  >;
  finishReason?: FinishReason;
};

export function createStreamingUIMessageState<UI_MESSAGE extends UIMessage>({
  lastMessage,
  messageId,
}: {
  lastMessage: UI_MESSAGE | undefined;
  messageId: string;
}): StreamingUIMessageState<UI_MESSAGE> {
  return {
    message:
      lastMessage?.role === 'assistant'
        ? lastMessage
        : ({
            id: messageId,
            metadata: undefined,
            role: 'assistant',
            parts: [] as UIMessagePart<
              InferUIMessageData<UI_MESSAGE>,
              InferUIMessageTools<UI_MESSAGE>
            >[],
          } as UI_MESSAGE),
    activeTextParts: {},
    activeReasoningParts: {},
    partialToolCalls: {},
  };
}

export function processUIMessageStream<UI_MESSAGE extends UIMessage>({
  stream,
  messageMetadataSchema,
  dataPartSchemas,
  runUpdateMessageJob,
  onError,
  onToolCall,
  onData,
}: {
  // input stream is not fully typed yet:
  stream: ReadableStream<UIMessageChunk>;
  messageMetadataSchema?: FlexibleSchema<InferUIMessageMetadata<UI_MESSAGE>>;
  dataPartSchemas?: UIDataTypesToSchemas<InferUIMessageData<UI_MESSAGE>>;
  onToolCall?: (options: {
    toolCall: InferUIMessageToolCall<UI_MESSAGE>;
  }) => void | PromiseLike<void>;
  onData?: (dataPart: DataUIPart<InferUIMessageData<UI_MESSAGE>>) => void;
  runUpdateMessageJob: (
    job: (options: {
      state: StreamingUIMessageState<UI_MESSAGE>;
      write: () => void;
    }) => Promise<void>,
  ) => Promise<void>;
  onError: ErrorHandler;
}): ReadableStream<InferUIMessageChunk<UI_MESSAGE>> {
  return stream.pipeThrough(
    new TransformStream<UIMessageChunk, InferUIMessageChunk<UI_MESSAGE>>({
      async transform(chunk, controller) {
        await runUpdateMessageJob(async ({ state, write }) => {
          function getToolInvocation(toolCallId: string) {
            const toolInvocations = state.message.parts.filter(isToolUIPart);

            const toolInvocation = toolInvocations.find(
              invocation => invocation.toolCallId === toolCallId,
            );

            if (toolInvocation == null) {
              throw new UIMessageStreamError({
                chunkType: 'tool-invocation',
                chunkId: toolCallId,
                message: `No tool invocation found for tool call ID "${toolCallId}".`,
              });
            }

            return toolInvocation;
          }

          function updateToolPart(
            options: {
              toolName: keyof InferUIMessageTools<UI_MESSAGE> & string;
              toolCallId: string;
              providerExecuted?: boolean;
              title?: string;
            } & (
              | {
                  state: 'input-streaming';
                  input: unknown;
                  providerExecuted?: boolean;
                  providerMetadata?: ProviderMetadata;
                }
              | {
                  state: 'input-available';
                  input: unknown;
                  providerExecuted?: boolean;
                  providerMetadata?: ProviderMetadata;
                }
              | {
                  state: 'output-available';
                  input: unknown;
                  output: unknown;
                  providerExecuted?: boolean;
                  preliminary?: boolean;
                  providerMetadata?: ProviderMetadata;
                }
              | {
                  state: 'output-error';
                  input: unknown;
                  rawInput?: unknown;
                  errorText: string;
                  providerExecuted?: boolean;
                  providerMetadata?: ProviderMetadata;
                }
            ),
          ) {
            const part = state.message.parts.find(
              part =>
                isStaticToolUIPart(part) &&
                part.toolCallId === options.toolCallId,
            ) as ToolUIPart<InferUIMessageTools<UI_MESSAGE>> | undefined;

            const anyOptions = options as any;
            const anyPart = part as any;

            if (part != null) {
              part.state = options.state;
              anyPart.input = anyOptions.input;
              anyPart.output = anyOptions.output;
              anyPart.errorText = anyOptions.errorText;
              anyPart.rawInput = anyOptions.rawInput;
              anyPart.preliminary = anyOptions.preliminary;
              if (options.title !== undefined) {
                anyPart.title = options.title;
              }
              // once providerExecuted is set, it stays for streaming
              anyPart.providerExecuted =
                anyOptions.providerExecuted ?? part.providerExecuted;

              const providerMetadata = anyOptions.providerMetadata;

              if (providerMetadata != null) {
                if (
                  options.state === 'output-available' ||
                  options.state === 'output-error'
                ) {
                  const resultPart = part as Extract<
                    ToolUIPart<InferUIMessageTools<UI_MESSAGE>>,
                    { state: 'output-available' | 'output-error' }
                  >;

                  resultPart.resultProviderMetadata = providerMetadata;
                } else {
                  part.callProviderMetadata = providerMetadata;
                }
              }
            } else {
              state.message.parts.push({
                type: `tool-${options.toolName}`,
                toolCallId: options.toolCallId,
                state: options.state,
                title: options.title,
                input: anyOptions.input,
                output: anyOptions.output,
                rawInput: anyOptions.rawInput,
                errorText: anyOptions.errorText,
                providerExecuted: anyOptions.providerExecuted,
                preliminary: anyOptions.preliminary,
                ...(anyOptions.providerMetadata != null &&
                (options.state === 'output-available' ||
                  options.state === 'output-error')
                  ? { resultProviderMetadata: anyOptions.providerMetadata }
                  : {}),
                ...(anyOptions.providerMetadata != null &&
                !(
                  options.state === 'output-available' ||
                  options.state === 'output-error'
                )
                  ? { callProviderMetadata: anyOptions.providerMetadata }
                  : {}),
              } as ToolUIPart<InferUIMessageTools<UI_MESSAGE>>);
            }
          }

          function updateDynamicToolPart(
            options: {
              toolName: keyof InferUIMessageTools<UI_MESSAGE> & string;
              toolCallId: string;
              providerExecuted?: boolean;
              title?: string;
            } & (
              | {
                  state: 'input-streaming';
                  input: unknown;
                  providerMetadata?: ProviderMetadata;
                }
              | {
                  state: 'input-available';
                  input: unknown;
                  providerMetadata?: ProviderMetadata;
                }
              | {
                  state: 'output-available';
                  input: unknown;
                  output: unknown;
                  preliminary: boolean | undefined;
                  providerMetadata?: ProviderMetadata;
                }
              | {
                  state: 'output-error';
                  input: unknown;
                  errorText: string;
                  providerMetadata?: ProviderMetadata;
                }
            ),
          ) {
            const part = state.message.parts.find(
              part =>
                part.type === 'dynamic-tool' &&
                part.toolCallId === options.toolCallId,
            ) as DynamicToolUIPart | undefined;

            const anyOptions = options as any;
            const anyPart = part as any;

            if (part != null) {
              part.state = options.state;
              anyPart.toolName = options.toolName;
              anyPart.input = anyOptions.input;
              anyPart.output = anyOptions.output;
              anyPart.errorText = anyOptions.errorText;
              anyPart.rawInput = anyOptions.rawInput ?? anyPart.rawInput;
              anyPart.preliminary = anyOptions.preliminary;
              if (options.title !== undefined) {
                anyPart.title = options.title;
              }
              // once providerExecuted is set, it stays for streaming
              anyPart.providerExecuted =
                anyOptions.providerExecuted ?? part.providerExecuted;

              const providerMetadata = anyOptions.providerMetadata;

              if (providerMetadata != null) {
                if (
                  options.state === 'output-available' ||
                  options.state === 'output-error'
                ) {
                  const resultPart = part as Extract<
                    DynamicToolUIPart,
                    { state: 'output-available' | 'output-error' }
                  >;

                  resultPart.resultProviderMetadata = providerMetadata;
                } else {
                  part.callProviderMetadata = providerMetadata;
                }
              }
            } else {
              state.message.parts.push({
                type: 'dynamic-tool',
                toolName: options.toolName,
                toolCallId: options.toolCallId,
                state: options.state,
                input: anyOptions.input,
                output: anyOptions.output,
                errorText: anyOptions.errorText,
                preliminary: anyOptions.preliminary,
                providerExecuted: anyOptions.providerExecuted,
                title: options.title,
                ...(anyOptions.providerMetadata != null &&
                (options.state === 'output-available' ||
                  options.state === 'output-error')
                  ? { resultProviderMetadata: anyOptions.providerMetadata }
                  : {}),
                ...(anyOptions.providerMetadata != null &&
                !(
                  options.state === 'output-available' ||
                  options.state === 'output-error'
                )
                  ? { callProviderMetadata: anyOptions.providerMetadata }
                  : {}),
              } as DynamicToolUIPart);
            }
          }

          async function updateMessageMetadata(metadata: unknown) {
            if (metadata != null) {
              const mergedMetadata =
                state.message.metadata != null
                  ? mergeObjects(state.message.metadata, metadata)
                  : metadata;

              if (messageMetadataSchema != null) {
                await validateTypes({
                  value: mergedMetadata,
                  schema: messageMetadataSchema,
                  context: {
                    field: 'message.metadata',
                    entityId: state.message.id,
                  },
                });
              }

              state.message.metadata =
                mergedMetadata as InferUIMessageMetadata<UI_MESSAGE>;
            }
          }

          switch (chunk.type) {
            case 'text-start': {
              const textPart: TextUIPart = {
                type: 'text',
                text: '',
                providerMetadata: chunk.providerMetadata,
                state: 'streaming',
              };
              state.activeTextParts[chunk.id] = textPart;
              state.message.parts.push(textPart);
              write();
              break;
            }

            case 'text-delta': {
              const textPart = state.activeTextParts[chunk.id];
              if (textPart == null) {
                throw new UIMessageStreamError({
                  chunkType: 'text-delta',
                  chunkId: chunk.id,
                  message:
                    `Received text-delta for missing text part with ID "${chunk.id}". ` +
                    `Ensure a "text-start" chunk is sent before any "text-delta" chunks.`,
                });
              }
              textPart.text += chunk.delta;
              textPart.providerMetadata =
                chunk.providerMetadata ?? textPart.providerMetadata;
              write();
              break;
            }

            case 'text-end': {
              const textPart = state.activeTextParts[chunk.id];
              if (textPart == null) {
                throw new UIMessageStreamError({
                  chunkType: 'text-end',
                  chunkId: chunk.id,
                  message:
                    `Received text-end for missing text part with ID "${chunk.id}". ` +
                    `Ensure a "text-start" chunk is sent before any "text-end" chunks.`,
                });
              }
              textPart.state = 'done';
              textPart.providerMetadata =
                chunk.providerMetadata ?? textPart.providerMetadata;
              delete state.activeTextParts[chunk.id];
              write();
              break;
            }

            case 'reasoning-start': {
              const reasoningPart: ReasoningUIPart = {
                type: 'reasoning',
                text: '',
                providerMetadata: chunk.providerMetadata,
                state: 'streaming',
              };
              state.activeReasoningParts[chunk.id] = reasoningPart;
              state.message.parts.push(reasoningPart);
              write();
              break;
            }

            case 'reasoning-delta': {
              const reasoningPart = state.activeReasoningParts[chunk.id];
              if (reasoningPart == null) {
                throw new UIMessageStreamError({
                  chunkType: 'reasoning-delta',
                  chunkId: chunk.id,
                  message:
                    `Received reasoning-delta for missing reasoning part with ID "${chunk.id}". ` +
                    `Ensure a "reasoning-start" chunk is sent before any "reasoning-delta" chunks.`,
                });
              }
              reasoningPart.text += chunk.delta;
              reasoningPart.providerMetadata =
                chunk.providerMetadata ?? reasoningPart.providerMetadata;
              write();
              break;
            }

            case 'reasoning-end': {
              const reasoningPart = state.activeReasoningParts[chunk.id];
              if (reasoningPart == null) {
                throw new UIMessageStreamError({
                  chunkType: 'reasoning-end',
                  chunkId: chunk.id,
                  message:
                    `Received reasoning-end for missing reasoning part with ID "${chunk.id}". ` +
                    `Ensure a "reasoning-start" chunk is sent before any "reasoning-end" chunks.`,
                });
              }
              reasoningPart.providerMetadata =
                chunk.providerMetadata ?? reasoningPart.providerMetadata;
              reasoningPart.state = 'done';
              delete state.activeReasoningParts[chunk.id];

              write();
              break;
            }

            case 'file': {
              state.message.parts.push({
                type: 'file',
                mediaType: chunk.mediaType,
                url: chunk.url,
                ...(chunk.providerMetadata != null
                  ? { providerMetadata: chunk.providerMetadata }
                  : {}),
              });

              write();
              break;
            }

            case 'source-url': {
              state.message.parts.push({
                type: 'source-url',
                sourceId: chunk.sourceId,
                url: chunk.url,
                title: chunk.title,
                providerMetadata: chunk.providerMetadata,
              });

              write();
              break;
            }

            case 'source-document': {
              state.message.parts.push({
                type: 'source-document',
                sourceId: chunk.sourceId,
                mediaType: chunk.mediaType,
                title: chunk.title,
                filename: chunk.filename,
                providerMetadata: chunk.providerMetadata,
              });

              write();
              break;
            }

            case 'tool-input-start': {
              const toolInvocations =
                state.message.parts.filter(isStaticToolUIPart);

              // add the partial tool call to the map
              state.partialToolCalls[chunk.toolCallId] = {
                text: '',
                toolName: chunk.toolName,
                index: toolInvocations.length,
                dynamic: chunk.dynamic,
                title: chunk.title,
              };

              if (chunk.dynamic) {
                updateDynamicToolPart({
                  toolCallId: chunk.toolCallId,
                  toolName: chunk.toolName,
                  state: 'input-streaming',
                  input: undefined,
                  providerExecuted: chunk.providerExecuted,
                  title: chunk.title,
                  providerMetadata: chunk.providerMetadata,
                });
              } else {
                updateToolPart({
                  toolCallId: chunk.toolCallId,
                  toolName: chunk.toolName,
                  state: 'input-streaming',
                  input: undefined,
                  providerExecuted: chunk.providerExecuted,
                  title: chunk.title,
                  providerMetadata: chunk.providerMetadata,
                });
              }

              write();
              break;
            }

            case 'tool-input-delta': {
              const partialToolCall = state.partialToolCalls[chunk.toolCallId];
              if (partialToolCall == null) {
                throw new UIMessageStreamError({
                  chunkType: 'tool-input-delta',
                  chunkId: chunk.toolCallId,
                  message:
                    `Received tool-input-delta for missing tool call with ID "${chunk.toolCallId}". ` +
                    `Ensure a "tool-input-start" chunk is sent before any "tool-input-delta" chunks.`,
                });
              }

              partialToolCall.text += chunk.inputTextDelta;

              const { value: partialArgs } = await parsePartialJson(
                partialToolCall.text,
              );

              if (partialToolCall.dynamic) {
                updateDynamicToolPart({
                  toolCallId: chunk.toolCallId,
                  toolName: partialToolCall.toolName,
                  state: 'input-streaming',
                  input: partialArgs,
                  title: partialToolCall.title,
                });
              } else {
                updateToolPart({
                  toolCallId: chunk.toolCallId,
                  toolName: partialToolCall.toolName,
                  state: 'input-streaming',
                  input: partialArgs,
                  title: partialToolCall.title,
                });
              }

              write();
              break;
            }

            case 'tool-input-available': {
              if (chunk.dynamic) {
                updateDynamicToolPart({
                  toolCallId: chunk.toolCallId,
                  toolName: chunk.toolName,
                  state: 'input-available',
                  input: chunk.input,
                  providerExecuted: chunk.providerExecuted,
                  providerMetadata: chunk.providerMetadata,
                  title: chunk.title,
                });
              } else {
                updateToolPart({
                  toolCallId: chunk.toolCallId,
                  toolName: chunk.toolName,
                  state: 'input-available',
                  input: chunk.input,
                  providerExecuted: chunk.providerExecuted,
                  providerMetadata: chunk.providerMetadata,
                  title: chunk.title,
                });
              }

              write();

              // invoke the onToolCall callback if it exists. This is blocking.
              // In the future we should make this non-blocking, which
              // requires additional state management for error handling etc.
              // Skip calling onToolCall for provider-executed tools since they are already executed
              if (onToolCall && !chunk.providerExecuted) {
                await onToolCall({
                  toolCall: chunk as InferUIMessageToolCall<UI_MESSAGE>,
                });
              }
              break;
            }

            case 'tool-input-error': {
              // When a part already exists for this toolCallId (e.g. from
              // tool-input-start), honour its type so we update in place
              // instead of creating a duplicate with a mismatched type.
              const existingPart = state.message.parts
                .filter(isToolUIPart)
                .find(p => p.toolCallId === chunk.toolCallId);
              const isDynamic =
                existingPart != null
                  ? existingPart.type === 'dynamic-tool'
                  : !!chunk.dynamic;

              if (isDynamic) {
                updateDynamicToolPart({
                  toolCallId: chunk.toolCallId,
                  toolName: chunk.toolName,
                  state: 'output-error',
                  input: chunk.input,
                  errorText: chunk.errorText,
                  providerExecuted: chunk.providerExecuted,
                  providerMetadata: chunk.providerMetadata,
                });
              } else {
                updateToolPart({
                  toolCallId: chunk.toolCallId,
                  toolName: chunk.toolName,
                  state: 'output-error',
                  input: undefined,
                  rawInput: chunk.input,
                  errorText: chunk.errorText,
                  providerExecuted: chunk.providerExecuted,
                  providerMetadata: chunk.providerMetadata,
                });
              }

              write();
              break;
            }

            case 'tool-approval-request': {
              const toolInvocation = getToolInvocation(chunk.toolCallId);
              toolInvocation.state = 'approval-requested';
              toolInvocation.approval = { id: chunk.approvalId };
              write();
              break;
            }

            case 'tool-output-denied': {
              const toolInvocation = getToolInvocation(chunk.toolCallId);
              toolInvocation.state = 'output-denied';
              write();
              break;
            }

            case 'tool-output-available': {
              const toolInvocation = getToolInvocation(chunk.toolCallId);

              if (toolInvocation.type === 'dynamic-tool') {
                updateDynamicToolPart({
                  toolCallId: chunk.toolCallId,
                  toolName: toolInvocation.toolName,
                  state: 'output-available',
                  input: (toolInvocation as any).input,
                  output: chunk.output,
                  preliminary: chunk.preliminary,
                  providerExecuted: chunk.providerExecuted,
                  providerMetadata: chunk.providerMetadata,
                  title: toolInvocation.title,
                });
              } else {
                updateToolPart({
                  toolCallId: chunk.toolCallId,
                  toolName: getStaticToolName(toolInvocation),
                  state: 'output-available',
                  input: (toolInvocation as any).input,
                  output: chunk.output,
                  providerExecuted: chunk.providerExecuted,
                  preliminary: chunk.preliminary,
                  providerMetadata: chunk.providerMetadata,
                  title: toolInvocation.title,
                });
              }

              write();
              break;
            }

            case 'tool-output-error': {
              const toolInvocation = getToolInvocation(chunk.toolCallId);

              if (toolInvocation.type === 'dynamic-tool') {
                updateDynamicToolPart({
                  toolCallId: chunk.toolCallId,
                  toolName: toolInvocation.toolName,
                  state: 'output-error',
                  input: (toolInvocation as any).input,
                  errorText: chunk.errorText,
                  providerExecuted: chunk.providerExecuted,
                  providerMetadata: chunk.providerMetadata,
                  title: toolInvocation.title,
                });
              } else {
                updateToolPart({
                  toolCallId: chunk.toolCallId,
                  toolName: getStaticToolName(toolInvocation),
                  state: 'output-error',
                  input: (toolInvocation as any).input,
                  rawInput: (toolInvocation as any).rawInput,
                  errorText: chunk.errorText,
                  providerExecuted: chunk.providerExecuted,
                  providerMetadata: chunk.providerMetadata,
                  title: toolInvocation.title,
                });
              }

              write();
              break;
            }

            case 'start-step': {
              // add a step boundary part to the message
              state.message.parts.push({ type: 'step-start' });
              break;
            }

            case 'finish-step': {
              // reset the current text and reasoning parts
              state.activeTextParts = {};
              state.activeReasoningParts = {};
              break;
            }

            case 'start': {
              if (chunk.messageId != null) {
                state.message.id = chunk.messageId;
              }

              await updateMessageMetadata(chunk.messageMetadata);

              if (chunk.messageId != null || chunk.messageMetadata != null) {
                write();
              }
              break;
            }

            case 'finish': {
              if (chunk.finishReason != null) {
                state.finishReason = chunk.finishReason;
              }
              await updateMessageMetadata(chunk.messageMetadata);
              if (chunk.messageMetadata != null) {
                write();
              }
              break;
            }

            case 'message-metadata': {
              await updateMessageMetadata(chunk.messageMetadata);
              if (chunk.messageMetadata != null) {
                write();
              }
              break;
            }

            case 'error': {
              onError?.(new Error(chunk.errorText));
              break;
            }

            default: {
              if (isDataUIMessageChunk(chunk)) {
                // validate data chunk if dataPartSchemas is provided
                if (dataPartSchemas?.[chunk.type] != null) {
                  const partIdx = state.message.parts.findIndex(
                    p =>
                      'id' in p &&
                      'data' in p &&
                      p.id === chunk.id &&
                      p.type === chunk.type,
                  );
                  const actualPartIdx =
                    partIdx >= 0 ? partIdx : state.message.parts.length;

                  await validateTypes({
                    value: chunk.data,
                    schema: dataPartSchemas[chunk.type],
                    context: {
                      field: `message.parts[${actualPartIdx}].data`,
                      entityName: chunk.type,
                      entityId: chunk.id,
                    },
                  });
                }

                // cast, validation is done above
                const dataChunk = chunk as DataUIMessageChunk<
                  InferUIMessageData<UI_MESSAGE>
                >;

                // transient parts are not added to the message state
                if (dataChunk.transient) {
                  onData?.(dataChunk);
                  break;
                }

                const existingUIPart =
                  dataChunk.id != null
                    ? (state.message.parts.find(
                        chunkArg =>
                          dataChunk.type === chunkArg.type &&
                          dataChunk.id === chunkArg.id,
                      ) as
                        | DataUIPart<InferUIMessageData<UI_MESSAGE>>
                        | undefined)
                    : undefined;

                if (existingUIPart != null) {
                  existingUIPart.data = dataChunk.data;
                } else {
                  state.message.parts.push(dataChunk);
                }

                onData?.(dataChunk);

                write();
              }
            }
          }

          controller.enqueue(chunk as InferUIMessageChunk<UI_MESSAGE>);
        });
      },
    }),
  );
}
