/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { getSessionId } from '@utils/helpers';
import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';
import type { BufferWindowMemoryInput } from 'langchain/memory';
import { BufferWindowMemory } from 'langchain/memory';
import { MemoryClient } from 'mem0ai';
import type { SearchOptions, MemoryOptions } from 'mem0ai';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import {
	sessionIdOption,
	sessionKeyProperty,
	contextWindowLengthProperty,
	expressionSessionKeyProperty,
} from '../descriptions';

interface Mem0ClientOptions {
	apiKey: string;
	organizationId?: string;
	projectId?: string;
}

class MemoryMem0Singleton {
	private static instance: MemoryMem0Singleton;

	private mem0Client!: InstanceType<typeof MemoryClient>;

	private memoryBuffer: Map<
		string,
		{ buffer: BufferWindowMemory; created: Date; last_accessed: Date }
	>;

	private constructor(partialOptions?: Mem0ClientOptions) {
		this.memoryBuffer = new Map();
		this.initializeClient(partialOptions);
	}

	private initializeClient(options?: Mem0ClientOptions) {
		this.mem0Client = new MemoryClient({
			apiKey: options?.apiKey ?? '',
			organizationId: options?.organizationId,
			projectId: options?.projectId,
		});
	}

	updateClientConfig(options: Mem0ClientOptions) {
		this.initializeClient(options);
	}

	static getInstance(partialOptions?: Mem0ClientOptions): MemoryMem0Singleton {
		if (!MemoryMem0Singleton.instance) {
			MemoryMem0Singleton.instance = new MemoryMem0Singleton(partialOptions);
		}
		return MemoryMem0Singleton.instance;
	}

	async getMemory(
		sessionKey: string,
		memoryParams: BufferWindowMemoryInput,
	): Promise<BufferWindowMemory> {
		await this.cleanupStaleBuffers();

		let memoryInstance = this.memoryBuffer.get(sessionKey);
		if (memoryInstance) {
			memoryInstance.last_accessed = new Date();
		} else {
			const newMemory = new BufferWindowMemory(memoryParams);

			memoryInstance = {
				buffer: newMemory,
				created: new Date(),
				last_accessed: new Date(),
			};
			this.memoryBuffer.set(sessionKey, memoryInstance);
		}
		return memoryInstance.buffer;
	}

	private async cleanupStaleBuffers(): Promise<void> {
		const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

		for (const [key, memoryInstance] of this.memoryBuffer.entries()) {
			if (memoryInstance.last_accessed < oneHourAgo) {
				await this.memoryBuffer.get(key)?.buffer.clear();
				this.memoryBuffer.delete(key);
			}
		}
	}

	async addMessage(inputMessage: string, options: MemoryOptions = {}): Promise<void> {
		await this.mem0Client.add(
			[
				{
					role: 'user',
					content: inputMessage,
				},
			],
			options,
		);
	}

	async getMessages(inputMessage: string, options: SearchOptions = {}): Promise<string> {
		const messages = await this.mem0Client.search(inputMessage, options);
		let outputMessage =
			'THESE ARE THE MEMORY RELATED TO THE USER, YOU HAVE ANSWER THE QUERY BASED ON THESE MEMORIES: \n';
		for (const message of messages) {
			outputMessage += message.memory + '\n';
		}
		return outputMessage;
	}
}

