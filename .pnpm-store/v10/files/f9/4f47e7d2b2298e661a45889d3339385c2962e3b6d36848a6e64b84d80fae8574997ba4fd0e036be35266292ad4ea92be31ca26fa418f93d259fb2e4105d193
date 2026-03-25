                              
import * as Core from '@anthropic-ai/sdk/core';
import { AnthropicError, APIUserAbortError } from '@anthropic-ai/sdk/error';
import { type ContentBlock, Messages, type Message, type MessageStreamEvent, type MessageParam, type MessageCreateParams, type MessageCreateParamsBase } from '@anthropic-ai/sdk/resources/messages';
import { type ReadableStream } from '@anthropic-ai/sdk/_shims/index';
export interface MessageStreamEvents {
    connect: () => void;
    streamEvent: (event: MessageStreamEvent, snapshot: Message) => void;
    text: (textDelta: string, textSnapshot: string) => void;
    inputJson: (partialJson: string, jsonSnapshot: unknown) => void;
    message: (message: Message) => void;
    contentBlock: (content: ContentBlock) => void;
    finalMessage: (message: Message) => void;
    error: (error: AnthropicError) => void;
    abort: (error: APIUserAbortError) => void;
    end: () => void;
}
export declare class MessageStream implements AsyncIterable<MessageStreamEvent> {
    #private;
    messages: MessageParam[];
    receivedMessages: Message[];
    controller: AbortController;
    constructor();
    /**
     * Intended for use on the frontend, consuming a stream produced with
     * `.toReadableStream()` on the backend.
     *
     * Note that messages sent to the model do not appear in `.on('message')`
     * in this context.
     */
    static fromReadableStream(stream: ReadableStream): MessageStream;
    static createMessage(messages: Messages, params: MessageCreateParamsBase, options?: Core.RequestOptions): MessageStream;
    protected _run(executor: () => Promise<any>): void;
    protected _addMessageParam(message: MessageParam): void;
    protected _addMessage(message: Message, emit?: boolean): void;
    protected _createMessage(messages: Messages, params: MessageCreateParams, options?: Core.RequestOptions): Promise<void>;
    protected _connected(): void;
    get ended(): boolean;
    get errored(): boolean;
    get aborted(): boolean;
    abort(): void;
    /**
     * Adds the listener function to the end of the listeners array for the event.
     * No checks are made to see if the listener has already been added. Multiple calls passing
     * the same combination of event and listener will result in the listener being added, and
     * called, multiple times.
     * @returns this MessageStream, so that calls can be chained
     */
    on<Event extends keyof MessageStreamEvents>(event: Event, listener: MessageStreamEvents[Event]): this;
    /**
     * Removes the specified listener from the listener array for the event.
     * off() will remove, at most, one instance of a listener from the listener array. If any single
     * listener has been added multiple times to the listener array for the specified event, then
     * off() must be called multiple times to remove each instance.
     * @returns this MessageStream, so that calls can be chained
     */
    off<Event extends keyof MessageStreamEvents>(event: Event, listener: MessageStreamEvents[Event]): this;
    /**
     * Adds a one-time listener function for the event. The next time the event is triggered,
     * this listener is removed and then invoked.
     * @returns this MessageStream, so that calls can be chained
     */
    once<Event extends keyof MessageStreamEvents>(event: Event, listener: MessageStreamEvents[Event]): this;
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
    emitted<Event extends keyof MessageStreamEvents>(event: Event): Promise<Parameters<MessageStreamEvents[Event]> extends [infer Param] ? Param : Parameters<MessageStreamEvents[Event]> extends [] ? void : Parameters<MessageStreamEvents[Event]>>;
    done(): Promise<void>;
    get currentMessage(): Message | undefined;
    /**
     * @returns a promise that resolves with the the final assistant Message response,
     * or rejects if an error occurred or the stream ended prematurely without producing a Message.
     */
    finalMessage(): Promise<Message>;
    /**
     * @returns a promise that resolves with the the final assistant Message's text response, concatenated
     * together if there are more than one text blocks.
     * Rejects if an error occurred or the stream ended prematurely without producing a Message.
     */
    finalText(): Promise<string>;
    protected _emit<Event extends keyof MessageStreamEvents>(event: Event, ...args: Parameters<MessageStreamEvents[Event]>): void;
    protected _emitFinal(): void;
    protected _fromReadableStream(readableStream: ReadableStream, options?: Core.RequestOptions): Promise<void>;
    [Symbol.asyncIterator](): AsyncIterator<MessageStreamEvent>;
    toReadableStream(): ReadableStream;
}
//# sourceMappingURL=MessageStream.d.ts.map