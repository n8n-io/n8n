import {
  type InferSchema,
  lazySchema,
  zodSchema,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

export type GoogleGenerativeAIEmbeddingModelId =
  | 'gemini-embedding-001'
  | 'gemini-embedding-2-preview'
  | (string & {});

const googleEmbeddingContentPartSchema = z.union([
  z.object({ text: z.string() }),
  z.object({
    inlineData: z.object({
      mimeType: z.string(),
      data: z.string(),
    }),
  }),
]);

export const googleEmbeddingModelOptions = lazySchema(() =>
  zodSchema(
    z.object({
      /**
       * Optional. Optional reduced dimension for the output embedding.
       * If set, excessive values in the output embedding are truncated from the end.
       */
      outputDimensionality: z.number().optional(),

      /**
       * Optional. Specifies the task type for generating embeddings.
       * Supported task types:
       * - SEMANTIC_SIMILARITY: Optimized for text similarity.
       * - CLASSIFICATION: Optimized for text classification.
       * - CLUSTERING: Optimized for clustering texts based on similarity.
       * - RETRIEVAL_DOCUMENT: Optimized for document retrieval.
       * - RETRIEVAL_QUERY: Optimized for query-based retrieval.
       * - QUESTION_ANSWERING: Optimized for answering questions.
       * - FACT_VERIFICATION: Optimized for verifying factual information.
       * - CODE_RETRIEVAL_QUERY: Optimized for retrieving code blocks based on natural language queries.
       */
      taskType: z
        .enum([
          'SEMANTIC_SIMILARITY',
          'CLASSIFICATION',
          'CLUSTERING',
          'RETRIEVAL_DOCUMENT',
          'RETRIEVAL_QUERY',
          'QUESTION_ANSWERING',
          'FACT_VERIFICATION',
          'CODE_RETRIEVAL_QUERY',
        ])
        .optional(),

      /**
       * Optional. Per-value multimodal content parts for embedding non-text
       * content (images, video, PDF, audio). Each entry corresponds to the
       * embedding value at the same index and its parts are merged with the
       * text value in the request. Use `null` for entries that are text-only.
       *
       * The array length must match the number of values being embedded. In
       * the case of a single embedding, the array length must be 1.
       */
      content: z
        .array(z.array(googleEmbeddingContentPartSchema).min(1).nullable())
        .optional(),
    }),
  ),
);

export type GoogleEmbeddingModelOptions = InferSchema<
  typeof googleEmbeddingModelOptions
>;
