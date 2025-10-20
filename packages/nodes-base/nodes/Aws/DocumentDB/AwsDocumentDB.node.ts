import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import { BASE_URL } from './helpers/constants';
import { handleDocumentDBError } from './helpers/errorHandler';

import {
	clusterOperations,
	clusterFields,
	instanceOperations,
	instanceFields,
} from './descriptions';

export class AwsDocumentDB implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS DocumentDB',
		name: 'awsDocumentDB',
		icon: 'file:documentdb.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS DocumentDB (MongoDB-compatible)',
		defaults: {
			name: 'AWS DocumentDB',
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
				'Content-Type': 'application/x-www-form-urlencoded',
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
						name: 'Instance',
						value: 'instance',
					},
				],
				default: 'cluster',
			},
			...clusterOperations,
			...clusterFields,
			...instanceOperations,
			...instanceFields,
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

				// Handle additional fields for Query protocol
				const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;

				if (Object.keys(additionalFields).length > 0) {
					const requestOptions = this.getNodeParameter('$request', itemIndex, {}) as IDataObject;
					if (!requestOptions.qs) {
						requestOptions.qs = {};
					}

					// Add additional fields to query string
					Object.assign(requestOptions.qs, additionalFields);
				}

				// Handle special parameters
				if (resource === 'instance' && operation === 'reboot') {
					const forceFailover = this.getNodeParameter('forceFailover', itemIndex, false) as boolean;
					const requestOptions = this.getNodeParameter('$request', itemIndex, {}) as IDataObject;
					if (!requestOptions.qs) {
						requestOptions.qs = {};
					}
					(requestOptions.qs as IDataObject).ForceFailover = forceFailover;
				}

				// Make the request using n8n's routing
				response = await this.helpers.requestWithAuthentication.call(this, 'aws', {
					returnFullResponse: false,
					ignoreHttpStatusErrors: true,
				});

				// Handle errors
				if (response && typeof response === 'object' && ('Error' in response || 'message' in response)) {
					await handleDocumentDBError.call(this, response, itemIndex);
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
