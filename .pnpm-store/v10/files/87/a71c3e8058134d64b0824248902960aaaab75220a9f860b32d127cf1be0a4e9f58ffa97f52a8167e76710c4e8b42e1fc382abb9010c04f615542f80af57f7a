import { LanguageModelV3StreamPart, SharedV3Warning } from '@ai-sdk/provider';
import {
  getErrorMessage,
  IdGenerator,
  ModelMessage,
  SystemModelMessage,
} from '@ai-sdk/provider-utils';
import { Tracer } from '@opentelemetry/api';
import { ToolCallNotFoundForApprovalError } from '../error/tool-call-not-found-for-approval-error';
import { TelemetrySettings } from '../telemetry/telemetry-settings';
import { FinishReason, LanguageModelUsage, ProviderMetadata } from '../types';
import { Source } from '../types/language-model';
import { asLanguageModelUsage } from '../types/usage';
import { executeToolCall } from './execute-tool-call';
import {
  StreamTextOnToolCallFinishCallback,
  StreamTextOnToolCallStartCallback,
} from './stream-text';
import { DefaultGeneratedFileWithType, GeneratedFile } from './generated-file';
import { isApprovalNeeded } from './is-approval-needed';
import { parseToolCall } from './parse-tool-call';
import { ToolApprovalRequestOutput } from './tool-approval-request-output';
import { TypedToolCall } from './tool-call';
import { ToolCallRepairFunction } from './tool-call-repair-function';
import { TypedToolError } from './tool-error';
import { TypedToolResult } from './tool-result';
import { ToolSet } from './tool-set';

export type SingleRequestTextStreamPart<TOOLS extends ToolSet> =
  // Text blocks:
  | {
      type: 'text-start';
      providerMetadata?: ProviderMetadata;
      id: string;
    }
  | {
      type: 'text-delta';
      id: string;
      providerMetadata?: ProviderMetadata;
      delta: string;
    }
  | {
      type: 'text-end';
      providerMetadata?: ProviderMetadata;
      id: string;
    }

  // Reasoning blocks:
  | {
      type: 'reasoning-start';
      providerMetadata?: ProviderMetadata;
      id: string;
    }
  | {
      type: 'reasoning-delta';
      id: string;
      providerMetadata?: ProviderMetadata;
      delta: string;
    }
  | {
      type: 'reasoning-end';
      id: string;
      providerMetadata?: ProviderMetadata;
    }

  // Tool calls:
  | {
      type: 'tool-input-start';
      id: string;
      toolName: string;
      providerMetadata?: ProviderMetadata;
      dynamic?: boolean;
      title?: string;
    }
  | {
      type: 'tool-input-delta';
      id: string;
      delta: string;
      providerMetadata?: ProviderMetadata;
    }
  | {
      type: 'tool-input-end';
      id: string;
      providerMetadata?: ProviderMetadata;
    }
  | ToolApprovalRequestOutput<TOOLS>

  // Other types:
  | ({ type: 'source' } & Source)
  | { type: 'file'; file: GeneratedFile; providerMetadata?: ProviderMetadata } // different because of GeneratedFile object
  | ({ type: 'tool-call' } & TypedToolCall<TOOLS>)
  | ({ type: 'tool-result' } & TypedToolResult<TOOLS>)
  | ({ type: 'tool-error' } & TypedToolError<TOOLS>)
  | { type: 'stream-start'; warnings: SharedV3Warning[] }
  | {
      type: 'response-metadata';
      id?: string;
      timestamp?: Date;
      modelId?: string;
    }
  | {
      type: 'finish';
      finishReason: FinishReason;
      rawFinishReason: string | undefined;
      usage: LanguageModelUsage;
      providerMetadata?: ProviderMetadata;
    }
  | { type: 'error'; error: unknown }
  | { type: 'raw'; rawValue: unknown };

