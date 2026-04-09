// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../../resource';
import { isRequestOptions } from '../../../core';
import * as Core from '../../../core';
import * as CompletionsAPI from './completions';
import { ChatCompletionStoreMessagesPage } from './completions';
import { type CursorPageParams } from '../../../pagination';

export class Messages extends APIResource {
  /**
   * Get the messages in a stored chat completion. Only Chat Completions that have
   * been created with the `store` parameter set to `true` will be returned.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const chatCompletionStoreMessage of client.chat.completions.messages.list(
   *   'completion_id',
   * )) {
   *   // ...
   * }
   * ```
   */
  list(
    completionId: string,
    query?: MessageListParams,
    options?: Core.RequestOptions,
  ): Core.PagePromise<ChatCompletionStoreMessagesPage, CompletionsAPI.ChatCompletionStoreMessage>;
  list(
    completionId: string,
    options?: Core.RequestOptions,
  ): Core.PagePromise<ChatCompletionStoreMessagesPage, CompletionsAPI.ChatCompletionStoreMessage>;
  list(
    completionId: string,
    query: MessageListParams | Core.RequestOptions = {},
    options?: Core.RequestOptions,
  ): Core.PagePromise<ChatCompletionStoreMessagesPage, CompletionsAPI.ChatCompletionStoreMessage> {
    if (isRequestOptions(query)) {
      return this.list(completionId, {}, query);
    }
    return this._client.getAPIList(
      `/chat/completions/${completionId}/messages`,
      ChatCompletionStoreMessagesPage,
      { query, ...options },
    );
  }
}

export interface MessageListParams extends CursorPageParams {
  /**
   * Sort order for messages by timestamp. Use `asc` for ascending order or `desc`
   * for descending order. Defaults to `asc`.
   */
  order?: 'asc' | 'desc';
}

export declare namespace Messages {
  export { type MessageListParams as MessageListParams };
}

export { ChatCompletionStoreMessagesPage };
