import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import {
	ChatPromptTemplate,
	SystemMessagePromptTemplate,
	HumanMessagePromptTemplate,
	PromptTemplate,
} from '@langchain/core/prompts';
import type { BaseRetriever } from '@langchain/core/retrievers';
import { RetrievalQAChain } from 'langchain/chains';
import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { promptTypeOptions, textFromPreviousNode } from '../../../utils/descriptions';
import { getPromptInputByType, isChatInstance } from '../../../utils/helpers';
import { getTemplateNoticeField } from '../../../utils/sharedFields';
import { getTracingConfig } from '../../../utils/tracing';

const SYSTEM_PROMPT_TEMPLATE = `Use the following pieces of context to answer the users question.
If you don't know the answer, just say that you don't know, don't try to make up an answer.
----------------
{context}`;

export class ChainRetrievalQa implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Question and Answer Chain',
		name: 'chainRetrievalQa',
		icon: 'fa:link',
		group: ['transform'],
		version: [1, 1.1, 1.2, 1.3, 1.4],
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
			NodeConnectionType.Main,
			{
				displayName: 'Model',
				maxConnections: 1,
				type: NodeConnectionType.AiLanguageModel,
				required: true,
			},
			{
				displayName: 'Retriever',
				maxConnections: 1,
				type: NodeConnectionType.AiRetriever,
				required: true,
			},
		],
		outputs: [NodeConnectionType.Main],
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
				displayName: 'Text',
				name: 'text',
				type: 'string',
				required: true,
				default: '',
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
						displayName: 'System Prompt Template',
						name: 'systemPromptTemplate',
						type: 'string',
						default: SYSTEM_PROMPT_TEMPLATE,
						description:
							'Template string used for the system prompt. This should include the variable `{context}` for the provided context. For text completion models, you should also include the variable `{question}` for the user’s query.',
						typeOptions: {
							rows: 6,
						},
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.debug('Executing Retrieval QA Chain');

		const model = (await this.getInputConnectionData(
			NodeConnectionType.AiLanguageModel,
			0,
		)) as BaseLanguageModel;

		const retriever = (await this.getInputConnectionData(
			NodeConnectionType.AiRetriever,
			0,
		)) as BaseRetriever;

		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];

		// Run for each item
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				let query;

				if (this.getNode().typeVersion <= 1.2) {
					query = this.getNodeParameter('query', itemIndex) as string;
				} else {
					query = getPromptInputByType({
						ctx: this,
						i: itemIndex,
						inputKey: 'text',
						promptTypeKey: 'promptType',
					});
				}

				if (query === undefined) {
					throw new NodeOperationError(this.getNode(), 'The ‘query‘ parameter is empty.');
				}

				const options = this.getNodeParameter('options', itemIndex, {}) as {
					systemPromptTemplate?: string;
				};

				const chainParameters = {} as {
					prompt?: PromptTemplate | ChatPromptTemplate;
				};

				if (options.systemPromptTemplate !== undefined) {
					if (isChatInstance(model)) {
						const messages = [
							SystemMessagePromptTemplate.fromTemplate(options.systemPromptTemplate),
							HumanMessagePromptTemplate.fromTemplate('{question}'),
						];
						const chatPromptTemplate = ChatPromptTemplate.fromMessages(messages);

						chainParameters.prompt = chatPromptTemplate;
					} else {
						const completionPromptTemplate = new PromptTemplate({
							template: options.systemPromptTemplate,
							inputVariables: ['context', 'question'],
						});

						chainParameters.prompt = completionPromptTemplate;
					}
				}

				const chain = RetrievalQAChain.fromLLM(model, retriever, chainParameters);

				const response = await chain.withConfig(getTracingConfig(this)).invoke({ query });
				returnData.push({ json: { response } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message }, pairedItem: { item: itemIndex } });
					continue;
				}

				throw error;
			}
		}
		return [returnData];
	}
}