export class MemoryMem0 implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mem0',
		name: 'memoryMem0',
		icon: 'file:mem0.svg',
		iconColor: 'black',
		group: ['transform'],
		version: [1, 1.1, 1.2, 1.3],
		description: 'Stores in n8n memory, so no credentials required',
		defaults: {
			name: 'Mem0',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Memory'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorymem0/',
					},
				],
			},
		},
		inputs: [],
		outputs: [NodeConnectionTypes.AiMemory],
		outputNames: ['Memory'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
			{
				displayName: 'Session Key',
				name: 'sessionKey',
				type: 'string',
				default: 'chat_history',
				description: 'The key to use to store the memory in the workflow data',
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
			},
			{
				displayName: 'Session ID',
				name: 'sessionKey',
				type: 'string',
				default: '={{ $json.sessionId }}',
				description: 'The key to use to store the memory',
				displayOptions: {
					show: {
						'@version': [1.1],
					},
				},
			},
			{
				displayName: 'Mem0 API Key',
				name: 'mem0ApiKey',
				type: 'string',
				typeOptions: { password: true },
				default: 'm0-S9JiOagPF4TYyl0diZMlj8TtkQNbQmRd5s3FYo5Y',
				description: 'The API key to use to connect to Mem0',
			},
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'string',
				default: 'n8n-default-user',
				description: 'Unique identifier for the user',
			},
			{
				displayName: 'Search Only',
				name: 'searchOnly',
				type: 'boolean',
				default: false,
				description: 'Whether to enable search only mode or do a search and add to memory',
			},
			{
				displayName: 'Run ID',
				name: 'runId',
				type: 'string',
				default: '',
				description: 'Unique identifier for the run session',
			},
			{
				displayName: 'Agent ID',
				name: 'agentId',
				type: 'string',
				default: '',
				description: 'Identifier for the agent',
			},
			{
				displayName: 'App ID',
				name: 'appId',
				type: 'string',
				default: '',
				description: 'Identifier for the application',
			},
			{
				displayName: 'Project ID',
				name: 'projectId',
				type: 'string',
				default: '',
				description: 'Identifier for the project',
			},
			{
				displayName: 'Organization ID',
				name: 'orgId',
				type: 'string',
				default: '',
				description: 'Identifier for the organization',
			},
			{
				...sessionIdOption,
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.2 } }],
					},
				},
			},
			expressionSessionKeyProperty(1.3),
			sessionKeyProperty,
			contextWindowLengthProperty,
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const contextWindowLength = this.getNodeParameter('contextWindowLength', itemIndex) as number;
		const workflowId = this.getWorkflow().id;
		const mem0ApiKey = (this.getNodeParameter('mem0ApiKey', itemIndex) as string) || undefined;
		const userId = (this.getNodeParameter('userId', itemIndex) as string) || undefined;
		const runId = (this.getNodeParameter('runId', itemIndex) as string) || undefined;
		const agentId = (this.getNodeParameter('agentId', itemIndex) as string) || undefined;
		const appId = (this.getNodeParameter('appId', itemIndex) as string) || undefined;
		const projectId = (this.getNodeParameter('projectId', itemIndex) as string) || undefined;
		const orgId = (this.getNodeParameter('orgId', itemIndex) as string) || undefined;
		const searchOnly = (this.getNodeParameter('searchOnly', itemIndex) as boolean) || false;

		const memoryInstance = MemoryMem0Singleton.getInstance({
			apiKey: mem0ApiKey ?? '',
			organizationId: orgId,
			projectId,
		});

		const nodeVersion = this.getNode().typeVersion;

		let sessionId;

		if (nodeVersion >= 1.2) {
			sessionId = getSessionId(this, itemIndex);
		} else {
			sessionId = this.getNodeParameter('sessionKey', itemIndex) as string;
		}

		const memory = await memoryInstance.getMemory(`${workflowId}__${sessionId}`, {
			k: contextWindowLength,
			inputKey: 'input',
			memoryKey: 'chat_history',
			outputKey: 'output',
			returnMessages: true,
		});

		// @ts-ignore
		const inputMessage = (this?.inputData?.main[0][0]?.json?.chatInput as string) || '';

		const memoryOptions = {
			user_id: userId,
			run_id: runId,
			agent_id: agentId,
			app_id: appId,
		};

		if (!searchOnly) {
			await memoryInstance.addMessage(inputMessage, memoryOptions);
		}
		const memoryMessages = await memoryInstance.getMessages(inputMessage, memoryOptions);

		await memory.chatHistory.addUserMessage(memoryMessages);

		return {
			response: logWrapper(memory, this),
		};
	}
}
