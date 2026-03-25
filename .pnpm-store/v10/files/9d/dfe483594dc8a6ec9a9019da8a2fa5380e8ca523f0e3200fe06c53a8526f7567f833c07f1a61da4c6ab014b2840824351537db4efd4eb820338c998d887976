"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapOpenAI = void 0;
const traceable_js_1 = require("../traceable.cjs");
const TRACED_INVOCATION_KEYS = [
    "frequency_penalty",
    "n",
    "logit_bias",
    "logprobs",
    "modalities",
    "parallel_tool_calls",
    "prediction",
    "presence_penalty",
    "prompt_cache_key",
    "reasoning",
    "reasoning_effort",
    "response_format",
    "seed",
    "service_tier",
    "stream_options",
    "top_logprobs",
    "top_p",
    "truncation",
    "user",
    "verbosity",
    "web_search_options",
];
function _combineChatCompletionChoices(choices
// eslint-disable-next-line @typescript-eslint/no-explicit-any
) {
    const reversedChoices = choices.slice().reverse();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message = {
        role: "assistant",
        content: "",
    };
    for (const c of reversedChoices) {
        if (c.delta.role) {
            message["role"] = c.delta.role;
            break;
        }
    }
    const toolCalls = {};
    for (const c of choices) {
        if (c.delta.content) {
            message.content = message.content.concat(c.delta.content);
        }
        if (c.delta.function_call) {
            if (!message.function_call) {
                message.function_call = { name: "", arguments: "" };
            }
            if (c.delta.function_call.name) {
                message.function_call.name += c.delta.function_call.name;
            }
            if (c.delta.function_call.arguments) {
                message.function_call.arguments += c.delta.function_call.arguments;
            }
        }
        if (c.delta.tool_calls) {
            for (const tool_call of c.delta.tool_calls) {
                if (!toolCalls[c.index]) {
                    toolCalls[c.index] = [];
                }
                toolCalls[c.index].push(tool_call);
            }
        }
    }
    if (Object.keys(toolCalls).length > 0) {
        message.tool_calls = [...Array(Object.keys(toolCalls).length)];
        for (const [index, toolCallChunks] of Object.entries(toolCalls)) {
            const idx = parseInt(index);
            message.tool_calls[idx] = {
                index: idx,
                id: toolCallChunks.find((c) => c.id)?.id || null,
                type: toolCallChunks.find((c) => c.type)?.type || null,
            };
            for (const chunk of toolCallChunks) {
                if (chunk.function) {
                    if (!message.tool_calls[idx].function) {
                        message.tool_calls[idx].function = {
                            name: "",
                            arguments: "",
                        };
                    }
                    if (chunk.function.name) {
                        message.tool_calls[idx].function.name += chunk.function.name;
                    }
                    if (chunk.function.arguments) {
                        message.tool_calls[idx].function.arguments +=
                            chunk.function.arguments;
                    }
                }
            }
        }
    }
    return {
        index: choices[0].index,
        finish_reason: (reversedChoices.find((c) => c.finish_reason) || null)
            ?.finish_reason,
        message: message,
    };
}
const chatAggregator = (chunks) => {
    if (!chunks || chunks.length === 0) {
        return { choices: [{ message: { role: "assistant", content: "" } }] };
    }
    const choicesByIndex = {};
    for (const chunk of chunks) {
        for (const choice of chunk.choices) {
            if (choicesByIndex[choice.index] === undefined) {
                choicesByIndex[choice.index] = [];
            }
            choicesByIndex[choice.index].push(choice);
        }
    }
    const aggregatedOutput = chunks[chunks.length - 1];
    aggregatedOutput.choices = Object.values(choicesByIndex).map((choices) => _combineChatCompletionChoices(choices));
    return aggregatedOutput;
};
const responsesAggregator = (events) => {
    if (!events || events.length === 0) {
        return {};
    }
    // Find the response.completed event which contains the final response
    for (const event of events) {
        if (event.type === "response.completed" && event.response) {
            return event.response;
        }
    }
    // If no completed event found, return the last event
    return events[events.length - 1] || {};
};
const textAggregator = (allChunks
// eslint-disable-next-line @typescript-eslint/no-explicit-any
) => {
    if (allChunks.length === 0) {
        return { choices: [{ text: "" }] };
    }
    const allContent = [];
    for (const chunk of allChunks) {
        const content = chunk.choices[0].text;
        if (content != null) {
            allContent.push(content);
        }
    }
    const content = allContent.join("");
    const aggregatedOutput = allChunks[allChunks.length - 1];
    aggregatedOutput.choices = [
        { ...aggregatedOutput.choices[0], text: content },
    ];
    return aggregatedOutput;
};
function isChatCompletionUsage(usage) {
    return usage != null && typeof usage === "object" && "prompt_tokens" in usage;
}
function processChatCompletion(outputs) {
    const openAICompletion = outputs;
    const recognizedServiceTier = ["priority", "flex"].includes(openAICompletion.service_tier ?? "")
        ? openAICompletion.service_tier
        : undefined;
    const serviceTierPrefix = recognizedServiceTier
        ? `${recognizedServiceTier}_`
        : "";
    // copy the original object, minus usage
    const result = { ...openAICompletion };
    const usage = openAICompletion.usage;
    if (usage) {
        let inputTokens = 0;
        let outputTokens = 0;
        let totalTokens = 0;
        let inputTokenDetails = {};
        let outputTokenDetails = {};
        if (isChatCompletionUsage(usage)) {
            inputTokens = usage.prompt_tokens ?? 0;
            outputTokens = usage.completion_tokens ?? 0;
            totalTokens = usage.total_tokens ?? 0;
            inputTokenDetails = {
                ...(usage.prompt_tokens_details?.audio_tokens !== null && {
                    audio: usage.prompt_tokens_details?.audio_tokens,
                }),
                ...(usage.prompt_tokens_details?.cached_tokens !== null && {
                    [`${serviceTierPrefix}cache_read`]: usage.prompt_tokens_details?.cached_tokens,
                }),
            };
            outputTokenDetails = {
                ...(usage.completion_tokens_details?.audio_tokens !== null && {
                    audio: usage.completion_tokens_details?.audio_tokens,
                }),
                ...(usage.completion_tokens_details?.reasoning_tokens !== null && {
                    [`${serviceTierPrefix}reasoning`]: usage.completion_tokens_details?.reasoning_tokens,
                }),
            };
        }
        else {
            inputTokens = usage.input_tokens ?? 0;
            outputTokens = usage.output_tokens ?? 0;
            totalTokens = usage.total_tokens ?? 0;
            inputTokenDetails = {
                ...(usage.input_tokens_details?.cached_tokens !== null && {
                    [`${serviceTierPrefix}cache_read`]: usage.input_tokens_details?.cached_tokens,
                }),
            };
            outputTokenDetails = {
                ...(usage.output_tokens_details?.reasoning_tokens !== null && {
                    [`${serviceTierPrefix}reasoning`]: usage.output_tokens_details?.reasoning_tokens,
                }),
            };
        }
        if (recognizedServiceTier) {
            // Avoid counting cache read and reasoning tokens towards the
            // service tier token count since service tier tokens are already
            // priced differently
            inputTokenDetails[recognizedServiceTier] =
                inputTokens -
                    (inputTokenDetails[`${serviceTierPrefix}cache_read`] ?? 0);
            outputTokenDetails[recognizedServiceTier] =
                outputTokens -
                    (outputTokenDetails[`${serviceTierPrefix}reasoning`] ?? 0);
        }
        result.usage_metadata = {
            input_tokens: inputTokens ?? 0,
            output_tokens: outputTokens ?? 0,
            total_tokens: totalTokens ?? 0,
            ...(Object.keys(inputTokenDetails).length > 0 && {
                input_token_details: inputTokenDetails,
            }),
            ...(Object.keys(outputTokenDetails).length > 0 && {
                output_token_details: outputTokenDetails,
            }),
        };
    }
    delete result.usage;
    return result;
}
const getChatModelInvocationParamsFn = (provider, prepopulatedInvocationParams, useResponsesApi) => {
    return (payload) => {
        if (typeof payload !== "object" || payload == null)
            return undefined;
        const params = payload;
        const ls_stop = (typeof params.stop === "string" ? [params.stop] : params.stop) ??
            undefined;
        const ls_invocation_params = {};
        for (const [key, value] of Object.entries(params)) {
            if (TRACED_INVOCATION_KEYS.includes(key)) {
                ls_invocation_params[key] = value;
            }
        }
        if (useResponsesApi) {
            ls_invocation_params.use_responses_api = true;
        }
        return {
            ls_provider: provider,
            ls_model_type: "chat",
            ls_model_name: params.model,
            ls_max_tokens: params.max_completion_tokens ?? params.max_tokens ?? undefined,
            ls_temperature: params.temperature ?? undefined,
            ls_stop,
            ls_invocation_params: {
                ...prepopulatedInvocationParams,
                ...ls_invocation_params,
            },
        };
    };
};
/**
 * Wraps an OpenAI client's completion methods, enabling automatic LangSmith
 * tracing. Method signatures are unchanged, with the exception that you can pass
 * an additional and optional "langsmithExtra" field within the second parameter.
 * @param openai An OpenAI client instance.
 * @param options LangSmith options.
 * @example
 * ```ts
 * import { OpenAI } from "openai";
 * import { wrapOpenAI } from "langsmith/wrappers/openai";
 *
 * const patchedClient = wrapOpenAI(new OpenAI());
 *
 * const patchedStream = await patchedClient.chat.completions.create(
 *   {
 *     messages: [{ role: "user", content: `Say 'foo'` }],
 *     model: "gpt-4.1-mini",
 *     stream: true,
 *   },
 *   {
 *     langsmithExtra: {
 *       metadata: {
 *         additional_data: "bar",
 *       },
 *     },
 *   },
 * );
 * ```
 */
