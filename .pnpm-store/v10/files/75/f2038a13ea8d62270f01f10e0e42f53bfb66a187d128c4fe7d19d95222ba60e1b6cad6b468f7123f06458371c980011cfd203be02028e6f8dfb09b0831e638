import { Output } from '../generate-text/output';
import { UIMessageStreamOptions } from '../generate-text/stream-text-result';
import { ToolSet } from '../generate-text/tool-set';
import { UIMessageChunk } from '../ui-message-stream/ui-message-chunks';
import { Agent } from '../agent/agent';
import { ChatTransport } from './chat-transport';
import { convertToModelMessages } from './convert-to-model-messages';
import { InferUITools, UIMessage } from './ui-messages';
import { validateUIMessages } from './validate-ui-messages';

/**
 * Options for the `DirectChatTransport` class.
 */
export type DirectChatTransportOptions<
  CALL_OPTIONS,
  TOOLS extends ToolSet,
  OUTPUT extends Output,
  UI_MESSAGE extends UIMessage<unknown, never, InferUITools<TOOLS>>,
> = {
  /**
   * The agent to use for generating responses.
   */
  agent: Agent<CALL_OPTIONS, TOOLS, OUTPUT>;

  /**
   * Options to pass to the agent when calling it.
   */
  options?: CALL_OPTIONS;
} & Omit<UIMessageStreamOptions<UI_MESSAGE>, 'onFinish'>;

/**
 * A transport that directly communicates with an Agent in-process,
 * without going through HTTP. This is useful for:
 * - Server-side rendering scenarios
 * - Testing without network
 * - Single-process applications
 *
 * @example
 * ```tsx
 * import { useChat } from '@ai-sdk/react';
 * import { DirectChatTransport } from 'ai';
 * import { myAgent } from './my-agent';
 *
 * const { messages, sendMessage } = useChat({
 *   transport: new DirectChatTransport({ agent: myAgent }),
 * });
 * ```
 */
export class DirectChatTransport<
  CALL_OPTIONS = never,
  TOOLS extends ToolSet = {},
  OUTPUT extends Output = never,
  UI_MESSAGE extends UIMessage<unknown, never, InferUITools<TOOLS>> = UIMessage<
    unknown,
    never,
    InferUITools<TOOLS>
  >,
> implements ChatTransport<UI_MESSAGE> {
  private readonly agent: Agent<CALL_OPTIONS, TOOLS, OUTPUT>;
  private readonly agentOptions: CALL_OPTIONS | undefined;
  private readonly uiMessageStreamOptions: Omit<
    UIMessageStreamOptions<UI_MESSAGE>,
    'onFinish'
  >;

  constructor({
    agent,
    options,
    ...uiMessageStreamOptions
  }: DirectChatTransportOptions<CALL_OPTIONS, TOOLS, OUTPUT, UI_MESSAGE>) {
    this.agent = agent;
    this.agentOptions = options;
    this.uiMessageStreamOptions = uiMessageStreamOptions;
  }

  async sendMessages({
    messages,
    abortSignal,
  }: Parameters<ChatTransport<UI_MESSAGE>['sendMessages']>[0]): Promise<
    ReadableStream<UIMessageChunk>
  > {
    // Validate the incoming UI messages
    const validatedMessages = await validateUIMessages<UI_MESSAGE>({
      messages,
      tools: this.agent.tools,
    });

    // Convert UI messages to model messages
    const modelMessages = await convertToModelMessages(validatedMessages, {
      tools: this.agent.tools,
    });

    // Stream from the agent
    const result = await this.agent.stream({
      prompt: modelMessages,
      abortSignal,
      ...(this.agentOptions !== undefined
        ? { options: this.agentOptions }
        : {}),
    } as Parameters<Agent<CALL_OPTIONS, TOOLS, OUTPUT>['stream']>[0]);

    // Return the UI message stream
    return result.toUIMessageStream(this.uiMessageStreamOptions);
  }

  /**
   * Direct transport does not support reconnection since there is no
   * persistent server-side stream to reconnect to.
   *
   * @returns Always returns `null`
   */
  async reconnectToStream(
    _options: Parameters<ChatTransport<UI_MESSAGE>['reconnectToStream']>[0],
  ): Promise<ReadableStream<UIMessageChunk> | null> {
    return null;
  }
}
