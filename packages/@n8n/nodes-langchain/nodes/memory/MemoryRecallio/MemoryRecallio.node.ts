import { RecallioMemory as RecallioCommunityMemory } from 'recallio-community';
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

export class MemoryRecallio implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RecallioAI Memory',
		name: 'recallioMemory',
		icon: 'file:recallio-icon.svg',
		group: ['transform'],
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Memory'],
				Memory: ['Other memories'],
			},
		},
		version: 1,
		description: 'Interact with RecallioAI memory API',
		defaults: {
			name: 'RecallioAI Memory',
		},
		inputs: [],
		//outputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionTypes.AiMemory],
		outputNames: ['Memory'],
		credentials: [
			{
				name: 'recallioApi',
				required: true,
			},
		],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
			{
				displayName: 'Project ID',
				name: 'projectId',
				type: 'string',
				default: 'default',
				description: 'Optional project identifier to namespace memories',
			},
			sessionIdOption,
			expressionSessionKeyProperty(1),
			sessionKeyProperty,
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = (await this.getCredentials('recallioApi')) as {
			apiKey: string;
		};

		let sessionId = getSessionId(this, itemIndex);

		//const sessionId = this.getNodeParameter('userId', itemIndex, getSessionId(this, itemIndex)) as string;
		const projectId = this.getNodeParameter('projectId', itemIndex, 'default') as string;

		if (!credentials?.apiKey) {
			throw new NodeOperationError(this.getNode(), 'Missing RecallIO API key');
		}

		const memory = new RecallioCommunityMemory({
			apiKey: credentials.apiKey,
			sessionId,
			projectId,
			// Ensure compatibility with n8n Agents which pass multiple input keys
			inputKey: 'input',
			outputKey: 'output',
			memoryKey: 'chat_history',
		});

		return {
			response: logWrapper(memory, this),
		};
	}
}
