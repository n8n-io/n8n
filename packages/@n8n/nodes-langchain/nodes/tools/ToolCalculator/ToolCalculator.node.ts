/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData } from 'n8n-workflow';
import { Calculator } from 'langchain/tools/calculator';
import { logWrapper } from '../../../utils/logWrapper';

export class ToolCalculator implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LangChain - Calculator',
		name: 'toolCalculator',
		icon: 'fa:calculator',
		group: ['transform'],
		version: 1,
		description: 'Calculator',
		defaults: {
			name: 'LangChain - Calculator',
			color: '#400080',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['tool'],
		outputNames: ['Tool'],
		properties: [],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		return {
			response: logWrapper(new Calculator(), this),
		};
	}
}
