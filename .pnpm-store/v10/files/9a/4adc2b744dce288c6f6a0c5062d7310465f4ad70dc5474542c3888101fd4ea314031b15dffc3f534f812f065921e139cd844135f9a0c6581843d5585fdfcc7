import {
  LanguageModelV3Content,
  LanguageModelV3Reasoning,
} from '@ai-sdk/provider';

export function extractReasoningContent(
  content: LanguageModelV3Content[],
): string | undefined {
  const parts = content.filter(
    (content): content is LanguageModelV3Reasoning =>
      content.type === 'reasoning',
  );

  return parts.length === 0
    ? undefined
    : parts.map(content => content.text).join('\n');
}
