"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapAnthropic = void 0;
const traceable_js_1 = require("../traceable.cjs");
const usage_js_1 = require("../utils/usage.cjs");
const TRACED_INVOCATION_KEYS = ["top_k", "top_p", "stream", "thinking"];
/**
 * Create usage metadata from Anthropic's token usage format.
 */
function createUsageMetadata(anthropicUsage) {
    if (!anthropicUsage) {
        return undefined;
    }
    const inputTokens = typeof anthropicUsage.input_tokens === "number"
        ? anthropicUsage.input_tokens
        : 0;
    const outputTokens = typeof anthropicUsage.output_tokens === "number"
        ? anthropicUsage.output_tokens
        : 0;
    const totalTokens = inputTokens + outputTokens;
    const inputTokenDetails = (0, usage_js_1.convertAnthropicUsageToInputTokenDetails)(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    anthropicUsage);
    return {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        ...(Object.keys(inputTokenDetails).length > 0 && {
            input_token_details: inputTokenDetails,
        }),
    };
}
/**
 * Process Anthropic message outputs
 */
function processMessageOutput(outputs) {
    const message = outputs;
    const result = { ...message };
    delete result.type;
    if (message.usage) {
        result.usage_metadata = createUsageMetadata(message.usage);
        delete result.usage;
    }
    return result;
}
/**
 * Accumulate a single content block delta into the content array.
 */
function accumulateContentBlockDelta(content, event) {
    const block = content[event.index];
    if (!block)
        return;
    if (block.type === "text" && event.delta.type === "text_delta") {
        block.text += event.delta.text;
    }
    else if (block.type === "tool_use" &&
        event.delta.type === "input_json_delta") {
        // Accumulate JSON input for tool use
        const toolBlock = block;
        toolBlock._partial_json =
            (toolBlock._partial_json ?? "") + event.delta.partial_json;
    }
}
/**
 * Aggregate streaming chunks into a complete message response
 */
const messageAggregator = (chunks) => {
    if (!chunks || chunks.length === 0) {
        return {
            role: "assistant",
            content: [],
        };
    }
    let message = {
        role: "assistant",
        content: [],
        model: "",
        stop_reason: null,
        stop_sequence: null,
    };
    // Track usage
    let usage = {
        input_tokens: 0,
        output_tokens: 0,
    };
    for (const chunk of chunks) {
        switch (chunk.type) {
            case "message_start":
                // Initialize message
                message = {
                    id: chunk.message.id,
                    role: chunk.message.role,
                    content: [],
                    model: chunk.message.model,
                    stop_reason: chunk.message.stop_reason,
                    stop_sequence: chunk.message.stop_sequence,
                };
                // Capture initial usage
                if (chunk.message.usage) {
                    usage = chunk.message.usage;
                }
                break;
            case "content_block_start":
                // Add new content block
                if (message.content) {
                    message.content[chunk.index] =
                        chunk.content_block;
                }
                break;
            case "content_block_delta":
                // Accumulate delta
                if (message.content) {
                    accumulateContentBlockDelta(message.content, chunk);
                }
                break;
            case "content_block_stop":
                // Finalize content block
                if (message.content) {
                    const block = message.content[chunk.index];
                    if (block?.type === "tool_use") {
                        const toolBlock = block;
                        if (toolBlock._partial_json) {
                            try {
                                toolBlock.input = JSON.parse(toolBlock._partial_json);
                            }
                            catch {
                                // Keep partial JSON as-is if parsing fails
                                toolBlock.input = toolBlock._partial_json;
                            }
                            delete toolBlock._partial_json;
                        }
                    }
                }
                break;
            case "message_delta":
                // Update message metadata
                message.stop_reason = chunk.delta.stop_reason;
                message.stop_sequence = chunk.delta.stop_sequence ?? null;
                if (chunk.usage) {
                    // Override only non-null keys
                    for (const [key, value] of Object.entries(chunk.usage)) {
                        if (value != null) {
                            usage[key] = value;
                        }
                    }
                }
                break;
            case "message_stop":
                // Message complete
                break;
        }
    }
    // Build final output
    const result = {
        ...message,
    };
    delete result.type;
    // Add usage metadata
    result.usage_metadata = createUsageMetadata(usage);
    return result;
};
/**
 * Wraps an Anthropic client's completion methods, enabling automatic LangSmith
 * tracing. Method signatures are unchanged, with the exception that you can pass
 * an additional and optional "langsmithExtra" field within the second parameter.
 *
 * @param anthropic An Anthropic client instance.
 * @param options LangSmith options.
 * @returns The wrapped client.
 *
 * @example
 * ```ts
 * import Anthropic from "@anthropic-ai/sdk";
 * import { wrapAnthropic } from "langsmith/wrappers/anthropic";
 *
 * const anthropic = wrapAnthropic(new Anthropic());
 *
 * // Non-streaming
 * const message = await anthropic.messages.create({
 *   model: "claude-sonnet-4-20250514",
 *   max_tokens: 1024,
 *   messages: [{ role: "user", content: "Hello!" }],
 * });
 *
 * // Streaming
 * const messageStream = anthropic.messages.stream({
 *   model: "claude-sonnet-4-20250514",
 *   max_tokens: 1024,
 *   messages: [{ role: "user", content: "Hello!" }],
 * });
 * const finalMessage = await messageStream.finalMessage();
 * ```
 */
