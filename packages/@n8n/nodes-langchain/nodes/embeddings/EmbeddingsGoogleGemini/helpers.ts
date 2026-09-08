import {
	GoogleGenerativeAI,
	type EmbedContentRequest,
	type GenerativeModel,
} from '@google/generative-ai';
import { chunkArray } from '@langchain/core/utils/chunk_array';
import {
	GoogleGenerativeAIEmbeddings,
	type GoogleGenerativeAIEmbeddingsParams,
} from '@langchain/google-genai';

// The Gemini embedContent API accepts `outputDimensionality` (Matryoshka truncation), but the
// `@google/generative-ai` request type does not declare it, so we extend the type rather than cast.
type EmbedContentRequestWithDimensionality = EmbedContentRequest & {
	outputDimensionality?: number;
};

export interface GeminiEmbeddingsParams extends GoogleGenerativeAIEmbeddingsParams {
	/** Truncates the returned embeddings to this many dimensions. Unset keeps the model default. */
	outputDimensionality?: number;
}

/**
 * Gemini embeddings with support for the `outputDimensionality` request field.
 *
 * `GoogleGenerativeAIEmbeddings` from `@langchain/google-genai` builds its requests in a private
 * method and has no way to set `outputDimensionality`, so `gemini-embedding-001` always returns
 * its 3072-dimensional default. When the option is unset every call is delegated to the base class
 * unchanged; when it is set the request is built here and sent with the extra field.
 */
export class GeminiEmbeddings extends GoogleGenerativeAIEmbeddings {
	outputDimensionality?: number;

	// The base class keeps its GenerativeModel private, so the requests that carry
	// `outputDimensionality` go through a second instance created from the same inputs.
	private readonly embedClient: GenerativeModel;

	constructor(fields: GeminiEmbeddingsParams) {
		super(fields);
		this.outputDimensionality = fields.outputDimensionality;
		// The base constructor has already rejected a missing API key at this point.
		this.embedClient = new GoogleGenerativeAI(this.apiKey ?? '').getGenerativeModel(
			{ model: this.model },
			{ baseUrl: fields.baseUrl },
		);
	}

	protected override async _embedQueryContent(text: string): Promise<number[]> {
		if (!this.outputDimensionality) return await super._embedQueryContent(text);

		const { embedding } = await this.embedClient.embedContent(this.toEmbedContentRequest(text));
		return embedding.values ?? [];
	}

	protected override async _embedDocumentsContent(documents: string[]): Promise<number[][]> {
		if (!this.outputDimensionality) return await super._embedDocumentsContent(documents);

		const chunks = chunkArray(documents, this.maxBatchSize);
		const results = await Promise.allSettled(
			chunks.map(
				async (chunk) =>
					await this.embedClient.batchEmbedContents({
						requests: chunk.map((document) => this.toEmbedContentRequest(document)),
					}),
			),
		);

		// Same semantics as the base class: a failed batch yields empty vectors for its inputs so the
		// output stays aligned with the input positions.
		return results.flatMap((result, index) =>
			result.status === 'fulfilled'
				? result.value.embeddings.map((embedding) => embedding.values ?? [])
				: Array<number[]>(chunks[index].length).fill([]),
		);
	}

	// Mirrors the request the base class builds (its builder is private), plus the dimensionality.
	private toEmbedContentRequest(text: string): EmbedContentRequestWithDimensionality {
		return {
			content: {
				role: 'user',
				parts: [{ text: this.stripNewLines ? text.replace(/\n/g, ' ') : text }],
			},
			taskType: this.taskType,
			title: this.title,
			outputDimensionality: this.outputDimensionality,
		};
	}
}
