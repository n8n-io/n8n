import { FetchFunction } from '@ai-sdk/provider-utils';

export type CompletionRequestOptions = {
  /**
   * An optional object of headers to be passed to the API endpoint.
   */
  headers?: Record<string, string> | Headers;

  /**
   * An optional object to be passed to the API endpoint.
   */
  body?: object;
};

export type UseCompletionOptions = {
  /**
   * The API endpoint that accepts a `{ prompt: string }` object and returns
   * a stream of tokens of the AI completion response. Defaults to `/api/completion`.
   */
  api?: string;
  /**
   * A unique identifier for the completion. If not provided, a random one will be
   * generated. When provided, the `useCompletion` hook with the same `id` will
   * have shared states across components.
   */
  id?: string;

  /**
   * Initial prompt input of the completion.
   */
  initialInput?: string;

  /**
   * Initial completion result. Useful to load an existing history.
   */
  initialCompletion?: string;

  /**
   * Callback function to be called when the completion is finished streaming.
   */
  onFinish?: (prompt: string, completion: string) => void;

  /**
   * Callback function to be called when an error is encountered.
   */
  onError?: (error: Error) => void;

  /**
   * The credentials mode to be used for the fetch request.
   * Possible values are: 'omit', 'same-origin', 'include'.
   * Defaults to 'same-origin'.
   */
  credentials?: RequestCredentials;

  /**
   * HTTP headers to be sent with the API request.
   */
  headers?: Record<string, string> | Headers;

  /**
   * Extra body object to be sent with the API request.
   * @example
   * Send a `sessionId` to the API along with the prompt.
   * ```js
   * useCompletion({
   *   body: {
   *     sessionId: '123',
   *   }
   * })
   * ```
   */
  body?: object;

  /**
   * Streaming protocol that is used. Defaults to `data`.
   */
  streamProtocol?: 'data' | 'text';

  /**
   * Custom fetch implementation. You can use it as a middleware to intercept requests,
   * or to provide a custom fetch implementation for e.g. testing.
   */
  fetch?: FetchFunction;
};
