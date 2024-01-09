/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData } from 'n8n-workflow';
import { XataChatMessageHistory } from 'langchain/stores/message/xata';
import { BufferMemory } from 'langchain/memory';
import { BaseClient } from '@xata.io/client';
import { logWrapper } from '../../../utils/logWrapper';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';
export class MemoryXata implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Xata',
		name: 'memoryXata',
		icon: 'file:xata.svg',
		group: ['transform'],
		version: [1, 1.1],
		description: 'Use Xata Memory',
		defaults: {
			name: 'Xata',
			// eslint-disable-next-line n8n-nodes-base/node-class-description-non-core-color-present
			color: '#1321A7',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Memory'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memoryxata/',
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
				name: 'xataApi',
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
		],
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('xataApi');

		const xataClient = new BaseClient({
			apiKey: credentials.apiKey as string,
			branch: (credentials.branch as string) || 'main',
			databaseURL: credentials.databaseEndpoint as string,
		});

		const sessionId = this.getNodeParameter('sessionId', itemIndex) as string;

		const table = (credentials.databaseEndpoint as string).match(
			/https:\/\/[^.]+\.[^.]+\.xata\.sh\/db\/([^\/:]+)/,
		);

		if (table === null) {
			throw new NodeOperationError(
				this.getNode(),
				'It was not possible to extract the table from the Database Endpoint.',
			);
		}

		const memory = new BufferMemory({
			chatHistory: new XataChatMessageHistory({
				table: table[1],
				sessionId,
				client: xataClient,
				apiKey: credentials.apiKey as string,
			}),
			memoryKey: 'chat_history',
			returnMessages: true,
		});
		return {
			response: logWrapper(memory, this),
		};
	}
}
