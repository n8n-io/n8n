import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class AiTestConfig implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AiTestConfig',
		name: 'aiTestConfig',
		icon: 'fa:map-signs',
		group: ['transform'],
		version: 1,
		description: 'AI Test node',
		defaults: {
			name: 'AiTest Config',
			color: '#400080',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: ['main', 'tool', 'memory'],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['main', 'tool', 'memory'],
		outputNames: ['Test', 'Tool', 'Memory'],
		properties: [
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				options: [
					{
						name: 'Model 1',
						value: 'model1',
					},
					{
						name: 'Model 2',
						value: 'model2',
					},
				],
				default: 'model1',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Enabled',
				name: 'enabled',
				type: 'boolean',
				default: true,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		return this.prepareOutputData(items);
	}
}
