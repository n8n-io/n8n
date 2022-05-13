import { IExecuteFunctions } from 'n8n-core';

import { IDataObject, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { citrixApiRequest } from './GenericFunctions';

export class Citrix implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Citrix',
		name: 'citrix',
		icon: 'file:citrix.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Citrix API',
		defaults: {
			name: 'Citrix',
		},
		credentials: [
			{
				name: 'citrixApi',
				required: true,
			},
		],
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'First resource',
						value: 'first',
					},
				],
				default: 'first',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'First operation',
						value: 'first',
					},
				],
				default: 'first',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				const { items } = await citrixApiRequest.call(this, 'GET', '/resourcelocations');
				returnData.push(...items);

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.toString() });
					continue;
				}

				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
