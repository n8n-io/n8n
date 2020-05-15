import { INodeProperties } from "n8n-workflow";

export const adOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'ad'
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get ads.',
            }
		],
		default: 'get',
		description: 'The operation to perform.',
    },
    {
		displayName: 'Get by',
		name: 'getBy',
		type: 'options',
		displayOptions: {
			show: {
                resource: [
					'ad'
				],
				operation: [
					'get'
				],
			},
		},
		options: [
            {
				name: 'ID',
				value: 'id',
				description: 'Get ad by ID.',
			},
			{
				name: 'Ad Account',
				value: 'adAccount',
				description: 'Get ad by account.',
            },
            {
				name: 'Ad Campaign',
				value: 'adCampaign',
				description: 'Get ad by campaign.',
            },
            {
				name: 'Ad Set',
				value: 'adSet',
				description: 'Get ad by ad set.',
            },
		],
		default: 'id',
		description: 'Means through which to get Ad.',
	},
] as INodeProperties[];

export const adFields = [
/* -------------------------------------------------------------------------- */
/*                                ad:get                              		  */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Ad ID',
		name: 'itemId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
                resource: [
					'ad'
				],
				operation: [
					'get'
                ],
                getBy: [
					'id'
				],
			},
		},
        description: 'ID of ad to get.',
        default: ''
    },
    {
		displayName: 'Ad Account ID',
		name: 'itemId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
                resource: [
					'ad'
				],
				operation: [
					'get'
                ],
                getBy: [
					'adAccount'
				],
			},
		},
        description: 'ID of ad account.',
        default: ''
    },
    {
		displayName: 'Campaign ID',
		name: 'itemId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
                resource: [
					'ad'
				],
				operation: [
					'get'
                ],
                getBy: [
					'adCampaign'
				],
			},
		},
        description: 'ID of ad campaign.',
        default: ''
    },
    {
		displayName: 'Ad Set ID',
		name: 'itemId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
                resource: [
					'ad'
				],
				operation: [
					'get'
                ],
                getBy: [
					'adSet'
				],
			},
		},
        description: 'ID of ad set.',
        default: ''
    },
    {
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
        displayOptions: {
            show: {
                resource: [
					'ad'
				],
                operation: [
                    'get'
                ],
            },
        },
        options: [
            {
                displayName: 'Date Preset',
                name: 'datePreset',
                type: 'options',
                description: 'Represents a relative time range. This field is ignored if Time Range or Time Ranges is specified.',
                default: 'today',
                options: [
                    {
                        name: 'Today',
                        value: 'today'
                    },
                    {
                        name: 'Yesterday',
                        value: 'yesterday'
                    },
                    {
                        name: 'This Month',
                        value: 'this_month'
                    },
                    {
                        name: 'Last Month',
                        value: 'last_month'
                    },
                    {
                        name: 'This Quarter',
                        value: 'this_quarter'
                    },
                    {
                        name: 'Lifetime',
                        value: 'lifetime'
                    },
                    {
                        name: 'Last 3 Days',
                        value: 'last_3d'
                    },
                    {
                        name: 'Last 7 Days',
                        value: 'last_7d'
                    },
                    {
                        name: 'Last 14 Days',
                        value: 'last_14d'
                    },
                    {
                        name: 'Last 28 Days',
                        value: 'last_28d'
                    },
                    {
                        name: 'Last 30 Days',
                        value: 'last_30d'
                    },
                    {
                        name: 'Last 90 Days',
                        value: 'last_90d'
                    },
                    {
                        name: 'Last Week (Mon-Sun)',
                        value: 'last_week_mon_sun'
                    },
                    {
                        name: 'Last Week (Sun-Sat)',
                        value: 'last_week_sun_sat'
                    },
                    {
                        name: 'Last Quarter',
                        value: 'last_quarter'
                    },
                    {
                        name: 'Last Year',
                        value: 'last_year'
                    },
                    {
                        name: 'This Week (Mon-Today)',
                        value: 'this_week_mon_today'
                    },
                    {
                        name: 'This Week (Sun-Today)',
                        value: 'this_week_sun_today'
                    },
                    {
                        name: 'This Year',
                        value: 'this_year'
                    },
                ]
            },
            {
                displayName: 'Fields',
                name: 'fields',
                type: 'string',
                description: 'Comma separated fields of ad item you want to retrieve.',
                default: '',
                placeholder: 'bid_amount,campaign'
            },
            {
				displayName: 'Time Range',
				name: 'timeRange',
				type: 'fixedCollection',
				default: 'properties',
				description: 'A single time range object. This param is ignored if time_ranges is provided.',
				options: [
					{
						displayName: 'Time Range Properties',
						name: 'properties',
						values: [
							{
								displayName: 'Since',
								name: 'since',
								type: 'dateTime',
								default: '',
								description: 'A date in the format of "YYYY-MM-DD", which means from the beginning midnight of that day.',
								required: true
							},
							{
								displayName: 'Until',
								name: 'until',
								type: 'dateTime',
								default: '',
								description: 'A date in the format of "YYYY-MM-DD", which means to the beginning midnight of the following day.',
								required: true
                            },
						]
                    },
				]
            },
        ]
    },
] as INodeProperties[];