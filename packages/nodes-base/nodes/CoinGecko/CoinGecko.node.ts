import type { IExecuteFunctions } from 'n8n-core';

import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { coinFields, coinOperations } from './CoinDescription';

import { eventFields, eventOperations } from './EventDescription';

import { coinGeckoApiRequest, coinGeckoRequestAllItems } from './GenericFunctions';

import moment from 'moment-timezone';

export class CoinGecko implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'CoinGecko',
		name: 'coinGecko',
		icon: 'file:coinGecko.svg',
		group: ['output'],
		version: 1,
		description: 'Consume CoinGecko API',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'CoinGecko',
		},
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
						name: 'Coin',
						value: 'coin',
					},
					{
						name: 'Event',
						value: 'event',
					},
				],
				default: 'coin',
			},
			...coinOperations,
			...coinFields,
			...eventOperations,
			...eventFields,
		],
	};

	methods = {
		loadOptions: {
			async getCurrencies(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const currencies = await coinGeckoApiRequest.call(
					this,
					'GET',
					'/simple/supported_vs_currencies',
				);
				currencies.sort();
				for (const currency of currencies) {
					returnData.push({
						name: currency.toUpperCase(),
						value: currency,
					});
				}
				return returnData;
			},

			async getCoins(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const coins = await coinGeckoApiRequest.call(this, 'GET', '/coins/list');
				for (const coin of coins) {
					returnData.push({
						name: coin.symbol.toUpperCase(),
						value: coin.id,
					});
				}
				returnData.sort((a, b) => {
					if (a.name < b.name) {
						return -1;
					}
					if (a.name > b.name) {
						return 1;
					}
					return 0;
				});
				return returnData;
			},

			async getExchanges(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const exchanges = await coinGeckoApiRequest.call(this, 'GET', '/exchanges/list');
				for (const exchange of exchanges) {
					returnData.push({
						name: exchange.name,
						value: exchange.id,
					});
				}
				return returnData;
			},

			async getEventCountryCodes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const countryCodes = await coinGeckoApiRequest.call(this, 'GET', '/events/countries');
				for (const code of countryCodes.data) {
					if (!code.code) {
						continue;
					}
					returnData.push({
						name: code.country,
						value: code.code,
					});
				}
				return returnData;
			},

			async getEventTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const eventTypes = await coinGeckoApiRequest.call(this, 'GET', '/events/types');
				for (const type of eventTypes.data) {
					returnData.push({
						name: type,
						value: type,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'coin') {
					//https://www.coingecko.com/api/documentations/v3#/coins/get_coins__id_
					//https://www.coingecko.com/api/documentations/v3#/contract/get_coins__id__contract__contract_address_
					if (operation === 'get') {
						const options = this.getNodeParameter('options', i);

						qs.community_data = false;
						qs.developer_data = false;
						qs.localization = false;
						qs.market_data = false;
						qs.sparkline = false;
						qs.tickers = false;

						Object.assign(qs, options);

						const searchBy = this.getNodeParameter('searchBy', i) as string;

						if (searchBy === 'coinId') {
							const coinId = this.getNodeParameter('coinId', i) as string;

							responseData = await coinGeckoApiRequest.call(
								this,
								'GET',
								`/coins/${coinId}`,
								{},
								qs,
							);
						}

						if (searchBy === 'contractAddress') {
							const platformId = this.getNodeParameter('platformId', i) as string;
							const contractAddress = this.getNodeParameter('contractAddress', i) as string;

							responseData = await coinGeckoApiRequest.call(
								this,
								'GET',
								`/coins/${platformId}/contract/${contractAddress}`,
								{},
								qs,
							);
						}
					}
					//https://www.coingecko.com/api/documentations/v3#/coins/get_coins_list
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);

						let limit;

						responseData = await coinGeckoApiRequest.call(this, 'GET', '/coins/list', {}, qs);

						if (!returnAll) {
							limit = this.getNodeParameter('limit', i);
							responseData = responseData.splice(0, limit);
						}
					}

					//https://www.coingecko.com/api/documentations/v3#/coins/get_coins_list
					if (operation === 'market') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const baseCurrency = this.getNodeParameter('baseCurrency', i) as string;
						const options = this.getNodeParameter('options', i);

						qs.vs_currency = baseCurrency;

						Object.assign(qs, options);

						if (options.price_change_percentage) {
							qs.price_change_percentage = (options.price_change_percentage as string[]).join(',');
						}

						if (returnAll) {
							responseData = await coinGeckoRequestAllItems.call(
								this,
								'',
								'GET',
								'/coins/markets',
								{},
								qs,
							);
						} else {
							const limit = this.getNodeParameter('limit', i);

							qs.per_page = limit;

							responseData = await coinGeckoApiRequest.call(this, 'GET', '/coins/markets', {}, qs);
						}
					}

					//https://www.coingecko.com/api/documentations/v3#/simple/get_simple_price
					//https://www.coingecko.com/api/documentations/v3#/simple/get_simple_token_price__id_
					if (operation === 'price') {
						const searchBy = this.getNodeParameter('searchBy', i) as string;
						const quoteCurrencies = this.getNodeParameter('quoteCurrencies', i) as string[];
						const options = this.getNodeParameter('options', i);

						qs.vs_currencies = quoteCurrencies.join(',');

						Object.assign(qs, options);

						if (searchBy === 'coinId') {
							const baseCurrencies = this.getNodeParameter('baseCurrencies', i) as string[];

							qs.ids = baseCurrencies.join(',');

							responseData = await coinGeckoApiRequest.call(this, 'GET', '/simple/price', {}, qs);
						}

						if (searchBy === 'contractAddress') {
							const platformId = this.getNodeParameter('platformId', i) as string;
							const contractAddresses = this.getNodeParameter('contractAddresses', i) as string;

							qs.contract_addresses = contractAddresses;

							responseData = await coinGeckoApiRequest.call(
								this,
								'GET',
								`/simple/token_price/${platformId}`,
								{},
								qs,
							);
						}
					}

					//https://www.coingecko.com/api/documentations/v3#/coins/get_coins__id__tickers
					if (operation === 'ticker') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const coinId = this.getNodeParameter('coinId', i) as string;
						const options = this.getNodeParameter('options', i);

						Object.assign(qs, options);

						if (options.exchange_ids) {
							qs.exchange_ids = (options.exchange_ids as string[]).join(',');
						}

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
							const limit = this.getNodeParameter('limit', i);

							responseData = await coinGeckoApiRequest.call(
								this,
								'GET',
								`/coins/${coinId}/tickers`,
								{},
								qs,
							);

							responseData = responseData.tickers;
							responseData = responseData.splice(0, limit);
						}
					}

					//https://www.coingecko.com/api/documentations/v3#/coins/get_coins__id__history
					if (operation === 'history') {
						const coinId = this.getNodeParameter('coinId', i) as string;
						const date = this.getNodeParameter('date', i) as string;
						const options = this.getNodeParameter('options', i);

						Object.assign(qs, options);

						qs.date = moment(date).format('DD-MM-YYYY');

						responseData = await coinGeckoApiRequest.call(
							this,
							'GET',
							`/coins/${coinId}/history`,
							{},
							qs,
						);
					}

					//https://www.coingecko.com/api/documentations/v3#/coins/get_coins__id__market_chart
					//https://www.coingecko.com/api/documentations/v3#/contract/get_coins__id__contract__contract_address__market_chart_
					if (operation === 'marketChart') {
						let respData;

						const searchBy = this.getNodeParameter('searchBy', i) as string;
						const quoteCurrency = this.getNodeParameter('quoteCurrency', i) as string;
						const days = this.getNodeParameter('days', i) as string;

						qs.vs_currency = quoteCurrency;
						qs.days = days;

						if (searchBy === 'coinId') {
							const coinId = this.getNodeParameter('baseCurrency', i) as string;

							respData = await coinGeckoApiRequest.call(
								this,
								'GET',
								`/coins/${coinId}/market_chart`,
								{},
								qs,
							);
						}

						if (searchBy === 'contractAddress') {
							const platformId = this.getNodeParameter('platformId', i) as string;
							const contractAddress = this.getNodeParameter('contractAddress', i) as string;

							respData = await coinGeckoApiRequest.call(
								this,
								'GET',
								`/coins/${platformId}/contract/${contractAddress}/market_chart`,
								{},
								qs,
							);
						}

						responseData = [];
						for (let idx = 0; idx < respData.prices.length; idx++) {
							const [time, price] = respData.prices[idx];
							const marketCaps = respData.market_caps[idx][1];
							const totalVolume = respData.total_volumes[idx][1];
							responseData.push({
								time: moment(time as string).toISOString(),
								price,
								marketCaps,
								totalVolume,
							} as IDataObject);
						}
					}

					//https://www.coingecko.com/api/documentations/v3#/coins/get_coins__id__ohlc
					if (operation === 'candlestick') {
						const baseCurrency = this.getNodeParameter('baseCurrency', i) as string;
						const quoteCurrency = this.getNodeParameter('quoteCurrency', i) as string;
						const days = this.getNodeParameter('days', i) as string;

						qs.vs_currency = quoteCurrency;
						qs.days = days;

						responseData = await coinGeckoApiRequest.call(
							this,
							'GET',
							`/coins/${baseCurrency}/ohlc`,
							{},
							qs,
						);

						for (let idx = 0; idx < responseData.length; idx++) {
							const [time, open, high, low, close] = responseData[idx];
							responseData[idx] = {
								time: moment(time as string).toISOString(),
								open,
								high,
								low,
								close,
							} as IDataObject;
						}
					}
				}

				if (resource === 'event') {
					//https://www.coingecko.com/api/documentations/v3#/events/get_events
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const options = this.getNodeParameter('options', i);

						Object.assign(qs, options);

						if (returnAll) {
							responseData = await coinGeckoRequestAllItems.call(
								this,
								'data',
								'GET',
								'/events',
								{},
								qs,
							);
						} else {
							const limit = this.getNodeParameter('limit', i);

							qs.per_page = limit;

							responseData = await coinGeckoApiRequest.call(this, 'GET', '/events', {}, qs);
							responseData = responseData.data;
						}
					}
				}

				if (resource === 'simple') {
					//https://www.coingecko.com/api/documentations/v3#/simple/get_simple_price
					if (operation === 'price') {
						const ids = this.getNodeParameter('ids', i) as string;
						const currencies = this.getNodeParameter('currencies', i) as string[];
						const options = this.getNodeParameter('options', i);

						qs.ids = ids;
						qs.vs_currencies = currencies.join(',');

						Object.assign(qs, options);

						responseData = await coinGeckoApiRequest.call(this, 'GET', '/simple/price', {}, qs);
					}

					//https://www.coingecko.com/api/documentations/v3#/simple/get_simple_token_price__id_
					if (operation === 'tokenPrice') {
						const id = this.getNodeParameter('id', i) as string;
						const contractAddresses = this.getNodeParameter('contractAddresses', i) as string;
						const currencies = this.getNodeParameter('currencies', i) as string[];
						const options = this.getNodeParameter('options', i);

						qs.contract_addresses = contractAddresses;
						qs.vs_currencies = currencies.join(',');

						Object.assign(qs, options);

						responseData = await coinGeckoApiRequest.call(
							this,
							'GET',
							`/simple/token_price/${id}`,
							{},
							qs,
						);
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject[]),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message, json: {} });
					continue;
				}
				throw error;
			}
		}

		return this.prepareOutputData(returnData);
	}
}