const wrapOpenAI = (openai, options) => {
    if ((0, traceable_js_1.isTraceableFunction)(openai.chat.completions.create) ||
        (0, traceable_js_1.isTraceableFunction)(openai.completions.create)) {
        throw new Error("This instance of OpenAI client has been already wrapped once.");
    }
    // Attempt to determine if this is an Azure OpenAI client
    const isAzureOpenAI = openai.constructor?.name === "AzureOpenAI";
    const provider = isAzureOpenAI ? "azure" : "openai";
    const chatName = isAzureOpenAI ? "AzureChatOpenAI" : "ChatOpenAI";
    const completionsName = isAzureOpenAI ? "AzureOpenAI" : "OpenAI";
    // Some internal OpenAI methods call each other, so we need to preserve original
    // OpenAI methods.
    const tracedOpenAIClient = { ...openai };
    const prepopulatedInvocationParams = typeof options?.metadata?.ls_invocation_params === "object"
        ? options.metadata.ls_invocation_params
        : {};
    // Remove ls_invocation_params from metadata to avoid duplication
    const { ls_invocation_params, ...restMetadata } = options?.metadata ?? {};
    const cleanedOptions = {
        ...options,
        metadata: restMetadata,
    };
    const chatCompletionParseMetadata = {
        name: chatName,
        run_type: "llm",
        aggregator: chatAggregator,
        argsConfigPath: [1, "langsmithExtra"],
        getInvocationParams: getChatModelInvocationParamsFn(provider, prepopulatedInvocationParams, false),
        processOutputs: processChatCompletion,
        ...cleanedOptions,
    };
    if (openai.beta) {
        tracedOpenAIClient.beta = openai.beta;
        if (openai.beta.chat &&
            openai.beta.chat.completions &&
            typeof openai.beta.chat.completions.parse === "function") {
            tracedOpenAIClient.beta.chat.completions.parse = (0, traceable_js_1.traceable)(openai.beta.chat.completions.parse.bind(openai.beta.chat.completions), chatCompletionParseMetadata);
        }
    }
    // Shared function to wrap stream methods (similar to wrapAnthropic)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapStreamMethod = (originalStreamFn) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return function (...args) {
            const stream = originalStreamFn(...args);
            // Helper to ensure stream is fully consumed before calling final methods
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ensureStreamConsumed = (methodName) => {
                if (methodName in stream && typeof stream[methodName] === "function") {
                    const originalMethod = stream[methodName].bind(stream);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    stream[methodName] = async (...args) => {
                        if ("done" in stream && typeof stream.done === "function") {
                            await stream.done();
                        }
                        for await (const _ of stream) {
                            // Finish consuming the stream if it has not already been consumed
                        }
                        return originalMethod(...args);
                    };
                }
            };
            // Ensure stream is consumed for final methods
            ensureStreamConsumed("finalChatCompletion");
            ensureStreamConsumed("finalMessage");
            ensureStreamConsumed("finalResponse");
            return stream;
        };
    };
    tracedOpenAIClient.chat = {
        ...openai.chat,
        completions: Object.create(Object.getPrototypeOf(openai.chat.completions)),
    };
    // Copy all own properties and then wrap specific methods
    Object.assign(tracedOpenAIClient.chat.completions, openai.chat.completions);
    // Wrap chat.completions.create
    tracedOpenAIClient.chat.completions.create = (0, traceable_js_1.traceable)(openai.chat.completions.create.bind(openai.chat.completions), chatCompletionParseMetadata);
    // Wrap chat.completions.parse if it exists
    if (typeof openai.chat.completions.parse === "function") {
        tracedOpenAIClient.chat.completions.parse = (0, traceable_js_1.traceable)(openai.chat.completions.parse.bind(openai.chat.completions), chatCompletionParseMetadata);
    }
    // Wrap chat.completions.stream if it exists
    if (typeof openai.chat.completions.stream === "function") {
        tracedOpenAIClient.chat.completions.stream = (0, traceable_js_1.traceable)(wrapStreamMethod(openai.chat.completions.stream.bind(openai.chat.completions)), chatCompletionParseMetadata);
    }
    // Wrap beta.chat.completions.stream if it exists
    if (openai.beta &&
        openai.beta.chat &&
        openai.beta.chat.completions &&
        typeof openai.beta.chat.completions.stream === "function") {
        tracedOpenAIClient.beta.chat.completions.stream = (0, traceable_js_1.traceable)(wrapStreamMethod(openai.beta.chat.completions.stream.bind(openai.beta.chat.completions)), chatCompletionParseMetadata);
    }
    tracedOpenAIClient.completions = {
        ...openai.completions,
        create: (0, traceable_js_1.traceable)(openai.completions.create.bind(openai.completions), {
            name: completionsName,
            run_type: "llm",
            aggregator: textAggregator,
            argsConfigPath: [1, "langsmithExtra"],
            getInvocationParams: (payload) => {
                if (typeof payload !== "object" || payload == null)
                    return undefined;
                // we can safely do so, as the types are not exported in TSC
                const params = payload;
                const ls_stop = (typeof params.stop === "string" ? [params.stop] : params.stop) ??
                    undefined;
                const ls_invocation_params = {};
                for (const [key, value] of Object.entries(params)) {
                    if (TRACED_INVOCATION_KEYS.includes(key)) {
                        ls_invocation_params[key] = value;
                    }
                }
                return {
                    ls_provider: provider,
                    ls_model_type: "llm",
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
            ...cleanedOptions,
        }),
    };
    // Add responses API support if it exists
    if (openai.responses) {
        // Create a new object with the same prototype to preserve all methods
        tracedOpenAIClient.responses = Object.create(Object.getPrototypeOf(openai.responses));
        // Copy all own properties
        if (tracedOpenAIClient.responses) {
            Object.assign(tracedOpenAIClient.responses, openai.responses);
        }
        // Wrap responses.create method
        if (tracedOpenAIClient.responses &&
            typeof tracedOpenAIClient.responses.create === "function") {
            tracedOpenAIClient.responses.create = (0, traceable_js_1.traceable)(openai.responses.create.bind(openai.responses), {
                name: chatName,
                run_type: "llm",
                aggregator: responsesAggregator,
                argsConfigPath: [1, "langsmithExtra"],
                getInvocationParams: getChatModelInvocationParamsFn(provider, prepopulatedInvocationParams, true),
                processOutputs: processChatCompletion,
                ...cleanedOptions,
            });
        }
        if (tracedOpenAIClient.responses &&
            typeof tracedOpenAIClient.responses.parse === "function") {
            tracedOpenAIClient.responses.parse = (0, traceable_js_1.traceable)(openai.responses.parse.bind(openai.responses), {
                name: chatName,
                run_type: "llm",
                aggregator: responsesAggregator,
                argsConfigPath: [1, "langsmithExtra"],
                getInvocationParams: getChatModelInvocationParamsFn(provider, prepopulatedInvocationParams, true),
                processOutputs: processChatCompletion,
                ...cleanedOptions,
            });
        }
        if (tracedOpenAIClient.responses &&
            typeof tracedOpenAIClient.responses.stream === "function") {
            tracedOpenAIClient.responses.stream = (0, traceable_js_1.traceable)(wrapStreamMethod(openai.responses.stream.bind(openai.responses)), {
                name: chatName,
                run_type: "llm",
                aggregator: responsesAggregator,
                argsConfigPath: [1, "langsmithExtra"],
                getInvocationParams: getChatModelInvocationParamsFn(provider, prepopulatedInvocationParams, true),
                processOutputs: processChatCompletion,
                ...cleanedOptions,
            });
        }
    }
    return tracedOpenAIClient;
};
exports.wrapOpenAI = wrapOpenAI;
