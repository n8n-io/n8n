import type { Tool } from '@langchain/core/tools';
import _omit from 'lodash/omit';
import type {
	INodeProperties,
	IExecuteFunctions,
	INodeExecutionData,
	IDataObject,
} from 'n8n-workflow';
import { jsonParse, updateDisplayOptions } from 'n8n-workflow';

import { getConnectedTools } from '@utils/helpers';

import { MODELS_NOT_SUPPORT_FUNCTION_CALLS } from '../../helpers/constants';
import type { ChatCompletion } from '../../helpers/interfaces';
import { formatToOpenAIAssistantTool } from '../../helpers/utils';
import { apiRequest } from '../../transport';
import { modelRLC } from '../descriptions';

const properties: INodeProperties[] = [
	modelRLC('modelSearch'),
	{
		displayName: 'Messages',
		name: 'responses',
		type: 'fixedCollection',
		typeOptions: {
			sortable: true,
			multipleValues: true,
		},
		placeholder: 'Add Message',
		default: { text: [{ content: '' }] },
		options: [
			{
				displayName: 'Text',
				name: 'text',
				values: [
					{
						displayName: 'Prompt',
						name: 'content',
						type: 'string',
						description: 'The content of the message to be send',
						default: '',
						placeholder: 'e.g. Hello, how can you help me?',
						typeOptions: {
							rows: 2,
						},
					},
					{
						displayName: 'Role',
						name: 'role',
						type: 'options',
						description:
							"Role in shaping the model's response, it tells the model how it should behave and interact with the user",
						options: [
							{
								name: 'User',
								value: 'user',
								description: 'Send a message as a user and get a response from the model',
							},
							{
								name: 'Assistant',
								value: 'assistant',
								description: 'Tell the model to adopt a specific tone or personality',
							},
							{
								name: 'System',
								value: 'system',
								description:
									"Usually used to set the model's behavior or context for the next user message",
							},
						],
						default: 'user',
					},
				],
			},
			{
				displayName: 'Image',
				name: 'imageInput',
				values: [
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						default: 'url',
						options: [
							{ name: 'Image URL', value: 'url' },
							{ name: 'File ID', value: 'fileId' },
						],
					},
					{
						displayName: 'Image URL',
						name: 'imageUrl',
						type: 'string',
						default: '',
						placeholder: 'e.g. https://example.com/image.jpeg',
						description: 'URL of the image to be sent. Accepts base64 encoded images as well.',
						displayOptions: {
							show: {
								type: ['url'],
							},
						},
					},
					{
						displayName: 'File ID',
						name: 'fileId',
						type: 'string',
						default: '',
						description: 'ID of the file to be sent',
						displayOptions: {
							show: {
								type: ['fileId'],
							},
						},
					},
					{
						displayName: 'Detail',
						name: 'imageDetail',
						type: 'options',
						default: 'auto',
						description: 'The detail level of the image to be sent to the model',
						options: [
							{ name: 'Auto', value: 'auto' },
							{ name: 'Low', value: 'low' },
							{ name: 'High', value: 'high' },
						],
					},
				],
			},
			{
				displayName: 'File',
				name: 'fileInput',
				values: [
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						default: 'url',
						options: [
							{ name: 'File URL', value: 'url' },
							{ name: 'File ID', value: 'fileId' },
							{ name: 'Base64', value: 'base64' },
						],
					},
					{
						displayName: 'File URL',
						name: 'fileUrl',
						type: 'string',
						default: '',
						placeholder: 'e.g. https://example.com/file.pdf',
						description: 'URL of the file to be sent. Accepts base64 encoded files as well.',
						displayOptions: {
							show: {
								type: ['url'],
							},
						},
					},
					{
						displayName: 'File ID',
						name: 'fileId',
						type: 'string',
						default: '',
						description: 'ID of the file to be sent',
						displayOptions: {
							show: {
								type: ['fileId'],
							},
						},
					},
					{
						displayName: 'File Data',
						name: 'fileData',
						type: 'string',
						default: '',
						displayOptions: {
							show: {
								type: ['base64'],
							},
						},
					},
					{
						displayName: 'File Name',
						name: 'fileName',
						type: 'string',
						default: '',
					},
				],
			},
			{
				displayName: 'Audio',
				name: 'audio',
				values: [
					{
						displayName: 'Data',
						name: 'data',
						type: 'string',
						default: '',
						description: 'Base64-encoded audio data',
					},
					{
						displayName: 'Format',
						name: 'format',
						type: 'options',
						default: 'mp3',
						options: [
							{ name: 'MP3', value: 'mp3' },
							{ name: 'WAV', value: 'wav' },
						],
					},
				],
			},
		],
	},
	{
		displayName: 'Simplify Output',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Hide Tools',
		name: 'hideTools',
		type: 'hidden',
		default: 'hide',
		displayOptions: {
			show: {
				modelId: MODELS_NOT_SUPPORT_FUNCTION_CALLS,
			},
		},
	},
	{
		displayName: 'Connect your own custom n8n tools to this node on the canvas',
		name: 'noticeTools',
		type: 'notice',
		default: '',
		displayOptions: {
			hide: {
				hideTools: ['hide'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Max Tool Calls Iterations',
				name: 'maxToolsIterations',
				type: 'number',
				default: 15,
				description:
					'The maximum number of tool iteration cycles the LLM will run before stopping. A single iteration can contain multiple tool calls. Set to 0 for no limit.',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.5 } }],
					},
				},
			},
			{
				displayName: 'Conversation ID',
				name: 'conversationId',
				default: '',
				description:
					'The conversation that this response belongs to. Input items and output items from this response are automatically added to this conversation after this response completes.',
				type: 'string',
			},
			{
				displayName: 'Include Additional Data',
				name: 'include',
				default: [],
				type: 'multiOptions',
				description: 'Specify additional output data to include in the model response',
				options: [
					{
						name: 'Code Interpreter Call Outputs',
						value: 'code_interpreter_call.outputs',
					},
					{
						name: 'Computer Call Output Image URL',
						value: 'computer_call_output.output.image_url',
					},
					{
						name: 'File Search Call Results',
						value: 'file_search_call.results',
					},
					{
						name: 'Message Input Image URL',
						value: 'message.input_image.image_url',
					},
					{
						name: 'Message Output Text Logprobs',
						value: 'message.output_text.logprobs',
					},
					{
						name: 'Reasoning Encrypted Content',
						value: 'reasoning.encrypted_content',
					},
					{
						name: 'Web Search Tool Call Sources',
						value: 'web_search_call.action.sources',
					},
				],
			},
			{
				displayName: 'Instructions',
				name: 'instructions',
				type: 'string',
				default: '',
				description: 'Instructions for the model to follow',
				typeOptions: {
					rows: 2,
				},
			},
			{
				displayName: 'Maximum Number of Tokens',
				name: 'maxTokens',
				default: 16,
				description:
					'The maximum number of tokens to generate in the completion. Most models have a context length of 2048 tokens (except for the newest models, which support 32,768).',
				type: 'number',
				typeOptions: {
					maxValue: 32768,
				},
			},
			{
				displayName: 'Max Tool Calls',
				name: 'maxToolCalls',
				type: 'number',
				default: 15,
				description:
					'The maximum number of total calls to built-in tools that can be processed in a response. This maximum number applies across all built-in tool calls, not per individual tool. Any further attempts to call a tool by the model will be ignored.',
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'json',
				description:
					'Set of 16 key-value pairs that can be attached to an object. This can be useful for storing additional information about the object in a structured format, and querying for objects via API or the dashboard.',
				default: '',
			},
			{
				displayName: 'Parallel Tool Calls',
				name: 'parallelToolCalls',
				type: 'boolean',
				default: false,
				description:
					'Whether to allow parallel tool calls. If true, the model can call multiple tools at once.',
			},
			{
				displayName: 'Previous Response ID',
				name: 'previousResponseId',
				type: 'string',
				default: '',
				// TODO: add display options?
				description:
					'The ID of the previous response to continue from. Cannot be used in conjunction with Conversation ID.',
			},
			{
				displayName: 'Prompt',
				name: 'promptConfig',
				type: 'fixedCollection',
				default: { promptOptions: [{ promptId: '' }] },
				options: [
					{
						displayName: 'Prompt',
						name: 'promptOptions',
						values: [
							{
								displayName: 'Prompt ID',
								name: 'promptId',
								type: 'string',
								default: '',
								description: 'The unique identifier of the prompt template to use',
							},
							{
								displayName: 'Version',
								name: 'version',
								type: 'string',
								default: '',
								description: 'Optional version of the prompt template',
							},
							{
								displayName: 'Variables',
								name: 'variables',
								type: 'json',
								default: '',
								description: 'Variables to be substituted into the prompt template',
							},
						],
					},
				],
			},
			{
				displayName: 'Prompt Cache Key',
				name: 'promptCacheKey',
				type: 'string',
				default: '',
				description:
					'Used by OpenAI to cache responses for similar requests to optimize your cache hit rates',
			},
			{
				displayName: 'Reasoning',
				name: 'reasoning',
				type: 'fixedCollection',
				default: { reasoningOptions: [{ effort: 'medium', summary: 'none' }] },
				options: [
					{
						displayName: 'Reasoning',
						name: 'reasoningOptions',
						values: [
							{
								displayName: 'Effort',
								name: 'effort',
								type: 'options',
								default: 'medium',
								// TODO: allow only high for gpt-5-pro
								options: [
									{ name: 'Low', value: 'low' },
									{ name: 'Medium', value: 'medium' },
									{ name: 'High', value: 'high' },
								],
							},
							{
								displayName: 'Summary',
								name: 'summary',
								type: 'options',
								default: 'auto',
								description:
									"A summary of the reasoning performed by the model. This can be useful for debugging and understanding the model's reasoning process.",
								options: [
									{ name: 'None', value: 'none' },
									{ name: 'Auto', value: 'auto' },
									{ name: 'Concise', value: 'concise' },
									{ name: 'Detailed', value: 'detailed' },
								],
							},
						],
					},
				],
			},
			{
				displayName: 'Safety Identifier',
				name: 'safetyIdentifier',
				type: 'string',
				default: '',
				description:
					"A stable identifier used to help detect users of your application that may be violating OpenAI's usage policies. The IDs should be a string that uniquely identifies each user.",
			},
			{
				displayName: 'Service Tier',
				name: 'serviceTier',
				type: 'options',
				default: 'auto',
				description: 'The service tier to use for the request',
				options: [
					{ name: 'Auto', value: 'auto' },
					{ name: 'Flex', value: 'flex' },
					{ name: 'Default', value: 'default' },
					{ name: 'Priority', value: 'Priority' },
				],
			},
			{
				displayName: 'Store',
				name: 'store',
				type: 'boolean',
				default: false,
				description: 'Whether to store the generated model response for later retrieval via API',
			},
			{
				displayName: 'Text',
				name: 'textFormat',
				type: 'fixedCollection',
				default: { textOptions: [{ type: 'text' }] },
				options: [
					{
						displayName: 'Text',
						name: 'textOptions',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								default: 'text',
								options: [
									{ name: 'Text', value: 'text' },
									{ name: 'JSON', value: 'json' },
								],
							},
							{
								displayName: 'Verbosity',
								name: 'verbosity',
								type: 'options',
								default: 'medium',
								options: [
									{ name: 'Low', value: 'low' },
									{ name: 'Medium', value: 'medium' },
									{ name: 'High', value: 'high' },
								],
							},
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description:
									'The name of the response format. Must be a-z, A-Z, 0-9, or contain underscores and dashes, with a maximum length of 64.',
								displayOptions: {
									show: {
										type: ['json'],
									},
								},
							},
							{
								displayName: 'Schema',
								name: 'schema',
								type: 'json',
								default: '',
								description: 'The schema of the response format',
								displayOptions: {
									show: {
										type: ['json'],
									},
								},
							},
							{
								displayName: 'Description',
								name: 'description',
								type: 'string',
								default: '',
								description: 'The description of the response format',
								displayOptions: {
									show: {
										type: ['json'],
									},
								},
							},
							{
								displayName: 'Strict',
								name: 'strict',
								type: 'boolean',
								default: false,
								description: 'Whether to enforce the response format strictly',
								displayOptions: {
									show: {
										type: ['json'],
									},
								},
							},
						],
					},
				],
			},
			{
				displayName: 'Top Logprobs',
				name: 'topLogprobs',
				type: 'number',
				default: 0,
				description:
					'An integer between 0 and 20 specifying the number of most likely tokens to return at each token position, each with an associated log probability',
				typeOptions: {
					minValue: 0,
					maxValue: 20,
				},
			},
			{
				displayName: 'Output Randomness (Temperature)',
				name: 'temperature',
				type: 'number',
				default: 1,
				description:
					'What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic. We generally recommend altering this or top_p but not both',
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberPrecision: 1,
				},
			},
			{
				displayName: 'Output Randomness (Top P)',
				name: 'topP',
				default: 1,
				typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
				description:
					'An alternative to sampling with temperature, controls diversity via nucleus sampling: 0.5 means half of all likelihood-weighted options are considered. We generally recommend altering this or temperature but not both.',
				type: 'number',
			},
			{
				displayName: 'Truncation',
				name: 'truncation',
				type: 'boolean',
				default: false,
				description:
					"Whether to truncate the input to the model's context window size. When disabled will throw a 400 error instead.",
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['response'],
		resource: ['text'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const model = this.getNodeParameter('modelId', i, '', { extractValue: true });
	let messages = this.getNodeParameter('messages.values', i, []) as IDataObject[];
	const options = this.getNodeParameter('options', i, {});
	const jsonOutput = this.getNodeParameter('jsonOutput', i, false) as boolean;
	const maxToolsIterations = this.getNodeParameter('options.maxToolsIterations', i, 15) as number;

	const abortSignal = this.getExecutionCancelSignal();

	if (options.maxTokens !== undefined) {
		options.max_completion_tokens = options.maxTokens;
		delete options.maxTokens;
	}

	if (options.topP !== undefined) {
		options.top_p = options.topP;
		delete options.topP;
	}

	let response_format;
	if (jsonOutput) {
		response_format = { type: 'json_object' };
		messages = [
			{
				role: 'system',
				content: 'You are a helpful assistant designed to output JSON.',
			},
			...messages,
		];
	}

	const hideTools = this.getNodeParameter('hideTools', i, '') as string;

	let tools;
	let externalTools: Tool[] = [];

	if (hideTools !== 'hide') {
		const enforceUniqueNames = true;
		externalTools = await getConnectedTools(this, enforceUniqueNames, false);
	}

	if (externalTools.length) {
		tools = externalTools.length ? externalTools?.map(formatToOpenAIAssistantTool) : undefined;
	}

	const body: IDataObject = {
		model,
		messages,
		tools,
		response_format,
		..._omit(options, ['maxToolsIterations']),
	};

	let response = (await apiRequest.call(this, 'POST', '/chat/completions', {
		body,
	})) as ChatCompletion;

	if (!response) return [];

	let currentIteration = 1;
	let toolCalls = response?.choices[0]?.message?.tool_calls;

	while (toolCalls?.length) {
		// Break the loop if the max iterations is reached or the execution is canceled
		if (
			abortSignal?.aborted ||
			(maxToolsIterations > 0 && currentIteration >= maxToolsIterations)
		) {
			break;
		}
		messages.push(response.choices[0].message);

		for (const toolCall of toolCalls) {
			const functionName = toolCall.function.name;
			const functionArgs = toolCall.function.arguments;

			let functionResponse;
			for (const tool of externalTools ?? []) {
				if (tool.name === functionName) {
					const parsedArgs: { input: string } = jsonParse(functionArgs);
					const functionInput = parsedArgs.input ?? parsedArgs ?? functionArgs;
					functionResponse = await tool.invoke(functionInput);
				}
			}

			if (typeof functionResponse === 'object') {
				functionResponse = JSON.stringify(functionResponse);
			}

			messages.push({
				tool_call_id: toolCall.id,
				role: 'tool',
				content: functionResponse,
			});
		}

		response = (await apiRequest.call(this, 'POST', '/chat/completions', {
			body,
		})) as ChatCompletion;

		toolCalls = response.choices[0].message.tool_calls;
		currentIteration += 1;
	}

	if (response_format) {
		response.choices = response.choices.map((choice) => {
			try {
				choice.message.content = JSON.parse(choice.message.content);
			} catch (error) {}
			return choice;
		});
	}

	const simplify = this.getNodeParameter('simplify', i) as boolean;

	const returnData: INodeExecutionData[] = [];

	if (simplify) {
		for (const entry of response.choices) {
			returnData.push({
				json: entry,
				pairedItem: { item: i },
			});
		}
	} else {
		returnData.push({ json: response, pairedItem: { item: i } });
	}

	return returnData;
}
