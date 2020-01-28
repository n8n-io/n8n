import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';

import {
	createHash,
	createHmac,
	createSign,
	getHashes,
 } from 'crypto';
import { c } from 'rhea/typings/types';

export class Crypto implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Crypto',
		name: 'crypto',
		icon: 'fa:key',
		group: ['transform'],
		version: 1,
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
						name: 'Hash',
						description: 'Hash a text in a specified format.',
						value: 'hash'
					},
					{
						name: 'Hmac',
						description: 'Hmac a text in a specified format.',
						value: 'hmac'
					},
					{
						name: 'Sign',
						description: 'Sign a string using a private key.',
						value: 'sign'
					},
				],
				default: 'hash',
			},
			{
				displayName: 'Type',
				name: 'type',
				displayOptions: {
					show: {
						action:[
							'hash'
						],
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
						name: 'SHA512',
						value: 'SHA512',
					},
				],
				default: 'MD5',
				description: 'The hash type to use',
				required: true,
			},
			{
				displayName: 'Field Name',
				name: 'fieldName',
				displayOptions: {
					show: {
						action:[
							'hash'
						],
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
						action:[
							'hash'
						],
					},
				},
				type: 'options',
				options: [
					{
						name: 'HEX',
						value: 'hex',
					},
					{
						name: 'BASE64',
						value: 'base64',
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
						action:[
							'hmac'
						],
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
						name: 'SHA512',
						value: 'SHA512',
					},
				],
				default: 'MD5',
				description: 'The hash type to use',
				required: true,
			},
			{
				displayName: 'Field Name',
				name: 'fieldName',
				displayOptions: {
					show: {
						action:[
							'hmac'
						],
					},
				},
				type: 'string',
				default: '',
				required: true,
			},
			{
				displayName: 'Secret',
				name: 'secret',
				displayOptions: {
					show: {
						action:[
							'hmac'
						],
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
						action:[
							'hmac',
						],
					},
				},
				type: 'options',
				options: [
					{
						name: 'HEX',
						value: 'hex',
					},
					{
						name: 'BASE64',
						value: 'base64',
					},
				],
				default: 'hex',
				required: true,
			},
			{
				displayName: 'Field Name',
				name: 'fieldName',
				displayOptions: {
					show: {
						action:[
							'sign'
						],
					},
				},
				type: 'string',
				default: '',
				required: true,
			},
			{
				displayName: 'Algorithm',
				name: 'algorithm',
				displayOptions: {
					show: {
						action:[
							'sign',
						],
					},
				},
				type: 'options',
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
						action:[
							'sign',
						],
					},
				},
				type: 'options',
				options: [
					{
						name: 'HEX',
						value: 'hex',
					},
					{
						name: 'BASE64',
						value: 'base64',
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
						action:[
							'sign'
						],
					},
				},
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				description: 'Private key to use when signing the string.',
				default: '',
				required: true,
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
		}
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let responseData;
		for (let i = 0; i < length; i++) {
			const action = this.getNodeParameter('action', 0) as string;
			if (action === 'hash') {
				const type = this.getNodeParameter('type', i) as string;
				const encoding = this.getNodeParameter('encoding', i) as string;
				const fieldName = this.getNodeParameter('fieldName', i) as string;
				const clone = { ...items[i].json };
				if (clone[fieldName] === undefined) {
					throw new Error(`The field ${fieldName} does not exist on the input data`);
				}
				//@ts-ignore
				clone[fieldName] = createHash(type).update(clone[fieldName] as string).digest(encoding);
				responseData = clone;
			}
			if (action === 'hmac') {
				const type = this.getNodeParameter('type', i) as string;
				const secret = this.getNodeParameter('secret', i) as string;
				const encoding = this.getNodeParameter('encoding', i) as string;
				const fieldName = this.getNodeParameter('fieldName', i) as string;
				const clone = { ...items[i].json };
				if (clone[fieldName] === undefined) {
					throw new Error(`The field ${fieldName} does not exist on the input data`);
				}
				//@ts-ignore
				clone[fieldName] = createHmac(type, secret).update(clone[fieldName] as string).digest(encoding);
				responseData = clone;
			}
			if (action === 'sign') {
				const algorithm = this.getNodeParameter('algorithm', i) as string;
				const fieldName = this.getNodeParameter('fieldName', i) as string;
				const encoding = this.getNodeParameter('encoding', i) as string;
				const privateKey = this.getNodeParameter('privateKey', i) as IDataObject;
				const clone = { ...items[i].json };
				if (clone[fieldName] === undefined) {
					throw new Error(`The field ${fieldName} does not exist on the input data`);
				}
				const sign = createSign(algorithm)
				sign.write(clone[fieldName] as string);
				sign.end();
				//@ts-ignore
				const signature = sign.sign(privateKey, encoding);
				clone[fieldName] = signature;
				responseData = clone;
			}
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