const wrapAnthropic = (anthropic, options) => {
    if ((0, traceable_js_1.isTraceableFunction)(anthropic.messages.create) ||
        (0, traceable_js_1.isTraceableFunction)(anthropic.messages.stream)) {
        throw new Error("This instance of Anthropic client has been already wrapped once.");
    }
    const tracedAnthropicClient = { ...anthropic };
    // Extract ls_invocation_params from metadata
    const prepopulatedInvocationParams = typeof options?.metadata?.ls_invocation_params === "object"
        ? options.metadata.ls_invocation_params
        : {};
    // Remove ls_invocation_params from metadata to avoid duplication
    const { ls_invocation_params, ...restMetadata } = options?.metadata ?? {};
    const cleanedOptions = {
        ...options,
        metadata: restMetadata,
    };
    // Common configuration for messages.create
    const messagesCreateConfig = {
        name: "ChatAnthropic",
        run_type: "llm",
        aggregator: messageAggregator,
        argsConfigPath: [1, "langsmithExtra"],
        getInvocationParams: (payload) => {
            if (typeof payload !== "object" || payload == null)
                return undefined;
            const params = payload;
            const ls_stop = (typeof params.stop_sequences === "string"
                ? [params.stop_sequences]
                : params.stop_sequences) ?? undefined;
            const ls_invocation_params = {};
            for (const [key, value] of Object.entries(params)) {
                if (TRACED_INVOCATION_KEYS.includes(key)) {
                    ls_invocation_params[key] = value;
                }
            }
            return {
                ls_provider: "anthropic",
                ls_model_type: "chat",
                ls_model_name: params.model,
                ls_max_tokens: params.max_tokens ?? undefined,
                ls_temperature: params.temperature ?? undefined,
                ls_stop,
                ls_invocation_params: {
                    ...prepopulatedInvocationParams,
                    ...ls_invocation_params,
                },
            };
        },
        processOutputs: processMessageOutput,
        ...cleanedOptions,
    };
    // Create a new messages object preserving the prototype
    tracedAnthropicClient.messages = Object.create(Object.getPrototypeOf(anthropic.messages));
    // Copy all own properties
    Object.assign(tracedAnthropicClient.messages, anthropic.messages);
    // Wrap messages.create
    tracedAnthropicClient.messages.create = (0, traceable_js_1.traceable)(anthropic.messages.create.bind(anthropic.messages), messagesCreateConfig);
    // Shared function to wrap stream methods
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapStreamMethod = (originalStreamFn) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return function (...args) {
            const stream = originalStreamFn(...args);
            if ("finalMessage" in stream &&
                typeof stream.finalMessage === "function") {
                const originalFinalMessage = stream.finalMessage.bind(stream);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                stream.finalMessage = async (...args) => {
                    if ("done" in stream && typeof stream.done === "function") {
                        await stream.done();
                    }
                    for await (const _ of stream) {
                        // Finish consuming the stream if it has not already been consumed
                        // It should be relatively uncommon to consume an iterator after calling
                        // .finalMessage()
                    }
                    return originalFinalMessage(...args);
                };
            }
            return stream;
        };
    };
    // Wrap messages.stream
    tracedAnthropicClient.messages.stream = (0, traceable_js_1.traceable)(wrapStreamMethod(anthropic.messages.stream.bind(anthropic.messages)), {
        name: "ChatAnthropic",
        run_type: "llm",
        aggregator: messageAggregator,
        argsConfigPath: [1, "langsmithExtra"],
        getInvocationParams: messagesCreateConfig.getInvocationParams,
        processOutputs: processMessageOutput,
        ...cleanedOptions,
    });
    // Wrap beta.messages if it exists
    if (anthropic.beta &&
        anthropic.beta.messages &&
        typeof anthropic.beta.messages.create === "function") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tracedBeta = { ...anthropic.beta };
        tracedBeta.messages = Object.create(Object.getPrototypeOf(anthropic.beta.messages));
        Object.assign(tracedBeta.messages, anthropic.beta.messages);
        // Wrap beta.messages.create
        tracedBeta.messages.create = (0, traceable_js_1.traceable)(anthropic.beta.messages.create.bind(anthropic.beta.messages), messagesCreateConfig);
        // Wrap beta.messages.stream if it exists
        if (typeof anthropic.beta.messages.stream === "function") {
            tracedBeta.messages.stream = (0, traceable_js_1.traceable)(wrapStreamMethod(anthropic.beta.messages.stream.bind(anthropic.beta.messages)), {
                name: "ChatAnthropic",
                run_type: "llm",
                aggregator: messageAggregator,
                argsConfigPath: [1, "langsmithExtra"],
                getInvocationParams: messagesCreateConfig.getInvocationParams,
                processOutputs: processMessageOutput,
                ...cleanedOptions,
            });
        }
        tracedAnthropicClient.beta = tracedBeta;
    }
    return tracedAnthropicClient;
};
exports.wrapAnthropic = wrapAnthropic;
