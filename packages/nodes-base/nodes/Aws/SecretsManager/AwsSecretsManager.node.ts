import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import { BASE_URL } from './helpers/constants';
import { handleSecretsManagerError } from './helpers/errorHandler';

import { secretOperations, secretFields } from './descriptions';

export class AwsSecretsManager implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Secrets Manager',
		name: 'awsSecretsManager',
		icon: 'file:secretsmanager.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Secrets Manager',
		defaults: {
			name: 'AWS Secrets Manager',
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
						name: 'Secret',
						value: 'secret',
					},
				],
				default: 'secret',
			},
			...secretOperations,
			...secretFields,
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

				// Handle additional fields
				const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;

				if (Object.keys(additionalFields).length > 0) {
					const requestOptions = this.getNodeParameter('$request', itemIndex, {}) as IDataObject;
					if (!requestOptions.body) {
						requestOptions.body = {};
					}

					// Parse JSON strings
					if (additionalFields.Tags && typeof additionalFields.Tags === 'string') {
						try {
							additionalFields.Tags = JSON.parse(additionalFields.Tags as string);
						} catch (error) {
							throw new Error('Tags must be valid JSON array');
						}
					}

					if (additionalFields.VersionStages && typeof additionalFields.VersionStages === 'string') {
						try {
							additionalFields.VersionStages = JSON.parse(additionalFields.VersionStages as string);
						} catch (error) {
							throw new Error('VersionStages must be valid JSON array');
						}
					}

					if (additionalFields.RotationRules && typeof additionalFields.RotationRules === 'string') {
						try {
							additionalFields.RotationRules = JSON.parse(additionalFields.RotationRules as string);
						} catch (error) {
							throw new Error('RotationRules must be valid JSON object');
						}
					}

					Object.assign(requestOptions.body, additionalFields);
				}

				// Make the request using n8n's routing
				response = await this.helpers.requestWithAuthentication.call(this, 'aws', {
					returnFullResponse: false,
					ignoreHttpStatusErrors: true,
				});

				// Handle errors
				if (response && typeof response === 'object' && ('__type' in response || 'message' in response)) {
					await handleSecretsManagerError.call(this, response, itemIndex);
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
