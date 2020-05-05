import {
	INodeProperties,
 } from 'n8n-workflow';

export const dealOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a deal',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all deals',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new deal',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update deal properties',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a deal',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const dealFields = [
/* -------------------------------------------------------------------------- */
/*                                  deal:get                               */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'Unique identifier for a particular deal',
	},
	

/* -------------------------------------------------------------------------- */
/*                                  deal:get all                           */
/* -------------------------------------------------------------------------- */
    {
        displayName: 'Return All',
        name: 'returnAll',
        type: 'boolean',
        displayOptions: {
            show: {
                resource: [
                    'deal',
                ],
                operation: [
                    'getAll',
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
        default: 20,
        displayOptions: {
            show: {
                resource: [
                    'deal',
                ],
                operation: [
                    'getAll',
                ],
                returnAll: [
                    false,
                ],
            },
        }
    },

/* -------------------------------------------------------------------------- */
/*                                deal:create                                 */
/* -------------------------------------------------------------------------- */
    {
        displayName: 'Close Date',
        name: 'closeDate',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: [
                    'deal',
                ],
                operation: [
                    'create',
                ],
            },
        },
        default: '',
        description: 'Closing date of deal.',
    },
    {
        displayName: 'Expected Value',
        name: 'expectedValue',
        type: 'number',
        required: true,
        typeOptions: {
            minValue: 0,
            maxValue: 1000000000000
        },
        displayOptions: {
            show: {
                resource: [
                    'deal',
                ],
                operation: [
                    'create',
                ],
            },
        },
        default: 1,
        description: 'Expected Value of deal.',
    },
    {
        displayName: 'Milestone',
        name: 'milestone',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: [
                    'deal',
                ],
                operation: [
                    'create',
                ],
            },
        },
        default: '',
        description: 'Milestone of deal.',
    },
    {
        displayName: 'Probability',
        name: 'probability',
        type: 'number',
        required: true,
        typeOptions: {
            minValue: 0,
            maxValue: 100
        },
        displayOptions: {
            show: {
                resource: [
                    'deal',
                ],
                operation: [
                    'create',
                ],
            },
        },
        default: 50,
        description: 'Expected probability.',
    },
    {
        displayName: 'Name',
        name: 'name',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: [
                    'deal',
                ],
                operation: [
                    'create',
                ],
            },
        },
        default: '',
        description: 'Name of deal.',
    },
    {
        displayName: 'JSON Parameters',
        name: 'jsonParameters',
        type: 'boolean',
        default: false,
        description: '',
        displayOptions: {
            show: {
                resource: [
                    'deal',
                ],
                operation: [
                    'create',
                ],
            },
        },
    },
    {
        displayName: ' Additional Fields',
        name: 'additionalFieldsJson',
        type: 'json',
        typeOptions: {
            alwaysOpenEditWindow: true,
        },
        default: '',
        displayOptions: {
            show: {
                resource: [
                    'deal',
                ],
                operation: [
                    'create',
                ],
                jsonParameters: [
                    true,
                ],
            },
        },
        
        description: `Object of values to set as described <a href="https://github.com/agilecrm/rest-api#1-deals---companies-api" target="_blank">here</a>.`,
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
                    'deal',
                ],
                operation: [
                    'create',
                ],
                jsonParameters: [
                    false,
                ],
            },
        },
        options: [
            {
                displayName: 'Contact Ids',
                name: 'contactIds',
                type: 'string',
                typeOptions: {
                    multipleValues: true,
                    multipleValueButtonText: 'Add ID',
                },
                default: [],
                placeholder: 'ID',
                description: 'Unique contact identifiers.',
            },
            {
                displayName: 'Custom Data',
                name: 'customData',
                type: 'fixedCollection',
                required: false,
                description: 'Custom Data',
                typeOptions: {
                    multipleValues: true,
                },
                options: [
                    {
                        displayName: 'Property',
                        name: 'customProperty',
                        values: [
                            {
                                displayName: 'Name',
                                name: 'name',
                                type: 'string',
                                required: true,
                                default: "",
                                placeholder: '',
                                description: 'Property name.'
                            },
                            {
                                displayName: 'Value',
                                name: 'value',
                                type: 'string',
                                required: false,
                                default: "",
                                placeholder: '',
                                description: 'Property value.',
                            }
                        ]
                    },
                        
                ]
            },
        ]
    },


   
