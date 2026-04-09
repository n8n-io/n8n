import { LanguageModelV3Usage } from '@ai-sdk/provider';
import { XaiChatUsage } from './xai-chat-language-model';

export function convertXaiChatUsage(usage: XaiChatUsage): LanguageModelV3Usage {
  const cacheReadTokens = usage.prompt_tokens_details?.cached_tokens ?? 0;
  const reasoningTokens =
    usage.completion_tokens_details?.reasoning_tokens ?? 0;

  const promptTokensIncludesCached = cacheReadTokens <= usage.prompt_tokens;

  return {
    inputTokens: {
      total: promptTokensIncludesCached
        ? usage.prompt_tokens
        : usage.prompt_tokens + cacheReadTokens,
      noCache: promptTokensIncludesCached
        ? usage.prompt_tokens - cacheReadTokens
        : usage.prompt_tokens,
      cacheRead: cacheReadTokens,
      cacheWrite: undefined,
    },
    outputTokens: {
      total: usage.completion_tokens + reasoningTokens,
      text: usage.completion_tokens,
      reasoning: reasoningTokens,
    },
    raw: usage,
  };
}
