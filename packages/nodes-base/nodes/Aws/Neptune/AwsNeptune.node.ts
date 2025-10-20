import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import { BASE_URL } from './helpers/constants';
import { handleNeptuneError } from './helpers/errorHandler';

import {
	clusterOperations,
	clusterFields,
	instanceOperations,
	instanceFields,
} from './descriptions';

export class AwsNeptune implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Neptune',
		name: 'awsNeptune',
		icon: 'file:neptune.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Neptune graph database',
		defaults: {
			name: 'AWS Neptune',
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

				const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;

				if (Object.keys(additionalFields).length > 0) {
					const requestOptions = this.getNodeParameter('$request', itemIndex, {}) as IDataObject;
					if (!requestOptions.qs) {
						requestOptions.qs = {};
					}

					if (additionalFields.VpcSecurityGroupIds && typeof additionalFields.VpcSecurityGroupIds === 'string') {
						const ids = (additionalFields.VpcSecurityGroupIds as string).split(',').map(id => id.trim());
						delete additionalFields.VpcSecurityGroupIds;
						ids.forEach((id, idx) => {
							(requestOptions.qs as IDataObject)['VpcSecurityGroupIds.VpcSecurityGroupId.' + (idx + 1)] = id;
						});
					}

					Object.assign(requestOptions.qs, additionalFields);
				}

				if (resource === 'instance' && operation === 'reboot') {
					const forceFailover = this.getNodeParameter('forceFailover', itemIndex, false) as boolean;
					const requestOptions = this.getNodeParameter('$request', itemIndex, {}) as IDataObject;
					if (!requestOptions.qs) {
						requestOptions.qs = {};
					}
					(requestOptions.qs as IDataObject).ForceFailover = forceFailover;
				}

				response = await this.helpers.requestWithAuthentication.call(this, 'aws', {
					returnFullResponse: false,
					ignoreHttpStatusErrors: true,
				});

				if (response && typeof response === 'object' && ('Error' in response || 'message' in response)) {
					await handleNeptuneError.call(this, response, itemIndex);
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
