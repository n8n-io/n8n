import {
  FetchFunction,
  Resolvable,
  normalizeHeaders,
  resolve,
} from '@ai-sdk/provider-utils';
import { UIMessageChunk } from '../ui-message-stream/ui-message-chunks';
import { ChatTransport } from './chat-transport';
import { UIMessage } from './ui-messages';

export type PrepareSendMessagesRequest<UI_MESSAGE extends UIMessage> = (
  options: {
    id: string;
    messages: UI_MESSAGE[];
    requestMetadata: unknown;
    body: Record<string, any> | undefined;
    credentials: RequestCredentials | undefined;
    headers: HeadersInit | undefined;
    api: string;
  } & {
    trigger: 'submit-message' | 'regenerate-message';
    messageId: string | undefined;
  },
) =>
  | {
      body: object;
      headers?: HeadersInit;
      credentials?: RequestCredentials;
      api?: string;
    }
  | PromiseLike<{
      body: object;
      headers?: HeadersInit;
      credentials?: RequestCredentials;
      api?: string;
    }>;

export type PrepareReconnectToStreamRequest = (options: {
  id: string;
  requestMetadata: unknown;
  body: Record<string, any> | undefined;
  credentials: RequestCredentials | undefined;
  headers: HeadersInit | undefined;
  api: string;
}) =>
  | {
      headers?: HeadersInit;
      credentials?: RequestCredentials;
      api?: string;
    }
  | PromiseLike<{
      headers?: HeadersInit;
      credentials?: RequestCredentials;
      api?: string;
    }>;

/**
 * Options for the `HttpChatTransport` class.
 *
 * @param UI_MESSAGE - The type of message to be used in the chat.
 */
export type HttpChatTransportInitOptions<UI_MESSAGE extends UIMessage> = {
  /**
   * The API URL to be used for the chat transport.
   * Defaults to '/api/chat'.
   */
  api?: string;

  /**
   * The credentials mode to be used for the fetch request.
   * Possible values are: 'omit', 'same-origin', 'include'.
   * Defaults to 'same-origin'.
   */
  credentials?: Resolvable<RequestCredentials>;

  /**
   * HTTP headers to be sent with the API request.
   */
  headers?: Resolvable<Record<string, string> | Headers>;

  /**
   * Extra body object to be sent with the API request.
   * @example
   * Send a `sessionId` to the API along with the messages.
   * ```js
   * useChat({
   *   body: {
   *     sessionId: '123',
   *   }
   * })
   * ```
   */
  body?: Resolvable<object>;

  /**
   * Custom fetch implementation. You can use it as a middleware to intercept requests,
   * or to provide a custom fetch implementation for e.g. testing.
   */
  fetch?: FetchFunction;

  /**
   * When a function is provided, it will be used
   * to prepare the request body for the chat API. This can be useful for
   * customizing the request body based on the messages and data in the chat.
   */
  prepareSendMessagesRequest?: PrepareSendMessagesRequest<UI_MESSAGE>;

  /**
   * When a function is provided, it will be used
   * to prepare the reconnect request for the chat API. This can be useful for
   * customizing the request based on the chat session.
   */
  prepareReconnectToStreamRequest?: PrepareReconnectToStreamRequest;
};

export abstract class HttpChatTransport<
  UI_MESSAGE extends UIMessage,
