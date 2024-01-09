/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
} from 'n8n-workflow';

import { MotorheadMemory } from 'langchain/memory';
import { logWrapper } from '../../../utils/logWrapper';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';

export class MemoryMotorhead implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Motorhead',
		name: 'memoryMotorhead',
		icon: 'fa:file-export',
		group: ['transform'],
		version: [1, 1.1],
		description: 'Use Motorhead Memory',
		defaults: {
			name: 'Motorhead',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Memory'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorymotorhead/',
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
				name: 'motorheadApi',
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
		const credentials = await this.getCredentials('motorheadApi');

		const sessionId = this.getNodeParameter('sessionId', itemIndex) as string;

		const memory = new MotorheadMemory({
			sessionId,
			url: `${credentials.host as string}/motorhead`,
			clientId: credentials.clientId as string,
			apiKey: credentials.apiKey as string,
			memoryKey: 'chat_history',
			returnMessages: true,
		});

		await memory.init();

		return {
			response: logWrapper(memory, this),
		};
	}
}
