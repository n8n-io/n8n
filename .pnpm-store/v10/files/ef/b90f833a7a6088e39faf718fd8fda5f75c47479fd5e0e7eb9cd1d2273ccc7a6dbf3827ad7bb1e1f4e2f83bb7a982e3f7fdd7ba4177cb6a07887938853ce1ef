export type GoogleGenerativeAIImageModelId =
  // Imagen models (use :predict API)
  | 'imagen-4.0-generate-001'
  | 'imagen-4.0-ultra-generate-001'
  | 'imagen-4.0-fast-generate-001'
  // Gemini image models (technically multimodal output language models, use :generateContent API)
  | 'gemini-2.5-flash-image'
  | 'gemini-3-pro-image-preview'
  | 'gemini-3.1-flash-image-preview'
  | (string & {});

export interface GoogleGenerativeAIImageSettings {
  /**
   * Override the maximum number of images per call (default 4)
   */
  maxImagesPerCall?: number;
}
