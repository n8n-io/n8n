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
	dhlApiRequest,
} from './GenericFunctions';

export class Dhl implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'DHL',
		name: 'Dhl',
		icon: 'file:dhl.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Consume DHL API',
		defaults: {
			name: 'DHL',
			color: '#fecc00',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'dhlApi',
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
						name: 'Retrieve Tracking Information',
						value: 'retrieveTrackingInformation',
					},
				],
				default: 'retrieveTrackingInformation',
			},
			{
				displayName: 'Tracking Number',
				name: 'trackingNumber',
				type: 'string',
				required: true,
				default: '',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Recipient Postal Code',
						name: 'recipientPostalCode',
						type: 'string',
						default: '',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		let qs: IDataObject = {};
		let responseData;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			try {
				if (operation === 'retrieveTrackingInformation') {

					const trackingNumber = this.getNodeParameter('trackingNumber', i) as string;
					const options = this.getNodeParameter('options', i) as IDataObject;

					qs = {
						trackingNumber,
					};

					Object.assign(qs, options);

					responseData = await dhlApiRequest.call(this, 'GET', `/track/shipments`, {}, qs);

					returnData.push(...responseData.shipments);
				}

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.description });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
