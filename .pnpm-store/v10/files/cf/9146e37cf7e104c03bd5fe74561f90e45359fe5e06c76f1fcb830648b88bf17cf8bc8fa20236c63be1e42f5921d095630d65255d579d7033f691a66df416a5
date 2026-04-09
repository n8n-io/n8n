import { executeTool, ModelMessage } from '@ai-sdk/provider-utils';
import { Tracer } from '@opentelemetry/api';
import { notify } from '../util/notify';
import { assembleOperationName } from '../telemetry/assemble-operation-name';
import { recordErrorOnSpan, recordSpan } from '../telemetry/record-span';
import { selectTelemetryAttributes } from '../telemetry/select-telemetry-attributes';
import { TelemetrySettings } from '../telemetry/telemetry-settings';
import { now } from '../util/now';
import {
  GenerateTextOnToolCallFinishCallback,
  GenerateTextOnToolCallStartCallback,
} from './generate-text';
import { TypedToolCall } from './tool-call';
import { ToolOutput } from './tool-output';
import { ToolSet } from './tool-set';
import { TypedToolResult } from './tool-result';
import { TypedToolError } from './tool-error';

/**
 * Executes a single tool call and manages its lifecycle callbacks.
 *
 * This function handles the complete tool execution flow:
 * 1. Invokes `onToolCallStart` callback before execution
 * 2. Executes the tool's `execute` function with proper context
 * 3. Handles streaming outputs via `onPreliminaryToolResult`
 * 4. Invokes `onToolCallFinish` callback with success or error result
 *
 * @returns The tool output (result or error), or undefined if the tool has no execute function.
 */
export async function executeToolCall<TOOLS extends ToolSet>({
  toolCall,
  tools,
  tracer,
  telemetry,
  messages,
  abortSignal,
  experimental_context,
  stepNumber,
  model,
  onPreliminaryToolResult,
  onToolCallStart,
  onToolCallFinish,
}: {
  toolCall: TypedToolCall<TOOLS>;
  tools: TOOLS | undefined;
  tracer: Tracer;
  telemetry: TelemetrySettings | undefined;
  messages: ModelMessage[];
  abortSignal: AbortSignal | undefined;
  experimental_context: unknown;
  stepNumber?: number;
  model?: { provider: string; modelId: string };
  onPreliminaryToolResult?: (result: TypedToolResult<TOOLS>) => void;
  onToolCallStart?:
    | GenerateTextOnToolCallStartCallback<TOOLS>
    | Array<GenerateTextOnToolCallStartCallback<TOOLS> | undefined | null>;
  onToolCallFinish?:
    | GenerateTextOnToolCallFinishCallback<TOOLS>
    | Array<GenerateTextOnToolCallFinishCallback<TOOLS> | undefined | null>;
}): Promise<ToolOutput<TOOLS> | undefined> {
  const { toolName, toolCallId, input } = toolCall;
  const tool = tools?.[toolName];

  if (tool?.execute == null) {
    return undefined;
  }

  const baseCallbackEvent = {
    stepNumber,
    model,
    toolCall,
    messages,
    abortSignal,
    functionId: telemetry?.functionId,
    metadata: telemetry?.metadata as Record<string, unknown> | undefined,
    experimental_context,
  };

  return recordSpan({
    name: 'ai.toolCall',
    attributes: selectTelemetryAttributes({
      telemetry,
      attributes: {
        ...assembleOperationName({
          operationId: 'ai.toolCall',
          telemetry,
        }),
        'ai.toolCall.name': toolName,
        'ai.toolCall.id': toolCallId,
        'ai.toolCall.args': {
          output: () => JSON.stringify(input),
        },
      },
    }),
    tracer,
    fn: async span => {
      let output: unknown;

      await notify({ event: baseCallbackEvent, callbacks: onToolCallStart });

      const startTime = now();

      try {
        const stream = executeTool({
          execute: tool.execute!.bind(tool),
          input,
          options: {
            toolCallId,
            messages,
            abortSignal,
            experimental_context,
          },
        });

        for await (const part of stream) {
          if (part.type === 'preliminary') {
            onPreliminaryToolResult?.({
              ...toolCall,
              type: 'tool-result',
              output: part.output,
              preliminary: true,
            });
          } else {
            output = part.output;
          }
        }
      } catch (error) {
        const durationMs = now() - startTime;

        await notify({
          event: {
            ...baseCallbackEvent,
            success: false as const,
            error,
            durationMs,
          },
          callbacks: onToolCallFinish,
        });

        recordErrorOnSpan(span, error);
        return {
          type: 'tool-error',
          toolCallId,
          toolName,
          input,
          error,
          dynamic: tool.type === 'dynamic',
          ...(toolCall.providerMetadata != null
            ? { providerMetadata: toolCall.providerMetadata }
            : {}),
        } as TypedToolError<TOOLS>;
      }

      const durationMs = now() - startTime;

      await notify({
        event: {
          ...baseCallbackEvent,
          success: true as const,
          output,
          durationMs,
        },
        callbacks: onToolCallFinish,
      });

      try {
        span.setAttributes(
          await selectTelemetryAttributes({
            telemetry,
            attributes: {
              'ai.toolCall.result': {
                output: () => JSON.stringify(output),
              },
            },
          }),
        );
      } catch (ignored) {
        // JSON stringify might fail if the result is not serializable,
        // in which case we just ignore it. In the future we might want to
        // add an optional serialize method to the tool interface and warn
        // if the result is not serializable.
      }

      return {
        type: 'tool-result',
        toolCallId,
        toolName,
        input,
        output,
        dynamic: tool.type === 'dynamic',
        ...(toolCall.providerMetadata != null
          ? { providerMetadata: toolCall.providerMetadata }
          : {}),
      } as TypedToolResult<TOOLS>;
    },
  });
}
