import { InvokeModelCommand, type BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { Embeddings } from '@langchain/core/embeddings';
import { jsonParse, OperationalError } from 'n8n-workflow';

type CohereInputType = 'search_document' | 'search_query';

type EmbeddingResponseBody = {
	embedding?: number[];
	embeddings?: number[][] | { float?: number[][] };
};

export type BedrockInvokeModelEmbeddingsParams = {
	client: BedrockRuntimeClient;
	model: string;
	additionalModelRequestFields?: Record<string, unknown>;
};

export class BedrockInvokeModelEmbeddings extends Embeddings {
	private readonly client: BedrockRuntimeClient;

	private readonly model: string;

	private readonly additionalModelRequestFields: Record<string, unknown>;

	constructor({ client, model, additionalModelRequestFields }: BedrockInvokeModelEmbeddingsParams) {
		// Retries are handled by the SDK client (maxAttempts); the LangChain
		// AsyncCaller must not add a second retry layer on top.
		super({ maxRetries: 0 });
		this.client = client;
		this.model = model;
		this.additionalModelRequestFields = additionalModelRequestFields ?? {};
	}

	private buildRequestBody(text: string, inputType: CohereInputType): Record<string, unknown> {
		// Newlines are stripped to keep vectors identical to the previous
		// @langchain/aws implementation, so existing vector-store data stays comparable.
		const cleanedText = text.replace(/\n/g, ' ');
		if (this.model.includes('cohere.embed')) {
			return { texts: [cleanedText], input_type: inputType, ...this.additionalModelRequestFields };
		}
		return { inputText: cleanedText, ...this.additionalModelRequestFields };
	}

	private async embed(text: string, inputType: CohereInputType): Promise<number[]> {
		return await this.caller.call(async () => {
			const response = await this.client.send(
				new InvokeModelCommand({
					modelId: this.model,
					body: JSON.stringify(this.buildRequestBody(text, inputType)),
					contentType: 'application/json',
					accept: 'application/json',
				}),
			);
			const body = jsonParse<EmbeddingResponseBody>(new TextDecoder().decode(response.body));
			if (Array.isArray(body.embedding)) {
				return body.embedding;
			}
			const rows = Array.isArray(body.embeddings) ? body.embeddings : body.embeddings?.float;
			const first = rows?.[0];
			if (Array.isArray(first)) {
				return first;
			}
			throw new OperationalError('Unexpected embedding response from Bedrock');
		});
	}

	async embedDocuments(documents: string[]): Promise<number[][]> {
		return await Promise.all(
			documents.map(async (document) => await this.embed(document, 'search_document')),
		);
	}

	async embedQuery(text: string): Promise<number[]> {
		return await this.embed(text, 'search_query');
	}
}
