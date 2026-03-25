import { isTraceableFunction, traceable, } from "../traceable.js";
const _createUsageMetadata = (usage) => {
    const usageMetadata = {
        input_tokens: usage.promptTokenCount || 0,
        output_tokens: (() => {
            if ("responseTokenCount" in usage) {
                return usage.responseTokenCount || 0;
            }
            if ("candidatesTokenCount" in usage) {
                return usage.candidatesTokenCount || 0;
            }
            return 0;
        })(),
        total_tokens: usage.totalTokenCount || 0,
    };
    // Add input token details if available
    usageMetadata.input_token_details = {
        ...(usage.cachedContentTokenCount && {
            cache_read_over_200k: Math.max(0, usage.cachedContentTokenCount - 200000),
        }),
        ...(usage.promptTokenCount && {
            over_200k: Math.max(0, usage.promptTokenCount - 200000),
        }),
        ...(usage.cachedContentTokenCount && {
            cache_read: usage.cachedContentTokenCount,
        }),
    };
    // Add output token details if available
    usageMetadata.output_token_details = {
        ...("candidatesTokenCount" in usage &&
            usage.candidatesTokenCount != null && {
            over_200k: Math.max(0, usage.candidatesTokenCount - 200000),
        }),
        ...(usage.thoughtsTokenCount && {
            reasoning: usage.thoughtsTokenCount,
        }),
    };
    return usageMetadata;
};
const chatAggregator = (input) => {
    const chunks = Array.isArray(input) &&
        input.every((item) => typeof item === "object" && item !== null)
        ? input
        : [];
    if (!chunks || chunks.length === 0) {
        return { content: "", role: "assistant" };
    }
    let text = "";
    let thoughtText = "";
    const toolCalls = [];
    const otherParts = [];
    let usageMetadata = null;
    let finishReason = null;
    let safetyRatings = null;
    for (const chunk of chunks) {
        if (chunk?.usageMetadata) {
            usageMetadata = chunk.usageMetadata;
        }
        if (chunk?.candidates && Array.isArray(chunk.candidates)) {
            for (const candidate of chunk.candidates) {
                if (candidate.finishReason) {
                    finishReason = candidate.finishReason;
                }
                if (candidate.safetyRatings) {
                    safetyRatings = candidate.safetyRatings;
                }
                if (candidate.content?.parts) {
                    for (const part of candidate.content.parts) {
                        if ("text" in part && part.text !== undefined) {
                            if (part.thought) {
                                thoughtText += part.text;
                            }
                            else {
                                text += part.text;
                            }
                        }
                        else if ("functionCall" in part && part.functionCall) {
                            toolCalls.push({
                                type: "function",
                                function: {
                                    name: part.functionCall.name || "",
                                    arguments: JSON.stringify(part.functionCall.args || {}),
                                },
                            });
                        }
                        else if ("codeExecutionResult" in part &&
                            part.codeExecutionResult) {
                            otherParts.push({
                                type: "code_execution_result",
                                code_execution_result: part.codeExecutionResult,
                            });
                        }
                        else if ("executableCode" in part && part.executableCode) {
                            otherParts.push({
                                type: "executable_code",
                                executable_code: part.executableCode,
                            });
                        }
                        else if ("inlineData" in part && part.inlineData) {
                            const mimeType = part.inlineData.mimeType || "image/jpeg";
                            const data = part.inlineData.data || "";
                            otherParts.push({
                                type: "image_url",
                                image_url: {
                                    url: `data:${mimeType};base64,${data}`,
                                    detail: "high",
                                },
                            });
                        }
                        else if ("fileData" in part && part.fileData) {
                            otherParts.push({
                                type: "file_data",
                                mime_type: part.fileData.mimeType,
                                file_uri: part.fileData.fileUri,
                            });
                        }
                    }
                }
            }
        }
        else if (chunk?.text) {
            text += chunk.text;
        }
    }
    const contentParts = [];
    if (thoughtText) {
        contentParts.push({ type: "text", text: thoughtText, thought: true });
    }
    if (text) {
        contentParts.push({ type: "text", text: text });
    }
    contentParts.push(...otherParts);
    const result = {
        role: "assistant",
    };
    if (contentParts.length > 1 ||
        (contentParts.length > 0 && contentParts[0].type !== "text")) {
        result.content = contentParts;
    }
    else if (contentParts.length === 1 &&
        contentParts[0].type === "text" &&
        !contentParts[0].thought) {
        result.content = contentParts[0].text;
    }
    else if (thoughtText && !text) {
        result.content = contentParts;
    }
    else {
        result.content = text || "";
    }
    if (toolCalls.length > 0) {
        result.tool_calls = toolCalls;
    }
    if (finishReason) {
        result.finish_reason = finishReason;
    }
    if (safetyRatings) {
        result.safety_ratings = safetyRatings;
    }
    if (usageMetadata) {
        result.usage_metadata = _createUsageMetadata(usageMetadata);
    }
    return result;
};
function processGeminiInputs(inputs) {
    const { contents, model, ...rest } = inputs;
    if (!contents)
        return inputs;
    if (typeof contents === "string") {
        return {
            messages: [{ role: "user", content: contents }],
            ...rest,
        };
    }
    if (Array.isArray(contents)) {
        if (contents.every((item) => typeof item === "string")) {
            return {
                messages: contents.map((text) => ({ role: "user", content: text })),
                ...rest,
            };
        }
        const messages = contents
            .map((content) => {
            if (typeof content !== "object" || content === null)
                return null;
            const isContent = (item) => {
                return "parts" in item && Array.isArray(item.parts);
            };
            const role = "role" in content ? content.role : "user";
            const parts = isContent(content) ? content.parts ?? [] : [content];
            const textParts = [];
            const contentParts = [];
            for (const part of parts) {
                if (typeof part === "object" && part !== null) {
                    if ("text" in part && part.text) {
                        textParts.push(part.text);
                        contentParts.push({ type: "text", text: part.text });
                    }
                    else if ("inlineData" in part) {
                        const inlineData = part.inlineData;
                        const mimeType = inlineData?.mimeType || "image/jpeg";
                        const data = inlineData?.data || "";
                        contentParts.push({
                            type: "image_url",
                            image_url: {
                                url: `data:${mimeType};base64,${data}`,
                                detail: "high",
                            },
                        });
                    }
                    else if ("functionResponse" in part) {
                        const funcResponse = part.functionResponse;
                        contentParts.push({
                            type: "function_response", //TODO: add testing for function_response
                            function_response: {
                                name: funcResponse?.name,
                                response: funcResponse?.response || {},
                            },
                        });
                    }
                }
                else if (typeof part === "string") {
                    textParts.push(part);
                    contentParts.push({ type: "text", text: part });
                }
            }
            const messageContent = contentParts.length > 0 &&
                contentParts.every((p) => p.type === "text")
                ? textParts.join("\n")
                : contentParts.length > 0
                    ? contentParts
                    : "";
            return { role, content: messageContent };
        })
            .filter((msg) => msg !== null);
        return { messages, ...rest };
    }
    return inputs;
}
function processGeminiOutputs(outputs) {
    const response = (outputs?.outputs || outputs);
    if (!response) {
        return { content: "", role: "assistant" };
    }
    if ("content" in response &&
        "role" in response &&
        !("candidates" in response)) {
        return response;
    }
    let text = "";
    let thoughtText = "";
    const toolCalls = [];
    const otherParts = [];
    let finishReason = null;
    let safetyRatings = null;
    if ("candidates" in response &&
        Array.isArray(response.candidates) &&
        response.candidates.length > 0) {
        const firstCandidate = response.candidates[0];
        if (firstCandidate.finishReason) {
            finishReason = firstCandidate.finishReason;
        }
        if (firstCandidate.safetyRatings) {
            safetyRatings = firstCandidate.safetyRatings;
        }
        if (firstCandidate?.content?.parts) {
            for (const part of firstCandidate.content.parts) {
                if ("text" in part && part.text !== undefined) {
                    if (part.thought) {
                        thoughtText += part.text;
                    }
                    else {
                        text += part.text;
                    }
                }
                else if ("functionCall" in part && part.functionCall) {
                    toolCalls.push({
                        type: "function",
                        function: {
                            name: part.functionCall.name || "",
                            arguments: JSON.stringify(part.functionCall.args || {}),
                        },
                    });
                }
                else if ("codeExecutionResult" in part && part.codeExecutionResult) {
                    otherParts.push({
                        type: "code_execution_result",
                        code_execution_result: part.codeExecutionResult,
                    });
                }
                else if ("executableCode" in part && part.executableCode) {
                    otherParts.push({
                        type: "executable_code",
                        executable_code: part.executableCode,
                    });
                }
                else if ("inlineData" in part && part.inlineData) {
                    const mimeType = part.inlineData.mimeType || "image/jpeg";
                    const data = part.inlineData.data || "";
                    otherParts.push({
                        type: "image_url",
                        image_url: {
                            url: `data:${mimeType};base64,${data}`,
                            detail: "high",
                        },
                    });
                }
                else if ("fileData" in part && part.fileData) {
                    otherParts.push({
                        type: "file_data",
                        mime_type: part.fileData.mimeType,
                        file_uri: part.fileData.fileUri,
                    });
                }
            }
        }
    }
    const contentParts = [];
    if (thoughtText) {
        contentParts.push({ type: "text", text: thoughtText, thought: true });
    }
    if (text) {
        contentParts.push({ type: "text", text: text });
    }
    contentParts.push(...otherParts);
    const result = {
        role: "assistant",
    };
    if (contentParts.length > 1 ||
        (contentParts.length > 0 && contentParts[0].type !== "text")) {
        result.content = contentParts;
    }
    else if (contentParts.length === 1 &&
        contentParts[0].type === "text" &&
        !contentParts[0].thought) {
        result.content = contentParts[0].text;
    }
    else if (thoughtText && !text) {
        result.content = contentParts;
    }
    else {
        result.content = text || "";
    }
    if (toolCalls.length > 0) {
        result.tool_calls = toolCalls;
    }
    if (finishReason) {
        result.finish_reason = finishReason;
    }
    if (safetyRatings) {
        result.safety_ratings = safetyRatings;
    }
    if ("usageMetadata" in response && response.usageMetadata) {
        result.usage_metadata = _createUsageMetadata(response.usageMetadata);
    }
    return result;
}
function _getGeminiInvocationParams(prepopulatedInvocationParams, payload) {
    const config = (payload?.[0] || payload);
    return {
        ls_provider: "google",
        ls_model_type: "chat",
        ls_model_name: config?.model || "unknown",
        ls_temperature: config?.config?.temperature,
        ls_max_tokens: config?.config?.maxOutputTokens,
        ls_invocation_params: prepopulatedInvocationParams,
    };
}
/**
 * Wraps a Google Gemini client to enable automatic LangSmith tracing.
 *
 * **⚠️ BETA: This feature is in beta and may change in future releases.**
 *
 * Supports tracing for:
 * - Text generation (streaming and non-streaming)
 * - Multimodal inputs (text + images)
 * - Image generation output (gemini-2.5-flash-image)
 * - Function calling
 * - Usage metadata extraction
 *
 * @param gemini - A Google GenAI client instance
 * @param options - LangSmith tracing configuration options
 * @returns A wrapped client with automatic tracing enabled
 *
 * @example
 * ```ts
 * import { GoogleGenAI } from "@google/genai";
 * import { wrapGemini } from "langsmith/wrappers/gemini";
 *
 * const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
 * const wrapped = wrapGemini(client, { tracingEnabled: true });
 *
 * // Use the wrapped client exactly like the original
 * const response = await wrapped.models.generateContent({
 *   model: "gemini-2.0-flash-exp",
 *   contents: "Hello!",
 * });
 * ```
 */
