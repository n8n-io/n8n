import { LanguageModelV3Usage } from '@ai-sdk/provider';

export type OpenAIResponsesUsage = {
  input_tokens: number;
  output_tokens: number;
  input_tokens_details?: {
    cached_tokens?: number | null;
  } | null;
  output_tokens_details?: {
    reasoning_tokens?: number | null;
  } | null;
};

export function convertOpenAIResponsesUsage(
  usage: OpenAIResponsesUsage | undefined | null,
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

  const inputTokens = usage.input_tokens;
  const outputTokens = usage.output_tokens;
  const cachedTokens = usage.input_tokens_details?.cached_tokens ?? 0;
  const reasoningTokens = usage.output_tokens_details?.reasoning_tokens ?? 0;

  return {
    inputTokens: {
      total: inputTokens,
      noCache: inputTokens - cachedTokens,
      cacheRead: cachedTokens,
      cacheWrite: undefined,
    },
    outputTokens: {
      total: outputTokens,
      text: outputTokens - reasoningTokens,
      reasoning: reasoningTokens,
    },
    raw: usage,
  };
}
