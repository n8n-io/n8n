import { INodeProperties } from "n8n-workflow";

export const coinResources = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		displayOptions: {
			show: {
				context: [
					'coins',
				],
			},
		},
		options: [
			{
				name: 'Get coin',
				value: '<id>',
				description: 'Get current data (name, price, market,... including exchange tickers) for a coin',
            },
			{
				name: 'Get coin tickers',
				value: '<id>/tickers',
				description: 'Get coin tickers',
            },
			{
				name: 'Get coin history',
				value: '<id>/history',
				description: 'Get historical data (name, price, market, stats) at a given date for a coin',
            },
			{
				name: 'Get coin market chart',
				value: '<id>/market_chart',
				description: 'Get historical market data include price, market cap, and 24h volume (granularity auto)',
            },
			{
				name: 'Get coin market chart with range',
				value: '<id>/market_chart/range',
				description: 'Get historical market data include price, market cap, and 24h volume within a range of timestamp (granularity auto)',
            },
			{
				name: 'Get coin status updates',
				value: '<id>/status_updates',
				description: 'Get status updates for a given coin (beta)',
            },
			{
				name: 'Get coin OHLC',
				value: '<id>/ohlc',
				description: "Get coin's OHLC (beta)",
            },
			{
				name: 'List',
				value: 'list',
				description: 'List all supported coins id, name and symbol',
			},
			{
				name: 'Markets',
				value: 'markets',
				description: 'List all supported coins price, market cap, volume, and market related data',
			},
		],
		default: 'list',
		description: 'The resource to retreive',
	},
] as INodeProperties[];

export const coinFields = [
/* -------------------------------------------------------------------------- */
/*                                  coin:markets                              */
/* -------------------------------------------------------------------------- */
    {
        displayName: 'VS currency',
        name: 'vs_currency',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                context: [
                    'coins',
                ],
                resource: [
                    'markets',
                ],
            },
        },
        description: 'The target currency of market data (usd, eur, jpy, etc.)',
    },
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        displayOptions: {
            show: {
                context: [
                    'coins',
                ],
                resource: [
                    'markets',
                ],
            },
        },
        options: [
            {
                displayName: 'Category',
                name: 'category',
                type: 'options',
				options: [
					{
						name: 'Decentralized finance DeFi',
						value: 'decentralized_finance_defi',
					},
                ],
                default: 'decentralized_finance_defi',
                description: 'Filter by coin category',
            },
            {
                displayName: 'Coin IDs',
                name: 'ids',
                type: 'string',
                default: '',
                description: 'The ids of the coin, comma separated crytocurrency symbols (base). Refers to Coins / List. When left empty, returns numbers the coins observing the params Limit and Start',
            },
            {
                displayName: 'Order',
                name: 'order',
                type: 'options',
				options: [
					{
						name: 'Gecko asc',
						value: 'gecko_asc',
                    },
					{
						name: 'Gecko desc',
						value: 'gecko_desc',
                    },
					{
						name: 'Market cap asc',
						value: 'market_cap_asc',
                    },
					{
						name: 'Market cap desc',
						value: 'market_cap_desc',
                    },
					{
						name: 'Volume asc',
						value: 'volume_asc',
                    },
					{
						name: 'Volume desc',
						value: 'volume_desc',
                    },
					{
						name: 'ID asc',
						value: 'id_asc',
                    },
					{
						name: 'ID desc',
						value: 'id_desc',
					},
                ],
                default: 'market_cap_desc',
                description: 'Sort results by field',
            },
            {
                displayName: 'Page',
                name: 'page',
                type: 'number',
                typeOptions: {
                    minValue: 1
                },
                default: 1,
                description: 'Page through results',
            },
            {
                displayName: 'Per page',
                name: 'per_page',
                type: 'number',
                typeOptions: {
                    minValue: 1,
                    maxValue: 250,
                },
                default: 100,
                description: 'Total results per page',
            },
            {
                displayName: 'Price change percentage',
                name: 'price_change_percentage',
                type: 'string',
                default: '',
                description: "Include price change percentage in 1h, 24h, 7d, 14d, 30d, 200d, 1y (eg. '1h,24h,7d' comma-separated, invalid values will be discarded)",
            },
            {
                displayName: 'Sparkline',
                name: 'sparkline',
                type: 'boolean',
                default: false,
                description: 'Include sparkline 7 days data (eg. true, false)',
            },
        ],
    },
