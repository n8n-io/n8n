/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData } from 'n8n-workflow';
import { XataChatMessageHistory } from 'langchain/stores/message/xata';
import { BufferMemory } from 'langchain/memory';
import { BaseClient } from '@xata.io/client';
import { logWrapper } from '../../../utils/logWrapper';

export class MemoryXata implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Xata',
		name: 'memoryXata',
		icon: 'file:xata.svg',
		group: ['transform'],
		version: 1,
		description: 'Use Xata Memory',
		defaults: {
			name: 'Xata',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Memory'],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['memory'],
		outputNames: ['Memory'],
		credentials: [
			{
				name: 'xataApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Session ID',
				name: 'sessionId',
				type: 'string',
				required: true,
				default: '',
			},
		],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		const credentials = await this.getCredentials('xataApi');

		const itemIndex = 0;

		const xataClient = new BaseClient({
			apiKey: credentials.apiKey as string,
			branch: (credentials.branch as string) || 'main',
			databaseURL: credentials.databaseEndpoint as string,
		});

		// TODO: Should it get executed once per item or not?
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
