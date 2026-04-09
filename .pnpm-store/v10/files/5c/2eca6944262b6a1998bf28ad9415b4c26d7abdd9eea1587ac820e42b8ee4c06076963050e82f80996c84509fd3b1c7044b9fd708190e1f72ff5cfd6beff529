import { LanguageModelV3Usage } from '@ai-sdk/provider';

export type OpenAICompletionUsage = {
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
};

export function convertOpenAICompletionUsage(
  usage: OpenAICompletionUsage | undefined | null,
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

  return {
    inputTokens: {
      total: usage.prompt_tokens ?? undefined,
      noCache: promptTokens,
      cacheRead: undefined,
      cacheWrite: undefined,
    },
    outputTokens: {
      total: usage.completion_tokens ?? undefined,
      text: completionTokens,
      reasoning: undefined,
    },
    raw: usage,
  };
}
