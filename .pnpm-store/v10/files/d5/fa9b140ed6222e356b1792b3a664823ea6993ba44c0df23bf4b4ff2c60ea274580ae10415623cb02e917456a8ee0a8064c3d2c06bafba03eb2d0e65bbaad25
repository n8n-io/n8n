import { createProviderToolFactory } from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

// https://cloud.google.com/vertex-ai/generative-ai/docs/rag-engine/use-vertexai-search#generate-content-using-gemini-api
// https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/rag-output-explained

/**
 * A tool that enables the model to perform RAG searches against a Vertex RAG Store.
 *
 * @note Only works with Vertex Gemini models.
 */
export const vertexRagStore = createProviderToolFactory<
  {},
  {
    /**
     * RagCorpus resource names, eg: projects/{project}/locations/{location}/ragCorpora/{rag_corpus}
     */
    ragCorpus: string;

    /**
     * The number of top contexts to retrieve.
     */
    topK?: number;
  }
>({
  id: 'google.vertex_rag_store',
  inputSchema: z.object({
    ragCorpus: z.string(),
    topK: z.number().optional(),
  }),
});