/* -------------------------------------------------------------------------- */
/*                                  coin:<id>                                 */
/* -------------------------------------------------------------------------- */
    {
        displayName: 'Coin ID',
        name: 'id',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                context: [
                    'coins',
                ],
                resource: [
                    '<id>',
                ],
            },
        },
        placeholder: 'bitcoin',
        default: '',
        description: 'Coin id (can be obtained from Coin / List)',
    },
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        displayOptions: {
            show: {
                context: [
                    'coins',
                ],
                resource: [
                    '<id>',
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
/* -------------------------------------------------------------------------- */
/*                           coin:<id>/tickers                                */
/* -------------------------------------------------------------------------- */
    {
        displayName: 'Coin ID',
        name: 'id',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                context: [
                    'coins',
                ],
                resource: [
                    '<id>/tickers',
                ],
            },
        },
        placeholder: 'bitcoin',
        default: '',
        description: 'Coin id (can be obtained from Coin / List)',
    },
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        displayOptions: {
            show: {
                context: [
                    'coins',
                ],
                resource: [
                    '<id>/tickers',
                ],
            },
        },
        options: [
            {
                displayName: 'Exchange IDs',
                name: 'exchange_ids',
                type: 'string',
                default: '',
                description: 'Filter results by Exchange IDs (ref: Exchange / List)'
            },
            {
                displayName: 'Include exchange logo',
                name: 'include_exchange_logo',
                type: 'boolean',
                default: false,
                description: 'Flag to show exchange logo'
            },
            {
                displayName: 'Order',
                name: 'order',
                type: 'options',
				options: [
					{
						name: 'Trust score desc',
						value: 'trust_score_desc',
					},
					{
						name: 'Trust score asc',
						value: 'trust_score_asc',
					},
					{
						name: 'Volume desc',
						value: 'volume_desc',
					},
				],
                default: 'trust_score_desc',
            },
            {
                displayName: 'Page',
                name: 'page',
                type: 'number',
                typeOptions: {
                    minValue: 1,
                },
                default: 1,
                description: 'Page through results'
            },
        ],
    },
/* -------------------------------------------------------------------------- */
/*                           coin:<id>/history                                */
/* -------------------------------------------------------------------------- */
    {
        displayName: 'Coin ID',
        name: 'id',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                context: [
                    'coins',
                ],
                resource: [
                    '<id>/history',
                ],
            },
        },
        placeholder: 'bitcoin',
        default: '',
        description: 'Coin id (can be obtained from Coin / List)',
    },
    {
        displayName: 'Date',
        name: 'date',
        type: 'dateTime',
        required: true,
        displayOptions: {
            show: {
                context: [
                    'coins',
                ],
                resource: [
                    '<id>/history',
                ],
            },
        },
        default: '',
        description: 'The date of data snapshot in dd-mm-yyyy eg. 30-12-2017',
    },
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        displayOptions: {
            show: {
                context: [
                    'coins',
                ],
                resource: [
                    '<id>/history',
                ],
            },
        },
        options: [
            {
                displayName: 'Localization',
                name: 'localization',
                type: 'boolean',
                default: true,
                description: 'Set to false to exclude localized languages in response'
            },
        ],
    },
