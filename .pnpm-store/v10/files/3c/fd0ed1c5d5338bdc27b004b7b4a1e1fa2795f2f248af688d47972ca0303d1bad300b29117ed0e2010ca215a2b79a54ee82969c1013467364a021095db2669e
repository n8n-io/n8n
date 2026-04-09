import { JSONObject, LanguageModelV3Usage } from '@ai-sdk/provider';

/**
 * Represents a single iteration in the usage breakdown.
 * When compaction occurs, the API returns an iterations array showing
 * usage for each sampling iteration (compaction + message).
 */
export type AnthropicUsageIteration = {
  type: 'compaction' | 'message';
  input_tokens: number;
  output_tokens: number;
};

export type AnthropicMessagesUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  /**
   * When compaction is triggered, this array contains usage for each
   * sampling iteration. The top-level input_tokens and output_tokens
   * do NOT include compaction iteration usage - to get total tokens
   * consumed and billed, sum across all entries in this array.
   */
  iterations?: AnthropicUsageIteration[] | null;
};

export function convertAnthropicMessagesUsage({
  usage,
  rawUsage,
}: {
  usage: AnthropicMessagesUsage;
  rawUsage?: JSONObject;
}): LanguageModelV3Usage {
  const cacheCreationTokens = usage.cache_creation_input_tokens ?? 0;
  const cacheReadTokens = usage.cache_read_input_tokens ?? 0;

  // When iterations is present (compaction occurred), sum across all iterations
  // to get the true total tokens consumed/billed. The top-level input_tokens
  // and output_tokens exclude compaction iteration usage.
  let inputTokens: number;
  let outputTokens: number;

  if (usage.iterations && usage.iterations.length > 0) {
    const totals = usage.iterations.reduce(
      (acc, iter) => ({
        input: acc.input + iter.input_tokens,
        output: acc.output + iter.output_tokens,
      }),
      { input: 0, output: 0 },
    );
    inputTokens = totals.input;
    outputTokens = totals.output;
  } else {
    inputTokens = usage.input_tokens;
    outputTokens = usage.output_tokens;
  }

  return {
    inputTokens: {
      total: inputTokens + cacheCreationTokens + cacheReadTokens,
      noCache: inputTokens,
      cacheRead: cacheReadTokens,
      cacheWrite: cacheCreationTokens,
    },
    outputTokens: {
      total: outputTokens,
      text: undefined,
      reasoning: undefined,
    },
    raw: rawUsage ?? usage,
  };
}
