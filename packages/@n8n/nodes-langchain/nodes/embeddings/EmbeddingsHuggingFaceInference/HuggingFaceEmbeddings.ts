/*
	This is extended HuggingFaceInferenceEmbeddings class from langchain package(/langchain/src/embeddings/hf.ts) with custom inference endpoint support back-ported. Once the PR(#3104) to implement this in langchain-ai/langchainjs is merged, we can remove this file and use the original one.
*/
import type { HfInferenceEndpoint } from '@huggingface/inference';
import { HfInference } from '@huggingface/inference';
import type { EmbeddingsParams } from 'langchain/embeddings/base';
import { Embeddings } from 'langchain/embeddings/base';

/**
 * Interface that extends EmbeddingsParams and defines additional
 * parameters specific to the HuggingFaceInferenceEmbeddings class.
 */
export interface HuggingFaceInferenceEmbeddingsParams extends EmbeddingsParams {
	apiKey?: string;
	model?: string;
	endpointUrl?: string;
}

/**
 * Class that extends the Embeddings class and provides methods for
 * generating embeddings using Hugging Face models through the
 * HuggingFaceInference API.
 */
export class HuggingFaceInferenceEmbeddings
	extends Embeddings
	implements HuggingFaceInferenceEmbeddingsParams
{
	apiKey?: string;

	model: string;

	endpointUrl?: string;

	client: HfInference | HfInferenceEndpoint;

	constructor(fields?: HuggingFaceInferenceEmbeddingsParams) {
		super(fields ?? {});

		this.model = fields?.model ?? 'sentence-transformers/distilbert-base-nli-mean-tokens';
		this.apiKey = fields?.apiKey;
		this.endpointUrl = fields?.endpointUrl;
		this.client = this.endpointUrl
			? new HfInference(this.apiKey).endpoint(this.endpointUrl)
			: new HfInference(this.apiKey);
	}

	async _embed(texts: string[]): Promise<number[][]> {
		// replace newlines, which can negatively affect performance.
		const clean = texts.map((text) => text.replace(/\n/g, ' '));
		return this.caller.call(async () =>
			this.client.featureExtraction({
				model: this.model,
				inputs: clean,
			}),
		) as Promise<number[][]>;
	}

	/**
	 * Method that takes a document as input and returns a promise that
	 * resolves to an embedding for the document. It calls the _embed method
	 * with the document as the input and returns the first embedding in the
	 * resulting array.
	 * @param document Document to generate an embedding for.
	 * @returns Promise that resolves to an embedding for the document.
	 */
	async embedQuery(document: string): Promise<number[]> {
		return this._embed([document]).then((embeddings) => embeddings[0]);
	}

	/**
	 * Method that takes an array of documents as input and returns a promise
	 * that resolves to a 2D array of embeddings for each document. It calls
	 * the _embed method with the documents as the input.
	 * @param documents Array of documents to generate embeddings for.
	 * @returns Promise that resolves to a 2D array of embeddings for each document.
	 */
	async embedDocuments(documents: string[]): Promise<number[][]> {
		return this._embed(documents);
	}
}
