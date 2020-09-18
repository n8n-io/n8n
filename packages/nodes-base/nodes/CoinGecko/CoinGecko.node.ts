import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';
import { OptionsWithUri } from 'request';
import {
	coinResources,
	coinFields
} from './CoinDescription';
import {
	simpleResources,
	simpleFields
} from './SimpleDescription';

export class CoinGecko implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'CoinGecko',
		name: 'coinGecko',
		icon: 'file:coinGecko.png',
		group: ['output'],
		version: 1,
		description: 'Retrieve data from CoinGecko',
		defaults: {
			name: 'CoinGecko',
			color: '#8bc53f',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Context',
				name: 'context',
				type: 'options',
				options: [
					{
						name: 'Simple',
						value: 'simple',
					},
					{
						name: 'Coin',
						value: 'coins',
					}					
				],
				default: 'coins',
				description: 'Context of element to retreive',
			},
			...simpleResources,
			...simpleFields,
			...coinResources,
			...coinFields,
		]
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const baseUrl = 'https://api.coingecko.com';
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const context = this.getNodeParameter('context', 0) as string;
		const resource = this.getNodeParameter('resource', 0) as string;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			let responseData;
			const qs: IDataObject = {};
			// Build API endpoint
			let endpoint: string = `/${context}/${resource}`;
			endpoint = endpoint.replace('<id>', this.getNodeParameter('id', itemIndex, '') as string);
			// Inject mandatory parameters
			const params = Object.assign({}, this.getNode().parameters);
			delete params.context;
			delete params.resource;
			Object.assign(qs, params);
			// Inject options parameters
			Object.assign(qs, this.getNodeParameter('options', itemIndex, {}) as IDataObject);

			// Custom pre-processing
			if (context === 'coins' && resource === '<id>/history') {
				let date = new Date(qs.date as string);
				qs.date = date.getDate() + '-' + (date.getMonth() + 1) + '-' + date.getFullYear();
			}

			// Call API
			const reqOptions: OptionsWithUri = {
				method: 'GET',
				qs: qs,
				uri: `${baseUrl}/api/v3${endpoint}`,
				json: true
			};
			try {
				responseData = await this.helpers.request!(reqOptions);
			} catch (error) {
				if (error.response && error.response.body && error.response.body.error) {
					throw new Error(`[HTTP ${error.statusCode}] ${error.response.body.error}`);
				}
				throw error;
			}

			// Custom post-processing
			if (context === 'coins' && resource === '<id>/ohlc') {
				for (let i = 0; i < responseData.length; i++) {
					const [time, open, high, low, close] = responseData[i];
					responseData[i] = {time, open, high, low, close} as IDataObject;
				}
			}

			// Format output
			if (Array.isArray(responseData)) {
				for (let i = 0; i < responseData.length; i++) {
					if (typeof responseData[i] !== "object") {
						returnData.push({value: responseData[i]} as IDataObject);
					} else {
						returnData.push(responseData[i] as IDataObject);
					}
				}
			} else {
				if (Object.keys(responseData).length > 0) {
					returnData.push(responseData as IDataObject);
				}
			}
		}

		return [this.helpers.returnJsonArray(returnData)];

	}
}
