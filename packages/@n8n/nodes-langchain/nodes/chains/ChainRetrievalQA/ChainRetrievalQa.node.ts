import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import {
	ChatPromptTemplate,
	SystemMessagePromptTemplate,
	HumanMessagePromptTemplate,
	PromptTemplate,
} from '@langchain/core/prompts';
import type { BaseRetriever } from '@langchain/core/retrievers';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { NodeConnectionTypes, NodeOperationError, parseErrorMetadata } from 'n8n-workflow';
import {
	type INodeProperties,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { promptTypeOptions, textFromPreviousNode } from '@utils/descriptions';
import { getPromptInputByType, isChatInstance } from '@utils/helpers';
import { getTemplateNoticeField } from '@utils/sharedFields';
import { getTracingConfig } from '@utils/tracing';

const SYSTEM_PROMPT_TEMPLATE = `You are an assistant for question-answering tasks. Use the following pieces of retrieved context to answer the question.
If you don't know the answer, just say that you don't know, don't try to make up an answer.
----------------
Context: {context}`;

// Due to the refactoring in version 1.5, the variable name {question} needed to be changed to {input} in the prompt template.
const LEGACY_INPUT_TEMPLATE_KEY = 'question';
const INPUT_TEMPLATE_KEY = 'input';

const systemPromptOption: INodeProperties = {
	displayName: 'System Prompt Template',
	name: 'systemPromptTemplate',
	type: 'string',
	default: SYSTEM_PROMPT_TEMPLATE,
	typeOptions: {
		rows: 6,
	},
};

export class ChainRetrievalQa implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Question and Answer Chain',
		name: 'chainRetrievalQa',
		icon: 'fa:link',
		iconColor: 'black',
		group: ['transform'],
		version: [1, 1.1, 1.2, 1.3, 1.4, 1.5],
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
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.debug('Executing Retrieval QA Chain');

		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Run for each item
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const model = (await this.getInputConnectionData(
					NodeConnectionTypes.AiLanguageModel,
					0,
				)) as BaseLanguageModel;

				const retriever = (await this.getInputConnectionData(
					NodeConnectionTypes.AiRetriever,
					0,
				)) as BaseRetriever;

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

				let templateText = options.systemPromptTemplate ?? SYSTEM_PROMPT_TEMPLATE;

				// Replace legacy input template key for versions 1.4 and below
				if (this.getNode().typeVersion < 1.5) {
					templateText = templateText.replace(
						`{${LEGACY_INPUT_TEMPLATE_KEY}}`,
						`{${INPUT_TEMPLATE_KEY}}`,
					);
				}

				// Create prompt template based on model type and user configuration
				let promptTemplate;
				if (isChatInstance(model)) {
					// For chat models, create a chat prompt template with system and human messages
					const messages = [
						SystemMessagePromptTemplate.fromTemplate(templateText),
						HumanMessagePromptTemplate.fromTemplate('{input}'),
					];
					promptTemplate = ChatPromptTemplate.fromMessages(messages);
				} else {
					// For non-chat models, create a text prompt template with Question/Answer format
					const questionSuffix =
						options.systemPromptTemplate === undefined ? '\n\nQuestion: {input}\nAnswer:' : '';

					promptTemplate = new PromptTemplate({
						template: templateText + questionSuffix,
						inputVariables: ['context', 'input'],
					});
				}

				// Create the document chain that combines the retrieved documents
				const combineDocsChain = await createStuffDocumentsChain({
					llm: model,
					prompt: promptTemplate,
				});

				// Create the retrieval chain that handles the retrieval and then passes to the combine docs chain
				const retrievalChain = await createRetrievalChain({
					combineDocsChain,
					retriever,
				});

				// Execute the chain with tracing config
				const tracingConfig = getTracingConfig(this);
				const response = await retrievalChain
					.withConfig(tracingConfig)
					.invoke({ input: query }, { signal: this.getExecutionCancelSignal() });

				// Get the answer from the response
				const answer: string = response.answer;
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
		return [returnData];
	}
}
