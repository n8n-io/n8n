import type { Tool } from '@langchain/core/tools';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError, updateDisplayOptions } from 'n8n-workflow';
import zodToJsonSchema from 'zod-to-json-schema';

import { getConnectedTools } from '@utils/helpers';

import type { Content, File, Message, Tool as AnthropicTool } from '../../helpers/interfaces';
import { downloadFile, getBaseUrl, uploadFile } from '../../helpers/utils';
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
		displayName: 'Add Attachments',
		name: 'addAttachments',
		type: 'boolean',
		default: false,
		description: 'Whether to add attachments to the message',
	},
	{
		displayName: 'Attachments Input Type',
		name: 'attachmentsInputType',
		type: 'options',
		default: 'url',
		description: 'The type of input to use for the attachments',
		options: [
			{
				name: 'URL(s)',
				value: 'url',
			},
			{
				name: 'Binary File(s)',
				value: 'binary',
			},
		],
		displayOptions: {
			show: {
				addAttachments: [true],
			},
		},
	},
	{
		displayName: 'Attachment URL(s)',
		name: 'attachmentsUrls',
		type: 'string',
		default: '',
		placeholder: 'e.g. https://example.com/image.png',
		description: 'URL(s) of the file(s) to attach, multiple URLs can be added separated by comma',
		displayOptions: {
			show: {
				addAttachments: [true],
				attachmentsInputType: ['url'],
			},
		},
	},
	{
		displayName: 'Attachment Input Data Field Name(s)',
		name: 'binaryPropertyNames',
		type: 'string',
		default: 'data',
		placeholder: 'e.g. data',
		description:
			'Name of the binary field(s) which contains the file(s) to attach, multiple field names can be added separated by comma',
		displayOptions: {
			show: {
				addAttachments: [true],
				attachmentsInputType: ['binary'],
			},
		},
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
				displayName: 'Code Execution',
				name: 'codeExecution',
				type: 'boolean',
				default: false,
				description: 'Whether to enable code execution. Not supported by all models.',
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

function getFileTypeOrThrow(this: IExecuteFunctions, mimeType?: string): 'image' | 'document' {
	if (mimeType?.startsWith('image/')) {
		return 'image';
	}

	if (mimeType === 'application/pdf') {
		return 'document';
	}

	throw new NodeOperationError(
		this.getNode(),
		`Unsupported file type: ${mimeType}. Only images and PDFs are supported.`,
	);
}

interface MessagesResponse {
	content: Content[];
	stop_reason: string;
}

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const model = this.getNodeParameter('modelId', i, '', { extractValue: true }) as string;
	const messages = this.getNodeParameter('messages.values', i, []) as Message[];
	const addAttachments = this.getNodeParameter('addAttachments', i, false) as boolean;
	const simplify = this.getNodeParameter('simplify', i, true) as boolean;
	const options = this.getNodeParameter('options', i, {}) as {
		codeExecution?: boolean;
		webSearch?: boolean;
		allowedDomains?: string;
		blockedDomains?: string;
		maxUses?: number;
		maxTokens?: number;
		system?: string;
		temperature?: number;
		topP?: number;
		topK?: number;
	};

	const availableTools = await getConnectedTools(this, true);
	const tools: AnthropicTool[] = availableTools.map((t) => ({
		type: 'custom',
		name: t.name,
		input_schema: zodToJsonSchema(t.schema),
		description: t.description,
	}));
	if (options.codeExecution) {
		tools.push({
			type: 'code_execution_20250522',
			name: 'code_execution',
		});
	}
	if (options.webSearch) {
		const allowedDomains = options.allowedDomains
			?.split(',')
			.map((d) => d.trim())
			.filter((d) => d);
		const blockedDomains = options.blockedDomains
			?.split(',')
			.map((d) => d.trim())
			.filter((d) => d);
		tools.push({
			type: 'web_search_20250305',
			name: 'web_search',
			max_uses: options.maxUses,
			allowed_domains: allowedDomains,
			blocked_domains: blockedDomains,
		});
	}

	if (addAttachments) {
		if (options.codeExecution) {
			await addCodeAttachmentsToMessages.call(this, i, messages);
		} else {
			await addRegularAttachmentsToMessages.call(this, i, messages);
		}
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
		enableAnthropicBetas: { codeExecution: options.codeExecution },
	})) as MessagesResponse;

	const maxToolsIterations = this.getNodeParameter('options.maxToolsIterations', i, 15) as number;
	const abortSignal = this.getExecutionCancelSignal();
	let currentIteration = 0;
	let pauseTurns = 0;
	while (true) {
		if (abortSignal?.aborted) {
			break;
		}

		messages.push({
			role: 'assistant',
			content: response.content,
		});

		if (response.stop_reason === 'tool_use') {
			if (maxToolsIterations > 0 && currentIteration >= maxToolsIterations) {
				break;
			}

			await handleToolUse.call(this, response, messages, availableTools);
			currentIteration++;
		} else if (response.stop_reason === 'pause_turn') {
			// if the model has paused (can happen for the web search or code execution tool), we just retry 3 times
			if (pauseTurns >= 3) {
				break;
			}

			pauseTurns++;
		} else {
			break;
		}

		response = (await apiRequest.call(this, 'POST', '/v1/messages', {
			body,
			enableAnthropicBetas: { codeExecution: options.codeExecution },
		})) as MessagesResponse;
	}

	if (simplify) {
		return response.content.map((content) => ({
			json: content,
			pairedItem: { item: i },
		}));
	}

	return [
		{
			json: { ...response },
			pairedItem: { item: i },
		},
	];
}

