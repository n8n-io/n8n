import { AgentExecutor } from 'langchain/agents';

import { OpenAIAssistantRunnable } from 'langchain/experimental/openai_assistant';
import type { OpenAIToolType } from 'langchain/dist/experimental/openai_assistant/schema';
import { OpenAI as OpenAIClient } from 'openai';

import {
	ApplicationError,
	NodeConnectionType,
	NodeOperationError,
	updateDisplayOptions,
} from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import type { BufferWindowMemory } from 'langchain/memory';
import omit from 'lodash/omit';
import type { BaseMessage } from '@langchain/core/messages';
import { formatToOpenAIAssistantTool } from '../../helpers/utils';
import { assistantRLC } from '../descriptions';

import { getConnectedTools } from '../../../../../utils/helpers';
import { getTracingConfig } from '../../../../../utils/tracing';

const properties: INodeProperties[] = [
	assistantRLC,
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'options',
		options: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				name: 'Take from previous node automatically',
				value: 'auto',
				description: 'Looks for an input field called chatInput',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				name: 'Define below',
				value: 'define',
				description: 'Use an expression to reference data in previous nodes or enter static text',
			},
		],
		default: 'auto',
	},
	{
		displayName: 'Text',
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
		displayName: 'Thread',
		name: 'thread',
		type: 'string',
		default: '',
		description: 'Optional thread ID to associate with the assistant call',
		placeholder: 'thread_mkSDM5vaYA8amDY9vvJTJRW8',
	},
	{
		displayName: 'Vector',
		name: 'vector',
		type: 'string',
		default: '',
		description: 'Optional vector store ID to associate with the file call',
		placeholder: 'vs_Z1YPXu95Cy8Ul954tejtQyrW',
	},
	{
		displayName: 'File',
		name: 'file',
		type: 'string',
		default: '',
		description: 'Optional file ID to associate with the thread call',
		placeholder: 'file-NSjtwlxIpfxIi3T6f8Uh3EdD',
	},
	{
		displayName: 'Role',
		name: 'role',
		type: 'string',
		default: '',
		description: 'Use user or assistant',
		placeholder: 'Role (user or assistant) for content input to associate with the file call',
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		default: '',
		description: 'Prompt content input to associate with the file call',
		placeholder: 'Describe what is in this document.',
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
	const threadIdInput = this.getNodeParameter('thread', i, undefined) as string | undefined;
	const vectorStoreId = this.getNodeParameter('vector', i) as string | undefined;
	const fileId = this.getNodeParameter('file', i) as string | undefined;
	const content = this.getNodeParameter('content', i) as string | undefined;
	const role = this.getNodeParameter('role', i) as string | undefined;

	const options = this.getNodeParameter('options', i, {}) as {
		baseURL?: string;
		maxRetries: number;
		timeout: number;
		preserveOriginalTools?: boolean;
	};

	const client = new OpenAIClient({
		apiKey: credentials.apiKey as string,
		maxRetries: options.maxRetries ?? 2,
		timeout: options.timeout ?? 10000,
		baseURL: options.baseURL,
	});

	let vectorStoreToUpdate = vectorStoreId;
	let vectorStoreAction = 'used'; // Assume we are using an existing vector_store_id

	if (fileId && !vectorStoreId) {
		// Create a new vector store and add the fileId to it
		const newVectorStore = await client.beta.vectorStores.create({});
		await client.beta.vectorStores.files.createAndPoll(newVectorStore.id, { file_id: fileId });
		vectorStoreToUpdate = newVectorStore.id;
		vectorStoreAction = 'created'; // Update to indicate that vector_store_id was created
	} else if (fileId && vectorStoreId) {
		// Add the fileId to the existing vector store
		await client.beta.vectorStores.files.createAndPoll(vectorStoreId, { file_id: fileId });
	}

	if (vectorStoreToUpdate) {
		// Update the assistant with the vectorStoreId
		await client.beta.assistants.update(assistantId, {
			tool_resources: { file_search: { vector_store_ids: [vectorStoreToUpdate] } },
		});
	}

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

	const memory = (await this.getInputConnectionData(NodeConnectionType.AiMemory, 0)) as
		| BufferWindowMemory
		| undefined;

	const chainValues: IDataObject = {
		content: input,
		signal: this.getExecutionCancelSignal(),
		timeout: options.timeout ?? 10000,
	};

	let thread: OpenAIClient.Beta.Threads.Thread | undefined;

	if (threadIdInput) {
		chainValues.threadId = threadIdInput;
		if (fileId ?? content ?? role) {
			// Add message with file attachment to the existing thread
			await client.beta.threads.messages.create(threadIdInput, {
				role: role as 'assistant',
				content: content as 'Describe what is in this document.',
				attachments: [{ file_id: fileId, tools: [{ type: 'file_search' }] }],
			});
		}
	} else {
		if (memory) {
			const chatMessages = await memory.chatHistory.getMessages();

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
				if (fileId ?? content ?? role) {
					// Include the file attachment in the newly created thread
					await client.beta.threads.messages.create(thread.id, {
						role: role as 'assistant',
						content: content as 'Describe what is in this document.',
						attachments: [{ file_id: fileId, tools: [{ type: 'file_search' }] }],
					});
				}
			}
		}
	}

	let filteredResponse: IDataObject = {};
	try {
		const response = await agentExecutor.withConfig(getTracingConfig(this)).invoke(chainValues);

		// Add vector_store_id and the action performed (created/used) to the response
		response.vectorStoreId = vectorStoreToUpdate;
		response.vectorStoreAction = vectorStoreAction;
		response.fileId = fileId;

		if (memory) {
			await memory.saveContext({ input }, { output: response.output });

			if (response.threadId && response.runId) {
				const threadRun = await client.beta.threads.runs.retrieve(
					response.threadId,
					response.runId,
				);
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
		filteredResponse = omit(response, ['signal', 'timeout']) as IDataObject;
	} catch (error) {
		if (!(error instanceof ApplicationError)) {
			throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
		}
	}

	return [{ json: filteredResponse, pairedItem: { item: i } }];
}
