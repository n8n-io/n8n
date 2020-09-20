import {
	INodeProperties,
} from 'n8n-workflow';

export const coinOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'coin',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get current data for a coin',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all coins',
			},
			{
				name: 'Ticker',
				value: 'ticker',
				description: 'Get coin tickers',
			},
			{
				name: 'History',
				value: 'history',
				description: 'Get historical data (name, price, market, stats) at a given date for a coin',
			},
			{
				name: 'Market Chart',
				value: 'marketChart',
				description: 'Get historical market data include price, market cap, and 24h volume (granularity auto)',
			},
			{
				name: 'Market',
				value: 'market',
				description: 'Get all supported coins price, market cap, volume, and market related data',
			},
		],
		default: 'getAll',
		description: 'The resource to retreive',
	},
] as INodeProperties[];

export const coinFields = [
	{
		displayName: 'Coin ID',
		name: 'coinId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'get',
					'ticker',
					'history',
					'marketChart'
				],
				resource: [
					'coin',
				],
			},
		},
		default: '',
		description: 'Coin ID',
	},
	{
		displayName: 'Currency',
		name: 'currency',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'market',
					'marketChart'
				],
				resource: [
					'coin',
				],
			},
		},
		placeholder: 'usd',
		default: '',
		description: 'The target currency of market data (usd, eur, jpy, etc.)',
	},
	{
		displayName: 'Days',
		name: 'days',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'marketChart',
				],
				resource: [
					'coin',
				],
			},
		},
		default: '',
		description: 'Data up to number of days ago (eg. 1,14,30,max)',
	},
	{
		displayName: 'Date',
		name: 'date',
		type: 'dateTime',
		displayOptions: {
			show: {
				operation: [
					'history',
				],
				resource: [
					'coin',
				],
			},
		},
		default: '',
		description: 'Coin IDThe date of data snapshot in dd-mm-yyyy eg. 30-12-2017',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
					'market',
					'ticker',
				],
				resource: [
					'coin',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'getAll',
					'market',
					'ticker',
				],
				resource: [
					'coin',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'coin',
				],
				operation: [
					'market',
				],
			},
		},
		options: [
			{
				displayName: 'IDs',
				name: 'ids',
				type: 'boolean',
				default: '',
				description: 'The ids of the coin, comma separated crytocurrency symbols (base)',
			},
			{
				displayName: 'Category',
				name: 'category',
				type: 'options',
				options: [
					{
						name: 'Decentralized Finance Defi',
						value: 'decentralized_finance_defi',
					},
				],
				default: 'decentralized_finance_defi',
				description: 'filter by coin category, only decentralized_finance_defi is supported at the moment',
			},
			{
				displayName: 'Order',
				name: 'order',
				type: 'options',
				options: [
					{
						name: 'Market Cap Desc',
						value: 'market_cap_desc',
					},
					{
						name: 'Gecko Desc',
						value: 'gecko_desc',
					},
					{
						name: 'Gecko Asc',
						value: 'gecko_asc',
					},
					{
						name: 'Market Cap Asc',
						value: 'market_cap_asc',
					},
					{
						name: 'Market Cap Desc',
						value: 'market_cap_desc',
					},
					{
						name: 'Volume Asc',
						value: 'volume_asc',
					},
					{
						name: 'Volume Desc',
						value: 'volume_desc',
					},
					{
						name: 'Id Asc',
						value: 'id_asc',
					},
					{
						name: 'Id Desc',
						value: 'id_desc',
					}
				],
				default: '',
				description: 'sort results by field',
			},
			{
				displayName: 'Sparkline',
				name: 'sparkline',
				type: 'boolean',
				default: false,
				description: 'Include sparkline 7 days data (eg. true, false)',
			},
			{
				displayName: 'Price Change Percentage',
				name: 'price_change_percentage',
				type: 'multiOptions',
				options: [
					{
						name: '1h',
						value: '1h',
					},
					{
						name: '24h',
						value: '24h',
					},
					{
						name: '7d',
						value: '7d',
					},
					{
						name: '14d',
						value: '14d',
					},
					{
						name: '30d',
						value: '30d',
					},
					{
						name: '200d',
						value: '200d',
					},
					{
						name: '1y',
						value: '1y',
					},
				],
				default: '',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'coin',
				],
				operation: [
					'ticker',
				],
			},
		},
		options: [
			{
				displayName: 'Exchange IDs',
				name: 'exchange_ids',
				type: 'string',
				default: '',
				description: 'filter results by exchange_ids',
			},
			{
				displayName: 'Include Exchange Logo',
				name: 'include_exchange_logo',
				type: 'boolean',
				default: false,
				description: 'flag to show exchange_logo',
			},
			{
				displayName: 'Order',
				name: 'order',
				type: 'multiOptions',
				options: [
					{
						name: 'Trust Score Desc',
						value: 'trust_score_desc',
					},
					{
						name: 'Trust Score Asc',
						value: 'trust_score_asc',
					},
					{
						name: 'Volume Desc',
						value: 'volume_desc',
					},
				],
				default: 'trust_score_desc',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'coin',
				],
				operation: [
					'history',
				],
			},
		},
		options: [
			{
				displayName: 'Localization',
				name: 'localization',
				type: 'string',
				default: '',
				description: 'Set to false to exclude localized languages in response',
			},
		],
	},
	{
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	placeholder: 'Add Field',
	default: {},
	displayOptions: {
		show: {
			operation: [
				'get',
			],
			resource: [
				'coin',
			],
		},
	},
	options: [
		{
			displayName: 'Community data',
			name: 'community_data',
			type: 'boolean',
			default: true,
			description: 'Include community data'
		},
		{
			displayName: 'Developer data',
			name: 'developer_data',
			type: 'boolean',
			default: true,
			description: 'Include developer data'
		},
		{
			displayName: 'Localization',
			name: 'localization',
			type: 'boolean',
			default: true,
			description: 'Include all localized languages in response'
		},
		{
			displayName: 'Market data',
			name: 'market_data',
			type: 'boolean',
			default: true,
			description: 'Include market data'
		},
		{
			displayName: 'Sparkline',
			name: 'sparkline',
			type: 'boolean',
			default: false,
			description: 'Include sparkline 7 days data (eg. true, false)'
		},
		{
			displayName: 'Tickers',
			name: 'tickers',
			type: 'boolean',
			default: true,
			description: 'Include tickers data'
		},
	],
},
] as INodeProperties[];
