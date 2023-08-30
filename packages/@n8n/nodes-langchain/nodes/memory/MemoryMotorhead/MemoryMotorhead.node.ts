/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData } from 'n8n-workflow';

import { MotorheadMemory } from 'langchain/memory';
import { logWrapper } from '../../../utils/logWrapper';

export class MemoryMotorhead implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Motorhead',
		name: 'memoryMotorhead',
		icon: 'fa:file-export',
		group: ['transform'],
		version: 1,
		description: 'Use Motorhead Memory',
		defaults: {
			name: 'Motorhead',
			color: '#303030',
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
				name: 'motorheadApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Session ID',
				name: 'sessionId',
				type: 'string',
				default: '',
			},
		],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		const credentials = await this.getCredentials('motorheadApi');

		const itemIndex = 0;

		// TODO: Should it get executed once per item or not?
		const sessionId = this.getNodeParameter('sessionId', itemIndex) as string;

		const memory = new MotorheadMemory({
			sessionId,
			url: credentials.host as string,
			clientId: credentials.clientId as string,
			apiKey: credentials.apiKey as string,
			memoryKey: 'chat_history',
			returnMessages: true,
		});

		return {
			response: logWrapper(memory, this),
		};
	}
}
