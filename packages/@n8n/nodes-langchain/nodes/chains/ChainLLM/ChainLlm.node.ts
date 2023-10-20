import {
	NodeConnectionType,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import type { BaseLanguageModel } from 'langchain/base_language';
import {
	AIMessagePromptTemplate,
	PromptTemplate,
	SystemMessagePromptTemplate,
	HumanMessagePromptTemplate,
	ChatPromptTemplate,
} from 'langchain/prompts';
import type { BaseOutputParser } from 'langchain/schema/output_parser';
import { CombiningOutputParser } from 'langchain/output_parsers';
import { LLMChain } from 'langchain/chains';
import { BaseChatModel } from 'langchain/chat_models/base';

interface MessagesTemplate {
	type: string;
	message: string;
}

function getChainPromptTemplate(
	llm: BaseLanguageModel | BaseChatModel,
	query: string,
	messages?: MessagesTemplate[],
	formatInstructions?: string,
) {
	const queryTemplate = new PromptTemplate({
		template: `${query}${formatInstructions ? '\n{formatInstructions}' : ''}`,
		inputVariables: [],
		partialVariables: formatInstructions ? { formatInstructions } : undefined,
	});

	if (llm instanceof BaseChatModel) {
		const parsedMessages = (messages ?? []).map((message) => {
			const messageClass = [
				SystemMessagePromptTemplate,
				AIMessagePromptTemplate,
				HumanMessagePromptTemplate,
			].find((m) => m.lc_name() === message.type);

			if (!messageClass) {
				// eslint-disable-next-line n8n-nodes-base/node-execute-block-wrong-error-thrown
				throw new Error(`Invalid message type "${message.type}"`);
			}

			return messageClass.fromTemplate(message.message);
		});

		parsedMessages.push(new HumanMessagePromptTemplate(queryTemplate));
		return ChatPromptTemplate.fromMessages(parsedMessages);
	}

	return queryTemplate;
}

async function createSimpleLLMChain(
	llm: BaseLanguageModel,
	prompt: ChatPromptTemplate | PromptTemplate,
): Promise<string[]> {
	const chain = new LLMChain({
		llm,
		prompt,
	});
	const response = (await chain.call({})) as string[];

	return Array.isArray(response) ? response : [response];
}

async function getChain(
	context: IExecuteFunctions,
	query: string,
	messages?: MessagesTemplate[],
): Promise<unknown[]> {
	const llm = (await context.getInputConnectionData(
		NodeConnectionType.AiLanguageModel,
		0,
	)) as BaseLanguageModel;

	const outputParsers = (await context.getInputConnectionData(
		NodeConnectionType.AiOutputParser,
		0,
	)) as BaseOutputParser[];

	const chatTemplate: ChatPromptTemplate | PromptTemplate = getChainPromptTemplate(
		llm,
		query,
		messages,
	);

	// If there are no output parsers, create a simple LLM chain and execute the query
	if (!outputParsers.length) {
		return createSimpleLLMChain(llm, chatTemplate);
	}

	// If there's only one output parser, use it; otherwise, create a combined output parser
	const combinedOutputParser =
		outputParsers.length === 1 ? outputParsers[0] : new CombiningOutputParser(...outputParsers);

	const formatInstructions = combinedOutputParser.getFormatInstructions();

	// Create a prompt template incorporating the format instructions and query
	const prompt = getChainPromptTemplate(llm, query, messages, formatInstructions);

	const chain = prompt.pipe(llm).pipe(combinedOutputParser);

	const response = (await chain.invoke({ query })) as string | string[];

	return Array.isArray(response) ? response : [response];
}

export class ChainLlm implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Basic LLM Chain',
		name: 'chainLlm',
		icon: 'fa:link',
		group: ['transform'],
		version: 1,
		description: 'A simple chain to prompt a large language mode',
		defaults: {
			name: 'Basic LLM Chain',
			color: '#909298',
		},
		codex: {
			alias: ['LangChain'],
			categories: ['AI'],
			subcategories: {
				AI: ['Chains'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.chainllm/',
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
				displayName: 'Output Parser',
				type: NodeConnectionType.AiOutputParser,
				required: false,
			},
		],
		outputs: [NodeConnectionType.Main],
		credentials: [],
		properties: [
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				required: true,
				default: '={{ $json.input }}',
			},
			{
				displayName:
					'The options below to add prompts are only valid for chat models, they will be ignored for other models.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Chat Messages',
				name: 'messages',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				placeholder: 'Add prompt',
				options: [
					{
						name: 'messageValues',
						displayName: 'Prompt',
						values: [
							{
								displayName: 'Type Name or ID',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'System',
										value: SystemMessagePromptTemplate.lc_name(),
									},
									{
										name: 'AI',
										value: AIMessagePromptTemplate.lc_name(),
									},
									{
										name: 'User',
										value: HumanMessagePromptTemplate.lc_name(),
									},
								],
								default: SystemMessagePromptTemplate.lc_name(),
							},
							{
								displayName: 'Message',
								name: 'message',
								type: 'string',
								required: true,
								default: '',
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.verbose('Executing LLM Chain');
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const prompt = this.getNodeParameter('prompt', i) as string;
			const messages = this.getNodeParameter('messages.messageValues', i, []) as MessagesTemplate[];

			if (prompt === undefined) {
				throw new NodeOperationError(
					this.getNode(),
					'No value for the required parameter "Prompt" was returned.',
				);
			}

			const responses = await getChain(this, prompt, messages);

			responses.forEach((response) => {
				let data: IDataObject;
				if (typeof response === 'string') {
					data = {
						response: {
							text: response.trim(),
						},
					};
				} else if (Array.isArray(response)) {
					data = {
						data: response,
					};
				} else if (response instanceof Object) {
					data = response as IDataObject;
				} else {
					data = {
						response: {
							text: response,
						},
					};
				}

				returnData.push({
					json: data,
				});
			});
		}

		return [returnData];
	}
}