> implements ChatTransport<UI_MESSAGE> {
  protected api: string;
  protected credentials: HttpChatTransportInitOptions<UI_MESSAGE>['credentials'];
  protected headers: HttpChatTransportInitOptions<UI_MESSAGE>['headers'];
  protected body: HttpChatTransportInitOptions<UI_MESSAGE>['body'];
  protected fetch?: FetchFunction;
  protected prepareSendMessagesRequest?: PrepareSendMessagesRequest<UI_MESSAGE>;
  protected prepareReconnectToStreamRequest?: PrepareReconnectToStreamRequest;

  constructor({
    api = '/api/chat',
    credentials,
    headers,
    body,
    fetch,
    prepareSendMessagesRequest,
    prepareReconnectToStreamRequest,
  }: HttpChatTransportInitOptions<UI_MESSAGE>) {
    this.api = api;
    this.credentials = credentials;
    this.headers = headers;
    this.body = body;
    this.fetch = fetch;
    this.prepareSendMessagesRequest = prepareSendMessagesRequest;
    this.prepareReconnectToStreamRequest = prepareReconnectToStreamRequest;
  }

  async sendMessages({
    abortSignal,
    ...options
  }: Parameters<ChatTransport<UI_MESSAGE>['sendMessages']>[0]) {
    const resolvedBody = await resolve(this.body);
    const resolvedHeaders = await resolve(this.headers);
    const resolvedCredentials = await resolve(this.credentials);

    const baseHeaders = {
      ...normalizeHeaders(resolvedHeaders),
      ...normalizeHeaders(options.headers),
    };

    const preparedRequest = await this.prepareSendMessagesRequest?.({
      api: this.api,
      id: options.chatId,
      messages: options.messages,
      body: { ...resolvedBody, ...options.body },
      headers: baseHeaders,
      credentials: resolvedCredentials,
      requestMetadata: options.metadata,
      trigger: options.trigger,
      messageId: options.messageId,
    });

    const api = preparedRequest?.api ?? this.api;
    const headers =
      preparedRequest?.headers !== undefined
        ? normalizeHeaders(preparedRequest.headers)
        : baseHeaders;
    const body =
      preparedRequest?.body !== undefined
        ? preparedRequest.body
        : {
            ...resolvedBody,
            ...options.body,
            id: options.chatId,
            messages: options.messages,
            trigger: options.trigger,
            messageId: options.messageId,
          };
    const credentials = preparedRequest?.credentials ?? resolvedCredentials;

    // avoid caching globalThis.fetch in case it is patched by other libraries
    const fetch = this.fetch ?? globalThis.fetch;

    const response = await fetch(api, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
      credentials,
      signal: abortSignal,
    });

    if (!response.ok) {
      throw new Error(
        (await response.text()) ?? 'Failed to fetch the chat response.',
      );
    }

    if (!response.body) {
      throw new Error('The response body is empty.');
    }

    return this.processResponseStream(response.body);
  }

  async reconnectToStream(
    options: Parameters<ChatTransport<UI_MESSAGE>['reconnectToStream']>[0],
  ): Promise<ReadableStream<UIMessageChunk> | null> {
    const resolvedBody = await resolve(this.body);
    const resolvedHeaders = await resolve(this.headers);
    const resolvedCredentials = await resolve(this.credentials);

    const baseHeaders = {
      ...normalizeHeaders(resolvedHeaders),
      ...normalizeHeaders(options.headers),
    };

    const preparedRequest = await this.prepareReconnectToStreamRequest?.({
      api: this.api,
      id: options.chatId,
      body: { ...resolvedBody, ...options.body },
      headers: baseHeaders,
      credentials: resolvedCredentials,
      requestMetadata: options.metadata,
    });

    const api = preparedRequest?.api ?? `${this.api}/${options.chatId}/stream`;
    const headers =
      preparedRequest?.headers !== undefined
        ? normalizeHeaders(preparedRequest.headers)
        : baseHeaders;
    const credentials = preparedRequest?.credentials ?? resolvedCredentials;

    // avoid caching globalThis.fetch in case it is patched by other libraries
    const fetch = this.fetch ?? globalThis.fetch;

    const response = await fetch(api, {
      method: 'GET',
      headers,
      credentials,
    });

    // no active stream found, so we do not resume
    if (response.status === 204) {
      return null;
    }

    if (!response.ok) {
      throw new Error(
        (await response.text()) ?? 'Failed to fetch the chat response.',
      );
    }

    if (!response.body) {
      throw new Error('The response body is empty.');
    }

    return this.processResponseStream(response.body);
  }

  protected abstract processResponseStream(
    stream: ReadableStream<Uint8Array<ArrayBufferLike>>,
  ): ReadableStream<UIMessageChunk>;
}
