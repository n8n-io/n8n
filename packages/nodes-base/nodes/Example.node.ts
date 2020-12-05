import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';


export class Example implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Example',
		name: 'example',
		group: ['input'],
		version: 1,
		description: 'Example',
		defaults: {
			name: 'Example',
			color: '#0000FF',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Age',
				name: 'age',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Brand Name',
				name: 'brandName',
				type: 'string',
				default: '',
			},
		],
	};


	execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();

		if (items.length === 0) {
			items.push({json: {}});
		}

		const returnData: INodeExecutionData[] = [];
		let item: INodeExecutionData;

		for (let i = 0; i < items.length; i++) {
			const age = this.getNodeParameter('age', i) as number | undefined;
			const brandName = this.getNodeParameter('brandName', i) as string | undefined;

			item = items[i];

			const newItem: INodeExecutionData = {
				json: {
					age: age || item.json.age,
					brandName: brandName || item.json.brandName,
				},
			};

			returnData.push(newItem);
		}

		return this.prepareOutputData(returnData);
	}
}
