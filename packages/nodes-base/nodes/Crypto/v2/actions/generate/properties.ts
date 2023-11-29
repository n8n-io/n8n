import type { INodeProperties } from 'n8n-workflow';

export const properties: INodeProperties[] = [
	{
		displayName: 'Property Name',
		name: 'dataPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				action: ['generate'],
			},
		},
		description: 'Name of the property to which to write the random string',
	},
	{
		displayName: 'Type',
		name: 'encodingType',
		displayOptions: {
			show: {
				action: ['generate'],
			},
		},
		type: 'options',
		options: [
			{
				name: 'ASCII',
				value: 'ascii',
			},
			{
				name: 'BASE64',
				value: 'base64',
			},
			{
				name: 'HEX',
				value: 'hex',
			},
			{
				name: 'UUID',
				value: 'uuid',
			},
		],
		default: 'uuid',
		description: 'Encoding that will be used to generate string',
		required: true,
	},
	{
		displayName: 'Length',
		name: 'stringLength',
		type: 'number',
		default: 32,
		description: 'Length of the generated string',
		displayOptions: {
			show: {
				action: ['generate'],
				encodingType: ['ascii', 'base64', 'hex'],
			},
		},
	},
];
