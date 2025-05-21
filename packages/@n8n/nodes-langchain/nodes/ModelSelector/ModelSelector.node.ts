import {
    NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
    type ISupplyDataFunctions,
    type SupplyData,
} from 'n8n-workflow';

export class ModelSelector implements INodeType {
	description: INodeTypeDescription = {
		displayName: "Model Selector",
		name: "modelSelector",
		icon: 'fa:map-signs',
		defaults: {
			name: 'Model Selector',
		},
		version: 1,
		group: ["transform" ],
		description: "Selects one of the models connected to this node based on the input data",
		inputs: [NodeConnectionTypes.AiLanguageModel],
		outputs: [NodeConnectionTypes.AiLanguageModel],
		properties: [
			{
				displayName: 'Model Index',
				name: 'modelIndex',
				type: 'number',
				default: 0
			}

		]

	}

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const index = this.getNodeParameter('modelIndex', 0, 0) as number;
		return await this.getInputConnectionData(NodeConnectionTypes.AiLanguageModel, itemIndex, index) as SupplyData;
	}

}
