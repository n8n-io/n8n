/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData } from 'n8n-workflow';
import { ZepMemory } from 'langchain/memory/zep';
import { logWrapper } from '../../../utils/logWrapper';

export class MemoryZep implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zep',
		name: 'memoryZep',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:zep.png',
		group: ['transform'],
		version: 1,
		description: 'Use Zep Memory',
		defaults: {
			name: 'Zep',
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
				name: 'zepApi',
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
		const credentials = (await this.getCredentials('zepApi')) as {
			apiKey?: string;
			apiUrl: string;
		};

		const itemIndex = 0;

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
