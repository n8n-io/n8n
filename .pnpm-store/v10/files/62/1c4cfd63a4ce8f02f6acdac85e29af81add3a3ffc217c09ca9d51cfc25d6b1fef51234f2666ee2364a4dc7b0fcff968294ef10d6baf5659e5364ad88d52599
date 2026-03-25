"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateUsageFromModelUsage = aggregateUsageFromModelUsage;
exports.extractUsageFromMessage = extractUsageFromMessage;
exports.correctUsageFromResults = correctUsageFromResults;
const usage_js_1 = require("../../utils/usage.cjs");
const utils_js_1 = require("./utils.cjs");
/**
 * Aggregates usage from modelUsage breakdown (includes all models, including hidden ones).
 * This provides accurate totals when multiple models are used.
 * @internal
 */
function aggregateUsageFromModelUsage(modelUsage) {
    const metrics = {};
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCacheReadTokens = 0;
    let totalCacheCreationTokens = 0;
    // Aggregate across all models
    for (const modelStats of Object.values(modelUsage)) {
        totalInputTokens += modelStats.inputTokens || 0;
        totalOutputTokens += modelStats.outputTokens || 0;
        totalCacheReadTokens += modelStats.cacheReadInputTokens || 0;
        totalCacheCreationTokens += modelStats.cacheCreationInputTokens || 0;
    }
    // Build input_token_details if we have cache tokens
    if (totalCacheReadTokens > 0 || totalCacheCreationTokens > 0) {
        metrics.input_token_details = {
            cache_read: totalCacheReadTokens,
            cache_creation: totalCacheCreationTokens,
        };
    }
    // Sum all input tokens (new + cache read + cache creation)
    const totalPromptTokens = totalInputTokens + totalCacheReadTokens + totalCacheCreationTokens;
    metrics.input_tokens = totalPromptTokens;
    metrics.output_tokens = totalOutputTokens;
    metrics.total_tokens = totalPromptTokens + totalOutputTokens;
    return metrics;
}
/**
 * Extracts and normalizes usage metrics from a Claude Agent SDK message.
 * @internal
 */
function extractUsageFromMessage(message) {
    const metrics = {};
    // Assistant messages contain usage in message.message.usage
    // Result messages contain usage in message.usage
    let usage;
    if (message.type === "assistant") {
        usage = message.message?.usage;
    }
    else if (message.type === "result") {
        usage = message.usage;
    }
    if (!usage || typeof usage !== "object") {
        return metrics;
    }
    // Standard token counts - use LangSmith's expected field names
    const inputTokens = (0, utils_js_1.getNumberProperty)(usage, "input_tokens") || 0;
    const outputTokens = (0, utils_js_1.getNumberProperty)(usage, "output_tokens") || 0;
    // Get cache tokens
    const cacheRead = (0, utils_js_1.getNumberProperty)(usage, "cache_read_input_tokens") || 0;
    const cacheCreation = (0, utils_js_1.getNumberProperty)(usage, "cache_creation_input_tokens") || 0;
    // Build input_token_details if we have cache tokens
    if (cacheRead > 0 || cacheCreation > 0) {
        const inputTokenDetails = (0, usage_js_1.convertAnthropicUsageToInputTokenDetails)(usage);
        if (Object.keys(inputTokenDetails).length > 0) {
            metrics.input_token_details = inputTokenDetails;
        }
    }
    // Sum cache tokens into input_tokens total (matching Python's sum_anthropic_tokens)
    const totalInputTokens = inputTokens + cacheRead + cacheCreation;
    metrics.input_tokens = totalInputTokens;
    metrics.output_tokens = outputTokens;
    metrics.total_tokens = totalInputTokens + outputTokens;
    return metrics;
}
/**
 * Corrects usage metrics for assistant runs based on the results of the runs.
 * @internal
 */
