import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { configuredInputs } from './helpers/util';

export class ModelSelector implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Model Selector',
		name: 'modelSelector',
		icon: 'fa:map-signs',
		defaults: {
			name: 'Model Selector',
		},
		version: 1,
		group: ['transform'],
		description: 'Selects one of the models connected to this node based on the input data',
		inputs: `={{(${configuredInputs})($parameter)}}`,
		outputs: [NodeConnectionTypes.AiLanguageModel],
		requiredInputs: 1,
		properties: [
			{
				displayName: 'Model Index',
				name: 'modelIndex',
				type: 'number',
				required: true,
				default: 0,
			},
			{
				displayName: 'Number Of Models',
				name: 'numberInputs',
				type: 'number',
				required: true,
				default: 2,
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const index = this.getNodeParameter('modelIndex', 0, 0) as number;
		const models = (await this.getInputConnectionData(
			NodeConnectionTypes.AiLanguageModel,
			itemIndex,
		)) as unknown[];

		const pass = this.getNodeParameter('conditions', itemIndex, false, {
			extractValue: true,
		}) as boolean;
		models.reverse(); // Reverse indices to get oldest to newest
		return {
			response: models[index],
		};
	}
}
