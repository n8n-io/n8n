var _BetaToolRunner_instances, _BetaToolRunner_consumed, _BetaToolRunner_mutated, _BetaToolRunner_state, _BetaToolRunner_message, _BetaToolRunner_toolResponse, _BetaToolRunner_completion, _BetaToolRunner_iterationCount, _BetaToolRunner_generateToolResponse;
import { __classPrivateFieldGet, __classPrivateFieldSet } from "../../internal/tslib.mjs";
import { AnthropicError } from "../../core/error.mjs";
/**
 * Just Promise.withResolvers(), which is not available in all environments.
 */
function promiseWithResolvers() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve: resolve, reject: reject };
}
/**
 * A ToolRunner handles the automatic conversation loop between the assistant and tools.
 *
 * A ToolRunner is an async iterable that yields either BetaMessage or BetaMessageStream objects
 * depending on the streaming configuration.
 */
export class BetaToolRunner {
    constructor(client, params) {
        _BetaToolRunner_instances.add(this);
        this.client = client;
        /** Whether the async iterator has been consumed */
        _BetaToolRunner_consumed.set(this, false);
        /** Whether parameters have been mutated since the last API call */
        _BetaToolRunner_mutated.set(this, false);
        /** Current state containing the request parameters */
        _BetaToolRunner_state.set(this, void 0);
        /** Promise for the last message received from the assistant */
        _BetaToolRunner_message.set(this, void 0);
        /** Cached tool response to avoid redundant executions */
        _BetaToolRunner_toolResponse.set(this, void 0);
        /** Promise resolvers for waiting on completion */
        _BetaToolRunner_completion.set(this, void 0);
        /** Number of iterations (API requests) made so far */
        _BetaToolRunner_iterationCount.set(this, 0);
        __classPrivateFieldSet(this, _BetaToolRunner_state, {
            params: {
                // You can't clone the entire params since there are functions as handlers.
                // You also don't really need to clone params.messages, but it probably will prevent a foot gun
                // somewhere.
                ...params,
                messages: structuredClone(params.messages),
            },
        }, "f");
        __classPrivateFieldSet(this, _BetaToolRunner_completion, promiseWithResolvers(), "f");
    }
    async *[(_BetaToolRunner_consumed = new WeakMap(), _BetaToolRunner_mutated = new WeakMap(), _BetaToolRunner_state = new WeakMap(), _BetaToolRunner_message = new WeakMap(), _BetaToolRunner_toolResponse = new WeakMap(), _BetaToolRunner_completion = new WeakMap(), _BetaToolRunner_iterationCount = new WeakMap(), _BetaToolRunner_instances = new WeakSet(), Symbol.asyncIterator)]() {
        var _a;
        if (__classPrivateFieldGet(this, _BetaToolRunner_consumed, "f")) {
            throw new AnthropicError('Cannot iterate over a consumed stream');
        }
        __classPrivateFieldSet(this, _BetaToolRunner_consumed, true, "f");
        __classPrivateFieldSet(this, _BetaToolRunner_mutated, true, "f");
        __classPrivateFieldSet(this, _BetaToolRunner_toolResponse, undefined, "f");
        try {
            while (true) {
                let stream;
                try {
                    if (__classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.max_iterations &&
                        __classPrivateFieldGet(this, _BetaToolRunner_iterationCount, "f") >= __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.max_iterations) {
                        break;
                    }
                    __classPrivateFieldSet(this, _BetaToolRunner_mutated, false, "f");
                    __classPrivateFieldSet(this, _BetaToolRunner_message, undefined, "f");
                    __classPrivateFieldSet(this, _BetaToolRunner_toolResponse, undefined, "f");
                    __classPrivateFieldSet(this, _BetaToolRunner_iterationCount, (_a = __classPrivateFieldGet(this, _BetaToolRunner_iterationCount, "f"), _a++, _a), "f");
                    const { max_iterations, ...params } = __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params;
                    if (params.stream) {
                        stream = this.client.beta.messages.stream({ ...params });
                        __classPrivateFieldSet(this, _BetaToolRunner_message, stream.finalMessage(), "f");
                        // Make sure that this promise doesn't throw before we get the option to do something about it.
                        // Error will be caught when we call await this.#message ultimately
                        __classPrivateFieldGet(this, _BetaToolRunner_message, "f").catch(() => { });
                        yield stream;
                    }
                    else {
                        __classPrivateFieldSet(this, _BetaToolRunner_message, this.client.beta.messages.create({ ...params, stream: false }), "f");
                        yield __classPrivateFieldGet(this, _BetaToolRunner_message, "f");
                    }
                    if (!__classPrivateFieldGet(this, _BetaToolRunner_mutated, "f")) {
                        const { role, content } = await __classPrivateFieldGet(this, _BetaToolRunner_message, "f");
                        __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.messages.push({ role, content });
                    }
                    const toolMessage = await __classPrivateFieldGet(this, _BetaToolRunner_instances, "m", _BetaToolRunner_generateToolResponse).call(this, __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.messages.at(-1));
                    if (toolMessage) {
                        __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.messages.push(toolMessage);
                    }
                    if (!toolMessage && !__classPrivateFieldGet(this, _BetaToolRunner_mutated, "f")) {
                        break;
                    }
                }
                finally {
                    if (stream) {
                        stream.abort();
                    }
                }
            }
            if (!__classPrivateFieldGet(this, _BetaToolRunner_message, "f")) {
                throw new AnthropicError('ToolRunner concluded without a message from the server');
            }
            __classPrivateFieldGet(this, _BetaToolRunner_completion, "f").resolve(await __classPrivateFieldGet(this, _BetaToolRunner_message, "f"));
        }
        catch (error) {
            __classPrivateFieldSet(this, _BetaToolRunner_consumed, false, "f");
            // Silence unhandled promise errors
            __classPrivateFieldGet(this, _BetaToolRunner_completion, "f").promise.catch(() => { });
            __classPrivateFieldGet(this, _BetaToolRunner_completion, "f").reject(error);
            __classPrivateFieldSet(this, _BetaToolRunner_completion, promiseWithResolvers(), "f");
            throw error;
        }
    }
    setMessagesParams(paramsOrMutator) {
        if (typeof paramsOrMutator === 'function') {
            __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params = paramsOrMutator(__classPrivateFieldGet(this, _BetaToolRunner_state, "f").params);
        }
        else {
            __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params = paramsOrMutator;
        }
        __classPrivateFieldSet(this, _BetaToolRunner_mutated, true, "f");
        // Invalidate cached tool response since parameters changed
        __classPrivateFieldSet(this, _BetaToolRunner_toolResponse, undefined, "f");
    }
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
    async generateToolResponse() {
        const message = (await __classPrivateFieldGet(this, _BetaToolRunner_message, "f")) ?? this.params.messages.at(-1);
        if (!message) {
            return null;
        }
        return __classPrivateFieldGet(this, _BetaToolRunner_instances, "m", _BetaToolRunner_generateToolResponse).call(this, message);
    }
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
    done() {
        return __classPrivateFieldGet(this, _BetaToolRunner_completion, "f").promise;
    }
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
    async runUntilDone() {
        // If not yet consumed, start consuming and wait for completion
        if (!__classPrivateFieldGet(this, _BetaToolRunner_consumed, "f")) {
            for await (const _ of this) {
                // Iterator naturally populates this.#message
            }
        }
        // If consumed but not completed, wait for completion
        return this.done();
    }
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
    get params() {
        return __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params;
    }
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
    pushMessages(...messages) {
        this.setMessagesParams((params) => ({
            ...params,
            messages: [...params.messages, ...messages],
        }));
    }
    /**
     * Makes the ToolRunner directly awaitable, equivalent to calling .runUntilDone()
     * This allows using `await runner` instead of `await runner.runUntilDone()`
     */
    then(onfulfilled, onrejected) {
        return this.runUntilDone().then(onfulfilled, onrejected);
    }
}
_BetaToolRunner_generateToolResponse = async function _BetaToolRunner_generateToolResponse(lastMessage) {
    if (__classPrivateFieldGet(this, _BetaToolRunner_toolResponse, "f") !== undefined) {
        return __classPrivateFieldGet(this, _BetaToolRunner_toolResponse, "f");
    }
    __classPrivateFieldSet(this, _BetaToolRunner_toolResponse, generateToolResponse(__classPrivateFieldGet(this, _BetaToolRunner_state, "f").params, lastMessage), "f");
    return __classPrivateFieldGet(this, _BetaToolRunner_toolResponse, "f");
};
async function generateToolResponse(params, lastMessage = params.messages.at(-1)) {
    // Only process if the last message is from the assistant and has tool use blocks
    if (!lastMessage ||
        lastMessage.role !== 'assistant' ||
        !lastMessage.content ||
        typeof lastMessage.content === 'string') {
        return null;
    }
    const toolUseBlocks = lastMessage.content.filter((content) => content.type === 'tool_use');
    if (toolUseBlocks.length === 0) {
        return null;
    }
    const toolResults = await Promise.all(toolUseBlocks.map(async (toolUse) => {
        const tool = params.tools.find((t) => ('name' in t ? t.name : t.mcp_server_name) === toolUse.name);
        if (!tool || !('run' in tool)) {
            return {
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: `Error: Tool '${toolUse.name}' not found`,
                is_error: true,
            };
        }
        try {
            let input = toolUse.input;
            if ('parse' in tool && tool.parse) {
                input = tool.parse(input);
            }
            const result = await tool.run(input);
            return {
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: result,
            };
        }
        catch (error) {
            return {
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: `Error: ${error instanceof Error ? error.message : String(error)}`,
                is_error: true,
            };
        }
    }));
    return {
        role: 'user',
        content: toolResults,
    };
}
//# sourceMappingURL=ToolRunner.mjs.map