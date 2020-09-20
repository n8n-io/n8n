import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';

import {
	coinOperations,
	coinFields,
} from './CoinDescription';

import {
	simpleOperations,
	simpleFields,
} from './SimpleDescription';

import {
	coinGeckoApiRequest,
	coinGeckoRequestAllItems,
} from './GenericFunctions';

import * as moment from 'moment-timezone';

export class CoinGecko implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'CoinGecko',
		name: 'coinGecko',
		icon: 'file:coinGecko.png',
		group: ['output'],
		version: 1,
		description: 'Consume CoinGecko API',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'CoinGecko',
			color: '#8bc53f',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Coin',
						value: 'coin',
					},
					{
						name: 'Simple',
						value: 'simple',
					},
				],
				default: 'coin',
			},
			...coinOperations,
			...coinFields,
			...simpleOperations,
			...simpleFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			if (resource === 'coin') {
				//https://www.coingecko.com/api/documentations/v3#/coins/get_coins__id_
				if (operation === 'get') {

					const coinId = this.getNodeParameter('coinId', i) as string;

					const options = this.getNodeParameter('options', i) as IDataObject;

					Object.assign(qs, options);

					responseData = await coinGeckoApiRequest.call(
						this,
						'GET',
						`/coins/${coinId}`,
						{},
						qs
					);
				}
				//https://www.coingecko.com/api/documentations/v3#/coins/get_coins_list
				if (operation === 'getAll') {

					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					let limit;

					responseData = await coinGeckoApiRequest.call(
						this,
						'GET',
						`/coins/list`,
						{},
						qs
					);

					if (returnAll === false) {
						limit = this.getNodeParameter('limit', i) as number;
						responseData = responseData.splice(0, limit);
					}
				}

				//https://www.coingecko.com/api/documentations/v3#/coins/get_coins_list
				if (operation === 'market') {

					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					const currency = this.getNodeParameter('currency', i) as string;

					const options = this.getNodeParameter('options', i) as IDataObject;

					qs.vs_currency = currency;

					Object.assign(qs, options);

					if (returnAll) {

						responseData = await coinGeckoRequestAllItems.call(
							this,
							'',
							'GET',
							`/coins/markets`,
							{},
							qs
						);
					} else {
						const limit = this.getNodeParameter('limit', i) as number;

						qs.per_page = limit;

						responseData = await coinGeckoApiRequest.call(
							this,
							'GET',
							`/coins/markets`,
							{},
							qs
						);
					}
				}

				//https://www.coingecko.com/api/documentations/v3#/coins/get_coins__id__tickers
				if (operation === 'ticker') {

					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					const coinId = this.getNodeParameter('coinId', i) as string;

					const options = this.getNodeParameter('options', i) as IDataObject;

					Object.assign(qs, options);

					if (returnAll) {

						responseData = await coinGeckoRequestAllItems.call(
							this,
							'tickers',
							'GET',
							`/coins/${coinId}/tickers`,
							{},
							qs,
						);
					} else {
						const limit = this.getNodeParameter('limit', i) as number;

						responseData = await coinGeckoApiRequest.call(
							this,
							'GET',
							`/coins/${coinId}/tickers`,
							{},
							qs
						);

						responseData = responseData.tickers;

						responseData = responseData.splice(0, limit);
					}
				}

				//https://www.coingecko.com/api/documentations/v3#/coins/get_coins__id__history
				if (operation === 'history') {

					const coinId = this.getNodeParameter('coinId', i) as string;

					const date = this.getNodeParameter('date', i) as string;

					const options = this.getNodeParameter('options', i) as IDataObject;

					Object.assign(qs, options);

					qs.date = moment(date).format('DD-MM-YYYY');

					responseData = await coinGeckoApiRequest.call(
						this,
						'GET',
						`/coins/${coinId}/history`,
						{},
						qs
					);
				}

				//https://www.coingecko.com/api/documentations/v3#/coins/get_coins__id__market_chart
				if (operation === 'marketChart') {

					const coinId = this.getNodeParameter('coinId', i) as string;

					const currency = this.getNodeParameter('currency', i) as string;

					const days = this.getNodeParameter('days', i) as string;

					qs.vs_currency = currency;

					qs.days = days;

					responseData = await coinGeckoApiRequest.call(
						this,
						'GET',
						`/coins/${coinId}/market_chart`,
						{},
						qs
					);
				}
			}

			if (resource === 'simple') {
				//https://www.coingecko.com/api/documentations/v3#/simple/get_simple_price
				if (operation === 'price') {

					const ids = this.getNodeParameter('ids', i) as string;

					const currencies = this.getNodeParameter('currencies', i) as string;

					const options = this.getNodeParameter('options', i) as IDataObject;

					qs.ids = ids,

					qs.vs_currencies = currencies;

					Object.assign(qs, options);

					responseData = await coinGeckoApiRequest.call(
						this,
						'GET',
						'/simple/price',
						{},
						qs
					);
				}

				//https://www.coingecko.com/api/documentations/v3#/simple/get_simple_token_price__id_
				if (operation === 'tokenPrice') {

					const id = this.getNodeParameter('id', i) as string;

					const contractAddresses = this.getNodeParameter('contractAddresses', i) as string;

					const currencies = this.getNodeParameter('currencies', i) as string;

					const options = this.getNodeParameter('options', i) as IDataObject;

					qs.contract_addresses = contractAddresses;

					qs.vs_currencies = currencies;

					Object.assign(qs, options);

					responseData = await coinGeckoApiRequest.call(
						this,
						'GET',
						`/simple/token_price/${id}`,
						{},
						qs
					);
				}
			}
		}
		if (Array.isArray(responseData)) {
			returnData.push.apply(returnData, responseData as IDataObject[]);
		} else if (responseData !== undefined) {
			returnData.push(responseData as IDataObject);
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
