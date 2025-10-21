import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import { BASE_URL } from './helpers/constants';
import { handleElasticBeanstalkError } from './helpers/errorHandler';

import {
	applicationOperations,
	applicationFields,
	environmentOperations,
	environmentFields,
} from './descriptions';

export class AwsElasticBeanstalk implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Elastic Beanstalk',
		name: 'awsElasticBeanstalk',
		icon: 'file:elasticbeanstalk.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Elastic Beanstalk application platform',
		defaults: {
			name: 'AWS Elastic Beanstalk',
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
						name: 'Application',
						value: 'application',
					},
					{
						name: 'Environment',
						value: 'environment',
					},
				],
				default: 'application',
			},
			...applicationOperations,
			...applicationFields,
			...environmentOperations,
			...environmentFields,
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

					if (additionalFields.ApplicationNames && typeof additionalFields.ApplicationNames === 'string') {
						const names = (additionalFields.ApplicationNames as string).split(',').map(n => n.trim());
						delete additionalFields.ApplicationNames;
						names.forEach((name, idx) => {
							const key = 'ApplicationNames.member.' + (idx + 1);
							(requestOptions.qs as IDataObject)[key] = name;
						});
					}

					if (additionalFields.EnvironmentNames && typeof additionalFields.EnvironmentNames === 'string') {
						const names = (additionalFields.EnvironmentNames as string).split(',').map(n => n.trim());
						delete additionalFields.EnvironmentNames;
						names.forEach((name, idx) => {
							const key = 'EnvironmentNames.member.' + (idx + 1);
							(requestOptions.qs as IDataObject)[key] = name;
						});
					}

					Object.assign(requestOptions.qs, additionalFields);
				}

				response = await this.helpers.requestWithAuthentication.call(this, 'aws', {
					returnFullResponse: false,
					ignoreHttpStatusErrors: true,
				});

				if (response && typeof response === 'object' && ('Code' in response || 'Error' in response)) {
					await handleElasticBeanstalkError.call(this, response, itemIndex);
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
