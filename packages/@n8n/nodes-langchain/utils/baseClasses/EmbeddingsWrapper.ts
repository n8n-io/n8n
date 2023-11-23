import type { EmbeddingsParams } from 'langchain/embeddings/base';
import { Embeddings } from 'langchain/embeddings/base';
import { NodeConnectionType, type IExecuteFunctions } from 'n8n-workflow';

/*
 * Wrapper class for Embeddings to implement input and output tracing.
 * TODO: Should eventually be implemented in the Embeddings class itself in `langchain-ai/langchainjs/pull/1859/`.
 */
export class EmbeddingsWrapper extends Embeddings {
	private embeddingsProvider: Embeddings;

	private context: IExecuteFunctions;

	constructor(
		context: IExecuteFunctions,
		embeddingsProvider: Embeddings,
		params?: EmbeddingsParams,
	) {
		super(params ?? {});
		this.context = context;
		this.embeddingsProvider = embeddingsProvider;
	}

	async embedDocuments(documents: string[]): Promise<number[][]> {
		const { index } = this.context.addInputData(NodeConnectionType.AiEmbedding, [
			[{ json: { documents } }],
		]);

		const response = await this.embeddingsProvider.embedDocuments(documents);
		this.context.addOutputData(NodeConnectionType.AiEmbedding, index, [[{ json: { response } }]]);

		return response;
	}

	async embedQuery(document: string): Promise<number[]> {
		const { index } = this.context.addInputData(NodeConnectionType.AiEmbedding, [
			[{ json: { document } }],
		]);

		const response = await this.embeddingsProvider.embedQuery(document);

		this.context.addOutputData(NodeConnectionType.AiEmbedding, index, [[{ json: { response } }]]);

		return response;
	}
}
