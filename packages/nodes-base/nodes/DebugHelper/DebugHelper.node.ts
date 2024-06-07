import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { ApplicationError, NodeApiError, NodeOperationError } from 'n8n-workflow';
import { setSeed, array as mfArray } from 'minifaker';
import {
	generateCreditCard,
	generateIPv4,
	generateIPv6,
	generateLocation,
	generateMAC,
	generateNanoid,
	generateRandomAddress,
	generateRandomEmail,
	generateRandomUser,
	generateURL,
	generateUUID,
	generateVersion,
} from './randomData';
import { generateGarbageMemory, runGarbageCollector } from './functions';

export class DebugHelper implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'DebugHelper',
		name: 'debugHelper',
		icon: { light: 'file:DebugHelper.svg', dark: 'file:DebugHelper.dark.svg' },
		group: ['output'],
		subtitle: '={{$parameter["category"]}}',
		description: 'Causes problems intentionally and generates useful data for debugging',
		version: 1,
		defaults: {
			name: 'DebugHelper',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [],
		properties: [
			{
				displayName: 'Category',
				name: 'category',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Do Nothing',
						value: 'doNothing',
						description: 'Does nothing',
					},
					{
						name: 'Throw Error',
						value: 'throwError',
						description: 'Throws an error with the specified type and message',
					},
					{
						name: 'Out Of Memory',
						value: 'oom',
						description: 'Generates a large amount of memory to cause an out of memory error',
					},
					{
						name: 'Generate Random Data',
						value: 'randomData',
						description: 'Generates random data sets',
					},
				],
				default: 'throwError',
			},
			{
				displayName: 'Error Type',
				name: 'throwErrorType',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'NodeApiError',
						value: 'NodeApiError',
					},
					{
						name: 'NodeOperationError',
						value: 'NodeOperationError',
					},
					{
						name: 'Error',
						value: 'Error',
					},
				],
				default: 'NodeApiError',
				displayOptions: {
					show: {
						category: ['throwError'],
					},
				},
			},
			{
				displayName: 'Error Message',
				name: 'throwErrorMessage',
				type: 'string',
				default: 'Node has thrown an error',
				description: 'The message to send as part of the error',
				displayOptions: {
					show: {
						category: ['throwError'],
					},
				},
			},
			{
				displayName: 'Memory Size to Generate',
				name: 'memorySizeValue',
				type: 'number',
				default: 10,
				description: 'The approximate amount of memory to generate. Be generous...',
				displayOptions: {
					show: {
						category: ['oom'],
					},
				},
			},
			{
				displayName: 'Data Type',
				name: 'randomDataType',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Address',
						value: 'address',
					},
					{
						name: 'Coordinates',
						value: 'latLong',
					},
					{
						name: 'Credit Card',
						value: 'creditCard',
					},
					{
						name: 'Email',
						value: 'email',
					},
					{
						name: 'IPv4',
						value: 'ipv4',
					},
					{
						name: 'IPv6',
						value: 'ipv6',
					},
					{
						name: 'MAC',
						value: 'macAddress',
					},
					{
						name: 'NanoIds',
						value: 'nanoid',
					},
					{
						name: 'URL',
						value: 'url',
					},
					{
						name: 'User Data',
						value: 'user',
					},
					{
						name: 'UUID',
						value: 'uuid',
					},
					{
						name: 'Version',
						value: 'semver',
					},
				],
				default: 'user',
				displayOptions: {
					show: {
						category: ['randomData'],
					},
				},
			},
			{
				displayName: 'NanoId Alphabet',
				name: 'nanoidAlphabet',
				type: 'string',
				default: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
				description: 'The alphabet to use for generating the nanoIds',
				displayOptions: {
					show: {
						category: ['randomData'],
						randomDataType: ['nanoid'],
					},
				},
			},
			{
				displayName: 'NanoId Length',
				name: 'nanoidLength',
				type: 'string',
				default: '16',
				description: 'The length of each nanoIds',
				displayOptions: {
					show: {
						category: ['randomData'],
						randomDataType: ['nanoid'],
					},
				},
			},
			{
				displayName: 'Seed',
				name: 'randomDataSeed',
				type: 'string',
				default: '',
				placeholder: 'Leave empty for random seed',
				description:
					'If set, seed to use for generating the data (same seed will generate the same data)',
				displayOptions: {
					show: {
						category: ['randomData'],
					},
				},
			},
			{
				displayName: 'Number of Items to Generate',
				name: 'randomDataCount',
				type: 'number',
				default: 10,
				description: 'The number of random data items to generate into an array',
				displayOptions: {
					show: {
						category: ['randomData'],
					},
				},
			},
			{
				displayName: 'Output as Single Array',
				name: 'randomDataSingleArray',
				type: 'boolean',
				default: false,
				description: 'Whether to output a single array instead of multiple items',
				displayOptions: {
					show: {
						category: ['randomData'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const category = this.getNodeParameter('category', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				switch (category) {
					case 'doNothing':
						// as it says on the tin...
						break;
					case 'throwError':
						const throwErrorType = this.getNodeParameter('throwErrorType', 0) as string;
						const throwErrorMessage = this.getNodeParameter('throwErrorMessage', 0) as string;
						switch (throwErrorType) {
							case 'NodeApiError':
								throw new NodeApiError(
									this.getNode(),
									{ message: throwErrorMessage },
									{ message: throwErrorMessage },
								);
							case 'NodeOperationError':
								throw new NodeOperationError(this.getNode(), throwErrorMessage, {
									message: throwErrorMessage,
								});
							case 'Error':
								// eslint-disable-next-line n8n-nodes-base/node-execute-block-wrong-error-thrown
								throw new ApplicationError(throwErrorMessage);
							default:
								break;
						}
					case 'oom':
						const memorySizeValue = this.getNodeParameter('memorySizeValue', 0) as number;
						runGarbageCollector();
						const memUsed = generateGarbageMemory(memorySizeValue);
						items[i].json = memUsed;
						returnData.push(items[i]);
						break;
					case 'randomData':
						const randomDataType = this.getNodeParameter('randomDataType', 0) as string;
						const randomDataCount = this.getNodeParameter('randomDataCount', 0) as number;
						const randomDataSeed = this.getNodeParameter('randomDataSeed', 0) as string;
						const randomDataSingleArray = this.getNodeParameter(
							'randomDataSingleArray',
							0,
						) as boolean;
						const newItem: INodeExecutionData = {
							json: {},
							pairedItem: { item: i },
						};
						if (randomDataSeed !== '') {
							setSeed(randomDataSeed);
						}

						let randomFn: () => any = generateRandomUser;
						switch (randomDataType) {
							case 'user':
								randomFn = generateRandomUser;
								break;
							case 'email':
								randomFn = generateRandomEmail;
								break;
							case 'address':
								randomFn = generateRandomAddress;
								break;
							case 'creditCard':
								randomFn = generateCreditCard;
								break;
							case 'uuid':
								randomFn = generateUUID;
								break;
							case 'macAddress':
								randomFn = generateMAC;
								break;
							case 'ipv4':
								randomFn = generateIPv4;
								break;
							case 'ipv6':
								randomFn = generateIPv6;
								break;
							case 'latLong':
								randomFn = generateLocation;
								break;
							case 'semver':
								randomFn = generateVersion;
								break;
							case 'url':
								randomFn = generateURL;
								break;
							case 'nanoid':
								const nanoidAlphabet = this.getNodeParameter('nanoidAlphabet', 0) as string;
								const nanoidLength = this.getNodeParameter('nanoidLength', 0) as string;
								randomFn = () => generateNanoid(nanoidAlphabet, nanoidLength);
								break;
						}
						const generatedItems = mfArray(randomDataCount, randomFn);
						if (randomDataSingleArray) {
							newItem.json = { generatedItems };
							returnData.push(newItem);
						} else {
							for (const generatedItem of generatedItems) {
								returnData.push({
									json: generatedItem,
									pairedItem: { item: i },
								});
							}
						}
						break;
					default:
						break;
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}
		}
		return [returnData];
	}
}
