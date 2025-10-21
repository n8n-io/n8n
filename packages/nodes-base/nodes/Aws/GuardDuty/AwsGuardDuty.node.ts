import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import { BASE_URL } from './helpers/constants';
import { handleGuardDutyError } from './helpers/errorHandler';

import {
	detectorOperations,
	detectorFields,
	findingOperations,
	findingFields,
} from './descriptions';

export class AwsGuardDuty implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS GuardDuty',
		name: 'awsGuardDuty',
		icon: 'file:guardduty.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS GuardDuty threat detection service',
		defaults: {
			name: 'AWS GuardDuty',
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
				'Content-Type': 'application/json',
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
						name: 'Detector',
						value: 'detector',
					},
					{
						name: 'Finding',
						value: 'finding',
					},
				],
				default: 'detector',
			},
			...detectorOperations,
			...detectorFields,
			...findingOperations,
			...findingFields,
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
				if (['list', 'create', 'update'].includes(operation)) {
					const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;

					if (Object.keys(additionalFields).length > 0) {
						const requestOptions = this.getNodeParameter('$request', itemIndex, {}) as IDataObject;

						// For GET requests, add to query parameters
						if (operation === 'list' && resource === 'detector') {
							if (!requestOptions.qs) {
								requestOptions.qs = {};
							}
							Object.assign(requestOptions.qs, additionalFields);
						} else {
							// For POST requests, add to body
							if (!requestOptions.body) {
								requestOptions.body = {};
							}

							// Parse JSON strings
							if (additionalFields.DataSources && typeof additionalFields.DataSources === 'string') {
								additionalFields.DataSources = JSON.parse(additionalFields.DataSources as string);
							}
							if (additionalFields.FindingCriteria && typeof additionalFields.FindingCriteria === 'string') {
								additionalFields.FindingCriteria = JSON.parse(additionalFields.FindingCriteria as string);
							}
							if (additionalFields.SortCriteria && typeof additionalFields.SortCriteria === 'string') {
								additionalFields.SortCriteria = JSON.parse(additionalFields.SortCriteria as string);
							}

							Object.assign(requestOptions.body, additionalFields);
						}
					}
				}

				// Parse finding IDs
				if (['archive', 'get', 'unarchive', 'updateFeedback'].includes(operation)) {
					const findingIds = this.getNodeParameter('findingIds', itemIndex, '') as string;
					if (findingIds) {
						const requestOptions = this.getNodeParameter('$request', itemIndex, {}) as IDataObject;
						if (!requestOptions.body) {
							requestOptions.body = {};
						}
						(requestOptions.body as IDataObject).FindingIds = JSON.parse(findingIds);
					}
				}

				// Make the request using n8n's routing
				response = await this.helpers.requestWithAuthentication.call(this, 'aws', {
					returnFullResponse: false,
					ignoreHttpStatusErrors: true,
				});

				// Handle errors
				if (response && typeof response === 'object' && ('__type' in response || 'message' in response || 'Message' in response)) {
					await handleGuardDutyError.call(this, response, itemIndex);
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
