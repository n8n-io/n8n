import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { performOperation } from './GenericFunctions';

export class BlueIris implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'BlueIris',
		name: 'BlueIris',
		icon: 'file:BlueIris.png',
		group: ['input'],
		version: 1,
		description: 'Node to consume BlueIris API',
		defaults: {
			name: 'BlueIris',
			color: '#517db7',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'blueIrisApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'API URL',
				name: 'apiUrl',
				type: 'string',
				required: true,
				description: 'The URL of the API. For example https://yourdomain:81/json',
				default: '',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				default: 'status',
				required: true,
				description: 'Operation to perform. Currently only some read operation are supported',
				options: [
					{
						name: 'Status',
						value: 'status',
						description: 'Get (and optionally set) the state of the shield, active global profile as well as the schedule\'shold/run state and other system vitals',
					},
					{
						name: 'Cameras List',
						value: 'camlist',
						description: 'Returns a list of cameras on the system ordered by group. Cameras not belonging to any' +
							'group are shown beneath the \"all cameras\" group. Disabled cameras are placed at the end of' +
							'the list.',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: IDataObject[] = [];
		const items = this.getInputData();
		const length = items.length as unknown as number;

		for (let i = 0; i < length; i++) {
			try {
				const apiUrl = this.getNodeParameter('apiUrl', i) as string;
				const responseData = await performOperation.call(this, apiUrl);
				returnData.push(responseData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.description });
				} else {
					throw error;
				}
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}

}
