import type { BaseChatMemory } from '@langchain/community/dist/memory/chat_memory';
import { ZepMemory } from '@langchain/community/memory/zep';
import { ZepCloudMemory } from '@langchain/community/memory/zep_cloud';
import type { InputValues, MemoryVariables } from '@langchain/core/memory';
import type { BaseMessage } from '@langchain/core/messages';
import {
	NodeConnectionTypes,
	type ISupplyDataFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
	NodeOperationError,
} from 'n8n-workflow';

import { getSessionId } from '@utils/helpers';
import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

import { expressionSessionKeyProperty, sessionIdOption, sessionKeyProperty } from '../descriptions';

// Extend ZepCloudMemory to trim white space in messages.
class WhiteSpaceTrimmedZepCloudMemory extends ZepCloudMemory {
	override async loadMemoryVariables(values: InputValues): Promise<MemoryVariables> {
		const memoryVariables = await super.loadMemoryVariables(values);
		memoryVariables.chat_history = memoryVariables.chat_history.filter((m: BaseMessage) =>
			m.content.toString().trim(),
		);
		return memoryVariables;
	}
}

export class MemoryZep implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zep',
		name: 'memoryZep',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:zep.png',
		group: ['transform'],
		version: [1, 1.1, 1.2, 1.3],
		description: 'Use Zep Memory',
		defaults: {
			name: 'Zep',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memoryzep/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiMemory],
		outputNames: ['Memory'],
		credentials: [
			{
				name: 'zepApi',
				required: true,
			},
		],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
			{
				displayName: 'Only works with Zep Cloud and Community edition <= v0.27.2',
				name: 'supportedVersions',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Session ID',
				name: 'sessionId',
				type: 'string',
				required: true,
				default: '',
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
			apiKey?: string;
			apiUrl?: string;
			cloud?: boolean;
		}>('zepApi');

		const nodeVersion = this.getNode().typeVersion;

		let sessionId;

		if (nodeVersion >= 1.2) {
			sessionId = getSessionId(this, itemIndex);
		} else {
			sessionId = this.getNodeParameter('sessionId', itemIndex) as string;
		}

		let memory: BaseChatMemory;

		if (credentials.cloud) {
			if (!credentials.apiKey) {
				throw new NodeOperationError(this.getNode(), 'API key is required to use Zep Cloud');
			}
			memory = new WhiteSpaceTrimmedZepCloudMemory({
				sessionId,
				apiKey: credentials.apiKey,
				memoryType: 'perpetual',
				memoryKey: 'chat_history',
				returnMessages: true,
				inputKey: 'input',
				outputKey: 'output',
				separateMessages: false,
			});
		} else {
			if (!credentials.apiUrl) {
				throw new NodeOperationError(this.getNode(), 'API url is required to use Zep Open Source');
			}
			memory = new ZepMemory({
				sessionId,
				baseURL: credentials.apiUrl,
				apiKey: credentials.apiKey,
				memoryKey: 'chat_history',
				returnMessages: true,
				inputKey: 'input',
				outputKey: 'output',
			});
		}

		return {
			response: logWrapper(memory, this),
		};
	}
}
