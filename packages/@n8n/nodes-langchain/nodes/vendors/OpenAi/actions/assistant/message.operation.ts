import type { BaseMessage } from '@langchain/core/messages';
import { AgentExecutor } from 'langchain/agents';
import type { OpenAIToolType } from 'langchain/dist/experimental/openai_assistant/schema';
import { OpenAIAssistantRunnable } from 'langchain/experimental/openai_assistant';
import type { BufferWindowMemory } from 'langchain/memory';
import omit from 'lodash/omit';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import {
	ApplicationError,
	NodeConnectionTypes,
	NodeOperationError,
	updateDisplayOptions,
} from 'n8n-workflow';
import { OpenAI as OpenAIClient } from 'openai';

import { promptTypeOptions } from '@utils/descriptions';
import { getConnectedTools } from '@utils/helpers';
import { getTracingConfig } from '@utils/tracing';

import { formatToOpenAIAssistantTool, getChatMessages } from '../../helpers/utils';
import { assistantRLC } from '../descriptions';

const properties: INodeProperties[] = [
	assistantRLC,
	{
		...promptTypeOptions,
		name: 'prompt',
	},
	{
		displayName: 'Prompt (User Message)',
		name: 'text',
		type: 'string',
		default: '',
		placeholder: 'e.g. Hello, how can you help me?',
		typeOptions: {
			rows: 2,
		},
		displayOptions: {
			show: {
				prompt: ['define'],
			},
		},
	},
	{
		displayName: 'Memory',
		name: 'memory',
		type: 'options',
		options: [
			{
				name: 'Use memory connector',
				value: 'connector',
				description: 'Connect one of the supported memory nodes',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				name: 'Use thread ID',
				value: 'threadId',
				description: 'Specify the ID of the thread to continue',
			},
		],
		displayOptions: {
			show: {
				'@version': [{ _cnd: { gte: 1.6 } }],
			},
		},
		default: 'connector',
	},
	{
		displayName: 'Thread ID',
		name: 'threadId',
		type: 'string',
		default: '',
		placeholder: '',
		description: 'The ID of the thread to continue, a new thread will be created if not specified',
		hint: 'If the thread ID is empty or undefined a new thread will be created and included in the response',
		displayOptions: {
			show: {
				'@version': [{ _cnd: { gte: 1.6 } }],
				memory: ['threadId'],
			},
		},
	},
	{
		displayName: 'Connect your own custom n8n tools to this node on the canvas',
		name: 'noticeTools',
		type: 'notice',
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
				displayOptions: {
					hide: {
						'@version': [{ _cnd: { gte: 1.8 } }],
					},
				},
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
			{
				displayName: 'Preserve Original Tools',
				name: 'preserveOriginalTools',
				type: 'boolean',
				default: true,
				description:
					'Whether to preserve the original tools of the assistant after the execution of this node, otherwise the tools will be replaced with the connected tools, if any, default is true',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.3 } }],
					},
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['message'],
		resource: ['assistant'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
const mapChatMessageToThreadMessage = (
	message: BaseMessage,
): OpenAIClient.Beta.Threads.ThreadCreateParams.Message => ({
	role: message._getType() === 'ai' ? 'assistant' : 'user',
	content: message.content.toString(),
});

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('openAiApi');
	const nodeVersion = this.getNode().typeVersion;

	const prompt = this.getNodeParameter('prompt', i) as string;

	let input;
	if (prompt === 'auto') {
		input = this.evaluateExpression('{{ $json["chatInput"] }}', i) as string;
	} else {
		input = this.getNodeParameter('text', i) as string;
	}

	if (input === undefined) {
		throw new NodeOperationError(this.getNode(), 'No prompt specified', {
			description:
				"Expected to find the prompt in an input field called 'chatInput' (this is what the chat trigger node outputs). To use something else, change the 'Prompt' parameter",
		});
	}

	const assistantId = this.getNodeParameter('assistantId', i, '', { extractValue: true }) as string;

	const options = this.getNodeParameter('options', i, {}) as {
		baseURL?: string;
		maxRetries: number;
		timeout: number;
		preserveOriginalTools?: boolean;
	};

	const baseURL = (options.baseURL ?? credentials.url) as string;

	const client = new OpenAIClient({
		apiKey: credentials.apiKey as string,
		maxRetries: options.maxRetries ?? 2,
		timeout: options.timeout ?? 10000,
		baseURL,
	});

	const agent = new OpenAIAssistantRunnable({ assistantId, client, asAgent: true });

	const tools = await getConnectedTools(this, nodeVersion > 1, false);
	let assistantTools;

	if (tools.length) {
		const transformedConnectedTools = tools?.map(formatToOpenAIAssistantTool) ?? [];
		const nativeToolsParsed: OpenAIToolType = [];

		assistantTools = (await client.beta.assistants.retrieve(assistantId)).tools;

		const useCodeInterpreter = assistantTools.some((tool) => tool.type === 'code_interpreter');
		if (useCodeInterpreter) {
			nativeToolsParsed.push({
				type: 'code_interpreter',
			});
		}

		const useRetrieval = assistantTools.some((tool) => tool.type === 'file_search');
		if (useRetrieval) {
			nativeToolsParsed.push({
				type: 'file_search',
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

	const useMemoryConnector =
		nodeVersion >= 1.6 && this.getNodeParameter('memory', i) === 'connector';
	const memory =
		useMemoryConnector || nodeVersion < 1.6
			? ((await this.getInputConnectionData(NodeConnectionTypes.AiMemory, 0)) as
					| BufferWindowMemory
					| undefined)
			: undefined;

	const threadId =
		nodeVersion >= 1.6 && !useMemoryConnector
			? (this.getNodeParameter('threadId', i) as string)
			: undefined;

	const chainValues: IDataObject = {
		content: input,
		signal: this.getExecutionCancelSignal(),
		timeout: options.timeout ?? 10000,
	};
	let thread: OpenAIClient.Beta.Threads.Thread;
	if (memory) {
		const chatMessages = await getChatMessages(memory);

		// Construct a new thread from the chat history to map the memory
		if (chatMessages.length) {
			const first32Messages = chatMessages.slice(0, 32);
			// There is a undocumented limit of 32 messages per thread when creating a thread with messages
			const mappedMessages: OpenAIClient.Beta.Threads.ThreadCreateParams.Message[] =
				first32Messages.map(mapChatMessageToThreadMessage);

			thread = await client.beta.threads.create({ messages: mappedMessages });
			const overLimitMessages = chatMessages.slice(32).map(mapChatMessageToThreadMessage);

			// Send the remaining messages that exceed the limit of 32 sequentially
			for (const message of overLimitMessages) {
				await client.beta.threads.messages.create(thread.id, message);
			}

			chainValues.threadId = thread.id;
		}
	} else if (threadId) {
		chainValues.threadId = threadId;
	}

	let filteredResponse: IDataObject = {};
	try {
		const response = await agentExecutor.withConfig(getTracingConfig(this)).invoke(chainValues);
		if (memory) {
			await memory.saveContext({ input }, { output: response.output });

			if (response.threadId && response.runId) {
				const threadRun = await client.beta.threads.runs.retrieve(response.runId, {
					thread_id: response.threadId,
				});
				response.usage = threadRun.usage;
			}
		}

		if (
			options.preserveOriginalTools !== false &&
			nodeVersion >= 1.3 &&
			(assistantTools ?? [])?.length
		) {
			await client.beta.assistants.update(assistantId, {
				tools: assistantTools,
			});
		}
		// Remove configuration properties and runId added by Langchain that are not relevant to the user
		filteredResponse = omit(response, ['signal', 'timeout', 'content', 'runId']) as IDataObject;
	} catch (error) {
		if (!(error instanceof ApplicationError)) {
			throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
		}
	}

	return [{ json: filteredResponse, pairedItem: { item: i } }];
}
