import { convertAnthropicUsageToInputTokenDetails } from "./usage.js";
function extractTraceableServiceTier(providerMetadata) {
    if (providerMetadata?.openai != null &&
        typeof providerMetadata.openai === "object") {
        const openai = providerMetadata.openai;
        if (openai.serviceTier != null &&
            typeof openai.serviceTier === "string" &&
            ["priority", "flex"].includes(openai.serviceTier)) {
            return openai.serviceTier;
        }
    }
    return undefined;
}
function isLanguageModelV3Usage(usage) {
    return usage.inputTokens != null && typeof usage.inputTokens === "object";
}
function extractAISDK6OutputTokenDetails(usage, providerMetadata) {
    const openAIServiceTier = extractTraceableServiceTier(providerMetadata ?? {});
    const outputTokenDetailsKeyPrefix = openAIServiceTier
        ? `${openAIServiceTier}_`
        : "";
    const outputTokens = usage.outputTokens;
    const outputTokenDetails = {};
    // Extract reasoning tokens from AI SDK 6
    if (typeof outputTokens?.reasoning === "number" &&
        outputTokens?.reasoning > 0) {
        outputTokenDetails[`${outputTokenDetailsKeyPrefix}reasoning`] =
            outputTokens.reasoning;
    }
    // Apply service tier logic for AI SDK 6
    if (openAIServiceTier && typeof outputTokens?.total === "number") {
        // Avoid counting reasoning tokens towards the output token count
        // since service tier tokens are already priced differently
        outputTokenDetails[openAIServiceTier] =
            outputTokens.total -
                (outputTokenDetails[`${outputTokenDetailsKeyPrefix}reasoning`] ?? 0);
    }
    return outputTokenDetails;
}
export function extractOutputTokenDetails(usage, providerMetadata) {
    if (usage == null) {
        return {};
    }
    // AI SDK 6: Check for built-in outputTokens breakdown first
    if (isLanguageModelV3Usage(usage)) {
        // Return AI SDK 6 results (even if empty, to prevent falling through to SDK 5 logic)
        return extractAISDK6OutputTokenDetails(usage, providerMetadata);
    }
    const openAIServiceTier = extractTraceableServiceTier(providerMetadata ?? {});
    const outputTokenDetailsKeyPrefix = openAIServiceTier
        ? `${openAIServiceTier}_`
        : "";
    const outputTokenDetails = {};
    if (typeof usage?.reasoningTokens === "number") {
        outputTokenDetails[`${outputTokenDetailsKeyPrefix}reasoning`] =
            usage.reasoningTokens;
    }
    if (openAIServiceTier && typeof usage?.outputTokens === "number") {
        // Avoid counting reasoning tokens towards the output token count
        // since service tier tokens are already priced differently
        outputTokenDetails[openAIServiceTier] =
            usage.outputTokens -
                (outputTokenDetails[`${outputTokenDetailsKeyPrefix}reasoning`] ?? 0);
    }
    return outputTokenDetails;
}
function extractAISDK6InputTokenDetails(usage, providerMetadata) {
    let inputTokenDetails = {};
    const inputTokens = usage.inputTokens;
    // Extract standard AI SDK 6 input token breakdowns
    // Map AI SDK 6 fields to LangSmith token detail fields:
    // - cacheRead -> cache_read
    // - cacheWrite -> cache_creation
    if (providerMetadata?.anthropic != null &&
        typeof providerMetadata?.anthropic === "object") {
        const anthropic = providerMetadata.anthropic;
        if (anthropic.usage != null && typeof anthropic.usage === "object") {
            // Raw usage from Anthropic returned in AI SDK 5
            const usage = anthropic.usage;
            inputTokenDetails = convertAnthropicUsageToInputTokenDetails(usage);
        }
    }
    else {
        if (typeof inputTokens?.cacheRead === "number" &&
            inputTokens.cacheRead > 0) {
            inputTokenDetails.cache_read = inputTokens.cacheRead;
        }
        if (typeof inputTokens?.cacheWrite === "number" &&
            inputTokens?.cacheWrite > 0) {
            inputTokenDetails.cache_creation = inputTokens?.cacheWrite;
        }
    }
    // Handle OpenAI service tier for AI SDK 6
    const openAIServiceTier = extractTraceableServiceTier(providerMetadata ?? {});
    if (openAIServiceTier) {
        const serviceTierPrefix = `${openAIServiceTier}_`;
        // Add cache_read with service tier prefix if we have cached tokens
        if (typeof inputTokens?.cacheRead === "number" &&
            inputTokens?.cacheRead > 0) {
            inputTokenDetails[`${serviceTierPrefix}cache_read`] =
                inputTokens.cacheRead;
            // Remove the non-prefixed version since we're using service tier
            delete inputTokenDetails.cache_read;
        }
        // Calculate service tier tokens (total minus cached)
        if (typeof inputTokens?.total === "number") {
            inputTokenDetails[openAIServiceTier] =
                inputTokens.total -
                    (inputTokenDetails[`${serviceTierPrefix}cache_read`] ?? 0);
        }
    }
    return inputTokenDetails;
}
export function extractInputTokenDetails(usage, providerMetadata) {
    if (usage == null) {
        return {};
    }
    // AI SDK 6: Check for built-in inputTokens breakdown first
    if (isLanguageModelV3Usage(usage)) {
        // Return AI SDK 6 results (even if empty, to prevent falling through to SDK 5 logic)
        return extractAISDK6InputTokenDetails(usage, providerMetadata);
    }
    let inputTokenDetails = {};
    if (providerMetadata?.anthropic != null &&
        typeof providerMetadata?.anthropic === "object") {
        const anthropic = providerMetadata.anthropic;
        if (anthropic.usage != null && typeof anthropic.usage === "object") {
            // Raw usage from Anthropic returned in AI SDK 5
            const usage = anthropic.usage;
            inputTokenDetails = convertAnthropicUsageToInputTokenDetails(usage);
        }
        else {
            // AI SDK 4 fields
            if (anthropic.cacheReadInputTokens != null &&
                typeof anthropic.cacheReadInputTokens === "number") {
                inputTokenDetails.cache_read = anthropic.cacheReadInputTokens;
            }
            if (anthropic.cacheCreationInputTokens != null &&
                typeof anthropic.cacheCreationInputTokens === "number") {
                inputTokenDetails.ephemeral_5m_input_tokens =
                    anthropic.cacheCreationInputTokens;
            }
        }
        return inputTokenDetails;
    }
    else if (providerMetadata?.openai != null &&
        typeof providerMetadata?.openai === "object") {
        const openAIServiceTier = extractTraceableServiceTier(providerMetadata ?? {});
        const outputTokenDetailsKeyPrefix = openAIServiceTier
            ? `${openAIServiceTier}_`
            : "";
        if (typeof usage?.cachedInputTokens === "number") {
            inputTokenDetails[`${outputTokenDetailsKeyPrefix}cache_read`] =
                usage.cachedInputTokens;
        }
        else if ("cachedPromptTokens" in providerMetadata.openai &&
            providerMetadata.openai.cachedPromptTokens != null &&
            typeof providerMetadata.openai.cachedPromptTokens === "number") {
            inputTokenDetails[`${outputTokenDetailsKeyPrefix}cache_read`] =
                providerMetadata.openai.cachedPromptTokens;
        }
        if (openAIServiceTier && typeof usage?.inputTokens === "number") {
            // Avoid counting cached input tokens towards the input token count
            // since service tier tokens are already priced differently
            inputTokenDetails[openAIServiceTier] =
                usage.inputTokens -
                    (inputTokenDetails[`${outputTokenDetailsKeyPrefix}cache_read`] ?? 0);
        }
    }
    return inputTokenDetails;
}
export function extractUsageMetadata(span) {
    const isError = span?.status?.code === 2;
    if (isError || !span || !span.attributes) {
        return {
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0,
        };
    }
    const usageMetadata = {
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
    };
    if (typeof span.attributes["ai.usage.promptTokens"] === "number" ||
        typeof span.attributes["ai.usage.inputTokens"] === "number") {
        usageMetadata.input_tokens =
            span.attributes["ai.usage.promptTokens"] ??
                span.attributes["ai.usage.inputTokens"];
    }
    if (typeof span.attributes["ai.usage.completionTokens"] === "number" ||
        typeof span.attributes["ai.usage.outputTokens"] === "number") {
        usageMetadata.output_tokens =
            span.attributes["ai.usage.completionTokens"] ??
                span.attributes["ai.usage.outputTokens"];
    }
    if (typeof span.attributes["ai.response.providerMetadata"] === "string") {
        try {
            const providerMetadata = JSON.parse(span.attributes["ai.response.providerMetadata"]);
            usageMetadata.input_token_details = extractInputTokenDetails(typeof span.attributes["ai.usage.cachedInputTokens"] === "number"
                ? { cachedInputTokens: span.attributes["ai.usage.cachedInputTokens"] }
                : undefined, providerMetadata);
            if (providerMetadata.anthropic != null &&
                typeof providerMetadata.anthropic === "object") {
                // AI SDK does not include Anthropic cache tokens in their stated input token
                // numbers, so we need to add them manually
                for (const key in usageMetadata.input_token_details) {
                    usageMetadata.input_tokens += usageMetadata.input_token_details[key];
                }
            }
        }
        catch {
            // pass
        }
    }
    usageMetadata.total_tokens =
        usageMetadata.input_tokens + usageMetadata.output_tokens;
    return usageMetadata;
}
