import type { INodeProperties } from 'n8n-workflow';

export const coinOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['coin'],
			},
		},
		options: [
			{
				name: 'Candlestick',
				value: 'candlestick',
				description: 'Get a candlestick open-high-low-close chart for the selected currency',
				action: 'Get a candlestick for a coin',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get current data for a coin',
				action: 'Get a coin',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many coins',
				action: 'Get many coins',
			},
			{
				name: 'History',
				value: 'history',
				description: 'Get historical data (name, price, market, stats) at a given date for a coin',
				action: 'Get history for a coin',
			},
			{
				name: 'Market',
				value: 'market',
				description:
					'Get prices and market related data for all trading pairs that match the selected currency',
				action: 'Get market prices for a coin',
			},
			{
				name: 'Market Chart',
				value: 'marketChart',
				description:
					'Get historical market data include price, market cap, and 24h volume (granularity auto)',
				action: 'Get market chart for a coin',
			},
			{
				name: 'Price',
				value: 'price',
				description:
					'Get the current price of any cryptocurrencies in any other supported currencies that you need',
				action: 'Get the price for a coin',
			},
			{
				name: 'Ticker',
				value: 'ticker',
				description: 'Get coin tickers',
				action: 'Get the ticker for a coin',
			},
		],
		default: 'getAll',
	},
];

