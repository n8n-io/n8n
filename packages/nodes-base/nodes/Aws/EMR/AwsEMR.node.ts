import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import { BASE_URL } from './helpers/constants';
import { handleEMRError } from './helpers/errorHandler';

import {
	clusterOperations,
	clusterFields,
	stepOperations,
	stepFields,
} from './descriptions';

export class AwsEMR implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS EMR',
		name: 'awsEMR',
		icon: 'file:emr.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Elastic MapReduce for big data processing',
		defaults: {
			name: 'AWS EMR',
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
						name: 'Cluster',
						value: 'cluster',
					},
					{
						name: 'Step',
						value: 'step',
					},
				],
				default: 'cluster',
			},
			...clusterOperations,
			...clusterFields,
			...stepOperations,
			...stepFields,
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
					if (additionalFields.Applications && typeof additionalFields.Applications === 'string') {
						additionalFields.Applications = JSON.parse(additionalFields.Applications as string);
					}
					if (additionalFields.ClusterStates && Array.isArray(additionalFields.ClusterStates)) {
						// Already an array, keep as is
					}
					if (additionalFields.StepStates && Array.isArray(additionalFields.StepStates)) {
						// Already an array, keep as is
					}

					Object.assign(requestOptions.body, additionalFields);
				}

				// Parse JSON parameters for create operations
				if (operation === 'create' && resource === 'cluster') {
					const instances = this.getNodeParameter('instances', itemIndex, '') as string;
					if (instances) {
						const requestOptions = this.getNodeParameter('$request', itemIndex, {}) as IDataObject;
						if (!requestOptions.body) {
							requestOptions.body = {};
						}
						(requestOptions.body as IDataObject).Instances = JSON.parse(instances);
					}
				}

				// Parse steps JSON for add operation
				if (operation === 'add' && resource === 'step') {
					const steps = this.getNodeParameter('steps', itemIndex, '') as string;
					if (steps) {
						const requestOptions = this.getNodeParameter('$request', itemIndex, {}) as IDataObject;
						if (!requestOptions.body) {
							requestOptions.body = {};
						}
						(requestOptions.body as IDataObject).Steps = JSON.parse(steps);
					}
				}

				// Make the request using n8n's routing
				response = await this.helpers.requestWithAuthentication.call(this, 'aws', {
					returnFullResponse: false,
					ignoreHttpStatusErrors: true,
				});

				// Handle errors
				if (response && typeof response === 'object' && ('__type' in response || 'message' in response)) {
					await handleEMRError.call(this, response, itemIndex);
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
