import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import { BASE_URL } from './helpers/constants';
import { handleEFSError } from './helpers/errorHandler';

import {
	fileSystemOperations,
	fileSystemFields,
	mountTargetOperations,
	mountTargetFields,
} from './descriptions';

export class AwsEFS implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS EFS',
		name: 'awsEFS',
		icon: 'file:efs.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Elastic File System',
		defaults: {
			name: 'AWS EFS',
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
						name: 'File System',
						value: 'fileSystem',
					},
					{
						name: 'Mount Target',
						value: 'mountTarget',
					},
				],
				default: 'fileSystem',
			},
			...fileSystemOperations,
			...fileSystemFields,
			...mountTargetOperations,
			...mountTargetFields,
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

					if (operation === 'list' || operation === 'describe') {
						if (!requestOptions.qs) {
							requestOptions.qs = {};
						}
						Object.assign(requestOptions.qs, additionalFields);
					} else {
						if (!requestOptions.body) {
							requestOptions.body = {};
						}

						if (additionalFields.SecurityGroups && typeof additionalFields.SecurityGroups === 'string') {
							additionalFields.SecurityGroups = (additionalFields.SecurityGroups as string)
								.split(',')
								.map(s => s.trim());
						}

						Object.assign(requestOptions.body, additionalFields);
					}
				}

				response = await this.helpers.requestWithAuthentication.call(this, 'aws', {
					returnFullResponse: false,
					ignoreHttpStatusErrors: true,
				});

				if (response && typeof response === 'object' && ('__type' in response || 'message' in response)) {
					await handleEFSError.call(this, response, itemIndex);
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
