import { isAbortError } from '../internal/errors';
import { AnthropicError, APIUserAbortError } from '../error';
import {
  type ContentBlock,
  Messages,
  type Message,
  type MessageStreamEvent,
  type MessageParam,
  type MessageCreateParams,
  type MessageCreateParamsBase,
  type TextBlock,
  type TextCitation,
  type ToolUseBlock,
  type ServerToolUseBlock,
} from '../resources/messages';
import { Stream } from '../streaming';
import { partialParse } from '../_vendor/partial-json-parser/parser';
import { RequestOptions } from '../internal/request-options';

export interface MessageStreamEvents {
  connect: () => void;
  streamEvent: (event: MessageStreamEvent, snapshot: Message) => void;
  text: (textDelta: string, textSnapshot: string) => void;
  citation: (citation: TextCitation, citationsSnapshot: TextCitation[]) => void;
  inputJson: (partialJson: string, jsonSnapshot: unknown) => void;
  thinking: (thinkingDelta: string, thinkingSnapshot: string) => void;
  signature: (signature: string) => void;
  message: (message: Message) => void;
  contentBlock: (content: ContentBlock) => void;
  finalMessage: (message: Message) => void;
  error: (error: AnthropicError) => void;
  abort: (error: APIUserAbortError) => void;
  end: () => void;
}

type MessageStreamEventListeners<Event extends keyof MessageStreamEvents> = {
  listener: MessageStreamEvents[Event];
  once?: boolean;
}[];

const JSON_BUF_PROPERTY = '__json_buf';

export type TracksToolInput = ToolUseBlock | ServerToolUseBlock;

function tracksToolInput(content: ContentBlock): content is TracksToolInput {
  return content.type === 'tool_use' || content.type === 'server_tool_use';
}

export class MessageStream implements AsyncIterable<MessageStreamEvent> {
  messages: MessageParam[] = [];
  receivedMessages: Message[] = [];
  #currentMessageSnapshot: Message | undefined;

  controller: AbortController = new AbortController();

  #connectedPromise: Promise<Response | null>;
  #resolveConnectedPromise: (response: Response | null) => void = () => {};
  #rejectConnectedPromise: (error: AnthropicError) => void = () => {};

  #endPromise: Promise<void>;
  #resolveEndPromise: () => void = () => {};
  #rejectEndPromise: (error: AnthropicError) => void = () => {};

  #listeners: { [Event in keyof MessageStreamEvents]?: MessageStreamEventListeners<Event> } = {};

  #ended = false;
  #errored = false;
  #aborted = false;
  #catchingPromiseCreated = false;
  #response: Response | null | undefined;
  #request_id: string | null | undefined;

