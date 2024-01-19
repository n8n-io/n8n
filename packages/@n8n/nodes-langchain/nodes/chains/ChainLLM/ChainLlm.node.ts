import { ApplicationError, NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import type {
	IBinaryData,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
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
import { HumanMessage } from 'langchain/schema';
import { getTemplateNoticeField } from '../../../utils/sharedFields';

interface MessagesTemplate {
	type: string;
	message: string;
	messageType: 'text' | 'imageBinary' | 'imageUrl';
	binaryImageDataKey?: string;
	imageUrl?: string;
	imageDetail?: 'auto' | 'low' | 'high';
}

async function getImageMessage(
	context: IExecuteFunctions,
	itemIndex: number,
	message: MessagesTemplate,
) {
	if (message.messageType !== 'imageBinary' && message.messageType !== 'imageUrl') {
		// eslint-disable-next-line n8n-nodes-base/node-execute-block-wrong-error-thrown
		throw new NodeOperationError(
			context.getNode(),
			'Invalid message type. Only imageBinary and imageUrl are supported',
		);
	}
	const detail = message.imageDetail === 'auto' ? undefined : message.imageDetail;
	if (message.messageType === 'imageUrl' && message.imageUrl) {
		return new HumanMessage({
			content: [
				{
					type: 'image_url',
					image_url: {
						url: message.imageUrl,
						detail,
					},
				},
			],
		});
	}

	const binaryDataKey = message.binaryImageDataKey ?? 'data';
	const inputData = context.getInputData()[itemIndex];
	const binaryData = inputData.binary?.[binaryDataKey] as IBinaryData;

	if (!binaryData) {
		throw new NodeOperationError(context.getNode(), 'No binary data set.');
	}

	const bufferData = await context.helpers.getBinaryDataBuffer(itemIndex, binaryDataKey);
	return new HumanMessage({
		content: [
			{
				type: 'image_url',
				image_url: {
					url: `data:image/jpeg;base64,${bufferData.toString('base64')}`,
					detail,
				},
			},
		],
	});
}

async function getChainPromptTemplate(
	context: IExecuteFunctions,
	itemIndex: number,
	llm: BaseLanguageModel | BaseChatModel,
	messages?: MessagesTemplate[],
	formatInstructions?: string,
) {
	const queryTemplate = new PromptTemplate({
		template: `{query}${formatInstructions ? '\n{formatInstructions}' : ''}`,
		inputVariables: ['query'],
		partialVariables: formatInstructions ? { formatInstructions } : undefined,
	});

	if (llm instanceof BaseChatModel) {
		const parsedMessages = await Promise.all(
			(messages ?? []).map(async (message) => {
				const messageClass = [
					SystemMessagePromptTemplate,
					AIMessagePromptTemplate,
					HumanMessagePromptTemplate,
				].find((m) => m.lc_name() === message.type);

				if (!messageClass) {
					// eslint-disable-next-line n8n-nodes-base/node-execute-block-wrong-error-thrown
					throw new ApplicationError('Invalid message type', {
						extra: { messageType: message.type },
					});
				}

				if (messageClass === HumanMessagePromptTemplate && message.messageType !== 'text') {
					const test = await getImageMessage(context, itemIndex, message);
					return test;
				}

				const res = messageClass.fromTemplate(
					// Since we're using the message as template, we need to escape any curly braces
					// so LangChain doesn't try to parse them as variables
					(message.message || '').replace(/[{}]/g, (match) => match + match),
				);
				return res;
			}),
		);

		parsedMessages.push(new HumanMessagePromptTemplate(queryTemplate));
		return ChatPromptTemplate.fromMessages(parsedMessages);
	}

	return queryTemplate;
}

async function createSimpleLLMChain(
	context: IExecuteFunctions,
	llm: BaseLanguageModel,
	query: string,
	prompt: ChatPromptTemplate | PromptTemplate,
): Promise<string[]> {
	const chain = new LLMChain({
		llm,
		prompt,
	});
	const response = (await chain.call({
		query,
		signal: context.getExecutionCancelSignal(),
	})) as string[];

	return Array.isArray(response) ? response : [response];
}

async function getChain(
	context: IExecuteFunctions,
	itemIndex: number,
	query: string,
	llm: BaseLanguageModel,
	outputParsers: BaseOutputParser[],
	messages?: MessagesTemplate[],
): Promise<unknown[]> {
	const chatTemplate: ChatPromptTemplate | PromptTemplate = await getChainPromptTemplate(
		context,
		itemIndex,
		llm,
		messages,
	);

	// If there are no output parsers, create a simple LLM chain and execute the query
	if (!outputParsers.length) {
		return createSimpleLLMChain(context, llm, query, chatTemplate);
	}

	// If there's only one output parser, use it; otherwise, create a combined output parser
	const combinedOutputParser =
		outputParsers.length === 1 ? outputParsers[0] : new CombiningOutputParser(...outputParsers);

	const formatInstructions = combinedOutputParser.getFormatInstructions();

	// Create a prompt template incorporating the format instructions and query
	const prompt = await getChainPromptTemplate(
		context,
		itemIndex,
		llm,
		messages,
		formatInstructions,
	);

	const chain = prompt.pipe(llm).pipe(combinedOutputParser);

	const response = (await chain.invoke({ query })) as string | string[];

	return Array.isArray(response) ? response : [response];
}

function getInputs(parameters: IDataObject) {
	const hasOutputParser = parameters?.hasOutputParser;
	const inputs = [
		{ displayName: '', type: NodeConnectionType.Main },
		{
			displayName: 'Model',
			maxConnections: 1,
			type: NodeConnectionType.AiLanguageModel,
			required: true,
		},
	];

	// If `hasOutputParser` is undefined it must be version 1.1 or earlier so we
	// always add the output parser input
	if (hasOutputParser === undefined || hasOutputParser === true) {
		inputs.push({ displayName: 'Output Parser', type: NodeConnectionType.AiOutputParser });
	}
	return inputs;
}

export class ChainLlm implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Basic LLM Chain',
		name: 'chainLlm',
		icon: 'fa:link',
		group: ['transform'],
		version: [1, 1.1, 1.2, 1.3],
		description: 'A simple chain to prompt a large language model',
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
		inputs: `={{ ((parameter) => { ${getInputs.toString()}; return getInputs(parameter) })($parameter) }}`,
		outputs: [NodeConnectionType.Main],
		credentials: [],
		properties: [
			getTemplateNoticeField(1978),
			{
				displayName: 'Prompt',
				name: 'prompt',
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
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				required: true,
				default: '={{ $json.chat_input }}',
				displayOptions: {
					show: {
						'@version': [1.1, 1.2],
					},
				},
			},
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				required: true,
				default: '={{ $json.chatInput }}',
				displayOptions: {
					show: {
						'@version': [1.3],
					},
				},
			},
			{
				displayName: 'Chat Messages (if Using a Chat Model)',
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
										name: 'AI',
										value: AIMessagePromptTemplate.lc_name(),
									},
									{
										name: 'System',
										value: SystemMessagePromptTemplate.lc_name(),
									},
									{
										name: 'User',
										value: HumanMessagePromptTemplate.lc_name(),
									},
								],
								default: SystemMessagePromptTemplate.lc_name(),
							},
							{
								displayName: 'Message Type',
								name: 'messageType',
								type: 'options',
								displayOptions: {
									show: {
										type: [HumanMessagePromptTemplate.lc_name()],
									},
								},
								options: [
									{
										name: 'Text',
										value: 'text',
										description: 'Simple text message',
									},
									{
										name: 'Image (Binary)',
										value: 'imageBinary',
										description: 'Process the binary input from the previous node',
									},
									{
										name: 'Image (URL)',
										value: 'imageUrl',
										description: 'Process the image from the specified URL',
									},
								],
								default: 'text',
							},
							{
								displayName: 'Image Data Field Name',
								name: 'binaryImageDataKey',
								type: 'string',
								default: 'data',
								required: true,
								description:
									'The name of the field in the chain’s input that contains the binary image file to be processed',
								displayOptions: {
									show: {
										messageType: ['imageBinary'],
									},
								},
							},
							{
								displayName: 'Image URL',
								name: 'imageUrl',
								type: 'string',
								default: '',
								required: true,
								description: 'URL to the image to be processed',
								displayOptions: {
									show: {
										messageType: ['imageUrl'],
									},
								},
							},
							{
								displayName: 'Image Details',
								description:
									'Control how the model processes the image and generates its textual understanding',
								name: 'imageDetail',
								type: 'options',
								displayOptions: {
									show: {
										type: [HumanMessagePromptTemplate.lc_name()],
										messageType: ['imageBinary', 'imageUrl'],
									},
								},
								options: [
									{
										name: 'Auto',
										value: 'auto',
										description:
											'Model will use the auto setting which will look at the image input size and decide if it should use the low or high setting',
									},
									{
										name: 'Low',
										value: 'low',
										description:
											'The model will receive a low-res 512px x 512px version of the image, and represent the image with a budget of 65 tokens. This allows the API to return faster responses and consume fewer input tokens for use cases that do not require high detail.',
									},
									{
										name: 'High',
										value: 'high',
										description:
											'Allows the model to see the low res image and then creates detailed crops of input images as 512px squares based on the input image size. Each of the detailed crops uses twice the token budget (65 tokens) for a total of 129 tokens.',
									},
								],
								default: 'auto',
							},

							{
								displayName: 'Message',
								name: 'message',
								type: 'string',
								required: true,
								displayOptions: {
									hide: {
										messageType: ['imageBinary', 'imageUrl'],
									},
								},
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Require Specific Output Format',
				name: 'hasOutputParser',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						'@version': [1.2],
					},
				},
			},
			{
				displayName: `Connect an <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='${NodeConnectionType.AiOutputParser}'>output parser</a> on the canvas to specify the output format you require`,
				name: 'notice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						hasOutputParser: [true],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.verbose('Executing LLM Chain');
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];
		const llm = (await this.getInputConnectionData(
			NodeConnectionType.AiLanguageModel,
			0,
		)) as BaseLanguageModel;

		let outputParsers: BaseOutputParser[] = [];

		if (this.getNodeParameter('hasOutputParser', 0, true) === true) {
			outputParsers = (await this.getInputConnectionData(
				NodeConnectionType.AiOutputParser,
				0,
			)) as BaseOutputParser[];
		}

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const prompt = this.getNodeParameter('prompt', itemIndex) as string;
			const messages = this.getNodeParameter(
				'messages.messageValues',
				itemIndex,
				[],
			) as MessagesTemplate[];

			if (prompt === undefined) {
				throw new NodeOperationError(this.getNode(), 'The ‘prompt’ parameter is empty.');
			}

			const responses = await getChain(this, itemIndex, prompt, llm, outputParsers, messages);

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
