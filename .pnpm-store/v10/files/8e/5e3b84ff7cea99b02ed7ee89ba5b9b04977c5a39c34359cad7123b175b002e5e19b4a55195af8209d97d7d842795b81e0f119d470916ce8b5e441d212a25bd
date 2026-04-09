import { LanguageModelV3Usage } from '@ai-sdk/provider';

export function convertOpenAICompatibleCompletionUsage(
  usage:
    | {
        prompt_tokens?: number | null;
        completion_tokens?: number | null;
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

  return {
    inputTokens: {
      total: promptTokens,
      noCache: promptTokens,
      cacheRead: undefined,
      cacheWrite: undefined,
    },
    outputTokens: {
      total: completionTokens,
      text: completionTokens,
      reasoning: undefined,
    },
    raw: usage,
  };
}
