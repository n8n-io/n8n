import { OpenAIEmbeddings } from '@langchain/openai';
import type { OpenAI } from 'openai';

export type NvidiaInputType = 'passage' | 'query';

// NVIDIA's /v1/embeddings accepts an `input_type` field beyond the plain OpenAI schema.
// `OpenAI.EmbeddingCreateParams` has no such field, so we extend it rather than cast.
type NvidiaEmbeddingCreateParams = OpenAI.EmbeddingCreateParams & {
	input_type?: NvidiaInputType;
};

/**
 * OpenAI-compatible embeddings for NVIDIA NeMo Retriever models.
 *
 * These models embed in two modes and require an `input_type`: "passage" when indexing
 * documents and "query" when embedding a search query. Omitting it sharply degrades retrieval
 * accuracy (and some models reject the request). A single embeddings sub-node is used for both
 * indexing and retrieval, so the mode is derived from which method is called rather than being
 * a static option: `embedDocuments` -> passage, `embedQuery` -> query. Both public methods
 * funnel through `embeddingWithRetry`, where the field is injected into the request body.
 */
export class NvidiaEmbeddings extends OpenAIEmbeddings {
	private currentInputType: NvidiaInputType = 'query';

	override async embedDocuments(texts: string[]): Promise<number[][]> {
		this.currentInputType = 'passage';
		return await super.embedDocuments(texts);
	}

	override async embedQuery(text: string): Promise<number[]> {
		this.currentInputType = 'query';
		return await super.embedQuery(text);
	}

	protected override async embeddingWithRetry(request: OpenAI.EmbeddingCreateParams) {
		const nvidiaRequest: NvidiaEmbeddingCreateParams = {
			...request,
			input_type: this.currentInputType,
		};
		return await super.embeddingWithRetry(nvidiaRequest);
	}
}
