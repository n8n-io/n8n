/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { Mem0Memory } from '@langchain/community/memory/mem0';
import { InputValues } from '@langchain/core/memory';
import { getSessionId } from '@utils/helpers';
import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';
import type { BufferWindowMemoryInput } from 'langchain/memory';
import { BufferWindowMemory } from 'langchain/memory';
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
	userId?: string;
	runId?: string;
	agentId?: string;
	appId?: string;
	[key: string]: string | undefined;
}

class MemoryMem0Singleton {
	private static instance: MemoryMem0Singleton;

	private mem0Client!: InstanceType<typeof Mem0Memory>;

	private memoryBuffer: Map<
		string,
		{ buffer: BufferWindowMemory; created: Date; last_accessed: Date }
	>;

	private constructor(partialOptions?: Mem0ClientOptions) {
		this.memoryBuffer = new Map();
		this.initializeClient(partialOptions);
	}

	private initializeClient(options?: Mem0ClientOptions) {
		const mem0Options: Mem0ClientOptions = {
			...options,
			apiKey: options?.apiKey ?? '',
			organizationId: options?.organizationId,
			projectId: options?.projectId,
		};

		this.mem0Client = new Mem0Memory({
			apiKey: options?.apiKey ?? '',
			sessionId: options?.userId ?? 'default-session',
			mem0Options,
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

	async addMessage(inputValues: InputValues): Promise<void> {
		await this.mem0Client.saveContext(inputValues, { assistant: 'Thanks for your message' });
	}

	async getMessages(inputValues: InputValues): Promise<string> {
		const messages = await this.mem0Client.loadMemoryVariables(inputValues);
		return (messages.history as string) || '';
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
		credentials: [
			{
				name: 'mem0Api',
				required: true,
			},
		],
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
				name: 'sessionId',
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
		const credentials = await this.getCredentials<{
			apiKey: string;
		}>('mem0Api');

		const contextWindowLength = this.getNodeParameter('contextWindowLength', itemIndex) as number;
		const workflowId = this.getWorkflow().id;
		const userId = (this.getNodeParameter('userId', itemIndex) as string) || undefined;
		const runId = (this.getNodeParameter('runId', itemIndex) as string) || undefined;
		const agentId = (this.getNodeParameter('agentId', itemIndex) as string) || undefined;
		const appId = (this.getNodeParameter('appId', itemIndex) as string) || undefined;
		const projectId = (this.getNodeParameter('projectId', itemIndex) as string) || undefined;
		const orgId = (this.getNodeParameter('orgId', itemIndex) as string) || undefined;
		const searchOnly = (this.getNodeParameter('searchOnly', itemIndex) as boolean) || false;

		const memoryInstance = MemoryMem0Singleton.getInstance({
			apiKey: credentials.apiKey,
			organizationId: orgId,
			projectId,
			userId,
			runId,
			agentId,
			appId,
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

		const inputValues: InputValues = {
			input: inputMessage,
		};

		if (!searchOnly) await memoryInstance.addMessage(inputValues);

		const memoryMessages = await memoryInstance.getMessages(inputValues);

		await memory.chatHistory.addUserMessage(memoryMessages);

		return {
			response: logWrapper(memory, this),
		};
	}
}
