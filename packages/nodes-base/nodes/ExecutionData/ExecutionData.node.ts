/* eslint-disable n8n-nodes-base/node-class-description-missing-subtitle */
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { getSandboxContext } from '../Code/Sandbox';

export class ExecutionData implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Execution Data',
		name: 'executionData',
		icon: 'fa:list',
		group: ['input'],
		version: 1,
		description: 'Add execution data',
		defaults: {
			name: 'Execution Data',
			color: '#0000FF',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName:
					"Use this node to save fields you want to use later to easily find an execution (e.g. a user ID). You'll be able to search by this data in the 'executions' tab.<br>This feature is available on our Pro and Enterprise plans. <a href='https://n8n.io/pricing/' target='_blank'>More Info</a>",
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				default: 'saveData',
				noDataExpression: true,
				options: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'Save execution data for search',
						value: 'saveData',
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
						operation: ['saveData'],
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
		const context = getSandboxContext.call(this, 0);

		const items = this.getInputData();
		const operations = this.getNodeParameter('operation', 0);

		if (operations === 'saveData') {
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

		return [this.getInputData()];
	}
}
