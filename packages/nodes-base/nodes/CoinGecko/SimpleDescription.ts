import { INodeProperties } from "n8n-workflow";

export const simpleResources = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		displayOptions: {
			show: {
				context: [
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
				name: 'Supported VS currencies',
				value: 'supported_vs_currencies',
				description: 'Get list of supported VS currencies',
			},
			{
				name: 'Token price',
				value: 'token_price/<id>',
				description: 'Get current price of tokens (using contract addresses) for a given platform in any other currency that you need',
			},
        ],
        default: 'price',
		description: 'The resource to retreive',
	},
] as INodeProperties[];

const includeOptions = [
    {
        displayName: 'Include 24hr change',
        name: 'include_24hr_change',
        type: 'boolean',
        default: false,
    },
    {
        displayName: 'Include 24hr vol',
        name: 'include_24hr_vol',
        type: 'boolean',
        default: false,
    },
    {
        displayName: 'Include last updated at',
        name: 'include_last_updated_at',
        type: 'boolean',
        default: false,
    },
    {
        displayName: 'Include market cap',
        name: 'include_market_cap',
        type: 'boolean',
        default: false,
    },
]

export const simpleFields = [
/* -------------------------------------------------------------------------- */
/*                                  simple:price                              */
/* -------------------------------------------------------------------------- */
    {
        displayName: 'Coins IDs',
        name: 'ids',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                context: [
                    'simple',
                ],
                resource: [
                    'price',
                ],
            },
        },
        description: 'ID of coins, comma-separated if querying more than 1 coin. Refers to Coins / List',
    },
    {
        displayName: 'VS currencies',
        name: 'vs_currencies',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                context: [
                    'simple',
                ],
                resource: [
                    'price'
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
                context: [
                    'simple',
                ],
                resource: [
                    'price',
                ],
            },
        },
        options: [
            ...includeOptions
        ],
    },
/* -------------------------------------------------------------------------- */
/*                                  simple:token_price                        */
/* -------------------------------------------------------------------------- */
    {
        displayName: 'platform ID',
        name: 'id',
        required: true,
        displayOptions: {
            show: {
                context: [
                    'simple',
                ],
                resource: [
                    'token_price/<id>',
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
        name: 'contract_addresses',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                context: [
                    'simple',
                ],
                resource: [
                    'token_price/<id>',
                ],
            },
        },
        description: 'The contract address of tokens, comma separated',
    },
    {
        displayName: 'VS currencies',
        name: 'vs_currencies',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                context: [
                    'simple',
                ],
                resource: [
                    'token_price/<id>'
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
                context: [
                    'simple',
                ],
                resource: [
                    'token_price/<id>',
                ],
            },
        },
        options: [
            ...includeOptions
        ],
    },
] as INodeProperties[];
