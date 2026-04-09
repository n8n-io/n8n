export type OpenAIImageModelId =
  | 'dall-e-3'
  | 'dall-e-2'
  | 'gpt-image-1'
  | 'gpt-image-1-mini'
  | 'gpt-image-1.5'
  | 'chatgpt-image-latest'
  | (string & {});

// https://platform.openai.com/docs/guides/images
export const modelMaxImagesPerCall: Record<OpenAIImageModelId, number> = {
  'dall-e-3': 1,
  'dall-e-2': 10,
  'gpt-image-1': 10,
  'gpt-image-1-mini': 10,
  'gpt-image-1.5': 10,
  'chatgpt-image-latest': 10,
};

const defaultResponseFormatPrefixes = [
  'chatgpt-image-',
  'gpt-image-1-mini',
  'gpt-image-1.5',
  'gpt-image-1',
];

export function hasDefaultResponseFormat(modelId: string): boolean {
  return defaultResponseFormatPrefixes.some(prefix =>
    modelId.startsWith(prefix),
  );
}
