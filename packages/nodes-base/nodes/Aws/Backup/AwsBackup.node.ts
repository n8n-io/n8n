import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import { BASE_URL } from './helpers/constants';
import { handleBackupError } from './helpers/errorHandler';

import {
	backupPlanOperations,
	backupPlanFields,
	backupJobOperations,
	backupJobFields,
} from './descriptions';

export class AwsBackup implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Backup',
		name: 'awsBackup',
		icon: 'file:backup.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Backup service',
		defaults: {
			name: 'AWS Backup',
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
						name: 'Backup Job',
						value: 'backupJob',
					},
					{
						name: 'Backup Plan',
						value: 'backupPlan',
					},
				],
				default: 'backupPlan',
			},
			...backupPlanOperations,
			...backupPlanFields,
			...backupJobOperations,
			...backupJobFields,
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
					
					if (operation === 'list') {
						if (!requestOptions.qs) {
							requestOptions.qs = {};
						}
						Object.assign(requestOptions.qs, additionalFields);
					}
				}

				response = await this.helpers.requestWithAuthentication.call(this, 'aws', {
					returnFullResponse: false,
					ignoreHttpStatusErrors: true,
				});

				if (response && typeof response === 'object' && ('__type' in response || 'message' in response)) {
					await handleBackupError.call(this, response, itemIndex);
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
