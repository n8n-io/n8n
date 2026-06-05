import { chunkArray } from '@langchain/core/utils/chunk_array';
import { OpenAIEmbeddings } from '@langchain/openai';
import { OperationalError } from 'n8n-workflow';
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
 * indexing and retrieval, so the mode is derived from which method is called:
 * `embedDocuments` -> passage, `embedQuery` -> query.
 *
 * `input_type` is stamped onto each request when it is built (see `embedWithInputType`), so the
 * value travels with the request itself rather than through shared instance state. This keeps
 * `embedDocuments` and `embedQuery` independent even if they are invoked concurrently against the
 * same instance, and is robust to whatever order the base class dispatches batched requests in.
 */
export class NvidiaEmbeddings extends OpenAIEmbeddings {
	override async embedDocuments(texts: string[]): Promise<number[][]> {
		return await this.embedWithInputType(texts, 'passage');
	}

	override async embedQuery(text: string): Promise<number[]> {
		const [embedding] = await this.embedWithInputType([text], 'query');
		return embedding;
	}

	/**
	 * Mirrors `OpenAIEmbeddings.embedDocuments` batching, but stamps every batched request with the
	 * given `input_type`. Binding the value to the request (rather than to a mutable field shared
	 * across calls) is what makes concurrent passage/query usage safe.
	 */
	private async embedWithInputType(
		texts: string[],
		inputType: NvidiaInputType,
	): Promise<number[][]> {
		const input = this.stripNewLines ? texts.map((text) => text.replace(/\n/g, ' ')) : texts;
		const batches = chunkArray(input, this.batchSize);

		const batchRequests = batches.map(async (batch) => {
			const params: NvidiaEmbeddingCreateParams = {
				model: this.model,
				input: batch,
				input_type: inputType,
			};
			if (this.dimensions) params.dimensions = this.dimensions;
			if (this.encodingFormat) params.encoding_format = this.encodingFormat;
			const { data } = await this.embeddingWithRetry(params);
			return { expected: batch.length, data };
		});

		const batchResponses = await Promise.all(batchRequests);

		// The caller maps each input text to the embedding at the same position, so every batch must
		// return exactly one embedding per input. Flatten by input position (like the base class) and
		// fail loudly on a malformed response rather than silently dropping or shifting embeddings.
		const embeddings: number[][] = [];
		for (const { expected, data } of batchResponses) {
			if (data.length !== expected) {
				throw new OperationalError(
					`NVIDIA embeddings API returned ${data.length} embeddings for a batch of ${expected} inputs`,
				);
			}
			for (const entry of data) {
				embeddings.push(entry.embedding);
			}
		}
		return embeddings;
	}
}
