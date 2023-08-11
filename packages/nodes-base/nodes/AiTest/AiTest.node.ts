import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class AiTest implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AiTest',
		name: 'aiTest',
		icon: 'fa:map-signs',
		group: ['transform'],
		version: 1,
		description: 'AI Test node',
		defaults: {
			name: 'AiTest',
			color: '#408000',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: ['main', 'test'],
		inputNames: ['', 'test'],
		outputs: ['main'],
		properties: [],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const data = this.getInputConnectionData(itemIndex, 0, 'test');
			returnData.push({ json: { data } });
		}

		return this.prepareOutputData(returnData);
	}
}
