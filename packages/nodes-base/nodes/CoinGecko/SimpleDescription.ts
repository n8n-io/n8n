import {
	INodeProperties,
} from 'n8n-workflow';

export const simpleOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'simple',
				],
			},
		},
		options: [
			{
				name: 'Price',
				value: 'price',
				description: 'Get the current price of any cryptocurrencies in any other supported currencies that you need',
			},
			{
				name: 'Token Price',
				value: 'tokenPrice',
				description: 'Get current price of tokens for a given platform in any other currency that you need',
			},
		],
		default: 'price',
		description: 'The resource to retreive',
	},
] as INodeProperties[];

const includeOptions = [
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
];

export const simpleFields = [
/* -------------------------------------------------------------------------- */
/*                                  simple:price                              */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Coin IDs',
		name: 'ids',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'simple',
				],
				operation: [
					'price',
				],
			},
		},
		default: '',
		description: 'ID of coins, comma-separated if querying more than 1 coin. Refers to Coins / List',
	},
	{
		displayName: 'Currencies',
		name: 'currencies',
		type: 'string',
		required: true,
		placeholder: 'usd',
		displayOptions: {
			show: {
				resource: [
					'simple',
				],
				operation: [
					'price',
				],
			},
		},
		default: '',
		description: 'VS currency of coins, comma-separated if querying more than 1 vs_currency. Refers to Simple / Supported VS currencies',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'simple',
				],
				operation: [
					'price',
				],
			},
		},
		options: [
			...includeOptions,
		],
	},
/* -------------------------------------------------------------------------- */
/*                                  simple:tokenPrice                         */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Platform ID',
		name: 'id',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'simple',
				],
				operation: [
					'tokenPrice',
				],
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
		description: 'The id of the platform issuing tokens',
	},
	{
		displayName: 'Contract addresses',
		name: 'contractAddresses',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'simple',
				],
				operation: [
					'tokenPrice',
				],
			},
		},
		description: 'The contract address of tokens, comma separated',
	},
	{
		displayName: 'Currencies',
		name: 'currencies',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'simple',
				],
				operation: [
					'tokenPrice',
				],
			},
		},
		description: 'VS currency of coins, comma-separated if querying more than 1 vs_currency. Refers to Simple / Supported VS currencies',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'simple',
				],
				operation: [
					'tokenPrice',
				],
			},
		},
		options: [
			...includeOptions,
		],
	},
] as INodeProperties[];
