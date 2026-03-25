import type { Logger } from "../client.mjs";
import { AnthropicError, APIUserAbortError } from "../error.mjs";
import { type RequestOptions } from "../internal/request-options.mjs";
import { type BetaContentBlock, type BetaMCPToolUseBlock, type BetaMessage, type BetaMessageParam, Messages as BetaMessages, type BetaRawMessageStreamEvent as BetaMessageStreamEvent, type BetaServerToolUseBlock, type BetaTextCitation, type BetaToolUseBlock, type MessageCreateParams, type MessageCreateParamsBase } from "../resources/beta/messages/messages.mjs";
import { type ParsedBetaMessage } from "./beta-parser.mjs";
export interface MessageStreamEvents {
    connect: () => void;
    streamEvent: (event: BetaMessageStreamEvent, snapshot: BetaMessage) => void;
    text: (textDelta: string, textSnapshot: string) => void;
    citation: (citation: BetaTextCitation, citationsSnapshot: BetaTextCitation[]) => void;
    inputJson: (partialJson: string, jsonSnapshot: unknown) => void;
    thinking: (thinkingDelta: string, thinkingSnapshot: string) => void;
    signature: (signature: string) => void;
    message: (message: BetaMessage) => void;
    contentBlock: (content: BetaContentBlock) => void;
    finalMessage: (message: BetaMessage) => void;
    error: (error: AnthropicError) => void;
    abort: (error: APIUserAbortError) => void;
    end: () => void;
}
export type TracksToolInput = BetaToolUseBlock | BetaServerToolUseBlock | BetaMCPToolUseBlock;
export declare class BetaMessageStream<ParsedT = null> implements AsyncIterable<BetaMessageStreamEvent> {
    #private;
    messages: BetaMessageParam[];
    receivedMessages: ParsedBetaMessage<ParsedT>[];
    controller: AbortController;
    constructor(params: MessageCreateParamsBase | null, opts?: {
        logger?: Logger | undefined;
    });
    get response(): Response | null | undefined;
    get request_id(): string | null | undefined;
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
    withResponse(): Promise<{
        data: BetaMessageStream<ParsedT>;
        response: Response;
        request_id: string | null | undefined;
    }>;
    /**
     * Intended for use on the frontend, consuming a stream produced with
     * `.toReadableStream()` on the backend.
     *
     * Note that messages sent to the model do not appear in `.on('message')`
     * in this context.
     */
    static fromReadableStream(stream: ReadableStream): BetaMessageStream;
    static createMessage<ParsedT>(messages: BetaMessages, params: MessageCreateParamsBase, options?: RequestOptions, { logger }?: {
        logger?: Logger | undefined;
    }): BetaMessageStream<ParsedT>;
    protected _run(executor: () => Promise<any>): void;
    protected _addMessageParam(message: BetaMessageParam): void;
    protected _addMessage(message: ParsedBetaMessage<ParsedT>, emit?: boolean): void;
    protected _createMessage(messages: BetaMessages, params: MessageCreateParams, options?: RequestOptions): Promise<void>;
    protected _connected(response: Response | null): void;
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
    get currentMessage(): BetaMessage | undefined;
    /**
     * @returns a promise that resolves with the the final assistant Message response,
     * or rejects if an error occurred or the stream ended prematurely without producing a Message.
     * If structured outputs were used, this will be a ParsedMessage with a `parsed` field.
     */
    finalMessage(): Promise<ParsedBetaMessage<ParsedT>>;
    /**
     * @returns a promise that resolves with the the final assistant Message's text response, concatenated
     * together if there are more than one text blocks.
     * Rejects if an error occurred or the stream ended prematurely without producing a Message.
     */
    finalText(): Promise<string>;
    protected _emit<Event extends keyof MessageStreamEvents>(event: Event, ...args: Parameters<MessageStreamEvents[Event]>): void;
    protected _emitFinal(): void;
    protected _fromReadableStream(readableStream: ReadableStream, options?: RequestOptions): Promise<void>;
    [Symbol.asyncIterator](): AsyncIterator<BetaMessageStreamEvent>;
    toReadableStream(): ReadableStream;
}
//# sourceMappingURL=BetaMessageStream.d.mts.map