export const coinFields: INodeProperties[] = [
	{
		displayName: 'Search By',
		name: 'searchBy',
		required: true,
		type: 'options',
		options: [
			{
				name: 'Coin ID',
				value: 'coinId',
			},
			{
				name: 'Contract Address',
				value: 'contractAddress',
			},
		],
		displayOptions: {
			show: {
				operation: ['get', 'marketChart', 'price'],
				resource: ['coin'],
			},
		},
		default: 'coinId',
		description: 'Search by coin ID or contract address',
	},
	{
		displayName: 'Coin Name or ID',
		name: 'coinId',
		required: true,
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getCoins',
		},
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['coin'],
			},
		},
		default: '',
		placeholder: 'bitcoin',
	},
	{
		displayName: 'Base Currency Name or ID',
		name: 'baseCurrency',
		required: true,
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCoins',
		},
		displayOptions: {
			show: {
				operation: ['candlestick'],
				resource: ['coin'],
			},
		},
		default: '',
		description:
			'The first currency in the pair. For BTC:ETH this is BTC. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Base Currency Name or ID',
		name: 'baseCurrency',
		required: true,
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCurrencies',
		},
		displayOptions: {
			show: {
				operation: ['market'],
				resource: ['coin'],
			},
		},
		default: '',
		description:
			'The first currency in the pair. For BTC:ETH this is BTC. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Coin Name or ID',
		name: 'coinId',
		required: true,
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getCoins',
		},
		displayOptions: {
			show: {
				operation: ['ticker', 'history'],
				resource: ['coin'],
			},
		},
		default: '',
		placeholder: 'bitcoin',
	},
	{
		displayName: 'Base Currency Names or IDs',
		name: 'baseCurrencies',
		required: true,
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getCoins',
		},
		displayOptions: {
			show: {
				operation: ['price'],
				resource: ['coin'],
				searchBy: ['coinId'],
			},
		},
		default: [],
		placeholder: 'bitcoin',
		description:
			'The first currency in the pair. For BTC:ETH this is BTC. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Platform ID',
		name: 'platformId',
		required: true,
		displayOptions: {
			show: {
				operation: ['get', 'marketChart', 'price'],
				resource: ['coin'],
				searchBy: ['contractAddress'],
			},
		},
		type: 'options',
		options: [
			{
				name: 'Ethereum',
				value: 'ethereum',
			},
		],
		default: 'ethereum',
		description: 'The ID of the platform issuing tokens',
	},
	{
		displayName: 'Contract Address',
		name: 'contractAddress',
		required: true,
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['get', 'marketChart'],
				resource: ['coin'],
				searchBy: ['contractAddress'],
			},
		},
		description: "Token's contract address",
	},
	{
		displayName: 'Contract Addresses',
		name: 'contractAddresses',
		required: true,
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['price'],
				resource: ['coin'],
				searchBy: ['contractAddress'],
			},
		},
		description: 'The contract address of tokens, comma-separated',
	},
	{
		displayName: 'Base Currency Name or ID',
		name: 'baseCurrency',
		required: true,
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCoins',
		},
		displayOptions: {
			show: {
				operation: ['marketChart'],
				resource: ['coin'],
				searchBy: ['coinId'],
			},
			hide: {
				searchBy: ['contractAddress'],
			},
		},
		default: '',
		description:
			'The first currency in the pair. For BTC:ETH this is BTC. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Quote Currency Name or ID',
		name: 'quoteCurrency',
		required: true,
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCurrencies',
		},
		displayOptions: {
			show: {
				operation: ['candlestick', 'marketChart'],
				resource: ['coin'],
			},
		},
		default: '',
		description:
			'The second currency in the pair. For BTC:ETH this is ETH. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Quote Currency Names or IDs',
		name: 'quoteCurrencies',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getCurrencies',
		},
		required: true,
		displayOptions: {
			show: {
				operation: ['price'],
				resource: ['coin'],
			},
		},
		default: [],
		description:
			'The second currency in the pair. For BTC:ETH this is ETH. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Range (Days)',
		name: 'days',
		required: true,
		type: 'options',

		options: [
			{
				name: '1',
				value: '1',
			},
			{
				name: '7',
				value: '7',
			},
			{
				name: '14',
				value: '14',
			},
			{
				name: '30',
				value: '30',
			},
			{
				name: '90',
				value: '90',
			},
			{
				name: '180',
				value: '180',
			},
			{
				name: '365',
				value: '365',
			},
			{
				name: 'Max',
				value: 'max',
			},
		],
		displayOptions: {
			show: {
				operation: ['marketChart', 'candlestick'],
				resource: ['coin'],
			},
		},
		default: '',
		description: 'Return data for this many days in the past from now',
	},
	{
		displayName: 'Date',
		name: 'date',
		required: true,
		type: 'dateTime',
		displayOptions: {
			show: {
				operation: ['history'],
				resource: ['coin'],
			},
		},
		default: '',
		description: 'The date of data snapshot',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll', 'market', 'ticker'],
				resource: ['coin'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: ['getAll', 'market', 'ticker'],
				resource: ['coin'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['coin'],
				operation: ['market'],
			},
		},
		options: [
			{
				displayName: 'Coin IDs',
				name: 'ids',
				type: 'string',
				placeholder: 'bitcoin',
				default: '',
				description: 'Filter results by comma-separated list of coin ID',
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
				description: 'Filter by coin category',
			},
			{
				displayName: 'Order',
				name: 'order',
				type: 'options',
				options: [
					{
						name: 'Gecko Asc',
						value: 'gecko_asc',
					},
					{
						name: 'Gecko Desc',
						value: 'gecko_desc',
					},
					{
						name: 'ID Asc',
						value: 'id_asc',
					},
					{
						name: 'ID Desc',
						value: 'id_desc',
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
				],
				default: '',
				description: 'Sort results by field',
			},
			{
				displayName: 'Sparkline',
				name: 'sparkline',
				type: 'boolean',
				default: false,
				description: 'Whether to include sparkline 7 days data',
			},
			{
				displayName: 'Price Change Percentage',
				name: 'price_change_percentage',
				type: 'multiOptions',
				// eslint-disable-next-line n8n-nodes-base/node-param-multi-options-type-unsorted-items
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
				default: [],
				description: 'Include price change percentage for specified times',
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
				resource: ['coin'],
				operation: ['price'],
			},
		},
		options: [
			{
				displayName: 'Include 24hr Change',
				name: 'include_24hr_change',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Include 24hr Vol',
				name: 'include_24hr_vol',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Include Last Updated At',
				name: 'include_last_updated_at',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Include Market Cap',
				name: 'include_market_cap',
				type: 'boolean',
				default: false,
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['coin'],
				operation: ['ticker'],
			},
		},
		options: [
			{
				displayName: 'Exchange Names or IDs',
				name: 'exchange_ids',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getExchanges',
				},
				default: [],
				description:
					'Filter results by exchange IDs. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Include Exchange Logo',
				name: 'include_exchange_logo',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Order',
				name: 'order',
				type: 'options',
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
				description: 'Sorts results by the selected rule',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['coin'],
				operation: ['history'],
			},
		},
		options: [
			{
				displayName: 'Localization',
				name: 'localization',
				type: 'boolean',
				default: true,
				description: 'Whether to exclude localized languages in response',
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
				operation: ['get'],
				resource: ['coin'],
			},
		},
		options: [
			{
				displayName: 'Community Data',
				name: 'community_data',
				type: 'boolean',
				default: false,
				description: 'Whether to include community data',
			},
			{
				displayName: 'Developer Data',
				name: 'developer_data',
				type: 'boolean',
				default: false,
				description: 'Whether to include developer data',
			},
			{
				displayName: 'Localization',
				name: 'localization',
				type: 'boolean',
				default: false,
				description: 'Whether to include all localized languages in response',
			},
			{
				displayName: 'Market Data',
				name: 'market_data',
				type: 'boolean',
				default: false,
				description: 'Whether to include market data',
			},
			{
				displayName: 'Sparkline',
				name: 'sparkline',
				type: 'boolean',
				default: false,
				description: 'Whether to include sparkline 7 days data (eg. true, false).',
			},
			{
				displayName: 'Tickers',
				name: 'tickers',
				type: 'boolean',
				default: false,
				description: 'Whether to include tickers data',
			},
		],
	},
];
