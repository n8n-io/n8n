import { getCurrentRunTree, traceable } from "../../traceable.js";
import { extractInputTokenDetails, extractOutputTokenDetails, } from "../../utils/vercel.js";
import { convertMessageToTracedFormat } from "./utils.js";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _formatTracedInputs = (params) => {
    const { prompt, ...rest } = params;
    if (prompt == null) {
        return params;
    }
    if (Array.isArray(prompt)) {
        return {
            ...rest,
            messages: prompt.map((message) => convertMessageToTracedFormat(message)),
        };
    }
    return rest;
};
const _formatTracedOutputs = (outputs, includeHttpDetails = false) => {
    let formattedOutputs;
    if (includeHttpDetails) {
        // Include all fields including raw request/response/usage
        formattedOutputs = { ...outputs };
    }
    else {
        // Extract only the fields we want to trace, excluding raw request/response/usage
        const { request: _, response: __, ...messageFields } = outputs;
        formattedOutputs = { ...messageFields };
    }
    if (formattedOutputs.role == null) {
        formattedOutputs.role = formattedOutputs.type ?? "assistant";
    }
    return convertMessageToTracedFormat(formattedOutputs);
};
const setUsageMetadataOnRunTree = (result, runTree) => {
    if (result.usage == null || typeof result.usage !== "object") {
        return;
    }
    const usage = result.usage;
    let inputTokens;
    let outputTokens;
    let totalTokens;
    // AI SDK 6: Check for object-based token structures first
    if (typeof usage.inputTokens === "object" &&
        usage.inputTokens?.total != null) {
        // AI SDK 6 detected
        inputTokens = usage.inputTokens.total;
        if (typeof usage.outputTokens === "object" &&
            usage.outputTokens?.total != null) {
            outputTokens = usage.outputTokens.total;
        }
        totalTokens = result.usage?.totalTokens;
        if (typeof totalTokens !== "number" &&
            typeof inputTokens === "number" &&
            typeof outputTokens === "number") {
            totalTokens = inputTokens + outputTokens;
        }
    }
    else if (typeof usage.inputTokens === "number") {
        // AI SDK 5 detected
        inputTokens = usage.inputTokens;
        if (typeof usage.outputTokens === "number") {
            outputTokens = usage.outputTokens;
        }
        totalTokens = result.usage?.totalTokens;
        if (typeof totalTokens !== "number" &&
            typeof inputTokens === "number" &&
            typeof outputTokens === "number") {
            totalTokens = inputTokens + outputTokens;
        }
    }
    else {
        // AI SDK 4 fallback
        if (typeof usage.promptTokens === "number") {
            inputTokens = usage.promptTokens;
        }
        if (typeof usage.completionTokens === "number") {
            outputTokens = usage.completionTokens;
        }
        totalTokens = result.usage?.totalTokens;
        if (typeof totalTokens !== "number" &&
            typeof inputTokens === "number" &&
            typeof outputTokens === "number") {
            totalTokens = inputTokens + outputTokens;
        }
    }
    const langsmithUsage = {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
    };
    const inputTokenDetails = extractInputTokenDetails(result.usage, result.providerMetadata);
    const outputTokenDetails = extractOutputTokenDetails(result.usage, result.providerMetadata);
    runTree.extra = {
        ...runTree.extra,
        metadata: {
            ...runTree.extra?.metadata,
            usage_metadata: {
                ...langsmithUsage,
                input_token_details: {
                    ...inputTokenDetails,
                },
                output_token_details: {
                    ...outputTokenDetails,
                },
            },
        },
    };
};
/**
 * AI SDK middleware that wraps an AI SDK 6 or 5 model and adds LangSmith tracing.
 */