function correctUsageFromResults(resultUsages, assistantRuns) {
    const runByModel = assistantRuns.reduce((acc, run) => {
        const modelId = run.extra?.metadata?.ls_model_name;
        if (!modelId)
            return acc;
        acc[modelId] ??= [];
        acc[modelId].push(run);
        return acc;
    }, {});
    const runUsageByModel = assistantRuns.reduce((acc, run) => {
        const modelId = run.extra?.metadata?.ls_model_name;
        if (!modelId)
            return acc;
        const usageMetadata = { ...run.extra?.metadata?.usage_metadata };
        usageMetadata.input_tokens ??= 0;
        usageMetadata.output_tokens ??= 0;
        usageMetadata.total_tokens ??= 0;
        usageMetadata.input_token_details = {
            ...usageMetadata.input_token_details,
        };
        usageMetadata.input_token_details.cache_read ??= 0;
        usageMetadata.input_token_details.ephemeral_5m_input_tokens ??= 0;
        usageMetadata.input_token_details.ephemeral_1h_input_tokens ??= 0;
        acc[modelId] ??= {
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0,
            input_token_details: {
                cache_read: 0,
                cache_creation: 0,
            },
        };
        acc[modelId].input_tokens += usageMetadata.input_tokens;
        acc[modelId].output_tokens += usageMetadata.output_tokens;
        acc[modelId].total_tokens += usageMetadata.total_tokens;
        acc[modelId].input_token_details.cache_read +=
            usageMetadata.input_token_details.cache_read;
        acc[modelId].input_token_details.cache_creation +=
            usageMetadata.input_token_details.ephemeral_5m_input_tokens;
        acc[modelId].input_token_details.cache_creation +=
            usageMetadata.input_token_details.ephemeral_1h_input_tokens;
        return acc;
    }, {});
    const resultUsageMap = Object.fromEntries(Object.entries(resultUsages).map(([modelId, usage]) => [
        modelId,
        {
            input_tokens: usage.inputTokens +
                usage.cacheReadInputTokens +
                usage.cacheCreationInputTokens,
            output_tokens: usage.outputTokens,
            total_tokens: usage.inputTokens +
                usage.cacheReadInputTokens +
                usage.cacheCreationInputTokens +
                usage.outputTokens,
            input_token_details: {
                cache_read: usage.cacheReadInputTokens,
                cache_creation: usage.cacheCreationInputTokens,
            },
        },
    ]));
    for (const modelId in resultUsageMap) {
        const lastRun = runByModel[modelId]?.at(-1);
        const runsUsage = runUsageByModel[modelId];
        const resultUsage = resultUsageMap[modelId];
        if (!runsUsage || !lastRun)
            continue;
        const difference = {
            input_tokens: Math.max(0, resultUsage.input_tokens - runsUsage.input_tokens),
            output_tokens: Math.max(0, resultUsage.output_tokens - runsUsage.output_tokens),
            total_tokens: Math.max(0, resultUsage.total_tokens - runsUsage.total_tokens),
            cache_read: Math.max(0, resultUsage.input_token_details.cache_read -
                runsUsage.input_token_details.cache_read),
            cache_creation: Math.max(0, resultUsage.input_token_details.cache_creation -
                runsUsage.input_token_details.cache_creation),
        };
        if (Object.values(difference).some((value) => value > 0)) {
            // apply difference to the last run
            lastRun.extra ??= {};
            lastRun.extra.metadata ??= {};
            lastRun.extra.metadata.usage_metadata ??= {};
            lastRun.extra.metadata.usage_metadata.input_tokens ??= 0;
            lastRun.extra.metadata.usage_metadata.input_tokens +=
                difference.input_tokens;
            lastRun.extra.metadata.usage_metadata.output_tokens ??= 0;
            lastRun.extra.metadata.usage_metadata.output_tokens +=
                difference.output_tokens;
            lastRun.extra.metadata.usage_metadata.total_tokens ??= 0;
            lastRun.extra.metadata.usage_metadata.total_tokens +=
                difference.total_tokens;
            lastRun.extra.metadata.usage_metadata.input_token_details ??= {};
            lastRun.extra.metadata.usage_metadata.input_token_details.cache_read ??= 0;
            lastRun.extra.metadata.usage_metadata.input_token_details.cache_read +=
                difference.cache_read;
            lastRun.extra.metadata.usage_metadata.input_token_details.ephemeral_5m_input_tokens ??= 0;
            lastRun.extra.metadata.usage_metadata.input_token_details.ephemeral_5m_input_tokens +=
                difference.cache_creation;
        }
    }
}