  constructor() {
    this.#connectedPromise = new Promise<Response | null>((resolve, reject) => {
      this.#resolveConnectedPromise = resolve;
      this.#rejectConnectedPromise = reject;
    });

    this.#endPromise = new Promise<void>((resolve, reject) => {
      this.#resolveEndPromise = resolve;
      this.#rejectEndPromise = reject;
    });

    // Don't let these promises cause unhandled rejection errors.
    // we will manually cause an unhandled rejection error later
    // if the user hasn't registered any error listener or called
    // any promise-returning method.
    this.#connectedPromise.catch(() => {});
    this.#endPromise.catch(() => {});
  }

  get response(): Response | null | undefined {
    return this.#response;
  }

  get request_id(): string | null | undefined {
    return this.#request_id;
  }

  /**
   * Returns the `MessageStream` data, the raw `Response` instance and the ID of the request,
   * returned vie the `request-id` header which is useful for debugging requests and resporting
   * issues to Anthropic.
   *
   * This is the same as the `APIPromise.withResponse()` method.
   *
   * This method will raise an error if you created the stream using `MessageStream.fromReadableStream`
   * as no `Response` is available.
   */
  async withResponse(): Promise<{
    data: MessageStream;
    response: Response;
    request_id: string | null | undefined;
  }> {
    this.#catchingPromiseCreated = true;

    const response = await this.#connectedPromise;
    if (!response) {
      throw new Error('Could not resolve a `Response` object');
    }

    return {
      data: this,
      response,
      request_id: response.headers.get('request-id'),
    };
  }

  /**
   * Intended for use on the frontend, consuming a stream produced with
   * `.toReadableStream()` on the backend.
   *
   * Note that messages sent to the model do not appear in `.on('message')`
   * in this context.
   */
  static fromReadableStream(stream: ReadableStream): MessageStream {
    const runner = new MessageStream();
    runner._run(() => runner._fromReadableStream(stream));
    return runner;
  }

  static createMessage(
    messages: Messages,
    params: MessageCreateParamsBase,
    options?: RequestOptions,
  ): MessageStream {
    const runner = new MessageStream();
    for (const message of params.messages) {
      runner._addMessageParam(message);
    }
    runner._run(() =>
      runner._createMessage(
        messages,
        { ...params, stream: true },
        { ...options, headers: { ...options?.headers, 'X-Stainless-Helper-Method': 'stream' } },
      ),
    );
    return runner;
  }

  protected _run(executor: () => Promise<any>) {
    executor().then(() => {
      this._emitFinal();
      this._emit('end');
    }, this.#handleError);
  }

  protected _addMessageParam(message: MessageParam) {
    this.messages.push(message);
  }

  protected _addMessage(message: Message, emit = true) {
    this.receivedMessages.push(message);
    if (emit) {
      this._emit('message', message);
    }
  }

  protected async _createMessage(
    messages: Messages,
    params: MessageCreateParams,
    options?: RequestOptions,
  ): Promise<void> {
    const signal = options?.signal;
    let abortHandler: (() => void) | undefined;
    if (signal) {
      if (signal.aborted) this.controller.abort();
      abortHandler = this.controller.abort.bind(this.controller);
      signal.addEventListener('abort', abortHandler);
    }
    try {
      this.#beginRequest();
      const { response, data: stream } = await messages
        .create({ ...params, stream: true }, { ...options, signal: this.controller.signal })
        .withResponse();
      this._connected(response);
      for await (const event of stream) {
        this.#addStreamEvent(event);
      }
      if (stream.controller.signal?.aborted) {
        throw new APIUserAbortError();
      }
      this.#endRequest();
    } finally {
      if (signal && abortHandler) {
        signal.removeEventListener('abort', abortHandler);
      }
    }
  }

  protected _connected(response: Response | null) {
    if (this.ended) return;
    this.#response = response;
    this.#request_id = response?.headers.get('request-id');
    this.#resolveConnectedPromise(response);
    this._emit('connect');
  }

  get ended(): boolean {
    return this.#ended;
  }

  get errored(): boolean {
    return this.#errored;
  }

  get aborted(): boolean {
    return this.#aborted;
  }

  abort() {
    this.controller.abort();
  }

  /**
   * Adds the listener function to the end of the listeners array for the event.
   * No checks are made to see if the listener has already been added. Multiple calls passing
   * the same combination of event and listener will result in the listener being added, and
   * called, multiple times.
   * @returns this MessageStream, so that calls can be chained
   */
  on<Event extends keyof MessageStreamEvents>(event: Event, listener: MessageStreamEvents[Event]): this {
    const listeners: MessageStreamEventListeners<Event> =
      this.#listeners[event] || (this.#listeners[event] = []);
    listeners.push({ listener });
    return this;
  }

  /**
   * Removes the specified listener from the listener array for the event.
   * off() will remove, at most, one instance of a listener from the listener array. If any single
   * listener has been added multiple times to the listener array for the specified event, then
   * off() must be called multiple times to remove each instance.
   * @returns this MessageStream, so that calls can be chained
   */
  off<Event extends keyof MessageStreamEvents>(event: Event, listener: MessageStreamEvents[Event]): this {
    const listeners = this.#listeners[event];
    if (!listeners) return this;
    const index = listeners.findIndex((l) => l.listener === listener);
    if (index >= 0) listeners.splice(index, 1);
    return this;
  }

  /**
   * Adds a one-time listener function for the event. The next time the event is triggered,
   * this listener is removed and then invoked.
   * @returns this MessageStream, so that calls can be chained
   */
  once<Event extends keyof MessageStreamEvents>(event: Event, listener: MessageStreamEvents[Event]): this {
    const listeners: MessageStreamEventListeners<Event> =
      this.#listeners[event] || (this.#listeners[event] = []);
    listeners.push({ listener, once: true });
    return this;
  }

  /**
   * This is similar to `.once()`, but returns a Promise that resolves the next time
   * the event is triggered, instead of calling a listener callback.
   * @returns a Promise that resolves the next time given event is triggered,
   * or rejects if an error is emitted.  (If you request the 'error' event,
   * returns a promise that resolves with the error).
   *
   * Example:
   *
   *   const message = await stream.emitted('message') // rejects if the stream errors
   */
  emitted<Event extends keyof MessageStreamEvents>(
    event: Event,
  ): Promise<
    Parameters<MessageStreamEvents[Event]> extends [infer Param] ? Param
    : Parameters<MessageStreamEvents[Event]> extends [] ? void
    : Parameters<MessageStreamEvents[Event]>
  > {
    return new Promise((resolve, reject) => {
      this.#catchingPromiseCreated = true;
      if (event !== 'error') this.once('error', reject);
      this.once(event, resolve as any);
    });
  }

  async done(): Promise<void> {
    this.#catchingPromiseCreated = true;
    await this.#endPromise;
  }

  get currentMessage(): Message | undefined {
    return this.#currentMessageSnapshot;
  }

  #getFinalMessage(): Message {
    if (this.receivedMessages.length === 0) {
      throw new AnthropicError('stream ended without producing a Message with role=assistant');
    }
    return this.receivedMessages.at(-1)!;
  }

  /**
   * @returns a promise that resolves with the the final assistant Message response,
   * or rejects if an error occurred or the stream ended prematurely without producing a Message.
   */
  async finalMessage(): Promise<Message> {
    await this.done();
    return this.#getFinalMessage();
  }

  #getFinalText(): string {
    if (this.receivedMessages.length === 0) {
      throw new AnthropicError('stream ended without producing a Message with role=assistant');
    }
    const textBlocks = this.receivedMessages
      .at(-1)!
      .content.filter((block): block is TextBlock => block.type === 'text')
      .map((block) => block.text);
    if (textBlocks.length === 0) {
      throw new AnthropicError('stream ended without producing a content block with type=text');
    }
    return textBlocks.join(' ');
  }

  /**
   * @returns a promise that resolves with the the final assistant Message's text response, concatenated
   * together if there are more than one text blocks.
   * Rejects if an error occurred or the stream ended prematurely without producing a Message.
   */
  async finalText(): Promise<string> {
    await this.done();
    return this.#getFinalText();
  }

  #handleError = (error: unknown) => {
    this.#errored = true;
    if (isAbortError(error)) {
      error = new APIUserAbortError();
    }
    if (error instanceof APIUserAbortError) {
      this.#aborted = true;
      return this._emit('abort', error);
    }
    if (error instanceof AnthropicError) {
      return this._emit('error', error);
    }
    if (error instanceof Error) {
      const anthropicError: AnthropicError = new AnthropicError(error.message);
      // @ts-ignore
      anthropicError.cause = error;
      return this._emit('error', anthropicError);
    }
    return this._emit('error', new AnthropicError(String(error)));
  };

  protected _emit<Event extends keyof MessageStreamEvents>(
    event: Event,
    ...args: Parameters<MessageStreamEvents[Event]>
  ) {
    // make sure we don't emit any MessageStreamEvents after end
    if (this.#ended) return;

    if (event === 'end') {
      this.#ended = true;
      this.#resolveEndPromise();
    }

    const listeners: MessageStreamEventListeners<Event> | undefined = this.#listeners[event];
    if (listeners) {
      this.#listeners[event] = listeners.filter((l) => !l.once) as any;
      listeners.forEach(({ listener }: any) => listener(...args));
    }

    if (event === 'abort') {
      const error = args[0] as APIUserAbortError;
      if (!this.#catchingPromiseCreated && !listeners?.length) {
        Promise.reject(error);
      }
      this.#rejectConnectedPromise(error);
      this.#rejectEndPromise(error);
      this._emit('end');
      return;
    }

    if (event === 'error') {
      // NOTE: _emit('error', error) should only be called from #handleError().

      const error = args[0] as AnthropicError;
      if (!this.#catchingPromiseCreated && !listeners?.length) {
        // Trigger an unhandled rejection if the user hasn't registered any error handlers.
        // If you are seeing stack traces here, make sure to handle errors via either:
        // - runner.on('error', () => ...)
        // - await runner.done()
        // - await runner.final...()
        // - etc.
        Promise.reject(error);
      }
      this.#rejectConnectedPromise(error);
      this.#rejectEndPromise(error);
      this._emit('end');
    }
  }

  protected _emitFinal() {
    const finalMessage = this.receivedMessages.at(-1);
    if (finalMessage) {
      this._emit('finalMessage', this.#getFinalMessage());
    }
  }

  #beginRequest() {
    if (this.ended) return;
    this.#currentMessageSnapshot = undefined;
  }
  #addStreamEvent(event: MessageStreamEvent) {
    if (this.ended) return;
    const messageSnapshot = this.#accumulateMessage(event);
    this._emit('streamEvent', event, messageSnapshot);

    switch (event.type) {
      case 'content_block_delta': {
        const content = messageSnapshot.content.at(-1)!;
        switch (event.delta.type) {
          case 'text_delta': {
            if (content.type === 'text') {
              this._emit('text', event.delta.text, content.text || '');
            }
            break;
          }
          case 'citations_delta': {
            if (content.type === 'text') {
              this._emit('citation', event.delta.citation, content.citations ?? []);
            }
            break;
          }
          case 'input_json_delta': {
            if (tracksToolInput(content) && content.input) {
              this._emit('inputJson', event.delta.partial_json, content.input);
            }
            break;
          }
          case 'thinking_delta': {
            if (content.type === 'thinking') {
              this._emit('thinking', event.delta.thinking, content.thinking);
            }
            break;
          }
          case 'signature_delta': {
            if (content.type === 'thinking') {
              this._emit('signature', content.signature);
            }
            break;
          }
          default:
            checkNever(event.delta);
        }
        break;
      }
      case 'message_stop': {
        this._addMessageParam(messageSnapshot);
        this._addMessage(messageSnapshot, true);
        break;
      }
      case 'content_block_stop': {
        this._emit('contentBlock', messageSnapshot.content.at(-1)!);
        break;
      }
      case 'message_start': {
        this.#currentMessageSnapshot = messageSnapshot;
        break;
      }
      case 'content_block_start':
      case 'message_delta':
        break;
    }
  }
  #endRequest(): Message {
    if (this.ended) {
      throw new AnthropicError(`stream has ended, this shouldn't happen`);
    }
    const snapshot = this.#currentMessageSnapshot;
    if (!snapshot) {
      throw new AnthropicError(`request ended without sending any chunks`);
    }
    this.#currentMessageSnapshot = undefined;
    return snapshot;
  }

  protected async _fromReadableStream(
    readableStream: ReadableStream,
    options?: RequestOptions,
  ): Promise<void> {
    const signal = options?.signal;
    let abortHandler: (() => void) | undefined;
    if (signal) {
      if (signal.aborted) this.controller.abort();
      abortHandler = this.controller.abort.bind(this.controller);
      signal.addEventListener('abort', abortHandler);
    }
    try {
      this.#beginRequest();
      this._connected(null);
      const stream = Stream.fromReadableStream<MessageStreamEvent>(readableStream, this.controller);
      for await (const event of stream) {
        this.#addStreamEvent(event);
      }
      if (stream.controller.signal?.aborted) {
        throw new APIUserAbortError();
      }
      this.#endRequest();
    } finally {
      if (signal && abortHandler) {
        signal.removeEventListener('abort', abortHandler);
      }
    }
  }

  /**
   * Mutates this.#currentMessage with the current event. Handling the accumulation of multiple messages
   * will be needed to be handled by the caller, this method will throw if you try to accumulate for multiple
   * messages.
   */
  #accumulateMessage(event: MessageStreamEvent): Message {
    let snapshot = this.#currentMessageSnapshot;

    if (event.type === 'message_start') {
      if (snapshot) {
        throw new AnthropicError(`Unexpected event order, got ${event.type} before receiving "message_stop"`);
      }
      return event.message;
    }

    if (!snapshot) {
      throw new AnthropicError(`Unexpected event order, got ${event.type} before "message_start"`);
    }

    switch (event.type) {
      case 'message_stop':
        return snapshot;
      case 'message_delta':
        snapshot.stop_reason = event.delta.stop_reason;
        snapshot.stop_sequence = event.delta.stop_sequence;
        snapshot.usage.output_tokens = event.usage.output_tokens;

        // Update other usage fields if they exist in the event
        if (event.usage.input_tokens != null) {
          snapshot.usage.input_tokens = event.usage.input_tokens;
        }

        if (event.usage.cache_creation_input_tokens != null) {
          snapshot.usage.cache_creation_input_tokens = event.usage.cache_creation_input_tokens;
        }

        if (event.usage.cache_read_input_tokens != null) {
          snapshot.usage.cache_read_input_tokens = event.usage.cache_read_input_tokens;
        }

        if (event.usage.server_tool_use != null) {
          snapshot.usage.server_tool_use = event.usage.server_tool_use;
        }

        return snapshot;
      case 'content_block_start':
        snapshot.content.push({ ...event.content_block });
        return snapshot;
      case 'content_block_delta': {
        const snapshotContent = snapshot.content.at(event.index);

        switch (event.delta.type) {
          case 'text_delta': {
            if (snapshotContent?.type === 'text') {
              snapshot.content[event.index] = {
                ...snapshotContent,
                text: (snapshotContent.text || '') + event.delta.text,
              };
            }
            break;
          }
          case 'citations_delta': {
            if (snapshotContent?.type === 'text') {
              snapshot.content[event.index] = {
                ...snapshotContent,
                citations: [...(snapshotContent.citations ?? []), event.delta.citation],
              };
            }
            break;
          }
          case 'input_json_delta': {
            if (snapshotContent && tracksToolInput(snapshotContent)) {
              // we need to keep track of the raw JSON string as well so that we can
              // re-parse it for each delta, for now we just store it as an untyped
              // non-enumerable property on the snapshot
              let jsonBuf = (snapshotContent as any)[JSON_BUF_PROPERTY] || '';
              jsonBuf += event.delta.partial_json;

              const newContent = { ...snapshotContent };
              Object.defineProperty(newContent, JSON_BUF_PROPERTY, {
                value: jsonBuf,
                enumerable: false,
                writable: true,
              });

              if (jsonBuf) {
                newContent.input = partialParse(jsonBuf);
              }
              snapshot.content[event.index] = newContent;
            }
            break;
          }
          case 'thinking_delta': {
            if (snapshotContent?.type === 'thinking') {
              snapshot.content[event.index] = {
                ...snapshotContent,
                thinking: snapshotContent.thinking + event.delta.thinking,
              };
            }
            break;
          }
          case 'signature_delta': {
            if (snapshotContent?.type === 'thinking') {
              snapshot.content[event.index] = {
                ...snapshotContent,
                signature: event.delta.signature,
              };
            }
            break;
          }
          default:
            checkNever(event.delta);
        }

        return snapshot;
      }
      case 'content_block_stop':
        return snapshot;
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<MessageStreamEvent> {
    const pushQueue: MessageStreamEvent[] = [];
    const readQueue: {
      resolve: (chunk: MessageStreamEvent | undefined) => void;
      reject: (error: unknown) => void;
    }[] = [];
    let done = false;

    this.on('streamEvent', (event) => {
      const reader = readQueue.shift();
      if (reader) {
        reader.resolve(event);
      } else {
        pushQueue.push(event);
      }
    });

    this.on('end', () => {
      done = true;
      for (const reader of readQueue) {
        reader.resolve(undefined);
      }
      readQueue.length = 0;
    });

    this.on('abort', (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });

    this.on('error', (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });

    return {
      next: async (): Promise<IteratorResult<MessageStreamEvent>> => {
        if (!pushQueue.length) {
          if (done) {
            return { value: undefined, done: true };
          }
          return new Promise<MessageStreamEvent | undefined>((resolve, reject) =>
            readQueue.push({ resolve, reject }),
          ).then((chunk) => (chunk ? { value: chunk, done: false } : { value: undefined, done: true }));
        }
        const chunk = pushQueue.shift()!;
        return { value: chunk, done: false };
      },
      return: async () => {
        this.abort();
        return { value: undefined, done: true };
      },
    };
  }

  toReadableStream(): ReadableStream {
    const stream = new Stream(this[Symbol.asyncIterator].bind(this), this.controller);
    return stream.toReadableStream();
  }
}

// used to ensure exhaustive case matching without throwing a runtime error
function checkNever(x: never) {}