export function wrapGemini(gemini, options) {
    // Prevent double wrapping
    if (isTraceableFunction(gemini.models.generateContent) ||
        isTraceableFunction(gemini.models.generateContentStream)) {
        throw new Error("This Google Gen AI client has already been wrapped. " +
            "Wrapping a client multiple times is not supported.");
    }
    const tracedGeminiClient = { ...gemini };
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
    const geminiTraceConfig = {
        name: "ChatGoogleGenerativeAI",
        run_type: "llm",
        getInvocationParams: (payload) => _getGeminiInvocationParams(prepopulatedInvocationParams ?? {}, payload),
        processInputs: processGeminiInputs,
        processOutputs: processGeminiOutputs,
        ...cleanedOptions,
    };
    const geminiStreamTraceConfig = {
        name: "ChatGoogleGenerativeAI",
        run_type: "llm",
        aggregator: chatAggregator,
        getInvocationParams: (payload) => _getGeminiInvocationParams(prepopulatedInvocationParams ?? {}, payload),
        processInputs: processGeminiInputs,
        processOutputs: processGeminiOutputs,
        ...cleanedOptions,
    };
    tracedGeminiClient.models = {
        ...gemini.models,
        generateContent: traceable(gemini.models.generateContent.bind(gemini.models), geminiTraceConfig),
        generateContentStream: traceable(gemini.models.generateContentStream.bind(gemini.models), geminiStreamTraceConfig),
    };
    return tracedGeminiClient;
}
export default wrapGemini;
