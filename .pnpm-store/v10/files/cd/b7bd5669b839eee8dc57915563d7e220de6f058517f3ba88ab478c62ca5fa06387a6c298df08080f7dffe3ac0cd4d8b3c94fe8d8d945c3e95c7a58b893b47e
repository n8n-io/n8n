import { LanguageModelV3Usage } from '@ai-sdk/provider';

export function convertOpenAICompatibleChatUsage(
  usage:
    | {
        prompt_tokens?: number | null;
        completion_tokens?: number | null;
        prompt_tokens_details?: {
          cached_tokens?: number | null;
        } | null;
        completion_tokens_details?: {
          reasoning_tokens?: number | null;
        } | null;
      }
    | undefined
    | null,
): LanguageModelV3Usage {
  if (usage == null) {
    return {
      inputTokens: {
        total: undefined,
        noCache: undefined,
        cacheRead: undefined,
        cacheWrite: undefined,
      },
      outputTokens: {
        total: undefined,
        text: undefined,
        reasoning: undefined,
      },
      raw: undefined,
    };
  }

  const promptTokens = usage.prompt_tokens ?? 0;
  const completionTokens = usage.completion_tokens ?? 0;
  const cacheReadTokens = usage.prompt_tokens_details?.cached_tokens ?? 0;
  const reasoningTokens =
    usage.completion_tokens_details?.reasoning_tokens ?? 0;

  return {
    inputTokens: {
      total: promptTokens,
      noCache: promptTokens - cacheReadTokens,
      cacheRead: cacheReadTokens,
      cacheWrite: undefined,
    },
    outputTokens: {
      total: completionTokens,
      text: completionTokens - reasoningTokens,
      reasoning: reasoningTokens,
    },
    raw: usage,
  };
}
