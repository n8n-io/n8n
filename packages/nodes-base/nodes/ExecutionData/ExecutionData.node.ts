import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class ExecutionData implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Execution Data',
		name: 'executionData',
		icon: 'fa:tasks',
		group: ['input'],
		iconColor: 'light-green',
		version: 1,
		description: 'Add execution data for search',
		defaults: {
			name: 'Execution Data',
			color: '#29A568',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName:
					"Use this node to save fields you want to use later to easily find an execution (e.g. a user ID). You'll be able to search by this data in the 'executions' tab.<br>This feature is available on our Pro and Enterprise plans. <a href='https://n8n.io/pricing/' target='_blank'>More Info</a>.",
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				default: 'save',
				noDataExpression: true,
				options: [
					{
						name: 'Save Execution Data for Search',
						value: 'save',
						action: 'Save execution data for search',
					},
				],
			},
			{
				displayName: 'Data to Save',
				name: 'dataToSave',
				placeholder: 'Add Saved Field',
				type: 'fixedCollection',
				typeOptions: {
					multipleValueButtonText: 'Add Saved Field',
					multipleValues: true,
				},
				displayOptions: {
					show: {
						operation: ['save'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Values',
						name: 'values',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
								placeholder: 'e.g. myKey',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								placeholder: 'e.g. myValue',
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const context = this.getWorkflowDataProxy(0);

		const items = this.getInputData();
		const operations = this.getNodeParameter('operation', 0);

		if (operations === 'save') {
			for (let i = 0; i < items.length; i++) {
				const dataToSave =
					((this.getNodeParameter('dataToSave', i, {}) as IDataObject).values as IDataObject[]) ||
					[];

				const values = dataToSave.reduce((acc, { key, value }) => {
					acc[key as string] = value;
					return acc;
				}, {} as IDataObject);

				context.$execution.customData.setAll(values);
			}
		}

		return [items];
	}
}
