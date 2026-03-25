export const convertAnthropicUsageToInputTokenDetails = (usage) => {
    const result = {};
    if (usage.cache_creation != null &&
        typeof usage.cache_creation === "object") {
        const cacheCreation = usage.cache_creation;
        if (typeof cacheCreation.ephemeral_5m_input_tokens === "number") {
            result.ephemeral_5m_input_tokens =
                cacheCreation.ephemeral_5m_input_tokens;
        }
        if (typeof cacheCreation.ephemeral_1h_input_tokens === "number") {
            result.ephemeral_1hr_input_tokens =
                cacheCreation.ephemeral_1h_input_tokens;
        }
        // If cache_creation not returned (no beta header passed),
        // fallback to assuming 5m cache tokens
    }
    else if (typeof usage.cache_creation_input_tokens === "number") {
        result.ephemeral_5m_input_tokens = usage.cache_creation_input_tokens;
    }
    if (typeof usage.cache_read_input_tokens === "number") {
        result.cache_read = usage.cache_read_input_tokens;
    }
    return result;
};
