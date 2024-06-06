/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
	NodeOperationError,
} from 'n8n-workflow';
import { ZepCloudMemory } from '@langchain/community/memory/zep_cloud';
import { ZepCloudChatMessageHistory } from '@langchain/community/stores/message/zep_cloud';
import { logWrapper } from '../../../utils/logWrapper';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';
import { sessionIdOption, sessionKeyProperty } from '../descriptions';
import { getSessionId } from '../../../utils/helpers';

export class MemoryZepCloud implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zep Cloud',
		name: 'memoryZepCloud',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:zep_cloud.png',
		group: ['transform'],
		version: [1, 1.1, 1.2],
		description: 'Use Zep Cloud Memory',
		defaults: {
			name: 'Zep',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Memory'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memoryzep/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiMemory],
		outputNames: ['Memory'],
		credentials: [
			{
				name: 'zepCloudApi',
				required: true,
			},
		],
		properties: [
			getConnectionHintNoticeField([NodeConnectionType.AiAgent]),
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
			sessionKeyProperty,
		],
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = (await this.getCredentials('zepCloudApi')) as {
			apiKey?: string;
			apiUrl: string;
		};

		const nodeVersion = this.getNode().typeVersion;

		let sessionId;

		if (nodeVersion >= 1.2) {
			sessionId = getSessionId(this, itemIndex);
		} else {
			sessionId = this.getNodeParameter('sessionId', itemIndex) as string;
		}

		if (!credentials.apiKey) {
			throw new NodeOperationError(
				this.getNode(),
				'No API key found. Please enter your API key in the credentials of the node.',
			);
		}

		console.log('sessionId', sessionId);

		const memory = new ZepCloudMemory({
			sessionId,
			apiKey: credentials.apiKey,
			memoryType: 'perpetual',
			memoryKey: 'chat_history',
			returnMessages: true,
			inputKey: 'input',
			outputKey: 'output',
		});

		console.log('memory.sessionId', memory.sessionId);

		// Need to add ZepCloudChatMessageHistory to memory because MemoryManager expects it
		memory.chatHistory = new ZepCloudChatMessageHistory({
			client: memory.zepClient,
			sessionId: memory.sessionId,
			memoryType: memory.memoryType,
		});

		return {
			response: logWrapper(memory, this),
		};
	}
}
