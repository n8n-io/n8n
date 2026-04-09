import { LanguageModelV3Content, LanguageModelV3Text } from '@ai-sdk/provider';

export function extractTextContent(
  content: LanguageModelV3Content[],
): string | undefined {
  const parts = content.filter(
    (content): content is LanguageModelV3Text => content.type === 'text',
  );

  if (parts.length === 0) {
    return undefined;
  }

  return parts.map(content => content.text).join('');
}
