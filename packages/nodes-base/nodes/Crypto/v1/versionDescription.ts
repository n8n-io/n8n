/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { getHashes } from 'crypto';
import type { INodeTypeDescription } from 'n8n-workflow';

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

export const versionDescription: INodeTypeDescription = {
	displayName: 'Crypto',
	name: 'crypto',
	icon: 'fa:key',
	group: ['transform'],
	version: 1,
	subtitle: '={{$parameter["action"]}}',
	description: 'Provide cryptographic utilities',
	defaults: {
		name: 'Crypto',
		color: '#408000',
	},
	inputs: ['main'],
	outputs: ['main'],
	properties: [
		{
			displayName: 'Action',
			name: 'action',
			type: 'options',
			options: [
				{
					name: 'Generate',
					description: 'Generate random string',
					value: 'generate',
					action: 'Generate random string',
				},
				{
					name: 'Hash',
					description: 'Hash a text or file in a specified format',
					value: 'hash',
					action: 'Hash a text or file in a specified format',
				},
				{
					name: 'Hmac',
					description: 'Hmac a text or file in a specified format',
					value: 'hmac',
					action: 'HMAC a text or file in a specified format',
				},
				{
					name: 'Sign',
					description: 'Sign a string using a private key',
					value: 'sign',
					action: 'Sign a string using a private key',
				},
			],
			default: 'hash',
		},
		{
			displayName: 'Type',
			name: 'type',
			displayOptions: {
				show: {
					action: ['hash'],
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
			displayName: 'Binary Data',
			name: 'binaryData',
			type: 'boolean',
			default: false,
			required: true,
			displayOptions: {
				show: {
					action: ['hash', 'hmac'],
				},
			},
			description: 'Whether the data to hashed should be taken from binary field',
		},
		{
			displayName: 'Binary Property Name',
			name: 'binaryPropertyName',
			displayOptions: {
				show: {
					action: ['hash', 'hmac'],
					binaryData: [true],
				},
			},
			type: 'string',
			default: 'data',
			description: 'Name of the binary property which contains the input data',
			required: true,
		},
		{
			displayName: 'Value',
			name: 'value',
			displayOptions: {
				show: {
					action: ['hash'],
					binaryData: [false],
				},
			},
			type: 'string',
			default: '',
			description: 'The value that should be hashed',
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
					action: ['hash'],
				},
			},
			description: 'Name of the property to which to write the hash',
		},
		{
			displayName: 'Encoding',
			name: 'encoding',
			displayOptions: {
				show: {
					action: ['hash'],
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
			displayName: 'Secret',
			name: 'secret',
			displayOptions: {
				show: {
					action: ['hmac'],
				},
			},
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
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
		{
			displayName: 'Private Key',
			name: 'privateKey',
			displayOptions: {
				show: {
					action: ['sign'],
				},
			},
			type: 'string',
			description: 'Private key to use when signing the string',
			default: '',
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
	],
};
