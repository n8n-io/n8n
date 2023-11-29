import { getHashes } from 'crypto';
import type { INodeProperties } from 'n8n-workflow';

const unsupportedAlgorithms = [
	'RSA-MD4',
	'RSA-MDC2',
	'md4',
	'md4WithRSAEncryption',
	'mdc2',
	'mdc2WithRSA',
];

const supportedAlgorithms = getHashes()
	.filter((algorithm) => !unsupportedAlgorithms.includes(algorithm))
	.map((algorithm) => ({ name: algorithm, value: algorithm }));

export const properties: INodeProperties[] = [
	{
		displayName: 'Value',
		name: 'value',
		displayOptions: {
			show: {
				action: ['sign'],
			},
		},
		type: 'string',
		default: '',
		description: 'The value that should be signed',
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
				action: ['sign'],
			},
		},
		description: 'Name of the property to which to write the signed value',
	},
	{
		displayName: 'Algorithm Name or ID',
		name: 'algorithm',
		displayOptions: {
			show: {
				action: ['sign'],
			},
		},
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		options: supportedAlgorithms,
		default: '',
		required: true,
	},
	{
		displayName: 'Encoding',
		name: 'encoding',
		displayOptions: {
			show: {
				action: ['sign'],
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