/* -------------------------------------------------------------------------- */
/*                           coin:<id>/market_chart                           */
/* -------------------------------------------------------------------------- */
    {
        displayName: 'Coin ID',
        name: 'id',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                context: [
                    'coins',
                ],
                resource: [
                    '<id>/market_chart',
                ],
            },
        },
        placeholder: 'bitcoin',
        default: '',
        description: 'Coin id (can be obtained from Coin / List)',
    },
    {
        displayName: 'VS currency',
        name: 'vs_currency',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                context: [
                    'coins',
                ],
                resource: [
                    '<id>/market_chart',
                ],
            },
        },
        default: '',
        description: 'The target currency of market data (usd, eur, jpy, etc.)',
    },
    {
        displayName: 'Days',
        name: 'days',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                context: [
                    'coins',
                ],
                resource: [
                    '<id>/market_chart',
                ],
            },
        },
        default: '',
        description: 'Data up to number of days ago (eg. 1,14,30,max)',
    },
/* -------------------------------------------------------------------------- */
/*                       coin:<id>/market_chart/range                         */
/* -------------------------------------------------------------------------- */
    {
        displayName: 'Coin ID',
        name: 'id',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                context: [
                    'coins',
                ],
                resource: [
                    '<id>/market_chart/range',
                ],
            },
        },
        placeholder: 'bitcoin',
        default: '',
        description: 'Coin id (can be obtained from Coin / List)',
    },
    {
        displayName: 'VS currency',
        name: 'vs_currency',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                context: [
                    'coins',
                ],
                resource: [
                    '<id>/market_chart/range',
                ],
            },
        },
        default: '',
        description: 'The target currency of market data (usd, eur, jpy, etc.)',
    },
    {
        displayName: 'From',
        name: 'from',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                context: [
                    'coins',
                ],
                resource: [
                    '<id>/market_chart/range',
                ],
            },
        },
        default: '',
        description: 'From date in UNIX Timestamp (eg. 1392577232)',
    },
    {
        displayName: 'To',
        name: 'to',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                context: [
                    'coins',
                ],
                resource: [
                    '<id>/market_chart/range',
                ],
            },
        },
        default: '',
        description: 'To date in UNIX Timestamp (eg. 1422577232)',
    },
/* -------------------------------------------------------------------------- */
/*                           coin:<id>/status_updates                         */
/* -------------------------------------------------------------------------- */
    {
        displayName: 'Coin ID',
        name: 'id',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                context: [
                    'coins',
                ],
                resource: [
                    '<id>/status_updates',
                ],
            },
        },
        placeholder: 'bitcoin',
        default: '',
        description: 'Coin id (can be obtained from Coin / List)',
    },
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        displayOptions: {
            show: {
                context: [
                    'coins',
                ],
                resource: [
                    '<id>/status_updates',
                ],
            },
        },
        options: [
            {
                displayName: 'Page',
                name: 'page',
                type: 'number',
                typeOptions: {
                    minValue: 1
                },
                default: 1,
                description: 'Page through results'
            },
            {
                displayName: 'Per page',
                name: 'per_page',
                type: 'number',
                typeOptions: {
                    minValue: 1,
                },
                default: 100,
                description: 'Total results per page'
            },
        ],
    },
/* -------------------------------------------------------------------------- */
/*                           coin:<id>/ohlc                                   */
/* -------------------------------------------------------------------------- */
    {
        displayName: 'Coin ID',
        name: 'id',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                context: [
                    'coins',
                ],
                resource: [
                    '<id>/ohlc',
                ],
            },
        },
        placeholder: 'bitcoin',
        default: '',
        description: 'Coin id (can be obtained from Coin / List)',
    },
    {
        displayName: 'VS currency',
        name: 'vs_currency',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                context: [
                    'coins',
                ],
                resource: [
                    '<id>/ohlc',
                ],
            },
        },
        default: '',
        description: 'The target currency of market data (usd, eur, jpy, etc.)',
    },
    {
        displayName: 'Days',
        name: 'days',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                context: [
                    'coins',
                ],
                resource: [
                    '<id>/ohlc',
                ],
            },
        },
        default: '',
        description: 'Data up to number of days ago (1/7/14/30/90/180/365/max)',
    },
] as INodeProperties[];
