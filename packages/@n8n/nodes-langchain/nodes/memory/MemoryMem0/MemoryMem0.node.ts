/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { Mem0Memory } from '@langchain/community/memory/mem0';
import type { BaseChatMemory } from '@langchain/community/dist/memory/chat_memory';
import type { InputValues, MemoryVariables } from '@langchain/core/memory';
import { SystemMessage } from '@langchain/core/messages';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { getSessionId } from '@utils/helpers';
import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

import { sessionIdOption, sessionKeyProperty, expressionSessionKeyProperty } from '../descriptions';

class Mem0AugmentedMemory {
	constructor(
		private base: BaseChatMemory,
		private mem0: InstanceType<typeof Mem0Memory>,
	) {}

	memoryKey = 'chat_history';
	inputKey = 'input';
	outputKey = 'output';
	returnMessages = true;

	get chatHistory() {
		return this.base.chatHistory;
	}

	async loadMemoryVariables(values: InputValues): Promise<MemoryVariables> {
		const baseVars = await this.base.loadMemoryVariables(values);
		try {
			const mem0Vars: any = await this.mem0.loadMemoryVariables(values);
			console.log(mem0Vars);
			const summary: string = typeof mem0Vars?.history === 'string' ? mem0Vars.history : '';
			if (summary && summary.trim()) {
				const extra = new SystemMessage(`Relevant memories: ${summary}`);
				const existing = Array.isArray((baseVars as any).chat_history)
					? ((baseVars as any).chat_history as any[])
					: [];
				return { ...baseVars, chat_history: [...existing, extra] };
			}
		} catch {}
		return baseVars;
	}

	async saveContext(inputValues: InputValues, outputValues: InputValues): Promise<void> {
		await Promise.allSettled([
			this.base.saveContext(inputValues, outputValues),
			this.mem0.saveContext(inputValues, outputValues),
		]);
	}

	async clear(): Promise<void> {
		await Promise.allSettled([
			this.base.clear(),
			// @ts-expect-error optional clear in some memories
			this.mem0.clear?.() ?? Promise.resolve(),
		]);
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
		description: 'Augment an existing memory with Mem0 retrieval',
		defaults: {
			name: 'Mem0',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Memory'],
				Memory: ['Other memories'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorymem0/',
					},
				],
			},
		},

		inputs: [
			{
				displayName: 'Memory',
				maxConnections: 1,
				required: true,
				type: NodeConnectionTypes.AiMemory,
			},
		],

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
				displayName: 'Run ID',
				name: 'runId',
				type: 'string',
				default: '',
				description: 'Optional: Identifier for the run session',
			},
			{
				displayName: 'Agent ID',
				name: 'agentId',
				type: 'string',
				default: '',
				description: 'Optional: Identifier for the agent',
			},
			{
				displayName: 'App ID',
				name: 'appId',
				type: 'string',
				default: '',
				description: 'Optional: Identifier for the application',
			},
			{
				displayName: 'Async Mode Addition',
				name: 'asyncModeAddition',
				type: 'boolean',
				default: true,
				description: 'Optional: Addition to the async mode',
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
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials<{
			apiKey: string;
			userId: string;
		}>('mem0Api');

		const baseMemory = (await this.getInputConnectionData(
			NodeConnectionTypes.AiMemory,
			itemIndex,
		)) as BaseChatMemory;

		const nodeVersion = this.getNode().typeVersion;
		let sessionId: string;
		if (nodeVersion >= 1.2) {
			sessionId = getSessionId(this, itemIndex);
		} else {
			sessionId = this.getNodeParameter('sessionKey', itemIndex) as string;
		}

		const asyncModeAddition = this.getNodeParameter('asyncModeAddition', itemIndex) as boolean;
		const runId = (this.getNodeParameter('runId', itemIndex) as string) || undefined;
		const agentId = (this.getNodeParameter('agentId', itemIndex) as string) || undefined;
		const appId = (this.getNodeParameter('appId', itemIndex) as string) || undefined;

		const mem0 = new Mem0Memory({
			apiKey: credentials.apiKey,
			sessionId: credentials.userId || 'default-session',
			memoryKey: 'chat_history',
			returnMessages: true,
			inputKey: 'input',
			outputKey: 'output',
			mem0Options: {
				apiKey: credentials.apiKey,
				runId,
				agentId,
				appId,
				sessionId,
				async_mode: asyncModeAddition,
			},
		} as any);

		const wrapped = new Mem0AugmentedMemory(baseMemory, mem0);
		return { response: logWrapper(wrapped as unknown as BaseChatMemory, this) };
	}
}
