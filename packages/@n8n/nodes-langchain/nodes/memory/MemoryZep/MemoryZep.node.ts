/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
} from 'n8n-workflow';
import { ZepMemory } from 'langchain/memory/zep';
import { logWrapper } from '../../../utils/logWrapper';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';

export class MemoryZep implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zep',
		name: 'memoryZep',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:zep.png',
		group: ['transform'],
		version: [1, 1.1],
		description: 'Use Zep Memory',
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
				name: 'zepApi',
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
		const credentials = (await this.getCredentials('zepApi')) as {
			apiKey?: string;
			apiUrl: string;
		};

		// TODO: Should it get executed once per item or not?
		const sessionId = this.getNodeParameter('sessionId', itemIndex) as string;

		const memory = new ZepMemory({
			sessionId,
			baseURL: credentials.apiUrl,
			apiKey: credentials.apiKey,
			memoryKey: 'chat_history',
			returnMessages: true,
			inputKey: 'input',
			outputKey: 'output',
		});

		return {
			response: logWrapper(memory, this),
		};
	}
}
