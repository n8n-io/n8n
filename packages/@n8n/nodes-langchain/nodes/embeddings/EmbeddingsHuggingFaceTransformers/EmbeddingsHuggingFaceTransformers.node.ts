/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { AutoModel, AutoTokenizer, Tensor } from '@huggingface/transformers';
import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/huggingface_transformers';
import { chunkArray } from '@langchain/core/utils/chunk_array';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

class Model2VecEmbeddings extends HuggingFaceTransformersEmbeddings {
	async embedDocuments(texts: string[]): Promise<number[][]> {
		const batches = chunkArray(
			this.stripNewLines ? texts.map((t) => t.replace(/\n/g, ' ')) : texts,
			this.batchSize,
		);

		const batchRequests = batches.map((batch) => this._runEmbedding(batch));
		const batchResponses = await Promise.all(batchRequests);
		const embeddings: number[][] = [];

		for (let i = 0; i < batchResponses.length; i += 1) {
			const batchResponse = batchResponses[i];
			for (let j = 0; j < batchResponse.length; j += 1) {
				embeddings.push(batchResponse[j]);
			}
		}

		return embeddings;
	}

	async embedQuery(text: string): Promise<number[]> {
		const data = await this._runEmbedding([this.stripNewLines ? text.replace(/\n/g, ' ') : text]);
		return data[0];
	}

	private async _runEmbedding(texts: string[]) {
		const model = await AutoModel.from_pretrained(this.model, this.pretrainedOptions);
		const tokenizer = await AutoTokenizer.from_pretrained(this.model, this.pretrainedOptions);

		return this.caller.call(async () => {
			//const texts = [this.stripNewLines ? text.replace(/\n/g, " ") : text];
			const { input_ids } = (await tokenizer(texts, {
				add_special_tokens: false,
				return_tensor: false,
			})) as { input_ids: number[][] };

			const cumsum = (arr: number[]) =>
				arr.reduce(
					(acc: number[], num: number, i: number) => [...acc, num + (acc[i - 1] || 0)],
					[],
				);
			const offsets = [0, ...cumsum(input_ids.slice(0, -1).map((x) => x.length))];

			const flattened_input_ids = input_ids.flat();
			const modelInputs = {
				input_ids: new Tensor('int64', flattened_input_ids, [flattened_input_ids.length]),
				offsets: new Tensor('int64', offsets, [offsets.length]),
			};

			const { embeddings } = (await model(modelInputs)) as { embeddings: Tensor };
			return embeddings.tolist() as number[][];
		});
	}
}

export class EmbeddingsHuggingFaceTransformers implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Embeddings Hugging Face Transformers',
		name: 'embeddingsHuggingFaceTransformers',
		icon: 'file:huggingface.svg',
		group: ['transform'],
		version: 1,
		description: 'Use HuggingFace Transformers Embeddings',
		defaults: {
			name: 'Embeddings HuggingFace Transformers',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Embeddings'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.embeddingshuggingfacetransformers/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionTypes.AiEmbedding],
		outputNames: ['Embeddings'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiVectorStore]),
			{
				displayName:
					'Each model is using different dimensional density for embeddings. Please make sure to use the same dimensionality for your vector store. The default model is using 768-dimensional embeddings.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Model Name',
				name: 'modelName',
				type: 'string',
				default: 'Xenova/gte-small',
				description: 'The model name to use from HuggingFace library',
			},
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				description: 'Additional options to add',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Quantization',
						name: 'dtype',
						default: 'fp32',
						description: 'Quantization (e.g., "fp32", "int8" or "q4")',
						type: 'string',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.debug('Supply data for embeddings HF Inference');
		const model = this.getNodeParameter(
			'modelName',
			itemIndex,
			'sentence-transformers/distilbert-base-nli-mean-tokens',
		) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as object;

		const pretrainedModel = await AutoModel.from_pretrained(model, options);
		const embeddings =
			pretrainedModel.config.model_type === 'model2vec'
				? new Model2VecEmbeddings({ model, pretrainedOptions: options })
				: new HuggingFaceTransformersEmbeddings({ model, pretrainedOptions: options });

		return {
			response: logWrapper(embeddings, this),
		};
	}
}
