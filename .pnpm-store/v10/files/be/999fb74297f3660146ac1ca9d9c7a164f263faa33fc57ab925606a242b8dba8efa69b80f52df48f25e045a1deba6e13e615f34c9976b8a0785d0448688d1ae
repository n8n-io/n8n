import { BetaRunnableTool } from "./BetaRunnableTool.js";
import { Anthropic } from "../../index.js";
import { BetaMessage, BetaMessageParam, BetaToolUnion, MessageCreateParams } from "../../resources/beta.js";
import { BetaMessageStream } from "../BetaMessageStream.js";
/**
 * A ToolRunner handles the automatic conversation loop between the assistant and tools.
 *
 * A ToolRunner is an async iterable that yields either BetaMessage or BetaMessageStream objects
 * depending on the streaming configuration.
 */
export declare class BetaToolRunner<Stream extends boolean> {
    #private;
    private client;
    constructor(client: Anthropic, params: BetaToolRunnerParams);
    [Symbol.asyncIterator](): AsyncIterator<Stream extends true ? BetaMessageStream : Stream extends false ? BetaMessage : BetaMessage | BetaMessageStream>;
    /**
     * Update the parameters for the next API call. This invalidates any cached tool responses.
     *
     * @param paramsOrMutator - Either new parameters or a function to mutate existing parameters
     *
     * @example
     * // Direct parameter update
     * runner.setMessagesParams({
     *   model: 'claude-3-5-haiku-latest',
     *   max_tokens: 500,
     * });
     *
     * @example
     * // Using a mutator function
     * runner.setMessagesParams((params) => ({
     *   ...params,
     *   max_tokens: 100,
     * }));
     */
    setMessagesParams(params: BetaToolRunnerParams): void;
    setMessagesParams(mutator: (prevParams: BetaToolRunnerParams) => BetaToolRunnerParams): void;
    /**
     * Get the tool response for the last message from the assistant.
     * Avoids redundant tool executions by caching results.
     *
     * @returns A promise that resolves to a BetaMessageParam containing tool results, or null if no tools need to be executed
     *
     * @example
     * const toolResponse = await runner.generateToolResponse();
     * if (toolResponse) {
     *   console.log('Tool results:', toolResponse.content);
     * }
     */
    generateToolResponse(): Promise<Anthropic.Beta.Messages.BetaMessageParam | null>;
    /**
     * Wait for the async iterator to complete. This works even if the async iterator hasn't yet started, and
     * will wait for an instance to start and go to completion.
     *
     * @returns A promise that resolves to the final BetaMessage when the iterator completes
     *
     * @example
     * // Start consuming the iterator
     * for await (const message of runner) {
     *   console.log('Message:', message.content);
     * }
     *
     * // Meanwhile, wait for completion from another part of the code
     * const finalMessage = await runner.done();
     * console.log('Final response:', finalMessage.content);
     */
    done(): Promise<BetaMessage>;
    /**
     * Returns a promise indicating that the stream is done. Unlike .done(), this will eagerly read the stream:
     * * If the iterator has not been consumed, consume the entire iterator and return the final message from the
     * assistant.
     * * If the iterator has been consumed, waits for it to complete and returns the final message.
     *
     * @returns A promise that resolves to the final BetaMessage from the conversation
     * @throws {AnthropicError} If no messages were processed during the conversation
     *
     * @example
     * const finalMessage = await runner.runUntilDone();
     * console.log('Final response:', finalMessage.content);
     */
    runUntilDone(): Promise<BetaMessage>;
    /**
     * Get the current parameters being used by the ToolRunner.
     *
     * @returns A readonly view of the current ToolRunnerParams
     *
     * @example
     * const currentParams = runner.params;
     * console.log('Current model:', currentParams.model);
     * console.log('Message count:', currentParams.messages.length);
     */
    get params(): Readonly<BetaToolRunnerParams>;
    /**
     * Add one or more messages to the conversation history.
     *
     * @param messages - One or more BetaMessageParam objects to add to the conversation
     *
     * @example
     * runner.pushMessages(
     *   { role: 'user', content: 'Also, what about the weather in NYC?' }
     * );
     *
     * @example
     * // Adding multiple messages
     * runner.pushMessages(
     *   { role: 'user', content: 'What about NYC?' },
     *   { role: 'user', content: 'And Boston?' }
     * );
     */
    pushMessages(...messages: BetaMessageParam[]): void;
    /**
     * Makes the ToolRunner directly awaitable, equivalent to calling .runUntilDone()
     * This allows using `await runner` instead of `await runner.runUntilDone()`
     */
    then<TResult1 = BetaMessage, TResult2 = never>(onfulfilled?: ((value: BetaMessage) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): Promise<TResult1 | TResult2>;
}
type Simplify<T> = {
    [KeyType in keyof T]: T[KeyType];
} & {};
/**
 * Parameters for creating a ToolRunner, extending MessageCreateParams with runnable tools.
 */
export type BetaToolRunnerParams = Simplify<Omit<MessageCreateParams, 'tools'> & {
    tools: (BetaToolUnion | BetaRunnableTool<any>)[];
    /**
     * Maximum number of iterations (API requests) to make in the tool execution loop.
     * Each iteration consists of: assistant response → tool execution → tool results.
     * When exceeded, the loop will terminate even if tools are still being requested.
     */
    max_iterations?: number;
}>;
export {};
//# sourceMappingURL=ToolRunner.d.ts.map