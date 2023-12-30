import type { INodeProperties } from 'n8n-workflow';

export const properties: INodeProperties[] = [
	{
		displayName: 'Binary Data',
		name: 'binaryData',
		type: 'boolean',
		default: false,
		required: true,
		displayOptions: {
			show: {
				action: ['hmac'],
			},
		},
		description: 'Whether the data to hashed should be taken from binary field',
	},
	{
		displayName: 'Binary Property Name',
		name: 'binaryPropertyName',
		displayOptions: {
			show: {
				action: ['hmac'],
				binaryData: [true],
			},
		},
		type: 'string',
		default: 'data',
		description: 'Name of the binary property which contains the input data',
		required: true,
	},
	{
		displayName: 'Type',
		name: 'type',
		displayOptions: {
			show: {
				action: ['hmac'],
			},
		},
		type: 'options',
		options: [
			{
				name: 'MD5',
				value: 'MD5',
			},
			{
				name: 'SHA256',
				value: 'SHA256',
			},
			{
				name: 'SHA3-256',
				value: 'SHA3-256',
			},
			{
				name: 'SHA3-384',
				value: 'SHA3-384',
			},
			{
				name: 'SHA3-512',
				value: 'SHA3-512',
			},
			{
				name: 'SHA384',
				value: 'SHA384',
			},
			{
				name: 'SHA512',
				value: 'SHA512',
			},
		],
		default: 'MD5',
		description: 'The hash type to use',
		required: true,
	},
	{
		displayName: 'Value',
		name: 'value',
		displayOptions: {
			show: {
				action: ['hmac'],
				binaryData: [false],
			},
		},
		type: 'string',
		default: '',
		description: 'The value of which the hmac should be created',
		required: true,
	},
	{
		displayName: 'Property Name',
		name: 'dataPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				action: ['hmac'],
			},
		},
		description: 'Name of the property to which to write the hmac',
	},
	{
		displayName: 'Encoding',
		name: 'encoding',
		displayOptions: {
			show: {
				action: ['hmac'],
			},
		},
		type: 'options',
		options: [
			{
				name: 'BASE64',
				value: 'base64',
			},
			{
				name: 'HEX',
				value: 'hex',
			},
		],
		default: 'hex',
		required: true,
	},
];
