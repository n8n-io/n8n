/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData } from 'n8n-workflow';

import { MotorheadMemory } from 'langchain/memory';

export class MemoryMotorhead implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LangChain - Motorhead',
		name: 'memoryMotorhead',
		icon: 'fa:file-export',
		group: ['transform'],
		version: 1,
		description: 'Motorhead Memory',
		defaults: {
			name: 'LangChain - Motorhead',
			color: '#303030',
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
				displayName: 'Memory Key',
				name: 'memoryKey',
				type: 'string',
				default: '',
			},
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
		const memoryKey = this.getNodeParameter('memoryKey', itemIndex) as string;
		const sessionId = this.getNodeParameter('sessionId', itemIndex) as string;

		return {
			// TODO: Does not work yet
			response: new MotorheadMemory({
				memoryKey,
				sessionId,
				url: credentials.host as string,
				clientId: credentials.clientId as string,
				apiKey: credentials.apiKey as string,
			}),
		};
	}
}
