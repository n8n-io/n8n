import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

type DataToSave = {
	values: Array<{ key: string; value: string }>;
};

export class ExecutionData implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Execution Data',
		name: 'executionData',
		icon: 'fa:tasks',
		group: ['input'],
		iconColor: 'light-green',
		version: [1, 1.1],
		description: 'Add execution data for search',
		defaults: {
			name: 'Execution Data',
			color: '#29A568',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName:
					"Save important data using this node. It will be displayed on each execution for easy reference and you can filter by it.<br />Filtering is available on Pro and Enterprise plans. <a href='https://n8n.io/pricing/' target='_blank'>More Info</a>",
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
						name: 'Save Highlight Data (for Search/review)',
						value: 'save',
						action: 'Save Highlight Data (for search/review)',
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
								requiresDataPath: 'single',
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
		hints: [
			{
				type: 'warning',
				message: 'Some keys are longer than 50 characters. They will be truncated.',
				displayCondition: '={{ $parameter.dataToSave.values.some((x) => x.key.length > 50) }}',
				whenToDisplay: 'beforeExecution',
				location: 'outputPane',
			},
			{
				type: 'warning',
				message: 'Some values are longer than 512 characters. They will be truncated.',
				displayCondition: '={{ $parameter.dataToSave.values.some((x) => x.value.length > 512) }}',
				whenToDisplay: 'beforeExecution',
				location: 'outputPane',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const dataProxy = this.getWorkflowDataProxy(0);
		const nodeVersion = this.getNode().typeVersion;

		const items = this.getInputData();
		const operations = this.getNodeParameter('operation', 0);

		const returnData: INodeExecutionData[] = [];

		if (operations === 'save') {
			for (let i = 0; i < items.length; i++) {
				try {
					const dataToSave =
						(this.getNodeParameter('dataToSave', i, {}) as DataToSave).values || [];

					const values = dataToSave.reduce(
						(acc, { key, value }) => {
							const valueToSet = value ? value : nodeVersion >= 1.1 ? '' : value;
							acc[key] = valueToSet;
							return acc;
						},
						{} as { [key: string]: string },
					);

					dataProxy.$execution.customData.setAll(values);

					returnData.push(items[i]);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
							},
							pairedItem: {
								item: i,
							},
						});
						continue;
					}
					throw new NodeOperationError(this.getNode(), error);
				}
			}
		} else {
			return [items];
		}

		return [returnData];
	}
}
