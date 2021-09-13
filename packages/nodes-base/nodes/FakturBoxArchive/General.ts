import {
    INodeProperties
} from 'n8n-workflow'

export const generalFields = [
    {
		displayName: 'Service-Operation',
		name: 'endpoint',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'general',
				],
			},
		},
		default: '',
		description: 'The endpoint to call',
	},
    {
        displayName: 'Values to Set',
        name: 'values',
        placeholder: 'Add Value',
        type: 'fixedCollection',
        typeOptions: {
            multipleValues: true,
            sortable: true,
        },
        displayOptions: {
			show: {
				resource: [
					'general',
				],
			},
		},
        description: 'The value to set.',
        default: {},
        options: [
            {
                name: 'boolean',
                displayName: 'Boolean',
                values: [
                    {
                        displayName: 'Name',
                        name: 'name',
                        type: 'string',
                        default: 'propertyName',
                        description: 'Name of the property to write data to.<br />Supports dot-notation.<br />Example: "data.person[0].name"',
                    },
                    {
                        displayName: 'Value',
                        name: 'value',
                        type: 'boolean',
                        default: false,
                        description: 'The boolean value to write in the property.',
                    },
                ],
            },
            {
                name: 'number',
                displayName: 'Number',
                values: [
                    {
                        displayName: 'Name',
                        name: 'name',
                        type: 'string',
                        default: 'propertyName',
                        description: 'Name of the property to write data to.<br />Supports dot-notation.<br />Example: "data.person[0].name"',
                    },
                    {
                        displayName: 'Value',
                        name: 'value',
                        type: 'number',
                        default: 0,
                        description: 'The number value to write in the property.',
                    },
                ],
            },
            {
                name: 'string',
                displayName: 'String',
                values: [
                    {
                        displayName: 'Name',
                        name: 'name',
                        type: 'string',
                        default: 'propertyName',
                        description: 'Name of the property to write data to.<br />Supports dot-notation.<br />Example: "data.person[0].name"',
                    },
                    {
                        displayName: 'Value',
                        name: 'value',
                        type: 'string',
                        default: '',
                        description: 'The string value to write in the property.',
                    },
                ],
            },
        ],
    },
] as INodeProperties[]