/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
} from 'n8n-workflow';
import { Calculator } from '@langchain/community/tools/calculator';
import { logWrapper } from '../../../utils/logWrapper';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';

export class ToolCalculator implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Calculator',
		name: 'toolCalculator',
		icon: 'fa:calculator',
		group: ['transform'],
		version: 1,
		description: 'Make it easier for AI agents to perform arithmetic',
		defaults: {
			name: 'Calculator',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolcalculator/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiTool],
		outputNames: ['Tool'],
		properties: [getConnectionHintNoticeField([NodeConnectionType.AiAgent])],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		return {
			response: logWrapper(new Calculator(), this),
		};
	}
}
