var _BetaMessageStream_instances, _BetaMessageStream_currentMessageSnapshot, _BetaMessageStream_params, _BetaMessageStream_connectedPromise, _BetaMessageStream_resolveConnectedPromise, _BetaMessageStream_rejectConnectedPromise, _BetaMessageStream_endPromise, _BetaMessageStream_resolveEndPromise, _BetaMessageStream_rejectEndPromise, _BetaMessageStream_listeners, _BetaMessageStream_ended, _BetaMessageStream_errored, _BetaMessageStream_aborted, _BetaMessageStream_catchingPromiseCreated, _BetaMessageStream_response, _BetaMessageStream_request_id, _BetaMessageStream_logger, _BetaMessageStream_getFinalMessage, _BetaMessageStream_getFinalText, _BetaMessageStream_handleError, _BetaMessageStream_beginRequest, _BetaMessageStream_addStreamEvent, _BetaMessageStream_endRequest, _BetaMessageStream_accumulateMessage;
import { __classPrivateFieldGet, __classPrivateFieldSet } from "../internal/tslib.mjs";
import { partialParse } from "../_vendor/partial-json-parser/parser.mjs";
import { AnthropicError, APIUserAbortError } from "../error.mjs";
import { isAbortError } from "../internal/errors.mjs";
import { Stream } from "../streaming.mjs";
import { maybeParseBetaMessage } from "./beta-parser.mjs";
const JSON_BUF_PROPERTY = '__json_buf';
function tracksToolInput(content) {
    return content.type === 'tool_use' || content.type === 'server_tool_use' || content.type === 'mcp_tool_use';
}
export class BetaMessageStream {
    constructor(params, opts) {
        _BetaMessageStream_instances.add(this);
        this.messages = [];
        this.receivedMessages = [];
        _BetaMessageStream_currentMessageSnapshot.set(this, void 0);
        _BetaMessageStream_params.set(this, null);
        this.controller = new AbortController();
        _BetaMessageStream_connectedPromise.set(this, void 0);
        _BetaMessageStream_resolveConnectedPromise.set(this, () => { });
        _BetaMessageStream_rejectConnectedPromise.set(this, () => { });
        _BetaMessageStream_endPromise.set(this, void 0);
        _BetaMessageStream_resolveEndPromise.set(this, () => { });
        _BetaMessageStream_rejectEndPromise.set(this, () => { });
        _BetaMessageStream_listeners.set(this, {});
        _BetaMessageStream_ended.set(this, false);
        _BetaMessageStream_errored.set(this, false);
        _BetaMessageStream_aborted.set(this, false);
        _BetaMessageStream_catchingPromiseCreated.set(this, false);
        _BetaMessageStream_response.set(this, void 0);
        _BetaMessageStream_request_id.set(this, void 0);
        _BetaMessageStream_logger.set(this, void 0);
        _BetaMessageStream_handleError.set(this, (error) => {
            __classPrivateFieldSet(this, _BetaMessageStream_errored, true, "f");
            if (isAbortError(error)) {
                error = new APIUserAbortError();
            }
            if (error instanceof APIUserAbortError) {
                __classPrivateFieldSet(this, _BetaMessageStream_aborted, true, "f");
                return this._emit('abort', error);
            }
            if (error instanceof AnthropicError) {
                return this._emit('error', error);
            }
            if (error instanceof Error) {
                const anthropicError = new AnthropicError(error.message);
                // @ts-ignore
                anthropicError.cause = error;
                return this._emit('error', anthropicError);
            }
            return this._emit('error', new AnthropicError(String(error)));
        });
        __classPrivateFieldSet(this, _BetaMessageStream_connectedPromise, new Promise((resolve, reject) => {
            __classPrivateFieldSet(this, _BetaMessageStream_resolveConnectedPromise, resolve, "f");
            __classPrivateFieldSet(this, _BetaMessageStream_rejectConnectedPromise, reject, "f");
        }), "f");
        __classPrivateFieldSet(this, _BetaMessageStream_endPromise, new Promise((resolve, reject) => {
            __classPrivateFieldSet(this, _BetaMessageStream_resolveEndPromise, resolve, "f");
            __classPrivateFieldSet(this, _BetaMessageStream_rejectEndPromise, reject, "f");
        }), "f");
        // Don't let these promises cause unhandled rejection errors.
        // we will manually cause an unhandled rejection error later
        // if the user hasn't registered any error listener or called
        // any promise-returning method.
        __classPrivateFieldGet(this, _BetaMessageStream_connectedPromise, "f").catch(() => { });
        __classPrivateFieldGet(this, _BetaMessageStream_endPromise, "f").catch(() => { });
        __classPrivateFieldSet(this, _BetaMessageStream_params, params, "f");
        __classPrivateFieldSet(this, _BetaMessageStream_logger, opts?.logger ?? console, "f");
    }
    get response() {
        return __classPrivateFieldGet(this, _BetaMessageStream_response, "f");
    }
    get request_id() {
        return __classPrivateFieldGet(this, _BetaMessageStream_request_id, "f");
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
    async withResponse() {
        __classPrivateFieldSet(this, _BetaMessageStream_catchingPromiseCreated, true, "f");
        const response = await __classPrivateFieldGet(this, _BetaMessageStream_connectedPromise, "f");
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
    static fromReadableStream(stream) {
        const runner = new BetaMessageStream(null);
        runner._run(() => runner._fromReadableStream(stream));
        return runner;
    }
    static createMessage(messages, params, options, { logger } = {}) {
        const runner = new BetaMessageStream(params, { logger });
        for (const message of params.messages) {
            runner._addMessageParam(message);
        }
        __classPrivateFieldSet(runner, _BetaMessageStream_params, { ...params, stream: true }, "f");
        runner._run(() => runner._createMessage(messages, { ...params, stream: true }, { ...options, headers: { ...options?.headers, 'X-Stainless-Helper-Method': 'stream' } }));
        return runner;
    }
    _run(executor) {
        executor().then(() => {
            this._emitFinal();
            this._emit('end');
        }, __classPrivateFieldGet(this, _BetaMessageStream_handleError, "f"));
    }
    _addMessageParam(message) {
        this.messages.push(message);
    }
    _addMessage(message, emit = true) {
        this.receivedMessages.push(message);
        if (emit) {
            this._emit('message', message);
        }
    }
    async _createMessage(messages, params, options) {
        const signal = options?.signal;
        let abortHandler;
        if (signal) {
            if (signal.aborted)
                this.controller.abort();
            abortHandler = this.controller.abort.bind(this.controller);
            signal.addEventListener('abort', abortHandler);
        }
        try {
            __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_beginRequest).call(this);
            const { response, data: stream } = await messages
                .create({ ...params, stream: true }, { ...options, signal: this.controller.signal })
                .withResponse();
            this._connected(response);
            for await (const event of stream) {
                __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_addStreamEvent).call(this, event);
            }
            if (stream.controller.signal?.aborted) {
                throw new APIUserAbortError();
            }
            __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_endRequest).call(this);
        }
        finally {
            if (signal && abortHandler) {
                signal.removeEventListener('abort', abortHandler);
            }
        }
    }
    _connected(response) {
        if (this.ended)
            return;
        __classPrivateFieldSet(this, _BetaMessageStream_response, response, "f");
        __classPrivateFieldSet(this, _BetaMessageStream_request_id, response?.headers.get('request-id'), "f");
        __classPrivateFieldGet(this, _BetaMessageStream_resolveConnectedPromise, "f").call(this, response);
        this._emit('connect');
    }
    get ended() {
        return __classPrivateFieldGet(this, _BetaMessageStream_ended, "f");
    }
    get errored() {
        return __classPrivateFieldGet(this, _BetaMessageStream_errored, "f");
    }
    get aborted() {
        return __classPrivateFieldGet(this, _BetaMessageStream_aborted, "f");
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
    on(event, listener) {
        const listeners = __classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event] || (__classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event] = []);
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
    off(event, listener) {
        const listeners = __classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event];
        if (!listeners)
            return this;
        const index = listeners.findIndex((l) => l.listener === listener);
        if (index >= 0)
            listeners.splice(index, 1);
        return this;
    }
    /**
     * Adds a one-time listener function for the event. The next time the event is triggered,
     * this listener is removed and then invoked.
     * @returns this MessageStream, so that calls can be chained
     */
    once(event, listener) {
        const listeners = __classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event] || (__classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event] = []);
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
    emitted(event) {
        return new Promise((resolve, reject) => {
            __classPrivateFieldSet(this, _BetaMessageStream_catchingPromiseCreated, true, "f");
            if (event !== 'error')
                this.once('error', reject);
            this.once(event, resolve);
        });
    }
    async done() {
        __classPrivateFieldSet(this, _BetaMessageStream_catchingPromiseCreated, true, "f");
        await __classPrivateFieldGet(this, _BetaMessageStream_endPromise, "f");
    }
    get currentMessage() {
        return __classPrivateFieldGet(this, _BetaMessageStream_currentMessageSnapshot, "f");
    }
    /**
     * @returns a promise that resolves with the the final assistant Message response,
     * or rejects if an error occurred or the stream ended prematurely without producing a Message.
     * If structured outputs were used, this will be a ParsedMessage with a `parsed` field.
     */
    async finalMessage() {
        await this.done();
        return __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_getFinalMessage).call(this);
    }
    /**
     * @returns a promise that resolves with the the final assistant Message's text response, concatenated
     * together if there are more than one text blocks.
     * Rejects if an error occurred or the stream ended prematurely without producing a Message.
     */
    async finalText() {
        await this.done();
        return __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_getFinalText).call(this);
    }
    _emit(event, ...args) {
        // make sure we don't emit any MessageStreamEvents after end
        if (__classPrivateFieldGet(this, _BetaMessageStream_ended, "f"))
            return;
        if (event === 'end') {
            __classPrivateFieldSet(this, _BetaMessageStream_ended, true, "f");
            __classPrivateFieldGet(this, _BetaMessageStream_resolveEndPromise, "f").call(this);
        }
        const listeners = __classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event];
        if (listeners) {
            __classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event] = listeners.filter((l) => !l.once);
            listeners.forEach(({ listener }) => listener(...args));
        }
        if (event === 'abort') {
            const error = args[0];
            if (!__classPrivateFieldGet(this, _BetaMessageStream_catchingPromiseCreated, "f") && !listeners?.length) {
                Promise.reject(error);
            }
            __classPrivateFieldGet(this, _BetaMessageStream_rejectConnectedPromise, "f").call(this, error);
            __classPrivateFieldGet(this, _BetaMessageStream_rejectEndPromise, "f").call(this, error);
            this._emit('end');
            return;
        }
        if (event === 'error') {
            // NOTE: _emit('error', error) should only be called from #handleError().
            const error = args[0];
            if (!__classPrivateFieldGet(this, _BetaMessageStream_catchingPromiseCreated, "f") && !listeners?.length) {
                // Trigger an unhandled rejection if the user hasn't registered any error handlers.
                // If you are seeing stack traces here, make sure to handle errors via either:
                // - runner.on('error', () => ...)
                // - await runner.done()
                // - await runner.final...()
                // - etc.
                Promise.reject(error);
            }
            __classPrivateFieldGet(this, _BetaMessageStream_rejectConnectedPromise, "f").call(this, error);
            __classPrivateFieldGet(this, _BetaMessageStream_rejectEndPromise, "f").call(this, error);
            this._emit('end');
        }
    }
    _emitFinal() {
        const finalMessage = this.receivedMessages.at(-1);
        if (finalMessage) {
            this._emit('finalMessage', __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_getFinalMessage).call(this));
        }
    }
    async _fromReadableStream(readableStream, options) {
        const signal = options?.signal;
        let abortHandler;
        if (signal) {
            if (signal.aborted)
                this.controller.abort();
            abortHandler = this.controller.abort.bind(this.controller);
            signal.addEventListener('abort', abortHandler);
        }
        try {
            __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_beginRequest).call(this);
            this._connected(null);
            const stream = Stream.fromReadableStream(readableStream, this.controller);
            for await (const event of stream) {
                __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_addStreamEvent).call(this, event);
            }
            if (stream.controller.signal?.aborted) {
                throw new APIUserAbortError();
            }
            __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_endRequest).call(this);
        }
        finally {
            if (signal && abortHandler) {
                signal.removeEventListener('abort', abortHandler);
            }
        }
    }
    [(_BetaMessageStream_currentMessageSnapshot = new WeakMap(), _BetaMessageStream_params = new WeakMap(), _BetaMessageStream_connectedPromise = new WeakMap(), _BetaMessageStream_resolveConnectedPromise = new WeakMap(), _BetaMessageStream_rejectConnectedPromise = new WeakMap(), _BetaMessageStream_endPromise = new WeakMap(), _BetaMessageStream_resolveEndPromise = new WeakMap(), _BetaMessageStream_rejectEndPromise = new WeakMap(), _BetaMessageStream_listeners = new WeakMap(), _BetaMessageStream_ended = new WeakMap(), _BetaMessageStream_errored = new WeakMap(), _BetaMessageStream_aborted = new WeakMap(), _BetaMessageStream_catchingPromiseCreated = new WeakMap(), _BetaMessageStream_response = new WeakMap(), _BetaMessageStream_request_id = new WeakMap(), _BetaMessageStream_logger = new WeakMap(), _BetaMessageStream_handleError = new WeakMap(), _BetaMessageStream_instances = new WeakSet(), _BetaMessageStream_getFinalMessage = function _BetaMessageStream_getFinalMessage() {
        if (this.receivedMessages.length === 0) {
            throw new AnthropicError('stream ended without producing a Message with role=assistant');
        }
        return this.receivedMessages.at(-1);
    }, _BetaMessageStream_getFinalText = function _BetaMessageStream_getFinalText() {
        if (this.receivedMessages.length === 0) {
            throw new AnthropicError('stream ended without producing a Message with role=assistant');
        }
        const textBlocks = this.receivedMessages
            .at(-1)
            .content.filter((block) => block.type === 'text')
            .map((block) => block.text);
        if (textBlocks.length === 0) {
            throw new AnthropicError('stream ended without producing a content block with type=text');
        }
        return textBlocks.join(' ');
    }, _BetaMessageStream_beginRequest = function _BetaMessageStream_beginRequest() {
        if (this.ended)
            return;
        __classPrivateFieldSet(this, _BetaMessageStream_currentMessageSnapshot, undefined, "f");
    }, _BetaMessageStream_addStreamEvent = function _BetaMessageStream_addStreamEvent(event) {
        if (this.ended)
            return;
        const messageSnapshot = __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_accumulateMessage).call(this, event);
        this._emit('streamEvent', event, messageSnapshot);
        switch (event.type) {
            case 'content_block_delta': {
                const content = messageSnapshot.content.at(-1);
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
                this._addMessage(maybeParseBetaMessage(messageSnapshot, __classPrivateFieldGet(this, _BetaMessageStream_params, "f"), { logger: __classPrivateFieldGet(this, _BetaMessageStream_logger, "f") }), true);
                break;
            }
            case 'content_block_stop': {
                this._emit('contentBlock', messageSnapshot.content.at(-1));
                break;
            }
            case 'message_start': {
                __classPrivateFieldSet(this, _BetaMessageStream_currentMessageSnapshot, messageSnapshot, "f");
                break;
            }
            case 'content_block_start':
            case 'message_delta':
                break;
        }
    }, _BetaMessageStream_endRequest = function _BetaMessageStream_endRequest() {
        if (this.ended) {
            throw new AnthropicError(`stream has ended, this shouldn't happen`);
        }
        const snapshot = __classPrivateFieldGet(this, _BetaMessageStream_currentMessageSnapshot, "f");
        if (!snapshot) {
            throw new AnthropicError(`request ended without sending any chunks`);
        }
        __classPrivateFieldSet(this, _BetaMessageStream_currentMessageSnapshot, undefined, "f");
        return maybeParseBetaMessage(snapshot, __classPrivateFieldGet(this, _BetaMessageStream_params, "f"), { logger: __classPrivateFieldGet(this, _BetaMessageStream_logger, "f") });
    }, _BetaMessageStream_accumulateMessage = function _BetaMessageStream_accumulateMessage(event) {
        let snapshot = __classPrivateFieldGet(this, _BetaMessageStream_currentMessageSnapshot, "f");
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
                snapshot.container = event.delta.container;
                snapshot.stop_reason = event.delta.stop_reason;
                snapshot.stop_sequence = event.delta.stop_sequence;
                snapshot.usage.output_tokens = event.usage.output_tokens;
                snapshot.context_management = event.context_management;
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
                snapshot.content.push(event.content_block);
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
                            let jsonBuf = snapshotContent[JSON_BUF_PROPERTY] || '';
                            jsonBuf += event.delta.partial_json;
                            const newContent = { ...snapshotContent };
                            Object.defineProperty(newContent, JSON_BUF_PROPERTY, {
                                value: jsonBuf,
                                enumerable: false,
                                writable: true,
                            });
                            if (jsonBuf) {
                                try {
                                    newContent.input = partialParse(jsonBuf);
                                }
                                catch (err) {
                                    const error = new AnthropicError(`Unable to parse tool parameter JSON from model. Please retry your request or adjust your prompt. Error: ${err}. JSON: ${jsonBuf}`);
                                    __classPrivateFieldGet(this, _BetaMessageStream_handleError, "f").call(this, error);
                                }
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
    }, Symbol.asyncIterator)]() {
        const pushQueue = [];
        const readQueue = [];
        let done = false;
        this.on('streamEvent', (event) => {
            const reader = readQueue.shift();
            if (reader) {
                reader.resolve(event);
            }
            else {
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
            next: async () => {
                if (!pushQueue.length) {
                    if (done) {
                        return { value: undefined, done: true };
                    }
                    return new Promise((resolve, reject) => readQueue.push({ resolve, reject })).then((chunk) => (chunk ? { value: chunk, done: false } : { value: undefined, done: true }));
                }
                const chunk = pushQueue.shift();
                return { value: chunk, done: false };
            },
            return: async () => {
                this.abort();
                return { value: undefined, done: true };
            },
        };
    }
    toReadableStream() {
        const stream = new Stream(this[Symbol.asyncIterator].bind(this), this.controller);
        return stream.toReadableStream();
    }
}
// used to ensure exhaustive case matching without throwing a runtime error
function checkNever(x) { }
//# sourceMappingURL=BetaMessageStream.mjs.map