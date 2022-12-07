import { set } from 'lodash';

import { IExecuteFunctions } from 'n8n-core';

import {
	deepCopy,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';

import {
	BinaryToTextEncoding,
	createHash,
	createHmac,
	createSign,
	getHashes,
	randomBytes,
} from 'crypto';

import { v4 as uuid } from 'uuid';

export class Crypto implements INodeType {
	description: INodeTypeDescription = {
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
						description: 'Hash a text in a specified format',
						value: 'hash',
						action: 'Hash a text in a specified format',
					},
					{
						name: 'Hmac',
						description: 'Hmac a text in a specified format',
						value: 'hmac',
						action: 'HMAC a text in a specified format',
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
				displayName: 'Value',
				name: 'value',
				displayOptions: {
					show: {
						action: ['hash'],
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
				typeOptions: {
					loadOptionsMethod: 'getHashes',
				},
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

	methods = {
		loadOptions: {
			// Get all the hashes to display them to user so that he can
			// select them easily
			async getHashes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const hashes = getHashes();
				for (const hash of hashes) {
					const hashName = hash;
					const hashId = hash;
					returnData.push({
						name: hashName,
						value: hashId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const action = this.getNodeParameter('action', 0) as string;

		let item: INodeExecutionData;
		for (let i = 0; i < length; i++) {
			try {
				item = items[i];
				const dataPropertyName = this.getNodeParameter('dataPropertyName', i) as string;
				const value = this.getNodeParameter('value', i, '') as string;
				let newValue;

				if (action === 'generate') {
					const encodingType = this.getNodeParameter('encodingType', i) as string;
					if (encodingType === 'uuid') {
						newValue = uuid();
					} else {
						const stringLength = this.getNodeParameter('stringLength', i) as number;
						if (encodingType === 'base64') {
							newValue = randomBytes(stringLength)
								.toString(encodingType as BufferEncoding)
								.replace(/\W/g, '')
								.slice(0, stringLength);
						} else {
							newValue = randomBytes(stringLength)
								.toString(encodingType as BufferEncoding)
								.slice(0, stringLength);
						}
					}
				}
				if (action === 'hash') {
					const type = this.getNodeParameter('type', i) as string;
					const encoding = this.getNodeParameter('encoding', i) as BinaryToTextEncoding;
					newValue = createHash(type).update(value).digest(encoding);
				}
				if (action === 'hmac') {
					const type = this.getNodeParameter('type', i) as string;
					const secret = this.getNodeParameter('secret', i) as string;
					const encoding = this.getNodeParameter('encoding', i) as BinaryToTextEncoding;
					newValue = createHmac(type, secret).update(value).digest(encoding);
				}
				if (action === 'sign') {
					const algorithm = this.getNodeParameter('algorithm', i) as string;
					const encoding = this.getNodeParameter('encoding', i) as BinaryToTextEncoding;
					const privateKey = this.getNodeParameter('privateKey', i) as string;
					const sign = createSign(algorithm);
					sign.write(value);
					sign.end();
					newValue = sign.sign(privateKey, encoding);
				}

				let newItem: INodeExecutionData;
				if (dataPropertyName.includes('.')) {
					// Uses dot notation so copy all data
					newItem = {
						json: deepCopy(item.json),
						pairedItem: {
							item: i,
						},
					};
				} else {
					// Does not use dot notation so shallow copy is enough
					newItem = {
						json: { ...item.json },
						pairedItem: {
							item: i,
						},
					};
				}

				if (item.binary !== undefined) {
					newItem.binary = item.binary;
				}

				set(newItem, `json.${dataPropertyName}`, newValue);

				returnData.push(newItem);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as JsonObject).message,
						},
						pairedItem: {
							item: i,
						},
					});
					continue;
				}
				throw error;
			}
		}
		return this.prepareOutputData(returnData);
	}
}
