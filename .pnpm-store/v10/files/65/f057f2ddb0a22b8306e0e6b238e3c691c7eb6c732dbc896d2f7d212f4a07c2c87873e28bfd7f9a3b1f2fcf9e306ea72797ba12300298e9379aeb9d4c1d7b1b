import { UIMessageChunk } from '../ui-message-stream';
import { ChatRequestOptions } from './chat';
import { UIMessage } from './ui-messages';

/**
 * Transport interface for handling chat message communication and streaming.
 *
 * The `ChatTransport` interface provides fine-grained control over how messages
 * are sent to API endpoints and how responses are processed. This enables
 * alternative communication protocols like WebSockets, custom authentication
 * patterns, or specialized backend integrations.
 *
 * @template UI_MESSAGE - The UI message type extending UIMessage
 */
export interface ChatTransport<UI_MESSAGE extends UIMessage> {
  /**
   * Sends messages to the chat API endpoint and returns a streaming response.
   *
   * This method handles both new message submission and message regeneration.
   * It supports real-time streaming of responses through UIMessageChunk events.
   *
   * @param options - Configuration object containing:
   * @param options.trigger - The type of message submission:
   *   - `'submit-message'`: Submitting a new user message
   *   - `'regenerate-message'`: Regenerating an assistant response
   * @param options.chatId - Unique identifier for the chat session
   * @param options.messageId - ID of the message to regenerate (for regenerate-message trigger) or undefined for new messages
   * @param options.messages - Array of UI messages representing the conversation history
   * @param options.abortSignal - Signal to abort the request if needed
   * @param options.headers - Additional HTTP headers to include in the request
   * @param options.body - Additional JSON properties to include in the request body
   * @param options.metadata - Custom metadata to attach to the request
   *
   * @returns Promise resolving to a ReadableStream of UIMessageChunk objects.
   *   The stream emits various chunk types like:
   *   - `text-start`, `text-delta`, `text-end`: For streaming text content
   *   - `tool-input-start`, `tool-input-delta`, `tool-input-available`: For tool calls
   *   - `data-part-start`, `data-part-delta`, `data-part-available`: For data parts
   *   - `error`: For error handling
   *
   * @throws Error when the API request fails or response is invalid
   */
  sendMessages: (
    options: {
      /** The type of message submission - either new message or regeneration */
      trigger: 'submit-message' | 'regenerate-message';
      /** Unique identifier for the chat session */
      chatId: string;
      /** ID of the message to regenerate, or undefined for new messages */
      messageId: string | undefined;
      /** Array of UI messages representing the conversation history */
      messages: UI_MESSAGE[];
      /** Signal to abort the request if needed */
      abortSignal: AbortSignal | undefined;
    } & ChatRequestOptions,
  ) => Promise<ReadableStream<UIMessageChunk>>;

  /**
   * Reconnects to an existing streaming response for the specified chat session.
   *
   * This method is used to resume streaming when a connection is interrupted
   * or when resuming a chat session. It's particularly useful for maintaining
   * continuity in long-running conversations or recovering from network issues.
   *
   * @param options - Configuration object containing:
   * @param options.chatId - Unique identifier for the chat session to reconnect to
   * @param options.headers - Additional HTTP headers to include in the reconnection request
   * @param options.body - Additional JSON properties to include in the request body
   * @param options.metadata - Custom metadata to attach to the request
   *
   * @returns Promise resolving to:
   *   - `ReadableStream<UIMessageChunk>`: If an active stream is found and can be resumed
   *   - `null`: If no active stream exists for the specified chat session (e.g., response already completed)
   *
   * @throws Error when the reconnection request fails or response is invalid
   */
  reconnectToStream: (
    options: {
      /** Unique identifier for the chat session to reconnect to */
      chatId: string;
    } & ChatRequestOptions,
  ) => Promise<ReadableStream<UIMessageChunk> | null>;
}