async function handleToolUse(
	this: IExecuteFunctions,
	response: MessagesResponse,
	messages: Message[],
	availableTools: Tool[],
) {
	const toolCalls = getToolCalls(response.content);
	if (!toolCalls.length) {
		return;
	}

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
}

// TODO: make this a helper?
async function addRegularAttachmentsToMessages(
	this: IExecuteFunctions,
	i: number,
	messages: Message[],
) {
	const inputType = this.getNodeParameter('attachmentsInputType', i, 'url') as string;
	const baseUrl = await getBaseUrl.call(this);
	const fileUrlPrefix = `${baseUrl}/v1/files/`;

	let content: Content[];
	if (inputType === 'url') {
		const urls = this.getNodeParameter('attachmentsUrls', i, '') as string;
		const promises = urls
			.split(',')
			.map((url) => url.trim())
			.filter((url) => url)
			.map(async (url) => {
				if (url.startsWith(fileUrlPrefix)) {
					const response = (await apiRequest.call(this, 'GET', url)) as File;
					const type = getFileTypeOrThrow.call(this, response.mime_type);
					return {
						type,
						source: {
							type: 'file',
							file_id: url.replace(fileUrlPrefix, ''),
						},
					} as Content;
				} else {
					// TODO: downloading the whole just for the mime type is not ideal
					const response = await downloadFile.call(this, url);
					const type = getFileTypeOrThrow.call(this, response.mimeType);
					return {
						type,
						source: {
							type: 'url',
							url,
						},
					} as Content;
				}
			});

		content = await Promise.all(promises);
	} else {
		const binaryPropertyNames = this.getNodeParameter('binaryPropertyName', i, 'data');
		const promises = binaryPropertyNames
			.split(',')
			.map((binaryPropertyName) => binaryPropertyName.trim())
			.filter((binaryPropertyName) => binaryPropertyName)
			.map(async (binaryPropertyName) => {
				const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
				const type = getFileTypeOrThrow.call(this, binaryData.mimeType);
				const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
				const fileBase64 = buffer.toString('base64');
				return {
					type,
					source: {
						type: 'base64',
						media_type: binaryData.mimeType,
						data: fileBase64,
					},
				} as Content;
			});

		content = await Promise.all(promises);
	}

	messages.push({
		role: 'user',
		content,
	});
}

async function addCodeAttachmentsToMessages(
	this: IExecuteFunctions,
	i: number,
	messages: Message[],
) {
	const inputType = this.getNodeParameter('attachmentsInputType', i, 'url') as string;
	const baseUrl = await getBaseUrl.call(this);
	const fileUrlPrefix = `${baseUrl}/v1/files/`;

	let content: Content[];
	if (inputType === 'url') {
		const urls = this.getNodeParameter('attachmentsUrls', i, '') as string;
		const promises = urls
			.split(',')
			.map((url) => url.trim())
			.filter((url) => url)
			.map(async (url) => {
				if (url.startsWith(fileUrlPrefix)) {
					return url.replace(fileUrlPrefix, '');
				} else {
					const { fileContent, mimeType } = await downloadFile.call(this, url);
					const response = await uploadFile.call(this, fileContent, mimeType);
					return response.id;
				}
			});

		const fileIds = await Promise.all(promises);
		content = fileIds.map((fileId) => ({
			type: 'container_upload',
			file_id: fileId,
		}));
	} else {
		const binaryPropertyNames = this.getNodeParameter('binaryPropertyName', i, 'data');
		const promises = binaryPropertyNames
			.split(',')
			.map((binaryPropertyName) => binaryPropertyName.trim())
			.filter((binaryPropertyName) => binaryPropertyName)
			.map(async (binaryPropertyName) => {
				const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
				const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
				const response = await uploadFile.call(this, buffer, binaryData.mimeType);
				return response.id;
			});

		const fileIds = await Promise.all(promises);
		content = fileIds.map((fileId) => ({
			type: 'container_upload',
			file_id: fileId,
		}));
	}

	messages.push({
		role: 'user',
		content,
	});
}
