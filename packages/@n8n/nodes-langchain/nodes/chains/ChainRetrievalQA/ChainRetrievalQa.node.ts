import { NodeConnectionTypes, parseErrorMetadata, sleep } from 'n8n-workflow';
import {
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { promptTypeOptions, textFromPreviousNode } from '@utils/descriptions';
import { getBatchingOptionFields, getTemplateNoticeField } from '@utils/sharedFields';

import { INPUT_TEMPLATE_KEY, LEGACY_INPUT_TEMPLATE_KEY, systemPromptOption } from './constants';
import { processItem } from './processItem';

export class ChainRetrievalQa implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Question and Answer Chain',
		name: 'chainRetrievalQa',
		icon: 'fa:link',
		iconColor: 'black',
		group: ['transform'],
		version: [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6],
		description: 'Answer questions about retrieved documents',
		defaults: {
			name: 'Question and Answer Chain',
			color: '#909298',
		},
		codex: {
			alias: ['LangChain'],
			categories: ['AI'],
			subcategories: {
				AI: ['Chains', 'Root Nodes'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.chainretrievalqa/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [
			NodeConnectionTypes.Main,
			{
				displayName: 'Model',
				maxConnections: 1,
				type: NodeConnectionTypes.AiLanguageModel,
				required: true,
			},
			{
				displayName: 'Retriever',
				maxConnections: 1,
				type: NodeConnectionTypes.AiRetriever,
				required: true,
			},
		],
		outputs: [NodeConnectionTypes.Main],
		credentials: [],
		properties: [
			getTemplateNoticeField(1960),
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				required: true,
				default: '={{ $json.input }}',
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				required: true,
				default: '={{ $json.chat_input }}',
				displayOptions: {
					show: {
						'@version': [1.1],
					},
				},
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				required: true,
				default: '={{ $json.chatInput }}',
				displayOptions: {
					show: {
						'@version': [1.2],
					},
				},
			},
			{
				...promptTypeOptions,
				displayOptions: {
					hide: {
						'@version': [{ _cnd: { lte: 1.2 } }],
					},
				},
			},
			{
				...textFromPreviousNode,
				displayOptions: { show: { promptType: ['auto'], '@version': [{ _cnd: { gte: 1.4 } }] } },
			},
			{
				displayName: 'Prompt (User Message)',
				name: 'text',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. Hello, how can you help me?',
				typeOptions: {
					rows: 2,
				},
				displayOptions: {
					show: {
						promptType: ['define'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				placeholder: 'Add Option',
				options: [
					{
						...systemPromptOption,
						description: `Template string used for the system prompt. This should include the variable \`{context}\` for the provided context. For text completion models, you should also include the variable \`{${LEGACY_INPUT_TEMPLATE_KEY}}\` for the user’s query.`,
						displayOptions: {
							show: {
								'@version': [{ _cnd: { lt: 1.5 } }],
							},
						},
					},
					{
						...systemPromptOption,
						description: `Template string used for the system prompt. This should include the variable \`{context}\` for the provided context. For text completion models, you should also include the variable \`{${INPUT_TEMPLATE_KEY}}\` for the user’s query.`,
						displayOptions: {
							show: {
								'@version': [{ _cnd: { gte: 1.5 } }],
							},
						},
					},
					getBatchingOptionFields({
						show: {
							'@version': [{ _cnd: { gte: 1.6 } }],
						},
					}),
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.debug('Executing Retrieval QA Chain');

		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const batchSize = this.getNodeParameter('options.batching.batchSize', 0, 5) as number;
		const delayBetweenBatches = this.getNodeParameter(
			'options.batching.delayBetweenBatches',
			0,
			0,
		) as number;

		if (this.getNode().typeVersion >= 1.6 && batchSize >= 1) {
			// Run in batches
			for (let i = 0; i < items.length; i += batchSize) {
				const batch = items.slice(i, i + batchSize);
				const batchPromises = batch.map(async (_item, batchItemIndex) => {
					return await processItem(this, i + batchItemIndex);
				});

				const batchResults = await Promise.allSettled(batchPromises);

				batchResults.forEach((response, index) => {
					if (response.status === 'rejected') {
						const error = response.reason;
						if (this.continueOnFail()) {
							const metadata = parseErrorMetadata(error);
							returnData.push({
								json: { error: error.message },
								pairedItem: { item: index },
								metadata,
							});
							return;
						} else {
							throw error;
						}
					}
					const output = response.value;
					const answer = output.answer as string;
					if (this.getNode().typeVersion >= 1.5) {
						returnData.push({ json: { response: answer } });
					} else {
						// Legacy format for versions 1.4 and below is { text: string }
						returnData.push({ json: { response: { text: answer } } });
					}
				});

				// Add delay between batches if not the last batch
				if (i + batchSize < items.length && delayBetweenBatches > 0) {
					await sleep(delayBetweenBatches);
				}
			}
		} else {
			// Run for each item
			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				try {
					const response = await processItem(this, itemIndex);
					const answer = response.answer as string;
					if (this.getNode().typeVersion >= 1.5) {
						returnData.push({ json: { response: answer } });
					} else {
						// Legacy format for versions 1.4 and below is { text: string }
						returnData.push({ json: { response: { text: answer } } });
					}
				} catch (error) {
					if (this.continueOnFail()) {
						const metadata = parseErrorMetadata(error);
						returnData.push({
							json: { error: error.message },
							pairedItem: { item: itemIndex },
							metadata,
						});
						continue;
					}

					throw error;
				}
			}
		}
		return [returnData];
	}
}
