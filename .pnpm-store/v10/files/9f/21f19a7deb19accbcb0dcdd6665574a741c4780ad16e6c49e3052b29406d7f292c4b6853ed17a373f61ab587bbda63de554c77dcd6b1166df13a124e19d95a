import { InferSchema, lazySchema, zodSchema } from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

export type GoogleGenerativeAIModelId =
  // Stable models
  // https://ai.google.dev/gemini-api/docs/models/gemini
  | 'gemini-2.0-flash'
  | 'gemini-2.0-flash-001'
  | 'gemini-2.0-flash-lite'
  | 'gemini-2.0-flash-lite-001'
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash'
  | 'gemini-2.5-flash-image'
  | 'gemini-2.5-flash-lite'
  | 'gemini-2.5-flash-lite-preview-09-2025'
  | 'gemini-2.5-flash-preview-tts'
  | 'gemini-2.5-pro-preview-tts'
  | 'gemini-2.5-flash-native-audio-latest'
  | 'gemini-2.5-flash-native-audio-preview-09-2025'
  | 'gemini-2.5-flash-native-audio-preview-12-2025'
  | 'gemini-2.5-computer-use-preview-10-2025'
  | 'gemini-3-pro-preview'
  | 'gemini-3-pro-image-preview'
  | 'gemini-3-flash-preview'
  | 'gemini-3.1-pro-preview'
  | 'gemini-3.1-pro-preview-customtools'
  | 'gemini-3.1-flash-image-preview'
  | 'gemini-3.1-flash-lite-preview'
  // latest version
  // https://ai.google.dev/gemini-api/docs/models#latest
  | 'gemini-pro-latest'
  | 'gemini-flash-latest'
  | 'gemini-flash-lite-latest'
  | 'deep-research-pro-preview-12-2025'
  | 'nano-banana-pro-preview'
  | 'aqa'
  // Experimental models
  // https://ai.google.dev/gemini-api/docs/models/experimental-models
  | 'gemini-robotics-er-1.5-preview'
  | 'gemma-3-1b-it'
  | 'gemma-3-4b-it'
  | 'gemma-3n-e4b-it'
  | 'gemma-3n-e2b-it'
  | 'gemma-3-12b-it'
  | 'gemma-3-27b-it'
  | (string & {});

export const googleLanguageModelOptions = lazySchema(() =>
  zodSchema(
    z.object({
      responseModalities: z.array(z.enum(['TEXT', 'IMAGE'])).optional(),

      thinkingConfig: z
        .object({
          thinkingBudget: z.number().optional(),
          includeThoughts: z.boolean().optional(),
          // https://ai.google.dev/gemini-api/docs/gemini-3?thinking=high#thinking_level
          thinkingLevel: z
            .enum(['minimal', 'low', 'medium', 'high'])
            .optional(),
        })
        .optional(),

      /**
       * Optional.
       * The name of the cached content used as context to serve the prediction.
       * Format: cachedContents/{cachedContent}
       */
      cachedContent: z.string().optional(),

      /**
       * Optional. Enable structured output. Default is true.
       *
       * This is useful when the JSON Schema contains elements that are
       * not supported by the OpenAPI schema version that
       * Google Generative AI uses. You can use this to disable
       * structured outputs if you need to.
       */
      structuredOutputs: z.boolean().optional(),

      /**
       * Optional. A list of unique safety settings for blocking unsafe content.
       */
      safetySettings: z
        .array(
          z.object({
            category: z.enum([
              'HARM_CATEGORY_UNSPECIFIED',
              'HARM_CATEGORY_HATE_SPEECH',
              'HARM_CATEGORY_DANGEROUS_CONTENT',
              'HARM_CATEGORY_HARASSMENT',
              'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              'HARM_CATEGORY_CIVIC_INTEGRITY',
            ]),
            threshold: z.enum([
              'HARM_BLOCK_THRESHOLD_UNSPECIFIED',
              'BLOCK_LOW_AND_ABOVE',
              'BLOCK_MEDIUM_AND_ABOVE',
              'BLOCK_ONLY_HIGH',
              'BLOCK_NONE',
              'OFF',
            ]),
          }),
        )
        .optional(),

      threshold: z
        .enum([
          'HARM_BLOCK_THRESHOLD_UNSPECIFIED',
          'BLOCK_LOW_AND_ABOVE',
          'BLOCK_MEDIUM_AND_ABOVE',
          'BLOCK_ONLY_HIGH',
          'BLOCK_NONE',
          'OFF',
        ])
        .optional(),

      /**
       * Optional. Enables timestamp understanding for audio-only files.
       *
       * https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/audio-understanding
       */
      audioTimestamp: z.boolean().optional(),

      /**
       * Optional. Defines labels used in billing reports. Available on Vertex AI only.
       *
       * https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/add-labels-to-api-calls
       */
      labels: z.record(z.string(), z.string()).optional(),

      /**
       * Optional. If specified, the media resolution specified will be used.
       *
       * https://ai.google.dev/api/generate-content#MediaResolution
       */
      mediaResolution: z
        .enum([
          'MEDIA_RESOLUTION_UNSPECIFIED',
          'MEDIA_RESOLUTION_LOW',
          'MEDIA_RESOLUTION_MEDIUM',
          'MEDIA_RESOLUTION_HIGH',
        ])
        .optional(),

      /**
       * Optional. Configures the image generation aspect ratio for Gemini models.
       *
       * https://ai.google.dev/gemini-api/docs/image-generation#aspect_ratios
       */
      imageConfig: z
        .object({
          aspectRatio: z
            .enum([
              '1:1',
              '2:3',
              '3:2',
              '3:4',
              '4:3',
              '4:5',
              '5:4',
              '9:16',
              '16:9',
              '21:9',
              '1:8',
              '8:1',
              '1:4',
              '4:1',
            ])
            .optional(),
          imageSize: z.enum(['1K', '2K', '4K', '512']).optional(),
        })
        .optional(),

      /**
       * Optional. Configuration for grounding retrieval.
       * Used to provide location context for Google Maps and Google Search grounding.
       *
       * https://cloud.google.com/vertex-ai/generative-ai/docs/grounding/grounding-with-google-maps
       */
      retrievalConfig: z
        .object({
          latLng: z
            .object({
              latitude: z.number(),
              longitude: z.number(),
            })
            .optional(),
        })
        .optional(),
    }),
  ),
);

export type GoogleLanguageModelOptions = InferSchema<
  typeof googleLanguageModelOptions
>;
