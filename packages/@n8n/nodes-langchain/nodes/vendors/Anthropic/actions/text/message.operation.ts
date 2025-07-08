import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';
import zodToJsonSchema from 'zod-to-json-schema';

import { getConnectedTools } from '@utils/helpers';

import type { Content, Message, Tool } from '../../helpers/interfaces';
import { apiRequest } from '../../transport';
import { modelRLC } from '../descriptions';

const properties: INodeProperties[] = [
	modelRLC,
	{
		displayName: 'Messages',
		name: 'messages',
		type: 'fixedCollection',
		typeOptions: {
			sortable: true,
			multipleValues: true,
		},
		placeholder: 'Add Message',
		default: { values: [{ content: '' }] },
		options: [
			{
				displayName: 'Values',
				name: 'values',
				values: [
					{
						displayName: 'Prompt',
						name: 'content',
						type: 'string',
						description: 'The content of the message to be sent',
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
						],
						default: 'user',
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
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'System Message',
				name: 'system',
				type: 'string',
				default: '',
				placeholder: 'e.g. You are a helpful assistant',
			},
			{
				displayName: 'Web Search',
				name: 'webSearch',
				type: 'boolean',
				default: false,
				description: 'Whether to enable web search',
			},
			{
				displayName: 'Web Search Max Uses',
				name: 'maxUses',
				type: 'number',
				default: 5,
				description: 'The maximum number of web search uses per request',
				typeOptions: {
					minValue: 0,
					numberPrecision: 0,
				},
			},
			{
				displayName: 'Web Search Allowed Domains',
				name: 'allowedDomains',
				type: 'string',
				default: '',
				description:
					'Comma-separated list of domains to search. Only domains in this list will be searched. Conflicts with "Web Search Blocked Domains".',
				placeholder: 'e.g. google.com, wikipedia.org',
			},
			{
				displayName: 'Web Search Blocked Domains',
				name: 'blockedDomains',
				type: 'string',
				default: '',
				description:
					'Comma-separated list of domains to block from search. Conflicts with "Web Search Allowed Domains".',
				placeholder: 'e.g. google.com, wikipedia.org',
			},
			{
				displayName: 'Maximum Number of Tokens',
				name: 'maxTokens',
				default: 1024,
				description: 'The maximum number of tokens to generate in the completion',
				type: 'number',
				typeOptions: {
					minValue: 1,
					numberPrecision: 0,
				},
			},
			{
				displayName: 'Output Randomness (Temperature)',
				name: 'temperature',
				default: 1,
				description:
					'Controls the randomness of the output. Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberPrecision: 1,
				},
			},
			{
				displayName: 'Output Randomness (Top P)',
				name: 'topP',
				default: 0.7,
				description: 'The maximum cumulative probability of tokens to consider when sampling',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberPrecision: 1,
				},
			},
			{
				displayName: 'Output Randomness (Top K)',
				name: 'topK',
				default: 5,
				description: 'The maximum number of tokens to consider when sampling',
				type: 'number',
				typeOptions: {
					minValue: 0,
					numberPrecision: 0,
				},
			},
			{
				displayName: 'Max Tool Calls Iterations',
				name: 'maxToolsIterations',
				type: 'number',
				default: 15,
				description:
					'The maximum number of tool iteration cycles the LLM will run before stopping. A single iteration can contain multiple tool calls. Set to 0 for no limit',
				typeOptions: {
					minValue: 0,
					numberPrecision: 0,
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['message'],
		resource: ['text'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

function getToolCalls(contents: Content[]) {
	return contents.filter((c) => c.type === 'tool_use');
}

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const model = this.getNodeParameter('modelId', i, '', { extractValue: true }) as string;
	const messages = this.getNodeParameter('messages.values', i, []) as Message[];
	const simplify = this.getNodeParameter('simplify', i, true) as boolean;
	const options = this.getNodeParameter('options', i, {});

	const availableTools = await getConnectedTools(this, true);
	const tools: Tool[] = availableTools.map((t) => ({
		type: 'custom',
		name: t.name,
		input_schema: zodToJsonSchema(t.schema),
		description: t.description,
	}));
	if (options.webSearch) {
		const allowedDomains = (options.allowedDomains as string | undefined)
			?.split(',')
			.map((d) => d.trim())
			.filter((d) => d);
		const blockedDomains = (options.blockedDomains as string | undefined)
			?.split(',')
			.map((d) => d.trim())
			.filter((d) => d);
		tools.push({
			type: 'web_search_20250305',
			name: 'web_search',
			max_uses: options.maxUses as number | undefined,
			allowed_domains: allowedDomains,
			blocked_domains: blockedDomains,
		});
	}

	const body = {
		model,
		messages,
		tools,
		max_tokens: options.maxTokens ?? 1024,
		system: options.system,
		temperature: options.temperature,
		top_p: options.topP,
		top_k: options.topK,
	};

	let response = (await apiRequest.call(this, 'POST', '/v1/messages', {
		body,
	})) as { content: Content[]; stop_reason: string };

	const maxToolsIterations = this.getNodeParameter('options.maxToolsIterations', i, 15) as number;
	const abortSignal = this.getExecutionCancelSignal();
	let currentIteration = 1;
	let toolCalls = getToolCalls(response.content);
	// TODO: handle 'pause_turn'
	while (response.stop_reason === 'tool_use' && toolCalls.length) {
		if (
			(maxToolsIterations > 0 && currentIteration >= maxToolsIterations) ||
			abortSignal?.aborted
		) {
			break;
		}

		messages.push({
			role: 'assistant',
			content: response.content,
		});

		const toolResults = {
			role: 'user' as const,
			content: [] as Content[],
		};
		for (const toolCall of toolCalls) {
			let toolResponse;
			for (const availableTool of availableTools) {
				if (availableTool.name === toolCall.name) {
					toolResponse = (await availableTool.invoke(toolCall.input)) as IDataObject;
				}
			}

			toolResults.content.push({
				type: 'tool_result',
				tool_use_id: toolCall.id,
				content:
					typeof toolResponse === 'object' ? JSON.stringify(toolResponse) : (toolResponse ?? ''),
			});
		}

		messages.push(toolResults);

		response = (await apiRequest.call(this, 'POST', '/v1/messages', {
			body,
		})) as { content: Content[]; stop_reason: string };
		toolCalls = getToolCalls(response.content);
		currentIteration++;
	}

	if (simplify) {
		return response.content.map((content) => ({
			json: content,
			pairedItem: { item: i },
		}));
	}

	return [
		{
			json: response,
			pairedItem: { item: i },
		},
	];
}
