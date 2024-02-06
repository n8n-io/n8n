import { AgentExecutor } from 'langchain/agents';
import type { Tool } from 'langchain/tools';
import { OpenAIAssistantRunnable } from 'langchain/experimental/openai_assistant';
import type { OpenAIToolType } from 'langchain/dist/experimental/openai_assistant/schema';
import { OpenAI as OpenAIClient } from 'openai';

import { NodeConnectionType, NodeOperationError, updateDisplayOptions } from 'n8n-workflow';
import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { formatToOpenAIAssistantTool } from '../../helpers/utils';
import { assistantRLC } from '../descriptions';

const properties: INodeProperties[] = [
	assistantRLC,
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
		displayName: 'Use Custom Tools',
		name: 'useCustomTools',
		type: 'boolean',
		description:
			'Whether to connect some custom tools to this node on the canvas, model may use them to generate the response',
		default: false,
	},
	{
		displayName: 'Connect your own custom tools to this node on the canvas',
		name: 'noticeTools',
		type: 'notice',
		displayOptions: { show: { useCustomTools: [true] } },
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

	const input = this.getNodeParameter('text', i) as string;
	const assistantId = this.getNodeParameter('assistantId', i, '', { extractValue: true }) as string;
	const useCustomTools = this.getNodeParameter('useCustomTools', i, false) as boolean;

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

	const agent = new OpenAIAssistantRunnable({ assistantId, client, asAgent: true });

	let tools;

	if (useCustomTools) {
		tools = (await this.getInputConnectionData(NodeConnectionType.AiTool, 0)) as Tool[];
		const transformedConnectedTools = tools?.map(formatToOpenAIAssistantTool) ?? [];
		const nativeToolsParsed: OpenAIToolType = [];

		const assistant = await client.beta.assistants.retrieve(assistantId);

		const useCodeInterpreter = assistant.tools.some((tool) => tool.type === 'code_interpreter');
		if (useCodeInterpreter) {
			nativeToolsParsed.push({
				type: 'code_interpreter',
			});
		}

		const useRetrieval = assistant.tools.some((tool) => tool.type === 'retrieval');
		if (useRetrieval) {
			nativeToolsParsed.push({
				type: 'retrieval',
			});
		}

		await client.beta.assistants.update(assistantId, {
			tools: [...nativeToolsParsed, ...transformedConnectedTools],
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
