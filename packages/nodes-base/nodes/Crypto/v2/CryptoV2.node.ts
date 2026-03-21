import type { BinaryToTextEncoding } from 'crypto';
import { createHash, createHmac, createSign, getHashes, randomBytes } from 'crypto';
import set from 'lodash/set';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { deepCopy, BINARY_ENCODING, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { pipeline } from 'stream/promises';
import { v4 as uuid } from 'uuid';

import { formatPrivateKey } from '../../../utils/utilities';

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

const versionDescription: INodeTypeDescription = {
	displayName: 'Crypto',
	name: 'crypto',
	icon: 'fa:key',
	iconColor: 'green',
	group: ['transform'],
	version: 2,
	subtitle: '={{$parameter["action"]}}',
	description: 'Provide cryptographic utilities',
	defaults: {
		name: 'Crypto',
		color: '#408000',
	},
	usableAsTool: true,
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			// eslint-disable-next-line n8n-nodes-base/node-class-description-credentials-name-unsuffixed
			name: 'crypto',
			required: true,
			displayOptions: {
				show: {
					action: ['hmac', 'sign'],
				},
			},
		},
	],
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
			displayName: 'Binary File',
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
			default: 'SHA256',
			description: 'The hash type to use',
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
			default: 'SHA256',
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
				'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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

export class CryptoV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const action = this.getNodeParameter('action', 0) as string;

		let hmacSecret = '';
		let signPrivateKey = '';

		if (action === 'hmac' || action === 'sign') {
			const credentials = await this.getCredentials<{
				hmacSecret?: string;
				signPrivateKey?: string;
			}>('crypto');

			if (action === 'hmac') {
				if (!credentials.hmacSecret) {
					throw new NodeOperationError(
						this.getNode(),
						'No HMAC secret set in credentials. Please add an HMAC secret to your Crypto credentials.',
					);
				}
				hmacSecret = credentials.hmacSecret;
			}

			if (action === 'sign') {
				if (!credentials.signPrivateKey) {
					throw new NodeOperationError(
						this.getNode(),
						'No private key set in credentials. Please add a private key to your Crypto credentials.',
					);
				}
				signPrivateKey = formatPrivateKey(credentials.signPrivateKey);
			}
		}

		let item: INodeExecutionData;
		for (let i = 0; i < length; i++) {
			try {
				item = items[i];
				const dataPropertyName = this.getNodeParameter('dataPropertyName', i);
				const value = this.getNodeParameter('value', i, '') as string;
				let newValue;
				let binaryProcessed = false;

				if (action === 'generate') {
					const encodingType = this.getNodeParameter('encodingType', i);
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

				if (action === 'hash' || action === 'hmac') {
					const type = this.getNodeParameter('type', i) as string;
					const encoding = this.getNodeParameter('encoding', i) as BinaryToTextEncoding;
					const hashOrHmac = action === 'hash' ? createHash(type) : createHmac(type, hmacSecret);
					if (this.getNodeParameter('binaryData', i)) {
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
						const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
						if (binaryData.id) {
							const binaryStream = await this.helpers.getBinaryStream(binaryData.id);
							hashOrHmac.setEncoding(encoding);
							await pipeline(binaryStream, hashOrHmac);
							newValue = hashOrHmac.read();
						} else {
							newValue = hashOrHmac
								.update(Buffer.from(binaryData.data, BINARY_ENCODING))
								.digest(encoding);
						}
						binaryProcessed = true;
					} else {
						newValue = hashOrHmac.update(value).digest(encoding);
					}
				}

				if (action === 'sign') {
					const algorithm = this.getNodeParameter('algorithm', i) as string;
					const encoding = this.getNodeParameter('encoding', i) as BinaryToTextEncoding;
					const sign = createSign(algorithm);
					sign.write(value);
					sign.end();
					newValue = sign.sign(signPrivateKey, encoding);
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

				if (item.binary !== undefined && !binaryProcessed) {
					newItem.binary = item.binary;
				}

				set(newItem, ['json', dataPropertyName], newValue);

				returnData.push(newItem);
			} catch (error) {
				if (this.continueOnFail()) {
					const errorDetails = error as Error & { code?: string };
					const errorData: JsonObject = {
						message: errorDetails.message,
					};
					if (errorDetails.name) {
						errorData.name = errorDetails.name;
					}
					if (errorDetails.code) {
						errorData.code = errorDetails.code;
					}
					returnData.push({
						json: {
							error: errorData,
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
		return [returnData];
	}
}
