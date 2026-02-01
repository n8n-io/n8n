import type { Tool } from '@langchain/core/tools';
import { getConnectedTools } from '@utils/helpers';
import get from 'lodash/get';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { jsonParse, NodeOperationError, updateDisplayOptions } from 'n8n-workflow';
import { MODELS_NOT_SUPPORT_FUNCTION_CALLS } from '../../../helpers/constants';
import type { ChatResponse } from '../../../helpers/interfaces';
import { formatToOpenAIResponsesTool } from '../../../helpers/utils';
import { pollUntilAvailable } from '../../../helpers/polling';
import { apiRequest } from '../../../transport';
import { messageOptions, metadataProperty, modelRLC } from '../descriptions';
import { createRequest } from './helpers/responses';

const jsonSchemaExample = `{
  "type": "object",
  "properties": {
    "message": {
      "type": "string"
    }
  },
  "additionalProperties": false,
  "required": ["message"]
}`;

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
		default: { values: [{ type: 'text' }] },
		options: messageOptions,
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
		displayName: 'Built-in Tools',
		name: 'builtInTools',
		placeholder: 'Add Built-in Tool',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Web Search',
				name: 'webSearch',
				type: 'collection',
				default: { searchContextSize: 'medium' },
				options: [
					{
						displayName: 'Search Context Size',
						description:
							'High level guidance for the amount of context window space to use for the search',
						name: 'searchContextSize',
						type: 'options',
						default: 'medium',
						options: [
							{ name: 'Low', value: 'low' },
							{ name: 'Medium', value: 'medium' },
							{ name: 'High', value: 'high' },
						],
					},
					{
						displayName: 'Web Search Allowed Domains',
						name: 'allowedDomains',
						type: 'string',
						default: '',
						description:
							'Comma-separated list of domains to search. Only domains in this list will be searched.',
						placeholder: 'e.g. google.com, wikipedia.org',
					},
					{
						displayName: 'Country',
						name: 'country',
						type: 'string',
						default: '',
						placeholder: 'e.g. US, GB',
					},
					{
						displayName: 'City',
						name: 'city',
						type: 'string',
						default: '',
						placeholder: 'e.g. New York, London',
					},
					{
						displayName: 'Region',
						name: 'region',
						type: 'string',
						default: '',
						placeholder: 'e.g. New York, London',
					},
				],
			},
			{
				displayName: 'File Search',
				name: 'fileSearch',
				type: 'collection',
				default: { vectorStoreIds: '[]' },
				options: [
					{
						displayName: 'Vector Store IDs',
						name: 'vectorStoreIds',
						description:
							'The vector store IDs to use for the file search. Vector stores are managed via OpenAI Dashboard.',
						type: 'json',
						default: '[]',
						required: true,
					},
					{
						displayName: 'Filters',
						name: 'filters',
						type: 'json',
						default: '{}',
					},
					{
						displayName: 'Max Results',
						name: 'maxResults',
						type: 'number',
						default: 1,
						typeOptions: { minValue: 1, maxValue: 50 },
					},
				],
			},
			{
				displayName: 'Code Interpreter',
				name: 'codeInterpreter',
				type: 'boolean',
				default: true,
				description: 'Whether to allow the model to execute code in a sandboxed environment',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		options: [
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
				displayName: 'Max Tool Calls Iterations',
				name: 'maxToolsIterations',
				type: 'number',
				default: 15,
				description:
					'The maximum number of tool iteration cycles the LLM will run before stopping. A single iteration can contain multiple tool calls. Set to 0 for no limit.',
			},
			{
				displayName: 'Max Built-in Tool Calls',
				name: 'maxToolCalls',
				type: 'number',
				default: 15,
				description:
					'The maximum number of total calls to built-in tools that can be processed in a response. This maximum number applies across all built-in tool calls, not per individual tool. Any further attempts to call a tool by the model will be ignored.',
			},
			metadataProperty,
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
				description:
					'Configure the reusable prompt template configured via OpenAI Dashboard. <a href="https://platform.openai.com/docs/guides/prompt-engineering#reusable-prompts">Learn more</a>.',
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
								default: '{}',
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
					{ name: 'Priority', value: 'priority' },
				],
			},
			{
				displayName: 'Store',
				name: 'store',
				type: 'boolean',
				default: true,
				description: 'Whether to store the generated model response for later retrieval via API',
			},
			{
				displayName: 'Output Format',
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
								default: '',
								options: [
									{ name: 'Text', value: 'text' },
									// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
									{ name: 'JSON Schema (recommended)', value: 'json_schema' },
									{ name: 'JSON Object', value: 'json_object' },
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
								default: 'my_schema',
								description:
									'The name of the response format. Must be a-z, A-Z, 0-9, or contain underscores and dashes, with a maximum length of 64.',
								displayOptions: {
									show: {
										type: ['json_schema'],
									},
								},
							},
							{
								displayName:
									'All properties in the schema must be set to "required", when using "strict" mode.',
								name: 'requiredNotice',
								type: 'notice',
								default: '',
								displayOptions: {
									show: {
										strict: [true],
									},
								},
							},
							{
								displayName: 'Schema',
								name: 'schema',
								type: 'json',
								default: jsonSchemaExample,
								description: 'The schema of the response format',
								displayOptions: {
									show: {
										type: ['json_schema'],
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
										type: ['json_schema'],
									},
								},
							},
							{
								displayName: 'Strict',
								name: 'strict',
								type: 'boolean',
								default: false,
								description:
									'Whether to require that the AI will always generate responses that match the provided JSON Schema',
								displayOptions: {
									show: {
										type: ['json_schema'],
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
					maxValue: 2,
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
			{
				displayName: 'Background Mode',
				name: 'backgroundMode',
				type: 'fixedCollection',
				default: { values: [{ backgroundMode: true }] },
				options: [
					{
						displayName: 'Bakground',
						name: 'values',
						values: [
							{
								displayName: 'Background Mode',
								name: 'enabled',
								type: 'boolean',
								default: false,
								description:
									'Whether to run the model in background mode. If true, the model will run in background mode.',
							},
							{
								displayName: 'Timeout',
								name: 'timeout',
								type: 'number',
								default: 300,
								description:
									'The timeout for the background mode in seconds. If 0, the timeout is infinite.',
								typeOptions: {
									minValue: 0,
									maxValue: 3600,
								},
							},
						],
					},
				],
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
	const model = this.getNodeParameter('modelId', i, '', { extractValue: true }) as string;
	const messages = this.getNodeParameter('responses.values', i, []) as IDataObject[];
	const options = this.getNodeParameter('options', i, {});
	const maxToolsIterations = this.getNodeParameter('options.maxToolsIterations', i, 15) as number;
	const builtInTools = this.getNodeParameter('builtInTools', i, {}) as IDataObject;
	const abortSignal = this.getExecutionCancelSignal();

	const hideTools = this.getNodeParameter('hideTools', i, '') as string;

	let tools;
	let externalTools: Tool[] = [];

	if (hideTools !== 'hide') {
		const enforceUniqueNames = true;
		externalTools = await getConnectedTools(this, enforceUniqueNames, false);
	}

	if (externalTools.length) {
		tools = externalTools.length ? externalTools?.map(formatToOpenAIResponsesTool) : undefined;
	}

	const body = await createRequest.call(this, i, {
		model,
		messages,
		options,
		tools,
		builtInTools,
	});
	let response = (await apiRequest.call(this, 'POST', '/responses', {
		body,
	})) as ChatResponse;

	if (body.background) {
		const timeoutSeconds = get(options, 'backgroundMode.values.timeout', 300) as number;
		response = await pollUntilAvailable(
			this,
			async () => {
				return (await apiRequest.call(this, 'GET', `/responses/${response.id}`)) as ChatResponse;
			},
			(response) => {
				if (response.error) {
					throw new NodeOperationError(this.getNode(), 'Background mode error', {
						description: response.error.message,
					});
				}
				return response.status === 'completed';
			},
			timeoutSeconds,
			10,
		);
	}

	if (!response) return [];

	// reasoning models such as gpt5 include reasoning items that must be included in the request
	const isToolRelatedCall: (item: { type: string }) => boolean = (item) =>
		item.type === 'function_call' || item.type === 'reasoning';

	let toolCalls = response.output.filter(isToolRelatedCall);

	const hasFunctionCall = () => toolCalls.some((item) => item.type === 'function_call');

	let currentIteration = 1;
	// make sure there's actually a function call to answer
	while (toolCalls.length && hasFunctionCall()) {
		if (abortSignal?.aborted || (maxToolsIterations > 0 && currentIteration > maxToolsIterations)) {
			break;
		}

		// if there's conversation, we don't need to include function_call or reasoning items in the request
		// if we include them, OpenAI will throw "Duplicate item with id" error
		if (!body.conversation) {
			body.input.push.apply(body.input, toolCalls);
		}

		for (const item of toolCalls) {
			if (item.type === 'function_call') {
				const functionName = item.name;
				const functionArgs = item.arguments;
				const callId = item.call_id;

				let functionResponse;
				for (const tool of externalTools ?? []) {
					if (tool.name === functionName) {
						const parsedArgs: { input: string } = jsonParse(functionArgs);
						const functionInput = parsedArgs.input ?? parsedArgs ?? functionArgs;
						functionResponse = await tool.invoke(functionInput);
					}

					if (typeof functionResponse === 'object') {
						functionResponse = JSON.stringify(functionResponse);
					}
				}

				body.input.push({
					type: 'function_call_output',
					call_id: callId,
					output: functionResponse,
				});
			}
		}

		response = (await apiRequest.call(this, 'POST', '/responses', {
			body,
		})) as ChatResponse;
		toolCalls = response.output.filter(isToolRelatedCall);

		currentIteration++;
	}

	const formatType = get(body, 'text.format.type');
	if (formatType === 'json_object' || formatType === 'json_schema') {
		try {
			response.output = response.output.map((item) => {
				if (item.type === 'message') {
					item.content = item.content.map((content) => {
						if (content.type === 'output_text') {
							content.text = JSON.parse(content.text);
						}
						return content;
					});
				}
				return item;
			});
		} catch (error) {}
	}

	const simplify = this.getNodeParameter('simplify', i) as boolean;

	const returnData: INodeExecutionData[] = [];

	if (simplify) {
		const messages = response.output.filter((item) => item.type === 'message');
		returnData.push({
			json: {
				output: messages as unknown as IDataObject,
			},
			pairedItem: { item: i },
		});
	} else {
		returnData.push({ json: response as unknown as IDataObject, pairedItem: { item: i } });
	}

	return returnData;
}
