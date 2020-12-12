import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	brandfetchApiRequest,
} from './GenericFunctions';

export class Brandfetch implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Brandfetch',
		name: 'Brandfetch',
		icon: 'file:brandfetch.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Consume Brandfetch API',
		defaults: {
			name: 'Brandfetch',
			color: '#1f1f1f',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'brandfetchApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Logo',
						value: 'logo',
						description: 'Return a company\'s logo & icon',
					},
					{
						name: 'Color',
						value: 'color',
						description: 'Return a company\'s colors',
					},
					{
						name: 'Font',
						value: 'font',
						description: 'Return a company\'s fonts',
					},
					{
						name: 'Company',
						value: 'company',
						description: 'Return a company\'s data',
					},
					{
						name: 'Industry',
						value: 'industry',
						description: 'Return a company\'s industry',
					},
				],
				default: 'logo',
				description: 'The operation to perform',
			},
			// ----------------------------------
			//         All
			// ----------------------------------
			{
				displayName: 'Domain',
				name: 'domain',
				type: 'string',
				default: '',
				description: 'The domain name of the company',
				required: true,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = items.length as unknown as number;

		const operation = this.getNodeParameter('operation', 0) as string;
		const responseData = [];
		for (let i = 0; i < length; i++) {
			if (operation === 'logo') {
				const domain = this.getNodeParameter('domain', i) as string;

				const body: IDataObject = {
					domain,
				};

				const response = await brandfetchApiRequest.call(this, 'POST', `/logo`, body);
				responseData.push(response.response);
			}
			if (operation === 'color') {
				const domain = this.getNodeParameter('domain', i) as string;

				const body: IDataObject = {
					domain,
				};

				const response = await brandfetchApiRequest.call(this, 'POST', `/color`, body);
				responseData.push(response.response);
			}
			if (operation === 'font') {
				const domain = this.getNodeParameter('domain', i) as string;

				const body: IDataObject = {
					domain,
				};

				const response = await brandfetchApiRequest.call(this, 'POST', `/font`, body);
				responseData.push(response.response);
			}
			if (operation === 'company') {
				const domain = this.getNodeParameter('domain', i) as string;

				const body: IDataObject = {
					domain,
				};

				const response = await brandfetchApiRequest.call(this, 'POST', `/company`, body);
				responseData.push(response.response);
			}
			if (operation === 'industry') {
				const domain = this.getNodeParameter('domain', i) as string;

				const body: IDataObject = {
					domain,
				};

				const response = await brandfetchApiRequest.call(this, 'POST', `/industry`, body);
				responseData.push(response.response);
			}
		}
		return [this.helpers.returnJsonArray(responseData)];
	}
}
