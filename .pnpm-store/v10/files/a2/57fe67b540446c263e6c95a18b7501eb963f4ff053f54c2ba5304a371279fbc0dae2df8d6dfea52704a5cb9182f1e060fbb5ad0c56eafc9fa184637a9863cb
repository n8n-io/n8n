                              
import * as Core from '@anthropic-ai/sdk/core';
import { AnthropicError, APIUserAbortError } from '@anthropic-ai/sdk/error';
import { type ContentBlock } from '@anthropic-ai/sdk/resources/messages';
import { Messages, type PromptCachingBetaMessage, type RawPromptCachingBetaMessageStreamEvent, type PromptCachingBetaMessageParam, type MessageCreateParams, type MessageCreateParamsBase } from '@anthropic-ai/sdk/resources/beta/prompt-caching/messages';
import { type ReadableStream } from '@anthropic-ai/sdk/_shims/index';
export interface PromptCachingBetaMessageStreamEvents {
    connect: () => void;
    streamEvent: (event: RawPromptCachingBetaMessageStreamEvent, snapshot: PromptCachingBetaMessage) => void;
    text: (textDelta: string, textSnapshot: string) => void;
    inputJson: (partialJson: string, jsonSnapshot: unknown) => void;
    message: (message: PromptCachingBetaMessage) => void;
    contentBlock: (content: ContentBlock) => void;
    finalPromptCachingBetaMessage: (message: PromptCachingBetaMessage) => void;
    error: (error: AnthropicError) => void;
    abort: (error: APIUserAbortError) => void;
    end: () => void;
}
export declare class PromptCachingBetaMessageStream implements AsyncIterable<RawPromptCachingBetaMessageStreamEvent> {
    #private;
    messages: PromptCachingBetaMessageParam[];
    receivedMessages: PromptCachingBetaMessage[];
    controller: AbortController;
    constructor();
    /**
     * Intended for use on the frontend, consuming a stream produced with
     * `.toReadableStream()` on the backend.
     *
     * Note that messages sent to the model do not appear in `.on('message')`
     * in this context.
     */
    static fromReadableStream(stream: ReadableStream): PromptCachingBetaMessageStream;
    static createMessage(messages: Messages, params: MessageCreateParamsBase, options?: Core.RequestOptions): PromptCachingBetaMessageStream;
    protected _run(executor: () => Promise<any>): void;
    protected _addPromptCachingBetaMessageParam(message: PromptCachingBetaMessageParam): void;
    protected _addPromptCachingBetaMessage(message: PromptCachingBetaMessage, emit?: boolean): void;
    protected _createPromptCachingBetaMessage(messages: Messages, params: MessageCreateParams, options?: Core.RequestOptions): Promise<void>;
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
     * @returns this PromptCachingBetaMessageStream, so that calls can be chained
     */
    on<Event extends keyof PromptCachingBetaMessageStreamEvents>(event: Event, listener: PromptCachingBetaMessageStreamEvents[Event]): this;
    /**
     * Removes the specified listener from the listener array for the event.
     * off() will remove, at most, one instance of a listener from the listener array. If any single
     * listener has been added multiple times to the listener array for the specified event, then
     * off() must be called multiple times to remove each instance.
     * @returns this PromptCachingBetaMessageStream, so that calls can be chained
     */
    off<Event extends keyof PromptCachingBetaMessageStreamEvents>(event: Event, listener: PromptCachingBetaMessageStreamEvents[Event]): this;
    /**
     * Adds a one-time listener function for the event. The next time the event is triggered,
     * this listener is removed and then invoked.
     * @returns this PromptCachingBetaMessageStream, so that calls can be chained
     */
    once<Event extends keyof PromptCachingBetaMessageStreamEvents>(event: Event, listener: PromptCachingBetaMessageStreamEvents[Event]): this;
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
    emitted<Event extends keyof PromptCachingBetaMessageStreamEvents>(event: Event): Promise<Parameters<PromptCachingBetaMessageStreamEvents[Event]> extends [infer Param] ? Param : Parameters<PromptCachingBetaMessageStreamEvents[Event]> extends [] ? void : Parameters<PromptCachingBetaMessageStreamEvents[Event]>>;
    done(): Promise<void>;
    get currentMessage(): PromptCachingBetaMessage | undefined;
    /**
     * @returns a promise that resolves with the the final assistant PromptCachingBetaMessage response,
     * or rejects if an error occurred or the stream ended prematurely without producing a PromptCachingBetaMessage.
     */
    finalMessage(): Promise<PromptCachingBetaMessage>;
    /**
     * @returns a promise that resolves with the the final assistant PromptCachingBetaMessage's text response, concatenated
     * together if there are more than one text blocks.
     * Rejects if an error occurred or the stream ended prematurely without producing a PromptCachingBetaMessage.
     */
    finalText(): Promise<string>;
    protected _emit<Event extends keyof PromptCachingBetaMessageStreamEvents>(event: Event, ...args: Parameters<PromptCachingBetaMessageStreamEvents[Event]>): void;
    protected _emitFinal(): void;
    protected _fromReadableStream(readableStream: ReadableStream, options?: Core.RequestOptions): Promise<void>;
    [Symbol.asyncIterator](): AsyncIterator<RawPromptCachingBetaMessageStreamEvent>;
    toReadableStream(): ReadableStream;
}
//# sourceMappingURL=PromptCachingBetaMessageStream.d.ts.map