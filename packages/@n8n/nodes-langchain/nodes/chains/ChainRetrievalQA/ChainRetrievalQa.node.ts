import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { RetrievalQAChain } from 'langchain/chains';
import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import type { BaseRetriever } from '@langchain/core/retrievers';
import {
	ChatPromptTemplate,
	SystemMessagePromptTemplate,
	HumanMessagePromptTemplate,
	PromptTemplate,
} from '@langchain/core/prompts';
import { getTemplateNoticeField } from '../../../utils/sharedFields';
import { getPromptInputByType } from '../../../utils/helpers';
import { getTracingConfig } from '../../../utils/tracing';

const QA_PROMPT_TEMPLATE =
	"Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.\n\n{context}\n\nQuestion: {question}\nHelpful Answer:";
const CHAT_PROMPT_TEMPLATE = `Use the following pieces of context to answer the users question. 
If you don't know the answer, just say that you don't know, don't try to make up an answer.
----------------
{context}`;

export class ChainRetrievalQa implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Question and Answer Chain',
		name: 'chainRetrievalQa',
		icon: 'fa:link',
		group: ['transform'],
		version: [1, 1.1, 1.2, 1.3],
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
				displayName: 'Prompt',
				name: 'promptType',
				type: 'options',
				options: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'Take from previous node automatically',
						value: 'auto',
						description: 'Looks for an input field called chatInput',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'Define below',
						value: 'define',
						description:
							'Use an expression to reference data in previous nodes or enter static text',
					},
				],
				displayOptions: {
					hide: {
						'@version': [{ _cnd: { lte: 1.2 } }],
					},
				},
				default: 'auto',
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
				displayName: 'Custom Question and Answer Prompt',
				name: 'customQAPrompt',
				type: 'boolean',
				default: false,
				description: 'Enable to customize the Question and Answer prompt',
			},
			{
				displayName: 'Question and Answer Prompt Type',
				name: 'qAPromptType',
				type: 'options',
				default: 'standardPrompt',
				description: 'Select the type of prompt for customization',
				options: [
					{
						name: 'Standard Prompt',
						value: 'standardPrompt',
						description: 'Uses a standard prompt template (for non-Chat Models)',
					},
					{
						name: 'Chat Prompt',
						value: 'chatPrompt',
						description: 'Uses a system message template (for Chat Models)',
					},
				],
				displayOptions: {
					show: {
						customQAPrompt: [true],
					},
				},
			},
			{
				displayName: 'Standard Prompt Template',
				name: 'standardPromptTemplate',
				type: 'string',
				default: QA_PROMPT_TEMPLATE,
				description: 'Template string for the Question and Answer prompt (for non-Chat Models)',
				typeOptions: {
					rows: 8,
				},
				displayOptions: {
					show: {
						qAPromptType: ['standardPrompt'],
					},
				},
			},
			{
				displayName: 'Chat Prompt Template',
				name: 'chatPromptTemplate',
				type: 'string',
				default: CHAT_PROMPT_TEMPLATE,
				description:
					'Template string for the Question and Answer prompt as a system message (for Chat Models)',
				typeOptions: {
					rows: 8,
				},
				displayOptions: {
					show: {
						qAPromptType: ['chatPrompt'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.verbose('Executing Retrieval QA Chain');

		const model = (await this.getInputConnectionData(
			NodeConnectionType.AiLanguageModel,
			0,
		)) as BaseLanguageModel;

		const retriever = (await this.getInputConnectionData(
			NodeConnectionType.AiRetriever,
			0,
		)) as BaseRetriever;

		const items = this.getInputData();

		const customQAPrompt = this.getNodeParameter('customQAPrompt', 0, false) as boolean;

		const chainParameters = {} as {
			prompt?: PromptTemplate | ChatPromptTemplate;
		};

		if (customQAPrompt) {
			const qAPromptType = this.getNodeParameter('qAPromptType', 0) as string;

			if (qAPromptType == 'standardPrompt') {
				const standardPromptTemplateParameter = this.getNodeParameter(
					'standardPromptTemplate',
					0,
				) as string;

				const standardPromptTemplate = new PromptTemplate({
					template: standardPromptTemplateParameter,
					inputVariables: ['context', 'question'],
				});

				chainParameters.prompt = standardPromptTemplate;
			} else if (qAPromptType == 'chatPrompt') {
				const chatPromptTemplateParameter = this.getNodeParameter(
					'chatPromptTemplate',
					0,
				) as string;

				const messages = [
					SystemMessagePromptTemplate.fromTemplate(chatPromptTemplateParameter),
					HumanMessagePromptTemplate.fromTemplate('{question}'),
				];

				const chatPromptTemplate = ChatPromptTemplate.fromMessages(messages);

				chainParameters.prompt = chatPromptTemplate;
			}
		}

		const chain = RetrievalQAChain.fromLLM(model, retriever, chainParameters);

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

				const response = await chain.withConfig(getTracingConfig(this)).invoke({ query });
				returnData.push({ json: { response } });
			} catch (error) {
				if (this.continueOnFail(error)) {
					returnData.push({ json: { error: error.message }, pairedItem: { item: itemIndex } });
					continue;
				}

				throw error;
			}
		}
		return [returnData];
	}
}
