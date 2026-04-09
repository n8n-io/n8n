import { StreamTextTransform, UIMessageStreamOptions } from '../generate-text';
import { Output } from '../generate-text/output';
import { ToolSet } from '../generate-text/tool-set';
import { TimeoutConfiguration } from '../prompt/call-settings';
import { createUIMessageStreamResponse } from '../ui-message-stream';
import { UIMessageStreamResponseInit } from '../ui-message-stream/ui-message-stream-response-init';
import { InferUITools, UIMessage } from '../ui/ui-messages';
import { Agent } from './agent';
import { createAgentUIStream } from './create-agent-ui-stream';
import type { ToolLoopAgentOnStepFinishCallback } from './tool-loop-agent-settings';

/**
 * Runs the agent and returns a response object with a UI message stream.
 *
 * @param agent - The agent to run.
 * @param uiMessages - The input UI messages.
 * @param abortSignal - Abort signal. Optional.
 * @param timeout - Timeout in milliseconds. Optional.
 * @param options - The options for the agent. Optional.
 * @param experimental_transform - Stream transformations. Optional.
 * @param onStepFinish - Callback that is called when each step is finished. Optional.
 * @param headers - Additional headers for the response. Optional.
 * @param status - The status code for the response. Optional.
 * @param statusText - The status text for the response. Optional.
 * @param consumeSseStream - Whether to consume the SSE stream. Optional.
 *
 * @returns The response object.
 */
export async function createAgentUIStreamResponse<
  CALL_OPTIONS = never,
  TOOLS extends ToolSet = {},
  OUTPUT extends Output = never,
  MESSAGE_METADATA = unknown,
>({
  headers,
  status,
  statusText,
  consumeSseStream,
  ...options
}: {
  agent: Agent<CALL_OPTIONS, TOOLS, OUTPUT>;
  uiMessages: unknown[];
  abortSignal?: AbortSignal;
  timeout?: TimeoutConfiguration;
  options?: CALL_OPTIONS;
  experimental_transform?:
    | StreamTextTransform<TOOLS>
    | Array<StreamTextTransform<TOOLS>>;
  onStepFinish?: ToolLoopAgentOnStepFinishCallback<TOOLS>;
} & UIMessageStreamResponseInit &
  UIMessageStreamOptions<
    UIMessage<MESSAGE_METADATA, never, InferUITools<TOOLS>>
  >): Promise<Response> {
  return createUIMessageStreamResponse({
    headers,
    status,
    statusText,
    consumeSseStream,
    stream: await createAgentUIStream(options),
  });
}
