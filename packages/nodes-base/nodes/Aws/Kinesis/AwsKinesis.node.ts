import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import { BASE_URL } from './helpers/constants';
import { handleKinesisError } from './helpers/errorHandler';

import {
	streamOperations,
	streamFields,
	recordOperations,
	recordFields,
} from './descriptions';

export class AwsKinesis implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Kinesis',
		name: 'awsKinesis',
		icon: 'file:kinesis.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Kinesis streaming service',
		defaults: {
			name: 'AWS Kinesis',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'aws',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: BASE_URL,
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/x-amz-json-1.1',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Record',
						value: 'record',
					},
					{
						name: 'Stream',
						value: 'stream',
					},
				],
				default: 'stream',
			},
			...streamOperations,
			...streamFields,
			...recordOperations,
			...recordFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const resource = this.getNodeParameter('resource', itemIndex) as string;
				const operation = this.getNodeParameter('operation', itemIndex) as string;

				let response: IDataObject | IDataObject[];

				const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;

				if (Object.keys(additionalFields).length > 0) {
					const requestOptions = this.getNodeParameter('$request', itemIndex, {}) as IDataObject;
					if (!requestOptions.body) {
						requestOptions.body = {};
					}

					if (additionalFields.StreamModeDetails && typeof additionalFields.StreamModeDetails === 'string') {
						try {
							additionalFields.StreamModeDetails = JSON.parse(additionalFields.StreamModeDetails as string);
						} catch (error) {
							throw new Error('StreamModeDetails must be valid JSON object');
						}
					}

					Object.assign(requestOptions.body, additionalFields);
				}

				if (resource === 'record' && operation === 'putRecord') {
					const data = this.getNodeParameter('data', itemIndex) as string;
					const requestOptions = this.getNodeParameter('$request', itemIndex, {}) as IDataObject;
					if (!requestOptions.body) {
						requestOptions.body = {};
					}
					(requestOptions.body as IDataObject).Data = Buffer.from(data).toString('base64');
				}

				if (resource === 'record' && operation === 'putRecords') {
					const records = this.getNodeParameter('records', itemIndex) as string;
					try {
						const parsedRecords = JSON.parse(records);
						parsedRecords.forEach((record: IDataObject) => {
							if (record.Data && typeof record.Data === 'string') {
								record.Data = Buffer.from(record.Data as string).toString('base64');
							}
						});
						const requestOptions = this.getNodeParameter('$request', itemIndex, {}) as IDataObject;
						if (!requestOptions.body) {
							requestOptions.body = {};
						}
						(requestOptions.body as IDataObject).Records = parsedRecords;
					} catch (error) {
						throw new Error('Records must be valid JSON array');
					}
				}

				response = await this.helpers.requestWithAuthentication.call(this, 'aws', {
					returnFullResponse: false,
					ignoreHttpStatusErrors: true,
				});

				if (response && typeof response === 'object' && ('__type' in response || 'message' in response)) {
					await handleKinesisError.call(this, response, itemIndex);
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(response as IDataObject[]),
					{ itemData: { item: itemIndex } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: {
							item: itemIndex,
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