export function LangSmithMiddleware(config) {
    const { name, modelId, lsConfig } = config ?? {};
    return {
        wrapGenerate: async ({ doGenerate, params }) => {
            const traceableFunc = traceable(async (_params) => {
                const result = await doGenerate();
                const currentRunTree = getCurrentRunTree(true);
                if (currentRunTree !== undefined) {
                    setUsageMetadataOnRunTree(result, currentRunTree);
                }
                return result;
            }, {
                ...lsConfig,
                name: name ?? "ai.doGenerate",
                run_type: "llm",
                metadata: {
                    ls_model_name: modelId,
                    ai_sdk_method: "ai.doGenerate",
                    ...lsConfig?.metadata,
                },
                processInputs: (inputs) => {
                    const typedInputs = inputs;
                    const inputFormatter = lsConfig?.processInputs ?? _formatTracedInputs;
                    return inputFormatter(typedInputs);
                },
                processOutputs: (outputs) => {
                    const typedOutputs = outputs;
                    if (lsConfig?.processOutputs) {
                        return lsConfig.processOutputs(typedOutputs);
                    }
                    return _formatTracedOutputs(typedOutputs, lsConfig?.traceRawHttp);
                },
            });
            const res = await traceableFunc(params);
            return res;
        },
        wrapStream: async ({ doStream, params }) => {
            const parentRunTree = getCurrentRunTree(true);
            let runTree;
            if (parentRunTree != null &&
                typeof parentRunTree === "object" &&
                typeof parentRunTree.createChild === "function") {
                const inputFormatter = lsConfig?.processInputs ?? _formatTracedInputs;
                const formattedInputs = inputFormatter(params);
                runTree = parentRunTree?.createChild({
                    ...lsConfig,
                    name: name ?? "ai.doStream",
                    run_type: "llm",
                    metadata: {
                        ls_model_name: modelId,
                        ai_sdk_method: "ai.doStream",
                        ...lsConfig?.metadata,
                    },
                    inputs: formattedInputs,
                });
            }
            await runTree?.postRun();
            try {
                const { stream, ...rest } = await doStream();
                const chunks = [];
                const transformStream = new TransformStream({
                    async transform(chunk, controller) {
                        if (chunk.type === "tool-input-start" ||
                            chunk.type === "text-start") {
                            // Only necessary to log the first token event
                            if (runTree?.events == null ||
                                (Array.isArray(runTree.events) && runTree.events.length === 0)) {
                                runTree?.addEvent({ name: "new_token" });
                            }
                        }
                        else if (chunk.type === "finish") {
                            runTree?.addEvent({ name: "end" });
                        }
                        chunks.push(chunk);
                        controller.enqueue(chunk);
                    },
                    async flush() {
                        try {
                            const output = chunks.reduce((aggregated, chunk) => {
                                if (chunk.type === "text-delta") {
                                    if (chunk.delta != null) {
                                        return {
                                            ...aggregated,
                                            content: aggregated.content + chunk.delta,
                                        };
                                    }
                                    else if ("textDelta" in chunk &&
                                        chunk.textDelta != null) {
                                        // AI SDK 4 shim
                                        return {
                                            ...aggregated,
                                            content: aggregated.content + chunk.textDelta,
                                        };
                                    }
                                    else {
                                        return aggregated;
                                    }
                                }
                                else if (chunk.type === "tool-call") {
                                    const matchingToolCall = aggregated.tool_calls.find((call) => call.id === chunk.toolCallId);
                                    if (matchingToolCall != null) {
                                        return aggregated;
                                    }
                                    let chunkArgs = chunk.input;
                                    if (chunkArgs == null &&
                                        "args" in chunk &&
                                        typeof chunk.args === "string") {
                                        chunkArgs = chunk.args;
                                    }
                                    return {
                                        ...aggregated,
                                        tool_calls: [
                                            ...aggregated.tool_calls,
                                            {
                                                id: chunk.toolCallId,
                                                type: "function",
                                                function: {
                                                    name: chunk.toolName,
                                                    arguments: chunkArgs,
                                                },
                                            },
                                        ],
                                    };
                                }
                                else if (chunk.type === "finish") {
                                    if (runTree != null) {
                                        setUsageMetadataOnRunTree(chunk, runTree);
                                    }
                                    return {
                                        ...aggregated,
                                        providerMetadata: chunk.providerMetadata,
                                        finishReason: chunk.finishReason,
                                    };
                                }
                                else {
                                    return aggregated;
                                }
                            }, {
                                content: "",
                                role: "assistant",
                                tool_calls: [],
                            });
                            const outputFormatter = lsConfig?.processOutputs ?? convertMessageToTracedFormat;
                            const formattedOutputs = await outputFormatter(output);
                            await runTree?.end(formattedOutputs);
                        }
                        catch (error) {
                            await runTree?.end(undefined, error.message ?? String(error));
                            throw error;
                        }
                        finally {
                            await runTree?.patchRun({
                                excludeInputs: true,
                            });
                        }
                    },
                });
                return {
                    stream: stream.pipeThrough(transformStream),
                    ...rest,
                };
            }
            catch (error) {
                await runTree?.end(undefined, error.message ?? String(error));
                await runTree?.patchRun({
                    excludeInputs: true,
                });
                throw error;
            }
        },
    };
}