/* -------------------------------------------------------------------------- */
/*                                deal:update                               */
/* -------------------------------------------------------------------------- */
    {
        displayName: 'Close Date',
        name: 'closeDate',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: [
                    'deal',
                ],
                operation: [
                    'update',
                ],
            },
        },
        default: '',
        description: 'Closing date of deal.',
    },
    {
        displayName: 'Expected Value',
        name: 'expectedValue',
        type: 'number',
        required: true,
        typeOptions: {
            minValue: 0,
            maxValue: 10000
        },
        displayOptions: {
            show: {
                resource: [
                    'deal',
                ],
                operation: [
                    'update',
                ],
            },
        },
        default: '',
        description: 'Expected Value of deal.',
    },
    {
        displayName: 'Milestone',
        name: 'milestone',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: [
                    'deal',
                ],
                operation: [
                    'update',
                ],
            },
        },
        default: '',
        description: 'Milestone of deal.',
    },
    {
        displayName: 'Probability',
        name: 'probability',
        type: 'number',
        required: true,
        typeOptions: {
            minValue: 0,
            maxValue: 100
        },
        displayOptions: {
            show: {
                resource: [
                    'deal',
                ],
                operation: [
                    'update',
                ],
            },
        },
        default: 50,
        description: 'Expected Value of deal.',
    },
    {
        displayName: 'Name',
        name: 'name',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: [
                    'deal',
                ],
                operation: [
                    'update',
                ],
            },
        },
        default: '',
        description: 'Name of deal.',
    },
    {
        displayName: 'JSON Parameters',
        name: 'jsonParameters',
        type: 'boolean',
        default: false,
        description: '',
        displayOptions: {
            show: {
                resource: [
                    'deal',
                ],
                operation: [
                    'update',
                ],
            },
        },
    },
    {
        displayName: ' Additional Fields',
        name: 'additionalFieldsJson',
        type: 'json',
        typeOptions: {
            alwaysOpenEditWindow: true,
        },
        default: '',
        displayOptions: {
            show: {
                resource: [
                    'deal',
                ],
                operation: [
                    'update',
                ],
                jsonParameters: [
                    true,
                ],
            },
        },
        
        description: `Object of values to set as described <a href="https://github.com/agilecrm/rest-api#1-deals---companies-api" target="_blank">here</a>.`,
    },
    {
        displayName: 'Contact IDs',
        name: 'contactIds',
        type: 'string',
        typeOptions: {
            multipleValues: true,
            multipleValueButtonText: 'Add Contact ID',
        },
        displayOptions: {
            show: {
                resource: [
                    'deal',
                ],
                operation: [
                    'update',
                ],
                jsonParameters: [
                    false,
                ],
            },
        },
        default: [],
        placeholder: 'Id',
        description: 'Id numbers of contacts.',
    },
    {
        displayName: 'Custom Data',
        name: 'customData',
        type: 'fixedCollection',
        required: false,
        description: 'Custom Data.',
        typeOptions: {
            multipleValues: true,
        },
        displayOptions: {
            show: {
                resource: [
                    'deal',
                ],
                operation: [
                    'update',
                ],
                jsonParameters: [
                    false,
                ],
            },
        },
        options: [
            {
                displayName: 'Data Properties',
                name: 'customDataProperties',
                values: [
                    {
                        displayName: 'Name',
                        name: 'name',
                        type: 'string',
                        required: true,
                        default: "",
                        placeholder: 'name',
                        description: 'Name of property',
                    },
                    {
                        displayName: 'Value',
                        name: 'value',
                        type: 'string',
                        required: true,
                        default: "",
                        placeholder: '',
                        description: 'Value of property',
                    }
                ]
            },
                
        ]
    },

] as INodeProperties[];
