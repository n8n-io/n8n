import { AgentExecutor } from 'langchain/agents';
import type { Tool } from 'langchain/tools';
import { OpenAIAssistantRunnable } from 'langchain/experimental/openai_assistant';
import type { OpenAIToolType } from 'langchain/dist/experimental/openai_assistant/schema';

import { OpenAI as OpenAIClient } from 'openai';

import { NodeConnectionType, NodeOperationError, updateDisplayOptions } from 'n8n-workflow';
import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { formatToOpenAIAssistantTool } from '../../helpers/utils';
import { assistantRLC, modelRLC } from '../descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'Mode',
		name: 'mode',
		type: 'options',
		noDataExpression: true,
		default: 'existing',
		options: [
			{
				name: 'Use New Assistant',
				value: 'new',
			},
			{
				name: 'Use Existing Assistant',
				value: 'existing',
			},
		],
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		description: 'The name of the assistant. The maximum length is 256 characters.',
		placeholder: 'e.g. My Assistant',
		required: true,
		displayOptions: {
			show: {
				mode: ['new'],
			},
		},
	},
	{
		displayName: 'Instructions',
		name: 'instructions',
		type: 'string',
		description: 'How the Assistant and model should behave or respond',
		default: '',
		typeOptions: {
			rows: 5,
		},
		displayOptions: {
			show: {
				mode: ['new'],
			},
		},
	},
	{
		...modelRLC,
		displayOptions: {
			show: {
				mode: ['new'],
			},
		},
	},
	{
		...assistantRLC,
		displayOptions: {
			show: {
				mode: ['existing'],
			},
		},
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		default: '={{ $json.chatInput }}',
		placeholder: 'e.g. Hello, how can you help me?',
		typeOptions: {
			rows: 2,
		},
	},
	{
		displayName: 'Tools',
		name: 'nativeTools',
		type: 'multiOptions',
		default: [],
		options: [
			{
				name: 'Code Interpreter',
				value: 'code_interpreter',
			},
			{
				name: 'Custom Tools',
				value: 'customTools',
			},
			{
				name: 'Knowledge Retrieval',
				value: 'retrieval',
			},
		],
	},
	{
		displayName: 'Connect your own custom tools to this node on the canvas',
		name: 'noticeTools',
		type: 'notice',
		displayOptions: { show: { nativeTools: ['customTools'] } },
		default: '',
	},
	{
		displayName: "Add files to retrieve from using the 'Upload a File' operation",
		name: 'noticeTools',
		type: 'notice',
		typeOptions: {
			noticeTheme: 'info',
		},
		displayOptions: { show: { nativeTools: ['retrieval'] } },
		default: '',
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		description: 'Additional options to add',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Base URL',
				name: 'baseURL',
				default: 'https://api.openai.com/v1',
				description: 'Override the default base URL for the API',
				type: 'string',
			},
			{
				displayName: 'Max Retries',
				name: 'maxRetries',
				default: 2,
				description: 'Maximum number of retries to attempt',
				type: 'number',
			},
			{
				displayName: 'Timeout',
				name: 'timeout',
				default: 10000,
				description: 'Maximum amount of time a request is allowed to take in milliseconds',
				type: 'number',
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['messageAssistant'],
		resource: ['assistant'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('openAiApi');
	const nativeTools = this.getNodeParameter('nativeTools', i, []) as string[];

	const input = this.getNodeParameter('text', i) as string;
	const assistantId = this.getNodeParameter('assistantId', i, '', { extractValue: true }) as string;

	const options = this.getNodeParameter('options', i, {}) as {
		baseURL?: string;
		maxRetries: number;
		timeout: number;
	};

	if (input === undefined) {
		throw new NodeOperationError(this.getNode(), "The 'text' parameter is empty.");
	}

	const client = new OpenAIClient({
		apiKey: credentials.apiKey as string,
		maxRetries: options.maxRetries ?? 2,
		timeout: options.timeout ?? 10000,
		baseURL: options.baseURL,
	});
	let agent;

	const nativeToolsParsed: OpenAIToolType = [];
	let tools;

	for (const tool of nativeTools) {
		if (['code_interpreter', 'retrieval'].includes(tool)) {
			nativeToolsParsed.push({ type: tool as 'code_interpreter' | 'retrieval' });
		}
		if (tool === 'customTools') {
			tools = (await this.getInputConnectionData(NodeConnectionType.AiTool, 0)) as Tool[];
		}
	}

	const transformedConnectedTools = tools?.map(formatToOpenAIAssistantTool) ?? [];
	const newTools = [...transformedConnectedTools, ...nativeToolsParsed];

	// Existing agent, update tools with currently assigned
	if (assistantId) {
		agent = new OpenAIAssistantRunnable({ assistantId, client, asAgent: true });

		await client.beta.assistants.update(assistantId, {
			tools: newTools,
		});
	} else {
		const name = this.getNodeParameter('name', i, '') as string;
		const instructions = this.getNodeParameter('instructions', i, '') as string;
		const model = this.getNodeParameter('model', i, 'gpt-3.5-turbo-1106', {
			extractValue: true,
		}) as string;

		agent = await OpenAIAssistantRunnable.createAssistant({
			model,
			client,
			instructions,
			name,
			tools: newTools,
			asAgent: true,
		});
	}

	const agentExecutor = AgentExecutor.fromAgentAndTools({
		agent,
		tools: tools ?? [],
	});

	const response = await agentExecutor.call({
		content: input,
		signal: this.getExecutionCancelSignal(),
		timeout: options.timeout ?? 10000,
	});

	return [{ json: response, pairedItem: { item: i } }];
}
