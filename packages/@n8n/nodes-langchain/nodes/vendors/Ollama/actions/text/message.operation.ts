import type { Tool } from '@langchain/core/tools';
import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';
import zodToJsonSchema from 'zod-to-json-schema';

import { getConnectedTools } from '@utils/helpers';

import type { OllamaChatResponse, OllamaMessage } from '../../helpers/interfaces';
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
		default: { values: [{ content: '', role: 'user' }] },
		options: [
			{
				displayName: 'Values',
				name: 'values',
				values: [
					{
						displayName: 'Content',
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
						description: 'The role of this message in the conversation',
						options: [
							{
								name: 'System',
								value: 'system',
								description: 'System message to set the context and behavior of the assistant',
							},
							{
								name: 'User',
								value: 'user',
								description: 'Message from the user',
							},
							{
								name: 'Assistant',
								value: 'assistant',
								description: 'Response from the assistant (for conversation history)',
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
		description: 'Whether to simplify the response or not',
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
				placeholder: 'e.g. You are a helpful assistant.',
				description: 'System message to set the context for the conversation',
				typeOptions: {
					rows: 2,
				},
			},
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				default: 0.8,
				typeOptions: {
					minValue: 0,
					maxValue: 2,
					numberPrecision: 2,
				},
				description: 'Controls randomness in responses. Lower values make output more focused.',
			},
			{
				displayName: 'Top P',
				name: 'top_p',
				type: 'number',
				default: 0.9,
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberPrecision: 2,
				},
				description: 'Controls diversity of responses by nucleus sampling',
			},
			{
				displayName: 'Top K',
				name: 'top_k',
				type: 'number',
				default: 40,
				typeOptions: {
					minValue: 1,
				},
				description: 'Controls diversity by limiting the number of top tokens to consider',
			},
			{
				displayName: 'Max Tokens',
				name: 'num_predict',
				type: 'number',
				default: 128,
				typeOptions: {
					minValue: 1,
				},
				description: 'Maximum number of tokens to generate in the completion',
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

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const model = this.getNodeParameter('modelId', i, '', { extractValue: true }) as string;
	const messagesParam = this.getNodeParameter('messages.values', i, []) as Array<{
		content: string;
		role: string;
	}>;
	const manualTools = this.getNodeParameter('tools.values', i, []) as Array<{
		name: string;
		description: string;
		parameters: string;
	}>;
	const simplify = this.getNodeParameter('simplify', i, true) as boolean;
	const options = this.getNodeParameter('options', i, {});

	// Build messages array from user input
	const messages: OllamaMessage[] = messagesParam.map((msg) => ({
		role: msg.role as 'system' | 'user' | 'assistant',
		content: msg.content,
	}));

	// Get tools from multiple sources
	const tools: Array<{
		type: string;
		function: {
			name: string;
			description: string;
			parameters: Record<string, unknown>;
		};
	}> = [];
	let connectedTools: Tool[] = [];

	// Add connected AI tools
	const nodeInputs = this.getNodeInputs();
	if (nodeInputs.some((input) => input.type === 'ai_tool')) {
		connectedTools = await getConnectedTools(this, true);
		const connectedToolsFormatted = connectedTools.map((tool) => ({
			type: 'function',
			function: {
				name: tool.name,
				description: tool.description,
				parameters: zodToJsonSchema(tool.schema),
			},
		}));
		tools.push.apply(tools, connectedToolsFormatted);
	}

	// Add manual tools from UI
	const manualToolsFormatted = manualTools.map((tool) => {
		let parameters: Record<string, unknown>;
		try {
			parameters = JSON.parse(tool.parameters);
		} catch {
			parameters = { type: 'object', properties: {}, required: [] };
		}
		return {
			type: 'function',
			function: {
				name: tool.name,
				description: tool.description,
				parameters,
			},
		};
	});
	tools.push.apply(tools, manualToolsFormatted);

	const body = {
		model,
		messages,
		stream: false,
		...(tools.length > 0 && { tools }),
		options: {
			temperature: options.temperature,
			top_p: options.top_p,
			top_k: options.top_k,
			num_predict: options.num_predict,
		},
	};

	let response = (await apiRequest.call(this, 'POST', '/api/chat', {
		body,
	})) as OllamaChatResponse;

	// Handle tool calling if tools are available and model returned tool calls
	if (tools.length > 0 && response.message.tool_calls && response.message.tool_calls.length > 0) {
		response = await handleToolCalls.call(
			this,
			response,
			messages,
			connectedTools,
			manualTools,
			body,
		);
	}

	if (simplify) {
		return [
			{
				json: { content: response.message.content },
				pairedItem: { item: i },
			},
		];
	}

	return [
		{
			json: { ...response },
			pairedItem: { item: i },
		},
	];
}

async function handleToolCalls(
	this: IExecuteFunctions,
	response: OllamaChatResponse,
	messages: OllamaMessage[],
	connectedTools: Tool[],
	manualTools: Array<{ name: string; description: string; parameters: string }>,
	requestBody: Record<string, unknown>,
): Promise<OllamaChatResponse> {
	const toolCalls = response.message.tool_calls;
	if (!toolCalls?.length) {
		return response;
	}

	// Add the assistant's response with tool calls to the conversation
	messages.push({
		role: 'assistant',
		content: response.message.content,
		tool_calls: toolCalls,
	});

	// Execute each tool call and add results
	for (const toolCall of toolCalls) {
		let toolResponse: string = '';
		let toolFound = false;

		// First, try to find and execute connected tools
		for (const connectedTool of connectedTools) {
			if (connectedTool.name === toolCall.function.name) {
				try {
					const result = await connectedTool.invoke(toolCall.function.arguments);
					toolResponse = typeof result === 'object' ? JSON.stringify(result) : String(result);
					toolFound = true;
				} catch (error) {
					toolResponse = `Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`;
					toolFound = true;
				}
				break;
			}
		}

		// If not found in connected tools, check manual tools
		if (!toolFound) {
			const manualTool = manualTools.find((tool) => tool.name === toolCall.function.name);
			if (manualTool) {
				toolResponse = `Manual tool "${toolCall.function.name}" called with parameters: ${JSON.stringify(toolCall.function.arguments)}. This tool requires external implementation.`;
				toolFound = true;
			}
		}

		// If tool not found at all
		if (!toolFound) {
			toolResponse = `Tool "${toolCall.function.name}" not found or not implemented.`;
		}

		// Add tool result to messages
		messages.push({
			role: 'tool',
			content: toolResponse,
			tool_name: toolCall.function.name,
		});
	}

	// Make another API call with the updated conversation including tool results
	const updatedBody = {
		...requestBody,
		messages,
	};

	return (await apiRequest.call(this, 'POST', '/api/chat', {
		body: updatedBody,
	})) as OllamaChatResponse;
}