export function runToolsTransformation<TOOLS extends ToolSet>({
  tools,
  generatorStream,
  tracer,
  telemetry,
  system,
  messages,
  abortSignal,
  repairToolCall,
  experimental_context,
  generateId,
  stepNumber,
  model,
  onToolCallStart,
  onToolCallFinish,
}: {
  tools: TOOLS | undefined;
  generatorStream: ReadableStream<LanguageModelV3StreamPart>;
  tracer: Tracer;
  telemetry: TelemetrySettings | undefined;
  system: string | SystemModelMessage | Array<SystemModelMessage> | undefined;
  messages: ModelMessage[];
  abortSignal: AbortSignal | undefined;
  repairToolCall: ToolCallRepairFunction<TOOLS> | undefined;
  experimental_context: unknown;
  generateId: IdGenerator;
  stepNumber?: number;
  model?: { provider: string; modelId: string };
  onToolCallStart?:
    | StreamTextOnToolCallStartCallback<TOOLS>
    | Array<StreamTextOnToolCallStartCallback<TOOLS> | undefined | null>;
  onToolCallFinish?:
    | StreamTextOnToolCallFinishCallback<TOOLS>
    | Array<StreamTextOnToolCallFinishCallback<TOOLS> | undefined | null>;
}): ReadableStream<SingleRequestTextStreamPart<TOOLS>> {
  // tool results stream
  let toolResultsStreamController: ReadableStreamDefaultController<
    SingleRequestTextStreamPart<TOOLS>
  > | null = null;
  const toolResultsStream = new ReadableStream<
    SingleRequestTextStreamPart<TOOLS>
  >({
    start(controller) {
      toolResultsStreamController = controller;
    },
  });

  // keep track of outstanding tool results for stream closing:
  const outstandingToolResults = new Set<string>();

  // keep track of tool inputs for provider-side tool results
  const toolInputs = new Map<string, unknown>();

  // keep track of parsed tool calls so provider-emitted approval requests can reference them
  const toolCallsByToolCallId = new Map<string, TypedToolCall<TOOLS>>();

  let canClose = false;
  let finishChunk:
    | (SingleRequestTextStreamPart<TOOLS> & { type: 'finish' })
    | undefined = undefined;

  function attemptClose() {
    // close the tool results controller if no more outstanding tool calls
    if (canClose && outstandingToolResults.size === 0) {
      // we delay sending the finish chunk until all tool results (incl. delayed ones)
      // are received to ensure that the frontend receives tool results before a message
      // finish event arrives.
      if (finishChunk != null) {
        toolResultsStreamController!.enqueue(finishChunk);
      }

      toolResultsStreamController!.close();
    }
  }

  // forward stream
  const forwardStream = new TransformStream<
    LanguageModelV3StreamPart,
    SingleRequestTextStreamPart<TOOLS>
  >({
    async transform(
      chunk: LanguageModelV3StreamPart,
      controller: TransformStreamDefaultController<
        SingleRequestTextStreamPart<TOOLS>
      >,
    ) {
      const chunkType = chunk.type;

      switch (chunkType) {
        // forward:
        case 'stream-start':
        case 'text-start':
        case 'text-delta':
        case 'text-end':
        case 'reasoning-start':
        case 'reasoning-delta':
        case 'reasoning-end':
        case 'tool-input-start':
        case 'tool-input-delta':
        case 'tool-input-end':
        case 'source':
        case 'response-metadata':
        case 'error':
        case 'raw': {
          controller.enqueue(chunk);
          break;
        }

        case 'file': {
          controller.enqueue({
            type: 'file',
            file: new DefaultGeneratedFileWithType({
              data: chunk.data,
              mediaType: chunk.mediaType,
            }),
            ...(chunk.providerMetadata != null
              ? { providerMetadata: chunk.providerMetadata }
              : {}),
          });
          break;
        }

        case 'finish': {
          finishChunk = {
            type: 'finish',
            finishReason: chunk.finishReason.unified,
            rawFinishReason: chunk.finishReason.raw,
            usage: asLanguageModelUsage(chunk.usage),
            providerMetadata: chunk.providerMetadata,
          };
          break;
        }

        case 'tool-approval-request': {
          const toolCall = toolCallsByToolCallId.get(chunk.toolCallId);
          if (toolCall == null) {
            toolResultsStreamController!.enqueue({
              type: 'error',
              error: new ToolCallNotFoundForApprovalError({
                toolCallId: chunk.toolCallId,
                approvalId: chunk.approvalId,
              }),
            });
            break;
          }

          controller.enqueue({
            type: 'tool-approval-request',
            approvalId: chunk.approvalId,
            toolCall,
          });
          break;
        }

        // process tool call:
        case 'tool-call': {
          try {
            const toolCall = await parseToolCall({
              toolCall: chunk,
              tools,
              repairToolCall,
              system,
              messages,
            });

            toolCallsByToolCallId.set(toolCall.toolCallId, toolCall);
            controller.enqueue(toolCall);

            if (toolCall.invalid) {
              toolResultsStreamController!.enqueue({
                type: 'tool-error',
                toolCallId: toolCall.toolCallId,
                toolName: toolCall.toolName,
                input: toolCall.input,
                error: getErrorMessage(toolCall.error!),
                dynamic: true,
                title: toolCall.title,
              });
              break;
            }

            const tool = tools?.[toolCall.toolName];

            if (tool == null) {
              // ignore tool calls for tools that are not available,
              // e.g. provider-executed dynamic tools
              break;
            }

            if (tool.onInputAvailable != null) {
              await tool.onInputAvailable({
                input: toolCall.input,
                toolCallId: toolCall.toolCallId,
                messages,
                abortSignal,
                experimental_context,
              });
            }

            if (
              await isApprovalNeeded({
                tool,
                toolCall,
                messages,
                experimental_context,
              })
            ) {
              toolResultsStreamController!.enqueue({
                type: 'tool-approval-request',
                approvalId: generateId(),
                toolCall,
              });
              break;
            }

            toolInputs.set(toolCall.toolCallId, toolCall.input);

            // Only execute tools that are not provider-executed:
            if (tool.execute != null && toolCall.providerExecuted !== true) {
              const toolExecutionId = generateId(); // use our own id to guarantee uniqueness
              outstandingToolResults.add(toolExecutionId);

              // Note: we don't await the tool execution here (by leaving out 'await' on recordSpan),
              // because we want to process the next chunk as soon as possible.
              // This is important for the case where the tool execution takes a long time.
              executeToolCall({
                toolCall,
                tools,
                tracer,
                telemetry,
                messages,
                abortSignal,
                experimental_context,
                stepNumber,
                model,
                onToolCallStart,
                onToolCallFinish,
                onPreliminaryToolResult: result => {
                  toolResultsStreamController!.enqueue(result);
                },
              })
                .then(result => {
                  toolResultsStreamController!.enqueue(result);
                })
                .catch(error => {
                  toolResultsStreamController!.enqueue({
                    type: 'error',
                    error,
                  });
                })
                .finally(() => {
                  outstandingToolResults.delete(toolExecutionId);
                  attemptClose();
                });
            }
          } catch (error) {
            toolResultsStreamController!.enqueue({ type: 'error', error });
          }

          break;
        }

        case 'tool-result': {
          const toolName = chunk.toolName as keyof TOOLS & string;

          if (chunk.isError) {
            toolResultsStreamController!.enqueue({
              type: 'tool-error',
              toolCallId: chunk.toolCallId,
              toolName,
              input: toolInputs.get(chunk.toolCallId),
              providerExecuted: true,
              error: chunk.result,
              dynamic: chunk.dynamic,
              ...(chunk.providerMetadata != null
                ? { providerMetadata: chunk.providerMetadata }
                : {}),
            } as TypedToolError<TOOLS>);
          } else {
            controller.enqueue({
              type: 'tool-result',
              toolCallId: chunk.toolCallId,
              toolName,
              input: toolInputs.get(chunk.toolCallId),
              output: chunk.result,
              providerExecuted: true,
              dynamic: chunk.dynamic,
              ...(chunk.providerMetadata != null
                ? { providerMetadata: chunk.providerMetadata }
                : {}),
            } as TypedToolResult<TOOLS>);
          }
          break;
        }

        default: {
          const _exhaustiveCheck: never = chunkType;
          throw new Error(`Unhandled chunk type: ${_exhaustiveCheck}`);
        }
      }
    },

    flush() {
      canClose = true;
      attemptClose();
    },
  });

  // combine the generator stream and the tool results stream
  return new ReadableStream<SingleRequestTextStreamPart<TOOLS>>({
    async start(controller) {
      // need to wait for both pipes so there are no dangling promises that
      // can cause uncaught promise rejections when the stream is aborted
      return Promise.all([
        generatorStream.pipeThrough(forwardStream).pipeTo(
          new WritableStream({
            write(chunk) {
              controller.enqueue(chunk);
            },
            close() {
              // the generator stream controller is automatically closed when it's consumed
            },
          }),
        ),
        toolResultsStream.pipeTo(
          new WritableStream({
            write(chunk) {
              controller.enqueue(chunk);
            },
            close() {
              controller.close();
            },
          }),
        ),
      ]);
    },
  });
}
